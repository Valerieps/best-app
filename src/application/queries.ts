import { addDays, fromDayKey, type DayKey } from '../domain/day';
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
import { isOpenIdea, sortIdeas } from '../domain/ideas';
import { monthKey, monthRange } from '../domain/month';
import { dayStage, dueReminders, type DayStage } from '../domain/dayFlow';
import { weekOf } from '../domain/week';
import { comparePositions } from '../domain/position';
import { buildDayPriorities, dayPriorityListId, type DayPriority } from '../domain/priorities';
import { FOCUS_LIST_ID, focusProjectIds, hasFreeSlot } from '../domain/focusProjects';
import { QUEUE_LIST_ID, queueIds } from '../domain/executionQueue';
import { activityByDay, lastActivityDay, recentlyFinished, stalledDays, type ActivityByDay } from '../domain/projectActivity';
import { isDaySection } from '../domain/projectPage';
import { buildPeopleOverview, buildPersonPage, meetingPeople, type PeopleOverview, type PersonPage } from '../domain/people';
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

/** `today` makes a closed today start over (`isShownAfterClosing`); past days keep everything. */
export async function loadDayNote(reader: Reader, day: DayKey, today?: DayKey): Promise<DayNoteView> {
  const sections = await daySections(reader, day);
  const blocks = await reader.blocksInSections(sections.map((section) => section.id));
  const intended = await reader.tasksIntendedFor(day);
  const originIds = intended.map((task) => task.sectionId).filter((id) => !sections.some((s) => s.id === id));
  const origins = await reader.sectionsByIds(originIds);
  const projects = await reader.projects();
  const record = await reader.dayRecord(day);
  const sectionOrder = record?.sectionOrder;
  const closedAt = day === today ? (record?.lastCheckoutAt ?? null) : null;
  return {
    day,
    entries: buildDayNote({ day, sections, blocks, intended, closedAt }),
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
  // An idea's page is not a kept note: it shows only on the idea (ADR-067).
  const sections = (await reader.wikiSections()).filter((section) => section.ideaId === undefined);
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

/**
 * The notes of a project: a note follows its section's project, unless its tag gave it another
 * one (ADR-066), so a tagged note shows in the tagged project and leaves the section's.
 */
export function notesOfProject(kept: readonly SectionNotes[], projectId: string): SectionNotes[] {
  return kept
    .map((entry) => ({ ...entry, notes: entry.notes.filter((note) => (note.projectId ?? entry.section.projectId) === projectId) }))
    .filter((entry) => entry.notes.length > 0);
}

/** The day's priorities: chosen by hand plus tasks whose deadline is the day (1b). */
export async function loadDayPriorities(reader: Reader, day: DayKey): Promise<DayPriority[]> {
  const list = await reader.priorityList(dayPriorityListId(day));
  const chosen = await reader.blocksByIds(list?.itemIds ?? []);
  const deadline = await reader.tasksWithDeadline(day);
  return buildDayPriorities(list?.itemIds ?? [], chosen, deadline.sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1)));
}

export interface MenuCounts {
  projects: number;
  active: number;
  /** Active people. */
  people: number;
  /** Ideas without a destination yet (spec/ideias.md). */
  ideas: number;
}

export async function loadMenuCounts(reader: Reader): Promise<MenuCounts> {
  const active = (await myActiveTasks(reader)).length;
  const projects = (await reader.projects()).filter((project) => project.status === 'active').length;
  const people = (await reader.people()).filter((person) => person.status === 'active').length;
  const ideas = (await reader.ideas()).filter(isOpenIdea).length;
  return { projects, active, people, ideas };
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
  /** Ids of the tasks in the "Fila de execução" (spec/prioridades.md). */
  queueIds: string[];
}

export async function loadTaskListContext(reader: Reader): Promise<TaskListContext> {
  const projects = await reader.projects();
  return {
    activeProjects: projects
      .filter((project) => project.status === 'active')
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })),
    focusIds: await loadFocusProjectIds(reader, projects),
    queueIds: await loadQueueIds(reader),
  };
}

/** Everything the task details window shows for one task; null when the task no longer exists. */
export interface TaskDetails extends TaskListContext {
  item: TaskListItem;
}

export async function loadTaskDetails(reader: Reader, taskId: string): Promise<TaskDetails | null> {
  const [task] = await reader.blocksByIds([taskId]);
  if (!task || task.kind !== 'task') return null;
  const [item] = await withOrigins(reader, [task]);
  return { ...(await loadTaskListContext(reader)), item };
}

/** What the "Fila de execução" needs (spec/prioridades.md, "Fila de execução"). */
export interface ExecutionQueueData extends TaskListContext {
  /** The tasks in the queue, in its order. */
  items: TaskListItem[];
}

export async function loadExecutionQueue(reader: Reader): Promise<ExecutionQueueData> {
  const tasks = await myActiveTasks(reader);
  const byId = new Map(tasks.map((task) => [task.id, task]));
  const ids = queueIds(await reader.priorityList(QUEUE_LIST_ID), tasks);
  return { ...(await loadTaskListContext(reader)), items: await withOrigins(reader, ids.map((id) => byId.get(id)!)) };
}

/** Ids of the tasks in the "Fila de execução", for the "Adicionar à fila" action elsewhere. */
export async function loadQueueIds(reader: Reader): Promise<string[]> {
  return queueIds(await reader.priorityList(QUEUE_LIST_ID), await myActiveTasks(reader));
}

/** What the "⋯" of a project offers about the focus, in the list and on its page. */
export interface ProjectActions {
  /** In focus: "Tirar do foco". */
  isPriority: boolean;
  /** Active, not in focus yet, and the list has a free slot: "Colocar em foco". */
  canAddToPriorities: boolean;
  /** Active, not in focus, and the list is full: the projects in focus it can take the place of. */
  swapTargets: { id: string; name: string }[];
}

function projectActions(project: Project, priorityIds: readonly string[], projects: readonly Project[]): ProjectActions {
  const isPriority = priorityIds.includes(project.id);
  const candidate = project.status === 'active' && !isPriority;
  const free = hasFreeSlot(priorityIds);
  const swapTargets =
    candidate && !free
      ? priorityIds.flatMap((id) => projects.filter((other) => other.id === id).map((other) => ({ id: other.id, name: other.name })))
      : [];
  return { isPriority, canAddToPriorities: candidate && free, swapTargets };
}

export interface ProjectListItem extends ProjectActions {
  project: Project;
  objective: Objective | null;
  activeTasks: number;
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
  summary: { active: number; stalled: number };
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
    // The notes written on the project page count too; the section of its tasks does not.
    const sections = (await reader.sectionsOfProject(project.id)).filter((section) => section.projectPage !== true);
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

/** The project list (section 2): where projects are followed. */
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
      finishedLastTwoWeeks: recentlyFinished(activity, today),
      lastActivityDay: lastActivityDay(activity, today),
      stalledDays,
      activity,
      ...projectActions(project, priorityIds, projects),
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
  /** The project's ideas without a destination, oldest first (spec/ideias.md). */
  ideas: Block[];
}

export async function loadProject(reader: Reader, projectId: string): Promise<ProjectView | null> {
  const projects = await reader.projects();
  const project = projects.find((candidate) => candidate.id === projectId);
  if (!project) return null;
  const blocks = await reader.blocksOfProject(projectId);
  const tasks = blocks.filter((block) => block.kind === 'task');
  const sections = (await reader.sectionsOfProject(projectId)).filter(isDaySection);
  const kept = await loadSectionNotes(reader);
  const done = tasks.filter((task) => task.status === 'done').sort((a, b) => ((a.closedAt ?? '') < (b.closedAt ?? '') ? 1 : -1));
  const priorityIds = await loadFocusProjectIds(reader, projects);
  return {
    project,
    activeTasks: await withOrigins(reader, tasks.filter((task) => task.status === 'active').sort(byIntendedDateThenCreation)),
    doneTasks: await withOrigins(reader, done),
    notes: notesOfProject(kept, projectId),
    sections: sections.length,
    ideas: sortIdeas(blocks.filter(isOpenIdea)),
    ...projectActions(project, priorityIds, projects),
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
  // Meetings titled with people count as a mention of them for everything written inside.
  const meetings = (await reader.sectionsWithMentions()).filter((section) => meetingPeople(section, people).length > 0);
  const inMeetings = await reader.blocksInSections(meetings.map((section) => section.id));
  const blocks = [...new Map([...(await reader.blocksWithMentions()), ...inMeetings].map((block) => [block.id, block])).values()];
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
  return { ...buildPeopleOverview(people, blocks, today, sectionsById), sectionsById };
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

/** An idea in the list of ideas: its project, and the day it was written. */
export interface IdeaItem {
  idea: Block;
  project: Project | null;
  day: DayKey | null;
}

/** "Ideias": every idea without a destination, oldest first (spec/ideias.md). */
export async function loadIdeas(reader: Reader): Promise<IdeaItem[]> {
  const ideas = sortIdeas((await reader.ideas()).filter(isOpenIdea));
  const projects = new Map((await reader.projects()).map((project) => [project.id, project]));
  const sections = new Map((await reader.sectionsByIds([...new Set(ideas.map((idea) => idea.sectionId))])).map((section) => [section.id, section]));
  return ideas.map((idea) => ({
    idea,
    project: idea.projectId ? (projects.get(idea.projectId) ?? null) : null,
    day: sections.get(idea.sectionId)?.day ?? null,
  }));
}

/** An idea's page: the idea, where it was written, and the lines I wrote about it. */
export interface IdeaView extends IdeaItem {
  /** The section it was written in: a day note's, or another idea's page. */
  origin: Section | null;
  lines: Block[];
}

export async function loadIdea(reader: Reader, ideaId: string): Promise<IdeaView | null> {
  const [idea] = await reader.blocksByIds([ideaId]);
  if (!idea || idea.kind !== 'idea') return null;
  const [origin] = await reader.sectionsByIds([idea.sectionId]);
  const project = idea.projectId ? ((await reader.projects()).find((candidate) => candidate.id === idea.projectId) ?? null) : null;
  const lines = idea.ideaSectionId ? (await reader.blocksInSections([idea.ideaSectionId])).sort(comparePositions) : [];
  return { idea, project, day: origin?.day ?? null, origin: origin ?? null, lines };
}
