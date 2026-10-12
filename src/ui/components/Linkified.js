import { jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { Fragment } from 'react';
/**
 * Renders text with clickable links, without ever inserting HTML (google-safe.md).
 * Only http(s) links and internal "go/" short links become anchors.
 */
const LINK_PATTERN = /\b(https?:\/\/[^\s<>"]+|go\/[^\s<>"]+)/g;
export function toSafeHref(raw) {
    const href = raw.startsWith('go/') ? `http://${raw}` : raw;
    try {
        const url = new URL(href);
        return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
    }
    catch {
        return null;
    }
}
export function splitLinks(text) {
    const parts = [];
    let last = 0;
    for (const match of text.matchAll(LINK_PATTERN)) {
        const start = match.index ?? 0;
        // Trailing punctuation usually ends the sentence, not the link.
        const raw = match[0].replace(/[.,;:!?)]+$/, '');
        if (start > last)
            parts.push({ text: text.slice(last, start), href: null });
        parts.push({ text: raw, href: toSafeHref(raw) });
        last = start + raw.length;
    }
    if (last < text.length)
        parts.push({ text: text.slice(last), href: null });
    return parts;
}
export function Linkified({ text }) {
    return (_jsx(_Fragment, { children: splitLinks(text).map((part, index) => part.href ? (_jsx("a", { href: part.href, target: "_blank", rel: "noopener noreferrer", children: part.text }, index)) : (_jsx(Fragment, { children: part.text }, index))) }));
}
