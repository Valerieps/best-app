import { describe, expect, it } from 'vitest';
import { positionBetween } from '../domain/position';
import { createTestContext } from '../test/fixtures';
import { closePendingDays } from './checkout';
import { changeBlockKind, createBlock, linkSectionToProject, unlinkSection, updateBlockText } from './notebook';
import { createProject, createProjectTask, renameProject } from './projects';
import { loadPendingTriages, loadProject } from './queries';

const SATURDAY = '2026-10-10';
const MONDAY = '2026-10-12';

let position = positionBetween(null, null);
function at() {
  position = positionBetween(position, null);
  return position;
}

describe('project tag on a line (ADR-066)', () => {
  it('links a task to the tagged project, over its section, and back when the tag goes', async () => {
    const { ctx, db } = createTestContext();
    const reforma = await createProject(ctx, 'Reforma');
    const data = await createProject(ctx, 'Data Studios');
    const first = await createBlock(ctx, { sectionId: null, position: at() }, 'Reunião');
    await linkSectionToProject(ctx, first.sectionId, reforma.id);
    const task = await createBlock(ctx, { sectionId: first.sectionId, position: at() }, '[] Mandar o orçamento #[Data Studios]');
    expect((await db.blocks.get(task.id))?.projectId).toBe(data.id);
    const other = await createBlock(ctx, { sectionId: first.sectionId, position: at() }, '[] Comprar o piso');
    expect((await db.blocks.get(other.id))?.projectId).toBe(reforma.id);

    await updateBlockText(ctx, task.id, 'Mandar o orçamento');
    expect((await db.blocks.get(task.id))?.projectId).toBe(reforma.id);
    await updateBlockText(ctx, task.id, 'Mandar o orçamento #data studios');
    // A loose bare word is not the bracketed name: "#data" alone names no project.
    expect((await db.blocks.get(task.id))?.projectId).toBe(reforma.id);
    await updateBlockText(ctx, task.id, 'Mandar o orçamento #[data studios]');
    expect((await db.blocks.get(task.id))?.projectId).toBe(data.id);
    const linked = await db.events.where('type').equals('block.linkedToProject').toArray();
    expect(linked.filter((event) => (event.data as { byTag?: true }).byTag)).toHaveLength(3);
  });

  it('keeps a tagged task in its project when the section is linked or unlinked', async () => {
    const { ctx, db } = createTestContext();
    const reforma = await createProject(ctx, 'Reforma');
    const app = await createProject(ctx, 'App');
    const task = await createBlock(ctx, { sectionId: null, position: at() }, '[] Subir o #App');
    expect((await db.blocks.get(task.id))?.projectId).toBe(app.id);
    await linkSectionToProject(ctx, task.sectionId, reforma.id);
    expect((await db.blocks.get(task.id))?.projectId).toBe(app.id);
    await linkSectionToProject(ctx, task.sectionId, app.id);
    await unlinkSection(ctx, task.sectionId, 'Quadro');
    expect((await db.blocks.get(task.id))?.projectId).toBe(app.id);
  });

  it('keeps the tag when a note becomes a task, and a task written on a project page goes to its tag', async () => {
    const { ctx, db } = createTestContext();
    const reforma = await createProject(ctx, 'Reforma');
    const app = await createProject(ctx, 'App');
    const note = await createBlock(ctx, { sectionId: null, position: at() }, 'Testar o #App');
    expect((await db.blocks.get(note.id))?.projectId).toBe(app.id);
    await changeBlockKind(ctx, note.id, 'task', 'Testar o #App');
    expect((await db.blocks.get(note.id))?.projectId).toBe(app.id);
    const onPage = await createProjectTask(ctx, reforma.id, 'Pedir ajuda no #App');
    expect((await db.blocks.get(onPage!.id))?.projectId).toBe(app.id);
  });

  it('shows a tagged note in the tagged project, not in its section project', async () => {
    const { ctx, reader, clock } = createTestContext(undefined, `${SATURDAY}T10:00:00`);
    const reforma = await createProject(ctx, 'Reforma');
    const app = await createProject(ctx, 'App');
    const plain = await createBlock(ctx, { sectionId: null, position: at() }, 'Orçar o piso');
    await createBlock(ctx, { sectionId: plain.sectionId, position: at() }, 'Ideia para o #App');
    await linkSectionToProject(ctx, plain.sectionId, reforma.id);
    clock.set(`${MONDAY}T09:00:00`);
    await closePendingDays(ctx, await loadPendingTriages(reader, MONDAY));
    const texts = async (id: string) => (await loadProject(reader, id))?.notes.flatMap((entry) => entry.notes.map((n) => n.text));
    expect(await texts(reforma.id)).toEqual(['Orçar o piso']);
    expect(await texts(app.id)).toEqual(['Ideia para o #App']);
  });

  it('rewrites the tags when a project is renamed', async () => {
    const { ctx, db } = createTestContext();
    const app = await createProject(ctx, 'App');
    const line = await createBlock(ctx, { sectionId: null, position: at() }, '[] Subir o #app e o `#App`');
    await renameProject(ctx, app.id, 'Best App');
    const saved = await db.blocks.get(line.id);
    expect(saved?.text).toBe('Subir o #[Best App] e o `#App`');
    expect(saved?.projectId).toBe(app.id);
  });
});
