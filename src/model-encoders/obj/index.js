import {vec3} from 'gl-matrix';

import {
    range,
    defined,
    definedNotNull,
    normedColor,
    isHexColor,
    glslFloat
} from '../../utils';

function encodeObjModelTriangleVertexData({mesh, scale, position, rotation, materialId}) {
    let vertices = mesh.vertices
        .map(va => va.slice(0,3));

    // get face vertices
    let faces = mesh.faces
        .map(face => {
            let idxs = face.indices
                .map(i => parseInt(i) - 1);

            // convert quad polygons to triangles
            // https://stackoverflow.com/questions/23723993/converting-quadriladerals-in-an-obj-file-into-triangles
            // 0 (i) (i + 1)  [for i in 1..(n - 2)]

            let faces = range(0, idxs.length - 2).map(i => {
                const origin = vec3.fromValues(0, 0, 0);
                const translation = vec3.fromValues(
                    position.x,
                    position.y,
                    position.z
                );

                let v0 = vec3.fromValues(
                    ...vertices[idxs[0]]
                );

                let v1 = vec3.fromValues(
                    ...vertices[idxs[i + 1]]
                );

                let v2 = vec3.fromValues(
                    ...vertices[idxs[i + 2]]
                );

                let verts = [
                    v0, v1, v2
                ].map(v => {
                    vec3.scale(v, v, scale);

                    vec3.rotateX(v, v, origin, rotation.x);
                    vec3.rotateY(v, v, origin, rotation.y);
                    vec3.rotateZ(v, v, origin, rotation.z);

                    vec3.add(v, v, translation);

                    return v;
                });

                return verts;
            });

            return faces;
        }) // flatten
        .reduce((allFaces, faceArr) =>
            [...allFaces, ...faceArr]
        , []);

    // encode triangles for bvh construction & texture packing

    let id = 0;
    let triangles = faces
        .reduce((tris, face) => {
            id++;
            return [
                ...tris,

                // vec3 v0
                face[0][0],
                face[0][1],
                face[0][2],

                // vec3 v1
                face[1][0],
                face[1][1],
                face[1][2],

                // vec3 v2
                face[2][0],
                face[2][1],
                face[2][2],

                // vec3 meta
                materialId,
                0,
                0
            ];
        }, []);

    return triangles;
}

export {encodeObjModelTriangleVertexData};
