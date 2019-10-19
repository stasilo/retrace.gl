import SdfModel, {
    sdfGeometryTypes
} from '../sdf-model';

class SdfBox extends SdfModel {
    constructor({domain, dimensions, position, rotation, material, texture}) {
        super({
            geoType: sdfGeometryTypes.box,
            domain,
            position,
            dimensions,
            material,
            texture
        });
    }
}

export default SdfBox;
