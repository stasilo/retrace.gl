import regl from 'regl';
import {definedNotNull} from '../utils';

let instance = null;
let instancePromise = null;

const getInstance = async (opts = {canvasId: _}) =>
    instancePromise
        ? instance
            ? instance
            : instancePromise
        : instancePromise = new Promise((resolve, reject) => {
            document.addEventListener('DOMContentLoaded', () => {
                instance = regl(opts.canvasId
                    ? document.getElementById(opts.canvasId)
                    : undefined
                );

                if(definedNotNull(instance)) {
                    resolve(instance);
                } else {
                    rejeect(instance);
                }
            });
        });

export default getInstance;
