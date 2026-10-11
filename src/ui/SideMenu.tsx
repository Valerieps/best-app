import { useEffect, useRef } from 'react';
import { loadCleanup, loadMenuCounts } from '../application/queries';
import { navigate, type Route } from './hooks';
import { reader } from './services';
import { useLiveQuery } from './useLiveQuery';

interface Props {
  open: boolean;
  current: Route['name'];
  onClose(): void;
}

/** Side menu with the three lists, as in the drafts, plus data and backup. */
export function SideMenu({ open, current, onClose }: Props) {
  const counts = useLiveQuery(() => loadMenuCounts(reader));
  const cleanup = useLiveQuery(() => loadCleanup(reader));
  const cleanupCount = cleanup ? cleanup.whiteboards.length + cleanup.duplicates.length : 0;
  const firstLink = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    firstLink.current?.focus();
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const items: { route: Route; label: string; count?: number }[] = [
    { route: { name: 'day' }, label: 'Nota do dia' },
    { route: { name: 'active' }, label: 'Tarefas ativas', count: counts?.active },
    { route: { name: 'archived' }, label: 'Tarefas arquivadas', count: counts?.archived },
    { route: { name: 'wiki' }, label: 'Wiki pessoal', count: counts?.wiki },
    { route: { name: 'projects' }, label: 'Projetos', count: counts?.projects },
    { route: { name: 'objectives' }, label: 'Objetivos' },
    { route: { name: 'habits' }, label: 'Hábitos' },
    { route: { name: 'reflection' }, label: 'Reflexão semanal' },
    { route: { name: 'monthReflection' }, label: 'Reflexão mensal' },
  ];

  const go = (route: Route) => {
    navigate(route);
    onClose();
  };

  return (
    <div className="menu-backdrop" onClick={onClose}>
      <nav className="menu" aria-label="Menu" onClick={(event) => event.stopPropagation()}>
        {items.map((item, index) => (
          <button
            key={item.route.name}
            ref={index === 0 ? firstLink : undefined}
            type="button"
            className={`menu__item ${current === item.route.name ? 'menu__item--current' : ''}`}
            aria-current={current === item.route.name ? 'page' : undefined}
            onClick={() => go(item.route)}
          >
            <span>{item.label}</span>
            {item.count !== undefined && <span className="muted">{item.count}</span>}
          </button>
        ))}
        <hr className="menu__divider" />
        <button
          type="button"
          className={`menu__item ${current === 'cleanup' ? 'menu__item--current' : ''}`}
          onClick={() => go({ name: 'cleanup' })}
        >
          <span>Colocar ordem na casa</span>
          {cleanupCount > 0 && <span className="muted">{cleanupCount}</span>}
        </button>
        <button
          type="button"
          className={`menu__item ${current === 'data' ? 'menu__item--current' : ''}`}
          onClick={() => go({ name: 'data' })}
        >
          Dados e backup
        </button>
        <button
          type="button"
          className={`menu__item ${current === 'settings' ? 'menu__item--current' : ''}`}
          onClick={() => go({ name: 'settings' })}
        >
          Configurações
        </button>
      </nav>
    </div>
  );
}
