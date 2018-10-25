import { BufferType } from "./buffers";

export type Dim = {rows: number, cols: number};
export type BufferConstructor = Uint8ArrayConstructor | Float32ArrayConstructor | Int32ArrayConstructor;

export class Matrix<B extends BufferConstructor = Float32ArrayConstructor> {
    protected data: BufferType;
    protected transposed: boolean = false;

    static Zeros(dim: Dim) {
        return new Matrix(Float32Array, dim).fill(0);
    }

    static fromMatrix(m: Matrix<any>) {
        const dims = m.dims();
        const Buffer = m.Buffer;

        return new Matrix(Buffer, dims).fill((i, j) => m.get(i, j));
    }

    static fromBuffer<B extends BufferType>(buffer: B, dim: Dim) {
        if (buffer instanceof Float32Array) {
            return new Matrix(Float32Array, dim).load(buffer);
        } else if (buffer instanceof Int32Array) {
            return new Matrix(Int32Array, dim).load(buffer);
        } else {
            return new Matrix(Uint8Array, dim).load(buffer as Uint8Array);
        }
    }

    static fromData<B extends BufferConstructor = Float32ArrayConstructor>(data: number[][], Buf?: B) {
        const dims: Dim = { rows: data.length, cols: data[0].length };
        const Buffer = Buf || Float32Array;
        return new Matrix(Buffer, dims).fill((i, j) => data[i][j]);
    }

    constructor(private Buffer: B, private dim: Dim, buffer?: InstanceType<B>) {
        if (buffer && buffer.length !== dim.cols * dim.rows) throw new Error(`Expected provided data to match provided dimensions. Expected <${dim.rows * dim.cols}>, got <${buffer.length}>`);
        this.data = buffer || new Buffer(dim.cols * dim.rows);
    }

    inBounds(a: number, b: number) {
        const { rows, cols } = this.dims();
        return  a >= 0 &&
                b >= 0 &&
                a < rows &&
                b < cols;
    }

    protected boundaryCheck(a: number, b: number) {
        const { rows, cols } = this.dims();
        if (!this.inBounds(a, b))
            throw new Error(`Out-of-bounds: (${a}, ${b}) is out of bounds for (${rows}, ${cols}) matrix`);
    }

    protected merge(m: Matrix<B>) {
        this.transposed = m.transposed;
        this.data = m.data;
        this.dim = m.dim;
        return this;
    }

    get raw() { return this.data; }
    get rows() { return this.dims().rows; }
    get cols() { return this.dims().cols; }

    get(a: number, b: number) {
        this.boundaryCheck(a, b);
        if (this.transposed) return this.data[b * this.rows + a];
        return this.data[a * this.cols + b];
    }

    set(a: number, b: number, v: number) {
        this.boundaryCheck(a, b);
        if (this.transposed) this.data[b * this.rows + a] = v;
        else this.data[a * this.cols + b] = v;
        return this;
    }

    load(data: InstanceType<B>) {
        if (data.length !== this.cols * this.rows) throw new Error(`Loaded data invalid length. got: <${data.length}>, expected: <${this.cols * this.rows}>`);
        this.data = data;
        return this;
    }

    fill(f: ((i: number, j: number) => number) | number) {
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
    }

    addRow(data: number[]) {
        const { cols } = this.dims();
        if (data.length !== cols) throw new Error(`Row of length: ${data.length} does not match matrix cols: ${cols}`);

        const m = new Matrix(this.Buffer, { rows: this.rows + 1, cols: this.cols });
        m.transposed = this.transposed;
        m.fill((i, j) => {
            if (this.inBounds(i, j)) return this.get(i, j);
            return data[j];
        });

        this.merge(m);
    }

    addCol(data: number[]) {
        const { rows } = this.dims();
        if (data.length !== rows) throw new Error(`Col of length: ${data.length} does not match matrix rows: ${rows}`);

        const m = new Matrix(this.Buffer, { rows: this.rows, cols: this.cols + 1 });
        m.transposed = this.transposed;
        m.fill((i, j) => {
            if (this.inBounds(i, j)) return this.get(i, j);
            return data[i];
        });

        this.merge(m);
    }

    getRow(i: number) {
        this.boundaryCheck(i, 0);
        const row = [];
        for (let j = 0; j < this.cols; ++j) {
            row.push(this.get(i, j));
        }
        return row;
    }

    getCol(i: number) {
        this.boundaryCheck(0, i);
        const ret = [];
        for (let j = 0; j < this.rows; ++j) {
            ret.push(this.get(j, i));
        }
        return ret;
    }

    asArrays() {
        const ret: number[][] = [];
        for (let i = 0; i < this.rows; ++i) {
            const row = this.getRow(i);
            ret.push(row);
        }
        return ret;
    }

    forceReshape(dims: Dim) {
        const m = new Matrix(this.Buffer, dims);
        m.transposed = this.transposed;

        m.fill((i, j) => {
            if (this.inBounds(i, j)) return this.get(i, j);
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

    equal(m: Matrix<any>) {
        if (this.rows !== m.rows || this.cols !== m.cols) return false;

        for (let i = 0; i < this.rows; ++i) {
            for (let j = 0; j < this.cols; ++j) {
                if (this.get(i, j) !== m.get(i, j)) return false;
            }
        }

        return true;
    }
}
