import { describe, expect, it } from 'vitest';
import { positionBetween } from '../domain/position';
import { weekOf } from '../domain/week';
import { createTestContext } from '../test/fixtures';
import { applyTriage } from './checkout';
import { createBlock, setTaskDone } from './notebook';
import { createProject, setProjectFinished } from './projects';
import { loadDayTriage, loadDueReflection, loadProjects, loadReflection } from './queries';
import { closeWeek, resolveDeferred, saveReflectionTexts, setWeeklyReflectionSchedule } from './reflection';

const SUNDAY = '2026-10-11';

describe('section 2: weekly reflection and projects', () => {
  it('tasks and notes left for the reflection are triaged there', async () => {
    const { ctx, reader, db } = createTestContext();
    const task = await createBlock(ctx, { sectionId: null, position: positionBetween(null, null) }, '[] Talvez');
    await createBlock(ctx, { sectionId: task.sectionId, position: positionBetween('a', null) }, 'Uma ideia incerta');

    await applyTriage(ctx, SUNDAY, {
      tasks: new Map([[task.id, { kind: 'reflection' } as const]]),
      notes: new Map([[task.sectionId, 'weeklyReflection' as const]]),
      whiteboards: new Map([[task.sectionId, { kind: 'leaveUnlinked' } as const]]),
    });
    expect((await loadDayTriage(reader, SUNDAY, SUNDAY)).rows).toEqual([]);

    const week = weekOf(SUNDAY);
    const view = await loadReflection(reader, week, SUNDAY);
    expect(view.deferred.map((row) => row.type)).toEqual(['task', 'notes']);

    await resolveDeferred(ctx, {
      tasks: new Map([[task.id, { kind: 'archive' } as const]]),
      notes: new Map([[task.sectionId, 'wiki' as const]]),
    });
    expect(await db.blocks.get(task.id)).toMatchObject({ status: 'archived', awaitingReflection: undefined });
    expect((await db.sections.get(task.sectionId))?.notesDestination).toBe('wiki');
    expect((await loadReflection(reader, week, SUNDAY)).deferred).toEqual([]);
  });

  it('a task postponed 3 times is suggested for the weekly reflection', async () => {
    const { ctx, reader, db } = createTestContext();
    const task = await createBlock(ctx, { sectionId: null, position: positionBetween(null, null) }, '[] Eterna');
    await db.blocks.update(task.id, { postponeCount: 3 });
    const [row] = (await loadDayTriage(reader, SUNDAY, SUNDAY)).rows.filter((r) => r.type === 'task');
    expect(row).toMatchObject({ suggestion: { kind: 'reflection' }, attention: true });
  });

  it('measures the week, saves the texts and closes it', async () => {
    const { ctx, reader, db } = createTestContext();
    const task = await createBlock(ctx, { sectionId: null, position: positionBetween(null, null) }, '[] Feita');
    await setTaskDone(ctx, task.id, true);
    const week = weekOf(SUNDAY);

    const view = await loadReflection(reader, week, SUNDAY);
    expect(view.metrics.finishedTasks).toBe(1);
    await saveReflectionTexts(ctx, week, { bestMoments: 'Foco de manhã', improvements: 'Menos reuniões' });
    await closeWeek(ctx, week, view.metrics);

    expect(await db.reflections.get('week:2026-W41')).toMatchObject({
      bestMoments: 'Foco de manhã',
      improvements: 'Menos reuniões',
      closedAt: expect.any(String),
    });
    expect((await db.events.where('type').equals('reflection.closed').first())?.data).toMatchObject({
      metrics: { finishedTasks: 1 },
    });
  });

  it('the scheduled reflection is due until the week is closed', async () => {
    const { ctx, reader } = createTestContext(undefined, '2026-10-16T18:00:00');
    expect(await loadDueReflection(reader, new Date('2026-10-16T18:00:00'))).toBeNull();

    await setWeeklyReflectionSchedule(ctx, { weekday: 5, hour: 17 });
    const due = await loadDueReflection(reader, new Date('2026-10-16T18:00:00'));
    expect(due?.key).toBe('2026-W42');

    await closeWeek(ctx, due!, (await loadReflection(reader, due!, '2026-10-16')).metrics);
    expect(await loadDueReflection(reader, new Date('2026-10-16T18:00:00'))).toBeNull();
  });

  it('projects are finished by hand and can be reopened', async () => {
    const { ctx, reader } = createTestContext();
    const project = await createProject(ctx, 'Mudança');
    await setProjectFinished(ctx, project.id, true);
    expect((await loadProjects(reader))[0].project).toMatchObject({ status: 'finished', finishedAt: expect.any(String) });
    await setProjectFinished(ctx, project.id, false);
    expect((await loadProjects(reader))[0].project).toMatchObject({ status: 'active', finishedAt: null });
  });

  it('the checkout can link a task to a project', async () => {
    const { ctx, db } = createTestContext();
    const project = await createProject(ctx, 'Mudança');
    const task = await createBlock(ctx, { sectionId: null, position: positionBetween(null, null) }, '[] Comprar caixas');
    await applyTriage(ctx, SUNDAY, {
      tasks: new Map([[task.id, { kind: 'schedule', date: '2026-10-12' } as const]]),
      notes: new Map(),
      whiteboards: new Map(),
      taskProjects: new Map([[task.id, project.id]]),
    });
    expect((await db.blocks.get(task.id))?.projectId).toBe(project.id);
  });
});
