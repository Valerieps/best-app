import { useState } from 'react';
import { removeFromQueue, reorderQueue } from '../../application/executionQueue';
import { setTaskDone } from '../../application/notebook';
import { loadExecutionQueue, type ExecutionQueueData, type TaskListItem } from '../../application/queries';
import type { DayKey } from '../../domain/day';
import { moveItem } from '../../domain/order';
import { ScreenHeader } from '../components/ScreenHeader';
import { LoadingPage } from '../components/Skeleton';
import { isSamePlace, useLineDrag } from '../dayNote/lineDrag';
import { ActiveTaskActions, TaskRow } from '../lists/ListScreens';
import { appContext, reader } from '../services';
import { useLiveQuery } from '../useLiveQuery';

/** "Fila de execução" (spec/prioridades.md): the tasks I chose to do next, in my order. */

const TITLE = 'Fila de execução';
const GROUP = 'queue';

/**
 * The screen, or the same content in the right panel (`inPanel`), where the panel shows its own
 * title (spec/navegacao.md, "Painel da direita").
 */
export function ExecuteScreen({ today, inPanel = false }: { today: DayKey; inPanel?: boolean }) {
  const data = useLiveQuery(() => loadExecutionQueue(reader), []);
  if (!data) return inPanel ? <p className="muted">Carregando…</p> : <LoadingPage title={TITLE} />;
  return <QueueContent data={data} today={today} inPanel={inPanel} />;
}

function QueueContent({ data, today, inPanel }: { data: ExecutionQueueData; today: DayKey; inPanel: boolean }) {
  // The order dragged, shown at once until the saved queue catches up.
  const [pending, setPending] = useState<string[] | null>(null);
  const saved = data.items.map((item) => item.task.id);
  const byId = new Map(data.items.map((item) => [item.task.id, item]));
  const order = pending && pending.length === saved.length && pending.every((id) => byId.has(id)) ? pending : saved;
  const items = order.map((id) => byId.get(id)!);

  const { drag, start } = useLineDrag((_group, id, toIndex) => {
    const ids = moveItem(order, id, toIndex);
    if (ids.join() === order.join()) return;
    setPending(ids);
    reorderQueue(appContext, ids, id)
      .catch(() => undefined)
      .finally(() => setPending(null));
  });

  const mark = (index: number): 'before' | 'after' | null => {
    if (!drag || isSamePlace(order.indexOf(drag.id), drag.toIndex)) return null;
    if (drag.toIndex === index) return 'before';
    if (drag.toIndex === order.length && index === order.length - 1) return 'after';
    return null;
  };

  const row = (item: TaskListItem, index: number) => {
    const { task } = item;
    return (
      <TaskRow
        key={task.id}
        item={item}
        today={today}
        quietProject
        hideMeta
        drag={
          items.length < 2
            ? undefined
            : { group: GROUP, onStart: (event) => start(event, GROUP, task.id), dragging: drag?.id === task.id, mark: mark(index) }
        }
        action={
          <input
            type="checkbox"
            checked={false}
            onChange={() => void setTaskDone(appContext, task.id, true)}
            aria-label={`Finalizar "${task.text}"`}
          />
        }
        extra={
          <>
            <span className="active-tasks__actions">
              <button
                type="button"
                className="line__action"
                title="Tirar da fila; a tarefa continua como está"
                onClick={() => void removeFromQueue(appContext, task.id)}
              >
                Remover da fila
              </button>
            </span>
            <ActiveTaskActions item={item} today={today} projects={data.activeProjects} />
          </>
        }
      />
    );
  };

  const content =
    items.length === 0 ? (
      <p className="muted">A fila está vazia. Use "Adicionar à fila" no hover de qualquer tarefa.</p>
    ) : (
      <ul className="card-list">{items.map(row)}</ul>
    );

  if (inPanel) return <div className="execute execute--panel">{content}</div>;
  return (
    <main className="page page--active-tasks execute">
      <ScreenHeader title={TITLE} />
      {content}
    </main>
  );
}
