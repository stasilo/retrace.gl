import BaseMaterial from '../base-material';
import {materialTypes} from '../base-material';

import {defined} from '../../utils';

class AnisotropicVolumeMaterial extends BaseMaterial {
    constructor({name, color, albedo, density, volumeScale}) {
        super({
            name,
            color: defined(color)
                ? color
                : '#ffffff',
            type: materialTypes.anisotropic,
            albedo: defined(albedo)
                ? albedo
                : [0.5, 0.5, 0.5],
            fuzz: 0,
            refIdx: 0,
            emissiveIntensity: 0,
            density: defined(density)
                ? density
                : 0.5,
            volumeScale: defined(volumeScale)
                ? 1/volumeScale
                : 0.5
        });
    }
}

export default AnisotropicVolumeMaterial;
