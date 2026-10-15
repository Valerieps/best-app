import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import type { Project, Section } from '../../domain/entities';
import { formatTime } from '../format';
import { ProjectChip, WhiteboardChip } from '../components/Chips';
import { Icon } from '../components/Icon';
import { titleOptions, titleToSaveOnBlur, type TitleOption } from './sectionTitle';
import { isFocusToggleKey } from './focusMode';
import { partMoveKey } from './lineDrag';

interface Props {
  section: Section | null;
  kind: Section['kind'];
  projects: Project[];
  onSaveTitle(title: string): void;
  onLinkProject(project: Project): void;
  onCreateProject(name: string): void;
  /** Turns a linked section back into a whiteboard, with this title. */
  onUnlink(title: string): void;
  /** Shown at the left of the header, like the focus mode button. */
  leading?: ReactNode;
}


/**
 * Section header: kind, time and an optional title. While typing the title, existing projects
 * are suggested; choosing one links the section to it, or moves it there from another project.
 */
export function SectionHeader({ section, kind, projects, onSaveTitle, onLinkProject, onCreateProject, onUnlink, leading }: Props) {
  const [title, setTitle] = useState(section?.title ?? '');
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  // Set by choosing a suggestion, which then leaves the field: that blur must not save the typed text.
  const chose = useRef(false);
  const project = section?.projectId ? projects.find((p) => p.id === section.projectId) ?? null : null;
  const whiteboard = section !== null && section.projectId === null;

  useEffect(() => {
    if (document.activeElement !== inputRef.current) setTitle(section?.title ?? '');
  }, [section?.title]);

  const options: TitleOption[] = section !== null && open ? titleOptions(title, projects, project) : [];

  function choose(option: TitleOption) {
    setOpen(false);
    chose.current = true;
    if (option.type === 'project') {
      setTitle(option.project.name);
      onLinkProject(option.project);
    } else if (option.type === 'create') {
      onCreateProject(option.name);
    } else if (option.type === 'titleOnly' && project) {
      onUnlink(option.name);
    } else {
      onSaveTitle(option.name);
    }
    inputRef.current?.blur();
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    // Moving the whole section, and its focus mode, are handled by the section around the header.
    if (partMoveKey(event) || isFocusToggleKey(event)) return;
    if (event.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      if (options.length > 0) choose(options[Math.min(highlight, options.length - 1)]);
      else {
        onSaveTitle(title);
        chose.current = true;
        inputRef.current?.blur();
      }
      return;
    }
    if (options.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlight((highlight + 1) % options.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlight((highlight - 1 + options.length) % options.length);
    }
  }

  return (
    <div className="section__header">
      {leading}
      {/* The kind as an icon: a notepad for a general section, two people for a meeting. */}
      <span
        className={`section__kind section__kind--${kind}`}
        role="img"
        title={kind === 'meeting' ? 'Reunião' : 'Geral'}
        aria-label={kind === 'meeting' ? 'Reunião' : 'Geral'}
      >
        <Icon name={kind === 'meeting' ? 'users' : 'notes'} size="sm" />
      </span>
      {section && <span className="section__time">{formatTime(section.createdAt)}</span>}
      <div className="title-field">
        <input
          ref={inputRef}
          className="section__title"
          value={title}
          placeholder="Sem título"
          disabled={!section}
          onChange={(event) => {
            setTitle(event.target.value);
            setOpen(true);
            setHighlight(0);
          }}
          onFocus={() => {
            chose.current = false;
            setOpen(true);
          }}
          onBlur={() => {
            // Let a click on a suggestion land before closing.
            setTimeout(() => setOpen(false), 150);
            const save = titleToSaveOnBlur(title, section?.title ?? null, chose.current);
            chose.current = false;
            if (save !== null) onSaveTitle(save);
          }}
          onKeyDown={onKeyDown}
          aria-label="Título da seção"
          aria-expanded={options.length > 0}
          aria-autocomplete="list"
          role="combobox"
        />
        {options.length > 0 && (
          <ul className="suggestions" role="listbox">
            {options.map((option, index) => (
              <li
                key={option.type === 'project' ? option.project.id : option.type}
                role="option"
                aria-selected={index === highlight}
                className={`suggestions__item ${index === highlight ? 'suggestions__item--active' : ''}`}
                onMouseDown={(event) => {
                  event.preventDefault();
                  choose(option);
                }}
              >
                {option.type === 'project' && (
                  <>
                    {option.project.name} <ProjectChip />
                  </>
                )}
                {option.type === 'keepProject' && <>Manter em “{option.project.name}”, só mudar o título</>}
                {option.type === 'create' && <>Criar o projeto “{option.name}”</>}
                {option.type === 'titleOnly' && (
                  <span className="muted">Usar “{option.name}” só como título (quadro branco)</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      {whiteboard && <WhiteboardChip />}
      {project && <ProjectChip />}
    </div>
  );
}
