import { useSyncExternalStore } from 'react';
import type Dexie from 'dexie';

/**
 * Whether this tab may keep using the database (ADR-059).
 * - `replaced`: a newer version of the app, opened in another tab, upgraded the database; this
 *   tab's code no longer matches it and must reload.
 * - `newer`: the database was upgraded by a newer version than this one (e.g. an old cached
 *   page); this code must not touch it.
 */
export type DatabaseVersionStatus = 'ok' | 'replaced' | 'newer';

let status: DatabaseVersionStatus = 'ok';
const listeners = new Set<() => void>();

export function setDatabaseVersionStatus(next: DatabaseVersionStatus): void {
  if (status === next) return;
  status = next;
  listeners.forEach((listener) => listener());
}

export function databaseVersionStatus(): DatabaseVersionStatus {
  return status;
}

/**
 * Wires the database's version events to the status. Dexie closes the database on its own when
 * another tab upgrades it. Dexie 4 opens a database newer than its schema without an error, so
 * the installed version is compared with the one this code declares.
 */
export async function watchDatabaseVersion(db: Dexie, codeVersion: number): Promise<void> {
  db.on('versionchange', () => {
    setDatabaseVersionStatus('replaced');
  });
  try {
    await db.open();
  } catch (error) {
    if (error instanceof Error && error.name === 'VersionError') setDatabaseVersionStatus('newer');
    return;
  }
  // IndexedDB stores Dexie's version times ten.
  if (db.backendDB().version / 10 > codeVersion) {
    setDatabaseVersionStatus('newer');
    // No query may reopen it: this code must not write to a schema it does not know.
    db.close({ disableAutoOpen: true });
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useDatabaseVersionStatus(): DatabaseVersionStatus {
  return useSyncExternalStore(subscribe, databaseVersionStatus);
}
