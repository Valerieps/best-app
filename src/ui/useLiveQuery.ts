import { liveQuery } from 'dexie';
import { useEffect, useState } from 'react';

export interface LiveQueryState<T> {
  /** Undefined until the first result arrives, or when the query failed. */
  value: T | undefined;
  /** What the query threw, if it failed. Already logged to the console. */
  error: unknown;
}

/**
 * Re-runs `query` whenever the data it reads changes, in this tab or any other, and reports a
 * failure instead of hiding it. For parts of the shell that must keep working when a query
 * fails (the sidebar, the warnings); screens use `useLiveQuery`.
 */
export function useLiveQueryState<T>(query: () => Promise<T>, deps: readonly unknown[] = []): LiveQueryState<T> {
  const [state, setState] = useState<LiveQueryState<T>>({ value: undefined, error: undefined });
  useEffect(() => {
    setState((previous) => (previous.error === undefined ? previous : { value: undefined, error: undefined }));
    const subscription = liveQuery(query).subscribe({
      next: (value) => setState({ value, error: undefined }),
      error: (error: unknown) => {
        console.error('A consulta falhou:', error);
        setState({ value: undefined, error: error ?? new Error('A consulta falhou') });
      },
    });
    return () => subscription.unsubscribe();
  }, deps);
  return state;
}

/**
 * Re-runs `query` whenever the data it reads changes, in this tab or any other.
 * Returns undefined until the first result arrives. A failed query is thrown while rendering,
 * so the screen's error boundary shows it instead of a skeleton that never ends.
 */
export function useLiveQuery<T>(query: () => Promise<T>, deps: readonly unknown[] = []): T | undefined {
  const { value, error } = useLiveQueryState(query, deps);
  if (error !== undefined) throw error;
  return value;
}
