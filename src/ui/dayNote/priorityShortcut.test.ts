import { describe, expect, it } from 'vitest';
import { isPriorityKey } from './priorityShortcut';

const key = (over: Partial<Parameters<typeof isPriorityKey>[0]>) => ({
  code: 'KeyS',
  altKey: true,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  ...over,
});

describe('isPriorityKey', () => {
  it('matches Alt + S by the physical key', () => {
    expect(isPriorityKey(key({}))).toBe(true);
  });

  it('ignores S without Alt, or with other modifiers', () => {
    expect(isPriorityKey(key({ altKey: false }))).toBe(false);
    expect(isPriorityKey(key({ ctrlKey: true }))).toBe(false);
    expect(isPriorityKey(key({ metaKey: true }))).toBe(false);
    expect(isPriorityKey(key({ shiftKey: true }))).toBe(false);
    expect(isPriorityKey(key({ code: 'KeyD' }))).toBe(false);
  });
});
