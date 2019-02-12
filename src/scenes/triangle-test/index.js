import Sphere from '../../models/sphere';
import XyRect from '../../models/xy-rect';
import Triangle from '../../models/triangle';

import {
    random,
    normedColor,
    normedColorStr
} from '../../utils';

import ObjectList from '../../dtos/object-list';

const sceneObjects = new ObjectList([
    new Triangle({
        vertices: [
            [0.75, 0, -1],
            [0.8, 0.1, -2],
            [0.6, 0.5, -2]
        ],
        material: 'LightMaterial',
        color: '#ff00ff'
    }),
    new XyRect({
        x0: -1.0,
        x1: 0.5,
        y0: -0.0,
        y1: 1,
        k: -4.1,
        material: 'LightMaterial',
        color: '#ffffff'
    })
]);

export default sceneObjects;
