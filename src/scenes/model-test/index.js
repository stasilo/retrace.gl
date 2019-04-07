import Sphere from '../../models/sphere';
import XyRect from '../../models/xy-rect';
import Triangle from '../../models/triangle';
import ObjModel from '../../models/obj-model';

import Scene from '../../dtos/scene';

import MetalMaterial from '../../materials/metal';
import LambertMaterial from '../../materials/lambert';
import EmissiveMaterial from '../../materials/emissive';

import {
    random,
    normedColor,
    normedColorStr,
    degToRad
} from '../../utils';

export default async () => {
    return new Scene({
        materials: [
            new MetalMaterial({
                name: 'fuzzy-metal',
                color: '#775b2b',
                fuzz: 0.3,
                albedo: [1.0, 1.0, 1.0]
            }),
            new LambertMaterial({
                name: 'lambert',
                color: '#aaaaaa',
            }),
            new EmissiveMaterial({
                name: 'emissive',
                color: '#101010',
                intensity: 10
            })
        ],
        geometries: [
            await new ObjModel({
                url: 'assets/models/bunny.obj',
                color: '#775b2b',
                material: 'fuzzy-metal',
                scale: 8,
                position: {
                    x: 0.4,
                    y: -0.6,
                    z: -0.4
                },
                rotation: {
                    y: degToRad(90)
                }
            }),
            await new ObjModel({
                url: 'assets/models/hand.obj',
                material: 'lambert',
                scale: 0.05,
                position: {
                    x: 0.3,
                    y: 0.4,
                    z: -1.8
                },
                rotation: {
                    x: degToRad(-60),
                    y: 0, //degToRad(30),
                    z: degToRad(30)
                }
            }),
            // await new ObjModel({
            //     url: 'assets/models/sphere.obj',
            //     color: '#0000ff',
            //     material: 'lambert',
            //     scale: 0.1,
            //     position: {
            //         x: 1.4,
            //         y: 0.2,
            //         z: -1.4
            //     }
            // }),
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
                center:[0.35, -0.18, -1.5],
                // center:[0.55, 0.5, -1.],
                radius: 0.34,
                material: 'ShinyMetalMaterial',
                color: '#eeeeee'
            }),
            new Sphere({
                center:[1.0, -0.27, -0.6],
                // center:[0.55, 0.5, -1.],
                radius: 0.25,
                material: 'GlassMaterial',
                color: '#eeeeee'
            }),
            new Sphere({
                center: [-0.3, 9.4, 3.],
                radius: 4,
                material: 'LightMaterial',
                color: '#ddffff'
            })
        ]
    });
}
