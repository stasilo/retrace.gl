import {defined, definedNotNull} from '../../utils';

class MaterialList {
    elements = [];

    constructor(materials) {
        this.elements = definedNotNull(materials)
            ? materials
                .map((material, i) => {
                    material.id = i;
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
