/**
 * Runs `load` and hands its answer to `onValue`, or its failure to `onError`, unless cancelled
 * first. Returns the cancel function, for an effect's cleanup: an answer that arrives after the
 * inputs changed, or after the screen closed, is dropped instead of overwriting a newer one.
 */
export function loadLatest<T>(load: () => Promise<T>, onValue: (value: T) => void, onError: (error: unknown) => void): () => void {
  let current = true;
  load().then(
    (value) => {
      if (current) onValue(value);
    },
    (error: unknown) => {
      if (current) onError(error ?? new Error('A leitura falhou'));
    },
  );
  return () => {
    current = false;
  };
}
