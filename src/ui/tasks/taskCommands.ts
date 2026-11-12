import { addToQueue, removeFromQueue } from '../../application/executionQueue';
import { moveDayPriority, setDayPriority, setDeadline, setIntendedDate, setTaskProject } from '../../application/dayTools';
import { abandonTask, setTaskDone, setTaskWaiting } from '../../application/notebook';
import type { DayKey } from '../../domain/day';
import { appContext } from '../services';
import { write } from '../writeQueue';

/**
 * Every change a screen makes to one task, through the write queue, so the same action does the
 * same thing on every screen (ADR-072).
 */
export const taskCommands = {
  setDone: (taskId: string, done: boolean) => write(() => setTaskDone(appContext, taskId, done)),
  setDate: (taskId: string, date: DayKey | null) => write(() => setIntendedDate(appContext, taskId, date)),
  setDeadline: (taskId: string, date: DayKey | null) => write(() => setDeadline(appContext, taskId, date)),
  setPriority: (taskId: string, on: boolean) => write(() => setDayPriority(appContext, taskId, on)),
  /** A priority of the day that moves to another date, leaving the priorities. */
  movePriority: (taskId: string, date: DayKey | null) => write(() => moveDayPriority(appContext, taskId, date)),
  addToQueue: (taskId: string) => write(() => addToQueue(appContext, taskId)),
  removeFromQueue: (taskId: string) => write(() => removeFromQueue(appContext, taskId)),
  setWaiting: (taskId: string, waiting: boolean) => write(() => setTaskWaiting(appContext, taskId, waiting)),
  linkProject: (taskId: string, projectId: string) => write(() => setTaskProject(appContext, taskId, projectId)),
  abandon: (taskId: string) => write(() => abandonTask(appContext, taskId)),
};
