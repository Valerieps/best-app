import { describe, expect, it } from 'vitest';
import {
  checkoutSteps,
  groupByProject,
  nextStep,
  planningGroup,
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

describe('planning group', () => {
  const target = '2026-10-14';

  it('puts each task in the target note, the next three days or the others', () => {
    expect(planningGroup(target, target)).toBe('target');
    expect(planningGroup('2026-10-15', target)).toBe('soon');
    expect(planningGroup('2026-10-17', target)).toBe('soon');
    expect(planningGroup(null, target)).toBeNull();
    expect(planningGroup('2026-10-10', target)).toBe('other');
  });

  it('leaves out tasks scheduled further ahead', () => {
    expect(planningGroup('2026-10-18', target)).toBeNull();
  });
});

describe('range selection', () => {
  it('selects every item between the two clicks, in either direction', () => {
    expect(rangeBetween(['a', 'b', 'c', 'd'], 'd', 'b')).toEqual(['b', 'c', 'd']);
    expect(rangeBetween(['a', 'b'], 'a', 'z')).toEqual([]);
  });
});
