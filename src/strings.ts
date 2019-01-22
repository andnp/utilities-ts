export function interpolate(obj: Record<string, string>, template: string): string {
    const matches = template.match(/{{.+?}}/g);
    if (!matches) return template;

    let newString = template;
    for (const match of matches) {
        const data = obj[unwrap(match)];
        if (data === undefined) throw new Error(`Expected interpolated value to exist. ${match}`);

        newString = newString.replace(match, data);
    }

    return newString;
}

function unwrap(data: string) {
    if (!data.startsWith('{{')) throw new Error(`Expected wrapped data to start with {{. Got ${data}`);
    if (!data.endsWith('}}')) throw new Error(`Expected wrapped data to end with }}. Got ${data}`);

    return data.substr(2, data.length - 4);
}
