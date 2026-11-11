import { describe, expect, it } from 'vitest';
import { createTestContext } from '../test/fixtures';
import { setIntendedDate, setTaskProject } from './dayTools';
import { releaseNextStep, setNextStep } from './nextSteps';
import { abandonTask, setTaskDone } from './notebook';
import { createProject, createProjectTask, setProjectFinished } from './projects';
import { loadActiveTasks, loadProject, loadTaskListContext } from './queries';

async function setup(taskCount = 0) {
  const context = createTestContext();
  const project = await createProject(context.ctx, 'Casa');
  const tasks = [];
  for (let i = 0; i < taskCount; i++) tasks.push((await createProjectTask(context.ctx, project.id, `tarefa ${i}`))!);
  return { ...context, project, tasks };
}

const nextOf = async (reader: ReturnType<typeof createTestContext>['reader'], projectId: string) => (await loadProject(reader, projectId))!.nextStepIds;

describe('next steps', () => {
  it('marks and unmarks, keeping the order marked', async () => {
    const { ctx, reader, project, tasks } = await setup(3);
    await setNextStep(ctx, tasks[1].id, true);
    await setNextStep(ctx, tasks[0].id, true);
    expect(await nextOf(reader, project.id)).toEqual([tasks[1].id, tasks[0].id]);
    await setNextStep(ctx, tasks[1].id, false);
    expect(await nextOf(reader, project.id)).toEqual([tasks[0].id]);
  });

  it('records one event per change, with the whole list', async () => {
    const { ctx, db, project, tasks } = await setup(2);
    await setNextStep(ctx, tasks[0].id, true);
    await setNextStep(ctx, tasks[0].id, true); // already marked: nothing changes
    await setNextStep(ctx, tasks[0].id, false);
    const events = (await db.events.toArray()).filter((event) => event.entityId === `next:${project.id}`);
    expect(events.map((event) => event.type).sort()).toEqual(['priority.added', 'priority.removed']);
    expect(events.find((event) => event.type === 'priority.added')!.data).toMatchObject({ taskId: tasks[0].id, projectId: project.id, itemIds: [tasks[0].id] });
    expect(events.find((event) => event.type === 'priority.removed')!.data).toMatchObject({ reason: 'removed', itemIds: [] });
  });

  it('a fourth takes the place of the third', async () => {
    const { ctx, db, reader, project, tasks } = await setup(4);
    for (const task of tasks) await setNextStep(ctx, task.id, true);
    expect(await nextOf(reader, project.id)).toEqual([tasks[0].id, tasks[1].id, tasks[3].id]);
    const added = (await db.events.toArray()).filter((event) => event.entityId === `next:${project.id}` && 'replaced' in (event.data ?? {}));
    expect(added).toHaveLength(1);
    expect(added[0].data).toMatchObject({ replaced: tasks[2].id });
  });

it('does not accept a finished task', async () => {    const { ctx, reader, project, tasks } = await setup(1);    await setTaskDone(ctx, tasks[0].id, true);    await setNextStep(ctx, tasks[0].id, true);    expect(await nextOf(reader, project.id)).toEqual([]);    expect(await reader.priorityList(`next:${project.id}`)).toBeUndefined();  });

  it('does not change the date', async () => {
    const { ctx, reader, project, tasks } = await setup(1);
    await setIntendedDate(ctx, tasks[0].id, '2026-10-20');
    await setNextStep(ctx, tasks[0].id, true);
    const view = (await loadProject(reader, project.id))!;
    expect(view.activeTasks[0].task.intendedDate).toBe('2026-10-20');
  });

  it('finishing or abandoning frees the place, and reopening does not bring it back', async () => {
    const { ctx, reader, project, tasks } = await setup(3);
    for (const task of tasks) await setNextStep(ctx, task.id, true);
    await setTaskDone(ctx, tasks[0].id, true);
    await abandonTask(ctx, tasks[1].id);
    expect(await nextOf(reader, project.id)).toEqual([tasks[2].id]);
    expect((await reader.priorityList(`next:${project.id}`))!.itemIds).toEqual([tasks[2].id]);
    await setTaskDone(ctx, tasks[0].id, false);
    expect(await nextOf(reader, project.id)).toEqual([tasks[2].id]);
  });

  it('leaves the old project when the task changes project or loses it', async () => {
    const { ctx, reader, project, tasks } = await setup(2);
    const other = await createProject(ctx, 'Trabalho');
    await setNextStep(ctx, tasks[0].id, true);
    await setNextStep(ctx, tasks[1].id, true);
    await setTaskProject(ctx, tasks[0].id, other.id);
    await setTaskProject(ctx, tasks[1].id, null);
    expect(await nextOf(reader, project.id)).toEqual([]);
    expect((await reader.priorityList(`next:${project.id}`))!.itemIds).toEqual([]);
    expect(await nextOf(reader, other.id)).toEqual([]);
  });

  it('releasing a task that is not in the list changes nothing', async () => {
    const { ctx, db, project, tasks } = await setup(1);
    await ctx.store.transaction((tx) => releaseNextStep(ctx, tx, tasks[0], 'finished'));
    expect(await db.events.toArray().then((events) => events.some((event) => event.entityId === `next:${project.id}`))).toBe(false);
  });

  it('the task list context carries the next steps of every project', async () => {
    const { ctx, reader, tasks } = await setup(2);
    const other = await createProject(ctx, 'Trabalho');
    const work = (await createProjectTask(ctx, other.id, 'trabalho'))!;
    await setNextStep(ctx, tasks[0].id, true);
    await setNextStep(ctx, work.id, true);
    expect((await loadTaskListContext(reader)).nextStepIds.sort()).toEqual([tasks[0].id, work.id].sort());
    expect((await loadActiveTasks(reader)).length).toBe(3);
  });

  it('finishing the project does not break the list', async () => {
    const { ctx, reader, project, tasks } = await setup(1);
    await setNextStep(ctx, tasks[0].id, true);
    await setProjectFinished(ctx, project.id, true);
    expect(await nextOf(reader, project.id)).toEqual([tasks[0].id]);
  });
});
