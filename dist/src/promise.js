"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.join = (p1, p2, j) => {
    return p1.then(x => p2.then(y => j(x, y)));
};
exports.delay = (time) => {
    return new Promise(resolve => setTimeout(resolve, time));
};
exports.allValues = (obj) => {
    const mapPromise = Object.keys(obj).map(key => {
        return new Promise((resolve, reject) => {
            const p = obj[key];
            if (p instanceof Promise) {
                p.then(value => resolve({ key, value }))
                    .catch(reject);
            }
            else {
                resolve({ key, value: p });
            }
        });
    });
    return Promise.all(mapPromise)
        .then(map => map.reduce((coll, obj) => {
        coll[obj.key] = obj.value;
        return coll;
    }, {}));
};
exports.map = (arr, f) => {
    return Promise.all(arr.map(f));
};
exports.reduce = async (arr, f, initial) => {
    let coll = initial || arr[0];
    const start = initial
        ? 0
        : 1;
    for (let i = start; i < arr.length; i++) {
        const x = arr[i];
        coll = await f(coll, x);
    }
    return coll;
};
//# sourceMappingURL=promise.js.map