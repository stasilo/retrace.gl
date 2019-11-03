import PicoGL from 'picogl';
import {vec3, vec2} from 'gl-matrix';

import {getGlInstances} from '../../gl';
import {defined, loadImage} from '../../utils';

import vertShader from '../../shaders/vert.glsl';
import createTexRenderShader from '../../shaders/dynamicTexRender.glsl.js';

class Texture {
    constructor({name, url, src, options}) {
        this.name = name;
        this.url = url;
        this.src = src;

        this.image = null;
        this.texture = null;

        this.options = options;

        if(defined(url)) {
            return (async () => {
                this.image = await loadImage(url);
                return this;
            })();
        }
    }

    createImageTexture() {
        const {glApp} = getGlInstances();

        this.texture = glApp.createTexture2D(this.image, {
            flipY: true,
            ...this.options
        });
    }

    renderDynamicTexture() {
        const {glCanvas, gl, glApp} = getGlInstances();

        const {width, height, ...opts} = defined(this.options)
            && defined(this.options.width)
            && defined(this.options.height)
                ? options
                : {
                    width: glCanvas.width,
                    height: glCanvas.height,
                    ...this.options
                };

        let fboColorTarget = glApp.createTexture2D(width, height, {
                format: gl.RGBA,
                flipY: true,
                ...opts,
            });

        let fbo = glApp.createFramebuffer()
            .colorTarget(0, fboColorTarget);

        // full screen quad
        const positions = glApp.createVertexBuffer(PicoGL.FLOAT, 2,
            new Float32Array([
                -2, 0,
                0, -2,
                2, 2
            ])
        );

        const fullScreenQuadVertArray = glApp
            .createVertexArray()
            .vertexAttributeBuffer(0, positions);

        const textureShaderSrc = createTexRenderShader({src: this.src});
        const textureProgram = glApp.createProgram(vertShader, textureShaderSrc);

        const textureDrawCall = glApp
            .createDrawCall(textureProgram, fullScreenQuadVertArray)

        glApp.drawFramebuffer(fbo)
            .clear();

        textureDrawCall
            .draw();

        glApp.defaultDrawFramebuffer()
            .clear();

        this.texture = fbo.colorAttachments[0];
    }
}

export default Texture;
