import { describe, expect, it } from 'vitest';
import { positionBetween } from '../domain/position';
import { createTestContext } from '../test/fixtures';
import { applyTriage } from './checkout';
import { setDayPriority } from './dayTools';
import { createHabit, logHabit } from './habits';
import { createBlock, linkSectionToProject } from './notebook';
import {
  addLinkResource,
  closeMonth,
  createObjective,
  createObjectiveFromProject,
  finishObjective,
  linkProjectToObjective,
} from './objectives';
import { addFocusProject, setFocusProjectInReview } from './focusProjects';
import { createProject } from './projects';
import { loadDueMonthlyReflection, loadHabits, loadMonthlyReflection, loadObjective, loadReflection } from './queries';
import { weekOf } from '../domain/week';

const SUNDAY = '2026-10-11';

describe('section 4: objectives', () => {
  it('links projects, adds resources and finishes by hand saying whether the goal was reached', async () => {
    const { ctx, reader, db } = createTestContext();
    const objective = await createObjective(ctx, 'Morar no apartamento novo', 'Mais espaço para trabalhar');
    const project = await createProject(ctx, 'Mudança');
    await linkProjectToObjective(ctx, project.id, objective.id);
    await addLinkResource(ctx, { ownerType: 'objective', ownerId: objective.id }, 'go/planta', 'Planta do apê');

    const view = await loadObjective(reader, objective.id);
    expect(view?.projects.map((p) => p.name)).toEqual(['Mudança']);
    expect(view?.resources.map((r) => [r.resource.title, r.resource.url])).toEqual([['Planta do apê', 'go/planta']]);

    await finishObjective(ctx, objective.id, true);
    expect(await db.objectives.get(objective.id)).toMatchObject({ status: 'finished', achieved: true });
  });

  it('suggests objectives from existing projects', async () => {
    const { ctx, db } = createTestContext();
    const project = await createProject(ctx, 'Data Studios');
    const objective = await createObjectiveFromProject(ctx, project.id);
    expect(objective?.goal).toBe('Data Studios');
    expect((await db.projects.get(project.id))?.objectiveId).toBe(objective?.id);
  });

  it('the checkout links a section notes as a resource', async () => {
    const { ctx, reader } = createTestContext();
    const objective = await createObjective(ctx, 'Saúde');
    const note = await createBlock(ctx, { sectionId: null, position: positionBetween(null, null) }, 'Médico indicou natação');
    await applyTriage(ctx, SUNDAY, {
      tasks: new Map(),
      notes: new Map([[note.sectionId, 'wiki' as const]]),
      whiteboards: new Map([[note.sectionId, { kind: 'leaveUnlinked' } as const]]),
      noteResources: new Map([[note.sectionId, { ownerType: 'objective' as const, ownerId: objective.id }]]),
    });
    const view = await loadObjective(reader, objective.id);
    expect(view?.resources[0].notes.map((n) => n.text)).toEqual(['Médico indicou natação']);
  });

  it('monthly reflection measures the disconnection and closes the month', async () => {
    const { ctx, reader, db, clock } = createTestContext();
    const studio = await createProject(ctx, 'Data Studios');
    const other = await createProject(ctx, 'Sem objetivo');
    await addFocusProject(ctx, studio.id);
    const task = await createBlock(ctx, { sectionId: null, position: positionBetween(null, null) }, '[] Painel');
    await linkSectionToProject(ctx, task.sectionId, studio.id);
    await setDayPriority(ctx, task.id, true);
    // Two days later another project is in focus: the studio task no longer counts then.
    clock.set('2026-10-13T09:00:00');
    await setFocusProjectInReview(ctx, studio.id, false);
    await setFocusProjectInReview(ctx, other.id, true);
    const later = await createBlock(ctx, { sectionId: null, position: positionBetween(null, null) }, '[] Relatório');
    await linkSectionToProject(ctx, later.sectionId, studio.id);
    await setDayPriority(ctx, later.id, true);

    const view = await loadMonthlyReflection(reader, '2026-10');
    expect(view.metrics).toMatchObject({
      activeProjects: 2,
      projectsWithoutObjective: 2,
      dayPriorities: 2,
      dayPrioritiesInFocusProjects: 1,
    });

    await closeMonth(ctx, view.month, view.metrics);
    expect((await db.reflections.get('month:2026-10'))?.closedAt).toEqual(expect.any(String));
  });

  it('offers the reflection of the month that just ended', async () => {
    const { ctx, reader } = createTestContext(undefined, '2026-09-20T10:00:00');
    await createProject(ctx, 'Algo em setembro');
    expect((await loadDueMonthlyReflection(reader, '2026-10-02'))?.key).toBe('2026-09');
    expect(await loadDueMonthlyReflection(reader, '2026-09-25')).toBeNull();
  });
});

describe('section 6: habits', () => {
  it('logs yes or no and reports streak and completion', async () => {
    const { ctx, reader } = createTestContext();
    const habit = await createHabit(ctx, { name: 'Ler 10 páginas', criterion: '10 páginas', weekdays: [], objectiveId: null });
    await logHabit(ctx, habit.id, '2026-10-09', true);
    await logHabit(ctx, habit.id, '2026-10-10', true);
    await logHabit(ctx, habit.id, SUNDAY, true);

    const [view] = await loadHabits(reader, SUNDAY);
    expect(view).toMatchObject({ expectedToday: true, doneToday: true });
    expect(view.week.longestStreak).toBe(3);

    const reflection = await loadReflection(reader, weekOf(SUNDAY), SUNDAY);
    // Created on Sunday: earlier days only count because they were logged.
    expect(reflection.habits[0].week).toMatchObject({ expected: 3, done: 3, longestStreak: 3 });
  });

  it('the checkout turns a task into a habit and takes it out of circulation', async () => {
    const { ctx, reader, db } = createTestContext();
    const task = await createBlock(ctx, { sectionId: null, position: positionBetween(null, null) }, '[] Meditar');
    await applyTriage(ctx, SUNDAY, {
      tasks: new Map([[task.id, { kind: 'habit' } as const]]),
      notes: new Map(),
      whiteboards: new Map(),
    });
    expect((await db.blocks.get(task.id))?.status).toBe('converted');
    expect((await loadHabits(reader, SUNDAY)).map((view) => view.habit.name)).toEqual(['Meditar']);
  });
});
