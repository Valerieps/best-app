import { describe, expect, it } from 'vitest';
import { positionBetween } from '../domain/position';
import { createTestContext } from '../test/fixtures';
import { closePendingDays } from './checkout';
import { createBlock, deleteKeptNote, linkSectionToProject, mergeKeptNote, splitKeptNote, updateBlockText } from './notebook';
import { createProject, createProjectNote } from './projects';
import { loadDayNote, loadPendingTriages, loadProject } from './queries';

const SATURDAY = '2026-10-10';
const MONDAY = '2026-10-12';

/** A project with a note written on Saturday and a task, both kept when the day closed. */
async function setup() {
  const { ctx, reader, clock, db } = createTestContext(undefined, `${SATURDAY}T10:00:00`);
  const project = await createProject(ctx, 'Reforma');
  const note = await createBlock(ctx, { sectionId: null, position: positionBetween(null, null) }, 'Orçar o piso');
  const task = await createBlock(ctx, { sectionId: note.sectionId, position: positionBetween('a', null) }, '[] Ligar para o pedreiro');
  await linkSectionToProject(ctx, note.sectionId, project.id);
  clock.set(`${MONDAY}T09:00:00`);
  await closePendingDays(ctx, await loadPendingTriages(reader, MONDAY));
  return { ctx, reader, db, project, note, task };
}

describe('notes on a project page', () => {
  it('shows the notes of the project sections once the day is closed', async () => {
    const { reader, project } = await setup();
    const view = await loadProject(reader, project.id);
    expect(view?.notes.map((entry) => entry.notes.map((note) => note.text))).toEqual([['Orçar o piso']]);
  });

  it('edits the text of a note from an older day', async () => {
    const { ctx, reader, project, note } = await setup();
    await updateBlockText(ctx, note.id, 'Orçar o piso e o rodapé');
    const view = await loadProject(reader, project.id);
    expect(view?.notes[0].notes[0].text).toBe('Orçar o piso e o rodapé');
  });

  it('deletes a note from an older day, keeping what it said in the history', async () => {
    const { ctx, reader, db, project, note } = await setup();
    await deleteKeptNote(ctx, note.id);
    expect(await db.blocks.get(note.id)).toBeUndefined();
    expect((await loadProject(reader, project.id))?.notes).toEqual([]);
    const events = await db.events.where('entityId').equals(note.id).toArray();
    expect(events.find((event) => event.type === 'block.deleted')?.data).toEqual({ kind: 'note', text: 'Orçar o piso' });
  });

  it('never deletes a task this way', async () => {
    const { ctx, db, task } = await setup();
    await deleteKeptNote(ctx, task.id);
    expect(await db.blocks.get(task.id)).toBeDefined();
  });
});

describe('notes written on a project page', () => {
  it('shows a new note on the project page at once, one note per line, and never in the day note', async () => {
    const { ctx, reader, project } = await setup();
    await createProjectNote(ctx, project.id, 'Medir a sala\n\nComprar tinta');
    const view = await loadProject(reader, project.id);
    expect(view?.notes[0].section.projectNote).toBe(true);
    expect(view?.notes[0].notes.map((note) => note.text)).toEqual(['Medir a sala', 'Comprar tinta']);
    const day = await loadDayNote(reader, MONDAY, MONDAY);
    expect(day.entries.some((entry) => entry.section?.projectNote)).toBe(false);
    expect(await loadPendingTriages(reader, MONDAY)).toEqual([]);
  });

  it('ignores an empty note', async () => {
    const { ctx, reader, project } = await setup();
    expect(await createProjectNote(ctx, project.id, '  \n ')).toBeNull();
    expect((await loadProject(reader, project.id))?.notes).toHaveLength(1);
  });

  it('splits and joins the lines of a kept note from an older day', async () => {
    const { ctx, reader, project, note } = await setup();
    const added = await splitKeptNote(ctx, note.id, 'Orçar o piso', 5, positionBetween(note.position, null));
    let view = await loadProject(reader, project.id);
    expect(view?.notes[0].notes.map((each) => each.text)).toEqual(['Orçar', ' o piso']);
    await mergeKeptNote(ctx, added!.id, ' o piso', note.id);
    view = await loadProject(reader, project.id);
    expect(view?.notes[0].notes.map((each) => each.text)).toEqual(['Orçar o piso']);
  });
});
