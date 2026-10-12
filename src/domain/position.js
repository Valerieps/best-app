/**
 * Fractional indexing: string keys that sort between their neighbors, so a block can be
 * inserted anywhere by writing only its own record. Based on David Greenspan's
 * "Implementing Fractional Indexing". Keys never end in the smallest digit, which keeps
 * a key available between any two keys.
 */
const DIGITS = '0123456789abcdefghijklmnopqrstuvwxyz';
function midpoint(a, b) {
    if (b !== null) {
        let common = 0;
        while ((a[common] ?? DIGITS[0]) === b[common])
            common++;
        if (common > 0)
            return b.slice(0, common) + midpoint(a.slice(common), b.slice(common));
    }
    const digitA = a ? DIGITS.indexOf(a[0]) : 0;
    const digitB = b !== null ? DIGITS.indexOf(b[0]) : DIGITS.length;
    if (digitB - digitA > 1)
        return DIGITS[Math.round((digitA + digitB) / 2)];
    if (b !== null && b.length > 1)
        return b.slice(0, 1);
    return DIGITS[digitA] + midpoint(a.slice(1), null);
}
/** A key that sorts after `before` and before `after`. Null means no neighbor on that side. */
export function positionBetween(before, after) {
    if (before !== null && after !== null && before >= after) {
        throw new Error(`Invalid neighbors: "${before}" must sort before "${after}"`);
    }
    return midpoint(before ?? '', after);
}
export function comparePositions(a, b) {
    return a.position < b.position ? -1 : a.position > b.position ? 1 : 0;
}
