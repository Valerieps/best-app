import type { Project } from '../../domain/entities';
import { normalizeForMatch } from '../../domain/text';

/**
 * The title to save when the section title field loses the focus, or null for nothing. Choosing
 * a suggestion already saved what it chose (a project, a new project or a title) and then
 * leaves the field: saving the typed text there would write it over the choice.
 */
export function titleToSaveOnBlur(typed: string, saved: string | null, choseSuggestion: boolean): string | null {
  if (choseSuggestion) return null;
  return typed.trim() !== (saved ?? '') ? typed : null;
}

export type TitleOption =
  | { type: 'project'; project: Project }
  | { type: 'create'; name: string }
  /**
   * A linked section renames its project to `name`. With the project's own name, it only starts
   * the renaming: the field is selected for me to type the new name.
   */
  | { type: 'rename'; name: string; project: Project }
  /** The typed text becomes only the title: a whiteboard, or a linked section going back to one. */
  | { type: 'titleOnly'; name: string };

const MAX_SUGGESTIONS = 5;

const byName = (a: Project, b: Project) => a.name.localeCompare(b.name, 'pt-BR');

/**
 * What the title field of a section suggests (spec/nota-do-dia.md). On a whiteboard, for the
 * typed text: matching active projects, creating a project with that name, and using it only as
 * a title. On a linked section, as soon as I click the title: going back to a whiteboard,
 * renaming the project and every other active project, to move the section there; typing
 * filters that list, offers to rename the project to the typed name first and to create one.
 */
export function titleOptions(typed: string, projects: readonly Project[], current: Project | null, edited = true): TitleOption[] {
  const name = typed.trim();
  const query = normalizeForMatch(name);
  const others = projects.filter((p) => p.status === 'active' && p.id !== current?.id);
  if (current && (!edited || query === normalizeForMatch(current.name))) {
    return [
      { type: 'titleOnly', name: name || current.name },
      { type: 'rename', name: current.name, project: current },
      ...[...others].sort(byName).map((project): TitleOption => ({ type: 'project', project })),
    ];
  }
  if (!name) return [];
  const matching = others.filter((p) => normalizeForMatch(p.name).includes(query));
  const options: TitleOption[] = [];
  if (current) {
    options.push({ type: 'rename', name, project: current }, { type: 'titleOnly', name });
    matching.sort(byName).forEach((project) => options.push({ type: 'project', project }));
  } else {
    matching.slice(0, MAX_SUGGESTIONS).forEach((project) => options.push({ type: 'project', project }));
  }
  if (!projects.some((p) => normalizeForMatch(p.name) === query)) options.push({ type: 'create', name });
  if (!current) options.push({ type: 'titleOnly', name });
  return options;
}
