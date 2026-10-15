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
  /** A linked section keeps its project and only changes its title. */
  | { type: 'keepProject'; name: string; project: Project }
  /** The typed text becomes only the title: a whiteboard, or a linked section going back to one. */
  | { type: 'titleOnly'; name: string };

const MAX_SUGGESTIONS = 5;

/**
 * What the title field of a section suggests for the typed text (spec/nota-do-dia.md): matching
 * active projects, creating a project with that name, and using it only as a title. A section
 * linked to a project first offers to keep it, so Enter never moves the section by surprise.
 */
export function titleOptions(typed: string, projects: readonly Project[], current: Project | null): TitleOption[] {
  const name = typed.trim();
  if (!name) return [];
  const query = normalizeForMatch(name);
  const options: TitleOption[] = [];
  if (current && query !== normalizeForMatch(current.name)) options.push({ type: 'keepProject', name, project: current });
  projects
    .filter((p) => p.status === 'active' && p.id !== current?.id && normalizeForMatch(p.name).includes(query))
    .slice(0, MAX_SUGGESTIONS)
    .forEach((project) => options.push({ type: 'project', project }));
  if (!projects.some((p) => normalizeForMatch(p.name) === query)) options.push({ type: 'create', name });
  options.push({ type: 'titleOnly', name });
  return options;
}
