import { defineConfig } from 'vite'

// In development the frontend is served by Vite and talks to the Go backend
// through the /api proxy, so there is no CORS and no separate API origin.
export default defineConfig({
  base: '/',
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
})
