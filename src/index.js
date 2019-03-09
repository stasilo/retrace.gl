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

// import * as ObjLoader from 'webgl-obj-loader';
// import parseObj from 'wavefront-obj-parser';
// import expandObj from 'expand-vertex-data';

import ObjLoader from 'obj-mtl-loader';
import { BVHBuilderAsync, BVHVector3 } from 'BVH';

import { BVH_Build_Iterative } from './bvh';

import { Vector3 } from 'three';

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

function getTriangleVertexData(mesh) {
    // cube
    // let scale = 0.5;

    // sphere
    let scale = 0.2;

    // hand
    // let scale = 0.05;

    // diamond
    // let scale = 0.01;

    // // bunny
    // let scale = 8;

    // octahedron
    // let scale = 0.5; //0.5;

    // teapot
    // let scale = 0.01;

    // box
    // let modelTranslation = {
    //     x: 0,//0.4,
    //     y: -0.5,//-0.6,
    //     z: 0//-0.4
    // }

    // sphere
    let modelTranslation = {
        x: -0.3,//0.4,
        y: -0.3,//-0.6,
        z: -0.5//-0.4
    }

    // bunny
    // let modelTranslation = {
    //     x: 0.4,
    //     y: -0.6,
    //     z: -0.4
    // }

    // hand
    // let modelTranslation = {
    //     x: 1.5,//0.4,
    //     y: 0.3,//-0.6,
    //     z: 0.0//-0.4
    // }


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

    // encode triangles for texture packing

    let id = 0;
    let triangles = faces
        .reduce((tris, face) => {
            id++;

            return [
                ...tris,
                // v0
                // ...face[0], id, // rgba, a = id
                face[0][0] + modelTranslation.x, face[0][1] + modelTranslation.y, face[0][2] + modelTranslation.z,
                // v1 (g)
                // ...face[1], id,
                face[1][0] + modelTranslation.x, face[1][1] + modelTranslation.y, face[1][2] + modelTranslation.z,
                // v2 (b)
                // ...face[2], id
                face[2][0] + modelTranslation.x, face[2][1] + modelTranslation.y, face[2][2] + modelTranslation.z
            ];
        }, []);

    return triangles;
    // return new Float32Array(triangles);
}

async function buildBvhStructure(faces) {
    // Generate  the Bounding Volume Hierachy from an array of faces
    const maxTrianglesPerNode = 1;
    // let f = new Float32Array(flatten(faces));

    // console.log('UN-flattened faces: ');
    // console.dir(faces);
    // let f = new Float32Array(flatten(faces));


    return BVHBuilderAsync(new Float32Array(faces), maxTrianglesPerNode)
        .then((res) => {
            let nodeId = 1;
            const addBvhParentNodesAndIds = (currentNode, parentNode) => {
                if(definedNotNull(parentNode)) {
                    // currentNode.parent = parentNode;
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

            let triCount = 0;
            let moreThanOneTriInNode = 0;

            const iterateBvhNodes = (currentNode) => {
                let newNode;

                if(currentNode.node0 && currentNode.node1) {
                    // node flattened size: 1 + 3 + 1 + 3 + 1 = 9
                    newNode = [
                        // `id: ${currentNode.id}`, // 1
                        // `node0 (id: ${currentNode.node0.id}) off: ${currentNode.node0.id * 9}`, // 1
                        // `node1 (id: ${currentNode.node1.id}) off: ${currentNode.node1.id * 9}`, // 1
                        currentNode.id, // node id
                        //dubbelkolla detta!? * 3? (rgb för texture) * 9 för att debugga med array-offsets
                        currentNode.node0.id,// * 1, // node0 offset
                        currentNode.node1.id,// * 1, // node1 offset
                        ...currentNode.extentsMin, // len = 3
                        ...currentNode.extentsMax // len = 3
                    ];

                } else {
                    // startIndex:
                    // a.setFromArray(this.trianglesArray, triIndex*9);
                    // b.setFromArray(this.trianglesArray, triIndex*9+3);
                    // c.setFromArray(this.trianglesArray, triIndex*9+6);

                    // console.log('setting tri data with start index: ' + currentNode.startIndex);
                    let noOfTris = (currentNode.endIndex - currentNode.startIndex);

                    triCount += noOfTris;

                    if(noOfTris > 1) {
                        moreThanOneTriInNode++;
                    }

                    newNode = [
                        currentNode.startIndex*3, currentNode.endIndex*3, -1, //currentNode.startIndex, currentNode.startIndex,
                        -1, -1, -1, // padding
                        -1, -1, -1 // padding

                        // `(TRIANGLE) id: ${currentNode.id}`, // 1
                        // currentNode.startIndex, currentNode.startIndex, currentNode.startIndex,
                        // -1,
                        // currentNode.startIndex, currentNode.startIndex, currentNode.startIndex,
                        // -1
                    ];
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

            console.dir(res);
            console.log('tot no. of tris in bvh struct: ' + triCount);
            console.log('moreThanOneTriInNode: ' + moreThanOneTriInNode);
            console.log('done building bvh');

            return [res, bvhArray];
        });
}

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


    // KOLLA DETTA:
    // KÖRA RENDERBUFFER ISTÄLLET!?
    // three render target?
    // https://stackoverflow.com/questions/2213030/whats-the-concept-of-and-differences-between-framebuffer-and-renderbuffer-in-op

    // uniforms

    let bvhTexHeight = 1024;
    let bvhTexWidth = 1024;

    let triangleTexHeight = 1024;
    let triangleTexWidth = 1024;

    console.log(`triangle texture dimensions: ${triangleTexWidth}x${triangleTexHeight}`);
    console.log(`bvh text dimensions: ${bvhTexWidth}x${bvhTexHeight}`);

    // let bvhDataPadded = [
    //     ...bvhData,
    //     ...Array((bvhTexHeight*3)*(bvhTexWidth*3) - (bvhData.length/9))
    //         .fill(-1337)
    // ];
    let bvhDataPadded = bvhData;

    let triangleDataPadded = [
        ...triangleData,
        ...Array((triangleTexWidth*3)*(triangleTexHeight*3) - (triangleData.length/9))
            .fill(-1337)
    ];

    let triangleTexture = app.createTexture2D(new Float32Array(triangleDataPadded), triangleTexWidth, triangleTexHeight, {
    // let triangleTexture = app.createTexture2D(new Float32Array(triangleData), triangleTexWidth, triangleTexHeight, {
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
            ...normedColor('#eeeeee'),
            ...normedColor('#ffffff')

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

// document.addEventListener('DOMContentLoaded', app);

// https://people.sc.fsu.edu/~jburkardt/data/obj/obj.html

document.addEventListener('DOMContentLoaded', () => {
    let objLoader = new ObjLoader();
    objLoader.load('assets/models/sphere.obj', async (err, mesh) => {
    // objLoader.load('assets/models/hand.obj', async (err, mesh) => {
    // objLoader.load('assets/models/my_cube.obj', async (err, mesh) => {
    // objLoader.load('assets/models/octahedron.obj', async (err, mesh) => {
    // objLoader.load('assets/models/teapot.obj', async (err, mesh) => {
    // objLoader.load('assets/models/bunny.obj', async (err, mesh) => {
    // objLoader.load('assets/models/skull.obj', async (err, mesh) => {
        console.dir(mesh);

        let triangleData = getTriangleVertexData(mesh)//.slice(0, 1503*6);
        let total_number_of_triangles = (triangleData.length / 9);

        console.log('triangleData');
        console.dir(triangleData);
        console.log('no of tris (triangleData): ' +  total_number_of_triangles);

        console.log('trinagleData len: ' + triangleData.length);
        // 2048 = width of texture, 2048 = height of texture, 4 = r,g,b, and a components

        // aabb_array = new Float32Array(2048 * 2048 * 4);
        // 2048 = width of texture, 2048 = height of texture, 4 = r,g,b, and a components

        var vp0 = new Vector3();
        var vp1 = new Vector3();
        var vp2 = new Vector3();

        var triangle_b_box_min = new Vector3();
        var triangle_b_box_max = new Vector3();
        var triangle_b_box_centroid = new Vector3();

        var totalWork = new Uint32Array(total_number_of_triangles);
        var aabb_array = new Float32Array(1024 * 1024 * 3);

        for (let i = 0; i < total_number_of_triangles; i++) {
            triangle_b_box_min.set(Infinity, Infinity, Infinity);
            triangle_b_box_max.set(-Infinity, -Infinity, -Infinity);

            // record vertex positions
            vp0.set( triangleData[9 * i + 0], triangleData[9 * i + 1], triangleData[9 * i + 2] );
            vp1.set( triangleData[9 * i + 3], triangleData[9 * i + 4], triangleData[9 * i + 5] );
            vp2.set( triangleData[9 * i + 6], triangleData[9 * i + 7], triangleData[9 * i + 8] );

            triangle_b_box_min.copy(triangle_b_box_min.min(vp0));
            triangle_b_box_max.copy(triangle_b_box_max.max(vp0));
            triangle_b_box_min.copy(triangle_b_box_min.min(vp1));
            triangle_b_box_max.copy(triangle_b_box_max.max(vp1));
            triangle_b_box_min.copy(triangle_b_box_min.min(vp2));
            triangle_b_box_max.copy(triangle_b_box_max.max(vp2));

            triangle_b_box_centroid.set((triangle_b_box_min.x + triangle_b_box_max.x) * 0.5,
                                        (triangle_b_box_min.y + triangle_b_box_max.y) * 0.5,
                                        (triangle_b_box_min.z + triangle_b_box_max.z) * 0.5);

            aabb_array[9 * i + 0] = triangle_b_box_min.x;
            aabb_array[9 * i + 1] = triangle_b_box_min.y;
            aabb_array[9 * i + 2] = triangle_b_box_min.z;
            aabb_array[9 * i + 3] = triangle_b_box_max.x;
            aabb_array[9 * i + 4] = triangle_b_box_max.y;
            aabb_array[9 * i + 5] = triangle_b_box_max.z;
            aabb_array[9 * i + 6] = triangle_b_box_centroid.x;
            aabb_array[9 * i + 7] = triangle_b_box_centroid.y;
            aabb_array[9 * i + 8] = triangle_b_box_centroid.z;

            totalWork[i] = i;
        }

        console.log('aabb_array: ');
        console.dir(aabb_array);

        let buildnodes = BVH_Build_Iterative(totalWork, aabb_array);
        console.log('buildnodes: ');
        console.dir(buildnodes);

        // Copy the buildnodes array into the aabb_array
        for (let n = 0; n < buildnodes.length; n++) {
            aabb_array[9 * n + 0] = -1; // padding
            aabb_array[9 * n + 1] = buildnodes[n].idRightChild;
            aabb_array[9 * n + 2] = buildnodes[n].idLeftChild;
            aabb_array[9 * n + 3] = buildnodes[n].minCorner.x;
            aabb_array[9 * n + 4] = buildnodes[n].minCorner.y;
            aabb_array[9 * n + 5] = buildnodes[n].minCorner.z;
            aabb_array[9 * n + 6] = buildnodes[n].maxCorner.x;
            aabb_array[9 * n + 7] = buildnodes[n].maxCorner.y;
            aabb_array[9 * n + 8] = buildnodes[n].maxCorner.z;
        }

        raytraceApp({triangleData, bvhData: aabb_array});

        // return;

        // let [bvhObj, bvhData] = await buildBvhStructure(triangleData);
        // console.log('bvhData: ');
        // console.dir(bvhData);
        // console.dir(bvhObj);

        // raytraceApp({triangleData, bvhData});
    });
});
