import { useEffect, useRef, useState, type ReactNode } from 'react';

interface Props {
  /** Content of the button that opens the list. */
  trigger: ReactNode;
  label: string;
  /** Renders the list; call `close` after an option is chosen. */
  children(close: () => void): ReactNode;
  align?: 'left' | 'right';
  className?: string;
}

/** A button that opens a small list below it. Closes on outside click and on Escape. */
export function Dropdown({ trigger, label, children, align = 'right', className = '' }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className={`dropdown ${className}`} ref={ref}>
      <button type="button" className="dropdown__trigger" aria-haspopup="menu" aria-expanded={open} aria-label={label} onClick={() => setOpen(!open)}>
        {trigger}
      </button>
      {open && (
        <div className={`dropdown__list dropdown__list--${align}`} role="menu">
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

export function DropdownItem({ onSelect, children, badge }: { onSelect(): void; children: ReactNode; badge?: ReactNode }) {
  return (
    <button type="button" role="menuitem" className="dropdown__item" onClick={onSelect}>
      <span>{children}</span>
      {badge}
    </button>
  );
}
