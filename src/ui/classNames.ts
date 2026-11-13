/** A class name a component may or may not add: `cond && 'x'` yields false when it does not. */
export type ClassPart = string | false | null | undefined;

/**
 * Joins the class names that are set, one space apart: `cx('line', done && 'line--done')`.
 * Used instead of template literals, which leave stray spaces and read worse once there are
 * several conditions.
 */
export function cx(...parts: ClassPart[]): string {
  return parts
    .flatMap((part) => (part ? part.split(/\s+/) : []))
    .filter(Boolean)
    .join(' ');
}
