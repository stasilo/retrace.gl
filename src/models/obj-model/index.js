import ObjLoader from 'obj-mtl-loader';
import {vec3} from 'gl-matrix';

import {encodeObjModelTriangleVertexData} from '../../model-encoders/obj';

import {
    range,
    defined,
    definedNotNull,
    normedColor,
    isHexColor,
    glslFloat
} from '../../utils';

class ObjModel {
    includeInBvh = true;

    constructor({url, material, smoothShading, scale, position, rotation}) {
        this.url = url;
        this.material = material;
        this._geometryData = null;

        this.smoothShading = defined(smoothShading)
            ? smoothShading
            : false;

        this.scale = defined(scale)
            ? scale
            : 1;

        this.position = {
            x: 0,
            y: 0,
            z: 0,
            ...(defined(position)
                ? position
                : [])
        };

        this.rotation = {
            x: 0,
            y: 0,
            z: 0,
            ...(defined(rotation)
                ? rotation
                : [])
        };

        // "await new Obj()"
        return (async () => {
            this.mesh = await this.loadModel();
            return this;
        })();
    }

    get geometryData() {
        if(!this._geometryData) {
            this._geometryData = encodeObjModelTriangleVertexData({
                mesh: this.mesh,
                smoothShading: this.smoothShading,
                scale: this.scale,
                position: this.position,
                rotation: this.rotation,
                materialId: this.material.materialId
            });
        }

        return this._geometryData;
    }

    async loadModel() {
        return new Promise((resolve, reject) => {
            const objLoader = new ObjLoader();
            objLoader.load(this.url, (err, mesh) => {
                if(definedNotNull(err)) {
                    reject(err);
                }

                resolve(mesh);
            });
        });
    }
}

export default ObjModel;
