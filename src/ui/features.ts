import type { Route } from './hooks';

/**
 * Features hidden from the interface while their spec is unfinished (decision of 13/10/2026).
 * Their data, use cases and backups stay untouched; turning a flag on brings everything back.
 */
export const FEATURES: { objectives: boolean; habits: boolean } = {
  objectives: false,
  habits: false,
};

/** The route to show: a hidden feature's screen opens the day note instead. */
export function enabledRoute(route: Route): Route {
  switch (route.name) {
    case 'objectives':
    case 'objective':
      return FEATURES.objectives ? route : { name: 'day' };
    case 'habits':
      return FEATURES.habits ? route : { name: 'day' };
    default:
      return route;
  }
}
