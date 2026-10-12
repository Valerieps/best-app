/** Lowercase without accents, for loose matching like "Data Studios" vs "data studios". */
export function normalizeForMatch(text) {
    return text
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
}
/** Shortest project name that counts as a citation, to avoid matching tiny words. */
const MIN_CITED_NAME_LENGTH = 3;
/** The longest item whose name appears in the text, or null. */
export function findCitedName(text, items) {
    const haystack = normalizeForMatch(text);
    let best = null;
    for (const item of items) {
        const needle = normalizeForMatch(item.name);
        if (needle.length < MIN_CITED_NAME_LENGTH || !haystack.includes(needle))
            continue;
        if (!best || needle.length > normalizeForMatch(best.name).length)
            best = item;
    }
    return best;
}
