import { describe, expect, it } from 'vitest';
import { panelOnOpen } from './panelState';

describe('panelOnOpen', () => {
  it('docks a pinned column on a wide screen', () => {
    expect(panelOnOpen(true, false)).toBe('docked');
  });

  it('shows a pinned column over the content on a narrow screen', () => {
    expect(panelOnOpen(true, true)).toBe('peek');
  });

  it('keeps an unpinned column closed', () => {
    expect(panelOnOpen(false, false)).toBe('closed');
    expect(panelOnOpen(false, true)).toBe('closed');
  });
});
