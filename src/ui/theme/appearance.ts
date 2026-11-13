import { DEFAULT_APP_THEME } from '../../application/settings';
import type { Appearance, AppTheme } from '../../domain/entities';

/** Copy of the chosen appearance in this browser, read before the first render (ADR-055). */
export const APPEARANCE_KEY = 'best-app:appearance';

type AppearanceStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** Accepts only a known appearance; anything else follows the system. */
export function parseAppearance(value: unknown): Appearance {
  return value === 'light' || value === 'dark' ? value : 'system';
}

/** The appearance copied in this browser, or the system's when there is none or storage is blocked. */
export function readStoredAppearance(storage: AppearanceStorage | undefined = browserStorage()): Appearance {
  try {
    return parseAppearance(storage?.getItem(APPEARANCE_KEY));
  } catch {
    return 'system';
  }
}

/**
 * Sets `data-theme` on the root element, which tokens.css reads; "system" removes it, so the
 * system's choice applies. Also keeps the copy in this browser, so the next load starts right.
 */
export function applyAppearance(
  appearance: Appearance,
  root: Pick<Element, 'setAttribute' | 'removeAttribute'> = document.documentElement,
  storage: AppearanceStorage | undefined = browserStorage(),
): void {
  if (appearance === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', appearance);
  try {
    if (appearance === 'system') storage?.removeItem(APPEARANCE_KEY);
    else storage?.setItem(APPEARANCE_KEY, appearance);
  } catch {
    // Storage blocked: the theme still applies, only the next load may start in the system's.
  }
}

/** Copy of the chosen theme in this browser, read before the first render, like the appearance. */
export const APP_THEME_KEY = 'best-app:app-theme';

/**
 * Every theme the app offers, in the order of the settings. A theme is a block of token values in
 * tokens.css under `:root[data-app-theme="<id>"]`, plus its dark version (ADR-077): to add one, add
 * it here, to the AppTheme type and to tokens.css. "classico" is the base values of tokens.css.
 */
export const APP_THEMES: readonly { id: AppTheme; label: string }[] = [
  { id: 'crepusculo', label: 'Crepúsculo' },
  { id: 'classico', label: 'Clássico' },
];

/** Accepts only a known theme; anything else, absent included, is the default. */
export function parseAppTheme(value: unknown): AppTheme {
  return APP_THEMES.find((theme) => theme.id === value)?.id ?? DEFAULT_APP_THEME;
}

/** The theme copied in this browser, or the default when there is none or storage is blocked. */
export function readStoredAppTheme(storage: AppearanceStorage | undefined = browserStorage()): AppTheme {
  try {
    return parseAppTheme(storage?.getItem(APP_THEME_KEY));
  } catch {
    return DEFAULT_APP_THEME;
  }
}

/** Sets `data-app-theme` on the root element, which tokens.css reads, and keeps a copy in this browser. */
export function applyAppTheme(
  theme: AppTheme,
  root: Pick<Element, 'setAttribute'> = document.documentElement,
  storage: AppearanceStorage | undefined = browserStorage(),
): void {
  root.setAttribute('data-app-theme', theme);
  try {
    storage?.setItem(APP_THEME_KEY, theme);
  } catch {
    // Storage blocked: the theme still applies, only the next load may start in the default.
  }
}

function browserStorage(): AppearanceStorage | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage;
  } catch {
    return undefined;
  }
}
