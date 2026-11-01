import { describe, expect, it } from 'vitest';
import {
  boardOutcome,
  checkoutSteps,
  groupByProject,
  nextStep,
  planningColumnOf,
  planningColumns,
  previousStep,
  rangeBetween,
  stepCounts,
  type StepCounts,
} from './checkoutSteps';

const NONE: StepCounts = { late: 0, reminders: 0 };
const FULL: StepCounts = { late: 3, reminders: 1 };

describe('checkout steps', () => {
  it('skips the steps with nothing to decide, but always shows the board of the day', () => {
    expect(checkoutSteps(NONE)).toEqual(['triage']);
    expect(checkoutSteps({ ...NONE, late: 2 })).toEqual(['late', 'triage']);
    expect(checkoutSteps(FULL)).toEqual(['late', 'triage', 'reminders']);
  });

  it('counts the late tasks and the reminders', () => {
    expect(stepCounts(1, 2)).toEqual({ late: 1, reminders: 2 });
  });

  it('moves forward and back over the steps that still have items', () => {
    const plan = checkoutSteps(FULL);
    expect(nextStep(plan, 'late', FULL)).toBe('triage');
    expect(nextStep(plan, 'triage', FULL)).toBe('reminders');
    expect(nextStep(plan, 'triage', { ...FULL, reminders: 0 })).toBeNull();
    expect(previousStep(plan, 'triage', FULL)).toBe('late');
    expect(previousStep(plan, 'triage', { ...FULL, late: 0 })).toBeNull();
    expect(nextStep(plan, 'reminders', FULL)).toBeNull();
  });
});

describe('board outcome', () => {
  const none = { dates: new Map<string, string | null>(), abandoned: new Set<string>(), finished: new Set<string>() };
  const undate = { kind: 'undate', untouched: true } as const;

  it('gives every task of the triage a decision, its suggestion when untouched', () => {
    const cards = [
      { id: 'a', date: null, suggestion: undate },
      { id: 'b', date: null, suggestion: undate },
      { id: 'c', date: null, suggestion: undate },
      { id: 'd', date: '2026-10-16', suggestion: undate },
      { id: 'e', date: null, suggestion: undate },
    ];
    const { decisions, changes } = boardOutcome(cards, {
      dates: new Map([
        ['b', '2026-10-17'],
        ['c', null],
      ]),
      abandoned: new Set(['d']),
      finished: new Set(['e']),
    });
    expect(Object.fromEntries(decisions)).toEqual({
      a: undate,
      b: { kind: 'schedule', date: '2026-10-17' },
      c: { kind: 'undate' },
      d: { kind: 'abandon' },
      e: { kind: 'finish' },
    });
    expect(changes).toEqual([]);
  });

  it('changes only the dates that moved for the other tasks, and abandons them', () => {
    const cards = [
      { id: 'late', date: '2026-10-10' },
      { id: 'same', date: '2026-10-17' },
      { id: 'still', date: '2026-10-18' },
      { id: 'gone', date: '2026-10-18' },
    ];
    const { decisions, changes } = boardOutcome(cards, {
      ...none,
      dates: new Map([
        ['late', '2026-10-17'],
        ['same', '2026-10-17'],
      ]),
      abandoned: new Set(['gone']),
    });
    expect(changes).toEqual([{ taskId: 'late', date: '2026-10-17' }]);
    expect(Object.fromEntries(decisions)).toEqual({ gone: { kind: 'abandon' } });
  });
});

describe('group by project', () => {
  it('keeps the order of first appearance and puts the tasks without a project last', () => {
    const items = [
      { id: 1, project: null },
      { id: 2, project: 'b' },
      { id: 3, project: 'a' },
      { id: 4, project: 'b' },
    ];
    const groups = groupByProject(items, (item) => item.project);
    expect(groups.map((group) => [group.projectId, group.items.map((item) => item.id)])).toEqual([
      ['b', [2, 4]],
      ['a', [3]],
      [null, [1]],
    ]);
  });
});

describe('planning columns', () => {
  const today = '2026-10-13';
  const target = '2026-10-14';

  it('shows the target and the two days after it on a quiet day', () => {
    expect(planningColumns([target, null], today, target)).toEqual([
      { kind: 'day', day: '2026-10-14' },
      { kind: 'day', day: '2026-10-15' },
      { kind: 'day', day: '2026-10-16' },
    ]);
  });

  it('puts the late tasks first, all together, and today when a task is dated for it', () => {
    const columns = planningColumns(['2026-10-10', today], today, target);
    expect(columns).toEqual([{ kind: 'late' }, { kind: 'day', day: today }, { kind: 'day', day: target }]);
    expect(planningColumnOf('2026-10-01', columns, today)).toBe(0);
    expect(planningColumnOf(today, columns, today)).toBe(1);
    expect(planningColumnOf(target, columns, today)).toBe(2);
    expect(planningColumnOf('2026-10-15', columns, today)).toBe(-1);
    expect(planningColumnOf(null, columns, today)).toBe(-1);
  });

  it('jumps from today to the target over the days that are not active', () => {
    expect(planningColumns([today], today, '2026-10-16')).toEqual([
      { kind: 'day', day: today },
      { kind: 'day', day: '2026-10-16' },
      { kind: 'day', day: '2026-10-17' },
    ]);
  });

  it('skips the days that are not active, unless a task is dated for one', () => {
    const friday = '2026-10-16';
    const weekdays = [1, 2, 3, 4, 5];
    expect(planningColumns([], '2026-10-15', friday, 3, weekdays)).toEqual([
      { kind: 'day', day: friday },
      { kind: 'day', day: '2026-10-19' },
      { kind: 'day', day: '2026-10-20' },
    ]);
    expect(planningColumns(['2026-10-17'], '2026-10-15', friday, 3, weekdays)).toEqual([
      { kind: 'day', day: friday },
      { kind: 'day', day: '2026-10-17' },
      { kind: 'day', day: '2026-10-19' },
    ]);
  });

  it('has no column for today when it is the target', () => {
    expect(planningColumns([today], today, today)).toEqual([
      { kind: 'day', day: today },
      { kind: 'day', day: target },
      { kind: 'day', day: '2026-10-15' },
    ]);
  });
});

describe('range selection', () => {
  it('selects every item between the two clicks, in either direction', () => {
    expect(rangeBetween(['a', 'b', 'c', 'd'], 'd', 'b')).toEqual(['b', 'c', 'd']);
    expect(rangeBetween(['a', 'b'], 'a', 'z')).toEqual([]);
  });
});
