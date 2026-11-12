import {
  TASK_LIST_KEYS,
  TASK_SORT_KEYS,
  type ProjectFilter,
  type SortDirection,
  type TaskGroupBy,
  type TaskListKey,
  type TaskSortKey,
} from '../../domain/taskList';

/** The columns of the tasks table that can be shown or hidden. "Tarefa" is always shown. */
export type TaskColumn = Exclude<TaskSortKey, 'text'>;

export const TASK_COLUMNS: readonly TaskColumn[] = ['deadline', 'project', 'createdDate', 'postponeCount'];

export const COLUMN_LABELS: Record<TaskSortKey, string> = {
  text: 'Tarefa',
  deadline: 'Prazo',
  project: 'Projeto',
  createdDate: 'Criada em',
  postponeCount: 'Adiamentos',
};

/** Which tasks the list shows. Not remembered: the screen always opens on the open tasks. */
export type TaskShow = 'open' | 'done' | 'all';

export interface TaskListView {
  groupBy: TaskGroupBy;
  sortBy: TaskSortKey;
  direction: SortDirection;
  project: ProjectFilter;
  /** The optional columns shown, in table order. */
  columns: TaskColumn[];
}

export const DEFAULT_VIEW: TaskListView = {
  groupBy: 'none',
  sortBy: 'createdDate',
  direction: 'asc',
  project: 'all',
  columns: ['deadline', 'project'],
};

function isListKey(value: unknown): value is TaskListKey {
  return TASK_LIST_KEYS.includes(value as TaskListKey);
}

function isSortKey(value: unknown): value is TaskSortKey {
  return TASK_SORT_KEYS.includes(value as TaskSortKey);
}

function isProjectFilter(value: unknown): value is ProjectFilter {
  return (
    value === 'all' ||
    value === 'focus' ||
    value === 'none' ||
    (typeof value === 'string' && value.startsWith('project:') && value.length > 'project:'.length)
  );
}

/** Reads a saved view, keeping what is valid; the old "Só projetos em foco" becomes the focus filter. */
export function parseView(raw: string | null): TaskListView {
  let saved: Partial<Record<string, unknown>> = {};
  try {
    const parsed: unknown = JSON.parse(raw ?? '{}');
    if (parsed && typeof parsed === 'object') saved = parsed as Partial<Record<string, unknown>>;
  } catch {
    return DEFAULT_VIEW;
  }
  const columns = Array.isArray(saved.columns)
    ? TASK_COLUMNS.filter((column) => (saved.columns as unknown[]).includes(column))
    : DEFAULT_VIEW.columns;
  return {
    groupBy: saved.groupBy === 'none' || isListKey(saved.groupBy) ? saved.groupBy : DEFAULT_VIEW.groupBy,
    sortBy: isSortKey(saved.sortBy) ? saved.sortBy : DEFAULT_VIEW.sortBy,
    direction: saved.direction === 'desc' ? 'desc' : 'asc',
    project: isProjectFilter(saved.project) ? saved.project : saved.focusOnly === true ? 'focus' : 'all',
    columns,
  };
}

/** Clicking a column header: the same column flips the direction, another one starts ascending. */
export function sortByColumn(view: TaskListView, key: TaskSortKey): TaskListView {
  if (view.sortBy === key) return { ...view, direction: view.direction === 'asc' ? 'desc' : 'asc' };
  return { ...view, sortBy: key, direction: 'asc' };
}

/** Shows or hides a column, keeping the table order. */
export function toggleColumn(view: TaskListView, column: TaskColumn): TaskListView {
  const shown = view.columns.includes(column);
  return { ...view, columns: TASK_COLUMNS.filter((key) => (key === column ? !shown : view.columns.includes(key))) };
}

/** How many filters differ from the default, for the badge on "Filtros". */
export function activeFilterCount(view: TaskListView, show: TaskShow): number {
  return (show !== 'open' ? 1 : 0) + (view.project !== 'all' ? 1 : 0);
}
