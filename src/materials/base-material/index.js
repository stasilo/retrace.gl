import {
    defined,
    isHexColor,
    normedColor
} from '../../utils';

const materialTypes = {
    lambert: 1,
    metal: 2,
    dialetric: 3,
    emissive: 4,
    isotropic: 5
}

class BaseMaterial {
    constructor({
        name,
        type,
        color,
        albedo,
        fuzz,
        refIdx,
        emissiveIntensity,
        density
    }) {
        this.id = -1;
        this.name = name;
        this.type = type;
        this.albedo = albedo;
        this.fuzz = fuzz;
        this.refIdx = refIdx;
        this.emissiveIntensity = emissiveIntensity;
        this.density = density;
        this.color = defined(color)
            ? isHexColor(color)
                ? normedColor(color)
                : color
            : [-1, -1, -1];
    }

    toArray() {
        // int (float) type;
        // float fuzz;
        // float refIdx;

        // float emissiveIntensity;
        // float padding
        // float padding

        // vec3 albedo;
        // vec3 color

        return [
            // matData1
            this.type,
            this.fuzz,
            this.refIdx,

            // matData2
            this.emissiveIntensity,
            this.density,
            -1,

            // matData3
            ...this.albedo,

            // matData4
            ...this.color,
        ];
    }
}

export {materialTypes};
export default BaseMaterial;
