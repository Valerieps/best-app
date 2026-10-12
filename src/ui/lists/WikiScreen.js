import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { loadWiki } from '../../application/queries';
import { normalizeForMatch } from '../../domain/text';
import { ProjectChip } from '../components/Chips';
import { Linkified } from '../components/Linkified';
import { LoadingPage } from '../components/Skeleton';
import { formatShortDate, formatTime } from '../format';
import { reader } from '../services';
import { useLiveQuery } from '../useLiveQuery';
function entryName(entry) {
    return entry.project?.name ?? entry.section.title ?? entry.notes[0]?.text ?? '';
}
/** Wiki pessoal with order, text search and filters by type or project (1b). */
export function WikiScreen({ focus }) {
    const entries = useLiveQuery(() => loadWiki(reader));
    const [query, setQuery] = useState('');
    const [order, setOrder] = useState('recent');
    const [filter, setFilter] = useState('all');
    useEffect(() => {
        if (!focus || !entries)
            return;
        document.getElementById(`wiki-${focus}`)?.scrollIntoView({ block: 'center' });
    }, [focus, entries]);
    const projects = useMemo(() => {
        const byId = new Map((entries ?? []).flatMap((entry) => (entry.project ? [[entry.project.id, entry.project]] : [])));
        return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    }, [entries]);
    const shown = useMemo(() => {
        if (!entries)
            return [];
        const needle = normalizeForMatch(query);
        const filtered = entries.filter((entry) => {
            if (filter === 'general' && entry.section.kind !== 'general')
                return false;
            if (filter === 'meeting' && entry.section.kind !== 'meeting')
                return false;
            if (filter.startsWith('project:') && entry.project?.id !== filter.slice('project:'.length))
                return false;
            if (!needle)
                return true;
            const haystack = [entry.section.title ?? '', entry.project?.name ?? '', ...entry.notes.map((note) => note.text)].join('\n');
            return normalizeForMatch(haystack).includes(needle);
        });
        return order === 'alphabetical'
            ? [...filtered].sort((a, b) => entryName(a).localeCompare(entryName(b), 'pt-BR'))
            : filtered;
    }, [entries, query, order, filter]);
    if (!entries)
        return _jsx(LoadingPage, { title: "Wiki pessoal" });
    return (_jsxs("main", { className: "page", children: [_jsx("h1", { className: "page__title", children: "Wiki pessoal" }), entries.length === 0 ? (_jsx("p", { className: "muted", children: "As notas triadas no checkout aparecem aqui." })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "toolbar", children: [_jsx("input", { type: "search", className: "text-input toolbar__search", placeholder: "Buscar nas notas", value: query, onChange: (event) => setQuery(event.target.value), "aria-label": "Buscar nas notas" }), _jsxs("select", { className: "text-input", value: order, onChange: (event) => setOrder(event.target.value), "aria-label": "Ordem", children: [_jsx("option", { value: "recent", children: "Mais recentes" }), _jsx("option", { value: "alphabetical", children: "Ordem alfab\u00E9tica" })] }), _jsxs("select", { className: "text-input", value: filter, onChange: (event) => setFilter(event.target.value), "aria-label": "Mostrar", children: [_jsx("option", { value: "all", children: "Todas as notas" }), _jsx("option", { value: "general", children: "Se\u00E7\u00F5es gerais" }), _jsx("option", { value: "meeting", children: "Reuni\u00F5es" }), projects.map((project) => (_jsxs("option", { value: `project:${project.id}`, children: ["Projeto: ", project.name] }, project.id)))] })] }), shown.length === 0 ? (_jsx("p", { className: "muted", children: "Nenhuma nota encontrada." })) : (_jsx("ul", { className: "card-list", children: shown.map(({ section, notes, project }) => (_jsxs("li", { id: `wiki-${section.id}`, className: `card-list__item card-list__item--stacked ${focus === section.id ? 'card-list__item--focus' : ''}`, children: [_jsxs("span", { className: "wiki__meta muted", children: [formatShortDate(section.day), " \u00B7 ", formatTime(section.createdAt), " \u00B7", ' ', section.kind === 'meeting' ? 'Reunião' : 'Geral', !project && ` · ${section.title ?? 'sem título'}`, project && _jsx(ProjectChip, { name: project.name })] }), notes.map((note) => (_jsx("p", { className: "wiki__note", children: _jsx(Linkified, { text: note.text }) }, note.id)))] }, section.id))) }))] }))] }));
}
