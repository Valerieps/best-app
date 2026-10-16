import { useEffect, useState } from 'react';
import { loadDayTriage, loadReminderQuestions } from '../../application/queries';
import { checkoutSteps, nextStep, previousStep, stepCounts, type CheckoutStep } from '../../domain/checkoutSteps';
import type { DayKey } from '../../domain/day';
import type { Project, Reminder } from '../../domain/entities';
import type { DayTriage } from '../../domain/triage';
import { BackButton } from '../components/ScreenHeader';
import { LoadingPage } from '../components/Skeleton';
import { formatLongDate, relativeDay } from '../format';
import { navigate, type Route } from '../hooks';
import { loadLatest } from '../loadLatest';
import { reader } from '../services';
import { PlanningStep } from './PlanningStep';
import { ReminderStep } from './ReminderStep';
import type { StepProps } from './StepParts';
import { TriageStep } from './TriageStep';

interface Props {
  day: DayKey;
  today: DayKey;
  /** Where the closing started, and goes back to: the day note, or "Rituais". */
  from?: 'rituals';
}

function stepLabel(step: CheckoutStep, nextDay: DayKey, today: DayKey): string {
  switch (step) {
    case 'triage':
      return 'Tarefas';
    case 'reminders':
      return 'Lembretes';
    case 'planning': {
      const label = relativeDay(nextDay, today);
      return label.charAt(0).toUpperCase() + label.slice(1);
    }
  }
}

/**
 * The checkout in steps (spec/checkout.md, "Fechamento em etapas"): one kind of decision per
 * step, skipping the steps with nothing to decide. Each step is saved when moving on, so leaving
 * halfway keeps what was decided, and coming back starts at the first step still pending.
 */
export function CheckoutScreen({ day, today, from }: Props) {
  const [triage, setTriage] = useState<DayTriage | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [remindersAnswered, setRemindersAnswered] = useState(false);
  const [plan, setPlan] = useState<CheckoutStep[]>([]);
  const [step, setStep] = useState<CheckoutStep | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState<unknown>(undefined);
  // The day note opens on today, which starts over if it was the day closed.
  const origin: Route = from === 'rituals' ? { name: 'rituals' } : { name: 'day' };

  useEffect(
    () =>
      loadLatest(
        () => Promise.all([loadDayTriage(reader, day, today), reader.projects(), loadReminderQuestions(reader, day)]),
        ([dayTriage, allProjects, questions]) => {
          const steps = checkoutSteps(stepCounts(dayTriage, questions.length));
          setProjects(allProjects);
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
  if (!triage || !step) return <LoadingPage title={`Fechar o dia · ${formatLongDate(day)}`} />;

  const reminderCount = (answered: boolean) => (answered ? 0 : reminders.length);
  const counts = stepCounts(triage, reminderCount(remindersAnswered));
  const previous = previousStep(plan, step, counts);
  const onBack = previous ? () => setStep(previous) : null;

  /** Saves a batch of the current step and reloads the triage, staying on the step. */
  async function onApply(apply: () => Promise<void>) {
    setBusy(true);
    try {
      await apply();
      setTriage(await loadDayTriage(reader, day, today));
    } finally {
      setBusy(false);
    }
  }

  async function onNext(apply?: () => Promise<void>) {
    if (!step) return;
    setBusy(true);
    try {
      if (apply) await apply();
      const answered = remindersAnswered || step === 'reminders';
      const fresh = apply ? await loadDayTriage(reader, day, today) : triage!;
      setTriage(fresh);
      setRemindersAnswered(answered);
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
          <BackButton
            action={{ label: from === 'rituals' ? 'Rituais' : 'a nota do dia', onSelect: () => navigate(origin) }}
          />
          <h1 className="card__title">Fechar o dia · {formatLongDate(day)}</h1>
          <span />
        </header>
        <nav className="checkout-stepper" aria-label="Etapas do fechamento">
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
        {step === 'triage' && <TriageStep key={step} {...props} onApply={onApply} />}
        {step === 'reminders' && <ReminderStep key={step} reminders={reminders} busy={busy} onBack={onBack} onNext={onNext} />}
        {step === 'planning' && (
          <PlanningStep key={step} day={day} target={triage.nextDay} today={today} onBack={onBack} onDone={() => navigate(origin)} />
        )}
      </div>
    </main>
  );
}
