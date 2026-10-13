import { describe, expect, it } from 'vitest';
import { dropIndex, isSamePlace, partMoveKey } from './lineDrag';

describe('dropIndex', () => {
  const middles = [10, 30, 50];

  it('lands before the first line whose middle is below the pointer', () => {
    expect(dropIndex(middles, 0)).toBe(0);
    expect(dropIndex(middles, 20)).toBe(1);
    expect(dropIndex(middles, 49)).toBe(2);
  });

  it('lands after the last line below every middle', () => {
    expect(dropIndex(middles, 80)).toBe(3);
  });
});

describe('isSamePlace', () => {
  it('is true right above or right below the line itself', () => {
    expect(isSamePlace(1, 1)).toBe(true);
    expect(isSamePlace(1, 2)).toBe(true);
    expect(isSamePlace(1, 0)).toBe(false);
    expect(isSamePlace(1, 3)).toBe(false);
  });
});

describe('partMoveKey', () => {
  const key = (k: string, mods: Partial<{ shiftKey: boolean; ctrlKey: boolean; metaKey: boolean; altKey: boolean }>) => ({
    key: k,
    shiftKey: false,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    ...mods,
  });

  it('is Ctrl + Shift + arrow, or ⌘ + Shift on a Mac', () => {
    expect(partMoveKey(key('ArrowUp', { ctrlKey: true, shiftKey: true }))).toBe('up');
    expect(partMoveKey(key('ArrowDown', { metaKey: true, shiftKey: true }))).toBe('down');
  });

  it('leaves the line shortcut and plain arrows alone', () => {
    expect(partMoveKey(key('ArrowUp', { altKey: true }))).toBeNull();
    expect(partMoveKey(key('ArrowUp', { shiftKey: true }))).toBeNull();
    expect(partMoveKey(key('ArrowUp', { ctrlKey: true, shiftKey: true, altKey: true }))).toBeNull();
    expect(partMoveKey(key('a', { ctrlKey: true, shiftKey: true }))).toBeNull();
  });
});
