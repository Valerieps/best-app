import { useEffect, useRef } from 'react';
import { loadMenuCounts } from '../application/queries';
import { navigate, type Route } from './hooks';
import { reader } from './services';
import { useLiveQuery } from './useLiveQuery';

interface Props {
  open: boolean;
  current: Route['name'];
  onClose(): void;
}

interface Place {
  route: Route;
  label: string;
  count?: number;
}

/**
 * The ☰ drawer (spec/navegacao.md, "Navegação"): only places, in groups. Rituals live in the global
 * bar, and the screen's own actions in its header.
 */
export function SideMenu({ open, current, onClose }: Props) {
  const counts = useLiveQuery(() => loadMenuCounts(reader));
  const firstLink = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    firstLink.current?.focus();
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const groups: { title: string; places: Place[] }[] = [
    { title: 'Hoje', places: [{ route: { name: 'day' }, label: 'Nota do dia' }] },
    {
      title: 'Listas',
      places: [
        { route: { name: 'active' }, label: 'Tarefas ativas', count: counts?.active },
        { route: { name: 'archived' }, label: 'Tarefas arquivadas', count: counts?.archived },
        { route: { name: 'wiki' }, label: 'Wiki pessoal', count: counts?.wiki },
      ],
    },
    {
      title: 'Planejamento',
      places: [
        { route: { name: 'projects' }, label: 'Projetos', count: counts?.projects },
        { route: { name: 'objectives' }, label: 'Objetivos' },
        { route: { name: 'habits' }, label: 'Hábitos' },
      ],
    },
  ];
  const system: Place[] = [
    { route: { name: 'data' }, label: 'Dados e backup' },
    { route: { name: 'settings' }, label: 'Configurações' },
  ];

  const go = (route: Route) => {
    navigate(route);
    onClose();
  };

  const placeButton = (place: Place, first = false) => (
    <button
      key={place.route.name}
      ref={first ? firstLink : undefined}
      type="button"
      className={`menu__item ${current === place.route.name ? 'menu__item--current' : ''}`}
      aria-current={current === place.route.name ? 'page' : undefined}
      onClick={() => go(place.route)}
    >
      <span>{place.label}</span>
      {place.count !== undefined && <span className="muted">{place.count}</span>}
    </button>
  );

  return (
    <div className="menu-backdrop" onClick={onClose}>
      <nav className="menu" aria-label="Menu" onClick={(event) => event.stopPropagation()}>
        {groups.map((group, index) => (
          <div className="menu__group" key={group.title}>
            <span className="menu__group-title">{group.title}</span>
            {group.places.map((place, placeIndex) => placeButton(place, index === 0 && placeIndex === 0))}
          </div>
        ))}
        <div className="menu__footer">{system.map((place) => placeButton(place))}</div>
      </nav>
    </div>
  );
}
