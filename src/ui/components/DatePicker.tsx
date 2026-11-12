import { useRef } from 'react';
import type { DayKey } from '../../domain/day';

/** A hidden date field opened by a button: a shortcut, or the chip of a date already set. */
export function DatePicker({
  label,
  value,
  min,
  onChange,
  className,
  children,
  clearLabel,
}: {
  label: string;
  value: DayKey | null;
  min?: DayKey;
  onChange(date: DayKey | null): void;
  className: string;
  children: string;
  /** With a date set, shows a × that clears it, instead of relying on the calendar's own button (issue #70). */
  clearLabel?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <span className="line__picker">
      <button
        type="button"
        className={className}
        title={label}
        aria-label={label}
        onClick={() => {
          const input = ref.current;
          if (!input) return;
          if (typeof input.showPicker === 'function') input.showPicker();
          else input.focus();
        }}
      >
        {children}
      </button>
      <input
        ref={ref}
        type="date"
        className="line__date-input"
        tabIndex={-1}
        aria-hidden="true"
        min={min}
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value || null)}
      />
      {clearLabel && value && (
        <button type="button" className="line__clear line__reveal" title={clearLabel} aria-label={clearLabel} onClick={() => onChange(null)}>
          ×
        </button>
      )}
    </span>
  );
}
