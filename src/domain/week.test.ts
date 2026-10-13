import { describe, expect, it } from 'vitest';
import { weekKey, weekOf } from './week';

describe('weeks', () => {
  it('uses ISO weeks starting on Monday', () => {
    expect(weekOf('2026-10-11')).toEqual({ key: '2026-W41', start: '2026-10-05', end: '2026-10-11' });
    expect(weekOf('2026-10-12').start).toBe('2026-10-12');
  });

  it('puts the first days of January in the right year', () => {
    expect(weekKey('2026-01-01')).toBe('2026-W01'); // a Thursday
    expect(weekKey('2027-01-01')).toBe('2026-W53'); // a Friday, still in 2026's last week
  });

});
