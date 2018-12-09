import * as fs from 'fs';
import { loadCsvToBuffer, loadToObservable } from 'csv';
import * as buffers from 'buffers';
import { removeRecursively } from 'files';

test('Can read a CSV file', async () => {
    const testCsvString = `1,2\n3,4\n5,6`;
    fs.writeFileSync('test.csv', testCsvString);

    const buffer = new Uint8Array(6);
    const mat = await loadCsvToBuffer({ path: 'test.csv', buffer });

    expect(buffers.toArray(mat)).toEqual([ 1, 2, 3, 4, 5, 6 ]);

    await removeRecursively('test.csv');
});

test('Can read a CSV file to observable', async () => {
    const testCsvString = `1,2\n3,4\n5,6`;
    fs.writeFileSync('testObservable.csv', testCsvString);

    const mat = await loadToObservable('testObservable.csv').collect();

    expect(mat).toEqual([
        [1, 2],
        [3, 4],
        [5, 6],
    ]);

    await removeRecursively('testObservable.csv');
});
