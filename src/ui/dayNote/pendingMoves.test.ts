import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MOVE_COUNTDOWN_MS, PendingMoves, type PendingMove } from './pendingMoves';

describe('pending moves of priorities', () => {
  let committed: PendingMove[];
  let waiting: PendingMove[];
  let moves: PendingMoves;

  beforeEach(() => {
    vi.useFakeTimers();
    committed = [];
    waiting = [];
    moves = new PendingMoves(
      (move) => committed.push(move),
      (current) => (waiting = current),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('moves the task once the countdown ends', () => {
    moves.start({ taskId: 't-1', date: '2026-10-15' });
    expect(waiting).toEqual([{ taskId: 't-1', date: '2026-10-15' }]);

    vi.advanceTimersByTime(MOVE_COUNTDOWN_MS - 1);
    expect(committed).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(committed).toEqual([{ taskId: 't-1', date: '2026-10-15' }]);
    expect(waiting).toEqual([]);
  });

  it('cancelling leaves the task as it was', () => {
    moves.start({ taskId: 't-1', date: '2026-10-15' });
    moves.cancel('t-1');
    vi.advanceTimersByTime(MOVE_COUNTDOWN_MS * 2);
    expect(committed).toEqual([]);
    expect(waiting).toEqual([]);
  });

  it('picking another date starts the countdown over, with the new date', () => {
    moves.start({ taskId: 't-1', date: '2026-10-15' });
    vi.advanceTimersByTime(MOVE_COUNTDOWN_MS - 1000);
    moves.start({ taskId: 't-1', date: '2026-10-20' });
    vi.advanceTimersByTime(MOVE_COUNTDOWN_MS - 1);
    expect(committed).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(committed).toEqual([{ taskId: 't-1', date: '2026-10-20' }]);
  });

  it('leaving the screen commits the moves still waiting', () => {
    moves.start({ taskId: 't-1', date: '2026-10-15' });
    moves.start({ taskId: 't-2', date: null });
    moves.flush();
    expect(committed).toEqual([
      { taskId: 't-1', date: '2026-10-15' },
      { taskId: 't-2', date: null },
    ]);
    vi.advanceTimersByTime(MOVE_COUNTDOWN_MS);
    expect(committed).toHaveLength(2);
  });
});
