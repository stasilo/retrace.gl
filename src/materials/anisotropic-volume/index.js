import BaseMaterial from '../base-material';
import {materialTypes} from '../base-material';

import {defined} from '../../utils';

class AnisotropicVolumeMaterial extends BaseMaterial {
    constructor({name, color, albedo, density, scale, sampleOffset}) {
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
            scale: defined(scale)
                ? 1/scale
                : 0.5,
            sampleOffset: defined(sampleOffset)
                ? sampleOffset
                : 0,
        });
    }
}

export default AnisotropicVolumeMaterial;
