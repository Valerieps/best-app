interface Click {
  /** Where the click landed, in viewport pixels. */
  y: number;
  /** Bottom of the section's last line, in viewport pixels; null when the section has no lines yet. */
  lastLineBottom: number | null;
  /** The click landed on a line, a button or another control, which handle it themselves. */
  onControl: boolean;
}

/**
 * Whether a click in a section opens a line to write in: in its empty area below the lines, or
 * anywhere in a section with no lines yet, which goes to its first line.
 */
export function opensLineBelow({ y, lastLineBottom, onControl }: Click): boolean {
  return !onControl && (lastLineBottom === null || y > lastLineBottom);
}
