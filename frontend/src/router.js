// Minimal hash-based router. Routes:
//   #/              -> catalog
//   #/puzzles/{id}  -> puzzle page
// Anything unknown falls back to the catalog.

export function navigate(path) {
  if (location.hash === `#${path}`) {
    // Re-navigating to the same route: force a re-render anyway.
    window.dispatchEvent(new HashChangeEvent('hashchange'))
    return
  }
  location.hash = `#${path}`
}

export function currentRoute() {
  const hash = location.hash.replace(/^#/, '') || '/'
  const match = hash.match(/^\/puzzles\/([^/]+)/)
  if (match) {
    return { name: 'puzzle', id: decodeURIComponent(match[1]) }
  }
  return { name: 'catalog' }
}

export function start(onRoute) {
  window.addEventListener('hashchange', () => onRoute(currentRoute()))
  onRoute(currentRoute())
}
