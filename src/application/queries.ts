import {
  findDuplicateProjects,
  findWhiteboardGroups,
  type DuplicateGroup,
  type WhiteboardGroup,
} from '../domain/assistants';
import { addDays, fromDayKey, type DayKey } from '../domain/day';
import { buildDayNote, type DayNoteSection } from '../domain/dayNote';
import type {
  Block,
  DayRecord,
  Habit,
  Objective,
  Project,
  Reflection,
  Reminder,
  Resource,
  Section,
  WarmupItem,
} from '../domain/entities';
import { habitStats, isExpectedOn, type HabitStats } from '../domain/habits';
import { monthKey, monthRange, shiftMonth, type MonthKey, type MonthRange } from '../domain/month';
import { monthlyMetrics, type MonthlyMetrics } from '../domain/monthMetrics';
import { dayStage, dueReminders, type DayStage } from '../domain/dayFlow';
import { weeklyMetrics, type WeeklyMetrics } from '../domain/metrics';
import { dueReflectionWeek } from '../domain/reflectionSchedule';
import { weekOf, type WeekRange } from '../domain/week';
import { comparePositions } from '../domain/position';
import { buildDayPriorities, dayPriorityListId, type DayPriority } from '../domain/priorities';
import { buildDayTriage, findPendingDays, isTriagePending, type DayTriage, type TriageRow } from '../domain/triage';
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
}

export async function loadDayNote(reader: Reader, day: DayKey): Promise<DayNoteView> {
  const sections = await reader.sectionsOfDay(day);
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

export async function loadDayTriage(reader: Reader, day: DayKey, today: DayKey): Promise<DayTriage> {
  const sections = await reader.sectionsOfDay(day);
  const sectionIds = new Set(sections.map((section) => section.id));
  const blocks = await reader.blocksInSections([...sectionIds]);
  const intended = await reader.tasksIntendedFor(day);
  const carried = intended.filter((task) => !sectionIds.has(task.sectionId));
  const projects = await reader.projects();
  const activeDays = (await reader.settings())?.activeDays;
  return buildDayTriage({ day, today, sections, blocks, carried, projects, activeDays });
}

/** Past days with something left to triage, oldest first. */
export async function loadPendingDays(reader: Reader, today: DayKey): Promise<DayKey[]> {
  const sections = await reader.sectionsNeedingTriage();
  const blocks = await reader.blocksInSections(sections.map((section) => section.id));
  const activeTasks = await reader.tasksWithStatus('active');
  const origins = await reader.sectionsByIds([...new Set(activeTasks.map((task) => task.sectionId))]);
  return findPendingDays({
    today,
    sections,
    blocks,
    activeTasks,
    originDays: new Map(origins.map((section) => [section.id, section.day])),
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

export async function loadActiveTasks(reader: Reader): Promise<TaskListItem[]> {
  const tasks = await reader.tasksWithStatus('active');
  return withOrigins(reader, tasks.sort(byIntendedDateThenCreation));
}

export async function loadArchivedTasks(reader: Reader): Promise<TaskListItem[]> {
  const tasks = await reader.tasksWithStatus('archived');
  return withOrigins(
    reader,
    tasks.sort((a, b) => ((a.closedAt ?? '') < (b.closedAt ?? '') ? 1 : -1)),
  );
}

export interface WikiEntry {
  section: Section;
  notes: Block[];
  project: Project | null;
}

/** The personal wiki: each entry gathers the notes of one section, newest first. */
export async function loadWiki(reader: Reader): Promise<WikiEntry[]> {
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
  planned: TaskListItem[];
  others: TaskListItem[];
}

/** Step 2 of the checkout: active tasks, split by whether they are in the target day's note. */
export async function loadPlanning(reader: Reader, target: DayKey): Promise<PlanningView> {
  const items = await loadActiveTasks(reader);
  return {
    target,
    planned: items.filter((item) => item.task.intendedDate === target),
    others: items.filter((item) => item.task.intendedDate !== target),
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

/** What the cleanup assistants of 1b have to show ("Colocar ordem na casa"). */
export async function loadCleanup(reader: Reader): Promise<CleanupView> {
  const sections = await reader.sectionsWithStatus('leftUnlinked');
  const projects = await reader.projects();
  return {
    whiteboards: findWhiteboardGroups(sections, projects),
    duplicates: findDuplicateProjects(projects),
  };
}

export interface MenuCounts {
  projects: number;
  active: number;
  archived: number;
  wiki: number;
}

export async function loadMenuCounts(reader: Reader): Promise<MenuCounts> {
  const active = (await reader.tasksWithStatus('active')).length;
  const archived = (await reader.tasksWithStatus('archived')).length;
  const wiki = (await loadWiki(reader)).length;
  const projects = (await reader.projects()).filter((project) => project.status === 'active').length;
  return { projects, active, archived, wiki };
}

export interface ReflectionView {
  week: WeekRange;
  reflection: Reflection | null;
  /** Step 1: tasks and notes left for the reflection, as triage rows. */
  deferred: TriageRow[];
  /** Step 2: archived tasks, which can be reactivated. */
  archived: TaskListItem[];
  /** Step 4. */
  metrics: WeeklyMetrics;
  /** Step 4, section 6: longest streak and completion of each active habit. */
  habits: { habit: Habit; week: HabitStats; month: HabitStats }[];
  projects: Project[];
}

/** Everything the weekly reflection of `week` shows (SPEC.md, section 2). */
export async function loadReflection(reader: Reader, week: WeekRange, today: DayKey): Promise<ReflectionView> {
  const reflection = (await reader.reflection(`week:${week.key}`)) ?? null;
  const tomorrow = addDays(today, 1);
  const tasks = await reader.tasksAwaitingReflection();
  const taskSections = await reader.sectionsByIds([...new Set(tasks.map((task) => task.sectionId))]);
  const sectionById = new Map(taskSections.map((section) => [section.id, section]));
  const noteSections = await reader.sectionsWithNotesDestination('weeklyReflection');
  const noteBlocks = await reader.blocksInSections(noteSections.map((section) => section.id));
  const deferred: TriageRow[] = [
    ...tasks.map(
      (task): TriageRow => ({
        type: 'task',
        task,
        section: sectionById.get(task.sectionId) ?? null,
        suggestion: { kind: 'schedule', date: tomorrow },
        attention: false,
      }),
    ),
    ...noteSections.map(
      (section): TriageRow => ({
        type: 'notes',
        section,
        noteCount: noteBlocks.filter((block) => block.sectionId === section.id && block.kind === 'note').length,
        suggestion: 'wiki',
        attention: false,
      }),
    ),
  ];
  const events = await reader.eventsBetween(week.start, week.end);
  return {
    week,
    reflection,
    deferred,
    archived: await loadArchivedTasks(reader),
    metrics: weeklyMetrics(events, week),
    habits: await habitsOfPeriod(reader, week.start, week.end),
    projects: await reader.projects(),
  };
}

/** Habit statistics for a week, and for the month that week ends in. */
async function habitsOfPeriod(reader: Reader, start: DayKey, end: DayKey) {
  const month = monthRange(monthKey(end));
  const from = start < month.start ? start : month.start;
  const logs = await reader.habitLogsBetween(from, end);
  return (await reader.habits())
    .filter((habit) => habit.status === 'active')
    .map((habit) => ({ habit, week: habitStats(habit, logs, start, end), month: habitStats(habit, logs, month.start, end) }));
}

/** The week whose reflection is due by the user's schedule, if any. */
export async function loadDueReflection(reader: Reader, now: Date): Promise<WeekRange | null> {
  const settings = await reader.settings();
  const schedule = settings?.weeklyReflection ?? null;
  if (!schedule) return null;
  const candidate = dueReflectionWeek(now, schedule, () => false);
  if (!candidate) return null;
  const reflection = await reader.reflection(`week:${candidate.key}`);
  return reflection?.closedAt ? null : candidate;
}

export interface ProjectSummary {
  project: Project;
  activeTasks: number;
  doneTasks: number;
  sections: number;
}

export async function loadProjects(reader: Reader): Promise<ProjectSummary[]> {
  const projects = (await reader.projects()).filter((project) => project.status !== 'merged');
  const summaries: ProjectSummary[] = [];
  for (const project of projects) {
    const blocks = await reader.blocksOfProject(project.id);
    const sections = await reader.sectionsOfProject(project.id);
    summaries.push({
      project,
      activeTasks: blocks.filter((block) => block.kind === 'task' && block.status === 'active').length,
      doneTasks: blocks.filter((block) => block.kind === 'task' && block.status === 'done').length,
      sections: sections.length,
    });
  }
  return summaries.sort((a, b) => a.project.name.localeCompare(b.project.name, 'pt-BR'));
}

export interface ProjectView {
  project: Project;
  activeTasks: TaskListItem[];
  doneTasks: number;
  /** Wiki entries linked to the project. */
  notes: WikiEntry[];
}

export async function loadProject(reader: Reader, projectId: string): Promise<ProjectView | null> {
  const project = (await reader.projects()).find((candidate) => candidate.id === projectId);
  if (!project) return null;
  const blocks = await reader.blocksOfProject(projectId);
  const tasks = blocks.filter((block) => block.kind === 'task');
  const wiki = await loadWiki(reader);
  return {
    project,
    activeTasks: await withOrigins(reader, tasks.filter((task) => task.status === 'active').sort(byIntendedDateThenCreation)),
    doneTasks: tasks.filter((task) => task.status === 'done').length,
    notes: wiki.filter((entry) => entry.section.projectId === projectId),
  };
}

export interface DayOpeningView {
  stage: DayStage;
  warmupItems: WarmupItem[];
  record: DayRecord | null;
  /** Section 3: the dashboard shows the checkout button when the previous days are pending. */
  pendingDays: DayKey[];
}

/** Where the day stands: "Iniciar Dia", warm up, dashboard or execution (section 3). */
export async function loadDayOpening(reader: Reader, today: DayKey): Promise<DayOpeningView> {
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

export interface MonthlyReflectionView {
  month: MonthRange;
  reflection: Reflection | null;
  objectives: ObjectiveSummary[];
  projects: Project[];
  habits: Habit[];
  monthPriorityIds: string[];
  metrics: MonthlyMetrics;
}

/** Section 4: the monthly reflection, a dashboard of objectives, projects and habits. */
export async function loadMonthlyReflection(reader: Reader, key: MonthKey): Promise<MonthlyReflectionView> {
  const month = monthRange(key);
  const projects = (await reader.projects()).filter((project) => project.status !== 'merged');
  const habits = await reader.habits();
  const monthList = await reader.priorityList(`month:${key}`);
  const dayLists = await reader.priorityListsBetween(`day:${month.start}`, `day:${month.end}`);
  const priorityTasks = await reader.blocksByIds([...new Set(dayLists.flatMap((list) => list.itemIds))]);
  return {
    month,
    reflection: (await reader.reflection(`month:${key}`)) ?? null,
    objectives: await loadObjectives(reader),
    projects,
    habits,
    monthPriorityIds: monthList?.itemIds ?? [],
    metrics: monthlyMetrics({
      projects,
      habits,
      dayPriorityLists: dayLists,
      priorityTasks,
      monthProjectIds: monthList?.itemIds ?? [],
    }),
  };
}

/**
 * "Quando um mês termina, aparece a opção de reflexão mensal": the previous month, while its
 * reflection is not closed and something happened in it.
 */
export async function loadDueMonthlyReflection(reader: Reader, today: DayKey): Promise<MonthRange | null> {
  const previous = monthRange(shiftMonth(monthKey(today), -1));
  if ((await reader.reflection(`month:${previous.key}`))?.closedAt) return null;
  const events = await reader.eventsBetween(previous.start, previous.end);
  return events.length > 0 ? previous : null;
}
