import { resolveWhiteboardGroup } from '../application/assistants';
import { applyPlanning, applyTriage, closePendingDays, completeCheckout } from '../application/checkout';
import { convertSectionToProject, createBlock, createSection, linkSectionToProject, setSectionTitle, setTaskDone, } from '../application/notebook';
import { addPriorityProject } from '../application/priorityProjects';
import { createProject, setProjectFinished, setProjectIcon } from '../application/projects';
import { loadDayTriage, loadPendingTriages } from '../application/queries';
import { setDayPriority, setDeadline, setIntendedDate, setSectionDetails } from '../application/dayTools';
import { addDays, fromDayKey, toDayKey } from '../domain/day';
import { positionBetween } from '../domain/position';
import { MemoryStore } from './memoryStore';
/**
 * Plays days of use through the real use cases, with a clock that walks through the past.
 * Days are offsets from today (-3 is three days ago). Each action moves the clock a few
 * minutes, so creation order matches the order of the script.
 */
export class Simulation {
    now;
    workDays;
    store = new MemoryStore();
    ctx;
    today;
    moment;
    offset = 0;
    lastPosition = new Map();
    /**
     * @param now the real current time; actions of today never go past it
     * @param workDays offsets of the days the script plays, where "dia seguinte" lands
     */
    constructor(now, ids, workDays) {
        this.now = now;
        this.workDays = workDays;
        this.today = toDayKey(now);
        this.moment = new Date(now);
        this.ctx = { store: this.store, clock: { now: () => new Date(this.moment) }, ids };
    }
    day(offset) {
        return addDays(this.today, offset);
    }
    /** Starts the day `offset`, at 08:30 (or a little before now, for today). */
    on(offset) {
        this.offset = offset;
        const start = fromDayKey(this.day(offset));
        start.setHours(8, 30, 0, 0);
        if (offset === 0) {
            const midnight = fromDayKey(this.today);
            midnight.setHours(0, 0, 0, 0);
            const early = new Date(this.now.getTime() - 20 * 60_000);
            if (start > early)
                start.setTime(Math.max(early.getTime(), midnight.getTime()));
        }
        this.moment = start;
    }
    step() {
        this.moment = new Date(this.moment.getTime() + (this.offset === 0 ? 1 : 4) * 60_000);
        if (this.moment > this.now)
            this.moment = new Date(this.now);
    }
    async section(kind, title, participants) {
        this.step();
        const section = await createSection(this.ctx, kind);
        if (title)
            await setSectionTitle(this.ctx, section.id, title);
        if (participants)
            await setSectionDetails(this.ctx, section.id, { participants, docLink: '' });
        return section;
    }
    /** Types lines into a section; "[] " at the start makes a task, as in the editor. */
    async write(section, ...lines) {
        const blocks = [];
        for (const line of lines) {
            this.step();
            const position = positionBetween(this.lastPosition.get(section.id) ?? null, null);
            this.lastPosition.set(section.id, position);
            blocks.push(await createBlock(this.ctx, { sectionId: section.id, position }, line));
        }
        return blocks;
    }
    async project(name) {
        this.step();
        return createProject(this.ctx, name);
    }
    async projectNamed(name) {
        const project = (await this.store.projects()).find((candidate) => candidate.name === name);
        if (!project)
            throw new Error(`Project ${name} not found`);
        return project;
    }
    async link(section, project) {
        this.step();
        await linkSectionToProject(this.ctx, section.id, project.id);
    }
    async convert(section, name) {
        this.step();
        await convertSectionToProject(this.ctx, section.id, name);
        return this.projectNamed(name);
    }
    async finishProject(project) {
        this.step();
        await setProjectFinished(this.ctx, project.id, true);
    }
    async icon(project, icon) {
        this.step();
        await setProjectIcon(this.ctx, project.id, icon);
    }
    /** Takes a free slot among the week's priority projects. */
    async prioritize(project) {
        this.step();
        await addPriorityProject(this.ctx, project.id);
    }
    async done(...tasks) {
        for (const task of tasks) {
            this.step();
            await setTaskDone(this.ctx, task.id, true);
        }
    }
    async intend(task, offset) {
        this.step();
        await setIntendedDate(this.ctx, task.id, this.day(offset));
    }
    async deadline(task, offset) {
        this.step();
        await setDeadline(this.ctx, task.id, this.day(offset));
    }
    async priority(task) {
        this.step();
        await setDayPriority(this.ctx, task.id, true);
    }
    /** "Deixar como está" in the whiteboards assistant. */
    async keepWhiteboard(section) {
        this.step();
        await resolveWhiteboardGroup(this.ctx, [section.id], { kind: 'keep' });
    }
    async closePendingDays() {
        this.step();
        await closePendingDays(this.ctx, await loadPendingTriages(this.store, this.day(this.offset)));
    }
    nextWorkDay() {
        const next = this.workDays.find((offset) => offset > this.offset);
        if (next === undefined)
            throw new Error(`No work day after ${this.offset}`);
        return this.day(next);
    }
    /**
     * The day's checkout at 18:00, as "Aceitar sugestões" with some choices changed. Tasks
     * suggested for "dia seguinte" go to the next work day of the script instead.
     */
    async checkout(choices = {}) {
        const day = this.day(this.offset);
        const evening = fromDayKey(day);
        evening.setHours(18, 0, 0, 0);
        this.moment = evening;
        const next = this.nextWorkDay();
        const triage = await loadDayTriage(this.store, day, day);
        const decisions = {
            tasks: new Map(),
            notes: new Map(),
            whiteboards: new Map(),
        };
        for (const row of triage.rows) {
            if (row.type === 'task') {
                decisions.tasks.set(row.task.id, row.suggestion.kind === 'schedule' ? { kind: 'schedule', date: next } : row.suggestion);
            }
            if (row.type === 'notes')
                decisions.notes.set(row.section.id, row.suggestion);
            if (row.type === 'whiteboard')
                decisions.whiteboards.set(row.section.id, row.suggestion);
        }
        for (const item of triage.automatic) {
            if (item.type === 'notesToWiki')
                decisions.notes.set(item.section.id, 'wiki');
        }
        for (const [task, decision] of choices.tasks ?? [])
            decisions.tasks.set(task.id, decision);
        for (const [section, decision] of choices.notes ?? [])
            decisions.notes.set(section.id, decision);
        for (const [section, decision] of choices.whiteboards ?? [])
            decisions.whiteboards.set(section.id, decision);
        await applyTriage(this.ctx, day, decisions);
        this.step();
        const unplan = (choices.unplan ?? []).map((task) => ({ taskId: task.id, include: false }));
        if (unplan.length > 0)
            await applyPlanning(this.ctx, day, next, unplan);
        this.step();
        await completeCheckout(this.ctx, day);
    }
}
