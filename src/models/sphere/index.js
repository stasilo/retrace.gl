import {vec3} from 'gl-matrix';
import Hitable from '../hitable';

import {
    definedNotNull,
    normedColor,
    isHexColor,
    glslFloat
} from '../../utils';

function Sphere({center, radius, material, color}) {
    // super
    Hitable.call(this, {
        material,
        color
    });

    this.center = center;
    this.radius = radius;

    this.getBoundingBox = () => {
        let vRadius = vec3.fromValues(radius, radius, radius);
        let vCenter = vec3.fromValues(...center);

        let min = vec3.create();
        vec3.sub(min, vCenter, vRadius);
        let max = vec3.create();
        vec3.add(max, vCenter, vRadius);

        return `vec3(${min.map(n => glslFloat(n)).join(', ')}), vec3(${max.map(n => glslFloat(n)).join(', ')}),`;
    }

    this.getDefinition = () =>
        `Hitable(
            SPHERE_GEOMETRY,
            ${material}, // material
            vec3(1.), // color

            // bounding box
            ${this.getBoundingBox()}

            vec3(${center.map(c => glslFloat(c)).join(', ')}), // center
            ${glslFloat(radius)}, // radius

            // irrelevant props for sphere
            -1., -1., -1., -1., // x0, x1, y0, y1
            -1. // k
        );`;
}

export default Sphere;
