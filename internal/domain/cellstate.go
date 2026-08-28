package domain

import "fmt"

// CellState is the user-facing state of a single cell while solving a puzzle.
//
// A cell is either untouched (CellEmpty), marked as filled (CellFilled), or
// marked as empty / crossed out (CellMarked). Use these constants instead of
// arbitrary strings throughout the application.
type CellState int

const (
	// CellEmpty is the initial state: the cell has not been acted on.
	CellEmpty CellState = iota
	// CellFilled marks the cell as filled (colored).
	CellFilled
	// CellMarked marks the cell as known-empty (crossed out).
	CellMarked
)

// Valid reports whether s is one of the defined cell states.
func (s CellState) Valid() bool {
	switch s {
	case CellEmpty, CellFilled, CellMarked:
		return true
	default:
		return false
	}
}

// String returns a stable name for the state, used in logs and error messages.
func (s CellState) String() string {
	switch s {
	case CellEmpty:
		return "empty"
	case CellFilled:
		return "filled"
	case CellMarked:
		return "marked"
	default:
		return fmt.Sprintf("CellState(%d)", int(s))
	}
}
