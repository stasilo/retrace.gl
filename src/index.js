import PicoGL from 'picogl';
import {vec3, vec2} from 'gl-matrix';

import spector from 'spectorjs';
import queryString from 'query-string';

import {createCamera} from './camera';
// import scene from './scenes/test-scene';
// import scene from './scenes/triangle-test';
import createMeshScene from './scenes/model-test';

import vertShader from './shaders/vert.glsl';
import rayTraceShader from './shaders/raytracer.glsl.js';
import renderShader from './shaders/render.glsl';

// import * as ObjLoader from 'webgl-obj-loader';
// import parseObj from 'wavefront-obj-parser';
// import expandObj from 'expand-vertex-data';
import ObjLoader from 'obj-mtl-loader';

import {
    definedNotNull,
    random,
    normedColor,
    normedColorStr,
    animationFrame
} from './utils';

import 'normalize.css/normalize.css';
import './styles/index.scss';

const defaultMaxSampleCount = 10;

function app({mesh}) {
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
        .noStencilTest()
        .noScissorTest()
        // enable EXT_color_buffer_float extension
        .floatRenderTargets()
        .clearColor(0, 0, 0, 1);

    // const camera = createCamera({
    //     lookFrom: [3.1, 0.8, 1.9],
    //     lookAt: [-0.25, 0.1, -1.5],
    //     vUp: [0, 1, 0],
    //     vfov: 32,
    //     aperture: 0.1,
    //     aspect: canvas.width/canvas.height
    // });

    const camera = createCamera({
        lookFrom: [3.1, 0.8, 1.9],
        lookAt: [-0.25, 0.1, -1.5],
        vUp: [0, 1, 0],
        vfov: 30,
        aperture: 0.00001,
        aspect: canvas.width/canvas.height
    });


    // raytrace framebuffer
    let traceFboColorTarget = app.createTexture2D(app.width, app.height, {
        type: gl.FLOAT,
        interalFormat: gl.RGBA16F,
        // interalFormat: gl.R32F,

        // format: gl.SRGBA
        // format: gl.SRGB_ALPHA
    });

    let traceFbo = app.createFramebuffer()
        .colorTarget(0, traceFboColorTarget)

    // framebuffer for accumulating samples
    let accumFboColorTarget = app.createTexture2D(app.width, app.height, {
        type: gl.FLOAT,
        interalFormat: gl.RGBA16F,
        // interalFormat: gl.R32F,

        // format: gl.SRGBA
        // format: gl.SRGB_ALPHA
    });

    let accumFbo = app.createFramebuffer()
        .colorTarget(0, accumFboColorTarget);

    /*
     * raytrace draw call
     */

    let scene = createMeshScene({mesh});

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
        ]
    ));

    const fullScreenQuadVertArray = app
        .createVertexArray()
        .vertexAttributeBuffer(0, positions)

    // uniforms

    const rayTraceDrawCall = app
        .createDrawCall(rayTraceGlProgram, fullScreenQuadVertArray)
        .uniform('uBgGradientColors[0]', new Float32Array([
            ...normedColor('#404040'),
            ...normedColor('#aaaaaa')

            // ...normedColor('#000000'),
            // ...normedColor('#010101')
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

    const staticRender = () => {
        const frame = animationFrame(({time, frameCount}) => {
            let sampleCount = frameCount;

            debugEl.innerHTML =
                `samples: ${sampleCount} / ${maxSampleCount},
                 render time: ${(time*0.001).toFixed(2)}s`;

            if(sampleCount == maxSampleCount) {
                frame.cancel();
                return;
            }

            // draw new rendered sample blended with accumulated
            // samples in accumFbo to traceFbo frambuffer

            app.drawFramebuffer(traceFbo)
                .clear();

            rayTraceDrawCall
                .uniform('uTime', time * 0.01)
                .uniform('uSeed', vec2.fromValues(random(), random()))
                .draw();

            // copy rendered result in traceFbo to accumFbo frambuffer
            // for blending in the next raytrace draw call

            app.readFramebuffer(traceFbo)
                .drawFramebuffer(accumFbo)
                .clear()
                .blitFramebuffer(PicoGL.COLOR_BUFFER_BIT);

            // draw rendered result in traceFbo to screen
            app.defaultDrawFramebuffer()
                .clear();

            renderDrawCall
                .draw();
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

            const now = time;
            const deltaTime = time - then;
            then = time;

            const fps = (1000 / deltaTime).toFixed(3);
            debugEl.innerHTML =
                `samples per frame: ${shaderSampleCount}, fps: ${fps}`;
        });
    }

    if(!params.realTime) {
        staticRender();
    } else {
        realTimeRender();
    }
}

// document.addEventListener('DOMContentLoaded', app);

document.addEventListener('DOMContentLoaded', () => {
    let objLoader = new ObjLoader();
    objLoader.load('assets/models/my_cube.obj', (err, result) => {
        console.dir(result);
        app({mesh: result});

        // if(err){
        // /*Handle error here*/
        // }
        // var vertices = result.vertices;
        // var faces = result.faces;
        // var normals = result.normals;
        // var textureCoords = result.textureCoords;
        // var facesMaterialsIndex = result.facesMaterialsIndex;
        // var materials = result.materials;
    });

    // fetch('assets/models/tree01.obj')
    // fetch('assets/models/my_cube.obj')
    //     .then(data => data.text())
    //     .then(data => {
    //         // let mesh = new ObjLoader.Mesh(data);
    //         let mesh = new ObjModel(data);
    //         console.log('Mesh: ');
    //         console.dir(mesh);
    //         // app({mesh});
    //     })
});
