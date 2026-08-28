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

// The three explicit player actions (task 11). A distinct concept from the
// resulting CellState so the UI can offer a Fill / Mark / Clear choice that
// maps to a predictable state transition.
export const Action = Object.freeze({
  FILL: 'fill',
  MARK: 'mark',
  CLEAR: 'clear',
})

// Build a fresh, empty progress for a puzzle with the given dimensions.
// Status is NOT_STARTED until the first move.
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

function assertIndex(progress, row, col) {
  if (
    !Number.isInteger(row) ||
    !Number.isInteger(col) ||
    row < 0 ||
    col < 0 ||
    row >= progress.height ||
    col >= progress.width
  ) {
    throw new Error(`cell (${row}, ${col}) is out of bounds (${progress.width}x${progress.height})`)
  }
}

// Return a new progress with the given cell replaced by `state`.
// Immutable: the caller's progress (and its cells) is left untouched. Moving
// from the first empty cell flips status NOT_STARTED -> IN_PROGRESS; an
// already-completed puzzle does not accept edits.
function setCell(progress, row, col, state) {
  assertIndex(progress, row, col)
  if (progress.status === ProgressStatus.COMPLETED) {
    throw new Error('cannot edit a completed puzzle')
  }
  const cells = progress.cells.map((r) => r.slice())
  cells[row][col] = state
  const status =
    progress.status === ProgressStatus.NOT_STARTED
      ? ProgressStatus.IN_PROGRESS
      : progress.status
  return { ...progress, cells, status }
}

// Fill a cell (Zакрасить).
export function fill(progress, row, col) {
  return setCell(progress, row, col, CellState.FILLED)
}

// Mark a cell with a cross (Крестик).
export function mark(progress, row, col) {
  return setCell(progress, row, col, CellState.MARKED)
}

// Clear a cell back to empty.
export function clear(progress, row, col) {
  return setCell(progress, row, col, CellState.EMPTY)
}

// Apply one of the three player Actions to a cell, returning the new progress.
// The action's name is the contract the UI inputs are built around.
export function applyAction(progress, action, row, col) {
  switch (action) {
    case Action.FILL:
      return fill(progress, row, col)
    case Action.MARK:
      return mark(progress, row, col)
    case Action.CLEAR:
      return clear(progress, row, col)
    default:
      throw new Error(`unknown action: ${action}`)
  }
}
