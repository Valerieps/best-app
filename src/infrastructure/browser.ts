import type { Clock, IdGenerator } from '../application/ports';

export const systemClock: Clock = {
  now: () => new Date(),
};

export const randomIds: IdGenerator = {
  next: () => crypto.randomUUID(),
};

/**
 * Asks Chrome not to evict the app's data under storage pressure.
 * Returns whether storage is persistent.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage?.persist) return false;
  if (await navigator.storage.persisted()) return true;
  return navigator.storage.persist();
}

/** Offline support. Only in production: the dev server serves files that change constantly. */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      // The app works without offline support; there is nowhere to report this to.
    });
  });
}
