import {vec3} from 'gl-matrix';
import rotateVectorAboutAxis from 'rotate-vector-about-axis';

import mousePosition from 'mouse-position';
import keycode from 'keycode';

import {
    degToRad,
    defined,
    definedNotNull
} from '../utils';

// lookFrom - eye origin point
// lookAt - point camera here
// vUp - camera tilt vector (use world up (0, 1, 0) for normal level view)
// vfov - vertical field of view
// aspect ratio

class Camera {
    cameraUniformName = 'camera';

    mouseDeltaX = 0;
    mouseDeltaY = 0;
    mouseDown = false;

    moveVelocity = 0.5;
    turningVelocity = 0.0125; // 0.025

    constructor({
        lookFrom,
        lookAt,
        vUp,
        vfov,
        aspect,
        aperture,
        focusDistance
    }) {
        this.lookFrom = lookFrom;
        this.lookAt = lookAt;
        this.vUp = vUp;
        this.vfov = vfov;
        this.aspect = aspect;
        this.aperture = aperture;
        this.lensRadius = aperture/2;
        this.focusDist = focusDistance;

        this.updateCamera();
        this.listen();
    }

    // https://github.com/Erkaman/gl-movable-camera/blob/master/index.js

    listen = () => {
        this.mouse = mousePosition(document.body);

        document.addEventListener('mousedown', (e) => {
            this.mouseDown = true;
        });

        document.addEventListener('mouseup', (e) => {
            this.mouseDown = false;
        });

        document.addEventListener('keydown', (e) => {
            let moveDir = vec3.create();

            switch(keycode(e)) {
                // forward
                case 'w':
                    vec3.scale(moveDir, this.w, -this.moveVelocity);

                    vec3.add(this.lookFrom, this.lookFrom, moveDir);
                    vec3.add(this.lookAt, this.lookAt, moveDir);

                    break;

                // back
                case 's':
                    vec3.scale(moveDir, this.w, this.moveVelocity);

                    vec3.add(this.lookFrom, this.lookFrom, moveDir);
                    vec3.add(this.lookAt, this.lookAt, moveDir);

                    break;

                // left
                case 'a':
                    vec3.scale(moveDir, this.u, -this.moveVelocity);

                    vec3.add(this.lookFrom, this.lookFrom, moveDir);
                    vec3.add(this.lookAt, this.lookAt, moveDir);

                    break;

                // right
                case 'd':
                    vec3.scale(moveDir, this.u, this.moveVelocity);

                    vec3.add(this.lookFrom, this.lookFrom, moveDir);
                    vec3.add(this.lookAt, this.lookAt, moveDir);

                    break;

                case 'up':
                    vec3.scale(moveDir, this.v, this.moveVelocity);

                    vec3.add(this.lookFrom, this.lookFrom, moveDir);
                    vec3.add(this.lookAt, this.lookAt, moveDir);

                    break;

                case 'down':
                    vec3.scale(moveDir, this.v, -this.moveVelocity);

                    vec3.add(this.lookFrom, this.lookFrom, moveDir);
                    vec3.add(this.lookAt, this.lookAt, moveDir);

                    break;

                default:
                    break;
            }
        });
    }

    update = () => {
        this.mouseDeltaX = -(this.mouse[0] - this.mouse.prev[0]);
        this.mouseDeltaY =  -(this.mouse[1] - this.mouse.prev[1]);
        this.mouse.flush();

        if(this.mouseDown) {
            const turningVelocity = 0.025;
            let [head, pitch] = [this.mouseDeltaX, this.mouseDeltaY];

            // rotate about up vector.
            this.lookFrom = rotateVectorAboutAxis(this.lookFrom, this.u, pitch * turningVelocity);
            this.lookAt = rotateVectorAboutAxis(this.lookAt, this.u, pitch * turningVelocity);

            // rotate about right vector.
            this.lookFrom = rotateVectorAboutAxis(this.lookFrom, this.v, head * turningVelocity);
            this.lookAt = rotateVectorAboutAxis(this.lookAt, this.v, head * turningVelocity);
        }

        this.updateCamera();
    }

    updateCamera = () => {
        this.focusDist = !defined(this.focusDist)
            ? vec3.length(vec3.sub(vec3.create(), this.lookFrom, this.lookAt))
            : this.focusDist;

        let theta = degToRad(this.vfov); // vfov is top to bottom in degs
        let halfHeight = Math.tan(theta/2.);
        let halfWidth = this.aspect * halfHeight;

        /*
         * calc camera basis
         */

        // vec3 w = normalize(this.lookFrom - this.lookAt);
        this.w = vec3.create();
        vec3.sub(this.w, this.lookFrom, this.lookAt);
        this.w = vec3.normalize(this.w, this.w);

        // vec3 u = normalize(cross(vUp, w));
        this.u = vec3.create();
        vec3.cross(this.u, this.vUp, this.w);
        vec3.normalize(this.u, this.u);

        // vec3 v = cross(w, u);
        this.v = vec3.create();
        vec3.cross(this.v, this.w, this.u);

        /*
         * adjust basis to aspect, focus distance and get starting pos (lowerLeft)
         */

        this.lowerLeft = vec3.create();
        vec3.sub(this.lowerLeft, this.lookFrom, vec3.scale(vec3.create(), this.u, halfWidth*this.focusDist));
        vec3.sub(this.lowerLeft, this.lowerLeft, vec3.scale(vec3.create(), this.v, halfHeight*this.focusDist));
        vec3.sub(this.lowerLeft, this.lowerLeft, vec3.scale(vec3.create(), this.w, this.focusDist));

        this.horizontal = vec3.create();
        vec3.scale(this.horizontal, this.u, 2*this.focusDist*halfWidth);

        this.vertical = vec3.create();
        vec3.scale(this.vertical, this.v, 2*this.focusDist*halfHeight);
    }

    getUniform = () => ({
        [`${this.cameraUniformName}.origin`]: this.lookFrom,
        [`${this.cameraUniformName}.horizontal`]: this.horizontal,
        [`${this.cameraUniformName}.vertical`]: this.vertical,
        [`${this.cameraUniformName}.lowerLeft`]: this.lowerLeft,
        [`${this.cameraUniformName}.lensRadius`]: this.lensRadius,
        [`${this.cameraUniformName}.w`]: this.w,
        [`${this.cameraUniformName}.u`]: this.u,
        [`${this.cameraUniformName}.v`]: this.v
    });

}


function createCamera({lookFrom, lookAt, vUp, vfov, aperture, aspect}) {
    let lookFromVec = vec3.create();
    lookFromVec.set(lookFrom);

    let lookAtVec = vec3.create();
    lookAtVec.set(lookAt);

    let vUpVec = vec3.create();
    vUpVec.set(vUp);

    return new Camera({
        lookFrom: lookFromVec,
        lookAt: lookAtVec,
        vUp: vUpVec,
        vfov,
        aspect,
        aperture
    });
};

export {
    Camera,
    createCamera
};

export default Camera;
