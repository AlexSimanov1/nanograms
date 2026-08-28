package http

import (
	"log/slog"
	"net/http"

	"github.com/AlexSimanov1/nanograms/internal/application"
)

// Handlers holds the dependencies shared by the HTTP API handlers.
type Handlers struct {
	log     *slog.Logger
	service *application.PuzzleService
}

// NewHandler builds the HTTP handler with all routes registered.
func NewHandler(logger *slog.Logger, service *application.PuzzleService) http.Handler {
	h := &Handlers{log: logger, service: service}
	mux := http.NewServeMux()

	mux.HandleFunc("GET /health", h.handleHealth)
	mux.HandleFunc("GET /api/v1/puzzles", h.handleListPuzzles)
	mux.HandleFunc("GET /api/v1/puzzles/{id}", h.handleGetPuzzle)

	return mux
}

func (h *Handlers) handleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(`{"status":"ok"}`))
}
