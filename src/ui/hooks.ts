import { useEffect, useState, useSyncExternalStore } from 'react';
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
  /** "Fila de execução": the tasks I chose to do next (spec/prioridades.md). */
  | { name: 'execute' }
  | { name: 'data' }
  | { name: 'projects' }
  /** `tab` opens the notes tab; omitted shows the tasks. */
  | { name: 'project'; id: string; tab?: 'notes' }
  | { name: 'settings' }
  /** People cited with `@` (spec/pessoas.md). */
  | { name: 'people' }
  /** `tab` opens the notes tab; omitted shows the tasks. */
  | { name: 'person'; id: string; tab?: 'notes' }
  /** The ideas without a destination, and one idea's page (spec/ideias.md). */
  | { name: 'ideas' }
  | { name: 'idea'; id: string }
  /** Sections 4 and 6. */
  | { name: 'objectives' }
  | { name: 'objective'; id: string }
  | { name: 'habits' };

export function parseRoute(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/');
  switch (parts[0]) {
    case 'dia':
      return isDayKey(parts[1]) ? { name: 'day', day: parts[1] } : { name: 'day' };
    case 'checkout':
      if (!isDayKey(parts[1])) return { name: 'day' };
      return { name: 'checkout', day: parts[1] };
    case 'tarefas':
      return { name: 'active' };
    case 'executar':
      return { name: 'execute' };
    // The archived tasks list is gone (ADR-049); its old address opens the task list.
    case 'arquivadas':
      return { name: 'active' };
    case 'dados':
      return { name: 'data' };
    case 'projetos':
      return { name: 'projects' };
    case 'projeto':
      if (!parts[1]) return { name: 'projects' };
      return parts[2] === 'notas'
        ? { name: 'project', id: decodeURIComponent(parts[1]), tab: 'notes' }
        : { name: 'project', id: decodeURIComponent(parts[1]) };
    case 'config':
      return { name: 'settings' };
    case 'pessoas':
      return { name: 'people' };
    case 'pessoa':
      if (!parts[1]) return { name: 'people' };
      return parts[2] === 'notas'
        ? { name: 'person', id: decodeURIComponent(parts[1]), tab: 'notes' }
        : { name: 'person', id: decodeURIComponent(parts[1]) };
    case 'ideias':
      return { name: 'ideas' };
    case 'ideia':
      return parts[1] ? { name: 'idea', id: decodeURIComponent(parts[1]) } : { name: 'ideas' };
    case 'objetivos':
      return { name: 'objectives' };
    case 'objetivo':
      return parts[1] ? { name: 'objective', id: decodeURIComponent(parts[1]) } : { name: 'objectives' };
    case 'habitos':
      return { name: 'habits' };
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
    case 'execute':
      return '#/executar';
    case 'data':
      return '#/dados';
    case 'projects':
      return '#/projetos';
    case 'project':
      return `#/projeto/${encodeURIComponent(route.id)}${route.tab === 'notes' ? '/notas' : ''}`;
    case 'settings':
      return '#/config';
    case 'people':
      return '#/pessoas';
    case 'person':
      return `#/pessoa/${encodeURIComponent(route.id)}${route.tab === 'notes' ? '/notas' : ''}`;
    case 'ideas':
      return '#/ideias';
    case 'idea':
      return `#/ideia/${encodeURIComponent(route.id)}`;
    case 'objectives':
      return '#/objetivos';
    case 'objective':
      return `#/objetivo/${encodeURIComponent(route.id)}`;
    case 'habits':
      return '#/habitos';
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
