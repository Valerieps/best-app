import { describe, expect, it } from 'vitest';
import {
  attentionReason,
  checkoutSteps,
  nextStep,
  planningGroup,
  previousStep,
  rangeBetween,
  stepCounts,
  type StepCounts,
} from './checkoutSteps';
import type { Block, Section } from './entities';
import type { DayTriage, TriageRow } from './triage';

const NONE: StepCounts = { whiteboards: 0, tasks: 0, attention: 0, reminders: 0 };
const FULL: StepCounts = { whiteboards: 1, tasks: 3, attention: 1, reminders: 1 };

function taskRow(attention: boolean): TriageRow {
  return { type: 'task', task: {} as Block, section: null, suggestion: { kind: 'schedule', date: '2026-10-14' }, attention };
}

describe('checkout steps', () => {
  it('skips the steps with nothing to decide, but always confirms and plans', () => {
    expect(checkoutSteps(NONE)).toEqual(['confirm', 'planning']);
    expect(checkoutSteps({ ...NONE, tasks: 2 })).toEqual(['doneCheck', 'confirm', 'planning']);
    expect(checkoutSteps(FULL)).toEqual(['whiteboards', 'doneCheck', 'attention', 'reminders', 'confirm', 'planning']);
  });

  it('counts the rows of a triage', () => {
    const triage: DayTriage = {
      day: '2026-10-13',
      nextDay: '2026-10-14',
      automatic: [],
      rows: [
        taskRow(true),
        taskRow(false),
        { type: 'whiteboard', section: {} as Section, suggestion: { kind: 'leaveUnlinked' }, citedProject: null, attention: false },
      ],
    };
    expect(stepCounts(triage, 2)).toEqual({ whiteboards: 1, tasks: 2, attention: 1, reminders: 2 });
  });

  it('moves forward and back over the steps that still have items', () => {
    const plan = checkoutSteps(FULL);
    // Marking the only task needing attention as done empties its step.
    const after = { ...FULL, attention: 0 };
    expect(nextStep(plan, 'doneCheck', after)).toBe('reminders');
    expect(previousStep(plan, 'reminders', after)).toBe('doneCheck');
    expect(previousStep(plan, 'whiteboards', FULL)).toBeNull();
    expect(nextStep(plan, 'planning', FULL)).toBeNull();
  });
});

describe('attention reason', () => {
  it('is the postponements from the threshold on, and the deadline otherwise', () => {
    expect(attentionReason({ postponeCount: 3 } as Block)).toBe('postponed');
    expect(attentionReason({ postponeCount: 1 } as Block)).toBe('deadline');
  });
});

describe('planning group', () => {
  const target = '2026-10-14';

  it('puts each task in the target note, the next three days or the others', () => {
    expect(planningGroup(target, target)).toBe('target');
    expect(planningGroup('2026-10-15', target)).toBe('soon');
    expect(planningGroup('2026-10-17', target)).toBe('soon');
    expect(planningGroup(null, target)).toBe('other');
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
