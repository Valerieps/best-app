import type { AppContext } from '../application/ports';
import { systemClock, randomIds } from '../infrastructure/browser';
import { AppDatabase } from '../infrastructure/db';
import { DexieStore } from '../infrastructure/dexieStore';

/** Single database and context for the running app. Tests build their own. */
export const db = new AppDatabase();

export const appContext: AppContext = {
  store: new DexieStore(db),
  clock: systemClock,
  ids: randomIds,
};
