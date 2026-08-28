package domain

import "fmt"

// ProgressStatus is the solving status of a puzzle.
type ProgressStatus int

const (
	// ProgressNotStarted means the puzzle has not been touched yet.
	ProgressNotStarted ProgressStatus = iota
	// ProgressInProgress means the user has started solving the puzzle.
	ProgressInProgress
	// ProgressCompleted means the puzzle has been solved.
	ProgressCompleted
)

// Valid reports whether s is one of the defined progress statuses.
func (s ProgressStatus) Valid() bool {
	switch s {
	case ProgressNotStarted, ProgressInProgress, ProgressCompleted:
		return true
	default:
		return false
	}
}

// String returns a stable name for the status, used in logs and error messages.
func (s ProgressStatus) String() string {
	switch s {
	case ProgressNotStarted:
		return "not_started"
	case ProgressInProgress:
		return "in_progress"
	case ProgressCompleted:
		return "completed"
	default:
		return fmt.Sprintf("ProgressStatus(%d)", int(s))
	}
}
