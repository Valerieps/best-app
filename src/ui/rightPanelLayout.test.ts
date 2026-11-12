import { describe, expect, it } from 'vitest';
import type { RightPanelMenu } from '../domain/entities';
import {
  clampRightPanelWidth,
  isRightPanelShortcut,
  RIGHT_PANEL_MENUS,
  RIGHT_PANEL_WIDTH,
  shownRightPanelMenu,
} from './rightPanelLayout';

const keys = { ctrlKey: false, metaKey: false, shiftKey: false, altKey: false };

describe('right panel width', () => {
  it('keeps a dragged width above the minimum, with no maximum, in whole pixels', () => {
    expect(clampRightPanelWidth(400.4)).toBe(400);
    expect(clampRightPanelWidth(100)).toBe(RIGHT_PANEL_WIDTH.min);
    expect(clampRightPanelWidth(2000)).toBe(2000);
    expect(clampRightPanelWidth(Number.NaN)).toBe(RIGHT_PANEL_WIDTH.default);
  });

  it('starts at the width of the theme token', async () => {
    const { readFileSync } = await import('node:fs');
    const tokens = readFileSync(new URL('./theme/tokens.css', import.meta.url), 'utf8');
    expect(tokens).toContain(`--right-panel-width: ${RIGHT_PANEL_WIDTH.default}px;`);
  });
});

describe('the menu shown in the right panel', () => {
  it('has "Fila de execução" as its first menu', () => {
    expect(RIGHT_PANEL_MENUS[0]).toMatchObject({ menu: 'execute', label: 'Fila de execução' });
  });

  it('shows the menu left open', () => {
    expect(shownRightPanelMenu('execute', { name: 'day' })).toBe('execute');
    expect(shownRightPanelMenu('execute', { name: 'projects' })).toBe('execute');
  });

  it('stays collapsed when nothing was left open', () => {
    expect(shownRightPanelMenu(undefined, { name: 'day' })).toBeNull();
    expect(shownRightPanelMenu(null, { name: 'day' })).toBeNull();
  });

  it('stays collapsed while the center shows the same screen', () => {
    expect(shownRightPanelMenu('execute', { name: 'execute' })).toBeNull();
  });

  it('collapses for a menu this version does not know', () => {
    expect(shownRightPanelMenu('gone' as RightPanelMenu, { name: 'day' })).toBeNull();
  });
});

describe('right panel shortcut', () => {
  it('is Ctrl + Alt + B, or ⌘ + Option + B', () => {
    expect(isRightPanelShortcut({ ...keys, code: 'KeyB', ctrlKey: true, altKey: true })).toBe(true);
    expect(isRightPanelShortcut({ ...keys, code: 'KeyB', metaKey: true, altKey: true })).toBe(true);
  });

  it('leaves Ctrl + B to bold and other combinations alone', () => {
    expect(isRightPanelShortcut({ ...keys, code: 'KeyB', ctrlKey: true })).toBe(false);
    expect(isRightPanelShortcut({ ...keys, code: 'KeyB', ctrlKey: true, altKey: true, shiftKey: true })).toBe(false);
    expect(isRightPanelShortcut({ ...keys, code: 'KeyN', ctrlKey: true, altKey: true })).toBe(false);
  });
});
