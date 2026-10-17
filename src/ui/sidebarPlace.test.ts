import { describe, expect, it } from 'vitest';
import { sidebarPlace } from './sidebarPlace';

describe('sidebar place', () => {
  it('marks the place of the screen, with detail pages under their list', () => {
    expect(sidebarPlace({ name: 'day', day: '2026-10-09' })).toBe('day');
    expect(sidebarPlace({ name: 'project', id: 'p-1', tab: 'notes' })).toBe('projects');
    expect(sidebarPlace({ name: 'objective', id: 'o-1' })).toBe('objectives');
  });

  it('marks "Rituais" on its screen and on every ritual opened from it', () => {
    expect(sidebarPlace({ name: 'rituals' })).toBe('rituals');
    expect(sidebarPlace({ name: 'rituals', assistant: 'whiteboards' })).toBe('rituals');
    expect(sidebarPlace({ name: 'checkout', day: '2026-10-11' })).toBe('rituals');
  });
});
