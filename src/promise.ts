import { Milliseconds } from "./time";
import { NoInfer } from "simplytyped";
type PromiseOr<T> = Promise<T> | T;

export const join = <T, U, R> (p1: Promise<T>, p2: Promise<U>, j: ((x: T, y: U) => R | Promise<R>)): Promise<R> => {
    return p1.then(x => p2.then(y => j(x, y)));
};

export const delay = (time: Milliseconds): Promise<void> => {
    return new Promise<void>(resolve => setTimeout(resolve, time));
};

type PromiseValue<P> = P extends Promise<infer T> ? T : P;
type PromiseValueObject<P extends Record<string, any>> = Promise<{
    [K in keyof P]: PromiseValue<P[K]>;
}>;
export const allValues = <T extends Record<string, any>>(obj: T): PromiseValueObject<T> => {
    const mapPromise = Object.keys(obj).map(key => {
        return new Promise<{ key: string, value: any }>((resolve, reject) => {
            const p = obj[key];
            if (p instanceof Promise) {
                p.then(value => resolve({ key, value }))
                 .catch(reject);
            } else {
                resolve({ key, value: p });
            }
        });
    });

    return Promise.all(mapPromise)
        .then(map => map.reduce((coll, obj) => {
            coll[obj.key] = obj.value;
            return coll;
        }, {} as any));
};

export const map = <T, R>(arr: T[], f: (x: T, i: number) => R | Promise<R>): Promise<R[]> => {
    return Promise.all(arr.map(f));
};

export const reduce = async <T, R = T>(arr: T[], f: (coll: NoInfer<R>, x: T) =>  PromiseOr<R>, initial?: R): Promise<R> => {
    let coll: R | T = initial || arr[0];

    const start = initial
        ? 0
        : 1;

    for (let i = start; i < arr.length; i++) {
        const x = arr[i];
        coll = await f(coll as any, x);
    }

    return coll as R;
};
