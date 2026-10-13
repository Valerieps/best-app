import { toDayKey } from '../domain/day';
import type { Block, Project, Section } from '../domain/entities';
import { positionBetween } from '../domain/position';
import { isProjectIcon } from '../domain/projectPage';
import { record } from './events';
import type { AppContext, StoreTransaction } from './ports';
import { releaseFocusProject } from './focusProjects';

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
    if (finished) await releaseFocusProject(ctx, tx, project.id);
  });
}

/** One of the app's icons, or null for the name's initial. */
export async function setProjectIcon(ctx: AppContext, projectId: string, icon: string | null): Promise<void> {
  if (icon !== null && !isProjectIcon(icon)) throw new Error(`Unknown project icon: ${icon}`);
  await ctx.store.transaction(async (tx) => {
    const project = await tx.projects.get(projectId);
    if (!project || (project.icon ?? null) === icon) return;
    await tx.projects.put({ ...project, icon, updatedAt: ctx.clock.now().toISOString() });
    await record(ctx, tx, 'project.iconChanged', 'project', project.id, toDayKey(ctx.clock.now()), {
      from: project.icon ?? null,
      to: icon,
    });
  });
}

/** The section that holds the tasks written on the project's page, created on first use. */
async function projectPageSection(ctx: AppContext, tx: StoreTransaction, project: Project): Promise<Section> {
  const existing = (await tx.sectionsOfProject(project.id)).find((section) => section.projectPage === true);
  if (existing) return existing;
  const now = ctx.clock.now();
  const at = now.toISOString();
  const section: Section = {
    id: ctx.ids.next(),
    kind: 'general',
    day: toDayKey(now),
    createdAt: at,
    updatedAt: at,
    title: null,
    projectId: project.id,
    // Nothing to triage: it never holds notes, and it is linked from the start.
    notesDestination: 'wiki',
    whiteboardDecision: 'pending',
    projectPage: true,
  };
  await tx.sections.put(section);
  await record(ctx, tx, 'section.created', 'section', section.id, section.day, { kind: section.kind, projectPage: true, projectId: project.id });
  return section;
}

/**
 * "Posso criar uma tarefa direto na página do projeto; ela já nasce vinculada a ele." The task
 * is active and without a date, outside any day note: it shows up in a day, and goes through
 * that day's checkout, only once it gets an intended date.
 */
export async function createProjectTask(ctx: AppContext, projectId: string, text: string): Promise<Block | null> {
  const trimmed = text.trim();
  if (!trimmed) return null;
  return ctx.store.transaction(async (tx) => {
    const project = await tx.projects.get(projectId);
    if (!project) throw new Error('Project not found');
    const section = await projectPageSection(ctx, tx, project);
    const siblings = await tx.blocksInSection(section.id);
    const last = siblings.map((block) => block.position).sort().at(-1) ?? null;
    const at = ctx.clock.now().toISOString();
    const task: Block = {
      id: ctx.ids.next(),
      kind: 'task',
      text: trimmed,
      sectionId: section.id,
      position: positionBetween(last, null),
      projectId: project.id,
      createdAt: at,
      updatedAt: at,
      status: 'active',
      intendedDate: null,
      firstIntendedDate: null,
      postponeCount: 0,
      closedAt: null,
      lastTriagedDay: null,
    };
    await tx.blocks.put(task);
    await record(ctx, tx, 'block.created', 'block', task.id, toDayKey(ctx.clock.now()), {
      kind: 'task',
      sectionId: section.id,
      projectId: project.id,
    });
    return task;
  });
}
