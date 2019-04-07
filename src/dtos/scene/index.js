import MaterialList from '../../dtos/material-list';

import {
    defined,
    definedNotNull,
    normedColor,
    isHexColor,
    isFn
} from '../../utils';

class Scene {
    constructor({geometries, materials}) {
        if(!geometries.length) {
            return;
        }

        this.objIdCounter = 0;
        this.materials = new MaterialList(materials);

        this.bvhHitables = geometries
            .filter(hitable =>
                hitable && hitable.includeInBvh
            ).map(hitable => { // replace material name with name + id
                if(defined(hitable.material)) {
                    const material = this.materials.elements
                        .find(material => 
                            material.name === hitable.material
                        );

                    if(defined(material)) {
                        hitable.material = {
                            material: hitable.material,
                            materialId: material.id
                        }
                    }
                }

                return hitable;
            });

        this.hitables = geometries
            .filter(hitable =>
                hitable && isFn(hitable.getDefinition)
            );

        this.hitables
            .forEach(hitable =>
                hitable.id = this.objIdCounter++
            );
    }

    length = () =>
        this.hitables.length;

    get = (i) =>
        this.hitables[i];

    add = (hitable) => {
        hitable.id = this.objIdCounter++;
        this.hitables.push(hitable);
    }

    updateTextureColors = (__uv, __p) =>
        this.hitables
            .map(hitable =>
                hitable.updateTextureColor(__uv, __p)
            ).join('');

    getTextureDefinitions = () =>
        this.hitables
            .map(hitable =>
                hitable.getTextureDefinition()
            ).join('');

    getDefinition = () => `
        Hitable hitables[${this.hitables.length}];
        {
            ${this.hitables.map((hitable, i) => `
                hitables[${i}] = ${hitable.getDefinition()}
            `).join('')}
        }
    `;
};

export default Scene;
