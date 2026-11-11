import { addDays, type DayKey } from './day';
import type { Project } from './entities';
import type { TaskListEntry } from './taskList';

/**
 * The "Executar" screen (spec/prioridades.md, "Tela \"Executar\""): what asks for attention now,
 * in one view. The day's priorities come first and are built by `buildDayPriorities`; this
 * function builds the lists below them.
 */

/** Where the next steps come from: every active project, or only the projects in focus. */
export type ExecuteScope = 'all' | 'focus';

/** How many days ahead "Prazos chegando" looks; 0 hides it. */
export const DEADLINE_WINDOWS = [0, 3, 7, 14] as const;
export type DeadlineWindow = (typeof DEADLINE_WINDOWS)[number];
export const DEFAULT_DEADLINE_WINDOW: DeadlineWindow = 7;

export interface ExecuteInput<T extends TaskListEntry> {
  today: DayKey;
  /** The day's priorities, already shown at the top: they never repeat below. */
  priorityIds: readonly string[];
  /** My open tasks, in the order the lists show them. */
  items: readonly T[];
  /** The valid next steps of every project, each project's in the order chosen. */
  nextStepIds: readonly string[];
  /** The projects in focus, in their order. */
  focusIds: readonly string[];
  scope: ExecuteScope;
  deadlineWindow: number;
}

export interface NextStepGroup<T> {
  project: Project;
  items: T[];
}

export interface ExecuteView<T> {
  /** Intended date today or before, or a deadline already past. */
  dueNow: T[];
  /** Deadline after today, within the window, soonest first. */
  deadlines: T[];
  /** Projects in focus first, in their order, then the others by name. */
  nextSteps: NextStepGroup<T>[];
}

/** Builds the lists of the screen. A task shows once, in the first list it fits. */
export function buildExecuteView<T extends TaskListEntry>(input: ExecuteInput<T>): ExecuteView<T> {
  const { today, items, focusIds } = input;
  const shown = new Set(input.priorityIds);
  const take = (list: T[]) => {
    for (const item of list) shown.add(item.task.id);
    return list;
  };

  const dueNow = take(
    items.filter(
      (item) =>
        !shown.has(item.task.id) &&
        ((item.task.intendedDate !== null && item.task.intendedDate <= today) ||
          (item.task.deadline != null && item.task.deadline < today)),
    ),
  );

  const until = addDays(today, input.deadlineWindow);
  const deadlines = take(
    input.deadlineWindow <= 0
      ? []
      : items
          .filter((item) => !shown.has(item.task.id) && item.task.deadline != null && item.task.deadline > today && item.task.deadline <= until)
          .map((item, index) => ({ item, index }))
          .sort((a, b) => (a.item.task.deadline! < b.item.task.deadline! ? -1 : a.item.task.deadline! > b.item.task.deadline! ? 1 : a.index - b.index))
          .map(({ item }) => item),
  );

  const byId = new Map(items.map((item) => [item.task.id, item]));
  const groups = new Map<string, NextStepGroup<T>>();
  for (const id of input.nextStepIds) {
    const item = byId.get(id);
    const project = item?.project;
    if (!item || !project || project.status !== 'active' || shown.has(id)) continue;
    if (input.scope === 'focus' && !focusIds.includes(project.id)) continue;
    const group = groups.get(project.id) ?? { project, items: [] };
    group.items.push(item);
    groups.set(project.id, group);
    shown.add(id);
  }
  const rank = (project: Project) => {
    const index = focusIds.indexOf(project.id);
    return index === -1 ? focusIds.length : index;
  };
  const nextSteps = [...groups.values()].sort(
    (a, b) => rank(a.project) - rank(b.project) || a.project.name.localeCompare(b.project.name, 'pt-BR', { sensitivity: 'base' }),
  );

  return { dueNow, deadlines, nextSteps };
}
