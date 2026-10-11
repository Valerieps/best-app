import { toDayKey, type DayKey } from '../domain/day';
import { ALL_DAYS } from '../domain/dayFlow';
import type { Habit } from '../domain/entities';
import { habitLogId } from '../domain/habits';
import { record } from './events';
import type { AppContext, StoreTransaction } from './ports';

/** Section 6: habits, logged as yes or no. */

function today(ctx: AppContext): DayKey {
  return toDayKey(ctx.clock.now());
}

export interface HabitFields {
  name: string;
  criterion: string;
  weekdays: number[];
  objectiveId: string | null;
}

export async function addHabitIn(ctx: AppContext, tx: StoreTransaction, fields: HabitFields): Promise<Habit> {
  const at = ctx.clock.now().toISOString();
  const habit: Habit = {
    id: ctx.ids.next(),
    name: fields.name.trim(),
    criterion: fields.criterion.trim(),
    weekdays: fields.weekdays.length > 0 ? [...fields.weekdays].sort() : [...ALL_DAYS],
    objectiveId: fields.objectiveId,
    status: 'active',
    createdAt: at,
    updatedAt: at,
  };
  await tx.habits.put(habit);
  await record(ctx, tx, 'habit.created', 'habit', habit.id, today(ctx), { name: habit.name });
  return habit;
}

export function createHabit(ctx: AppContext, fields: HabitFields): Promise<Habit> {
  if (!fields.name.trim()) throw new Error('The habit name must not be empty');
  return ctx.store.transaction((tx) => addHabitIn(ctx, tx, fields));
}

export async function updateHabit(ctx: AppContext, id: string, fields: HabitFields): Promise<void> {
  if (!fields.name.trim()) return;
  await ctx.store.transaction(async (tx) => {
    const habit = await tx.habits.get(id);
    if (!habit) return;
    const updated: Habit = {
      ...habit,
      name: fields.name.trim(),
      criterion: fields.criterion.trim(),
      weekdays: fields.weekdays.length > 0 ? [...fields.weekdays].sort() : habit.weekdays,
      objectiveId: fields.objectiveId,
      updatedAt: ctx.clock.now().toISOString(),
    };
    await tx.habits.put(updated);
    await record(ctx, tx, 'habit.updated', 'habit', id, today(ctx), { ...fields });
  });
}

/** Archiving keeps the logs for the metrics; the habit just stops being asked. */
export async function setHabitArchived(ctx: AppContext, id: string, archived: boolean): Promise<void> {
  await ctx.store.transaction(async (tx) => {
    const habit = await tx.habits.get(id);
    if (!habit || (habit.status === 'archived') === archived) return;
    await tx.habits.put({ ...habit, status: archived ? 'archived' : 'active', updatedAt: ctx.clock.now().toISOString() });
    await record(ctx, tx, 'habit.archived', 'habit', id, today(ctx), { archived });
  });
}

/** Logs a day as yes or no. Logging again replaces the answer. */
export async function logHabit(ctx: AppContext, habitId: string, day: DayKey, done: boolean): Promise<void> {
  await ctx.store.transaction(async (tx) => {
    const id = habitLogId(habitId, day);
    const current = await tx.habitLogs.get(id);
    if (current?.done === done) return;
    await tx.habitLogs.put({ id, habitId, day, done, updatedAt: ctx.clock.now().toISOString() });
    await record(ctx, tx, 'habit.logged', 'habit', habitId, day, { done });
  });
}
