import { addDays, type DayKey } from '../../domain/day';
import type { Project } from '../../domain/entities';
import type { NotesDecision, TaskDecision, TriageRow, WhiteboardDecision } from '../../domain/triage';
import { KindChip, NoteChip, ProjectChip, WhiteboardChip } from '../components/Chips';
import { Linkified } from '../components/Linkified';
import { Segmented } from '../components/Segmented';
import { formatTime, postponedLabel, relativeDay } from '../format';

export type Decision = TaskDecision | NotesDecision | WhiteboardDecision;

export function rowKey(row: TriageRow): string {
  return row.type === 'task' ? `task:${row.task.id}` : `${row.type}:${row.section.id}`;
}

interface RowProps<D> {
  row: TriageRow;
  decision: D;
  onChange(decision: D): void;
}

type TaskChoice = 'finish' | 'next' | 'other' | 'archive' | 'abandon' | 'reflection' | 'habit';

interface TaskRowExtras {
  nextDay: DayKey;
  today: DayKey;
  /** Section 2: optional project link. Omit to hide the field. */
  projects?: Project[];
  projectId?: string | null;
  onProjectChange?(projectId: string | null): void;
  /** False inside the weekly reflection, where "decidir na reflexão" makes no sense. */
  allowReflection?: boolean;
}

export function TaskRowView({
  row,
  decision,
  onChange,
  nextDay,
  today,
  projects,
  projectId,
  onProjectChange,
  allowReflection = true,
}: RowProps<TaskDecision> & TaskRowExtras) {
  if (row.type !== 'task') return null;
  const choice: TaskChoice =
    decision.kind === 'schedule' ? (decision.date === nextDay ? 'next' : 'other') : decision.kind;
  const postponed = postponedLabel(row.task.postponeCount);
  const nextLabel = relativeDay(nextDay, today);
  const deadline = row.task.deadline ?? null;
  const activeProjects = (projects ?? []).filter((project) => project.status === 'active');
  return (
    <div className="triage-row">
      <span className="triage-row__label">
        <Linkified text={row.task.text || '(tarefa sem texto)'} />
        {postponed && <span className={`chip ${row.attention ? 'chip--whiteboard' : 'chip--muted'}`}>{postponed}</span>}
        {deadline && (
          <span className={`chip ${deadline < nextDay ? 'chip--whiteboard' : 'chip--muted'}`}>
            prazo {relativeDay(deadline, today)}
          </span>
        )}
        {onProjectChange && activeProjects.length > 0 && (
          <select
            className="text-input triage-row__project"
            value={projectId ?? ''}
            onChange={(event) => onProjectChange(event.target.value || null)}
            aria-label={`Projeto de "${row.task.text}"`}
          >
            <option value="">sem projeto</option>
            {activeProjects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        )}
      </span>
      <span className="triage-row__controls">
        <Segmented<TaskChoice>
          label={`Destino de "${row.task.text}"`}
          value={choice}
          options={[
            { value: 'finish', label: 'Finalizar' },
            { value: 'next', label: nextLabel.charAt(0).toUpperCase() + nextLabel.slice(1) },
            { value: 'other', label: 'Outra data' },
            { value: 'archive', label: 'Arquivar' },
            { value: 'abandon', label: 'Abandonar' },
            ...(allowReflection ? [{ value: 'reflection' as const, label: 'Reflexão semanal' }] : []),
            { value: 'habit', label: 'Virar hábito' },
          ]}
          onChange={(value) => {
            if (value === 'next') onChange({ kind: 'schedule', date: nextDay });
            // "Outra data" starts one day after "dia seguinte", then the date field changes it.
            else if (value === 'other') onChange({ kind: 'schedule', date: addDays(nextDay, 1) });
            else onChange({ kind: value });
          }}
        />
        {choice === 'other' && decision.kind === 'schedule' && (
          <input
            type="date"
            className="date-input"
            min={today}
            value={decision.date}
            onChange={(event) => event.target.value && onChange({ kind: 'schedule', date: event.target.value })}
            aria-label="Outra data de intenção"
          />
        )}
      </span>
    </div>
  );
}

export interface ResourceOwner {
  ownerType: 'objective' | 'project';
  ownerId: string;
  label: string;
}

export function NotesRowView({
  row,
  decision,
  onChange,
  allowReflection = true,
  owners,
  resourceOwner,
  onResourceChange,
}: RowProps<NotesDecision> & {
  allowReflection?: boolean;
  /** Section 4: objectives and projects the notes can support as a resource. */
  owners?: ResourceOwner[];
  resourceOwner?: string | null;
  onResourceChange?(key: string | null): void;
}) {
  if (row.type !== 'notes') return null;
  return (
    <div className="triage-row">
      <span className="triage-row__label">
        Notas desta seção ({row.noteCount})
        {onResourceChange && owners && owners.length > 0 && decision === 'wiki' && (
          <select
            className="text-input triage-row__project"
            value={resourceOwner ?? ''}
            onChange={(event) => onResourceChange(event.target.value || null)}
            aria-label="Vincular como recurso"
          >
            <option value="">sem vínculo como recurso</option>
            {owners.map((owner) => (
              <option key={`:`} value={`:`}>
                Recurso de {owner.label}
              </option>
            ))}
          </select>
        )}
      </span>
      <Segmented<NotesDecision>
        label="Destino das notas desta seção"
        value={decision}
        options={[
          { value: 'wiki', label: 'Wiki' },
          { value: 'discarded', label: 'Descartar' },
          ...(allowReflection ? [{ value: 'weeklyReflection' as const, label: 'Reflexão semanal' }] : []),
        ]}
        onChange={onChange}
      />
    </div>
  );
}

type WhiteboardChoice = 'convert' | 'link' | 'leaveUnlinked';

export function WhiteboardRowView({
  row,
  decision,
  onChange,
  projects,
}: RowProps<WhiteboardDecision> & { projects: Project[] }) {
  if (row.type !== 'whiteboard') return null;
  const active = projects.filter((project) => project.status === 'active');
  const linkTarget =
    decision.kind === 'link' ? active.find((project) => project.id === decision.projectId) : row.citedProject;
  const defaultName = row.section.title ?? '';
  return (
    <div className="triage-row">
      <span className="triage-row__label">Vínculo desta seção</span>
      <span className="triage-row__controls">
        <Segmented<WhiteboardChoice>
          label="Vínculo desta seção"
          value={decision.kind}
          options={[
            { value: 'convert', label: 'Converter em projeto' },
            { value: 'link', label: linkTarget ? `Vincular a ${linkTarget.name}` : 'Vincular a…' },
            { value: 'leaveUnlinked', label: 'Deixar sem vínculo' },
          ]}
          onChange={(value) => {
            if (value === 'convert') onChange({ kind: 'convert', name: defaultName });
            else if (value === 'link') {
              const target = linkTarget ?? active[0];
              if (target) onChange({ kind: 'link', projectId: target.id });
            } else onChange({ kind: 'leaveUnlinked' });
          }}
        />
        {decision.kind === 'convert' && (
          <input
            className="text-input"
            value={decision.name}
            placeholder="Nome do projeto"
            onChange={(event) => onChange({ kind: 'convert', name: event.target.value })}
            aria-label="Nome do novo projeto"
          />
        )}
        {decision.kind === 'link' && active.length > 1 && (
          <select
            className="text-input"
            value={decision.projectId}
            onChange={(event) => onChange({ kind: 'link', projectId: event.target.value })}
            aria-label="Projeto"
          >
            {active.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        )}
      </span>
    </div>
  );
}

/** Header of a group of rows: the section they came from. */
export function GroupHeader({ row }: { row: TriageRow }) {
  const section = row.section;
  if (!section) {
    return (
      <div className="triage-group__header">
        <span>Tarefas planejadas para o dia</span>
      </div>
    );
  }
  const cited = row.type === 'whiteboard' ? row.citedProject : null;
  return (
    <div className="triage-group__header">
      <KindChip kind={section.kind} />
      <span className="muted">{formatTime(section.createdAt)}</span>
      <span>{section.title ?? 'Sem título'}</span>
      {section.projectId ? <ProjectChip /> : <WhiteboardChip />}
      {cited && <NoteChip>{`cita “${cited.name}”`}</NoteChip>}
    </div>
  );
}
