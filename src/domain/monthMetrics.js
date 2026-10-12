import { listInEffect, recordedPriorityProjects } from './priorityProjects';
import { weekKey } from './week';
export function monthlyMetrics(input) {
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
            if (projectId != null && projectIds.has(projectId))
                inPriorityProjects++;
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
