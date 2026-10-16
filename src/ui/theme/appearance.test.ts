import { describe, expect, it } from 'vitest';
import { APPEARANCE_KEY, applyAppearance, parseAppearance, readStoredAppearance } from './appearance';

function fakeRoot() {
  const attributes = new Map<string, string>();
  return {
    attributes,
    setAttribute: (name: string, value: string) => void attributes.set(name, value),
    removeAttribute: (name: string) => void attributes.delete(name),
  };
}

function fakeStorage(initial: Record<string, string> = {}) {
  const items = new Map(Object.entries(initial));
  return {
    items,
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
    removeItem: (key: string) => void items.delete(key),
  };
}

const blockedStorage = {
  getItem: (): string | null => {
    throw new Error('blocked');
  },
  setItem: () => {
    throw new Error('blocked');
  },
  removeItem: () => {
    throw new Error('blocked');
  },
};

describe('appearance', () => {
  it('accepts only light and dark; anything else follows the system', () => {
    expect(parseAppearance('light')).toBe('light');
    expect(parseAppearance('dark')).toBe('dark');
    expect(parseAppearance('system')).toBe('system');
    expect(parseAppearance(null)).toBe('system');
    expect(parseAppearance('sepia')).toBe('system');
  });

  it('marks the root with the chosen theme and keeps a copy in this browser', () => {
    const root = fakeRoot();
    const storage = fakeStorage();
    applyAppearance('dark', root, storage);
    expect(root.attributes.get('data-theme')).toBe('dark');
    expect(storage.items.get(APPEARANCE_KEY)).toBe('dark');
    expect(readStoredAppearance(storage)).toBe('dark');
  });

  it('removes the mark and the copy to follow the system', () => {
    const root = fakeRoot();
    const storage = fakeStorage({ [APPEARANCE_KEY]: 'light' });
    root.setAttribute('data-theme', 'light');
    applyAppearance('system', root, storage);
    expect(root.attributes.has('data-theme')).toBe(false);
    expect(storage.items.has(APPEARANCE_KEY)).toBe(false);
    expect(readStoredAppearance(storage)).toBe('system');
  });

  it('still applies the theme when storage is blocked, and reads it as the system', () => {
    const root = fakeRoot();
    expect(() => applyAppearance('light', root, blockedStorage)).not.toThrow();
    expect(root.attributes.get('data-theme')).toBe('light');
    expect(readStoredAppearance(blockedStorage)).toBe('system');
    expect(readStoredAppearance(undefined)).toBe('system');
  });
});
