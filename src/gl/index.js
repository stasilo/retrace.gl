import PicoGL from 'picogl';
import {defined} from '../utils';

let gl, glCanvas, glImgCanvas, glApp;

function getGlInstances() {
    if(!defined(glCanvas)) {
        glCanvas = document.createElement('canvas');
        glImgCanvas = document.createElement('canvas');

        glCanvas.setAttribute('id', 'gl-canvas');
        glImgCanvas.setAttribute('id', 'gl-img-canvas');

        glCanvas.setAttribute('width', window.innerWidth / 2);
        glCanvas.setAttribute('height', window.innerHeight / 2);

        glImgCanvas.setAttribute('width', window.innerWidth / 2);
        glImgCanvas.setAttribute('height', window.innerHeight / 2);
        glImgCanvas.style.display = 'none';

        document.body.appendChild(glCanvas);
        document.body.appendChild(glImgCanvas);

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

    return {glCanvas, glImgCanvas, gl, glApp};
}

export {getGlInstances};
