import hexRgb from 'hex-rgb';

// helpers

const defined = obj => typeof obj !== 'undefined';
const definedNotNull = obj => defined(obj) && obj != null;
const isFn = fn => typeof fn === 'function';

const range = (start, end) =>
    Array.from({length: (end - start)},
        (v, k) => k + start
    );

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

const random = (max = 1, min) => {
    if(defined(min)) { 
        [min, max] = [max, min];
    } else { 
        min = 0;
    }

    return Math.random() * (max - min) + min;
}

const randomIdx = (max = 1, min = 0) =>
    Math.floor(random(max, min));

const randomSign = () =>
    random() < 0.5 ? -1 : 1;

const pluckRandom = (arr) =>
    arr[parseInt(random(arr.length))];

// math stuff

const degToRad = (d) => d * Math.PI / 180;
const radToDeg = (r) => r * 180 / Math.PI;

// glsl inject helpers

const glslFloat = (n) => Number.isInteger(n)
    ? n + '.0'
    : n.toString();

// color stuff

const isHexColor = (str) =>
    /^#[0-9A-F]{6}$/i.test(str);

const normedColorStr = (color) =>
    normedColor(color).join(', ');

const normedColor = (color) => {
    return hexRgb(color, {format: 'array'})
        .slice(0, 3) // skip alpha channel
        .map(rgb => glslFloat(parseFloat(rgb/255))); // normalize
}

// animation

const animationFrame = (render) => {
    const startTime = Date.now();

    let frameCount = 0;
    let cancelled = false;

    (function frame() {
        if(cancelled) {
            return;
        }

        render({
            time: Date.now() - startTime,
            frameCount: ++frameCount
        });

        requestAnimationFrame(frame);
    })();

    return {
        cancel: () => cancelled = true
    }
}

// image stuff

const loadImage = async (url) =>
    new Promise((resolve, reject) => {
        let image = new Image();
        image.onload = () =>
            resolve(image);
        image.src = url;
    });


module.exports = {
    defined,
    definedNotNull,
    isFn,
    range,
    reverse,
    flatten,
    random,
    randomIdx,
    randomSign,
    pluckRandom,
    degToRad,
    radToDeg,
    isHexColor,
    normedColor,
    normedColorStr,
    glslFloat,
    animationFrame,
    loadImage
};
