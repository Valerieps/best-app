import { describe, expect, it } from 'vitest';
import { createTestContext } from '../test/fixtures';
import { addToQueue, removeFromQueue, reorderQueue } from './executionQueue';
import { abandonTask, setTaskDone, setTaskWaiting } from './notebook';
import { createProject, createProjectTask } from './projects';
import { loadExecutionQueue, loadQueueIds } from './queries';

async function setup(taskCount: number) {
  const context = createTestContext();
  const project = await createProject(context.ctx, 'Casa');
  const tasks = [];
  for (let i = 0; i < taskCount; i++) tasks.push((await createProjectTask(context.ctx, project.id, `tarefa ${i}`))!);
  return { ...context, project, tasks };
}

describe('execution queue', () => {
  it('keeps the order of addition, once each', async () => {
    const { ctx, reader, tasks } = await setup(3);
    await addToQueue(ctx, tasks[2].id);
    await addToQueue(ctx, tasks[0].id);
    await addToQueue(ctx, tasks[2].id);
    expect(await loadQueueIds(reader)).toEqual([tasks[2].id, tasks[0].id]);
  });

  it('shows each task with its project', async () => {
    const { ctx, reader, project, tasks } = await setup(1);
    await addToQueue(ctx, tasks[0].id);
    const data = await loadExecutionQueue(reader);
    expect(data.items.map((item) => item.project?.name)).toEqual([project.name]);
    expect(data.queueIds).toEqual([tasks[0].id]);
  });

  it('reorders by hand, with no event', async () => {
    const { ctx, db, reader, tasks } = await setup(3);
    for (const task of tasks) await addToQueue(ctx, task.id);
    const before = (await db.events.toArray()).length;
    await reorderQueue(ctx, [tasks[2].id, tasks[0].id, tasks[1].id], tasks[2].id);
    expect(await loadQueueIds(reader)).toEqual([tasks[2].id, tasks[0].id, tasks[1].id]);
    expect((await db.events.toArray()).length).toBe(before);
  });

  it('removes by hand, recording why', async () => {
    const { ctx, db, reader, tasks } = await setup(2);
    await addToQueue(ctx, tasks[0].id);
    await addToQueue(ctx, tasks[1].id);
    await removeFromQueue(ctx, tasks[0].id);
    expect(await loadQueueIds(reader)).toEqual([tasks[1].id]);
    const removed = (await db.events.toArray()).filter((event) => event.entityId === 'queue' && event.type === 'priority.removed');
    expect(removed.map((event) => event.data)).toEqual([expect.objectContaining({ taskId: tasks[0].id, reason: 'removed', itemIds: [tasks[1].id] })]);
  });

  it('finishing or abandoning takes the task out, and reopening does not bring it back', async () => {
    const { ctx, reader, tasks } = await setup(3);
    for (const task of tasks) await addToQueue(ctx, task.id);
    await setTaskDone(ctx, tasks[0].id, true);
    await abandonTask(ctx, tasks[1].id);
    expect(await loadQueueIds(reader)).toEqual([tasks[2].id]);
    await setTaskDone(ctx, tasks[0].id, false);
    expect(await loadQueueIds(reader)).toEqual([tasks[2].id]);
    expect((await reader.priorityList('queue'))!.itemIds).toEqual([tasks[2].id]);
  });

  it('does not take a closed or waiting task, and hides one that turned waiting', async () => {
    const { ctx, reader, tasks } = await setup(3);
    await setTaskDone(ctx, tasks[0].id, true);
    await setTaskWaiting(ctx, tasks[1].id, true);
    await addToQueue(ctx, tasks[0].id);
    await addToQueue(ctx, tasks[1].id);
    await addToQueue(ctx, tasks[2].id);
    expect(await loadQueueIds(reader)).toEqual([tasks[2].id]);
    await setTaskWaiting(ctx, tasks[2].id, true);
    expect(await loadQueueIds(reader)).toEqual([]);
  });
});
