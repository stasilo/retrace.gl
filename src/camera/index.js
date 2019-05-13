import {vec3} from 'gl-matrix';
import rotateVectorAboutAxis from 'rotate-vector-about-axis';

import mousePosition from 'mouse-position';
import keycode from 'keycode';

import {
    degToRad,
    defined,
    definedNotNull
} from '../utils';

import getStore from '../store';

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

    moveVelocity = 0.5 * 0.25;
    turningVelocity = 0.0125 * 0.25; // 0.025

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
        // move event handling to store
        // make renderMode be set to realTime
        // on mouse down or key press
        // and to static on generate or render

        this.mouse = mousePosition(document.body);

        document.addEventListener('mousedown', (e) => {
            // let store = getStore();

            this.mouseDown = true;

            // if(!store._renderInProgress) {
            //     store.cancelTrace();
            //
            // }
        });

        document.addEventListener('mouseup', (e) => {
            // let store = getStore();

            this.mouseDown = false;

            // if(store.realTimeMode) {
            //     store.cancelTrace();
            //     store.realTimeMode = false;
            //     store.trace();
            // }
        });

        document.addEventListener('keydown', (e) => {
            let store = getStore();

            let moveDir = vec3.create();

            const move = (direction, dirSign) => {
                vec3.scale(moveDir, direction, dirSign * this.moveVelocity);

                vec3.add(this.lookFrom, this.lookFrom, moveDir);
                vec3.add(this.lookAt, this.lookAt, moveDir);

                if(!store.realTimeMode) {
                    store.cancelTrace();
                    store.realTimeMode = true;
                    store.trace();
                }
            }

            switch(keycode(e)) {
                // forward
                case 'w':
                    move(this.w, -1);
                    break;

                // back
                case 's':
                    move(this.w, 1);
                    break;

                // left
                case 'a':
                case 'left':
                    move(this.u, -1);
                    break;

                // right
                case 'd':
                case 'right':
                    move(this.u, 1);
                    break;

                case 'up':
                    move(this.v, 1);
                    break;

                case 'down':
                    move(this.v, -1);
                    break;

                default:
                    break;
            }
        });
    }

    update = () => {
        this.mouseDeltaX = -(this.mouse[0] - this.mouse.prev[0]);
        this.mouseDeltaY = -(this.mouse[1] - this.mouse.prev[1]);

        this.mouse.flush();

        if(this.mouseDown) {
            const [head, pitch] = [this.mouseDeltaX, this.mouseDeltaY];

            // rotate about up vector.
            this.lookFrom = rotateVectorAboutAxis(this.lookFrom, this.u, pitch * this.turningVelocity);
            this.lookAt = rotateVectorAboutAxis(this.lookAt, this.u, pitch * this.turningVelocity);

            // rotate about right vector.
            this.lookFrom = rotateVectorAboutAxis(this.lookFrom, this.v, head * this.turningVelocity);
            this.lookAt = rotateVectorAboutAxis(this.lookAt, this.v, head * this.turningVelocity);
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

        vec3.sub(
            this.lowerLeft,
            this.lookFrom,
            vec3.scale(vec3.create(), this.u, halfWidth*this.focusDist)
        );

        vec3.sub(
            this.lowerLeft,
            this.lowerLeft,
            vec3.scale(vec3.create(), this.v, halfHeight*this.focusDist)
        );

        vec3.sub(
            this.lowerLeft,
            this.lowerLeft,
            vec3.scale(vec3.create(), this.w, this.focusDist)
        );

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
