import * as fs from 'fs';
import * as path from 'path';
import * as v from 'validtyped';
import * as rmrf from 'rimraf';
import * as globAsync from 'glob';
import { Glob } from 'glob';
import { promisify } from 'util';
import { Observable } from './observable';

// --------------------------
// Promisified File Utilities
// --------------------------
export const writeFile = (location: string, data: any) => createFolder(location).then(() => promisify(fs.writeFile)(location, data));
export const readFile = promisify(fs.readFile);
export const fileExists = promisify(fs.exists);
export const readdir = promisify(fs.readdir);
const mkdirp = promisify(fs.mkdir);

export type Glob = (pattern: string, callback: any) => string[];
export const glob = promisify(globAsync as any as Glob);

export type RimRaf = (path: string, callback: any) => void;
export const removeRecursively = promisify(rmrf as any as RimRaf);

// ---------------------
// Observable File Utils
// ---------------------
export const globObservable = (loc: string): Observable<string> => {
    const glober = new Glob(loc);

    const obs = Observable.fromEvent<string>(glober, {
        data: 'match',
        error: 'error',
        end: 'end',
    });

    obs.onEnd(() => glober.abort());
    return obs;
};

export const readdirObservable = (loc: string): Observable<string> => {
    return Observable.create<string>(creator => {
        readdir(loc).then(files => {
            files.forEach(d => creator.next(d));
            creator.end();
        }).catch(e => creator.error(e));
    });
};

export const mkdir = async (path: string) => {
    let current = '';
    for (const piece of path.split('/')) {
        if (piece === '.') continue;
        else if (piece === '..') {
            current = current.split('/').slice(0, -2).join('/') + '/';
        } else {
            current += piece + '/';
        }
        const exists = await fileExists(current);
        if (exists) continue;

        await mkdirp(current).catch(() => { /* stub */});
    }
};

/**
 * Converts a string containing forward slashes ("/")
 * to a system specific file path. On Unix based systems
 * maintains the ("/") and on Windows systems uses ("\")
 */
export const filePath = (location: string) => {
    const joint = path.join(...location.split('/'));
    if (location.startsWith('/')) return '/' + joint;
    return joint;
};

/**
 * Creates folders for the entire given path if necessary.
 * Same behaviour as mkdir -p
 */
export const createFolder = (location: string) => mkdir(path.dirname(location));

/**
 * Stringifies an object then writes it to the file location.
 * Creates the folder path if necessary first.
 */
export function writeJson(location: string, obj: object) {
    return writeFile(location, JSON.stringify(obj, undefined, 2));
}

/**
 * Reads a json file from a given path.
 * Validates that file's integrity against the given schema.
 */
export async function readJson<T>(location: string, schema: v.Validator<T>): Promise<T> {
    const rawData = await readFile(location);
    const data = JSON.parse(rawData.toString());
    const validated = schema.validate(data);
    if (!validated.valid) throw new Error(`Expected data to match schema. <${JSON.stringify(validated.errors, undefined, 2)}>`);
    return validated.data;
}
