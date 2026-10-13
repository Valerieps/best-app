import type { Block, Habit, PriorityList, Project } from './entities';
import type { DomainEvent } from './events';
import { focusProjectsOnDay } from './focusProjects';

/**
 * Section 4: the "raio-x da desconexão" between the day to day and the objectives. Metrics with
 * open questions in the spec (blocks vs. tasks without project, low-engagement objectives) are
 * left out until decided.
 */
export interface MonthlyMetrics {
  activeProjects: number;
  projectsWithoutObjective: number;
  habitsWithoutObjective: number;
  /** Day priorities of the month. */
  dayPriorities: number;
  /** Those that were tasks of a project in focus on their day. */
  dayPrioritiesInFocusProjects: number;
}

export function monthlyMetrics(input: {
  projects: readonly Project[];
  habits: readonly Habit[];
  dayPriorityLists: readonly PriorityList[];
  priorityTasks: readonly Block[];
  /** Changes of the list in focus, which carry the whole list (its history). */
  focusEvents: readonly DomainEvent[];
  /** The week lists of priority projects from before the reviews, for the days before any change. */
  legacyWeekLists: readonly PriorityList[];
}): MonthlyMetrics {
  const active = input.projects.filter((project) => project.status === 'active');
  const taskById = new Map(input.priorityTasks.map((task) => [task.id, task]));
  let dayPriorities = 0;
  let inPriorityProjects = 0;
  for (const list of input.dayPriorityLists) {
    // What was in focus that day, even if the project was finished later.
    const projectIds = new Set(focusProjectsOnDay(list.period, input.focusEvents, input.legacyWeekLists));
    for (const id of list.itemIds) {
      dayPriorities++;
      const projectId = taskById.get(id)?.projectId;
      if (projectId != null && projectIds.has(projectId)) inPriorityProjects++;
    }
  }
  return {
    activeProjects: active.length,
    projectsWithoutObjective: active.filter((project) => !project.objectiveId).length,
    habitsWithoutObjective: input.habits.filter((habit) => habit.status === 'active' && !habit.objectiveId).length,
    dayPriorities,
    dayPrioritiesInFocusProjects: inPriorityProjects,
  };
}
