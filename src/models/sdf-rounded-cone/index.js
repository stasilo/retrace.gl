import SdfModel, {
    sdfGeometryTypes
} from '../sdf-model';

class SdfRoundedCone extends SdfModel {
    constructor({
        domain,
        position,
        rotation,
        bottomRadius,
        topRadius,
        height,
        material,
        texture,
        displacementMap,
        displacement
    }) {
        super({
            geoType: sdfGeometryTypes.roundedCone,
            domain,
            position,
            dimensions: {
                x: bottomRadius,
                y: height,
                z: topRadius
            },
            rotation,
            material,
            texture,
            displacementMap,
            displacement
        });
    }
}

export default SdfRoundedCone;
