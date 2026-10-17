import { daysBetween, toDayKey, type DayKey } from './day';
import type { Block, Project, Section } from './entities';
import { findCitedName, normalizeForMatch } from './text';

/**
 * Cleanup assistants (spec/assistentes.md): each finds what is out of place and suggests an action;
 * the user accepts the suggestions in one go, as in the checkout. Nothing is deleted.
 */

export type WhiteboardGroupAction =
  | { kind: 'convert'; name: string }
  | { kind: 'link'; projectId: string }
  | { kind: 'keep' };

export interface WhiteboardGroup {
  key: string;
  title: string;
  sections: Section[];
  suggestion: WhiteboardGroupAction;
}

/**
 * Sections that ended up without a project, grouped by repeated titles. Untitled sections are
 * left out: there is nothing to group them by or to name a project after. When the title or the
 * text of a section cites an existing project, the suggestion is to link to it; this suggestion
 * used to be made at the daily closing (spec/assistentes.md, "Seções soltas").
 */
export function findWhiteboardGroups(
  sections: readonly Section[],
  projects: readonly Project[],
  /** The text of each section's lines, by section id. */
  texts: ReadonlyMap<string, string> = new Map(),
): WhiteboardGroup[] {
  const active = projects.filter((project) => project.status === 'active');
  const groups = new Map<string, Section[]>();
  for (const section of sections) {
    if (section.projectId !== null || section.whiteboardDecision !== 'leftUnlinked') continue;
    const title = section.title?.trim();
    if (!title) continue;
    const key = normalizeForMatch(title);
    groups.set(key, [...(groups.get(key) ?? []), section]);
  }
  return [...groups]
    .map(([key, grouped]) => {
      const sorted = [...grouped].sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
      const title = sorted.at(-1)!.title!.trim();
      const cited = sorted
        .map((section) => findCitedName([section.title ?? '', texts.get(section.id) ?? ''].join('\n'), active))
        .find(Boolean);
      const existing = active.find((project) => normalizeForMatch(project.name) === key) ?? findCitedName(title, active) ?? cited;
      const suggestion: WhiteboardGroupAction = existing
        ? { kind: 'link', projectId: existing.id }
        : sorted.length >= 2
          ? { kind: 'convert', name: title }
          : { kind: 'keep' };
      return { key, title, sections: sorted, suggestion };
    })
    .sort((a, b) => b.sections.length - a.sections.length || a.title.localeCompare(b.title));
}

/** Letters and digits only, so "Data Studios" and "DataStudios" compare equal. */
function compactName(name: string): string {
  return normalizeForMatch(name).replace(/[^a-z0-9]/g, '');
}

/** Levenshtein distance, stopping early above `limit`. */
function editDistance(a: string, b: string, limit: number): number {
  if (Math.abs(a.length - b.length) > limit) return limit + 1;
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    previous = current;
  }
  return previous[b.length];
}

/** Names this long or longer may differ by one typo and still count as the same project. */
const TYPO_MIN_LENGTH = 5;

export function areSimilarNames(a: string, b: string): boolean {
  const x = compactName(a);
  const y = compactName(b);
  if (!x || !y) return false;
  if (x === y) return true;
  return Math.min(x.length, y.length) >= TYPO_MIN_LENGTH && editDistance(x, y, 1) <= 1;
}

export interface DuplicateGroup {
  key: string;
  projects: Project[];
  /** The oldest project, which keeps its name and receives the others. */
  keep: Project;
}

/** Active projects with similar names, unless the user already said to keep them apart. */
export function findDuplicateProjects(projects: readonly Project[]): DuplicateGroup[] {
  const active = projects.filter((project) => project.status === 'active');
  const parent = new Map(active.map((project) => [project.id, project.id]));
  const find = (id: string): string => {
    const up = parent.get(id)!;
    return up === id ? id : find(up);
  };
  const keptApart = (a: Project, b: Project) =>
    (a.keepSeparateFrom ?? []).includes(b.id) || (b.keepSeparateFrom ?? []).includes(a.id);

  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      if (!areSimilarNames(active[i].name, active[j].name) || keptApart(active[i], active[j])) continue;
      parent.set(find(active[j].id), find(active[i].id));
    }
  }

  const groups = new Map<string, Project[]>();
  for (const project of active) groups.set(find(project.id), [...(groups.get(find(project.id)) ?? []), project]);
  return [...groups.values()]
    .filter((group) => group.length > 1)
    .map((group) => {
      const sorted = [...group].sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
      return { key: sorted.map((project) => project.id).join('+'), projects: sorted, keep: sorted[0] };
    });
}

/** Days without a date, counted from creation, after which a task is at risk of being forgotten. */
export const DEFAULT_FORGOTTEN_TASK_DAYS = 15;

/** Whole days from 1 up; anything else falls back to the default. */
export function normalizeForgottenTaskDays(days: number | null | undefined): number {
  return typeof days === 'number' && Number.isFinite(days) ? Math.max(1, Math.round(days)) : DEFAULT_FORGOTTEN_TASK_DAYS;
}

/**
 * "Tarefas esquecidas": open tasks without an intended date created `days` days ago or more,
 * the oldest first. Age counts from creation, not from when the date was removed. Tasks waiting
 * for someone count too (spec/assistentes.md).
 */
export function findForgottenTasks(tasks: readonly Block[], today: DayKey, days: number): Block[] {
  return tasks
    .filter(
      (task) =>
        task.kind === 'task' &&
        task.status === 'active' &&
        task.intendedDate === null &&
        daysBetween(toDayKey(new Date(task.createdAt)), today) >= days,
    )
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0));
}
