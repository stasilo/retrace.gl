import {vec3} from 'gl-matrix';
import Hitable from '../hitable';

import {
    definedNotNull,
    normedColor,
    glslFloat
} from '../../utils';

// struct Hitable {
//     int geometry;
//     Material material;
//     vec3 color;
//
//     vec3 bMin, bMax;
//
//     // Sphere
//     vec3 center;
//     float radius;
//
//     // xy rect
//     float x0, x1, y0, y1;
//     float k;
// };

function Triangle({vertices, material, color}) {
    // super
    Hitable.call(this, {
        material,
        color
    });

    // Vec3f v0(-1, -1, 0), v1(1, -1, 0), v2(0, 1, 0);
    // Vec3f A = v1 - v0; // edge 0
    // Vec3f B = v2 - v0; // edge 1
    // Vec3f C = cross(A, B); // this is the triangle's normal

    this.getFaceNormal = () => {
        let v0 = vec3.fromValues(...vertices[0]);
        let v1 = vec3.fromValues(...vertices[1]);
        let v2 = vec3.fromValues(...vertices[2]);

        // edge 0
        let a = vec3.create();
        vec3.sub(a, v1, v0);

        // edge 1
        let b = vec3.create();
        vec3.sub(b, v2, v0);

        // normal
        let c = vec3.create();
        vec3.cross(c, a, b);

        let normal = vec3.create();
        vec3.normalize(normal, c);

        return `vec3(${Array.from(normal).map(n => glslFloat(n)).join(', ')})`;
    }

    this.getVertices = () => {
        return vertices
            .map(vertex => `vec3(${vertex.map(n => glslFloat(n)).join(', ')})`)
            .join(`,\n`);
    }

    this.getDefinition = () =>
        `Hitable(
            TRIANGLE_GEOMETRY,
            ${material}, // material
            vec3(1.), // color

            // bounding box
            vec3(-1.), vec3(-1.),

            // irrelevant props for triangle (sphere)
            vec3(-1.),
            -1.,

            // irrelevant props for triangle (xy rect)
            -1., -1., -1., -1.,
            -1.,

            // triangle props
            ${this.getVertices()},
            // face normal
            ${this.getFaceNormal()}
        );`;
}

export default Triangle;
