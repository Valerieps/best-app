import { createContext, useContext, type ReactNode } from 'react';
import { loadPeople } from '../../application/queries';
import type { Person } from '../../domain/entities';
import { reader } from '../services';
import { useLiveQueryState } from '../useLiveQuery';

const NO_PEOPLE: readonly Person[] = [];

const PeopleContext = createContext<readonly Person[]>(NO_PEOPLE);

/**
 * The people cited with `@` (spec/pessoas.md), for every line that suggests or shows them. A
 * failed query leaves the lines working, only without the suggestions.
 */
export function PeopleProvider({ children }: { children: ReactNode }) {
  const people = useLiveQueryState(() => loadPeople(reader)).value ?? NO_PEOPLE;
  return <PeopleContext.Provider value={people}>{children}</PeopleContext.Provider>;
}

export function usePeople(): readonly Person[] {
  return useContext(PeopleContext);
}
