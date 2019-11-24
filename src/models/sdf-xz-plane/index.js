import SdfModel, {
    sdfGeometryTypes
} from '../sdf-model';

class SdfXzPlane extends SdfModel {
    constructor({
        domain,
        upDirection,
        // position,
        // rotation,
        material,
        texture,
        displacementMap,
        displacement
    }) {
        console.log('Constructing xz plane!!!!!!!!!!!!!!');
        console.log('upvec: ', upDirection);

        super({
            geoType: sdfGeometryTypes.plane,
            domain,
            position: {x: 0, y: 0, z: 0 },
            // up vector
            dimensions: upDirection, //{x: 0, y: 1, z: 0},
            material,
            texture,
            displacementMap,
            displacement
        });
    }
}

export default SdfXzPlane;
