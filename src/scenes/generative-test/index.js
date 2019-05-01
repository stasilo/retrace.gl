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
import IsotropicMaterial from '../../materials/isotropic';

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

class GlassLightCube {
    constructor({scale, material, texture, glassDistance, ...props}) {
        delete this;

        return [
            new Cube({
                scale,
                material,
                texture,
                ...props
            }),
            new Cube({
                scale: {
                    x: scale.x + glassDistance,
                    y: scale.y + glassDistance,
                    z: scale.z + glassDistance
                },
                material: 'glass',
                ...props
            })
        ];
    }
}

export default async () => {
    return new Scene({
        geometries: [
            new Plane({
                material: 'metal-white', //'fuzzy-metal',
                texture: 'check',
                scale: 30,//50.0,
                position: {
                    x: 0.3,
                    y: 0.0,
                    z: -0.4
                },
                rotation: {
                    y: degToRad(60)
                }
            }),
            new Sphere({
                // material: 'volume',
                // // material: 'white-light',
                // // -0.8 till 1.2
                // position: {
                //     x: 0.5,
                //     y: 1,
                //     z: -0.5
                // },
                // radius: 3
                material: 'volume',
                // material: 'white-light',
                // -0.8 till 1.2
                position: {
                    x: 0.5,
                    y: 1.5,
                    z: -0.5
                },
                radius: 3
            }),
            // new Sphere({
            //     material: 'metal-white',
            //     // texture: 'check',
            //     position: {
            //         x: -4.5,
            //         y: 2.5,
            //         z: -7.5
            //     },
            //     radius: 2
            // }),

            new Sphere({
                material: 'ceil-light',
                // texture: 'check',
                position: {
                    x: -4.5,
                    y: 33,
                    z: -7.5
                },
                radius: 30
            }),
            range2d(0, 5, 0, 5).map(([x, z]) => {
                const material = pluckRandom([
                    `lambert-white`,
                    `emissive-${randomIdx(50)}`,
                    `emissive-${randomIdx(50)}`
                ]);

                const scale = 0.5;

                const props = {
                    material,
                    scale: {
                        x: scale,
                        y: scale
                            + random(0.2)
                            + maybe(() => random(0.7))
                            + maybe(() => random(1.4))
                            + maybe(() => maybe(() => random(1))),
                        z: scale,
                    },
                    position: {
                        x: 1.2 - x*(scale),
                        y: 0.1,
                        z: 0.1 - z*(scale)
                    },
                    // rotation: {
                    //     y: degToRad(-40),
                    // }
                    // rotation: {
                    //     z: degToRad(-10)
                    // }
                };

                let cubes = material === 'lambert-white'
                    ? new GlassLightCube({
                        ...props,
                        glassDistance: 0.01,
                    })
                    : new GlassLightCube({
                        ...props,
                        texture: `pattern-${randomIdx(6)}`,
                        glassDistance: 0.01,
                    });

                return material === 'lambert-white'
                    ? [
                        ...cubes,
                        new Sphere({
                            position: {
                                x: props.position.x,
                                y: props.position.y + props.scale.y/2,
                                z: props.position.z,
                            },
                            material: 'white-light',
                            radius: 0.1
                        })
                    ]
                    : cubes;
            })
        ],
        textures: [
            // new Texture({
            //     name: 'earth',
            //     url: '/assets/images/earthmap.jpg'
            // }),
            new Texture({
                name: 'check',
                src: `
                    // uv -= .5;
                    float s = sin(500.*uv.x)*sin(500.*uv.y);

                    if(s < 0.) {
                        //tColor = vec4(${random()}, ${random()}, ${random()}, 1.0);
                        tColor = vec4(${normedColorStr('#aaaaaa')}, 1.0);
                    } else {
                        tColor = vec4(0.05, 0.05, 0.05, 1.);
                    }
                `,
                // options: { 
                //     width: 600,
                //     height: 600
                // }
            }),
            ...range(0, 6).map(i => new Texture({
                name: `pattern-${i}`,
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
                        _st *= 0.5 + ${glslFloat(random(2))};

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

                        st = tile(st, 3.0);
                        st = rotateTilePattern(st);

                        // Make more interesting combinations

                        ${randomBool()
                            ? 'st = tile(st,2.0);'
                            : ''
                        }

                        ${randomBool()
                            ? `st = rotate2D(st,-PI * ${glslFloat(random(3))} * 0.25);`
                            : ''
                        }

                        // st = rotateTilePattern(st*2.);
                        // st = rotate2D(st,PI*u_time*0.25);

                        // step(st.x,st.y) just makes a b&w triangles
                        // but you can use whatever design you want.
                        tColor = vec4(vec3(step(st.x,st.y))*0.5, 1.0);
                    }
                `
            }))
        ],
        materials: [
            new IsotropicMaterial({
                name: `volume`,
                color: '#ff0000',
                density: 0.6, //0.4,
                albedo: [1.0, 1.0, 1.0]
            }),
            new LambertMaterial({
                name: `lambert-white`,
                color: '#050505',
                // fuzz: 0.15,
                albedo: [0.8, 0.8, 0.8]
            }),
            new MetalMaterial({
                name: `metal-white`,
                color: '#ffffff',
                fuzz: 0.15,
                albedo: [1, 1, 1]
            }),
            new EmissiveMaterial({
                name: `white-light`,
                color: '#ffffff',
                intensity: 100
            }),
            new EmissiveMaterial({
                name: `ceil-light`,
                color: '#ffffff',
                intensity: 1 //0.05
            }),
            new DialectricMaterial({
                name: 'glass'
            }),
            ...range(0, 50).map(i =>
                new EmissiveMaterial({
                    name: `emissive-${i}`,
                    color: [random()*0.1, random()*0.1, random()*0.1],
                    intensity: random(250, 500) //random(30, 50)
                })
            ),
            ...range(0, 50).map(i =>
                new LambertMaterial({
                    name: `lambert-${i}`,
                    color: [random(), random(), random()],
                    // fuzz: 0.15,
                    // albedo: [1, 1, 1]
                })
            )
        ]
    });
}
