// Client-side game state (MVP1 / 10.1).
//
// The frontend owns the current UI state and local progress (architecture
// AR-08). This module is the single source of truth for the playable board:
// the cells grid plus the current status of the whole puzzle. It has no DOM
// dependency so it stays plain, deterministic and easy to test.

export const CellState = Object.freeze({
  EMPTY: 'empty',
  FILLED: 'filled',
  MARKED: 'marked',
})

export const ProgressStatus = Object.freeze({
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
})

// Build a fresh, empty progress for a puzzle with the given dimensions.
// Status is NOT_STARTED until the first move (task 10.2+ moves it).
export function createEmptyProgress({ width, height }) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new Error('puzzle dimensions must be positive integers')
  }
  const cells = []
  for (let r = 0; r < height; r++) {
    cells.push(new Array(width).fill(CellState.EMPTY))
  }
  return {
    puzzleId: null,
    width,
    height,
    cells,
    status: ProgressStatus.NOT_STARTED,
  }
}
