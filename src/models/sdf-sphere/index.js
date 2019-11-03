import SdfModel, {
    sdfGeometryTypes
} from '../sdf-model';

class SdfSphere extends SdfModel {
    constructor({
        domain,
        radius,
        position,
        material,
        texture,
        displacementMap
    }) {
        super({
            geoType: sdfGeometryTypes.sphere,
            domain,
            position,
            dimensions: {
                x: radius,
                y: radius,
                z: radius
            },
            material,
            texture,
            displacementMap
        });
    }
}

export default SdfSphere;
