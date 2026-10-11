import { describe, expect, it } from 'vitest';
import { positionBetween } from '../domain/position';
import { createTestContext } from '../test/fixtures';
import { answerReminder, answerWarmupItem, registerThoughts, snoozeReminder, startDay, startExecution } from './dayOpening';
import { createBlock } from './notebook';
import { loadDayNote, loadDayOpening, loadDayTriage, loadDueReminders } from './queries';
import { setActiveDays, setWarmupItems } from './settings';

const MONDAY = '2026-10-12';
const items = [
  { id: 'agua', text: 'Beber água' },
  { id: 'agenda', text: 'Olhar a agenda' },
];

describe('section 3: opening the day', () => {
  it('without a warm-up checklist the day opens straight on the note', async () => {
    const { reader } = createTestContext(undefined, `${MONDAY}T08:00:00`);
    expect((await loadDayOpening(reader, MONDAY)).stage).toBe('execution');
  });

  it('goes through "Iniciar Dia", the warm up and the dashboard', async () => {
    const { ctx, reader } = createTestContext(undefined, `${MONDAY}T08:00:00`);
    await setWarmupItems(ctx, items);
    expect((await loadDayOpening(reader, MONDAY)).stage).toBe('start');

    await startDay(ctx);
    expect((await loadDayOpening(reader, MONDAY)).stage).toBe('warmup');

    await answerWarmupItem(ctx, items[0], 'done');
    await answerWarmupItem(ctx, items[1], 'skipped');
    expect((await loadDayOpening(reader, MONDAY)).stage).toBe('dashboard');

    await startExecution(ctx);
    expect((await loadDayOpening(reader, MONDAY)).stage).toBe('execution');
  });

  it('"perguntar de novo às" creates a reminder that comes back at that time', async () => {
    const { ctx, reader, db } = createTestContext(undefined, `${MONDAY}T08:00:00`);
    await answerWarmupItem(ctx, items[1], 'later', new Date(`${MONDAY}T10:00:00`));

    expect(await loadDueReminders(reader, new Date(`${MONDAY}T09:00:00`))).toEqual([]);
    const [due] = await loadDueReminders(reader, new Date(`${MONDAY}T10:30:00`));
    expect(due).toMatchObject({ text: 'Olhar a agenda', status: 'pending' });

    await snoozeReminder(ctx, due.id, new Date(`${MONDAY}T15:00:00`));
    expect(await loadDueReminders(reader, new Date(`${MONDAY}T10:30:00`))).toEqual([]);

    await answerReminder(ctx, due.id, 'done');
    expect((await db.reminders.get(due.id))?.status).toBe('done');
    expect((await db.days.get(MONDAY))?.warmup).toEqual({ agenda: 'done' });
  });

  it('"registrar pensamentos" goes into a general section of the day note', async () => {
    const { ctx, reader } = createTestContext(undefined, `${MONDAY}T08:00:00`);
    await registerThoughts(ctx, 'Ideia um\n\n[] Ligar para o banco');
    const [entry] = (await loadDayNote(reader, MONDAY)).entries;
    expect(entry.section?.title).toBe('Pensamentos');
    expect(entry.blocks.map((block) => [block.kind, block.text])).toEqual([
      ['note', 'Ideia um'],
      ['task', 'Ligar para o banco'],
    ]);
  });

  it('on Friday, "dia seguinte" is Monday when the weekend is off', async () => {
    const friday = '2026-10-16';
    const { ctx, reader } = createTestContext(undefined, `${friday}T17:00:00`);
    await setActiveDays(ctx, [1, 2, 3, 4, 5]);
    await createBlock(ctx, { sectionId: null, position: positionBetween(null, null) }, '[] Tarefa');
    expect((await loadDayTriage(reader, friday, friday)).nextDay).toBe('2026-10-19');
  });
});
