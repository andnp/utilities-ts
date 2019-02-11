import * as arrays from 'arrays';

test('Can leave out an index', () => {
    const a = [1, 2, 3, 4, 5];
    const b = arrays.leaveOut(a, 2);

    const e = [1, 2, 4, 5];

    expect(b).toEqual(e);
});

test('Can perform a flatMap operation', () => {
    const arr = [1, 2, 3];
    const got = arrays.flatMap(arr, x => arrays.range(x));

    const expected = [0, 0, 1, 0, 1, 2];

    expect(got).toEqual(expected);
});
