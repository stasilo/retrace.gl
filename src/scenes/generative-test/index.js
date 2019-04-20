import Sphere from '../../models/sphere';
import XyRect from '../../models/xy-rect';
import Triangle from '../../models/triangle';

import ObjModel from '../../models/obj-model';
import BvhSphere from '../../models/bvh-sphere';

import Scene from '../../dtos/scene';

import Texture from '../../texture';

import MetalMaterial from '../../materials/metal';
import LambertMaterial from '../../materials/lambert';
import EmissiveMaterial from '../../materials/emissive';
import DialectricMaterial from '../../materials/dialectric';

import {
    random,
    randomIdx,
    pluckRandom,
    range,
    flatten,
    normedColor,
    normedColorStr,
    degToRad
} from '../../utils';

export default async () => {
    return new Scene({
        textures: [
            await new Texture({
                name: 'earth',
                url: '/assets/images/earthmap.jpg'
            }),
            await new Texture({
                name: 'check',
                src: `
                    // uv -= .5;
                    float s = sin(100.*uv.x)*sin(100.*uv.y);

                    if(s < 0.) {
                        tColor = vec4(${random()}, ${random()}, ${random()}, 1.0);
                    } else {
                        tColor = vec4(${normedColorStr('#ffffff')}, 1.0);
                    }
                `
            }),
            await new Texture({
                name: 'dynamic',
                src: `
                    vec2 rotate2D (vec2 _st, float _angle) {
                        _st -= 0.5;
                        _st =  mat2(cos(_angle),-sin(_angle),
                                    sin(_angle),cos(_angle)) * _st;
                        _st += 0.5;
                        return _st;
                    }

                    vec2 tile (vec2 _st, float _zoom) {
                        _st *= _zoom;
                        return fract(_st);
                    }

                    vec2 rotateTilePattern(vec2 _st) {

                        //  Scale the coordinate system by 2x2
                        _st *= 10.0;

                        //  Give each cell an index number
                        //  according to its position
                        float index = 0.0;
                        index += step(1., mod(_st.x,2.0));
                        index += step(1., mod(_st.y,2.0))*2.0;

                        //      |
                        //  2   |   3
                        //      |
                        //--------------
                        //      |
                        //  0   |   1
                        //      |

                        // Make each cell between 0.0 - 1.0
                        _st = fract(_st);

                        // Rotate each cell according to the index
                        if(index == 1.0){
                            //  Rotate cell 1 by 90 degrees
                            _st = rotate2D(_st,PI*0.5);
                        } else if(index == 2.0){
                            //  Rotate cell 2 by -90 degrees
                            _st = rotate2D(_st,PI*-0.5);
                        } else if(index == 3.0){
                            //  Rotate cell 3 by 180 degrees
                            _st = rotate2D(_st,PI);
                        }

                        return _st;
                    }

                    void renderTexture(vec2 uv, out vec4 tColor) {
                        vec2 st = uv;

                        st = tile(st,3.0);
                        st = rotateTilePattern(st);

                        // Make more interesting combinations
                        // st = tile(st,2.0);
                        // st = rotate2D(st,-PI*u_time*0.25);
                        // st = rotateTilePattern(st*2.);
                        // st = rotate2D(st,PI*u_time*0.25);

                        // step(st.x,st.y) just makes a b&w triangles
                        // but you can use whatever design you want.
                        tColor = vec4(vec3(step(st.x,st.y)),1.0);
                    }
                `
            })
        ],
        materials: [
            new MetalMaterial({
                name: 'fuzzy-metal',
                color: '#775b2b',
                fuzz: 0.0,
                albedo: [1, 1, 1]
            }),
            new LambertMaterial({
                name: 'lambert-ground',
                color: '#ffffff',
            }),
            new DialectricMaterial({
                name: 'glass'
            }),
            ...range(0, 50).map(i =>
                new EmissiveMaterial({
                    name: `emissive-${i}`,
                    color: [random()*0.1, random()*0.1, random()*0.1],
                    intensity: random(10, 18)
                })
            ),
            ...range(0, 50).map(i =>
                new MetalMaterial({
                    name: `lambert-${i}`,
                    color: [random(), random(), random()],
                    fuzz: 0.15,
                    albedo: [1, 1, 1]
                })
            )
        ],
        geometries: [
            new BvhSphere({
                material: 'lambert-ground',
                texture: 'check',
                position: {
                    x: 0,
                    y: -301,
                    z: -5
                },
                radius: 300.5
            }),
            new BvhSphere({
                material: 'lambert-ground',
                texture: 'check',
                position: {
                    x: 0.3,
                    y: 0.4,
                    z: -1.6
                },
                radius: 0.5
            }),

            // ...flatten(range(0, 30).map(i => {
            //     const position = {
            //         x: 1.9 + random(0, 0.5),
            //         y: random(0, 0.8),
            //         z: 0.2 + random(0, 0.5)
            //     };
            //
            //     const radius = random(0.03, 0.18);
            //
            //     return [
            //         new BvhSphere({
            //             material: `emissive-${randomIdx(0, 50)}`,
            //             position,
            //             radius,
            //         }),
            //         new BvhSphere({
            //             material: 'glass',
            //             position,
            //             radius: radius + 0.005
            //         })
            //     ];
            //
            // })),
            // ...flatten(range(0, 300).map(i => {
            //     const position = {
            //         x: -10 + random(0, 10),
            //         y: random(1.1, 2.3),
            //         z: -10 + random(0, 10)
            //     };
            //
            //     const radius = random(0.1, 0.25);
            //
            //     return [
            //         new BvhSphere({
            //             material: `emissive-${randomIdx(0, 50)}`,
            //             position,
            //             radius,
            //         }),
            //         new BvhSphere({
            //             material: 'glass',
            //             position,
            //             radius: radius + 0.005
            //         })
            //     ];
            //
            // })),
            // await new ObjModel({
            //     url: 'assets/models/hand.obj',
            //     material: 'fuzzy-metal',
            //     smoothShading: true,
            //     scale: 0.05,
            //     position: {
            //         x: 0.7,
            //         y: 0, //.35,
            //         z: -0.9
            //     },
            //     rotation: {
            //         x: degToRad(-10),
            //         // y: degToRad(70),
            //         // z: degToRad(-10)
            //     }
            // }),
            await new ObjModel({
                url: 'assets/models/cat.obj',
                material: 'fuzzy-metal',
                smoothShading: true,
                scale: 0.005,
                position: {
                    x: -0.3,
                    y: -0.6,
                    z: -0.5
                },
                rotation: {
                    y: degToRad(-20)
                }
            }),
            new Sphere({
                // center: [4.8, 9.4, 3.],
                center: [-1.8, 10.4, 1.],
                radius: 0,
                material: 'LightMaterial',
                color: '#151515'
            })
        ]
    });
}
