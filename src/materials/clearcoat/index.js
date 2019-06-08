import BaseMaterial from '../base-material';
import {materialTypes} from '../base-material';

import {defined} from '../../utils';

class ClearcoatMaterial extends BaseMaterial {
    constructor({name, color, albedo, refIdx}) {
        super({
            name,
            color: defined(color)
                ? color
                : '#ffffff',
            type: materialTypes.clearcoat,
            albedo: defined(albedo)
                ? albedo
                : [1.0, 1.0, 1.0],
            fuzz: 0,
            refIdx: defined(refIdx)
                ? refIdx
                : 1.4,
            emissiveIntensity: -1
        });
    }
}

export default ClearcoatMaterial;
