import { useEffect, useMemo, useState } from 'react';
import { applyTriage } from '../../application/checkout';
import type { Block } from '../../domain/entities';
import { comparePositions } from '../../domain/position';
import type { WhiteboardDecision, WhiteboardRow } from '../../domain/triage';
import { KindChip, WhiteboardChip } from '../components/Chips';
import { Linkified } from '../components/Linkified';
import { plural } from '../format';
import { loadLatest } from '../loadLatest';
import { appContext, reader } from '../services';
import {
  ChoiceDetail,
  ChoicePills,
  DecideLabel,
  noDecisions,
  StepFooter,
  StepQuestion,
  useStepKeys,
  type ChoiceOption,
  type StepProps,
} from './StepParts';

/** Lines of the section shown before "+ N linhas". */
const PREVIEW_LINES = 3;

/** Step "Quadros brancos": one card per section still on a whiteboard. */
export function WhiteboardStep({ day, triage, projects, busy, onBack, onNext }: StepProps) {
  const rows = useMemo(() => triage.rows.filter((row): row is WhiteboardRow => row.type === 'whiteboard'), [triage]);
  const [index, setIndex] = useState(0);
  const [decisions, setDecisions] = useState<Map<string, WhiteboardDecision>>(new Map());
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loadError, setLoadError] = useState<unknown>(undefined);
  const active = projects.filter((project) => project.status === 'active');

  useEffect(
    () => loadLatest(() => reader.blocksInSections(rows.map((row) => row.section.id)), setBlocks, setLoadError),
    [rows],
  );

  const row = rows[Math.min(index, rows.length - 1)];
  const decision = decisions.get(row.section.id) ?? row.suggestion;
  const setDecision = (value: WhiteboardDecision) => setDecisions((previous) => new Map(previous).set(row.section.id, value));
  const linkTarget =
    (decision.kind === 'link' && active.find((project) => project.id === decision.projectId)) || row.citedProject || active[0];

  const options: ChoiceOption<WhiteboardDecision['kind']>[] = [
    ...(active.length > 0 ? [{ value: 'link' as const, label: 'Vincular a um projeto', suggested: row.citedProject !== null }] : []),
    { value: 'convert', label: 'Projeto novo' },
    { value: 'leaveUnlinked', label: 'Sem vínculo' },
  ];
  const choose = (kind: WhiteboardDecision['kind']) => {
    if (kind === 'link' && linkTarget) setDecision({ kind: 'link', projectId: linkTarget.id });
    else if (kind === 'convert') setDecision({ kind: 'convert', name: row.section.title ?? '' });
    else setDecision({ kind: 'leaveUnlinked' });
  };

  const last = index >= rows.length - 1;
  function next() {
    if (busy) return;
    if (!last) {
      setIndex(index + 1);
      return;
    }
    const whiteboards = new Map<string, WhiteboardDecision>();
    for (const each of rows) {
      const chosen = decisions.get(each.section.id) ?? each.suggestion;
      // A conversion without a name falls back to leaving the section unlinked.
      whiteboards.set(each.section.id, chosen.kind === 'convert' && !chosen.name.trim() ? { kind: 'leaveUnlinked' } : chosen);
    }
    onNext(() => applyTriage(appContext, day, { ...noDecisions(), whiteboards }), { whiteboards: rows.length });
  }
  const back = index > 0 ? () => setIndex(index - 1) : onBack;

  useStepKeys({ options: options.length, onPick: (i) => choose(options[i].value), onEnter: next });

  if (loadError !== undefined) throw loadError;
  const sectionBlocks = blocks.filter((block) => block.sectionId === row.section.id).sort(comparePositions);
  const notes = sectionBlocks.filter((block) => block.kind === 'note');
  const tasks = sectionBlocks.filter((block) => block.kind === 'task');
  const hidden = notes.length - PREVIEW_LINES;

  return (
    <>
      <div className="card__body checkout-step">
        <StepQuestion focusKey={row.section.id} eyebrow={`Quadro branco ${index + 1} de ${rows.length}`}>
          Esta seção vai para algum projeto?
        </StepQuestion>
        <p className="muted">Ela ainda é um quadro branco, sem projeto.</p>
        <figure className="section-replica">
          <figcaption>Na sua nota do dia</figcaption>
          <div className="section-replica__box">
            <div className="section-replica__title">
              {row.section.title ?? 'Sem título'} <KindChip kind={row.section.kind} /> <WhiteboardChip />
            </div>
            {notes.slice(0, PREVIEW_LINES).map((note) => (
              <div className="section-replica__line" key={note.id}>
                <Linkified text={note.text} />
              </div>
            ))}
            {hidden > 0 && <div className="section-replica__more">+ {plural(hidden, 'linha', 'linhas')}</div>}
            {tasks.map((task) => (
              <div className="section-replica__line" key={task.id}>
                <span className="task-box" aria-hidden="true" />
                <Linkified text={task.text || '(tarefa sem texto)'} />
              </div>
            ))}
          </div>
        </figure>
        <DecideLabel />
        <ChoicePills label="Vínculo desta seção" options={options} value={decision.kind} onChange={choose} />
        <ChoiceDetail>
          {decision.kind === 'link' && (
            <>
              <span>
                {row.citedProject && `O texto cita “${row.citedProject.name}”. `}
                As notas vão para a wiki ligadas ao projeto, e as tarefas seguem vinculadas a ele.
              </span>
              <select
                className="text-input"
                value={decision.projectId}
                onChange={(event) => setDecision({ kind: 'link', projectId: event.target.value })}
                aria-label="Projeto"
              >
                {active.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </>
          )}
          {decision.kind === 'convert' && (
            <>
              <span>Cria o projeto com este nome.</span>
              <input
                className="text-input choice-detail__name"
                value={decision.name}
                placeholder="Nome do projeto"
                onChange={(event) => setDecision({ kind: 'convert', name: event.target.value })}
                aria-label="Nome do novo projeto"
              />
            </>
          )}
          {decision.kind === 'leaveUnlinked' && <span>As notas vão para a wiki sem projeto.</span>}
        </ChoiceDetail>
      </div>
      <StepFooter onBack={back} primary={last ? 'Seguir' : 'Próxima seção'} onPrimary={next} busy={busy} keysHint={options.length} />
    </>
  );
}
