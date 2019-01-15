import reglInstance from './regl-instance';

import vertShader from './shaders/vert.glsl';
import raytraceShader from './shaders/raytracer.glsl'

import 'normalize.css/normalize.css';
import './styles/index.scss';

(async function app() {
    const regl = await reglInstance({canvasId: 'regl-canvas'});

    const rayTrace = regl({
        frag: raytraceShader,
        vert: vertShader,
        attributes: {
            position: [
                -2, 0,
                0, -2,
                2, 2
            ]
        },
        uniforms: {
            uTime: ({tick}) => 0.01 * tick,
            uResolution: ({viewportWidth, viewportHeight}) => [viewportWidth, viewportHeight]
        },
        count: 3
    });

    regl.clear({
        color: [0, 0, 0, 1]
    });

    rayTrace();

    regl.frame(() => {
        regl.clear({
            color: [0, 0, 0, 1]
        });

        rayTrace();
    })
})();
