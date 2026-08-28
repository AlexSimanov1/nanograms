package http

import (
	"log/slog"
	"net/http"
)

// NewHandler builds the HTTP handler with all routes registered.
//
// Handlers stay thin: they parse input, call the application layer, and map
// results to responses. No filesystem or domain rules live here.
func NewHandler(logger *slog.Logger) http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"ok"}`))
	})

	return mux
}
