import ObjLoader from 'obj-mtl-loader';
import {vec3} from 'gl-matrix';

import {encodeObjModelTriangleVertexData} from '../../model-encoders/obj';

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
    noOp: -1,
    union: 1,
    unionRound: 2,
    subtract: 3,
    intersect: 4
};

const sdfGeometryTypes = {
    sphere: 1
};

const standardSdfOpArrayDataOffset = 1;
const standardSdfDataArrayLength = 12;

const sdfOperation = (opCode, opArguments, ...geometries) => {
    if(geometries.length < 2) {
        throw 'Error: union operation requires at least 2 arguments';
    }

    let oppedGeos = geometries.reduce((geoAcc, geoData, index) => {
        if(index === geometries.length - 1) {
            // console.log('LAST ELEM - ABORT!');
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
                    console.log('SETTING RADIUS TO: ', opArguments.radius);
                    console.log('RADIUS bef: ', geoData[offset + 1]);
                    console.log('before: ', geoData);
                    geoData[offset + 1] = opArguments.radius;
                    console.log('after: ', geoData);
                }

                break;

            default:
                break;
        }

        return [...geoAcc, geoData];
    }, []);

    console.dir(flatten(oppedGeos));
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

class SdfModel {
    includeInBvh = false;
    isSdfGeometry = true;

    constructor({
        material,
        geoType,
        position,
        dimensions,
    }) {
        this.material = material;
        this.geoType = geoType;

        this.opType = -1;
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
            this.geoType,
            this.opType,
            -13, //this.opRadius,

            this.material
                ? this.material.materialId
                : 0,
            -1,
            -1,

            this.dimensions.x,
            this.dimensions.y,
            this.dimensions.z,

            this.position.x,
            this.position.y,
            this.position.z,
        ];
    }
}

export default SdfModel;

export {
    sdfOperators,
    sdfGeometryTypes,

    sdfOpUnion,
    sdfOpUnionRound,
    sdfOpSubtract,
    sdfOpIntersect,
};
