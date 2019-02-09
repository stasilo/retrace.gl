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
//     // bounding box
//     vec3 bMin, bMax;
//
//     // sphere
//     vec3 center;
//     float radius;
//
//     // xy rect
//     float x0, x1, y0, y1;
//     float k;
// };

function Hitable({material, color}) {
    this.id = null; // id is assigned by an ObjectList
    this.material = material;
    this.color = color;

    this.updateTextureColor = (__uv, __p) => `
        hitables[${this.id}].color = procTexture${this.id}(${__uv}, ${__p});
    `;

    this.getTextureDefinition = () =>
        definedNotNull(color) ?
            `vec3 procTexture${this.id}(vec2 uv, vec3 p) {
                ${isHexColor(color)
                    ? `return vec3(${normedColor(color).join(', ')});`
                    : color
                }
            }`
        : '';
}

export default Hitable;
