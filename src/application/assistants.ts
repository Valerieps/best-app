import { toDayKey, type DayKey } from '../domain/day';
import type { WhiteboardGroupAction } from '../domain/assistants';
import type { Block } from '../domain/entities';
import type { TaskDecision } from '../domain/triage';
import type { PlanningChange } from './checkout';
import { record } from './events';
import { moveIntendedDate } from './intendedDate';
import { finishTaskIn, linkSection } from './notebook';
import type { AppContext } from './ports';
import { addProject, addProjectNoteSection } from './projects';

/** Use cases of the cleanup assistants (spec/assistentes.md). Nothing here deletes data. */

function today(ctx: AppContext): DayKey {
  return toDayKey(ctx.clock.now());
}

/** Converts, links or keeps a group of whiteboard sections with the same title. */
export async function resolveWhiteboardGroup(
  ctx: AppContext,
  sectionIds: readonly string[],
  action: WhiteboardGroupAction,
): Promise<void> {
  await ctx.store.transaction(async (tx) => {
    const day = today(ctx);
    let projectId: string | null = null;
    if (action.kind === 'convert') projectId = (await addProject(ctx, tx, action.name)).id;
    if (action.kind === 'link') projectId = action.projectId;
    for (const sectionId of sectionIds) {
      const section = await tx.sections.get(sectionId);
      if (!section || section.projectId !== null) continue;
      if (projectId) {
        await linkSection(ctx, tx, section, projectId, day);
      } else {
        await tx.sections.put({ ...section, whiteboardDecision: 'keptUnlinked', updatedAt: ctx.clock.now().toISOString() });
        await record(ctx, tx, 'section.keptUnlinked', 'section', section.id, day);
      }
    }
  });
}

/** Joins duplicate projects into `keepId`: their sections and tasks move, and they are marked merged. */
export async function mergeProjects(ctx: AppContext, keepId: string, mergeIds: readonly string[]): Promise<void> {
  await ctx.store.transaction(async (tx) => {
    const day = today(ctx);
    const at = ctx.clock.now().toISOString();
    if (!(await tx.projects.get(keepId))) throw new Error('Project to keep not found');
    for (const id of mergeIds) {
      if (id === keepId) continue;
      const project = await tx.projects.get(id);
      if (!project || project.status === 'merged') continue;
      for (const section of await tx.sectionsOfProject(id)) {
        await tx.sections.put({ ...section, projectId: keepId, updatedAt: at });
        await record(ctx, tx, 'section.linkedToProject', 'section', section.id, day, { projectId: keepId, mergedFrom: id });
      }
      for (const block of await tx.blocksOfProject(id)) {
        await tx.blocks.put({ ...block, projectId: keepId, updatedAt: at });
        await record(ctx, tx, 'block.linkedToProject', 'block', block.id, day, { projectId: keepId, mergedFrom: id });
      }
      await tx.projects.put({ ...project, status: 'merged', mergedInto: keepId, updatedAt: at });
      await record(ctx, tx, 'project.merged', 'project', id, day, { into: keepId });
    }
  });
}

/** What "Tarefas esquecidas" does with a task right away; "Colocar data" goes on to the board. */
export type ForgottenTaskAction = 'abandon' | 'note';

/**
 * Abandons or converts into notes the forgotten tasks given, in one transaction. Tasks no longer
 * open are left alone. A task becomes a note where it was written, in the same section; when
 * that would take it off its project (a task of the project page, or linked to a project its
 * section is not), it becomes a note on the project's page instead, written today.
 */
export async function resolveForgottenTasks(ctx: AppContext, actions: ReadonlyMap<string, ForgottenTaskAction>): Promise<void> {
  await ctx.store.transaction(async (tx) => {
    const day = today(ctx);
    const at = ctx.clock.now().toISOString();
    for (const [taskId, action] of actions) {
      const task = await tx.blocks.get(taskId);
      if (!task || task.kind !== 'task' || task.status !== 'active') continue;
      if (action === 'abandon') {
        await tx.blocks.put({ ...task, status: 'abandoned', closedAt: at, updatedAt: at });
        await record(ctx, tx, 'task.abandoned', 'block', task.id, day);
        continue;
      }
      const section = await tx.sections.get(task.sectionId);
      const keepsProject = section !== undefined && section.projectPage !== true && section.projectId === task.projectId;
      const sectionId = keepsProject || !task.projectId ? task.sectionId : (await addProjectNoteSection(ctx, tx, task.projectId)).id;
      const { waiting: _waiting, awaitingReflection: _awaiting, carriedOrder: _order, deadline: _deadline, ...rest } = task;
      const note: Block = {
        ...rest,
        kind: 'note',
        sectionId,
        projectId: null,
        status: null,
        intendedDate: null,
        updatedAt: at,
      };
      await tx.blocks.put(note);
      await record(ctx, tx, 'block.kindChanged', 'block', task.id, day, {
        from: 'task',
        to: 'note',
        ...(sectionId !== task.sectionId ? { sectionId } : {}),
      });
    }
  });
}

/** Moves the planning board of "Tarefas esquecidas": new dates, finished and abandoned tasks. */
export async function planForgottenTasks(
  ctx: AppContext,
  decisions: ReadonlyMap<string, TaskDecision>,
  changes: readonly PlanningChange[],
): Promise<void> {
  await ctx.store.transaction(async (tx) => {
    const day = today(ctx);
    const at = ctx.clock.now().toISOString();
    const moves = [...changes, ...[...decisions].flatMap(([taskId, decision]) => (decision.kind === 'schedule' ? [{ taskId, date: decision.date }] : []))];
    for (const { taskId, date } of moves) {
      const task = await tx.blocks.get(taskId);
      if (!task || task.kind !== 'task' || task.status !== 'active' || task.intendedDate === date) continue;
      const { awaitingReflection: _settled, ...rest } = await moveIntendedDate(ctx, tx, task, date, day, 'planning');
      await tx.blocks.put(rest);
    }
    for (const [taskId, decision] of decisions) {
      const task = await tx.blocks.get(taskId);
      if (!task || task.kind !== 'task' || task.status !== 'active') continue;
      if (decision.kind === 'finish') await finishTaskIn(ctx, tx, task, day);
      if (decision.kind === 'abandon') {
        await tx.blocks.put({ ...task, status: 'abandoned', closedAt: at, updatedAt: at });
        await record(ctx, tx, 'task.abandoned', 'block', task.id, day);
      }
    }
  });
}

/** "Manter separados": the duplicates assistant stops suggesting these projects together. */
export async function keepProjectsSeparate(ctx: AppContext, projectIds: readonly string[]): Promise<void> {
  await ctx.store.transaction(async (tx) => {
    for (const id of projectIds) {
      const project = await tx.projects.get(id);
      if (!project) continue;
      const others = projectIds.filter((other) => other !== id);
      const keepSeparateFrom = [...new Set([...(project.keepSeparateFrom ?? []), ...others])];
      await tx.projects.put({ ...project, keepSeparateFrom, updatedAt: ctx.clock.now().toISOString() });
    }
  });
}
