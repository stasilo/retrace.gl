import PicoGL from 'picogl';
import {vec3, vec2} from 'gl-matrix';

import unpackFloat from 'glsl-read-float';
import march from '../cubemarch';
import StlExporter from '../stl-exporter';

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

const dataTextureSize = 2048;

async function sdfExportApp({
    scene,
    camera,
    shaderSampleCount,
    maxSampleCount,
    realTime,
    debug
}) {
    const {glCanvas, gl, glApp} = getGlInstances();
    let store = getStore();

    const materialData = scene.materials.getMaterialData();
    const sceneTextures = scene.textures.getTextures();

    const sdfData = scene.sdfGeometryData;
    const {bvhData, geometryData} = buildSceneBvh(scene);

    // https://webglfundamentals.org/webgl/lessons/webgl-data-textures.html
    const alignment = 1;
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, alignment);

    // let exportDims = [85, 85, 85]; // exportDims / resolution?
    // let exportBoundsA = [-10, -1, -10];
    // let exportBoundsB = [-1, 10, -1];


    let exportBoundsA = [-10, -0.1, -10];
    // let exportBoundsB = [0, 8, 0];
    let exportBoundsB = [0, 2, 0];
    // ^-- TODO: split aabb into ~4-6 parts and render to separate textures
    // in order to increase resolution

    let boundsDim = [
        exportBoundsB[0] - exportBoundsA[0],
        exportBoundsB[1] - exportBoundsA[1],
        exportBoundsB[2] - exportBoundsA[2]
    ];


    let base = boundsDim[0];
    let value = 135//130//93;//88;

    let exportDims = [
        Math.round((boundsDim[0] / base) * value),
        Math.round((boundsDim[1] / base) * value),
        Math.round((boundsDim[2] / base) * value)
    ];

    console.log('exportDims: ', exportDims);
    // exportDims = [88, 88, 88];

    console.log('boundsDim: ', boundsDim);

    const vertexCount = (exportDims[0] + 1) * (exportDims[1] + 1) * (exportDims[2] + 1);
    const exportSize = Math.ceil(Math.sqrt(vertexCount));

    console.log('export texture size: ', exportSize);
    console.log('cubeMarch vertexCount: ', vertexCount);
    console.log('cubeMarch exportSize/resolutioon: ', exportSize);

    // raytrace framebuffer
    let cubeMarchFboColorTarget = glApp.createTexture2D(exportSize, exportSize, {
        // type: gl.FLOAT,
        // internalFormat: gl.RGBA32F,
        // format: gl.RGBA
        format: gl.RGBA,
        type: gl.UNSIGNED_BYTE,
    });

    let cubeMarchFbo = glApp.createFramebuffer()
        .colorTarget(0, cubeMarchFboColorTarget)

    // framebuffer for accumulating samples
    // let accumFboColorTarget = glApp.createTexture2D(glApp.width, glApp.height, {
    //     type: gl.FLOAT,
    //     internalFormat: gl.RGBA32F,
    //     format: gl.RGBA
    // });
    //
    // let accumFbo = glApp.createFramebuffer()
    //     .colorTarget(0, accumFboColorTarget);

    /*
     * raytrace draw call
     */

    console.log('scene: ', scene);
    const shader = rayTraceShader({
        options: {
            exportSdf: true,
            realTime: true,
            glslCamera: false,
            numSamples: shaderSampleCount,
            dataTexSize: dataTextureSize,
        },
        Scene: scene
    });

    // console.log('shader: ', shader);

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
        .uniform('uResolution', vec2.fromValues(exportSize, exportSize))
        .uniform('uSdfExportDimensions', vec3.fromValues(...exportDims))
        .uniform('uSdfExportBoundsA', vec3.fromValues(...exportBoundsA))
        .uniform('uSdfExportBoundsB', vec3.fromValues(...exportBoundsB))
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

    // if(!realTime) {
    //     rayTraceDrawCall
    //         .texture('accumTexture', accumFbo.colorAttachments[0])
    //         .uniform('uOneOverSampleCount', 1/maxSampleCount);
    // }

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

    glApp.clear();

    camera.update();
    setCameraUniforms();

    // store.fpsTicker.tick();
    // store.updateSceneSrc();

    glApp.drawFramebuffer(cubeMarchFbo)
        .clear();

    // render sdf to framebuffer
    rayTraceDrawCall
        .uniform('uTime', 0)
        .uniform('uSeed', vec2.fromValues(random(), random()))
        .draw();

    // read sdf data from framebuffer
    const pixelCount = exportSize * exportSize;
    let pixels = new Uint8Array(pixelCount * 4).fill(0);

    glApp.readFramebuffer(cubeMarchFbo);
    glApp.gl.readPixels(
        0, 0,
        exportSize, exportSize,
        gl.RGBA, gl.UNSIGNED_BYTE,
        pixels
    );

    let previousValue = null;
    let containsGeometry = false;
    let blockPotentials = [];

    for (let i = 0; i < vertexCount; i++) {
        const r = pixels[i * 4 + 0];
        const g = pixels[i * 4 + 1];
        const b = pixels[i * 4 + 2];
        const a = pixels[i * 4 + 3];

        const value = unpackFloat(r, g, b, a);

        if (!containsGeometry && previousValue && (value > 0) !== (previousValue > 0)) {
            containsGeometry = true;
        }

        previousValue = value;
        blockPotentials[i] = value;
    }

    if (!containsGeometry) {
        alert('SDF export failed - could not find any geometry data within bounds!')
        return;
    }

    let result = march(
        blockPotentials,
        0,
        blockPotentials.length,
        exportDims,
        [exportBoundsA, exportBoundsB]
    );

    const stlExporter = new StlExporter();

    stlExporter.startModel('kaka.stl');
    stlExporter.addSection(result.vertices, result.faces);
    stlExporter.finishModel();
}

export default sdfExportApp;
