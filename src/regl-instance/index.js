import regl from 'regl';

let instance = null;
let instancePromise = null;

// singleton instance factory
const getInstance = (opts = {canvas: _}) => {
    if(!instance) {
        let settings = {
            extensions: ['oes_texture_float', 'EXT_sRGB'],
            // optionalExtensions: ['oes_texture_float_linear'],
            ...opts
        }

        instance = regl(settings);
    }

    return instance;
}

export default getInstance;
