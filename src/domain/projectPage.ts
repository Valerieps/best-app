import type { Block, Section } from './entities';

/** Section 2: rules behind the project page. */

/** The icons a project can have. The drawings live in the UI; the project stores only the id. */
export const PROJECT_ICONS = [
  'pot',
  'home',
  'briefcase',
  'book',
  'heart',
  'plane',
  'code',
  'balloon',
  'leaf',
  'music',
  'dumbbell',
  'camera',
] as const;

export type ProjectIcon = (typeof PROJECT_ICONS)[number];

export function isProjectIcon(value: unknown): value is ProjectIcon {
  return typeof value === 'string' && (PROJECT_ICONS as readonly string[]).includes(value);
}

/** Letter shown for a project without an icon. */
export function projectInitial(name: string): string {
  return name.trim().charAt(0).toLocaleUpperCase('pt-BR') || '?';
}

/**
 * Sections that belong to a day note. The section that holds a project page's tasks does not,
 * nor do the notes written on a project page, nor the page of an idea (ADR-067).
 */
export function isDaySection(section: Section): boolean {
  return section.projectPage !== true && section.projectNote !== true && section.ideaId === undefined;
}

function byCreation(a: Block, b: Block): number {
  return a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0;
}

export interface ProjectTaskGroups {
  /** "Na fila": the project's tasks in the "Fila de execução", in the queue's order. */
  queued: Block[];
  /** "A fazer": every other task of mine, out of the queue. */
  open: Block[];
  /** "Aguardando": every task a person owes me. */
  waiting: Block[];
}

/**
 * The project's active tasks in the page's groups, each by creation. A task shows only once: a
 * waiting task only among the waiting ones, a queued task only in "Na fila". Tasks have no
 * intended date any more, so nothing is "travada" (ADR-072).
 */
export function groupProjectTasks(active: readonly Block[], queueIds: readonly string[] = []): ProjectTaskGroups {
  const sorted = [...active].sort(byCreation);
  const waiting = sorted.filter((task) => task.waiting === true);
  const mine = sorted.filter((task) => task.waiting !== true);
  const byId = new Map(mine.map((task) => [task.id, task]));
  const queued = queueIds.flatMap((id) => byId.get(id) ?? []);
  return { queued, open: mine.filter((task) => !queued.includes(task)), waiting };
}
