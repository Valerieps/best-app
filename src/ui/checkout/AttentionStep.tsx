import { useState } from 'react';
import { applyTriage } from '../../application/checkout';
import { attentionReason } from '../../domain/checkoutSteps';
import { addDays } from '../../domain/day';
import type { TaskDecision } from '../../domain/triage';
import { ProjectChip } from '../components/Chips';
import { FEATURES } from '../features';
import { relativeDay } from '../format';
import { appContext } from '../services';
import {
  ChoiceDetail,
  ChoicePills,
  DecideLabel,
  noDecisions,
  StepFooter,
  StepQuestion,
  TaskReplica,
  useStepKeys,
  type ChoiceOption,
  type StepProps,
} from './StepParts';

type Choice = 'reflection' | 'next' | 'other' | 'archive' | 'abandon' | 'habit' | 'finish' | 'keep';

function choiceOf(decision: TaskDecision, nextDay: string): Choice {
  if (decision.kind === 'schedule') return decision.date === nextDay ? 'next' : 'other';
  return decision.kind;
}

/**
 * Step "Pedem atenção": one card per task postponed too often or with a deadline before
 * "dia seguinte". Archiving and abandoning are offered, never suggested.
 */
export function AttentionStep({ day, today, triage, projects, busy, onBack, onNext }: StepProps) {
  const rows = triage.rows;
  const [index, setIndex] = useState(0);
  const [decisions, setDecisions] = useState<Map<string, TaskDecision>>(new Map());
  const nextDay = triage.nextDay;
  const nextLabel = relativeDay(nextDay, today);

  const row = rows[Math.min(index, rows.length - 1)];
  const decision = decisions.get(row.task.id) ?? row.suggestion;
  const choice = choiceOf(decision, nextDay);
  const suggested = choiceOf(row.suggestion, nextDay);
  const setDecision = (value: TaskDecision) => setDecisions((previous) => new Map(previous).set(row.task.id, value));

  const waiting = row.task.waiting === true;
  // Something a person owes me: follow up, or leave it as it is (spec/pessoas.md).
  const waitingOptions: ChoiceOption<Choice>[] = [
    { value: 'keep', label: 'Deixar como está' },
    { value: 'next', label: `Cobrar ${nextLabel}` },
    { value: 'other', label: 'Cobrar em outra data' },
    { value: 'finish', label: 'Concluir' },
    { value: 'abandon', label: 'Abandonar' },
  ];
  const options: ChoiceOption<Choice>[] = (
    waiting ? waitingOptions : [
      { value: 'reflection', label: 'Revisão de Foco' },
      { value: 'next', label: nextLabel.charAt(0).toUpperCase() + nextLabel.slice(1) },
      { value: 'other', label: 'Outra data' },
      { value: 'archive', label: 'Arquivar' },
      { value: 'abandon', label: 'Abandonar' },
      ...(FEATURES.habits ? [{ value: 'habit' as const, label: 'Virar hábito' }] : []),
    ] as ChoiceOption<Choice>[]
  ).map((option) => ({ ...option, suggested: option.value === suggested }));

  const choose = (value: Choice) => {
    if (value === 'next') setDecision({ kind: 'schedule', date: nextDay });
    // "Outra data" starts one day after "dia seguinte", then the date field changes it.
    else if (value === 'other') setDecision({ kind: 'schedule', date: addDays(nextDay, 1) });
    else setDecision({ kind: value });
  };

  const last = index >= rows.length - 1;
  function next() {
    if (busy) return;
    if (!last) {
      setIndex(index + 1);
      return;
    }
    const tasks = new Map<string, TaskDecision>(rows.map((each) => [each.task.id, decisions.get(each.task.id) ?? each.suggestion]));
    onNext(() => applyTriage(appContext, day, { ...noDecisions(), tasks }), { attention: rows.length });
  }
  const back = index > 0 ? () => setIndex(index - 1) : onBack;

  useStepKeys({ options: options.length, onPick: (i) => choose(options[i].value), onEnter: next });

  const reason = attentionReason(row.task);
  const project = projects.find((each) => each.id === row.task.projectId);
  const sectionName = row.section ? (row.section.title ?? 'Sem título') : 'De outros dias';

  return (
    <>
      <div className="card__body checkout-step">
        <StepQuestion focusKey={row.task.id} eyebrow={`Tarefa ${index + 1} de ${rows.length} que pede atenção`}>
          {reason === 'waiting'
            ? 'Você ainda está aguardando isto. O que fazer?'
            : reason === 'postponed'
            ? `Você já adiou esta tarefa ${row.task.postponeCount} vezes. O que fazer com ela?`
            : `O prazo desta tarefa ${(row.task.deadline ?? nextDay) < today ? 'era' : 'é'} ${relativeDay(row.task.deadline ?? nextDay, today)}. O que fazer com ela?`}
        </StepQuestion>
        <TaskReplica
          task={row.task}
          meta={
            <>
              {row.section ? `Da seção ${sectionName}` : sectionName}
              {project && (
                <>
                  {' '}
                  <ProjectChip name={project.name} />
                </>
              )}
            </>
          }
        />
        <DecideLabel />
        <ChoicePills label={`Destino de "${row.task.text}"`} options={options} value={choice} onChange={choose} />
        <ChoiceDetail>
          {choice === 'reflection' && <span>Ela espera a próxima Revisão de Foco, onde você decide com calma.</span>}
          {choice === 'keep' && <span>Continua aguardando, sem data para cobrar. Fica na página da pessoa.</span>}
          {choice === 'finish' && waiting && <span>Chegou: a tarefa é concluída.</span>}
          {choice === 'next' && <span>{waiting ? `Aparece na nota de ${nextLabel} para você cobrar.` : `Volta para a nota de ${nextLabel}.`}</span>}
          {choice === 'other' && decision.kind === 'schedule' && (
            <>
              <span>Escolha o dia:</span>
              <input
                type="date"
                className="date-input"
                min={today}
                value={decision.date}
                onChange={(event) => event.target.value && setDecision({ kind: 'schedule', date: event.target.value })}
                aria-label={waiting ? 'Outra data para cobrar' : 'Outra data de intenção'}
              />
            </>
          )}
          {choice === 'archive' && <span>Sai das tarefas que podem ser escolhidas para um dia. Dá para reativar depois.</span>}
          {choice === 'abandon' && <span>Sai de circulação sem ser feita. O histórico guarda o abandono.</span>}
          {choice === 'habit' && <span>Cria um hábito com o nome desta tarefa.</span>}
        </ChoiceDetail>
      </div>
      <StepFooter onBack={back} primary={last ? 'Seguir' : 'Próxima tarefa'} onPrimary={next} busy={busy} keysHint={options.length} />
    </>
  );
}
