import { describe, expect, it } from 'vitest';
import { positionBetween } from '../domain/position';
import { createTestContext } from '../test/fixtures';
import { setDayPriority, setDeadline, setIntendedDate, setSectionDetails } from './dayTools';
import { createBlock, createSection, setTaskDone } from './notebook';
import { loadDayPriorities, loadDayTriage } from './queries';

const TODAY = '2026-10-11';

async function newTask(ctx: Parameters<typeof createBlock>[0], text: string) {
  return createBlock(ctx, { sectionId: null, position: positionBetween(null, null) + text }, `[] ${text}`);
}

describe('1b day tools', () => {
  it('a date set during the day takes the task out of the triage, and moving it later counts', async () => {
    const { ctx, reader, db } = createTestContext();
    const task = await newTask(ctx, 'Comprar presente');

    await setIntendedDate(ctx, task.id, '2026-10-14');
    expect(await db.blocks.get(task.id)).toMatchObject({ intendedDate: '2026-10-14', postponeCount: 0 });
    const triage = await loadDayTriage(reader, TODAY, TODAY);
    expect(triage.rows.filter((row) => row.type === 'task')).toEqual([]);

    await setIntendedDate(ctx, task.id, '2026-10-16');
    expect((await db.blocks.get(task.id))?.postponeCount).toBe(1);
  });

  it('deadline day makes the task a priority automatically', async () => {
    const { ctx, reader } = createTestContext();
    const chosen = await newTask(ctx, 'Escolhida');
    const due = await newTask(ctx, 'Vence hoje');
    await setDayPriority(ctx, chosen.id, true);
    await setDeadline(ctx, due.id, TODAY);

    const priorities = await loadDayPriorities(reader, TODAY);
    expect(priorities.map((p) => [p.task.text, p.automatic])).toEqual([
      ['Escolhida', false],
      ['Vence hoje', true],
    ]);
  });

  it('finished priorities leave the list, and demoting removes one', async () => {
    const { ctx, reader } = createTestContext();
    const a = await newTask(ctx, 'A');
    const b = await newTask(ctx, 'B');
    await setDayPriority(ctx, a.id, true);
    await setDayPriority(ctx, b.id, true);

    await setTaskDone(ctx, a.id, true);
    await setDayPriority(ctx, b.id, false);

    expect(await loadDayPriorities(reader, TODAY)).toEqual([]);
  });

  it('saves meeting participants and document link', async () => {
    const { ctx, db } = createTestContext();
    const meeting = await createSection(ctx, 'meeting');
    await setSectionDetails(ctx, meeting.id, { participants: ' Ana, Bruno ', docLink: 'go/ata' });
    expect(await db.sections.get(meeting.id)).toMatchObject({ participants: 'Ana, Bruno', docLink: 'go/ata' });
  });
});
