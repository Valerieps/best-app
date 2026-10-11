/** Lowercase without accents, for loose matching like "Data Studios" vs "data studios". */
export function normalizeForMatch(text: string): string {
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
export function findCitedName<T extends { name: string }>(text: string, items: readonly T[]): T | null {
  const haystack = normalizeForMatch(text);
  let best: T | null = null;
  for (const item of items) {
    const needle = normalizeForMatch(item.name);
    if (needle.length < MIN_CITED_NAME_LENGTH || !haystack.includes(needle)) continue;
    if (!best || needle.length > normalizeForMatch(best.name).length) best = item;
  }
  return best;
}
