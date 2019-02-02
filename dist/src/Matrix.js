"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
class Matrix {
    constructor(Buffer, dim, buffer) {
        this.Buffer = Buffer;
        this.dim = dim;
        this.transposed = false;
        if (buffer && buffer.length !== dim.cols * dim.rows)
            throw new Error(`Expected provided data to match provided dimensions. Expected <${dim.rows * dim.cols}>, got <${buffer.length}>`);
        this.data = buffer || new Buffer(dim.cols * dim.rows);
    }
    static Zeros(dim) {
        return new Matrix(Float32Array, dim).fill(0);
    }
    static fromMatrix(m) {
        const dims = m.dims();
        const Buffer = m.Buffer;
        return new Matrix(Buffer, dims).fill((i, j) => m.get(i, j));
    }
    static fromBuffer(buffer, dim) {
        if (buffer instanceof Float32Array) {
            return new Matrix(Float32Array, dim).load(buffer);
        }
        else if (buffer instanceof Int32Array) {
            return new Matrix(Int32Array, dim).load(buffer);
        }
        else {
            return new Matrix(Uint8Array, dim).load(buffer);
        }
    }
    static fromData(data, Buf) {
        const dims = { rows: data.length, cols: data[0].length };
        const Buffer = Buf || Float32Array;
        return new Matrix(Buffer, dims).fill((i, j) => data[i][j]);
    }
    static fromFlatData(data, dim, Buf) {
        const Buffer = Buf || Float32Array;
        const b = new Buffer(data);
        return Matrix.fromBuffer(b, dim);
    }
    static concat(data, axis = 0) {
        const dim = axis === 0 ? { rows: 0, cols: data[0].cols } : { rows: data[0].rows, cols: 0 };
        const out = new Matrix(data[0].Buffer, dim);
        for (const m of data) {
            const dim = axis === 0 ? m.rows : m.cols;
            for (let i = 0; i < dim; i++) {
                if (axis === 0) {
                    const r = m.getRow(i);
                    out.addRow(r);
                }
                else {
                    const c = m.getCol(i);
                    out.addCol(c);
                }
            }
        }
        return out;
    }
    inBounds(a, b) {
        const { rows, cols } = this.dims();
        return a >= 0 &&
            b >= 0 &&
            a < rows &&
            b < cols;
    }
    boundaryCheck(a, b) {
        const { rows, cols } = this.dims();
        if (!this.inBounds(a, b))
            throw new Error(`Out-of-bounds: (${a}, ${b}) is out of bounds for (${rows}, ${cols}) matrix`);
    }
    merge(m) {
        this.transposed = m.transposed;
        this.data = m.data;
        this.dim = m.dim;
        return this;
    }
    get raw() { return this.data; }
    get rows() { return this.dims().rows; }
    get cols() { return this.dims().cols; }
    get(a, b) {
        this.boundaryCheck(a, b);
        if (this.transposed)
            return this.data[b * this.rows + a];
        return this.data[a * this.cols + b];
    }
    set(a, b, v) {
        this.boundaryCheck(a, b);
        if (this.transposed)
            this.data[b * this.rows + a] = v;
        else
            this.data[a * this.cols + b] = v;
        return this;
    }
    load(data) {
        if (data.length !== this.cols * this.rows)
            throw new Error(`Loaded data invalid length. got: <${data.length}>, expected: <${this.cols * this.rows}>`);
        this.data = data;
        return this;
    }
    fill(f) {
        const g = typeof f === 'function' ? f : () => f;
        for (let i = 0; i < this.rows; ++i) {
            for (let j = 0; j < this.cols; ++j) {
                this.set(i, j, g(i, j));
            }
        }
        return this;
    }
    dims() {
        const dim1 = this.dim.rows;
        const dim2 = this.dim.cols;
        return {
            rows: this.transposed ? dim2 : dim1,
            cols: this.transposed ? dim1 : dim2
        };
    }
    transpose() {
        this.transposed = !this.transposed;
        return this;
    }
    addRow(data) {
        const { cols } = this.dims();
        if (data.length !== cols)
            throw new Error(`Row of length: ${data.length} does not match matrix cols: ${cols}`);
        const m = new Matrix(this.Buffer, { rows: this.rows + 1, cols: this.cols });
        m.transposed = this.transposed;
        m.fill((i, j) => {
            if (this.inBounds(i, j))
                return this.get(i, j);
            return data[j];
        });
        this.merge(m);
    }
    addCol(data) {
        const { rows } = this.dims();
        if (data.length !== rows)
            throw new Error(`Col of length: ${data.length} does not match matrix rows: ${rows}`);
        const m = new Matrix(this.Buffer, { rows: this.rows, cols: this.cols + 1 });
        m.transposed = this.transposed;
        m.fill((i, j) => {
            if (this.inBounds(i, j))
                return this.get(i, j);
            return data[i];
        });
        this.merge(m);
    }
    getRow(i) {
        this.boundaryCheck(i, 0);
        const row = [];
        for (let j = 0; j < this.cols; ++j) {
            row.push(this.get(i, j));
        }
        return row;
    }
    getCol(i) {
        this.boundaryCheck(0, i);
        const ret = [];
        for (let j = 0; j < this.rows; ++j) {
            ret.push(this.get(j, i));
        }
        return ret;
    }
    asArrays() {
        const ret = [];
        for (let i = 0; i < this.rows; ++i) {
            const row = this.getRow(i);
            ret.push(row);
        }
        return ret;
    }
    forceReshape(dims) {
        const m = new Matrix(this.Buffer, dims);
        m.transposed = this.transposed;
        m.fill((i, j) => {
            if (this.inBounds(i, j))
                return this.get(i, j);
            return 0;
        });
        this.merge(m);
    }
    print(digits = 3) {
        for (let i = 0; i < this.rows; ++i) {
            for (let j = 0; j < this.cols; ++j) {
                const x = this.get(i, j).toFixed(digits);
                process.stdout.write(`${x} `);
            }
            process.stdout.write('\n');
        }
    }
    equal(m) {
        if (this.rows !== m.rows || this.cols !== m.cols)
            return false;
        for (let i = 0; i < this.rows; ++i) {
            for (let j = 0; j < this.cols; ++j) {
                if (this.get(i, j) !== m.get(i, j))
                    return false;
            }
        }
        return true;
    }
    blockAverage(window, axis = 0) {
        const blocks = axis === 0
            ? Math.ceil(this.rows / window)
            : Math.ceil(this.cols / window);
        const me = axis === 0
            ? this.rows
            : this.cols;
        const other = axis === 0
            ? this.cols
            : this.rows;
        const getData = axis === 0
            ? (i) => this.getRow(i)
            : (i) => this.getCol(i);
        const out = [];
        for (let b = 0; b < blocks; b++) {
            const mean = _.times(other, () => 0);
            for (let w = 0; w < window; w++) {
                const idx = b * window + w;
                if (idx >= me)
                    break;
                const data = getData(idx);
                for (let i = 0; i < data.length; i++)
                    mean[i] = mean[i] + (data[i] / window);
            }
            out.push(mean);
        }
        return axis === 0
            ? Matrix.fromData(out)
            : Matrix.fromMatrix(Matrix.fromData(out).transpose());
    }
    // ---------
    // Utilities
    // ---------
    static describeColumns(m, options) {
        const { cols } = m.dims();
        return _.times(cols, (i) => {
            const col = m.getCol(i);
            return describe(col, options);
        });
    }
    static describeRows(m, options) {
        const { rows } = m.dims();
        return _.times(rows, (i) => {
            const row = m.getRow(i);
            return describe(row, options);
        });
    }
}
exports.Matrix = Matrix;
function standardError(arr) {
    let n = 0;
    let m = 0;
    let m2 = 0;
    arr.forEach((x) => {
        n++;
        const delta = x - m;
        m += delta / n;
        const d2 = x - m;
        m2 += delta * d2;
    });
    const variance = m2 / (n - 1);
    return Math.sqrt(variance) / Math.sqrt(arr.length);
}
function describe(arr, options) {
    let recoded = arr;
    if (options) {
        recoded = options.ignoreNan ? arr.filter((k) => !_.isNaN(k)) : recoded;
    }
    return {
        mean: _.mean(recoded),
        stderr: standardError(recoded) || 0,
        count: recoded.length
    };
}
//# sourceMappingURL=Matrix.js.map