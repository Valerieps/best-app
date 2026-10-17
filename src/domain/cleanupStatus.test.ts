import { describe, expect, it } from 'vitest';
import {
  assistantCards,
  cleanupStatus,
  DEFAULT_STATUS_LIMITS,
  limitsFor,
  normalizeLimits,
  oldestDay,
  withLimit,
} from './cleanupStatus';

describe('cleanup status', () => {
  it('is green with nothing to clean, or while the oldest item is younger than the yellow limit', () => {
    expect(cleanupStatus(null, [1, 2, 3])).toBe(0);
    expect(cleanupStatus(1, [2, 4, 7])).toBe(0);
  });

  it('turns yellow, orange and red as the oldest item waits longer', () => {
    const limits = [2, 4, 7] as const;
    expect([2, 3, 4, 6, 7, 30].map((age) => cleanupStatus(age, limits))).toEqual([1, 1, 2, 2, 3, 3]);
  });

  it('does not count closing yesterday this morning as late', () => {
    expect(cleanupStatus(1, DEFAULT_STATUS_LIMITS.pendingDays)).toBe(0);
  });

  it('normalizes limits to whole numbers that never go down', () => {
    expect(normalizeLimits([0, 3.6, 2])).toEqual([1, 4, 4]);
    expect(normalizeLimits([Number.NaN, -1, 7])).toEqual([1, 1, 7]);
    expect(normalizeLimits([])).toEqual([1, 1, 1]);
  });

  it('lets the edited limit win, moving the others out of its way', () => {
    expect(withLimit([1, 5, 10], 2, 4)).toEqual([1, 4, 4]);
    expect(withLimit([1, 5, 10], 0, 7)).toEqual([7, 7, 10]);
    expect(withLimit([2, 5, 10], 1, 0)).toEqual([1, 1, 10]);
    expect(withLimit([1, 5, 10], 1, 6)).toEqual([1, 6, 10]);
  });

  it('uses the saved limits, or the defaults', () => {
    expect(limitsFor('whiteboards', undefined)).toEqual(DEFAULT_STATUS_LIMITS.whiteboards);
    expect(limitsFor('whiteboards', { whiteboards: [2, 3, 4] })).toEqual([2, 3, 4]);
    expect(limitsFor('duplicates', { whiteboards: [2, 3, 4] })).toEqual(DEFAULT_STATUS_LIMITS.duplicates);
  });

  it('colors the cards by the age of the oldest item, not by how many there are', () => {
    const today = '2026-10-14';
    const cards = assistantCards(
      {
        pendingDays: { count: 0, oldest: null },
        // Many recent sections: still green.
        whiteboards: { count: 12, oldest: '2026-10-12' },
        // One old repeat: red.
        duplicates: { count: 1, oldest: '2026-08-01' },
        forgottenTasks: { count: 0, oldest: null },
      },
      today,
      undefined,
    );
    expect(cards.map((card) => [card.id, card.status, card.ageInDays])).toEqual([
      ['duplicates', 3, 74],
      ['pendingDays', 0, null],
      ['whiteboards', 0, 2],
      ['forgottenTasks', 0, null],
    ]);
  });

  it('colors "Tarefas esquecidas" by how many tasks there are, from 5, 10 and 15 by default', () => {
    const statusFor = (count: number) =>
      assistantCards(
        {
          pendingDays: { count: 0, oldest: null },
          whiteboards: { count: 0, oldest: null },
          duplicates: { count: 0, oldest: null },
          // Very old, yet the age does not matter here.
          forgottenTasks: { count, oldest: count > 0 ? '2026-01-01' : null },
        },
        '2026-10-14',
        undefined,
      ).find((card) => card.id === 'forgottenTasks')!.status;
    expect([0, 4, 5, 9, 10, 14, 15].map(statusFor)).toEqual([0, 0, 1, 1, 2, 2, 3]);
  });

  it('finds the oldest of some days, ignoring the unknown ones', () => {
    expect(oldestDay(['2026-10-10', null, '2026-09-30', undefined])).toBe('2026-09-30');
    expect(oldestDay([])).toBeNull();
  });
});
