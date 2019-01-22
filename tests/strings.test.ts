import * as strings from 'strings';

test('should return back the template if no interpolations are requested', () => {
    const template = 'hi/there/friend';

    const got = strings.interpolate({}, template);

    expect(got).toBe(template);
});

test('should swap interpolations for given object value', () => {
    const template = '{{hi}}/there/{{friend}}';

    const data = {
        hi: 'data1',
        there: 'data2',
        friend: 'data3',
    };

    const got = strings.interpolate(data, template);
    expect(got).toBe('data1/there/data3');
});

test('should throw error if interpolation does not exist', () => {
    const template = '{{hi}}';

    try {
        strings.interpolate({}, template);
        fail();
    } catch(e) {
        expect(true).toBe(true);
    }
});
