import PicoGL from 'picogl';
import {defined} from '../utils';

let gl, glCanvas, glImgCanvas, glApp;

function getGlInstances() {
    if(!defined(glCanvas)) {
        glCanvas = document.createElement('canvas');
        glImgCanvas = document.createElement('canvas');

        glCanvas.setAttribute('id', 'gl-canvas');
        glImgCanvas.setAttribute('id', 'gl-img-canvas');

        // https://webgl2fundamentals.org/webgl/lessons/webgl-anti-patterns.html

        const resRatio = 0.9; //0.73;
        const scale = 1/resRatio;

        const canvasWidth = Math.ceil(window.innerWidth / scale);
        const canvasHeight = Math.floor(window.innerHeight / scale);

        console.log('canvasWidth: ', canvasWidth);
        console.log('canvasHeight: ', canvasHeight);

        glCanvas.setAttribute('width', canvasWidth);
        glCanvas.setAttribute('height', canvasHeight);

        glCanvas.style.top = `50%`;
        glCanvas.style.left = `50%`;

        glCanvas.style.transform = `translate3d(-50%, -50%, 0) scale(${scale})`;


        // glCanvas.style.top = `50%`;
        // glCanvas.style.left = `50%`;
        //
        // glCanvas.style.transform = `translate3d(-50%, -50%, 0) scale(${scale})`;

        glImgCanvas.setAttribute('width', canvasWidth);
        glImgCanvas.setAttribute('height', canvasHeight);
        // glImgCanvas.style.display = 'none';
        glImgCanvas.style.visibility = 'hidden';
        glImgCanvas.style.pointerEvents = 'none';

        document.body.appendChild(glCanvas);
        document.body.appendChild(glImgCanvas);

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

        gl = glCanvas.getContext('webgl2');
    }

    return {glCanvas, glImgCanvas, gl, glApp};
}

export {getGlInstances};
