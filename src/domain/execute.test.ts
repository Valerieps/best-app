import { describe, expect, it } from 'vitest';
import type { Block, Project } from './entities';
import { buildExecuteView, type ExecuteInput } from './execute';
import type { TaskListEntry } from './taskList';

const TODAY = '2026-11-10';

function project(id: string, name: string, status: Project['status'] = 'active'): Project {
  return { id, name, status, createdAt: '', updatedAt: '', finishedAt: null };
}

const casa = project('p1', 'Casa');
const app = project('p2', 'app');
const tese = project('p3', 'Tese');
const velho = project('p4', 'Velho', 'finished');

function entry(id: string, intendedDate: string | null, proj: Project | null = null, deadline: string | null = null): TaskListEntry {
  const task = { id, kind: 'task', text: id, intendedDate, deadline, projectId: proj?.id ?? null, status: 'active' } as Block;
  return { task, project: proj };
}

function view(overrides: Partial<ExecuteInput<TaskListEntry>>) {
  return buildExecuteView<TaskListEntry>({
    today: TODAY,
    priorityIds: [],
    items: [],
    nextStepIds: [],
    focusIds: [],
    scope: 'all',
    deadlineWindow: 7,
    ...overrides,
  });
}

const ids = (items: TaskListEntry[]) => items.map((item) => item.task.id);

describe('the tasks due now', () => {
  it('takes the tasks of today and the late ones, in the given order', () => {
    const items = [entry('late', '2026-11-08'), entry('today', TODAY), entry('later', '2026-11-12'), entry('none', null)];
    expect(ids(view({ items }).dueNow)).toEqual(['late', 'today']);
  });

  it('takes a task whose deadline has passed, whatever its intended date', () => {
    const items = [entry('future', '2026-11-20', null, '2026-11-09'), entry('undated', null, null, '2026-11-01')];
    expect(ids(view({ items }).dueNow)).toEqual(['future', 'undated']);
  });

  it('leaves out the day priorities, shown above', () => {
    const items = [entry('a', TODAY), entry('b', TODAY)];
    expect(ids(view({ items, priorityIds: ['a'] }).dueNow)).toEqual(['b']);
  });
});

describe('the deadlines coming', () => {
  const items = [
    entry('far', null, null, '2026-11-30'),
    entry('d3', null, null, '2026-11-13'),
    entry('d1', '2026-11-25', null, '2026-11-11'),
    entry('d7', null, null, '2026-11-17'),
    entry('today', null, null, TODAY),
  ];

  it('takes the deadlines within the window, soonest first', () => {
    expect(ids(view({ items }).deadlines)).toEqual(['d1', 'd3', 'd7']);
  });

  it('follows the chosen window', () => {
    expect(ids(view({ items, deadlineWindow: 3 }).deadlines)).toEqual(['d1', 'd3']);
    expect(ids(view({ items, deadlineWindow: 14 }).deadlines)).toEqual(['d1', 'd3', 'd7']);
  });

  it('is empty when the window is zero', () => {
    expect(view({ items, deadlineWindow: 0 }).deadlines).toEqual([]);
  });

  it('leaves out a task already due now', () => {
    expect(ids(view({ items: [entry('x', TODAY, null, '2026-11-12')] }).deadlines)).toEqual([]);
  });
});

describe('the next steps', () => {
  const items = [
    entry('c1', null, casa),
    entry('c2', null, casa),
    entry('a1', null, app),
    entry('t1', null, tese),
    entry('v1', null, velho),
    entry('free', null, casa),
  ];
  const nextStepIds = ['c2', 'c1', 'a1', 't1', 'v1'];

  it('groups them by project, in the order chosen, focus first and then by name', () => {
    const groups = view({ items, nextStepIds, focusIds: ['p3'] }).nextSteps;
    expect(groups.map((group) => group.project.name)).toEqual(['Tese', 'app', 'Casa']);
    expect(ids(groups[2]!.items)).toEqual(['c2', 'c1']);
  });

  it('shows only the projects in focus when asked', () => {
    const groups = view({ items, nextStepIds, focusIds: ['p1', 'p3'], scope: 'focus' }).nextSteps;
    expect(groups.map((group) => group.project.id)).toEqual(['p1', 'p3']);
  });

  it('leaves out projects that are not active and tasks not open', () => {
    const groups = view({ items, nextStepIds: [...nextStepIds, 'gone'] }).nextSteps;
    expect(groups.map((group) => group.project.id)).not.toContain('p4');
    expect(groups.flatMap((group) => ids(group.items))).not.toContain('gone');
  });

  it('shows a task once: a next step due now stays in the list above', () => {
    const due = [entry('c1', TODAY, casa), entry('c2', null, casa, '2026-11-12'), entry('c3', null, casa)];
    const result = view({ items: due, nextStepIds: ['c1', 'c2', 'c3'], priorityIds: [] });
    expect(ids(result.dueNow)).toEqual(['c1']);
    expect(ids(result.deadlines)).toEqual(['c2']);
    expect(ids(result.nextSteps[0]!.items)).toEqual(['c3']);
  });

  it('drops a project whose next steps all show above', () => {
    const result = view({ items: [entry('c1', null, casa)], nextStepIds: ['c1'], priorityIds: ['c1'] });
    expect(result.nextSteps).toEqual([]);
  });
});
