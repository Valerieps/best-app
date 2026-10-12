import { normalizeLimits } from '../domain/cleanupStatus';
import { toDayKey } from '../domain/day';
import { record } from './events';
/**
 * Changes part of the user settings, creating the record on first use. The patch can be
 * computed from the current settings, for fields that hold more than one value.
 */
export async function updateSettings(ctx, patchOrUpdate) {
    await ctx.store.transaction(async (tx) => {
        const at = ctx.clock.now().toISOString();
        const current = (await tx.settings.get('main')) ?? { id: 'main', weeklyReflection: null, updatedAt: at };
        const patch = typeof patchOrUpdate === 'function' ? patchOrUpdate(current) : patchOrUpdate;
        await tx.settings.put({ ...current, ...patch, updatedAt: at });
        await record(ctx, tx, 'settings.changed', 'settings', 'main', toDayKey(ctx.clock.now()), patch);
    });
}
/** Section 3: the weekdays the user works. "Dia seguinte" skips the others. */
export function setActiveDays(ctx, activeDays) {
    return updateSettings(ctx, { activeDays: [...new Set(activeDays)].sort() });
}
/**
 * Limits for the color of one cleanup assistant on the dashboard; null brings back the
 * defaults. Limits are normalized, so orange never starts before yellow.
 */
export function setCleanupLimits(ctx, id, limits) {
    return updateSettings(ctx, (current) => {
        const { [id]: _previous, ...others } = current.cleanupLimits ?? {};
        return { cleanupLimits: limits ? { ...others, [id]: normalizeLimits(limits) } : others };
    });
}
/** Whether the project page's side column stays docked. One choice for every project. */
export function setProjectPanelPinned(ctx, pinned) {
    return updateSettings(ctx, { projectPanelPinned: pinned });
}
/** Whether a group of the project list is open. Kept with the settings, not in this browser only. */
export function setProjectListGroupOpen(ctx, group, open) {
    return updateSettings(ctx, (current) => ({ projectListGroups: { ...current.projectListGroups, [group]: open } }));
}
/** Section 3: the warm-up checklist, defined by hand. Empty turns the warm up off. */
export function setWarmupItems(ctx, items) {
    return updateSettings(ctx, {
        warmupItems: items.map((item) => ({ ...item, text: item.text.trim() })).filter((item) => item.text),
    });
}
