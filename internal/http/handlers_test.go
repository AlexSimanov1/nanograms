package http

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/AlexSimanov1/nanograms/internal/application"
	"github.com/AlexSimanov1/nanograms/internal/domain"
)

// stubRepo is an in-memory PuzzleRepository for testing the handlers.
type stubRepo struct {
	puzzles []domain.Puzzle
	err     error
}

func (s *stubRepo) Get(_ context.Context, _ string) (*domain.Puzzle, error) {
	return nil, errors.New("unused")
}

func (s *stubRepo) List(_ context.Context) ([]domain.Puzzle, error) {
	return s.puzzles, s.err
}

func newTestHandler(repo *stubRepo) http.Handler {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	return NewHandler(logger, application.NewPuzzleService(repo))
}

func TestListPuzzles(t *testing.T) {
	handler := newTestHandler(&stubRepo{puzzles: []domain.Puzzle{
		testPuzzle("001", "Cross"),
		testPuzzle("002", "Frame"),
	}})

	req := httptest.NewRequest(http.MethodGet, "/api/v1/puzzles", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusOK)
	}

	var body map[string][]map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	puzzles := body["puzzles"]
	if len(puzzles) != 2 {
		t.Fatalf("got %d puzzles, want 2", len(puzzles))
	}
	if puzzles[0]["id"] != "001" || puzzles[0]["title"] != "Cross" {
		t.Errorf("puzzle[0] = %v, want id 001 / title Cross", puzzles[0])
	}
	if puzzles[1]["id"] != "002" {
		t.Errorf("puzzle[1] id = %v, want 002", puzzles[1]["id"])
	}
	// The DTO must not leak hints or the solution.
	for _, p := range puzzles {
		if _, ok := p["solution"]; ok {
			t.Errorf("response leaked solution: %v", p)
		}
		if _, ok := p["rowHints"]; ok {
			t.Errorf("response leaked rowHints: %v", p)
		}
	}
}

func TestListPuzzlesServerError(t *testing.T) {
	handler := newTestHandler(&stubRepo{err: errors.New("boom")})

	req := httptest.NewRequest(http.MethodGet, "/api/v1/puzzles", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusInternalServerError)
	}
}

func testPuzzle(id, title string) domain.Puzzle {
	return domain.Puzzle{
		ID:          id,
		Title:       title,
		Width:       5,
		Height:      5,
		Difficulty:  "easy",
		RowHints:    [][]int{{2}, {1, 1}},
		ColumnHints: [][]int{{1, 1}, {2}},
		Solution:    [][]bool{{true, true}, {false, true}},
	}
}
