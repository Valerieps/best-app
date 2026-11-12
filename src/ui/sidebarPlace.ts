import type { Route } from './hooks';

/** The places of the sidebar. */
export type SidebarPlace =
  | 'day'
  | 'execute'
  | 'projects'
  | 'objectives'
  | 'habits'
  | 'active'
  | 'people'
  | 'ideas'
  | 'data'
  | 'settings';

/**
 * Which place of the sidebar is marked as current. A project page belongs to "Projetos", and a
 * closing belongs to "Hoje".
 */
export function sidebarPlace(route: Route): SidebarPlace {
  switch (route.name) {
    case 'project':
      return 'projects';
    case 'objective':
      return 'objectives';
    case 'person':
      return 'people';
    case 'idea':
      return 'ideas';
    case 'checkout':
      return 'day';
    default:
      return route.name;
  }
}
