import type { DayKey } from './day';

/**
 * Entities stored by the app. Each block, section and project is its own record:
 * blocks exist only once, and notes, projects and the wiki point at them instead of copying.
 * Timestamps are ISO 8601 strings.
 */

export type BlockKind = 'task' | 'note';

export type TaskStatus = 'active' | 'done' | 'archived' | 'abandoned';

export interface Block {
  id: string;
  kind: BlockKind;
  text: string;
  /** Section where the block was originally written. */
  sectionId: string;
  /** Fractional index that orders blocks inside a section without rewriting siblings. */
  position: string;
  projectId: string | null;
  createdAt: string;
  updatedAt: string;
  /** Task-only fields; null for notes. */
  status: TaskStatus | null;
  /** Day the task is meant to show up in the day note. */
  intendedDate: DayKey | null;
  /** First intended date ever set, kept to measure the distance to the final action. */
  firstIntendedDate: DayKey | null;
  postponeCount: number;
  /** When the task was finished, archived or abandoned. */
  closedAt: string | null;
}

export type SectionKind = 'general' | 'meeting';

/** Where a section's notes go at checkout. All notes of a section are triaged together. */
export type NotesDestination = 'pending' | 'wiki' | 'discarded';

/** Checkout decision for a section still on whiteboard (no project). */
export type WhiteboardDecision = 'pending' | 'leftUnlinked';

export interface Section {
  id: string;
  kind: SectionKind;
  day: DayKey;
  createdAt: string;
  updatedAt: string;
  title: string | null;
  /** Null means the section is on whiteboard. */
  projectId: string | null;
  notesDestination: NotesDestination;
  whiteboardDecision: WhiteboardDecision;
}

export type ProjectStatus = 'active' | 'finished';

export interface Project {
  id: string;
  name: string;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
  finishedAt: string | null;
}

/** Per-day bookkeeping. Whether a checkout is pending is derived from the blocks. */
export interface DayRecord {
  day: DayKey;
  lastCheckoutAt: string | null;
  updatedAt: string;
}
