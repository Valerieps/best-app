import { useEffect, useState } from 'react';
import { setReviewCadence } from '../../application/reviews';
import { setActiveDays, setCleanupLimits, setWarmupItems } from '../../application/settings';
import { ASSISTANT_IDS, limitsFor, withLimit, type AssistantId, type StatusLimits } from '../../domain/cleanupStatus';
import { ALL_DAYS } from '../../domain/dayFlow';
import type { Settings, WarmupItem } from '../../domain/entities';
import { DEFAULT_REVIEW_CADENCE } from '../../domain/reviews';
import { ASSISTANT_INFO } from '../cleanup/assistantInfo';
import { appContext, reader } from '../services';
import { LoadingPage } from '../components/Skeleton';
import { directionReviewEnabled } from '../features';
import { useLiveQuery } from '../useLiveQuery';

const WEEKDAYS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
/** Monday first, as people read a work week. */
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

/** User settings: review cadence (section 2), active days and warm up (section 3). */
export function SettingsScreen() {
  const settings = useLiveQuery(async () => (await reader.settings()) ?? null);
  if (settings === undefined) return <LoadingPage title="Configurações" />;
  const cadence = { ...DEFAULT_REVIEW_CADENCE, ...settings?.reviewCadence };
  const activeDays = settings?.activeDays ?? [...ALL_DAYS];

  return (
    <main className="page">
      <h1 className="page__title">Configurações</h1>

      <section className="panel settings__panel">
        <h2>Warm up</h2>
        <p className="muted">
          Com pelo menos um item, o dia passa a abrir com “Iniciar Dia”, o warm up e o dashboard. Sem itens, o app abre
          direto na nota do dia.
        </p>
        <WarmupEditor items={settings?.warmupItems ?? []} />
      </section>

      <section className="panel settings__panel">
        <h2>Dias ativos</h2>
        <p className="muted">Ao fechar o dia, “dia seguinte” pula os dias desmarcados: na sexta, o dia seguinte é a segunda.</p>
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
        <h2>Revisões</h2>
        {directionReviewEnabled() ? (
          <p className="muted">
            As revisões não têm data marcada. Cada uma fica disponível depois de um número de dias fechados ou de Revisões de
            Foco, ou antes, se algo sair do lugar. Também dá para fazer qualquer uma a qualquer hora, pelo menu.
          </p>
        ) : (
          <p className="muted">
            A Revisão de Foco não tem data marcada. Ela fica disponível depois de um número de dias fechados, ou antes, se algo
            sair do lugar. Também dá para fazê-la a qualquer hora, pelo menu.
          </p>
        )}
        <CadenceField
          label="Revisão de Foco a cada"
          unit="dias fechados"
          value={cadence.focusCheckouts}
          onChange={(focusCheckouts) => void setReviewCadence(appContext, { focusCheckouts })}
        />
        {directionReviewEnabled() && (
          <CadenceField
            label="Revisão de Rumo a cada"
            unit="Revisões de Foco"
            value={cadence.directionFocusReviews}
            onChange={(directionFocusReviews) => void setReviewCadence(appContext, { directionFocusReviews })}
          />
        )}
      </section>

      <section className="panel settings__panel">
        <h2>Colocar ordem na casa</h2>
        <p className="muted">
          A cor de cada assistente diz há quanto tempo o item mais antigo dele está esperando. Sem nenhum item, ou com um
          item recente, o cartão fica verde. Escolha a partir de quantos dias de espera ele fica amarelo, laranja e vermelho.
        </p>
        <CleanupLimitsEditor saved={settings?.cleanupAgeLimits} />
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
                {label} a partir de
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
            aria-label={`${name}: ${label.toLowerCase()} a partir de quantos dias de espera`}
          />{' '}
          <span className="muted">{Number(draft[index]) === 1 ? 'dia' : 'dias'}</span>
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
                <button type="button" className="small" disabled={index === 0} onClick={() => move(index, -1)} aria-label="Subir">
                  ↑
                </button>
                <button
                  type="button"
                  className="small"
                  disabled={index === draft.length - 1}
                  onClick={() => move(index, 1)}
                  aria-label="Descer"
                >
                  ↓
                </button>
                <button type="button" className="small" onClick={() => save(draft.filter((other) => other.id !== item.id))} aria-label="Remover">
                  ✕
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
          placeholder="Novo item, por exemplo: beber água"
          onChange={(event) => setNewText(event.target.value)}
          aria-label="Novo item do warm up"
        />
        <button type="submit">Adicionar</button>
      </form>
    </>
  );
}

/** A whole number from 1 to 99, saved when it is valid. */
function CadenceField({ label, unit, value, onChange }: { label: string; unit: string; value: number; onChange(value: number): void }) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  return (
    <label className="settings__row">
      <span>{label}</span>
      <input
        className="text-input settings__number"
        type="number"
        min={1}
        max={99}
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          const next = Number(event.target.value);
          if (Number.isInteger(next) && next >= 1 && next <= 99 && next !== value) onChange(next);
        }}
        onBlur={() => setText(String(value))}
      />
      <span>{unit}</span>
    </label>
  );
}
