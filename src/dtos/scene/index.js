import MaterialList from '../../dtos/material-list';
import TextureList from '../../dtos/texture-list';

import {
    defined,
    definedNotNull,
    flatten,
    normedColor,
    isHexColor,
    isFn
} from '../../utils';

class Scene {
    constructor({camera, background, geometries, materials, textures}) {
        if(!geometries.length) {
            return null;
        }

        this.camera = camera;
        this.background = background;
        this.materials = new MaterialList(materials);

        return (async () => {
            this.textures = await new TextureList(textures);
            this.geometries = await this.finalizeGeometries(geometries);

            return this;
        })();
    }

    async finalizeGeometries(geometries) {
        // wait for promises in dim 0 of array
        geometries = await Promise.all(geometries);
        // flatten array & wait for promises that were nested
        geometries = await Promise.all(flatten(geometries));

        return geometries
            .filter(hitable =>
                hitable && hitable.includeInBvh
            ).map(hitable => {
                // replace material name with name + id
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

                // replace texture name with name + id
                if(defined(hitable.texture)) {
                    const texture = this.textures.elements
                        .find(texture => 
                            texture.name === hitable.texture
                        );

                    if(defined(texture)) {
                        hitable.texture = {
                            texture: hitable.texture,
                            textureId: texture.id
                        }
                    }
                }

                return hitable;
            });
    }
};

export default Scene;
