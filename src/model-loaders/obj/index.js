import ObjLoader from 'obj-mtl-loader';

import {definedNotNull, range} from '../../utils';

export async function loadObjModel(url) {
    const objLoader = new ObjLoader();

    return new Promise((resolve, reject) => {
        objLoader.load(url, (err, mesh) => {
            if(definedNotNull(err)) {
                reject(err);
            }

            const triangleData = getObjModelTriangleVertexData(mesh);
            resolve(triangleData);
        });
    });
}

function getObjModelTriangleVertexData(mesh) {
    // bunny
    let scale = 8;
    let modelTranslation = {
        x: 0.4,
        y: -0.6,
        z: -0.4
    }

    let vertices = mesh.vertices
        .map(va =>
            va.slice(0,3).map(v => v * scale)
        );

    // get face vertices
    let faces = mesh.faces.map(face => {
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

    // encode triangles for bvh contrusction & texture packing

    let id = 0;
    let triangles = faces
        .reduce((tris, face) => {
            id++;

            return [
                ...tris,
                // v0
                face[0][0] + modelTranslation.x,
                face[0][1] + modelTranslation.y,
                face[0][2] + modelTranslation.z,
                // v1
                face[1][0] + modelTranslation.x,
                face[1][1] + modelTranslation.y,
                face[1][2] + modelTranslation.z,
                // v2
                face[2][0] + modelTranslation.x,
                face[2][1] + modelTranslation.y,
                face[2][2] + modelTranslation.z
            ];
        }, []);

    return triangles;
}
