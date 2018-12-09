"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.middleItem = (arr) => {
    if (arr.length % 2 === 0)
        throw new Error('Expected an odd number of items');
    const idx = Math.floor(arr.length / 2);
    return arr[idx];
};
exports.getFirst = (arr) => {
    if (!Array.isArray(arr))
        return arr;
    if (arr.length < 1)
        throw new Error('Expected a non-empty array');
    return arr[0];
};
exports.getLast = (arr) => {
    if (!Array.isArray(arr))
        return arr;
    if (arr.length < 1)
        throw new Error('Expected a non-empty array');
    return arr[arr.length - 1];
};
exports.leaveOut = (arr, idx) => {
    const r = [];
    arr.forEach((t, i) => {
        if (i === idx)
            return;
        r.push(t);
    });
    return r;
};
exports.filterUndefined = (x) => x.filter(d => d !== undefined);
exports.range = (_minMax, _max) => {
    const min = _max ? _minMax : 0;
    const max = _max ? _max : _minMax;
    const ret = [];
    for (let i = min; i < max; ++i)
        ret.push(i);
    return ret;
};
//# sourceMappingURL=arrays.js.map