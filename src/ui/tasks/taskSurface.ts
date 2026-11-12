import type { DayKey } from '../../domain/day';
import type { Block } from '../../domain/entities';
import { relativeDay } from '../format';

/**
 * The one place that says how a task behaves and what it shows, on every screen (ADR-072).
 * A screen names its surface; it never decides on its own which actions a task gets.
 */

/** The hover actions a task can offer. Finishing is the checkbox, always there. */
export type TaskAction = 'priority' | 'queue' | 'project' | 'date' | 'deadline' | 'waiting' | 'abandon';

/** Where a task is shown. */
export type TaskSurface = 'dayNote' | 'project' | 'idea' | 'table' | 'priorities' | 'person' | 'queue';

/**
 * What each screen offers, in the order the actions show. The rules that hold everywhere (only
 * open tasks, nothing of mine on a waiting task, linking only a task without project) live in
 * `taskActions`. The "Fila de execução" is the one surface with an action of its own ("Remover
 * da fila"), drawn by its screen.
 */
export const SURFACE_ACTIONS: Record<TaskSurface, readonly TaskAction[]> = {
  // spec/nota-do-dia.md: abandoning is not offered in the day note.
  dayNote: ['priority', 'queue', 'date', 'deadline', 'waiting'],
  project: ['priority', 'queue', 'date', 'deadline', 'waiting', 'abandon'],
  // The day's priorities are chosen in the day note.
  idea: ['date', 'deadline', 'abandon'],
  table: ['queue', 'project', 'date', 'deadline', 'abandon'],
  // The block's own star takes the task out of the priorities.
  priorities: ['queue', 'date', 'deadline'],
  person: ['date'],
  queue: ['project', 'date', 'deadline', 'abandon'],
};

/** Every action, in the order they show on a line. */
export const ACTION_ORDER: readonly TaskAction[] = ['priority', 'queue', 'project', 'date', 'deadline', 'waiting', 'abandon'];

export type TaskFields = Pick<Block, 'status' | 'text' | 'intendedDate'> & Partial<Pick<Block, 'waiting' | 'deadline'>>;

export interface TaskActionContext {
  /** The task already belongs to a project shown on the line. */
  hasProject?: boolean;
  /** How many active projects it could be linked to. */
  projectChoices?: number;
}

/** The actions a task offers on a surface, in display order. */
export function taskActions(task: TaskFields, surface: TaskSurface, context: TaskActionContext = {}): Set<TaskAction> {
  if (task.status !== 'active') return new Set();
  const offered = new Set(SURFACE_ACTIONS[surface]);
  if (task.waiting) {
    // Something a person owes me is not mine to do: no priority, no queue, no deadline.
    offered.delete('priority');
    offered.delete('queue');
    offered.delete('deadline');
  }
  if (context.hasProject || !context.projectChoices) offered.delete('project');
  return new Set(ACTION_ORDER.filter((action) => offered.has(action)));
}

export const UNTITLED_TASK = '(tarefa sem texto)';

export function taskText(task: Pick<Block, 'text'>): string {
  return task.text || UNTITLED_TASK;
}

/** The intended date as words; for a waiting task, the day to follow up. */
export function intendedDateLabel(task: TaskFields, today: DayKey): string | null {
  if (!task.intendedDate) return null;
  return `${task.waiting ? 'cobrar ' : ''}${relativeDay(task.intendedDate, today)}`;
}

export function deadlineLabel(task: TaskFields, today: DayKey): string | null {
  return task.deadline ? `prazo ${relativeDay(task.deadline, today)}` : null;
}

/** The checkbox's name: finishing, or reopening a finished task. */
export function doneLabel(task: TaskFields): string {
  if (task.status === 'done') return `Reabrir "${task.text}"`;
  return task.waiting ? `Concluir: chegou "${task.text}"` : `Finalizar "${task.text}"`;
}

/** The names of the intended date's controls; a waiting task's date is the day to follow up. */
export function dateLabels(task: TaskFields): { set: string; change: string; clear: string; button: string } {
  return task.waiting
    ? { set: 'Data para cobrar', change: 'Mudar a data para cobrar', clear: 'Tirar a data para cobrar', button: 'Cobrar' }
    : { set: 'Data de intenção', change: 'Mudar a data de intenção', clear: 'Tirar a data de intenção', button: 'Data' };
}
