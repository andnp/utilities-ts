import * as arrays from 'arrays';

test('Can leave out an index', () => {
    const a = [1, 2, 3, 4, 5];
    const b = arrays.leaveOut(a, 2);

    const e = [1, 2, 4, 5];

    expect(b).toEqual(e);
});
