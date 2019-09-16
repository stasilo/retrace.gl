import {vec3} from 'gl-matrix';
import {bvhBuildIterative} from './bvh-builder';

import {range, hashCode} from '../utils';

const geometryTypes = {
    triangle: 1,
    sphere: 2,
    volumeAabb: 3,
    sdf: 4,
};

// 3 * vec3() vertices + 3 * vec3() normal + 3 * vec3() texture data + 5 * vec3() meta data
const geoTexturePackedBlockDataSize = 42;

function buildSceneBvh(scene) {
    let geometries = scene.geometries
        .reduce((geos, geometry) =>
            geos.concat(geometry.geometryData)
        , []);

    console.log('buildSceneBvh() - scene.sdfGeometries: ', scene.sdfGeometries);

    // let geometries = scene.geometries
    //     .reduce((geos, geometry) => {
    //         geos.push(...geometry.geometryData);
    //         return geos;
    //     }, []);

    // return {
    //     bvhData: buildBvh(geometries, scene.sdfGeometries),
    //     geometryData: geometries
    // }

    return buildBvh(geometries, scene.sdfGeometries);
}

function buildBvh(geometryData, sdfGeometries) {
    let totalGeoCount = (geometryData.length / geoTexturePackedBlockDataSize);
    let totalSdfCount = sdfGeometries.length;

    let vp0 = vec3.create();
    let vp1 = vec3.create();
    let vp2 = vec3.create();

    let geoBoundBoxMin = vec3.create();
    let geoBoundBoxMax = vec3.create();
    let geoBoundBoxCentroid = vec3.create();

    let totalWork = new Uint32Array(totalGeoCount + totalSdfCount);
    let aabbArray = [];

    console.log('totalGeoCount: ', totalGeoCount);

    range(0, totalGeoCount)
        .forEach(i => {
            geoBoundBoxMin = vec3.fromValues(Infinity, Infinity, Infinity);
            geoBoundBoxMax = vec3.fromValues(-Infinity, -Infinity, -Infinity);

            const geoType = geometryData[geoTexturePackedBlockDataSize * i + 29];

            switch(geoType) {
                case geometryTypes.triangle:
                    // record vertex positions
                    vp0 = vec3.fromValues(
                        geometryData[geoTexturePackedBlockDataSize * i + 0],
                        geometryData[geoTexturePackedBlockDataSize * i + 1],
                        geometryData[geoTexturePackedBlockDataSize * i + 2]
                    );

                    vp1 = vec3.fromValues(
                        geometryData[geoTexturePackedBlockDataSize * i + 3],
                        geometryData[geoTexturePackedBlockDataSize * i + 4],
                        geometryData[geoTexturePackedBlockDataSize * i + 5]
                    );

                    vp2 = vec3.fromValues(
                        geometryData[geoTexturePackedBlockDataSize * i + 6],
                        geometryData[geoTexturePackedBlockDataSize * i + 7],
                        geometryData[geoTexturePackedBlockDataSize * i + 8]
                    );

                    vec3.min(geoBoundBoxMin, geoBoundBoxMin, vp0);
                    vec3.max(geoBoundBoxMax, geoBoundBoxMax, vp0);

                    vec3.min(geoBoundBoxMin, geoBoundBoxMin, vp1);
                    vec3.max(geoBoundBoxMax, geoBoundBoxMax, vp1);

                    vec3.min(geoBoundBoxMin, geoBoundBoxMin, vp2);
                    vec3.max(geoBoundBoxMax, geoBoundBoxMax, vp2);

                    geoBoundBoxCentroid = vec3.fromValues(
                        (geoBoundBoxMin[0] + geoBoundBoxMax[0]) * 0.5,
                        (geoBoundBoxMin[1] + geoBoundBoxMax[1]) * 0.5,
                        (geoBoundBoxMin[2] + geoBoundBoxMax[2]) * 0.5
                    );

                    break;

                case geometryTypes.sphere:
                    // sphere pos
                    let position = vec3.fromValues(
                        geometryData[geoTexturePackedBlockDataSize * i + 0],
                        geometryData[geoTexturePackedBlockDataSize * i + 1],
                        geometryData[geoTexturePackedBlockDataSize * i + 2]
                    );

                    let radius = vec3.fromValues(
                        geometryData[geoTexturePackedBlockDataSize * i + 3],
                        geometryData[geoTexturePackedBlockDataSize * i + 3],
                        geometryData[geoTexturePackedBlockDataSize * i + 3]
                    );

                    vec3.sub(geoBoundBoxMin, position, radius);
                    vec3.add(geoBoundBoxMax, position, radius);

                    geoBoundBoxCentroid = position;

                    break;

                case geometryTypes.volumeAabb:
                    geoBoundBoxMin = vec3.fromValues(
                        geometryData[geoTexturePackedBlockDataSize * i + 0],
                        geometryData[geoTexturePackedBlockDataSize * i + 1],
                        geometryData[geoTexturePackedBlockDataSize * i + 2]
                    );

                    geoBoundBoxMax = vec3.fromValues(
                        geometryData[geoTexturePackedBlockDataSize * i + 3],
                        geometryData[geoTexturePackedBlockDataSize * i + 4],
                        geometryData[geoTexturePackedBlockDataSize * i + 5]
                    );

                    vec3.lerp(geoBoundBoxCentroid, geoBoundBoxMin, geoBoundBoxMax, 0.5);

                    break;

                default:
                    break;
            }

            console.log('geometryData PRE: ', geometryData);

            aabbArray[9 * i + 0] = geoBoundBoxMin[0];
            aabbArray[9 * i + 1] = geoBoundBoxMin[1];
            aabbArray[9 * i + 2] = geoBoundBoxMin[2];

            aabbArray[9 * i + 3] = geoBoundBoxMax[0];
            aabbArray[9 * i + 4] = geoBoundBoxMax[1];
            aabbArray[9 * i + 5] = geoBoundBoxMax[2];

            aabbArray[9 * i + 6] = geoBoundBoxCentroid[0];
            aabbArray[9 * i + 7] = geoBoundBoxCentroid[1];
            aabbArray[9 * i + 8] = geoBoundBoxCentroid[2];

            totalWork[i] = i;

            console.log(`totalWork[${i}] = ${i}`);
        });

    let sdfOffset = 0;
    range(0, totalSdfCount)
        .forEach(i => {
            const geometry = sdfGeometries[i];
            const j = totalGeoCount + i;

            const dummySdf = [
                // vec3 v0
                -1, //this.position.x,
                -1, //this.position.y,
                -1, //this.position.z,

                // vec3 v1
                -1, //this.radius,
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
                0, //this.material.materialId,
                sdfOffset, // smooth shading
                geometryTypes.sdf, //geometryTypes.sphere,

                // vec3 meta2
                -1,
                -1,
                -1,

                // vec3 meta3
                -1,
                -1, //this.normalMapScale.x,
                -1, //this.normalMapScale.y,

                // vec3 meta4
                -1, //this.textureUvScale.x,
                -1, //this.textureUvScale.y,
                -1,

                // vec3 meta5
                -1, //this.normalUvScale.x,
                -1, //this.normalUvScale.y,
                -1
            ];

            console.log('Adding sdf dummy geo: ', dummySdf);

            geometryData = geometryData.concat(dummySdf);

            console.log('geometry.boundingBox.minCoords: ', geometry.boundingBox.minCoords);

            geoBoundBoxMin = vec3.fromValues(...geometry.boundingBox.minCoords);
            geoBoundBoxMax = vec3.fromValues(...geometry.boundingBox.maxCoords);
            vec3.lerp(geoBoundBoxCentroid, geoBoundBoxMin, geoBoundBoxMax, 0.5);

            console.log('Sdf bounding boxes: ');
            console.log('geoBoundBoxMin: ', geoBoundBoxMin);
            console.log('geoBoundBoxMax: ', geoBoundBoxMax);
            console.log('geoBoundBoxCentroid: ', geoBoundBoxCentroid);


            aabbArray[9 * j + 0] = geoBoundBoxMin[0];
            aabbArray[9 * j + 1] = geoBoundBoxMin[1];
            aabbArray[9 * j + 2] = geoBoundBoxMin[2];

            aabbArray[9 * j + 3] = geoBoundBoxMax[0];
            aabbArray[9 * j + 4] = geoBoundBoxMax[1];
            aabbArray[9 * j + 5] = geoBoundBoxMax[2];

            aabbArray[9 * j + 6] = geoBoundBoxCentroid[0];
            aabbArray[9 * j + 7] = geoBoundBoxCentroid[1];
            aabbArray[9 * j + 8] = geoBoundBoxCentroid[2];

            totalWork[j] = j;
            console.log(`totalWork[${j}] = ${j}`);

            console.log('geometry: ', geometry);

            sdfOffset += geometry.data.length / 3;
        });


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

    console.log('geometryData: ', geometryData);

    // return flatBvh;
    return {
        bvhData: flatBvh,
        geometryData
    }
}

export {
    geometryTypes,
    geoTexturePackedBlockDataSize,
    buildSceneBvh,
}
