import { checkPuzzle, fetchPuzzle, fetchPuzzles } from '../api.js'
import { navigate } from '../router.js'
import { createProgressStorage } from '../persistence.js'
import {
  Action,
  CellState,
  ProgressStatus,
  applyAction,
  complete,
  createEmptyProgress,
  elapsedMs,
  filledGrid,
  formatDuration,
  reset,
} from '../game.js'

// Puzzle page (MVP0 / 9.x + MVP1 / 10.x + 11 + 14). Renders the grid with row
// and column hints, keeps client-side game state, handles input (Fill / Mark
// / Clear mode selector, mouse + touch + keyboard) and persists local progress
// so it survives reloads. The board is fully usable without right-click or
// hover (mobile rule, AR/Нанограммы).

// Progress is saved per puzzle in browser storage (ROADMAP 14, AR-08).

const MODES = [
  { action: Action.FILL, label: 'Закрасить', key: '1' },
  { action: Action.MARK, label: 'Крестик', key: '2' },
  { action: Action.CLEAR, label: 'Очистить', key: '3' },
]

// The next puzzle in the list after `currentId`, cycling around (19). Returns
// null when there is nothing meaningful to jump to (list too small).
export function nextPuzzleId(list, currentId) {
  if (!Array.isArray(list) || list.length < 2) return null
  const index = list.findIndex((p) => p.id === currentId)
  if (index < 0) return list[0].id
  return list[(index + 1) % list.length].id
}

// Completion panel shown in place of the action bar once a puzzle is solved
// (19): final time plus "Следующий кроссворд" / "В каталог".
function completionView(timeLabel, nextId) {
  const box = document.createElement('div')
  box.className = 'completion'
  box.setAttribute('role', 'status')

  const title = document.createElement('p')
  title.className = 'completion-title'
  title.textContent = 'Кроссворд решён!'

  const time = document.createElement('p')
  time.className = 'completion-time'
  time.textContent = `Итоговое время: ${timeLabel}`

  const actions = document.createElement('div')
  actions.className = 'completion-actions'

  const toCatalog = document.createElement('button')
  toCatalog.className = 'button'
  toCatalog.type = 'button'
  toCatalog.textContent = 'В каталог'
  toCatalog.addEventListener('click', () => navigate('/'))
  actions.append(toCatalog)

  if (nextId) {
    const next = document.createElement('button')
    next.className = 'button button-next'
    next.type = 'button'
    next.textContent = 'Следующий кроссворд'
    next.addEventListener('click', () => navigate(`/puzzles/${nextId}`))
    actions.prepend(next)
  }

  box.append(title, time, actions)
  return box
}

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

// Reflect a cell's state in its DOM element (class + data + accessible name).
function renderCell(cellEl, state) {
  cellEl.dataset.state = state
  cellEl.classList.remove('cell--filled', 'cell--marked')
  if (state !== CellState.EMPTY) {
    cellEl.classList.add(`cell--${state}`)
  }
  cellEl.setAttribute('aria-label', cellName(cellEl))
}

const STATE_LABEL = {
  [CellState.EMPTY]: 'пусто',
  [CellState.FILLED]: 'закрашено',
  [CellState.MARKED]: 'крестик',
}

function cellName(cellEl) {
  const row = Number(cellEl.dataset.row) + 1
  const col = Number(cellEl.dataset.col) + 1
  return `Ряд ${row}, столбец ${col}: ${STATE_LABEL[cellEl.dataset.state] ?? 'пусто'}`
}

// Move focus to the cell at (row, col) and make it the only tabbable cell
// (roving tabindex, so keyboard navigation doesn't tab through 400 stops).
function focusCell(grid, row, col, height, width) {
  if (row < 0 || row >= height || col < 0 || col >= width) return
  const target = grid.querySelector(`[data-row="${row}"][data-col="${col}"]`)
  if (!target) return
  for (const c of grid.querySelectorAll('.cell')) {
    c.tabIndex = -1
  }
  target.tabIndex = 0
  target.focus()
}

// Wire mouse/touch/keyboard input for the playable cells (`.cell`) inside the
// unified board. Emits input via `onCell`, which receives (row, col) and
// returns the resulting CellState for the cell. Input works with mouse, touch
// and pen through Pointer Events: a tap paints one cell, a drag paints the
// stroke the pointer crosses. No right-click or hover is ever required (mobile
// rule). `touch-action: none` on cells (CSS) keeps a touch-drag from scrolling
// or zooming the page instead of painting. Hint header cells are skipped —
// input targets only `.cell`.
function wireBoardInput(board, progress, onCell) {
  const { width, height } = progress

  // A pointer is dragging across the board only while a button is held.
  let dragging = false

  // The cell painted last on the active stroke, so pointermove does not
  // repaint the same cell on every movement event.
  let lastKey = null
  const cellKey = (el) => `${el.dataset.row}:${el.dataset.col}`

  const paint = (cellEl) => {
    onCell(Number(cellEl.dataset.row), Number(cellEl.dataset.col))
  }

  // Start a stroke on a primary-button press over a cell.
  board.addEventListener('pointerdown', (e) => {
    const cell = e.target.closest('.cell')
    if (!cell || dragging || e.button !== 0) return
    dragging = true
    lastKey = null
    board.setPointerCapture(e.pointerId)
    e.preventDefault()
    // Make the tapped cell the visible "active" cell (20.1): give it focus so
    // the outline follows mouse/touch too, not only keyboard navigation.
    // preventDefault above suppresses the default mouse focus, so set it here.
    cell.focus()
    paint(cell)
    lastKey = cellKey(cell)
  })

  // While the button is held, find the cell under the pointer and paint it.
  // elementFromPoint is used instead of pointerenter (which does not bubble
  // to the board listener) and stays reliable under pointer capture and for
  // fast strokes that would otherwise skip cells.
  board.addEventListener('pointermove', (e) => {
    if (!dragging) return
    const under = document.elementFromPoint(e.clientX, e.clientY)
    const cell = under && under.closest('.cell')
    if (!cell) return
    const key = cellKey(cell)
    if (key === lastKey) return
    paint(cell)
    lastKey = key
  })

  // No paints between strokes: a drag paints only while the button is held,
  // never from stray movement after release.
  const stopDragging = () => {
    dragging = false
  }
  board.addEventListener('pointerup', stopDragging)
  board.addEventListener('pointercancel', stopDragging)
  board.addEventListener('lostpointercapture', stopDragging)

  // Mouse-independent keyboard navigation: arrows move focus, Space/Enter act.
  board.addEventListener('keydown', (e) => {
    const cell = e.target.closest('.cell')
    if (!cell) return
    const row = Number(cell.dataset.row)
    const col = Number(cell.dataset.col)
    const MOVES = {
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
    }
    const move = MOVES[e.key]
    if (move) {
      e.preventDefault()
      focusCell(board, row + move[0], col + move[1], height, width)
      return
    }
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault()
      onCell(row, col)
    }
  })
}

// The whole board — corner, column/row hints and the playable field — built as
// ONE CSS grid (rMax + width columns × cMax + height rows, all 1fr). A single
// shared grid means every track is computed once, so the hint lines always
// align 1:1 with the field by construction (the earlier separate bands drifted).
// Each hint number is its own square cell: an "11" is one cell, "1 1" is two,
// so runs never read as a single long number.
function boardView(puzzle, progress, onCell) {
  const { width, height, columnHints, rowHints } = puzzle
  const { cells } = progress

  // Left block width / top block height = the longest hint run on that axis.
  const rMax = Math.max(0, ...rowHints.map((r) => r.length))
  const cMax = Math.max(0, ...columnHints.map((c) => c.length))

  const board = document.createElement('div')
  board.className = 'puzzle-board'
  board.setAttribute('role', 'grid')
  board.setAttribute('aria-label', 'Игровое поле')
  board.style.gridTemplateColumns = `repeat(${rMax + width}, 1fr)`
  board.style.gridTemplateRows = `repeat(${cMax + height}, 1fr)`

  // Top-left empty block spanning the whole hint-number area.
  const corner = document.createElement('div')
  corner.className = 'board-corner'
  corner.style.gridRow = `1 / span ${cMax}`
  corner.style.gridColumn = `1 / span ${rMax}`
  board.append(corner)

  // Column hints: one cell per number, bottom-aligned toward the field.
  columnHints.forEach((nums, j) => {
    nums.forEach((n, i) => {
      const cell = document.createElement('div')
      cell.className = 'board-hint board-hint-col'
      cell.setAttribute('role', 'columnheader')
      cell.textContent = n
      cell.style.gridRow = cMax - nums.length + i + 1
      cell.style.gridColumn = rMax + j + 1
      if (j > 0 && j % 5 === 0) cell.classList.add('cell--five-left')
      if (j % 2 === 1) cell.classList.add('board-hint--alt')
      board.append(cell)
    })
  })

  // Row hints: one cell per number, right-aligned toward the field.
  rowHints.forEach((nums, i) => {
    nums.forEach((n, k) => {
      const cell = document.createElement('div')
      cell.className = 'board-hint board-hint-row'
      cell.setAttribute('role', 'rowheader')
      cell.textContent = n
      cell.style.gridRow = cMax + i + 1
      cell.style.gridColumn = rMax - nums.length + k + 1
      if (i > 0 && i % 5 === 0) cell.classList.add('cell--five-top')
      if (i % 2 === 1) cell.classList.add('board-hint--alt')
      board.append(cell)
    })
  })

  // Playable field cells.
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      const cell = document.createElement('div')
      cell.className = 'cell'
      cell.setAttribute('role', 'gridcell')
      cell.dataset.row = r
      cell.dataset.col = c
      // Grid marking (ТЗ 2): thicker separators after every 5th row/column.
      // Behaviour-neutral decoration; game state is untouched.
      if (c > 0 && c % 5 === 0) cell.classList.add('cell--five-left')
      if (r > 0 && r % 5 === 0) cell.classList.add('cell--five-top')
      // Thick seam on the boundary between the hints and the field.
      if (c === 0) cell.classList.add('cell--seam-left')
      if (r === 0) cell.classList.add('cell--seam-top')
      cell.tabIndex = r === 0 && c === 0 ? 0 : -1
      cell.style.gridRow = cMax + r + 1
      cell.style.gridColumn = rMax + c + 1
      renderCell(cell, cells[r][c])
      board.append(cell)
    }
  }

  wireBoardInput(board, progress, onCell)
  return board
}

// The Fill / Mark / Clear tool selector. Always visible so the current mode
// is obvious (20.2). The active mode is shown not only by colour but also by
// a "✓" marker, and keyboard shortcuts 1/2/3 switch the mode.
function modeLabel({ label, key }, active) {
  return `${active ? '✓ ' : ''}${label} (${key})`
}

function toolbarView(currentAction, onMode) {
  const bar = document.createElement('div')
  bar.className = 'toolbar'
  bar.setAttribute('role', 'group')
  bar.setAttribute('aria-label', 'Действие')

  for (const { action, label, key } of MODES) {
    const btn = document.createElement('button')
    btn.className = 'button tool-button'
    if (action === currentAction) {
      btn.classList.add('tool-button-active')
      btn.setAttribute('aria-pressed', 'true')
    } else {
      btn.setAttribute('aria-pressed', 'false')
    }
    btn.type = 'button'
    btn.textContent = modeLabel({ label, key }, action === currentAction)
    btn.dataset.action = action
    btn.dataset.label = label
    btn.dataset.key = key
    btn.addEventListener('click', () => onMode(action))
    bar.append(btn)
  }
  return bar
}

function metaView(puzzle) {
  const meta = document.createElement('p')
  meta.className = 'puzzle-meta'
  meta.textContent = `${puzzle.width}×${puzzle.height} · ${puzzle.difficulty}`
  return meta
}

function syncToolbar(bar, action) {
  for (const btn of bar.querySelectorAll('.tool-button')) {
    const active = btn.dataset.action === action
    btn.classList.toggle('tool-button-active', active)
    btn.setAttribute('aria-pressed', String(active))
    btn.textContent = modeLabel(btn.dataset, active)
  }
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
      const storage = createProgressStorage(globalThis.localStorage)

      // Restore a saved progress for this puzzle when it still matches the
      // puzzle's dimensions (14); otherwise start fresh.
      let progress = storage.loadProgress(puzzle.id)
      if (
        progress &&
        (progress.width !== puzzle.width || progress.height !== puzzle.height)
      ) {
        progress = null
      }
      if (!progress) {
        progress = createEmptyProgress(puzzle)
        progress.puzzleId = puzzle.id
      }

      let current = progress
      let action = Action.FILL

      const setAction = (a) => {
        action = a
        syncToolbar(toolbar, action)
      }
      const toolbar = toolbarView(action, setAction)

      // Switch the active mode from the keyboard by 1/2/3 (20.2). Attached to
      // the page node so the listener dies on navigation (no leak); arrows and
      // Space/Enter inside the board are handled separately in wireBoardInput.
      wrap.addEventListener('keydown', (e) => {
        const mode = MODES.find((m) => m.key === e.key)
        if (!mode) return
        setAction(mode.action)
      })

      // A solved puzzle no longer accepts gesture/click edits (13.2); the
      // board keeps showing the finished state.
      const onCell = (row, col) => {
        if (current.status === ProgressStatus.COMPLETED) return
        current = applyAction(current, action, row, col)
        storage.saveProgress(current)
        renderTimer()
        const cellEl = content.querySelector(
          `[data-row="${row}"][data-col="${col}"]`,
        )
        renderCell(cellEl, current.cells[row][col])
      }

      // "Проверить" asks the server to verify the filled cells. The solution
      // stays on the server; we only learn correct/incorrect. An incorrect
      // result never discards the player's progress. (13.2)
      const notice = document.createElement('div')
      notice.className = 'puzzle-notice'
      notice.setAttribute('aria-live', 'polite')

      const checkBtn = document.createElement('button')
      checkBtn.className = 'button'
      checkBtn.type = 'button'
      checkBtn.textContent = 'Проверить'
      checkBtn.addEventListener('click', async () => {
        checkBtn.disabled = true
        try {
          const { correct } = await checkPuzzle(puzzle.id, filledGrid(current))
          if (correct) {
            current = complete(current)
            storage.saveProgress(current)
            renderTimer() // freezes the clock at the final time immediately

            // Completion flow (19): replace the action bar with the result
            // panel and offer the next puzzle when there is one.
            const timeLabel = formatDuration(current.elapsedTime)
            fetchPuzzles()
              .then((list) => {
                actionBar.replaceChildren(completionView(timeLabel, nextPuzzleId(list, puzzle.id)))
              })
              .catch(() => {
                actionBar.replaceChildren(completionView(timeLabel, null))
              })
          } else {
            notice.textContent = 'Есть неверные клетки. Проверьте поле.'
            notice.className = 'puzzle-notice notice-error'
            checkBtn.disabled = false
          }
        } catch {
          notice.textContent = 'Не удалось проверить решение. Попробуйте ещё раз.'
          notice.className = 'puzzle-notice notice-error'
          checkBtn.disabled = false
        }
      })

      // Timer (16): live seconds from startedAt while in progress, frozen at
      // elapsedTime once completed. The interval stops when the puzzle is
      // solved or the node leaves the DOM (navigation away), so it never
      // ticks on another page.
      // "Сбросить" wipes the grid, the timer and the status back to a fresh
      // puzzle after a confirmation, since it discards real progress (17).
      // The puzzle itself is untouched.
      const resetBtn = document.createElement('button')
      resetBtn.className = 'button button-reset'
      resetBtn.type = 'button'
      resetBtn.textContent = 'Сбросить'
      resetBtn.addEventListener('click', () => {
        if (!window.confirm('Сбросить кроссворд? Весь текущий прогресс будет удалён.')) {
          return
        }
        current = reset(current)
        storage.saveProgress(current)
        renderTimer()
        notice.textContent = ''
        notice.className = 'puzzle-notice'
        for (const cellEl of content.querySelectorAll('.cell')) {
          renderCell(
            cellEl,
            current.cells[Number(cellEl.dataset.row)][Number(cellEl.dataset.col)],
          )
        }
      })

      const timer = document.createElement('span')
      timer.className = 'puzzle-timer'
      timer.setAttribute('aria-label', 'Время решения')
      const renderTimer = () => {
        timer.textContent = formatDuration(elapsedMs(current))
      }
      renderTimer()
      const timerInterval = setInterval(() => {
        if (current.status === ProgressStatus.COMPLETED) {
          clearInterval(timerInterval)
          return
        }
        if (!timer.isConnected) {
          clearInterval(timerInterval)
          return
        }
        renderTimer()
      }, 1000)

      const actionBar = document.createElement('div')
      actionBar.className = 'actionbar'
      actionBar.append(timer, checkBtn, resetBtn, notice)

      heading.textContent = puzzle.title
      heading.after(metaView(puzzle))
      content.replaceChildren(toolbar, boardView(puzzle, current, onCell), actionBar)
    })
    .catch((err) => {
      // A missing puzzle has no point retrying; send the user back to the
      // catalog with a clear message instead of a raw "404" (22).
      if (err && err.status === 404) {
        content.replaceChildren(errorView('кроссворд не найден', () => navigate('/')))
        return
      }
      const message = err && err.message ? err.message : 'неизвестная ошибка'
      content.replaceChildren(errorView(message, () => renderPuzzle(container, id)))
    })
}
