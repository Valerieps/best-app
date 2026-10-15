import type { DayKey } from '../../domain/day';

/** How long a priority waits, with the option to cancel, before going to its new date. */
export const MOVE_COUNTDOWN_MS = 5000;

export interface PendingMove {
  taskId: string;
  date: DayKey | null;
}

/**
 * Moves of priorities to another intended date, each waiting for its countdown
 * (spec/prioridades.md, "Prioridades do dia"). A move ends by committing, once the time runs
 * out or when the screen goes away, or by cancelling, which leaves the task as it was.
 */
export class PendingMoves {
  private readonly timers = new Map<string, { move: PendingMove; timer: ReturnType<typeof setTimeout> }>();

  constructor(
    private readonly commit: (move: PendingMove) => void,
    private readonly changed: (moves: PendingMove[]) => void,
    private readonly ms = MOVE_COUNTDOWN_MS,
  ) {}

  /** Starts the countdown; picking another date for the same task starts it over. */
  start(move: PendingMove): void {
    this.clear(move.taskId);
    const timer = setTimeout(() => this.finish(move.taskId), this.ms);
    this.timers.set(move.taskId, { move, timer });
    this.notify();
  }

  cancel(taskId: string): void {
    if (this.clear(taskId)) this.notify();
  }

  /** Commits every move still waiting, so leaving the screen never loses a chosen date. */
  flush(): void {
    for (const taskId of [...this.timers.keys()]) this.finish(taskId);
  }

  private finish(taskId: string): void {
    const entry = this.timers.get(taskId);
    if (!entry) return;
    this.clear(taskId);
    this.notify();
    this.commit(entry.move);
  }

  private clear(taskId: string): boolean {
    const entry = this.timers.get(taskId);
    if (!entry) return false;
    clearTimeout(entry.timer);
    this.timers.delete(taskId);
    return true;
  }

  private notify(): void {
    this.changed([...this.timers.values()].map((entry) => entry.move));
  }
}
