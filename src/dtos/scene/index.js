import MaterialList from '../../dtos/material-list';
import TextureList from '../../dtos/texture-list';

import {
    defined,
    definedNotNull,
    flatten,
    normedColor,
    isArray,
    isHexColor,
    isFn
} from '../../utils';

class Scene {
    constructor({camera, background, geometries, materials, textures}) {
        if(!geometries.length) {
            return null;
        }

        this.camera = camera;
        this.background = isArray(background)
            ? background
            : [background, background];

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
                    } else {
                        throw `Could not find material with name: "${hitable.material}"`;
                    }
                }

                // replace texture name with name + id

                if(defined(hitable.texture)) {
                    const textureName = hitable.texture.name
                        ? hitable.texture.name
                        : hitable.texture;

                    const texture = this.textures.elements
                        .find(texture => 
                            texture.name === textureName
                        );

                    if(defined(texture)) {
                        hitable.texture = {
                            texture: hitable.texture.name,
                            textureId: texture.id,
                            scale: hitable.texture.scale
                        }
                    } else {
                        throw `Could not find texture with name "${textureName}"`;
                    }
                }

                // replace normal map texture name with name + id
                if(defined(hitable.normalMap)) {
                    const normTexName = hitable.normalMap.name
                        ? hitable.normalMap.name
                        : hitable.normalMap;

                    const normalMap = this.textures.elements
                        .find(texture => 
                            texture.name === normTexName
                        );

                    if(defined(normalMap)) {
                        hitable.normalMap = {
                            texture: normTexName,
                            textureId: normalMap.id,
                            scale: hitable.normalMap.scale
                        }
                    } else {
                        throw `Could not find normal map texture with name "${normTexName}"`;
                    }
                }

                return hitable;
            });
    }
};

export default Scene;
