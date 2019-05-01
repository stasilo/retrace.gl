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
                .map((texture, i) => {
                    texture.id = i;
                    return texture;
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
