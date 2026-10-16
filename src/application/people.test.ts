import { describe, expect, it } from 'vitest';
import { positionBetween } from '../domain/position';
import { createTestContext } from '../test/fixtures';
import { applyTriage, closePendingDays, defaultClosingDecisions } from './checkout';
import { setIntendedDate } from './dayTools';
import { changeBlockKind, createBlock, setTaskDone, setTaskWaiting } from './notebook';
import { createPerson, deletePerson, ensurePeople, mergePeople, renamePerson, setPersonArchived } from './people';
import { loadActiveTasks, loadDayNote, loadDayTriage, loadPeople, loadPeopleView, loadPendingTriages, loadPersonView } from './queries';

const SUNDAY = '2026-10-11';
const MONDAY = '2026-10-12';

let position = positionBetween(null, null);
function at() {
  position = positionBetween(position, null);
  return position;
}

describe('people', () => {
  it('creates only the people nobody has yet, ignoring case', async () => {
    const { ctx, reader } = createTestContext();
    await createPerson(ctx, 'Ana');
    const created = await ensurePeople(ctx, ['ana', 'Paula', 'Paula', 'dois nomes']);
    expect(created.map((person) => person.name)).toEqual(['Paula']);
    expect((await loadPeople(reader)).map((person) => person.name).sort()).toEqual(['Ana', 'Paula']);
  });

  it('renames a person in every line that cites them, and refuses a name taken by someone else', async () => {
    const { ctx, db } = createTestContext();
    const ana = await createPerson(ctx, 'Ana');
    await createPerson(ctx, 'Paula');
    const line = await createBlock(ctx, { sectionId: null, position: at() }, '[] Mandar para a @ana o relatório');
    expect(await renamePerson(ctx, ana.id, 'Aninha')).toEqual({ ok: true });
    expect((await db.blocks.get(line.id))?.text).toBe('Mandar para a @Aninha o relatório');
    expect(await renamePerson(ctx, ana.id, 'paula')).toMatchObject({ ok: false, reason: 'taken', other: { name: 'Paula' } });
    expect(await renamePerson(ctx, ana.id, 'Ana Maria')).toEqual({ ok: false, reason: 'invalid' });
    expect(await db.events.where('type').equals('person.renamed').count()).toBe(1);
  });

  it('merges two people: the lines cite the one that stays', async () => {
    const { ctx, db, reader } = createTestContext();
    const typo = await createPerson(ctx, 'Rafel');
    const rafael = await createPerson(ctx, 'Rafael');
    const line = await createBlock(ctx, { sectionId: null, position: at() }, 'O @Rafel mandou o PR');
    await mergePeople(ctx, typo.id, rafael.id);
    expect((await db.blocks.get(line.id))?.text).toBe('O @Rafael mandou o PR');
    expect(await db.people.get(typo.id)).toMatchObject({ status: 'merged', mergedInto: rafael.id });
    expect(await loadPersonView(reader, typo.id, SUNDAY)).toBeNull();
    expect((await loadPersonView(reader, rafael.id, SUNDAY))?.mentions).toHaveLength(1);
  });

  it('archives, brings back and deletes a person, keeping the text of the lines', async () => {
    const { ctx, db, reader } = createTestContext();
    const ana = await createPerson(ctx, 'Ana');
    const line = await createBlock(ctx, { sectionId: null, position: at() }, 'A @Ana ligou');
    await setPersonArchived(ctx, ana.id, true);
    expect((await loadPeopleView(reader, SUNDAY)).archived.map((each) => each.person.name)).toEqual(['Ana']);
    await setPersonArchived(ctx, ana.id, false);
    expect((await loadPeopleView(reader, SUNDAY)).active.map((each) => each.person.name)).toEqual(['Ana']);
    await deletePerson(ctx, ana.id);
    expect(await db.people.count()).toBe(0);
    expect((await db.blocks.get(line.id))?.text).toBe('A @Ana ligou');
    expect(await db.events.where('type').equals('person.deleted').count()).toBe(1);
  });
});

describe('waiting tasks', () => {
  it('"[a] " creates a task someone owes me, out of the active tasks', async () => {
    const { ctx, reader } = createTestContext();
    await createPerson(ctx, 'Ana');
    const waiting = await createBlock(ctx, { sectionId: null, position: at() }, '[a] @Ana mandar o contrato');
    const mine = await createBlock(ctx, { sectionId: waiting.sectionId, position: at() }, '[] Ler o contrato');
    expect(waiting).toMatchObject({ kind: 'task', waiting: true, text: '@Ana mandar o contrato' });
    expect((await loadActiveTasks(reader)).map((item) => item.task.id)).toEqual([mine.id]);
    const view = await loadPeopleView(reader, SUNDAY);
    expect(view.waiting.map((item) => [item.task.id, item.person?.name])).toEqual([[waiting.id, 'Ana']]);
  });

  it('turns a note into a waiting task, and a task into waiting and back', async () => {
    const { ctx, db } = createTestContext();
    const line = await createBlock(ctx, { sectionId: null, position: at() }, 'Contrato da @Ana');
    await changeBlockKind(ctx, line.id, 'task', 'Contrato da @Ana', true);
    expect(await db.blocks.get(line.id)).toMatchObject({ kind: 'task', waiting: true });
    await setTaskWaiting(ctx, line.id, false);
    expect((await db.blocks.get(line.id))?.waiting).toBeUndefined();
    expect(await db.events.where('type').equals('task.waitingChanged').count()).toBe(2);
  });

  it('asks at the closing when it has no follow-up date, suggesting to leave it as it is', async () => {
    const { ctx, db, reader } = createTestContext();
    const waiting = await createBlock(ctx, { sectionId: null, position: at() }, '[a] @Ana mandar o contrato');
    const triage = await loadDayTriage(reader, SUNDAY, SUNDAY);
    expect(triage.rows).toEqual([expect.objectContaining({ task: expect.objectContaining({ id: waiting.id }), suggestion: { kind: 'keep' } })]);
    expect(triage.automatic.some((item) => item.type === 'rolledOver')).toBe(false);

    await applyTriage(ctx, SUNDAY, defaultClosingDecisions(triage));
    expect(await db.blocks.get(waiting.id)).toMatchObject({ status: 'active', intendedDate: null, lastTriagedDay: SUNDAY, postponeCount: 0 });
    expect((await loadDayTriage(reader, SUNDAY, SUNDAY)).rows).toEqual([]);
  });

  it('shows up on the follow-up date, and moving that date is no postponement', async () => {
    const { ctx, db, reader, clock } = createTestContext();
    const waiting = await createBlock(ctx, { sectionId: null, position: at() }, '[a] @Ana mandar o contrato');
    await setIntendedDate(ctx, waiting.id, MONDAY);
    expect((await loadDayTriage(reader, SUNDAY, SUNDAY)).rows).toEqual([]);

    clock.set(`${MONDAY}T09:00:00`);
    const monday = await loadDayNote(reader, MONDAY);
    expect(monday.entries[0].carried.map((block) => block.id)).toEqual([waiting.id]);
    await setIntendedDate(ctx, waiting.id, '2026-10-14');
    expect(await db.blocks.get(waiting.id)).toMatchObject({ intendedDate: '2026-10-14', postponeCount: 0 });
    expect(await db.events.where('type').equals('task.postponed').count()).toBe(0);
  });

  it('is left as it is by "Fechar dias pendentes", without counting a postponement', async () => {
    const { ctx, db, reader, clock } = createTestContext();
    const waiting = await createBlock(ctx, { sectionId: null, position: at() }, '[a] @Ana mandar o contrato');
    clock.set(`${MONDAY}T09:00:00`);
    await closePendingDays(ctx, await loadPendingTriages(reader, MONDAY));
    expect(await db.blocks.get(waiting.id)).toMatchObject({ status: 'active', postponeCount: 0, lastTriagedDay: SUNDAY });
  });

  it('is concluded like any task, marked as waiting in the history', async () => {
    const { ctx, db } = createTestContext();
    const waiting = await createBlock(ctx, { sectionId: null, position: at() }, '[a] @Ana mandar o contrato');
    await setTaskDone(ctx, waiting.id, true);
    const [finished] = await db.events.where('type').equals('task.finished').toArray();
    expect(finished.data).toMatchObject({ waiting: true });
  });
});
