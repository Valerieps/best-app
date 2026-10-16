/**
 * Timer for a notice that goes away by itself (issue #121): it expires after a fixed time, waits
 * while something holds it (the mouse over it, keyboard focus inside it), and starts over when
 * asked to. Holding and releasing never lose time to a hidden countdown: once every hold is
 * released, the full time starts again, so I always get the whole time to read it.
 */

export interface Timers {
  setTimeout(callback: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
}

export type HoldReason = 'hover' | 'focus';

export interface AutoDismiss {
  /** Starts the time over (the notice appeared, or something new happened in it). */
  restart(): void;
  /** Something keeps the notice on screen: the time stops. */
  hold(reason: HoldReason): void;
  /** That reason no longer holds it; once none does, the full time starts again. */
  release(reason: HoldReason): void;
  /** The notice was closed: no time runs and no hold is left. */
  stop(): void;
  /** Whether a countdown is running right now. */
  running(): boolean;
}

const browserTimers: Timers = {
  setTimeout: (callback, ms) => globalThis.setTimeout(callback, ms),
  clearTimeout: (handle) => globalThis.clearTimeout(handle as ReturnType<typeof setTimeout>),
};

export function createAutoDismiss(ms: number, onExpire: () => void, timers: Timers = browserTimers): AutoDismiss {
  let handle: unknown = null;
  const holds = new Set<HoldReason>();

  function clear() {
    if (handle !== null) timers.clearTimeout(handle);
    handle = null;
  }

  function start() {
    clear();
    if (holds.size > 0) return;
    handle = timers.setTimeout(() => {
      handle = null;
      onExpire();
    }, ms);
  }

  return {
    restart: start,
    hold(reason) {
      holds.add(reason);
      clear();
    },
    release(reason) {
      if (!holds.delete(reason)) return;
      if (holds.size === 0) start();
    },
    stop() {
      holds.clear();
      clear();
    },
    running: () => handle !== null,
  };
}
