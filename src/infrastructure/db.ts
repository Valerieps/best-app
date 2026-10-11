import Dexie, { type Table } from 'dexie';
import type { BackupTables } from '../application/backup';
import type { Block, DayRecord, Project, Section } from '../domain/entities';
import type { DomainEvent } from '../domain/events';

/** App settings and bookkeeping that never go into a backup (e.g. file handles). */
export interface MetaEntry {
  key: string;
  value: unknown;
}

/** Copy of all user data taken right before an import, so the import can be undone. */
export interface Snapshot {
  id: string;
  createdAt: string;
  tables: BackupTables;
}

export const DATABASE_NAME = 'best-app';

export class AppDatabase extends Dexie {
  blocks!: Table<Block, string>;
  sections!: Table<Section, string>;
  projects!: Table<Project, string>;
  days!: Table<DayRecord, string>;
  events!: Table<DomainEvent, string>;
  meta!: Table<MetaEntry, string>;
  snapshots!: Table<Snapshot, string>;

  constructor(name = DATABASE_NAME) {
    super(name);
    // Version 1 matches BACKUP_SCHEMA_VERSION 1. Only indexed fields are listed here.
    this.version(1).stores({
      blocks: 'id, sectionId, status, intendedDate, projectId',
      sections: 'id, day, projectId',
      projects: 'id, status',
      days: 'day',
      events: 'id, at, day, type, entityId',
      meta: 'key',
      snapshots: 'id, createdAt',
    });
  }
}
