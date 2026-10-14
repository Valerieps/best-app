import { useState } from 'react';
import { applyTriage } from '../../application/checkout';
import type { TaskDecision, TaskRow } from '../../domain/triage';
import { KindChip, ProjectChip } from '../components/Chips';
import { Linkified } from '../components/Linkified';
import { plural, postponedLabel } from '../format';
import { appContext } from '../services';
import { noDecisions, StepFooter, StepQuestion, useStepKeys, type StepProps } from './StepParts';

/** Consecutive task rows from the same section (or from other days), in the day note's order. */
export function groupBySection(rows: readonly TaskRow[]): TaskRow[][] {
  const groups: TaskRow[][] = [];
  for (const row of rows) {
    const last = groups.at(-1);
    if (last && last[0].section?.id === row.section?.id) last.push(row);
    else groups.push([row]);
  }
  return groups;
}

export function SectionHeading({ row }: { row: TaskRow }) {
  if (!row.section) return <h3 className="checkout-group__title">De outros dias</h3>;
  return (
    <h3 className="checkout-group__title">
      <KindChip kind={row.section.kind} /> {row.section.title ?? 'Sem título'}
      {row.section.projectId && <ProjectChip />}
    </h3>
  );
}

/** Step "Fez e não marcou?": one checklist for every task not finished, a single decision. */
export function DoneCheckStep({ day, triage, busy, onBack, onNext }: StepProps) {
  const rows = triage.rows.filter((row): row is TaskRow => row.type === 'task');
  const [done, setDone] = useState<Set<string>>(new Set());
  const finishedDuringDay = triage.automatic.filter((item) => item.type === 'finishedDuringDay').length;

  function toggle(id: string, checked: boolean) {
    setDone((previous) => {
      const updated = new Set(previous);
      if (checked) updated.add(id);
      else updated.delete(id);
      return updated;
    });
  }

  function next() {
    if (busy) return;
    if (done.size === 0) {
      onNext();
      return;
    }
    const tasks = new Map<string, TaskDecision>([...done].map((id) => [id, { kind: 'finish' }]));
    onNext(() => applyTriage(appContext, day, { ...noDecisions(), tasks }), { doneNow: done.size });
  }
  useStepKeys({ onEnter: next });

  return (
    <>
      <div className="card__body checkout-step">
        <StepQuestion focusKey="doneCheck" eyebrow="Tarefas não finalizadas">
          Você fez alguma destas e não marcou?
        </StepQuestion>
        <p className="muted">Marque só as que fez. As outras seguem com a sugestão do app.</p>
        {groupBySection(rows).map((group) => (
          <div className="checkout-group" key={group[0].task.id}>
            <SectionHeading row={group[0]} />
            {group.map((row) => {
              const postponed = postponedLabel(row.task.postponeCount);
              const checked = done.has(row.task.id);
              return (
                <label className={`checkout-check ${checked ? 'checkout-check--on' : ''}`} key={row.task.id}>
                  <input type="checkbox" checked={checked} onChange={(event) => toggle(row.task.id, event.target.checked)} />
                  <span className="checkout-check__text">
                    <Linkified text={row.task.text || '(tarefa sem texto)'} />
                    {postponed && <span className="checkout-check__meta">{postponed}</span>}
                  </span>
                </label>
              );
            })}
          </div>
        ))}
        {finishedDuringDay > 0 && (
          <p className="muted checkout-step__note">
            {plural(finishedDuringDay, 'tarefa finalizada', 'tarefas finalizadas')} durante o dia já{' '}
            {finishedDuringDay === 1 ? 'saiu' : 'saíram'} da triagem.
          </p>
        )}
      </div>
      <StepFooter
        onBack={onBack}
        primary={done.size > 0 ? `Marcar ${done.size} como ${done.size === 1 ? 'feita' : 'feitas'} e seguir` : 'Não fiz nenhuma, seguir'}
        onPrimary={next}
        busy={busy}
      />
    </>
  );
}
