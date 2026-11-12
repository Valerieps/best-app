import { describe, expect, it } from 'vitest';
import { boardOutcome, checkoutSteps, groupByProject, nextStep, previousStep, rangeBetween, stepCounts, type StepCounts } from './checkoutSteps';

const NONE: StepCounts = { reminders: 0 };
const FULL: StepCounts = { reminders: 1 };

describe('checkout steps', () => {
  it('skips the steps with nothing to decide, but always shows the board of the day', () => {
    expect(checkoutSteps(NONE)).toEqual(['triage']);
    expect(checkoutSteps(FULL)).toEqual(['triage', 'reminders']);
  });

  it('counts the reminders', () => {
    expect(stepCounts(2)).toEqual({ reminders: 2 });
  });

  it('moves forward and back over the steps that still have items', () => {
    const plan = checkoutSteps(FULL);
    expect(nextStep(plan, 'triage', FULL)).toBe('reminders');
    expect(nextStep(plan, 'triage', NONE)).toBeNull();
    expect(previousStep(plan, 'reminders', FULL)).toBe('triage');
    expect(previousStep(plan, 'triage', FULL)).toBeNull();
    expect(nextStep(plan, 'reminders', FULL)).toBeNull();
  });
});

describe('board outcome', () => {
  const undate = { kind: 'undate', untouched: true } as const;
  const keep = { kind: 'keep' } as const;

  it('gives every card a decision: abandon, finish, queue, or its suggestion when untouched', () => {
    const cards = [
      { id: 'a', suggestion: undate },
      { id: 'b', suggestion: undate },
      { id: 'c', suggestion: undate },
      { id: 'd', suggestion: undate },
      { id: 'w', suggestion: keep },
    ];
    const decisions = boardOutcome(cards, { queued: new Set(['b']), abandoned: new Set(['c']), finished: new Set(['d']) });
    expect(Object.fromEntries(decisions)).toEqual({
      a: undate,
      b: { kind: 'queue' },
      c: { kind: 'abandon' },
      d: { kind: 'finish' },
      w: keep,
    });
  });

  it('lets abandoning win over finishing, and finishing over the queue', () => {
    const cards = [
      { id: 'a', suggestion: undate },
      { id: 'b', suggestion: undate },
    ];
    const decisions = boardOutcome(cards, { queued: new Set(['a', 'b']), abandoned: new Set(['a']), finished: new Set(['a', 'b']) });
    expect(Object.fromEntries(decisions)).toEqual({ a: { kind: 'abandon' }, b: { kind: 'finish' } });
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

describe('range selection', () => {
  it('selects every item between the two clicks, in either direction', () => {
    expect(rangeBetween(['a', 'b', 'c', 'd'], 'd', 'b')).toEqual(['b', 'c', 'd']);
    expect(rangeBetween(['a', 'b'], 'a', 'z')).toEqual([]);
  });
});
