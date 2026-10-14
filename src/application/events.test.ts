import { describe, expect, it } from 'vitest';
import type { DomainEvent } from '../domain/events';
import { createTestContext } from '../test/fixtures';
import { record } from './events';
import type { AppContext, StoreTransaction } from './ports';

describe('record', () => {
  it('stores the details, or none for a type without them', async () => {
    const { db, ctx } = createTestContext();
    await ctx.store.transaction(async (tx) => {
      await record(ctx, tx, 'task.postponed', 'block', 't1', '2026-10-11', { from: '2026-10-11', to: '2026-10-12', reason: 'dayNote' });
      await record(ctx, tx, 'task.reopened', 'block', 't1', '2026-10-11');
    });

    const events = await db.events.orderBy('at').toArray();
    expect(events.map((event) => [event.type, event.data])).toEqual([
      ['task.postponed', { from: '2026-10-11', to: '2026-10-12', reason: 'dayNote' }],
      ['task.reopened', {}],
    ]);
  });

  it('narrows the details by the type of the event', () => {
    const event = {
      id: 'e1',
      type: 'task.finished',
      entityType: 'block',
      entityId: 't1',
      at: '2026-10-11T12:00:00Z',
      day: '2026-10-11',
      data: { intendedDate: '2026-10-11', firstIntendedDate: null, postponeCount: 0, projectId: null },
    } as DomainEvent;
    expect(event.type === 'task.finished' ? event.data.intendedDate : null).toBe('2026-10-11');
  });
});

/**
 * Never runs: `npm run build` typechecks it, so each line fails the build if `record` starts
 * accepting details that do not match the type of the event.
 */
export async function recordRejectsWrongDetails(ctx: AppContext, tx: StoreTransaction): Promise<void> {
  // @ts-expect-error a misnamed field
  await record(ctx, tx, 'task.postponed', 'block', 't1', '2026-10-11', { from: null, too: null, reason: 'dayNote' });
  // @ts-expect-error a reason that does not exist
  await record(ctx, tx, 'task.postponed', 'block', 't1', '2026-10-11', { from: null, to: null, reason: 'whenever' });
  // @ts-expect-error details missing from a type that carries them
  await record(ctx, tx, 'project.created', 'project', 'p1', '2026-10-11');
  // @ts-expect-error details on a type that carries none
  await record(ctx, tx, 'task.reopened', 'block', 't1', '2026-10-11', { from: null });
}
