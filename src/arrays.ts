export const middleItem = <T>(arr: T[]): T => {
    if (arr.length % 2 === 0) throw new Error('Expected an odd number of items');
    const idx = Math.floor(arr.length / 2);
    return arr[idx];
};

export const getFirst = <T>(arr: T | T[]): T => {
    if (!Array.isArray(arr)) return arr;
    if (arr.length < 1) throw new Error('Expected a non-empty array');
    return arr[0];
};

export const getLast = <T>(arr: T | T[]): T => {
    if (!Array.isArray(arr)) return arr;
    if (arr.length < 1) throw new Error('Expected a non-empty array');
    return arr[arr.length - 1];
};

export const leaveOut = <T>(arr: T[], idx: number): T[] => {
    const r = [] as T[];

    arr.forEach((t, i) => {
        if (i === idx) return;

        r.push(t);
    });

    return r;
};

export const filterUndefined = <T>(x: Array<T | undefined>): T[] => x.filter(d => d !== undefined) as any;

export const range = (_minMax: number, _max?: number) => {
    const min = _max ? _minMax : 0;
    const max = _max ? _max : _minMax;

    const ret: number[] = [];
    for (let i = min; i < max; ++i) ret.push(i);

    return ret;
};
