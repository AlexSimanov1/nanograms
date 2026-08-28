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
    // Timer (16.1): startedAt is set on the first move; elapsedTime is fixed
    // on completion. Both are persisted so the clock survives reloads.
    startedAt: null,
    elapsedTime: 0,
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
  const started = progress.status === ProgressStatus.NOT_STARTED
  return {
    ...progress,
    cells,
    status: started ? ProgressStatus.IN_PROGRESS : progress.status,
    // The timer starts with the first move and is never reset by later edits.
    startedAt: started ? Date.now() : progress.startedAt,
  }
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

// Build the height×width grid of filled/not-filled booleans that is sent to
// the backend for verification. Only FILLED cells are true; marked and empty
// cells are false, because the solution only describes the filled set.
export function filledGrid(progress) {
  return progress.cells.map((row) => row.map((state) => state === CellState.FILLED))
}

// Mark a puzzle as solved: lock edits, record the completion time and fix the
// elapsed time so the clock stops ticking. The player's cells are left
// untouched (an incorrect check never discards them). Immutable, like the
// other transitions.
export function complete(progress) {
  if (progress.status === ProgressStatus.COMPLETED) {
    return progress
  }
  const now = Date.now()
  const elapsedTime =
    Number.isFinite(progress.startedAt) ? now - progress.startedAt : 0
  return {
    ...progress,
    status: ProgressStatus.COMPLETED,
    completedAt: now,
    elapsedTime,
  }
}

// Seconds shown for a completed puzzle (fixed), or the live elapsed time since
// the first move for one still in progress. `now` is injectable for tests.
export function elapsedMs(progress, now = Date.now()) {
  if (progress.status === ProgressStatus.COMPLETED) {
    return progress.elapsedTime ?? 0
  }
  if (!Number.isFinite(progress.startedAt)) {
    return 0
  }
  return now - progress.startedAt
}

// Render milliseconds as "MM:SS", or "H:MM:SS" once an hour is passed.
export function formatDuration(ms) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}
