interface Click {
  /** Where the click landed, in viewport pixels. */
  y: number;
  /** Bottom of the section's last line, in viewport pixels. */
  lastLineBottom: number;
  /** The click landed on a line, a button or another control, which handle it themselves. */
  onControl: boolean;
}

/** Whether a click in a section is in its empty area below the lines, which opens a new line there. */
export function opensLineBelow({ y, lastLineBottom, onControl }: Click): boolean {
  return !onControl && y > lastLineBottom;
}
