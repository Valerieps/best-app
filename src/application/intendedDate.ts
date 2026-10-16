import type { DayKey } from '../domain/day';
import type { Block } from '../domain/entities';
import type { DateChangeReason } from '../domain/events';
import { isPostponement } from '../domain/tasks';
import { record } from './events';
import type { AppContext, StoreTransaction } from './ports';

/**
 * Moves a task's intended date and records it, counting postponements unless `postpone` is
 * false. Returns the updated task; the caller saves it.
 */
export async function moveIntendedDate(
  ctx: AppContext,
  tx: StoreTransaction,
  task: Block,
  to: DayKey | null,
  day: DayKey,
  reason: DateChangeReason,
  options: { postpone?: boolean } = {},
): Promise<Block> {
  const from = task.intendedDate;
  if (from === to) return task;
  // Moving the day to follow up on something a person owes me is no postponement (spec/pessoas.md).
  const postponed = options.postpone !== false && !task.waiting && isPostponement(from, to);
  await record(ctx, tx, 'task.intendedDateChanged', 'block', task.id, day, { from, to, reason });
  if (postponed) await record(ctx, tx, 'task.postponed', 'block', task.id, day, { from, to, reason });
  return {
    ...task,
    intendedDate: to,
    firstIntendedDate: task.firstIntendedDate ?? to,
    postponeCount: task.postponeCount + (postponed ? 1 : 0),
    updatedAt: ctx.clock.now().toISOString(),
  };
}
