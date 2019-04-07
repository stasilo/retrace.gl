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
    normedColorStr
} from '../../utils';

export default async () => {
    return new Scene({
        materials: [
            new MetalMaterial({
                name: 'fuzzy-metal',
                fuzz: 0.2,
                albedo: [0.9, 0.9, 0.9]
            }),
            new LambertMaterial({
                name: 'lambert'
            }),
            new EmissiveMaterial({
                name: 'emissive',
                intensity: 10
            })
        ],
        geometries: [
            await new ObjModel({
                url: 'assets/models/bunny.obj',
                color: '#775b2b',
                material: 'fuzzy-metal',
                scale: 8,
                modelTranslation: {
                    x: 0.4,
                    y: -0.6,
                    z: -0.4
                }
            }),
            await new ObjModel({
                url: 'assets/models/hand.obj',
                color: '#aaaaaa',
                material: 'lambert',
                scale: 0.05,
                modelTranslation: {
                    x: -0.6,
                    y: 0.7,
                    z: -1.6
                }
            }),
            await new ObjModel({
                url: 'assets/models/sphere.obj',
                color: '#0000ff',
                material: 'lambert',
                scale: 0.1,
                modelTranslation: {
                    x: 1.4,
                    y: 0.2,
                    z: -1.4
                }
            }),
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
                center:[1.3, -0.27, -0.9],
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
