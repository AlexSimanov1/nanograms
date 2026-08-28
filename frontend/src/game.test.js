import { describe, it, expect } from 'vitest'
import {
  Action,
  CellState,
  ProgressStatus,
  applyAction,
  complete,
  createEmptyProgress,
  elapsedMs,
  filledGrid,
  fill,
  formatDuration,
  mark,
  clear,
} from './game.js'

function makeProgress(width = 3, height = 3) {
  return createEmptyProgress({ width, height })
}

function state(progress, row, col) {
  return progress.cells[row][col]
}

describe('createEmptyProgress', () => {
  it('builds an all-empty grid of the given size', () => {
    const p = makeProgress(5, 3)
    expect(p.width).toBe(5)
    expect(p.height).toBe(3)
    expect(p.cells).toHaveLength(3)
    for (const row of p.cells) {
      expect(row).toHaveLength(5)
      expect(row.every((c) => c === CellState.EMPTY)).toBe(true)
    }
  })

  it('starts as NOT_STARTED', () => {
    expect(makeProgress().status).toBe(ProgressStatus.NOT_STARTED)
  })

  it('rejects invalid dimensions', () => {
    for (const args of [{ width: 0, height: 3 }, { width: 3, height: 0 }, { width: -1, height: 3 }, { width: 2.5, height: 3 }]) {
      expect(() => createEmptyProgress(args)).toThrow()
    }
  })
})

describe('fill / mark / clear', () => {
  it('fill sets a cell to FILLED and immutable-updates', () => {
    const p = makeProgress()
    const next = fill(p, 1, 1)
    expect(state(next, 1, 1)).toBe(CellState.FILLED)
    // original untouched
    expect(state(p, 1, 1)).toBe(CellState.EMPTY)
  })

  it('mark sets a cell to MARKED', () => {
    const p = makeProgress()
    expect(state(mark(p, 0, 2), 0, 2)).toBe(CellState.MARKED)
  })

  it('clear resets any state back to EMPTY', () => {
    let p = makeProgress()
    p = fill(p, 2, 2)
    expect(state(clear(p, 2, 2), 2, 2)).toBe(CellState.EMPTY)
    // clear on an already-empty cell stays empty
    expect(state(clear(p, 0, 0), 0, 0)).toBe(CellState.EMPTY)
  })

  it('any action flips NOT_STARTED to IN_PROGRESS', () => {
    expect(fill(makeProgress(), 0, 0).status).toBe(ProgressStatus.IN_PROGRESS)
    expect(mark(makeProgress(), 0, 0).status).toBe(ProgressStatus.IN_PROGRESS)
    expect(clear(makeProgress(), 0, 0).status).toBe(ProgressStatus.IN_PROGRESS)
  })

  it('leaves other cells untouched', () => {
    const next = fill(makeProgress(3, 3), 1, 1)
    const others = next.cells.flat().filter((c) => c === CellState.FILLED)
    expect(others).toHaveLength(1)
  })

  it('does not mutate the shared row arrays of the original', () => {
    const p = makeProgress()
    const next = fill(p, 0, 0)
    expect(next.cells[0]).not.toBe(p.cells[0])
    expect(state(p, 0, 0)).toBe(CellState.EMPTY)
  })
})

describe('applyAction', () => {
  it('maps the three actions to their states', () => {
    const p = makeProgress(2, 2)
    expect(state(applyAction(p, Action.FILL, 0, 0), 0, 0)).toBe(CellState.FILLED)
    expect(state(applyAction(p, Action.MARK, 0, 1), 0, 1)).toBe(CellState.MARKED)
    // clear on a filled cell resets to empty
    let c = fill(p, 1, 1)
    expect(state(applyAction(c, Action.CLEAR, 1, 1), 1, 1)).toBe(CellState.EMPTY)
  })

  it('flips status to IN_PROGRESS', () => {
    expect(applyAction(makeProgress(), Action.FILL, 0, 0).status).toBe(
      ProgressStatus.IN_PROGRESS,
    )
  })

  it('is immutable', () => {
    const p = makeProgress()
    const next = applyAction(p, Action.MARK, 0, 0)
    expect(state(p, 0, 0)).toBe(CellState.EMPTY)
    expect(state(next, 0, 0)).toBe(CellState.MARKED)
  })

  it('rejects an unknown action', () => {
    expect(() => applyAction(makeProgress(), 'erase', 0, 0)).toThrow(/unknown action/)
  })
})

describe('filledGrid', () => {
  it('maps only FILLED cells to true, empty and marked to false', () => {
    let p = fill(makeProgress(2, 2), 0, 0)
    p = mark(p, 0, 1)
    expect(filledGrid(p)).toEqual([
      [true, false],
      [false, false],
    ])
  })

  it('returns an all-false grid for a fresh puzzle', () => {
    expect(filledGrid(makeProgress(3, 2))).toEqual([
      [false, false, false],
      [false, false, false],
    ])
  })
})

describe('complete', () => {
  it('marks an in-progress puzzle as COMPLETED with a completion time', () => {
    const p = fill(makeProgress(2, 2), 0, 0)
    const c = complete(p)
    expect(c.status).toBe(ProgressStatus.COMPLETED)
    expect(typeof c.completedAt).toBe('number')
    // player's cells are untouched
    expect(c.cells).toEqual(p.cells)
    // original remains in_progress and unedited
    expect(p.status).toBe(ProgressStatus.IN_PROGRESS)
  })

  it('is a no-op on an already completed puzzle', () => {
    const p = complete(fill(makeProgress(2, 2), 0, 0))
    const again = complete(p)
    expect(again.status).toBe(ProgressStatus.COMPLETED)
    expect(again.completedAt).toBe(p.completedAt)
  })
})

describe('out-of-bounds and completed guard', () => {
  it('throws for out-of-bounds coordinates', () => {
    const p = makeProgress(3, 3)
    for (const [r, c] of [[-1, 0], [0, -1], [3, 0], [0, 3], [1.5, 0]]) {
      expect(() => fill(p, r, c)).toThrow()
      expect(() => mark(p, r, c)).toThrow()
      expect(() => clear(p, r, c)).toThrow()
    }
  })

  it('refuses to edit a completed puzzle', () => {
    const p = { ...makeProgress(), status: ProgressStatus.COMPLETED }
    expect(() => fill(p, 0, 0)).toThrow(/completed/)
  })
})

describe('timer model (16)', () => {
  it('a fresh puzzle has no clock running', () => {
    const p = makeProgress()
    expect(p.startedAt).toBeNull()
    expect(p.elapsedTime).toBe(0)
    expect(elapsedMs(p, 5000)).toBe(0)
  })

  it('the first move starts the clock and later moves do not reset it', () => {
    const first = fill(makeProgress(), 0, 0)
    expect(first.startedAt).not.toBeNull()
    expect(typeof first.startedAt).toBe('number')
    const later = fill(first, 1, 1)
    expect(later.startedAt).toBe(first.startedAt)
  })

  it('elapsedMs reports the live time since the first move', () => {
    const p = fill(makeProgress(), 0, 0)
    expect(elapsedMs(p, p.startedAt + 65_000)).toBe(65_000)
  })

  it('complete fixes the elapsed time and stops the clock', () => {
    const p = fill(makeProgress(), 0, 0)
    const done = complete(p)
    const now = done.completedAt
    expect(done.elapsedTime).toBe(now - p.startedAt)
    // fixed: no longer grows with `now`
    expect(elapsedMs(done, now + 9_999_999)).toBe(done.elapsedTime)
  })

  it('complete on a fresh (never started) puzzle yields zero elapsed', () => {
    const done = complete(makeProgress())
    expect(done.elapsedTime).toBe(0)
  })
})

describe('formatDuration (16)', () => {
  it('formats seconds and minutes as MM:SS', () => {
    expect(formatDuration(0)).toBe('00:00')
    expect(formatDuration(59_000)).toBe('00:59')
    expect(formatDuration(60_000)).toBe('01:00')
    expect(formatDuration(65_000)).toBe('01:05')
    expect(formatDuration(10 * 60 * 1000 + 9_000)).toBe('10:09')
  })

  it('includes hours once a hour is passed', () => {
    expect(formatDuration(3600_000)).toBe('1:00:00')
    expect(formatDuration(2 * 3600_000 + 61_000)).toBe('2:01:01')
  })

  it('clamps negative input to zero', () => {
    expect(formatDuration(-5)).toBe('00:00')
  })
})
