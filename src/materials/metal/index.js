import BaseMaterial from '../base-material';
import {materialTypes} from '../base-material';

import {defined} from '../../utils';

class MetalMaterial extends BaseMaterial {
    constructor({name, color, fuzz, albedo}) {
        super({
            name,
            color: defined(color)
                ? color
                : '#ffffff',
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
