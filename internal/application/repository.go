package application

import (
	"context"

	"github.com/AlexSimanov1/nanograms/internal/domain"
)

// PuzzleRepository provides read access to puzzles independently of how and
// where they are stored (JSON files today, a database in a possible future).
//
// It is defined at the application layer, where it is consumed, keeping the
// application independent of the concrete storage implementation. Concrete
// implementations are wired in cmd/server.
type PuzzleRepository interface {
	Get(ctx context.Context, id string) (*domain.Puzzle, error)
	List(ctx context.Context) ([]domain.Puzzle, error)
}
