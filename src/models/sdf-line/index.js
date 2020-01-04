import SdfModel, {
    sdfGeometryTypes
} from '../sdf-model';

class SdfLine extends SdfModel {
    constructor({
        domain,
        start,
        end,
        thickness,
        rotation,
        material,
        texture,
        displacementMap,
        displacement
    }) {
        super({
            geoType: sdfGeometryTypes.line,
            domain,
            lineStart: start,
            dimensions: end,
            lineRadius: thickness,
            rotation,
            material,
            texture,
            displacementMap,
            displacement
        });
    }
}

export default SdfLine;
