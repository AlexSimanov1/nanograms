package application

import (
	"context"

	"github.com/AlexSimanov1/nanograms/internal/domain"
)

// PuzzleService implements the puzzle use cases of the application layer.
//
// It depends only on the PuzzleRepository port and the domain; it has no
// knowledge of where puzzles are stored (JSON files, a database, etc.).
type PuzzleService struct {
	repo PuzzleRepository
}

// NewPuzzleService returns a PuzzleService backed by repo.
func NewPuzzleService(repo PuzzleRepository) *PuzzleService {
	return &PuzzleService{repo: repo}
}

// List returns all available puzzles.
func (s *PuzzleService) List(ctx context.Context) ([]domain.Puzzle, error) {
	return s.repo.List(ctx)
}

// Get returns the puzzle with the given id, or domain.ErrPuzzleNotFound if it
// does not exist.
func (s *PuzzleService) Get(ctx context.Context, id string) (domain.Puzzle, error) {
	p, err := s.repo.Get(ctx, id)
	if err != nil {
		return domain.Puzzle{}, err
	}
	return *p, nil
}

// Check reports whether the player's filled cells (height×width grid of
// booleans, true = filled) match the puzzle's solution. The comparison ignores
// marked cells and never reveals the solution. A grid whose shape does not
// match the puzzle returns application.ErrInvalidCells.
func (s *PuzzleService) Check(ctx context.Context, id string, filled [][]bool) (bool, error) {
	p, err := s.repo.Get(ctx, id)
	if err != nil {
		return false, err
	}
	if !sameShape(filled, p.Height, p.Width) {
		return false, ErrInvalidCells
	}
	return p.CheckSolution(filled), nil
}

// sameShape reports whether grid is exactly rows×cols.
func sameShape(grid [][]bool, rows, cols int) bool {
	if len(grid) != rows {
		return false
	}
	for _, row := range grid {
		if len(row) != cols {
			return false
		}
	}
	return true
}
