import type { Block, DayRecord, Project, Section } from '../domain/entities';
import type { DomainEvent } from '../domain/events';

/**
 * Backup file format. A backup holds every user table; importing one replaces all data.
 * Bump BACKUP_SCHEMA_VERSION together with the database version, and teach
 * `parseBackup` to upgrade older files.
 */

export const BACKUP_FORMAT = 'best-app-backup';
export const BACKUP_SCHEMA_VERSION = 1;

export interface BackupTables {
  blocks: Block[];
  sections: Section[];
  projects: Project[];
  days: DayRecord[];
  events: DomainEvent[];
}

export type BackupTableName = keyof BackupTables;

export const BACKUP_TABLES: readonly BackupTableName[] = ['blocks', 'sections', 'projects', 'days', 'events'];

/** Primary key field of each table. */
export const TABLE_KEYS: Record<BackupTableName, string> = {
  blocks: 'id',
  sections: 'id',
  projects: 'id',
  days: 'day',
  events: 'id',
};

export interface BackupFile {
  format: typeof BACKUP_FORMAT;
  schemaVersion: number;
  exportedAt: string;
  tables: BackupTables;
}

export function createBackup(tables: BackupTables, exportedAt: Date): BackupFile {
  return {
    format: BACKUP_FORMAT,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: exportedAt.toISOString(),
    tables,
  };
}

export type ParseResult = { ok: true; backup: BackupFile } | { ok: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Validates a parsed JSON value. Error messages are shown to the user, in Portuguese. */
export function parseBackup(value: unknown): ParseResult {
  if (!isRecord(value) || value.format !== BACKUP_FORMAT) {
    return { ok: false, error: 'Este arquivo não é um backup do app.' };
  }
  const version = value.schemaVersion;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    return { ok: false, error: 'O backup não informa uma versão válida.' };
  }
  if (version > BACKUP_SCHEMA_VERSION) {
    return {
      ok: false,
      error: 'Este backup foi feito por uma versão mais nova do app. Atualize a página e tente de novo.',
    };
  }
  if (typeof value.exportedAt !== 'string' || Number.isNaN(Date.parse(value.exportedAt))) {
    return { ok: false, error: 'O backup não informa uma data válida.' };
  }
  if (!isRecord(value.tables)) {
    return { ok: false, error: 'O backup está incompleto.' };
  }

  const tables = value.tables;
  for (const name of BACKUP_TABLES) {
    const rows = tables[name];
    if (!Array.isArray(rows)) {
      return { ok: false, error: `O backup está incompleto: falta a tabela "${name}".` };
    }
    const key = TABLE_KEYS[name];
    const seen = new Set<string>();
    for (const row of rows) {
      if (!isRecord(row) || typeof row[key] !== 'string' || row[key] === '') {
        return { ok: false, error: `O backup tem um registro inválido na tabela "${name}".` };
      }
      if (seen.has(row[key] as string)) {
        return { ok: false, error: `O backup tem registros repetidos na tabela "${name}".` };
      }
      seen.add(row[key] as string);
    }
  }

  return {
    ok: true,
    backup: {
      format: BACKUP_FORMAT,
      schemaVersion: version,
      exportedAt: value.exportedAt,
      tables: tables as unknown as BackupTables,
    },
  };
}

/** Days without a backup before the app shows a discreet reminder. */
export const BACKUP_REMINDER_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

/** True when there is data worth protecting and the last backup is missing or old. */
export function needsBackupReminder(lastBackupAt: string | null, hasData: boolean, now: Date): boolean {
  if (!hasData) return false;
  if (!lastBackupAt) return true;
  return now.getTime() - Date.parse(lastBackupAt) >= BACKUP_REMINDER_DAYS * DAY_MS;
}

export interface TableLoss {
  /** Records that exist now and are missing from the backup. */
  removed: number;
  /** Records the backup has in an older version than the current one. */
  reverted: number;
}

export interface ImportLoss {
  blocks: TableLoss;
  sections: TableLoss;
  projects: TableLoss;
  days: TableLoss;
  /** Changes recorded now that the backup does not have. */
  missingEvents: number;
  hasLoss: boolean;
}

function keyOf(name: BackupTableName, row: object): string {
  return (row as Record<string, string>)[TABLE_KEYS[name]];
}

function tableLoss<T extends { updatedAt: string }>(
  name: BackupTableName,
  current: T[],
  incoming: T[],
): TableLoss {
  const incomingByKey = new Map(incoming.map((row) => [keyOf(name, row), row]));
  let removed = 0;
  let reverted = 0;
  for (const row of current) {
    const match = incomingByKey.get(keyOf(name, row));
    if (!match) removed++;
    else if (row.updatedAt > match.updatedAt) reverted++;
  }
  return { removed, reverted };
}

/** What an import would destroy, so the user can be warned before confirming. */
export function computeImportLoss(current: BackupTables, incoming: BackupTables): ImportLoss {
  const incomingEvents = new Set(incoming.events.map((event) => event.id));
  const loss = {
    blocks: tableLoss('blocks', current.blocks, incoming.blocks),
    sections: tableLoss('sections', current.sections, incoming.sections),
    projects: tableLoss('projects', current.projects, incoming.projects),
    days: tableLoss('days', current.days, incoming.days),
    missingEvents: current.events.filter((event) => !incomingEvents.has(event.id)).length,
  };
  const hasLoss =
    loss.missingEvents > 0 ||
    [loss.blocks, loss.sections, loss.projects, loss.days].some((t) => t.removed > 0 || t.reverted > 0);
  return { ...loss, hasLoss };
}
