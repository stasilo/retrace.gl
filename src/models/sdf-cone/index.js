import SdfModel, {
    sdfGeometryTypes
} from '../sdf-model';

class SdfCone extends SdfModel {
    constructor({
        domain,
        radius,
        height,
        position,
        material,
        texture,
        displacementMap,
        displacement
    }) {
        super({
            geoType: sdfGeometryTypes.cone,
            domain,
            position,
            dimensions: {
                x: radius,
                y: height,
                z: -1
            },
            material,
            texture,
            displacementMap,
            displacement
        });
    }
}

export default SdfCone;
