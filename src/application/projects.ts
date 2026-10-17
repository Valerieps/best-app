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
  await ctx.store.transaction((tx) => renameProjectIn(ctx, tx, projectId, name));
}

/** Renames a project inside a transaction; returns the old name, or null when nothing changed. */
export async function renameProjectIn(ctx: AppContext, tx: StoreTransaction, projectId: string, name: string): Promise<string | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const project = await tx.projects.get(projectId);
  if (!project || project.name === trimmed) return null;
  await tx.projects.put({ ...project, name: trimmed, updatedAt: ctx.clock.now().toISOString() });
  await record(ctx, tx, 'project.renamed', 'project', project.id, toDayKey(ctx.clock.now()), {
    from: project.name,
    to: trimmed,
  });
  return project.name;
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

/** The empty section of a note on a project page's timeline, written today, inside a transaction. */
export async function addProjectNoteSection(ctx: AppContext, tx: StoreTransaction, projectId: string): Promise<Section> {
  const project = await tx.projects.get(projectId);
  if (!project) throw new Error('Project not found');
  const now = ctx.clock.now();
  const at = now.toISOString();
  const day = toDayKey(now);
  const section: Section = {
    id: ctx.ids.next(),
    kind: 'general',
    day,
    createdAt: at,
    updatedAt: at,
    title: null,
    projectId: project.id,
    notesDestination: 'wiki',
    whiteboardDecision: 'pending',
    projectNote: true,
  };
  await tx.sections.put(section);
  await record(ctx, tx, 'section.created', 'section', section.id, day, { kind: section.kind, projectNote: true, projectId: project.id });
  return section;
}

/**
 * "Nova nota" on the project page's timeline: the lines become the notes of a new section of the
 * project, written today. The section belongs to no day note, so the note shows only on the
 * project page, and it has nothing to triage. Empty lines are dropped.
 */
export async function createProjectNote(ctx: AppContext, projectId: string, text: string): Promise<Section | null> {
  const lines = text
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => line.trim() !== '');
  if (lines.length === 0) return null;
  return ctx.store.transaction(async (tx) => {
    const section = await addProjectNoteSection(ctx, tx, projectId);
    const at = section.createdAt;
    const day = section.day;
    let position: string | null = null;
    for (const line of lines) {
      position = positionBetween(position, null);
      const note: Block = {
        id: ctx.ids.next(),
        kind: 'note',
        text: line,
        sectionId: section.id,
        position,
        projectId: null,
        createdAt: at,
        updatedAt: at,
        status: null,
        intendedDate: null,
        firstIntendedDate: null,
        postponeCount: 0,
        closedAt: null,
        lastTriagedDay: null,
      };
      await tx.blocks.put(note);
      await record(ctx, tx, 'block.created', 'block', note.id, day, { kind: 'note', sectionId: section.id });
    }
    return section;
  });
}
