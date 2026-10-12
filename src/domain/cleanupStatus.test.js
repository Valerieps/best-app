import { describe, expect, it } from 'vitest';
import { assistantCards, cleanupStatus, DEFAULT_STATUS_LIMITS, limitsFor, normalizeLimits, withLimit, } from './cleanupStatus';
describe('cleanup status', () => {
    it('is green only when there is nothing to clean', () => {
        expect(cleanupStatus(0, [1, 2, 3])).toBe(0);
        expect(cleanupStatus(1, [5, 10, 20])).toBe(1);
    });
    it('turns yellow, orange and red at each limit', () => {
        const limits = [1, 5, 10];
        expect([1, 4, 5, 9, 10, 30].map((count) => cleanupStatus(count, limits))).toEqual([1, 1, 2, 2, 3, 3]);
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
    it('orders the cards from the most urgent, keeping the default order on ties', () => {
        const cards = assistantCards({ pendingDays: 0, whiteboards: 4, duplicates: 3 }, undefined);
        expect(cards.map((card) => [card.id, card.status])).toEqual([
            ['duplicates', 2],
            ['whiteboards', 1],
            ['pendingDays', 0],
        ]);
    });
});
