import {vec3} from 'gl-matrix';
import {bvhBuildIterative} from './bvh-builder';

// 3 * vec3() vertices + 1 * vec3() meta data
const triDataSize = 12;

export function buildSceneBvh(scene) {
    let triangles = scene.bvhHitables
        .reduce((tris, geometry) =>
            tris.concat(geometry.triangleData)
        , []);

    return {
        bvhData: buildBvh(triangles),
        triangleData: triangles
    }
}

export function buildBvh(triangleData) {
    let totalTriCount = (triangleData.length / triDataSize);

    let vp0 = vec3.create();
    let vp1 = vec3.create();
    let vp2 = vec3.create();

    let triBoundBoxMin = vec3.create();
    let triBoundBoxMax = vec3.create();
    let triBoundBoxCentroid = vec3.create();

    let totalWork = new Uint32Array(totalTriCount);
    let aabbArray = [];

    for (let i = 0; i < totalTriCount; i++) {
        triBoundBoxMin = vec3.fromValues(Infinity, Infinity, Infinity);
        triBoundBoxMax = vec3.fromValues(-Infinity, -Infinity, -Infinity);

        // record vertex positions

        vp0 = vec3.fromValues(
            triangleData[triDataSize * i + 0],
            triangleData[triDataSize * i + 1],
            triangleData[triDataSize * i + 2]
        );

        vp1 = vec3.fromValues(
            triangleData[triDataSize * i + 3],
            triangleData[triDataSize * i + 4],
            triangleData[triDataSize * i + 5]
        );

        vp2 = vec3.fromValues(
            triangleData[triDataSize * i + 6],
            triangleData[triDataSize * i + 7],
            triangleData[triDataSize * i + 8]
        );

        vec3.min(triBoundBoxMin, triBoundBoxMin, vp0);
        vec3.max(triBoundBoxMax, triBoundBoxMax, vp0);

        vec3.min(triBoundBoxMin, triBoundBoxMin, vp1);
        vec3.max(triBoundBoxMax, triBoundBoxMax, vp1);

        vec3.min(triBoundBoxMin, triBoundBoxMin, vp2);
        vec3.max(triBoundBoxMax, triBoundBoxMax, vp2);

        triBoundBoxCentroid = vec3.fromValues(
            (triBoundBoxMin[0] + triBoundBoxMax[0]) * 0.5,
            (triBoundBoxMin[1] + triBoundBoxMax[1]) * 0.5,
            (triBoundBoxMin[2] + triBoundBoxMax[2]) * 0.5
        );

        aabbArray[9 * i + 0] = triBoundBoxMin[0];
        aabbArray[9 * i + 1] = triBoundBoxMin[1];
        aabbArray[9 * i + 2] = triBoundBoxMin[2];

        aabbArray[9 * i + 3] = triBoundBoxMax[0];
        aabbArray[9 * i + 4] = triBoundBoxMax[1];
        aabbArray[9 * i + 5] = triBoundBoxMax[2];

        aabbArray[9 * i + 6] = triBoundBoxCentroid[0];
        aabbArray[9 * i + 7] = triBoundBoxCentroid[1];
        aabbArray[9 * i + 8] = triBoundBoxCentroid[2];

        totalWork[i] = i;
    }

    // build the bvh
    let buildNodes = bvhBuildIterative(totalWork, aabbArray);

    // construct final flat bvh structure ready for texture sampler
    let flatBvh = buildNodes
        .reduce((bvh, buildNode, i) => {
            bvh[9 * i + 0] = -1; // padding, r
            bvh[9 * i + 1] = buildNode.idRightChild; // g
            bvh[9 * i + 2] = buildNode.idLeftChild; // b

            bvh[9 * i + 3] = buildNode.minCorner[0]; // r
            bvh[9 * i + 4] = buildNode.minCorner[1]; // g
            bvh[9 * i + 5] = buildNode.minCorner[2]; // b

            bvh[9 * i + 6] = buildNode.maxCorner[0]; // r
            bvh[9 * i + 7] = buildNode.maxCorner[1]; // g
            bvh[9 * i + 8] = buildNode.maxCorner[2]; // b

            return bvh;
        }, []);

    return flatBvh;
}
