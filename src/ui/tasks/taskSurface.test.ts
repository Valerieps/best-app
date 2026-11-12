import { describe, expect, it } from 'vitest';
import { ACTION_ORDER, SURFACE_ACTIONS, dateLabels, deadlineLabel, doneLabel, intendedDateLabel, taskActions, taskText, type TaskFields, type TaskSurface } from './taskSurface';

const today = '2026-11-12';
const open: TaskFields = { status: 'active', text: 'Ligar', intendedDate: null, waiting: false, deadline: null };
const list = (task: TaskFields, surface: TaskSurface, context = {}) => [...taskActions(task, surface, context)];

describe('taskActions', () => {
  it('offers each surface its own actions, always in the same order', () => {
    expect(list(open, 'dayNote')).toEqual(['priority', 'queue', 'date', 'deadline', 'waiting']);
    expect(list(open, 'project')).toEqual(['priority', 'queue', 'date', 'deadline', 'waiting', 'abandon']);
    expect(list(open, 'idea')).toEqual(['date', 'deadline', 'abandon']);
    expect(list(open, 'priorities')).toEqual(['queue', 'date', 'deadline']);
    expect(list(open, 'person')).toEqual(['date']);
    for (const surface of Object.keys(SURFACE_ACTIONS) as TaskSurface[]) {
      const actions = list(open, surface, { projectChoices: 2 });
      expect(actions).toEqual(ACTION_ORDER.filter((action) => actions.includes(action)));
    }
  });

  it('offers nothing on a finished task', () => {
    expect(list({ ...open, status: 'done' }, 'project')).toEqual([]);
    expect(list({ ...open, status: 'abandoned' }, 'table', { projectChoices: 2 })).toEqual([]);
  });

  it('keeps priority, queue and deadline off a waiting task', () => {
    expect(list({ ...open, waiting: true }, 'project')).toEqual(['date', 'waiting', 'abandon']);
    expect(list({ ...open, waiting: true }, 'priorities')).toEqual(['date']);
  });

  it('offers "Projeto" only to a task without project, when there is a project to pick', () => {
    expect(list(open, 'table')).toEqual(['queue', 'date', 'deadline', 'abandon']);
    expect(list(open, 'table', { projectChoices: 1 })).toEqual(['queue', 'project', 'date', 'deadline', 'abandon']);
    expect(list(open, 'queue', { projectChoices: 1, hasProject: true })).toEqual(['date', 'deadline', 'abandon']);
  });

  it('never offers the queue in the queue, nor the priority outside the day note and the project', () => {
    expect(SURFACE_ACTIONS.queue).not.toContain('queue');
    const withPriority = (Object.keys(SURFACE_ACTIONS) as TaskSurface[]).filter((surface) => SURFACE_ACTIONS[surface].includes('priority'));
    expect(withPriority).toEqual(['dayNote', 'project']);
  });
});

describe('task labels', () => {
  it('names a task without text', () => {
    expect(taskText({ text: '' })).toBe('(tarefa sem texto)');
    expect(taskText({ text: 'Ligar' })).toBe('Ligar');
  });

  it('says the dates in words, a waiting task with the day to follow up', () => {
    expect(intendedDateLabel(open, today)).toBeNull();
    expect(intendedDateLabel({ ...open, intendedDate: '2026-11-13' }, today)).toBe('amanhã');
    expect(intendedDateLabel({ ...open, waiting: true, intendedDate: '2026-11-13' }, today)).toBe('cobrar amanhã');
    expect(deadlineLabel({ ...open, deadline: '2026-11-13' }, today)).toBe('prazo amanhã');
    expect(deadlineLabel(open, today)).toBeNull();
    expect(dateLabels({ ...open, waiting: true }).button).toBe('Cobrar');
    expect(dateLabels(open).button).toBe('Data');
  });

  it('names the checkbox by what it does', () => {
    expect(doneLabel(open)).toBe('Finalizar "Ligar"');
    expect(doneLabel({ ...open, waiting: true })).toBe('Concluir: chegou "Ligar"');
    expect(doneLabel({ ...open, status: 'done' })).toBe('Reabrir "Ligar"');
  });
});
