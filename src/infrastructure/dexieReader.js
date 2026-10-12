export class DexieReader {
    db;
    constructor(db) {
        this.db = db;
    }
    sectionsOfDay(day) {
        return this.db.sections.where('day').equals(day).toArray();
    }
    async sectionsByIds(ids) {
        if (ids.length === 0)
            return [];
        const sections = await this.db.sections.bulkGet(ids);
        return sections.filter((section) => section !== undefined);
    }
    sectionsNeedingTriage() {
        return this.db.sections
            .filter((section) => section.notesDestination === 'pending' ||
            (section.projectId === null && section.whiteboardDecision === 'pending'))
            .toArray();
    }
    wikiSections() {
        return this.db.sections.filter((section) => section.notesDestination === 'wiki').toArray();
    }
    blocksInSections(sectionIds) {
        if (sectionIds.length === 0)
            return Promise.resolve([]);
        return this.db.blocks.where('sectionId').anyOf(sectionIds).toArray();
    }
    tasksIntendedFor(day) {
        return this.db.blocks.where('intendedDate').equals(day).toArray();
    }
    tasksWithStatus(status) {
        return this.db.blocks.where('status').equals(status).toArray();
    }
    projects() {
        return this.db.projects.toArray();
    }
    async blocksByIds(ids) {
        if (ids.length === 0)
            return [];
        const blocks = await this.db.blocks.bulkGet(ids);
        return blocks.filter((block) => block !== undefined);
    }
    tasksWithDeadline(day) {
        return this.db.blocks.where('deadline').equals(day).toArray();
    }
    priorityList(id) {
        return this.db.priorities.get(id);
    }
    sectionsWithStatus(decision) {
        return this.db.sections.filter((section) => section.whiteboardDecision === decision).toArray();
    }
    sectionsWithNotesDestination(destination) {
        return this.db.sections.filter((section) => section.notesDestination === destination).toArray();
    }
    async tasksAwaitingReflection() {
        const active = await this.db.blocks.where('status').equals('active').toArray();
        return active.filter((task) => task.awaitingReflection === true);
    }
    eventsOfEntities(ids) {
        if (ids.length === 0)
            return Promise.resolve([]);
        return this.db.events.where('entityId').anyOf(ids).toArray();
    }
    eventsBetween(startDay, endDay) {
        return this.db.events.where('day').between(startDay, endDay, true, true).toArray();
    }
    reflection(id) {
        return this.db.reflections.get(id);
    }
    settings() {
        return this.db.settings.get('main');
    }
    blocksOfProject(projectId) {
        return this.db.blocks.where('projectId').equals(projectId).toArray();
    }
    sectionsOfProject(projectId) {
        return this.db.sections.where('projectId').equals(projectId).toArray();
    }
    pendingReminders() {
        return this.db.reminders.where('status').equals('pending').toArray();
    }
    dayRecord(day) {
        return this.db.days.get(day);
    }
    objectives() {
        return this.db.objectives.toArray();
    }
    resourcesOf(ownerId) {
        return this.db.resources.where('ownerId').equals(ownerId).toArray();
    }
    habits() {
        return this.db.habits.toArray();
    }
    habitLogsBetween(startDay, endDay) {
        return this.db.habitLogs.where('day').between(startDay, endDay, true, true).toArray();
    }
    priorityListsBetween(fromId, toId) {
        return this.db.priorities.where('id').between(fromId, toId, true, true).toArray();
    }
}
