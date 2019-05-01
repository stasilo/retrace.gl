import BaseMaterial from '../base-material';
import {materialTypes} from '../base-material';

import {defined} from '../../utils';

// int type;
// vec3 albedo;
// float fuzz;
// float refIdx;
// float emissiveIntensity;

class IsotropicMaterial extends BaseMaterial {
    constructor({name, color, albedo, density}) {
        super({
            name,
            color: defined(color)
                ? color
                : '#ffffff',
            type: materialTypes.isotropic,
            albedo: defined(albedo)
                ? albedo
                : [0.5, 0.5, 0.5],
            fuzz: 0,
            refIdx: 0,
            emissiveIntensity: 0,
            density: defined(density)
                ? density
                : 0.5,
            volumeScale: 0
        });
    }
}

export default IsotropicMaterial;
