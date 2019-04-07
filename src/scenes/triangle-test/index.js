import Sphere from '../../models/sphere';
import XyRect from '../../models/xy-rect';
import Triangle from '../../models/triangle';

import {
    random,
    normedColor,
    normedColorStr
} from '../../utils';

import Scene from '../../dtos/scene';

const sceneObjects = new Scene([
    new Sphere({
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
    new Sphere({
        center: [0., 0.1, -5.],
        radius: 0.3,
        material: 'LightMaterial',
        color: '#ffffff'
    }),
    // correct normal (triangle visible)
    new Triangle({
        vertices: [
            [0.2, 0.0, -1.5], // bot left
            [-0.2, 0.0, -1.5], // bot right
            [0.0, 1.5, -1.0], // top
        ],
        material: 'LightMaterial',
        color: '#ffffff'
    }),
    // normal pointing the wrong way
    // new Triangle({
    //     vertices: [
    //         [0.2, 0.0, -1.5], // bot left
    //         [-0.2, 0.0, -1.5], // bot right
    //         [0.0, -0.1, -1.0], // top
    //     ],
    //     material: 'LightMaterial',
    //     color: '#ffffff'
    // }),
    // new XyRect({
    //     x0: -1.0,
    //     x1: 0.5,
    //     y0: -0.0,
    //     y1: 1,
    //     k: -4.1,
    //     material: 'LightMaterial',
    //     color: '#ffffff'
    // })
]);

export default sceneObjects;
