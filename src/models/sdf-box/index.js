import SdfModel, {
    sdfGeometryTypes
} from '../sdf-model';

class SdfBox extends SdfModel {
    constructor({domain, material, dimensions, position}) {
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
