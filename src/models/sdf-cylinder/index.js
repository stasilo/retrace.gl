import SdfModel, {
    sdfGeometryTypes
} from '../sdf-model';

class SdfCylinder extends SdfModel {
    constructor({domain, material, height, radius, position}) {
        super({
            domain,
            material,
            position,
            dimensions: {
                x: radius,
                y: height,
                z: -1
            },
            geoType: sdfGeometryTypes.cylinder,
        });
    }
}

export default SdfCylinder;
