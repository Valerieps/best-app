import { Fragment } from 'react';

/**
 * Renders text with clickable links, without ever inserting HTML (google-safe.md).
 * Only http(s) links and internal "go/" short links become anchors.
 */

const LINK_PATTERN = /\b(https?:\/\/[^\s<>"]+|go\/[^\s<>"]+)/g;

export function toSafeHref(raw: string): string | null {
  const href = raw.startsWith('go/') ? `http://${raw}` : raw;
  try {
    const url = new URL(href);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

export function splitLinks(text: string): { text: string; href: string | null }[] {
  const parts: { text: string; href: string | null }[] = [];
  let last = 0;
  for (const match of text.matchAll(LINK_PATTERN)) {
    const start = match.index ?? 0;
    // Trailing punctuation usually ends the sentence, not the link.
    const raw = match[0].replace(/[.,;:!?)]+$/, '');
    if (start > last) parts.push({ text: text.slice(last, start), href: null });
    parts.push({ text: raw, href: toSafeHref(raw) });
    last = start + raw.length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), href: null });
  return parts;
}

export function Linkified({ text }: { text: string }) {
  return (
    <>
      {splitLinks(text).map((part, index) =>
        part.href ? (
          <a key={index} href={part.href} target="_blank" rel="noopener noreferrer">
            {part.text}
          </a>
        ) : (
          <Fragment key={index}>{part.text}</Fragment>
        ),
      )}
    </>
  );
}
