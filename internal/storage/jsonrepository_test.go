package storage

import (
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"os"
	"path/filepath"
	"testing"

	"github.com/AlexSimanov1/nanograms/internal/application"
	"github.com/AlexSimanov1/nanograms/internal/domain"
)

// Compile-time check that the JSON repository satisfies the application
// repository contract.
var _ application.PuzzleRepository = (*JSONPuzzleRepository)(nil)

func newTestRepo(t *testing.T, dir string) *JSONPuzzleRepository {
	t.Helper()
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	return NewJSONPuzzleRepository(dir, logger)
}

func writePuzzleFile(t *testing.T, dir, id string, p domain.Puzzle) {
	t.Helper()
	f := puzzleFile{
		Version:     puzzleFormatVersion,
		ID:          p.ID,
		Title:       p.Title,
		Width:       p.Width,
		Height:      p.Height,
		Difficulty:  p.Difficulty,
		RowHints:    p.RowHints,
		ColumnHints: p.ColumnHints,
		Solution:    p.Solution,
	}
	data, err := json.Marshal(f)
	if err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(dir, id+".json"), data, 0o644); err != nil {
		t.Fatal(err)
	}
}

func validPuzzle(id string) domain.Puzzle {
	return domain.Puzzle{
		ID:          id,
		Title:       "Test",
		Width:       5,
		Height:      5,
		Difficulty:  "easy",
		RowHints:    [][]int{{2}, {1, 1}, {}, {1, 1}, {3}},
		ColumnHints: [][]int{{1, 1}, {2}, {2}, {1, 1}, {1}},
		Solution: [][]bool{
			{true, true, false, false, false},
			{false, true, false, true, false},
			{false, false, false, false, false},
			{true, false, true, false, false},
			{false, false, true, true, true},
		},
	}
}

func TestJSONPuzzleRepositoryGet(t *testing.T) {
	dir := t.TempDir()
	writePuzzleFile(t, dir, "t01", validPuzzle("t01"))
	repo := newTestRepo(t, dir)

	p, err := repo.Get(t.Context(), "t01")
	if err != nil {
		t.Fatalf("Get returned error: %v", err)
	}
	if p.ID != "t01" || p.Width != 5 || p.Height != 5 {
		t.Errorf("Get puzzle = %+v, want id=t01 5x5", p)
	}
}

func TestJSONPuzzleRepositoryGetMissing(t *testing.T) {
	repo := newTestRepo(t, t.TempDir())
	_, err := repo.Get(t.Context(), "nope")
	if !errors.Is(err, ErrPuzzleNotFound) {
		t.Fatalf("Get missing: error = %v, want ErrPuzzleNotFound", err)
	}
}

func TestJSONPuzzleRepositoryGetInvalidJSON(t *testing.T) {
	dir := t.TempDir()
	if err := os.WriteFile(filepath.Join(dir, "bad.json"), []byte(`{`), 0o644); err != nil {
		t.Fatal(err)
	}
	repo := newTestRepo(t, dir)

	_, err := repo.Get(t.Context(), "bad")
	if err == nil {
		t.Fatal("Get on invalid JSON: want error, got nil")
	}
	if errors.Is(err, ErrPuzzleNotFound) {
		t.Fatalf("Get on invalid JSON should not be ErrPuzzleNotFound, got %v", err)
	}
}

func TestJSONPuzzleRepositoryList(t *testing.T) {
	dir := t.TempDir()
	writePuzzleFile(t, dir, "t01", validPuzzle("t01"))
	writePuzzleFile(t, dir, "t02", validPuzzle("t02"))
	// One invalid puzzle must not corrupt the catalog.
	if err := os.WriteFile(filepath.Join(dir, "bad.json"), []byte(`{"version":1`), 0o644); err != nil {
		t.Fatal(err)
	}
	// Non-json files are ignored.
	if err := os.WriteFile(filepath.Join(dir, "readme.txt"), []byte("hi"), 0o644); err != nil {
		t.Fatal(err)
	}
	repo := newTestRepo(t, dir)

	got, err := repo.List(t.Context())
	if err != nil {
		t.Fatalf("List returned error: %v", err)
	}
	if len(got) != 2 {
		t.Fatalf("List returned %d puzzles, want 2", len(got))
	}
	ids := map[string]bool{}
	for _, p := range got {
		ids[p.ID] = true
	}
	if !ids["t01"] || !ids["t02"] {
		t.Errorf("List puzzles = %v, want both t01 and t02", ids)
	}
}
