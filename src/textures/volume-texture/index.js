import PicoGL from 'picogl';
import {vec3, vec2} from 'gl-matrix';

import {getGlInstances} from '../../gl';

import {
    isFn,
    defined,
    definedNotNull,
    hashCode
} from '../../utils';


let cachedVolumes = {};

class VolumeTexture {
    isVolumeTexture = true;

    constructor(props) {
        const {name, size, data, options, cache} = props;

        if(!definedNotNull(size)) {
            throw `No volume texture data supplied for texture "${name}"`;
        }

        if(!definedNotNull(data)) {
            throw `No volume texture data supplied for texture "${name}"`;
        }

        this.name = name;
        this.size = size;

        this.options = options;

        const propsHash = hashCode(props);

        if(propsHash in cachedVolumes && cache) {
            this.data = cachedVolumes[hashCode(props)];
        } else {
            this.data = isFn(data)
                ? data()
                : data;

            cachedVolumes[hashCode(props)] = this.data;
        }
    }

    createVolumeTexture() {
        const {gl, glApp} = getGlInstances();

        this.texture = glApp.createTexture3D(new Float32Array(this.data), this.size, this.size, this.size, {
            type: gl.FLOAT,
            internalFormat: gl.R32F,
            format: gl.RED,
            generateMipmaps: false,
            minFilter: gl.NEAREST,
            magFilter: gl.NEAREST,
            wrapS: gl.REPEAT,
            wrapT: gl.REPEAT,
            wrapR: gl.REPEAT,
            // wrapS: gl.CLAMP_TO_EDGE,
            // wrapT: gl.CLAMP_TO_EDGE,
            // wrapR: gl.CLAMP_TO_EDGE,
            ...this.options
        });
    }
}

export default VolumeTexture;
