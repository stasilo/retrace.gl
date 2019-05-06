import ObjModel from '../../models/obj-model';
import Sphere from '../../models/sphere';
import Plane from '../../models/plane';
import Cube from '../../models/Cube';

import Scene from '../../dtos/scene';

import Texture from '../../texture';

import MetalMaterial from '../../materials/metal';
import LambertMaterial from '../../materials/lambert';
import EmissiveMaterial from '../../materials/emissive';
import DialectricMaterial from '../../materials/dialectric';

import IsotropicVolumeMaterial from '../../materials/isotropic-volume';
import AnisotropicVolumeMaterial from '../../materials/anisotropic-volume';

import * as babel from "@babel/core";

import {
    random,
    randomIdx,
    randomBool,
    maybe,
    pluckRandom,
    range,
    range2d,
    glslFloat,
    flatten,
    normedColor,
    normedColorStr,
    degToRad
} from '../../utils';

// console.log('kaka :D ')
//
// import _sphere from '!!raw-loader!./../../models/sphere';
// import _sphere from '!!raw-loader!./../../models/sphere';

let scene = Scene;
const sphere = Sphere;
const plane = Plane;
const texture = Texture;
const emissiveMaterial = EmissiveMaterial;
const lambertMaterial = LambertMaterial;
const _degToRad = degToRad;
const _normedColorStr = normedColorStr;

// var jsCode = babel.transform(`
//     console.log('helo :)');
//     console.dir(sphere);
//     new sphere({ material: 'volume' })
// `);
//
// console.log(jsCode);
//
// console.dir(eval(jsCode.code));
// eval(jsCode.code);

const code = babel.transform(`
    console.log('fasdfadf');

    new scene({
        geometries: [
            new plane({
                material: 'lambert-white',
                texture: 'check',
                scale: 30,
                position: {
                    x: 0.3,
                    y: 0.0,
                    z: -0.4
                },
                rotation: {
                    y: _degToRad(60)
                }
            }),
            new sphere({
                material: 'ceil-light',
                // texture: 'check',
                position: {
                    x: -4.5,
                    y: 15,
                    z: -7.5
                },
                radius: 10
            })
        ],
        textures: [
            new texture({
                name: 'check',
                src: \`
                    float s = sin(500.*uv.x)*sin(500.*uv.y);
                    if(s < 0.) {
                        tColor = vec4(\${_normedColorStr('#ff0000')}, 1.0);
                    } else {
                        tColor = vec4(1., 1., 1., 1.);
                    }
                \`
            }),
        ],
        materials: [
            new lambertMaterial({
                name: 'lambert-white',
                color: '#ffffff',
                albedo: [0.8, 0.8, 0.8]
            }),
            new emissiveMaterial({
                name: 'white-light',
                color: '#ffffff',
                intensity: 30
            }),
            new emissiveMaterial({
                name: 'ceil-light',
                color: '#ffffff',
                intensity: 0.1 //0.05
            })
        ]
    });
`);

export default async () => {
    return eval(code.code);
}
