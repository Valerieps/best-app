import { describe, expect, it } from 'vitest';
import { isFocusToggleKey } from './focusMode';

const keys = { key: 'Enter', shiftKey: true, ctrlKey: false, metaKey: false, altKey: false };

describe('focus mode shortcut', () => {
  it('is Ctrl + Shift + Enter, or ⌘ + Shift + Enter on the Mac', () => {
    expect(isFocusToggleKey({ ...keys, ctrlKey: true })).toBe(true);
    expect(isFocusToggleKey({ ...keys, metaKey: true })).toBe(true);
  });

  it('leaves Enter, Shift + Enter and Alt combinations to the editor', () => {
    expect(isFocusToggleKey({ ...keys, shiftKey: false, ctrlKey: true })).toBe(false);
    expect(isFocusToggleKey(keys)).toBe(false);
    expect(isFocusToggleKey({ ...keys, ctrlKey: true, altKey: true })).toBe(false);
    expect(isFocusToggleKey({ ...keys, key: 'ArrowUp', ctrlKey: true })).toBe(false);
  });
});
