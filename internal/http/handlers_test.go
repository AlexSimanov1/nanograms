package http

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/AlexSimanov1/nanograms/internal/application"
	"github.com/AlexSimanov1/nanograms/internal/domain"
)

// stubRepo is an in-memory PuzzleRepository for testing the handlers.
type stubRepo struct {
	puzzles []domain.Puzzle
	listErr error
	getErr  error
}

func newStubRepo(ps ...domain.Puzzle) *stubRepo {
	return &stubRepo{puzzles: ps}
}

func (s *stubRepo) Get(_ context.Context, id string) (*domain.Puzzle, error) {
	if s.getErr != nil {
		return nil, s.getErr
	}
	for i := range s.puzzles {
		if s.puzzles[i].ID == id {
			return &s.puzzles[i], nil
		}
	}
	return nil, fmt.Errorf("puzzle %q: %w", id, domain.ErrPuzzleNotFound)
}

func (s *stubRepo) List(_ context.Context) ([]domain.Puzzle, error) {
	if s.listErr != nil {
		return nil, s.listErr
	}
	return s.puzzles, nil
}

func newTestHandler(repo *stubRepo) http.Handler {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	return NewHandler(logger, application.NewPuzzleService(repo))
}

func TestListPuzzles(t *testing.T) {
	handler := newTestHandler(newStubRepo(
		testPuzzle("001", "Cross"),
		testPuzzle("002", "Frame"),
	))

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
	// The list DTO must not leak hints or the solution.
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
	handler := newTestHandler(&stubRepo{listErr: errors.New("boom")})

	req := httptest.NewRequest(http.MethodGet, "/api/v1/puzzles", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusInternalServerError)
	}
}

func TestGetPuzzle(t *testing.T) {
	handler := newTestHandler(newStubRepo(testPuzzle("001", "Cross")))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/puzzles/001", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusOK)
	}

	var body map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if body["id"] != "001" || body["title"] != "Cross" {
		t.Errorf("body = %v, want id 001 / title Cross", body)
	}
	// The detail DTO must include hints for solving...
	if _, ok := body["rowHints"]; !ok {
		t.Error("detail response missing rowHints")
	}
	// ...but must not reveal the solution.
	if _, ok := body["solution"]; ok {
		t.Errorf("detail response leaked solution: %v", body)
	}
}

func TestCheckPuzzle(t *testing.T) {
	// testPuzzle is 2×2 with Solution [[true,true],[false,true]].
	correct := `{"cells":[[true,true],[false,true]]}`
	incorrect := `{"cells":[[true,true],[false,false]]}`

	tests := []struct {
		name      string
		url       string
		body      string
		wantCode  int
		want      *bool
		wantError string
	}{
		{"correct solution returns correct:true", "/api/v1/puzzles/001/check", correct, 200, boolPtr(true), ""},
		{"wrong solution returns correct:false", "/api/v1/puzzles/001/check", incorrect, 200, boolPtr(false), ""},
		{"unknown puzzle is 404", "/api/v1/puzzles/999/check", correct, 404, nil, "puzzle not found"},
		{"malformed JSON is 400", "/api/v1/puzzles/001/check", `{not json`, 400, nil, "invalid request body"},
		{"empty body is 400", "/api/v1/puzzles/001/check", ``, 400, nil, "invalid request body"},
		{"wrong shape is 400", "/api/v1/puzzles/001/check", `{"cells":[[true]]}`, 400, nil, "cells must be height×width"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler := newTestHandler(newStubRepo(testPuzzle("001", "Cross")))

			req := httptest.NewRequest(http.MethodPost, tt.url, strings.NewReader(tt.body))
			rec := httptest.NewRecorder()
			handler.ServeHTTP(rec, req)

			if rec.Code != tt.wantCode {
				t.Fatalf("status = %d, want %d (body %s)", rec.Code, tt.wantCode, rec.Body.String())
			}

			body := rec.Body.Bytes()
			// The check response must never leak the solution.
			if strings.Contains(rec.Body.String(), "solution") {
				t.Errorf("check response leaked solution: %s", rec.Body.String())
			}

			if tt.want != nil {
				var resp struct {
					Correct bool `json:"correct"`
				}
				if err := json.Unmarshal(body, &resp); err != nil {
					t.Fatalf("decode response: %v", err)
				}
				if resp.Correct != *tt.want {
					t.Errorf("correct = %v, want %v", resp.Correct, *tt.want)
				}
			}
			if tt.wantError != "" {
				var errBody struct {
					Error string `json:"error"`
				}
				if err := json.Unmarshal(body, &errBody); err != nil {
					t.Fatalf("decode error response: %v", err)
				}
				if !strings.Contains(errBody.Error, tt.wantError) {
					t.Errorf("error = %q, want it to contain %q", errBody.Error, tt.wantError)
				}
			}
		})
	}
}

func TestCheckPuzzleServerError(t *testing.T) {
	handler := newTestHandler(&stubRepo{getErr: errors.New("boom")})

	req := httptest.NewRequest(http.MethodPost, "/api/v1/puzzles/001/check", strings.NewReader(`{"cells":[[true,true],[false,true]]}`))
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusInternalServerError)
	}
}

func boolPtr(b bool) *bool { return &b }

func TestGetPuzzleNotFound(t *testing.T) {
	handler := newTestHandler(newStubRepo())

	req := httptest.NewRequest(http.MethodGet, "/api/v1/puzzles/001", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusNotFound {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusNotFound)
	}
}

func TestGetPuzzleServerError(t *testing.T) {
	handler := newTestHandler(&stubRepo{getErr: errors.New("boom")})

	req := httptest.NewRequest(http.MethodGet, "/api/v1/puzzles/001", nil)
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
		Width:       2,
		Height:      2,
		Difficulty:  "easy",
		RowHints:    [][]int{{2}, {1, 1}},
		ColumnHints: [][]int{{1, 1}, {2}},
		Solution:    [][]bool{{true, true}, {false, true}},
	}
}
