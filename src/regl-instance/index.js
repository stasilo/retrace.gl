import regl from 'regl';

let instance = null;
let instancePromise = null;

// singleton instance factory
const getInstance = (opts = {canvas: _}) => {
    if(!instance) {
        let settings = {
            extensions: ['oes_texture_float', 'EXT_sRGB', 'EXT_color_buffer_half_float'],
            // optionalExtensions: ['oes_texture_float_linear'],
            ...opts
        }

        instance = regl(settings);
    }

    return instance;
}

export default getInstance;

// import regl from 'regl';
// import {definedNotNull} from '../utils';
//
// let instance = null;
// let instancePromise = null;
//
// // singleton instance factory
// const getInstance = async (opts = {canvas: _}) =>
//     instancePromise
//         ? instance
//             ? instance
//             : instancePromise
//         : instancePromise = new Promise((resolve, reject) => {
//             document.addEventListener('DOMContentLoaded', () => {
//                 instance = regl(opts.canvas
//                     ? opts.canvas
//                     : undefined
//                 );
//
//                 if(definedNotNull(instance)) {
//                     resolve(instance);
//                 } else {
//                     reject(instance);
//                 }
//             });
//         });
//
// export default getInstance;
