import { fetchPuzzles } from '../api.js'
import { navigate } from '../router.js'

function loadingView() {
  const el = document.createElement('div')
  el.className = 'state state-loading'
  el.textContent = 'Загрузка…'
  return el
}

function errorView(message, onRetry) {
  const el = document.createElement('div')
  el.className = 'state state-error'
  el.setAttribute('role', 'alert')

  const text = document.createElement('p')
  text.textContent = `Не удалось загрузить список кроссвордов: ${message}`

  const retry = document.createElement('button')
  retry.className = 'button'
  retry.textContent = 'Повторить'
  retry.addEventListener('click', onRetry)

  el.append(text, retry)
  return el
}

function emptyView() {
  const el = document.createElement('div')
  el.className = 'state state-empty'
  el.textContent = 'Кроссвордов пока нет.'
  return el
}

function puzzleCard(puzzle) {
  const card = document.createElement('a')
  card.className = 'puzzle-card'
  card.href = `#/puzzles/${encodeURIComponent(puzzle.id)}`
  card.addEventListener('click', (e) => {
    e.preventDefault()
    navigate(`/puzzles/${puzzle.id}`)
  })

  const title = document.createElement('h3')
  title.className = 'puzzle-card-title'
  title.textContent = puzzle.title

  const meta = document.createElement('p')
  meta.className = 'puzzle-card-meta'
  meta.textContent = `${puzzle.width}×${puzzle.height} · ${puzzle.difficulty}`

  card.append(title, meta)
  return card
}

export function renderCatalog(container) {
  container.replaceChildren(loadingView())

  fetchPuzzles()
    .then((puzzles) => {
      if (!puzzles.length) {
        container.replaceChildren(emptyView())
        return
      }
      const list = document.createElement('div')
      list.className = 'puzzle-list'
      for (const p of puzzles) {
        list.append(puzzleCard(p))
      }
      container.replaceChildren(list)
    })
    .catch((err) => {
      const message = err && err.message ? err.message : 'неизвестная ошибка'
      container.replaceChildren(errorView(message, () => renderCatalog(container)))
    })
}
