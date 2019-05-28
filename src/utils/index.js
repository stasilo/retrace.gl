import hexRgb from 'hex-rgb';

// helpers

const defined = obj => typeof obj !== 'undefined';
const definedNotNull = obj => defined(obj) && obj != null;
const isFn = fn => typeof fn === 'function';
const isArray = a => Array.isArray(a);
const isObj = obj => typeof obj === 'object';

// ranges

const range = (start, end) =>
    Array.from({length: (end - start)},
        (v, k) => k + start
    );

const range2d = (xStart, xEnd, yStart, yEnd) => {
    var combos = [];

    range(xStart, xEnd).forEach(a1 => {
        range(yStart, yEnd).forEach(a2 => {
            combos.push([a1, a2]);
        });
    });

    return combos;
}

const range3d = (xStart, xEnd, yStart, yEnd, zStart, zEnd) => {
    var combos = [];

    range(xStart, xEnd).forEach(a1 => {
        range(yStart, yEnd).forEach(a2 => {
            range(zStart, zEnd).forEach(a3 => {
                combos.push([a1, a2, a3]);
            });
        });
    });

    return combos;
}

// subtract one range from another
// (this is dimension agnostic)
const subRange = (rangeA, rangeB) =>
    rangeA.filter(ra =>
        rangeB.filter(rb =>
            JSON.stringify(ra) == JSON.stringify(rb)
        ).length == 0
    );

const takeRandom = (arr) =>
    arr.filter(randomBool);

// console.dir(range2d(0, 4, 0, 4));
// console.dir(subRange2d(range2d(0, 4, 0, 4), range2d(2, 4, 2, 4)));
// console.dir(subRange2d(range(5, 10), range(5, 8)));

// array manipulation

const reverse = ([x, ...xs]) => typeof x !== 'undefined'
    ? [...reverse(xs), x]
    : [];

const flatten = ([x, ...xs]) => typeof x !== 'undefined'
    ? Array.isArray(x)
        ? [...flatten(x), ...flatten(xs)]
        : [x, ...flatten(xs)]
    : [];

const zip = (arr, ...arrs) =>
    arr.map((val, i) =>
        arrs.reduce((a, arr) =>
            [...a, arr[i]], [val]
        )
    );

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

const randomBool = () =>
    random() < 0.5 ? 0 : 1;

const pluckRandom = (arr) =>
    arr[parseInt(random(arr.length))];

const maybe = (cb, p = 0.5) =>
    random() > p
        ? cb()
        : null;

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


export {
    defined,
    definedNotNull,
    isFn,
    isArray,
    isObj,
    range,
    range2d,
    range3d,
    subRange,
    reverse,
    zip,
    flatten,
    random,
    randomIdx,
    randomSign,
    randomBool,
    maybe,
    pluckRandom,
    takeRandom,
    degToRad,
    radToDeg,
    isHexColor,
    normedColor,
    normedColorStr,
    glslFloat,
    animationFrame,
    loadImage
};
