import type { Block, Habit, PriorityList, Project } from './entities';
import { listInEffect, recordedPriorityProjects } from './priorityProjects';
import { weekKey } from './week';

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
  /** Those that were tasks of a priority project of their day's week. */
  dayPrioritiesInPriorityProjects: number;
}

export function monthlyMetrics(input: {
  projects: readonly Project[];
  habits: readonly Habit[];
  dayPriorityLists: readonly PriorityList[];
  priorityTasks: readonly Block[];
  /** Every week list of priority projects up to the month's last week (they carry over). */
  weekProjectLists: readonly PriorityList[];
}): MonthlyMetrics {
  const active = input.projects.filter((project) => project.status === 'active');
  const taskById = new Map(input.priorityTasks.map((task) => [task.id, task]));
  let dayPriorities = 0;
  let inPriorityProjects = 0;
  for (const list of input.dayPriorityLists) {
    // What was chosen that week, even if the project was finished later.
    const projectIds = new Set(recordedPriorityProjects(listInEffect(input.weekProjectLists, weekKey(list.period))));
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
    dayPrioritiesInPriorityProjects: inPriorityProjects,
  };
}
