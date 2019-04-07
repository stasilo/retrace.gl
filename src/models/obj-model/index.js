import ObjLoader from 'obj-mtl-loader';
import {vec3} from 'gl-matrix';

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

    constructor({url, scale, modelTranslation, color, material}) {
        this.url = url;
        this.material = material;

        this.scale = defined(scale)
            ? scale
            : 1;

        this.color = defined(color)
            ? color
            : '#ffffff';

        this.modelTranslation = defined(modelTranslation)
            ? modelTranslation
            : {x: 0, y: 0, z: 0};

        this.__triangleData = null;

        return (async () => {
            this.mesh = await this.loadModel();
            return this;
        })();
    }

    get triangleData() {
        if(!this.__triangleData) {
            this.__triangleData = this.parseObjModelTriangleVertexData(this.mesh);
        }

        return this.__triangleData;
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

    parseObjModelTriangleVertexData(mesh) {
        console.log('parseObjModelTriangleVertexData() this: ');
        console.dir(this);

        let vertices = mesh.vertices
            .map(va =>
                va.slice(0,3).map(v => v * this.scale)
            );

        // get face vertices
        let faces = mesh.faces
            .map(face => {
                let idxs = face.indices
                    .map(i => parseInt(i) - 1);

                // convert quad polygons to triangles
                // https://stackoverflow.com/questions/23723993/converting-quadriladerals-in-an-obj-file-into-triangles
                // 0 (i) (i + 1)  [for i in 1..(n - 2)]

                let faces = range(0, idxs.length - 2).map((_, i) => {
                    return [
                        vertices[idxs[0]],
                        vertices[idxs[i + 1]],
                        vertices[idxs[i + 2]]
                    ];
                });

                return faces;
            })
            .reduce((allFaces, faceArr) => { // flatten
                return [...allFaces, ...faceArr];
            }, []);

        // encode triangles for bvh construction & texture packing

        console.log('Encoding material id: ' + this.material.materialId);


        let id = 0;
        let triangles = faces
            .reduce((tris, face) => {
                id++;
                return [
                    ...tris,
                    // vec3 v0
                    face[0][0] + this.modelTranslation.x,
                    face[0][1] + this.modelTranslation.y,
                    face[0][2] + this.modelTranslation.z,
                    // vec3 v1
                    face[1][0] + this.modelTranslation.x,
                    face[1][1] + this.modelTranslation.y,
                    face[1][2] + this.modelTranslation.z,
                    // vec3 v2
                    face[2][0] + this.modelTranslation.x,
                    face[2][1] + this.modelTranslation.y,
                    face[2][2] + this.modelTranslation.z,
                    // vec3 color
                    ...normedColor(this.color),
                    // vec3 meta
                    this.material.materialId,
                    0,
                    0
                ];
            }, []);

        return triangles;
    }
}

export default ObjModel;
