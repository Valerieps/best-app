import type { ReviewAvailability } from '../application/reviewQueries';
import type { Route } from './hooks';

/**
 * Features hidden from the interface while their spec is unfinished (decision of 13/10/2026).
 * Their data, use cases and backups stay untouched; turning a flag on brings everything back.
 */
export const FEATURES: { objectives: boolean; habits: boolean; wikiInSidebar: boolean } = {
  objectives: false,
  habits: false,
  // Only the sidebar entry is hidden (15/10/2026); the wiki screen still opens from its links,
  // like "ver na wiki" on a task's origin.
  wikiInSidebar: false,
};

/** The Revisão de Rumo revolves around the objectives, so it is shown only with them. */
export const directionReviewEnabled = (): boolean => FEATURES.objectives;

/** The route to show: a hidden feature's screen opens the day note instead. */
export function enabledRoute(route: Route): Route {
  switch (route.name) {
    case 'objectives':
    case 'objective':
      return FEATURES.objectives ? route : { name: 'day' };
    case 'habits':
      return FEATURES.habits ? route : { name: 'day' };
    case 'directionReview':
      return directionReviewEnabled() ? route : { name: 'day' };
    default:
      return route;
  }
}

/** Review availability without the hidden reviews, for the "Rituais" counter and the notice. */
export function visibleReviews(availability: ReviewAvailability | undefined): ReviewAvailability | undefined {
  if (!availability || directionReviewEnabled()) return availability;
  return { ...availability, direction: [] };
}
