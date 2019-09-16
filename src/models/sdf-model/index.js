// import ObjLoader from 'obj-mtl-loader';
import {vec3} from 'gl-matrix';

// import {encodeObjModelTriangleVertexData} from '../../model-encoders/obj';

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

const sdfDomainOperations = {
    noOp: 0,
    mod1d: 1
};

const sdfGeometryTypes = {
    sphere: 1,
    box: 2
};

const standardSdfOpArrayDataOffset = 1;
const standardSdfDataArrayLength = 12;

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
                    geoData[offset + 1] = opArguments.radius;
                    // console.log('after: ', geoData);
                }

                break;

            default:
                break;
        }

        return [...geoAcc, geoData];
    }, []);

    console.log('oppenGeos: ', flatten(oppedGeos));
    return flatten(oppedGeos);
};

const sdfOpUnion = (...geometries) =>
    sdfOperation(sdfOperators.union, {}, ...geometries);

const sdfOpUnionRound = ({radius}, ...geometries) =>
    sdfOperation(sdfOperators.unionRound, {radius}, ...geometries);

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
            ? {x: 0, y: 1, z: 2}[opts.axis]
            : 0,

        opts.size
            ? opts.size
            : 1,
    ];

    const noOfSdfsInCsg = dataArray.length / standardSdfDataArrayLength;

    console.log('sdf header: ', csgHeader);
    console.log('NO OF SDFS IN THIS CSG: ', noOfSdfsInCsg);

    // let minCoords = vec3.create();
    // let maxCoords = vec3.create();

    const constructCsgBoundingBox = (geoType, dataArray, offset) => {
        let minCoords = vec3.create();
        let maxCoords = vec3.create();

        let position, dimensions;

        // let padding = vec3.fromValues(1, 1, 1);
        switch(geoType) {
            case sdfGeometryTypes.sphere:
                // const radius = dataArray[offset + 6];

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
                // vec3.sub(minCoords, minCoords, padding);

                vec3.add(maxCoords, position, dimensions);
                // vec3.add(maxCoords, maxCoords, padding);

                break;

            case sdfGeometryTypes.box:
                // const radius = dataArray[offset + 6];

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
                // vec3.sub(minCoords, minCoords, padding);

                vec3.add(maxCoords, position, dimensions);
                // vec3.add(maxCoords, maxCoords, padding);

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
        material,
        geoType,
        position,
        dimensions,
    }) {
        this.material = material;
        this.geoType = geoType;

        this.opType = sdfOperators.noOp;
        this.opRadius = -1;

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
            this.opType, // 1
            -1, //this.opRadius, // 2

            this.material // 3
                ? {materialName: this.material}
                : 0,
            -1, // 4
            -1, // 5

            this.dimensions.x, // 6
            this.dimensions.y, // 7
            this.dimensions.z, // 8

            this.position.x, // 9
            this.position.y, // 10
            this.position.z, // 11
        ];
    }
}

export default SdfModel;

export {
    sdf,
    sdfOperators,
    sdfGeometryTypes,

    sdfOpUnion,
    sdfOpUnionRound,
    sdfOpSubtract,
    sdfOpIntersect,
};
