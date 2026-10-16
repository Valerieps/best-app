import { reportSaveError } from './saveErrors';

/**
 * Runs the editor's writes one after another. Typing fast produces writes that depend on each
 * other (create a line, then change its kind, then save its text); running them in order means
 * a later write never looks for a block that is still being created. Importing a backup and
 * undoing an import go through the same queue (`runAfterPendingWrites`), so a line saved on blur
 * never lands after the import and mixes the two states.
 */
let chain: Promise<unknown> = Promise.resolve();

function add<T>(write: () => Promise<T>, onError: (error: unknown) => void): Promise<T> {
  const result = chain.then(write);
  // Keep the queue going after a failure; the caller still sees the error.
  chain = result.catch(onError);
  return result;
}

export function enqueue<T>(write: () => Promise<T>): Promise<T> {
  return add(write, (error) => {
    console.error(error);
    reportSaveError();
  });
}

/**
 * Runs `work` after every write already queued, and holds later writes until it ends. For work
 * that shows its own error message, so a failure is not also counted as a failed save.
 */
export function runAfterPendingWrites<T>(work: () => Promise<T>): Promise<T> {
  return add(work, () => {});
}
