import { describe, expect, it } from 'vitest';
import { positionBetween } from '../domain/position';
import { createTestContext } from '../test/fixtures';
import {
  keepProjectsSeparate,
  mergeProjects,
  planForgottenTasks,
  resolveForgottenTasks,
  resolveWhiteboardGroup,
} from './assistants';
import { createBlock, createSection, linkSectionToProject, setSectionTitle } from './notebook';
import { createProject, createProjectTask } from './projects';
import { loadCleanup, loadCleanupDashboard } from './queries';
import { applyTriage } from './checkout';
import { setCleanupLimits, setForgottenTaskDays } from './settings';

async function unlinkedSection(ctx: Parameters<typeof createSection>[0], title: string) {
  const section = await createSection(ctx, 'general');
  await setSectionTitle(ctx, section.id, title);
  const task = await createBlock(ctx, { sectionId: section.id, position: positionBetween(null, null) }, `[] tarefa de ${title}`);
  await applyTriage(ctx, '2026-10-11', {
    tasks: new Map(),
    notes: new Map(),
    whiteboards: new Map([[section.id, { kind: 'leaveUnlinked' } as const]]),
  });
  return { section, task };
}

describe('cleanup assistants', () => {
  it('converts repeated whiteboard titles into one project with their tasks', async () => {
    const { ctx, reader, db } = createTestContext();
    const first = await unlinkedSection(ctx, 'Mudança');
    const second = await unlinkedSection(ctx, 'mudança');

    const cleanup = await loadCleanup(reader);
    expect(cleanup.whiteboards).toHaveLength(1);
    const [group] = cleanup.whiteboards;
    await resolveWhiteboardGroup(ctx, group.sections.map((s) => s.id), group.suggestion);

    const projects = await db.projects.toArray();
    expect(projects.map((p) => p.name)).toEqual(['mudança']);
    expect((await db.blocks.get(first.task.id))?.projectId).toBe(projects[0].id);
    expect((await db.blocks.get(second.task.id))?.projectId).toBe(projects[0].id);
    expect((await loadCleanup(reader)).whiteboards).toEqual([]);
  });

  it('"deixar como está" stops suggesting the section', async () => {
    const { ctx, reader } = createTestContext();
    const { section } = await unlinkedSection(ctx, 'Leituras');
    await resolveWhiteboardGroup(ctx, [section.id], { kind: 'keep' });
    expect((await loadCleanup(reader)).whiteboards).toEqual([]);
  });

  it('merges duplicate projects, moving sections and tasks', async () => {
    const { ctx, reader, db, clock } = createTestContext();
    const keep = await createProject(ctx, 'Data Studios');
    clock.set('2026-10-11T13:00:00');
    const duplicate = await createProject(ctx, 'DataStudios');
    const section = await createSection(ctx, 'meeting');
    await linkSectionToProject(ctx, section.id, duplicate.id);
    const task = await createBlock(ctx, { sectionId: section.id, position: positionBetween(null, null) }, '[] Enviar painel');

    const [group] = (await loadCleanup(reader)).duplicates;
    expect(group.keep.id).toBe(keep.id);
    await mergeProjects(ctx, group.keep.id, group.projects.map((p) => p.id));

    expect((await db.sections.get(section.id))?.projectId).toBe(keep.id);
    expect((await db.blocks.get(task.id))?.projectId).toBe(keep.id);
    expect(await db.projects.get(duplicate.id)).toMatchObject({ status: 'merged', mergedInto: keep.id });
    expect((await loadCleanup(reader)).duplicates).toEqual([]);
  });

  it('"manter separados" stops suggesting the pair', async () => {
    const { ctx, reader } = createTestContext();
    const a = await createProject(ctx, 'Data Studios');
    const b = await createProject(ctx, 'Data Studio');
    await keepProjectsSeparate(ctx, [a.id, b.id]);
    expect((await loadCleanup(reader)).duplicates).toEqual([]);
  });
});

describe('forgotten tasks', () => {
  it('abandons a task', async () => {
    const { ctx, db } = createTestContext();
    const { task } = await unlinkedSection(ctx, 'Leituras');
    await resolveForgottenTasks(ctx, new Map([[task.id, 'abandon']]));
    expect(await db.blocks.get(task.id)).toMatchObject({ status: 'abandoned', closedAt: expect.any(String) });
  });

  it('converts a task into a note in the section where it was written', async () => {
    const { ctx, db } = createTestContext();
    const { section, task } = await unlinkedSection(ctx, 'Leituras');
    await resolveForgottenTasks(ctx, new Map([[task.id, 'note']]));
    expect(await db.blocks.get(task.id)).toMatchObject({ kind: 'note', status: null, sectionId: section.id, projectId: null });
  });

  it('turns a task of the project page into a note on that page, so it stays in the project', async () => {
    const { ctx, db } = createTestContext();
    const project = await createProject(ctx, 'Casa');
    const task = (await createProjectTask(ctx, project.id, 'Trocar a lâmpada'))!;
    await resolveForgottenTasks(ctx, new Map([[task.id, 'note']]));

    const note = (await db.blocks.get(task.id))!;
    expect(note).toMatchObject({ kind: 'note', status: null });
    expect(await db.sections.get(note.sectionId)).toMatchObject({ projectNote: true, projectId: project.id });
  });

  it('dates, finishes and abandons the tasks of the board, without triaging them', async () => {
    const { ctx, db } = createTestContext();
    const project = await createProject(ctx, 'Casa');
    const a = (await createProjectTask(ctx, project.id, 'A'))!;
    const b = (await createProjectTask(ctx, project.id, 'B'))!;
    const c = (await createProjectTask(ctx, project.id, 'C'))!;
    const d = (await createProjectTask(ctx, project.id, 'D'))!;
    await planForgottenTasks(
      ctx,
      new Map([
        [a.id, { kind: 'schedule', date: '2026-10-13' }],
        [b.id, { kind: 'finish' }],
        [c.id, { kind: 'abandon' }],
        [d.id, { kind: 'keep' }],
      ]),
      [],
    );
    expect(await db.blocks.get(a.id)).toMatchObject({ status: 'active', intendedDate: '2026-10-13', postponeCount: 0, lastTriagedDay: null });
    expect((await db.blocks.get(b.id))?.status).toBe('done');
    expect((await db.blocks.get(c.id))?.status).toBe('abandoned');
    expect(await db.blocks.get(d.id)).toMatchObject({ status: 'active', intendedDate: null });
  });
});

describe('cleanup dashboard', () => {
  it('colors each assistant by how long its oldest item has waited, most urgent first', async () => {
    const { ctx, reader } = createTestContext();
    await createProject(ctx, 'Data Studios');
    await createProject(ctx, 'DataStudios');
    await unlinkedSection(ctx, 'Leituras');

    // Everything is from 11/10. Two days later only the day left open is yellow; the section and
    // the repeat are still green. Forty days later, the open day is red and the others orange.
    expect((await loadCleanupDashboard(reader, '2026-10-13')).cards.map((card) => [card.id, card.count, card.status])).toEqual([
      ['pendingDays', 1, 1],
      ['whiteboards', 1, 0],
      ['duplicates', 1, 0],
      ['forgottenTasks', 0, 0],
    ]);
    // The task of the section is forgotten by then, but one task alone stays green.
    const later = await loadCleanupDashboard(reader, '2026-11-20');
    expect(later.cards.map((card) => [card.id, card.ageInDays, card.status])).toEqual([
      ['pendingDays', 40, 3],
      ['whiteboards', 40, 2],
      ['duplicates', 40, 2],
      ['forgottenTasks', 40, 0],
    ]);
  });

  it('uses the limits saved in the settings, in days, and can go back to the defaults', async () => {
    const { ctx, reader } = createTestContext();
    await createProject(ctx, 'Data Studios');
    await createProject(ctx, 'DataStudios');
    const statusOf = async () => (await loadCleanupDashboard(reader, '2026-10-12')).cards.find((c) => c.id === 'duplicates')!.status;

    await setCleanupLimits(ctx, 'duplicates', [1, 1, 1]);
    expect(await statusOf()).toBe(3);
    await setCleanupLimits(ctx, 'whiteboards', [2, 3, 4]);
    expect((await reader.settings())?.cleanupAgeLimits).toEqual({ duplicates: [1, 1, 1], whiteboards: [2, 3, 4] });

    await setCleanupLimits(ctx, 'duplicates', null);
    expect(await statusOf()).toBe(0);
    expect((await reader.settings())?.cleanupAgeLimits).toEqual({ whiteboards: [2, 3, 4] });
  });

  it('finds forgotten tasks after the days saved in the settings, 15 by default', async () => {
    const { ctx, reader } = createTestContext();
    const project = await createProject(ctx, 'Casa');
    await createProjectTask(ctx, project.id, 'Trocar a lâmpada');
    const forgotten = async (today: string) => (await loadCleanupDashboard(reader, today)).forgottenTasks.map((item) => item.task.text);

    expect(await forgotten('2026-10-25')).toEqual([]);
    expect(await forgotten('2026-10-26')).toEqual(['Trocar a lâmpada']);
    await setForgottenTaskDays(ctx, 30);
    expect(await forgotten('2026-10-26')).toEqual([]);
    await setForgottenTaskDays(ctx, null);
    expect(await forgotten('2026-10-26')).toEqual(['Trocar a lâmpada']);
  });

  it('saves limits normalized', async () => {
    const { ctx, reader } = createTestContext();
    await setCleanupLimits(ctx, 'pendingDays', [3, 1, 0]);
    expect((await reader.settings())?.cleanupAgeLimits?.pendingDays).toEqual([3, 3, 3]);
  });
});
