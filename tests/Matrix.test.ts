import { Matrix } from 'Matrix';

const buildSimpleMatrix = () => Matrix.fromData([
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9]
]);

test("Can create Matrix with primitives", () => {
    const m = buildSimpleMatrix();
    expect(m).toBeTruthy();
});

test("Can access data in memory", () => {
    const m = buildSimpleMatrix();

    expect(m.get(0, 0)).toBe(1);
    expect(m.get(2, 0)).toBe(7);
});

test("Can access transposed memory", () => {
    const m = buildSimpleMatrix();

    m.transpose();
    expect(m.get(0, 0)).toBe(1);
    expect(m.get(2, 0)).toBe(3);
});

test("Can get dimensions of matrix", () => {
    const m = buildSimpleMatrix();
    const { rows, cols } = m.dims();

    expect(rows).toBe(3);
    expect(cols).toBe(3);
});

test("Can set the value at a specified index", () => {
    const m = buildSimpleMatrix();

    m.set(0, 1, 3);
    expect(m.get(0, 1)).toBe(3);
});

test("Throws error when get out of bounds", () => {
    const m = buildSimpleMatrix();

    try {
        m.get(6, 2);
        fail();
    } catch(e) {
        expect(true).toBeTruthy();
    }

    try {
        m.get(2, 6);
        fail();
    } catch(e) {
        expect(true).toBeTruthy();
    }
});

test("Can get a matrix from another", () => {
    const m = Matrix.fromData([
        [0, 1],
        [2, 3],
        [4, 5]
    ]);

    m.transpose();
    const n = Matrix.fromMatrix(m);

    const e = Matrix.fromData([
        [0, 2, 4],
        [1, 3, 5]
    ]);

    expect(e.equal(n)).toBe(true);
});

test("Can add a row to a matrix", () => {
    const m = buildSimpleMatrix();

    m.addRow([1, 2, 3]);

    const { rows, cols } = m.dims();

    expect(rows).toBe(4);
    expect(cols).toBe(3);

    const e = Matrix.fromData([
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9],
        [1, 2, 3],
    ]);

    expect(m.equal(e)).toBe(true);
});

test("Can add a col to a matrix", () => {
    const m = buildSimpleMatrix();

    m.addCol([1, 2, 3]);

    const { rows, cols } = m.dims();

    expect(rows).toBe(3);
    expect(cols).toBe(4);

    const e = Matrix.fromData([
        [1, 2, 3, 1],
        [4, 5, 6, 2],
        [7, 8, 9, 3],
    ]);

    expect(m.equal(e)).toBe(true);
});

test("Can get a row", () => {
    const m = buildSimpleMatrix();

    const row = m.getRow(1);

    expect(row).toEqual([4, 5, 6]);
});

test("Can get a col", () => {
    const m = buildSimpleMatrix();

    const col = m.getCol(1);

    expect(col).toEqual([2, 5, 8]);
});

test("Can force a matrix to resize smaller", () => {
    const m = buildSimpleMatrix();

    m.forceReshape({rows: 2, cols: 2});
    expect(Matrix.fromData([
        [1, 2],
        [4, 5]
    ]).equal(m)).toBe(true);
});

test("Can force a matrix to resize larger", () => {
    const m = buildSimpleMatrix();

    m.forceReshape({rows: 4, cols: 4});
    expect(Matrix.fromData([
        [1, 2, 3, 0],
        [4, 5, 6, 0],
        [7, 8, 9, 0],
        [0, 0, 0, 0]
    ]).equal(m)).toBe(true);
});

test("Can build a matrix of zeros", () => {
    const m = Matrix.Zeros({ rows: 3, cols: 2});

    expect(Matrix.fromData([
        [0, 0],
        [0, 0],
        [0, 0]
    ]).equal(m)).toBe(true);
});

test('Can concat multiple matrix rows', () => {
    const m = Matrix.fromData([
        [1, 2, 3],
        [4, 5, 6],
    ]);

    const n = Matrix.fromData([
        [7, 8, 9],
    ]);

    const e = Matrix.fromData([
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9],
    ]);

    const got = Matrix.concat([m, n], 0);

    expect(got.equal(e)).toBe(true);
});

test('Can get a block average over rows', () => {
    const m = Matrix.fromData([
        [1, 2, 3],
        [1, 2, 3],
        [1, 2, 3],
        [1, 2, 3],
        [1, 2, 3],
        [1, 2, 3],
        [1, 2, 3],
        [1, 2, 3],
        [1, 2, 3],
    ]);

    const e = Matrix.fromData([
        [1, 2, 3],
        [1, 2, 3],
        [1, 2, 3],
    ]);

    const got = m.blockAverage(3, 0);

    expect(got.equal(e)).toBe(true);
});

test('Can get a block average over rows 2', () => {
    const m = Matrix.fromData([
        [1, 2, 3],
        [2, 3, 4],
        [3, 4, 5],
        [1, 2, 3],
        [2, 3, 4],
        [3, 4, 5],
    ]);

    const e = Matrix.fromData([
        [2, 3, 4],
        [2, 3, 4],
    ]);

    const got = m.blockAverage(3, 0);

    expect(got.equal(e)).toBe(true);
});
