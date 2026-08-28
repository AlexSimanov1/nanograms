import { describe, it, expect } from 'vitest'
import { nextPuzzleId } from './views/puzzle.js'

const LIST = [
  { id: '001' },
  { id: '002' },
  { id: '003' },
]

describe('nextPuzzleId (19)', () => {
  it('returns the puzzle after the current one', () => {
    expect(nextPuzzleId(LIST, '001')).toBe('002')
    expect(nextPuzzleId(LIST, '002')).toBe('003')
  })

  it('cycles back to the first after the last', () => {
    expect(nextPuzzleId(LIST, '003')).toBe('001')
  })

  it('returns null when there is not enough to jump to', () => {
    expect(nextPuzzleId([LIST[0]], '001')).toBeNull()
    expect(nextPuzzleId([], '001')).toBeNull()
  })

  it('falls back to the first puzzle for an unknown current id', () => {
    expect(nextPuzzleId(LIST, '999')).toBe('001')
  })
})
