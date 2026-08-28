package storage

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"

	"github.com/AlexSimanov1/nanograms/internal/domain"
)

// JSONPuzzleRepository reads puzzles from JSON files in a directory.
//
// It owns filesystem access, filenames, and JSON decoding (schema v1), and is
// a drop-in implementation of application.PuzzleRepository.
type JSONPuzzleRepository struct {
	dir string
	log *slog.Logger
}

// NewJSONPuzzleRepository returns a repository that serves puzzles from dir.
func NewJSONPuzzleRepository(dir string, log *slog.Logger) *JSONPuzzleRepository {
	return &JSONPuzzleRepository{dir: dir, log: log}
}

// Get reads, decodes, and validates the puzzle with the given id.
func (r *JSONPuzzleRepository) Get(ctx context.Context, id string) (*domain.Puzzle, error) {
	if err := ctx.Err(); err != nil {
		return nil, err
	}
	data, err := os.ReadFile(filepath.Join(r.dir, id+".json"))
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return nil, fmt.Errorf("puzzle %q: %w", id, ErrPuzzleNotFound)
		}
		return nil, fmt.Errorf("read puzzle %q: %w", id, err)
	}
	p, err := DecodePuzzle(data)
	if err != nil {
		return nil, fmt.Errorf("load puzzle %q: %w", id, err)
	}
	return &p, nil
}

// List reads all valid puzzles in the directory. Files that cannot be read or
// fail validation are skipped and logged; a single bad file never fails the
// whole catalog.
func (r *JSONPuzzleRepository) List(ctx context.Context) ([]domain.Puzzle, error) {
	if err := ctx.Err(); err != nil {
		return nil, err
	}
	entries, err := os.ReadDir(r.dir)
	if err != nil {
		return nil, fmt.Errorf("read puzzles dir %q: %w", r.dir, err)
	}
	puzzles := make([]domain.Puzzle, 0, len(entries))
	for _, entry := range entries {
		if entry.IsDir() || filepath.Ext(entry.Name()) != ".json" {
			continue
		}
		p, err := r.loadPuzzle(entry.Name())
		if err != nil {
			r.log.Warn("skip invalid puzzle file", "file", entry.Name(), "error", err)
			continue
		}
		puzzles = append(puzzles, p)
	}
	return puzzles, nil
}

func (r *JSONPuzzleRepository) loadPuzzle(name string) (domain.Puzzle, error) {
	data, err := os.ReadFile(filepath.Join(r.dir, name))
	if err != nil {
		return domain.Puzzle{}, err
	}
	return DecodePuzzle(data)
}
