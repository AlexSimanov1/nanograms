import './style.css'

// Minimal application shell (MVP0 / 8.1).
// The catalog, puzzle page and API client arrive in later slices (8.2, 9.x);
// for now this only mounts the app placeholder so a vertical slice can build on it.
const app = document.querySelector('#app')

const header = document.createElement('header')
header.className = 'app-header'
header.textContent = 'Nanograms'

const page = document.createElement('main')
page.className = 'app-page'
page.id = 'page'

app.append(header, page)
