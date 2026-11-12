import { describe, expect, it } from 'vitest';
import { readAllTables } from '../infrastructure/backupRepository';
import { createTestContext } from '../test/fixtures';
import { computeImportLoss } from './backup';
import { addFocusProject } from './focusProjects';
import { createBlock, createSection, linkSectionToProject } from './notebook';
import { createProject, createProjectTask, deleteProject, setProjectFinished } from './projects';

describe('deleteProject', () => {
  it('erases the project, its page and its whole history', async () => {
    const { ctx, db } = createTestContext();
    const project = await createProject(ctx, 'Sem querer');
    const keep = await createProject(ctx, 'Fica');
    await addFocusProject(ctx, project.id);
    await addFocusProject(ctx, keep.id);
    const pageTask = await createProjectTask(ctx, project.id, 'Tarefa da página');
    await setProjectFinished(ctx, project.id, true);

    await deleteProject(ctx, project.id);

    expect(await db.projects.get(project.id)).toBeUndefined();
    expect(await db.blocks.get(pageTask!.id)).toBeUndefined();
    expect(await db.sections.where('projectId').equals(project.id).count()).toBe(0);
    expect((await db.priorities.get('focusProjects'))?.itemIds).toEqual([keep.id]);
    const left = await db.events.where('entityId').anyOf([project.id, pageTask!.id, pageTask!.sectionId]).toArray();
    expect(left.map((event) => event.type)).toEqual(['project.deleted']);
    expect(await db.projects.get(keep.id)).toBeDefined();
    expect(await db.events.where('entityId').equals(keep.id).count()).toBeGreaterThan(0);
  });

  it('keeps what was written in a day note, only unlinked', async () => {
    const { ctx, db } = createTestContext();
    const project = await createProject(ctx, 'Casa');
    const section = await createSection(ctx, 'general');
    await linkSectionToProject(ctx, section.id, project.id);
    const block = await createBlock(ctx, { sectionId: section.id, position: 'a0' }, '[] Pintar a parede');

    await deleteProject(ctx, project.id);

    expect(await db.sections.get(section.id)).toMatchObject({ projectId: null });
    expect(await db.blocks.get(block.id)).toMatchObject({ projectId: null });
  });

  it('is not a loss for the automatic backup, which still holds the old file', async () => {
    const { ctx, db } = createTestContext();
    const project = await createProject(ctx, 'Sem querer');
    await createProjectTask(ctx, project.id, 'Tarefa');
    const before = await readAllTables(db);
    await deleteProject(ctx, project.id);
    const loss = computeImportLoss(before, await readAllTables(db));
    expect(loss.hasLoss).toBe(false);
    const tombstone = (await db.events.where('type').equals('project.deleted').toArray())[0];
    expect(JSON.stringify(tombstone)).not.toContain('Sem querer');
  });

  it('does nothing for an unknown project', async () => {
    const { ctx } = createTestContext();
    await expect(deleteProject(ctx, 'nope')).resolves.toBeUndefined();
  });
});
