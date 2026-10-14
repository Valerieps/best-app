import { useState } from 'react';
import { loadCleanup, loadMenuCounts } from '../application/queries';
import type { ReviewAvailability } from '../application/reviewQueries';
import { setSidebarCollapsed } from '../application/settings';
import type { DayKey } from '../domain/day';
import type { AutoBackupState } from '../infrastructure/autoBackup';
import { BackupStatus } from './backup/BackupStatus';
import { Icon } from './components/Icon';
import { formatShortDate, weekdayName } from './format';
import { navigate, type Route } from './hooks';
import { appContext, reader } from './services';
import { isRitual, sidebarPlace, type SidebarPlace } from './sidebarPlace';
import { useLiveQueryState } from './useLiveQuery';
import { directionReviewEnabled, FEATURES } from './features';
import { enqueue } from './writeQueue';

interface Props {
  route: Route;
  today: DayKey;
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
  badge?: string;
}

function Badge({ count }: { count: number }) {
  return count > 0 ? <span className="badge">{count}</span> : null;
}

/**
 * Level 1 of the navigation (spec/navegacao.md, "Navegação"): the only global bar, fixed on the
 * left of every screen but "Iniciar Dia". Only places, in groups; it can be collapsed to a strip.
 */
export function Sidebar({ route, today, pendingDays, reviews, backupState }: Props) {
  const current = sidebarPlace(route);
  const storedCollapsed = useLiveQueryState(async () => (await reader.settings())?.sidebarCollapsed ?? false).value;
  // The toggle shows at once; the settings write follows (as in ADR-036).
  const [collapsedNow, setCollapsedNow] = useState<boolean | null>(null);
  const collapsed = collapsedNow ?? storedCollapsed ?? false;
  const [ritualsOpen, setRitualsOpen] = useState(() => isRitual(current));

  // Counts are extras: a failed query is logged and the sidebar goes on without them.
  const counts = useLiveQueryState(() => loadMenuCounts(reader)).value;
  const focusDue = (reviews?.focus.length ?? 0) > 0;
  const directionDue = (reviews?.direction.length ?? 0) > 0;
  const cleanup = useLiveQueryState(() => loadCleanup(reader)).value;
  const cleanupCount = cleanup ? cleanup.whiteboards.length + cleanup.duplicates.length : 0;
  const dueCount = pendingDays.length + (focusDue ? 1 : 0) + (directionDue ? 1 : 0);

  const toggle = () => {
    const next = !collapsed;
    setCollapsedNow(next);
    enqueue(() => setSidebarCollapsed(appContext, next)).catch(() => {
      // Logged by the queue; the choice still holds on screen until the next load.
    });
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

  const rituals: Place[] = [
    {
      key: 'checkout-today',
      place: 'checkout',
      route: { name: 'checkout', day: today },
      label: 'Fechar o dia de hoje',
    },
    ...pendingDays.map((day): Place => ({
      key: `checkout-${day}`,
      place: 'checkout',
      route: { name: 'checkout', day },
      label: `Fechar ${weekdayName(day)}, ${formatShortDate(day)}`,
      badge: 'pendente',
    })),
    {
      key: 'focusReview',
      place: 'focusReview',
      route: { name: 'focusReview' },
      label: 'Revisão de Foco',
      badge: focusDue ? 'disponível' : undefined,
    },
    // Hidden until the objectives' spec is done (ui/features.ts).
    ...(directionReviewEnabled()
      ? [
          {
            key: 'directionReview',
            place: 'directionReview' as const,
            route: { name: 'directionReview' as const },
            label: 'Revisão de Rumo',
            badge: directionDue ? 'disponível' : undefined,
          },
        ]
      : []),
    {
      key: 'cleanup',
      place: 'cleanup',
      route: { name: 'cleanup' },
      label: 'Colocar ordem na casa',
      count: cleanupCount || undefined,
    },
  ];
  const groups: { title: string; places: Place[] }[] = [
    {
      title: 'Planejamento',
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
      title: 'Listas',
      places: [
        {
          key: 'active',
          place: 'active',
          route: { name: 'active' },
          label: 'Tarefas ativas',
          count: counts?.active,
        },
        {
          key: 'archived',
          place: 'archived',
          route: { name: 'archived' },
          label: 'Tarefas arquivadas',
          count: counts?.archived,
        },
        {
          key: 'wiki',
          place: 'wiki',
          route: { name: 'wiki' },
          label: 'Wiki pessoal',
          count: counts?.wiki,
        },
      ],
    },
  ];

  // A checkout is current only for its own day; the other places match by name.
  const isCurrent = (place: Place) =>
    place.place === current &&
    (place.route.name !== 'checkout' || (route.name === 'checkout' && route.day === place.route.day));

  const placeButton = (place: Place, extraClass = '') => (
    <button
      key={place.key}
      type="button"
      className={`sidebar__item ${extraClass} ${isCurrent(place) ? 'sidebar__item--current' : ''}`}
      aria-current={isCurrent(place) ? 'page' : undefined}
      onClick={() => navigate(place.route)}
    >
      <span className="sidebar__label">{place.label}</span>
      {place.badge && (
        <span className={`badge ${place.badge === 'pendente' ? 'badge--warning' : ''}`}>{place.badge}</span>
      )}
      {place.count !== undefined && <span className="muted">{place.count}</span>}
    </button>
  );

  return (
    <nav className="sidebar" aria-label="Menu">
      <div className="sidebar__header">
        <button type="button" className="sidebar__name" onClick={() => navigate({ name: 'day' })}>
          Best App
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
        <button
          type="button"
          className="sidebar__item"
          aria-expanded={ritualsOpen}
          onClick={() => setRitualsOpen(!ritualsOpen)}
        >
          <span className="sidebar__label">
            Rituais <Icon name={ritualsOpen ? 'chevronDown' : 'chevronRight'} size="sm" />
          </span>
          <Badge count={dueCount} />
        </button>
        {ritualsOpen && rituals.map((place) => placeButton(place, 'sidebar__item--sub'))}
      </div>

      {groups.map((group) => (
        <div className="sidebar__group" key={group.title}>
          <span className="sidebar__group-title">{group.title}</span>
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
