import sphere from '../../models/sphere';
import rect from '../../models/rect';

import {
    normedColor,
    normedColorStr
} from '../../utils';

import objectList from '../../dtos/objectList';

const sceneObjects = new objectList([
    new sphere({
        id: 0,
        center: [0., -301, -5.],
        radius: 300.5,
        material: 'LambertMaterial',
        color: `
            p-=.5;
            float s = sin(10.*p.x)*sin(10.*p.y)*sin(10.*p.z);

            if(s < 0.) {
                return vec3(${normedColorStr('#661111')});
            } else {
                return vec3(${normedColorStr('#ffffff')});
            }
        `
    }),
    new rect({
        x0: -1.0,
        x1: 0.5,
        y0: -0.0,
        y1: 1,
        k: -4.1,
        material: 'LightMaterial',
        color: '#ffffff'
    }),
    new rect({
        x0: -3,
        x1: -1,
        y0: -0.4,
        y1: 1,
        k: 0,
        material: 'LightMaterial',
        color: '#ffffff'
    }),
    new sphere({
        center:[-1.5, 0.2, -1.25],
        radius: 0.5,
        material: 'GlassMaterial',
        color: '#ffffff'
    }),
    new sphere({
        center:[-0.35, -0.27, -1.],
        // center: [-0.35, '-0.27 + abs(sin(uTime*3.))*0.4', -1.],
        radius: 0.25,
        material: 'ShinyMetalMaterial',
        color: '#eeeeee'
    }),
    new sphere({
        center:[0.0, -0.05, -1.8],
        radius: 0.5,
        material: 'FuzzyMetalMaterial',
        color: '#ffffff'
    })
]);

export default sceneObjects;
