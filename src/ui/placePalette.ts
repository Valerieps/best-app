import type { IconName } from './components/Icon';
import type { Route } from './hooks';

/** A place the Ctrl + K palette can go to: the places of the sidebar (spec/navegacao.md, "Global"). */
export interface PalettePlace {
  key: string;
  label: string;
  icon: IconName;
  route: Route;
}

/** The sidebar's places, in its order; objectives and habits only while their feature is on. */
export function palettePlaces(features: { objectives: boolean; habits: boolean }): PalettePlace[] {
  return [
    { key: 'day', label: 'Hoje', icon: 'sun', route: { name: 'day' } },
    { key: 'rituals', label: 'Rituais', icon: 'repeat', route: { name: 'rituals' } },
    { key: 'projects', label: 'Projetos', icon: 'folder', route: { name: 'projects' } },
    ...(features.objectives
      ? [{ key: 'objectives', label: 'Objetivos', icon: 'target' as const, route: { name: 'objectives' as const } }]
      : []),
    ...(features.habits ? [{ key: 'habits', label: 'Hábitos', icon: 'leaf' as const, route: { name: 'habits' as const } }] : []),
    { key: 'active', label: 'Tarefas', icon: 'checklist', route: { name: 'active' } },
    { key: 'people', label: 'Pessoas', icon: 'users', route: { name: 'people' } },
    { key: 'data', label: 'Dados e backup', icon: 'database', route: { name: 'data' } },
    { key: 'settings', label: 'Configurações', icon: 'settings', route: { name: 'settings' } },
  ];
}

/** Lower case and without accents, so "configuracoes" finds "Configurações". */
export function foldText(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
}

/** The places whose name contains the query; names that start with it come first. */
export function filterPlaces(places: PalettePlace[], query: string): PalettePlace[] {
  const folded = foldText(query);
  if (folded === '') return places;
  const matches = places.filter((place) => foldText(place.label).includes(folded));
  const starts = matches.filter((place) => foldText(place.label).startsWith(folded));
  return [...starts, ...matches.filter((place) => !starts.includes(place))];
}

/** The highlighted option after an arrow key; it wraps around, and -1 means no option. */
export function moveActive(active: number, key: string, count: number): number {
  if (count === 0) return -1;
  if (key === 'ArrowDown') return (active + 1 + count) % count;
  if (key === 'ArrowUp') return active <= 0 ? count - 1 : active - 1;
  if (key === 'Home') return 0;
  if (key === 'End') return count - 1;
  return active;
}

/** Ctrl + K (⌘ + K on the Mac), by the key's position, as the day note's shortcuts (ADR-048). */
export function isPaletteShortcut(event: {
  code: string;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}): boolean {
  return event.code === 'KeyK' && (event.ctrlKey || event.metaKey) && !event.shiftKey && !event.altKey;
}
