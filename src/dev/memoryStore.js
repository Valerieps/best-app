import { BACKUP_TABLES, TABLE_KEYS } from '../application/backup';
/**
 * In-memory Store and Reader, used to run the real use cases off the database (e.g. to build
 * synthetic data). Mirrors DexieStore and DexieReader. Transactions are not rolled back on
 * error: a failed run is meant to be thrown away, not kept.
 */
export class MemoryStore {
    tables = new Map(BACKUP_TABLES.map((name) => [name, new Map()]));
    rows(name) {
        return [...this.tables.get(name).values()];
    }
    repository(name) {
        const table = this.tables.get(name);
        const key = TABLE_KEYS[name];
        return {
            get: async (id) => {
                const row = table.get(id);
                return row === undefined ? undefined : structuredClone(row);
            },
            put: async (entity) => {
                table.set(entity[key], structuredClone(entity));
            },
            delete: async (id) => {
                table.delete(id);
            },
        };
    }
    async transaction(work) {
        return work({
            blocks: this.repository('blocks'),
            sections: this.repository('sections'),
            projects: this.repository('projects'),
            days: this.repository('days'),
            priorities: this.repository('priorities'),
            reflections: this.repository('reflections'),
            settings: this.repository('settings'),
            reminders: this.repository('reminders'),
            objectives: this.repository('objectives'),
            resources: this.repository('resources'),
            habits: this.repository('habits'),
            habitLogs: this.repository('habitLogs'),
            blocksInSection: async (sectionId) => this.blocks().filter((block) => block.sectionId === sectionId),
            blocksOfProject: async (projectId) => this.blocks().filter((block) => block.projectId === projectId),
            sectionsOfProject: async (projectId) => this.sections().filter((section) => section.projectId === projectId),
            priorityListsBetween: (fromId, toId) => this.priorityListsBetween(fromId, toId),
            appendEvent: async (event) => {
                const events = this.tables.get('events');
                if (events.has(event.id))
                    throw new Error(`Event ${event.id} already exists`);
                events.set(event.id, structuredClone(event));
            },
        });
    }
    /** Every table, as a backup holds them. */
    snapshot() {
        return Object.fromEntries(BACKUP_TABLES.map((name) => [name, structuredClone(this.rows(name))]));
    }
    blocks() {
        return this.rows('blocks');
    }
    sections() {
        return this.rows('sections');
    }
    async sectionsOfDay(day) {
        return this.sections().filter((section) => section.day === day);
    }
    async sectionsByIds(ids) {
        return this.sections().filter((section) => ids.includes(section.id));
    }
    async sectionsNeedingTriage() {
        return this.sections().filter((section) => section.notesDestination === 'pending' || (section.projectId === null && section.whiteboardDecision === 'pending'));
    }
    async wikiSections() {
        return this.sections().filter((section) => section.notesDestination === 'wiki');
    }
    async blocksInSections(sectionIds) {
        return this.blocks().filter((block) => sectionIds.includes(block.sectionId));
    }
    async tasksIntendedFor(day) {
        return this.blocks().filter((block) => block.intendedDate === day);
    }
    async tasksWithStatus(status) {
        return this.blocks().filter((block) => block.status === status);
    }
    async projects() {
        return this.rows('projects');
    }
    async blocksByIds(ids) {
        return ids.flatMap((id) => this.blocks().filter((block) => block.id === id));
    }
    async tasksWithDeadline(day) {
        return this.blocks().filter((block) => block.deadline === day);
    }
    async priorityList(id) {
        return this.repository('priorities').get(id);
    }
    async sectionsWithStatus(decision) {
        return this.sections().filter((section) => section.whiteboardDecision === decision);
    }
    async sectionsWithNotesDestination(destination) {
        return this.sections().filter((section) => section.notesDestination === destination);
    }
    async tasksAwaitingReflection() {
        return this.blocks().filter((block) => block.status === 'active' && block.awaitingReflection === true);
    }
    async eventsOfEntities(ids) {
        const wanted = new Set(ids);
        return this.rows('events').filter((event) => wanted.has(event.entityId));
    }
    async eventsBetween(startDay, endDay) {
        return this.rows('events').filter((event) => event.day >= startDay && event.day <= endDay);
    }
    async reflection(id) {
        return this.repository('reflections').get(id);
    }
    async settings() {
        return this.repository('settings').get('main');
    }
    async blocksOfProject(projectId) {
        return this.blocks().filter((block) => block.projectId === projectId);
    }
    async sectionsOfProject(projectId) {
        return this.sections().filter((section) => section.projectId === projectId);
    }
    async pendingReminders() {
        return this.rows('reminders').filter((reminder) => reminder.status === 'pending');
    }
    async dayRecord(day) {
        return this.repository('days').get(day);
    }
    async objectives() {
        return this.rows('objectives');
    }
    async resourcesOf(ownerId) {
        return this.rows('resources').filter((resource) => resource.ownerId === ownerId);
    }
    async habits() {
        return this.rows('habits');
    }
    async habitLogsBetween(startDay, endDay) {
        return this.rows('habitLogs').filter((log) => log.day >= startDay && log.day <= endDay);
    }
    async priorityListsBetween(fromId, toId) {
        return structuredClone(this.rows('priorities').filter((list) => list.id >= fromId && list.id <= toId));
    }
}
