import sphere from '../../models/sphere';
import {createCamera} from '../../models/camera';

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
            float s = sin(10.*p.x)*sin(10.*p.y)*sin(10.*p.z);

            if(s < 0.) {
                return vec3(${normedColorStr('#661111')});
            } else {
                return vec3(${normedColorStr('#101010')});
            }
        `
    }),
    new sphere({
        center: [-0.2, 0.5, -1.7], // sphere center
        radius: 0.5,
        material: 'FuzzyMetalMaterial',
        color: '#ffffff'
    }),
    new sphere({
        center:[-1.5, 0.1, -1.25],
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
        center:[0.8, 0., -1.3],
        radius: 0.5,
        material: 'LambertMaterial',
        color: '#eeeeee'
    }),
    new sphere({
        center:[5.8, 5., -1.3],
        radius: 2.5,
        material: 'LightMaterial',
        color: `
            return vec3(5., 5., 5.);
        `
    }),
    new sphere({
        center:[-2.8, 5., -2.5],
        radius: 2.9,
        material: 'LightMaterial',
        color: `
            return vec3(5., 5., 5.);
        `
    })
]);

export default sceneObjects;
