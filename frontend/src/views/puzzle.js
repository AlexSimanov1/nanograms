import { fetchPuzzle } from '../api.js'
import { navigate } from '../router.js'
import { CellState, createEmptyProgress } from '../game.js'

// Puzzle page (MVP0 / 9.x + MVP1 / 10.1). Renders the grid with row/column
// hints loaded from the API and reflects the client-side game state (empty /
// filled / marked). Cells are not interactive yet — input arrives in 10.2+.

function backView() {
  const back = document.createElement('button')
  back.className = 'button button-back'
  back.textContent = '← К каталогу'
  back.addEventListener('click', () => navigate('/'))
  return back
}

function loadingView() {
  const el = document.createElement('div')
  el.className = 'state state-loading'
  el.textContent = 'Загрузка кроссворда…'
  return el
}

function errorView(message, onRetry) {
  const el = document.createElement('div')
  el.className = 'state state-error'
  el.setAttribute('role', 'alert')

  const text = document.createElement('p')
  text.textContent = `Не удалось загрузить кроссворд: ${message}`

  const retry = document.createElement('button')
  retry.className = 'button'
  retry.textContent = 'Повторить'
  retry.addEventListener('click', onRetry)

  el.append(text, retry)
  return el
}

// One number span per hint value, e.g. three spans "2", "1", "3".
function hintNumbers(numbers) {
  const frag = document.createDocumentFragment()
  for (const n of numbers) {
    const s = document.createElement('span')
    s.className = 'board-hint-num'
    s.textContent = n
    frag.append(s)
  }
  return frag
}

// Top band with one cell per column, hints bottom-aligned (closest to grid).
function columnHintsView(columnHints, width) {
  const el = document.createElement('div')
  el.className = 'board-colhints'
  el.style.gridTemplateColumns = `repeat(${width}, 1fr)`
  for (const col of columnHints) {
    const cell = document.createElement('div')
    cell.className = 'board-hint board-hint-col'
    cell.setAttribute('role', 'columnheader')
    cell.append(hintNumbers(col))
    el.append(cell)
  }
  return el
}

// Left band with one cell per row, hints right-aligned (closest to grid).
function rowHintsView(rowHints, height) {
  const el = document.createElement('div')
  el.className = 'board-rowhints'
  el.style.gridTemplateRows = `repeat(${height}, 1fr)`
  for (const row of rowHints) {
    const cell = document.createElement('div')
    cell.className = 'board-hint board-hint-row'
    cell.setAttribute('role', 'rowheader')
    cell.append(hintNumbers(row))
    el.append(cell)
  }
  return el
}

// The playable grid of width × height cells, reflecting the current state.
function gridView(progress) {
  const { width, height, cells } = progress
  const grid = document.createElement('div')
  grid.className = 'board-grid'
  grid.setAttribute('role', 'grid')
  grid.setAttribute('aria-label', 'Игровое поле')
  grid.style.gridTemplateColumns = `repeat(${width}, 1fr)`
  grid.style.gridTemplateRows = `repeat(${height}, 1fr)`
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      const cell = document.createElement('div')
      cell.className = 'cell'
      cell.dataset.row = r
      cell.dataset.col = c
      cell.dataset.state = cells[r][c]
      if (cells[r][c] !== CellState.EMPTY) {
        cell.classList.add(`cell--${cells[r][c]}`)
      }
      grid.append(cell)
    }
  }
  return grid
}

function boardView(puzzle, progress) {
  const board = document.createElement('div')
  board.className = 'puzzle-board'

  const corner = document.createElement('div')
  corner.className = 'board-corner'

  board.append(
    corner,
    columnHintsView(puzzle.columnHints, puzzle.width),
    rowHintsView(puzzle.rowHints, puzzle.height),
    gridView(progress),
  )
  return board
}

function metaView(puzzle) {
  const meta = document.createElement('p')
  meta.className = 'puzzle-meta'
  meta.textContent = `${puzzle.width}×${puzzle.height} · ${puzzle.difficulty}`
  return meta
}

export function renderPuzzle(container, id) {
  const wrap = document.createElement('div')
  wrap.className = 'puzzle-page'

  const heading = document.createElement('h2')
  heading.className = 'puzzle-title'
  heading.textContent = 'Кроссворд'

  const content = document.createElement('div')
  content.className = 'puzzle-content'

  wrap.append(backView(), heading, content)
  container.replaceChildren(wrap)

  content.replaceChildren(loadingView())

  fetchPuzzle(id)
    .then((puzzle) => {
      const progress = createEmptyProgress(puzzle)
      progress.puzzleId = puzzle.id
      heading.textContent = puzzle.title
      heading.after(metaView(puzzle))
      content.replaceChildren(boardView(puzzle, progress))
    })
    .catch((err) => {
      const message = err && err.message ? err.message : 'неизвестная ошибка'
      content.replaceChildren(errorView(message, () => renderPuzzle(container, id)))
    })
}
