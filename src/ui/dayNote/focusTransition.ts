/**
 * Entering and leaving focus mode as a smooth transition (spec/nota-do-dia.md, "Modo foco"): the
 * part glides from its place in the note to the whole screen and back, while the rest fades. The
 * browser's View Transitions do the animation; where they are missing, or the system asks for
 * less motion, the CSS fade in `global.css` stays.
 */

/** The `view-transition-name` of the part entering or leaving focus mode. */
export const FOCUS_PART_TRANSITION = 'focus-part';

/** Longest wait for the new view: the browser freezes the screen until then. */
export const FOCUS_SWAP_TIMEOUT_MS = 800;

interface ViewTransitionDocument {
  startViewTransition?(update: () => Promise<void>): { finished: Promise<void> };
}

function viewTransitions(): ViewTransitionDocument | null {
  if (typeof document === 'undefined') return null;
  const doc = document as unknown as ViewTransitionDocument;
  if (typeof doc.startViewTransition !== 'function') return null;
  if (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return null;
  return doc;
}

/** Whether focus mode changes with a view transition; otherwise the CSS fade plays. */
export function hasFocusTransition(): boolean {
  return viewTransitions() !== null;
}

/** Resolves when `shown` does, or after `ms` at the latest. */
export function settleWithin(shown: Promise<void>, ms: number): Promise<void> {
  return new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms);
    const finish = () => {
      clearTimeout(timer);
      resolve();
    };
    shown.then(finish, finish);
  });
}

/**
 * Swaps the view inside a transition. `swap` starts the change and resolves once the new view is
 * on screen; `done` runs after the animation, or right away without transitions.
 */
export function runFocusTransition(swap: () => Promise<void>, done: () => void): void {
  const doc = viewTransitions();
  if (!doc?.startViewTransition) {
    swap().then(done, done);
    return;
  }
  const transition = doc.startViewTransition(() => settleWithin(swap(), FOCUS_SWAP_TIMEOUT_MS));
  transition.finished.then(done, done);
}
