import { migrateMonthPriorityLists } from '../domain/priorityProjects';
/**
 * Backup file format. A backup holds every user table; importing one replaces all data.
 * Bump BACKUP_SCHEMA_VERSION together with the database version, and teach
 * `parseBackup` to upgrade older files.
 */
export const BACKUP_FORMAT = 'best-app-backup';
export const BACKUP_SCHEMA_VERSION = 6;
export const BACKUP_TABLES = [
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
export const TABLE_KEYS = {
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
export function createBackup(tables, exportedAt) {
    return {
        format: BACKUP_FORMAT,
        schemaVersion: BACKUP_SCHEMA_VERSION,
        exportedAt: exportedAt.toISOString(),
        tables,
    };
}
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
/**
 * Brings the tables of an older backup to the current version. Each version only adds
 * tables or optional fields, so older backups stay importable.
 */
function upgradeTables(tables, version) {
    const upgraded = { ...tables };
    if (version < 2)
        upgraded.priorities = []; // 1b added day priorities.
    if (version < 3) {
        // Section 2 added weekly reflections and settings.
        upgraded.reflections = [];
        upgraded.settings = [];
    }
    if (version < 4)
        upgraded.reminders = []; // Section 3 added reminders.
    if (version < 5) {
        // Sections 4 and 6 added objectives, resources and habits.
        for (const name of ['objectives', 'resources', 'habits', 'habitLogs'])
            upgraded[name] = [];
    }
    // Section 2 moved the priority projects from the month to the week (ADR-035).
    if (version < 6 && Array.isArray(upgraded.priorities))
        upgraded.priorities = migrateMonthPriorityLists(upgraded.priorities);
    return upgraded;
}
/** Validates a parsed JSON value. Error messages are shown to the user, in Portuguese. */
export function parseBackup(value) {
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
        const seen = new Set();
        for (const row of rows) {
            if (!isRecord(row) || typeof row[key] !== 'string' || row[key] === '') {
                return { ok: false, error: `O backup tem um registro inválido na tabela "${name}".` };
            }
            if (seen.has(row[key])) {
                return { ok: false, error: `O backup tem registros repetidos na tabela "${name}".` };
            }
            seen.add(row[key]);
        }
    }
    return {
        ok: true,
        backup: {
            format: BACKUP_FORMAT,
            schemaVersion: BACKUP_SCHEMA_VERSION,
            exportedAt: value.exportedAt,
            tables: tables,
        },
    };
}
export function emptyTables() {
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
export function hasAnyData(tables) {
    return BACKUP_TABLES.some((name) => tables[name].length > 0);
}
function keyOf(name, row) {
    return row[TABLE_KEYS[name]];
}
/** Events that record a row being removed from its table, as opposed to changed. */
const DELETION_EVENTS = new Set(['block.deleted', 'resource.removed']);
const ENTITY_OF = {
    blocks: 'block',
    sections: 'section',
    projects: 'project',
    days: 'day',
};
function deletionKey(entityType, id) {
    return `${entityType}:${id}`;
}
/** Rows the history says were deleted on purpose, keyed by `deletionKey`. */
function deletedRows(events) {
    return new Set(events.filter((event) => DELETION_EVENTS.has(event.type)).map((event) => deletionKey(event.entityType, event.entityId)));
}
function tableLoss(name, current, incoming, deletedInIncoming) {
    const incomingByKey = new Map(incoming.map((row) => [keyOf(name, row), row]));
    let removed = 0;
    let reverted = 0;
    for (const row of current) {
        const key = keyOf(name, row);
        const match = incomingByKey.get(key);
        // A row the incoming side deleted on purpose is not lost: its deletion is newer than the row.
        if (!match) {
            if (!deletedInIncoming.has(deletionKey(ENTITY_OF[name], key)))
                removed++;
        }
        else if (row.updatedAt > match.updatedAt)
            reverted++;
    }
    return { removed, reverted };
}
/** What an import would destroy, so the user can be warned before confirming. */
export function computeImportLoss(current, incoming) {
    const incomingEvents = new Set(incoming.events.map((event) => event.id));
    const deleted = deletedRows(incoming.events);
    const loss = {
        blocks: tableLoss('blocks', current.blocks, incoming.blocks, deleted),
        sections: tableLoss('sections', current.sections, incoming.sections, deleted),
        projects: tableLoss('projects', current.projects, incoming.projects, deleted),
        days: tableLoss('days', current.days, incoming.days, deleted),
        missingEvents: current.events.filter((event) => !incomingEvents.has(event.id)).length,
    };
    const hasLoss = loss.missingEvents > 0 ||
        [loss.blocks, loss.sections, loss.projects, loss.days].some((t) => t.removed > 0 || t.reverted > 0);
    return { ...loss, hasLoss };
}
