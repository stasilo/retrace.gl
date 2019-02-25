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
import { BVHBuilderAsync, BVHVector3 } from 'BVH';

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

const defaultMaxSampleCount = 10;

function getTriangleTextureData(mesh) {
    // cube
    // let scale = 0.5;

    // sphere
    // let scale = 0.1;

    // bunny
    let scale = 5;

    let translation = {
        x: 0.4,
        y: -0.6,
        z: -0.4
    }

    let vertices = mesh.vertices
        .map(v => v.slice(0,3)
        .map(vn => vn * scale));

    let faces = mesh.faces.map(face => {
        let idxs = face.indices
            .map(i => parseInt(i) - 1);

        return [
            vertices[idxs[0]],
            vertices[idxs[1]],
            vertices[idxs[2]],
            //-1 // padding for alpha channel (rgbA)
        ]
    });

    // Generate  the Bounding Volume Hierachy from an array of faces
    const maxTrianglesPerNode = 1;
    let f = new Float32Array(flatten(faces));

    const BVH = BVHBuilderAsync(f, maxTrianglesPerNode)
        .then((res) => {


            let nodeId = 1;
            const addBvhParentNodesAndIds = (currentNode, parentNode) => {
                if(definedNotNull(parentNode)) {
                    currentNode.parent = parentNode;
                    currentNode.id = nodeId++;
                }

                if(definedNotNull(currentNode['node0'])) {
                    addBvhParentNodesAndIds(currentNode['node0'], currentNode);
                }

                if(definedNotNull(currentNode['node1'])) {
                    addBvhParentNodesAndIds(currentNode['node1'], currentNode);
                }
            };

            res.rootNode.id = 0;
            addBvhParentNodesAndIds(res.rootNode, null);

            // bvh texture layout
            // float nodeId
            // vec3(minCorner)
            // float node0-index
            // vec3(maxCorner)
            // float node1-index

            // leaf node:
            // float nodeId
            // vec3(triangleArrayOffset)
            // float node0-index = -1
            // vec3(triangleArrayOffset)
            // float node1-index = -1s

            const rootNode = res.rootNode;
            let nodeDepth = 0;
            let bvhArray = [];

            const iterateBvhNodes = (currentNode) => {
                let newNode;

                if(currentNode.node0) {
                    // node flattened size: 1 + 3 + 1 + 3 + 1 = 9
                    newNode = [
                        `id: ${currentNode.id}`, // 1
                        ...currentNode.extentsMin, // 3
                        `node0 (id: ${currentNode.node0.id}) off: ${currentNode.node0.id * 9}`, // 1
                        ...currentNode.extentsMax, // 3
                        `node1 (id: ${currentNode.node1.id}) off: ${currentNode.node1.id * 9}`, // 1
                    ];

                } else {
                    // startIndex:
                    // a.setFromArray(this.trianglesArray, triIndex*9);
                    // b.setFromArray(this.trianglesArray, triIndex*9+3);
                    // c.setFromArray(this.trianglesArray, triIndex*9+6);

                    newNode = [
                        `(TRIANGLE) id: ${currentNode.id}`, // 1
                        currentNode.startIndex, currentNode.startIndex, currentNode.startIndex,
                        -1,
                        currentNode.startIndex, currentNode.startIndex, currentNode.startIndex,
                        -1
                    ]
                }


                bvhArray = [...bvhArray, ...newNode];
                currentNode.processed = true;

                if(definedNotNull(currentNode['node0'])) {
                    iterateBvhNodes(currentNode['node0']);
                }

                if(definedNotNull(currentNode['node1'])) {
                    iterateBvhNodes(currentNode['node1']);
                }
            };

            iterateBvhNodes(rootNode);

            // console.log(depth);
            console.dir(bvhArray);
            console.log('bvhArray length: ' + bvhArray.length);
            console.log('bvhArray max id: ' + nodeId);
            console.log('calc len: ' + nodeId * 9);

            console.dir(rootNode);
        });



    // return;
    // encode triangles for texture packing

    let id = 0;
    let triangles = faces
        .reduce((tris, face) => {
            id++;


            // face = face.map(vert => {
            //     // console.log('vert');
            //     // console.dir(vert);
            //
            //     vert[0] += translation.x;
            //     vert[1] += translation.y;
            //     vert[2] += translation.z;
            //
            //     return vert;
            // });

            return [
                ...tris,
                // v0
                // ...face[0], id, // rgba, a = id
                face[0][0] + translation.x, face[0][1] + translation.y, face[0][2] + translation.z, id,
                // v1 (g)
                // ...face[1], id,
                face[1][0] + translation.x, face[1][1] + translation.y, face[1][2] + translation.z, id,
                // v2 (b)
                // ...face[2], id
                face[2][0] + translation.x, face[2][1] + translation.y, face[2][2] + translation.z, id
            ];
        }, []);

    console.log('triangles: ');
    console.dir(triangles);

    // return triangles;
    return new Float32Array(triangles);
}

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
        interalFormat: gl.RGBA16F,
        // interalFormat: gl.R32F,
        format: gl.RGBA
    });

    let traceFbo = app.createFramebuffer()
        .colorTarget(0, traceFboColorTarget)

    // framebuffer for accumulating samples
    let accumFboColorTarget = app.createTexture2D(app.width, app.height, {
        type: gl.FLOAT,
        interalFormat: gl.RGBA16F,
        // interalFormat: gl.R32F,
        format: gl.RGBA
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
        ])
    );

    const fullScreenQuadVertArray = app
        .createVertexArray()
        .vertexAttributeBuffer(0, positions)

    // uniforms

    let triangleData = getTriangleTextureData(mesh);
    console.dir(triangleData);
    console.log('trinagleData lenght: ' + triangleData.length);
    console.log('texture width: ' + triangleData.length / 4);

    // 32 bits => 4 bytes
    let triangleTexture = app.createTexture2D(triangleData, triangleData.length / 4, 1, { // len / 4 because rgba
        type: gl.FLOAT,
        // interalFormat: gl.RGBA16F,
        interalFormat: gl.RGBA32F,
        format: gl.RGBA,

        generateMipmaps: false,
        minFilter: gl.LINEAR,
        magFilter: gl.LINEAR,
        wrapS: gl.CLAMP_TO_EDGE,
        wrapT: gl.CLAMP_TO_EDGE
    });

    const rayTraceDrawCall = app
        .createDrawCall(rayTraceGlProgram, fullScreenQuadVertArray)
        .texture('uTriangleTexture', triangleTexture)
        .uniform('uBgGradientColors[0]', new Float32Array([
            ...normedColor('#050505'),
            ...normedColor('#050505')

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
    // objLoader.load('assets/models/my_cube.obj', (err, result) => {
    // objLoader.load('assets/models/sphere.obj', (err, result) => {
    objLoader.load('assets/models/bunny.obj', (err, result) => {
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
});
