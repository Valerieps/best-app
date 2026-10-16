import type { Appearance } from '../../domain/entities';

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

function browserStorage(): AppearanceStorage | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage;
  } catch {
    return undefined;
  }
}
