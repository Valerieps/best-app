import type { MenuCounts } from '../application/queries';
import type { IconName } from './components/Icon';
import type { Route } from './hooks';
import type { SidebarPlace } from './sidebarPlace';

export interface SidebarEntry {
  place: SidebarPlace;
  route: Route;
  label: string;
  count?: number;
  /** The "Rituais" counter: pending days plus available reviews. */
  due?: number;
}

export interface SidebarGroup {
  key: 'start' | 'planning' | 'lists' | 'footer';
  entries: SidebarEntry[];
}

/** Every place has an icon before its label, as in most sidebars, so it is found at a glance. */
export const PLACE_ICONS: Record<SidebarPlace, IconName> = {
  day: 'sun',
  rituals: 'repeat',
  projects: 'folder',
  objectives: 'target',
  habits: 'leaf',
  active: 'checklist',
  people: 'users',
  data: 'database',
  settings: 'settings',
};

interface Input {
  counts: MenuCounts | undefined;
  dueCount: number;
  features: { objectives: boolean; habits: boolean };
}

/**
 * The places of the sidebar, in groups and in order, shared by the open sidebar and the collapsed
 * strip (spec/navegacao.md, "Global"). The groups have no titles since 15/10/2026: a space sets
 * them apart. The footer holds "Dados e backup" and "Configurações".
 */
export function sidebarGroups({ counts, dueCount, features }: Input): SidebarGroup[] {
  return [
    {
      key: 'start',
      entries: [
        { place: 'day', route: { name: 'day' }, label: 'Hoje' },
        { place: 'rituals', route: { name: 'rituals' }, label: 'Rituais', due: dueCount },
      ],
    },
    {
      key: 'planning',
      entries: [
        { place: 'projects', route: { name: 'projects' }, label: 'Projetos', count: counts?.projects },
        // Hidden until their spec is done (ui/features.ts).
        ...(features.objectives
          ? [{ place: 'objectives' as const, route: { name: 'objectives' as const }, label: 'Objetivos' }]
          : []),
        ...(features.habits ? [{ place: 'habits' as const, route: { name: 'habits' as const }, label: 'Hábitos' }] : []),
      ],
    },
    {
      key: 'lists',
      entries: [
        { place: 'active', route: { name: 'active' }, label: 'Tarefas', count: counts?.active },
        { place: 'people', route: { name: 'people' }, label: 'Pessoas', count: counts?.people },
      ],
    },
    {
      key: 'footer',
      entries: [
        { place: 'data', route: { name: 'data' }, label: 'Dados e backup' },
        { place: 'settings', route: { name: 'settings' }, label: 'Configurações' },
      ],
    },
  ];
}
