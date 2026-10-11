import { toDayKey } from '../domain/day';
import type { Project } from '../domain/entities';
import type { AppContext } from './ports';

export async function createProject(ctx: AppContext, name: string): Promise<Project> {
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

  await ctx.store.transaction(async (tx) => {
    await tx.projects.put(project);
    await tx.appendEvent({
      id: ctx.ids.next(),
      type: 'project.created',
      entityType: 'project',
      entityId: project.id,
      at,
      day: toDayKey(now),
      data: { name: project.name },
    });
  });

  return project;
}
