import type { Route } from './hooks';

/** The places of the sidebar, and the rituals listed under "Rituais". */
export type SidebarPlace =
  | 'day'
  | 'checkout'
  | 'focusReview'
  | 'directionReview'
  | 'cleanup'
  | 'projects'
  | 'objectives'
  | 'habits'
  | 'active'
  | 'archived'
  | 'wiki'
  | 'data'
  | 'settings';

/** Which place of the sidebar is marked as current. A project page belongs to "Projetos", and so on. */
export function sidebarPlace(route: Route): SidebarPlace {
  switch (route.name) {
    case 'project':
      return 'projects';
    case 'objective':
      return 'objectives';
    default:
      return route.name;
  }
}

const RITUALS: readonly SidebarPlace[] = ['checkout', 'focusReview', 'directionReview', 'cleanup'];

/** Whether the current place is one of the rituals, so the "Rituais" list starts open. */
export function isRitual(place: SidebarPlace): boolean {
  return RITUALS.includes(place);
}
