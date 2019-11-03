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
        material,
        displacementMap
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
            displacementMap
        });
    }
}

export default SdfTorus;
