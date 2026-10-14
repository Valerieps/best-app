import { useSyncExternalStore } from 'react';

/**
 * Failed saves, for the short notice that tells me a change was not saved (issue #66). The
 * screens go back to what is saved on their own; the notice only says so.
 */

let failures = 0;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

/** A save failed. Already logged by whoever caught it. */
export function reportSaveError(): void {
  failures++;
  notify();
}

/** The notice was closed. */
export function dismissSaveErrors(): void {
  failures = 0;
  notify();
}

export function saveErrorCount(): number {
  return failures;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** How many saves failed since the notice was last closed. */
export function useSaveErrors(): number {
  return useSyncExternalStore(subscribe, saveErrorCount);
}
