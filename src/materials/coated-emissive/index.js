import BaseMaterial from '../base-material';
import {materialTypes} from '../base-material';

import {defined} from '../../utils';

class CoatedEmissiveMaterial extends BaseMaterial {
    constructor({name, color, albedo, intensity, refIdx}) {
        super({
            name,
            color: defined(color)
                ? color
                : '#ffffff',
            type: materialTypes.coatedemissive,
            albedo: defined(albedo)
                ? albedo
                : [1.0, 1.0, 1.0],
            fuzz: 0,
            refIdx: defined(refIdx)
                ? refIdx
                : 1.4,
            emissiveIntensity: defined(intensity)
                ? intensity
                : 100,
        });
    }
}

export default CoatedEmissiveMaterial;
