import type { Reader } from '../application/ports';
import type { DayKey } from '../domain/day';
import type { Block, Section, TaskStatus } from '../domain/entities';
import type { DomainEvent } from '../domain/events';
import type { AppDatabase } from './db';

export class DexieReader implements Reader {
  constructor(private readonly db: AppDatabase) {}

  sectionsOfDay(day: DayKey) {
    return this.db.sections.where('day').equals(day).toArray();
  }

  async sectionsByIds(ids: string[]) {
    if (ids.length === 0) return [];
    const sections = await this.db.sections.bulkGet(ids);
    return sections.filter((section) => section !== undefined);
  }

  sectionsNeedingTriage() {
    return this.db.sections
      .filter(
        (section) =>
          section.notesDestination === 'pending' ||
          (section.projectId === null && section.whiteboardDecision === 'pending'),
      )
      .toArray();
  }

  wikiSections() {
    return this.db.sections.filter((section) => section.notesDestination === 'wiki').toArray();
  }

  blocksInSections(sectionIds: string[]): Promise<Block[]> {
    if (sectionIds.length === 0) return Promise.resolve([]);
    return this.db.blocks.where('sectionId').anyOf(sectionIds).toArray();
  }

  tasksIntendedFor(day: DayKey) {
    return this.db.blocks.where('intendedDate').equals(day).toArray();
  }

  tasksWithStatus(status: TaskStatus) {
    return this.db.blocks.where('status').equals(status).toArray();
  }

  projects() {
    return this.db.projects.toArray();
  }

  async blocksByIds(ids: string[]) {
    if (ids.length === 0) return [];
    const blocks = await this.db.blocks.bulkGet(ids);
    return blocks.filter((block) => block !== undefined);
  }

  tasksWithDeadline(day: DayKey) {
    return this.db.blocks.where('deadline').equals(day).toArray();
  }

  priorityList(id: string) {
    return this.db.priorities.get(id);
  }

  sectionsWithStatus(decision: Section['whiteboardDecision']) {
    return this.db.sections.filter((section) => section.whiteboardDecision === decision).toArray();
  }

  sectionsWithNotesDestination(destination: Section['notesDestination']) {
    return this.db.sections.filter((section) => section.notesDestination === destination).toArray();
  }

  async tasksAwaitingReflection() {
    const active = await this.db.blocks.where('status').equals('active').toArray();
    return active.filter((task) => task.awaitingReflection === true);
  }

  eventsOfEntities(ids: string[]): Promise<DomainEvent[]> {
    if (ids.length === 0) return Promise.resolve([]);
    return this.db.events.where('entityId').anyOf(ids).toArray();
  }

  eventsBetween(startDay: DayKey, endDay: DayKey) {
    return this.db.events.where('day').between(startDay, endDay, true, true).toArray();
  }

  reflection(id: string) {
    return this.db.reflections.get(id);
  }

  reflections() {
    return this.db.reflections.toArray();
  }

  settings() {
    return this.db.settings.get('main');
  }

  blocksOfProject(projectId: string) {
    return this.db.blocks.where('projectId').equals(projectId).toArray();
  }

  sectionsOfProject(projectId: string) {
    return this.db.sections.where('projectId').equals(projectId).toArray();
  }

  pendingReminders() {
    return this.db.reminders.where('status').equals('pending').toArray();
  }

  dayRecord(day: DayKey) {
    return this.db.days.get(day);
  }

  objectives() {
    return this.db.objectives.toArray();
  }

  resourcesOf(ownerId: string) {
    return this.db.resources.where('ownerId').equals(ownerId).toArray();
  }

  habits() {
    return this.db.habits.toArray();
  }

  habitLogsBetween(startDay: DayKey, endDay: DayKey) {
    return this.db.habitLogs.where('day').between(startDay, endDay, true, true).toArray();
  }

  priorityListsBetween(fromId: string, toId: string) {
    return this.db.priorities.where('id').between(fromId, toId, true, true).toArray();
  }

  people() {
    return this.db.people.toArray();
  }

  blocksWithMentions() {
    return this.db.blocks.filter((block) => block.text.includes('@')).toArray();
  }
}
