import { describe, expect, it } from 'vitest';
import { isLeavingPage } from './pageLeave';

describe('isLeavingPage', () => {
  it('is true when the page is hidden or unloaded', () => {
    expect(isLeavingPage('visibilitychange', 'hidden')).toBe(true);
    expect(isLeavingPage('pagehide', 'hidden')).toBe(true);
    expect(isLeavingPage('pagehide', 'visible')).toBe(true);
  });

  it('is false when the page comes back', () => {
    expect(isLeavingPage('visibilitychange', 'visible')).toBe(false);
  });
});
