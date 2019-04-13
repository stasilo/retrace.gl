import Sphere from '../../models/sphere';
import XyRect from '../../models/xy-rect';
import Triangle from '../../models/triangle';
import ObjModel from '../../models/obj-model';

import Scene from '../../dtos/scene';

import MetalMaterial from '../../materials/metal';
import LambertMaterial from '../../materials/lambert';
import EmissiveMaterial from '../../materials/emissive';
import DialectricMaterial from '../../materials/dialectric';

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
                fuzz: 0.25,
                albedo: [0.5, 0.5, 0.5]
            }),
            new LambertMaterial({
                name: 'lambert',
                color: '#aaaaaa',
            }),
            new EmissiveMaterial({
                name: 'emissive',
                color: '#101010',
                intensity: 10
            }),
            new DialectricMaterial({
                name: 'glass'
            })
        ],
        geometries: [
            // await new ObjModel({
            //     url: 'assets/models/bunny.obj',
            //     material: 'fuzzy-metal', //'lambert',
            //     scale: 8,
            //     position: {
            //         x: -0.8,
            //         y: -0.6,
            //         z: -0.4
            //     },
            //     // 0.35, -0.18, -1.5
            //     rotation: {
            //         y: degToRad(160)
            //     }
            // }),
            await new ObjModel({
                url: 'assets/models/hand.obj',
                material: 'glass', //'fuzzy-metal',
                smoothShading: true,
                scale: 0.05,
                position: {
                    x: 0.5,
                    y: 0.35,
                    z: -1.8
                },
                rotation: {
                    // y: degToRad(-60),
                    y: degToRad(-70)
                }
                // rotation: {
                //     x: degToRad(-60),
                //     y: 0, //degToRad(30),
                //     z: degToRad(30)
                // }
            }),
            await new ObjModel({
                url: 'assets/models/deer.obj',
                material: 'fuzzy-metal',
                smoothShading: true,
                scale: 0.0012,
                position: {
                    x: -0.2,
                    y: -0.6,
                    z: -0.4
                },
                rotation: {
                    y: degToRad(0)
                }
            }),
            // await new ObjModel({
            //     url: 'assets/models/cat.obj',
            //     material: 'glass',
            //     scale: 0.004,
            //     position: {
            //         x: -0.3,
            //         y: -0.6,
            //         z: -0.5
            //     },
            //     rotation: {
            //         y: degToRad(0)
            //     }
            // }),
            // await new ObjModel({
            //     url: 'assets/models/cat.obj',
            //     material: 'lambert',
            //     scale: 0.005,
            //     position: {
            //         x: -0.2,
            //         y: -0.6,
            //         z: -0.4
            //     },
            //     rotation: {
            //         y: degToRad(0)
            //     }
            // }),
            // await new ObjModel({
            //     url: 'assets/models/suzanne.obj',
            //     material: 'fuzzy-metal',
            //     scale: 0.9,
            //     position: {
            //         x: -0.2,
            //         y: 0.4,
            //         z: -0.4
            //     },
            //     rotation: {
            //         // x: degToRad(0),
            //         y: degToRad(30),
            //         // z: degToRad(-30)
            //     }
            // }),
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
                center:[0.65, -0.18, -1.5],
                radius: 0.34,
                material: 'ShinyMetalMaterial',
                color: '#eeeeee'
            }),
            new Sphere({
                center:[1.0, -0.27, -0.3],
                radius: 0.25,
                material: 'GlassMaterial',
                color: '#eeeeee'
            }),
            new Sphere({
                // center: [4.8, 9.4, 3.],
                center: [-1.8, 10.4, 1.],
                radius: 4,
                material: 'LightMaterial',
                color: '#ddffff'
            })
        ]
    });
}
