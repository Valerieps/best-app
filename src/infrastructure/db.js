import Dexie from 'dexie';
import { migrateMonthPriorityLists } from '../domain/priorityProjects';
export const DATABASE_NAME = 'best-app';
export class AppDatabase extends Dexie {
    blocks;
    sections;
    projects;
    days;
    events;
    meta;
    snapshots;
    priorities;
    reflections;
    settings;
    reminders;
    objectives;
    resources;
    habits;
    habitLogs;
    constructor(name = DATABASE_NAME) {
        super(name);
        // Each database version matches the BACKUP_SCHEMA_VERSION of the same number.
        // Only indexed fields are listed here.
        this.version(1).stores({
            blocks: 'id, sectionId, status, intendedDate, projectId',
            sections: 'id, day, projectId',
            projects: 'id, status',
            days: 'day',
            events: 'id, at, day, type, entityId',
            meta: 'key',
            snapshots: 'id, createdAt',
        });
        // 1b: day priorities, and deadlines become searchable.
        this.version(2).stores({
            blocks: 'id, sectionId, status, intendedDate, projectId, deadline',
            priorities: 'id',
        });
        // Section 2: weekly reflections and user settings.
        this.version(3).stores({
            reflections: 'id',
            settings: 'id',
        });
        // Section 3: reminders that come back inside the app.
        this.version(4).stores({
            reminders: 'id, status, dueAt',
        });
        // Sections 4 and 6: objectives, their resources, habits and their logs.
        this.version(5).stores({
            objectives: 'id, status',
            resources: 'id, ownerId',
            habits: 'id, status',
            habitLogs: 'id, habitId, day',
        });
        // Section 2: the priority projects move from the month to the week (ADR-035).
        this.version(6)
            .stores({ priorities: 'id' })
            .upgrade(async (tx) => {
            const table = tx.table('priorities');
            const rows = await table.toArray();
            const migrated = migrateMonthPriorityLists(rows);
            await table.clear();
            await table.bulkPut(migrated);
        });
    }
}
