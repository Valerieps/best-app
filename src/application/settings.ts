import { toDayKey } from '../domain/day';
import type { Settings, WarmupItem } from '../domain/entities';
import { record } from './events';
import type { AppContext } from './ports';

/** Changes part of the user settings, creating the record on first use. */
export async function updateSettings(
  ctx: AppContext,
  patch: Partial<Omit<Settings, 'id' | 'updatedAt'>>,
): Promise<void> {
  await ctx.store.transaction(async (tx) => {
    const at = ctx.clock.now().toISOString();
    const current = (await tx.settings.get('main')) ?? { id: 'main' as const, weeklyReflection: null, updatedAt: at };
    await tx.settings.put({ ...current, ...patch, updatedAt: at });
    await record(ctx, tx, 'settings.changed', 'settings', 'main', toDayKey(ctx.clock.now()), patch);
  });
}

/** Section 3: the weekdays the user works. "Dia seguinte" skips the others. */
export function setActiveDays(ctx: AppContext, activeDays: number[]): Promise<void> {
  return updateSettings(ctx, { activeDays: [...new Set(activeDays)].sort() });
}

/** Section 3: the warm-up checklist, defined by hand. Empty turns the warm up off. */
export function setWarmupItems(ctx: AppContext, items: WarmupItem[]): Promise<void> {
  return updateSettings(ctx, {
    warmupItems: items.map((item) => ({ ...item, text: item.text.trim() })).filter((item) => item.text),
  });
}
