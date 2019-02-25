import { promise } from '../src';

test('Can reduce over an array with a promise returning function', async () => {
    const arr = [1, 2, 3];
    const got = await promise.reduce(arr, (c, x) => Promise.resolve(c + x));

    expect(got).toBe(6);
});

test('Can specify an initial value for collection', async () => {
    const arr = ['1', '2', '3'];
    const got = await promise.reduce(arr, (c, x) => Promise.resolve(parseInt(x) + c), 1);

    expect(got).toBe(7);
});
