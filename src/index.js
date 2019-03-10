import PicoGL from 'picogl';
import {vec3, vec2} from 'gl-matrix';

import spector from 'spectorjs';
import Stats from 'stats.js';
import queryString from 'query-string';

import {createCamera} from './camera';
// import scene from './scenes/test-scene';
// import scene from './scenes/triangle-test';
import createMeshScene from './scenes/model-test';

import vertShader from './shaders/vert.glsl';
import rayTraceShader from './shaders/raytracer.glsl.js';
import renderShader from './shaders/render.glsl';

import ObjLoader from 'obj-mtl-loader';
import { getObjModelTriangleVertexData, buildBvh} from './bvh';

import {
    flatten,
    definedNotNull,
    random,
    normedColor,
    normedColorStr,
    animationFrame
} from './utils';

import 'normalize.css/normalize.css';
import './styles/index.scss';

const defaultMaxSampleCount = 3;

async function raytraceApp({triangleData, bvhData}) {
    const params = queryString.parse(location.search);
    const canvas = document.getElementById('regl-canvas');
    const gl = canvas.getContext('webgl2');

    const maxSampleCount = definedNotNull(params.sampleCount)
        ? params.sampleCount
        : defaultMaxSampleCount;

    const shaderSampleCount = params.realTime
        ? params.sampleCount || 1
        : 1;

    if(params.debug) {
        let spectorGlDebug = new spector.Spector();
        spectorGlDebug.displayUI();
    }

    const app = PicoGL.createApp(canvas)
        .noDepthTest()
        .depthMask(false)
        .noStencilTest()
        // .scissorTest()
        // .scissor(0, 0, canvas.width, canvas.height)
        .noScissorTest()
        // enable EXT_color_buffer_float extension
        .floatRenderTargets()
        .clearColor(0, 0, 0, 1);


    // https://webglfundamentals.org/webgl/lessons/webgl-data-textures.html
    // const alignment = 1;
    // gl.pixelStorei(gl.UNPACK_ALIGNMENT, alignment);

    // const camera = createCamera({
    //     lookFrom: [3.1, 0.8, 1.9],
    //     lookAt: [-0.25, 0.1, -1.5],
    //     vUp: [0, 1, 0],
    //     vfov: 32,
    //     aperture: 0.1,
    //     aspect: canvas.width/canvas.height
    // });

    // for triangle scene
    const camera = createCamera({
        lookFrom: [3.1, 0.8, 1.9],
        lookAt: [-0.25, -0.1, -1.5],
        vUp: [0, 1, 0],
        vfov: 30,
        aperture: 0.01,
        aspect: canvas.width/canvas.height
    });

    // raytrace framebuffer
    let traceFboColorTarget = app.createTexture2D(app.width, app.height, {
        type: gl.FLOAT,
        // interalFormat: gl.RGBA16F,
        // interalFormat: gl.R32F,
        format: gl.RGBA
    });

    let traceFbo = app.createFramebuffer()
        .colorTarget(0, traceFboColorTarget)

    // framebuffer for accumulating samples
    let accumFboColorTarget = app.createTexture2D(app.width, app.height, {
        type: gl.FLOAT,
        // interalFormat: gl.RGBA16F,
        // interalFormat: gl.R32F,
        format: gl.RGBA
    });

    let accumFbo = app.createFramebuffer()
        .colorTarget(0, accumFboColorTarget);

    /*
     * raytrace draw call
     */

    let scene = createMeshScene();

    const rayTraceGlProgram = app.createProgram(vertShader, rayTraceShader({
        options: {
            realTime: params.realTime,
            glslCamera: false,
            numSamples: shaderSampleCount
        },
        ObjectList: scene
    }));

    // full screen quad
    const positions = app.createVertexBuffer(PicoGL.FLOAT, 2,
        new Float32Array([
            -2, 0,
            0, -2,
            2, 2
        ])
    );

    const fullScreenQuadVertArray = app
        .createVertexArray()
        .vertexAttributeBuffer(0, positions)

    // uniforms

    let bvhTexHeight = 1024;
    let bvhTexWidth = 1024;

    let triangleTexHeight = 1024;
    let triangleTexWidth = 1024;

    console.log(`triangle texture dimensions: ${triangleTexWidth}x${triangleTexHeight}`);
    console.log(`bvh text dimensions: ${bvhTexWidth}x${bvhTexHeight}`);

    let bvhDataPadded = [
        ...bvhData,
        ...Array((bvhTexHeight*3)*(bvhTexWidth*3) - (bvhData.length/9))
            .fill(-1337)
    ];

    let triangleDataPadded = [
        ...triangleData,
        ...Array((triangleTexWidth*3)*(triangleTexHeight*3) - (triangleData.length/9))
            .fill(-1337)
    ];

    let triangleTexture = app.createTexture2D(new Float32Array(triangleDataPadded), triangleTexWidth, triangleTexHeight, {
        type: gl.FLOAT,
        // interalFormat: gl.RGBA16F,
        // interalFormat: gl.RGBA32F,
        format: gl.RGB,

        generateMipmaps: false,
        // minFilter: gl.LINEAR,
        // magFilter: gl.LINEAR,
        minFilter: gl.NEAREST,
        magFilter: gl.NEAREST,
        wrapS: gl.CLAMP_TO_EDGE,
        wrapT: gl.CLAMP_TO_EDGE,
        flipY: false
    });

    let bvhDataTexture = app.createTexture2D(new Float32Array(bvhDataPadded), bvhTexWidth, bvhTexHeight, {
        type: gl.FLOAT,
        // interalFormat: gl.RGBA16F,
        // interalFormat: gl.RGBA32F,
        format: gl.RGB,

        generateMipmaps: false,
        minFilter: gl.NEAREST,
        magFilter: gl.NEAREST,
        wrapS: gl.CLAMP_TO_EDGE,
        wrapT: gl.CLAMP_TO_EDGE,
        flipY: false
    });

    const rayTraceDrawCall = app
        .createDrawCall(rayTraceGlProgram, fullScreenQuadVertArray)
        .texture('uTriangleTexture', triangleTexture)
        .texture('uBvhDataTexture', bvhDataTexture)
        .uniform('uBgGradientColors[0]', new Float32Array([
            // ...normedColor('#eeeeee'),
            // ...normedColor('#ffffff')
            ...normedColor('#000000'),
            ...normedColor('#010101')
        ]))
        .uniform('uResolution', vec2.fromValues(app.width, app.height))
        .uniform('uSeed', vec2.fromValues(random(), random()))
        .uniform('uTime', 0);

    if(!params.realTime) {
        rayTraceDrawCall
            .texture('accumTexture', accumFbo.colorAttachments[0])
            .uniform('uOneOverSampleCount', 1/maxSampleCount);
    }

    // camera uniform
    // TODO: make this a uniform buffer

    const cameraUniform = camera.getUniform();
    Object.keys(cameraUniform)
        .forEach(uniformName =>
            rayTraceDrawCall.uniform(uniformName, cameraUniform[uniformName])
        );

    /*
     * render draw call
     */

    const renderGlProgram = app.createProgram(vertShader, renderShader);
    const renderDrawCall = app
        .createDrawCall(renderGlProgram, fullScreenQuadVertArray)
        .texture('traceTexture', traceFbo.colorAttachments[0]);


    // debug info
    let debugEl = document.getElementById('debug');

    // let stats = new Stats();
    // stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
    // document.body.appendChild(stats.dom);

    const staticRender = () => {
        const frame = animationFrame(({time, frameCount}) => {
            // stats.begin();
            debugEl.innerHTML =
                `samples: ${frameCount} / ${maxSampleCount},
                 render time: ${(time*0.001).toFixed(2)}s`;

            if(frameCount == maxSampleCount) {
                frame.cancel();
                return;
            }

            // draw new rendered sample blended with accumulated
            // samples in accumFbo to traceFbo frambuffer

            app.drawFramebuffer(traceFbo)
                // .clear();

            rayTraceDrawCall
                .uniform('uTime', time * 0.01)
                .uniform('uSeed', vec2.fromValues(random(), random()))
                .draw();

            ////////////////
            app.drawFramebuffer(accumFbo)
                // .clear();

            renderDrawCall
                // .texture('traceTexture', traceFbo.colorAttachments[0])
                .draw();

            // draw rendered result in traceFbo to screen
            app.defaultDrawFramebuffer()
                // .clear();

            renderDrawCall
                .draw();

            // stats.end();

            ///////////////////////////////////////////////////////////

            // copy rendered result in traceFbo to accumFbo frambuffer
            // for blending in the next raytrace draw call

            // app.readFramebuffer(traceFbo)
            //     .drawFramebuffer(accumFbo)
            //     .clear()
            //     .blitFramebuffer(PicoGL.COLOR_BUFFER_BIT);
            //
            // // draw rendered result in traceFbo to screen
            // app.defaultDrawFramebuffer()
            //     .clear();
            //
            // renderDrawCall
            //     .draw();

            ///////////////////////////////////////////////////////////
        });
    }

    const realTimeRender = () => {
        let then = 0;
        const frame = animationFrame(({time}) => {
            app.clear();

            rayTraceDrawCall
                .uniform('uTime', time * 0.01)
                .uniform('uSeed', vec2.fromValues(random(), random()))
                .draw();

            // const now = time;
            // const deltaTime = time - then;
            // then = time;
            //
            // const fps = (1000 / deltaTime).toFixed(3);
            // debugEl.innerHTML =
            //     `samples per frame: ${shaderSampleCount}, fps: ${fps}`;
        });
    }

    if(!params.realTime) {
        staticRender();
    } else {
        realTimeRender();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const objLoader = new ObjLoader();

    // objLoader.load('assets/models/hand.obj', async (err, mesh) => {
    // objLoader.load('assets/models/my_cube.obj', async (err, mesh) => {
    // objLoader.load('assets/models/octahedron.obj', async (err, mesh) => {
    // objLoader.load('assets/models/teapot.obj', async (err, mesh) => {
    // objLoader.load('assets/models/bunny.obj', async (err, mesh) => {
    // objLoader.load('assets/models/skull.obj', async (err, mesh) => {

    objLoader.load('assets/models/sphere.obj', async (err, mesh) => {
        const triangleData = getObjModelTriangleVertexData(mesh);
        const bvhData = buildBvh(triangleData);

        raytraceApp({triangleData, bvhData});
    });
});
