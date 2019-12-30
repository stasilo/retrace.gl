import SdfModel, {
    sdfGeometryTypes
} from '../sdf-model';

class SdfPyramid extends SdfModel {
    constructor({
        domain,
        height,
        base,
        position,
        rotation,
        material,
        texture,
        displacementMap,
        displacement
    }) {
        super({
            geoType: sdfGeometryTypes.pyramid,
            domain,
            position,
            dimensions: {
                x: base,
                y: height
            },
            material,
            texture,
            displacementMap,
            displacement
        });
    }
}

export default SdfPyramid;
