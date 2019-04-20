import BaseMaterial from '../base-material';
import {materialTypes} from '../base-material';

import {defined} from '../../utils';

class LambertMaterial extends BaseMaterial {
    constructor({name, color, albedo}) {
        super({
            name,
            color: defined(color)
                ? color
                : '#ffffff',
            type: materialTypes.lambert,
            albedo: defined(albedo)
                ? albedo
                : [1.0, 1.0, 1.0],
            fuzz: 0,
            refIdx: 0,
            emissiveIntensity: 0
        });
    }
}

export default LambertMaterial;
