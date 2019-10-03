import SdfModel, {
    sdfGeometryTypes
} from '../sdf-model';

class SdfCylinder extends SdfModel {
    constructor({domain, radius, height, position, rotation, material}) {
        super({
            domain,
            position,
            dimensions: {
                x: radius,
                y: height,
                z: -1
            },
            rotation,
            material,
            geoType: sdfGeometryTypes.cylinder,
        });
    }
}

export default SdfCylinder;
