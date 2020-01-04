import SdfModel, {
    sdfGeometryTypes
} from '../sdf-model';

class SdfLink extends SdfModel {
    constructor({
        domain,
        position,
        rotation,
        radius,
        thickness,
        height,
        material,
        texture,
        displacementMap,
        displacement
    }) {
        super({
            geoType: sdfGeometryTypes.link,
            domain,
            position,
            dimensions: {
                x: radius,
                y: height,
                z: thickness
            },
            rotation,
            material,
            texture,
            displacementMap,
            displacement
        });
    }
}

export default SdfLink;
