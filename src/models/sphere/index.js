import hitable from '../hitable';

import {
    definedNotNull,
    normedColor,
    isHexColor,
    glslFloat
} from '../../utils';

function sphere({center, radius, material, color}) {
    // super
    hitable.call(this, {
        material,
        color
    });

    this.center = center;
    this.radius = radius;

    this.getDefinition = () =>
        `Hitable(
            SPHERE_GEOMETRY,
            ${material}, // material
            vec3(1.), // color

            vec3(${center.map(c => glslFloat(c)).join(', ')}), // center
            ${glslFloat(radius)}, // radius

            // irrelevant props for sphere
            -1., -1., -1., -1., // x0, x1, y0, y1
            -1. // k
        );`;
}

export default sphere;
