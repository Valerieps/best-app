import { useEffect, useState } from 'react';
import { setActiveDays, setAppearance, setWarmupItems } from '../../application/settings';
import { ALL_DAYS } from '../../domain/dayFlow';
import type { Appearance, WarmupItem } from '../../domain/entities';
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

/** User settings: warm up and active days (section 3), appearance. */
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
