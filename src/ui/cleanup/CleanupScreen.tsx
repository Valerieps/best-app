import { useState } from 'react';
import { keepProjectsSeparate, mergeProjects, resolveWhiteboardGroup } from '../../application/assistants';
import { loadCleanupDashboard, type CleanupDashboard } from '../../application/queries';
import type { DuplicateGroup, WhiteboardGroup, WhiteboardGroupAction } from '../../domain/assistants';
import type { AssistantId } from '../../domain/cleanupStatus';
import type { DayKey } from '../../domain/day';
import type { Project } from '../../domain/entities';
import { ScreenHeader } from '../components/ScreenHeader';
import { Segmented } from '../components/Segmented';
import { LoadingPage } from '../components/Skeleton';
import { ClosePendingDaysDialog } from '../dayNote/ClosePendingDaysDialog';
import { listDays, plural } from '../format';
import { navigate } from '../hooks';
import { appContext, reader } from '../services';
import { useLiveQuery } from '../useLiveQuery';
import { ASSISTANT_INFO, AssistantIcon, STATUS_LABELS } from './assistantInfo';

interface Props {
  today: DayKey;
  /** The assistant whose details are open; omitted shows the dashboard. */
  assistant?: AssistantId;
}

/**
 * "Colocar ordem na casa" (spec/assistentes.md): a dashboard with one card per assistant, colored
 * by how much it found. The details and suggested actions only show after opening a card.
 */
export function CleanupScreen({ today, assistant }: Props) {
  const dashboard = useLiveQuery(() => loadCleanupDashboard(reader, today), [today]);
  const projects = useLiveQuery(() => reader.projects()) ?? [];
  if (!dashboard) return <LoadingPage title={assistant ? undefined : 'Colocar ordem na casa'} />;
  return assistant ? (
    <AssistantScreen id={assistant} dashboard={dashboard} projects={projects} today={today} />
  ) : (
    <Dashboard dashboard={dashboard} />
  );
}

function Dashboard({ dashboard }: { dashboard: CleanupDashboard }) {
  return (
    <main className="page">
      <ScreenHeader title="Colocar ordem na casa" />
      <ul className="cleanup-grid">
        {dashboard.cards.map(({ id, status }) => {
          const { name } = ASSISTANT_INFO[id];
          return (
            <li key={id}>
              <button
                type="button"
                className={`cleanup-card status--${status}`}
                title={STATUS_LABELS[status]}
                aria-label={`${name}, ${STATUS_LABELS[status]}`}
                onClick={() => navigate({ name: 'cleanup', assistant: id })}
              >
                <span className="status-icon">
                  <AssistantIcon id={id} />
                </span>
                {name}
              </button>
            </li>
          );
        })}
      </ul>
    </main>
  );
}

function AssistantScreen({
  id,
  dashboard,
  projects,
  today,
}: {
  id: AssistantId;
  dashboard: CleanupDashboard;
  projects: Project[];
  today: DayKey;
}) {
  const { name, description } = ASSISTANT_INFO[id];
  const card = dashboard.cards.find((candidate) => candidate.id === id)!;
  const backToDashboard = () => navigate({ name: 'cleanup' });

  return (
    <main className="page">
      <button type="button" className="link screen-header__back" onClick={backToDashboard}>
        ← Colocar ordem na casa
      </button>
      <header className={`assistant-header status--${card.status}`}>
        <span className="status-icon">
          <AssistantIcon id={id} />
        </span>
        <div>
          <h1 className="assistant-header__title">{name}</h1>
          <p className="assistant-header__description">{description}</p>
        </div>
        <span className="visually-hidden">Estado: {STATUS_LABELS[card.status]}</span>
      </header>

      {card.count === 0 ? (
        <p className="muted">Nada para limpar aqui.</p>
      ) : (
        <>
          {id === 'pendingDays' && <PendingDaysAssistant days={dashboard.pendingDays} today={today} />}
          {id === 'whiteboards' && (
            <WhiteboardsAssistant groups={dashboard.whiteboards} projects={projects} onDone={backToDashboard} />
          )}
          {id === 'duplicates' && <DuplicatesAssistant groups={dashboard.duplicates} onDone={backToDashboard} />}
        </>
      )}
    </main>
  );
}

function PendingDaysAssistant({ days, today }: { days: DayKey[]; today: DayKey }) {
  const [closing, setClosing] = useState(false);
  return (
    <section className="assistant">
      <p>{listDays(days, today)} ainda sem checkout.</p>
      <div className="assistant__actions">
        <button type="button" className="primary" onClick={() => setClosing(true)}>
          Fechar dias pendentes
        </button>
      </div>
      {closing && <ClosePendingDaysDialog today={today} onClose={() => setClosing(false)} />}
    </section>
  );
}

type WhiteboardChoice = 'convert' | 'link' | 'keep';

function WhiteboardsAssistant({
  groups,
  projects,
  onDone,
}: {
  groups: WhiteboardGroup[];
  projects: Project[];
  onDone(): void;
}) {
  const [choices, setChoices] = useState<Map<string, WhiteboardGroupAction>>(new Map());
  const [busy, setBusy] = useState(false);
  const active = projects.filter((project) => project.status === 'active');
  const actionOf = (group: WhiteboardGroup) => choices.get(group.key) ?? group.suggestion;
  const choose = (group: WhiteboardGroup, action: WhiteboardGroupAction) =>
    setChoices((previous) => new Map(previous).set(group.key, action));

  async function accept() {
    setBusy(true);
    try {
      for (const group of groups) {
        const action = actionOf(group);
        const safe = action.kind === 'convert' && !action.name.trim() ? { kind: 'keep' as const } : action;
        await resolveWhiteboardGroup(appContext, group.sections.map((section) => section.id), safe);
      }
      onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="assistant">
      <ul className="card-list">
        {groups.map((group) => {
          const action = actionOf(group);
          const linkTarget = action.kind === 'link' ? active.find((p) => p.id === action.projectId) : undefined;
          return (
            <li className="card-list__item card-list__item--stacked" key={group.key}>
              <div className="triage-row triage-row--flush">
                <span className="triage-row__label">
                  “{group.title}” <span className="muted">{plural(group.sections.length, 'seção', 'seções')}</span>
                </span>
                <Segmented<WhiteboardChoice>
                  label={`Ação para “${group.title}”`}
                  value={action.kind}
                  options={[
                    { value: 'convert', label: 'Converter em projeto' },
                    { value: 'link', label: linkTarget ? `Vincular a ${linkTarget.name}` : 'Vincular a…' },
                    { value: 'keep', label: 'Deixar como está' },
                  ]}
                  onChange={(value) => {
                    if (value === 'convert') choose(group, { kind: 'convert', name: group.title });
                    else if (value === 'keep') choose(group, { kind: 'keep' });
                    else if (active[0]) choose(group, { kind: 'link', projectId: linkTarget?.id ?? active[0].id });
                  }}
                />
              </div>
              {action.kind === 'link' && active.length > 1 && (
                <select
                  className="text-input assistant__select"
                  value={action.projectId}
                  onChange={(event) => choose(group, { kind: 'link', projectId: event.target.value })}
                  aria-label="Projeto"
                >
                  {active.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              )}
            </li>
          );
        })}
      </ul>
      <div className="assistant__actions">
        <button type="button" className="primary" onClick={accept} disabled={busy}>
          Aceitar sugestões
        </button>
      </div>
    </section>
  );
}

type DuplicateChoice = 'merge' | 'separate';

function DuplicatesAssistant({ groups, onDone }: { groups: DuplicateGroup[]; onDone(): void }) {
  const [choices, setChoices] = useState<Map<string, DuplicateChoice>>(new Map());
  const [busy, setBusy] = useState(false);

  async function accept() {
    setBusy(true);
    try {
      for (const group of groups) {
        const ids = group.projects.map((project) => project.id);
        if ((choices.get(group.key) ?? 'merge') === 'merge') await mergeProjects(appContext, group.keep.id, ids);
        else await keepProjectsSeparate(appContext, ids);
      }
      onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="assistant">
      <ul className="card-list">
        {groups.map((group) => (
          <li className="card-list__item" key={group.key}>
            <span>{group.projects.map((project) => `“${project.name}”`).join(' e ')}</span>
            <Segmented<DuplicateChoice>
              label="Ação para os projetos parecidos"
              value={choices.get(group.key) ?? 'merge'}
              options={[
                { value: 'merge', label: `Juntar em “${group.keep.name}”` },
                { value: 'separate', label: 'Manter separados' },
              ]}
              onChange={(value) => setChoices((previous) => new Map(previous).set(group.key, value))}
            />
          </li>
        ))}
      </ul>
      <div className="assistant__actions">
        <button type="button" className="primary" onClick={accept} disabled={busy}>
          Aceitar sugestões
        </button>
      </div>
    </section>
  );
}
