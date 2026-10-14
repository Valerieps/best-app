import { useState } from 'react';
import { createHabit, logHabit, setHabitArchived, updateHabit, type HabitFields } from '../../application/habits';
import { loadHabits, type HabitView } from '../../application/queries';
import type { DayKey } from '../../domain/day';
import type { Habit, Objective } from '../../domain/entities';
import { appContext, reader } from '../services';
import { LoadingPage } from '../components/Skeleton';
import { useLiveQuery } from '../useLiveQuery';

const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

function percent(value: number | null): string {
  return value === null ? '—' : `${Math.round(value * 100)}%`;
}

/** Yes/no answer for today (section 6). */
export function HabitToggle({ view, today }: { view: HabitView; today: DayKey }) {
  return (
    <span className="warmup__actions">
      <button
        type="button"
        className={`small ${view.doneToday === true ? 'primary' : ''}`}
        aria-pressed={view.doneToday === true}
        onClick={() => void logHabit(appContext, view.habit.id, today, true)}
      >
        Sim
      </button>
      <button
        type="button"
        className={`small ${view.doneToday === false ? 'primary' : ''}`}
        aria-pressed={view.doneToday === false}
        onClick={() => void logHabit(appContext, view.habit.id, today, false)}
      >
        Não
      </button>
    </span>
  );
}

function HabitForm({
  initial,
  objectives,
  onSave,
  onCancel,
}: {
  initial: HabitFields;
  objectives: Objective[];
  onSave(fields: HabitFields): void;
  onCancel?(): void;
}) {
  const [fields, setFields] = useState(initial);
  return (
    <form
      className="habit-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (fields.name.trim()) onSave(fields);
      }}
    >
      <input
        className="text-input"
        value={fields.name}
        placeholder="Hábito, por exemplo: ler 10 páginas"
        onChange={(event) => setFields({ ...fields, name: event.target.value })}
        aria-label="Nome do hábito"
      />
      <input
        className="text-input"
        value={fields.criterion}
        placeholder="Critério de feito (opcional)"
        onChange={(event) => setFields({ ...fields, criterion: event.target.value })}
        aria-label="Critério de feito"
      />
      <span className="settings__days">
        {WEEK_ORDER.map((weekday) => (
          <label className="check-row" key={weekday}>
            <input
              type="checkbox"
              checked={fields.weekdays.includes(weekday)}
              onChange={(event) =>
                setFields({
                  ...fields,
                  weekdays: event.target.checked ? [...fields.weekdays, weekday] : fields.weekdays.filter((day) => day !== weekday),
                })
              }
            />
            {WEEKDAYS[weekday]}
          </label>
        ))}
      </span>
      <select
        className="text-input"
        value={fields.objectiveId ?? ''}
        onChange={(event) => setFields({ ...fields, objectiveId: event.target.value || null })}
        aria-label="Objetivo"
      >
        <option value="">sem objetivo</option>
        {objectives
          .filter((objective) => objective.status === 'active')
          .map((objective) => (
            <option key={objective.id} value={objective.id}>
              {objective.goal}
            </option>
          ))}
      </select>
      <span className="warmup__actions">
        <button type="submit" className="primary" disabled={!fields.name.trim()}>
          Salvar
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel}>
            Cancelar
          </button>
        )}
      </span>
    </form>
  );
}

const ALL_WEEK = [0, 1, 2, 3, 4, 5, 6];

/** Section 6: habits, logged as yes or no, with streak and completion. */
export function HabitsScreen({ today }: { today: DayKey }) {
  const views = useLiveQuery(() => loadHabits(reader, today), [today]);
  const objectives = useLiveQuery(() => reader.objectives()) ?? [];
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  if (!views) return <LoadingPage title="Hábitos" />;
  const active = views.filter((view) => view.habit.status === 'active');
  const archived = views.filter((view) => view.habit.status === 'archived');
  const fieldsOf = (habit: Habit): HabitFields => ({
    name: habit.name,
    criterion: habit.criterion,
    weekdays: habit.weekdays,
    objectiveId: habit.objectiveId,
  });

  return (
    <main className="page">
      <h1 className="page__title">Hábitos</h1>
      {active.length === 0 && !creating && <p className="muted">Nenhum hábito. Ao fechar o dia, uma tarefa também pode virar hábito.</p>}
      {active.length > 0 && (
        <ul className="card-list">
          {active.map((view) => (
            <li className="card-list__item card-list__item--stacked" key={view.habit.id}>
              {editing === view.habit.id ? (
                <HabitForm
                  initial={fieldsOf(view.habit)}
                  objectives={objectives}
                  onCancel={() => setEditing(null)}
                  onSave={(fields) => {
                    void updateHabit(appContext, view.habit.id, fields);
                    setEditing(null);
                  }}
                />
              ) : (
                <>
                  <div className="task-row">
                    <span className="task-row__text">
                      {view.habit.name}
                      {view.habit.criterion && <span className="muted"> · {view.habit.criterion}</span>}
                    </span>
                    {view.expectedToday ? <HabitToggle view={view} today={today} /> : <span className="muted">hoje não</span>}
                  </div>
                  <span className="muted habit__stats">
                    Semana: {percent(view.week.completion)} · Mês: {percent(view.month.completion)} · Maior sequência no mês:{' '}
                    {view.month.longestStreak}
                    {' · '}
                    <button type="button" className="link" onClick={() => setEditing(view.habit.id)}>
                      editar
                    </button>
                    {' · '}
                    <button type="button" className="link" onClick={() => void setHabitArchived(appContext, view.habit.id, true)}>
                      arquivar
                    </button>
                  </span>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      {creating ? (
        <div className="panel settings__panel">
          <HabitForm
            initial={{ name: '', criterion: '', weekdays: ALL_WEEK, objectiveId: null }}
            objectives={objectives}
            onCancel={() => setCreating(false)}
            onSave={(fields) => {
              void createHabit(appContext, fields);
              setCreating(false);
            }}
          />
        </div>
      ) : (
        <div className="assistant__actions">
          <button type="button" className="primary" onClick={() => setCreating(true)}>
            Novo hábito
          </button>
        </div>
      )}

      {archived.length > 0 && (
        <>
          <h2 className="card__subtitle">Arquivados</h2>
          <ul className="card-list">
            {archived.map((view) => (
              <li className="card-list__item" key={view.habit.id}>
                <span className="muted">{view.habit.name}</span>
                <button type="button" className="small" onClick={() => void setHabitArchived(appContext, view.habit.id, false)}>
                  Reativar
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
