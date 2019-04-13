import * as normalUtils from 'normals';
import {vec3} from 'gl-matrix';

import {
    range,
    reverse,
    defined,
    definedNotNull,
    normedColor,
    isHexColor,
    glslFloat,
} from '../../utils';

function encodeObjModelTriangleVertexData({
    mesh,
    scale,
    position,
    rotation,
    materialId,
    smoothShading
}) {
    let vertices = mesh.vertices
        .map(va => va.slice(0,3));

    let faceIndices = mesh.faces
        .map(face => face.indices.map(i => parseInt(i) - 1));

    let normals = mesh.normals.length
        ? mesh.normals
        : smoothShading
            ? normalUtils.vertexNormals(faceIndices, vertices)
            : [];

    // get face vertices
    let faces = mesh.faces
        .map(face => {
            let idxs = face.indices
                .map(i => parseInt(i) - 1);

            // convert quad polygons to triangles
            // https://stackoverflow.com/questions/23723993/converting-quadriladerals-in-an-obj-file-into-triangles
            // 0 (i) (i + 1)  [for i in 1..(n - 2)]

            let faces = range(0, idxs.length - 2).map(i => {
                const origo = vec3.fromValues(0, 0, 0);
                const translation = vec3.fromValues(
                    position.x,
                    position.y,
                    position.z
                );

                // vertices

                let v0 = vec3.fromValues(
                    ...vertices[idxs[0]]
                );

                let v1 = vec3.fromValues(
                    ...vertices[idxs[i + 1]]
                );

                let v2 = vec3.fromValues(
                    ...vertices[idxs[i + 2]]
                );

                let faceData = [
                    v0, v1, v2
                ].map(v => {
                    vec3.scale(v, v, scale);

                    vec3.rotateX(v, v, origo, rotation.x);
                    vec3.rotateY(v, v, origo, rotation.y);
                    vec3.rotateZ(v, v, origo, rotation.z);

                    vec3.add(v, v, translation);

                    return v;
                });

                // normals

                let n0 = normals.length > 0
                    ? vec3.fromValues(...normals[idxs[0]])
                    : origo

                let n1 = normals.length > 0
                    ? vec3.fromValues(...normals[idxs[i + 1]])
                    : origo;

                let n2 = normals.length > 0
                    ? vec3.fromValues(...(normals[idxs[i + 2]]))
                    : origo;

                let normalData = [
                    n0, n1, n2
                ].map(n => vec3.normalize(n, n));

                return faceData
                    .concat(normalData);
            });

            return faces;
        }) // flatten
        .reduce((allFaces, faceArr) =>
            allFaces.concat(faceArr)
        , []);

    // encode triangles for bvh construction & texture packing

    let id = 0;
    let triangles = faces
        .reduce((tris, face) => {
            id++;
            return tris.concat([
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
                smoothShading ? 1 : 0,
                0,

                // vec3 n0
                face[3][0],
                face[3][1],
                face[3][2],

                // vec3 n1
                face[4][0],
                face[4][1],
                face[4][2],

                // vec3 n2
                face[5][0],
                face[5][1],
                face[5][2]
            ]);
        }, []);

    return triangles;
}

export {encodeObjModelTriangleVertexData};
