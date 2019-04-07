import {normedColor} from '../../utils';

const materialTypes = {
    lambert: 1,
    metal: 2,
    dialetric: 3,
    emissive: 4
}

class ModelMaterial {
    constructor({
        name,
        type,
        albedo,
        fuzz,
        refIdx,
        emissiveIntensity
    }) {
        this.id = -1;
        this.name = name;
        this.type = type;
        this.albedo = albedo;
        this.fuzz = fuzz;
        this.refIdx = refIdx;
        this.emissiveIntensity = emissiveIntensity;
        this.color = '#ff0000';
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
            -1,
            -1,

            // matData3
            ...this.albedo,

            // matData4
            // ...normedColor(this.color)
        ];
    }
}

export {materialTypes};
export default ModelMaterial;
