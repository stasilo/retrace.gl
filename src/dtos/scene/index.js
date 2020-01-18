import MaterialList from '../../dtos/material-list';
import TextureList from '../../dtos/texture-list';
import DisplacementList from '../../dtos/displacement-list'

import ObjModel from '../../models/obj-model';
import Sphere from '../../models/sphere';
import Volume from '../../models/volume';
import Texture from '../../textures/texture';
import VolumeTexture from '../../textures/volume-texture';

import LambertMaterial from '../../materials/lambert';
import MetalMaterial from '../../materials/metal';
import DialectricMaterial from '../../materials/dialectric';
import EmissiveMaterial from '../../materials/emissive';
import ClearcoatMaterial from '../../materials/clearcoat';
import CoatedEmissiveMaterial from '../../materials/coated-emissive';

import AnisotropicVolumeMaterial from '../../materials/anisotropic-volume';
import IsotropicVolumeMaterial from '../../materials/isotropic-volume';

import {
    sdfGeometryTypes,
    sdfOperators,
    sdfDomainOperations
} from '../../models/sdf-model';

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

const defaultSceneRendererSettings = {
    realtimeHitDepth: 2,
    hitDepth: 4,
    tMax: 5000,
    maxSphereTracingSteps: 255,
    resolution: 0.5,
    renderMode: 'regular'
};

class Scene {
    constructor({
        rendererSettings,
        sdfExportSettings,
        camera,
        background,
        geometries,
        materials,
        textures,
        displacements
    }) {
        if(!geometries.length) {
            return null;
        }

        this.rendererSettings = {
            ...defaultSceneRendererSettings,
            ...rendererSettings
        };

        this.sdfExportSettings = sdfExportSettings;

        this.camera = camera;
        this.background = isArray(background)
            ? background
            : [background, background];

        this.materials = new MaterialList(materials);
        this.displacements = new DisplacementList(displacements);

        this.hasLambertMaterial = this.materials.elements
            .filter(t => t instanceof LambertMaterial)
            .length > 0;
        this.hasDialectricMaterial = this.materials.elements
            .filter(t => t instanceof DialectricMaterial)
            .length > 0;
        this.hasMetalMaterial = this.materials.elements
            .filter(t => t instanceof MetalMaterial)
            .length > 0;
        this.hasClearcoatMaterial = this.materials.elements
            .filter(t => t instanceof ClearcoatMaterial)
            .length > 0;
        this.hasEmissiveMaterial = this.materials.elements
            .filter(t => t instanceof EmissiveMaterial)
            .length > 0;
        this.hasCoatedEmissiveMaterial = this.materials.elements
            .filter(t => t instanceof CoatedEmissiveMaterial)
            .length > 0;
        this.hasIsotropicVolumeMaterial = this.materials.elements
            .filter(t => t instanceof IsotropicVolumeMaterial)
            .length > 0;
        this.hasAnisotropicVolumeMaterial = this.materials.elements
            .filter(t => t instanceof AnisotropicVolumeMaterial)
            .length > 0;

        return (async () => {
            this.textures = await new TextureList(textures);

            this.hasTextures = this.textures.elements
                .filter(t => t instanceof Texture)
                .length > 0;
            this.hasVolumeTextures = this.textures.elements
                .filter(t => t instanceof VolumeTexture)
                .length > 0;

            this.geometries = await this.finalizeGeometries(geometries);
            let {sdfGeometries, sdfGeometryData} = this.finalizeSdfGeometries(geometries);

            this.sdfGeometries = sdfGeometries;
            this.sdfGeometryData = sdfGeometryData;

            // geos

            this.hasTriangleGeometries = this.geometries
                .filter(g => g instanceof ObjModel).length > 0;
            this.hasSphereGeometries = this.geometries
                .filter(g => g instanceof Sphere).length > 0;
            this.hasVolumeGeometries = this.geometries
                .filter(g => g instanceof Volume).length > 0;

            // sdf geos

            this.hasSdfGeometries = this.sdfGeometries.length > 0;

            this.hasSdfSphereGeometries = this.sdfGeometries
                .filter(g =>
                    g.geometryTypes.indexOf(sdfGeometryTypes.sphere) > -1
                ).length > 0;

            this.hasSdfBoxGeometries = this.sdfGeometries
                .filter(g =>
                    g.geometryTypes.indexOf(sdfGeometryTypes.box) > -1
                ).length > 0;

            this.hasSdfTorusGeometries = this.sdfGeometries
                .filter(g =>
                    g.geometryTypes.indexOf(sdfGeometryTypes.torus) > -1
                ).length > 0;

            this.hasSdfCylinderGeometries = this.sdfGeometries
                .filter(g =>
                    g.geometryTypes.indexOf(sdfGeometryTypes.cylinder) > -1
                ).length > 0;

            this.hasSdfEllipsoidGeometries = this.sdfGeometries
                .filter(g =>
                    g.geometryTypes.indexOf(sdfGeometryTypes.ellipsoid) > -1
                ).length > 0;

            this.hasSdfConeGeometries = this.sdfGeometries
                .filter(g =>
                    g.geometryTypes.indexOf(sdfGeometryTypes.cone) > -1
                ).length > 0;

            this.hasSdfRoundedConeGeometries = this.sdfGeometries
                .filter(g =>
                    g.geometryTypes.indexOf(sdfGeometryTypes.roundedCone) > -1
                ).length > 0;

            this.hasSdfPyramidGeometries = this.sdfGeometries
                .filter(g =>
                    g.geometryTypes.indexOf(sdfGeometryTypes.pyramid) > -1
                ).length > 0;

            this.hasSdfLineGeometries = this.sdfGeometries
                .filter(g =>
                    g.geometryTypes.indexOf(sdfGeometryTypes.line) > -1
                ).length > 0;

            this.hasSdfXzPlaneGeometries = this.sdfGeometries
                .filter(g =>
                    g.geometryTypes.indexOf(sdfGeometryTypes.plane) > -1
                ).length > 0;

            this.hasSdfCapsuleGeometries = this.sdfGeometries
                .filter(g =>
                    g.geometryTypes.indexOf(sdfGeometryTypes.capsule) > -1
                ).length > 0;

            this.hasSdfLinkGeometries = this.sdfGeometries
                .filter(g =>
                    g.geometryTypes.indexOf(sdfGeometryTypes.link) > -1
                ).length > 0;

            console.log('this.sdfGeometries: ', this.sdfGeometries);

            // sdf op codes

            this.hasSdfUnionOpCode = this.sdfGeometries
                .filter(g =>
                    g.opCodes.indexOf(sdfOperators.union) > -1
                ).length > 0;
            this.hasSdfUnionRoundOpCode = this.sdfGeometries
                .filter(g =>
                    g.opCodes.indexOf(sdfOperators.unionRound) > -1
                ).length > 0;
            this.hasSdfUnionChamferOpCode = this.sdfGeometries
                .filter(g =>
                    g.opCodes.indexOf(sdfOperators.unionChamfer) > -1
                ).length > 0;
            this.hasSdfUnionStairsOpCode = this.sdfGeometries
                .filter(g =>
                    g.opCodes.indexOf(sdfOperators.unionStairs) > -1
                ).length > 0;
            this.hasSdfUnionColumnsOpCode = this.sdfGeometries
                .filter(g =>
                    g.opCodes.indexOf(sdfOperators.unionColumns) > -1
                ).length > 0;
            this.hasSdfSubtractOpCode = this.sdfGeometries
                .filter(g =>
                    g.opCodes.indexOf(sdfOperators.subtract) > -1
                ).length > 0;
            this.hasSdfIntersectOpCode = this.sdfGeometries
                .filter(g =>
                    g.opCodes.indexOf(sdfOperators.intersect) > -1
                ).length > 0;

            // sdf domain op codes

            this.hasSdfRepeatOpCode = this.sdfGeometries
                .filter(g =>
                    g.domainOpCodes.indexOf(sdfDomainOperations.repeat) > -1
                ).length > 0;
            this.hasSdfTwistOpCode = this.sdfGeometries
                .filter(g =>
                    g.domainOpCodes.indexOf(sdfDomainOperations.twist) > -1
                ).length > 0;
            this.hasSdfBendOpCode = this.sdfGeometries
                .filter(g =>
                    g.domainOpCodes.indexOf(sdfDomainOperations.bend) > -1
                ).length > 0;
            this.hasSdfRepeatBoundedOpCode = this.sdfGeometries
                .filter(g =>
                    g.domainOpCodes.indexOf(sdfDomainOperations.repeatBounded) > -1
                ).length > 0;
            this.hasSdfRepeatPolarOpCode = this.sdfGeometries
                .filter(g =>
                    g.domainOpCodes.indexOf(sdfDomainOperations.repeatPolar) > -1
                ).length > 0;

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

                            return material
                                ? material.id
                                : 0;
                        }

                        if(isObj(sdfDataItem) && 'textureName' in sdfDataItem) {
                            const texture = this.textures.elements
                                .find(texture => 
                                    texture.name === sdfDataItem.textureName
                                );

                            return texture
                                ? texture.id
                                : -1;
                        }

                        if(isObj(sdfDataItem) && 'displacementMapName' in sdfDataItem) {
                            const texture = this.textures.elements
                                .find(texture => 
                                    texture.name === sdfDataItem.displacementMapName
                                );

                            return texture
                                ? texture.id
                                : -1;
                        }

                        if(isObj(sdfDataItem) && 'displacementFuncName' in sdfDataItem) {
                            const displacement = this.displacements.elements
                                .find(displacement => 
                                    displacement.name === sdfDataItem.displacementFuncName
                                );

                            return displacement
                                ? displacement.id
                                : -1;
                        }

                        return sdfDataItem;
                    });

                    return data;
                })
        );

        let sdfGeometries = geometries
            .filter(g => g.isSdfGeometry && g.includeInBvh);

        return {
            sdfGeometries,
            sdfGeometryData
        };
    }
};

export default Scene;
