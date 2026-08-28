package domain

import (
	"errors"
	"fmt"
)

// Puzzle is an immutable nonogram definition: the grid size, the row and
// column clues, and the ground-truth solution.
//
// It is a pure domain value and must not depend on HTTP, storage, or the
// frontend. The Solution holds, for every cell, whether it is filled; it is
// distinct from the user-facing CellState (see cellstate.go).
type Puzzle struct {
	ID          string
	Title       string
	Width       int
	Height      int
	Difficulty  string
	RowHints    [][]int
	ColumnHints [][]int
	Solution    [][]bool
}

// Validate checks the structural invariants of the puzzle:
//   - id must be non-empty;
//   - width and height must be positive;
//   - rowHints must have one entry per row;
//   - columnHints must have one entry per column;
//   - solution must be a height×width grid.
//
// It does not verify that the clues are solvable or consistent with the
// solution; that heavier check is done when puzzle data is loaded.
func (p Puzzle) Validate() error {
	if p.ID == "" {
		return errors.New("puzzle: id must not be empty")
	}
	if p.Width <= 0 {
		return fmt.Errorf("puzzle %q: width must be positive, got %d", p.ID, p.Width)
	}
	if p.Height <= 0 {
		return fmt.Errorf("puzzle %q: height must be positive, got %d", p.ID, p.Height)
	}
	if len(p.RowHints) != p.Height {
		return fmt.Errorf("puzzle %q: len(rowHints)=%d, want height %d", p.ID, len(p.RowHints), p.Height)
	}
	if len(p.ColumnHints) != p.Width {
		return fmt.Errorf("puzzle %q: len(columnHints)=%d, want width %d", p.ID, len(p.ColumnHints), p.Width)
	}
	if len(p.Solution) != p.Height {
		return fmt.Errorf("puzzle %q: len(solution)=%d, want height %d", p.ID, len(p.Solution), p.Height)
	}
	for row := range p.Solution {
		if len(p.Solution[row]) != p.Width {
			return fmt.Errorf("puzzle %q: solution row %d has %d cells, want width %d", p.ID, row, len(p.Solution[row]), p.Width)
		}
	}
	return nil
}

// CheckSolution reports whether the player's filled-cells grid (height×width
// of booleans, true = filled) matches the puzzle's solution exactly.
//
// Marked cells are a player annotation, not part of the answer, so only the
// filled set is compared. A grid whose shape does not match the puzzle is
// never correct. The solution itself is never returned, only this verdict.
func (p Puzzle) CheckSolution(filled [][]bool) bool {
	if len(filled) != p.Height {
		return false
	}
	for row := range filled {
		if len(filled[row]) != p.Width {
			return false
		}
	}
	for row := range filled {
		for col := range filled[row] {
			if filled[row][col] != p.Solution[row][col] {
				return false
			}
		}
	}
	return true
}
