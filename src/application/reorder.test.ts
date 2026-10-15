import { describe, expect, it } from 'vitest';
import { CARRIED_PART, FIRST_PART } from '../domain/order';
import { setIntendedDate } from './dayTools';
import { completeCheckout } from './checkout';
import { createBlock, createSection, createSectionAfter, reorderCarriedTasks, reorderDayParts, reorderSectionLines } from './notebook';
import { loadDayNote, loadDayTriage } from './queries';
import { section, task } from '../test/builders';
import { createTestContext } from '../test/fixtures';

const TODAY = '2026-10-11';

describe('reordering lines (request 2)', () => {
  it('moves a line inside its section by writing only that line, with no event', async () => {
    const { ctx, reader, db } = createTestContext();
    const a = await createBlock(ctx, { sectionId: null, position: 'a' }, 'primeira');
    const b = await createBlock(ctx, { sectionId: a.sectionId, position: 'b' }, 'segunda');
    const c = await createBlock(ctx, { sectionId: a.sectionId, position: 'c' }, 'terceira');
    const events = await db.events.count();

    await reorderSectionLines(ctx, [c.id, a.id, b.id], c.id);

    const [entry] = (await loadDayNote(reader, TODAY)).entries;
    expect(entry.blocks.map((block) => block.text)).toEqual(['terceira', 'primeira', 'segunda']);
    expect((await db.blocks.get(a.id))?.position).toBe('a');
    expect(await db.events.count()).toBe(events);
  });

  it('does not mix lines of different sections', async () => {
    const { ctx, db } = createTestContext();
    const a = await createBlock(ctx, { sectionId: null, position: 'a' }, 'primeira');
    const other = section({ day: TODAY });
    await db.sections.put(other);
    const b = task(other.id, 'outra', { position: 'b' });
    await db.blocks.put(b);

    await reorderSectionLines(ctx, [b.id, a.id], b.id);

    expect((await db.blocks.get(b.id))?.position).toBe('b');
  });

  it('orders the carried tasks for the day, in the note and in the checkout', async () => {
    const { ctx, reader, db } = createTestContext();
    const origin = section({ day: '2026-10-10', notesDestination: 'wiki' });
    const first = task(origin.id, 'primeira', { createdAt: '2026-10-10T08:00:00Z', intendedDate: TODAY });
    const second = task(origin.id, 'segunda', { createdAt: '2026-10-10T09:00:00Z', intendedDate: TODAY });
    await db.sections.put(origin);
    await db.blocks.bulkPut([first, second]);

    await reorderCarriedTasks(ctx, TODAY, [second.id, first.id], second.id);

    const [entry] = (await loadDayNote(reader, TODAY)).entries;
    expect(entry.carried.map((block) => block.text)).toEqual(['segunda', 'primeira']);
    const triage = await loadDayTriage(reader, TODAY, TODAY);
    const rows = triage.open.map((item) => item.task.text);
    expect(rows).toEqual(['segunda', 'primeira']);
  });

  it('forgets the order once the task goes to another day', async () => {
    const { ctx, reader, db } = createTestContext();
    const origin = section({ day: '2026-10-10', notesDestination: 'wiki' });
    const first = task(origin.id, 'primeira', { createdAt: '2026-10-10T08:00:00Z', intendedDate: TODAY });
    const second = task(origin.id, 'segunda', { createdAt: '2026-10-10T09:00:00Z', intendedDate: TODAY });
    await db.sections.put(origin);
    await db.blocks.bulkPut([first, second]);
    await reorderCarriedTasks(ctx, TODAY, [second.id, first.id], second.id);

    await setIntendedDate(ctx, second.id, '2026-10-12');
    await setIntendedDate(ctx, first.id, '2026-10-12');

    const [entry] = (await loadDayNote(reader, '2026-10-12')).entries;
    expect(entry.carried.map((block) => block.text)).toEqual(['primeira', 'segunda']);
  });
});

describe('reordering the parts of a day', () => {
  it('saves the order for the day, and the checkout follows it', async () => {
    const { ctx, reader, db } = createTestContext();
    const origin = section({ day: '2026-10-10', notesDestination: 'wiki' });
    const carried = task(origin.id, 'de ontem', { intendedDate: TODAY });
    await db.sections.put(origin);
    await db.blocks.put(carried);
    const first = await createBlock(ctx, { sectionId: null, position: 'a' }, '[] na primeira');
    const meeting = await createSection(ctx, 'meeting');
    await createBlock(ctx, { sectionId: meeting.id, position: 'a' }, '[] na reunião');
    const events = await db.events.count();

    await reorderDayParts(ctx, TODAY, [meeting.id, CARRIED_PART, first.sectionId]);

    expect((await loadDayNote(reader, TODAY)).sectionOrder).toEqual([meeting.id, CARRIED_PART, first.sectionId]);
    const triage = await loadDayTriage(reader, TODAY, TODAY);
    const rows = triage.open.map((item) => item.task.text);
    expect(rows).toEqual(['na reunião', 'de ontem', 'na primeira']);
    expect(await db.events.count()).toBe(events);
  });

  it('keeps the place of the first section moved before anything was written in it', async () => {
    const { ctx, db } = createTestContext();
    const meeting = await createSection(ctx, 'meeting');
    await reorderDayParts(ctx, TODAY, [meeting.id, FIRST_PART]);

    const block = await createBlock(ctx, { sectionId: null, position: 'a', newSectionId: 'first-section' }, 'oi');

    expect(block.sectionId).toBe('first-section');
    expect((await db.days.get(TODAY))?.sectionOrder).toEqual([meeting.id, 'first-section']);
  });

  it('keeps the order after the checkout', async () => {
    const { ctx, db } = createTestContext();
    const meeting = await createSection(ctx, 'meeting');
    await reorderDayParts(ctx, TODAY, [meeting.id, FIRST_PART]);

    await completeCheckout(ctx, TODAY);

    expect(await db.days.get(TODAY)).toMatchObject({ sectionOrder: [meeting.id, FIRST_PART] });
  });

  it('creates a section between two parts, in the place chosen', async () => {
    const { ctx, reader } = createTestContext();
    const first = await createSection(ctx, 'general');
    const last = await createSection(ctx, 'general');

    const meeting = await createSectionAfter(ctx, 'meeting', [first.id, last.id], 0);

    expect(meeting).toMatchObject({ kind: 'meeting', day: TODAY });
    expect((await loadDayNote(reader, TODAY)).sectionOrder).toEqual([first.id, meeting.id, last.id]);
  });

  it('keeps the first section that exists only on screen in its place', async () => {
    const { ctx, db } = createTestContext();
    const meeting = await createSection(ctx, 'meeting');

    const general = await createSectionAfter(ctx, 'general', [FIRST_PART, meeting.id], 0);
    await createBlock(ctx, { sectionId: null, position: 'a', newSectionId: 'first-section' }, 'oi');

    expect((await db.days.get(TODAY))?.sectionOrder).toEqual(['first-section', general.id, meeting.id]);
  });
});
