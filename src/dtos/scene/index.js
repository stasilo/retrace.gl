import MaterialList from '../../dtos/material-list';
import TextureList from '../../dtos/texture-list';

import ObjModel from '../../models/obj-model';
import Sphere from '../../models/sphere';
import Volume from '../../models/volume';

import {
    defined,
    definedNotNull,
    flatten,
    normedColor,
    isArray,
    isObj,
    isHexColor,
    isFn
} from '../../utils';

const defaultSceneRenderSettings = {
    realtimeHitDepth: 2,
    hitDepth: 4,
    tMax: 5000,
    maxSphereTracingSteps: 255
};

class Scene {
    constructor({
        renderSettings,
        camera,
        background,
        geometries,
        materials,
        textures
    }) {
        if(!geometries.length) {
            return null;
        }

        this.renderSettings = {
            ...defaultSceneRenderSettings,
            ...renderSettings
        };

        this.camera = camera;
        this.background = isArray(background)
            ? background
            : [background, background];

        this.materials = new MaterialList(materials);

        return (async () => {
            this.textures = await new TextureList(textures);
            this.geometries = await this.finalizeGeometries(geometries);

            let {sdfGeometries, sdfGeometryData} = this.finalizeSdfGeometries(geometries);

            this.sdfGeometries = sdfGeometries;
            this.sdfGeometryData = sdfGeometryData;

            this.hasSdfGeometries = this.sdfGeometries.length > 0;

            this.hasTriangleGeometries = this.geometries
                .filter(g => g instanceof ObjModel).length > 0;
            this.hasSphereGeometries = this.geometries
                .filter(g => g instanceof Sphere).length > 0;
            this.hasVolumeGeometries = this.geometries
                .filter(g => g instanceof Volume).length > 0;

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
                hitable && hitable.includeInBvh && !hitable.isSdfGeometry
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

    finalizeSdfGeometries(geometries) {
        let sdfGeometryData = flatten(
            geometries
                .filter(g => g.isSdfGeometry)
                .map(g => {
                    const data = g.data = g.data.map(sdfDataItem => {
                        if(isObj(sdfDataItem) && 'materialName' in sdfDataItem) {
                            const material = this.materials.elements
                                .find(material => 
                                    material.name === sdfDataItem.materialName
                                );

                            return material ? material.id : 0;
                        }

                        return sdfDataItem;
                    });

                    return data;
                })
        );

        let sdfGeometries = geometries
            .filter(g => g.isSdfGeometry && g.includeInBvh);
        //
        // console.log('constructed this.sdfGeometryData: ', sdfGeometryData);
        // console.log('constructed this.sdfGeometries: ', sdfGeometries);

        return {
            sdfGeometries,
            sdfGeometryData
        };
    }
};

export default Scene;
