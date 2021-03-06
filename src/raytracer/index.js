import PicoGL from 'picogl';
import {vec3, vec2} from 'gl-matrix';

// import spector from 'spectorjs';
import queryString from 'query-string';

import {getGlInstances} from '../gl';
import {createCamera} from '../camera';

import vertShader from '../shaders/vert.glsl';
import rayTraceShader from '../shaders/raytracer.glsl.js';
import renderShader from '../shaders/render.glsl';

import {buildSceneBvh} from '../bvh';

import {
    flatten,
    definedNotNull,
    random,
    normedColor,
    normedColorStr,
    animationFrame,
    range3d,
    asyncExecute
} from '../utils';

import getStore from '../store';

const dataTextureSize = 2048;

async function raytraceApp({
    scene,
    camera,
    shaderSampleCount,
    maxSampleCount,
    realTime,
    debug
}) {
    const {glCanvas, glImgCanvas, gl, glApp} = getGlInstances();
    let store = getStore();

    // const bgEl = document.getElementById('blob-bg');

    // force dom update
    await asyncExecute(() =>
        store.sceneCompilationInProgress = true
    );

    glImgCanvas.style.visibility = 'hidden';

    // if(debug) {
    //     let spectorGlDebug = new spector.Spector();
    //     spectorGlDebug.displayUI();
    // }

    const materialData = scene.materials.getMaterialData();
    const sceneTextures = scene.textures.getTextures();

    const sdfData = scene.sdfGeometryData;
    const {bvhData, geometryData} = buildSceneBvh(scene);

    // https://webglfundamentals.org/webgl/lessons/webgl-data-textures.html
    const alignment = 1;
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, alignment);

    // raytrace framebuffer
    let traceFboColorTarget = glApp.createTexture2D(glApp.width, glApp.height, {
        type: gl.FLOAT,
        internalFormat: gl.RGBA32F,
        format: gl.RGBA
    });

    let traceFbo = glApp.createFramebuffer()
        .colorTarget(0, traceFboColorTarget)

    // framebuffer for accumulating samples
    let accumFboColorTarget = glApp.createTexture2D(glApp.width, glApp.height, {
        type: gl.FLOAT,
        internalFormat: gl.RGBA32F,
        format: gl.RGBA
    });

    let accumFbo = glApp.createFramebuffer()
        .colorTarget(0, accumFboColorTarget);

    /*
     * raytrace draw call
     */

    const shader = rayTraceShader({
        options: {
            realTime,
            renderMode: store.renderMode,
            glslCamera: false,
            numSamples: shaderSampleCount,
            dataTexSize: dataTextureSize,
        },
        Scene: scene
    });

    const rayTraceGlProgram = glApp.createProgram(vertShader, shader);

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
        .vertexAttributeBuffer(0, positions)

    /*
     * uniforms
     */

    // bvh & geometry data

    let geometryDataPadded = new Float32Array(dataTextureSize * dataTextureSize * 3);
    let bvhDataPadded = new Float32Array(dataTextureSize * dataTextureSize * 3);
    let materialDataPadded = new Float32Array(dataTextureSize * dataTextureSize * 3);
    let sdfDataPadded = new Float32Array(dataTextureSize * dataTextureSize * 3).fill(-1);

    sdfData.forEach((v, n) =>
        sdfDataPadded[n] = v
    );

    geometryData.forEach((v, n) =>
        geometryDataPadded[n] = v
    );

    bvhData.forEach((v, n) =>
        bvhDataPadded[n] = v
    );

    materialData.forEach((v, n) =>
        materialDataPadded[n] = v
    );

    let geoDataTexture = glApp.createTexture2D(geometryDataPadded, dataTextureSize, dataTextureSize, {
        type: gl.FLOAT,
        internalFormat: gl.RGB32F,
        format: gl.RGB,
        generateMipmaps: false,
        minFilter: gl.NEAREST,
        magFilter: gl.NEAREST,
        wrapS: gl.CLAMP_TO_EDGE,
        wrapT: gl.CLAMP_TO_EDGE,
        flipY: false
    });

    let bvhDataTexture = glApp.createTexture2D(bvhDataPadded, dataTextureSize, dataTextureSize, {
        type: gl.FLOAT,
        internalFormat: gl.RGB32F,
        format: gl.RGB,
        generateMipmaps: false,
        minFilter: gl.NEAREST,
        magFilter: gl.NEAREST,
        wrapS: gl.CLAMP_TO_EDGE,
        wrapT: gl.CLAMP_TO_EDGE,
        flipY: false
    });

    let materialDataTexture = glApp.createTexture2D(materialDataPadded, dataTextureSize, dataTextureSize, {
        type: gl.FLOAT,
        internalFormat: gl.RGB32F,
        format: gl.RGB,
        generateMipmaps: false,
        minFilter: gl.NEAREST,
        magFilter: gl.NEAREST,
        wrapS: gl.CLAMP_TO_EDGE,
        wrapT: gl.CLAMP_TO_EDGE,
        flipY: false
    });

    let sdfDataTexture = glApp.createTexture2D(sdfDataPadded, dataTextureSize, dataTextureSize, {
        type: gl.FLOAT,
        internalFormat: gl.RGB32F,
        format: gl.RGB,
        generateMipmaps: false,
        minFilter: gl.NEAREST,
        magFilter: gl.NEAREST,
        wrapS: gl.CLAMP_TO_EDGE,
        wrapT: gl.CLAMP_TO_EDGE,
        flipY: false
    });

    /*
     * main raytrace draw call
     */

    //TODO: fix!
    const bgColors = definedNotNull(scene.background)
        ? [ ...normedColor(scene.background[0]),
            ...normedColor(scene.background[1]) ]
        : [ ...normedColor('#eeeeee'),
            ...normedColor('#ffffff') ];

    const rayTraceDrawCall = glApp
        .createDrawCall(rayTraceGlProgram, fullScreenQuadVertArray)
        .texture('uGeometryDataTexture', geoDataTexture)
        .texture('uBvhDataTexture', bvhDataTexture)
        .texture('uMaterialDataTexture', materialDataTexture)
        .texture('uSdfDataTexture', sdfDataTexture)
        .uniform('uBgGradientColors[0]', new Float32Array(bgColors))
        .uniform('uResolution', vec2.fromValues(glApp.width, glApp.height))
        .uniform('uSeed', vec2.fromValues(random(), random()))
        .uniform('uTime', 0);

    if(sceneTextures.length > 0) {
        sceneTextures.forEach(texture => {
            if(texture.src) {
                texture.renderDynamicTexture();
            } else if(texture.image) {
                texture.createImageTexture();
            } else if(texture.isVolumeTexture) {
                texture.createVolumeTexture();
            }

            rayTraceDrawCall.texture(`uSceneTex${texture.id}`, texture.texture)
        });
    }

    // TODO: REMOVE DIRECT STORE ACCESS FROM THIS FUNCTION!!! PASS AS PROPS
    // let sampleCount = store.renderMode == 'sdf'
    //     ? 2
    //     : maxSampleCount;

    if(!realTime) {
        rayTraceDrawCall
            .texture('accumTexture', accumFbo.colorAttachments[0])
            // .uniform('uOneOverSampleCount', 1/sampleCount);
            .uniform('uOneOverSampleCount', 1/store.currentMaxSampleCount);
    }

    // camera uniform
    // TODO: make this a uniform buffer?

    const setCameraUniforms = () => {
        let cameraUniform = camera.getUniform();
        Object.keys(cameraUniform)
            .forEach(uniformName =>
                rayTraceDrawCall.uniform(uniformName, cameraUniform[uniformName])
            );
    };

    setCameraUniforms();

    /*
     * render draw call
     */

    const renderGlProgram = glApp.createProgram(vertShader, renderShader);
    const renderDrawCall = glApp
        .createDrawCall(renderGlProgram, fullScreenQuadVertArray)
        .texture('traceTexture', traceFbo.colorAttachments[0]);

    // force dom update
    await asyncExecute(() =>
        store.sceneCompilationInProgress = false
    );

    // setTimeout(() => {
    //     store.sceneCompilationInProgress = false;
    // }, 100);
    // alert(store.sceneCompilationInProgress);

    const staticRender = () => {
        store.renderInProgress = true;

        const frame = animationFrame(({time, frameCount}) => {
            store.currentFrameCount = frameCount;
            store.currentRenderTime = time;

            // draw new rendered sample blended with accumulated
            // samples in accumFbo to traceFbo frambuffer

            glApp.drawFramebuffer(traceFbo)
                .clear();

            rayTraceDrawCall
                .uniform('uTime', time * 0.01)
                .uniform('uSeed', vec2.fromValues(random(), random()))
                .texture('uBvhDataTexture', bvhDataTexture)
                .draw();

            // copy rendered result in traceFbo to accumFbo frambuffer
            // for blending in the next raytrace draw call

            glApp.readFramebuffer(traceFbo)
                .drawFramebuffer(accumFbo)
                .clear()
                .blitFramebuffer(PicoGL.COLOR_BUFFER_BIT);

            // draw rendered result in traceFbo to screen
            glApp.defaultDrawFramebuffer()
                .clear();

            renderDrawCall
                .draw();

            if(frameCount >= store.currentMaxSampleCount) {
                store.renderInProgress = false;

                // save final render to separate canvas
                // in case we want to save the image
                // (webgl doesn't preserve drawing buffers)
                const {glImgCanvas} = getGlInstances();
                let imgCtx = glImgCanvas.getContext('2d');
                imgCtx.drawImage(glCanvas, 0, 0);

                // glImgCanvas.toBlob((blob) => {
                //     const url = URL.createObjectURL(blob);
                //
                //     bgEl.style.backgroundImage = `url('${url}')`;
                //     bgEl.style.visibility = 'visible';
                //
                // })

                frame.cancel();
                return;
            }
        });

        return frame;
    }

    const realTimeRender = () => {
        let then = 0;
        const frame = animationFrame(({time}) => {
            glApp.clear();

            camera.update();
            setCameraUniforms();

            store.fpsTicker.tick();
            store.updateSceneSrc();

            rayTraceDrawCall
                .uniform('uTime', time * 0.01)
                .uniform('uSeed', vec2.fromValues(random(), random()))
                .draw();
        });

        return frame;
    }

    // await asyncExecute(() =>
    //     bgEl.style.visibility = 'hidden'
    // );

    if(!realTime) {
        return staticRender();
    } else {
        return realTimeRender();
    }
}

export default raytraceApp;
