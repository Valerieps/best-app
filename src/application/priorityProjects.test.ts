import { describe, expect, it } from 'vitest';
import { createTestContext } from '../test/fixtures';
import { addPriorityProject, setPriorityProjectInReflection } from './priorityProjects';
import { createProject, setProjectFinished } from './projects';
import { loadProject, loadProjectList, loadReflection } from './queries';
import { weekOf } from '../domain/week';

// The test clock starts on Sunday 2026-10-11, the last day of ISO week 41.
const SUNDAY = '2026-10-11';

async function setup(names: string[]) {
  const context = createTestContext();
  const projects = [];
  for (const name of names) projects.push(await createProject(context.ctx, name));
  return { ...context, projects };
}

const priorityNames = async (reader: ReturnType<typeof createTestContext>['reader'], today: string) =>
  (await loadProjectList(reader, today)).priority.map((item) => item.project.name);

describe('priority projects of the week', () => {
  it('takes a free slot outside the reflection, up to 3', async () => {
    const { ctx, reader, projects } = await setup(['A', 'B', 'C', 'D']);
    for (const project of projects.slice(0, 3)) expect(await addPriorityProject(ctx, project.id)).toBe(true);
    expect(await addPriorityProject(ctx, projects[3].id)).toBe(false);
    expect(await priorityNames(reader, SUNDAY)).toEqual(['A', 'B', 'C']);
    expect((await loadProject(reader, projects[3].id, SUNDAY))).toMatchObject({ isPriority: false, canAddToPriorities: false });
    expect((await loadProject(reader, projects[0].id, SUNDAY))).toMatchObject({ isPriority: true, canAddToPriorities: false });
  });

  it('records each change in the event history', async () => {
    const { ctx, db, projects } = await setup(['A']);
    await addPriorityProject(ctx, projects[0].id);
    const events = await db.events.where('type').equals('priority.added').toArray();
    expect(events.map((event) => [event.entityId, event.data])).toEqual([
      ['weekProjects:2026-W41', { projectId: projects[0].id, week: '2026-W41', itemIds: [projects[0].id] }],
    ]);
  });

  it('carries the list over to the following weeks', async () => {
    const { ctx, reader, projects } = await setup(['A']);
    await addPriorityProject(ctx, projects[0].id);
    expect(await priorityNames(reader, '2026-10-12')).toEqual(['A']);
    expect(await priorityNames(reader, '2026-11-30')).toEqual(['A']);
  });

  it('frees the slot when the project is finished, and does not take it back on reopening', async () => {
    const { ctx, reader, clock, projects } = await setup(['A', 'B']);
    await addPriorityProject(ctx, projects[0].id);
    await addPriorityProject(ctx, projects[1].id);
    clock.set('2026-10-14T10:00:00');
    await setProjectFinished(ctx, projects[0].id, true);
    expect(await priorityNames(reader, '2026-10-14')).toEqual(['B']);
    await setProjectFinished(ctx, projects[0].id, false);
    expect(await priorityNames(reader, '2026-10-14')).toEqual(['B']);
  });

  it('only takes active projects', async () => {
    const { ctx, reader, projects } = await setup(['A']);
    await setProjectFinished(ctx, projects[0].id, true);
    expect(await addPriorityProject(ctx, projects[0].id)).toBe(false);
    expect(await priorityNames(reader, SUNDAY)).toEqual([]);
  });
});

describe('step 6 of the weekly reflection', () => {
  it("defines the next week's list, which can swap and remove, without touching the current week", async () => {
    const { ctx, reader, projects } = await setup(['A', 'B', 'C', 'D']);
    for (const project of projects.slice(0, 3)) await addPriorityProject(ctx, project.id);
    const view = await loadReflection(reader, weekOf(SUNDAY), SUNDAY);
    expect(view.nextWeek.key).toBe('2026-W42');
    expect(view.nextWeekPriorityIds).toEqual(projects.slice(0, 3).map((project) => project.id));

    await setPriorityProjectInReflection(ctx, '2026-W42', projects[3].id, true); // full: ignored
    await setPriorityProjectInReflection(ctx, '2026-W42', projects[1].id, false);
    await setPriorityProjectInReflection(ctx, '2026-W42', projects[3].id, true);

    expect(await priorityNames(reader, SUNDAY)).toEqual(['A', 'B', 'C']);
    expect(await priorityNames(reader, '2026-10-12')).toEqual(['A', 'C', 'D']);
  });

  it('puts a project added outside the reflection in the next week already defined, while it has room', async () => {
    const { ctx, reader, projects } = await setup(['A', 'B', 'C']);
    await setPriorityProjectInReflection(ctx, '2026-W42', projects[0].id, true);
    await addPriorityProject(ctx, projects[1].id);
    expect(await priorityNames(reader, SUNDAY)).toEqual(['B']);
    expect(await priorityNames(reader, '2026-10-12')).toEqual(['A', 'B']);
  });

  it('frees the slot in the next week already defined when the project is finished', async () => {
    const { ctx, reader, projects } = await setup(['A']);
    await setPriorityProjectInReflection(ctx, '2026-W42', projects[0].id, true);
    await setProjectFinished(ctx, projects[0].id, true);
    await setProjectFinished(ctx, projects[0].id, false);
    expect(await priorityNames(reader, '2026-10-12')).toEqual([]);
  });
});
