import { describe, it, expect } from 'vitest'
import { createProgressStorage, STORAGE_KEY } from './persistence.js'
import { CellState, ProgressStatus, complete, createEmptyProgress, fill } from './game.js'

// A tiny in-memory storage that speaks getItem/setItem, standing in for
// localStorage so persistence tests run in the plain node environment.
function fakeStorage() {
  let data = null
  return {
    getItem: (key) => (key === STORAGE_KEY ? data : null),
    setItem: (key, value) => {
      if (key === STORAGE_KEY) data = value
    },
    __setRaw(value) {
      data = value
    },
  }
}

function makeProgress(puzzleId = '001', width = 3, height = 3) {
  const p = createEmptyProgress({ width, height })
  p.puzzleId = puzzleId
  return p
}

describe('persistence', () => {
  it('returns null when nothing is stored', () => {
    const storage = fakeStorage()
    expect(createProgressStorage(storage).loadProgress('001')).toBeNull()
  })

  it('round-trips a progress and survives a "reload" (new instance)', () => {
    const storage = fakeStorage()

    const s1 = createProgressStorage(storage)
    let p = fill(makeProgress('001'), 1, 1)
    s1.saveProgress(p)

    // New instance = fresh session, same backing store (page reload).
    const s2 = createProgressStorage(storage)
    const loaded = s2.loadProgress('001')
    expect(loaded).not.toBeNull()
    expect(loaded.cells[1][1]).toBe(CellState.FILLED)
    expect(loaded.puzzleId).toBe('001')
    expect(loaded.status).toBe(ProgressStatus.IN_PROGRESS)
  })

  it('keeps progress separate per puzzle', () => {
    const storage = fakeStorage()
    const s = createProgressStorage(storage)
    let a = fill(makeProgress('001', 3, 3), 0, 0)
    let b = fill(makeProgress('002', 4, 4), 3, 3)
    s.saveProgress(a)
    s.saveProgress(b)

    // Saving B must not clobber A.
    expect(s.loadProgress('001').cells[0][0]).toBe(CellState.FILLED)
    expect(s.loadProgress('002').cells[3][3]).toBe(CellState.FILLED)
    expect(s.loadProgress('001').cells[3]).toBeUndefined()
  })

  it('updating one puzzle never loses another puzzle\'s progress', () => {
    const storage = fakeStorage()
    const s = createProgressStorage(storage)
    s.saveProgress(fill(makeProgress('001'), 0, 0))
    s.saveProgress(fill(makeProgress('002'), 2, 2))
    // Re-saving '001' (a fresh snapshot, only cell (1,0) filled) overwrites
    // its own record but must leave '002' intact.
    s.saveProgress(fill(makeProgress('001'), 1, 0))

    expect(s.loadProgress('001').cells.map((r) => r[0])).toEqual([
      CellState.EMPTY,
      CellState.FILLED,
      CellState.EMPTY,
    ])
    expect(s.loadProgress('002').cells[2][2]).toBe(CellState.FILLED)
  })

  it('persists a completed progress with its completion time', () => {
    const storage = fakeStorage()
    const s = createProgressStorage(storage)
    const done = complete(fill(makeProgress('001'), 0, 0))
    s.saveProgress(done)

    const loaded = s.loadProgress('001')
    expect(loaded.status).toBe(ProgressStatus.COMPLETED)
    expect(typeof loaded.completedAt).toBe('number')
  })

  it('returns null on non-JSON garbage', () => {
    const storage = fakeStorage()
    storage.__setRaw('not json {')
    expect(createProgressStorage(storage).loadProgress('001')).toBeNull()
  })

  it('returns null on a wrong document version/shape', () => {
    const storage = fakeStorage()
    storage.__setRaw(JSON.stringify({ version: 42, puzzles: {} }))
    expect(createProgressStorage(storage).loadProgress('001')).toBeNull()
  })

  it('ignores a corrupted single record instead of breaking', () => {
    const storage = fakeStorage()
    storage.__setRaw(
      JSON.stringify({
        version: 1,
        puzzles: {
          '001': { puzzleId: '001', width: 3, height: 3, status: 'bogus', cells: [] },
        },
      }),
    )
    expect(createProgressStorage(storage).loadProgress('001')).toBeNull()
  })

  it('ignores a record whose cells do not match the dimensions', () => {
    const storage = fakeStorage()
    storage.__setRaw(
      JSON.stringify({
        version: 1,
        puzzles: {
          '001': {
            puzzleId: '001',
            width: 3,
            height: 3,
            status: 'in_progress',
            cells: [[0, 0]], // not 3x3
          },
        },
      }),
    )
    expect(createProgressStorage(storage).loadProgress('001')).toBeNull()
  })

  it('normalizes an unknown cell state to empty', () => {
    const storage = fakeStorage()
    storage.__setRaw(
      JSON.stringify({
        version: 1,
        puzzles: {
          '001': {
            puzzleId: '001',
            width: 2,
            height: 2,
            status: 'in_progress',
            cells: [
              ['filled', '???'],
              ['empty', 'marked'],
            ],
          },
        },
      }),
    )
    const loaded = createProgressStorage(storage).loadProgress('001')
    expect(loaded.cells).toEqual([
      [CellState.FILLED, CellState.EMPTY],
      [CellState.EMPTY, CellState.MARKED],
    ])
  })

  it('a failed save does not throw and the session keeps working', () => {
    const storage = {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota exceeded')
      },
    }
    expect(() =>
      createProgressStorage(storage).saveProgress(fill(makeProgress(), 0, 0)),
    ).not.toThrow()
  })
})
