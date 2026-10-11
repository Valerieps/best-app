import { toDayKey } from '../domain/day';
import type { Project } from '../domain/entities';
import { record } from './events';
import type { AppContext, StoreTransaction } from './ports';

/** Creates a project inside an existing transaction. */
export async function addProject(ctx: AppContext, tx: StoreTransaction, name: string): Promise<Project> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Project name must not be empty');

  const now = ctx.clock.now();
  const at = now.toISOString();
  const project: Project = {
    id: ctx.ids.next(),
    name: trimmed,
    status: 'active',
    createdAt: at,
    updatedAt: at,
    finishedAt: null,
  };
  await tx.projects.put(project);
  await record(ctx, tx, 'project.created', 'project', project.id, toDayKey(now), { name: project.name });
  return project;
}

export async function createProject(ctx: AppContext, name: string): Promise<Project> {
  return ctx.store.transaction((tx) => addProject(ctx, tx, name));
}

export async function renameProject(ctx: AppContext, projectId: string, name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) return;
  await ctx.store.transaction(async (tx) => {
    const project = await tx.projects.get(projectId);
    if (!project || project.name === trimmed) return;
    await tx.projects.put({ ...project, name: trimmed, updatedAt: ctx.clock.now().toISOString() });
    await record(ctx, tx, 'project.renamed', 'project', project.id, toDayKey(ctx.clock.now()), {
      from: project.name,
      to: trimmed,
    });
  });
}

/** Projects are only finished by hand: "eu abro o projeto e finalizo". */
export async function setProjectFinished(ctx: AppContext, projectId: string, finished: boolean): Promise<void> {
  await ctx.store.transaction(async (tx) => {
    const project = await tx.projects.get(projectId);
    if (!project || project.status === 'merged') return;
    if (finished === (project.status === 'finished')) return;
    const at = ctx.clock.now().toISOString();
    await tx.projects.put({
      ...project,
      status: finished ? 'finished' : 'active',
      finishedAt: finished ? at : null,
      updatedAt: at,
    });
    await record(ctx, tx, finished ? 'project.finished' : 'project.reopened', 'project', project.id, toDayKey(ctx.clock.now()));
  });
}
