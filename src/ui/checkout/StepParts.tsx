import { useEffect, useRef, type ReactNode } from 'react';
import type { TriageDecisions } from '../../application/checkout';
import type { DayKey } from '../../domain/day';
import type { Block, Project } from '../../domain/entities';
import type { DayTriage } from '../../domain/triage';
import { Icon, type IconName } from '../components/Icon';
import { Linkified } from '../components/Linkified';

/** Pieces shared by the steps of the checkout (spec/checkout.md, "Fechamento em etapas"). */

export interface ChoiceOption<T extends string> {
  value: T;
  label: string;
  /** Shown in place of the label, which becomes the tooltip. */
  icon: IconName;
  suggested?: boolean;
}

/** One decision as a row of icon pills, named by their tooltip; the number keys pick them, in order. */
export function ChoicePills<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly ChoiceOption<T>[];
  value: T;
  onChange(value: T): void;
}) {
  return (
    <div className="choice-pills" role="radiogroup" aria-label={label}>
      {options.map((option, index) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          className={`choice-pill icon-action ${option.value === value ? 'choice-pill--on' : ''}`}
          aria-label={option.suggested ? `${option.label} (sugerido)` : option.label}
          data-tip={option.suggested ? `${option.label} (sugerido)` : option.label}
          onClick={() => onChange(option.value)}
        >
          <kbd className="choice-pill__key">{index + 1}</kbd>
          <Icon name={option.icon} />
          {option.suggested && <span className="choice-pill__tag">sugerido</span>}
        </button>
      ))}
    </div>
  );
}

/** What the chosen pill does, and the field it needs, if any. */
export function ChoiceDetail({ children }: { children: ReactNode }) {
  return <div className="choice-detail">{children}</div>;
}

const NO_ENTER = 'button, select, textarea, a, [contenteditable], input[type="date"], input[type="time"], input[type="checkbox"]';
const TYPING = 'input, select, textarea, [contenteditable]';

/** Number keys pick an option and Enter moves on, unless the focus is in a field or on a button. */
export function useStepKeys({ options, onPick, onEnter }: { options?: number; onPick?(index: number): void; onEnter?(): void }) {
  const latest = useRef({ options, onPick, onEnter });
  latest.current = { options, onPick, onEnter };
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.ctrlKey || event.metaKey || event.altKey || event.defaultPrevented) return;
      const target = event.target instanceof Element ? event.target : null;
      const { options: count, onPick: pick, onEnter: enter } = latest.current;
      if (pick && count && /^[1-9]$/.test(event.key) && Number(event.key) <= count && !target?.matches(TYPING)) {
        event.preventDefault();
        pick(Number(event.key) - 1);
      } else if (event.key === 'Enter' && enter && !target?.matches(NO_ENTER)) {
        event.preventDefault();
        enter();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

/**
 * The step's question, with nothing above it. A step that walks through items one by one shows
 * where it is ("2/5") on the right. It takes the focus whenever `focusKey` changes, so a new card
 * is read first.
 */
export function StepQuestion({ focusKey, progress, children }: { focusKey: string; progress?: { index: number; total: number }; children: ReactNode }) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => ref.current?.focus({ preventScroll: true }), [focusKey]);
  return (
    <div className="checkout-step__head">
      <h2 className="checkout-step__question" tabIndex={-1} ref={ref}>
        {children}
      </h2>
      {progress && progress.total > 1 && (
        <span className="checkout-step__progress" aria-label={`${progress.index + 1} de ${progress.total}`}>
          {progress.index + 1}/{progress.total}
        </span>
      )}
    </div>
  );
}

/** A task as it looks in the day note: read only, with an empty box. */
export function TaskReplica({ task, meta }: { task: Block; meta?: ReactNode }) {
  return (
    <div className="task-replica">
      <span className="task-box" aria-hidden="true" />
      <span className="task-replica__text">
        <Linkified text={task.text || '(tarefa sem texto)'} />
        {meta && <span className="task-replica__meta">{meta}</span>}
      </span>
    </div>
  );
}

export function StepFooter({
  onBack,
  primary,
  onPrimary,
  busy,
  keysHint,
}: {
  onBack?: (() => void) | null;
  primary: ReactNode;
  onPrimary(): void;
  busy: boolean;
  /** How many choice pills the step has, to show their number keys in the hint. */
  keysHint?: number;
}) {
  return (
    <footer className="card__footer">
      {onBack ? (
        <button type="button" onClick={onBack} disabled={busy}>
          Voltar
        </button>
      ) : (
        <span />
      )}
      <span className="checkout-step__hint">
        {keysHint && (
          <>
            <kbd>1</kbd>–<kbd>{keysHint}</kbd> escolhem ·{' '}
          </>
        )}
        <kbd>Enter</kbd> segue
      </span>
      <button type="button" className="primary" onClick={onPrimary} disabled={busy}>
        {primary}
      </button>
    </footer>
  );
}

export interface StepProps {
  day: DayKey;
  today: DayKey;
  triage: DayTriage;
  projects: Project[];
  busy: boolean;
  /** Null on the first step. */
  onBack: (() => void) | null;
  /** Saves the step (`apply`) and moves to the next step that still has something to decide. */
  onNext(apply?: () => Promise<void>): void;
}

export function noDecisions(): TriageDecisions {
  return { tasks: new Map(), notes: new Map(), whiteboards: new Map() };
}
