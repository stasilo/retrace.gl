import {vec3} from 'gl-matrix';
import rotateVectorAboutAxis from 'rotate-vector-about-axis';

import {getGlInstances} from '../gl';

import mousePosition from 'mouse-position';
import keycode from 'keycode';

import {
    degToRad,
    defined,
    definedNotNull,
    range
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

    velocity = 1;
    moveVelocity = 1 * 0.75;// * 0.5;
    turningVelocity = 0.0125 * 0.5; // * 0.5; // 0.025

    constructor({
        lookFrom,
        lookAt,
        vUp,
        vfov,
        aperture,
        focusDistance,
        velocity
    }) {
        this.lookFrom = lookFrom;
        this.lookAt = lookAt;
        this.vUp = vUp;
        this.vfov = vfov;
        this.aperture = aperture;
        this.focusDist = focusDistance;

        if(defined(velocity)) {
            this.velocity = velocity;

            this.moveVelocity *= velocity;
            this.turningVelocity *= velocity;
        }

        this.updateCamera();
        this.listen();
    }

    // turntable camera:
    // https://github.com/Erkaman/gl-movable-camera/blob/master/index.js

    listen = () => {
        const {glCanvas} = getGlInstances();

        // TODO:
        // move event handling to store (or sep. controller class)
        // make renderMode be set to realTime
        // on mouse down or key press
        // and to static on generate or render

        this.mouse = mousePosition(document.body);

        glCanvas.addEventListener('mousedown', (e) => {
            this.mouseDown = true;
        });

        glCanvas.addEventListener('mouseup', (e) => {
            this.mouseDown = false;
        });

        document.addEventListener('keydown', (e) => {
            let store = getStore();

            if(!store.realTimeMode) {
                return;
            }

            let moveDir = vec3.create();
            const move = (direction, dirSign) => {
                vec3.scale(moveDir, direction, dirSign * this.moveVelocity);

                vec3.add(this.lookFrom, this.lookFrom, moveDir);
                vec3.add(this.lookAt, this.lookAt, moveDir);
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

                case 'left':
                case 'a':
                    move(this.u, -1);
                    break;

                case 'right':
                case 'd':
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
        const {glCanvas} = getGlInstances();

        this.aspect = glCanvas.width/glCanvas.height;

        this.lensRadius = this.aperture/2;
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

    getCurrentSceneSrcDefinition = ({cameraIndent}) => {
        const indentation = range(0, cameraIndent)
            .map(_ => " ")
            .join('');

        const innerIndentation = range(0, cameraIndent * 2)
            .map(_ => " ")
            .join('');

        const lookFrom = Array.from(this.lookFrom)
            .map(v => v.toFixed(3));
            // .join(', ');

        const lookAt = Array.from(this.lookAt)
            .map(v => v.toFixed(3));
            // .join(', ');

        return 'camera({\n' +
            `${innerIndentation}lookFrom: {x: ${lookFrom[0]}, y: ${lookFrom[1]}, z: ${lookFrom[2]}},\n` +
            `${innerIndentation}lookAt: {x: ${lookAt[0]}, y: ${lookAt[1]}, z: ${lookAt[2]}},\n` +
            `${innerIndentation}vfov: ${this.vfov},\n` +
            `${innerIndentation}aperture: ${this.aperture},\n` +
            `${innerIndentation}velocity: ${this.velocity},\n` +
        `${indentation}})`;
    }
}

function createCamera({
    lookFrom,
    lookAt,
    vUp,
    vfov,
    aperture,
    aspect,
    velocity
}) {
    // let lookFromVec = vec3.create();
    // lookFromVec.set(lookFrom);
    let lookFromVec = vec3.fromValues(lookFrom.x, lookFrom.y, lookFrom.z);

    // let lookAtVec = vec3.create();
    // lookAtVec.set(lookAt);
    let lookAtVec = vec3.fromValues(lookAt.x, lookAt.y, lookAt.z);

    let vUpVec = vec3.create();
    vUpVec.set(vUp ? [vUp.x, vUp.y, vUp.z] : [0, 1, 0]);

    return new Camera({
        lookFrom: lookFromVec,
        lookAt: lookAtVec,
        vUp: vUpVec,
        vfov,
        aspect,
        aperture,
        velocity
    });
};

export {
    Camera,
    createCamera
};

export default Camera;
