import {vec3} from 'gl-matrix';
import {degToRad} from '../utils';

// lookFrom - eye origin point
// lookAt - point camera here
// vUp - camera tilt vector (use world up (0, 1, 0) for normal level view)
// vfov - vertical field of view
// aspect ratio

function camera({lookFrom, lookAt, vUp, vfov, aspect, aperture}) {
    this.cameraUniformName = 'camera';

    this.lookFrom = lookFrom;
    this.lookAt = lookAt;
    this.vUp = vUp;
    this.vfov = vfov;
    this.aspect = aspect;
    this.aperture = aperture;
    this.lensRadius = aperture/2;

    this.createCamera = () => {
        let theta = degToRad(this.vfov); // vfov is top to bottom in degs
        let halfHeight = Math.tan(theta/2.);
        let halfWidth = this.aspect * halfHeight;
        let focusDist = vec3.length(vec3.sub(vec3.create(), this.lookFrom, this.lookAt));

        /*
         * calc camera basis
         */

        // vec3 w = normalize(lookFrom - lookAt);
        this.w = vec3.create();
        this.w = vec3.normalize(this.w, vec3.sub(vec3.create(), lookFrom, lookAt));

        // vec3 u = normalize(cross(vUp, w));
        this.u = vec3.create();
        vec3.normalize(this.u, vec3.cross(vec3.create(), this.vUp, this.w));

        // vec3 v = cross(w, u);
        this.v = vec3.cross(vec3.create(), this.w, this.u);

        /*
         * adjust basis to aspect, focus distance and get starting pos (lowerLeft)
         */

        // vec3 lowerLeft = lookFrom - halfWidth*focusDist*u - halfHeight*focusDist*v - w*focusDist;
        this.lowerLeft = vec3.create();
        vec3.sub(this.lowerLeft, this.lookFrom, vec3.scale(vec3.create(), this.u, halfWidth*focusDist));
        vec3.sub(this.lowerLeft, this.lowerLeft, vec3.scale(vec3.create(), this.v, halfHeight*focusDist));
        vec3.sub(this.lowerLeft, this.lowerLeft, vec3.scale(vec3.create(), this.w, focusDist));

        // vec3 horizontal = 2.*focusDist*halfWidth*u;
        this.horizontal = vec3.scale(vec3.create(), this.u, 2*focusDist*halfWidth);

        // vec3 vertical = 2.*focusDist*halfHeight*v;
        this.vertical = vec3.scale(vec3.create(), this.v, 2*focusDist*halfHeight);
    }

    this.getDefinition = () => `
        Camera(
            vec3(${this.lookFrom}),
            vec3(${this.horizontal}),
            vec3(${this.vertical}),
            vec3(${this.lowerLeft}),
            ${this.lensRadius},
            // camera basis
            vec3(${this.w}), vec3(${this.u}), vec3(${this.v})
        );
    `;

    this.getUniform = () => ({
        [`${this.cameraUniformName}.origin`]: this.lookFrom,
        [`${this.cameraUniformName}.horizontal`]: this.horizontal,
        [`${this.cameraUniformName}.vertical`]: this.vertical,
        [`${this.cameraUniformName}.lowerLeft`]: this.lowerLeft,
        [`${this.cameraUniformName}.lensRadius`]: this.lensRadius,
        [`${this.cameraUniformName}.w`]: this.w,
        [`${this.cameraUniformName}.u`]: this.u,
        [`${this.cameraUniformName}.v`]: this.v
    });

    this.createCamera();
}

function createCamera({lookFrom, lookAt, vUp, vfov, aperture, aspect}) {
    let lookFromVec = vec3.create();
    lookFromVec.set(lookFrom);

    let lookAtVec = vec3.create();
    lookAtVec.set(lookAt);

    let vUpVec = vec3.create();
    vUpVec.set(vUp);

    return new camera({
        lookFrom: lookFromVec,
        lookAt: lookAtVec,
        vUp: vUpVec,
        vfov,
        aspect,
        aperture
    });
};

export {
    camera,
    createCamera
};

export default camera;
