import { createContext, useContext, type ReactNode } from 'react';
import type { Project } from '../../domain/entities';
import { reader } from '../services';
import { useLiveQueryState } from '../useLiveQuery';

const NO_PROJECTS: readonly Project[] = [];

const ProjectsContext = createContext<readonly Project[]>(NO_PROJECTS);

/**
 * The projects the `#` tag suggests and recognizes on every line (ADR-066). A failed query leaves
 * the lines working, only without the suggestions.
 */
export function ProjectsProvider({ children }: { children: ReactNode }) {
  const projects = useLiveQueryState(() => reader.projects()).value ?? NO_PROJECTS;
  return <ProjectsContext.Provider value={projects}>{children}</ProjectsContext.Provider>;
}

export function useProjects(): readonly Project[] {
  return useContext(ProjectsContext);
}
