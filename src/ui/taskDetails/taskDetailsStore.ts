import { useSyncExternalStore } from 'react';

/**
 * Which task the details window shows, if any. A tiny store so any screen can open the window
 * with `openTaskDetails(id)` without threading a prop or a context through its tree.
 */

let openId: string | null = null;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

export function openTaskDetails(taskId: string): void {
  if (openId === taskId) return;
  openId = taskId;
  emit();
}

export function closeTaskDetails(): void {
  if (openId === null) return;
  openId = null;
  emit();
}

export function currentTaskDetailsId(): string | null {
  return openId;
}

export function useOpenTaskId(): string | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => openId,
  );
}
