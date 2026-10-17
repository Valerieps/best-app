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
import { ageLabel, ASSISTANT_INFO, cardStateLabel, shortAgeLabel, AssistantIcon, STATUS_LABELS } from './assistantInfo';
import { ForgottenTasksAssistant } from './ForgottenTasksAssistant';
import { RitualsCalendar } from './RitualsCalendar';

interface Props {
  today: DayKey;
  /** The assistant whose details are open; omitted shows the "Rituais" screen. */
  assistant?: AssistantId;
  pendingDays: DayKey[];
}

/**
 * The "Rituais" screen (spec/assistentes.md, "A tela Rituais"): a small calendar of the days
 * without a closing, then the "Assistentes" grid, with one card per assistant colored by how long
 * its oldest item has been waiting (or, for "Tarefas esquecidas", by how many there are). The
 * details and actions of an assistant only show after opening its card.
 */
export function RitualsScreen({ today, assistant, pendingDays }: Props) {
  const dashboard = useLiveQuery(() => loadCleanupDashboard(reader, today), [today]);
  const projects = useLiveQuery(() => reader.projects()) ?? [];
  if (!dashboard) return <LoadingPage title={assistant ? undefined : 'Rituais'} />;
  return assistant ? (
    <AssistantScreen id={assistant} dashboard={dashboard} projects={projects} today={today} />
  ) : (
    <Rituals dashboard={dashboard} today={today} pendingDays={pendingDays} />
  );
}

function Rituals({ dashboard, today, pendingDays }: { dashboard: CleanupDashboard; today: DayKey; pendingDays: DayKey[] }) {
  const [closing, setClosing] = useState(false);
  return (
    <main className="page">
      <ScreenHeader title="Rituais" />

      <section className="rituals-section">
        <div className="rituals-section__head rituals-section__head--calendar">
          <h2 className="rituals-section__title">Fechar o dia</h2>
          {pendingDays.length > 0 && (
            <button type="button" className="tertiary" onClick={() => setClosing(true)}>
              Fechar dias pendentes
            </button>
          )}
        </div>
        <RitualsCalendar today={today} pendingDays={pendingDays} />
        {closing && <ClosePendingDaysDialog today={today} onClose={() => setClosing(false)} />}
      </section>

      <section className="rituals-section">
        <div className="rituals-section__head">
          <h2 className="rituals-section__title">Assistentes</h2>
        </div>
        <ul className="cleanup-grid">
          {/* The calendar above does the job of "Dias em aberto". */}
          {dashboard.cards
            .filter(({ id }) => id !== 'pendingDays')
            .map(({ id, status, count, ageInDays }) => {
              const { name, description } = ASSISTANT_INFO[id];
              const age = cardStateLabel(id, count, ageInDays);
              const state = [STATUS_LABELS[status], age].filter(Boolean).join(', ');
              return (
                <li key={id}>
                  <button
                    type="button"
                    className={`cleanup-card status--${status}`}
                    title={`${description} ${state.charAt(0).toUpperCase()}${state.slice(1)}.`}
                    aria-label={[name, STATUS_LABELS[status], age].filter(Boolean).join(', ')}
                    onClick={() => navigate({ name: 'rituals', assistant: id })}
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
      </section>
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
  const backToDashboard = () => navigate({ name: 'rituals' });

  const age = card.count > 0 ? ageLabel(card.ageInDays) : null;

  return (
    // "Tarefas esquecidas" ends on the board of "Fechar o dia", which needs the width.
    <main className={id === 'forgottenTasks' ? 'page page--wide' : 'page'}>
      <ScreenHeader
        back={{ label: 'Rituais', onSelect: backToDashboard }}
        title={
          <span className="assistant-title">
            {/* The color says how long the oldest item waits, as on the card that opened it. */}
            <span className={`status-icon status-icon--${card.status}`} title={STATUS_LABELS[card.status]}>
              <AssistantIcon id={id} />
            </span>
            <h1 className="screen-header__h1" title={description}>
              {name}
            </h1>
            {age && (
              <span className="chip chip--muted" title={age}>
                {shortAgeLabel(card.ageInDays)}
              </span>
            )}
            <span className="visually-hidden">Estado: {STATUS_LABELS[card.status]}</span>
          </span>
        }
      />

      {card.count === 0 ? (
        <p className="muted">Nada para limpar aqui.</p>
      ) : (
        <>
          {id === 'pendingDays' && <PendingDaysAssistant days={dashboard.pendingDays} today={today} />}
          {id === 'whiteboards' && (
            <WhiteboardsAssistant groups={dashboard.whiteboards} projects={projects} onDone={backToDashboard} />
          )}
          {id === 'duplicates' && <DuplicatesAssistant groups={dashboard.duplicates} onDone={backToDashboard} />}
          {id === 'forgottenTasks' && (
            <ForgottenTasksAssistant items={dashboard.forgottenTasks} today={today} onDone={backToDashboard} />
          )}
        </>
      )}
    </main>
  );
}

function PendingDaysAssistant({ days, today }: { days: DayKey[]; today: DayKey }) {
  const [closing, setClosing] = useState(false);
  return (
    <section className="assistant">
      <p>{listDays(days, today)} ainda sem fechamento.</p>
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
