import { describe, it, expect } from 'vitest'
import {
  Action,
  CellState,
  ProgressStatus,
  applyAction,
  complete,
  createEmptyProgress,
  filledGrid,
  fill,
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
