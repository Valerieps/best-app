/** Widths of the open sidebar, in pixels (spec/navegacao.md, "Global"). Matches --sidebar-width. */
export const SIDEBAR_WIDTH = { default: 260, min: 200, max: 480 } as const;

/** Step of the arrow keys on the resize handle. */
export const SIDEBAR_WIDTH_STEP = 16;

/** Keeps a width the user dragged to inside the limits, in whole pixels. */
export function clampSidebarWidth(width: number): number {
  if (!Number.isFinite(width)) return SIDEBAR_WIDTH.default;
  return Math.round(Math.min(SIDEBAR_WIDTH.max, Math.max(SIDEBAR_WIDTH.min, width)));
}
