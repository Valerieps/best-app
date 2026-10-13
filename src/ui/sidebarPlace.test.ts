import { describe, expect, it } from 'vitest';
import { isRitual, sidebarPlace } from './sidebarPlace';

describe('sidebar place', () => {
  it('marks the place of the screen, with detail pages under their list', () => {
    expect(sidebarPlace({ name: 'day', day: '2026-10-09' })).toBe('day');
    expect(sidebarPlace({ name: 'project', id: 'p-1', tab: 'notes' })).toBe('projects');
    expect(sidebarPlace({ name: 'objective', id: 'o-1' })).toBe('objectives');
    expect(sidebarPlace({ name: 'wiki', section: 'abc' })).toBe('wiki');
    expect(sidebarPlace({ name: 'checkout', day: '2026-10-11' })).toBe('checkout');
  });

  it('knows which places are rituals', () => {
    expect(isRitual('checkout')).toBe(true);
    expect(isRitual('focusReview')).toBe(true);
    expect(isRitual('directionReview')).toBe(true);
    expect(isRitual('cleanup')).toBe(true);
    expect(isRitual('day')).toBe(false);
    expect(isRitual('projects')).toBe(false);
  });
});
