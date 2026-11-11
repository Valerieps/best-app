import { useState } from 'react';
import { moveDayPriority, setDayPriority } from '../../application/dayTools';
import { setTaskDone } from '../../application/notebook';
import { loadExecute, type ExecuteData, type TaskListItem } from '../../application/queries';
import type { DayKey } from '../../domain/day';
import {
  DEADLINE_WINDOWS,
  DEFAULT_DEADLINE_WINDOW,
  buildExecuteView,
  type DeadlineWindow,
  type ExecuteScope,
} from '../../domain/execute';
import { Icon } from '../components/Icon';
import { ScreenHeader } from '../components/ScreenHeader';
import { Segmented } from '../components/Segmented';
import { LoadingPage } from '../components/Skeleton';
import { routeHash } from '../hooks';
import { ActiveTaskActions, TaskRow } from '../lists/ListScreens';
import { appContext, reader } from '../services';
import { useLiveQuery } from '../useLiveQuery';

const VIEW_KEY = 'best-app:executeView';

interface ExecuteViewChoice {
  scope: ExecuteScope;
  deadlineWindow: DeadlineWindow;
}

const DEFAULT_CHOICE: ExecuteViewChoice = { scope: 'all', deadlineWindow: DEFAULT_DEADLINE_WINDOW };

function readChoice(): ExecuteViewChoice {
  try {
    const saved = (JSON.parse(localStorage.getItem(VIEW_KEY) ?? '{}') ?? {}) as Partial<Record<keyof ExecuteViewChoice, unknown>>;
    return {
      scope: saved.scope === 'focus' ? 'focus' : 'all',
      deadlineWindow: DEADLINE_WINDOWS.includes(saved.deadlineWindow as DeadlineWindow)
        ? (saved.deadlineWindow as DeadlineWindow)
        : DEFAULT_CHOICE.deadlineWindow,
    };
  } catch {
    return DEFAULT_CHOICE;
  }
}

/** The filters of the screen, kept in this browser only (spec/prioridades.md, "Tela \"Executar\""). */
function useExecuteChoice(): [ExecuteViewChoice, (choice: ExecuteViewChoice) => void] {
  const [choice, setChoice] = useState(readChoice);
  const update = (next: ExecuteViewChoice) => {
    try {
      localStorage.setItem(VIEW_KEY, JSON.stringify(next));
    } catch {
      // Nothing to do: the choice just won't be remembered.
    }
    setChoice(next);
  };
  return [choice, update];
}

const SCOPE_OPTIONS = [
  { value: 'all', label: 'Todos os projetos ativos' },
  { value: 'focus', label: 'Só em foco' },
] as const;

const WINDOW_OPTIONS = DEADLINE_WINDOWS.map((days) => ({
  value: String(days),
  label: days === 0 ? 'Nenhum' : `${days} dias`,
}));

function Group({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <section className="execute__group">
      <h2 className="execute__title">
        {title}
        {count !== undefined && <span className="badge">{count}</span>}
      </h2>
      {children}
    </section>
  );
}

export function ExecuteScreen({ today }: { today: DayKey }) {
  const data = useLiveQuery(() => loadExecute(reader, today), [today]);
  const [choice, setChoice] = useExecuteChoice();
  if (!data) return <LoadingPage title="Executar" />;
  return <ExecuteContent data={data} today={today} choice={choice} onChoice={setChoice} />;
}

function ExecuteContent({
  data,
  today,
  choice,
  onChoice,
}: {
  data: ExecuteData;
  today: DayKey;
  choice: ExecuteViewChoice;
  onChoice(choice: ExecuteViewChoice): void;
}) {
  const byId = new Map(data.items.map((item) => [item.task.id, item]));
  const priorities = data.priorities.map(({ task, automatic }) => ({
    item: byId.get(task.id) ?? { task, origin: null, project: null },
    automatic,
  }));
  const view = buildExecuteView({
    today,
    priorityIds: priorities.map(({ item }) => item.task.id),
    items: data.items,
    nextStepIds: data.nextStepIds,
    focusIds: data.focusIds,
    scope: choice.scope,
    deadlineWindow: choice.deadlineWindow,
  });
  const nextSet = new Set(data.nextStepIds);

  const row = (item: TaskListItem, priority?: { automatic: boolean }) => {
    const { task } = item;
    const isPriority = priority !== undefined;
    const star = isPriority && priority.automatic ? null : (
      <button
        type="button"
        className={`line__star ${isPriority ? 'line__star--on' : ''}`}
        title={isPriority ? 'Tirar das prioridades' : 'Promover a prioridade do dia'}
        aria-label={isPriority ? 'Tirar das prioridades' : 'Promover a prioridade do dia'}
        aria-pressed={isPriority}
        onClick={() => void setDayPriority(appContext, task.id, !isPriority)}
      >
        {isPriority ? '★' : '☆'}
      </button>
    );
    return (
      <TaskRow
        key={task.id}
        item={item}
        today={today}
        isNext={nextSet.has(task.id)}
        action={
          <>
            {priority?.automatic && task.deadline === today && (
              <span className="execute__due-today" role="img" title="Prazo máximo hoje" aria-label="Prazo máximo hoje">
                <Icon name="alertCircle" size="sm" />
              </span>
            )}
            <input
              type="checkbox"
              checked={false}
              onChange={() => void setTaskDone(appContext, task.id, true)}
              aria-label={`Finalizar "${task.text}"`}
            />
          </>
        }
        extra={
          <>
            <ActiveTaskActions
              item={item}
              today={today}
              projects={data.activeProjects}
              isNext={nextSet.has(task.id)}
              onIntendedDate={isPriority ? (date) => void moveDayPriority(appContext, task.id, date) : undefined}
            />
            {/* A chosen priority keeps its full star in sight; the empty one shows on hover. */}
            {star && (isPriority ? star : <span className="active-tasks__actions">{star}</span>)}
          </>
        }
      />
    );
  };

  const list = (items: TaskListItem[]) => <ul className="card-list">{items.map((item) => row(item))}</ul>;
  const nothingNext =
    choice.scope === 'focus' && data.focusIds.length === 0 ? 'Nenhum projeto em foco.' : 'Nenhum próximo passo marcado.';

  return (
    <main className="page page--active-tasks execute">
      <ScreenHeader title="Executar" />

      <Group title="Prioridades do dia">
        {priorities.length === 0 ? (
          <p className="muted">Nenhuma prioridade para hoje.</p>
        ) : (
          <ul className="card-list">{priorities.map(({ item, automatic }) => row(item, { automatic }))}</ul>
        )}
      </Group>

      <Group title="Hoje e atrasadas" count={view.dueNow.length}>
        {view.dueNow.length === 0 ? <p className="muted">Nada com data de hoje ou atrasado.</p> : list(view.dueNow)}
      </Group>

      <Group title="Prazos chegando" count={choice.deadlineWindow === 0 ? undefined : view.deadlines.length}>
        <div className="execute__controls">
          <span className="muted">Nos próximos</span>
          <Segmented
            label="Prazos chegando"
            options={WINDOW_OPTIONS}
            value={String(choice.deadlineWindow)}
            onChange={(value) => onChoice({ ...choice, deadlineWindow: Number(value) as DeadlineWindow })}
          />
        </div>
        {choice.deadlineWindow !== 0 &&
          (view.deadlines.length === 0 ? (
            <p className="muted">Nenhum prazo nos próximos {choice.deadlineWindow} dias.</p>
          ) : (
            list(view.deadlines)
          ))}
      </Group>

      <Group title="Próximos passos">
        <div className="execute__controls">
          <Segmented
            label="Próximos passos de quais projetos"
            options={SCOPE_OPTIONS}
            value={choice.scope}
            onChange={(scope) => onChoice({ ...choice, scope })}
          />
        </div>
        {view.nextSteps.length === 0 ? (
          <p className="muted">{nothingNext}</p>
        ) : (
          view.nextSteps.map((group) => (
            <section key={group.project.id} className="execute__project">
              <h3 className="execute__project-name">
                <a href={routeHash({ name: 'project', id: group.project.id })}>{group.project.name}</a>
              </h3>
              {list(group.items)}
            </section>
          ))
        )}
      </Group>
    </main>
  );
}
