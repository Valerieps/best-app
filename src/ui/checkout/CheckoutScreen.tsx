import { useEffect, useState } from 'react';
import { applyTriage, completeCheckout, defaultClosingDecisions } from '../../application/checkout';
import type { Reader } from '../../application/ports';
import { loadDayTriage, loadPlanning, loadReminderQuestions } from '../../application/queries';
import { checkoutSteps, nextStep, previousStep, stepCounts, type CheckoutStep } from '../../domain/checkoutSteps';
import type { DayKey } from '../../domain/day';
import type { Project, Reminder } from '../../domain/entities';
import type { DayTriage } from '../../domain/triage';
import { Fireworks, playPlim } from '../components/Celebration';
import { BackButton } from '../components/ScreenHeader';
import { LoadingPage } from '../components/Skeleton';
import { formatLongDate } from '../format';
import { navigate, type Route } from '../hooks';
import { loadLatest } from '../loadLatest';
import { appContext, reader } from '../services';
import { BoardStep } from './BoardStep';
import { ReminderStep } from './ReminderStep';

interface Props {
  day: DayKey;
  today: DayKey;
  /** Where the closing started, and goes back to: the day note, or "Rituais". */
  from?: 'rituals';
}

const STEP_LABELS: Record<CheckoutStep, string> = { late: 'Atrasadas', triage: 'Tarefas', reminders: 'Lembretes' };

/** How many late tasks the first board has: dated before today, and not in the triage of the day. */
async function countLate(source: Reader, triage: DayTriage, today: DayKey): Promise<number> {
  const view = await loadPlanning(source, triage.nextDay, today, { exclude: new Set(triage.rows.map((row) => row.task.id)) });
  return view.columns.find(({ column }) => column.kind === 'late')?.items.length ?? 0;
}

/**
 * The checkout in steps (spec/checkout.md, "Fechamento em etapas"): one kind of decision per
 * step, skipping the steps with nothing to decide. Each step is saved when moving on, so leaving
 * halfway keeps what was decided, and coming back starts at the first step still pending.
 */
export function CheckoutScreen({ day, today, from }: Props) {
  const [triage, setTriage] = useState<DayTriage | null>(null);
  const [late, setLate] = useState(0);
  const [celebrating, setCelebrating] = useState(false);
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
        async () => {
          const [dayTriage, allProjects, questions] = await Promise.all([
            loadDayTriage(reader, day, today),
            reader.projects(),
            loadReminderQuestions(reader, day),
          ]);
          return [dayTriage, allProjects, questions, await countLate(reader, dayTriage, today)] as const;
        },
        ([dayTriage, allProjects, questions, lateCount]) => {
          const steps = checkoutSteps(stepCounts(lateCount, questions.length));
          setLate(lateCount);
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
  const counts = stepCounts(late, reminderCount(remindersAnswered));
  const previous = previousStep(plan, step, counts);
  const onBack = previous ? () => setStep(previous) : null;
  const last = nextStep(plan, step, counts) === null;
  const primary = last ? 'Finalizar meu dia ✦' : 'Seguir';

  /** Saves the step (`apply`), then moves to the next step with something to decide, or finishes the day. */
  async function onNext(apply: () => Promise<void>) {
    if (!step) return;
    setBusy(true);
    try {
      await apply();
      const fresh = await loadDayTriage(reader, day, today);
      if (last) {
        // Whatever is still open (a task added meanwhile, or the notes) is settled.
        await applyTriage(appContext, day, defaultClosingDecisions(fresh));
        await completeCheckout(appContext, day);
        playPlim();
        setCelebrating(true);
        return;
      }
      const answered = remindersAnswered || step === 'reminders';
      const lateCount = await countLate(reader, fresh, today);
      setTriage(fresh);
      setLate(lateCount);
      setRemindersAnswered(answered);
      setStep(nextStep(plan, step, stepCounts(lateCount, reminderCount(answered))) ?? 'triage');
    } finally {
      setBusy(false);
    }
  }

  const current = plan.indexOf(step);

  return (
    <main className="page page--full">
      <div className="card card--plain">
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
                <span className="checkout-stepper__label">{STEP_LABELS[each]}</span>
              </li>
            ))}
          </ol>
        </nav>
        {(step === 'late' || step === 'triage') && (
          <BoardStep
            key={step}
            mode={step}
            day={day}
            today={today}
            triage={triage}
            projects={projects}
            busy={busy}
            onBack={onBack}
            onNext={onNext}
            primary={primary}
          />
        )}
        {step === 'reminders' && (
          <ReminderStep key={step} reminders={reminders} busy={busy} onBack={onBack} onNext={onNext} primary={primary} />
        )}
      </div>
      {celebrating && <Fireworks onDone={() => navigate(origin)} />}
    </main>
  );
}
