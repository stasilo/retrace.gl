import {definedNotNull} from '../utils';

const getSource = ({options, ObjectList}) =>
`   #version 300 es
    precision highp float;

    #define FLT_MAX 3.402823466e+38
    #define T_MIN .001
    #define T_MAX FLT_MAX

    #define MAX_HIT_DEPTH 15//50
    #define NUM_SAMPLES ${options.numSamples}

    #define PI 3.141592653589793

    #define DEG_TO_RAD(deg) deg * PI / 180.;
    #define RAD_TO_DEG(rad) rad * 180. / PI;

    ${options.realTime
        ? '#define REALTIME'
        : ''
    }

    ${options.glslCamera
        ? '#define GLSL_CAMERA'
        : ''
    }

    uniform float uTime;
    #ifndef REALTIME
        uniform float uOneOverSampleCount;
    #endif
    uniform vec2 uSeed;

    uniform vec2 uResolution;
    uniform vec3 uBgGradientColors[2];

    #ifndef REALTIME
        uniform sampler2D accumTexture;
    #endif

    /*
     * Model bvh & triangle data
     */

    uniform sampler2D uTriangleTexture;
    uniform sampler2D uBvhDataTexture;

    in vec2 uv;
    out vec4 fragColor;

    /*
     * Camera
     */

    struct Camera {
        vec3 origin;
        vec3 horizontal;
        vec3 vertical;
        vec3 lowerLeft;
        float lensRadius;
        // camera basis
        vec3 w, u, v;
    };

    #ifndef GLSL_CAMERA
        uniform Camera camera;
    #endif

    /*
     * Lights
     */

    // struct Light {
    //     vec3 color;
    //     float intensity;
    //     vec3 center;
    // };

    /*
     * utils
     */

    vec3 deNan(vec3 v) {
        return (v.x < 0.0 || 0.0 < v.x || v.x == 0.0)
            && (v.y < 0.0 || 0.0 < v.y || v.y == 0.0)
                && (v.z < 0.0 || 0.0 < v.z || v.z == 0.0)
                    ? v
                    : vec3(0.0);
    }

     // deterministic rand
     // http://byteblacksmith.com/improvements-to-the-canonical-one-liner-glsl-rand-for-opengl-es-2-0/

     float random(vec2 co) {
         highp float a = 12.9898;
         highp float b = 78.233;
         highp float c = 43758.5453;
         highp float dt = dot(co.xy ,vec2(a,b));
         highp float sn = mod(dt,3.14);

         return fract(sin(sn) * c);
     }

     // stateful deterministic rand => [0, 1]

    vec2 gRandSeed;
    float rand() {
        gRandSeed += vec2(1.);
        return random(gRandSeed);
    }

    // https://programming.guide/random-point-within-circle.html

    vec2 randomPointOnUnitDisc() {
        float a = rand() * 2. * PI;
        float r = sqrt(rand());
        // to cartesian coordinates
        return vec2(r * cos(a), r * sin(a));
    }

    // random direction in unit sphere
    // from: https://codepen.io/kakaxi0618/pen/BOqvNj
    // this uses spherical coords, see:
    // https://www.scratchapixel.com/lessons/mathematics-physics-for-computer-graphics/geometry/spherical-coordinates-and-trigonometric-functions

    vec3 randomPointInUnitSphere() {
        float phi = 2.0 * PI * rand();
        // random in range [0, 1] => random in range [-1, 1]
        float cosTheta = 2.0 * rand() - 1.0;
        float u = rand();

        float theta = acos(cosTheta);
        float r = pow(u, 1.0 / 3.0);

        // convert from spherical to cartesian
        float x = r * sin(theta) * cos(phi);
        float y = r * sin(theta) * sin(phi);
        float z = r * cos(theta);

        return vec3(x, y, z);
    }

    /*
     * BVH
     */

    struct BvhNode {
        // [id, node0 offset, node1 offset]
        vec3 meta;
        vec3 minCoords;
        vec3 maxCoords;
    };

    BvhNode getBvhNode(int index) {
        ivec2 bvhTexSize = textureSize(uBvhDataTexture, 0);

        float offset = float(index) * 3.;
        float dataTexWidth = float(bvhTexSize.x);
        float oneOverDataTexWidth = 1. / dataTexWidth;

        float xOffset = mod(offset, dataTexWidth);
        float yOffset = ceil(offset * oneOverDataTexWidth) - 1.;

        vec3 meta = texelFetch(uBvhDataTexture, ivec2(xOffset, yOffset), 0).xyz;

        xOffset = mod(offset + 1., dataTexWidth);
        yOffset = ceil((offset + 1.) * oneOverDataTexWidth) - 1.;

        vec3 minCoords = texelFetch(uBvhDataTexture, ivec2(xOffset, yOffset), 0).xyz;

        xOffset = mod(offset + 2., dataTexWidth);
        yOffset = ceil((offset + 2.) * oneOverDataTexWidth) - 1.;

        vec3 maxCoords = texelFetch(uBvhDataTexture, ivec2(xOffset, yOffset), 0).xyz;

        return BvhNode(
            meta,
            minCoords,
            maxCoords
        );
    }

    /*
     * Textures
     */

    ${ObjectList.getTextureDefinitions()}

    /*
     * Camera (mostly left for reference)
     */

    #ifdef GLSL_CAMERA
        // lookFrom - eye origin point
        // lookAt - point camera here
        // vUp - camera tilt vector (use world up (0, 1, 0) for normal level view)
        // vfov - vertical field of view
        // aspect ratio

        Camera getCamera(vec3 lookFrom, vec3 lookAt, vec3 vUp, float vfov, float aspect) {
            float theta = DEG_TO_RAD(vfov); // vfov is top to bottom in degs
            float halfHeight = tan(theta/2.); // pythagorean theorem
            float halfWidth = aspect * halfHeight;

            // calc camera basis
            vec3 w = normalize(lookFrom - lookAt);
            vec3 u = normalize(cross(vUp, w));
            vec3 v = normalize(cross(w, u));

            vec3 origin = lookFrom;
            vec3 lowerLeft = origin - halfWidth*u - halfHeight*v - w;
            vec3 horizontal = 2.*halfWidth*u;
            vec3 vertical = 2.*halfHeight*v;
            float lensRadius = -1.;

            return Camera(
                origin,
                horizontal,
                vertical,
                lowerLeft,
                lensRadius,
                // camera basis
                w, u, v
            );
        }

        Camera getCameraWithAperture(vec3 lookFrom, vec3 lookAt, vec3 vUp, float vfov, float aspect, float aperture, float focusDist) {
            float lensRadius = aperture/2.;
            float theta = DEG_TO_RAD(vfov); // vfov is top to bottom in degs
            float halfHeight = tan(theta/2.); // pythagorean theorem
            float halfWidth = aspect * halfHeight;

            // calc camera basis
            vec3 w = normalize(lookFrom - lookAt);
            vec3 u = normalize(cross(vUp, w));
            vec3 v = cross(w, u);

            vec3 origin = lookFrom;
            vec3 lowerLeft = origin - halfWidth*focusDist*u - halfHeight*focusDist*v - w*focusDist;
            vec3 horizontal = 2.*focusDist*halfWidth*u;
            vec3 vertical = 2.*focusDist*halfHeight*v;

            return Camera(
                origin,
                horizontal,
                vertical,
                lowerLeft,
                lensRadius,
                // camera basis
                w, u, v
            );
        }
    #endif

    /*
     * Materials
     */

    #define LAMBERT 1
    #define METAL 2
    #define DIALECTRIC 3
    #define DIFFUSE_EMISSIVE 4

    struct Material {
        int type;
        vec3 albedo;
        float fuzz;
        float refIdx;
        float emissiveIntensity;
    };

    Material LambertMaterial = Material(
        LAMBERT,
        vec3(1.),
        0.,
        0.,
        0.
    );

    Material ShinyMetalMaterial = Material(
        METAL,
        vec3(0.8),
        0.01,
        0.,
        0.
    );

    Material FuzzyMetalMaterial = Material(
        METAL,
        vec3(0.9),
        0.45,
        0.,
        0.
    );

    Material GlassMaterial = Material(
        DIALECTRIC,
        vec3(1.),
        0.,
        1.8, //1.7
        0.
    );

    Material LightMaterial = Material(
        DIFFUSE_EMISSIVE,
        vec3(1.),
        0.,
        0., //1.7
        15.
    );

    // better algo from: https://karthikkaranth.me/blog/generating-random-points-in-a-hitable/
    // (generates a more uniform distribution)

    // vec3 randomPointInUnitSphere() {
    //     float u = rand();
    //     vec3 x = normalize(vec3(rand(), rand(), rand()));
    //     float c = pow(u, 1./3.); //cbrt(u);
    //     return deNan(x*c);
    // }

    // polynomial approximation of reflectivity by angle
    // by cristophe schlick

    float schlick(float cosine, float refIdx) {
        float r0 = (1. - refIdx) / (1. + refIdx);
        r0 = r0*r0;

        return r0 + (1.-r0)*pow((1. - cosine), 5.);
    }

    /*
     * Ray handling
     */

    struct Ray {
        vec3 origin;
        vec3 dir;
    };

    vec3 pointOnRay(Ray ray, float t) {
        return ray.origin + t*ray.dir;
    }

    vec3 getRayDirection(Camera camera, vec2 uv) {
        return camera.lowerLeft + uv.x * camera.horizontal + uv.y * camera.vertical;
    }

    Ray getRay(Camera camera, vec2 uv) {
        vec3 p = vec3(randomPointOnUnitDisc(), 0.) - vec3(1., 1., 0);
        vec3 rd = camera.lensRadius * p;
        vec3 offset = camera.u * rd.x + camera.v * rd.y;

        if(camera.lensRadius > 0.) { // camera with aperture
            return Ray(
                camera.origin + offset,
                camera.lowerLeft + uv.x * camera.horizontal + uv.y * camera.vertical - camera.origin - offset
            );
        } else { // regular camera
            return Ray(
                camera.origin,
                camera.lowerLeft + uv.x * camera.horizontal + uv.y * camera.vertical
            );
        }
    }

    struct HitRecord {
        bool hasHit;
        vec3 hitPoint;
        float hitT;
        vec3 normal;

        Material material;
        vec3 color;
    };

    // amass color and scatter ray on material
    bool shadeAndScatter(HitRecord hitRecord, inout vec3 color, inout Ray ray) {

        // LAMBERT / DIFFUSE

        if(hitRecord.material.type == LAMBERT) {
            // get lambertian random reflection direction
            ray.dir = hitRecord.normal + randomPointInUnitSphere();
            color *= hitRecord.material.albedo * hitRecord.color;
            return true;
        }

        // REFLECTIVE / METAL

        if(hitRecord.material.type == METAL) {
            vec3 reflected = reflect(normalize(ray.dir), hitRecord.normal);
            vec3 dir = reflected + hitRecord.material.fuzz * randomPointInUnitSphere();

            // dot(a, b) > 0 if a and b are pointing "in the same direction"
            if(dot(dir, hitRecord.normal) > 0.) {
                ray.dir = dir;
                color *= hitRecord.material.albedo * hitRecord.color;
                return true;
            }
        }

        // DIALECTRIC / GLASS

        if(hitRecord.material.type == DIALECTRIC) {
            float cosine;
            float niOverNt;
            float reflectProb;

            vec3 outwardNormal;

            if(dot(ray.dir, hitRecord.normal) > 0.) {
                outwardNormal = -hitRecord.normal;
                niOverNt = hitRecord.material.refIdx;
                cosine = hitRecord.material.refIdx * dot(ray.dir, hitRecord.normal) / length(ray.dir);
            } else {
                outwardNormal = hitRecord.normal;
                niOverNt = 1. / hitRecord.material.refIdx;
                cosine = -dot(ray.dir, hitRecord.normal) / length(ray.dir);
            }

            vec3 refracted = refract(normalize(ray.dir), normalize(outwardNormal), niOverNt);
            if(refracted.x != 0.0 && refracted.y != 0.0 && refracted.z != 0.0) {
                reflectProb = schlick(cosine, hitRecord.material.refIdx);
            } else {
                reflectProb = 1.;
            }

            if(rand() < reflectProb) {
                vec3 reflected = reflect(ray.dir, hitRecord.normal);
                ray.dir = reflected;
            } else {
                ray.dir = refracted;
            }

            color *= hitRecord.material.albedo * hitRecord.color;
            return true;
        }

        return false;
    }

    // amass emissive color
    vec3 emit(HitRecord hitRecord) {
        vec3 emittedColor = vec3(0.);

        if(hitRecord.material.type == DIFFUSE_EMISSIVE) {
            emittedColor = hitRecord.material.emissiveIntensity * hitRecord.color;
        }

        return emittedColor;
    }

    /*
     *  geometry handling
     */

    #define SPHERE_GEOMETRY 1
    #define XY_RECT_GEOMETRY 2
    #define TRIANGLE_GEOMETRY 3

    struct Hitable {
        int geometry;
        Material material;
        vec3 color;

        // bounding box
        vec3 bMin, bMax;

        // sphere
        vec3 center;
        float radius;

        // xy rect
        float x0, x1, y0, y1;
        float k;

        // triangle
        vec3 v0, v1, v2;

        // normal (triangle face normal)
        vec3 normal;
    };

    bool hitBbox(vec3 boxMin, vec3 boxMax, Ray ray, out HitRecord hitRecord) {
        vec3 invDir = 1. / ray.dir;

        vec3 tBottom = invDir * (boxMin - ray.origin);
        vec3 tTop = invDir * (boxMax - ray.origin);

        vec3 tmin = min(tTop, tBottom);
        vec3 tmax = max(tTop, tBottom);

        vec2 t = max(tmin.xx, tmin.yz);
        float t0 = max(t.x, t.y);

        t = min(tmax.xx, tmax.yz);
        float t1 = min(t.x, t.y);

        if(t1 > max(t0, 0.0)) {
            // hitRecord.hitT = t1;
            return true;
        } else {
            return false;
        }
    }

    void hitSphere(Ray ray, Hitable hitable, float tMax, out HitRecord hitRecord) {
        vec3 oc = ray.origin - hitable.center;

        float a = dot(ray.dir, ray.dir);
        float b = 2. * dot(oc, ray.dir);
        float c = dot(oc, oc) - hitable.radius * hitable.radius;

        float discriminant = b*b - 4.*a*c;

        if(discriminant > 0.) {
            float t;

            t = (-b - sqrt(discriminant)) / (2. * a);
            if(t < tMax && t > T_MIN) {
                hitRecord.hasHit = true;
                hitRecord.hitT = t;
                hitRecord.hitPoint = pointOnRay(ray, t);
                hitRecord.normal = normalize(
                    (hitRecord.hitPoint - hitable.center) / hitable.radius
                );

                hitRecord.material = hitable.material;

                return;
            }

            t = (-b + sqrt(discriminant)) / (2. * a);
            if(t < tMax && t > T_MIN) {
                hitRecord.hasHit = true;
                hitRecord.hitT = t;
                hitRecord.hitPoint = pointOnRay(ray, t);
                hitRecord.normal = normalize(
                    (hitRecord.hitPoint - hitable.center) / hitable.radius
                );

                hitRecord.material = hitable.material;

                return;
            }
        }

        hitRecord.hasHit = false;
        hitRecord.hitT = tMax;
    }

    void hitXyRect(Ray ray, Hitable rect, float tMin, float tMax, out HitRecord hitRecord) {
        float t = (rect.k - ray.origin.z) / ray.dir.z;
        if(t < tMin || t > tMax) {
            hitRecord.hasHit = false;
            return;
            // hitRecord.hitT = t; //tMax;
        }

        float x = ray.origin.x + t*ray.dir.x;
        float y = ray.origin.y + t*ray.dir.y;

        if(x < rect.x0 || x > rect.x1 || y < rect.y0 || y > rect.y1) {
            hitRecord.hasHit = false;
            return;
            // hitRecord.hitT = t; //tMax;
        }

        hitRecord.hasHit = true;
        hitRecord.hitT = t;
        hitRecord.material = rect.material;
        hitRecord.hitPoint = pointOnRay(ray, t);
        hitRecord.normal = vec3(0., 0., 1.);
        //hitRecord.uv = vec2((x-x0)/(x1-x0), (y-y0)/(y1-y0));
    }

    // by iq
    //https://www.shadertoy.com/view/MlGcDz
    bool hitTriangle(in Ray r, in Hitable tri, float tMax, inout HitRecord hitRecord) {
        vec3 v1v0 = tri.v1 - tri.v0;
        vec3 v2v0 = tri.v2 - tri.v0;
        vec3 rov0 = r.origin - tri.v0;

        vec3  n = cross( v1v0, v2v0 );
        vec3  q = cross( rov0, r.dir );
        float d = 1.0/dot( r.dir, n );

        float u = d*dot( -q, v2v0 );
        float v = d*dot(  q, v1v0 );

        float t = d*dot( -n, rov0 );

        if( u<0.0 || v<0.0 || (u+v)>1.0 ) {
            t = -1.0;
        }

        if( t > T_MIN && t<tMax) {
            hitRecord.hasHit = true;
            hitRecord.hitT = t;
            hitRecord.normal = normalize(n);
            hitRecord.material = tri.material;
            hitRecord.hitPoint = pointOnRay(r, t);

            return true;
        }

        return false;
    }


    // bool hitTriangle(in Ray r, in Hitable tri, float tMax, inout HitRecord hitRecord) {
    //     vec3 orig = r.origin;
    //     vec3 dir = r.dir;
    //
    //     vec3 v0 = tri.v0;
    //     vec3 v1 = tri.v1;
    //     vec3 v2 = tri.v2;
    //
    //     // compute plane's normal
    //     vec3 v0v1 = v1 - v0;
    //     vec3 v0v2 = v2 - v0;
    //
    //     // no need to normalize
    //     vec3 N = cross(v0v1, v0v2); //v0v1.crossProduct(v0v2); // N
    //     float area2 = length(N);
    //
    //     // Step 1: finding P
    //
    //     // check if ray and plane are parallel ?
    //     float NdotRayDirection = dot(N, dir); //N.dotProduct(dir);
    //     if (abs(NdotRayDirection) < 0.0000001) // almost 0
    //         return false; // they are parallel so they don't intersect !
    //
    //     // compute d parameter using equation 2
    //     float d = dot(N, v0); //N.dotProduct(v0);
    //
    //     // compute t (equation 3)
    //     float t = (dot(N, orig) + d) / NdotRayDirection;
    //     // check if the triangle is in behind the ray
    //     if (t < 0.) {
    //         hitRecord.hasHit = false;
    //         return false; // the triangle is behind
    //     }
    //
    //     if(t > tMax) {
    //         hitRecord.hasHit = false;
    //         return false;
    //     }
    //
    //     // compute the intersection point using equation 1
    //     vec3 P = orig + t * dir;
    //
    //     // Step 2: inside-outside test
    //     vec3 C; // vector perpendicular to triangle's plane
    //
    //     // edge 0
    //     vec3 edge0 = v1 - v0;
    //     vec3 vp0 = P - v0;
    //     C = cross(edge0, vp0); //edge0.crossProduct(vp0);
    //     if (dot(N, C) < 0.) return false; // P is on the right side
    //
    //     // edge 1
    //     vec3 edge1 = v2 - v1;
    //     vec3 vp1 = P - v1;
    //     C = cross(edge1, vp1); //edge1.crossProduct(vp1);
    //     if (dot(N, C) < 0.)  return false; // P is on the right side
    //
    //     // edge 2
    //     vec3 edge2 = v0 - v2;
    //     vec3 vp2 = P - v2;
    //     C = cross(edge2, vp2); //edge2.crossProduct(vp2);
    //     if (dot(N, C) < 0.) return false; // P is on the right side;
    //
    //     hitRecord.hasHit = true;
    //     // hitRecord.dist = d;
    //     hitRecord.hitT = t;
    //     hitRecord.normal = N; //t.normal * sign(det); //((s.n0 * u) + (s.n1 * v) + (s.n2 * (1. - (u + v)))) * -sign(a);
    //     hitRecord.material = tri.material;
    //     hitRecord.hitPoint = pointOnRay(r, t);
    //
    //     return true; // this ray hits the triangle
    // }

    /*
     * World
     */

    void hitWorld(Ray ray, Hitable hitables[${ObjectList.length()}], float tMax, out HitRecord hitRecord) {
        hitRecord.hasHit = false;

        HitRecord record;
        for(int i = 0; i < ${ObjectList.length()}; i++) {
            //samples: 500 / 500, render time: 99.8s
            // if(hitables[i].geometry == SPHERE_GEOMETRY
            //     && hitBbox(hitables[i].bMin, hitables[i].bMax, ray, /* out => */ record))
            // {
            //     hitSphere(ray, hitables[i], tMax, /* out => */ record);
            // }

            // samples: 500 / 500, render time: 96.8s
            if(hitables[i].geometry == SPHERE_GEOMETRY) {
                hitSphere(ray, hitables[i], tMax, /* out => */ record);
            }

            if(hitables[i].geometry == XY_RECT_GEOMETRY) {
                hitXyRect(ray, hitables[i], T_MIN, tMax, /* out => */ record);
            }

            // bool hitTriangle(Ray ray, Hitable triangle, float tMax, out HitRecord hitRecord) {
            // if(hitables[i].geometry == TRIANGLE_GEOMETRY) {
            //     hitTriangle(ray, hitables[i], tMax, /* out => */ record);
            // }

            if(record.hasHit) {
                // inefficient hack to do dynamic hitable colors, textures & proc. textures
                ${ObjectList.updateTextureColors('uv', 'record.hitPoint')}
                record.color = hitables[i].color;

                hitRecord = record;
                tMax = record.hitT; // handle depth! ("z-index" :))
                record.hasHit = false;
            }
        }

        ivec2 triTexSize = textureSize(uTriangleTexture, 0);
        for(int iY = 0; iY < triTexSize.y; iY += 1) {
            for(int iX = 0; iX < triTexSize.x; iX += 3) {

                vec3 v0 = texelFetch(uTriangleTexture, ivec2(iX, iY), 0).xyz;
                vec3 v1 = texelFetch(uTriangleTexture, ivec2(iX + 1, iY), 0).xyz;
                vec3 v2 = texelFetch(uTriangleTexture, ivec2(iX + 2, iY), 0).xyz;

                // if(v0.x == -1. && v0.y == -1. && v0.z == -1.) {
                //     break;
                // }

                Hitable tri = Hitable(
                    TRIANGLE_GEOMETRY,
                    //LambertMaterial, // material
                    FuzzyMetalMaterial,
                    vec3(1., 1., 1.), // color

                    // bounding box
                    vec3(-1.), vec3(-1.),

                    // irrelevant props for triangle (sphere)
                    vec3(-1.),
                    -1.,

                    // irrelevant props for triangle (xy rect)
                    -1., -1., -1., -1.,
                    -1.,

                    // triangle props
                    v0, v1, v2,
                    // face normal
                    vec3(-1.)
                );

                hitTriangle(ray, tri, tMax, /* out => */ record);

                if(record.hasHit) {
                    // inefficient hack to do dynamic hitable colors, textures & proc. textures
                    ${ObjectList.updateTextureColors('uv', 'record.hitPoint')}
                    record.color = vec3(0.8, 0.5, 0.5);

                    hitRecord = record;
                    tMax = record.hitT; // handle depth! ("z-index" :))
                    record.hasHit = false;
                }
            }
        }

    }

    /*
     * Rendering
     */

    vec3 background(vec3 rayDir) {
        vec3 normedDir = normalize(rayDir);
        // transpose y range from [-1, 1] to [0, 1]
        float t = .5*(normedDir.y + 1.);
        // do linear interpolation of colors
        return (1. - t)*uBgGradientColors[0] + t*uBgGradientColors[1];
    }

    // colorize
    vec3 paint(Ray ray, Hitable hitables[${ObjectList.length()}]) {
        vec3 color = vec3(1.0);
        float tMax = T_MAX;

        HitRecord hitRecord;
        hitWorld(ray, hitables, tMax, /* out => */ hitRecord);

        for(int hitCounts = 0; hitCounts < MAX_HIT_DEPTH; hitCounts++) {
            vec3 emitted = emit(hitRecord);

            if(hitRecord.hasHit) {
                ray.origin = hitRecord.hitPoint;
                if(!shadeAndScatter(hitRecord, /* out => */ color, /* out => */ ray)) {
                    color *= emitted;
                    break;
                }
            } else {
                color *= background(ray.dir);
                break;
            }

            hitWorld(ray, hitables, tMax, /* out => */ hitRecord);

        }

        return color;
    }

    vec3 trace(Camera camera, Hitable hitables[${ObjectList.length()}]) {
        vec3 color = vec3(0.);

        // trace
        for(int i = 0; i < NUM_SAMPLES; i++) {
            vec2 rUv = vec2( // jitter pixel location for anti-aliasing effect
                uv.x + (rand() / uResolution.x),
                uv.y + (rand() / uResolution.y)
            );

            // vec3 lookFrom = vec3(0.03-abs(sin(uv.x*cos(uTime*10.)*10.)), 0.9, 2.5+sin(uv.y*2.));
            // vec3 lookAt = vec3(-0.2, 0.3-abs(sin(uv.x*cos(uTime*4.)*2.)), -1.5-abs(sin(uv.x*cos(uTime*0.1)*30.)));
            // float focusDist = length(lookFrom - lookAt);
            // float aperture = 0.1; //0.2;
            //
            // Camera camera = getCameraWithAperture(
            //     lookFrom, // look from
            //     lookAt, // look at
            //     vec3(0., 1., 0.), // camera up
            //     30., // vfov
            //     uResolution.x/uResolution.y, // aspect ratio
            //     aperture,
            //     focusDist
            // );

            Ray ray = getRay(camera, rUv);
            color += paint(ray, hitables);
            // color += deNan(paint(ray, hitables));
        }

        color /= float(NUM_SAMPLES);
        return color;
    }

    void main () {
        uTime;

        // set initial seed for stateful rng
        gRandSeed = uSeed * uv;///vec2(0.1, 0.1); //uSeed + 20.; //uv + uSeed;

        #ifdef GLSL_CAMERA
            // // regular camera
            // Camera camera = getCamera(
            //     vec3(0.0, 0.5, 0.5), // look from
            //     vec3(0., -3.0, -5.3), // look at
            //     vec3(0., 1., 0.), // camera up
            //     25., // vfov
            //     uResolution.x/uResolution.y // aspect ratio
            // );

            vec3 lookFrom = vec3(0.03, 0.9, 2.5);
            vec3 lookAt = vec3(-0.2, 0.3, -1.5);
            float focusDist = length(lookFrom - lookAt);
            float aperture = 0.1; //0.2;

            Camera camera = getCameraWithAperture(
                lookFrom, // look from
                lookAt, // look at
                vec3(0., 1., 0.), // camera up
                30., // vfov
                uResolution.x/uResolution.y, // aspect ratio
                aperture,
                focusDist
            );
        #endif

        ${ObjectList.getDefinition()}

        vec3 color = trace(camera, hitables);
        color = sqrt(color); // correct gamma

        #ifndef REALTIME
            vec3 prevColor = texture(accumTexture, uv).rgb;

            color *= uOneOverSampleCount;
            color += prevColor;
        #endif



        BvhNode test = getBvhNode(600);
        fragColor = vec4(test.maxCoords, 1.);
        // should look like:
        // fragColor = vec4(
        //     0.5091178284416199,
        //     0.399251328540802,
        //     0.2676621542701721,
        //     1.0
        // );

        // BvhNode test = getBvhNode(2);
        // fragColor = vec4(test.maxCoords, 1.);

        // fragColor = vec4(
        //     0.07036020768976212,
        //     0.1827109323272705,
        //     0.5091178284416199,
        //     1.0
        // );

        // idx 1 (9)
        // BvhNode test = getBvhNode(1);
        // fragColor = vec4(test.maxCoords, 1.);
        // should be purple
        // fragColor = vec4(0.5091178284416199,
        //     0.1827109323272705,
        //     0.5091178284416199,
        //     1.0
        // );

        //idx 0
        // BvhNode test = getBvhNode(0);
        // fragColor = vec4(test.maxCoords, 1.);
        // fragColor = vec4(0.5091178284416199,
        //     0.6091178522834778,
        //     0.5091178284416199,
        //     1.0);

        // fragColor = vec4(test.meta, 1.);
        // fragColor = vec4(0., 9., 3024., 1.);

        // vec3 kaka = texelFetch(uBvhDataTexture, ivec2(2, 0), 0).xyz; // maxCoords first node
        // fragColor = vec4(kaka, 1.);


        // fragColor = vec4(color, 1.);
    }
`;

export default getSource;
