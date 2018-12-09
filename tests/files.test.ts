import { globObservable, readdirObservable } from 'files';

test('Can get glob as observable', async () => {
    const files = await globObservable('src/*.ts').collect();

    expect(files).toContain('src/arrays.ts');
});

test('Can read a directory into an observable', async () => {
    const dir = await readdirObservable('src/').collect();

    expect(dir).toContain('arrays.ts');
});

test('Can terminate observable glob early', async () => {
    const files = await globObservable('src/*.ts').take(1).collect();

    expect(files.length).toBe(1);
});