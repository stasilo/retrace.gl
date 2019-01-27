import reglInstance from './regl-instance';

import {createCamera} from './models/camera';
import scene from './scenes/test-scene';

import vertShader from './shaders/vert.glsl';
import raytraceShader from './shaders/raytracer.glsl.js';

import {
    definedNotNull,
    random,
    normedColor,
    normedColorStr
} from './utils';

import queryString from 'query-string';

import 'normalize.css/normalize.css';
import './styles/index.scss';

const defaultMaxSampleCount = 300;

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
        lookFrom: [0.03, 0.9, 2.5],
        lookAt: [-0.25, 0.1, -1.5],
        vUp: [0, 1, 0],
        vfov: 35,
        aperture: 0.1,
        aspect: 2.0
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

    const rayTrace = regl({
        frag: raytraceShader({
            options: {
                realTime: params.realTime,
                glslCamera: false,
                numSamples: shaderSampleCount
            },
            objectList: scene
        }),
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
            'uBgGradientColors[1]': normedColor('#111150'),
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
        document.getElementById('samples').innerHTML = `(per frame) ${shaderSampleCount}`;

        const frame = regl.frame(() => {
            regl.clear({
                color: [0, 0, 0, 1]
            });

            // render scene
            rayTrace({
                seed: [random(0.1, 10), random(0.1, 10)],
                oneOverSampleCount: 1,
                to: null // screen
            });
        });
    }

    const staticRender = () => {
        let sampleCount = 1;

        const frame = regl.frame(() => {
            document.getElementById('samples').innerHTML = `${sampleCount} / ${maxSampleCount}`;

            if(sampleCount == maxSampleCount) {
                frame.cancel();
            }

            regl.clear({
                color: [0, 0, 0, 1]
            });

            // render scene to trace framebuffer
            rayTrace({
                seed: [random(0.1, 10), random(0.1, 10)],
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
