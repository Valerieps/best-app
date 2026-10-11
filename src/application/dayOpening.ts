import { toDayKey, type DayKey } from '../domain/day';
import type { DayRecord, Reminder, WarmupResult } from '../domain/entities';
import { positionBetween } from '../domain/position';
import { record } from './events';
import { createBlock, createSection, setSectionTitle } from './notebook';
import type { AppContext, StoreTransaction } from './ports';

/** Section 3: "Iniciar Dia", warm up, dashboard, and reminders that come back in the app. */

function today(ctx: AppContext): DayKey {
  return toDayKey(ctx.clock.now());
}

async function dayRecordFor(ctx: AppContext, tx: StoreTransaction, day: DayKey): Promise<DayRecord> {
  return (await tx.days.get(day)) ?? { day, lastCheckoutAt: null, updatedAt: ctx.clock.now().toISOString() };
}

export async function startDay(ctx: AppContext): Promise<void> {
  await ctx.store.transaction(async (tx) => {
    const day = today(ctx);
    const current = await dayRecordFor(ctx, tx, day);
    if (current.startedAt) return;
    const at = ctx.clock.now().toISOString();
    await tx.days.put({ ...current, startedAt: at, updatedAt: at });
    await record(ctx, tx, 'day.started', 'day', day, day);
  });
}

/**
 * Answers a warm-up item: done, "pular hoje", or "perguntar de novo" at `askAt`, which creates
 * a reminder that comes back inside the app.
 */
export async function answerWarmupItem(
  ctx: AppContext,
  item: { id: string; text: string },
  result: WarmupResult,
  askAt?: Date,
): Promise<void> {
  await ctx.store.transaction(async (tx) => {
    const day = today(ctx);
    const current = await dayRecordFor(ctx, tx, day);
    const at = ctx.clock.now().toISOString();
    await tx.days.put({ ...current, warmup: { ...(current.warmup ?? {}), [item.id]: result }, updatedAt: at });
    await record(ctx, tx, 'warmup.answered', 'day', day, day, { itemId: item.id, result });
    if (result === 'later' && askAt) {
      const reminder: Reminder = {
        id: ctx.ids.next(),
        source: 'warmup',
        sourceId: item.id,
        day,
        text: item.text,
        dueAt: askAt.toISOString(),
        status: 'pending',
        createdAt: at,
        updatedAt: at,
      };
      await tx.reminders.put(reminder);
      await record(ctx, tx, 'reminder.created', 'reminder', reminder.id, day, { dueAt: reminder.dueAt, source: 'warmup' });
    }
  });
}

/** "Iniciar o Flow de Execução": from the dashboard to the day note. */
export async function startExecution(ctx: AppContext): Promise<void> {
  await ctx.store.transaction(async (tx) => {
    const day = today(ctx);
    const current = await dayRecordFor(ctx, tx, day);
    if (current.executionStartedAt) return;
    const at = ctx.clock.now().toISOString();
    await tx.days.put({ ...current, startedAt: current.startedAt ?? at, executionStartedAt: at, updatedAt: at });
    await record(ctx, tx, 'day.executionStarted', 'day', day, day);
  });
}

/** "Registrar pensamentos" on the dashboard: they go into a new general section of the day note. */
export async function registerThoughts(ctx: AppContext, text: string): Promise<void> {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return;
  const section = await createSection(ctx, 'general');
  await setSectionTitle(ctx, section.id, 'Pensamentos');
  let position: string | null = null;
  for (const line of lines) {
    position = positionBetween(position, null);
    await createBlock(ctx, { sectionId: section.id, position }, line);
  }
}

/** Answers a reminder: "feito" or "largar". A done warm-up reminder marks the item done that day. */
export async function answerReminder(ctx: AppContext, reminderId: string, answer: 'done' | 'dropped'): Promise<void> {
  await ctx.store.transaction(async (tx) => {
    const reminder = await tx.reminders.get(reminderId);
    if (!reminder || reminder.status !== 'pending') return;
    const at = ctx.clock.now().toISOString();
    await tx.reminders.put({ ...reminder, status: answer, updatedAt: at });
    await record(ctx, tx, 'reminder.answered', 'reminder', reminder.id, today(ctx), { answer });
    if (answer === 'done' && reminder.source === 'warmup') {
      const dayRecord = await dayRecordFor(ctx, tx, reminder.day);
      await tx.days.put({ ...dayRecord, warmup: { ...(dayRecord.warmup ?? {}), [reminder.sourceId]: 'done' }, updatedAt: at });
    }
  });
}

/** "Mais tarde" (or "mudar" at checkout): the reminder comes back at `dueAt`. */
export async function snoozeReminder(ctx: AppContext, reminderId: string, dueAt: Date): Promise<void> {
  await ctx.store.transaction(async (tx) => {
    const reminder = await tx.reminders.get(reminderId);
    if (!reminder || reminder.status !== 'pending') return;
    await tx.reminders.put({ ...reminder, dueAt: dueAt.toISOString(), updatedAt: ctx.clock.now().toISOString() });
    await record(ctx, tx, 'reminder.snoozed', 'reminder', reminder.id, today(ctx), { dueAt: dueAt.toISOString() });
  });
}
