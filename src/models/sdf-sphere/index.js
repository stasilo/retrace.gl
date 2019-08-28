import SdfModel, {
    sdfGeometryTypes
} from '../sdf-model';

class SdfSphere {
    constructor({material, radius, position}) {
        return new SdfModel({
            material,
            position,
            geoType: sdfGeometryTypes.sphere,
            dimensions: {
                x: radius,
                y: radius, 
                z: radius
            },
        });
    }
}

export default SdfSphere;
