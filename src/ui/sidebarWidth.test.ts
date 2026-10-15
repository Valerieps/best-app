import { describe, expect, it } from 'vitest';
import { clampSidebarWidth, SIDEBAR_WIDTH } from './sidebarWidth';

describe('sidebar width', () => {
  it('keeps a dragged width inside the limits', () => {
    expect(clampSidebarWidth(320)).toBe(320);
    expect(clampSidebarWidth(50)).toBe(SIDEBAR_WIDTH.min);
    expect(clampSidebarWidth(2000)).toBe(SIDEBAR_WIDTH.max);
  });

  it('rounds to whole pixels', () => {
    expect(clampSidebarWidth(300.6)).toBe(301);
  });

  it('falls back to the default for a width that is not a number', () => {
    expect(clampSidebarWidth(Number.NaN)).toBe(SIDEBAR_WIDTH.default);
  });

  it('starts at the width of the theme token', async () => {
    const { readFileSync } = await import('node:fs');
    const tokens = readFileSync(new URL('./theme/tokens.css', import.meta.url), 'utf8');
    expect(tokens).toContain(`--sidebar-width: ${SIDEBAR_WIDTH.default}px;`);
  });
});
