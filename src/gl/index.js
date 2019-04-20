import PicoGL from 'picogl';
import {defined} from '../utils';

let gl, glCanvas, glApp;

export function getGlInstances() {
    if(!defined(glCanvas)) {
        glCanvas = document.getElementById('gl-canvas');
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
