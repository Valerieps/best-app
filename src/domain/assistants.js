import { findCitedName, normalizeForMatch } from './text';
/**
 * Sections that ended up without a project, grouped by repeated titles. Untitled sections are
 * left out: there is nothing to group them by or to name a project after.
 */
export function findWhiteboardGroups(sections, projects) {
    const active = projects.filter((project) => project.status === 'active');
    const groups = new Map();
    for (const section of sections) {
        if (section.projectId !== null || section.whiteboardDecision !== 'leftUnlinked')
            continue;
        const title = section.title?.trim();
        if (!title)
            continue;
        const key = normalizeForMatch(title);
        groups.set(key, [...(groups.get(key) ?? []), section]);
    }
    return [...groups]
        .map(([key, grouped]) => {
        const sorted = [...grouped].sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
        const title = sorted.at(-1).title.trim();
        const existing = active.find((project) => normalizeForMatch(project.name) === key) ?? findCitedName(title, active);
        const suggestion = existing
            ? { kind: 'link', projectId: existing.id }
            : sorted.length >= 2
                ? { kind: 'convert', name: title }
                : { kind: 'keep' };
        return { key, title, sections: sorted, suggestion };
    })
        .sort((a, b) => b.sections.length - a.sections.length || a.title.localeCompare(b.title));
}
/** Letters and digits only, so "Data Studios" and "DataStudios" compare equal. */
function compactName(name) {
    return normalizeForMatch(name).replace(/[^a-z0-9]/g, '');
}
/** Levenshtein distance, stopping early above `limit`. */
function editDistance(a, b, limit) {
    if (Math.abs(a.length - b.length) > limit)
        return limit + 1;
    let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
        const current = [i];
        for (let j = 1; j <= b.length; j++) {
            current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        }
        previous = current;
    }
    return previous[b.length];
}
/** Names this long or longer may differ by one typo and still count as the same project. */
const TYPO_MIN_LENGTH = 5;
export function areSimilarNames(a, b) {
    const x = compactName(a);
    const y = compactName(b);
    if (!x || !y)
        return false;
    if (x === y)
        return true;
    return Math.min(x.length, y.length) >= TYPO_MIN_LENGTH && editDistance(x, y, 1) <= 1;
}
/** Active projects with similar names, unless the user already said to keep them apart. */
export function findDuplicateProjects(projects) {
    const active = projects.filter((project) => project.status === 'active');
    const parent = new Map(active.map((project) => [project.id, project.id]));
    const find = (id) => {
        const up = parent.get(id);
        return up === id ? id : find(up);
    };
    const keptApart = (a, b) => (a.keepSeparateFrom ?? []).includes(b.id) || (b.keepSeparateFrom ?? []).includes(a.id);
    for (let i = 0; i < active.length; i++) {
        for (let j = i + 1; j < active.length; j++) {
            if (!areSimilarNames(active[i].name, active[j].name) || keptApart(active[i], active[j]))
                continue;
            parent.set(find(active[j].id), find(active[i].id));
        }
    }
    const groups = new Map();
    for (const project of active)
        groups.set(find(project.id), [...(groups.get(find(project.id)) ?? []), project]);
    return [...groups.values()]
        .filter((group) => group.length > 1)
        .map((group) => {
        const sorted = [...group].sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
        return { key: sorted.map((project) => project.id).join('+'), projects: sorted, keep: sorted[0] };
    });
}
