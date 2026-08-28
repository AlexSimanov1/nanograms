package domain

import (
	"testing"
	"time"
)

var (
	progressT0 = time.Date(2026, 8, 28, 10, 0, 0, 0, time.UTC)
	progressT1 = time.Date(2026, 8, 28, 10, 30, 0, 0, time.UTC)
)

func TestProgressStatus(t *testing.T) {
	cases := []struct {
		s     ProgressStatus
		valid bool
		str   string
	}{
		{ProgressNotStarted, true, "not_started"},
		{ProgressInProgress, true, "in_progress"},
		{ProgressCompleted, true, "completed"},
		{ProgressStatus(-1), false, "ProgressStatus(-1)"},
		{ProgressStatus(3), false, "ProgressStatus(3)"},
	}
	for _, tt := range cases {
		if got := tt.s.Valid(); got != tt.valid {
			t.Errorf("Valid(%d) = %v, want %v", tt.s, got, tt.valid)
		}
		if got := tt.s.String(); got != tt.str {
			t.Errorf("String(%d) = %q, want %q", tt.s, got, tt.str)
		}
	}
}

func TestNewPuzzleProgress(t *testing.T) {
	p := NewPuzzleProgress(validPuzzle())
	if p.PuzzleID != "001" {
		t.Errorf("PuzzleID = %q, want %q", p.PuzzleID, "001")
	}
	if p.Status != ProgressNotStarted {
		t.Errorf("Status = %v, want not_started", p.Status)
	}
	if len(p.Cells) != 5 || len(p.Cells[0]) != 5 {
		t.Fatalf("grid = %dx%d, want 5x5", len(p.Cells), len(p.Cells[0]))
	}
	for _, row := range p.Cells {
		for _, c := range row {
			if c != CellEmpty {
				t.Errorf("new progress cell = %v, want empty", c)
			}
		}
	}
}

func TestProgressStart(t *testing.T) {
	p := NewPuzzleProgress(validPuzzle())
	p.Start(progressT0)
	if p.Status != ProgressInProgress {
		t.Errorf("Status = %v, want in_progress", p.Status)
	}
	if !p.StartedAt.Equal(progressT0) {
		t.Errorf("StartedAt = %v, want %v", p.StartedAt, progressT0)
	}
	// Starting again must not overwrite the recorded start time.
	p.Start(progressT1)
	if !p.StartedAt.Equal(progressT0) {
		t.Errorf("StartedAt changed on second Start = %v, want %v", p.StartedAt, progressT0)
	}
}

func TestProgressSetCell(t *testing.T) {
	p := NewPuzzleProgress(validPuzzle())
	if err := p.SetCell(1, 2, CellFilled); err != nil {
		t.Fatalf("SetCell returned error: %v", err)
	}
	if p.Cells[1][2] != CellFilled {
		t.Errorf("cell (1,2) = %v, want filled", p.Cells[1][2])
	}

	if err := p.SetCell(5, 0, CellFilled); err == nil {
		t.Error("SetCell out of bounds row: want error")
	}
	if err := p.SetCell(0, 5, CellFilled); err == nil {
		t.Error("SetCell out of bounds col: want error")
	}
	if err := p.SetCell(0, 0, CellState(9)); err == nil {
		t.Error("SetCell invalid state: want error")
	}
}

func TestProgressComplete(t *testing.T) {
	p := NewPuzzleProgress(validPuzzle())
	// Completing a puzzle that was never started must be a no-op.
	p.Complete(progressT1)
	if p.Status != ProgressNotStarted {
		t.Errorf("Complete before Start = %v, want not_started", p.Status)
	}

	p.Start(progressT0)
	p.Complete(progressT1)
	if p.Status != ProgressCompleted {
		t.Errorf("Status = %v, want completed", p.Status)
	}
	if !p.CompletedAt.Equal(progressT1) {
		t.Errorf("CompletedAt = %v, want %v", p.CompletedAt, progressT1)
	}
}

func TestProgressCompletedBlocksChange(t *testing.T) {
	p := NewPuzzleProgress(validPuzzle())
	p.Start(progressT0)
	p.Complete(progressT1)
	if err := p.SetCell(0, 0, CellFilled); err == nil {
		t.Error("SetCell on completed puzzle: want error")
	}
}

func TestProgressReset(t *testing.T) {
	p := NewPuzzleProgress(validPuzzle())
	p.Start(progressT0)
	_ = p.SetCell(0, 0, CellFilled)
	_ = p.SetCell(4, 4, CellMarked)
	p.Complete(progressT1)
	p.Reset()

	if p.Status != ProgressNotStarted {
		t.Errorf("Status after Reset = %v, want not_started", p.Status)
	}
	if !p.StartedAt.IsZero() || !p.CompletedAt.IsZero() {
		t.Error("Reset: timestamps should be zero")
	}
	if p.ElapsedTime != 0 {
		t.Errorf("Reset: ElapsedTime = %v, want 0", p.ElapsedTime)
	}
	for _, row := range p.Cells {
		for _, c := range row {
			if c != CellEmpty {
				t.Errorf("Reset: cell = %v, want empty", c)
			}
		}
	}
}
