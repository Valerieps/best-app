/**
 * The title to save when the section title field loses the focus, or null for nothing. Choosing
 * a suggestion already saved what it chose (a project, a new project or a title) and then
 * leaves the field: saving the typed text there would write it over the choice.
 */
export function titleToSaveOnBlur(typed: string, saved: string | null, choseSuggestion: boolean): string | null {
  if (choseSuggestion) return null;
  return typed.trim() !== (saved ?? '') ? typed : null;
}
