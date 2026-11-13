import { describe, expect, it } from 'vitest';
import {
  APP_THEME_KEY,
  APP_THEMES,
  APPEARANCE_KEY,
  applyAppearance,
  applyAppTheme,
  parseAppearance,
  parseAppTheme,
  readStoredAppearance,
  readStoredAppTheme,
} from './appearance';

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

describe('app theme', () => {
  it('offers Crepúsculo first, and falls back to it for anything unknown', () => {
    expect(APP_THEMES[0].id).toBe('crepusculo');
    expect(parseAppTheme('classico')).toBe('classico');
    expect(parseAppTheme(undefined)).toBe('crepusculo');
    expect(parseAppTheme('neon')).toBe('crepusculo');
  });

  it('marks the root with the theme and keeps a copy in this browser', () => {
    const root = fakeRoot();
    const storage = fakeStorage();
    applyAppTheme('classico', root, storage);
    expect(root.attributes.get('data-app-theme')).toBe('classico');
    expect(storage.items.get(APP_THEME_KEY)).toBe('classico');
    expect(readStoredAppTheme(storage)).toBe('classico');
  });

  it('still applies the theme when storage is blocked, and reads the default', () => {
    const root = fakeRoot();
    expect(() => applyAppTheme('classico', root, blockedStorage)).not.toThrow();
    expect(root.attributes.get('data-app-theme')).toBe('classico');
    expect(readStoredAppTheme(blockedStorage)).toBe('crepusculo');
  });
});
