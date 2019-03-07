import * as _ from 'lodash';
import * as fs from 'fs';
import { Writable } from 'stream';
import { PlainObject } from 'simplytyped';

import { createFolder } from './files';
import { BufferType } from './buffers';
import { Matrix } from './Matrix';
import { Observable } from './observable';

class LineCollector extends Writable {
    private buf = '';
    _write(chunk: Buffer, encoding: string, done: () => void) {
        const data = chunk.toString();
        const s = data.split('\n');
        this.buf += s[0];
        if (s.length > 1) {
            this.emit('data', this.buf);
            this.buf = '';

            s.slice(1, -1)
                .forEach(p => this.emit('data', p));

            this.buf += _.last(s);
        }
        done();
    }
    _final(done: () => void) {
        this.emit('data', this.buf);
        done();
    }
}

interface CSVParserOptions {
    skipFirst: boolean;
}

class CSVParser {
    protected o: CSVParserOptions;
    private skippedFirst = false;

    rows: number = 0;

    constructor(
        private setter: (i: number, v: number[]) => void,
        opts?: Partial<CSVParserOptions>,
    ) {
        this.o = _.merge({
            skipFirst: false,
        }, opts);
    }

    listen = (line: string) => {
        if (this.o.skipFirst && !this.skippedFirst) {
            this.skippedFirst = true;
            return;
        }

        const strings = line ===  '' ? [] : line.split(',');
        const arr = strings.map(x => parseFloat(x));

        // only count rows that have data.
        // skip blank rows (for instance the last row in a \n terminated file)
        if(arr.length) {
            this.setter(this.rows, arr);
            this.rows++;
        }
    }
}

interface LoadCsvParams<B extends BufferType> {
    path: string;
    buffer: B;
}
export function loadCsvToBuffer<B extends BufferType>(params: LoadCsvParams<B>): Promise<B> {
    const { path, buffer } = params;

    let i = 0;
    const parser = new CSVParser((__, d) => d.forEach(p => buffer[i++] = p));

    const stream = fs.createReadStream(path)
        .pipe(new LineCollector());

    return new Promise<B>((resolve, reject) => {
        stream.on('error', reject);
        stream.on('finish', () => resolve(buffer));
        stream.on('data', parser.listen);
    });
}

export function loadToObservable(path: string): Observable<number[]> {
    return Observable.create<number[]>(creator => {
        const parser = new CSVParser((i, data) => creator.next(data));
        const stream = fs.createReadStream(path)
            .pipe(new LineCollector());

        stream.on('error', e => creator.error(e));
        stream.on('finish', () => creator.end());
        stream.on('data', parser.listen);
    });
}

export function load(path: string): Promise<Matrix> {
    const data = [] as number[][];

    const parser = new CSVParser((i, d) => {
        data.push(d);
    });

    const stream = fs.createReadStream(path)
        .pipe(new LineCollector());

    return new Promise<Matrix>((resolve, reject) => {
        stream.on('error', reject);
        stream.on('finish', () => resolve(Matrix.fromData(data)));
        stream.on('data', parser.listen);
    });
}

interface Indexed2D {
    rows: number;
    cols: number;
    get: (i: number, j: number) => number;
}
export async function writeCsv(path: string, m: Indexed2D) {
    await createFolder(path);
    const stream = fs.createWriteStream(path);

    for (let i = 0; i < m.rows; ++i) {
        let line = '';
        for (let j = 0; j < m.cols; ++j) {
            line += m.get(i, j);

            // no trailing commas
            if (j !== m.cols - 1) line += ',';
        }
        // trailing spaces are okay
        stream.write(line + '\n');
    }

    return new Promise<void>(resolve => stream.end(resolve));
}


export function csvStringFromObject(obj: PlainObject): string {
    const keys = Object.keys(obj).sort();
    return keys.reduce((str, key, i) => i === 0 ? `${obj[key]}` : `${str}, ${obj[key]}`, '');
}
