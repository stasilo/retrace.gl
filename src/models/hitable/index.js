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
//     // hitable
//     vec3 center;
//     float radius;
//
//     // xy hitable
//     float x0, x1, y0, y1;
//     float k;
// };

function hitable({material, color}) {
    this.id = null; // id is assigned by an objectList
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

export default hitable;
