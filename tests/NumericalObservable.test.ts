import { NumericalObservable, Observable } from 'index';


test('Can take average over blocks of data', async () => {
    const outcome = await Observable
        .fromArray([0, 1, 2, 3, 4, 5, 6])
        .toNumerical()
        .blockAverage(3)
        .collect();

    const e = [1, 4, 6];

    expect(outcome).toEqual(e);
});

test('Can take an exponential weighted average over blocks of data', async () => {
    const outcome = await Observable
        .fromArray([0, 1, 2, 3, 4, 5, 6])
        .toNumerical()
        .movingAverage(3)
        .collect();

    const e = [
        0,
        0.5,
        1.25,
        2.125,
        3.0625,
        4.03125,
        5.015625,
    ];

    expect(outcome).toEqual(e);
});

test('Can compute the partial sums of a stream', async () => {
    const outcome = await Observable
        .fromArray([0, 1, 2, 3, 4, 5, 6])
        .toNumerical()
        .sum()
        .collect();

    const e = [0, 1, 3, 6, 10, 15, 21];

    expect(outcome).toEqual(e);
});

test('Can compute the total sum of a stream', async () => {
    const outcome = await Observable
        .fromArray([0, 1, 2, 3, 4, 5, 6])
        .toNumerical()
        .sum()
        .last();

    expect(outcome).toBe(21);
});
