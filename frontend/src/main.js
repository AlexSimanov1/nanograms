import './style.css'
import { start } from './router.js'
import { renderCatalog } from './views/catalog.js'
import { renderPuzzle } from './views/puzzle.js'

const app = document.querySelector('#app')

const header = document.createElement('header')
header.className = 'app-header'
header.textContent = 'Nanograms'

const page = document.createElement('main')
page.className = 'app-page'
page.id = 'page'

app.append(header, page)

function onRoute(route) {
  if (route.name === 'puzzle') {
    renderPuzzle(page, route.id)
    return
  }
  renderCatalog(page)
}

start(onRoute)
