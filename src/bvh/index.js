import { bvhBuildIterative } from './bvh-builder';
import { Vector3 } from 'three';

// import { vec3 } from 'gl-matrix';

export function getObjModelTriangleVertexData(mesh) {

    // // sphere
    // let scale = 0.2;
    // let modelTranslation = {
    //     x: -0.3,//0.4,
    //     y: -0.3,//-0.6,
    //     z: -0.5//-0.4
    // }

    // bunny
    let scale = 8;
    let modelTranslation = {
        x: 0.4,
        y: -0.6,
        z: -0.4
    }

    // hand
    // let scale = 0.05;
    // let modelTranslation = {
    //     x: 1.0,
    //     y: 0.3,
    //     z: -0.9
    // }

    console.dir(mesh);

    let vertices = mesh.vertices
        .map(v => v.slice(0,3)
        .map(vn => vn * scale));

    // get face vertices
    let faces = mesh.faces.map(face => {
        let idxs = face.indices
            .map(i => parseInt(i) - 1);

        // convert quad polygons to triangles
        // https://stackoverflow.com/questions/23723993/converting-quadriladerals-in-an-obj-file-into-triangles
        // 0 (i) (i + 1)  [for i in 1..(n - 2)]

        let faces = [...Array(idxs.length - 2)].map((_, i) => {
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
    let triangles = faces//.slice(0, 1200)
        .reduce((tris, face) => {
            id++;

            return [
                ...tris,
                // v0
                // ...face[0], id, // rgba, a = id
                face[0][0] + modelTranslation.x, face[0][1] + modelTranslation.y, face[0][2] + modelTranslation.z,
                // v1 (g)
                // ...face[1], id,
                face[1][0] + modelTranslation.x, face[1][1] + modelTranslation.y, face[1][2] + modelTranslation.z,
                // v2 (b)
                // ...face[2], id
                face[2][0] + modelTranslation.x, face[2][1] + modelTranslation.y, face[2][2] + modelTranslation.z
            ];
        }, []);

    return triangles;
}


export function buildBvh(triangleData) {
    let totalTriCount = (triangleData.length / 9); // 3 vertices * 3d point = 9

    console.log('triangleData');
    console.dir(triangleData);
    console.log('no of tris (triangleData): ' +  totalTriCount);
    console.log('trinagleData len: ' + triangleData.length);

    var vp0 = new Vector3();
    var vp1 = new Vector3();
    var vp2 = new Vector3();

    var triBoundBoxMin = new Vector3();
    var triBoundBoxMax = new Vector3();
    var triBoundBoxCentroid = new Vector3();

    var totalWork = new Uint32Array(totalTriCount);
    var aabbArray = [];

    for (let i = 0; i < totalTriCount; i++) {
        triBoundBoxMin.set(Infinity, Infinity, Infinity);
        triBoundBoxMax.set(-Infinity, -Infinity, -Infinity);

        // record vertex positions
        vp0.set( triangleData[9 * i + 0], triangleData[9 * i + 1], triangleData[9 * i + 2] );
        vp1.set( triangleData[9 * i + 3], triangleData[9 * i + 4], triangleData[9 * i + 5] );
        vp2.set( triangleData[9 * i + 6], triangleData[9 * i + 7], triangleData[9 * i + 8] );

        triBoundBoxMin.copy(triBoundBoxMin.min(vp0));
        triBoundBoxMax.copy(triBoundBoxMax.max(vp0));
        triBoundBoxMin.copy(triBoundBoxMin.min(vp1));
        triBoundBoxMax.copy(triBoundBoxMax.max(vp1));
        triBoundBoxMin.copy(triBoundBoxMin.min(vp2));
        triBoundBoxMax.copy(triBoundBoxMax.max(vp2));

        triBoundBoxCentroid.set(
            (triBoundBoxMin.x + triBoundBoxMax.x) * 0.5,
            (triBoundBoxMin.y + triBoundBoxMax.y) * 0.5,
            (triBoundBoxMin.z + triBoundBoxMax.z) * 0.5
        );

        aabbArray[9 * i + 0] = triBoundBoxMin.x;
        aabbArray[9 * i + 1] = triBoundBoxMin.y;
        aabbArray[9 * i + 2] = triBoundBoxMin.z;

        aabbArray[9 * i + 3] = triBoundBoxMax.x;
        aabbArray[9 * i + 4] = triBoundBoxMax.y;
        aabbArray[9 * i + 5] = triBoundBoxMax.z;

        aabbArray[9 * i + 6] = triBoundBoxCentroid.x;
        aabbArray[9 * i + 7] = triBoundBoxCentroid.y;
        aabbArray[9 * i + 8] = triBoundBoxCentroid.z;

        totalWork[i] = i;
    }

    console.log('aabbArray: ');
    console.dir(aabbArray);

    let buildNodes = bvhBuildIterative(totalWork, aabbArray);

    console.log('buildNodes: ');
    console.dir(buildNodes);

    // construct final flat bvh structure ready for sampler
    let flatBvh = [];
    for (let n = 0; n < buildNodes.length; n++) {
        flatBvh[9 * n + 0] = -1; // padding
        flatBvh[9 * n + 1] = buildNodes[n].idRightChild;
        flatBvh[9 * n + 2] = buildNodes[n].idLeftChild;

        flatBvh[9 * n + 3] = buildNodes[n].minCorner.x;
        flatBvh[9 * n + 4] = buildNodes[n].minCorner.y;
        flatBvh[9 * n + 5] = buildNodes[n].minCorner.z;

        flatBvh[9 * n + 6] = buildNodes[n].maxCorner.x;
        flatBvh[9 * n + 7] = buildNodes[n].maxCorner.y;
        flatBvh[9 * n + 8] = buildNodes[n].maxCorner.z;
    }

    return flatBvh;
}