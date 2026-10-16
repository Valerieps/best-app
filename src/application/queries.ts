import {
  findDuplicateProjects,
  findWhiteboardGroups,
  type DuplicateGroup,
  type WhiteboardGroup,
} from '../domain/assistants';
import { assistantCards, oldestDay, type AssistantCard } from '../domain/cleanupStatus';
import { planningGroup } from '../domain/checkoutSteps';
import { addDays, fromDayKey, toDayKey, type DayKey } from '../domain/day';
import { buildDayNote, type DayNoteSection } from '../domain/dayNote';
import type {
  Block,
  DayRecord,
  Habit,
  Objective,
  Person,
  Project,
  ProjectListGroup,
  Reminder,
  Resource,
  Section,
  WarmupItem,
} from '../domain/entities';
import { habitStats, isExpectedOn, type HabitStats } from '../domain/habits';
import { daysBetween as daysInRange, monthKey, monthRange, type MonthKey } from '../domain/month';
import { dayStage, dueReminders, type DayStage } from '../domain/dayFlow';
import { weekOf } from '../domain/week';
import { comparePositions } from '../domain/position';
import { buildDayPriorities, dayPriorityListId, type DayPriority } from '../domain/priorities';
import { FOCUS_LIST_ID, focusProjectIds, hasFreeSlot } from '../domain/focusProjects';
import { activityByDay, lastActivityDay, recentlyFinished, stalledDays, type ActivityByDay } from '../domain/projectActivity';
import { isDaySection, isStuckTask } from '../domain/projectPage';
import { buildPeopleOverview, buildPersonPage, type PeopleOverview, type PersonPage } from '../domain/people';
import { buildDayTriage, findPendingDays, isTriagePending, type DayTriage } from '../domain/triage';
import type { Reader } from './ports';

/**
 * Read models for the screens. Each one loads what it needs through the Reader and builds the
 * view with pure domain functions. Reads are sequential so Dexie's live queries can track them.
 */

export interface DayNoteView {
  day: DayKey;
  entries: DayNoteSection[];
  /** Every section a shown block belongs to, including the origin of carried tasks. */
  sectionsById: Map<string, Section>;
  projects: Project[];
  /** Order of the note's parts, when it was changed (`orderDayParts`). */
  sectionOrder?: string[];
}

/** Sections of a day's note: the section behind a project page belongs to no day. */
async function daySections(reader: Reader, day: DayKey): Promise<Section[]> {
  return (await reader.sectionsOfDay(day)).filter(isDaySection);
}

/** Days of the month with at least one line written, for the "Rituais" calendar. */
export async function loadDaysWithNotes(reader: Reader, month: MonthKey): Promise<DayKey[]> {
  const { start, end } = monthRange(month);
  const days: DayKey[] = [];
  for (const day of daysInRange(start, end)) {
    const sections = await daySections(reader, day);
    if (sections.length > 0 && (await reader.blocksInSections(sections.map((section) => section.id))).length > 0) {
      days.push(day);
    }
  }
  return days;
}

export async function loadDayNote(reader: Reader, day: DayKey): Promise<DayNoteView> {
  const sections = await daySections(reader, day);
  const blocks = await reader.blocksInSections(sections.map((section) => section.id));
  const intended = await reader.tasksIntendedFor(day);
  const originIds = intended.map((task) => task.sectionId).filter((id) => !sections.some((s) => s.id === id));
  const origins = await reader.sectionsByIds(originIds);
  const projects = await reader.projects();
  const sectionOrder = (await reader.dayRecord(day))?.sectionOrder;
  return {
    day,
    entries: buildDayNote({ day, sections, blocks, intended }),
    sectionsById: new Map([...sections, ...origins].map((section) => [section.id, section])),
    projects,
    sectionOrder,
  };
}

export async function loadDayTriage(reader: Reader, day: DayKey, today: DayKey): Promise<DayTriage> {
  const sections = await daySections(reader, day);
  const sectionIds = new Set(sections.map((section) => section.id));
  const blocks = await reader.blocksInSections([...sectionIds]);
  const intended = await reader.tasksIntendedFor(day);
  const carried = intended.filter((task) => !sectionIds.has(task.sectionId));
  const projects = await reader.projects();
  const activeDays = (await reader.settings())?.activeDays;
  const sectionOrder = (await reader.dayRecord(day))?.sectionOrder;
  return buildDayTriage({ day, today, sections, blocks, carried, projects, activeDays, sectionOrder });
}

/** Past days with something left to triage, oldest first. */
export async function loadPendingDays(reader: Reader, today: DayKey): Promise<DayKey[]> {
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

export async function loadPendingTriages(reader: Reader, today: DayKey): Promise<DayTriage[]> {
  const triages: DayTriage[] = [];
  for (const day of await loadPendingDays(reader, today)) {
    const triage = await loadDayTriage(reader, day, today);
    if (isTriagePending(triage)) triages.push(triage);
  }
  return triages;
}

export interface TaskListItem {
  task: Block;
  origin: Section | null;
  project: Project | null;
}

function byIntendedDateThenCreation(a: Block, b: Block): number {
  const dateA = a.intendedDate ?? '9999-12-31';
  const dateB = b.intendedDate ?? '9999-12-31';
  if (dateA !== dateB) return dateA < dateB ? -1 : 1;
  return a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0;
}

async function withOrigins(reader: Reader, tasks: Block[]): Promise<TaskListItem[]> {
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

/** Active tasks that are mine to do: what a person owes me stays out (spec/pessoas.md). */
async function myActiveTasks(reader: Reader): Promise<Block[]> {
  return (await reader.tasksWithStatus('active')).filter((task) => !task.waiting);
}

export async function loadActiveTasks(reader: Reader): Promise<TaskListItem[]> {
  const tasks = await myActiveTasks(reader);
  return withOrigins(reader, tasks.sort(byIntendedDateThenCreation));
}

/** The finished tasks, the last finished first, for "Mostrar concluídas" in the task list. */
export async function loadFinishedTasks(reader: Reader): Promise<TaskListItem[]> {
  const tasks = await reader.tasksWithStatus('done');
  return withOrigins(
    reader,
    tasks.sort((a, b) => ((a.closedAt ?? '') < (b.closedAt ?? '') ? 1 : -1)),
  );
}

/** The notes of one section whose day is closed. */
export interface SectionNotes {
  section: Section;
  notes: Block[];
  project: Project | null;
}

/**
 * The notes kept when their day closed, one entry per section, newest first. There is no wiki
 * any more (ADR-050): a project page shows the entries of its sections.
 */
export async function loadSectionNotes(reader: Reader): Promise<SectionNotes[]> {
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

export interface PlanningView {
  target: DayKey;
  /** Tasks already in the target day's note. */
  planned: TaskListItem[];
  /** Tasks scheduled for the next few days after the target (`PLANNING_HORIZON_DAYS`). */
  soon: TaskListItem[];
  /** Other active tasks: without a date, or with a date already past. */
  others: TaskListItem[];
}

/**
 * The planning step of the checkout: active tasks with a date, split into the target day's note,
 * the next few days, and the ones whose date already passed. Tasks without a date stay out. The
 * tasks of the projects in focus come first in each group, in the order of the projects
 * (spec/prioridades.md, "Projetos em foco").
 */
export async function loadPlanning(reader: Reader, target: DayKey): Promise<PlanningView> {
  const items = await loadActiveTasks(reader);
  const focusIds = await loadFocusProjectIds(reader, await reader.projects());
  const rank = (item: TaskListItem) => {
    const index = item.task.projectId ? focusIds.indexOf(item.task.projectId) : -1;
    return index === -1 ? focusIds.length : index;
  };
  // A stable sort keeps the usual order inside each project.
  const focusFirst = (list: TaskListItem[]) => list.map((item, index) => ({ item, index })).sort((a, b) => rank(a.item) - rank(b.item) || a.index - b.index).map(({ item }) => item);
  return {
    target,
    planned: focusFirst(items.filter((item) => planningGroup(item.task.intendedDate, target) === 'target')),
    soon: focusFirst(items.filter((item) => planningGroup(item.task.intendedDate, target) === 'soon')),
    others: focusFirst(items.filter((item) => planningGroup(item.task.intendedDate, target) === 'other')),
  };
}

/** The day's priorities: chosen by hand plus tasks whose deadline is the day (1b). */
export async function loadDayPriorities(reader: Reader, day: DayKey): Promise<DayPriority[]> {
  const list = await reader.priorityList(dayPriorityListId(day));
  const chosen = await reader.blocksByIds(list?.itemIds ?? []);
  const deadline = await reader.tasksWithDeadline(day);
  return buildDayPriorities(list?.itemIds ?? [], chosen, deadline.sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1)));
}

export interface CleanupView {
  whiteboards: WhiteboardGroup[];
  duplicates: DuplicateGroup[];
}

/** What the cleanup assistants of 1b have to show ("Assistentes"). */
export async function loadCleanup(reader: Reader): Promise<CleanupView> {
  const sections = await reader.sectionsWithStatus('leftUnlinked');
  const projects = await reader.projects();
  const blocks = await reader.blocksInSections(sections.map((section) => section.id));
  const texts = new Map<string, string>();
  for (const block of blocks) texts.set(block.sectionId, [texts.get(block.sectionId) ?? '', block.text].join('\n'));
  return {
    whiteboards: findWhiteboardGroups(sections, projects, texts),
    duplicates: findDuplicateProjects(projects),
  };
}

export interface CleanupDashboard extends CleanupView {
  pendingDays: DayKey[];
  /** One card per assistant, most urgent first. */
  cards: AssistantCard[];
}

/** The "Assistentes" grid of the "Rituais" screen: each assistant's findings and color. */
export async function loadCleanupDashboard(reader: Reader, today: DayKey): Promise<CleanupDashboard> {
  const cleanup = await loadCleanup(reader);
  const pendingDays = await loadPendingDays(reader, today);
  const settings = await reader.settings();
  const findings = {
    pendingDays: { count: pendingDays.length, oldest: oldestDay(pendingDays) },
    whiteboards: {
      count: cleanup.whiteboards.length,
      oldest: oldestDay(cleanup.whiteboards.flatMap((group) => group.sections.map((section) => section.day))),
    },
    // A repeat starts waiting when the second project of the group was created.
    duplicates: {
      count: cleanup.duplicates.length,
      oldest: oldestDay(cleanup.duplicates.map((group) => group.projects[1] && toDayKey(new Date(group.projects[1].createdAt)))),
    },
  };
  return { ...cleanup, pendingDays, cards: assistantCards(findings, today, settings?.cleanupAgeLimits) };
}

export interface MenuCounts {
  projects: number;
  active: number;
  /** Active people. */
  people: number;
}

export async function loadMenuCounts(reader: Reader): Promise<MenuCounts> {
  const active = (await myActiveTasks(reader)).length;
  const projects = (await reader.projects()).filter((project) => project.status === 'active').length;
  const people = (await reader.people()).filter((person) => person.status === 'active').length;
  return { projects, active, people };
}

/** The projects in focus, active ones only, in the order chosen. */
export async function loadFocusProjectIds(reader: Reader, projects: readonly Project[]): Promise<string[]> {
  const [list] = await reader.priorityListsBetween(FOCUS_LIST_ID, FOCUS_LIST_ID);
  return focusProjectIds(list, projects);
}

/** What the active tasks screen needs besides the tasks: projects to link to and the ones in focus. */
export interface TaskListContext {
  activeProjects: Project[];
  focusIds: string[];
}

export async function loadTaskListContext(reader: Reader): Promise<TaskListContext> {
  const projects = await reader.projects();
  return {
    activeProjects: projects
      .filter((project) => project.status === 'active')
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })),
    focusIds: await loadFocusProjectIds(reader, projects),
  };
}

/** What the "⋯" of a project offers, in the list and on its page. */
export interface ProjectActions {
  isPriority: boolean;
  /** Active, not in focus yet, and the list has a free slot. */
  canAddToPriorities: boolean;
}

function projectActions(project: Project, priorityIds: readonly string[]): ProjectActions {
  const isPriority = priorityIds.includes(project.id);
  return { isPriority, canAddToPriorities: project.status === 'active' && !isPriority && hasFreeSlot(priorityIds) };
}

export interface ProjectListItem extends ProjectActions {
  project: Project;
  objective: Objective | null;
  activeTasks: number;
  stuckTasks: number;
  finishedLastTwoWeeks: number;
  lastActivityDay: DayKey | null;
  /** Days without activity when the project is stalled; null otherwise. */
  stalledDays: number | null;
  activity: ActivityByDay;
}

export interface ProjectListView {
  /** The projects in focus, in the order chosen; at most 3. */
  priority: ProjectListItem[];
  /** Other active projects, most recent activity first. */
  others: ProjectListItem[];
  finished: ProjectListItem[];
  /** "4 ativos · 1 parado · 3 travadas" */
  summary: { active: number; stalled: number; stuck: number };
  /** Whether "Outros ativos" and "Finalizados" are open, from the settings. */
  open: Record<ProjectListGroup, boolean>;
  objectives: Objective[];
}

/** Defaults of the collapsible groups of the project list. */
export const PROJECT_LIST_GROUPS_OPEN: Record<ProjectListGroup, boolean> = { others: true, finished: false };

/** Activity of each project, from the events of its tasks, notes and day sections (ADR-034). */
export async function loadActivities(reader: Reader, projects: readonly Project[], today: DayKey) {
  const scopes = [];
  for (const project of projects) {
    const tasks = (await reader.blocksOfProject(project.id)).filter((block) => block.kind === 'task');
    const sections = (await reader.sectionsOfProject(project.id)).filter(isDaySection);
    // Notes are not linked to the project themselves: they belong to its sections.
    const notes = (await reader.blocksInSections(sections.map((section) => section.id))).filter(
      (block) => block.kind === 'note' && block.text.trim() !== '',
    );
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
export async function loadProjectList(reader: Reader, today: DayKey): Promise<ProjectListView> {
  const projects = (await reader.projects()).filter((project) => project.status !== 'merged');
  const objectives = await reader.objectives();
  const priorityIds = await loadFocusProjectIds(reader, projects);
  const settings = await reader.settings();
  const items = (await loadActivities(reader, projects, today)).map(({ project, tasks, activity, stalledDays }): ProjectListItem => {
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
  const byName = (a: ProjectListItem, b: ProjectListItem) => a.project.name.localeCompare(b.project.name, 'pt-BR');
  const active = items.filter((item) => item.project.status === 'active');
  const finished = items.filter((item) => item.project.status === 'finished');
  return {
    priority: priorityIds.map((id) => active.find((item) => item.project.id === id)!).filter(Boolean),
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

export interface ProjectView extends ProjectActions {
  project: Project;
  activeTasks: TaskListItem[];
  /** Most recently finished first. */
  doneTasks: TaskListItem[];
  /** Notes of the project's sections, newest first. */
  notes: SectionNotes[];
  /** Day-note sections linked to the project. */
  sections: number;
}

export async function loadProject(reader: Reader, projectId: string): Promise<ProjectView | null> {
  const projects = await reader.projects();
  const project = projects.find((candidate) => candidate.id === projectId);
  if (!project) return null;
  const tasks = (await reader.blocksOfProject(projectId)).filter((block) => block.kind === 'task');
  const sections = (await reader.sectionsOfProject(projectId)).filter(isDaySection);
  const kept = await loadSectionNotes(reader);
  const done = tasks.filter((task) => task.status === 'done').sort((a, b) => ((a.closedAt ?? '') < (b.closedAt ?? '') ? 1 : -1));
  const priorityIds = await loadFocusProjectIds(reader, projects);
  return {
    project,
    activeTasks: await withOrigins(reader, tasks.filter((task) => task.status === 'active').sort(byIntendedDateThenCreation)),
    doneTasks: await withOrigins(reader, done),
    notes: kept.filter((entry) => entry.section.projectId === projectId),
    sections: sections.length,
    ...projectActions(project, priorityIds),
  };
}

export interface DayOpeningView {
  stage: DayStage;
  warmupItems: WarmupItem[];
  record: DayRecord | null;
  /** Section 3: the dashboard shows the checkout button when the previous days are pending. */
  pendingDays: DayKey[];
  /** Section 2: the projects in focus, shown on the dashboard; they also make it show up. */
  focusProjects: Project[];
}

/** Where the day stands: "Iniciar Dia", warm up, dashboard or execution (section 3). */
export async function loadDayOpening(reader: Reader, today: DayKey): Promise<DayOpeningView> {
  const settings = await reader.settings();
  const warmupItems = settings?.warmupItems ?? [];
  const record = (await reader.dayRecord(today)) ?? null;
  const projects = await reader.projects();
  const focusProjects = (await loadFocusProjectIds(reader, projects)).map((id) => projects.find((project) => project.id === id)!);
  return {
    stage: dayStage(record ?? undefined, warmupItems),
    warmupItems,
    record,
    pendingDays: await loadPendingDays(reader, today),
    focusProjects,
  };
}

/** Pending reminders whose time has come (section 3). */
export async function loadDueReminders(reader: Reader, now: Date): Promise<Reminder[]> {
  return dueReminders(await reader.pendingReminders(), now);
}

/** Section 3: reminders ignored until the checkout of `day` become a question there. */
export async function loadReminderQuestions(reader: Reader, day: DayKey): Promise<Reminder[]> {
  const endOfDay = fromDayKey(addDays(day, 1));
  endOfDay.setHours(0, 0, 0, 0);
  return dueReminders(await reader.pendingReminders(), endOfDay);
}

export interface ObjectiveSummary {
  objective: Objective;
  projects: Project[];
  habits: Habit[];
}

/** Section 4: objectives with their projects and habits. */
export async function loadObjectives(reader: Reader): Promise<ObjectiveSummary[]> {
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

export interface ResourceView {
  resource: Resource;
  /** For resources made of a section's notes. */
  notes: Block[];
}

export interface ObjectiveView extends ObjectiveSummary {
  resources: ResourceView[];
  /** Projects not linked to any objective, offered to link here. */
  unlinkedProjects: Project[];
}

async function resourcesWithNotes(reader: Reader, ownerId: string): Promise<ResourceView[]> {
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

export async function loadObjective(reader: Reader, id: string): Promise<ObjectiveView | null> {
  const summary = (await loadObjectives(reader)).find((candidate) => candidate.objective.id === id);
  if (!summary) return null;
  const projects = await reader.projects();
  return {
    ...summary,
    resources: await resourcesWithNotes(reader, id),
    unlinkedProjects: projects.filter((project) => project.status === 'active' && !project.objectiveId),
  };
}

export async function loadProjectResources(reader: Reader, projectId: string): Promise<ResourceView[]> {
  return resourcesWithNotes(reader, projectId);
}

export interface HabitView {
  habit: Habit;
  expectedToday: boolean;
  /** Today's answer, if any. */
  doneToday: boolean | null;
  week: HabitStats;
  month: HabitStats;
}

/** Section 6: habits with today's answer and their week and month statistics. */
export async function loadHabits(reader: Reader, today: DayKey): Promise<HabitView[]> {
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

/** Blocks that may cite someone, with the sections they were written in (spec/pessoas.md). */
async function mentionContext(reader: Reader) {
  const people = await reader.people();
  const blocks = await reader.blocksWithMentions();
  const sections = await reader.sectionsByIds([...new Set(blocks.map((block) => block.sectionId))]);
  return { people, blocks, sectionsById: new Map(sections.map((section) => [section.id, section])) };
}

/** The people the `@` can suggest and recognize: everyone but the merged. */
export async function loadPeople(reader: Reader): Promise<Person[]> {
  return (await reader.people()).filter((person) => person.status !== 'merged');
}

export interface PeopleView extends PeopleOverview {
  sectionsById: Map<string, Section>;
}

/** The "Pessoas" screen. */
export async function loadPeopleView(reader: Reader, today: DayKey): Promise<PeopleView> {
  const { people, blocks, sectionsById } = await mentionContext(reader);
  return { ...buildPeopleOverview(people, blocks, today), sectionsById };
}

export interface PersonView extends PersonPage {
  sectionsById: Map<string, Section>;
  /** Other people this one can be merged into, by name. */
  others: Person[];
}

/** A person's page; null when the person does not exist, or was merged into someone else. */
export async function loadPersonView(reader: Reader, personId: string, today: DayKey): Promise<PersonView | null> {
  const { people, blocks, sectionsById } = await mentionContext(reader);
  const person = people.find((each) => each.id === personId);
  if (!person || person.status === 'merged') return null;
  const others = people
    .filter((each) => each.id !== person.id && each.status !== 'merged')
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  return { ...buildPersonPage(person, blocks, people, sectionsById, today), sectionsById, others };
}
