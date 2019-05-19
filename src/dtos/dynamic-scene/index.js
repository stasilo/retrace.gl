import * as babel from '@babel/core';

import babelEnvPreset from '@babel/preset-env';
import babelDecoratorPlugin from '@babel/plugin-proposal-decorators';
import babelObjSpreadPlugin from '@babel/plugin-proposal-object-rest-spread';
import babelPipesPlugin from '@babel/plugin-proposal-pipeline-operator';

import Scene from '../../dtos/scene';
import {createCamera} from '../../camera';

import ObjModel from '../../models/obj-model';
import Plane from '../../models/plane';
import Cube from '../../models/cube';
import Sphere from '../../models/sphere';
import Diamond from '../../models/diamond';
import Volume from '../../models/volume';

import Texture from '../../texture';

import MetalMaterial from '../../materials/metal';
import LambertMaterial from '../../materials/lambert';
import EmissiveMaterial from '../../materials/emissive';
import DialectricMaterial from '../../materials/dialectric';

import IsotropicVolumeMaterial from '../../materials/isotropic-volume';
import AnisotropicVolumeMaterial from '../../materials/anisotropic-volume';

import {
    random as _random,
    randomIdx as _randomIdx,
    randomBool as _randomBool,
    maybe as _maybe,
    pluckRandom as _pluckRandom,
    takeRandom as _takeRandom,
    range as _range,
    range2d as _range2d,
    subRange as _subRange,
    glslFloat as _glslFloat,
    normedColor as _normedColor,
    normedColorStr as _normedColorStr,
    degToRad as _degToRad
} from '../../utils';

// bring everything into local scope - this is
// needed as webpack imported module names are transpiled
// into things like '_xxxxx_js__WEBPACK_IMPORTED_MODULE_5__'
// ...also and add some syntactic sugar :)

const random = _random;
const randomIdx = _randomIdx;
const randomBool = _randomBool;
const maybe = _maybe;
const pluckRandom = _pluckRandom;
const takeRandom = _takeRandom;
const range = _range;
const range2d = _range2d;
const subRange = _subRange;
const glslFloat = _glslFloat;
const normedColor = _normedColor;
const normedColorStr = _normedColorStr;
const degToRad = _degToRad;

const scene = (o) =>
    new Scene(o);
const camera = (o) =>
    createCamera(o);

const objModel = (o) =>
    new ObjModel(o);
const plane = (o) =>
    new Plane(o);
const cube = (o) =>
    new Cube(o);
const sphere = (o) =>
    new Sphere(o);
const diamond = (o) =>
    new Diamond(o);
const volume = (o) =>
    new Volume(o);

const texture = (o) =>
    new Texture(o);

const lambertMaterial = (o) =>
    new LambertMaterial(o);
const metalMaterial = (o) =>
    new MetalMaterial(o);
const dialectricMaterial = (o) =>
    new DialectricMaterial(o);
const emissiveMaterial = (o) =>
    new EmissiveMaterial(o);
const isotropicVolumeMaterial = (o) =>
    new IsotropicVolumeMaterial(o);
const anisotropicVolumeMaterial = (o) =>
    new AnisotropicVolumeMaterial(o);

let cachedSrc = null;
let transpiledSrc = null;

export default async (src) => {
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
