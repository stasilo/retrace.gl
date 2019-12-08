import PicoGL from 'picogl';
import {definedNotNull, roundEven} from '../utils';

import getStore from '../store';

let gl, glCanvas, glImgCanvas, glApp;

const getGlInstances = () => {
    const store = getStore();

    if(!definedNotNull(glCanvas)) {
        glCanvas = document.createElement('canvas');
        glImgCanvas = document.createElement('canvas');

        glCanvas.setAttribute('id', 'gl-canvas');
        glImgCanvas.setAttribute('id', 'gl-img-canvas');

        const resRatio = store.currentrendererSettings.resolution; //0.73; //0.4; //0.73;
        const scale = (1/resRatio).toFixed(2);

        const canvasWidth = roundEven(window.innerWidth / scale);
        const canvasHeight = roundEven(window.innerHeight / scale);

        glCanvas.setAttribute('width', canvasWidth);
        glCanvas.setAttribute('height', canvasHeight);

        glImgCanvas.setAttribute('width', canvasWidth);
        glImgCanvas.setAttribute('height', canvasHeight);

        glCanvas.style.top = `50%`;
        glCanvas.style.left = `50%`;

        glImgCanvas.style.left = `50%`;
        glImgCanvas.style.top = `50%`;

        glCanvas.style.transform = `translate3d(-50%, -50%, 0) scale(${scale})`;
        glImgCanvas.style.transform = `translate3d(-50%, -50%, 0) scale(${scale})`;

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

        gl = glCanvas.getContext('webgl2', {
            preserveDrawingBuffer: true
        });
    }

    return {glCanvas, glImgCanvas, gl, glApp};
}


const resetCanvas = () => {
    if(glCanvas) {
        glCanvas.remove();
        glCanvas = null;
        glImgCanvas.remove();
        glImgCanvas = null;
    }
};

export {
    getGlInstances,
    resetCanvas
};
