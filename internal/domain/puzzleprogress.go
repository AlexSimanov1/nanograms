package domain

import (
	"errors"
	"fmt"
	"time"
)

// PuzzleProgress tracks a user's state while solving a single puzzle.
//
// It is a pure domain value: it knows nothing about HTTP, storage, or the
// frontend. The zero value of time.Time means "not set". Time values are
// passed into the transition methods so the model stays deterministic and
// easy to test.
type PuzzleProgress struct {
	PuzzleID    string
	Cells       [][]CellState
	Status      ProgressStatus
	StartedAt   time.Time
	ElapsedTime time.Duration
	CompletedAt time.Time
}

// NewPuzzleProgress returns a fresh, empty progress for the given puzzle.
func NewPuzzleProgress(puzzle Puzzle) PuzzleProgress {
	grid := make([][]CellState, puzzle.Height)
	for row := range puzzle.Height {
		grid[row] = make([]CellState, puzzle.Width)
	}
	return PuzzleProgress{
		PuzzleID: puzzle.ID,
		Cells:    grid,
		Status:   ProgressNotStarted,
	}
}

// Start transitions the progress to in_progress and records when solving
// began. It is a no-op once solving has already started.
func (p *PuzzleProgress) Start(now time.Time) {
	if p.Status != ProgressNotStarted {
		return
	}
	p.Status = ProgressInProgress
	p.StartedAt = now
}

// SetCell sets the state of one cell. It returns an error if the coordinates
// are out of bounds, if the state is invalid, or if the puzzle is already
// completed.
func (p *PuzzleProgress) SetCell(row, col int, state CellState) error {
	if p.Status == ProgressCompleted {
		return errors.New("puzzle progress: cannot change a completed puzzle")
	}
	if row < 0 || row >= len(p.Cells) || col < 0 || col >= len(p.Cells[row]) {
		return fmt.Errorf("puzzle progress: cell (%d,%d) out of bounds", row, col)
	}
	if !state.Valid() {
		return fmt.Errorf("puzzle progress: invalid cell state %q", state)
	}
	p.Cells[row][col] = state
	return nil
}

// Complete transitions the progress to completed at the given time. It is a
// no-op unless the puzzle is currently being solved.
func (p *PuzzleProgress) Complete(now time.Time) {
	if p.Status != ProgressInProgress {
		return
	}
	p.Status = ProgressCompleted
	p.CompletedAt = now
}

// Reset clears every cell and returns the progress to the not-started state,
// dropping the recorded start, elapsed, and completion times.
func (p *PuzzleProgress) Reset() {
	for row := range p.Cells {
		for col := range p.Cells[row] {
			p.Cells[row][col] = CellEmpty
		}
	}
	p.Status = ProgressNotStarted
	p.StartedAt = time.Time{}
	p.ElapsedTime = 0
	p.CompletedAt = time.Time{}
}
