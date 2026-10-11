import { liveQuery } from 'dexie';
import { useEffect, useState } from 'react';

/**
 * Re-runs `query` whenever the data it reads changes, in this tab or any other.
 * Returns undefined until the first result arrives.
 */
export function useLiveQuery<T>(query: () => Promise<T>, deps: readonly unknown[] = []): T | undefined {
  const [value, setValue] = useState<T>();
  useEffect(() => {
    const subscription = liveQuery(query).subscribe({ next: setValue, error: () => setValue(undefined) });
    return () => subscription.unsubscribe();
  }, deps);
  return value;
}
