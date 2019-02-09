import Hitable from '../hitable';

import {
    definedNotNull,
    normedColor,
    isHexColor,
    glslFloat
} from '../../utils';

// struct Hitable {
//     int geometry;
//     Material material;
//     vec3 color;
//
//     vec3 bMin, bMax;
//
//     // XyRect
//     vec3 center;
//     float radius;
//
//     // xy XyRect
//     float x0, x1, y0, y1;
//     float k;
// };

function XyRect({x0, x1, y0, y1, k, material, color}) {
    // super
    Hitable.call(this, {
        material,
        color
    });

    this.x0 = x0;
    this.x1 = x1;
    this.y0 = y0;
    this.y1 = y1;
    this.k = k;

    this.getDefinition = () =>
        `Hitable(
            XY_RECT_GEOMETRY,
            ${material}, // material
            vec3(1.), // color

            // bounding box
            vec3(-1.), vec3(-1.),

            // irrelevant props for XyRect
            vec3(-1.),
            -1.,

            ${glslFloat(x0)}, // x0
            ${glslFloat(x1)}, // x1
            ${glslFloat(y0)}, // y0
            ${glslFloat(y1)}, // y1
            ${glslFloat(k)} // k
        );`;
}

export default XyRect;
