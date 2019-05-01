import ObjLoader from 'obj-mtl-loader';
import {vec3} from 'gl-matrix';

import {geometryTypes} from '../../bvh';

import {
    range,
    defined,
    definedNotNull,
    normedColor,
    isHexColor,
    glslFloat
} from '../../utils';

class Sphere {
    includeInBvh = true;

    constructor({material, texture, radius, position}) {
        this.material = material;
        this.texture = texture;
        this.radius = radius;

        this.position = {
            x: 0,
            y: 0,
            z: 0,
            ...(defined(position)
                ? position
                : [])
        };
    }

    get geometryData() {
        return [
            // vec3 v0
            this.position.x,
            this.position.y,
            this.position.z,

            // vec3 v1
            this.radius,
            -1,
            -1,

            // vec3 v2
            -1,
            -1,
            -1,

            // vec3 n0
            -1,
            -1,
            -1,

            // vec3 n1
            -1,
            -1,
            -1,

            // vec3 n2
            -1,
            -1,
            -1,

            // vec3 t0
            -1,
            -1,
            -1,

            // vec3 t1
            -1,
            -1,
            -1,

            // vec3 t2
            -1,
            -1,
            -1,

            // vec3 meta1
            this.material.materialId,
            0, // smooth shading
            geometryTypes.sphere,

            // vec3 meta2
            defined(this.texture)
                ? this.texture.textureId
                : -1,
            -1,
            -1
        ]
    }
}

export default Sphere;
