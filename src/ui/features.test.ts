import { afterEach, describe, expect, it } from 'vitest';
import type { ReviewAvailability } from '../application/reviewQueries';
import { enabledRoute, FEATURES, visibleReviews } from './features';

const saved = { ...FEATURES };
afterEach(() => Object.assign(FEATURES, saved));

const availability: ReviewAvailability = {
  focus: [{ kind: 'cadence', count: 5 }],
  direction: [{ kind: 'cadence', count: 4 }],
  names: {},
  hadReview: { focus: false, direction: false },
  lastCheckoutAt: null,
};

describe('hidden features', () => {
  it('opens the day note instead of a hidden screen', () => {
    Object.assign(FEATURES, { objectives: false, habits: false });
    expect(enabledRoute({ name: 'objectives' })).toEqual({ name: 'day' });
    expect(enabledRoute({ name: 'objective', id: 'o1' })).toEqual({ name: 'day' });
    expect(enabledRoute({ name: 'habits' })).toEqual({ name: 'day' });
    expect(enabledRoute({ name: 'directionReview' })).toEqual({ name: 'day' });
    expect(enabledRoute({ name: 'projects' })).toEqual({ name: 'projects' });
  });

  it('keeps the screens when the features are on', () => {
    Object.assign(FEATURES, { objectives: true, habits: true });
    expect(enabledRoute({ name: 'habits' })).toEqual({ name: 'habits' });
    expect(enabledRoute({ name: 'directionReview' })).toEqual({ name: 'directionReview' });
  });

  it('drops the Revisão de Rumo from the availability while objectives are hidden', () => {
    Object.assign(FEATURES, { objectives: false });
    expect(visibleReviews(availability)?.direction).toEqual([]);
    expect(visibleReviews(availability)?.focus).toEqual(availability.focus);
    Object.assign(FEATURES, { objectives: true });
    expect(visibleReviews(availability)).toBe(availability);
  });
});
