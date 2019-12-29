import {vec3} from 'gl-matrix';

import {
    range,
    defined,
    flatten,
    isObj,
    unique
} from '../../utils';

const sdfOperators = {
    noOp: 0,
    union: 1,
    unionRound: 2,
    subtract: 3,
    intersect: 4
};

const sdfAxes = {
    x: 0,

    xy: 1,
    yx: 1,

    xz: 2,
    zx: 2,

    y: 3,

    xy: 4,
    yx: 4,

    yz: 5,
    zy: 5,

    z: 6,

    zy: 7,
    yz: 7,

    xyz: 8,
    xzy: 8,
    yzx: 8,
    yxz: 8,
    zxy: 8,
    zyx: 8
};

const sdfDomainOperations = {
    noOp: 0,
    repeat: 1,
    twist: 2,
    bend: 3,
    repeatBounded: 4,
    repeatPolar: 5
};

const sdfGeometryTypes = {
    sphere: 1,
    box: 2,
    cylinder: 3,
    torus: 4,
    plane: 5,
    ellipsoid: 6,
    cone: 7
};

const standardSdfOpArrayDataOffset = 1;
const standardSdfDomainOpArrayDataOffset = 15;

const standardSdfDataArrayLength = 30;
const sdfHeaderOffsetSize = 6;

const sdfOperation = (opCode, opArguments, ...geometries) => {
    if(geometries.length < 2) {
        throw 'Error: sdf operation requires at least 2 arguments';
    }

    let oppedGeos = geometries.reduce((geoAcc, geoData, index) => {
        if(index === geometries.length - 1) {
            return [...geoAcc, geoData];
        }

        let offset = standardSdfOpArrayDataOffset;
        if(geoData.length > standardSdfDataArrayLength) {
            offset = geoData.length
                - standardSdfDataArrayLength
                + standardSdfOpArrayDataOffset;
        }

        geoData[offset] = opCode;

        switch(opCode) {
            case sdfOperators.unionRound:
                if('radius' in opArguments) {
                    geoData[offset + 1] = defined(opArguments.radius)
                        ? opArguments.radius
                        : 1;

                    geoData[offset + 11] = defined(opArguments.colorBlendAmount)
                        ? 1/(opArguments.colorBlendAmount*10)
                        : 1;
                }

                break;

            default:
                break;
        }

        return [
            ...geoAcc,
            geoData
        ];

    }, []);

    return flatten(oppedGeos);
};

const sdfOpUnion = (...geometries) =>
    sdfOperation(sdfOperators.union, {}, ...geometries);

const sdfOpUnionRound = ({radius, colorBlendAmount}, ...geometries) =>
    sdfOperation(sdfOperators.unionRound, {radius, colorBlendAmount}, ...geometries);

const sdfOpSubtract = (...geometries) =>
    sdfOperation(sdfOperators.subtract, {}, ...geometries);

const sdfOpIntersect = (...geometries) =>
    sdfOperation(sdfOperators.intersect, {}, ...geometries);

const sdf = (...args) => {
    const opts = args.length == 1
        ? {}
        : args[0];

    const dataArray = args.length == 1
        ? args[0]
        : args[1];

    const csgHeader = [
        opts.domain && opts.domain.domainOp // 15
            ? sdfDomainOperations[opts.domain.domainOp]
            : sdfDomainOperations.noOp,
        opts.domain && opts.domain.axis // 16
            ? sdfAxes[opts.domain.axis]
            : 0,
        opts.domain && opts.domain.size // 17
            ? opts.domain.size
            : 1,
        ...(opts.domain && opts.domain.bounds
            ? [
                opts.domain.bounds.x,
                opts.domain.bounds.y,
                opts.domain.bounds.z
            ]
            : [0, 0, 0]
        )
    ];

    const constructCsgBoundingBox = (geoType, dataArray, offset) => {
        let minCoords = vec3.create();
        let maxCoords = vec3.create();

        const angleX = dataArray[offset + 18];
        const angleY = dataArray[offset + 19];
        const angleZ = dataArray[offset + 20];

        const domainOp = dataArray[offset + 15];

        const hasRotation = angleX != 0 || angleY != 0 || angleZ != 0;
        const hasDomainWarp = domainOp != sdfDomainOperations.noOp
            && domainOp != sdfDomainOperations.repeat;

        let position, dimensions, radius, height;

        switch(geoType) {
            case sdfGeometryTypes.sphere:
                position = vec3.fromValues(
                    dataArray[offset + 9],
                    dataArray[offset + 10],
                    dataArray[offset + 11]
                );

                // radius
                dimensions = vec3.fromValues(
                    dataArray[offset + 6],
                    dataArray[offset + 7],
                    dataArray[offset + 8]
                );

                vec3.sub(minCoords, position, dimensions);
                vec3.add(maxCoords, position, dimensions);

                break;

            case sdfGeometryTypes.torus:
                position = vec3.fromValues(
                    dataArray[offset + 9],
                    dataArray[offset + 10],
                    dataArray[offset + 11]
                );

                const outerRadius = dataArray[offset + 7] + dataArray[offset + 6];
                const innerRadius = dataArray[offset + 6];

                dimensions = vec3.fromValues(
                    outerRadius, // outer radius
                    hasRotation || hasDomainWarp ? outerRadius : innerRadius, // inner radius
                    outerRadius
                );

                vec3.sub(minCoords, position, dimensions);
                vec3.add(maxCoords, position, dimensions);

                break;

            case sdfGeometryTypes.box:
                position = vec3.fromValues(
                    dataArray[offset + 9],
                    dataArray[offset + 10],
                    dataArray[offset + 11]
                );

                dimensions = vec3.fromValues(
                    dataArray[offset + 6] // width
                        * (hasRotation || hasDomainWarp ? Math.sqrt(2) : 1),
                    dataArray[offset + 7] // height
                        * (hasRotation || hasDomainWarp ? Math.sqrt(2) : 1),
                    dataArray[offset + 6] // depth
                        * (hasRotation || hasDomainWarp ? Math.sqrt(2) : 1)
                );

                vec3.sub(minCoords, position, dimensions);
                vec3.add(maxCoords, position, dimensions);

                break;

            case sdfGeometryTypes.cylinder:
                position = vec3.fromValues(
                    dataArray[offset + 9],
                    dataArray[offset + 10],
                    dataArray[offset + 11]
                );

                radius = dataArray[offset + 6];
                height = dataArray[offset + 7];

                if(!hasRotation && !hasDomainWarp) {
                    dimensions = vec3.fromValues(
                        radius // radius
                            * (hasRotation || hasDomainWarp ? Math.sqrt(2) : 1),
                        height // height
                            * (hasRotation || hasDomainWarp ? Math.sqrt(2) : 1),
                        dataArray[offset + 6] // radius
                            * (hasRotation || hasDomainWarp ? Math.sqrt(2) : 1)
                    );
                } else {
                    const s = Math.max(radius, height);
                    dimensions = vec3.fromValues(s, s, s);
                }

                vec3.sub(minCoords, position, dimensions);
                vec3.add(maxCoords, position, dimensions);

                break;

            case sdfGeometryTypes.cone:
                position = vec3.fromValues(
                    dataArray[offset + 9],
                    dataArray[offset + 10],
                    dataArray[offset + 11]
                );

                radius = dataArray[offset + 6];
                height = dataArray[offset + 7];

                if(!hasRotation && !hasDomainWarp) {
                    dimensions = vec3.fromValues(
                        radius // radius
                            * (hasRotation || hasDomainWarp ? Math.sqrt(2) : 1),
                        height // height
                            * (hasRotation || hasDomainWarp ? Math.sqrt(2) : 1),
                        dataArray[offset + 6] // radius
                            * (hasRotation || hasDomainWarp ? Math.sqrt(2) : 1)
                    );
                } else {
                    const s = Math.max(radius, height);
                    dimensions = vec3.fromValues(s, s, s);
                }

                vec3.sub(minCoords, position, dimensions);
                vec3.add(maxCoords, position, dimensions);

                break;

            case sdfGeometryTypes.ellipsoid:
                position = vec3.fromValues(
                    dataArray[offset + 9],
                    dataArray[offset + 10],
                    dataArray[offset + 11]
                );

                // radius
                dimensions = vec3.fromValues(
                    dataArray[offset + 6],
                    dataArray[offset + 7],
                    dataArray[offset + 8]
                );

                vec3.sub(minCoords, position, dimensions);
                vec3.add(maxCoords, position, dimensions);

                break;

            case sdfGeometryTypes.plane:
                position = vec3.fromValues(
                    dataArray[offset + 9],
                    dataArray[offset + 10],
                    dataArray[offset + 11]
                );

                // dimensions
                dimensions = vec3.fromValues(
                    dataArray[offset + 6],
                    dataArray[offset + 7],
                    dataArray[offset + 8]
                );

                console.log('PLANE DIMENSIONS: ', dimensions);
                if(dimensions[1] != 0) {
                    vec3.sub(minCoords, position, vec3.fromValues(100000, 0.01, 100000));
                    vec3.add(maxCoords, position, vec3.fromValues(100000, 0.01, 100000));
                }

                break;

            default:
                break;
        }

        return {
            minCoords,
            maxCoords
        };
    };

    let finalBounds;
    let geometryTypes = [], opCodes = [];
    let domainOpCodes = opts.domain && opts.domain.domainOp
        ? [opts.domain.domainOp]
        : [];

    const noOfSdfsInCsg = dataArray.length / standardSdfDataArrayLength;

    range(0, noOfSdfsInCsg).forEach(i => {
        const geoType = dataArray[standardSdfDataArrayLength * i];
        geometryTypes.push(geoType);

        const opCode = dataArray[standardSdfDataArrayLength * i + standardSdfOpArrayDataOffset];
        opCodes.push(opCode);

        const domainOpCode = dataArray[standardSdfDataArrayLength * i + standardSdfDomainOpArrayDataOffset];
        domainOpCodes.push(domainOpCode);
    });

    console.log('domainOpCodes: ', unique(domainOpCodes));

    if(defined(opts.boundingBox)) {
        finalBounds = {
            minCoords: vec3.fromValues(
                opts.boundingBox.minCoords.x,
                opts.boundingBox.minCoords.y,
                opts.boundingBox.minCoords.z
            ),
            maxCoords: vec3.fromValues(
                opts.boundingBox.maxCoords.x,
                opts.boundingBox.maxCoords.y,
                opts.boundingBox.maxCoords.z
            )
        };
    } else {
        if(noOfSdfsInCsg === 1) {
            const geoType = dataArray[0];
            finalBounds = constructCsgBoundingBox(geoType, dataArray, 0);
        } else {
            let boundingBoxes = [];

            // find the smallest minCoords & largest maxCoords amongst all the sdf's aabb's
            range(0, noOfSdfsInCsg).forEach(i => {
                const offset = standardSdfDataArrayLength * i;
                const prevOffset = standardSdfDataArrayLength * (i - 1);
                const prevOp = i > 0 ?
                    dataArray[prevOffset + 1]
                    : -1;

                const geoType = dataArray[offset];
                finalBounds = constructCsgBoundingBox(geoType, dataArray, offset);

                if(prevOp != sdfOperators.subtract) {
                    boundingBoxes.push(finalBounds);
                }
            });

            const minBounds = boundingBoxes
                .map(bb => bb.minCoords);
            const maxBounds = boundingBoxes
                .map(bb => bb.maxCoords);

            minBounds.forEach(mb =>
                vec3.min(finalBounds.minCoords, finalBounds.minCoords, mb)
            );

            maxBounds.forEach(mb =>
                vec3.max(finalBounds.maxCoords, finalBounds.maxCoords, mb)
            );
        }
    }

    console.log('sdf opcodes: ', unique(opCodes));

    return {
        boundingBox: finalBounds,
        includeInBvh: true,
        isSdfGeometry: true,
        geometryTypes: unique(geometryTypes),
        opCodes: unique(opCodes),
        domainOpCodes: unique(domainOpCodes),
        data: [
            ...csgHeader,
            ...dataArray
        ]
    };
};

class SdfModel {
    constructor({
        geoType,
        domain,
        position,
        dimensions,
        rotation,
        material,
        texture,
        displacementMap,
        displacement
    }) {
        this.geoType = geoType;
        if(geoType === 5) {
            console.log('dimensions: ', dimensions);
        }

        this.opType = sdfOperators.noOp;
        // this.opRadius = -1;

        this.domain = defined(domain)
            ? domain
            : {};

        this.material = material
            ? {materialName: material}
            : 0,

        this.texture = texture // 3
            ? {
                textureName: isObj(texture)
                    ? texture.name
                    : texture
             }
            : -1;

        this.textureUvScale = {
            x: 1,
            y: 1,
            ...(defined(texture) && defined(texture.uvScale)
                ? texture.uvScale.x || texture.uvScale.y
                    ? texture.uvScale
                    : {x: texture.uvScale, y: texture.uvScale}
                : [])
        };

        this.displacementMap = displacementMap
            ? {
                displacementMapName: isObj(displacementMap)
                    ? displacementMap.name
                    : displacementMap
             }
            : -1;

        this.displacementMapScale = defined(displacementMap) && displacementMap.scale
            ? displacementMap.scale
            : 1;

        //console.log('Setting this.displacementMapScale: ', this.displacementMapScale);

        this.displacementMapUvScale = {
            x: 1,
            y: 1,
            ...(defined(displacementMap) && defined(displacementMap.uvScale)
                ? displacementMap.uvScale.x || displacementMap.uvScale.y
                    ? displacementMap.uvScale
                    : {x: displacementMap.uvScale, y: displacementMap.uvScale}
                : [])
        };

        this.displacementFunc = displacement
            ? {
                displacementFuncName: isObj(displacement)
                    ? displacement.name
                    : displacement
             }
            : -1;


        console.log('Setting this.displacementFunc: ', this.displacementFunc);

        //console.log('this.displacementMapUvScale: ', this.displacementMapUvScale);

        this.position = {
            x: 0,
            y: 0,
            z: 0,
            ...(defined(position)
                ? position
                : [])
        };

        if(geoType === 5) {
            console.log('SDF MODEL DIMENSIONS FOR PLANE: ', dimensions);

        }
        this.dimensions = {
            x: 0,
            y: 0,
            z: 0,
            ...(defined(dimensions)
                ? dimensions
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

        this.domainOpBounds = {
            x: 0,
            y: 0,
            z: 0,
            ...(defined(domain) && defined(domain.bounds)
                ? domain.bounds
                : [])
        };
    }

    geometryData() {
        return [
            this.geoType, // 0
            this.opType, // 1, mutated by operation calls
            -1, // 2, opRadius, mutated by operation calls

            this.material, // 3
            this.texture, // 4
            -1, // 5, not used

            this.dimensions.x, // 6
            this.dimensions.y, // 7
            this.dimensions.z, // 8

            this.position.x, // 9
            this.position.y, // 10
            this.position.z, // 11

            -1, // 12, color blend amount (op union round color blending amount - mutated by op call)
            this.textureUvScale.x, // 13
            this.textureUvScale.y, // 14

            this.domain.domainOp // 15
                ? sdfDomainOperations[this.domain.domainOp]
                : sdfDomainOperations.noOp,
            this.domain.axis // 16
                ? sdfAxes[this.domain.axis]
                : 0,
            this.domain.size // 17
                ? this.domain.size
                : 1,

            this.rotation.x, // 18
            this.rotation.y, // 19
            this.rotation.z, // 20,

            this.domainOpBounds.x, // 21
            this.domainOpBounds.y, // 22
            this.domainOpBounds.z, // 23

            this.displacementMap, // 24
            this.displacementMapUvScale.x, // 25
            this.displacementMapUvScale.y, // 26,

            this.displacementMapScale, // 27
            this.displacementFunc, // 28
            -1 // 29
        ];
    }
}

export default SdfModel;

export {
    sdf,
    sdfOperators,
    sdfDomainOperations,
    sdfAxes,
    sdfGeometryTypes,

    standardSdfOpArrayDataOffset,
    standardSdfDataArrayLength,
    sdfHeaderOffsetSize,

    sdfOpUnion,
    sdfOpUnionRound,
    sdfOpSubtract,
    sdfOpIntersect,
};
