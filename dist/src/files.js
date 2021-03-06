"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const rmrf = require("rimraf");
const globAsync = require("glob");
const glob_1 = require("glob");
const util_1 = require("util");
const observable_1 = require("./observable");
// --------------------------
// Promisified File Utilities
// --------------------------
exports.writeFile = (location, data) => exports.createFolder(location).then(() => util_1.promisify(fs.writeFile)(location, data));
exports.readFile = util_1.promisify(fs.readFile);
exports.fileExists = util_1.promisify(fs.exists);
exports.readdir = util_1.promisify(fs.readdir);
exports.removeRecursively = util_1.promisify(rmrf);
exports.glob = util_1.promisify(globAsync);
const mkdirp = util_1.promisify(fs.mkdir);
// ---------------------
// Observable File Utils
// ---------------------
exports.globObservable = (loc) => {
    const glober = new glob_1.Glob(loc);
    const obs = observable_1.Observable.fromEvent(glober, {
        data: 'match',
        error: 'error',
        end: 'end',
    });
    obs.onEnd(() => glober.abort());
    return obs;
};
exports.readdirObservable = (loc) => {
    return observable_1.Observable.create(creator => {
        exports.readdir(loc).then(files => {
            files.forEach(d => creator.next(d));
            creator.end();
        }).catch(e => creator.error(e));
    });
};
exports.mkdir = async (path) => {
    let current = '';
    for (const piece of path.split('/')) {
        if (piece === '.')
            continue;
        else if (piece === '..') {
            current = current.split('/').slice(0, -2).join('/') + '/';
        }
        else {
            current += piece + '/';
        }
        const exists = await exports.fileExists(current);
        if (exists)
            continue;
        await mkdirp(current).catch(() => { });
    }
};
/**
 * Converts a string containing forward slashes ("/")
 * to a system specific file path. On Unix based systems
 * maintains the ("/") and on Windows systems uses ("\")
 */
exports.filePath = (location) => {
    const joint = path.join(...location.split('/'));
    if (location.startsWith('/'))
        return '/' + joint;
    return joint;
};
/**
 * Creates folders for the entire given path if necessary.
 * Same behaviour as mkdir -p
 */
exports.createFolder = (location) => exports.mkdir(path.dirname(location));
/**
 * Stringifies an object then writes it to the file location.
 * Creates the folder path if necessary first.
 */
function writeJson(location, obj) {
    return exports.writeFile(location, JSON.stringify(obj, undefined, 2));
}
exports.writeJson = writeJson;
/**
 * Reads a json file from a given path.
 * Validates that file's integrity against the given schema.
 */
async function readJson(location, schema) {
    const rawData = await exports.readFile(location);
    const data = JSON.parse(rawData.toString());
    const validated = schema.validate(data);
    if (!validated.valid)
        throw new Error(`Expected data to match schema. <${JSON.stringify(validated.errors, undefined, 2)}>`);
    return validated.data;
}
exports.readJson = readJson;
//# sourceMappingURL=files.js.map