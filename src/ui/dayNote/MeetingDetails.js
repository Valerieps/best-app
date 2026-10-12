import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { toSafeHref } from '../components/Linkified';
/** Optional participants and document link of a meeting section (1b). */
export function MeetingDetails({ section, onSave }) {
    const [participants, setParticipants] = useState(section.participants ?? '');
    const [docLink, setDocLink] = useState(section.docLink ?? '');
    useEffect(() => setParticipants(section.participants ?? ''), [section.participants]);
    useEffect(() => setDocLink(section.docLink ?? ''), [section.docLink]);
    const save = () => onSave({ participants, docLink });
    const href = docLink.trim() ? toSafeHref(docLink.trim()) : null;
    return (_jsxs("div", { className: "meeting-details", children: [_jsx("input", { className: "meeting-details__field", value: participants, placeholder: "Participantes", onChange: (event) => setParticipants(event.target.value), onBlur: save, "aria-label": "Participantes da reuni\u00E3o" }), _jsx("input", { className: "meeting-details__field", value: docLink, placeholder: "Link para documentos", onChange: (event) => setDocLink(event.target.value), onBlur: save, "aria-label": "Link para documentos da reuni\u00E3o" }), href && (_jsx("a", { href: href, target: "_blank", rel: "noopener noreferrer", className: "meeting-details__open", children: "abrir" }))] }));
}
