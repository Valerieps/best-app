import { useEffect, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';
import { setRightPanelMenu, setRightPanelWidth } from '../application/settings';
import type { DayKey } from '../domain/day';
import type { RightPanelMenu } from '../domain/entities';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ScreenError } from './components/ErrorScreens';
import { Icon } from './components/Icon';
import { ExecuteScreen } from './execute/ExecuteScreen';
import type { Route } from './hooks';
import {
  clampRightPanelWidth,
  isRightPanelShortcut,
  RIGHT_PANEL_MENUS,
  RIGHT_PANEL_WIDTH,
  RIGHT_PANEL_WIDTH_STEP,
  rightPanelEntry,
  shownRightPanelMenu,
} from './rightPanelLayout';
import { appContext, reader } from './services';
import { useLiveQueryState } from './useLiveQuery';
import { enqueue } from './writeQueue';
import { cx } from './classNames';

interface Props {
  route: Route;
  today: DayKey;
  /** The center is collapsed to a strip: the open menu takes all the room left. */
  fill?: boolean;
}

/**
 * The right panel (spec/navegacao.md, "Painel da direita"): a strip of icons, always on the right
 * of the screens with the sidebar, that opens a menu beside the center. Collapsed by default.
 */
export function RightPanel({ route, today, fill = false }: Props) {
  const stored = useLiveQueryState(async () => (await reader.settings())?.rightPanelMenu ?? null).value;
  // The toggle shows at once; the settings write follows (as in ADR-036).
  const [openNow, setOpenNow] = useState<RightPanelMenu | null | undefined>(undefined);
  const open = openNow === undefined ? (stored ?? null) : openNow;
  const shown = shownRightPanelMenu(open, route);
  const storedWidth = useLiveQueryState(async () => (await reader.settings())?.rightPanelWidth ?? null).value;
  // While dragging, the width follows the mouse; it is saved once, when the drag ends.
  const [widthNow, setWidthNow] = useState<number | null>(null);
  const width = clampRightPanelWidth(widthNow ?? storedWidth ?? RIGHT_PANEL_WIDTH.default);

  const choose = (menu: RightPanelMenu | null) => {
    setOpenNow(menu);
    enqueue(() => setRightPanelMenu(appContext, menu)).catch(() => {
      // Logged by the queue; the choice still holds on screen until the next load.
    });
  };
  // The toggle and the shortcut collapse what is shown, or open the first menu.
  const toggle = () => choose(shown ? null : RIGHT_PANEL_MENUS[0].menu);

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing || !isRightPanelShortcut(event)) return;
      event.preventDefault();
      toggle();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const saveWidth = (next: number | null) => {
    setWidthNow(next ?? RIGHT_PANEL_WIDTH.default);
    enqueue(() => setRightPanelWidth(appContext, next)).catch(() => {
      // Logged by the queue; the width still holds on screen until the next load.
    });
  };

  // The handle is on the right edge (the panel is the middle column), so dragging right makes it wider.
  const startResize = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const handle = event.currentTarget;
    handle.setPointerCapture(event.pointerId);
    const startX = event.clientX;
    const startWidth = width;
    let last = startWidth;
    document.body.classList.add('resizing-right-panel');
    const move = (moveEvent: globalThis.PointerEvent) => {
      last = clampRightPanelWidth(startWidth + (moveEvent.clientX - startX));
      setWidthNow(last);
    };
    const end = () => {
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', end);
      handle.removeEventListener('pointercancel', end);
      document.body.classList.remove('resizing-right-panel');
      if (last !== startWidth) saveWidth(last);
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', end);
    handle.addEventListener('pointercancel', end);
  };

  const resizeKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.key === 'ArrowRight' ? RIGHT_PANEL_WIDTH_STEP : event.key === 'ArrowLeft' ? -RIGHT_PANEL_WIDTH_STEP : 0;
    if (step !== 0) {
      event.preventDefault();
      saveWidth(clampRightPanelWidth(width + step));
    } else if (event.key === 'Home') {
      event.preventDefault();
      saveWidth(null);
    }
  };

  const entry = shown ? rightPanelEntry(shown) : undefined;

  return (
    <aside
      className={cx('right-panel', entry && 'right-panel--open', entry && fill && 'right-panel--fill')}
      aria-label="Painel da direita"
      style={{ '--right-panel-width': `${width}px` } as CSSProperties}
    >
      {entry && (
        <div className="right-panel__body">
          <div
            className="right-panel__resize"
            role="separator"
            aria-orientation="vertical"
            aria-label="Largura do painel da direita"
            aria-valuenow={width}
            aria-valuemin={RIGHT_PANEL_WIDTH.min}
            tabIndex={0}
            title="Arraste para mudar a largura (clique duplo volta ao normal)"
            onPointerDown={startResize}
            onDoubleClick={() => saveWidth(null)}
            onKeyDown={resizeKeyDown}
          />
          <h2 className="right-panel__title">{entry.label}</h2>
          {/* A broken menu shows an error in its place; the center keeps working. */}
          <ErrorBoundary key={entry.menu} fallback={(error, retry) => <ScreenError error={error} onRetry={retry} />}>
            {entry.menu === 'execute' && <ExecuteScreen today={today} inPanel />}
          </ErrorBoundary>
        </div>
      )}

      <nav className="right-panel__strip" aria-label="Menus do painel da direita">
        <button
          type="button"
          className="sidebar__toggle right-panel__toggle"
          onClick={toggle}
          aria-expanded={entry !== undefined}
          title={entry ? 'Recolher o painel da direita (Ctrl + Alt + B)' : 'Abrir o painel da direita (Ctrl + Alt + B)'}
        >
          <Icon name="sidebar" />
          <span className="visually-hidden">{entry ? 'Recolher o painel da direita' : 'Abrir o painel da direita'}</span>
        </button>
        {RIGHT_PANEL_MENUS.map((menu) => {
          const current = menu.menu === shown;
          // While the center shows this screen, the icon has nothing to open.
          const onScreen = menu.screen === route.name;
          return (
            <button
              key={menu.menu}
              type="button"
              className={cx('sidebar__item sidebar__icon', current && 'sidebar__item--current')}
              aria-pressed={current}
              disabled={onScreen}
              title={onScreen ? `${menu.label} já está aberto no centro` : menu.label}
              onClick={() => choose(current ? null : menu.menu)}
            >
              <Icon name={menu.icon} />
              <span className="visually-hidden">{menu.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
