import PicoGL from 'picogl';
import {vec3, vec2} from 'gl-matrix';

import {getGlInstances} from '../../gl';
import {defined, loadImage} from '../../utils';

const {glCanvas, gl, glApp} = getGlInstances();

import vertShader from '../../shaders/vert.glsl';
import createTexRenderShader from '../../shaders/dynamicTexRender.glsl.js';

class Texture {
    constructor({name, url, src, options}) {
        this.name = name;
        this.url = url;
        this.src = src;

        this.image = null;
        this.texture = null;

        // image texture

        if(defined(url)) {
            return (async () => {
                this.image = await loadImage(url);
                this.texture = glApp.createTexture2D(this.image, {
                    flipY: true,
                    ...options
                });

                return this;
            })();
        }

        // dynamic texture

        if(defined(src)) {
            this.renderDynamicTexture(src, options);
        }
    }

    renderDynamicTexture(src, options) {
        const {width, height, ...opts} = defined(options)
            && defined(options.width)
            && defined(options.height)
                ? options
                : {
                    width: glApp.width,
                    height: glApp.height,
                    ...options
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

        const textureShaderSrc = createTexRenderShader({src});
        const textureProgram = glApp.createProgram(vertShader, textureShaderSrc);

        const textureDrawCall = glApp
            .createDrawCall(textureProgram, fullScreenQuadVertArray)
            // .uniform('uResolution', vec2.fromValues(glApp.width, glApp.height));

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
