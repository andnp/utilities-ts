export type BufferType = Uint8Array | Float32Array | Int32Array;

export function toArray(b: BufferType): number[] {
    const arr: number[] = [];
    for (const v of b) arr.push(v);
    return arr;
}
