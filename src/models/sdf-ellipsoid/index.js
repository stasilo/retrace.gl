import SdfModel, {
    sdfGeometryTypes
} from '../sdf-model';

class SdfEllipsoid extends SdfModel {
    constructor({
        domain,
        radius,
        position,
        material,
        texture,
        displacementMap,
        displacement
    }) {
        super({
            geoType: sdfGeometryTypes.ellipsoid,
            domain,
            position,
            dimensions: radius,
            material,
            texture,
            displacementMap,
            displacement
        });
    }
}

export default SdfEllipsoid;
