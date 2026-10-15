import { describe, expect, it } from 'vitest';
import { positionBetween } from '../domain/position';
import { createTestContext } from '../test/fixtures';
import { closePendingDays } from './checkout';
import { createBlock, deleteKeptNote, linkSectionToProject, updateBlockText } from './notebook';
import { createProject } from './projects';
import { loadPendingTriages, loadProject } from './queries';

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
