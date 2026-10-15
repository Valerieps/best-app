import { toDayKey, type DayKey } from '../domain/day';
import { dayPriorityListId, demote, promote } from '../domain/priorities';
import { record } from './events';
import { moveIntendedDate } from './intendedDate';
import type { AppContext } from './ports';

/** 1b shortcuts of the day note: dates, deadlines, priorities and meeting details. */

function today(ctx: AppContext): DayKey {
  return toDayKey(ctx.clock.now());
}

/** Sets the intended date during the day. A future date takes the task out of today's triage. */
export async function setIntendedDate(ctx: AppContext, taskId: string, date: DayKey | null): Promise<void> {
  await ctx.store.transaction(async (tx) => {
    const task = await tx.blocks.get(taskId);
    if (!task || task.kind !== 'task' || task.status !== 'active') return;
    await tx.blocks.put(await moveIntendedDate(ctx, tx, task, date, today(ctx), 'dayNote'));
  });
}

/** Sets or clears the optional deadline (prazo máximo). */
export async function setDeadline(ctx: AppContext, taskId: string, deadline: DayKey | null): Promise<void> {
  await ctx.store.transaction(async (tx) => {
    const task = await tx.blocks.get(taskId);
    if (!task || task.kind !== 'task') return;
    const from = task.deadline ?? null;
    if (from === deadline) return;
    await tx.blocks.put({ ...task, deadline, updatedAt: ctx.clock.now().toISOString() });
    await record(ctx, tx, 'task.deadlineChanged', 'block', task.id, today(ctx), { from, to: deadline });
  });
}

/** Promotes a task to a priority of today, or removes it. */
export async function setDayPriority(ctx: AppContext, taskId: string, on: boolean): Promise<void> {
  await ctx.store.transaction(async (tx) => {
    const day = today(ctx);
    const id = dayPriorityListId(day);
    const list = (await tx.priorities.get(id)) ?? { id, scope: 'day' as const, period: day, itemIds: [], updatedAt: '' };
    let itemIds: string[];
    if (on) {
      const statuses = new Map<string, string | null>();
      for (const itemId of list.itemIds) statuses.set(itemId, (await tx.blocks.get(itemId))?.status ?? null);
      itemIds = promote(list.itemIds, taskId, (itemId) => statuses.get(itemId) === 'active');
    } else {
      itemIds = demote(list.itemIds, taskId);
    }
    if (itemIds.join() === list.itemIds.join()) return;
    await tx.priorities.put({ ...list, itemIds, updatedAt: ctx.clock.now().toISOString() });
    await record(ctx, tx, on ? 'priority.added' : 'priority.removed', 'priorities', id, day, { taskId, itemIds });
  });
}

/**
 * Moves a priority of today to another intended date, from the priorities block, once its
 * countdown ends: the task gets the new date and leaves today's chosen priorities. A task that
 * is due today stays an automatic priority (spec/prioridades.md, "Prioridades do dia").
 */
export async function moveDayPriority(ctx: AppContext, taskId: string, date: DayKey | null): Promise<void> {
  await ctx.store.transaction(async (tx) => {
    const task = await tx.blocks.get(taskId);
    if (!task || task.kind !== 'task' || task.status !== 'active') return;
    const day = today(ctx);
    await tx.blocks.put(await moveIntendedDate(ctx, tx, task, date, day, 'dayNote'));
    if (date === day) return;
    const id = dayPriorityListId(day);
    const list = await tx.priorities.get(id);
    if (!list?.itemIds.includes(taskId)) return;
    const itemIds = demote(list.itemIds, taskId);
    await tx.priorities.put({ ...list, itemIds, updatedAt: ctx.clock.now().toISOString() });
    await record(ctx, tx, 'priority.removed', 'priorities', id, day, { taskId, itemIds });
  });
}

export interface SectionDetails {
  participants: string;
  docLink: string;
}

/** Participants and document link of a meeting section. */
export async function setSectionDetails(ctx: AppContext, sectionId: string, details: SectionDetails): Promise<void> {
  await ctx.store.transaction(async (tx) => {
    const section = await tx.sections.get(sectionId);
    if (!section) return;
    const participants = details.participants.trim() || null;
    const docLink = details.docLink.trim() || null;
    if ((section.participants ?? null) === participants && (section.docLink ?? null) === docLink) return;
    await tx.sections.put({ ...section, participants, docLink, updatedAt: ctx.clock.now().toISOString() });
    await record(ctx, tx, 'section.detailsChanged', 'section', section.id, today(ctx), { participants, docLink });
  });
}
