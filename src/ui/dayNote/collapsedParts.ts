import { useState } from 'react';

const COLLAPSED_KEY = 'best-app:collapsed-parts';

/** Adds the part when absent, removes it when present. */
export function toggleCollapsed(collapsed: readonly string[], key: string): string[] {
  return collapsed.includes(key) ? collapsed.filter((item) => item !== key) : [...collapsed, key];
}

/** Reads the stored list, ignoring anything that is not a list of strings. */
export function parseCollapsed(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function readCollapsed(): string[] {
  try {
    return parseCollapsed(localStorage.getItem(COLLAPSED_KEY));
  } catch {
    return [];
  }
}

/**
 * The parts of the day note shown collapsed, by key (spec/nota-do-dia.md, "Seções e atalhos").
 * A convenience of this browser only, like pinning the priorities.
 */
export function useCollapsedParts(): [Set<string>, (key: string) => void] {
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const toggle = (key: string) => {
    setCollapsed((current) => {
      const next = toggleCollapsed(current, key);
      try {
        localStorage.setItem(COLLAPSED_KEY, JSON.stringify(next));
      } catch {
        // Nothing to do: the choice just won't be remembered.
      }
      return next;
    });
  };
  return [new Set(collapsed), toggle];
}
