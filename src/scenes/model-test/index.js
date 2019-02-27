import Sphere from '../../models/sphere';
import XyRect from '../../models/xy-rect';
import Triangle from '../../models/triangle';

import ObjectList from '../../dtos/object-list';

import {
    random,
    normedColor,
    normedColorStr
} from '../../utils';

import chunk from 'lodash.chunk';

export default ({mesh}) => {
    // let scale = 0.5;
    //
    // let vertices = mesh.vertices
    //     .map(v => v.slice(0,3)
    //     .map(vn => vn * scale));
    //
    // let faces = mesh.faces.map(face => {
    //     let idxs = face.indices
    //         .map(i => parseInt(i) - 1);
    //
    //     return [
    //         vertices[idxs[0]],
    //         vertices[idxs[1]],
    //         vertices[idxs[2]]
    //     ];
    // });
    //
    // let triangles = faces
    //     .map(triangle => {
    //         return new Triangle({
    //             vertices: [
    //                 triangle[0],
    //                 triangle[1],
    //                 triangle[2],
    //
    //                 // triangle[0],
    //                 // triangle[1],
    //                 // triangle[2],
    //
    //                 // [0.2, 0.0, -1.5], // bot left
    //                 // [-0.2, 0.0, -1.5], // bot right
    //                 // [0.0, 1.5, -1.0], // top
    //             ],
    //             material: 'LambertMaterial',
    //             color: '#ff2020'
    //         });
    //     });
    //
    // console.log('triangles: ');
    // console.dir(triangles);

    return new ObjectList([
        // ...triangles,
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
        // new Sphere({
        //     center:[0.55, -0.27, -1.],
        //     // center:[0.55, 0.5, -1.],
        //     radius: 0.25,
        //     material: 'ShinyMetalMaterial',
        //     color: '#eeeeee'
        // }),
        new Sphere({
            center: [-0.5, 5.4, 2.],
            radius: 2.5,
            material: 'LightMaterial',
            color: '#ffffff'
        }),
        // correct normal (triangle visible)
        // new Triangle({
        //     vertices: [
        //         [0.2, 0.0, -1.5], // bot left
        //         [-0.2, 0.0, -1.5], // bot right
        //         [0.0, 1.5, -1.0], // top
        //     ],
        //     material: 'LightMaterial',
        //     color: '#ffffff'
        // }),
    ]);
}
