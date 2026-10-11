import { useEffect, useState } from 'react';
import { setWeeklyReflectionSchedule } from '../../application/reflection';
import { setActiveDays, setWarmupItems } from '../../application/settings';
import { ALL_DAYS } from '../../domain/dayFlow';
import type { WarmupItem } from '../../domain/entities';
import { appContext, reader } from '../services';
import { useLiveQuery } from '../useLiveQuery';

const WEEKDAYS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
/** Monday first, as people read a work week. */
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

/** User settings: weekly reflection (section 2), active days and warm up (section 3). */
export function SettingsScreen() {
  const settings = useLiveQuery(async () => (await reader.settings()) ?? null);
  if (settings === undefined) return null;
  const schedule = settings?.weeklyReflection ?? null;
  const activeDays = settings?.activeDays ?? [...ALL_DAYS];

  const updateSchedule = (next: typeof schedule) => void setWeeklyReflectionSchedule(appContext, next);

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
        <p className="muted">No checkout, “dia seguinte” pula os dias desmarcados: na sexta, o dia seguinte é a segunda.</p>
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
        <h2>Reflexão semanal</h2>
        <p className="muted">
          O app não envia notificações: no horário escolhido, um aviso aparece na nota do dia. A reflexão também pode ser
          feita a qualquer hora pelo menu.
        </p>
        <label className="check-row">
          <input
            type="checkbox"
            checked={schedule !== null}
            onChange={(event) => updateSchedule(event.target.checked ? { weekday: 5, hour: 17 } : null)}
          />
          Avisar toda semana
        </label>
        {schedule && (
          <div className="settings__row">
            <select
              className="text-input"
              value={schedule.weekday}
              onChange={(event) => updateSchedule({ ...schedule, weekday: Number(event.target.value) })}
              aria-label="Dia da semana"
            >
              {WEEK_ORDER.map((weekday) => (
                <option key={weekday} value={weekday}>
                  {WEEKDAYS[weekday]}
                </option>
              ))}
            </select>
            <span>às</span>
            <select
              className="text-input"
              value={schedule.hour}
              onChange={(event) => updateSchedule({ ...schedule, hour: Number(event.target.value) })}
              aria-label="Hora"
            >
              {Array.from({ length: 24 }, (_, hour) => (
                <option key={hour} value={hour}>
                  {String(hour).padStart(2, '0')}h
                </option>
              ))}
            </select>
          </div>
        )}
      </section>
    </main>
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
