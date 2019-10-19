import SdfModel, {
    sdfGeometryTypes
} from '../sdf-model';

class SdfTorus extends SdfModel {
    constructor({
        domain,
        innerRadius,
        outerRadius,
        position,
        rotation,
        texture,
        material
    }) {
        super({
            geoType: sdfGeometryTypes.torus,
            domain,
            position,
            dimensions: {
                x: innerRadius,
                y: outerRadius,
                z: -1
            },
            rotation,
            material,
            texture,
        });
    }
}

export default SdfTorus;
