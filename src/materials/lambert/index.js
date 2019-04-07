import ModelMaterial from '../model-material';
import {materialTypes} from '../model-material';

import {defined} from '../../utils';

class LambertMaterial extends ModelMaterial {
    constructor({name, albedo}) {
        super({
            name,
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
