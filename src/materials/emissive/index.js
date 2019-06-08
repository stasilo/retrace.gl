import BaseMaterial from '../base-material';
import {materialTypes} from '../base-material';

import {defined} from '../../utils';

class EmissiveMaterial extends BaseMaterial {
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
