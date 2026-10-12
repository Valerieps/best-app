import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { addLinkResource, removeResource } from '../../application/objectives';
import { Linkified, toSafeHref } from '../components/Linkified';
import { appContext } from '../services';
/** Section 4: notes and links that support an objective or a project. */
export function Resources({ owner, resources }) {
    const [url, setUrl] = useState('');
    const [title, setTitle] = useState('');
    return (_jsxs(_Fragment, { children: [resources.length === 0 ? (_jsx("p", { className: "muted", children: "Nenhum recurso. No checkout, as notas de uma se\u00E7\u00E3o podem virar recurso; links entram aqui." })) : (_jsx("ul", { className: "card-list", children: resources.map(({ resource, notes }) => {
                    const href = resource.url ? toSafeHref(resource.url) : null;
                    return (_jsxs("li", { className: "card-list__item card-list__item--stacked", children: [_jsxs("span", { className: "resource__header", children: [href ? (_jsx("a", { href: href, target: "_blank", rel: "noopener noreferrer", children: resource.title })) : (_jsx("strong", { children: resource.title })), _jsx("button", { type: "button", className: "line__action", onClick: () => void removeResource(appContext, resource.id), "aria-label": "Remover recurso", children: "\u2715" })] }), notes.map((note) => (_jsx("p", { className: "wiki__note", children: _jsx(Linkified, { text: note.text }) }, note.id)))] }, resource.id));
                }) })), _jsxs("form", { className: "settings__row", onSubmit: (event) => {
                    event.preventDefault();
                    if (!url.trim())
                        return;
                    void addLinkResource(appContext, owner, url, title);
                    setUrl('');
                    setTitle('');
                }, children: [_jsx("input", { className: "text-input", value: title, placeholder: "T\u00EDtulo", onChange: (event) => setTitle(event.target.value), "aria-label": "T\u00EDtulo do link" }), _jsx("input", { className: "text-input toolbar__search", value: url, placeholder: "Link (https://\u2026 ou go/\u2026)", onChange: (event) => setUrl(event.target.value), "aria-label": "Link" }), _jsx("button", { type: "submit", children: "Adicionar link" })] })] }));
}
