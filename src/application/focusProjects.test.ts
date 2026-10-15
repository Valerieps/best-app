import { describe, expect, it } from 'vitest';
import { createTestContext } from '../test/fixtures';
import { addFocusProject, setFocusProjectInReview } from './focusProjects';
import { createProject, setProjectFinished } from './projects';
import { createBlock, linkSectionToProject } from './notebook';
import { loadDayOpening, loadPlanning, loadProject, loadProjectList } from './queries';
import { positionBetween } from '../domain/position';
import { loadFocusReview } from './reviewQueries';

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
  it('takes a free slot outside the review, up to 3', async () => {
    const { ctx, reader, projects } = await setup(['A', 'B', 'C', 'D']);
    for (const project of projects.slice(0, 3)) expect(await addFocusProject(ctx, project.id)).toBe(true);
    expect(await addFocusProject(ctx, projects[3].id)).toBe(false);
    expect(await focusNames(reader)).toEqual(['A', 'B', 'C']);
    expect(await loadProject(reader, projects[3].id)).toMatchObject({ isPriority: false, canAddToPriorities: false });
    expect(await loadProject(reader, projects[0].id)).toMatchObject({ isPriority: true, canAddToPriorities: false });
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

describe('projects in focus in the Revisão de Foco', () => {
  it('can swap and remove, and the change shows right away', async () => {
    const { ctx, reader, projects } = await setup(['A', 'B', 'C', 'D']);
    for (const project of projects.slice(0, 3)) await addFocusProject(ctx, project.id);
    expect((await loadFocusReview(reader, SUNDAY)).focusIds).toEqual(projects.slice(0, 3).map((project) => project.id));

    await setFocusProjectInReview(ctx, projects[3].id, true); // full: ignored
    await setFocusProjectInReview(ctx, projects[1].id, false);
    await setFocusProjectInReview(ctx, projects[3].id, true);

    expect(await focusNames(reader)).toEqual(['A', 'C', 'D']);
  });

  it('records a removal in the review apart from a finish', async () => {
    const { ctx, db, projects } = await setup(['A']);
    await setFocusProjectInReview(ctx, projects[0].id, true);
    await setFocusProjectInReview(ctx, projects[0].id, false);
    const removed = await db.events.where('type').equals('priority.removed').toArray();
    expect(removed.map((event) => ('reason' in event.data ? event.data.reason : null))).toEqual(['review']);
  });
});

describe('projects in focus in the day to day', () => {
  it('puts their tasks first in the planning of the next day', async () => {
    const { ctx, reader, projects } = await setup(['Fora', 'Foco']);
    const loose = await createBlock(ctx, { sectionId: null, position: positionBetween(null, null) }, '[] Solta');
    const outside = await createBlock(ctx, { sectionId: null, position: positionBetween(null, null) }, '[] Do outro projeto');
    await linkSectionToProject(ctx, outside.sectionId, projects[0].id);
    const inFocus = await createBlock(ctx, { sectionId: null, position: positionBetween(null, null) }, '[] Do projeto em foco');
    await linkSectionToProject(ctx, inFocus.sectionId, projects[1].id);
    await addFocusProject(ctx, projects[1].id);

    const view = await loadPlanning(reader, '2026-10-12');
    expect(view.others.map((item) => item.task.text)[0]).toBe('Do projeto em foco');
    expect(view.others.map((item) => item.task.id)).toEqual(expect.arrayContaining([loose.id, outside.id]));
  });

  it('lists them for the dashboard, but without a warm up the day still opens on the day note', async () => {
    const { ctx, reader, projects } = await setup(['Foco']);
    await addFocusProject(ctx, projects[0].id);
    const opening = await loadDayOpening(reader, SUNDAY);
    expect(opening.stage).toBe('execution');
    expect(opening.focusProjects.map((project) => project.name)).toEqual(['Foco']);
  });
});
