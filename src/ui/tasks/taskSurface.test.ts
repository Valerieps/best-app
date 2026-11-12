import { describe, expect, it } from 'vitest';
import { ACTION_ORDER, SURFACE_ACTIONS, deadlineLabel, doneLabel, followUpLabel, taskActions, taskText, type TaskFields, type TaskSurface } from './taskSurface';

const today = '2026-11-12';
const open: TaskFields = { status: 'active', text: 'Ligar', intendedDate: null, waiting: false, deadline: null };
const waiting: TaskFields = { ...open, waiting: true };
const surfaces = Object.keys(SURFACE_ACTIONS) as TaskSurface[];
const list = (task: TaskFields, surface: TaskSurface, context = {}) => [...taskActions(task, surface, context)];

describe('taskActions', () => {
  it('offers each surface its own actions', () => {
    expect(list(open, 'dayNote')).toEqual(['details', 'priority', 'queue', 'deadline', 'waiting']);
    expect(list(open, 'project')).toEqual(['details', 'priority', 'queue', 'deadline', 'waiting', 'abandon']);
    expect(list(open, 'idea')).toEqual(['details', 'deadline', 'abandon']);
    expect(list(open, 'priorities')).toEqual(['queue', 'deadline']);
    expect(list(open, 'person')).toEqual([]);
    expect(list(open, 'queue')).toEqual(['deadline', 'abandon']);
  });

  it('shows the actions in the same order on every surface', () => {
    for (const surface of surfaces) {
      for (const task of [open, waiting]) {
        const actions = list(task, surface, { projectChoices: 2 });
        expect(actions).toEqual(ACTION_ORDER.filter((action) => actions.includes(action)));
      }
    }
  });

  it('keeps only "Detalhes" on a closed task', () => {
    expect(list({ ...open, status: 'done' }, 'project')).toEqual(['details']);
    expect(list({ ...open, status: 'abandoned' }, 'table', { projectChoices: 2 })).toEqual([]);
  });

  it('gives a waiting task its follow-up day, and nothing that makes it mine', () => {
    expect(list(waiting, 'project')).toEqual(['details', 'followUp', 'waiting', 'abandon']);
    expect(list(waiting, 'priorities')).toEqual([]);
    expect(list(waiting, 'person')).toEqual(['followUp']);
  });

  it('never gives a task of mine a date: only the deadline (ADR-072)', () => {
    for (const surface of surfaces) expect(list(open, surface, { projectChoices: 2 })).not.toContain('followUp');
  });

  it('offers "Projeto" only to a task without project, when there is a project to pick', () => {
    expect(list(open, 'table')).toEqual(['queue', 'deadline', 'abandon']);
    expect(list(open, 'table', { projectChoices: 1 })).toEqual(['queue', 'project', 'deadline', 'abandon']);
    expect(list(open, 'queue', { projectChoices: 1, hasProject: true })).toEqual(['deadline', 'abandon']);
  });

  it('keeps the queue out of the queue, and the priority to the day note and the project', () => {
    expect(SURFACE_ACTIONS.queue).not.toContain('queue');
    expect(surfaces.filter((surface) => SURFACE_ACTIONS[surface].includes('priority'))).toEqual(['dayNote', 'project']);
  });
});

describe('task labels', () => {
  it('names a task without text', () => {
    expect(taskText({ text: '' })).toBe('(tarefa sem texto)');
    expect(taskText({ text: 'Ligar' })).toBe('Ligar');
  });

  it('says the dates in words; only a waiting task has a follow-up day', () => {
    expect(followUpLabel({ ...waiting, intendedDate: '2026-11-13' }, today)).toBe('cobrar amanhã');
    expect(followUpLabel({ ...open, intendedDate: '2026-11-13' }, today)).toBeNull();
    expect(deadlineLabel({ ...open, deadline: '2026-11-13' }, today)).toBe('prazo amanhã');
    expect(deadlineLabel(open, today)).toBeNull();
  });

  it('names the checkbox by what it does', () => {
    expect(doneLabel(open)).toBe('Finalizar "Ligar"');
    expect(doneLabel(waiting)).toBe('Concluir: chegou "Ligar"');
    expect(doneLabel({ ...open, status: 'done' })).toBe('Reabrir "Ligar"');
  });
});
