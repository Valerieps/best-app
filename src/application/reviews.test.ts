import { describe, expect, it } from 'vitest';
import { addDays } from '../domain/day';
import { positionBetween } from '../domain/position';
import { createTestContext } from '../test/fixtures';
import { applyTriage, completeCheckout } from './checkout';
import { addFocusProject } from './focusProjects';
import { createBlock, setTaskDone } from './notebook';
import { createObjective, linkProjectToObjective } from './objectives';
import { createProject, setProjectFinished } from './projects';
import { loadDayTriage, loadProjectList } from './queries';
import { loadDirectionReview, loadFocusReview, loadReviewAvailability } from './reviewQueries';
import { closeReview, resolveDeferred, saveFocusTexts, setReviewCadence } from './reviews';

const SUNDAY = '2026-10-11';

type Context = ReturnType<typeof createTestContext>;

/** Closes `count` days in a row from `first`, one checkout each. */
async function checkouts({ ctx, clock }: Context, first: string, count: number) {
  for (let index = 0; index < count; index++) {
    const day = addDays(first, index);
    clock.set(`${day}T20:00:00`);
    await completeCheckout(ctx, day);
  }
}

async function closeFocus(context: Context, today = SUNDAY) {
  const view = await loadFocusReview(context.reader, today);
  await closeReview(context.ctx, 'focus', view.since, view.metrics);
}

async function closeDirection(context: Context, today = SUNDAY) {
  const view = await loadDirectionReview(context.reader, today);
  await closeReview(context.ctx, 'direction', view.since, view.metrics);
}

describe('section 2: Revisão de Foco', () => {
  it('triages the tasks and notes left for it', async () => {
    const { ctx, reader, db } = createTestContext();
    const task = await createBlock(ctx, { sectionId: null, position: positionBetween(null, null) }, '[] Talvez');
    await createBlock(ctx, { sectionId: task.sectionId, position: positionBetween('a', null) }, 'Uma ideia incerta');

    await applyTriage(ctx, SUNDAY, {
      tasks: new Map([[task.id, { kind: 'reflection' } as const]]),
      notes: new Map([[task.sectionId, 'weeklyReflection' as const]]),
      whiteboards: new Map([[task.sectionId, { kind: 'leaveUnlinked' } as const]]),
    });
    expect((await loadDayTriage(reader, SUNDAY, SUNDAY)).rows).toEqual([]);
    expect((await loadFocusReview(reader, SUNDAY)).deferred.map((row) => row.type)).toEqual(['task', 'notes']);

    await resolveDeferred(ctx, {
      tasks: new Map([[task.id, { kind: 'undate' } as const]]),
      notes: new Map([[task.sectionId, 'wiki' as const]]),
    });
    expect(await db.blocks.get(task.id)).toMatchObject({ status: 'active', intendedDate: null, awaitingReflection: undefined });
    expect((await db.sections.get(task.sectionId))?.notesDestination).toBe('wiki');
    expect((await loadFocusReview(reader, SUNDAY)).deferred).toEqual([]);
  });

  it('no longer suggests it at the closing: a task postponed 3 times is only highlighted', async () => {
    const { ctx, reader, db } = createTestContext();
    const task = await createBlock(ctx, { sectionId: null, position: positionBetween(null, null) }, '[] Eterna');
    await db.blocks.update(task.id, { postponeCount: 3 });
    const [row] = (await loadDayTriage(reader, SUNDAY, SUNDAY)).rows.filter((r) => r.type === 'task');
    expect(row).toMatchObject({ suggestion: { kind: 'undate', untouched: true }, attention: true });
  });

  it('measures the period, saves the texts and closes; the next period starts empty', async () => {
    const context = createTestContext();
    const { ctx, reader, db, clock } = context;
    const task = await createBlock(ctx, { sectionId: null, position: positionBetween(null, null) }, '[] Feita');
    await setTaskDone(ctx, task.id, true);

    const view = await loadFocusReview(reader, SUNDAY);
    expect(view).toMatchObject({ since: null, review: null, metrics: { finishedTasks: 1 } });
    await saveFocusTexts(ctx, { bestMoments: 'Foco de manhã', improvements: 'Menos reuniões' });
    expect((await loadFocusReview(reader, SUNDAY)).review).toMatchObject({ bestMoments: 'Foco de manhã' });

    clock.set('2026-10-11T18:00:00');
    await closeReview(ctx, 'focus', view.since, view.metrics);
    const [closed] = await db.reflections.toArray();
    expect(closed).toMatchObject({ kind: 'focus', bestMoments: 'Foco de manhã', improvements: 'Menos reuniões', end: SUNDAY, closedAt: expect.any(String) });
    expect(closed.id).not.toBe('focus:open');
    expect((await db.events.where('type').equals('reflection.closed').first())?.data).toMatchObject({ kind: 'focus', metrics: { finishedTasks: 1 } });

    const next = await loadFocusReview(reader, SUNDAY);
    expect(next).toMatchObject({ since: closed.closedAt, review: null, metrics: { finishedTasks: 0 } });
  });

  it('lists the active projects with the stalled ones first', async () => {
    const { ctx, reader, clock } = createTestContext(undefined, '2026-09-01T10:00:00');
    await createProject(ctx, 'Antigo');
    clock.set('2026-10-10T10:00:00');
    await createProject(ctx, 'Novo');
    const view = await loadFocusReview(reader, SUNDAY);
    expect(view.activeProjects.map(({ project, stalledDays }) => [project.name, stalledDays])).toEqual([
      ['Antigo', 40],
      ['Novo', null],
    ]);
  });

  it('becomes available after 5 checkouts, and the count starts over when it is done', async () => {
    const context = createTestContext();
    await checkouts(context, '2026-10-05', 4);
    expect((await loadReviewAvailability(context.reader, SUNDAY)).focus).toEqual([]);
    await checkouts(context, '2026-10-09', 2); // the same day twice counts once
    await checkouts(context, '2026-10-10', 1);
    expect((await loadReviewAvailability(context.reader, SUNDAY)).focus).toEqual([{ kind: 'cadence', count: 6 }]);

    await closeFocus(context);
    expect((await loadReviewAvailability(context.reader, SUNDAY)).focus).toEqual([]);
  });

  it('follows the cadence in the settings', async () => {
    const context = createTestContext();
    await setReviewCadence(context.ctx, { focusCheckouts: 2 });
    await checkouts(context, '2026-10-05', 2);
    expect((await loadReviewAvailability(context.reader, SUNDAY)).focus).toEqual([{ kind: 'cadence', count: 2 }]);
  });

  it('becomes available when a project in focus stalls or the last one is finished', async () => {
    const { ctx, reader, clock } = createTestContext();
    const project = await createProject(ctx, 'Mudança');
    await addFocusProject(ctx, project.id);
    expect((await loadReviewAvailability(reader, SUNDAY)).focus).toEqual([]);

    const later = '2026-10-26';
    clock.set(`${later}T10:00:00`);
    const availability = await loadReviewAvailability(reader, later);
    expect(availability.focus).toEqual([{ kind: 'stalledFocusProject', projectId: project.id, days: 15 }]);
    expect(availability.names[project.id]).toBe('Mudança');

    await setProjectFinished(ctx, project.id, true);
    expect((await loadReviewAvailability(reader, later)).focus).toEqual([{ kind: 'focusListEmptied' }]);
  });

  it('becomes available with 10 items waiting for it', async () => {
    const { ctx, reader } = createTestContext();
    const tasks = new Map();
    for (let index = 0; index < 10; index++) {
      const task = await createBlock(ctx, { sectionId: null, position: positionBetween(null, null) }, `[] Talvez ${index}`);
      tasks.set(task.id, { kind: 'reflection' });
    }
    await applyTriage(ctx, SUNDAY, { tasks, notes: new Map(), whiteboards: new Map() });
    expect((await loadReviewAvailability(reader, SUNDAY)).focus).toContainEqual({ kind: 'awaitingItems', count: 10 });
  });

  it('projects are finished by hand and can be reopened', async () => {
    const { ctx, reader } = createTestContext();
    const project = await createProject(ctx, 'Mudança');
    await setProjectFinished(ctx, project.id, true);
    expect((await loadProjectList(reader, SUNDAY)).finished[0].project).toMatchObject({ status: 'finished', finishedAt: expect.any(String) });
    await setProjectFinished(ctx, project.id, false);
    expect((await loadProjectList(reader, SUNDAY)).others[0].project).toMatchObject({ status: 'active', finishedAt: null });
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

describe('section 4: Revisão de Rumo', () => {
  it('becomes available after 4 Revisões de Foco', async () => {
    const context = createTestContext();
    for (let index = 0; index < 3; index++) await closeFocus(context);
    expect((await loadReviewAvailability(context.reader, SUNDAY)).direction).toEqual([]);
    await closeFocus(context);
    expect((await loadReviewAvailability(context.reader, SUNDAY)).direction).toEqual([{ kind: 'cadence', count: 4 }]);
    await closeDirection(context);
    expect((await loadReviewAvailability(context.reader, SUNDAY)).direction).toEqual([]);
  });

  it('ignores the signals until the first Revisão de Rumo, then warns about tasks without objective', async () => {
    const context = createTestContext();
    const { ctx, reader, clock } = context;
    const finishTasks = async (count: number) => {
      for (let index = 0; index < count; index++) {
        const task = await createBlock(ctx, { sectionId: null, position: positionBetween(null, null) }, `[] Feita ${index}`);
        await setTaskDone(ctx, task.id, true);
      }
    };
    await finishTasks(10);
    expect((await loadReviewAvailability(reader, SUNDAY)).direction).toEqual([]);

    clock.set('2026-10-11T13:00:00');
    await closeDirection(context);
    clock.set('2026-10-11T14:00:00');
    await finishTasks(10);
    expect((await loadReviewAvailability(reader, SUNDAY)).direction).toEqual([{ kind: 'tasksWithoutObjective', withoutObjective: 10, finished: 10 }]);
  });

  it('warns about an objective whose projects have had no activity for 30 days', async () => {
    const context = createTestContext(undefined, '2026-08-01T10:00:00');
    const { ctx, reader, clock } = context;
    const objective = await createObjective(ctx, 'Morar no apartamento novo');
    await createObjective(ctx, 'Sem projetos');
    const project = await createProject(ctx, 'Mudança');
    await linkProjectToObjective(ctx, project.id, objective.id);
    await closeDirection(context, '2026-08-01');

    clock.set('2026-09-10T10:00:00');
    const availability = await loadReviewAvailability(reader, '2026-09-10');
    expect(availability.direction).toEqual([{ kind: 'stalledObjective', objectiveId: objective.id, days: 40 }]);
    expect(availability.names[objective.id]).toBe('Morar no apartamento novo');
  });
});
