import {
    definedNotNull,
    normedColor,
    isHexColor,
    isFn
} from '../../utils';

// struct Sphere {
//     vec3 center;
//     float radius;
//     Material material;
//     vec3 color;
// };

function sphere({id, center, radius, material, color}) {
    this.id = id;

    this.center = center;
    this.radius = radius;
    this.material = material;
    this.color = color;

    this.updateTextureColor = (__uv, __p) => `
        spheres[${this.id}].color = procTexture${this.id}(${__uv}, ${__p});
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
        `Sphere(
            vec3(${(isFn(center) ? center() : center).join(', ')}), // center
            ${parseFloat(radius)}, // radius
            ${material}, // material
            vec3(0.) // color
        );`;
}

function sphereList(spheres) {
    this.spheres = definedNotNull(spheres)
        ? spheres
        : [];

    this.length = () =>
        this.spheres.length;

    this.get = (i) =>
        this.spheres[i];

    this.add = (sphere) => {
        this.spheres.push(sphere);
    }

    this.updateTextureColors = (__uv, __p) =>
        this.spheres
            .map(sphere =>
                sphere.updateTextureColor(__uv, __p)
            ).join('');

    this.getTextureDefinitions = () =>
        this.spheres
            .map(sphere =>
                sphere.getTextureDefinition()
            ).join('');

    this.getDefinition = () => `
        Sphere spheres[${this.spheres.length}];
        {
            ${this.spheres.map((sphere, i) => `
                spheres[${i}] = ${sphere.getDefinition()}
            `).join('')}
        }
    `;
};

export {
    sphere,
    sphereList
};
