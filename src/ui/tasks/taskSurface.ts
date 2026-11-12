import type { DayKey } from '../../domain/day';
import type { Block } from '../../domain/entities';
import { relativeDay } from '../format';

/**
 * The one place that says how a task behaves and what it shows, on every screen (ADR-073).
 * A screen names its surface; it never decides on its own which actions a task gets.
 */

/**
 * The hover actions a task can offer. Finishing is the checkbox, always there. `followUp` is the
 * day to follow up on a waiting task, the only date besides the deadline (ADR-072).
 */
export type TaskAction = 'details' | 'priority' | 'queue' | 'project' | 'followUp' | 'deadline' | 'waiting' | 'abandon';

/** Where a task is shown. */
export type TaskSurface = 'dayNote' | 'project' | 'idea' | 'table' | 'priorities' | 'person' | 'queue';

/**
 * What each screen offers. The rules that hold everywhere (a closed task keeps only "Detalhes",
 * nothing of mine on a waiting task, linking only a task without project) live in `taskActions`.
 * "Detalhes" is a button only where the text is an editable field; elsewhere a click on the text
 * opens the details (`TaskText`). The "Fila de execução" is the one surface with an action of its
 * own ("Remover da fila"), drawn by its screen.
 */
export const SURFACE_ACTIONS: Record<TaskSurface, readonly TaskAction[]> = {
  // spec/nota-do-dia.md: abandoning is not offered in the day note.
  dayNote: ['details', 'priority', 'queue', 'followUp', 'deadline', 'waiting'],
  project: ['details', 'priority', 'queue', 'followUp', 'deadline', 'waiting', 'abandon'],
  // The day's priorities are chosen in the day note.
  idea: ['details', 'followUp', 'deadline', 'abandon'],
  table: ['queue', 'project', 'deadline', 'abandon'],
  // The block's own star takes the task out of the priorities.
  priorities: ['queue', 'deadline'],
  person: ['followUp'],
  queue: ['project', 'deadline', 'abandon'],
};

/** Every action, in the order they show on a line. */
export const ACTION_ORDER: readonly TaskAction[] = ['details', 'priority', 'queue', 'project', 'followUp', 'deadline', 'waiting', 'abandon'];

export type TaskFields = Pick<Block, 'status' | 'text' | 'intendedDate'> & Partial<Pick<Block, 'waiting' | 'deadline'>>;

export interface TaskActionContext {
  /** The task already belongs to a project shown on the line. */
  hasProject?: boolean;
  /** How many active projects it could be linked to. */
  projectChoices?: number;
}

/** The actions a task offers on a surface, in display order. */
export function taskActions(task: TaskFields, surface: TaskSurface, context: TaskActionContext = {}): Set<TaskAction> {
  const offered = new Set(SURFACE_ACTIONS[surface]);
  if (task.status !== 'active') return offered.has('details') ? new Set(['details']) : new Set();
  if (task.waiting) {
    // Something a person owes me is not mine to do: no priority, no queue, no deadline.
    offered.delete('priority');
    offered.delete('queue');
    offered.delete('deadline');
  } else {
    offered.delete('followUp');
  }
  if (context.hasProject || !context.projectChoices) offered.delete('project');
  return new Set(ACTION_ORDER.filter((action) => offered.has(action)));
}

export const UNTITLED_TASK = '(tarefa sem texto)';

export function taskText(task: Pick<Block, 'text'>): string {
  return task.text || UNTITLED_TASK;
}

/** The day to follow up on a waiting task, in words; a task of mine has no date (ADR-072). */
export function followUpLabel(task: TaskFields, today: DayKey): string | null {
  return task.waiting && task.intendedDate ? `cobrar ${relativeDay(task.intendedDate, today)}` : null;
}

export function deadlineLabel(task: TaskFields, today: DayKey): string | null {
  return task.deadline ? `prazo ${relativeDay(task.deadline, today)}` : null;
}

/** The checkbox's name: finishing, or reopening a finished task. */
export function doneLabel(task: TaskFields): string {
  if (task.status === 'done') return `Reabrir "${task.text}"`;
  return task.waiting ? `Concluir: chegou "${task.text}"` : `Finalizar "${task.text}"`;
}
