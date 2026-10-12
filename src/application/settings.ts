import { normalizeLimits, type AssistantId } from '../domain/cleanupStatus';
import { toDayKey } from '../domain/day';
import type { ProjectListGroup, Settings, WarmupItem } from '../domain/entities';
import { record } from './events';
import type { AppContext } from './ports';

type SettingsPatch = Partial<Omit<Settings, 'id' | 'updatedAt'>>;

/**
 * Changes part of the user settings, creating the record on first use. The patch can be
 * computed from the current settings, for fields that hold more than one value.
 */
export async function updateSettings(
  ctx: AppContext,
  patchOrUpdate: SettingsPatch | ((current: Settings) => SettingsPatch),
): Promise<void> {
  await ctx.store.transaction(async (tx) => {
    const at = ctx.clock.now().toISOString();
    const current = (await tx.settings.get('main')) ?? { id: 'main' as const, weeklyReflection: null, updatedAt: at };
    const patch = typeof patchOrUpdate === 'function' ? patchOrUpdate(current) : patchOrUpdate;
    await tx.settings.put({ ...current, ...patch, updatedAt: at });
    await record(ctx, tx, 'settings.changed', 'settings', 'main', toDayKey(ctx.clock.now()), patch);
  });
}

/** Section 3: the weekdays the user works. "Dia seguinte" skips the others. */
export function setActiveDays(ctx: AppContext, activeDays: number[]): Promise<void> {
  return updateSettings(ctx, { activeDays: [...new Set(activeDays)].sort() });
}

/**
 * Limits for the color of one cleanup assistant on the dashboard; null brings back the
 * defaults. Limits are normalized, so orange never starts before yellow.
 */
export function setCleanupLimits(ctx: AppContext, id: AssistantId, limits: readonly number[] | null): Promise<void> {
  return updateSettings(ctx, (current) => {
    const { [id]: _previous, ...others } = current.cleanupLimits ?? {};
    return { cleanupLimits: limits ? { ...others, [id]: normalizeLimits(limits) } : others };
  });
}

/** Whether the project page's side column stays docked. One choice for every project. */
export function setProjectPanelPinned(ctx: AppContext, pinned: boolean): Promise<void> {
  return updateSettings(ctx, { projectPanelPinned: pinned });
}

/** Whether a group of the project list is open. Kept with the settings, not in this browser only. */
export function setProjectListGroupOpen(ctx: AppContext, group: ProjectListGroup, open: boolean): Promise<void> {
  return updateSettings(ctx, (current) => ({ projectListGroups: { ...current.projectListGroups, [group]: open } }));
}

/** Whether the sidebar is collapsed. Kept with the settings, like the other interface choices. */
export function setSidebarCollapsed(ctx: AppContext, collapsed: boolean): Promise<void> {
  return updateSettings(ctx, { sidebarCollapsed: collapsed });
}

/** Section 3: the warm-up checklist, defined by hand. Empty turns the warm up off. */
export function setWarmupItems(ctx: AppContext, items: WarmupItem[]): Promise<void> {
  return updateSettings(ctx, {
    warmupItems: items.map((item) => ({ ...item, text: item.text.trim() })).filter((item) => item.text),
  });
}
