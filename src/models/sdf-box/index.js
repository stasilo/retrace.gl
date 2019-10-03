import SdfModel, {
    sdfGeometryTypes
} from '../sdf-model';

class SdfBox extends SdfModel {
    constructor({domain, dimensions, position, rotation, material}) {
        super({
            domain,
            material,
            position,
            dimensions,
            geoType: sdfGeometryTypes.box,
        });
    }
}

export default SdfBox;
