import { navigate } from '../router.js'

// Puzzle page placeholder (MVP0 / 8.2). Rendering the grid, hints and any
// game logic arrives in the vertical slice (9.x); here we only show a shell
// so navigation between catalog and puzzle page already works.
export function renderPuzzle(container, id) {
  const wrap = document.createElement('div')
  wrap.className = 'puzzle-page'

  const back = document.createElement('button')
  back.className = 'button button-back'
  back.textContent = '← К каталогу'
  back.addEventListener('click', () => navigate('/'))

  const heading = document.createElement('h2')
  heading.textContent = `Кроссворд ${id}`

  const placeholder = document.createElement('div')
  placeholder.className = 'puzzle-placeholder'
  placeholder.textContent = 'Поле кроссворда появится здесь.'

  wrap.append(back, heading, placeholder)
  container.replaceChildren(wrap)
}
