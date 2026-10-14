import { useState } from 'react';
import { answerReminder, snoozeReminder } from '../../application/dayOpening';
import { askAgainAt } from '../../domain/dayFlow';
import type { Reminder } from '../../domain/entities';
import { formatTime } from '../format';
import { appContext } from '../services';
import {
  ChoiceDetail,
  ChoicePills,
  DecideLabel,
  StepFooter,
  StepQuestion,
  useStepKeys,
  type ChoiceOption,
  type StepProps,
} from './StepParts';

type ReminderChoice = { kind: 'keep' } | { kind: 'change'; time: string } | { kind: 'drop' };

const OPTIONS: ChoiceOption<ReminderChoice['kind']>[] = [
  { value: 'keep', label: 'Manter', suggested: true },
  { value: 'change', label: 'Mudar' },
  { value: 'drop', label: 'Largar' },
];

/**
 * Step "Lembretes" (section 3): one card per reminder ignored during the day: manter, mudar ou
 * largar. "Manter" comes first, since dropping takes the reminder out of circulation.
 */
export function ReminderStep({ reminders, busy, onBack, onNext }: Pick<StepProps, 'busy' | 'onBack' | 'onNext'> & { reminders: Reminder[] }) {
  const [index, setIndex] = useState(0);
  const [choices, setChoices] = useState<Map<string, ReminderChoice>>(new Map());
  const reminder = reminders[Math.min(index, reminders.length - 1)];
  const choice = choices.get(reminder.id) ?? { kind: 'keep' };
  const setChoice = (value: ReminderChoice) => setChoices((previous) => new Map(previous).set(reminder.id, value));
  const choose = (kind: ReminderChoice['kind']) => setChoice(kind === 'change' ? { kind, time: '09:00' } : { kind });

  const last = index >= reminders.length - 1;
  function next() {
    if (busy) return;
    if (!last) {
      setIndex(index + 1);
      return;
    }
    onNext(async () => {
      for (const [id, each] of choices) {
        if (each.kind === 'drop') await answerReminder(appContext, id, 'dropped');
        if (each.kind === 'change') await snoozeReminder(appContext, id, askAgainAt(new Date(), each.time));
      }
    }, { reminders: reminders.length });
  }
  const back = index > 0 ? () => setIndex(index - 1) : onBack;

  useStepKeys({ options: OPTIONS.length, onPick: (i) => choose(OPTIONS[i].value), onEnter: next });

  return (
    <>
      <div className="card__body checkout-step">
        <StepQuestion focusKey={reminder.id} eyebrow={`Lembrete ${index + 1} de ${reminders.length}`}>
          Este lembrete ficou sem resposta. O que fazer com ele?
        </StepQuestion>
        <div className="task-replica">
          <span className="task-replica__text">
            {reminder.text}
            <span className="task-replica__meta">Era para {formatTime(reminder.dueAt)}</span>
          </span>
        </div>
        <DecideLabel />
        <ChoicePills label={`O que fazer com "${reminder.text}"`} options={OPTIONS} value={choice.kind} onChange={choose} />
        <ChoiceDetail>
          {choice.kind === 'keep' && <span>Ele continua valendo como está.</span>}
          {choice.kind === 'change' && (
            <>
              <span>Pergunto de novo neste horário:</span>
              <input
                type="time"
                className="date-input"
                value={choice.time}
                onChange={(event) => setChoice({ kind: 'change', time: event.target.value })}
                aria-label="Novo horário"
              />
            </>
          )}
          {choice.kind === 'drop' && <span>Sai de circulação.</span>}
        </ChoiceDetail>
      </div>
      <StepFooter onBack={back} primary={last ? 'Seguir' : 'Próximo lembrete'} onPrimary={next} busy={busy} keysHint={OPTIONS.length} />
    </>
  );
}
