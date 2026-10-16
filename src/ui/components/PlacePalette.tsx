import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { FEATURES } from '../features';
import { navigate } from '../hooks';
import { filterPlaces, isPaletteShortcut, moveActive, palettePlaces } from '../placePalette';
import { Icon } from './Icon';

const LIST_ID = 'place-palette-list';
const optionId = (key: string) => `place-palette-${key}`;

/**
 * Ctrl + K opens a box to go to another place of the sidebar (spec/navegacao.md, "Global").
 * Mounted only on screens with the sidebar. A day note line that formats a link with Ctrl + K
 * prevents the key's default, and then the palette stays closed (ADR-057).
 */
export function PlacePalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing || !isPaletteShortcut(event)) return;
      event.preventDefault();
      setOpen(true);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return open ? <PaletteDialog onClose={() => setOpen(false)} /> : null;
}

function PaletteDialog({ onClose }: { onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const places = useMemo(() => palettePlaces(FEATURES), []);
  const shown = filterPlaces(places, query);
  const current = shown.length === 0 ? -1 : Math.min(Math.max(active, 0), shown.length - 1);

  useEffect(() => {
    // Focus goes back where it was when the palette closes, also after Esc.
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogRef.current?.showModal();
    return () => previous?.focus();
  }, []);

  const go = (index: number) => {
    const place = shown[index];
    if (!place) return;
    onClose();
    navigate(place.route);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return;
    if (event.key === 'Enter') {
      event.preventDefault();
      go(current);
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setActive(moveActive(current, event.key, shown.length));
    } else if (isPaletteShortcut(event)) {
      // Ctrl + K again closes it, as it opened.
      event.preventDefault();
      onClose();
    }
  };

  // A click on the backdrop lands on the dialog itself, outside its box.
  const onClick = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === dialogRef.current) onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      className="palette"
      aria-label="Ir para"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={onClick}
    >
      <div className="palette__box">
        <input
          className="palette__input"
          type="text"
          value={query}
          placeholder="Ir para…"
          aria-label="Ir para"
          role="combobox"
          aria-expanded={true}
          aria-controls={LIST_ID}
          aria-autocomplete="list"
          aria-activedescendant={current >= 0 ? optionId(shown[current].key) : undefined}
          autoComplete="off"
          spellCheck={false}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
        />
        <ul className="palette__list" id={LIST_ID} role="listbox" aria-label="Lugares">
          {shown.map((place, index) => (
            <li
              key={place.key}
              id={optionId(place.key)}
              role="option"
              aria-selected={index === current}
              className={`palette__option ${index === current ? 'palette__option--active' : ''}`}
              onMouseMove={() => setActive(index)}
              // Keep the focus in the input when clicking an option.
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => go(index)}
            >
              <Icon name={place.icon} />
              <span>{place.label}</span>
            </li>
          ))}
        </ul>
        {shown.length === 0 && <p className="palette__empty muted">Nenhum lugar com esse nome.</p>}
      </div>
    </dialog>
  );
}
