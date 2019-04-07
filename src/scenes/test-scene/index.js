import Sphere from '../../models/sphere';
import XyRect from '../../models/xy-rect';

import {
    random,
    normedColor,
    normedColorStr
} from '../../utils';

import Scene from '../../dtos/scene';

let randomSpheres = [...Array(3)].map((_, i) =>
    new Sphere({
        center:[-4.5 + random(7), -0.2, -4.55 + random(3)],
        radius: 0.1 + random(0.1),
        material: 'LambertMaterial',
        color: `return vec3(${random()}, ${random()}, ${random()});` //'#ffffff'
    })
);

const sceneObjects = new Scene([
    new Sphere({
        id: 0,
        center: [0., -301, -5.],
        radius: 300.5,
        material: 'LambertMaterial',
        color: `
            p-=.5;
            float s = sin(10.*p.x)*sin(10.*p.y)*sin(10.*p.z);

            if(s < 0.) {
                return vec3(${random()}, ${random()}, ${random()});
                //return vec3(${normedColorStr('#661111')});
            } else {
                return vec3(${normedColorStr('#ffffff')});
            }
        `
    }),
    new XyRect({
        x0: -1.0,
        x1: 0.5,
        y0: -0.0,
        y1: 1,
        k: -4.1,
        material: 'LightMaterial',
        color: '#ffffff'
    }),
    new Sphere({
        center:[-1.5, 6.7, -1.25],
        radius: 2.0,
        material: 'LightMaterial',
        color: '#ffffff'
    }),
    // new XyRect({
    //     x0: -3,
    //     x1: -1,
    //     y0: -0.4,
    //     y1: 1,
    //     k: 0,
    //     material: 'LightMaterial',
    //     color: '#ffffff'
    // }),
    new Sphere({
        center:[-1.5, 0.2, -1.25],
        radius: 0.5,
        material: 'GlassMaterial',
        color: '#ffffff'
    }),
    new Sphere({
        center:[-0.35, -0.27, -1.],
        // center: [-0.35, '-0.27 + abs(sin(uTime*3.))*0.4', -1.],
        radius: 0.25,
        material: 'ShinyMetalMaterial',
        color: '#eeeeee'
    }),
    new Sphere({
        center:[0.0, -0.05, -1.8],
        radius: 0.5,
        material: 'MetalMaterial',
        color: '#ffffff'
    }),
    ...randomSpheres
]);

export default sceneObjects;
