import { describe, expect, it } from 'vitest';
import { parseRoute, routeHash, type Route } from './hooks';

describe('routes', () => {
  it.each<Route>([
    { name: 'day' },
    { name: 'day', day: '2026-10-09' },
    { name: 'checkout', day: '2026-10-11' },
    { name: 'active' },
    { name: 'archived' },
    { name: 'wiki' },
    { name: 'wiki', section: 'abc-123' },
    { name: 'cleanup' },
    { name: 'cleanup', assistant: 'pendingDays' },
    { name: 'cleanup', assistant: 'whiteboards' },
    { name: 'cleanup', assistant: 'duplicates' },
    { name: 'data' },
    { name: 'reflection' },
    { name: 'reflection', week: '2026-W41' },
    { name: 'projects' },
    { name: 'project', id: 'p-1' },
    { name: 'settings' },
    { name: 'objectives' },
    { name: 'objective', id: 'o-1' },
    { name: 'habits' },
    { name: 'monthReflection' },
    { name: 'monthReflection', month: '2026-09' },
  ])('round-trips %o', (route) => {
    expect(parseRoute(routeHash(route))).toEqual(route);
  });

  it('falls back to the day note for unknown or malformed hashes', () => {
    expect(parseRoute('')).toEqual({ name: 'day' });
    expect(parseRoute('#/nada')).toEqual({ name: 'day' });
    expect(parseRoute('#/checkout/ontem')).toEqual({ name: 'day' });
    expect(parseRoute('#/ordem/nada')).toEqual({ name: 'cleanup' });
  });
});
