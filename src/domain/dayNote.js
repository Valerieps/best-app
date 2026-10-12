import { comparePositions } from './position';
import { isVisibleTask } from './tasks';
function byCreatedAt(a, b) {
    return a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0;
}
export function buildDayNote(input) {
    const sections = [...input.sections].sort(byCreatedAt);
    const ownSectionIds = new Set(sections.map((section) => section.id));
    const carried = input.intended
        .filter((task) => !ownSectionIds.has(task.sectionId) && isVisibleTask(task))
        .sort(byCreatedAt);
    const note = sections.map((section) => ({
        section,
        carried: [],
        blocks: input.blocks
            .filter((block) => block.sectionId === section.id && isVisibleTask(block))
            .sort(comparePositions),
    }));
    // The day always opens with a general section; it becomes real when something is written.
    let host = note.find((entry) => entry.section?.kind === 'general');
    if (!host) {
        host = { section: null, carried: [], blocks: [] };
        note.unshift(host);
    }
    host.carried = carried;
    return note;
}
