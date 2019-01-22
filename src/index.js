import reglInstance from './regl-instance';

import {
    random,
    pluckRandom,
    normedColor,
    normedColorStr
} from './utils';

import {sphere, sphereList} from './models/sphere';

import vertShader from './shaders/vert.glsl';
import raytraceShader from './shaders/raytracer.glsl.js';

import 'normalize.css/normalize.css';
import './styles/index.scss';

(async function app() {
    const regl = await reglInstance({canvasId: 'regl-canvas'});

    const spheres = new sphereList([
        new sphere({
            id: 0,
            center: [0., -301, -5.],
            radius: 300.5,
            material: 'LambertMaterial',
            color: `
                float s = sin(10.*p.x)*sin(10.*p.y)*sin(10.*p.z);

                if(s < 0.) {
                    return vec3(${normedColorStr('#154535')});
                } else {
                    return vec3(${normedColorStr('#101010')});
                }
            `
        }),
        new sphere({
            id: 1,
            center: [-0.2, 0.5, -1.7], // sphere center
            radius: 0.5,
            material: 'FuzzyMetalMaterial',
            color: '#ffffff'
        }),
        new sphere({
            id: 2,
            center:[-1., -0.0, -1.25],
            radius: 0.5,
            material: 'GlassMaterial',
            color: '#ffffff'
        }),
        new sphere({
            id: 3,
            center:[-0.1, '-0.3 + abs(sin(uTime*3.))*0.4', -1.],
            radius: 0.25,
            material: 'ShinyMetalMaterial',
            color: '#eeeeee'
        }),
        new sphere({
            id: 4,
            center:[0.8, 0., -1.3],
            radius: 0.5,
            material: 'LambertMaterial',
            color: '#eeeeee'
        })
    ]);

    [...Array(3)].forEach((_, i) =>
        spheres.add(
            new sphere({
                id: 5+i,
                center:[-4.1 + random()*7.0, -0.2, -5.0 + random()*3.0],
                radius: 0.25, // radius
                material: 'FuzzyMetalMaterial', //pluckRandom(['LambertMaterial', 'FuzzyMetalMaterial']),
                color: '#252525'//'#451010' //'#ffffff'
            })
        )
    );

    const rayTrace = regl({
        frag: raytraceShader({
            options: {
                numSamples: 500
            },
            sphereList: spheres
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
            'uBgGradientColors[0]': normedColor('#ffffff'),
            'uBgGradientColors[1]': normedColor('#6666b3'),
            'uTime': ({tick}) =>
                0.01 * tick,
            'uResolution': ({viewportWidth, viewportHeight}) =>
                [viewportWidth, viewportHeight]
        },
        count: 3
    });

    regl.clear({
        color: [0, 0, 0, 1]
    });

    rayTrace();

    // regl.frame(() => {
    //     regl.clear({
    //         color: [0, 0, 0, 1]
    //     });
    //
    //     rayTrace();
    // })
})();
