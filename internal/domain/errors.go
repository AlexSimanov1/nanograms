package domain

import "errors"

// ErrPuzzleNotFound reports that a puzzle with the given id does not exist.
//
// It lives in the domain so that both the application and storage layers can
// reference it without depending on each other.
var ErrPuzzleNotFound = errors.New("puzzle not found")
