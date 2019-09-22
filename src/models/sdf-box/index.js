import SdfModel, {
    sdfGeometryTypes
} from '../sdf-model';

class SdfBox extends SdfModel {
    constructor({material, dimensions, position}) {
        super({
            material,
            position,
            dimensions,
            geoType: sdfGeometryTypes.box,
        });
    }
}

export default SdfBox;

// import SdfModel, {
//     sdfGeometryTypes
// } from '../sdf-model';
//
// class SdfBox {
//     constructor({material, dimensions, position}) {
//         return new SdfModel({
//             material,
//             position,
//             dimensions,
//             geoType: sdfGeometryTypes.box,
//         });
//     }
// }
//
// export default SdfBox;
