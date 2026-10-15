import { addDays, type DayKey } from '../domain/day';
import { directionMetrics, type DirectionMetrics } from '../domain/directionMetrics';
import type { Habit, Project, Reflection } from '../domain/entities';
import { focusListEmptied, LEGACY_WEEK_LISTS_RANGE, FOCUS_LIST_ID } from '../domain/focusProjects';
import { habitStats, type HabitStats } from '../domain/habits';
import { periodMetrics, type WeeklyMetrics } from '../domain/metrics';
import { lastActivityDay } from '../domain/projectActivity';
import {
  checkoutsSince,
  closedReviewsSince,
  DEFAULT_REVIEW_CADENCE,
  directionReasons,
  focusReasons,
  isInPeriod,
  lastClosedAt,
  objectiveStalledDays,
  type ReviewCadence,
  type ReviewKind,
  type ReviewReason,
} from '../domain/reviews';
import type { TriageRow } from '../domain/triage';
import { dayOfTimestamp } from '../domain/week';
import type { Reader } from './ports';
import { loadActivities, loadFocusProjectIds, loadObjectives, type ObjectiveSummary } from './queries';
import { OPEN_REVIEW_ID } from './reviews';

/** Read models of the Revisão de Foco and the Revisão de Rumo (spec/rituais.md). */

/** The earliest day any event can belong to, to read the whole history. */
const BEGINNING = '0000-01-01';

async function cadenceOf(reader: Reader): Promise<ReviewCadence> {
  return { ...DEFAULT_REVIEW_CADENCE, ...(await reader.settings())?.reviewCadence };
}

/** Tasks and note sections left for the Revisão de Foco. */
async function deferredRows(reader: Reader, today: DayKey): Promise<TriageRow[]> {
  const tomorrow = addDays(today, 1);
  const tasks = await reader.tasksAwaitingReflection();
  const taskSections = await reader.sectionsByIds([...new Set(tasks.map((task) => task.sectionId))]);
  const sectionById = new Map(taskSections.map((section) => [section.id, section]));
  const noteSections = await reader.sectionsWithNotesDestination('weeklyReflection');
  const noteBlocks = await reader.blocksInSections(noteSections.map((section) => section.id));
  return [
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
}

export interface ReviewAvailability {
  /** Why each review is available; empty when it is not. */
  focus: ReviewReason[];
  direction: ReviewReason[];
  /** Names of the projects and objectives the reasons point at. */
  names: Record<string, string>;
  /** Whether a review of each kind was ever closed, for "desde a última" or "desde o começo". */
  hadReview: Record<ReviewKind, boolean>;
  /** When the latest checkout was done: "Lembrar depois" hides the notice until the next one. */
  lastCheckoutAt: string | null;
}

/** Whether each review is available, and why (spec/rituais.md, "Quando uma revisão fica disponível"). */
export async function loadReviewAvailability(reader: Reader, today: DayKey): Promise<ReviewAvailability> {
  const reflections = await reader.reflections();
  const cadence = await cadenceOf(reader);
  const focusSince = lastClosedAt(reflections, 'focus');
  const directionSince = lastClosedAt(reflections, 'direction');
  const events = await reader.eventsBetween(BEGINNING, today);
  const projects = await reader.projects();
  const names: Record<string, string> = Object.fromEntries(projects.map((project) => [project.id, project.name]));

  const focusIds = new Set(await loadFocusProjectIds(reader, projects));
  const focusActivities = await loadActivities(reader, projects.filter((project) => focusIds.has(project.id)), today);
  const awaitingItems = (await reader.tasksAwaitingReflection()).length + (await reader.sectionsWithNotesDestination('weeklyReflection')).length;
  const focus = focusReasons({
    checkouts: checkoutsSince(events, focusSince),
    cadence: cadence.focusCheckouts,
    awaitingItems,
    stalledFocusProjects: focusActivities
      .filter((item) => item.stalledDays !== null)
      .map((item) => ({ projectId: item.project.id, days: item.stalledDays! })),
    focusListEmptied: focusListEmptied(events, focusSince),
  });

  const hadDirectionReview = directionSince !== null;
  let finishedTasks = 0;
  let finishedWithoutObjective = 0;
  const stalledObjectives: { objectiveId: string; days: number }[] = [];
  if (hadDirectionReview) {
    // Tasks finished in the period that are still done, each once.
    const finishedIds = [
      ...new Set(events.filter((event) => event.type === 'task.finished' && isInPeriod(event, directionSince)).map((event) => event.entityId)),
    ];
    const finished = (await reader.blocksByIds(finishedIds)).filter((task) => task.status === 'done');
    const projectById = new Map(projects.map((project) => [project.id, project]));
    finishedTasks = finished.length;
    finishedWithoutObjective = finished.filter((task) => !(task.projectId && projectById.get(task.projectId)?.objectiveId)).length;

    for (const objective of await reader.objectives()) {
      names[objective.id] = objective.goal;
      const linked = projects.filter((project) => project.status === 'active' && project.objectiveId === objective.id);
      const days = (await loadActivities(reader, linked, today)).map((item) => lastActivityDay(item.activity, today)).filter((day): day is DayKey => day !== null);
      const latest = days.length > 0 ? days.reduce((a, b) => (a > b ? a : b)) : null;
      const idle = objectiveStalledDays(objective, linked.length > 0, latest, today);
      if (idle !== null) stalledObjectives.push({ objectiveId: objective.id, days: idle });
    }
  }
  const direction = directionReasons({
    focusReviews: closedReviewsSince(reflections, 'focus', directionSince),
    cadence: cadence.directionFocusReviews,
    hadDirectionReview,
    finishedTasks,
    finishedWithoutObjective,
    stalledObjectives,
  });

  const checkouts = events.filter((event) => event.type === 'day.checkoutCompleted').map((event) => event.at);
  const lastCheckoutAt = checkouts.length > 0 ? checkouts.reduce((a, b) => (a > b ? a : b)) : null;
  return { focus, direction, names, hadReview: { focus: focusSince !== null, direction: hadDirectionReview }, lastCheckoutAt };
}

export interface FocusReviewView {
  /** When the previous Revisão de Foco was closed; null before the first one. */
  since: string | null;
  /** The review in progress, if its texts were already saved. */
  review: Reflection | null;
  /** Step 1: tasks and notes left for the review, as triage rows. */
  deferred: TriageRow[];
  /** Step 2: active projects, the stalled ones first. */
  activeProjects: { project: Project; stalledDays: number | null }[];
  /** Step 4. */
  metrics: WeeklyMetrics;
  /** Step 4, section 6: longest streak and completion of each active habit in the period. */
  habits: { habit: Habit; stats: HabitStats }[];
  projects: Project[];
  /** Step 6: the projects in focus, which the review can change freely. */
  focusIds: string[];
}

/** Everything the Revisão de Foco shows. Its period runs from the previous one until now. */
export async function loadFocusReview(reader: Reader, today: DayKey): Promise<FocusReviewView> {
  const reflections = await reader.reflections();
  const since = lastClosedAt(reflections, 'focus');
  const events = (await reader.eventsBetween(BEGINNING, today)).filter((event) => isInPeriod(event, since));
  const projects = await reader.projects();
  const active = projects.filter((project) => project.status === 'active');
  const activeProjects = (await loadActivities(reader, active, today))
    .map(({ project, stalledDays }) => ({ project, stalledDays }))
    .sort((a, b) => (b.stalledDays ?? -1) - (a.stalledDays ?? -1) || a.project.name.localeCompare(b.project.name, 'pt-BR'));
  const start = since ? dayOfTimestamp(since) : events.reduce((first, event) => (event.day < first ? event.day : first), today);
  const logs = await reader.habitLogsBetween(start, today);
  return {
    since,
    review: reflections.find((reflection) => reflection.id === OPEN_REVIEW_ID.focus) ?? null,
    deferred: await deferredRows(reader, today),
    activeProjects,
    metrics: periodMetrics(events, since),
    habits: (await reader.habits()).filter((habit) => habit.status === 'active').map((habit) => ({ habit, stats: habitStats(habit, logs, start, today) })),
    projects,
    focusIds: await loadFocusProjectIds(reader, projects),
  };
}

export interface DirectionReviewView {
  /** When the previous Revisão de Rumo was closed; null before the first one. */
  since: string | null;
  objectives: ObjectiveSummary[];
  projects: Project[];
  habits: Habit[];
  /** The raio-x of the period. */
  metrics: DirectionMetrics;
}

/** Section 4: the Revisão de Rumo, a dashboard of objectives, projects and habits. */
export async function loadDirectionReview(reader: Reader, today: DayKey): Promise<DirectionReviewView> {
  const since = lastClosedAt(await reader.reflections(), 'direction');
  const projects = (await reader.projects()).filter((project) => project.status !== 'merged');
  const habits = await reader.habits();
  const dayLists = await reader.priorityListsBetween(`day:${since ? dayOfTimestamp(since) : ''}`, `day:${today}`);
  const priorityTasks = await reader.blocksByIds([...new Set(dayLists.flatMap((list) => list.itemIds))]);
  const focusEvents = await reader.eventsOfEntities([FOCUS_LIST_ID]);
  const legacyWeekLists = await reader.priorityListsBetween(...LEGACY_WEEK_LISTS_RANGE);
  return {
    since,
    objectives: await loadObjectives(reader),
    projects,
    habits,
    metrics: directionMetrics({ projects, habits, dayPriorityLists: dayLists, priorityTasks, focusEvents, legacyWeekLists }),
  };
}
