import * as normalUtils from 'normals';
import {vec3} from 'gl-matrix';

import {
    range,
    reverse,
    isObj,
    defined,
    definedNotNull,
    normedColor,
    isHexColor,
    glslFloat,
} from '../../utils';

import {geometryTypes} from '../../bvh';

function encodeObjModelTriangleVertexData({
    mesh,
    scale,
    position,
    rotation,
    textureId,
    materialId,
    smoothShading,
    doubleSided
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

    let textureCoords = mesh.textureCoords.length
        ? mesh.textureCoords
        : [];

    // get face vertices
    let faces = mesh.faces
        .map(face => {
            const origo = vec3.fromValues(0, 0, 0);
            const translation = vec3.fromValues(
                position.x,
                position.y,
                position.z
            );

            // convert quad polygons to triangles
            // https://stackoverflow.com/questions/23723993/converting-quadriladerals-in-an-obj-file-into-triangles
            // 0 (i) (i + 1)  [for i in 1..(n - 2)]

            const faceIdxs = face.indices
                .map(i => parseInt(i) - 1);

            const normIdxs = face.normal.length
                ? face.normal
                    .map(i => parseInt(i) - 1)
                : faceIdxs;

            const texIdxs = face.texture
                .map(i => parseInt(i) - 1);

            let faces = range(0, faceIdxs.length - 2).map(i => {
                // vertices

                let v0 = vec3.fromValues(
                    ...vertices[faceIdxs[0]]
                );

                let v1 = vec3.fromValues(
                    ...vertices[faceIdxs[i + 1]]
                );

                let v2 = vec3.fromValues(
                    ...vertices[faceIdxs[i + 2]]
                );

                let faceData = [
                    v0, v1, v2
                ].map(v => {

                    if(isObj(scale)) {
                        vec3.mul(v, v, vec3.fromValues(scale.x, scale.y, scale.z));
                    } else {
                        vec3.scale(v, v, scale);
                    }

                    vec3.rotateX(v, v, origo, rotation.x);
                    vec3.rotateY(v, v, origo, rotation.y);
                    vec3.rotateZ(v, v, origo, rotation.z);

                    vec3.add(v, v, translation);

                    return v;
                });

                // normals

                let n0 = normals.length > 0
                    ? vec3.fromValues(...normals[normIdxs[0]])
                    : origo

                let n1 = normals.length > 0
                    ? vec3.fromValues(...normals[normIdxs[i + 1]])
                    : origo;

                let n2 = normals.length > 0
                    ? vec3.fromValues(...normals[normIdxs[i + 2]])
                    : origo;

                let normalData = [
                    n0, n1, n2
                ].map(n => vec3.normalize(n, n));

                // textures

                let t0 = textureCoords.length > 0
                    ? vec3.fromValues(...textureCoords[texIdxs[0]])
                    : origo

                let t1 = textureCoords.length > 0
                    ? vec3.fromValues(...textureCoords[texIdxs[i + 1]])
                    : origo;

                let t2 = textureCoords.length > 0
                    ? vec3.fromValues(...(textureCoords[texIdxs[i + 2]]))
                    : origo;

                let textureData = [t0, t1, t2];

                return faceData
                    .concat(normalData)
                    .concat(textureData);
            });

            return faces;
        }) // flatten
        .reduce((allFaces, faceArr) =>
            allFaces.concat(faceArr)
        , []);

    // encode triangles for bvh construction & texture packing

    let triangles = faces
        .reduce((tris, face, id) => {
            return tris.concat([
                // vertices

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

                // normals

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
                face[5][2],

                // texture coords

                // vec3 t0
                face[6][0],
                face[6][1],
                face[6][2],

                // vec3 t1
                face[7][0],
                face[7][1],
                face[7][2],

                // vec3 t2
                face[8][0],
                face[8][1],
                face[8][2],

                // meta data

                // vec3 meta
                materialId,
                smoothShading ? 1 : 0,
                geometryTypes.triangle,

                // vec3 meta2
                defined(textureId)
                    ? textureId
                    : -1,
                defined(doubleSided)
                    ? doubleSided | 0 // bool to int conv.
                    : 0,
                -1
            ]);
        }, []);

    return triangles;
}

export {encodeObjModelTriangleVertexData};
