import { useEffect, useState } from 'react';
import { loadDueReflection } from '../../application/queries';
import { formatShortDate } from '../format';
import { navigate } from '../hooks';
import { reader } from '../services';
import { useLiveQuery } from '../useLiveQuery';

/** Re-checks the schedule every few minutes, since the reflection becomes due at a set hour. */
const CHECK_EVERY_MS = 5 * 60 * 1000;

/** Shows up in the day note when the scheduled weekly reflection is due. Never a notification. */
export function ReflectionBanner() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((value) => value + 1), CHECK_EVERY_MS);
    return () => clearInterval(timer);
  }, []);
  const due = useLiveQuery(() => loadDueReflection(reader, new Date()), [tick]);
  if (!due) return null;
  return (
    <div className="banner" role="status">
      <span>
        A reflexão semanal de {formatShortDate(due.start)} a {formatShortDate(due.end)} está disponível.
      </span>
      <button type="button" className="link" onClick={() => navigate({ name: 'reflection', week: due.key })}>
        Fazer agora
      </button>
    </div>
  );
}
