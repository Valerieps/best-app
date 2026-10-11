import type { Reminder } from '../../domain/entities';
import { Segmented } from '../components/Segmented';

export type ReminderChoice = { kind: 'keep' } | { kind: 'change'; time: string } | { kind: 'drop' };

interface Props {
  reminders: Reminder[];
  choices: Map<string, ReminderChoice>;
  onChange(id: string, choice: ReminderChoice): void;
}

/**
 * Section 3: a reminder ignored during the day becomes a question at the checkout: manter,
 * mudar ou largar. "Manter" is the default, since dropping takes it out of circulation.
 */
export function ReminderQuestions({ reminders, choices, onChange }: Props) {
  if (reminders.length === 0) return null;
  return (
    <>
      <h2 className="card__subtitle">Lembretes que ficaram sem resposta</h2>
      <div className="triage-group">
        {reminders.map((reminder) => {
          const choice = choices.get(reminder.id) ?? { kind: 'keep' };
          return (
            <div className="triage-row" key={reminder.id}>
              <span className="triage-row__label">{reminder.text}</span>
              <span className="triage-row__controls">
                <Segmented<ReminderChoice['kind']>
                  label={`O que fazer com "${reminder.text}"`}
                  value={choice.kind}
                  options={[
                    { value: 'keep', label: 'Manter' },
                    { value: 'change', label: 'Mudar' },
                    { value: 'drop', label: 'Largar' },
                  ]}
                  onChange={(kind) =>
                    onChange(reminder.id, kind === 'change' ? { kind, time: '09:00' } : { kind } as ReminderChoice)
                  }
                />
                {choice.kind === 'change' && (
                  <input
                    type="time"
                    className="date-input"
                    value={choice.time}
                    onChange={(event) => onChange(reminder.id, { kind: 'change', time: event.target.value })}
                    aria-label="Novo horário"
                  />
                )}
              </span>
            </div>
          );
        })}
      </div>
    </>
  );
}
