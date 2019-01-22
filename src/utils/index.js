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
    ? Array.isArray(x) ? [...flatten(x), ...flatten(xs)] : [x, ...flatten(xs)]
    : [];

// random no stuff

const random = (max = 1) => Math.random() * max;
const randomSign = () => random() < 0.5 ? -1 : 1;
const pluckRandom = (arr) => arr[parseInt(random(arr.length))];

// color stuff

const isHexColor = (str) =>
    /^#[0-9A-F]{6}$/i.test(str)

const normedColor = (color) => {
    return hexRgb(color, {format: 'array'})
        .slice(0, 3) // skip alpha channel
        .map(rgb => parseFloat(rgb/255)); // normalize
}

const normedColorStr = (color) =>
    normedColor(color).join(', ');

module.exports = {
    defined,
    definedNotNull,
    isFn,
    reverse,
    flatten,
    random,
    randomSign,
    pluckRandom,
    isHexColor,
    normedColor,
    normedColorStr
};
