import type { Route } from './hooks';

/** The places of the sidebar. */
export type SidebarPlace =
  | 'day'
  | 'rituals'
  | 'projects'
  | 'objectives'
  | 'habits'
  | 'active'
  | 'people'
  | 'data'
  | 'settings';

/**
 * Which place of the sidebar is marked as current. A project page belongs to "Projetos", and the
 * rituals opened from the "Rituais" screen (a closing, a review, an assistant) belong to it.
 */
export function sidebarPlace(route: Route): SidebarPlace {
  switch (route.name) {
    case 'project':
      return 'projects';
    case 'objective':
      return 'objectives';
    case 'person':
      return 'people';
    case 'checkout':
    case 'focusReview':
    case 'directionReview':
      return 'rituals';
    default:
      return route.name;
  }
}
