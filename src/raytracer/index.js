import PicoGL from 'picogl';
import {vec3, vec2} from 'gl-matrix';

import spector from 'spectorjs';
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
    range3d
} from '../utils';

import getStore from '../store';

const defaultMaxSampleCount = 4;
const dataTextureSize = 2048;

const {glCanvas, glImgCanvas, gl, glApp} = getGlInstances();

//// TEMP
import SdfSphere from '../models/sdf-sphere';
import {
    sdfOpUnion,
    sdfOpUnionRound,
    sdfOpSubtract,
    sdfOpIntersect
} from '../models/sdf-model';
///////////

async function raytraceApp({
    scene,
    camera,
    shaderSampleCount,
    maxSampleCount,
    realTime,
    debug
}) {
    let store = getStore();

    if(debug) {
        let spectorGlDebug = new spector.Spector();
        spectorGlDebug.displayUI();
    }

    const materialData = scene.materials.getMaterialData();
    const sceneTextures = scene.textures.getTextures();
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
            glslCamera: false,
            numSamples: shaderSampleCount,
            dataTexSize: dataTextureSize
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

    let sdfDataPadded = new Float32Array(dataTextureSize * dataTextureSize * 3);
    sdfDataPadded.fill(-1);

    let s1 = new SdfSphere({radius: 10, position: {x: 0, y: 5, z: 0}});
    let s2 = new SdfSphere({radius: 10, position: {x: 9, y: 5, z: 0}});
    // let sdfData = sdfOpUnion(s1.geometryData(), s2.geometryData());

    let s3 = new SdfSphere({radius: 7, position: {x: 10, y: 25, z: 0}});

    let sdfData = sdfOpUnionRound({radius: 99.0},
        sdfOpSubtract(s2.geometryData(), s1.geometryData()),
        s3.geometryData()
    );

    console.log('sdfData: ', sdfData);

    // console.log('s1 sdf: ', s1.geometryData());

    sdfData.forEach((geoItem, n) =>
        sdfDataPadded[n] = geoItem
    );

    // struct SdfNode {
    //     int geoType;
    //     int opType; // if -1, no union next
    //     int materialId;
    //     vec3 dimensions;
    //     vec3 position;
    // };

    // sdfDataPadded[0] = 1; // sphere
    // sdfDataPadded[1] = 2; // union round
    // sdfDataPadded[2] = 0; // material 0
    //
    // sdfDataPadded[3] = 10; // vec3 dimnensions (radius)
    // sdfDataPadded[4] = 10;
    // sdfDataPadded[5] = 10;
    //
    // sdfDataPadded[6] = 0; // vec3 position (radius)
    // sdfDataPadded[7] = 5;
    // sdfDataPadded[8] = 0;
    //
    // ////
    //
    // sdfDataPadded[9] = 1; // sphere
    // sdfDataPadded[10] = 3; //substr
    // sdfDataPadded[11] = 0; // material 0
    //
    // sdfDataPadded[12] = 15; // vec3 dimnensions (radius)
    // sdfDataPadded[13] = 15;
    // sdfDataPadded[14] = 15;
    //
    // sdfDataPadded[15] = 5; // vec3 position
    // sdfDataPadded[16] = 35;
    // sdfDataPadded[17] = 0;
    //
    // ////
    //
    // sdfDataPadded[18] = 1; // sphere
    // sdfDataPadded[19] = -1; // the end
    // sdfDataPadded[20] = 0; // material 0
    //
    // sdfDataPadded[21] = 10; // vec3 dimnensions (radius)
    // sdfDataPadded[22] = 10;
    // sdfDataPadded[23] = 10;
    //
    // sdfDataPadded[24] = 5; // vec3 position
    // sdfDataPadded[25] = 20;
    // sdfDataPadded[26] = 0;

    geometryData.forEach((geoItem, n) =>
        geometryDataPadded[n] = geoItem
    );

    bvhData.forEach((bvhDataItem, n) =>
        bvhDataPadded[n] = bvhDataItem
    );

    materialData.forEach((materialDataItem, n) =>
        materialDataPadded[n] = materialDataItem
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
        sceneTextures.forEach(texture =>
            rayTraceDrawCall.texture(`uSceneTex${texture.id}`, texture.texture)
        );
    }

    if(!realTime) {
        rayTraceDrawCall
            .texture('accumTexture', accumFbo.colorAttachments[0])
            .uniform('uOneOverSampleCount', 1/maxSampleCount);
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
                let imgCtx = glImgCanvas.getContext('2d');
                imgCtx.drawImage(glCanvas, 0, 0);

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

    if(!realTime) {
        return staticRender();
    } else {
        return realTimeRender();
    }
}

export default raytraceApp;
