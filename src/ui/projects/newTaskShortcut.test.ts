import { describe, expect, it } from 'vitest';
import { isNewTaskKey } from './newTaskShortcut';

const key = (over: Partial<Parameters<typeof isNewTaskKey>[0]> = {}) => ({ code: 'KeyA', key: 'a', ctrlKey: true, metaKey: false, shiftKey: false, altKey: false, ...over });

describe('isNewTaskKey', () => {
  it('matches Ctrl + A and ⌘ + A', () => {
    expect(isNewTaskKey(key())).toBe(true);
    expect(isNewTaskKey(key({ ctrlKey: false, metaKey: true }))).toBe(true);
  });
  it('ignores other keys and extra modifiers', () => {
    expect(isNewTaskKey(key({ code: 'KeyB', key: 'b' }))).toBe(false);
    expect(isNewTaskKey(key({ shiftKey: true }))).toBe(false);
    expect(isNewTaskKey(key({ altKey: true }))).toBe(false);
    expect(isNewTaskKey(key({ ctrlKey: false }))).toBe(false);
  });
});
