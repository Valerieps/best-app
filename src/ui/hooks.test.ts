import { describe, expect, it } from 'vitest';
import { parseRoute, routeHash, type Route } from './hooks';

describe('routes', () => {
  it.each<Route>([
    { name: 'day' },
    { name: 'day', day: '2026-10-09' },
    { name: 'checkout', day: '2026-10-11' },
    { name: 'active' },
    { name: 'cleanup' },
    { name: 'cleanup', assistant: 'pendingDays' },
    { name: 'cleanup', assistant: 'whiteboards' },
    { name: 'cleanup', assistant: 'duplicates' },
    { name: 'data' },
    { name: 'focusReview' },
    { name: 'projects' },
    { name: 'project', id: 'p-1' },
    { name: 'project', id: 'p-1', tab: 'notes' },
    { name: 'settings' },
    { name: 'objectives' },
    { name: 'objective', id: 'o-1' },
    { name: 'habits' },
    { name: 'directionReview' },
  ])('round-trips %o', (route) => {
    expect(parseRoute(routeHash(route))).toEqual(route);
  });

  it('falls back to the day note for unknown or malformed hashes', () => {
    expect(parseRoute('')).toEqual({ name: 'day' });
    expect(parseRoute('#/nada')).toEqual({ name: 'day' });
    expect(parseRoute('#/checkout/ontem')).toEqual({ name: 'day' });
    expect(parseRoute('#/ordem/nada')).toEqual({ name: 'cleanup' });
  });

  it('takes the old reflection links to the reviews', () => {
    expect(parseRoute('#/reflexao/2026-W41')).toEqual({ name: 'focusReview' });
    expect(parseRoute('#/mes/2026-09')).toEqual({ name: 'directionReview' });
  });
});
