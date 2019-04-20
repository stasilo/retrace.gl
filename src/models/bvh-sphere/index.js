import ObjLoader from 'obj-mtl-loader';
import {vec3} from 'gl-matrix';

import {encodeBvhSphereTriangleVertexData} from '../../model-encoders/obj';
import {geometryTypes} from '../../bvh';

import {
    range,
    defined,
    definedNotNull,
    normedColor,
    isHexColor,
    glslFloat
} from '../../utils';

class BvhSphere {
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
        console.log('geo type sphere: ' + geometryTypes.sphere);

        return [
            // vec3 v0
            this.position.x,
            this.position.y,
            this.position.z,

            // vec3 v1
            this.radius,
            defined(this.texture)
                ? this.texture.textureId
                : -1,
            -1,

            // vec3 v2
            -1,
            -1,
            -1,

            // vec3 meta
            this.material.materialId,
            0, // smooth shading
            geometryTypes.sphere,

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
            -1
        ]
    }
}

export default BvhSphere;
