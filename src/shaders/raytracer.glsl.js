import {definedNotNull, glslFloat} from '../utils';
import {geometryTypes} from '../bvh';

import simplexNoise from './lib/noise/simplex.glsl';

const getSource = ({options, Scene}) =>
`   #version 300 es
    precision highp float;
    precision highp int;
    precision highp sampler2D;

    // #define T_MIN 0.000001
    // #define T_MAX 3.402823466e+38
    #define T_MIN 0.0001
    #define T_MAX 10000.0

    #define MAX_HIT_DEPTH 4 //15 //50
    #define NUM_SAMPLES ${options.numSamples}

    #define DATA_TEX_SIZE ${glslFloat(options.dataTexSize)}
    #define DATA_TEX_INV_SIZE ${glslFloat(1/options.dataTexSize)}

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

    in vec2 uv;
    out vec4 fragColor;

    /*
     * "Includes"
     */

    ${simplexNoise}

    /*
     * Textures
     */

    ${Scene.textures.getTextures().map(texture =>
        `uniform sampler2D uSceneTex${texture.id};`
    ).join('\n')}

    vec4 getSceneTexture(int textureId, vec2 uv) {
        vec4 color;

        switch(textureId) {
            ${Scene.textures.getTextures().map(texture => `
                case ${texture.id}:
                    color = texture(uSceneTex${texture.id}, uv);
                    break;
            `).join('\n')};

            default:
                break;
        }

        return color;
    }

    /*
     * Model bvh & triangle data
     */

    uniform sampler2D uGeometryDataTexture;
    uniform sampler2D uBvhDataTexture;
    uniform sampler2D uMaterialDataTexture;

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

    float deNan(float v) {
        return (v < 0.0 || 0.0 < v || v == 0.0)
            ? v
            : 0.;
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

    // better algo from: https://karthikkaranth.me/blog/generating-random-points-in-a-hitable/
    // (generates a more uniform distribution)

    // vec3 randomPointInUnitSphere() {
    //     float u = rand();
    //     vec3 x = normalize(vec3(rand(), rand(), rand()));
    //     float c = pow(u, 1./3.); //cbrt(u);
    //     return deNan(x*c);
    // }

    /*
     * BVH
     */

    #define BVH_TRIANGLE_GEOMETRY ${geometryTypes.triangle}
    #define BVH_SPHERE_GEOMETRY ${geometryTypes.sphere}
    #define BVH_VOLUME_GEOMETRY ${geometryTypes.volumeAabb}

    struct BvhNode {
        // [id, node0 offset, node1 offset]
        vec3 meta;
        vec3 minCoords;
        vec3 maxCoords;
    };

    struct BvhStackData {
        int id;
        float rayT;
    } stackLevels[24];

    BvhStackData slData0, slData1, tmp;

    BvhNode getBvhNode(int index) {
        float offset = float(index) * 3.;
        float xOffset = mod(offset, DATA_TEX_SIZE);
        float yOffset = floor(offset * DATA_TEX_INV_SIZE);

        vec3 meta = texelFetch(uBvhDataTexture, ivec2(xOffset, yOffset), 0).xyz;

        xOffset = mod(offset + 1., DATA_TEX_SIZE);
        yOffset = floor((offset + 1.) * DATA_TEX_INV_SIZE);

        vec3 minCoords = texelFetch(uBvhDataTexture, ivec2(xOffset, yOffset), 0).xyz;

        xOffset = mod(offset + 2., DATA_TEX_SIZE);
        yOffset = floor((offset + 2.) * DATA_TEX_INV_SIZE);

        vec3 maxCoords = texelFetch(uBvhDataTexture, ivec2(xOffset, yOffset), 0).xyz;

        return BvhNode(
            meta,
            minCoords,
            maxCoords
        );
    }

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

        Camera getCameraWithAperture(
            vec3 lookFrom,
            vec3 lookAt,
            vec3 vUp,
            float vfov,
            float aspect,
            float aperture,
            float focusDist
        ) {
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

    #define LAMBERT_MATERIAL_TYPE 1
    #define METAL_MATERIAL_TYPE 2
    #define DIALECTRIC_MATERIAL_TYPE 3
    #define DIFFUSE_EMISSIVE_MATERIAL_TYPE 4
    #define ISOTROPIC_VOLUME_MATERIAL_TYPE 5
    #define ANISOTROPIC_VOLUME_MATERIAL_TYPE 6

    struct Material {
        int type;
        vec3 albedo;
        vec3 color;

        // fuzz for metal mats
        float fuzz;
        // refraction index for dialectric mats
        float refIdx;
        // intensity for emissive  mats
        float emissiveIntensity;
        // for volume mats
        float density;
        float volumeScale;
    };

    Material getPackedMaterial(int index) {
        float offset = float(index) * 4.;

        float xOffset = mod(offset, DATA_TEX_SIZE);
        float yOffset = floor(offset * DATA_TEX_INV_SIZE);

        vec3 matData1 = texelFetch(uMaterialDataTexture, ivec2(xOffset, yOffset), 0).xyz;

        xOffset = mod(offset + 1., DATA_TEX_SIZE);
        yOffset = floor((offset + 1.) * DATA_TEX_INV_SIZE);

        vec3 matData2 = texelFetch(uMaterialDataTexture, ivec2(xOffset, yOffset), 0).xyz;

        xOffset = mod(offset + 2., DATA_TEX_SIZE);
        yOffset = floor((offset + 2.) * DATA_TEX_INV_SIZE);

        vec3 matData3 = texelFetch(uMaterialDataTexture, ivec2(xOffset, yOffset), 0).xyz;

        xOffset = mod(offset + 3., DATA_TEX_SIZE);
        yOffset = floor((offset + 3.) * DATA_TEX_INV_SIZE);

        vec3 matData4 = texelFetch(uMaterialDataTexture, ivec2(xOffset, yOffset), 0).xyz;

        return Material(
            int(matData1.x), // int type
            matData3, // vec3 albedo
            matData4, // vec3 color
            matData1.y, // float fuzz
            matData1.z, // float refIdx
            matData2.x, // float emissiveIntensity
            matData2.y, // float density
            matData2.z // float volumeScale
        );
    }

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
        vec3 invDir;
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
            vec3 dir = camera.lowerLeft + uv.x * camera.horizontal
                + uv.y * camera.vertical - camera.origin - offset;
            return Ray(
                camera.origin + offset,
                dir,
                1./dir
            );
        } else { // regular camera
            vec3 dir = camera.lowerLeft + uv.x * camera.horizontal + uv.y * camera.vertical;
            return Ray(
                camera.origin,
                dir,
                1./dir
            );
        }
    }

    struct HitRecord {
        bool hasHit;
        vec3 hitPoint;
        float hitT;
        vec3 normal;
        vec2 uv;

        Material material;
        vec3 color;
    };

    // amass color and scatter ray on material
    bool shadeAndScatter(HitRecord hitRecord, inout vec3 color, inout Ray ray) {

        // LAMBERT / DIFFUSE

        if(hitRecord.material.type == LAMBERT_MATERIAL_TYPE) {
            // get lambertian random reflection direction
            ray.dir = hitRecord.normal + randomPointInUnitSphere();
            ray.invDir = 1./ray.dir;
            color *= hitRecord.material.albedo * hitRecord.color;
            return true;
        }

        // REFLECTIVE / METAL

        if(hitRecord.material.type == METAL_MATERIAL_TYPE) {
            vec3 reflected = reflect(normalize(ray.dir), hitRecord.normal);
            vec3 dir = reflected + hitRecord.material.fuzz * randomPointInUnitSphere();

            // dot(a, b) > 0 if a and b are pointing "in the same direction"
            if(dot(dir, hitRecord.normal) > 0.) {
                ray.dir = dir;
                ray.invDir = 1./ray.dir;
                color *= hitRecord.material.albedo * hitRecord.color;
                return true;
            }
        }

        // DIALECTRIC / GLASS

        if(hitRecord.material.type == DIALECTRIC_MATERIAL_TYPE) {
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
                ray.invDir = 1./ray.dir;
            } else {
                ray.dir = refracted;
                ray.invDir = 1./ray.dir;
            }

            color *= hitRecord.material.albedo * hitRecord.color;
            return true;
        }

        // VOLUMES

        if(hitRecord.material.type == ISOTROPIC_VOLUME_MATERIAL_TYPE
            || hitRecord.material.type == ANISOTROPIC_VOLUME_MATERIAL_TYPE)
        {
            // ray.dir = vec3(rand() + 0.001, rand() + 0.001, rand() + 0.001);
            // fungerar nästan:
            // ray.dir = randomPointInUnitSphere() + randomPointInUnitSphere();

            ray.dir = vec3(0.1, 0.1, 0.1) + randomPointInUnitSphere();

            ray.invDir = 1./ray.dir;
            color *= hitRecord.material.albedo * hitRecord.color;

            return true;
        }

        return false;
    }

    // amass emissive color
    bool emit(HitRecord hitRecord, out vec3 emittedColor) {
        if(hitRecord.material.type == DIFFUSE_EMISSIVE_MATERIAL_TYPE) {
            emittedColor = hitRecord.material.emissiveIntensity * hitRecord.color;
            return true;
        }

        return false;
    }

    // cheap inhomogeneous/anisotropic volumes (no raymarching)
    // "Chapter 28: Ray Tracing Inhomogeneous Volumes", p. 521, Nvidia Ray tracing Gems
    // see also: http://psgraphics.blogspot.com/2009/05/neat-trick-for-ray-collisions-in.html

    float volumeFbm(vec3 p) {
        mat3 m = mat3(
            0.00,  0.80,  0.60,
            -0.80,  0.36, -0.48,
            -0.60, -0.48,  0.64
        );

    	float f = 0.5 * snoise(p);
        p = m*p*2.02;

    	f += 0.25 * snoise(p);
        p = m*p*2.03;

        f += 0.125 * snoise(p); //p = m*p*2.01;
    	// f += 0.0625*snoise( p );

    	return f;
    }

    float sampleVolumeDistance(Ray ray, float volumeDensity, float volumeScale) {
        float t = 0.;
        const float maxExtinction = 1.0;

        do {
            t -= ((1./volumeDensity) * log(1. - rand())) / maxExtinction;
        } while (snoise((ray.origin + ray.dir*t) * volumeScale) < rand()*maxExtinction);
        // } while (volumeFbm((ray.origin + ray.dir*t) * volumeScale) < rand()*maxExtinction);

        return deNan(t);
    }

    /*
     *  geometry handling
     */

    float hitBvhBBox( vec3 minCorner, vec3 maxCorner, Ray r) {
        vec3 near = (minCorner - r.origin) * r.invDir;
    	vec3 far  = (maxCorner - r.origin) * r.invDir;

        vec3 tmin = min(near, far);
        vec3 tmax = max(near, far);

        float t0 = max( max(tmin.x, tmin.y), tmin.z);
        float t1 = min( min(tmax.x, tmax.y), tmax.z);

        if (t0 > t1 || t1 < 0.0) return T_MAX;

        return t0;
    }

    // works, but slower?
    void hitBvhVolumeBBox(Ray r, vec3 minCorner, vec3 maxCorner, float tMin, float tMax, inout HitRecord record) {
    	vec3 near = (minCorner - r.origin) * r.invDir;
    	vec3 far  = (maxCorner - r.origin) * r.invDir;

    	vec3 tmin = min(near, far);
    	vec3 tmax = max(near, far);

    	float tN = max( max(tmin.x, tmin.y), tmin.z);
    	float tF = min( min(tmax.x, tmax.y), tmax.z);

    	if( tN > tF || tF < tMin) {//0.) {
            record.hasHit = false;
            return;
        }

        float t = tN < tMin ? tF : tN;
        if (t < tMax && t > tMin) {
            record.hitT = t;
            record.hasHit = true;
    		// normal = -sign(r.direction)*step(t1.yzx,t1.xyz)*step(t1.zxy,t1.xyz);
    	    return;
        }

        record.hasHit = false;
    }


    // works
    // void hitBvhVolumeBBox(Ray r, vec3 minCorner, vec3 maxCorner, float tMin, float tMax, inout HitRecord record) {
    // 	vec3 invDir = r.invDir;
    // 	vec3 near = (minCorner - r.origin) * invDir;
    // 	vec3 far  = (maxCorner - r.origin) * invDir;
    //
    // 	vec3 tmin = min(near, far);
    // 	vec3 tmax = max(near, far);
    //
    // 	float t0 = max( max(tmin.x, tmin.y), tmin.z);
    // 	float t1 = min( min(tmax.x, tmax.y), tmax.z);
    //
    // 	if (t0 > t1) {
    //         // return INFINITY;
    //         record.hasHit = false;
    //         return;
    //     }
    //
    //     if (t0 > tMin) { // if we are outside the box
    // 		// normal = -sign(r.direction) * step(tmin.yzx, tmin) * step(tmin.zxy, tmin);
    //         record.hitT = t0;
    //         record.hasHit = true;
    //
    //         return;
    // 	}
    //
    //     if (t1 > tMin) { // if we are inside the box
    // 		// normal = -sign(r.direction) * step(tmax, tmax.yzx) * step(tmax, tmax.zxy);
    //         record.hitT = t1;
    //         record.hasHit = true;
    //
    //         return;
    // 		// return t1;
    // 	}
    //
    //     record.hasHit = false;
    //     // return INFINITY;
    // }

    bool hitBvhTriangle(
        in Ray r,
        bool doubleSided,
        vec3 v0,
        vec3 v1,
        vec3 v2,
        in float tMax,
        inout HitRecord hitRecord
    ) {
    	vec3 edge1 = v1 - v0;
    	vec3 edge2 = v2 - v0;
    	vec3 pvec = cross(r.dir, edge2);

        float det = 1.0 / dot(edge1, pvec);

    	// comment out the following line if double-sided triangles are wanted, or
    	// uncomment the following line if back-face culling is desired (single-sided triangles)
        // if (det <= 0.0) return false;

        if(!doubleSided && det <= 0.0) {
            return false;
        }

    	vec3 tvec = r.origin - v0;
    	float u = dot(tvec, pvec) * det;
    	if (u < 0.0 || u > 1.0) {
    		return false;
        }

    	vec3 qvec = cross(tvec, edge1);
    	float v = dot(r.dir, qvec) * det;

        if (v < 0.0 || u + v > 1.0) {
    		return false;
        }

        float t = dot(edge2, qvec) * det;

        if(t > T_MIN && t < tMax) {
            hitRecord.uv = vec2(u, v);
            hitRecord.hasHit = true;
            hitRecord.hitT = t;

            return true;
        }

        return false;
    }

    void hitSphere(
        Ray ray,
        vec3 center,
        float radius,
        float tMin,
        float tMax,
        out HitRecord hitRecord
    ) {
        vec3 oc = ray.origin - center;

        float a = dot(ray.dir, ray.dir);
        float b = 2. * dot(oc, ray.dir);
        float c = dot(oc, oc) - radius * radius;

        float discriminant = b*b - 4.*a*c;

        if(discriminant > 0.) {
            float t;

            t = (-b - sqrt(discriminant)) / (2. * a);
            if(t < tMax && t > tMin) {
                hitRecord.hasHit = true;
                hitRecord.hitT = t;

                return;
            }

            t = (-b + sqrt(discriminant)) / (2. * a);
            if(t < tMax && t > tMin) {
                hitRecord.hasHit = true;
                hitRecord.hitT = t;

                return;
            }
        }

        hitRecord.hasHit = false;
        hitRecord.hitT = tMax;
    }

    // void hitSphere(Ray ray, Hitable hitable, float tMax, out HitRecord hitRecord) {
    //     vec3 oc = ray.origin - hitable.center;
    //
    //     float a = dot(ray.dir, ray.dir);
    //     float b = 2. * dot(oc, ray.dir);
    //     float c = dot(oc, oc) - hitable.radius * hitable.radius;
    //
    //     float discriminant = b*b - 4.*a*c;
    //
    //     if(discriminant > 0.) {
    //         float t;
    //
    //         t = (-b - sqrt(discriminant)) / (2. * a);
    //         if(t < tMax && t > T_MIN) {
    //             hitRecord.hasHit = true;
    //             hitRecord.hitT = t;
    //             hitRecord.hitPoint = pointOnRay(ray, t);
    //             hitRecord.normal = normalize(
    //                 (hitRecord.hitPoint - hitable.center) / hitable.radius
    //             );
    //
    //             hitRecord.material = hitable.material;
    //
    //             return;
    //         }
    //
    //         t = (-b + sqrt(discriminant)) / (2. * a);
    //         if(t < tMax && t > T_MIN) {
    //             hitRecord.hasHit = true;
    //             hitRecord.hitT = t;
    //             hitRecord.hitPoint = pointOnRay(ray, t);
    //             hitRecord.normal = normalize(
    //                 (hitRecord.hitPoint - hitable.center) / hitable.radius
    //             );
    //
    //             hitRecord.material = hitable.material;
    //
    //             return;
    //         }
    //     }
    //
    //     hitRecord.hasHit = false;
    //     hitRecord.hitT = tMax;
    // }

    vec2 getSphereUv(vec3 p) {
        float phi = atan(p.z, p.x);
        float theta = asin(p.y);

        float xOffsetAngle = 0.; //1.4;
        float yOffsetAngle = 0.;

        float u = 1. - (phi + xOffsetAngle + PI) / (2. * PI);
        float v = (theta + yOffsetAngle + PI/2.) / PI;

        return vec2(u, v);
    }

    /*
     * World
     */

    void hitWorld(Ray ray, float tMax, out HitRecord hitRecord) {
        HitRecord record;

        record.hasHit = false;
        hitRecord.hasHit = false;
        int lookupGeometryType = -1;

        float lookupOffset = 0.;
        float volumeHitT = 0.;
        vec2 triangleUv;

        int stackPtr = 0;
        int levelCounter = 0;

        BvhNode currentNode = getBvhNode(0);
        BvhNode node0, node1, tnp;

        BvhStackData currentStackData = BvhStackData(
            0,
            hitBvhBBox(currentNode.minCoords, currentNode.maxCoords, ray)
        );

        stackLevels[0] = currentStackData;
        bool skip = false;
        int loopCounter = 0;

        while (true) {
            if (currentStackData.rayT < tMax) {
                // // debug
                // if (levelCounter == 5) {
                //     vec3 n = vec3(0.);
                //
                //     float d = hitBox(currentNode.minCoords, currentNode.maxCoords, ray, n);
                //     if (d < tMax) {
                //         record.hasHit = true;
                //         record.hitT = d;
                //         record.normal = normalize(n);
                //         record.material = LambertMaterial;
                //         record.hitPoint = pointOnRay(ray, d);
                //
                //         record.color = vec3(0.9, 0.0, 0.0);
                //         record.normal = n;
                //
                //         hitRecord = record;
                //         record.hasHit = false;
                //         tMax = d; //record.hitT; // handle depth! ("z-index" :))
                //
                //         break;
                //     }
                // }

                float node0Offset = currentNode.meta.y;
                float node1Offset = currentNode.meta.z;

                if(node1Offset < 0.) { // this is a leaf node
                    float geoOffset = 11. * (-node1Offset - 1.);

                    float xOffset = mod(geoOffset + 9., DATA_TEX_SIZE);
                    float yOffset = floor((geoOffset + 9.) * DATA_TEX_INV_SIZE);
                    vec3 meta = texelFetch(uGeometryDataTexture, ivec2(xOffset, yOffset), 0).xyz;

                    int geoType = int(meta.z);

                    xOffset = mod(geoOffset + 10., DATA_TEX_SIZE);
                    yOffset = floor((geoOffset + 10.) * DATA_TEX_INV_SIZE);
                    meta = texelFetch(uGeometryDataTexture, ivec2(xOffset, yOffset), 0).xyz;

                    bool doubleSided = bool(meta.y);

                    switch(geoType) {
                        case BVH_VOLUME_GEOMETRY: {
                            xOffset = mod(geoOffset, DATA_TEX_SIZE);
                            yOffset = floor(geoOffset * DATA_TEX_INV_SIZE);
                            vec3 minCoords = texelFetch(uGeometryDataTexture, ivec2(xOffset, yOffset), 0).xyz;

                            xOffset = mod(geoOffset + 1., DATA_TEX_SIZE);
                            yOffset = floor((geoOffset + 1.) * DATA_TEX_INV_SIZE);
                            vec3 maxCoords = texelFetch(uGeometryDataTexture, ivec2(xOffset, yOffset), 0).xyz;

                            xOffset = mod(geoOffset + 9., DATA_TEX_SIZE);
                            yOffset = floor((geoOffset + 9.) * DATA_TEX_INV_SIZE);
                            vec3 meta = texelFetch(uGeometryDataTexture, ivec2(xOffset, yOffset), 0).xyz;
                            int materialId = int(meta.x);

                            Material volumeMaterial = getPackedMaterial(materialId);

                            if(volumeMaterial.type == ISOTROPIC_VOLUME_MATERIAL_TYPE
                                || volumeMaterial.type == ANISOTROPIC_VOLUME_MATERIAL_TYPE)
                            {
                                hitBvhVolumeBBox(ray, minCoords, maxCoords, -T_MAX, T_MAX, /* out => */ record);
                                if(record.hasHit) {
                                    HitRecord record2;
                                    hitBvhVolumeBBox(ray, minCoords, maxCoords, record.hitT + T_MIN, T_MAX, /* out => */ record2);

                                    if(record2.hasHit) {
                                        if(record.hitT < T_MIN) {
                                            record.hitT = T_MIN;
                                        }

                                        if(record2.hitT > tMax) {
                                            record2.hitT = tMax;
                                        }

                                        if(record.hitT < record2.hitT) {
                                            if(record.hitT < 0.) {
                                                record.hitT = 0.;
                                            }

                                            float distInsideBound = (record2.hitT - record.hitT)
                                                * length(ray.dir);

                                            float hitDist;
                                            if(volumeMaterial.type == ISOTROPIC_VOLUME_MATERIAL_TYPE) {
                                                hitDist = -(1./volumeMaterial.density) * log(1. - rand());
                                                // hitDist = -(1./volumeMaterial.density) * log(rand());
                                            } else { // anisotropic
                                                hitDist = sampleVolumeDistance(
                                                    ray,
                                                    volumeMaterial.density,
                                                    volumeMaterial.volumeScale
                                                );
                                            }

                                            if(hitDist < distInsideBound) {
                                                tMax = record.hitT + hitDist / length(ray.dir);
                                                lookupGeometryType = BVH_VOLUME_GEOMETRY;
                                                lookupOffset = geoOffset;
                                            }
                                        }
                                    }
                                }
                            }

                            record.hasHit = false;
                            break;
                        }

                        case BVH_SPHERE_GEOMETRY: {
                            xOffset = mod(geoOffset, DATA_TEX_SIZE);
                            yOffset = floor(geoOffset * DATA_TEX_INV_SIZE);
                            vec3 center = texelFetch(uGeometryDataTexture, ivec2(xOffset, yOffset), 0).xyz;

                            xOffset = mod(geoOffset + 1., DATA_TEX_SIZE);
                            yOffset = floor((geoOffset + 1.) * DATA_TEX_INV_SIZE);
                            float radius = texelFetch(uGeometryDataTexture, ivec2(xOffset, yOffset), 0).x;

                            xOffset = mod(geoOffset + 9., DATA_TEX_SIZE);
                            yOffset = floor((geoOffset + 9.) * DATA_TEX_INV_SIZE);
                            vec3 meta = texelFetch(uGeometryDataTexture, ivec2(xOffset, yOffset), 0).xyz;
                            int materialId = int(meta.x);

                            Material sphereMaterial = getPackedMaterial(materialId);

                            // regular sphere
                            if(sphereMaterial.type != ISOTROPIC_VOLUME_MATERIAL_TYPE
                                && sphereMaterial.type != ANISOTROPIC_VOLUME_MATERIAL_TYPE)
                            {
                                hitSphere(ray, center, radius, T_MIN, tMax, /* out => */ record);
                                if(record.hasHit) {
                                    lookupGeometryType = BVH_SPHERE_GEOMETRY;
                                    lookupOffset = geoOffset;
                                    tMax = record.hitT;
                                }
                            } else { // volume spere
                                hitSphere(ray, center, radius, -T_MAX, T_MAX, /* out => */ record);
                                if(record.hasHit) {
                                    HitRecord record2;
                                    hitSphere(ray, center, radius, record.hitT + 0.0001, T_MAX, /* out => */ record2);
                                    if(record2.hasHit) {

                                        if(record.hitT < T_MIN) {
                                            record.hitT = T_MIN;
                                        }

                                        if(record2.hitT > tMax) {
                                            record2.hitT = tMax;
                                        }

                                        if(record.hitT < record2.hitT) {
                                            if(record.hitT < 0.) {
                                                record.hitT = 0.;
                                            }

                                            float distInsideBound = (record2.hitT - record.hitT)
                                                * length(ray.dir);

                                            float hitDist;
                                            if(sphereMaterial.type == ISOTROPIC_VOLUME_MATERIAL_TYPE) {
                                                hitDist = -(1./sphereMaterial.density) * log(1. - rand());
                                            } else { // anisotropic
                                                hitDist = sampleVolumeDistance(
                                                    ray,
                                                    sphereMaterial.density,
                                                    sphereMaterial.volumeScale
                                                );
                                            }

                                            if(hitDist < distInsideBound) {
                                                tMax = record.hitT + hitDist / length(ray.dir);
                                                lookupGeometryType = BVH_SPHERE_GEOMETRY;
                                                lookupOffset = geoOffset;
                                            }
                                        }
                                    }
                                }
                            }

                            record.hasHit = false;
                            break;
                        }

                        case BVH_TRIANGLE_GEOMETRY: {
                            xOffset = mod(geoOffset, DATA_TEX_SIZE);
                            yOffset = floor(geoOffset * DATA_TEX_INV_SIZE);
                            vec3 v0 = texelFetch(uGeometryDataTexture, ivec2(xOffset, yOffset), 0).xyz;

                            xOffset = mod(geoOffset + 1., DATA_TEX_SIZE);
                            yOffset = floor((geoOffset + 1.) * DATA_TEX_INV_SIZE);
                            vec3 v1 = texelFetch(uGeometryDataTexture, ivec2(xOffset, yOffset), 0).xyz;

                            xOffset = mod(geoOffset + 2., DATA_TEX_SIZE);
                            yOffset = floor((geoOffset + 2.) * DATA_TEX_INV_SIZE);
                            vec3 v2 = texelFetch(uGeometryDataTexture, ivec2(xOffset, yOffset), 0).xyz;

                            hitBvhTriangle(ray, doubleSided, v0, v1, v2, tMax, /* out => */ record);
                            if(record.hasHit) {
                                lookupGeometryType = BVH_TRIANGLE_GEOMETRY;
                                lookupOffset = geoOffset;
                                triangleUv = record.uv;
                                tMax = record.hitT;
                                record.hasHit = false;
                            }

                            break;
                        }

                        default:
                            break;
                    }
                } else { // branch
                    levelCounter++;

                    node0 = getBvhNode(int(node0Offset));
                    node1 = getBvhNode(int(node1Offset));

                    slData0 = BvhStackData(
                        int(node0Offset),
                        hitBvhBBox(node0.minCoords, node0.maxCoords, ray)
                    );

                    slData1 = BvhStackData(
                        int(node1Offset),
                        hitBvhBBox(node1.minCoords, node1.maxCoords, ray)
                    );

                    // first sort the branch node data so that 'a' is the smallest
    				if(slData1.rayT < slData0.rayT) {
    					tmp = slData1;
    					slData1 = slData0;
    					slData0 = tmp;

    					tnp = node1;
    					node1 = node0;
    					node0 = tnp;
    				} // branch 'b' now has the larger rayT value of 'a' and 'b'

    				if(slData1.rayT < tMax) {// see if branch 'b' (the larger rayT) needs to be processed
    					currentStackData = slData1;
    					currentNode = node1;
    					skip = true; // this will prevent the stackPtr from decreasing by 1
    				}

    				if(slData0.rayT < tMax) { // see if branch 'a' (the smaller rayT) needs to be processed
                        // if larger branch 'b' needed to be processed also,
                        // cue larger branch 'b' for future round & increase stack pointer

                        if(skip == true) {
    						stackLevels[stackPtr++] = slData1;
    					}

    					currentStackData = slData0;
    					currentNode = node0;
    					skip = true; // this will prevent the stackPtr from decreasing by 1
    				}
                }
            }

            if(skip == false) {
                // decrease pointer by 1 (0.0 is root level, 24.0 is maximum depth)
                // & check if went past the root level
                --stackPtr;
                if (stackPtr < 0) {
                    break;
                }

                levelCounter = stackPtr;

                currentStackData = stackLevels[stackPtr];
                currentNode = getBvhNode(currentStackData.id);
            }

    		skip = false; // reset skip

            // safeguard against bugs causing
            // infinite loops while developing (they often crash the browser/os)
            if(loopCounter > 300) {
                discard;
            }

            loopCounter++;
        }

        // lookup geo details?

        switch(lookupGeometryType) {
            case BVH_TRIANGLE_GEOMETRY: {
                // vertices

                float xOffset = mod(lookupOffset, DATA_TEX_SIZE);
                float yOffset = floor(lookupOffset * DATA_TEX_INV_SIZE);
                vec3 v0 = texelFetch(uGeometryDataTexture, ivec2(xOffset, yOffset), 0).xyz;

                xOffset = mod(lookupOffset + 1., DATA_TEX_SIZE);
                yOffset = floor((lookupOffset + 1.) * DATA_TEX_INV_SIZE);
                vec3 v1 = texelFetch(uGeometryDataTexture, ivec2(xOffset, yOffset), 0).xyz;

                xOffset = mod(lookupOffset + 2., DATA_TEX_SIZE);
                yOffset = floor((lookupOffset + 2.) * DATA_TEX_INV_SIZE);
                vec3 v2 = texelFetch(uGeometryDataTexture, ivec2(xOffset, yOffset), 0).xyz;

                // normals

                xOffset = mod(lookupOffset + 3., DATA_TEX_SIZE);
                yOffset = floor((lookupOffset + 3.) * DATA_TEX_INV_SIZE);
                vec3 n0 = texelFetch(uGeometryDataTexture, ivec2(xOffset, yOffset), 0).xyz;

                xOffset = mod(lookupOffset + 4., DATA_TEX_SIZE);
                yOffset = floor((lookupOffset + 4.) * DATA_TEX_INV_SIZE);
                vec3 n1 = texelFetch(uGeometryDataTexture, ivec2(xOffset, yOffset), 0).xyz;

                xOffset = mod(lookupOffset + 5., DATA_TEX_SIZE);
                yOffset = floor((lookupOffset + 5.) * DATA_TEX_INV_SIZE);
                vec3 n2 = texelFetch(uGeometryDataTexture, ivec2(xOffset, yOffset), 0).xyz;

                // texture cooords

                xOffset = mod(lookupOffset + 6., DATA_TEX_SIZE);
                yOffset = floor((lookupOffset + 6.) * DATA_TEX_INV_SIZE);
                vec3 t0 = texelFetch(uGeometryDataTexture, ivec2(xOffset, yOffset), 0).xyz;

                xOffset = mod(lookupOffset + 7., DATA_TEX_SIZE);
                yOffset = floor((lookupOffset + 7.) * DATA_TEX_INV_SIZE);
                vec3 t1 = texelFetch(uGeometryDataTexture, ivec2(xOffset, yOffset), 0).xyz;

                xOffset = mod(lookupOffset + 8., DATA_TEX_SIZE);
                yOffset = floor((lookupOffset + 8.) * DATA_TEX_INV_SIZE);
                vec3 t2 = texelFetch(uGeometryDataTexture, ivec2(xOffset, yOffset), 0).xyz;

                // meta data

                xOffset = mod(lookupOffset + 9., DATA_TEX_SIZE);
                yOffset = floor((lookupOffset + 9.) * DATA_TEX_INV_SIZE);
                vec3 meta = texelFetch(uGeometryDataTexture, ivec2(xOffset, yOffset), 0).xyz;

                int materialId = int(meta.x);
                bool smoothShading = bool(meta.y);

                xOffset = mod(lookupOffset + 10., DATA_TEX_SIZE);
                yOffset = floor((lookupOffset + 10.) * DATA_TEX_INV_SIZE);
                meta = texelFetch(uGeometryDataTexture, ivec2(xOffset, yOffset), 0).xyz;

                int textureId = int(meta.x);
                bool flipNormals = bool(meta.z);

                float triangleW = 1.0 - triangleUv.x - triangleUv.y;
                vec2 interpUv = triangleW * t0.xy
                    + triangleUv.x * t1.xy
                    + triangleUv.y * t2.xy;

                record.hasHit = true;
                record.hitT = tMax;
                record.material = getPackedMaterial(materialId);
                record.color = textureId == -1
                    ? record.material.color
                    : getSceneTexture(textureId, interpUv).rgb;
                record.hitPoint = pointOnRay(ray, tMax);

                if(smoothShading == true) {
                    record.normal = normalize(
                        triangleW * n0
                            + triangleUv.x * n1
                            + triangleUv.y * n2
                    );
                } else {
                    if(!flipNormals) {
                        record.normal = normalize(cross(v1 - v0, v2 - v0));
                    } else {
                        record.normal = normalize(cross(v2 - v0, v1 - v0));
                    }
                }

                break;
            }

            case BVH_SPHERE_GEOMETRY: {
                // geo data

                float xOffset = mod(lookupOffset, DATA_TEX_SIZE);
                float yOffset = floor(lookupOffset * DATA_TEX_INV_SIZE);
                vec3 center = texelFetch(uGeometryDataTexture, ivec2(xOffset, yOffset), 0).xyz;

                xOffset = mod(lookupOffset + 1., DATA_TEX_SIZE);
                yOffset = floor((lookupOffset + 1.) * DATA_TEX_INV_SIZE);
                vec3 data = texelFetch(uGeometryDataTexture, ivec2(xOffset, yOffset), 0).xyz;
                float radius = data.x;

                // meta data

                xOffset = mod(lookupOffset + 9., DATA_TEX_SIZE);
                yOffset = floor((lookupOffset + 9.) * DATA_TEX_INV_SIZE);
                vec3 meta = texelFetch(uGeometryDataTexture, ivec2(xOffset, yOffset), 0).xyz;
                int materialId = int(meta.x);

                xOffset = mod(lookupOffset + 10., DATA_TEX_SIZE);
                yOffset = floor((lookupOffset + 10.) * DATA_TEX_INV_SIZE);
                meta = texelFetch(uGeometryDataTexture, ivec2(xOffset, yOffset), 0).xyz;
                int textureId = int(meta.x);

                record.hasHit = true;
                record.hitT = tMax;
                record.hitPoint = pointOnRay(ray, record.hitT);
                record.material = getPackedMaterial(materialId);

                if(record.material.type == ISOTROPIC_VOLUME_MATERIAL_TYPE
                    || record.material.type == ANISOTROPIC_VOLUME_MATERIAL_TYPE)
                {
                    record.normal = vec3(1., 0., 0.);
                    record.color = record.material.color;
                } else {
                    if(textureId != -1) {
                        vec3 p = (record.hitPoint - center) / radius;
                        vec2 uv = getSphereUv(p);
                        record.color = getSceneTexture(textureId, uv).rgb;
                    } else {
                        record.color = record.material.color;
                    }

                    record.normal = normalize(
                        (record.hitPoint - center) / radius
                    );
                }

                break;
            }

            case BVH_VOLUME_GEOMETRY: {
                float xOffset = mod(lookupOffset + 9., DATA_TEX_SIZE);
                float yOffset = floor((lookupOffset + 9.) * DATA_TEX_INV_SIZE);
                vec3 meta = texelFetch(uGeometryDataTexture, ivec2(xOffset, yOffset), 0).xyz;
                int materialId = int(meta.x);

                record.hasHit = true;
                record.hitT = tMax;
                record.hitPoint = pointOnRay(ray, record.hitT);
                record.material = getPackedMaterial(materialId);

                record.normal = vec3(1., 1., 1.);
                record.color = record.material.color;

                break;
            }

            default:
                break;
        }

        hitRecord = record;
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
    vec3 paint(Ray ray) {
        vec3 color = vec3(1.0);
        float tMax = T_MAX;

        HitRecord hitRecord;
        for(int hitCounts = 0; hitCounts < MAX_HIT_DEPTH; hitCounts++) {
            hitWorld(ray, tMax, /* out => */ hitRecord);
            if(hitRecord.hasHit) {
                vec3 emittedColor;

                if(emit(hitRecord, /* out => */ emittedColor)) {
                    // color *= emittedColor;
                    color *= emittedColor;
                    break;
                }

                // ray.origin = hitRecord.hitPoint;
                // shadeAndScatter(hitRecord, /* out => */ color, /* out => */ ray);
                if(shadeAndScatter(hitRecord, /* out => */ color, /* out => */ ray)) {
                    ray.origin = hitRecord.hitPoint;
                } else {
                    break;
                }
            } else {
                color *= background(ray.dir);
                break;
            }
        }

        return color;
    }

    vec3 trace(Camera camera) {
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
            color += paint(ray);
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

        vec3 color = trace(camera);
        color = sqrt(color); // correct gamma

        #ifndef REALTIME
            vec3 prevColor = texture(accumTexture, uv).rgb;

            color *= uOneOverSampleCount;
            color += prevColor;
        #endif

        fragColor = vec4(color, 1.);
    }
`;

export default getSource;
