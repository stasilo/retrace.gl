import BaseMaterial from '../base-material';
import {materialTypes} from '../base-material';

import {defined} from '../../utils';

class DialectricMaterial extends BaseMaterial {
    constructor({name, color, refIdx}) {
        super({
            name,
            color: defined(color)
                ? color
                : '#ffffff',
            type: materialTypes.dialetric,
            albedo: [1.0, 1.0, 1.0],
            fuzz: 0,
            refIdx: defined(refIdx)
                ? refIdx
                : 1.8,
            emissiveIntensity: -1
        });
    }
}

export default DialectricMaterial;
