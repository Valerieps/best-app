/**
 * How urgent each cleanup assistant is, shown as a color on the "Colocar ordem na casa"
 * dashboard (ASSISTENTES.md). The color comes from how many items the assistant found,
 * compared with limits the user sets in the settings.
 */
/** Assistants that exist so far. The others join the dashboard when they are built. */
export const ASSISTANT_IDS = ['pendingDays', 'whiteboards', 'duplicates'];
export const DEFAULT_STATUS_LIMITS = {
    // Days without checkout.
    pendingDays: [1, 2, 3],
    // Groups of whiteboard sections with the same title.
    whiteboards: [1, 5, 10],
    // Groups of projects with similar names.
    duplicates: [1, 2, 4],
};
/** Whole numbers from 1 up, each limit at least the previous one. */
export function normalizeLimits(limits) {
    const clean = (value, floor) => Math.max(floor, Number.isFinite(value) ? Math.round(value) : floor);
    const yellow = clean(limits[0], 1);
    const orange = clean(limits[1], yellow);
    const red = clean(limits[2], orange);
    return [yellow, orange, red];
}
/**
 * Changes one limit and moves the others out of its way, so the edited value always wins:
 * lowering red below orange brings orange down too, instead of pushing red back up.
 */
export function withLimit(limits, index, value) {
    const edited = normalizeLimits([value])[0];
    const next = limits.map((limit, i) => (i === index ? edited : i < index ? Math.min(limit, edited) : Math.max(limit, edited)));
    return normalizeLimits(next);
}
export function limitsFor(id, saved) {
    return saved?.[id] ? normalizeLimits(saved[id]) : DEFAULT_STATUS_LIMITS[id];
}
/** Green only with nothing to clean: anything found is at least yellow. */
export function cleanupStatus(count, limits) {
    if (count <= 0)
        return 0;
    if (count >= limits[2])
        return 3;
    if (count >= limits[1])
        return 2;
    return 1;
}
/** The dashboard cards, most urgent first; ties keep the order of ASSISTANT_IDS. */
export function assistantCards(counts, saved) {
    return ASSISTANT_IDS.map((id) => ({ id, count: counts[id], status: cleanupStatus(counts[id], limitsFor(id, saved)) })).sort((a, b) => b.status - a.status);
}
