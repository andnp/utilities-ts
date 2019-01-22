import { globObservable, readdirObservable, fileExists, removeRecursively, mkdir } from 'files';

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

test('Can make a nested file path', async () => {
    const path = 'nested/file/path';

    const existsAlready = await fileExists(path);
    if (existsAlready) await removeRecursively('nested');

    await mkdir(path);

    const exists = await fileExists(path);
    expect(exists).toBe(true);

    await removeRecursively('nested');
});
