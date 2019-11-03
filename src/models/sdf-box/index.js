import SdfModel, {
    sdfGeometryTypes
} from '../sdf-model';

class SdfBox extends SdfModel {
    constructor({
        domain,
        dimensions,
        position,
        rotation,
        material,
        texture,
        displacementMap
    }) {
        super({
            geoType: sdfGeometryTypes.box,
            domain,
            position,
            dimensions,
            material,
            texture,
            displacementMap
        });
    }
}

export default SdfBox;
