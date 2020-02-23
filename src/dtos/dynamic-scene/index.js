/**
  * Global scope creation and evaluation of scene declaration
  * This file also contains the scene api documentation
  */

import * as babel from '@babel/core';

import babelEnvPreset from '@babel/preset-env';
import babelDecoratorPlugin from '@babel/plugin-proposal-decorators';
import babelObjSpreadPlugin from '@babel/plugin-proposal-object-rest-spread';
import babelPipesPlugin from '@babel/plugin-proposal-pipeline-operator';

import SimplexNoise from 'simplex-noise';

import {
    vec3 as _vec3,
    vec2 as _vec2
} from 'gl-matrix';

import Scene from '../../dtos/scene';
import {createCamera} from '../../camera';

import ObjModel from '../../models/obj-model';
import Plane from '../../models/plane';
import Cube from '../../models/cube';
import Sphere from '../../models/sphere';
import Diamond from '../../models/diamond';
import Volume from '../../models/volume';

import Texture from '../../textures/texture';
import VolumeTexture from '../../textures/volume-texture';

import MetalMaterial from '../../materials/metal';
import LambertMaterial from '../../materials/lambert';
import EmissiveMaterial from '../../materials/emissive';
import DialectricMaterial from '../../materials/dialectric';
import ClearcoatMaterial from '../../materials/clearcoat';
import CoatedEmissiveMaterial from '../../materials/coated-emissive';

import IsotropicVolumeMaterial from '../../materials/isotropic-volume';
import AnisotropicVolumeMaterial from '../../materials/anisotropic-volume';

import SdfSphere from '../../models/sdf-sphere';
import SdfBox from '../../models/sdf-box';
import SdfCylinder from '../../models/sdf-cylinder';
import SdfCapsule from '../../models/sdf-capsule';
import SdfTorus from '../../models/sdf-torus';
import SdfEllipsoid from '../../models/sdf-ellipsoid';
import SdfCone from '../../models/sdf-cone';
import SdfRoundedCone from '../../models/sdf-rounded-cone';
import SdfPyramid from '../../models/sdf-pyramid';
import SdfLine from '../../models/sdf-line';
import SdfXzPlane from '../../models/sdf-xz-plane';
import SdfLink from '../../models/sdf-link';

import  {
    sdf as _sdf,
    sdfOpUnion,
    sdfOpUnionRound,
    sdfOpUnionChamfer,
    sdfOpUnionStairs,
    sdfOpUnionColumns,

    sdfOpSubtract,
    sdfOpSubtractRound,
    sdfOpSubtractChamfer,
    sdfOpSubtractStairs,
    sdfOpSubtractColumns,

    sdfOpIntersect,
    sdfOpIntersectRound,
    sdfOpIntersectStairs,
    sdfOpIntersectColumns,
    sdfOpIntersectChamfer
} from '../../models/sdf-model';

import {
    deterministicRandom as _random,
    deterministicRandomInt as _randomInt,
    deterministicRandomBool as _randomBool,
    deterministicRandomSign as _randomSign,
    deterministicMaybe as _maybe,
    deterministicPluckRandom as _pluckRandom,
    deterministicTakeRandom as _takeRandom,
    range as _range,
    range2d as _range2d,
    range3d as _range3d,
    subRange as _subRange,
    glslFloat as _glslFloat,
    // normedColor as _normedColor,
    normedColorStr as _normedColorStr,
    degToRad as _degToRad,
    radToDeg as _radToDeg,
    clamp as _clamp,
    lerp as _lerp,
    tileSeamless3d as _tileSeamless3d,
} from '../../utils';

// bring everything into local scope - this is
// needed as webpack imported module names are transpiled
// into names like '_xxxxx_js__WEBPACK_IMPORTED_MODULE_5__'
// ...also and add some syntactic sugar :)

/**
 * 3d coordinates / 3d vector
 *
 * @typedef {object} vec3
 *
 * @property {number} x
 * @property {number} y
 * @property {number} z
 */

/**
 * 2d coordinates / 2d vector
 *
 * @typedef {object} vec2
 *
 * @property {number} x
 * @property {number} y
 */

/**
 * Renderer settings for the scene
 *
 * @typedef {object} rendererSettings
 *
 * @property {('raytrace' | 'sdf')} [renderMode='raytrace'] - Render scene using raytracing or a much more performant (but visually crass) "sdf render mode"
 * @property {number} [hitDepth=4] - Number of raytraced bounces when raytracing a static image
 * @property {number} [realtimeHitDepth=2] - Number of raytraced bounces when raytracing in real time
 * @property {number} [tMax=5000] - Maxiumum hit T for the raytracing renderer
 * @property {number} [maxSphereTracingStep=255] - Max no. of steps for raymarched geometries
 * @property {number} [resolution=0.5] - Renderer resolution before scale up. "0.5" means the resolution will be 50% of browser viewport (and thus will be scaled up 50% in the app)
 */

 /**
  * Camera settings for the scene. Note that camera position is auto updated
  * in real time mode.
  *
  * @typedef {object} camera
  *
  * @property {vec3} lookFrom - Camera position
  * @property {vec3} lookAt - Position camera is pointing at
  * @property {number} vfov - Vertical field of view in degress
  * @property {number} aperturre - Apterture
  * @property {number} velocity - Camera movement velocity in real time mode
  */

 /**
  * Default settings for the SDF exporter
  *
  * @typedef {object} sdfExportSettings
  * @todo Make the sdf exporter dialog offer the option to save these to source when exporting.
  *
  * @property {number} resolution - Marching cubes export resolution
  * @property {vec3} minCoords - Min coords of the bounding box
  * @property {vec3} maxCoords - Max coords of the bounding box
  */

 /**
  * Defines a GLSL displacement function
  *
  * @typedef {object} sdfDisplacement
  *
  * @property {string} name - The name/id of the displacement function
  * @property {string} src - THe GLSL source code for the displacement
  * @example
  * {
  *     name: 'sinus-displacement',
  *     src: `
  *         float offset = ${glslFloat(random(100))};
  *         float d = sin(1.*(p.x+offset)) * sin(1.*(p.y+offset)) * sin(1.*(p.z+offset));
  *         dDist = d;
  *     `
  * }
  */

/**
 * The main scene object / declaration
 *
 * @typedef {object} sceneDescription
 *
 * @property {rendererSettings} [rendererSettings] - Renderer settings
 * @property {camera} [camera] - Camera settings. If no camera is provided a default will be injected (sic) into the source. Note that camera position is auto updated in real time mode.
 * @property {(string|string[])} background - A hex color string or an array of length 2 with hex color strings for the scene background
 * @property {sdfExportSettings} [sdfExportSettings] - Default sdf export settings.
 * @property {Array|Array[]} geometries - The scene geometries. An array of objects created by any of the {@link module:geometries|geometry functions} will do. NOTE: the geometry array can contain nested arrays of geometries. The array is flattened upon parsing.
 * @property {Array} materials - The scene materials. An array of objects created by any of the {@link module:materials|material functions} will do.
 * @property {Array} textures - The scene textures. Any object created by the {@link module:textures|texture functions} will do.
 * @property {sdfDisplacement[]} [displacements] - SDF displacement function definitions
 */


/**
 * The main scene call
 *
 * @static
 * @function
 * @param {sceneDescription} scene - The scene declaration
 */
const scene = (o) =>
    new Scene(o);

const camera = (o) =>
    createCamera(o);

/** @module geometries */

/**
 * Wavefront .obj model geometry (no MTL support!)
 *
 * @static
 * @function
 * @param {object} options - Model options
 * @param {string} options.url - Model url
 * @param {vec3} options.position - Position
 * @param {vec3} [options.rotation] - Rotation per axis in radians.
 * @param {vec3|number} [options.scale] - A vec3 representing scale per axis or a single number by which to scale all directions with.
 * @param {bool} [options.smoothShading] - If true use smooth shading instead of flat.
 * @param {bool} [options.doubleSided] - Shade both sides of each triangle (you probably want this if your model has "holes"). Defaults to false.
 * @param {bool} [options.flipNormals] - Flip model normals
 * @param {string} options.material - The name of the material to use. If omitted the geometry will default to the first declared material.
 * @param {module:textures~geometryTexture} [options.texture] - A texture to apply on the geometry. Textures on SDF geometries are applied using triplanar mapping.
 * @param {module:textures~geometryNormalMap} [options.displacementMap] - A texture used as a normal map for the geometry.
 */
const objModel = (o) =>
    new ObjModel(o);

/**
 * Shortcut for a simple plane .obj model
 *
 * @static
 * @function
 * @param {object} options - Model options
 * @param {vec3} options.position - Position
 * @param {vec3} [options.rotation] - Rotation per axis in radians.
 * @param {vec3|number} [options.scale] - A vec3 representing scale per axis or a single number by which to scale all directions with.
 * @param {bool} [options.smoothShading] - If true use smooth shading instead of flat. Defaults to true.
 * @param {string} options.material - The name of the material to use. If omitted the geometry will default to the first declared material.
 * @param {bool} [options.doubleSided] - Shade both sides of each triangle (you probably want this if your model has "holes"). Defaults to false.
 * @param {module:textures~geometryTexture} [options.texture] - A texture to apply on the geometry. Textures on SDF geometries are applied using triplanar mapping.
 * @param {module:textures~geometryNormalMap} [options.displacementMap] - A texture used as a normal map for the geometry.
 */
const plane = (o) =>
    new Plane(o);

/**
 * Shortcut for a simple cube .obj model
 *
 * @static
 * @function
 * @param {object} options - Model options
 * @param {vec3} options.position - Position
 * @param {vec3} [options.rotation] - Rotation per axis in radians.
 * @param {vec3|number} [options.scale] - A vec3 representing scale per axis or a single number by which to scale all directions with.
 * @param {bool} [options.smoothShading] - If true use smooth shading instead of flat. Defaults to true.
 * @param {bool} [options.doubleSided] - Shade both sides of each triangle (you probably want this if your model has "holes"). Defaults to false.
 * @param {string} options.material - The name of the material to use. If omitted the geometry will default to the first declared material.
 * @param {module:textures~geometryTexture} [options.texture] - A texture to apply on the geometry. Textures on SDF geometries are applied using triplanar mapping.
 * @param {module:textures~geometryNormalMap} [options.displacementMap] - A texture used as a normal map for the geometry.
 */
const cube = (o) =>
    new Cube(o);

/**
 * A sphere geometry
 *
 * @static
 * @function
 * @param {object} options - Sphere options
 * @param {vec3} options.position - Position
 * @param {number} options.radius - Sphere radius
 * @param {string} options.material - The name of the material to use. If omitted the geometry will default to the first declared material.
 * @param {module:textures~geometryTexture} [options.texture] - A texture to apply on the geometry. Textures on SDF geometries are applied using triplanar mapping.
 * @param {module:textures~geometryNormalMap} [options.displacementMap] - A texture used as a normal map for the geometry.
 */
const sphere = (o) =>
    new Sphere(o);

/**
 * Shortcut for a diamond .obj model
 *
 * @static
 * @function
 * @param {object} options - Model options
 * @param {vec3} options.position - Position
 * @param {vec3} [options.rotation] - Rotation per axis in radians.
 * @param {vec3|number} [options.scale] - A vec3 representing scale per axis or a single number by which to scale all directions with.
 * @param {bool} [options.smoothShading] - If true use smooth shading instead of flat. Defaults to true.
 * @param {bool} [options.doubleSided] - Shade both sides of each triangle (you probably want this if your model has "holes"). Defaults to false.
 * @param {string} options.material - The name of the material to use. If omitted the geometry will default to the first declared material.
 * @param {module:textures~geometryTexture} [options.texture] - A texture to apply on the geometry. Textures on SDF geometries are applied using triplanar mapping.
 * @param {module:textures~geometryNormalMap} [options.displacementMap] - A texture used as a normal map for the geometry.
 */
const diamond = (o) =>
    new Diamond(o);


/**
 * Volume bound geometry.
 * Used in conjunction with a volume material
 * ({@link module:materials.isotropicVolumeMaterial|isotropicVolumeMaterial}
 *   or {@link module:materials.anisotropicVolumeMaterial|anisotropicVolumeMaterial}),
 * and, optionally, a {@link module:textures.volumeTexture|volume texture}).
 *
 * @static
 * @function
 * @param {object} options - Volume options
 * @param {string} options.material - The name of a defined {@link module:materials.isotropicVolumeMaterial|isotropicVolumeMaterial}
 *                                      or {@link module:materials.anisotropicVolumeMaterial|anisotropicVolumeMaterial}.
 * @param {string} [options.texture] - An optional {@link module:textures.volumeTexture|volume texture} to sample from if using an
 *                                      {@link module:materials.anisotropicVolumeMaterial|anisotropic material}. If no texture is supplied
 *                                      the volume will be automatically sampled from a standard noise function.
 * @param {vec3} options.minCoords - Min coords of the bound
 * @param {vec3} options.maxCoords - Max coords of the bound
 *
 * @example
 * volume({
 *     material: 'iso-volume',
 *     minCoords: {
 *         x: 0,
 *         y: 0,
 *         z: 0
 *     },
 *     maxCoords: {
 *         x: 20,
 *         y: 20,
 *         z: 20
 *     },
 * });
 *
 * @example
 * volume({
 *     material: 'aniso-volume-material',
 *     texture: 'volume-texture',
 *     minCoords: {
 *         x: -155,
 *         y: 0.0,
 *         z: -155
 *     },
 *     maxCoords: {
 *         x: 155,
 *         y: 80.0,
 *         z: 155
 *     }
 * });
 */
const volume = (o) =>
    new Volume(o);


/**
 * Represents an SDF domain operation:
 * 'repeat', 'repeatBounded', 'bend' or 'twist'
 *
 * {@link https://iquilezles.org/www/articles/distfunctions/distfunctions.htm|Read more in inigo quilez' 3d sdf article}
 *
 * @typedef {object} domain
 *
 * @property {('repeat' | 'repeatBounded' | 'bend' | 'twist')} domainOp - Operation type
 * @property {number} size - Size of the side of the cube of space to apply the operation on if repeating. The magnitude of the operation otherwise.
 * @property {vec3} [bounds] - NOTE: only required for bounded repetitions. Number of repetitions along each axis. Should be renamed :)
 * @property {('x' | 'y' | 'z' | 'xy' | 'xz' | 'yz' | 'xyz')} [axis] - NOTE: only required for repeat operations. Along which axes to repeat.
 */


 /**
  * SDF geometry wrapper. All sdf geometries & operations need to be wrapped by this function call.
  *
  * @name sdf
  * @static
  * @function
  * @param {domain} [domain] - Optional domain operation to apply to the whole final geometry
  * @param {(sdfGeometry | sdfOperation)} sdfData - An sdf geometry or sdf operation consisting of multiple geometries.
  *
  * @example
  * geometries = [
  *     sdf(
  *         sdfSphere({
  *             material: 'mat1',
  *             radius: 2,
  *             position: {x: 0, y: 0, z: 0}
  *         })
  *     ),
  *     // ...
  * ];
  *
  * @example
  * geometries = [
  *     sdf(
  *         sdfSphere({
  *             radius: 2,
  *             material: 'mat1'
  *             position: {x: 0, y: 0, z: 0}
  *
  *         })
  *         |> opUnionRound(({radius: 0.5}), #,
  *             sdfBox({
  *                 dimensions: {
  *                     x: 2,
  *                     y: 3,
  *                     z: 1,
  *                 },
  *                 position: {x: 1, y: 0, z: 4},
  *                 material: 'mat1'
  *             })
  *         )
  *     ),
  *     // ...
  * ];
  *
  */
const sdf = _sdf;

/**
 * SDF sphere geometry
 *
 * @static
 * @function
 * @param {object} options - Sphere options
 * @param {number} options.radius - The sphere radius
 * @param {vec3} options.position - Position
 * @param {string} options.material - The name of the material to use. If omitted the geometry will default to the first declared material.
 * @param {module:textures~geometryTexture} [options.texture] - A texture to apply on the geometry. Textures on SDF geometries are applied using triplanar mapping.
 * @param {module:geometries~domain} [options.domain] - A domain operation that should be applied on this geometry.
 * @param {module:textures~geometryDisplacementMap} [options.displacementMap] - A texture used as a displacement map for the geometry.
 * @param {string} [options.displacementFunc] - The name of a in this scene defined displacement func to use as displacement data.
 */
const sdfSphere = (o) =>
    new SdfSphere(o).geometryData();

/**
 * SDF box geometry
 *
 * @static
 * @function
 * @param {object} options - Box options
 * @param {vec3} options.position - Position
 * @param {vec3} options.dimensions - Box dimensions
 * @param {vec3} [options.rotation] - Box rotation per axis in radians.
 * @param {string} options.material - The name of the material to use. If omitted the geometry will default to the first declared material.
 * @param {module:textures~geometryTexture} [options.texture] - A texture to apply on the geometry. Textures on SDF geometries are applied using triplanar mapping.
 * @param {module:geometries~domain} [options.domain] - A domain operation that should be applied on this geometry.
 * @param {module:textures~geometryDisplacementMap} [options.displacementMap] - A texture used as a displacement map for the geometry.
 * @param {string} [options.displacementFunc] - The name of a in this scene defined displacement func to use as displacement data.
 */
const sdfBox = (o) =>
    new SdfBox(o).geometryData();

/**
 * SDF cylinder geometry
 *
 * @static
 * @function
 * @param {object} options - Cylinder options
 * @param {vec3} options.position - Position
 * @param {number} options.radius - Cylinder radius
 * @param {number} options.height - Cylinder height
 * @param {vec3} [options.rotation] - Cylinder rotation per axis in radians.
 * @param {string} options.material - The name of the material to use. If omitted the geometry will default to the first declared material.
 * @param {module:textures~geometryTexture} [options.texture] - A texture to apply on the geometry. Textures on SDF geometries are applied using triplanar mapping.
 * @param {module:geometries~domain} [options.domain] - A domain operation that should be applied on this geometry.
 * @param {module:textures~geometryDisplacementMap} [options.displacementMap] - A texture used as a displacement map for the geometry.
 * @param {string} [options.displacementFunc] - The name of a in this scene defined displacement func to use as displacement data.
 */
const sdfCylinder = (o) =>
    new SdfCylinder(o).geometryData();

/**
 * SDF torus geometry
 *
 * @static
 * @function
 * @param {object} options - Torus options
 * @param {vec3} options.position - Position
 * @param {number} options.innerRadius - Torus inner radius
 * @param {number} options.outerRadius - Torus outer radius
 * @param {vec3} [options.rotation] - Torus rotation per axis in radians.
 * @param {string} options.material - The name of the material to use. If omitted the geometry will default to the first declared material.
 * @param {module:textures~geometryTexture} [options.texture] - A texture to apply on the geometry. Textures on SDF geometries are applied using triplanar mapping.
 * @param {module:geometries~domain} [options.domain] - A domain operation that should be applied on this geometry.
 * @param {module:textures~geometryDisplacementMap} [options.displacementMap] - A texture used as a displacement map for the geometry.
 * @param {string} [options.displacementFunc] - The name of a in this scene defined displacement func to use as displacement data.
 */
const sdfTorus = (o) =>
    new SdfTorus(o).geometryData();

/**
 * SDF ellipsoid geometry
 *
 * @static
 * @function
 * @param {object} options - Ellipsoid options
 * @param {vec3} options.position - Position
 * @param {vec3} options.radius - Ellipsoid radii per axis
 * @param {vec3} [options.rotation] - Ellipsoid rotation per axis in radians.
 * @param {string} options.material - The name of the material to use. If omitted the geometry will default to the first declared material.
 * @param {module:textures~geometryTexture} [options.texture] - A texture to apply on the geometry. Textures on SDF geometries are applied using triplanar mapping.
 * @param {module:geometries~domain} [options.domain] - A domain operation that should be applied on this geometry.
 * @param {module:textures~geometryDisplacementMap} [options.displacementMap] - A texture used as a displacement map for the geometry.
 * @param {string} [options.displacementFunc] - The name of a in this scene defined displacement func to use as displacement data.
 */
const sdfEllipsoid = (o) =>
    new SdfEllipsoid(o).geometryData();

/**
 * SDF cone geometry
 *
 * @static
 * @function
 * @param {object} options - Cone options
 * @param {vec3} options.position - Position
 * @param {number} options.radius - Cone radius
 * @param {number} options.height - Cone height
 * @param {vec3} [options.rotation] - Cone rotation per axis in radians.
 * @param {string} options.material - The name of the material to use. If omitted the geometry will default to the first declared material.
 * @param {module:textures~geometryTexture} [options.texture] - A texture to apply on the geometry. Textures on SDF geometries are applied using triplanar mapping.
 * @param {module:geometries~domain} [options.domain] - A domain operation that should be applied on this geometry.
 * @param {module:textures~geometryDisplacementMap} [options.displacementMap] - A texture used as a displacement map for the geometry.
 * @param {string} [options.displacementFunc] - The name of a in this scene defined displacement func to use as displacement data.
 */
const sdfCone = (o) =>
    new SdfCone(o).geometryData();

/**
 * SDF cone geometry
 *
 * @static
 * @function
 * @param {object} options - Cone options
 * @param {vec3} options.position - Position
 * @param {number} options.bottomRadius - Cone bottom radius
 * @param {number} options.topRadius - Cone radius
 * @param {number} options.height - Cone height
 * @param {vec3} [options.rotation] - Cone rotation per axis in radians.
 * @param {string} options.material - The name of the material to use. If omitted the geometry will default to the first declared material.
 * @param {module:textures~geometryTexture} [options.texture] - A texture to apply on the geometry. Textures on SDF geometries are applied using triplanar mapping.
 * @param {module:geometries~domain} [options.domain] - A domain operation that should be applied on this geometry.
 * @param {module:textures~geometryDisplacementMap} [options.displacementMap] - A texture used as a displacement map for the geometry.
 * @param {string} [options.displacementFunc] - The name of a in this scene defined displacement func to use as displacement data.
 */
const sdfRoundedCone = (o) =>
    new SdfRoundedCone(o).geometryData();

/**
 * SDF pyramid geometry
 *
 * @static
 * @function
 * @param {object} options - Pyramid options
 * @param {vec3} options.position - Position
 * @param {number} options.base - Pyramid bottom base dimension
 * @param {number} options.height - Pyramid height
 * @param {vec3} [options.rotation] - Pyramid rotation per axis in radians.
 * @param {string} options.material - The name of the material to use. If omitted the geometry will default to the first declared material.
 * @param {module:textures~geometryTexture} [options.texture] - A texture to apply on the geometry. Textures on SDF geometries are applied using triplanar mapping.
 * @param {module:geometries~domain} [options.domain] - A domain operation that should be applied on this geometry.
 * @param {module:textures~geometryDisplacementMap} [options.displacementMap] - A texture used as a displacement map for the geometry.
 * @param {string} [options.displacementFunc] - The name of a in this scene defined displacement func to use as displacement data.
 */
const sdfPyramid = (o) =>
    new SdfPyramid(o).geometryData();

/**
 * SDF line segment between two points
 *
 * @static
 * @function
 * @param {object} options - Line options
 * @param {vec3} options.position - Position
 * @param {vec3} options.start - Line starting point
 * @param {vec3} options.end - Line end point
 * @param {number} options.thickness - The thickness of the line
 * @param {vec3} [options.rotation] - Pyramid rotation per axis in radians.
 * @param {string} options.material - The name of the material to use. If omitted the geometry will default to the first declared material.
 * @param {module:textures~geometryTexture} [options.texture] - A texture to apply on the geometry. Textures on SDF geometries are applied using triplanar mapping.
 * @param {module:geometries~domain} [options.domain] - A domain operation that should be applied on this geometry.
 * @param {module:textures~geometryDisplacementMap} [options.displacementMap] - A texture used as a displacement map for the geometry.
 * @param {string} [options.displacementFunc] - The name of a in this scene defined displacement func to use as displacement data.
 */
const sdfLine = (o) =>
    new SdfLine(o).geometryData();

const sdfXzPlane = (o) =>
    new SdfXzPlane(o).geometryData();

/**
 * SDF capsule geometry
 *
 * @static
 * @function
 * @param {object} options - Capsule options
 * @param {vec3} options.position - Position
 * @param {number} options.radius - Capsule radius
 * @param {number} options.height - Capsule height
 * @param {vec3} [options.rotation] - Capsule rotation per axis in radians.
 * @param {string} options.material - The name of the material to use. If omitted the geometry will default to the first declared material.
 * @param {module:textures~geometryTexture} [options.texture] - A texture to apply on the geometry. Textures on SDF geometries are applied using triplanar mapping.
 * @param {module:geometries~domain} [options.domain] - A domain operation that should be applied on this geometry.
 * @param {module:textures~geometryDisplacementMap} [options.displacementMap] - A texture used as a displacement map for the geometry.
 * @param {string} [options.displacementFunc] - The name of a in this scene defined displacement func to use as displacement data.
 */
const sdfCapsule = (o) =>
    new SdfCapsule(o).geometryData();

/**
 * SDF chain link geometry
 *
 * @static
 * @function
 * @param {object} options - Chain link options
 * @param {vec3} options.position - Position
 * @param {number} options.radius - Chain link end radius
 * @param {number} options.height - Chain link height
 * @param {number} options.thickness - The thickness of the link
 * @param {vec3} [options.rotation] - Capsule rotation per axis in radians.
 * @param {string} options.material - The name of the material to use. If omitted the geometry will default to the first declared material.
 * @param {module:textures~geometryTexture} [options.texture] - A texture to apply on the geometry. Textures on SDF geometries are applied using triplanar mapping.
 * @param {module:geometries~domain} [options.domain] - A domain operation that should be applied on this geometry.
 * @param {module:textures~geometryDisplacementMap} [options.displacementMap] - A texture used as a displacement map for the geometry.
 * @param {string} [options.displacementFunc] - The name of a in this scene defined displacement func to use as displacement data.
 */
const sdfLink = (o) =>
    new SdfLink(o).geometryData();

/**
 * @module sdf-operations
 */

/**
 * SDF union operation. Needs to be wrapped by the sdf() function call.
 * See example with sdf() {@link module:geometries.sdf|here}.
 *
 * NOTE! You shouldn't use this for performance reasons. If you need
 * a regular union you should just create another geometry
 * and wrap it in a new sdf() call. The engine will handle the union for you
 * and each geometry will have its own bounding box for BVH construction (=speedier!).
 *
 * @static
 * @function
 * @param {...(sdfGeometry | sdfOperation)} sdfData - An {@link module:geometries.sdf|sdf geometry}
 * or sdf operation consisting of multiple geometries.
 */
const opUnion = sdfOpUnion;

/**
 * SDF union operation with a round blend. Needs to be wrapped by the sdf() function call.
 * See example with sdf() {@link module:geometries.sdf|here}.
 *
 * @static
 * @function
 * @param {object} options - Operator options
 * @param {number} options.radius - Thickness of the blending
 * @param {number} options.colorBlendAmount - Amount of color blend at geometry intersections
 * @param {...(sdfGeometry | sdfOperation)} sdfData - An sdf geometry or sdf operation consisting of multiple geometries.
 */
const opUnionRound = sdfOpUnionRound;

/**
 * SDF union operation with a chamfer effect. Needs to be wrapped by the sdf() function call.
 * See example with sdf() {@link module:geometries.sdf|here}.
 *
 * @static
 * @function
 * @param {object} options - Operator options
 * @param {number} options.radius - Thickness of the blending
 * @param {number} options.colorBlendAmount - Amount of color blend at geometry intersections
 * @param {...(sdfGeometry | sdfOperation)} sdfData - An sdf geometry or sdf operation consisting of multiple geometries.
 */
const opUnionChamfer = sdfOpUnionChamfer;

/**
 * SDF union operation with a stairs effect. Needs to be wrapped by the sdf() function call.
 * See example with sdf() {@link module:geometries.sdf|here}.
 *
 * @static
 * @function
 * @param {object} options - Operator options
 * @param {number} options.radius - Thickness of the blending
 * @param {integer} options.steps - Number of stair steps
 * @param {number} options.colorBlendAmount - Amount of color blend at geometry intersections
 * @param {...(sdfGeometry | sdfOperation)} sdfData - An sdf geometry or sdf operation consisting of multiple geometries.
 */
const opUnionStairs = sdfOpUnionStairs;

/**
 * SDF union operation with columns effect. Needs to be wrapped by the sdf() function call.
 * See example with sdf() {@link module:geometries.sdf|here}.
 *
 * @static
 * @function
 * @param {object} options - Operator options
 * @param {number} options.radius - Thickness of the blending
 * @param {integer} options.steps - Number of colymn steps
 * @param {number} options.colorBlendAmount - Amount of color blend at geometry intersections
 * @param {...(sdfGeometry | sdfOperation)} sdfData - An sdf geometry or sdf operation consisting of multiple geometries.
 */
const opUnionColumns = sdfOpUnionColumns;

/**
 * SDF subtraction operation. Needs to be wrapped by the sdf() function call.
 * See example with sdf() {@link module:geometries.sdf|here}.
 *
 * @static
 * @function
 * @param {(sdfGeometry | sdfOperation)} sdfData - The term to subtract from. An {@link module:geometries.sdf|sdf geometry},
 *                                                 or sdf operation consisting of multiple geometries.
 * @param {...(sdfGeometry | sdfOperation)} sdfData - An {@link module:geometries.sdf|sdf geometry}, or sdf operation consisting
 *                                                    of multiple geometries, to subtract from the first term.
 */
const opSubtract = sdfOpSubtract;

/**
 * SDF subtraction operation with a round blend. Needs to be wrapped by the sdf() function call.
 * See example with sdf() {@link module:geometries.sdf|here}.
 *
 * @static
 * @function
 * @param {object} options - Operator options
 * @param {number} options.radius - Thickness of the blending
 * @param {(sdfGeometry | sdfOperation)} sdfData - The term to subtract from. An {@link module:geometries.sdf|sdf geometry},
 *                                                 or sdf operation consisting of multiple geometries.
 * @param {...(sdfGeometry | sdfOperation)} sdfData - An {@link module:geometries.sdf|sdf geometry}, or sdf operation consisting
 *                                                    of multiple geometries, to subtract from the first term.
 */
 const opSubtractRound = sdfOpSubtractRound;

/**
 * SDF subtraction operation with a stairs effect. Needs to be wrapped by the sdf() function call.
 * See example with sdf() {@link module:geometries.sdf|here}.
 *
 * @static
 * @function
 * @param {object} options - Operator options
 * @param {number} options.radius - Thickness of the blending
 * @param {integer} options.steps - Number of stair steps
 * @param {(sdfGeometry | sdfOperation)} sdfData - The term to subtract from. An {@link module:geometries.sdf|sdf geometry},
 *                                                    or sdf operation consisting of multiple geometries.
 * @param {...(sdfGeometry | sdfOperation)} sdfData - An {@link module:geometries.sdf|sdf geometry}, or sdf operation consisting
 *                                                    of multiple geometries, to subtract from the first term.
 */
const opSubtractStairs = sdfOpSubtractStairs;

/**
 * SDF subtraction operation with a chamfer effect. Needs to be wrapped by the sdf() function call.
 * See example with sdf() {@link module:geometries.sdf|here}.
 *
 * @static
 * @function
 * @param {object} options - Operator options
 * @param {number} options.radius - Thickness of the blending
 * @param {(sdfGeometry | sdfOperation)} sdfData - The term to subtract from. An {@link module:geometries.sdf|sdf geometry},
 *                                                 or sdf operation consisting of multiple geometries.
 * @param {...(sdfGeometry | sdfOperation)} sdfData - An {@link module:geometries.sdf|sdf geometry}, or sdf operation consisting
 *                                                    of multiple geometries, to subtract from the first term.
 */
const opSubtractChamfer = sdfOpSubtractChamfer;

/**
 * SDF subtraction operation with a columns stairs effect. Needs to be wrapped by the sdf() function call.
 * See example with sdf() {@link module:geometries.sdf|here}.
 *
 * @static
 * @function
 * @param {object} options - Operator options
 * @param {number} options.radius - Thickness of the blending
 * @param {integer} options.steps - Number of columns
 * @param {(sdfGeometry | sdfOperation)} sdfData - The term to subtract from. An {@link module:geometries.sdf|sdf geometry},
 *                                                 or sdf operation consisting of multiple geometries.
 * @param {...(sdfGeometry | sdfOperation)} sdfData - An {@link module:geometries.sdf|sdf geometry}, or sdf operation consisting
 *                                                    of multiple geometries, to subtract from the first term.
 */
const opSubtractColumns = sdfOpSubtractColumns;

/**
 * SDF intersection operation. Needs to be wrapped by the sdf() function call.
 * See example with sdf() {@link module:geometries.sdf|here}.
 *
 * @static
 * @function
 * @param {...(sdfGeometry | sdfOperation)} sdfData - An {@link module:geometries.sdf|sdf geometry}
 * or sdf operation consisting of multiple geometries.
 */
const opIntersect = sdfOpIntersect;

/**
 * SDF intersection operation with a round blend. Needs to be wrapped by the sdf() function call.
 * See example with sdf() {@link module:geometries.sdf|here}.
 *
 * @static
 * @function
 * @param {object} options - Operator options
 * @param {number} options.radius - Thickness of the blending
 * @param {...(sdfGeometry | sdfOperation)} sdfData - An sdf geometry or sdf operation consisting of multiple geometries.
 */
const opIntersectRound = sdfOpIntersectRound;

/**
 * SDF intersection operation with a chamfer effect. Needs to be wrapped by the sdf() function call.
 * See example with sdf() {@link module:geometries.sdf|here}.
 *
 * @static
 * @function
 * @param {object} options - Operator options
 * @param {number} options.radius - Thickness of the blending
 * @param {...(sdfGeometry | sdfOperation)} sdfData - An sdf geometry or sdf operation consisting of multiple geometries.
 */
const opIntersectChamfer = sdfOpIntersectChamfer;

/**
 * SDF intersection operation with a stairs effect. Needs to be wrapped by the sdf() function call.
 * See example with sdf() {@link module:geometries.sdf|here}.
 *
 * @static
 * @function
 * @param {object} options - Operator options
 * @param {number} options.radius - Thickness of the blending
 * @param {integer} options.steps - Number of stair steps
 * @param {number} options.colorBlendAmount - Amount of color blend at geometry intersections
 * @param {...(sdfGeometry | sdfOperation)} sdfData - An sdf geometry or sdf operation consisting of multiple geometries.
 */
const opIntersectStairs = sdfOpIntersectStairs;

/**
 * SDF intersection operation with a column stairs effect. Needs to be wrapped by the sdf() function call.
 * See example with sdf() {@link module:geometries.sdf|here}.
 *
 * @static
 * @function
 * @param {object} options - Operator options
 * @param {number} options.radius - Thickness of the blending
 * @param {integer} options.steps - Number of column steps
 * @param {number} options.colorBlendAmount - Amount of color blend at geometry intersections
 * @param {...(sdfGeometry | sdfOperation)} sdfData - An sdf geometry or sdf operation consisting of multiple geometries.
 */
const opIntersectColumns = sdfOpIntersectColumns;

/** @module textures */

/**
 * Apply texture with name 'name' to a geometry.
 *
 * @typedef {object} geometryTexture
 *
 * @property {string} name - The name of the texture as it is defined in the main texture array of the scene.
 * @property {number|vec2} uvScale - Texture scale as single number or per axis.
 */

/**
 * Apply texture with name 'name' as a displacement map to a SDF geometry.
 *
 * @typedef {object} geometryDisplacementMap
 *
 * @property {string} name - The name of the texture as it is defined in the main texture array of the scene.
 * @property {number|vec2} uvScale - Texture scale as single number or per axis.
 * @property {number} scale - The normal map scale/intensity
 */

/**
 * Apply texture with name 'name' as a normal map to a regular geometry.
 *
 * @typedef {object} geometryNormalMap
 *
 * @property {string} name - The name of the texture as it is defined in the main texture array of the scene.
 * @property {number|vec2} uvScale - Texture scale as single number or per axis.
 * @property {number} scale - The normal map scale/intensity
 */

/**
 *
 * Represents a texture
 *
 * @static
 * @function
 * @param {object} settings - Texture settings
 * @param {string} settings.name - The name/id of the texture.
 * @param {string} [settings.url] - If supplied this url will be used to load an image for the texture.
 * @param {strirng} [settings.src] - If supplied this glsl code string will be used to generate a texture dynamically via a fragment shader. See example below.
 *
 * @example
 * // check pattern dynamic texture
 * // set tColor to the output rgba value for the current pixel fragment
 *
 * texture({
 *     name: 'check',
 *     src: `
 *         float s = sin(50.*uv.x)*sin(50.*uv.y);
 *         if(s < 0.) {
 *             tColor = vec4(${normedColorStr('#aaaaaa')}, 1.0);
 *         } else {
 *             tColor = vec4(0.3, 0.0, 0.0, 1.);
 *         }
 *     `
 * }),
 *
 * @example
 * // regular texture with image loaded from url
 *
 * texture({
 *     name: 'concrete-texture',
 *     url: 'assets/images/concrete.jpg'
 * })
 */
const texture = (o) =>
    new Texture(o);

/**
 *
 * Represents a volume texture (sampling data for an inhomogeneous volume)
 *
 * @static
 * @function
 * @param {object} settings - Texture settings
 * @param {number} settings.size - Volume size (cubic)
 * @param {string} settings.name - The name/id of the texture.
 * @param {bool} [settings.cache] - Whether to cache the data (useful if generated on the fly, see example 1)
 * @param {number[][][] | Function} data - A 3d array containing sampling data or a function returning a 3d array with data
 *
 * @example
 * // tiled & cached volume generated on the fly
 * textures = [
 *     volumeTexture({
 *         name: 'volume-texture',
 *         size: 64,
 *         cache: true,
 *         data: range3d(64)
 *             |> #.map(([x, y, z]) => {
 *                 const scale = 50;
 *                 let f = simplex.noise3D(x*scale, y*scale, z*scale);
 *                 return clamp(f, 0.0, 1.0);
 *             })
 *             |> tileSeamless3d(#, 64)
 *     })
 * ];
 */
const volumeTexture = (o) =>
    new VolumeTexture(o);

/** @module materials */

/**
 *
 * Represents a lambert material
 *
 * @static
 * @function
 * @param {object} settings - Material settings
 * @param {string} settings.name - The name/id of the material.
 * @param {string} settings.color - Material color as a hex string: '#ffffff'
 * @param {number[]} settings.albedo - Array of three albedo values (one for each rgb channel): [0.8, 0.9, 0.9]
 */
const lambertMaterial = (o) =>
    new LambertMaterial(o);

/**
 *
 * Represents a metal materiall
 *
 * @static
 * @function
 * @param {object} settings - Material settings
 * @param {string} settings.name - The name/id of the material.
 * @param {string} settings.color - Material color as a hex string: '#ffffff'
 * @param {number[]} settings.albedo - Array of three albedo values (one for each rgb channel): [0.8, 0.9, 0.9]
 * @param {number} settings.fuzz - Metal "fuzziness". A value of '0' signifies perfect reflectance.
 */
const metalMaterial = (o) =>
    new MetalMaterial(o);

/**
 *
 * Represents a dielectric / glass material
 *
 * @static
 * @function
 * @param {object} settings - Material settings
 * @param {string} settings.name - The name/id of the material.
 * @param {string} settings.color - Material color as a hex string: '#ffffff'
 * @param {number[]} settings.albedo - Array of three albedo values (one for each rgb channel): [0.8, 0.9, 0.9]
 * @param {number} settings.refIdx- Refractive index for the material. Water: ~1.33, window glass: 1.52, diamond: ~2.42
 */
const dialectricMaterial = (o) =>
    new DialectricMaterial(o);

/**
 *
 * Represents a dielectric / glass material
 *
 * @static
 * @function
 * @param {object} settings - Material settings
 * @param {string} settings.name - The name/id of the material.
 * @param {string} settings.color - Material color as a hex string: '#ffffff'
 * @param {number[]} settings.albedo - Array of three albedo values (one for each rgb channel): [0.8, 0.9, 0.9]
 * @param {number} settings.refIdx- Refractive index for the material. Water: ~1.33, window glass: 1.52, diamond: ~2.42
 */
const clearcoatMaterial = (o) =>
    new ClearcoatMaterial(o);

/**
 *
 * Represents an emissive material ("a light")
 *
 * @static
 * @function
 * @param {object} settings - Material settings
 * @param {string} settings.name - The name/id of the material.
 * @param {string} settings.color - Material color as a hex string: '#ffffff'
 * @param {number} settings.intensity - Emissive intensity. Should be larger than 1.
 */
const emissiveMaterial = (o) =>
    new EmissiveMaterial(o);

/**
 *
 * Represents a coated emissive material ("a light with glass over it")
 *
 * @static
 * @function
 * @param {object} settings - Material settings
 * @param {string} settings.name - The name/id of the material.
 * @param {string} settings.color - Material color as a hex string: '#ffffff'
 * @param {number} settings.intensity - Emissive intensity. Should be larger than 1.
 * @param {number} settings.refIdx- Refractive index for the material. Water: ~1.33, window glass: 1.52, diamond: ~2.42
 */
const coatedEmissiveMaterial = (o) =>
    new CoatedEmissiveMaterial(o);

/**
 *
 * Isotropic (homogeneous) material
 *
 * @static
 * @function
 * @param {object} settings - Material settings
 * @param {string} settings.name - The name/id of the material.
 * @param {string} settings.color - Material color as a hex string: '#ffffff'
 * @param {number[]} settings.albedo - Array of three albedo values (one for each rgb channel): [0.8, 0.9, 0.9]
 * @param {number} settings.density - Volume density
 */
const isotropicVolumeMaterial = (o) =>
    new IsotropicVolumeMaterial(o);

/**
 *
 * Anisotropic (inhomogeneous) material
 *
 * @static
 * @function
 * @param {object} settings - Material settings
 * @param {string} settings.name - The name/id of the material.
 * @param {string} settings.color - Material color as a hex string: '#ffffff'
 * @param {number[]} settings.albedo - Array of three albedo values (one for each rgb channel): [0.8, 0.9, 0.9]
 * @param {number} settings.density - Volume density
 * @param {number} settings.scale - Sampling scale
 * @param {number} settings.sampleOffset - Sample start offset
 */
const anisotropicVolumeMaterial = (o) =>
    new AnisotropicVolumeMaterial(o);

/**
 * These utils are available in the main scene scope
 * @module utils
 */

/**
 * vec3 - a standard glMatrix vec3 (constructor) function.
 *
 * {@link http://glmatrix.net/docs/module-vec3.html|See the glMatrix api reference for details}
 *
 * @static
 * @function
 */
const vec3 = _vec3;

/**
 * vec2 - a standard glMatrix vec2 (constructor) function.
 *
 * {@link http://glmatrix.net/docs/module-vec2.html|See the glMatrix api reference for details}
 *
 * @static
 * @function
 */
const vec2 = _vec2;

/**
 * Range helper function
 *
 * @static
 * @function
 * @param {...number} limit - A single integer x, giving the range [0, ..., x - 1],  or two integers x, y, giving the range [x, ..., y - 1]
 * @return {number[]} range - The requested 1d range
 *
 * @example
 * const a = range(10);
 * // a = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
 * const b = range(4, 8);
 * // b = [4, 5, 6, 7]
 */
const range = _range;

/**
 * 2d range helper function
 *
 * @static
 * @function
 * @param {...number} limit - One integer xy, giving the range [[0,0], ..., [xy-1, xy-1]],
 *                              or two integers x, y, giving the range [[0,0], ..., [x-1, y-1]],
 *                              or four integers x, x2, y, y2, giving the range [[x1, y1], ..., [x2-1, y2-1]]
 * @return {number[][]} range - The requested 2d range
 *
 * @example
 * const a = range2d(2);
 * // a = [[0,0],[0,1],[1,0],[1,1]]
 * const b = range2d(3, 4);
 * // b = [[0,0],[0,1],[0,2],[0,3],[1,0],[1,1],[1,2],[1,3],[2,0],[2,1],[2,2],[2,3]]
 * const c = range2d(2, 4, 0, 2);
 * // c = [[2,0],[2,1],[3,0],[3,1]]
 */
const range2d = _range2d;

/**
 * 3d range helper function
 *
 * @static
 * @function
 * @param {...number} limit - Three integers, x, y, z, giving the range [[0,0,0], ..., [x-1, y-1, z-1]],
 *                              or six integers, x, x2, y, y2, z, z2, giving the range [[x,y,z], ..., [x2-1, y2-1, z2-1]].
 * @return {number[][]} range - The requested 3d range
 *
 * @example
 * const a = range2d(2, 2, 2);
 * // a = [[0,0,0],[0,0,1],[0,1,0],[0,1,1],[1,0,0],[1,0,1],[1,1,0],[1,1,1]]
 * const b = range3d(0, 2,  0, 4,  0, 2);
 * // b = [[2,2,0],[2,2,1],[2,3,0],[2,3,1],[3,2,0],[3,2,1],[3,3,0],[3,3,1]]
 */
const range3d = _range3d;

/**
 * Subtract on range from another. Note that the ranges used must have the same dimensions.
 *
 * @static
 * @function
 * @param {number[]|range[][]|range[][][]} rangeA - The range to subtract from
 * @param {number[]|range[][]|range[][][]} rangeB - The range to subtract
 *
 * @example
 * const a = subRange(range2d(5), range2d(2, 3));
 * // a = [[0,3],[0,4],[1,3],[1,4],[2,0],[2,1],[2,2],[2,3],[2,4],[3,0],[3,1],[3,2],[3,3],[3,4],[4,0],[4,1],[4,2],[4,3],[4,4]]
 */
const subRange = _subRange;

/**
 * Format a float value for inclusion in glsl source code. Useful
 * when rendering textures dynamically etc. See example {@link module:textures.texture|here}.
 *
 * @static
 * @function
 * @param {number} n - The number to format
 */
const glslFloat = _glslFloat;

// const normedColor = _normedColor;

/**
 * Format a color for inclusion in glsl source code
 * (i.e. return a normalized triplet of values in the range 0 - 1 encoded as a string: '0.34, 0.1, 0.1').
 * Useful when rendering textures dynamically etc.
 * See example {@link module:textures.texture|here}.
 *
 * @static
 * @function
 * @param {string} color - A hex rgb color value ('#ffffff')
 * @return {string} - A normalized triplet of values in the range 0 - 1 as a string, i.e. '0.34, 0.1, 0.1'
 */
const normedColorStr = _normedColorStr;

/**
 * Convert degress to radians.
 *
 * @static
 * @function
 * @param {number} theta - The angle in degrees
 * @return {number} - The angle in radians
 */
const degToRad = _degToRad;

/**
 * Convert radians to degrees.
 *
 * @static
 * @function
 * @param {number} theta - The angle in radians
 * @return {number} - The angle in degrees
 */
const radToDeg = _radToDeg;

/**
 * Clamp a number
 *
 * @static
 * @function
 * @param {number} value - The value
 * @param {number} min - Minimum to clamp to
 * @param {number} max - Maximum to clamp to
 * @return {number} - The clamped value
 */
const clamp = _clamp;

/**
 * Perform a linear interpolation between value1 and value2 using amount to weight between them.
 *
 * @static
 * @function
 * @param {number} value1 - First value
 * @param {number} value2 - Second value
 * @param {number} amount - The weight
 *
 * @return {number} - The interpolated value
 */
const lerp = _lerp;

/**
 * Blend edges in a 3d array (useful for tiling volume textures).
 * Read more {@link https://www.gamedev.net/forums/topic/678392-how-do-i-create-tileable-3d-perlinsimplex-noise/|here}.
 * See example {@link module:textures.volumeTexture|here}
 *
 * @static
 * @function
 * @param {number[][][]} data - The data to tile in 3d
 * @param {number} size - The cubic size of the volume to tile
 *
 * @return {number} - The interpolated value
 */
const tileSeamless3d = _tileSeamless3d;

let cachedSrc = null;
let transpiledSrc = null;

const dynamicScene = async (src, randomSeed) => {
    randomSeed = randomSeed || Math.random()*100000;

    /**
     * @module random
     * @description These deterministic random utils made available in the scene cope are primed with the seed value
     * set in the retrace editor. Thus, using the same seed while using these functions
     * will produce the same "random" result. Perfect for generative work as you can easily recreate
     * a generated result.
     *
     * An instance of {@link https://www.npmjs.com/package/simplex-noise|simplex-noise.js},
     * primed with the scene seed, is also available. See example below
     *
     * @property {Object} simplex - The simplex js object
     *
     * @example
     * simplex.noise3D(4, 6, 1); // 0.10787818930041222
     */

     const simplex = new SimplexNoise(randomSeed);

    /**
     * Return a random float value within a given range.
     * Determinstic based on the scenes random seed.
     *
     * @module random
     * @static
     * @function
     * @param {...number} limit - One argument for a random value in the range [0, limit],
     *                              two arguments for the range [limit1, limit2].
     * @return {number} - The random value
     * @example
     * random(10); // 2.749887186359643
     * random(5, 10); // 9.724547372363647
     */
    const random = _random(randomSeed);

    /**
     * Return a random integer value within a given range.
     * Determinstic based on the scenes random seed.
     *
     * @module random
     * @static
     * @function randomInt
     * @param {...number} limit - One argument for a random value in the range [0, limit],
     *                              two arguments for the range [limit1, limit2].
     * @return {number} - The random value
     * @example
     * random(10); // 2
     * random(5, 10); // 9
     */
    const randomInt = _randomInt(randomSeed);

    /**
     * Return true or false, randomly.
     * Determinstic based on the scenes random seed.
     *
     * @module random
     * @static
     * @function randomBool
     * @return {bool} - The random boolean
     */
    const randomBool = _randomBool(randomSeed);

    /**
     * Return 1 or -1, randomly.
     * Determinstic based on the scenes random seed.
     *
     * @module random
     * @static
     * @function randomSign
     * @return {integer} - The signed integer
     */
    const randomSign = _randomSign(randomSeed);

    /**
     * Maybe run a function given a probability value.
     * Determinstic based on the scenes random seed.
     *
     * @module random
     * @static
     * @function maybe
     * @param {function} cb - The callback to run
     * @param {number} p - Probability that the function will be run (0 - 1).
     */
    const maybe = _maybe(randomSeed);

    /**
     * Pluck a value from a given array, randomly.
     * Determinstic based on the scenes random seed.
     *
     * @module random
     * @static
     * @function pluckRandom
     * @param {array} arr - The array
     * @return {any} - The plucked value
     */
    const pluckRandom = _pluckRandom(randomSeed);

    /**
     * Pluck n values from a given array, randomly.
     * Determinstic based on the scenes random seed.
     *
     * @module random
     * @static
     * @function takeRandom
     * @param {array} arr - The array
     * @param {number} n - Number of elements
     * @return {any} - The plucked value
     */
    const takeRandom = _takeRandom(randomSeed);

    if(cachedSrc != src) {
        transpiledSrc = babel.transformSync(src, {
            presets: [babelEnvPreset],
            plugins: [
                [babelDecoratorPlugin, {legacy: true}],
                babelObjSpreadPlugin,
                [babelPipesPlugin, {proposal: 'smart'}]
            ]
        });

        cachedSrc = src;
    }

    return eval(transpiledSrc.code);
}

export default dynamicScene;
