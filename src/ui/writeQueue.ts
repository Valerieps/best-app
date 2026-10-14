import { reportSaveError } from './saveErrors';

/**
 * Runs the editor's writes one after another. Typing fast produces writes that depend on each
 * other (create a line, then change its kind, then save its text); running them in order means
 * a later write never looks for a block that is still being created.
 */
let chain: Promise<unknown> = Promise.resolve();

export function enqueue<T>(write: () => Promise<T>): Promise<T> {
  const result = chain.then(write);
  // Keep the queue going after a failure, and tell the user; the caller still sees the error.
  chain = result.catch((error) => {
    console.error(error);
    reportSaveError();
  });
  return result;
}
