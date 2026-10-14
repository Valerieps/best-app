import { useEffect, useState } from 'react';
import { loadDayTriage, loadReminderQuestions } from '../../application/queries';
import { checkoutSteps, nextStep, previousStep, stepCounts, type CheckoutStep } from '../../domain/checkoutSteps';
import type { DayKey } from '../../domain/day';
import type { Objective, Project, Reminder } from '../../domain/entities';
import type { DayTriage } from '../../domain/triage';
import { LoadingPage } from '../components/Skeleton';
import { formatLongDate, relativeDay } from '../format';
import { navigate } from '../hooks';
import { loadLatest } from '../loadLatest';
import { reader } from '../services';
import { AttentionStep } from './AttentionStep';
import { ConfirmStep } from './ConfirmStep';
import { DoneCheckStep } from './DoneCheckStep';
import { PlanningStep } from './PlanningStep';
import { ReminderStep } from './ReminderStep';
import type { Resolved, StepProps } from './StepParts';
import { WhiteboardStep } from './WhiteboardStep';

interface Props {
  day: DayKey;
  today: DayKey;
}

const NOTHING_RESOLVED: Resolved = { doneNow: 0, attention: 0, whiteboards: 0, reminders: 0 };

function stepLabel(step: CheckoutStep, nextDay: DayKey, today: DayKey): string {
  switch (step) {
    case 'whiteboards':
      return 'Quadros brancos';
    case 'doneCheck':
      return 'Fez e não marcou?';
    case 'attention':
      return 'Pedem atenção';
    case 'reminders':
      return 'Lembretes';
    case 'confirm':
      return 'Confirmação do checkout';
    case 'planning': {
      const label = relativeDay(nextDay, today);
      return label.charAt(0).toUpperCase() + label.slice(1);
    }
  }
}

/**
 * The checkout in steps (spec/checkout.md, "Checkout em etapas"): one kind of decision per step,
 * skipping the steps with nothing to decide. Each step is saved when moving on, so leaving
 * halfway keeps what was decided, and coming back starts at the first step still pending.
 */
export function CheckoutScreen({ day, today }: Props) {
  const [triage, setTriage] = useState<DayTriage | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [remindersAnswered, setRemindersAnswered] = useState(false);
  const [plan, setPlan] = useState<CheckoutStep[]>([]);
  const [step, setStep] = useState<CheckoutStep | null>(null);
  const [resolved, setResolved] = useState<Resolved>(NOTHING_RESOLVED);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState<unknown>(undefined);

  useEffect(
    () =>
      loadLatest(
        () => Promise.all([loadDayTriage(reader, day, today), reader.projects(), reader.objectives(), loadReminderQuestions(reader, day)]),
        ([dayTriage, allProjects, allObjectives, questions]) => {
          const steps = checkoutSteps(stepCounts(dayTriage, questions.length));
          setProjects(allProjects);
          setObjectives(allObjectives);
          setReminders(questions);
          setTriage(dayTriage);
          setPlan(steps);
          setStep(steps[0]);
        },
        setLoadError,
      ),
    [day, today],
  );

  if (loadError !== undefined) throw loadError;
  if (!triage || !step) return <LoadingPage title={`Checkout · ${formatLongDate(day)}`} />;

  const reminderCount = (answered: boolean) => (answered ? 0 : reminders.length);
  const counts = stepCounts(triage, reminderCount(remindersAnswered));
  const previous = previousStep(plan, step, counts);
  const onBack = previous ? () => setStep(previous) : null;

  async function onNext(apply?: () => Promise<void>, settled?: Partial<Resolved>) {
    if (!step) return;
    setBusy(true);
    try {
      if (apply) await apply();
      const answered = remindersAnswered || step === 'reminders';
      const fresh = apply ? await loadDayTriage(reader, day, today) : triage!;
      setTriage(fresh);
      setRemindersAnswered(answered);
      if (settled) {
        setResolved((current) => ({
          doneNow: current.doneNow + (settled.doneNow ?? 0),
          attention: current.attention + (settled.attention ?? 0),
          whiteboards: current.whiteboards + (settled.whiteboards ?? 0),
          reminders: current.reminders + (settled.reminders ?? 0),
        }));
      }
      setStep(nextStep(plan, step, stepCounts(fresh, reminderCount(answered))) ?? 'planning');
    } finally {
      setBusy(false);
    }
  }

  const props: StepProps = { day, today, triage, projects, busy, onBack, onNext };
  const current = plan.indexOf(step);

  return (
    <main className="page page--wide">
      <div className="card">
        <header className="card__header">
          <button type="button" className="icon-button" onClick={() => navigate({ name: 'day' })} aria-label="Voltar para a nota do dia">
            ←
          </button>
          <h1 className="card__title">Checkout · {formatLongDate(day)}</h1>
          <span />
        </header>
        <nav className="checkout-stepper" aria-label="Etapas do checkout">
          <ol>
            {plan.map((each, index) => (
              <li
                key={each}
                className={index < current ? 'checkout-stepper__done' : index === current ? 'checkout-stepper__current' : ''}
                aria-current={index === current ? 'step' : undefined}
              >
                <span className="checkout-stepper__bar" aria-hidden="true" />
                <span className="checkout-stepper__label">{stepLabel(each, triage.nextDay, today)}</span>
              </li>
            ))}
          </ol>
        </nav>
        {step === 'whiteboards' && <WhiteboardStep key={step} {...props} />}
        {step === 'doneCheck' && <DoneCheckStep key={step} {...props} />}
        {step === 'attention' && <AttentionStep key={step} {...props} />}
        {step === 'reminders' && <ReminderStep key={step} reminders={reminders} busy={busy} onBack={onBack} onNext={onNext} />}
        {step === 'confirm' && <ConfirmStep key={step} {...props} objectives={objectives} resolved={resolved} />}
        {step === 'planning' && <PlanningStep key={step} day={day} target={triage.nextDay} today={today} onBack={onBack} />}
      </div>
    </main>
  );
}
