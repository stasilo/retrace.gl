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
    isotropic: 5,
    anisotropic: 6,
    clearcoat: 7,
    coatedemissive: 8
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
        density,
        scale,
        sampleOffset
    }) {
        this.id = -1;
        this.name = name;
        this.type = type;
        this.albedo = albedo;
        this.fuzz = fuzz;
        this.refIdx = refIdx;
        this.emissiveIntensity = emissiveIntensity;
        this.density = density;
        this.scale = scale;
        this.sampleOffset = sampleOffset;
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
            this.scale,

            // matData3
            ...this.albedo,

            // matData4
            ...this.color,

            // matData5
            this.sampleOffset,
            -1,
            -1
        ];
    }
}

export {materialTypes};
export default BaseMaterial;
