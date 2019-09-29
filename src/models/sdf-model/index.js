import {vec3} from 'gl-matrix';

import {
    range,
    defined,
    definedNotNull,
    isObj,
    flatten,
    normedColor,
    isHexColor,
    glslFloat
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
    mod1d: 1,
    twist: 2,
    bend: 3
};

const sdfGeometryTypes = {
    sphere: 1,
    box: 2
};

const standardSdfOpArrayDataOffset = 1;
const standardSdfDataArrayLength = 18; //15;  //12;
const sdfHeaderOffsetSize = 3;

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
            offset = geoData.length - standardSdfDataArrayLength + standardSdfOpArrayDataOffset;
        }

        geoData[offset] = opCode;

        switch(opCode) {
            case sdfOperators.unionRound:
                if('radius' in opArguments) {
                    // console.log('SETTING RADIUS TO: ', opArguments.radius);
                    // console.log('RADIUS bef: ', geoData[offset + 1]);
                    // console.log('before: ', geoData);

                    geoData[offset + 1] = defined(opArguments.radius)
                        ? opArguments.radius
                        : 1;

                    geoData[offset + 11] = defined(opArguments.colorBlendAmount)
                        ? 1/(opArguments.colorBlendAmount*10)
                        : 1;

                    // console.log('after: ', geoData);
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

    console.log('oppenGeos: ', flatten(oppedGeos));
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
        opts.domainOp
            ? sdfDomainOperations[opts.domainOp]
            : sdfDomainOperations.noOp,

        opts.axis
            ? sdfAxes[opts.axis]
            : 0,

        opts.size
            ? opts.size
            : 1,
    ];

    const noOfSdfsInCsg = dataArray.length / standardSdfDataArrayLength;

    console.log('sdf header: ', csgHeader);
    console.log('NO OF SDFS IN THIS CSG: ', noOfSdfsInCsg);

    const constructCsgBoundingBox = (geoType, dataArray, offset) => {
        let minCoords = vec3.create();
        let maxCoords = vec3.create();

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
                    dataArray[offset + 6],
                    dataArray[offset + 7],
                    dataArray[offset + 8]
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
    if(noOfSdfsInCsg == 1) {
        const geoType = dataArray[0];
        finalBounds = constructCsgBoundingBox(geoType, dataArray, 0);

    } else {
        let boundingBoxes = [];
        range(0, noOfSdfsInCsg).forEach(i => {
            const offset = standardSdfDataArrayLength * i;
            const prevOffset = standardSdfDataArrayLength * (i - 1);
            const prevOp = i > 0 ?
                dataArray[prevOffset + 1]
                : -1;
            const geoType = dataArray[offset];

            finalBounds = constructCsgBoundingBox(geoType, dataArray, offset);

            console.log('prevOp: ', prevOp);
            if(prevOp != sdfOperators.subtract) {
                boundingBoxes.push(finalBounds);
            } else {
                console.log('SKIPPING (subtract): ', finalBounds);
            }
        });

        console.log('!!!!!!!!!!!boundingBoxes: ', boundingBoxes);

        const minBounds = boundingBoxes.map(bb => bb.minCoords);
        const maxBounds = boundingBoxes.map(bb => bb.maxCoords);

        minBounds.forEach(mb =>
            vec3.min(finalBounds.minCoords, finalBounds.minCoords, mb)
        );

        maxBounds.forEach(mb =>
            vec3.max(finalBounds.maxCoords, finalBounds.maxCoords, mb)
        );

        console.log('FOUND MIN BOUNDS FOR BB: ', finalBounds.minCoords);
        console.log('FOUND MAX BOUNDS FOR BB: ', finalBounds.maxCoords);
    }

    return {
        boundingBox: finalBounds,
        includeInBvh: !defined(opts.domainOp),
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
        material,
        geoType,
        position,
        dimensions,
    }) {
        // this.domain = !defined(domain)
        //     ? {
        //         domainOp: sdfDomainOperations.noOp,
        //         axis: 'x',
        //         size: 1
        //     }
        //     : domain;
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

            this.domain.domainOp
                ? sdfDomainOperations[this.domain.domainOp]
                : sdfDomainOperations.noOp,
            this.domain.axis
                ? sdfAxes[this.domain.axis]
                : 0,
            this.domain.size
                ? this.domain.size
                : 1,
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
