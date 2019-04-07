import ModelMaterial from '../model-material';
import {materialTypes} from '../model-material';

import {defined} from '../../utils';

// int type;
// vec3 albedo;
// float fuzz;
// float refIdx;
// float emissiveIntensity;

class EmissiveMaterial extends ModelMaterial {
    constructor({name, color, albedo, intensity}) {
        super({
            name,
            color: defined(color)
                ? color
                : '#ffffff',
            type: materialTypes.emissive,
            albedo: defined(albedo)
                ? albedo
                : [1.0, 1.0, 1.0],
            fuzz: 0,
            refIdx: 0,
            emissiveIntensity: defined(intensity)
                ? intensity
                : 15
        });
    }
}

export default EmissiveMaterial;
