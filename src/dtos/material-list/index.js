import {
    defined,
    definedNotNull,
    flatten
} from '../../utils';

class MaterialList {
    elements = [];

    constructor(materials) {
        this.elements = definedNotNull(materials)
            ? flatten(materials)
                .map((material, i) => {
                    material.id = i;
                    console.log(`setting mat ${material.name} to id ${material.id}`);
                    return material;
                })
            : [];
    }

    addMaterial(material) {
        material.id = this.elements.length + 1;
        this.elements
            .concat(material);
    }

    getMaterialData() {
        return this.elements
            .reduce((flatMaterials, material) => [
                ...flatMaterials,
                ...material.toArray()
            ], []);
    }
}

export default MaterialList;
