import { useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';
import { loadMenuCounts } from '../application/queries';
import type { ReviewAvailability } from '../application/reviewQueries';
import { setSidebarCollapsed, setSidebarWidth } from '../application/settings';
import type { DayKey } from '../domain/day';
import type { AutoBackupState } from '../infrastructure/autoBackup';
import { BackupStatus } from './backup/BackupStatus';
import { Icon, type IconName } from './components/Icon';
import { navigate, type Route } from './hooks';
import { appContext, reader } from './services';
import { sidebarPlace, type SidebarPlace } from './sidebarPlace';
import { clampSidebarWidth, SIDEBAR_WIDTH, SIDEBAR_WIDTH_STEP } from './sidebarWidth';
import { useLiveQueryState } from './useLiveQuery';
import { FEATURES } from './features';
import { enqueue } from './writeQueue';

interface Props {
  route: Route;
  pendingDays: DayKey[];
  /** Which reviews are available; loaded by the app, which also shows their notice. */
  reviews: ReviewAvailability | undefined;
  backupState: AutoBackupState;
}

interface Place {
  key: string;
  place: SidebarPlace;
  route: Route;
  label: string;
  count?: number;
  /** The "Rituais" counter: pending days plus available reviews. */
  due?: number;
}

/** Every place has an icon before its label, as in most sidebars, so it is found at a glance. */
const PLACE_ICONS: Record<SidebarPlace, IconName> = {
  day: 'sun',
  rituals: 'repeat',
  projects: 'folder',
  objectives: 'target',
  habits: 'leaf',
  active: 'checklist',
  people: 'users',
  data: 'database',
  settings: 'settings',
};

function Badge({ count }: { count: number }) {
  return count > 0 ? <span className="badge">{count}</span> : null;
}

/**
 * Level 1 of the navigation (spec/navegacao.md, "Navegação"): the only global bar, fixed on the
 * left of every screen but "Iniciar Dia". Only places, in groups; it can be collapsed to a strip.
 */
export function Sidebar({ route, pendingDays, reviews, backupState }: Props) {
  const current = sidebarPlace(route);
  const storedCollapsed = useLiveQueryState(async () => (await reader.settings())?.sidebarCollapsed ?? false).value;
  // The toggle shows at once; the settings write follows (as in ADR-036).
  const [collapsedNow, setCollapsedNow] = useState<boolean | null>(null);
  const collapsed = collapsedNow ?? storedCollapsed ?? false;
  const storedWidth = useLiveQueryState(async () => (await reader.settings())?.sidebarWidth ?? null).value;
  // While dragging, the width follows the mouse; it is saved once, when the drag ends.
  const [widthNow, setWidthNow] = useState<number | null>(null);
  const width = clampSidebarWidth(widthNow ?? storedWidth ?? SIDEBAR_WIDTH.default);

  // Counts are extras: a failed query is logged and the sidebar goes on without them.
  const counts = useLiveQueryState(() => loadMenuCounts(reader)).value;
  const focusDue = (reviews?.focus.length ?? 0) > 0;
  const directionDue = (reviews?.direction.length ?? 0) > 0;
  const dueCount = pendingDays.length + (focusDue ? 1 : 0) + (directionDue ? 1 : 0);

  const toggle = () => {
    const next = !collapsed;
    setCollapsedNow(next);
    enqueue(() => setSidebarCollapsed(appContext, next)).catch(() => {
      // Logged by the queue; the choice still holds on screen until the next load.
    });
  };

  const saveWidth = (next: number | null) => {
    setWidthNow(next ?? SIDEBAR_WIDTH.default);
    enqueue(() => setSidebarWidth(appContext, next)).catch(() => {
      // Logged by the queue; the width still holds on screen until the next load.
    });
  };

  const startResize = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    // No text gets selected while dragging.
    event.preventDefault();
    const handle = event.currentTarget;
    handle.setPointerCapture(event.pointerId);
    const startX = event.clientX;
    const startWidth = width;
    let last = startWidth;
    document.body.classList.add('resizing-sidebar');
    const move = (moveEvent: globalThis.PointerEvent) => {
      last = clampSidebarWidth(startWidth + moveEvent.clientX - startX);
      setWidthNow(last);
    };
    const end = () => {
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', end);
      handle.removeEventListener('pointercancel', end);
      document.body.classList.remove('resizing-sidebar');
      if (last !== startWidth) saveWidth(last);
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', end);
    handle.addEventListener('pointercancel', end);
  };

  const resizeKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.key === 'ArrowRight' ? SIDEBAR_WIDTH_STEP : event.key === 'ArrowLeft' ? -SIDEBAR_WIDTH_STEP : 0;
    if (step !== 0) {
      event.preventDefault();
      saveWidth(clampSidebarWidth(width + step));
    } else if (event.key === 'Home') {
      event.preventDefault();
      saveWidth(null);
    }
  };

  if (collapsed) {
    return (
      <nav className="sidebar sidebar--collapsed" aria-label="Menu">
        <button
          type="button"
          className="sidebar__toggle"
          onClick={toggle}
          aria-expanded={false}
          title="Abrir a barra lateral"
        >
          <Icon name="sidebar" />
          <span className="visually-hidden">Abrir a barra lateral</span>
        </button>
        {dueCount > 0 && (
          <span className="sidebar__due" title={`${dueCount} em Rituais`}>
            <Badge count={dueCount} />
          </span>
        )}
      </nav>
    );
  }

  // The groups have no titles since 15/10/2026: a space sets them apart (spec/navegacao.md).
  const groups: { key: string; places: Place[] }[] = [
    {
      key: 'planning',
      places: [
        {
          key: 'projects',
          place: 'projects',
          route: { name: 'projects' },
          label: 'Projetos',
          count: counts?.projects,
        },
        // Hidden until their spec is done (ui/features.ts).
        ...(FEATURES.objectives
          ? [{ key: 'objectives', place: 'objectives' as const, route: { name: 'objectives' as const }, label: 'Objetivos' }]
          : []),
        ...(FEATURES.habits ? [{ key: 'habits', place: 'habits' as const, route: { name: 'habits' as const }, label: 'Hábitos' }] : []),
      ],
    },
    {
      key: 'lists',
      places: [
        {
          key: 'active',
          place: 'active',
          route: { name: 'active' },
          label: 'Tarefas',
          count: counts?.active,
        },
        {
          key: 'people',
          place: 'people',
          route: { name: 'people' },
          label: 'Pessoas',
          count: counts?.people,
        },
      ],
    },
  ];

  const isCurrent = (place: Place) => place.place === current;

  const placeButton = (place: Place, extraClass = '') => (
    <button
      key={place.key}
      type="button"
      className={`sidebar__item ${extraClass} ${isCurrent(place) ? 'sidebar__item--current' : ''}`}
      aria-current={isCurrent(place) ? 'page' : undefined}
      onClick={() => navigate(place.route)}
    >
      <Icon name={PLACE_ICONS[place.place]} />
      <span className="sidebar__label">{place.label}</span>
      {place.due !== undefined && <Badge count={place.due} />}
      {place.count !== undefined && <span className="muted">{place.count}</span>}
    </button>
  );

  return (
    <nav className="sidebar" aria-label="Menu" style={{ '--sidebar-width': `${width}px` } as CSSProperties}>
      <div
        className="sidebar__resize"
        role="separator"
        aria-orientation="vertical"
        aria-label="Largura da barra lateral"
        aria-valuenow={width}
        aria-valuemin={SIDEBAR_WIDTH.min}
        aria-valuemax={SIDEBAR_WIDTH.max}
        tabIndex={0}
        title="Arraste para mudar a largura (clique duplo volta ao normal)"
        onPointerDown={startResize}
        onDoubleClick={() => saveWidth(null)}
        onKeyDown={resizeKeyDown}
      />
      <div className="sidebar__header">
        <button type="button" className="sidebar__name" onClick={() => navigate({ name: 'day' })}>
          Vesper Tasks
        </button>
        <button
          type="button"
          className="sidebar__toggle"
          onClick={toggle}
          aria-expanded={true}
          title="Recolher a barra lateral"
        >
          <Icon name="sidebar" />
          <span className="visually-hidden">Recolher a barra lateral</span>
        </button>
      </div>

      <div className="sidebar__group">
        {placeButton({
          key: 'day',
          place: 'day',
          route: { name: 'day' },
          label: 'Hoje',
        })}
        {placeButton({
          key: 'rituals',
          place: 'rituals',
          route: { name: 'rituals' },
          label: 'Rituais',
          due: dueCount,
        })}
      </div>

      {groups.map((group) => (
        <div className="sidebar__group" key={group.key}>
          {group.places.map((place) => placeButton(place))}
        </div>
      ))}

      <div className="sidebar__footer">
        <button
          type="button"
          className={`sidebar__item sidebar__footer-item ${current === 'data' ? 'sidebar__item--current' : ''}`}
          aria-current={current === 'data' ? 'page' : undefined}
          onClick={() => navigate({ name: 'data' })}
        >
          <Icon name={PLACE_ICONS.data} />
          <span className="sidebar__label">Dados e backup</span>
          <BackupStatus state={backupState} />
        </button>
        {placeButton(
          { key: 'settings', place: 'settings', route: { name: 'settings' }, label: 'Configurações' },
          'sidebar__footer-item',
        )}
      </div>
    </nav>
  );
}
