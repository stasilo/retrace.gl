import ObjLoader from 'obj-mtl-loader';
import {vec3} from 'gl-matrix';

import {geometryTypes} from '../../bvh';

import {
    range,
    defined,
    definedNotNull,
    normedColor,
    isHexColor,
    isArray,
    glslFloat
} from '../../utils';

class Sphere {
    includeInBvh = true;

    constructor({material, texture, normalMap, radius, position}) {
        this.material = material;
        this.radius = radius;
        this.position = {
            x: 0,
            y: 0,
            z: 0,
            ...(defined(position)
                ? position
                : [])
        };

        this.texture = texture;
        this.textureUvScale = {
            x: 1,
            y: 1,
            ...(defined(texture) && defined(texture.uvScale)
                ? texture.uvScale.x || texture.uvScale.y
                    ? texture.uvScale
                    : {x: texture.uvScale, y: texture.uvScale}
                : [])
        };

        this.normalMap = normalMap;
        this.normalMapScale = {
            x: 1,
            y: 1,
            ...(defined(normalMap) && defined(normalMap.scale)
                ? normalMap.scale.x || normalMap.scale.y
                    ? normalMap.scale
                    : {x: normalMap.scale, y: normalMap.scale}
                : [])
        };
        this.normalUvScale = {
            x: 1,
            y: 1,
            ...(defined(normalMap) && defined(normalMap.uvScale)
                ? normalMap.uvScale.x || normalMap.uvScale.y
                    ? normalMap.uvScale
                    : {x: normalMap.uvScale, y: normalMap.uvScale}
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
            -1,

            // vec3 meta3
            defined(this.normalMap)
                ? this.normalMap.textureId
                : -1,
            this.normalMapScale.x,
            this.normalMapScale.y,

            // vec3 meta4
            this.textureUvScale.x,
            this.textureUvScale.y,
            -1,

            // vec3 meta5
            this.normalUvScale.x,
            this.normalUvScale.y,
            -1
        ]
    }
}

export default Sphere;
