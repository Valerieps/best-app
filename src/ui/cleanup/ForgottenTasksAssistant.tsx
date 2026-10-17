import { useState } from 'react';
import { planForgottenTasks, resolveForgottenTasks, type ForgottenTaskAction } from '../../application/assistants';
import type { TaskListItem } from '../../application/queries';
import { daysBetween, toDayKey, type DayKey } from '../../domain/day';
import type { DayTriage, TaskRow } from '../../domain/triage';
import { BoardStep } from '../checkout/BoardStep';
import { ProjectChip } from '../components/Chips';
import { Linkified } from '../components/Linkified';
import { Segmented } from '../components/Segmented';
import { plural } from '../format';
import { appContext, reader } from '../services';
import { useLiveQuery } from '../useLiveQuery';

/** "Colocar data" waits for the board; the other two are saved on "Seguir". */
type Choice = ForgottenTaskAction | 'date';

/** Today and the three days after it, since the assistant is opened during the day. */
const BOARD_DAYS = 4;

/**
 * "Tarefas esquecidas" (spec/assistentes.md): no action comes chosen, because this triage must
 * be intentional. "Seguir" abandons and converts into notes what I marked; the tasks marked
 * "Colocar data" then go to the board of "Fechar o dia", where I drag each one to a day. A task
 * I leave alone, here or in "Sem data" on the board, stays as it is.
 */
export function ForgottenTasksAssistant({ items, today, onDone }: { items: TaskListItem[]; today: DayKey; onDone(): void }) {
  const [choices, setChoices] = useState<Map<string, Choice>>(new Map());
  const [busy, setBusy] = useState(false);
  // A snapshot: once saved, the tasks dated on the board leave the assistant's live list.
  const [toDate, setToDate] = useState<TaskListItem[] | null>(null);
  const projects = useLiveQuery(() => reader.projects()) ?? [];

  async function next() {
    if (busy) return;
    setBusy(true);
    try {
      const now = new Map<string, ForgottenTaskAction>();
      for (const [id, choice] of choices) if (choice !== 'date') now.set(id, choice);
      if (now.size > 0) await resolveForgottenTasks(appContext, now);
      const dated = items.filter((item) => choices.get(item.task.id) === 'date');
      if (dated.length > 0) setToDate(dated);
      else onDone();
    } finally {
      setBusy(false);
    }
  }

  if (toDate) {
    const rows: TaskRow[] = toDate.map((item) => ({
      type: 'task',
      task: item.task,
      section: item.origin,
      // Left in "Sem data", a task stays as it was.
      suggestion: { kind: 'keep' },
      attention: false,
    }));
    const triage: DayTriage = { day: today, nextDay: today, rows, automatic: [], open: [] };
    return (
      <div className="card">
        <BoardStep
          mode="triage"
          day={today}
          today={today}
          triage={triage}
          projects={projects}
          busy={busy}
          onBack={null}
          primary="Concluir"
          question="Para quando vão as tarefas?"
          dayColumns={BOARD_DAYS}
          onSave={(decisions, changes) => planForgottenTasks(appContext, decisions, changes)}
          onNext={(apply) => {
            setBusy(true);
            void apply()
              .then(onDone)
              .finally(() => setBusy(false));
          }}
        />
      </div>
    );
  }

  const chosen = [...choices.values()];
  return (
    <section className="assistant">
      <ul className="card-list">
        {items.map(({ task, project }) => {
          const age = daysBetween(toDayKey(new Date(task.createdAt)), today);
          return (
            <li className="card-list__item card-list__item--stacked" key={task.id}>
              <div className="triage-row triage-row--flush">
                <span className="triage-row__label">
                  <Linkified text={task.text || '(tarefa sem texto)'} />{' '}
                  {project && <ProjectChip name={project.name} />}{' '}
                  <span className="muted">criada há {plural(age, 'dia', 'dias')}</span>
                </span>
                <Segmented<Choice>
                  label={`Ação para “${task.text}”`}
                  value={choices.get(task.id) ?? null}
                  options={[
                    { value: 'date', label: 'Colocar data' },
                    { value: 'note', label: 'Converter em nota' },
                    { value: 'abandon', label: 'Abandonar' },
                  ]}
                  onChange={(value) =>
                    setChoices((previous) => {
                      const updated = new Map(previous);
                      // Clicking the chosen action again takes the choice back.
                      if (updated.get(task.id) === value) updated.delete(task.id);
                      else updated.set(task.id, value);
                      return updated;
                    })
                  }
                />
              </div>
            </li>
          );
        })}
      </ul>
      <div className="assistant__actions">
        <span className="muted">
          {chosen.length === 0
            ? 'Nenhuma ação escolhida: as tarefas sem escolha ficam como estão.'
            : `${plural(chosen.length, 'tarefa', 'tarefas')} com ação escolhida.`}
        </span>
        <button type="button" className="primary" onClick={next} disabled={busy || chosen.length === 0}>
          Seguir
        </button>
      </div>
    </section>
  );
}
