"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
const fs = require("fs");
const stream_1 = require("stream");
const files_1 = require("./files");
const Matrix_1 = require("./Matrix");
class LineCollector extends stream_1.Writable {
    constructor() {
        super(...arguments);
        this.buf = '';
    }
    _write(chunk, encoding, done) {
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
    _final(done) {
        this.emit('data', this.buf);
        done();
    }
}
class CSVParser {
    constructor(setter, opts) {
        this.setter = setter;
        this.skippedFirst = false;
        this.i = 0;
        this.rows = 0;
        this.listen = (line) => {
            if (this.o.skipFirst && !this.skippedFirst) {
                this.skippedFirst = true;
                return;
            }
            const strings = line === '' ? [] : line.split(',');
            const arr = strings.map(x => parseFloat(x));
            arr.forEach(d => this.setter(this.rows, this.i++, d));
            // only count rows that have data.
            // skip blank rows (for instance the last row in a \n terminated file)
            if (arr.length)
                this.rows++;
        };
        this.o = _.merge({
            skipFirst: false,
        }, opts);
    }
}
function loadCsvToBuffer(params) {
    const { path, buffer } = params;
    let i = 0;
    const parser = new CSVParser((__, ___, d) => buffer[i++] = d);
    const stream = fs.createReadStream(path)
        .pipe(new LineCollector());
    return new Promise((resolve, reject) => {
        stream.on('error', reject);
        stream.on('finish', () => resolve(buffer));
        stream.on('data', parser.listen);
    });
}
exports.loadCsvToBuffer = loadCsvToBuffer;
function load(path) {
    const data = [];
    const parser = new CSVParser((i, j, d) => {
        if (i === data.length) {
            data.push([]);
        }
        data[i].push(d);
    });
    const stream = fs.createReadStream(path)
        .pipe(new LineCollector());
    return new Promise((resolve, reject) => {
        stream.on('error', reject);
        stream.on('finish', () => resolve(Matrix_1.Matrix.fromData(data)));
        stream.on('data', parser.listen);
    });
}
exports.load = load;
function writeCsv(path, m) {
    return __awaiter(this, void 0, void 0, function* () {
        yield files_1.createFolder(path);
        const stream = fs.createWriteStream(path);
        for (let i = 0; i < m.rows; ++i) {
            let line = '';
            for (let j = 0; j < m.cols; ++j) {
                line += m.get(i, j);
                // no trailing commas
                if (j !== m.cols - 1)
                    line += ',';
            }
            // trailing spaces are okay
            stream.write(line + '\n');
        }
        return new Promise(resolve => stream.end(resolve));
    });
}
exports.writeCsv = writeCsv;
function csvStringFromObject(obj) {
    const keys = Object.keys(obj).sort();
    return keys.reduce((str, key, i) => i === 0 ? `${obj[key]}` : `${str}, ${obj[key]}`, '');
}
exports.csvStringFromObject = csvStringFromObject;
//# sourceMappingURL=csv.js.map