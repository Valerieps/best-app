export const systemClock = {
    now: () => new Date(),
};
export const randomIds = {
    next: () => crypto.randomUUID(),
};
/**
 * Asks Chrome not to evict the app's data under storage pressure.
 * Returns whether storage is persistent.
 */
export async function requestPersistentStorage() {
    if (!navigator.storage?.persist)
        return false;
    if (await navigator.storage.persisted())
        return true;
    return navigator.storage.persist();
}
/** Offline support. Only in production: the dev server serves files that change constantly. */
export function registerServiceWorker() {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator))
        return;
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(() => {
            // The app works without offline support; there is nowhere to report this to.
        });
    });
}
