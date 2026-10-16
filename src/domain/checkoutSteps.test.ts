import { describe, expect, it } from 'vitest';
import {
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
import type { Block } from './entities';
import type { DayTriage } from './triage';

const NONE: StepCounts = { tasks: 0, reminders: 0 };
const FULL: StepCounts = { tasks: 3, reminders: 1 };

describe('checkout steps', () => {
  it('skips the steps with nothing to decide, but always plans', () => {
    expect(checkoutSteps(NONE)).toEqual(['planning']);
    expect(checkoutSteps({ ...NONE, tasks: 2 })).toEqual(['triage', 'planning']);
    expect(checkoutSteps(FULL)).toEqual(['triage', 'reminders', 'planning']);
  });

  it('counts the tasks waiting for a decision', () => {
    const triage: DayTriage = {
      day: '2026-10-13',
      nextDay: '2026-10-14',
      rows: [{ type: 'task', task: {} as Block, section: null, suggestion: { kind: 'undate', untouched: true }, attention: false }],
      automatic: [{ type: 'finishedDuringDay', task: {} as Block, section: null }],
      open: [],
    };
    expect(stepCounts(triage, 2)).toEqual({ tasks: 1, reminders: 2 });
  });

  it('moves forward and back over the steps that still have items', () => {
    const plan = checkoutSteps(FULL);
    expect(nextStep(plan, 'triage', FULL)).toBe('reminders');
    expect(nextStep(plan, 'triage', { ...FULL, reminders: 0 })).toBe('planning');
    expect(previousStep(plan, 'planning', { ...FULL, reminders: 0 })).toBe('triage');
    expect(previousStep(plan, 'triage', FULL)).toBeNull();
    expect(nextStep(plan, 'planning', FULL)).toBeNull();
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
