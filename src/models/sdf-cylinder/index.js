import SdfModel, {
    sdfGeometryTypes
} from '../sdf-model';

class SdfCylinder extends SdfModel {
    constructor({
        domain,
        radius,
        height,
        position,
        rotation,
        material,
        texture,
        displacementMap
    }) {
        super({
            geoType: sdfGeometryTypes.cylinder,
            domain,
            position,
            dimensions: {
                x: radius,
                y: height,
                z: -1
            },
            rotation,
            material,
            texture,
            displacementMap
        });
    }
}

export default SdfCylinder;
