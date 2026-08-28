package domain

import "testing"

func TestCellStateValid(t *testing.T) {
	cases := []struct {
		state CellState
		valid bool
	}{
		{CellEmpty, true},
		{CellFilled, true},
		{CellMarked, true},
		{CellState(-1), false},
		{CellState(7), false},
	}
	for _, tt := range cases {
		if got := tt.state.Valid(); got != tt.valid {
			t.Errorf("Valid(%d) = %v, want %v", tt.state, got, tt.valid)
		}
	}
}

func TestCellStateString(t *testing.T) {
	cases := map[CellState]string{
		CellEmpty:    "empty",
		CellFilled:   "filled",
		CellMarked:   "marked",
		CellState(7): "CellState(7)",
	}
	for state, want := range cases {
		if got := state.String(); got != want {
			t.Errorf("String(%d) = %q, want %q", state, got, want)
		}
	}
}
