// API client for the Nanograms backend.
//
// The frontend only talks to the backend through the /api/v1 HTTP API
// (architecture principle AR-03). In development Vite proxies /api to the Go
// server, so there is no separate origin or CORS setup here.

const BASE = '/api/v1'

async function request(path, options) {
  const res = await fetch(`${BASE}${path}`, options)
  if (!res.ok) {
    const err = new Error(`request failed (${res.status})`)
    err.status = res.status
    throw err
  }
  return res.json()
}

// fetchPuzzles returns the catalog list: { id, title, width, height, difficulty }.
export async function fetchPuzzles() {
  const data = await request('/puzzles')
  return data.puzzles
}

// fetchPuzzle returns one playable puzzle: sizes and row/column hints.
// A missing puzzle throws an error with `err.status === 404`.
export async function fetchPuzzle(id) {
  return request(`/puzzles/${encodeURIComponent(id)}`)
}

// checkPuzzle asks the backend to verify a solution: `cells` is the
// height×width grid of booleans (true = filled). The solution never leaves
// the server; only the verdict { correct } comes back.
export async function checkPuzzle(id, cells) {
  return request(`/puzzles/${encodeURIComponent(id)}/check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cells }),
  })
}
