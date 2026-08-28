package http

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/AlexSimanov1/nanograms/internal/application"
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

// puzzleDetailDTO is the full playable puzzle. It includes the clues the
// player needs but not the solution, so the answer is never revealed to the
// client.
type puzzleDetailDTO struct {
	ID          string  `json:"id"`
	Title       string  `json:"title"`
	Width       int     `json:"width"`
	Height      int     `json:"height"`
	Difficulty  string  `json:"difficulty"`
	RowHints    [][]int `json:"rowHints"`
	ColumnHints [][]int `json:"columnHints"`
}

// checkRequest carries the player's current board for verification: a
// height×width grid of booleans, true = filled. Marked and empty cells are
// false. The request never carries the solution.
type checkRequest struct {
	Cells [][]bool `json:"cells"`
}

// checkResponse is the verification verdict only; the solution is never sent
// back to the client.
type checkResponse struct {
	Correct bool `json:"correct"`
}

func (h *Handlers) handleListPuzzles(w http.ResponseWriter, r *http.Request) {
	puzzles, err := h.service.List(r.Context())
	if err != nil {
		h.log.Error("list puzzles", "error", err)
		writeError(w, http.StatusInternalServerError, "internal server error")
		return
	}
	list := make([]puzzleDTO, 0, len(puzzles))
	for _, p := range puzzles {
		list = append(list, toPuzzleDTO(p))
	}
	writeJSON(w, http.StatusOK, puzzleListDTO{Puzzles: list})
}

func (h *Handlers) handleCheckPuzzle(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")

	var req checkRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	correct, err := h.service.Check(r.Context(), id, req.Cells)
	if err != nil {
		switch {
		case errors.Is(err, domain.ErrPuzzleNotFound):
			writeError(w, http.StatusNotFound, "puzzle not found")
		case errors.Is(err, application.ErrInvalidCells):
			writeError(w, http.StatusBadRequest, "cells must be height×width of booleans")
		default:
			h.log.Error("check puzzle", "id", id, "error", err)
			writeError(w, http.StatusInternalServerError, "internal server error")
		}
		return
	}

	writeJSON(w, http.StatusOK, checkResponse{Correct: correct})
}

func (h *Handlers) handleGetPuzzle(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	p, err := h.service.Get(r.Context(), id)
	if err != nil {
		if errors.Is(err, domain.ErrPuzzleNotFound) {
			writeError(w, http.StatusNotFound, "puzzle not found")
			return
		}
		h.log.Error("get puzzle", "id", id, "error", err)
		writeError(w, http.StatusInternalServerError, "internal server error")
		return
	}
	writeJSON(w, http.StatusOK, toPuzzleDetailDTO(p))
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

func toPuzzleDetailDTO(p domain.Puzzle) puzzleDetailDTO {
	return puzzleDetailDTO{
		ID:          p.ID,
		Title:       p.Title,
		Width:       p.Width,
		Height:      p.Height,
		Difficulty:  p.Difficulty,
		RowHints:    p.RowHints,
		ColumnHints: p.ColumnHints,
	}
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_, _ = w.Write([]byte(`{"error":"` + message + `"}`))
}
