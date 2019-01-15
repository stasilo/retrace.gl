const defined = obj => typeof obj !== 'undefined';
const definedNotNull = obj => defined(obj) && obj != null;

const reverse = ([x, ...xs]) => typeof x !== 'undefined'
    ? [...reverse(xs), x]
    : [];

const flatten = ([x, ...xs]) => typeof x !== 'undefined'
    ? Array.isArray(x) ? [...flatten(x), ...flatten(xs)] : [x, ...flatten(xs)]
    : [];

module.exports = {
    defined,
    definedNotNull,
    reverse,
    flatten
};
