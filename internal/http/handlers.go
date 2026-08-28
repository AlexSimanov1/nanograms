package http

import (
	"encoding/json"
	"net/http"

	"github.com/AlexSimanov1/nanograms/internal/domain"
)

// puzzleDTO is the public representation of a puzzle in catalog responses.
// It deliberately omits hints and the solution, so they are not leaked.
type puzzleDTO struct {
	ID         string `json:"id"`
	Title      string `json:"title"`
	Width      int    `json:"width"`
	Height     int    `json:"height"`
	Difficulty string `json:"difficulty"`
}

type puzzleListDTO struct {
	Puzzles []puzzleDTO `json:"puzzles"`
}

func (h *Handlers) handleListPuzzles(w http.ResponseWriter, r *http.Request) {
	puzzles, err := h.service.List(r.Context())
	if err != nil {
		h.log.Error("list puzzles", "error", err)
		writeError(w, http.StatusInternalServerError)
		return
	}
	list := make([]puzzleDTO, 0, len(puzzles))
	for _, p := range puzzles {
		list = append(list, toPuzzleDTO(p))
	}
	writeJSON(w, http.StatusOK, puzzleListDTO{Puzzles: list})
}

func toPuzzleDTO(p domain.Puzzle) puzzleDTO {
	return puzzleDTO{
		ID:         p.ID,
		Title:      p.Title,
		Width:      p.Width,
		Height:     p.Height,
		Difficulty: p.Difficulty,
	}
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_, _ = w.Write([]byte(`{"error":"internal server error"}`))
}
