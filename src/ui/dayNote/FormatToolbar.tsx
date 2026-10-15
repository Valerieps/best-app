import type { MouseEvent, ReactNode } from 'react';
import { Icon } from '../components/Icon';
import { FORMAT_EVENT, FORMAT_SHORTCUTS, type FormatCommand } from './markdown';

const BUTTONS: { command: FormatCommand; label: string; content: ReactNode }[] = [
  { command: 'bold', label: 'Negrito', content: <Icon name="bold" size="sm" /> },
  { command: 'italic', label: 'Itálico', content: <Icon name="italic" size="sm" /> },
  { command: 'h1', label: 'Título 1', content: 'H1' },
  { command: 'h2', label: 'Título 2', content: 'H2' },
  { command: 'h3', label: 'Título 3', content: 'H3' },
  { command: 'h4', label: 'Título 4', content: 'H4' },
  { command: 'bullet', label: 'Lista', content: <Icon name="list" size="sm" /> },
  { command: 'numbered', label: 'Lista numerada', content: <Icon name="listNumbers" size="sm" /> },
  { command: 'outdent', label: 'Diminuir o recuo da lista', content: <Icon name="indentDecrease" size="sm" /> },
  { command: 'indent', label: 'Aumentar o recuo da lista', content: <Icon name="indentIncrease" size="sm" /> },
  { command: 'link', label: 'Link', content: <Icon name="link" size="sm" /> },
];

/**
 * The line a toolbar button formats: the line being edited in the toolbar's section or, with
 * none, the section's last line (its empty first line, in a section with no lines yet).
 */
function targetLine(toolbar: HTMLElement): HTMLTextAreaElement | null {
  const section = toolbar.closest('.section');
  if (!section) return null;
  const active = document.activeElement;
  if (active instanceof HTMLTextAreaElement && active.classList.contains('line__text') && section.contains(active)) return active;
  const lines = section.querySelectorAll<HTMLTextAreaElement>('.line__text');
  return lines[lines.length - 1] ?? null;
}

/** Discreet formatting buttons at the right of a section's header (spec/nota-do-dia.md, "Formatação"). */
export function FormatToolbar() {
  function run(event: MouseEvent<HTMLButtonElement>, command: FormatCommand) {
    const line = targetLine(event.currentTarget);
    if (!line) return;
    if (document.activeElement !== line) {
      line.focus();
      line.setSelectionRange(line.value.length, line.value.length);
    }
    line.dispatchEvent(new CustomEvent(FORMAT_EVENT, { detail: command }));
  }

  return (
    <span className="format-toolbar" role="toolbar" aria-label="Formatação">
      {BUTTONS.map(({ command, label, content }) => (
        <button
          key={command}
          type="button"
          className={`format-toolbar__button ${typeof content === 'string' ? 'format-toolbar__button--text' : ''}`}
          title={`${label} (${FORMAT_SHORTCUTS[command]})`}
          aria-label={label}
          // Keeps the focus, and the selection, on the line being edited.
          onMouseDown={(event) => event.preventDefault()}
          onClick={(event) => run(event, command)}
        >
          {content}
        </button>
      ))}
    </span>
  );
}
