import { liveQuery } from 'dexie';
import { useEffect, useState } from 'react';
/**
 * Re-runs `query` whenever the data it reads changes, in this tab or any other.
 * Returns undefined until the first result arrives.
 */
export function useLiveQuery(query, deps = []) {
    const [value, setValue] = useState();
    useEffect(() => {
        const subscription = liveQuery(query).subscribe({ next: setValue, error: () => setValue(undefined) });
        return () => subscription.unsubscribe();
    }, deps);
    return value;
}
