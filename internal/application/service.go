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
