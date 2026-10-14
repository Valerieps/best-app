import { useEffect } from 'react';

/** Whether a page event means the page may be closed next: hidden, or being unloaded. */
export function isLeavingPage(eventType: string, visibility: DocumentVisibilityState): boolean {
  return eventType === 'pagehide' || (eventType === 'visibilitychange' && visibility === 'hidden');
}

/**
 * Calls `save` when the page is hidden or unloaded, so a pending write starts before the tab
 * closes. Closing the tab hides the page first, which leaves time for an IndexedDB write.
 */
export function useSaveOnPageLeave(save: () => void): void {
  useEffect(() => {
    const onEvent = (event: Event) => {
      if (isLeavingPage(event.type, document.visibilityState)) save();
    };
    document.addEventListener('visibilitychange', onEvent);
    window.addEventListener('pagehide', onEvent);
    return () => {
      document.removeEventListener('visibilitychange', onEvent);
      window.removeEventListener('pagehide', onEvent);
    };
  }, [save]);
}
