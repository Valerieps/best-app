import { useEffect, useState, useSyncExternalStore } from 'react';
import { ASSISTANT_IDS, type AssistantId } from '../domain/cleanupStatus';
import { isDayKey, toDayKey, type DayKey } from '../domain/day';

/** Today's day key, updated at midnight and when the tab becomes visible again. */
export function useToday(): DayKey {
  const [today, setToday] = useState(() => toDayKey(new Date()));
  useEffect(() => {
    const refresh = () => setToday(toDayKey(new Date()));
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
    const timer = setTimeout(refresh, midnight.getTime() - now.getTime());
    document.addEventListener('visibilitychange', refresh);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [today]);
  return today;
}

export type Route =
  /** The day note; `day` is set when paging to a past day with pending items (1b). */
  | { name: 'day'; day?: DayKey }
  | { name: 'checkout'; day: DayKey }
  | { name: 'active' }
  | { name: 'archived' }
  /** `section` highlights one wiki entry, e.g. when coming from a task's origin. */
  | { name: 'wiki'; section?: string }
  /** `assistant` opens one assistant's details; omitted shows the dashboard. */
  | { name: 'cleanup'; assistant?: AssistantId }
  | { name: 'data' }
  /** Section 2. week is an ISO week like 2026-W41; omitted means the default week. */
  | { name: 'reflection'; week?: string }
  | { name: 'projects' }
  | { name: 'project'; id: string }
  | { name: 'settings' }
  /** Sections 4 and 6. `month` is AAAA-MM; omitted means the month that just ended. */
  | { name: 'objectives' }
  | { name: 'objective'; id: string }
  | { name: 'habits' }
  | { name: 'monthReflection'; month?: string };

/** Portuguese paths for the cleanup assistants, as the user reads them in the address bar. */
const ASSISTANT_SLUGS: Record<AssistantId, string> = {
  pendingDays: 'dias-em-aberto',
  whiteboards: 'secoes-soltas',
  duplicates: 'projetos-repetidos',
};

export function parseRoute(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/');
  switch (parts[0]) {
    case 'dia':
      return isDayKey(parts[1]) ? { name: 'day', day: parts[1] } : { name: 'day' };
    case 'checkout':
      return isDayKey(parts[1]) ? { name: 'checkout', day: parts[1] } : { name: 'day' };
    case 'tarefas':
      return { name: 'active' };
    case 'arquivadas':
      return { name: 'archived' };
    case 'wiki':
      return parts[1] ? { name: 'wiki', section: decodeURIComponent(parts[1]) } : { name: 'wiki' };
    case 'ordem': {
      const assistant = ASSISTANT_IDS.find((id) => ASSISTANT_SLUGS[id] === parts[1]);
      return assistant ? { name: 'cleanup', assistant } : { name: 'cleanup' };
    }
    case 'dados':
      return { name: 'data' };
    case 'reflexao':
      return /^\d{4}-W\d{2}$/.test(parts[1] ?? '') ? { name: 'reflection', week: parts[1] } : { name: 'reflection' };
    case 'projetos':
      return { name: 'projects' };
    case 'projeto':
      return parts[1] ? { name: 'project', id: decodeURIComponent(parts[1]) } : { name: 'projects' };
    case 'config':
      return { name: 'settings' };
    case 'objetivos':
      return { name: 'objectives' };
    case 'objetivo':
      return parts[1] ? { name: 'objective', id: decodeURIComponent(parts[1]) } : { name: 'objectives' };
    case 'habitos':
      return { name: 'habits' };
    case 'mes':
      return /^\d{4}-\d{2}$/.test(parts[1] ?? '') ? { name: 'monthReflection', month: parts[1] } : { name: 'monthReflection' };
    default:
      return { name: 'day' };
  }
}

export function routeHash(route: Route): string {
  switch (route.name) {
    case 'day':
      return route.day ? `#/dia/${route.day}` : '#/';
    case 'checkout':
      return `#/checkout/${route.day}`;
    case 'active':
      return '#/tarefas';
    case 'archived':
      return '#/arquivadas';
    case 'wiki':
      return route.section ? `#/wiki/${encodeURIComponent(route.section)}` : '#/wiki';
    case 'cleanup':
      return route.assistant ? `#/ordem/${ASSISTANT_SLUGS[route.assistant]}` : '#/ordem';
    case 'data':
      return '#/dados';
    case 'reflection':
      return route.week ? `#/reflexao/${route.week}` : '#/reflexao';
    case 'projects':
      return '#/projetos';
    case 'project':
      return `#/projeto/${encodeURIComponent(route.id)}`;
    case 'settings':
      return '#/config';
    case 'objectives':
      return '#/objetivos';
    case 'objective':
      return `#/objetivo/${encodeURIComponent(route.id)}`;
    case 'habits':
      return '#/habitos';
    case 'monthReflection':
      return route.month ? `#/mes/${route.month}` : '#/mes';
  }
}

export function navigate(route: Route): void {
  window.location.hash = routeHash(route);
}

function subscribeHash(listener: () => void) {
  window.addEventListener('hashchange', listener);
  return () => window.removeEventListener('hashchange', listener);
}

/** Hash routing: no server involved, and the back button works. */
export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribeHash, () => window.location.hash);
  return parseRoute(hash);
}
