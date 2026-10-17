import PicoGL from 'picogl';
import {vec3, vec2} from 'gl-matrix';

import {getGlInstances} from '../../gl';

import {
    isFn,
    defined,
    definedNotNull,
    hashCode
} from '../../utils';


class DataTexture {
    isDataTexture = true;

    constructor(props) {
        const {name, size, data, options = {}} = props;

        if(!definedNotNull(size)) {
            throw `No volume texture size supplied for texture "${name}"`;
        }

        if(!definedNotNull(data)) {
            throw `No volume texture data supplied for texture "${name}"`;
        }

        this.name = name;
        this.size = size;
        this.options = options;

        if(Promise.resolve(data) == data) {
            return (async () => {
                this.data = await data;
                return this;
            })();
        } else if(isFn(data)) {
            this.data = data();
        } else {
            this.data = data;
        }

        // if(!isFn(data)) {
        //     this.data = data;
        // } else {
        //     if(data.constructor.name === 'AsyncFunction') {
        //         return (async () => {
        //             this.data = await data();
        //             return this;
        //         })();
        //     }
        //
        //     this.data = data();
        // }
    }

    createDataTexture() {
        const {gl, glApp} = getGlInstances();

        // let data = new Float32Array(this.size.x * this.size.y * 3).fill(0);
        // this.data.forEach((v, n) =>
        //     data[n] = v
        // );
        //
        // this.data = data;

        this.texture = glApp.createTexture2D(this.data, this.size.x, this.size.y, {
            type: gl.UNSIGNED_BYTE,
            internalFormat: gl.R8,
            format: gl.RED,
            generateMipmaps: false,
            minFilter: gl.NEAREST,
            magFilter: gl.NEAREST,
            wrapS: gl.REPEAT,
            wrapT: gl.REPEAT,
            // wrapS: gl.CLAMP_TO_EDGE,
            // wrapT: gl.CLAMP_TO_EDGE,
            flipY: false
        });
    }

    // createDataTexture() {
    //     const {gl, glApp} = getGlInstances();
    //
    //     console.log('data: ', this.data);
    //     console.log('size: ', this.size);
    //
    //     let data = new Float32Array(this.size.x * this.size.y * 3).fill(0);
    //     this.data.forEach((v, n) =>
    //         data[n] = v
    //     );
    //
    //     this.data = data;
    //
    //     this.texture = glApp.createTexture2D(this.data, this.size.x, this.size.y, {
    //         type: gl.FLOAT,
    //         internalFormat: gl.RGB32F,
    //         format: gl.RGB,
    //         generateMipmaps: false,
    //         minFilter: gl.NEAREST,
    //         magFilter: gl.NEAREST,
    //         wrapS: gl.CLAMP_TO_EDGE,
    //         wrapT: gl.CLAMP_TO_EDGE,
    //         flipY: false
    //     });
    // }
}

export default DataTexture;
