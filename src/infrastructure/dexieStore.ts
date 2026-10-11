import type { Table } from 'dexie';
import type { Repository, Store, StoreTransaction } from '../application/ports';
import type { AppDatabase } from './db';

function repository<T>(table: Table<T, string>): Repository<T> {
  return {
    get: (key) => table.get(key),
    put: async (entity) => {
      await table.put(entity);
    },
  };
}

export class DexieStore implements Store {
  constructor(private readonly db: AppDatabase) {}

  transaction<T>(work: (tx: StoreTransaction) => Promise<T>): Promise<T> {
    const db = this.db;
    return db.transaction('rw', [db.blocks, db.sections, db.projects, db.days, db.events], () =>
      work({
        blocks: repository(db.blocks),
        sections: repository(db.sections),
        projects: repository(db.projects),
        days: repository(db.days),
        appendEvent: async (event) => {
          // `add` (not `put`) so an existing event can never be overwritten.
          await db.events.add(event);
        },
      }),
    );
  }
}
