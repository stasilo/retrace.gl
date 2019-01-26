import {
    definedNotNull,
    normedColor,
    isHexColor,
    isFn
} from '../../utils';

// struct Hitable {
//     float type;
//     vec3 center;
//     float radius;
//     Material material;
//     vec3 color;
// };

function sphere({center, radius, material, color}) {
    this.id = null; // id is assigned by an objectList
    this.center = center;
    this.radius = radius;
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

    this.getDefinition = () =>
        `Hitable(
            vec3(${(isFn(center) ? center() : center).join(', ')}), // center
            ${parseFloat(radius)}, // radius
            ${material}, // material
            vec3(1.) // color
        );`;
}

export default sphere;
