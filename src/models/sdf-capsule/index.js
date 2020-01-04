import SdfModel, {
    sdfGeometryTypes
} from '../sdf-model';

class SdfCapsule extends SdfModel {
    constructor({
        domain,
        radius,
        height,
        position,
        rotation,
        material,
        texture,
        displacementMap,
        displacement
    }) {
        super({
            geoType: sdfGeometryTypes.capsule,
            domain,
            position,
            dimensions: {
                x: radius,
                y: height,
                z: -1
            },
            rotation,
            material,
            texture,
            displacementMap,
            displacement
        });
    }
}

export default SdfCapsule;
