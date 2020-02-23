import PicoGL from 'picogl';
import {vec3, vec2} from 'gl-matrix';

import unpackFloat from 'glsl-read-float';
import spector from 'spectorjs';
import queryString from 'query-string';

import march from '../cubemarch';
import StlExporter from '../stl-exporter';

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
    range,
    asyncExecute
} from '../utils';

import getStore from '../store';

const dataTextureSize = 2048;

async function sdfExportApp({
    sdfExportSettings,
    scene,
    camera,
    shaderSampleCount,
    maxSampleCount,
    realTime,
    debug
}) {
    const {glCanvas, glImgCanvas, gl, glApp} = getGlInstances();
    let store = getStore();

    let imgCtx = glImgCanvas.getContext('2d');
    imgCtx.drawImage(glCanvas, 0, 0);
    glImgCanvas.style.visibility = 'visible';

    const materialData = scene.materials.getMaterialData();
    const sceneTextures = scene.textures.getTextures();

    const sdfData = scene.sdfGeometryData;
    const {bvhData, geometryData} = buildSceneBvh(scene);

    // https://webglfundamentals.org/webgl/lessons/webgl-data-textures.html
    const alignment = 1;
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, alignment);

    /*
     * raytrace draw call
     */

    const numSdfCsgs = scene.sdfGeometries.length;
    const sdfBvhOffsets = scene.sdfGeometries
        .map(geo => geo.bvhSdfOffset);

    const shader = rayTraceShader({
        options: {
            exportSdf: true,
            realTime: true,
            glslCamera: false,
            numSdfCsgs: numSdfCsgs,
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

    // camera uniform
    // TODO: make this a uniform buffer?

    const setCameraUniforms = () => {
        let cameraUniform = camera.getUniform();
        Object.keys(cameraUniform)
            .forEach(uniformName =>
                rayTraceDrawCall.uniform(uniformName, cameraUniform[uniformName])
            );
    };

    camera.update();
    setCameraUniforms();

    const calcBoundExportParams = (exportBoundsA, exportBoundsB, resolution) => {
        let boundsDim = [
            exportBoundsB[0] - exportBoundsA[0],
            exportBoundsB[1] - exportBoundsA[1],
            exportBoundsB[2] - exportBoundsA[2]
        ];

        let base = boundsDim[0];

        let exportDims = [
            Math.round((boundsDim[0] / base) * resolution),
            Math.round((boundsDim[1] / base) * resolution),
            Math.round((boundsDim[2] / base) * resolution)
        ];

        const exportVertexCount = (exportDims[0] + 1)
            * (exportDims[1] + 1)
            * (exportDims[2] + 1);

        const exportSize = Math.ceil(Math.sqrt(exportVertexCount));

        return {
            exportBoundsA,
            exportBoundsB,
            exportDims,
            exportSize,
            exportVertexCount
        };
    };

    const splitBoundsVertically = (boundsA, boundsB, parts = 4) => {
        const aY = boundsA[1];
        const bY = boundsB[1];

        const partHeight = (bY - aY) / parts;

        return range(parts).map(i => ({
            exportBoundsA: [
                boundsA[0],
                boundsA[1] + (partHeight * i),
                boundsA[2]
            ],
            exportBoundsB: [
                boundsB[0],
                boundsA[1] + (partHeight * (i + 1)),
                boundsB[2]
            ]
        }));
    };


    let exportBoundsA = Object.values(sdfExportSettings.minCoords);
    let exportBoundsB = Object.values(sdfExportSettings.maxCoords);

    const res = sdfExportSettings.resolution;

    const initialBoundParams = calcBoundExportParams(exportBoundsA, exportBoundsB, res);
    let boundsToRender;

    const maxTexSizeBeforeSplit = 700;
    if(initialBoundParams.exportSize > maxTexSizeBeforeSplit) {
        let boundParts = 2;

        do {
            boundsToRender = splitBoundsVertically(
                exportBoundsA,
                exportBoundsB,
                boundParts
            ).map(bounds =>
                calcBoundExportParams(
                    bounds.exportBoundsA,
                    bounds.exportBoundsB,
                    res
                )
            );

            boundParts++;
        } while(
            boundsToRender[0].exportSize > maxTexSizeBeforeSplit
        );

    } else {
        boundsToRender = [initialBoundParams];
    }

    // raytrace framebuffer
    let cubeMarchFboColorTarget = glApp.createTexture2D(1, 1, {
        format: gl.RGBA,
        type: gl.UNSIGNED_BYTE,
    });

    let cubeMarchFbo = glApp.createFramebuffer()
        .colorTarget(0, cubeMarchFboColorTarget)

    const stlExporter = new StlExporter();
    stlExporter.startModel('retrace-sdf-export.stl');

    let exportFailed = false;
    for(const [i, bounds] of boundsToRender.entries()) {
        // force react dom update
        await asyncExecute(() => store.sdfExportProgress = (i + 1) / (boundsToRender.length - 1));

        cubeMarchFbo.resize(bounds.exportSize, bounds.exportSize);

        glApp
            .drawFramebuffer(cubeMarchFbo)
            .clear();

        // render sdf to framebuffer
        rayTraceDrawCall
            .uniform('uResolution', vec2.fromValues(bounds.exportSize, bounds.exportSize))
            .uniform('uSdfExportDimensions', vec3.fromValues(...bounds.exportDims))
            .uniform('uSdfExportBoundsA', vec3.fromValues(...bounds.exportBoundsA))
            .uniform('uSdfExportBoundsB', vec3.fromValues(...bounds.exportBoundsB))
            .uniform('uSdfBvhOffsets[0]', Uint32Array.from(sdfBvhOffsets))
            .uniform('uTime', 0)
            .uniform('uSeed', vec2.fromValues(random(), random()))
            .draw();

        // read sdf data from framebuffer
        const pixelCount = bounds.exportSize * bounds.exportSize;
        let pixels = new Uint8Array(pixelCount * 4).fill(0);

        glApp.readFramebuffer(cubeMarchFbo);
        glApp.gl.readPixels(
            0, 0,
            bounds.exportSize, bounds.exportSize,
            gl.RGBA, gl.UNSIGNED_BYTE,
            pixels
        );

        let previousValue = null;
        let containsGeometry = false;

        const blockPotentials = range(bounds.exportVertexCount)
            .map(i => {
                const r = pixels[i * 4 + 0];
                const g = pixels[i * 4 + 1];
                const b = pixels[i * 4 + 2];
                const a = pixels[i * 4 + 3];

                const value = unpackFloat(r, g, b, a);

                if(!containsGeometry && previousValue
                    && (value > 0) !== (previousValue > 0))
                {
                    containsGeometry = true;
                }

                previousValue = value;

                return value;
            });

        // if this is the only bound slice we have a problem,
        // otherwise the bound is probably too big and contains an empty slice

        if(!containsGeometry) {
            if(boundsToRender.length == 1) {
                exportFailed = true;
                break;
            } 

            continue;
        }

        const result = march(
            blockPotentials,
            0,
            blockPotentials.length,
            bounds.exportDims,
            [bounds.exportBoundsA, bounds.exportBoundsB]
        );

        if(!exportFailed) {
            stlExporter.addSection(result.vertices, result.faces);
        } else {
            alert('SDF export failed - could not find any geometry data within bounds!');
        }
    }

    stlExporter.finishModel();
}

export default sdfExportApp;
