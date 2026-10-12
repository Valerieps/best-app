import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef } from 'react';
import { loadMenuCounts } from '../application/queries';
import { navigate } from './hooks';
import { reader } from './services';
import { useLiveQuery } from './useLiveQuery';
/**
 * The ☰ drawer (SPEC.md, "Navegação"): only places, in groups. Rituals live in the global
 * bar, and the screen's own actions in its header.
 */
export function SideMenu({ open, current, onClose }) {
    const counts = useLiveQuery(() => loadMenuCounts(reader));
    const firstLink = useRef(null);
    useEffect(() => {
        if (!open)
            return;
        firstLink.current?.focus();
        const onKey = (event) => event.key === 'Escape' && onClose();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);
    if (!open)
        return null;
    const groups = [
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
    const system = [
        { route: { name: 'data' }, label: 'Dados e backup' },
        { route: { name: 'settings' }, label: 'Configurações' },
    ];
    const go = (route) => {
        navigate(route);
        onClose();
    };
    const placeButton = (place, first = false) => (_jsxs("button", { ref: first ? firstLink : undefined, type: "button", className: `menu__item ${current === place.route.name ? 'menu__item--current' : ''}`, "aria-current": current === place.route.name ? 'page' : undefined, onClick: () => go(place.route), children: [_jsx("span", { children: place.label }), place.count !== undefined && _jsx("span", { className: "muted", children: place.count })] }, place.route.name));
    return (_jsx("div", { className: "menu-backdrop", onClick: onClose, children: _jsxs("nav", { className: "menu", "aria-label": "Menu", onClick: (event) => event.stopPropagation(), children: [groups.map((group, index) => (_jsxs("div", { className: "menu__group", children: [_jsx("span", { className: "menu__group-title", children: group.title }), group.places.map((place, placeIndex) => placeButton(place, index === 0 && placeIndex === 0))] }, group.title))), _jsx("div", { className: "menu__footer", children: system.map((place) => placeButton(place)) })] }) }));
}
