import type { RightPanelMenu } from '../domain/entities';
import type { IconName } from './components/Icon';
import type { Route } from './hooks';

/** Widths of the open right panel, in pixels (spec/navegacao.md, "Painel da direita"). It has no maximum. */
export const RIGHT_PANEL_WIDTH = { default: 360, min: 280 } as const;

/** Step of the arrow keys on the resize handle. */
export const RIGHT_PANEL_WIDTH_STEP = 16;

/** Keeps a width the user dragged to above the minimum, in whole pixels. */
export function clampRightPanelWidth(width: number): number {
  if (!Number.isFinite(width)) return RIGHT_PANEL_WIDTH.default;
  return Math.round(Math.max(RIGHT_PANEL_WIDTH.min, width));
}

export interface RightPanelMenuEntry {
  menu: RightPanelMenu;
  label: string;
  icon: IconName;
  /** The full screen of the same menu: while the center shows it, the panel stays collapsed. */
  screen: Route['name'];
}

/** The menus of the strip, top to bottom. The first one opens with the toggle and the shortcut. */
export const RIGHT_PANEL_MENUS: readonly RightPanelMenuEntry[] = [
  { menu: 'execute', label: 'Fila de execução', icon: 'bolt', screen: 'execute' },
];

export function rightPanelEntry(menu: RightPanelMenu): RightPanelMenuEntry | undefined {
  return RIGHT_PANEL_MENUS.find((entry) => entry.menu === menu);
}

/**
 * The menu the panel shows: the one left open, unless the center already shows the same screen,
 * so the screen never appears twice. Unknown menus, from an older or newer version, collapse it.
 */
export function shownRightPanelMenu(open: RightPanelMenu | null | undefined, route: Route): RightPanelMenu | null {
  if (!open) return null;
  const entry = rightPanelEntry(open);
  if (!entry || entry.screen === route.name) return null;
  return open;
}

/** Ctrl + Alt + B (⌘ + Option + B on the Mac), by the key's position, as the other shortcuts (ADR-048). */
export function isRightPanelShortcut(event: {
  code: string;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}): boolean {
  return event.code === 'KeyB' && (event.ctrlKey || event.metaKey) && event.altKey && !event.shiftKey;
}
