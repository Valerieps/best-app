import { describe, expect, it } from 'vitest';
import { addDays } from '../domain/day';
import { positionBetween } from '../domain/position';
import type { TaskDecision } from '../domain/triage';
import { createTestContext } from '../test/fixtures';
import { applyPlanning, applyTriage, closePendingDays, completeCheckout, defaultClosingDecisions } from './checkout';
import {
  changeBlockKind,
  convertSectionToProject,
  titleSectionWithProject,
  unlinkSection,
  renameSectionProject,
  createBlock,
  createSection,
  deleteBlock,
  linkSectionToProject,
  setSectionTitle,
  setTaskDone,
  splitBlock,
} from './notebook';
import { createProject } from './projects';
import {
  loadActiveTasks,
  loadDayNote,
  loadDayTriage,
  loadPendingDays,
  loadPendingTriages,
  loadWiki,
} from './queries';

const SATURDAY = '2026-10-10';
const SUNDAY = '2026-10-11';
const MONDAY = '2026-10-12';

function noDecisions() {
  return {
    tasks: new Map<string, TaskDecision>(),
    notes: new Map<string, 'wiki' | 'discarded'>(),
    whiteboards: new Map(),
  };
}

let position = positionBetween(null, null);
function nextPosition() {
  position = positionBetween(position, null);
  return position;
}

describe('day cycle', () => {
  it('captures without deciding: the first line creates the day general section', async () => {
    const { ctx, reader } = createTestContext();

    const task = await createBlock(ctx, { sectionId: null, position: nextPosition() }, '[] Pagar o IPTU');
    await createBlock(ctx, { sectionId: task.sectionId, position: nextPosition() }, 'Ideia solta');

    const note = await loadDayNote(reader, SUNDAY);
    expect(note.entries).toHaveLength(1);
    expect(note.entries[0].section?.kind).toBe('general');
    expect(note.entries[0].blocks.map((block) => [block.kind, block.text])).toEqual([
      ['task', 'Pagar o IPTU'],
      ['note', 'Ideia solta'],
    ]);
  });

  it('carries undone tasks to the next day and counts postponements from the second time', async () => {
    const { ctx, reader, clock, db } = createTestContext();
    const task = await createBlock(ctx, { sectionId: null, position: nextPosition() }, '[] Revisar a spec');

    // Sunday checkout: "dia seguinte" is the first intended date, not a postponement.
    let triage = await loadDayTriage(reader, SUNDAY, SUNDAY);
    await applyTriage(ctx, SUNDAY, defaultClosingDecisions(triage));
    await completeCheckout(ctx, SUNDAY);
    expect(await db.blocks.get(task.id)).toMatchObject({ intendedDate: MONDAY, postponeCount: 0, firstIntendedDate: MONDAY });

    // Monday: the task shows up at the top of the day note and is pending again.
    clock.set(`${MONDAY}T09:00:00`);
    const monday = await loadDayNote(reader, MONDAY);
    expect(monday.entries[0].section).toBeNull();
    expect(monday.entries[0].carried.map((block) => block.id)).toEqual([task.id]);

    triage = await loadDayTriage(reader, MONDAY, MONDAY);
    expect(triage.automatic).toEqual([expect.objectContaining({ type: 'rolledOver', section: null })]);
    await applyTriage(ctx, MONDAY, {
      ...noDecisions(),
      tasks: new Map([[task.id, { kind: 'schedule', date: '2026-10-13' } as const]]),
    });
    expect(await db.blocks.get(task.id)).toMatchObject({ intendedDate: '2026-10-13', postponeCount: 1 });
    expect(await db.events.where('type').equals('task.postponed').count()).toBe(1);
  });

  it('finishing a task during the day takes it out of the triage', async () => {
    const { ctx, reader } = createTestContext();
    const task = await createBlock(ctx, { sectionId: null, position: nextPosition() }, '[] Marcar dentista');

    await setTaskDone(ctx, task.id, true);

    const triage = await loadDayTriage(reader, SUNDAY, SUNDAY);
    expect(triage.rows).toEqual([]);
    expect(triage.automatic).toContainEqual(expect.objectContaining({ type: 'finishedDuringDay' }));
    expect(triage.automatic.some((item) => item.type === 'rolledOver')).toBe(false);
  });

  it('triages notes per section; project sections go to the wiki on their own', async () => {
    const { ctx, reader, db } = createTestContext();
    const studio = await createProject(ctx, 'Data Studios');
    const meeting = await createSection(ctx, 'meeting');
    await linkSectionToProject(ctx, meeting.id, studio.id);
    await createBlock(ctx, { sectionId: meeting.id, position: nextPosition() }, 'Painel novo sai na próxima sprint');
    const meetingTask = await createBlock(ctx, { sectionId: meeting.id, position: nextPosition() }, '[] Enviar o painel');
    const loose = await createBlock(ctx, { sectionId: null, position: nextPosition() }, 'Medidas da sala');

    expect(meetingTask.projectId).toBe(studio.id);
    const triage = await loadDayTriage(reader, SUNDAY, SUNDAY);
    expect(triage.automatic).toContainEqual(expect.objectContaining({ type: 'notesToWiki', project: studio }));

    await applyTriage(ctx, SUNDAY, {
      tasks: new Map([[meetingTask.id, { kind: 'schedule', date: MONDAY } as const]]),
      notes: new Map([
        [meeting.id, 'wiki'],
        [loose.sectionId, 'wiki'],
      ]),
      whiteboards: new Map([[loose.sectionId, { kind: 'leaveUnlinked' } as const]]),
    });

    const wiki = await loadWiki(reader);
    expect(wiki.map((entry) => [entry.project?.name ?? null, entry.notes.map((n) => n.text)])).toEqual(
      expect.arrayContaining([
        ['Data Studios', ['Painel novo sai na próxima sprint']],
        [null, ['Medidas da sala']],
      ]),
    );
    expect((await db.sections.get(loose.sectionId))?.whiteboardDecision).toBe('leftUnlinked');
  });

  it('converts a whiteboard into a project at checkout and links its tasks', async () => {
    const { ctx, db } = createTestContext();
    const task = await createBlock(ctx, { sectionId: null, position: nextPosition() }, '[] Comprar tinta');

    await applyTriage(ctx, SUNDAY, {
      ...noDecisions(),
      whiteboards: new Map([[task.sectionId, { kind: 'convert', name: 'Mudança' } as const]]),
    });

    const project = (await db.projects.toArray())[0];
    expect(project.name).toBe('Mudança');
    expect((await db.sections.get(task.sectionId))?.projectId).toBe(project.id);
    expect((await db.blocks.get(task.id))?.projectId).toBe(project.id);
  });

  it('adding a note after the checkout makes the section pending again', async () => {
    const { ctx, reader } = createTestContext();
    const note = await createBlock(ctx, { sectionId: null, position: nextPosition() }, 'Primeira nota');
    await applyTriage(ctx, SUNDAY, {
      ...noDecisions(),
      notes: new Map([[note.sectionId, 'wiki']]),
      whiteboards: new Map([[note.sectionId, { kind: 'leaveUnlinked' } as const]]),
    });
    expect((await loadDayTriage(reader, SUNDAY, SUNDAY)).rows).toEqual([]);

    await createBlock(ctx, { sectionId: note.sectionId, position: nextPosition() }, 'Nota depois do checkout');

    expect((await loadDayTriage(reader, SUNDAY, SUNDAY)).automatic).toEqual([
      expect.objectContaining({ type: 'notesToWiki', noteCount: 2 }),
    ]);
  });

  it('planning: adding sets the date, removing leaves the task without date and counts as postponed', async () => {
    const { ctx, db } = createTestContext();
    const a = await createBlock(ctx, { sectionId: null, position: nextPosition() }, '[] A');
    const b = await createBlock(ctx, { sectionId: a.sectionId, position: nextPosition() }, '[] B');
    await applyTriage(ctx, SUNDAY, {
      ...noDecisions(),
      tasks: new Map([[a.id, { kind: 'schedule', date: MONDAY } as const]]),
    });

    await applyPlanning(ctx, SUNDAY, [
      { taskId: a.id, date: null },
      { taskId: b.id, date: MONDAY },
    ]);

    expect(await db.blocks.get(a.id)).toMatchObject({ intendedDate: null, postponeCount: 1 });
    expect(await db.blocks.get(b.id)).toMatchObject({ intendedDate: MONDAY, postponeCount: 0 });
  });

  it('planning: moves a task already scheduled to another day', async () => {
    const { ctx, db } = createTestContext();
    const a = await createBlock(ctx, { sectionId: null, position: nextPosition() }, '[] A');
    await applyTriage(ctx, SUNDAY, {
      ...noDecisions(),
      tasks: new Map([[a.id, { kind: 'schedule', date: addDays(MONDAY, 2) } as const]]),
    });

    await applyPlanning(ctx, SUNDAY, [{ taskId: a.id, date: MONDAY }]);

    expect(await db.blocks.get(a.id)).toMatchObject({ intendedDate: MONDAY, status: 'active' });
  });

  it('archive and abandon take tasks out of the active list without deleting them', async () => {
    const { ctx, reader, db } = createTestContext();
    const a = await createBlock(ctx, { sectionId: null, position: nextPosition() }, '[] Arquivar');
    const b = await createBlock(ctx, { sectionId: a.sectionId, position: nextPosition() }, '[] Abandonar');

    await applyTriage(ctx, SUNDAY, {
      ...noDecisions(),
      tasks: new Map<string, TaskDecision>([
        [a.id, { kind: 'archive' }],
        [b.id, { kind: 'abandon' }],
      ]),
    });

    expect(await loadActiveTasks(reader)).toEqual([]);
    expect((await db.blocks.get(b.id))?.status).toBe('abandoned');
    expect((await loadDayNote(reader, SUNDAY)).entries[0].blocks).toEqual([]);
  });

  it('closes pending days: tasks lose their date and count as postponed, notes go to the wiki', async () => {
    const { ctx, reader, clock, db } = createTestContext(undefined, `${SATURDAY}T10:00:00`);
    const task = await createBlock(ctx, { sectionId: null, position: nextPosition() }, '[] Trocar o filtro');
    await createBlock(ctx, { sectionId: task.sectionId, position: nextPosition() }, 'Nota de sábado');

    clock.set(`${MONDAY}T09:00:00`);
    expect(await loadPendingDays(reader, MONDAY)).toEqual([SATURDAY]);

    await closePendingDays(ctx, await loadPendingTriages(reader, MONDAY));

    expect(await loadPendingDays(reader, MONDAY)).toEqual([]);
    expect(await db.blocks.get(task.id)).toMatchObject({ status: 'active', intendedDate: null, postponeCount: 1 });
    expect((await loadWiki(reader)).map((entry) => entry.notes[0].text)).toEqual(['Nota de sábado']);
    expect((await db.sections.get(task.sectionId))?.whiteboardDecision).toBe('leftUnlinked');
    expect(await db.days.get(SATURDAY)).toMatchObject({ day: SATURDAY });
  });

  it('only untriaged blocks written today can be deleted or change kind', async () => {
    const { ctx, clock, db } = createTestContext();
    const note = await createBlock(ctx, { sectionId: null, position: nextPosition() }, 'linha');
    await changeBlockKind(ctx, note.id, 'task', 'linha');
    expect((await db.blocks.get(note.id))?.kind).toBe('task');

    await applyTriage(ctx, SUNDAY, {
      ...noDecisions(),
      tasks: new Map([[note.id, { kind: 'schedule', date: MONDAY } as const]]),
    });
    clock.set(`${MONDAY}T09:00:00`);

    await expect(deleteBlock(ctx, note.id)).rejects.toThrow();
    await expect(changeBlockKind(ctx, note.id, 'note', 'linha')).rejects.toThrow();
    expect(await db.blocks.get(note.id)).toBeDefined();
  });

  it('Enter splits a line; a task line starts another task', async () => {
    const { ctx, reader } = createTestContext();
    const first = await createBlock(ctx, { sectionId: null, position: positionBetween(null, null) }, '[] Comprar pão e leite');

    const second = await splitBlock(ctx, first.id, 'Comprar pão e leite', 'Comprar pão'.length, {
      sectionId: first.sectionId,
      position: positionBetween(first.position, null),
    });

    expect(second).toMatchObject({ kind: 'task', text: ' e leite' });
    const [entry] = (await loadDayNote(reader, SUNDAY)).entries;
    expect(entry.blocks.map((block) => block.text)).toEqual(['Comprar pão', ' e leite']);
  });

  it('choosing a project in the title links the section and takes the project name as title', async () => {
    const { ctx, db } = createTestContext();
    const section = await createSection(ctx, 'general');
    const project = await createProject(ctx, 'Reforma da cozinha');
    await titleSectionWithProject(ctx, section.id, project.id);
    expect(await db.sections.get(section.id)).toMatchObject({ title: 'Reforma da cozinha', projectId: project.id });
  });

  it('choosing another project moves a linked section there, with its tasks', async () => {
    const { ctx, db } = createTestContext();
    const section = await createSection(ctx, 'general');
    const task = await createBlock(ctx, { sectionId: section.id, position: positionBetween(null, null) }, '[] Medir a parede');
    const kitchen = await createProject(ctx, 'Reforma da cozinha');
    const bathroom = await createProject(ctx, 'Reforma do banheiro');
    await titleSectionWithProject(ctx, section.id, kitchen.id);

    await titleSectionWithProject(ctx, section.id, bathroom.id);

    expect(await db.sections.get(section.id)).toMatchObject({ title: 'Reforma do banheiro', projectId: bathroom.id });
    expect((await db.blocks.get(task.id))?.projectId).toBe(bathroom.id);
  });

  it('creating a project from a linked section moves it there and renames it', async () => {
    const { ctx, db } = createTestContext();
    const section = await createSection(ctx, 'general');
    const kitchen = await createProject(ctx, 'Reforma da cozinha');
    await titleSectionWithProject(ctx, section.id, kitchen.id);

    await convertSectionToProject(ctx, section.id, 'Marcenaria');

    const moved = await db.sections.get(section.id);
    expect(moved?.title).toBe('Marcenaria');
    expect(moved?.projectId).not.toBe(kitchen.id);
  });

  it('a linked section can go back to being a whiteboard, and its tasks leave the project', async () => {
    const { ctx, db } = createTestContext();
    const section = await createSection(ctx, 'general');
    const task = await createBlock(ctx, { sectionId: section.id, position: positionBetween(null, null) }, '[] Medir a parede');
    const kitchen = await createProject(ctx, 'Reforma da cozinha');
    await titleSectionWithProject(ctx, section.id, kitchen.id);

    await unlinkSection(ctx, section.id, 'Ideias de casa');

    expect(await db.sections.get(section.id)).toMatchObject({ title: 'Ideias de casa', projectId: null });
    expect((await db.blocks.get(task.id))?.projectId).toBeNull();
  });

  it('renaming the project of a section retitles every linked section that still has the old name', async () => {
    const { ctx, db } = createTestContext();
    const kitchen = await createProject(ctx, 'Reforma da cozinha');
    const first = await createSection(ctx, 'general');
    const second = await createSection(ctx, 'general');
    const renamed = await createSection(ctx, 'general');
    for (const section of [first, second, renamed]) await titleSectionWithProject(ctx, section.id, kitchen.id);
    await setSectionTitle(ctx, renamed.id, 'Orçamentos');

    await renameSectionProject(ctx, first.id, ' Cozinha nova ');

    expect((await db.projects.get(kitchen.id))?.name).toBe('Cozinha nova');
    expect((await db.sections.get(first.id))?.title).toBe('Cozinha nova');
    expect((await db.sections.get(second.id))?.title).toBe('Cozinha nova');
    expect((await db.sections.get(renamed.id))?.title).toBe('Orçamentos');
  });

  it('renaming leaves a whiteboard, and an empty name, untouched', async () => {
    const { ctx, db } = createTestContext();
    const kitchen = await createProject(ctx, 'Reforma da cozinha');
    const linked = await createSection(ctx, 'general');
    await titleSectionWithProject(ctx, linked.id, kitchen.id);
    const whiteboard = await createSection(ctx, 'general');

    await renameSectionProject(ctx, linked.id, '  ');
    await renameSectionProject(ctx, whiteboard.id, 'Outro');

    expect((await db.projects.get(kitchen.id))?.name).toBe('Reforma da cozinha');
    expect((await db.sections.get(linked.id))?.title).toBe('Reforma da cozinha');
    expect((await db.sections.get(whiteboard.id))?.title).toBeNull();
  });

  it('a whiteboard can become a project at any time, named after the section', async () => {
    const { ctx, db } = createTestContext();
    const section = await createSection(ctx, 'general');
    await convertSectionToProject(ctx, section.id, 'Data Studios');
    expect(await db.sections.get(section.id)).toMatchObject({ title: 'Data Studios', projectId: expect.any(String) });
  });
});
