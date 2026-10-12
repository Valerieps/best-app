import { findDuplicateProjects, findWhiteboardGroups, } from '../domain/assistants';
import { assistantCards } from '../domain/cleanupStatus';
import { addDays, fromDayKey } from '../domain/day';
import { buildDayNote } from '../domain/dayNote';
import { habitStats, isExpectedOn } from '../domain/habits';
import { monthKey, monthRange, shiftMonth } from '../domain/month';
import { monthlyMetrics } from '../domain/monthMetrics';
import { dayStage, dueReminders } from '../domain/dayFlow';
import { weeklyMetrics } from '../domain/metrics';
import { dueReflectionWeek } from '../domain/reflectionSchedule';
import { weekKey, weekOf } from '../domain/week';
import { comparePositions } from '../domain/position';
import { buildDayPriorities, dayPriorityListId } from '../domain/priorities';
import { hasFreeSlot, listInEffect, nextWeek, priorityProjectIds, priorityProjectsRange } from '../domain/priorityProjects';
import { activityByDay, lastActivityDay, recentlyFinished, stalledDays } from '../domain/projectActivity';
import { isDaySection, isStuckTask } from '../domain/projectPage';
import { buildDayTriage, findPendingDays, isTriagePending } from '../domain/triage';
/** Sections of a day's note: the section behind a project page belongs to no day. */
async function daySections(reader, day) {
    return (await reader.sectionsOfDay(day)).filter(isDaySection);
}
export async function loadDayNote(reader, day) {
    const sections = await daySections(reader, day);
    const blocks = await reader.blocksInSections(sections.map((section) => section.id));
    const intended = await reader.tasksIntendedFor(day);
    const originIds = intended.map((task) => task.sectionId).filter((id) => !sections.some((s) => s.id === id));
    const origins = await reader.sectionsByIds(originIds);
    const projects = await reader.projects();
    return {
        day,
        entries: buildDayNote({ day, sections, blocks, intended }),
        sectionsById: new Map([...sections, ...origins].map((section) => [section.id, section])),
        projects,
    };
}
export async function loadDayTriage(reader, day, today) {
    const sections = await daySections(reader, day);
    const sectionIds = new Set(sections.map((section) => section.id));
    const blocks = await reader.blocksInSections([...sectionIds]);
    const intended = await reader.tasksIntendedFor(day);
    const carried = intended.filter((task) => !sectionIds.has(task.sectionId));
    const projects = await reader.projects();
    const activeDays = (await reader.settings())?.activeDays;
    return buildDayTriage({ day, today, sections, blocks, carried, projects, activeDays });
}
/** Past days with something left to triage, oldest first. */
export async function loadPendingDays(reader, today) {
    const sections = (await reader.sectionsNeedingTriage()).filter(isDaySection);
    const blocks = await reader.blocksInSections(sections.map((section) => section.id));
    const activeTasks = await reader.tasksWithStatus('active');
    const origins = await reader.sectionsByIds([...new Set(activeTasks.map((task) => task.sectionId))]);
    return findPendingDays({
        today,
        sections,
        blocks,
        activeTasks,
        // A task written on a project page has no origin day: only its intended date counts.
        originDays: new Map(origins.filter(isDaySection).map((section) => [section.id, section.day])),
    });
}
export async function loadPendingTriages(reader, today) {
    const triages = [];
    for (const day of await loadPendingDays(reader, today)) {
        const triage = await loadDayTriage(reader, day, today);
        if (isTriagePending(triage))
            triages.push(triage);
    }
    return triages;
}
function byIntendedDateThenCreation(a, b) {
    const dateA = a.intendedDate ?? '9999-12-31';
    const dateB = b.intendedDate ?? '9999-12-31';
    if (dateA !== dateB)
        return dateA < dateB ? -1 : 1;
    return a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0;
}
async function withOrigins(reader, tasks) {
    const origins = await reader.sectionsByIds([...new Set(tasks.map((task) => task.sectionId))]);
    const projects = await reader.projects();
    const originById = new Map(origins.map((section) => [section.id, section]));
    const projectById = new Map(projects.map((project) => [project.id, project]));
    return tasks.map((task) => ({
        task,
        origin: originById.get(task.sectionId) ?? null,
        project: task.projectId ? (projectById.get(task.projectId) ?? null) : null,
    }));
}
export async function loadActiveTasks(reader) {
    const tasks = await reader.tasksWithStatus('active');
    return withOrigins(reader, tasks.sort(byIntendedDateThenCreation));
}
export async function loadArchivedTasks(reader) {
    const tasks = await reader.tasksWithStatus('archived');
    return withOrigins(reader, tasks.sort((a, b) => ((a.closedAt ?? '') < (b.closedAt ?? '') ? 1 : -1)));
}
/** The personal wiki: each entry gathers the notes of one section, newest first. */
export async function loadWiki(reader) {
    const sections = await reader.wikiSections();
    const blocks = await reader.blocksInSections(sections.map((section) => section.id));
    const projects = await reader.projects();
    const projectById = new Map(projects.map((project) => [project.id, project]));
    return sections
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
        .map((section) => ({
        section,
        notes: blocks
            .filter((block) => block.sectionId === section.id && block.kind === 'note' && block.text.trim() !== '')
            .sort(comparePositions),
        project: section.projectId ? (projectById.get(section.projectId) ?? null) : null,
    }))
        .filter((entry) => entry.notes.length > 0);
}
/** Step 2 of the checkout: active tasks, split by whether they are in the target day's note. */
export async function loadPlanning(reader, target) {
    const items = await loadActiveTasks(reader);
    return {
        target,
        planned: items.filter((item) => item.task.intendedDate === target),
        others: items.filter((item) => item.task.intendedDate !== target),
    };
}
/** The day's priorities: chosen by hand plus tasks whose deadline is the day (1b). */
export async function loadDayPriorities(reader, day) {
    const list = await reader.priorityList(dayPriorityListId(day));
    const chosen = await reader.blocksByIds(list?.itemIds ?? []);
    const deadline = await reader.tasksWithDeadline(day);
    return buildDayPriorities(list?.itemIds ?? [], chosen, deadline.sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1)));
}
/** What the cleanup assistants of 1b have to show ("Colocar ordem na casa"). */
export async function loadCleanup(reader) {
    const sections = await reader.sectionsWithStatus('leftUnlinked');
    const projects = await reader.projects();
    return {
        whiteboards: findWhiteboardGroups(sections, projects),
        duplicates: findDuplicateProjects(projects),
    };
}
/** The "Colocar ordem na casa" dashboard: each assistant's findings and color. */
export async function loadCleanupDashboard(reader, today) {
    const cleanup = await loadCleanup(reader);
    const pendingDays = await loadPendingDays(reader, today);
    const settings = await reader.settings();
    const counts = {
        pendingDays: pendingDays.length,
        whiteboards: cleanup.whiteboards.length,
        duplicates: cleanup.duplicates.length,
    };
    return { ...cleanup, pendingDays, cards: assistantCards(counts, settings?.cleanupLimits) };
}
export async function loadMenuCounts(reader) {
    const active = (await reader.tasksWithStatus('active')).length;
    const archived = (await reader.tasksWithStatus('archived')).length;
    const wiki = (await loadWiki(reader)).length;
    const projects = (await reader.projects()).filter((project) => project.status === 'active').length;
    return { projects, active, archived, wiki };
}
/** Everything the weekly reflection of `week` shows (SPEC.md, section 2). */
export async function loadReflection(reader, week, today) {
    const reflection = (await reader.reflection(`week:${week.key}`)) ?? null;
    const tomorrow = addDays(today, 1);
    const tasks = await reader.tasksAwaitingReflection();
    const taskSections = await reader.sectionsByIds([...new Set(tasks.map((task) => task.sectionId))]);
    const sectionById = new Map(taskSections.map((section) => [section.id, section]));
    const noteSections = await reader.sectionsWithNotesDestination('weeklyReflection');
    const noteBlocks = await reader.blocksInSections(noteSections.map((section) => section.id));
    const deferred = [
        ...tasks.map((task) => ({
            type: 'task',
            task,
            section: sectionById.get(task.sectionId) ?? null,
            suggestion: { kind: 'schedule', date: tomorrow },
            attention: false,
        })),
        ...noteSections.map((section) => ({
            type: 'notes',
            section,
            noteCount: noteBlocks.filter((block) => block.sectionId === section.id && block.kind === 'note').length,
            suggestion: 'wiki',
            attention: false,
        })),
    ];
    const events = await reader.eventsBetween(week.start, week.end);
    const projects = await reader.projects();
    const following = nextWeek(week);
    return {
        week,
        reflection,
        deferred,
        archived: await loadArchivedTasks(reader),
        metrics: weeklyMetrics(events, week),
        habits: await habitsOfPeriod(reader, week.start, week.end),
        projects,
        nextWeek: following,
        nextWeekPriorityIds: await loadPriorityProjectIds(reader, following.key, projects),
    };
}
/** Habit statistics for a week, and for the month that week ends in. */
async function habitsOfPeriod(reader, start, end) {
    const month = monthRange(monthKey(end));
    const from = start < month.start ? start : month.start;
    const logs = await reader.habitLogsBetween(from, end);
    return (await reader.habits())
        .filter((habit) => habit.status === 'active')
        .map((habit) => ({ habit, week: habitStats(habit, logs, start, end), month: habitStats(habit, logs, month.start, end) }));
}
/** The week whose reflection is due by the user's schedule, if any. */
export async function loadDueReflection(reader, now) {
    const settings = await reader.settings();
    const schedule = settings?.weeklyReflection ?? null;
    if (!schedule)
        return null;
    const candidate = dueReflectionWeek(now, schedule, () => false);
    if (!candidate)
        return null;
    const reflection = await reader.reflection(`week:${candidate.key}`);
    return reflection?.closedAt ? null : candidate;
}
/** The week's priority projects in effect (they carry over from earlier weeks), active ones only. */
async function loadPriorityProjectIds(reader, week, projects) {
    const lists = await reader.priorityListsBetween(...priorityProjectsRange(week));
    return priorityProjectIds(listInEffect(lists, week), projects);
}
function projectActions(project, priorityIds) {
    const isPriority = priorityIds.includes(project.id);
    return { isPriority, canAddToPriorities: project.status === 'active' && !isPriority && hasFreeSlot(priorityIds) };
}
/** Defaults of the collapsible groups of the project list. */
export const PROJECT_LIST_GROUPS_OPEN = { others: true, finished: false };
/** Activity of each project, from the events of its tasks, notes and day sections (ADR-034). */
async function loadActivities(reader, projects, today) {
    const scopes = [];
    for (const project of projects) {
        const tasks = (await reader.blocksOfProject(project.id)).filter((block) => block.kind === 'task');
        const sections = (await reader.sectionsOfProject(project.id)).filter(isDaySection);
        // Notes are not linked to the project themselves: they belong to its sections.
        const notes = (await reader.blocksInSections(sections.map((section) => section.id))).filter((block) => block.kind === 'note' && block.text.trim() !== '');
        scopes.push({ project, tasks, sections, notes });
    }
    const events = await reader.eventsOfEntities(scopes.flatMap((scope) => [...scope.tasks, ...scope.notes, ...scope.sections].map((entity) => entity.id)));
    return scopes.map((scope) => {
        const activity = activityByDay({
            taskIds: new Set(scope.tasks.map((task) => task.id)),
            noteIds: new Set(scope.notes.map((note) => note.id)),
            sectionIds: new Set(scope.sections.map((section) => section.id)),
            events,
        });
        return { ...scope, activity, stalledDays: stalledDays(scope.project, activity, today) };
    });
}
/** The project list (section 2): where projects are followed, with their activity maps. */
export async function loadProjectList(reader, today) {
    const projects = (await reader.projects()).filter((project) => project.status !== 'merged');
    const objectives = await reader.objectives();
    const priorityIds = await loadPriorityProjectIds(reader, weekOf(today).key, projects);
    const settings = await reader.settings();
    const items = (await loadActivities(reader, projects, today)).map(({ project, tasks, activity, stalledDays }) => {
        const active = tasks.filter((task) => task.status === 'active');
        return {
            project,
            objective: objectives.find((objective) => objective.id === project.objectiveId) ?? null,
            activeTasks: active.length,
            stuckTasks: active.filter((task) => isStuckTask(task, today)).length,
            finishedLastTwoWeeks: recentlyFinished(activity, today),
            lastActivityDay: lastActivityDay(activity, today),
            stalledDays,
            activity,
            ...projectActions(project, priorityIds),
        };
    });
    const byName = (a, b) => a.project.name.localeCompare(b.project.name, 'pt-BR');
    const active = items.filter((item) => item.project.status === 'active');
    const finished = items.filter((item) => item.project.status === 'finished');
    return {
        priority: priorityIds.map((id) => active.find((item) => item.project.id === id)).filter(Boolean),
        others: active
            .filter((item) => !item.isPriority)
            .sort((a, b) => {
            const dayA = a.lastActivityDay ?? '';
            const dayB = b.lastActivityDay ?? '';
            return dayA !== dayB ? (dayA < dayB ? 1 : -1) : byName(a, b);
        }),
        finished: finished.sort((a, b) => ((a.project.finishedAt ?? '') < (b.project.finishedAt ?? '') ? 1 : -1)),
        summary: {
            active: active.length,
            stalled: active.filter((item) => item.stalledDays !== null).length,
            stuck: active.reduce((sum, item) => sum + item.stuckTasks, 0),
        },
        open: { ...PROJECT_LIST_GROUPS_OPEN, ...settings?.projectListGroups },
        objectives,
    };
}
export async function loadProject(reader, projectId, today) {
    const projects = await reader.projects();
    const project = projects.find((candidate) => candidate.id === projectId);
    if (!project)
        return null;
    const tasks = (await reader.blocksOfProject(projectId)).filter((block) => block.kind === 'task');
    const sections = (await reader.sectionsOfProject(projectId)).filter(isDaySection);
    const wiki = await loadWiki(reader);
    const done = tasks.filter((task) => task.status === 'done').sort((a, b) => ((a.closedAt ?? '') < (b.closedAt ?? '') ? 1 : -1));
    const priorityIds = await loadPriorityProjectIds(reader, weekOf(today).key, projects);
    return {
        project,
        activeTasks: await withOrigins(reader, tasks.filter((task) => task.status === 'active').sort(byIntendedDateThenCreation)),
        doneTasks: await withOrigins(reader, done),
        notes: wiki.filter((entry) => entry.section.projectId === projectId),
        sections: sections.length,
        ...projectActions(project, priorityIds),
    };
}
/** Where the day stands: "Iniciar Dia", warm up, dashboard or execution (section 3). */
export async function loadDayOpening(reader, today) {
    const settings = await reader.settings();
    const warmupItems = settings?.warmupItems ?? [];
    const record = (await reader.dayRecord(today)) ?? null;
    return {
        stage: dayStage(record ?? undefined, warmupItems),
        warmupItems,
        record,
        pendingDays: await loadPendingDays(reader, today),
    };
}
/** Pending reminders whose time has come (section 3). */
export async function loadDueReminders(reader, now) {
    return dueReminders(await reader.pendingReminders(), now);
}
/** Section 3: reminders ignored until the checkout of `day` become a question there. */
export async function loadReminderQuestions(reader, day) {
    const endOfDay = fromDayKey(addDays(day, 1));
    endOfDay.setHours(0, 0, 0, 0);
    return dueReminders(await reader.pendingReminders(), endOfDay);
}
/** Section 4: objectives with their projects and habits. */
export async function loadObjectives(reader) {
    const objectives = await reader.objectives();
    const projects = (await reader.projects()).filter((project) => project.status !== 'merged');
    const habits = await reader.habits();
    return objectives
        .sort((a, b) => a.goal.localeCompare(b.goal, 'pt-BR'))
        .map((objective) => ({
        objective,
        projects: projects.filter((project) => project.objectiveId === objective.id),
        habits: habits.filter((habit) => habit.objectiveId === objective.id && habit.status === 'active'),
    }));
}
async function resourcesWithNotes(reader, ownerId) {
    const resources = await reader.resourcesOf(ownerId);
    const blocks = await reader.blocksInSections(resources.flatMap((resource) => (resource.sectionId ? [resource.sectionId] : [])));
    return resources
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
        .map((resource) => ({
        resource,
        notes: blocks
            .filter((block) => block.sectionId === resource.sectionId && block.kind === 'note')
            .sort(comparePositions),
    }));
}
export async function loadObjective(reader, id) {
    const summary = (await loadObjectives(reader)).find((candidate) => candidate.objective.id === id);
    if (!summary)
        return null;
    const projects = await reader.projects();
    return {
        ...summary,
        resources: await resourcesWithNotes(reader, id),
        unlinkedProjects: projects.filter((project) => project.status === 'active' && !project.objectiveId),
    };
}
export async function loadProjectResources(reader, projectId) {
    return resourcesWithNotes(reader, projectId);
}
/** Section 6: habits with today's answer and their week and month statistics. */
export async function loadHabits(reader, today) {
    const habits = await reader.habits();
    const week = weekOf(today);
    const month = monthRange(monthKey(today));
    const from = week.start < month.start ? week.start : month.start;
    const logs = await reader.habitLogsBetween(from, today);
    return habits
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
        .map((habit) => {
        const todayLog = logs.find((log) => log.habitId === habit.id && log.day === today);
        return {
            habit,
            expectedToday: isExpectedOn(habit, today),
            doneToday: todayLog ? todayLog.done : null,
            week: habitStats(habit, logs, week.start, today < week.end ? today : week.end),
            month: habitStats(habit, logs, month.start, today < month.end ? today : month.end),
        };
    });
}
/** Section 4: the monthly reflection, a dashboard of objectives, projects and habits. */
export async function loadMonthlyReflection(reader, key) {
    const month = monthRange(key);
    const projects = (await reader.projects()).filter((project) => project.status !== 'merged');
    const habits = await reader.habits();
    const dayLists = await reader.priorityListsBetween(`day:${month.start}`, `day:${month.end}`);
    const priorityTasks = await reader.blocksByIds([...new Set(dayLists.flatMap((list) => list.itemIds))]);
    const weekProjectLists = await reader.priorityListsBetween(...priorityProjectsRange(weekKey(month.end)));
    return {
        month,
        reflection: (await reader.reflection(`month:${key}`)) ?? null,
        objectives: await loadObjectives(reader),
        projects,
        habits,
        metrics: monthlyMetrics({ projects, habits, dayPriorityLists: dayLists, priorityTasks, weekProjectLists }),
    };
}
/**
 * "Quando um mês termina, aparece a opção de reflexão mensal": the previous month, while its
 * reflection is not closed and something happened in it.
 */
export async function loadDueMonthlyReflection(reader, today) {
    const previous = monthRange(shiftMonth(monthKey(today), -1));
    if ((await reader.reflection(`month:${previous.key}`))?.closedAt)
        return null;
    const events = await reader.eventsBetween(previous.start, previous.end);
    return events.length > 0 ? previous : null;
}
