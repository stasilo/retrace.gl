// impl. in webgl2: https://codepen.io/kakaxi0618/pen/BOqvNj

// precision highp float;
precision mediump float;

uniform vec2 uResolution;
uniform float uTime;

varying vec2 uv;

#define FLT_MAX 3.402823466e+38
#define T_MIN .01
#define T_MAX 15. //FLT_MAX

#define MAX_HIT_DEPTH 50//50
#define NUM_SAMPLES 30
#define NUM_SPHERES 6

#define PI 3.141592653589793
#define DEG_TO_RAD(deg) deg * PI / 180.;
#define RAD_TO_DEG(rad) rad * 180. / PI;

// #pragma glslify: random = require(glsl-random);

/*
 * utils
 */

 // deterministic rand
 // http://byteblacksmith.com/improvements-to-the-canonical-one-liner-glsl-rand-for-opengl-es-2-0/

 float random(vec2 co) {
     // highp float a = 12.9898;
     // highp float b = 78.233;
     // highp float c = 43758.5453;
     // highp float dt = dot(co.xy ,vec2(a,b));
     // highp float sn = mod(dt,3.14);

     float a = 12.9898;
     float b = 78.233;
     float c = 43758.5453;
     float dt = dot(co.xy ,vec2(a,b));
     float sn = mod(dt,3.14);

     return fract(sin(sn) * c);
 }

 // stateful non-deterministic rand => [0, 1]

 vec2 gRandSeed;
 float rand() {
     // gRandSeed.x  = fract(sin(dot(gRandSeed.xy + 0., vec2(12.9898, 78.233))) * 43758.5453);
     // gRandSeed.y  = fract(sin(dot(gRandSeed.xy + 0., vec2(12.9898, 78.233))) * 43758.5453);;

     gRandSeed.x = random(gRandSeed);
     gRandSeed.y = random(gRandSeed);

     return gRandSeed.x;
}

vec3 deNan(vec3 v) {
    return (v.x < 0.0 || 0.0 < v.x || v.x == 0.0)
        && (v.y < 0.0 || 0.0 < v.y || v.y == 0.0)
        && (v.z < 0.0 || 0.0 < v.z || v.z == 0.0)
            ? v
            : vec3(1.);
}

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
    vec3 v = cross(w, u);

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

// https://programming.guide/random-point-within-circle.html

vec2 randomPointOnUnitDisc() {
    float a = rand() * 2. * PI;
    float r = sqrt(rand());
    // to cartesian coordinates
    return vec2(r * cos(a), r * sin(a));
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

/*
 * Materials
 */

#define LAMBERT 1
#define METAL 2
#define DIALECTRIC 3

struct Material {
    int type;
    vec3 albedo;
    float fuzz;
    float refIdx;
};

Material LambertMaterial = Material(
    LAMBERT,
    vec3(1.0),
    0.,
    0.
);

Material ShinyMetalMaterial = Material(
    METAL,
    vec3(0.8),
    0.01,
    0.
);

Material FuzzyMetalMaterial = Material(
    METAL,
    vec3(0.9),
    0.3,
    0.
);

Material GlassMaterial = Material(
    DIALECTRIC,
    vec3(1.),
    0.,
    1.5 //1.7
);

// random direction in unit sphere
// from: https://codepen.io/kakaxi0618/pen/BOqvNj
// this uses spherical coords, see:
// https://www.scratchapixel.com/lessons/mathematics-physics-for-computer-graphics/geometry/spherical-coordinates-and-trigonometric-functions

// vec3 randomPointInUnitSphere() {
//     float phi = 2.0 * PI * rand();
//     // random in range [0, 1] => random in range [-1, 1]
//     float cosTheta = 2.0 * rand() - 1.0;
//     float u = rand();
//
//     float theta = acos(cosTheta);
//     float r = pow(u, 1.0 / 3.0);
//
//     // convert from spherical to cartesian
//     float x = r * sin(theta) * cos(phi);
//     float y = r * sin(theta) * sin(phi);
//     float z = r * cos(theta);
//
//     return vec3(x, y, z);
// }

// better algo from: https://karthikkaranth.me/blog/generating-random-points-in-a-sphere/
// (generates a more uniform distribution)

vec3 randomPointInUnitSphere() {
    float u = rand();
    vec3 x = normalize(vec3(rand(), rand(), rand()));
    float c = pow(u, 1./3.); //cbrt(u);
    return deNan(x*c);
}

// polynomial approximation of reflectivity by angle
// by cristophe  schlick

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
    vec3 normal;

    Material material;
    vec3 color;
};

// amass color and scatter ray on material
void shadeAndScatter(HitRecord hitRecord, inout vec3 color, inout Ray ray) {

    // LAMBERT / DIFFUSE

    if(hitRecord.material.type == LAMBERT) {
        // get lambertian random reflection direction
        ray.dir = hitRecord.normal + randomPointInUnitSphere();
        color *= hitRecord.material.albedo * hitRecord.color;
    }

    // REFLECTIVE / METAL

    if(hitRecord.material.type == METAL) {
        vec3 reflected = reflect(normalize(ray.dir), hitRecord.normal);
        vec3 dir = reflected + hitRecord.material.fuzz * randomPointInUnitSphere();

        // dot(a, b) > 0 if a and b are pointing "in the same direction"
        if(dot(dir, hitRecord.normal) > 0.) {
            ray.dir = dir;
            color *= hitRecord.material.albedo * hitRecord.color;
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
    }
}

/*
 * Sphere handling
 */

struct Sphere {
    vec3 center;
    float radius;
    Material material;
    vec3 color;
};

bool hitSphere(Ray ray, Sphere sphere, out HitRecord hitRecord) {
    vec3 oc = ray.origin - sphere.center;

    float a = dot(ray.dir, ray.dir);
    float b = 2. * dot(oc, ray.dir);
    float c = dot(oc, oc) - sphere.radius * sphere.radius;

    float discriminant = b*b - 4.*a*c;

    if(discriminant > 0.) {
        float t;

        t = (-b - sqrt(discriminant)) / (2. * a);
        if(t < T_MAX && t > T_MIN) {
            hitRecord.hasHit = true;
            hitRecord.hitPoint = pointOnRay(ray, t);
            hitRecord.normal = normalize(
                (hitRecord.hitPoint - sphere.center) / sphere.radius
            );

            hitRecord.material = sphere.material;
            hitRecord.color = sphere.color;

            return true;
        }

        t = (-b + sqrt(discriminant)) / (2. * a);
        if(t < T_MAX && t > T_MIN) {
            hitRecord.hasHit = true;
            hitRecord.hitPoint = pointOnRay(ray, t);
            hitRecord.normal = normalize(
                (hitRecord.hitPoint - sphere.center) / sphere.radius
            );

            hitRecord.material = sphere.material;
            hitRecord.color = sphere.color;

            return true;
        }
    }

    hitRecord.hasHit = false;
    return false;
}

/*
 * World
 */

bool hitWorld(Ray ray, Sphere spheres[NUM_SPHERES], out HitRecord hitRecord) {
    for(int i = 0; i < NUM_SPHERES; i++) {
        if(hitSphere(ray, spheres[i], /* out */ hitRecord)) {
            return true;
        }
    }

    return false;
}

/*
 * Rendering
 */

vec3 background(vec3 rayDir) {
    vec3 normedDir = normalize(rayDir);
    // transpose y range from [-1, 1] to [0, 1]
    float t = .5*(normedDir.y + 1.);
    // do linear interpolation of color
    return (1. - t)*vec3(1.) + t*vec3(.4, .4, .7); //vec3(.5, .7, 1.);
}

// colorize
vec3 paint(Ray ray, Sphere spheres[NUM_SPHERES]) {
    vec3 color = vec3(1.0);
    HitRecord hitRecord;

    hitWorld(ray, spheres, /* out => */ hitRecord);

    for(int hitCounts = 0; hitCounts < MAX_HIT_DEPTH; hitCounts++) {
        if(!hitRecord.hasHit) {
            color *= background(ray.dir);
            break;
        }

        ray.origin = hitRecord.hitPoint;

        shadeAndScatter(hitRecord, /* out => */ color, /* out => */ ray);
        hitWorld(ray, spheres, /* out => */ hitRecord);
    }

    return color;
}

vec3 trace(Camera camera, Sphere spheres[NUM_SPHERES]) {
    vec3 color = vec3(0.);

    // trace
    for(int i = 0; i < NUM_SAMPLES; i++) {
        vec2 rUv = vec2( // jitter pixel location for anti-aliasing effect
            uv.x + (rand() / uResolution.x),
            uv.y + (rand() / uResolution.y)
        );

        Ray ray = getRay(camera, rUv);

        // color += deNan(paint(ray, spheres));
        color += paint(ray, spheres);
    }

    color /= float(NUM_SAMPLES);

    return deNan(color);
}

void main () {
    // set initial seed for stateful rng
    gRandSeed = uv;

    // Camera camera = getCamera(
    //     vec3(0.03, 0.4, 0.4), // look from
    //     vec3(0., -3.0, -5.3), // look at
    //     vec3(0., 1., 0.), // camera up
    //     30., // vfov
    //     uResolution.x/uResolution.y // aspect ratio
    // );


    vec3 lookFrom = vec3(0.03, 0.9, 1.9);
    vec3 lookAt = vec3(0., 0., -0.8);
    float focusDist = length(lookFrom - lookAt);
    float aperture = 0.25;

    Camera camera = getCameraWithAperture(
        lookFrom, // look from
        lookAt, // look at
        vec3(0., 1., 0.), // camera up
        40., // vfov
        uResolution.x/uResolution.y, // aspect ratio
        aperture,
        focusDist
    );

    Sphere spheres[NUM_SPHERES];
    {
        spheres[0] = Sphere(
            vec3(-0.1, -0.3 + abs(sin(uTime*3.))*0.4, -0.8), // sphere center
            0.25, // radius
            ShinyMetalMaterial, // material
            vec3(1.) // color
        );

        spheres[1] = Sphere(
            vec3(1., 0., -1.), // sphere center
            0.5, // radius
            LambertMaterial, //ShinyMetalMaterial, // material
            vec3(0.2, 0.331, 0.5) // color
        );

        spheres[3] = Sphere(
            vec3(0.12, 0.3, -1.7), // sphere center
            0.5, // radius
            FuzzyMetalMaterial, // material
            vec3(0.9, 0.9, 0.9) // color
        );

        //
        spheres[5] = Sphere(
            vec3(-0.22, 0.3, -1.7), // sphere center
            0.5, // radius
            FuzzyMetalMaterial, // material
            vec3(0.9, 0.9, 0.9) // color
        );
        //

        spheres[2] = Sphere(
            vec3(-1., -0.0, -1.25), // sphere center
            0.5, // radius
            GlassMaterial, // material
            vec3(1.) // color
        );

        spheres[4] = Sphere(
            vec3(0., -300.5, -5.), // sphere center
            300.0, // radius
            LambertMaterial, // material
            vec3(0.9, 0.3, 0.6) // color
        );
    }

    vec3 color = trace(camera, spheres);
    color = sqrt(color); // correct gamma

    gl_FragColor = vec4(color, 1.);
}
