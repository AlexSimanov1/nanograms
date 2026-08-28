// Client-side progress persistence in browser storage (ROADMAP 14, AR-08,
// Нанограммы §7). Progress is saved per puzzle ID and must survive reloads
// without breaking the app when the store is missing or corrupted.
//
// This module only deals with serialization and storage: the shape of the
// in-memory progress (cells, status, completedAt) is the one produced by
// game.js. It takes any storage that speaks getItem/setItem (defaults to
// localStorage), which keeps it plain, deterministic and easy to test.

import { CellState, ProgressStatus } from './game.js'

// Version is embedded in the key name so that changing the stored shape later
// only means bumping the key (no migration framework needed at this stage).
export const STORAGE_KEY = 'nanograms.progress.v1'
export const STORAGE_VERSION = 1

const KNOWN_STATUS = new Set(Object.values(ProgressStatus))
const KNOWN_CELL = new Set(Object.values(CellState))

// A stored progress record must be attached to the puzzle it belongs to,
// carry sane dimensions, a known status and a cells grid of exactly that size.
function isRecordValid(record, puzzleId) {
  if (!record || typeof record !== 'object') return false
  if (record.puzzleId !== puzzleId) return false
  if (
    !Number.isInteger(record.width) ||
    !Number.isInteger(record.height) ||
    record.width <= 0 ||
    record.height <= 0
  ) {
    return false
  }
  if (!KNOWN_STATUS.has(record.status)) return false
  if (!Array.isArray(record.cells) || record.cells.length !== record.height) {
    return false
  }
  for (const row of record.cells) {
    if (!Array.isArray(row) || row.length !== record.width) return false
  }
  return true
}

// A loaded record is normalized: an unknown cell state degenerates to empty
// rather than throwing, so a slightly off record still restores, never breaks.
function normalizeRecord(record) {
  return {
    puzzleId: record.puzzleId,
    width: record.width,
    height: record.height,
    status: record.status,
    ...(typeof record.completedAt === 'number' ? { completedAt: record.completedAt } : {}),
    cells: record.cells.map((row) =>
      row.map((state) => (KNOWN_CELL.has(state) ? state : CellState.EMPTY)),
    ),
  }
}

// Read and parse the whole progress document. Returns null on any failure
// (missing key, invalid JSON, wrong shape) so callers can fall back cleanly.
function readDocument(storage) {
  let raw
  try {
    raw = storage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
  if (raw == null || raw === '') return null
  try {
    const doc = JSON.parse(raw)
    if (!doc || typeof doc !== 'object' || doc.version !== STORAGE_VERSION) {
      return null
    }
    if (!doc.puzzles || typeof doc.puzzles !== 'object') return null
    return doc
  } catch {
    return null
  }
}

export function createProgressStorage(storage = globalThis.localStorage) {
  // Load the saved progress for one puzzle, or null when there is none or it
  // is unusable (corrupted, mismatched dimensions, another puzzle's data).
  function loadProgress(puzzleId) {
    const doc = readDocument(storage)
    if (!doc) return null
    const record = doc.puzzles[puzzleId]
    if (!isRecordValid(record, puzzleId)) return null
    return normalizeRecord(record)
  }

  // Load the status of every saved puzzle as { [puzzleId]: status }. Corrupted
  // records are skipped so a bad entry never hides or mislabels the catalog.
  function listStatuses() {
    const doc = readDocument(storage)
    if (!doc) return {}
    const out = {}
    for (const [id, record] of Object.entries(doc.puzzles)) {
      if (isRecordValid(record, id)) {
        out[id] = record.status
      }
    }
    return out
  }

  // Persist the current progress for one puzzle, merging it into the store so
  // other puzzles' progress is never overwritten.
  function saveProgress(progress) {
    const doc = readDocument(storage) ?? { version: STORAGE_VERSION, puzzles: {} }
    doc.puzzles[progress.puzzleId] = {
      puzzleId: progress.puzzleId,
      width: progress.width,
      height: progress.height,
      status: progress.status,
      ...(typeof progress.completedAt === 'number'
        ? { completedAt: progress.completedAt }
        : {}),
      cells: progress.cells,
    }
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(doc))
    } catch {
      // Storage can be full or unavailable; losing an autosave must never
      // break the current play session.
    }
  }

  return { loadProgress, saveProgress, listStatuses }
}
