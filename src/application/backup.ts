import type {
  Block,
  DayRecord,
  Habit,
  HabitLog,
  Objective,
  PriorityList,
  Project,
  Reflection,
  Reminder,
  Resource,
  Section,
  Settings,
} from '../domain/entities';
import type { DomainEvent, EntityType, EventType } from '../domain/events';
import { migrateMonthPriorityLists } from '../domain/priorityProjects';

/**
 * Backup file format. A backup holds every user table; importing one replaces all data.
 * Bump BACKUP_SCHEMA_VERSION together with the database version, and teach
 * `parseBackup` to upgrade older files.
 */

export const BACKUP_FORMAT = 'best-app-backup';
export const BACKUP_SCHEMA_VERSION = 6;

export interface BackupTables {
  blocks: Block[];
  sections: Section[];
  projects: Project[];
  days: DayRecord[];
  events: DomainEvent[];
  /** Added in version 2 (1b). */
  priorities: PriorityList[];
  /** Added in version 3 (section 2). */
  reflections: Reflection[];
  settings: Settings[];
  /** Added in version 4 (section 3). */
  reminders: Reminder[];
  /** Added in version 5 (sections 4 and 6). */
  objectives: Objective[];
  resources: Resource[];
  habits: Habit[];
  habitLogs: HabitLog[];
}

export type BackupTableName = keyof BackupTables;

export const BACKUP_TABLES: readonly BackupTableName[] = [
  'blocks',
  'sections',
  'projects',
  'days',
  'events',
  'priorities',
  'reflections',
  'settings',
  'reminders',
  'objectives',
  'resources',
  'habits',
  'habitLogs',
];

/** Primary key field of each table. */
export const TABLE_KEYS: Record<BackupTableName, string> = {
  blocks: 'id',
  sections: 'id',
  projects: 'id',
  days: 'day',
  events: 'id',
  priorities: 'id',
  reflections: 'id',
  settings: 'id',
  reminders: 'id',
  objectives: 'id',
  resources: 'id',
  habits: 'id',
  habitLogs: 'id',
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

/**
 * Brings the tables of an older backup to the current version. Each version only adds
 * tables or optional fields, so older backups stay importable.
 */
function upgradeTables(tables: Record<string, unknown>, version: number): Record<string, unknown> {
  const upgraded = { ...tables };
  if (version < 2) upgraded.priorities = []; // 1b added day priorities.
  if (version < 3) {
    // Section 2 added weekly reflections and settings.
    upgraded.reflections = [];
    upgraded.settings = [];
  }
  if (version < 4) upgraded.reminders = []; // Section 3 added reminders.
  if (version < 5) {
    // Sections 4 and 6 added objectives, resources and habits.
    for (const name of ['objectives', 'resources', 'habits', 'habitLogs']) upgraded[name] = [];
  }
  // Section 2 moved the priority projects from the month to the week (ADR-035).
  if (version < 6 && Array.isArray(upgraded.priorities)) upgraded.priorities = migrateMonthPriorityLists(upgraded.priorities);
  return upgraded;
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

  const tables = upgradeTables(value.tables, version);
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
      schemaVersion: BACKUP_SCHEMA_VERSION,
      exportedAt: value.exportedAt,
      tables: tables as unknown as BackupTables,
    },
  };
}

export function emptyTables(): BackupTables {
  return {
    blocks: [],
    sections: [],
    projects: [],
    days: [],
    events: [],
    priorities: [],
    reflections: [],
    settings: [],
    reminders: [],
    objectives: [],
    resources: [],
    habits: [],
    habitLogs: [],
  };
}

export function hasAnyData(tables: BackupTables): boolean {
  return BACKUP_TABLES.some((name) => tables[name].length > 0);
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

/** Events that record a row being removed from its table, as opposed to changed. */
const DELETION_EVENTS: ReadonlySet<EventType> = new Set<EventType>(['block.deleted', 'resource.removed']);

const ENTITY_OF: Record<'blocks' | 'sections' | 'projects' | 'days', EntityType> = {
  blocks: 'block',
  sections: 'section',
  projects: 'project',
  days: 'day',
};

function deletionKey(entityType: EntityType, id: string): string {
  return `${entityType}:${id}`;
}

/** Rows the history says were deleted on purpose, keyed by `deletionKey`. */
function deletedRows(events: DomainEvent[]): Set<string> {
  return new Set(
    events.filter((event) => DELETION_EVENTS.has(event.type)).map((event) => deletionKey(event.entityType, event.entityId)),
  );
}

function tableLoss<T extends { updatedAt: string }>(
  name: keyof typeof ENTITY_OF,
  current: T[],
  incoming: T[],
  deletedInIncoming: Set<string>,
): TableLoss {
  const incomingByKey = new Map(incoming.map((row) => [keyOf(name, row), row]));
  let removed = 0;
  let reverted = 0;
  for (const row of current) {
    const key = keyOf(name, row);
    const match = incomingByKey.get(key);
    // A row the incoming side deleted on purpose is not lost: its deletion is newer than the row.
    if (!match) {
      if (!deletedInIncoming.has(deletionKey(ENTITY_OF[name], key))) removed++;
    } else if (row.updatedAt > match.updatedAt) reverted++;
  }
  return { removed, reverted };
}

/** What an import would destroy, so the user can be warned before confirming. */
export function computeImportLoss(current: BackupTables, incoming: BackupTables): ImportLoss {
  const incomingEvents = new Set(incoming.events.map((event) => event.id));
  const deleted = deletedRows(incoming.events);
  const loss = {
    blocks: tableLoss('blocks', current.blocks, incoming.blocks, deleted),
    sections: tableLoss('sections', current.sections, incoming.sections, deleted),
    projects: tableLoss('projects', current.projects, incoming.projects, deleted),
    days: tableLoss('days', current.days, incoming.days, deleted),
    missingEvents: current.events.filter((event) => !incomingEvents.has(event.id)).length,
  };
  const hasLoss =
    loss.missingEvents > 0 ||
    [loss.blocks, loss.sections, loss.projects, loss.days].some((t) => t.removed > 0 || t.reverted > 0);
  return { ...loss, hasLoss };
}
