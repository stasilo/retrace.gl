import {vec3} from 'gl-matrix';

import {
    range,
    defined,
    flatten
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
    xz: 2,

    y: 3,
    yx: 4,
    xy: 4,
    yz: 5,
    zy: 5,

    z: 6,
    zx: 7,
    xz: 7,
    zy: 8,
    yz: 8,

    xyz: 9,
    xzy: 9,
    yzx: 9,
    yxz: 9,
    zxy: 9,
    zyx: 9
};

const sdfDomainOperations = {
    noOp: 0,
    repeat: 1,
    twist: 2,
    bend: 3,
    repeatBounded: 4
};

const sdfGeometryTypes = {
    sphere: 1,
    box: 2,
    cylinder: 3
};

const standardSdfOpArrayDataOffset = 1;
const standardSdfDataArrayLength = 24;
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
        ...(opts.domain && opts.domain.repetitions
            ? [
                opts.domain.repetitions.x,
                opts.domain.repetitions.y,
                opts.domain.repetitions.z
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

        let position, dimensions;

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

            case sdfGeometryTypes.box:
                position = vec3.fromValues(
                    dataArray[offset + 9],
                    dataArray[offset + 10],
                    dataArray[offset + 11]
                );

                dimensions = vec3.fromValues(
                    dataArray[offset + 6] // radius
                        * (hasRotation || hasDomainWarp ? Math.sqrt(2) : 1),
                    dataArray[offset + 7] // height
                        * (hasRotation || hasDomainWarp ? Math.sqrt(2) : 1),
                    dataArray[offset + 6] // radius
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

                dimensions = vec3.fromValues(
                    dataArray[offset + 6] // radius
                        * (hasRotation || hasDomainWarp ? Math.sqrt(2) : 1),
                    dataArray[offset + 7] // height
                        * (hasRotation || hasDomainWarp ? Math.sqrt(2) : 1),
                    dataArray[offset + 6] // radius
                        * (hasRotation || hasDomainWarp ? Math.sqrt(2) : 1)
                );

                vec3.sub(minCoords, position, dimensions);
                vec3.add(maxCoords, position, dimensions);

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

    if(defined(opts.boundingBox)) {
        finalBounds = {
            minCoords: vec3.fromValues(opts.boundingBox.minCoords.x, opts.boundingBox.minCoords.y, opts.boundingBox.minCoords.z),
            maxCoords: vec3.fromValues(opts.boundingBox.maxCoords.x, opts.boundingBox.maxCoords.y, opts.boundingBox.maxCoords.z)
        };
    } else {
        const noOfSdfsInCsg = dataArray.length / standardSdfDataArrayLength;

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

    return {
        boundingBox: finalBounds,
        includeInBvh: true,
        isSdfGeometry: true,
        data: [
            ...csgHeader,
            ...dataArray
        ]
    };
};

class SdfModel {
    constructor({
        domain,
        position,
        dimensions,
        rotation,
        material,
        geoType
    }) {
        this.domain = defined(domain)
            ? domain
            : {};

        this.material = material;
        this.geoType = geoType;

        this.opType = sdfOperators.noOp;
        // this.opRadius = -1;

        this.position = {
            x: 0,
            y: 0,
            z: 0,
            ...(defined(position)
                ? position
                : [])
        };

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
            ...(defined(domain) && defined(domain.repetitions)
                ? domain.repetitions
                : [])
        };
    }

    geometryData() {
        return [
            this.geoType, // 0
            this.opType, // 1, mutated by operation calls
            -1, // 2, opRadius, mutated by operation calls

            this.material // 3
                ? {materialName: this.material}
                : 0,
            -1, // 4, not used?
            -1, // 5, not used?

            this.dimensions.x, // 6
            this.dimensions.y, // 7
            this.dimensions.z, // 8

            this.position.x, // 9
            this.position.y, // 10
            this.position.z, // 11

            -1, // 12, color blend amount (op union round color blending amount - mutated by op call)
            -1, // 13, not used
            -1, // 14, not used

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
            this.domainOpBounds.z // 23
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
