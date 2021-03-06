import { promise, Observable, arrays } from 'index';
import { Milliseconds } from 'time';
import { giveBack } from 'fp';

// --------
// Creation
// --------
test('Can create an observable', () => {
    const obs = Observable.create<string>(observe => {
        observe.next('hi');
    });

    expect(obs).toBeInstanceOf(Observable);
});

test('Can create observable from list of promises', async () => {
    let state = 0;
    const promises = [0, 1, 2, 3].map(i => Promise.resolve(i));

    const obs = Observable.fromPromises(promises);

    await obs.subscribe(d => expect(d).toBe(state++));

    expect(state).toBe(4);
});

// ------------
// Data Feeding
// ------------
test('Can feed promises as data', async () => {
    const obs = Observable.create(creator => {
        creator.next(promise.delay(10 as Milliseconds).then(() => 2));
        creator.next(promise.delay(15 as Milliseconds).then(() => 3));
        creator.end();
    });

    const got = await obs.collect();

    expect(got).toEqual([2, 3]);
});

// -------------
// Subscriptions
// -------------
test('Can subscribe to updates from observable', async () => {
    let state = 0;
    const obs = Observable.create<number>(observe => {
        [0, 1, 2, 3].forEach(observe.next);
        observe.end();
    });

    obs.subscribe(data => expect(data).toBe(state++));

    await obs;

    expect(state).toBe(4);
});

test('Can map from one observable to another', async () => {
    let state = 1;

    const obs = Observable.create<string>(observe => {
        ['0', '1', '2', '3'].forEach(observe.next);
        observe.end();
    });

    await obs.map(s => parseInt(s) + 1)
        .subscribe(data => expect(data).toBe(state++));

    expect(state).toBe(5);
});

test('Can concatenate two observables', async () => {
    let state = 0;

    const obs1 = Observable.fromArray([0, 1, 2]);
    const obs2 = Observable.fromArray([3, 4, 5]);

    await obs1.concat(obs2).subscribe(data => {
        state++;
        expect([0, 1, 2, 3, 4, 5].includes(data)).toBe(true);
    });

    expect(state).toBe(6);
});

test('Can concatenate slow obervables', async () => {
    let state = 0;

    const prom1 = [0, 1, 2, 3].map(i => promise.delay(i * 10 as Milliseconds).then(giveBack(i)));
    const prom2 = [4, 5, 6, 7].map(i => promise.delay(i * 20 as Milliseconds).then(giveBack(i)));
    const obs1 = Observable.fromPromises(prom1);
    const obs2 = Observable.fromPromises(prom2);

    await obs1.concat(obs2).subscribe(data => expect(data).toBe(state++));

    expect(state).toBe(8);
});

test('Can map over promise returning functions', async () => {
    let state = 0;

    await Observable.fromArray([0, 1, 2, 3])
        .map(i => promise.delay(i * 10 as Milliseconds).then(giveBack(i)))
        .subscribe(data => expect(data).toBe(state++));

    expect(state).toBe(4);
});

test('Can filter over promise returning functions', async () => {
    let state = 0;

    await Observable.fromArray([0, 1, 2, 3])
        .bottleneck(1)
        .map(i => promise.delay(i * 10 as Milliseconds).then(giveBack(i)))
        .filter(i => promise.delay(i * 10 as Milliseconds).then(giveBack(i < 2)))
        .subscribe(data => expect(data).toBe(state++));

    expect(state).toBe(2);
});

test('Can filter undefined values from the stream', async () => {
    let state = 1;

    await Observable.fromArray([0, undefined, 1, 2, undefined, 3])
        .filterUndefined()
        .map(i => i + 1)
        .subscribe(data => expect(data).toBe(state++));

    expect(state).toBe(5);
});

test('Can flatten arrays into stream', async () => {
    const out = await Observable.fromArray([0, 1, 2, 3])
        .flatMap(d => arrays.range(d))
        .collect();

    const expected = [0, 0, 1, 0, 1, 2];
    expect(out).toEqual(expected);
});

test('Can split the flow of data streams', async () => {
    const obs = Observable.fromArray(arrays.range(0, 11));

    const [even, odd] = obs.partition(x => x % 2 === 0);

    let left = 0;
    let right = 0;

    even.subscribe(() => left++);
    odd.subscribe(() => right++);

    await even;
    await odd;

    expect(left).toBe(6);
    expect(right).toBe(5);
});

// ----------
// Aggregates
// ----------
test('Can collect all data passed through stream', async () => {
    const obs = Observable.create<number>(observe => {
        [0, 1, 2, 3].forEach(observe.next);
        observe.end();
    });

    const data = await obs.map(i => i + 1).collect();

    expect(data).toEqual([1, 2, 3, 4]);
});

test('Can group values into clusters', async () => {
    const obs = Observable.fromArray([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);

    const expected = [
        [0, 1, 2, 3],
        [4, 5, 6, 7],
        [8, 9],
    ];
    let state = 0;

    await obs.group(4).subscribe(data => expect(data).toEqual(expected[state++]));

    expect(state).toBe(3);
});


// ----------------
// Regression Tests
// ----------------
test('Can bottleneck slow streams', async () => {
    const obs = Observable.fromArray(arrays.range(0, 100));

    let state = 0;
    await obs
        .bottleneck(4)
        .map(i => promise.delay(i * 2 as Milliseconds))
        .bottleneck(1)
        .subscribe(() => state++);

    expect(state).toBe(100);
});

test('Can flatten an observable into another observable', async () => {
    const obs = Observable.fromArray(arrays.range(1, 3));

    const got = await obs
        .flatMap(i => Observable.fromArray(arrays.range(0, i)))
        .collect();

    const expected = [0, 0, 1];
    expect(got).toEqual(expected);
});
