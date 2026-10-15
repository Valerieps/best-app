import { describe, expect, it } from 'vitest';
import { createTestContext } from '../test/fixtures';
import { positionBetween } from '../domain/position';
import { setIntendedDate } from './dayTools';
import { createBlock, linkSectionToProject, setTaskDone } from './notebook';
import { renameResource, addLinkResource } from './objectives';
import { createProject, createProjectTask, setProjectFinished, setProjectIcon } from './projects';
import { loadDayNote, loadDayTriage, loadPendingDays, loadProject, loadProjectList } from './queries';
import { setProjectListGroupOpen, setProjectPanelPinned, setSidebarCollapsed, setSidebarWidth } from './settings';

const TODAY = '2026-10-11';

describe('tasks created on a project page', () => {
  it('are born active, without a date and linked to the project', async () => {
    const { ctx, reader } = createTestContext();
    const project = await createProject(ctx, 'Reforma da cozinha');
    const task = await createProjectTask(ctx, project.id, '  Pedir orçamento da bancada ');

    expect(task).toMatchObject({ kind: 'task', status: 'active', intendedDate: null, projectId: project.id, text: 'Pedir orçamento da bancada' });
    const view = await loadProject(reader, project.id);
    expect(view?.activeTasks.map((item) => item.task.text)).toEqual(['Pedir orçamento da bancada']);
  });

  it('stay out of the day note, the checkout and the pending days', async () => {
    const { ctx, reader, clock } = createTestContext();
    const project = await createProject(ctx, 'Reforma da cozinha');
    await createProjectTask(ctx, project.id, 'Pedir orçamento');

    const note = await loadDayNote(reader, TODAY);
    expect(note.entries.flatMap((entry) => [...entry.blocks, ...entry.carried])).toEqual([]);
    const triage = await loadDayTriage(reader, TODAY, TODAY);
    expect(triage.rows).toEqual([]);

    clock.set('2026-10-14T09:00:00');
    expect(await loadPendingDays(reader, '2026-10-14')).toEqual([]);
  });

  it('show up in a day note, and its checkout, once they get an intended date', async () => {
    const { ctx, reader } = createTestContext();
    const project = await createProject(ctx, 'Reforma da cozinha');
    const task = (await createProjectTask(ctx, project.id, 'Pedir orçamento'))!;
    await setIntendedDate(ctx, task.id, '2026-10-13');

    const note = await loadDayNote(reader, '2026-10-13');
    expect(note.entries.flatMap((entry) => entry.carried).map((block) => block.id)).toEqual([task.id]);
    const triage = await loadDayTriage(reader, '2026-10-13', '2026-10-13');
    expect(triage.open.map((item) => item.task.id)).toEqual([task.id]);
  });

  it('share one hidden section per project, which is not counted as a project section', async () => {
    const { ctx, reader, db } = createTestContext();
    const project = await createProject(ctx, 'Reforma da cozinha');
    await createProjectTask(ctx, project.id, 'Um');
    await createProjectTask(ctx, project.id, 'Dois');

    const sections = await db.sections.where('projectId').equals(project.id).toArray();
    expect(sections).toHaveLength(1);
    expect(sections[0].projectPage).toBe(true);
    expect((await loadProject(reader, project.id))?.sections).toBe(0);
    expect((await loadProjectList(reader, TODAY)).others[0].activity.get(TODAY)?.sections).toBe(0);
    const blocks = await db.blocks.where('sectionId').equals(sections[0].id).sortBy('position');
    expect(blocks.map((block) => block.text)).toEqual(['Um', 'Dois']);
  });

  it('ignores empty text', async () => {
    const { ctx, db } = createTestContext();
    const project = await createProject(ctx, 'Reforma da cozinha');
    expect(await createProjectTask(ctx, project.id, '   ')).toBeNull();
    expect(await db.blocks.count()).toBe(0);
  });
});

describe('project list', () => {
  it('builds the activity of each project from its events, following reopenings', async () => {
    const { ctx, reader, clock } = createTestContext();
    const project = await createProject(ctx, 'Reforma da cozinha');
    const a = (await createProjectTask(ctx, project.id, 'A'))!;
    const b = (await createProjectTask(ctx, project.id, 'B'))!;
    await setTaskDone(ctx, a.id, true);
    clock.set('2026-10-12T09:00:00');
    await setTaskDone(ctx, b.id, true);
    await setTaskDone(ctx, b.id, false);
    clock.set('2026-10-12T15:00:00');
    await setTaskDone(ctx, b.id, true);
    const note = await createBlock(ctx, { sectionId: null, position: positionBetween(null, null) }, 'Medidas da bancada');
    await linkSectionToProject(ctx, note.sectionId, project.id);

    const [item] = (await loadProjectList(reader, '2026-10-12')).others;
    expect(item.activity.get('2026-10-11')).toEqual({ tasksCreated: 2, tasksFinished: 1, notes: 0, sections: 0 });
    expect(item.activity.get('2026-10-12')).toEqual({ tasksCreated: 0, tasksFinished: 1, notes: 1, sections: 1 });
    expect(item).toMatchObject({ finishedLastTwoWeeks: 2, lastActivityDay: '2026-10-12', stalledDays: null, activeTasks: 0 });
  });

  it('calls a project stalled after 14 days without activity, and sorts the others by last activity', async () => {
    const { ctx, reader, clock } = createTestContext();
    await createProject(ctx, 'Quieto');
    const busy = await createProject(ctx, 'Agitado');
    clock.set('2026-10-20T09:00:00');
    await createProjectTask(ctx, busy.id, 'Algo novo');

    expect((await loadProjectList(reader, '2026-10-24')).others.map((item) => [item.project.name, item.stalledDays])).toEqual([
      ['Agitado', null],
      ['Quieto', null],
    ]);
    const view = await loadProjectList(reader, '2026-10-25');
    expect(view.others.map((item) => [item.project.name, item.stalledDays])).toEqual([
      ['Agitado', null],
      ['Quieto', 14],
    ]);
    expect(view.summary).toEqual({ active: 2, stalled: 1, stuck: 0 });
  });

  it('counts stuck tasks and keeps finished projects apart', async () => {
    const { ctx, reader } = createTestContext();
    const project = await createProject(ctx, 'Reforma da cozinha');
    const task = (await createProjectTask(ctx, project.id, 'Pedir orçamento'))!;
    await setIntendedDate(ctx, task.id, '2026-10-11');
    const done = await createProject(ctx, 'Mudança');
    await setProjectFinished(ctx, done.id, true);

    const view = await loadProjectList(reader, '2026-10-13');
    expect(view.others.map((item) => [item.project.name, item.activeTasks, item.stuckTasks])).toEqual([['Reforma da cozinha', 1, 1]]);
    expect(view.finished.map((item) => [item.project.name, item.stalledDays])).toEqual([['Mudança', null]]);
    expect(view.summary).toEqual({ active: 1, stalled: 0, stuck: 1 });
  });

  it('remembers which groups are open, in the settings', async () => {
    const { ctx, reader } = createTestContext();
    expect((await loadProjectList(reader, TODAY)).open).toEqual({ others: true, finished: false });
    await setProjectListGroupOpen(ctx, 'finished', true);
    await setProjectListGroupOpen(ctx, 'others', false);
    expect((await loadProjectList(reader, TODAY)).open).toEqual({ others: false, finished: true });
    expect((await reader.settings())?.projectListGroups).toEqual({ others: false, finished: true });
  });
});

describe('project page details', () => {
  it('sets and clears the icon, recording the change', async () => {
    const { ctx, db } = createTestContext();
    const project = await createProject(ctx, 'Reforma da cozinha');
    await setProjectIcon(ctx, project.id, 'pot');
    expect((await db.projects.get(project.id))?.icon).toBe('pot');
    await setProjectIcon(ctx, project.id, null);
    expect((await db.projects.get(project.id))?.icon).toBeNull();
    const events = await db.events.where('type').equals('project.iconChanged').toArray();
    expect(events.map((event) => event.data)).toEqual([
      { from: null, to: 'pot' },
      { from: 'pot', to: null },
    ]);
    await expect(setProjectIcon(ctx, project.id, 'rocket')).rejects.toThrow();
  });

  it('renames a link resource, ignoring empty titles', async () => {
    const { ctx, db } = createTestContext();
    const project = await createProject(ctx, 'Reforma da cozinha');
    const resource = await addLinkResource(ctx, { ownerType: 'project', ownerId: project.id }, 'https://drive.google.com/x', 'drive.google.com');
    await renameResource(ctx, resource.id, 'Orçamento da marmoraria');
    await renameResource(ctx, resource.id, '  ');
    expect((await db.resources.get(resource.id))?.title).toBe('Orçamento da marmoraria');
  });

  it('remembers whether the side column is pinned', async () => {
    const { ctx, reader } = createTestContext();
    await setProjectPanelPinned(ctx, true);
    expect((await reader.settings())?.projectPanelPinned).toBe(true);
  });
});

describe('sidebar', () => {
  it('remembers whether it is collapsed, in the settings', async () => {
    const { ctx, reader } = createTestContext();
    expect((await reader.settings())?.sidebarCollapsed).toBeUndefined();
    await setSidebarCollapsed(ctx, true);
    expect((await reader.settings())?.sidebarCollapsed).toBe(true);
    await setSidebarCollapsed(ctx, false);
    expect((await reader.settings())?.sidebarCollapsed).toBe(false);
  });

  it('remembers the width it was dragged to, and forgets it to go back to the default', async () => {
    const { ctx, reader } = createTestContext();
    expect((await reader.settings())?.sidebarWidth).toBeUndefined();
    await setSidebarWidth(ctx, 320);
    expect((await reader.settings())?.sidebarWidth).toBe(320);
    await setSidebarWidth(ctx, null);
    expect((await reader.settings())?.sidebarWidth).toBeUndefined();
  });
});
