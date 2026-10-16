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
  /** `assistant` opens one assistant's details; omitted shows the dashboard. */
  /** The "Rituais" screen, or one of its assistants when `assistant` is set. */
  | { name: 'rituals'; assistant?: AssistantId }
  | { name: 'data' }
  /** Section 2: the Revisão de Foco, always the one in progress. */
  | { name: 'focusReview' }
  | { name: 'projects' }
  /** `tab` opens the notes tab; omitted shows the tasks. */
  | { name: 'project'; id: string; tab?: 'notes' }
  | { name: 'settings' }
  /** People cited with `@` (spec/pessoas.md). */
  | { name: 'people' }
  | { name: 'person'; id: string }
  /** Sections 4 and 6. */
  | { name: 'objectives' }
  | { name: 'objective'; id: string }
  | { name: 'habits' }
  /** Section 4: the Revisão de Rumo, always the one in progress. */
  | { name: 'directionReview' };

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
    // The archived tasks list is gone (ADR-049); its old address opens the task list.
    case 'arquivadas':
      return { name: 'active' };
    case 'rituais':
    case 'ordem': { // "Colocar ordem na casa", before the "Rituais" screen
      const assistant = ASSISTANT_IDS.find((id) => ASSISTANT_SLUGS[id] === parts[1]);
      return assistant ? { name: 'rituals', assistant } : { name: 'rituals' };
    }
    case 'dados':
      return { name: 'data' };
    case 'foco':
    case 'reflexao': // the weekly reflection, before the reviews
      return { name: 'focusReview' };
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
      return parts[1] ? { name: 'person', id: decodeURIComponent(parts[1]) } : { name: 'people' };
    case 'objetivos':
      return { name: 'objectives' };
    case 'objetivo':
      return parts[1] ? { name: 'objective', id: decodeURIComponent(parts[1]) } : { name: 'objectives' };
    case 'habitos':
      return { name: 'habits' };
    case 'rumo':
    case 'mes': // the monthly reflection, before the reviews
      return { name: 'directionReview' };
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
    case 'rituals':
      return route.assistant ? `#/rituais/${ASSISTANT_SLUGS[route.assistant]}` : '#/rituais';
    case 'data':
      return '#/dados';
    case 'focusReview':
      return '#/foco';
    case 'projects':
      return '#/projetos';
    case 'project':
      return `#/projeto/${encodeURIComponent(route.id)}${route.tab === 'notes' ? '/notas' : ''}`;
    case 'settings':
      return '#/config';
    case 'people':
      return '#/pessoas';
    case 'person':
      return `#/pessoa/${encodeURIComponent(route.id)}`;
    case 'objectives':
      return '#/objetivos';
    case 'objective':
      return `#/objetivo/${encodeURIComponent(route.id)}`;
    case 'habits':
      return '#/habitos';
    case 'directionReview':
      return '#/rumo';
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
