import { useState } from 'react';
import { keepProjectsSeparate, mergeProjects, resolveWhiteboardGroup } from '../../application/assistants';
import { loadCleanup, loadPendingDays } from '../../application/queries';
import type { DuplicateGroup, WhiteboardGroup, WhiteboardGroupAction } from '../../domain/assistants';
import type { DayKey } from '../../domain/day';
import type { Project } from '../../domain/entities';
import { Segmented } from '../components/Segmented';
import { ClosePendingDaysDialog } from '../dayNote/ClosePendingDaysDialog';
import { listDays, plural } from '../format';
import { appContext, reader } from '../services';
import { useLiveQuery } from '../useLiveQuery';

/**
 * "Colocar ordem na casa": lists only the assistants that have something to clean, each with
 * suggested actions accepted in one go (ASSISTENTES.md).
 */
export function CleanupScreen({ today }: { today: DayKey }) {
  const cleanup = useLiveQuery(() => loadCleanup(reader));
  const pendingDays = useLiveQuery(() => loadPendingDays(reader, today), [today]) ?? [];
  const projects = useLiveQuery(() => reader.projects()) ?? [];
  const [closing, setClosing] = useState(false);

  if (!cleanup) return null;
  const nothing = pendingDays.length === 0 && cleanup.whiteboards.length === 0 && cleanup.duplicates.length === 0;

  return (
    <main className="page">
      <h1 className="page__title">Colocar ordem na casa</h1>
      {nothing && <p className="muted">Tudo em ordem. Nenhum assistente tem algo para limpar agora.</p>}

      {pendingDays.length > 0 && (
        <section className="assistant">
          <h2 className="assistant__title">
            Dias pendentes <span className="muted">{pendingDays.length}</span>
          </h2>
          <p className="muted">{listDays(pendingDays, today)} ainda sem checkout.</p>
          <button type="button" className="primary" onClick={() => setClosing(true)}>
            Fechar dias pendentes
          </button>
          {closing && <ClosePendingDaysDialog today={today} onClose={() => setClosing(false)} />}
        </section>
      )}

      {cleanup.whiteboards.length > 0 && <WhiteboardsAssistant groups={cleanup.whiteboards} projects={projects} />}
      {cleanup.duplicates.length > 0 && <DuplicatesAssistant groups={cleanup.duplicates} />}

      <p className="muted assistant__note">
        O assistente de tarefas paradas entra quando os prazos de “parado” e “antigo” forem definidos (ASSISTENTES.md).
      </p>
    </main>
  );
}

type WhiteboardChoice = 'convert' | 'link' | 'keep';

function WhiteboardsAssistant({ groups, projects }: { groups: WhiteboardGroup[]; projects: Project[] }) {
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
      setChoices(new Map());
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="assistant">
      <h2 className="assistant__title">
        Quadros brancos <span className="muted">{groups.length}</span>
      </h2>
      <p className="muted">Seções que ficaram sem projeto, agrupadas pelos títulos repetidos.</p>
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

function DuplicatesAssistant({ groups }: { groups: DuplicateGroup[] }) {
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
      setChoices(new Map());
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="assistant">
      <h2 className="assistant__title">
        Projetos duplicados <span className="muted">{groups.length}</span>
      </h2>
      <p className="muted">Projetos com nomes parecidos. Juntar move as seções e tarefas para o projeto mais antigo.</p>
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
