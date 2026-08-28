package application

import (
	"context"
	"errors"
	"fmt"
	"testing"

	"github.com/AlexSimanov1/nanograms/internal/domain"
)

// fakeRepo is an in-memory PuzzleRepository used to test the service in
// isolation from any concrete storage implementation.
type fakeRepo struct {
	idOrder []string
	puzzles map[string]domain.Puzzle
}

func newFakeRepo(ps ...domain.Puzzle) *fakeRepo {
	r := &fakeRepo{puzzles: map[string]domain.Puzzle{}}
	for _, p := range ps {
		r.puzzles[p.ID] = p
		r.idOrder = append(r.idOrder, p.ID)
	}
	return r
}

func (f *fakeRepo) Get(_ context.Context, id string) (*domain.Puzzle, error) {
	p, ok := f.puzzles[id]
	if !ok {
		return nil, fmt.Errorf("puzzle %q: %w", id, domain.ErrPuzzleNotFound)
	}
	return &p, nil
}

func (f *fakeRepo) List(_ context.Context) ([]domain.Puzzle, error) {
	out := make([]domain.Puzzle, 0, len(f.idOrder))
	for _, id := range f.idOrder {
		out = append(out, f.puzzles[id])
	}
	return out, nil
}

func TestPuzzleServiceGet(t *testing.T) {
	want := validPuzzle("t01")
	service := NewPuzzleService(newFakeRepo(want))

	got, err := service.Get(t.Context(), "t01")
	if err != nil {
		t.Fatalf("Get returned error: %v", err)
	}
	if got.ID != want.ID || got.Width != want.Width {
		t.Errorf("Get = %+v, want %+v", got, want)
	}
}

func TestPuzzleServiceGetNotFound(t *testing.T) {
	service := NewPuzzleService(newFakeRepo())
	_, err := service.Get(t.Context(), "nope")
	if !errors.Is(err, domain.ErrPuzzleNotFound) {
		t.Fatalf("Get missing: error = %v, want domain.ErrPuzzleNotFound", err)
	}
}

func TestPuzzleServiceCheck(t *testing.T) {
	base := validPuzzle("t01")
	correct := base.Solution

	incorrect := make([][]bool, len(correct))
	for i := range correct {
		incorrect[i] = append([]bool(nil), correct[i]...)
	}
	incorrect[0][0] = !incorrect[0][0]

	service := NewPuzzleService(newFakeRepo(base))

	tests := []struct {
		name   string
		id     string
		cells  [][]bool
		want   bool
		wantOK bool
	}{
		{"correct solution is solved", "t01", correct, true, true},
		{"one wrong cell is not solved", "t01", incorrect, false, true},
		{"unknown puzzle is an error", "nope", correct, false, false},
		{"wrong row count is invalid", "t01", correct[:4], false, false},
		{"wrong column count is invalid", "t01", [][]bool{
			{true, true}, {false, true}, {false, false}, {true, false}, {false, false},
		}, false, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := service.Check(t.Context(), tt.id, tt.cells)
			if tt.wantOK && err != nil {
				t.Fatalf("Check() unexpected error: %v", err)
			}
			if !tt.wantOK && err == nil {
				t.Fatalf("Check() expected error, got none")
			}
			if got != tt.want {
				t.Errorf("Check() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestPuzzleServiceCheckErrorsAreTyped(t *testing.T) {
	service := NewPuzzleService(newFakeRepo(validPuzzle("t01")))

	_, err := service.Check(t.Context(), "nope", validPuzzle("t01").Solution)
	if !errors.Is(err, domain.ErrPuzzleNotFound) {
		t.Fatalf("missing puzzle: error = %v, want domain.ErrPuzzleNotFound", err)
	}

	_, err = service.Check(t.Context(), "t01", nil)
	if !errors.Is(err, ErrInvalidCells) {
		t.Fatalf("bad shape: error = %v, want application.ErrInvalidCells", err)
	}
}

func TestPuzzleServiceList(t *testing.T) {
	p1 := validPuzzle("t01")
	p2 := validPuzzle("t02")
	service := NewPuzzleService(newFakeRepo(p1, p2))

	got, err := service.List(t.Context())
	if err != nil {
		t.Fatalf("List returned error: %v", err)
	}
	if len(got) != 2 || got[0].ID != "t01" || got[1].ID != "t02" {
		t.Errorf("List = %v, want [t01 t02]", got)
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
