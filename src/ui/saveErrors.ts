import { useSyncExternalStore } from 'react';
import { createAutoDismiss, type HoldReason } from './autoDismiss';

/**
 * Failed saves, for the short notice that tells me a change was not saved (issue #66). The
 * screens go back to what is saved on their own; the notice only says so, and goes away by
 * itself after a few seconds (issue #121).
 */

/** How long the notice stays on screen after the last failure (`spec/navegacao.md`, "Global"). */
export const SAVE_ERROR_NOTICE_MS = 8000;

let failures = 0;
const listeners = new Set<() => void>();
const timer = createAutoDismiss(SAVE_ERROR_NOTICE_MS, () => dismissSaveErrors());

function notify() {
  listeners.forEach((listener) => listener());
}

/** A save failed. Already logged by whoever caught it. Counts it and starts the time over. */
export function reportSaveError(): void {
  failures++;
  timer.restart();
  notify();
}

/** The notice was closed, by me or by its time running out. */
export function dismissSaveErrors(): void {
  timer.stop();
  if (failures === 0) return;
  failures = 0;
  notify();
}

/** The mouse is over the notice, or the keyboard focus is inside it: it waits. */
export function holdSaveErrors(reason: HoldReason): void {
  if (failures > 0) timer.hold(reason);
}

/** The mouse or the focus left the notice: the time starts over. */
export function releaseSaveErrors(reason: HoldReason): void {
  timer.release(reason);
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
