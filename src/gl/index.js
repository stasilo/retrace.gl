import PicoGL from 'picogl';
import {defined} from '../utils';

let gl, glCanvas, glApp;

export function getGlInstances() {
    if(!defined(glCanvas)) {
        glCanvas = document.createElement('canvas');
        glCanvas.setAttribute('id', 'gl-canvas');

        glCanvas.setAttribute('width', window.innerWidth / 2);
        glCanvas.setAttribute('height', window.innerHeight / 2);

        document.body.appendChild(glCanvas);
        gl = glCanvas.getContext('webgl2');

        glApp = PicoGL.createApp(glCanvas)
            .noDepthTest()
            .depthMask(false)
            .noStencilTest()
            .noScissorTest()
            // enable EXT_color_buffer_float extension
            .floatRenderTargets()
            .clearColor(0, 0, 0, 1);
            // .scissorTest()
            // .scissor(0, 0, canvas.width, canvas.height)
    }

    return {glCanvas, gl, glApp};
}
