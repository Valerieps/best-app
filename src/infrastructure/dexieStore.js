import Dexie from 'dexie';
function repository(table) {
    return {
        get: (key) => table.get(key),
        put: async (entity) => {
            await table.put(entity);
        },
        delete: (key) => table.delete(key),
    };
}
export class DexieStore {
    db;
    onCommit;
    /** @param onCommit called after every successful transaction, e.g. to schedule a backup */
    constructor(db, onCommit = () => { }) {
        this.db = db;
        this.onCommit = onCommit;
    }
    async transaction(work) {
        const db = this.db;
        const result = await db.transaction('rw', [db.blocks, db.sections, db.projects, db.days, db.events, db.priorities, db.reflections, db.settings, db.reminders, db.objectives, db.resources, db.habits, db.habitLogs], (trans) => {
            // Tables taken from the transaction object stay bound to it, so use cases can be plain
            // async functions. Dexie.waitFor keeps the transaction open across their native awaits,
            // which would otherwise make Dexie abort with PrematureCommitError (ADR-003).
            const blocks = trans.table('blocks');
            const events = trans.table('events');
            const sections = trans.table('sections');
            const priorities = trans.table('priorities');
            return Dexie.waitFor(work({
                blocks: repository(blocks),
                sections: repository(sections),
                projects: repository(trans.table('projects')),
                days: repository(trans.table('days')),
                priorities: repository(priorities),
                reflections: repository(trans.table('reflections')),
                settings: repository(trans.table('settings')),
                reminders: repository(trans.table('reminders')),
                objectives: repository(trans.table('objectives')),
                resources: repository(trans.table('resources')),
                habits: repository(trans.table('habits')),
                habitLogs: repository(trans.table('habitLogs')),
                blocksInSection: (sectionId) => blocks.where('sectionId').equals(sectionId).toArray(),
                blocksOfProject: (projectId) => blocks.where('projectId').equals(projectId).toArray(),
                sectionsOfProject: (projectId) => sections.where('projectId').equals(projectId).toArray(),
                priorityListsBetween: (fromId, toId) => priorities.where('id').between(fromId, toId, true, true).toArray(),
                appendEvent: async (event) => {
                    // `add` (not `put`) so an existing event can never be overwritten.
                    await events.add(event);
                },
            }));
        });
        this.onCommit();
        return result;
    }
}
