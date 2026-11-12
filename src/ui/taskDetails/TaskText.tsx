import { Linkified } from '../components/Linkified';
import { openTaskDetails } from './taskDetailsStore';
import { taskText } from '../tasks/taskSurface';

/** The text of a task; a click on it (not on a link inside it) opens the task details window. */
export function TaskText({ taskId, text }: { taskId: string; text: string }) {
  return (
    <span
      className="task-text"
      role="button"
      tabIndex={0}
      title="Ver os detalhes da tarefa"
      onClick={(event) => {
        if ((event.target as HTMLElement).closest('a')) return;
        openTaskDetails(taskId);
      }}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget || (event.key !== 'Enter' && event.key !== ' ')) return;
        event.preventDefault();
        openTaskDetails(taskId);
      }}
    >
      <Linkified text={taskText({ text })} />
    </span>
  );
}
