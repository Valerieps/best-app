import { describe, expect, it } from 'vitest';
import { createTestContext } from '../test/fixtures';
import { addFocusProject, removeFocusProject } from './focusProjects';
import { createProject, setProjectFinished } from './projects';
import { loadDayOpening, loadProject, loadProjectList } from './queries';

// The test clock starts on Sunday 2026-10-11.
const SUNDAY = '2026-10-11';

async function setup(names: string[]) {
  const context = createTestContext();
  const projects = [];
  for (const name of names) projects.push(await createProject(context.ctx, name));
  return { ...context, projects };
}

const focusNames = async (reader: ReturnType<typeof createTestContext>['reader'], today = SUNDAY) =>
  (await loadProjectList(reader, today)).priority.map((item) => item.project.name);

describe('projects in focus', () => {
  it('takes any number of projects', async () => {
    const { ctx, reader, projects } = await setup(['A', 'B', 'C', 'D']);
    for (const project of projects) expect(await addFocusProject(ctx, project.id)).toBe(true);
    expect(await addFocusProject(ctx, projects[0].id)).toBe(false);
    expect(await focusNames(reader)).toEqual(['A', 'B', 'C', 'D']);
    expect(await loadProject(reader, projects[0].id)).toMatchObject({ isPriority: true, canAddToPriorities: false });
  });

  it('removes a project at any time', async () => {
    const { ctx, reader, db, projects } = await setup(['A', 'B']);
    await addFocusProject(ctx, projects[0].id);
    await addFocusProject(ctx, projects[1].id);
    expect(await removeFocusProject(ctx, projects[0].id)).toBe(true);
    expect(await removeFocusProject(ctx, projects[0].id)).toBe(false);
    expect(await focusNames(reader)).toEqual(['B']);
    const removed = await db.events.where('type').equals('priority.removed').toArray();
    expect(removed.map((event) => event.data)).toEqual([{ projectId: projects[0].id, reason: 'removed', itemIds: [projects[1].id] }]);
  });

  it('records each change with the whole list in the event history', async () => {
    const { ctx, db, projects } = await setup(['A']);
    await addFocusProject(ctx, projects[0].id);
    const events = await db.events.where('type').equals('priority.added').toArray();
    expect(events.map((event) => [event.entityId, event.data])).toEqual([['focusProjects', { projectId: projects[0].id, itemIds: [projects[0].id] }]]);
  });

  it('stays the same however much time passes', async () => {
    const { ctx, reader, projects } = await setup(['A']);
    await addFocusProject(ctx, projects[0].id);
    expect(await focusNames(reader, '2026-12-30')).toEqual(['A']);
  });

  it('frees the slot when the project is finished, and does not take it back on reopening', async () => {
    const { ctx, reader, db, clock, projects } = await setup(['A', 'B']);
    await addFocusProject(ctx, projects[0].id);
    await addFocusProject(ctx, projects[1].id);
    clock.set('2026-10-14T10:00:00');
    await setProjectFinished(ctx, projects[0].id, true);
    expect(await focusNames(reader)).toEqual(['B']);
    await setProjectFinished(ctx, projects[0].id, false);
    expect(await focusNames(reader)).toEqual(['B']);
    const removed = await db.events.where('type').equals('priority.removed').toArray();
    expect(removed.map((event) => event.data)).toEqual([{ projectId: projects[0].id, reason: 'finished', itemIds: [projects[1].id] }]);
  });

  it('only takes active projects', async () => {
    const { ctx, reader, projects } = await setup(['A']);
    await setProjectFinished(ctx, projects[0].id, true);
    expect(await addFocusProject(ctx, projects[0].id)).toBe(false);
    expect(await focusNames(reader)).toEqual([]);
  });
});

describe('projects in focus in the day to day', () => {
  it('lists them for the dashboard, but without a warm up the day still opens on the day note', async () => {
    const { ctx, reader, projects } = await setup(['Foco']);
    await addFocusProject(ctx, projects[0].id);
    const opening = await loadDayOpening(reader, SUNDAY);
    expect(opening.stage).toBe('execution');
    expect(opening.focusProjects.map((project) => project.name)).toEqual(['Foco']);
  });
});
