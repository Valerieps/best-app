import type { Block, Habit, PriorityList, Project } from './entities';

/**
 * Section 4: the "raio-x da desconexão" between the day to day and the objectives. Metrics with
 * open questions in the spec (blocks vs. tasks without project, low-engagement objectives) are
 * left out until decided.
 */
export interface MonthlyMetrics {
  activeProjects: number;
  projectsWithoutObjective: number;
  habitsWithoutObjective: number;
  /** Day priorities of the month that were tasks of a project chosen as month priority. */
  dayPriorities: number;
  dayPrioritiesInMonthProjects: number;
}

export function monthlyMetrics(input: {
  projects: readonly Project[];
  habits: readonly Habit[];
  dayPriorityLists: readonly PriorityList[];
  priorityTasks: readonly Block[];
  monthProjectIds: readonly string[];
}): MonthlyMetrics {
  const active = input.projects.filter((project) => project.status === 'active');
  const taskById = new Map(input.priorityTasks.map((task) => [task.id, task]));
  const monthProjects = new Set(input.monthProjectIds);
  const prioritized = input.dayPriorityLists.flatMap((list) => list.itemIds);
  return {
    activeProjects: active.length,
    projectsWithoutObjective: active.filter((project) => !project.objectiveId).length,
    habitsWithoutObjective: input.habits.filter((habit) => habit.status === 'active' && !habit.objectiveId).length,
    dayPriorities: prioritized.length,
    dayPrioritiesInMonthProjects: prioritized.filter((id) => {
      const projectId = taskById.get(id)?.projectId;
      return projectId != null && monthProjects.has(projectId);
    }).length,
  };
}
