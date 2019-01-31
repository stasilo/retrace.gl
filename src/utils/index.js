import hexRgb from 'hex-rgb';

// helpers

const defined = obj => typeof obj !== 'undefined';
const definedNotNull = obj => defined(obj) && obj != null;

const isFn = fn => typeof fn === 'function';

// array manipulation

const reverse = ([x, ...xs]) => typeof x !== 'undefined'
    ? [...reverse(xs), x]
    : [];

const flatten = ([x, ...xs]) => typeof x !== 'undefined'
    ? Array.isArray(x)
        ? [...flatten(x), ...flatten(xs)]
        : [x, ...flatten(xs)]
    : [];

// random no stuff

const random = (min = 0, max = 1) =>
    Math.random() * (max - min) + min;

const randomSign = () =>
    random() < 0.5 ? -1 : 1;

const pluckRandom = (arr) =>
    arr[parseInt(random(arr.length))];

// math stuff

const degToRad = (d) => d * Math.PI / 180;
const radToDeg = (r) => r * 180 / Math.PI;

// color stuff

const isHexColor = (str) =>
    /^#[0-9A-F]{6}$/i.test(str);

const normedColorStr = (color) =>
    normedColor(color).join(', ');

const normedColor = (color) => {
    return hexRgb(color, {format: 'array'})
        .slice(0, 3) // skip alpha channel
        .map(rgb => parseFloat(rgb/255)); // normalize
}

// glsl inject helpers

const glslFloat = (n) => Number.isInteger(n)
    ? n + '.0'
    : n.toString();

module.exports = {
    defined,
    definedNotNull,
    isFn,
    reverse,
    flatten,
    random,
    randomSign,
    pluckRandom,
    degToRad,
    radToDeg,
    isHexColor,
    normedColor,
    normedColorStr,
    glslFloat
};
