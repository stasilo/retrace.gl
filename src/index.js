import queryString from 'query-string';

import reglInstance from './regl-instance';
import {createCamera} from './camera';
import scene from './scenes/test-scene';

import vertShader from './shaders/vert.glsl';
import raytraceShader from './shaders/raytracer.glsl.js';

import {
    definedNotNull,
    random,
    normedColor,
    normedColorStr
} from './utils';

import 'normalize.css/normalize.css';
import './styles/index.scss';

const defaultMaxSampleCount = 30;

function app() {
    const canvas = document.getElementById('regl-canvas');
    const params = queryString.parse(location.search);

    const regl = reglInstance({canvas});

    const maxSampleCount = definedNotNull(params.sampleCount)
        ? params.sampleCount
        : defaultMaxSampleCount;

    const shaderSampleCount = params.realTime
        ? params.sampleCount || 1
        : 1;

    const camera = createCamera({
        lookFrom: [3.1, 0.8, 1.9],
        lookAt: [-0.25, 0.1, -1.5],
        vUp: [0, 1, 0],
        vfov: 32,
        aperture: 0.1,
        aspect: canvas.width/canvas.height
    });

    let traceFbo = regl.framebuffer({
        color: [
            regl.texture({
                width: canvas.width,
                height: canvas.height,
                format: 'srgba',
                type: 'float',
                mag: 'nearest',
                min: 'nearest'
            })
        ],
        stencil: false,
        depth: false
    });

    let accumFbo = regl.framebuffer({
        color: [
            regl.texture({
                width: canvas.width,
                height: canvas.height,
                format: 'srgba',
                type: 'float',
                mag: 'nearest',
                min: 'nearest'
            })
        ],
        stencil: false,
        depth: false
    });

    const rayTraceShaderSrc = raytraceShader({
        options: {
            realTime: params.realTime,
            glslCamera: false,
            numSamples: shaderSampleCount
        },
        objectList: scene
    });

    console.log(rayTraceShaderSrc);

    const rayTrace = regl({
        frag: rayTraceShaderSrc,
        vert: vertShader,
        attributes: {
            position: [
                -2, 0,
                0, -2,
                2, 2
            ]
        },
        uniforms: {
            ...camera.getUniform(),
            'accumTexture': () => accumFbo,
            'uBgGradientColors[0]': normedColor('#000000'),
            'uBgGradientColors[1]': normedColor('#111111'),
            // 'uBgGradientColors[0]': normedColor('#000000'),
            // 'uBgGradientColors[1]': normedColor('#111150'),
            'uSeed': regl.prop('seed'),
            'uOneOverSampleCount': regl.prop('oneOverSampleCount'),
            'uTime': ({tick}) =>
                0.01 * tick,
            'uResolution': ({viewportWidth, viewportHeight}) =>
                [viewportWidth, viewportHeight]
        },
        depth: {
            enable: false
        },
        count: 3,
        framebuffer: regl.prop('to')
    });

    const render = regl({
        frag: `
            precision highp float;

            uniform sampler2D traceTexture;
            varying vec2 uv;

            void main() {
            	vec3 accumSamples = texture2D(traceTexture, uv).rgb;
                gl_FragColor = vec4(accumSamples, 1.);
            }
        `,
        vert: vertShader,
        attributes: {
            position: [
                -2, 0,
                0, -2,
                2, 2
            ]
        },
        uniforms: {
            'traceTexture': () => traceFbo
        },
        depth: {
            enable: false
        },
        count: 3,
        framebuffer: regl.prop('to'),
    });

    const realTimeRender = () => {
        let then = 0;
        const frame = regl.frame((context) => {
            regl.clear({
                color: [0, 0, 0, 1]
            });

            // render scene
            rayTrace({
                seed: [random(), random()],
                oneOverSampleCount: null,
                to: null // screen
            });

            let now = context.time;
            const deltaTime = now - then;
            then = now;
            const fps = (1 / deltaTime).toFixed(1);

            document.getElementById('debug').innerHTML =
                `samples per frame: ${shaderSampleCount}, fps: ${fps}`;
        });
    }

    const staticRender = () => {
        let sampleCount = 1;
        let startTime = Date.now();

        const frame = regl.frame(() => {
            const elapsedTime = ((Date.now() - startTime) / 1000)
                .toFixed(2);

            document.getElementById('debug').innerHTML =
                `samples: ${sampleCount} / ${maxSampleCount}, render time: ${elapsedTime}s`;

            if(sampleCount == maxSampleCount) {
                frame.cancel();
            }

            regl.clear({
                color: [0, 0, 0, 1]
            });

            // render scene to trace framebuffer
            rayTrace({
                seed: [random(), random()],
                oneOverSampleCount: 1/maxSampleCount,
                to: traceFbo
            });

            // render trace framebuffer to accumulator framebuffer
            render({to: accumFbo});

            // render scene to screen
            render({to: null});

            ++sampleCount;
        });
    }

    if(!params.realTime) {
        staticRender();
    } else {
        realTimeRender();
    }
}

document.addEventListener('DOMContentLoaded', app);
