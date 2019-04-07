import ModelMaterial from '../model-material';
import {materialTypes} from '../model-material';

import {defined} from '../../utils';

class MetalMaterial extends ModelMaterial {
    constructor({name, fuzz, albedo}) {
        super({
            name,
            type: materialTypes.metal,
            albedo: defined(albedo)
                ? albedo
                : [0.9, 0.9, 0.9],
            fuzz: defined(fuzz)
                ? fuzz
                : 0.45,
            refIdx: 0,
            emissiveIntensity: 0
        });
    }
}

export default MetalMaterial;
