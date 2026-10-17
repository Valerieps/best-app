import { useEffect, useState } from 'react';
import { setActiveDays, setAppearance, setCleanupLimits, setForgottenTaskDays, setWarmupItems } from '../../application/settings';
import { DEFAULT_FORGOTTEN_TASK_DAYS, normalizeForgottenTaskDays } from '../../domain/assistants';
import { ASSISTANT_IDS, COUNTED_ASSISTANTS, limitsFor, withLimit, type AssistantId, type StatusLimits } from '../../domain/cleanupStatus';
import { ALL_DAYS } from '../../domain/dayFlow';
import type { Appearance, Settings, WarmupItem } from '../../domain/entities';
import { ASSISTANT_INFO } from '../cleanup/assistantInfo';
import { appContext, reader } from '../services';
import { Icon } from '../components/Icon';
import { ScreenHeader } from '../components/ScreenHeader';
import { Segmented, type SegmentOption } from '../components/Segmented';
import { LoadingPage } from '../components/Skeleton';
import { parseAppearance } from '../theme/appearance';
import { useLiveQuery } from '../useLiveQuery';

const WEEKDAYS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
/** Monday first, as people read a work week. */
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
const APPEARANCES: readonly SegmentOption<Appearance>[] = [
  { value: 'light', label: 'Clara' },
  { value: 'dark', label: 'Escura' },
  { value: 'system', label: 'Igual à do sistema' },
];

/** User settings: warm up and active days (section 3), the assistants, appearance. */
export function SettingsScreen() {
  const settings = useLiveQuery(async () => (await reader.settings()) ?? null);
  if (settings === undefined) return <LoadingPage title="Configurações" />;
  const activeDays = settings?.activeDays ?? [...ALL_DAYS];

  return (
    <main className="page">
      <ScreenHeader title="Configurações" />

      <section className="panel settings__panel">
        <h2>Warm up</h2>
        <p className="muted">Com itens, o dia abre pelo warm up. Sem itens, abre direto na nota do dia.</p>
        <WarmupEditor items={settings?.warmupItems ?? []} />
      </section>

      <section className="panel settings__panel">
        <h2>Dias ativos</h2>
        <p className="muted">Ao fechar o dia, o “dia seguinte” pula os dias desmarcados.</p>
        <div className="settings__days">
          {WEEK_ORDER.map((weekday) => (
            <label className="check-row" key={weekday}>
              <input
                type="checkbox"
                checked={activeDays.includes(weekday)}
                onChange={(event) => {
                  const next = event.target.checked
                    ? [...activeDays, weekday]
                    : activeDays.filter((day) => day !== weekday);
                  if (next.length > 0) void setActiveDays(appContext, next);
                }}
              />
              {WEEKDAYS[weekday]}
            </label>
          ))}
        </div>
      </section>

      <section className="panel settings__panel">
        <h2>Assistentes</h2>
        <p className="muted">
          Dias de espera do item mais antigo para o cartão mudar de cor. Em “Tarefas esquecidas”, conta a quantidade de tarefas.
        </p>
        <CleanupLimitsEditor saved={settings?.cleanupAgeLimits} />
        <ForgottenTaskDaysField saved={settings?.forgottenTaskDays} />
      </section>

      <section className="panel settings__panel">
        <h2>Aparência</h2>
        <Segmented
          label="Aparência"
          options={APPEARANCES}
          value={parseAppearance(settings?.appearance)}
          onChange={(appearance) => void setAppearance(appContext, appearance)}
        />
      </section>
    </main>
  );
}

const LIMIT_COLORS = [
  { label: 'Amarelo', status: 1 },
  { label: 'Laranja', status: 2 },
  { label: 'Vermelho', status: 3 },
];

/** Limits, in days of waiting, of the cleanup dashboard colors, one row per assistant. Saved when leaving a field. */
function CleanupLimitsEditor({ saved }: { saved: Settings['cleanupAgeLimits'] }) {
  return (
    <div className="limits__wrap">
      <table className="limits">
        <thead>
          <tr>
            <th>Assistente</th>
            {LIMIT_COLORS.map(({ label, status }) => (
              <th key={label}>
                <span className={`limits__swatch limits__swatch--${status}`} aria-hidden="true" />
                {label}
              </th>
            ))}
            <th />
          </tr>
        </thead>
        <tbody>
          {ASSISTANT_IDS.map((id) => (
            <CleanupLimitsRow key={id} id={id} limits={limitsFor(id, saved)} custom={saved?.[id] !== undefined} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CleanupLimitsRow({ id, limits, custom }: { id: AssistantId; limits: StatusLimits; custom: boolean }) {
  const { name } = ASSISTANT_INFO[id];
  const counted = COUNTED_ASSISTANTS.has(id);
  const [draft, setDraft] = useState(limits.map(String));
  // Follow saved changes, including the normalization done when saving.
  const savedKey = limits.join();
  useEffect(() => setDraft(savedKey.split(',')), [savedKey]);

  // The edited field wins; the other two move out of its way. An empty field goes back.
  const save = (index: 0 | 1 | 2) => {
    const typed = draft[index].trim();
    const next = typed === '' ? limits : withLimit(limits, index, Number(typed));
    if (next.join() !== savedKey) void setCleanupLimits(appContext, id, next);
    else setDraft(savedKey.split(','));
  };

  return (
    <tr>
      <td>{name}</td>
      {LIMIT_COLORS.map(({ label }, index) => (
        <td key={label}>
          <input
            type="number"
            min={1}
            step={1}
            className="text-input limits__input"
            value={draft[index]}
            onChange={(event) => setDraft(draft.map((value, i) => (i === index ? event.target.value : value)))}
            onBlur={() => save(index as 0 | 1 | 2)}
            aria-label={`${name}: ${label.toLowerCase()} a partir de quantos ${counted ? 'itens' : 'dias de espera'}`}
          />{' '}
          <span className="muted">{counted ? (Number(draft[index]) === 1 ? 'tarefa' : 'tarefas') : Number(draft[index]) === 1 ? 'dia' : 'dias'}</span>
        </td>
      ))}
      <td>
        {custom && (
          <button type="button" className="link" onClick={() => void setCleanupLimits(appContext, id, null)}>
            Voltar ao padrão
          </button>
        )}
      </td>
    </tr>
  );
}

/** After how many days without a date, counted from creation, a task shows up in "Tarefas esquecidas". */
function ForgottenTaskDaysField({ saved }: { saved: number | undefined }) {
  const days = normalizeForgottenTaskDays(saved);
  const [draft, setDraft] = useState(String(days));
  useEffect(() => setDraft(String(days)), [days]);

  const save = () => {
    const typed = draft.trim();
    if (typed === '' || normalizeForgottenTaskDays(Number(typed)) === days) setDraft(String(days));
    else void setForgottenTaskDays(appContext, Number(typed));
  };

  return (
    <p>
      <label>
        Tarefa sem data entra em “Tarefas esquecidas” depois de{' '}
        <input
          type="number"
          min={1}
          step={1}
          className="text-input limits__input"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={save}
        />{' '}
        {days === 1 ? 'dia' : 'dias'} da criação
      </label>
      {saved !== undefined && days !== DEFAULT_FORGOTTEN_TASK_DAYS && (
        <>
          {' '}
          <button type="button" className="link" onClick={() => void setForgottenTaskDays(appContext, null)}>
            Voltar ao padrão
          </button>
        </>
      )}
    </p>
  );
}

/** Edits the warm-up checklist. Changes are saved when leaving a field or adding/removing items. */
function WarmupEditor({ items }: { items: WarmupItem[] }) {
  const [draft, setDraft] = useState(items);
  const [newText, setNewText] = useState('');
  // Follow saved changes (or another tab) by content, not by array identity.
  const savedKey = JSON.stringify(items);
  useEffect(() => setDraft(JSON.parse(savedKey) as WarmupItem[]), [savedKey]);

  const save = (next: WarmupItem[]) => {
    setDraft(next);
    void setWarmupItems(appContext, next);
  };

  const move = (index: number, offset: number) => {
    const next = [...draft];
    const [item] = next.splice(index, 1);
    next.splice(index + offset, 0, item);
    save(next);
  };

  return (
    <>
      {draft.length > 0 && (
        <ol className="card-list warmup-editor">
          {draft.map((item, index) => (
            <li className="card-list__item" key={item.id}>
              <input
                className="text-input warmup-editor__text"
                value={item.text}
                onChange={(event) =>
                  setDraft(draft.map((other) => (other.id === item.id ? { ...other, text: event.target.value } : other)))
                }
                onBlur={() => save(draft)}
                aria-label={`Item ${index + 1} do warm up`}
              />
              <span className="warmup__actions">
                <button type="button" className="icon-button icon-button--sm" disabled={index === 0} onClick={() => move(index, -1)} aria-label="Subir" title="Subir">
                  <Icon name="arrowUp" size="sm" />
                </button>
                <button
                  type="button"
                  className="icon-button icon-button--sm"
                  disabled={index === draft.length - 1}
                  onClick={() => move(index, 1)}
                  aria-label="Descer"
                  title="Descer"
                >
                  <Icon name="arrowDown" size="sm" />
                </button>
                <button
                  type="button"
                  className="icon-button icon-button--sm"
                  onClick={() => save(draft.filter((other) => other.id !== item.id))}
                  aria-label="Remover"
                  title="Remover"
                >
                  <Icon name="close" size="sm" />
                </button>
              </span>
            </li>
          ))}
        </ol>
      )}
      <form
        className="settings__row"
        onSubmit={(event) => {
          event.preventDefault();
          if (!newText.trim()) return;
          save([...draft, { id: appContext.ids.next(), text: newText.trim() }]);
          setNewText('');
        }}
      >
        <input
          className="text-input warmup-editor__text"
          value={newText}
          placeholder="Novo item, como beber água"
          onChange={(event) => setNewText(event.target.value)}
          aria-label="Novo item do warm up"
        />
        <button type="submit">Adicionar</button>
      </form>
    </>
  );
}
