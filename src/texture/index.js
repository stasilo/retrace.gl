import PicoGL from 'picogl';
import {vec3, vec2} from 'gl-matrix';

import {getGlInstances} from '../gl';
import {defined, loadImage} from '../utils';

const {glCanvas, gl, glApp} = getGlInstances();

import vertShader from '../shaders/vert.glsl';
import createTexRenderShader from '../shaders/dynamicTexRender.glsl.js';

class Texture {
    constructor({name, url, src, options}) {
        this.name = name;
        this.url = url;
        this.src = src;

        this.image = null;
        this.texture = null;

        this.fboColorTarget = null;
        this.fbo = null;

        // image texture

        if(defined(url)) {
            return (async () => {
                this.image = await loadImage(url);
                this.texture = glApp.createTexture2D(this.image, {flipY: true});
                return this;
            })();
        }

        // dynamic texture

        if(defined(src)) {
            this.renderDynamicTexture(src);
        }
    }

    renderDynamicTexture(src) {
        this.fboColorTarget = glApp.createTexture2D(glApp.width, glApp.height, {
            // type: gl.FLOAT,
            // internalFormat: gl.RGBA32F,
            format: gl.RGBA,
            flipY: true
        });

        this.fbo = glApp.createFramebuffer()
            .colorTarget(0, this.fboColorTarget);

        // full screen quad
        const positions = glApp.createVertexBuffer(PicoGL.FLOAT, 2,
            new Float32Array([
                -2, 0,
                0, -2,
                2, 2
            ])
        );


        let fullScreenQuadVertArray = glApp
            .createVertexArray()
            .vertexAttributeBuffer(0, positions);

        console.dir(createTexRenderShader);
        const textureShaderSrc = createTexRenderShader({src});
        console.log(textureShaderSrc);
        let textureProgram = glApp.createProgram(vertShader, textureShaderSrc);

        let textureDrawCall = glApp
            .createDrawCall(textureProgram, fullScreenQuadVertArray)
            // .uniform('uResolution', vec2.fromValues(glApp.width, glApp.height));

        glApp.drawFramebuffer(this.fbo)
            .clear();

        textureDrawCall
            .draw();

        glApp.defaultDrawFramebuffer()
            .clear();

        this.texture = this.fbo.colorAttachments[0];
    }
}

export default Texture;
