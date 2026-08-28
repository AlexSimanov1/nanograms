package storage

import "errors"

// ErrPuzzleNotFound reports that no puzzle with the given id exists.
var ErrPuzzleNotFound = errors.New("puzzle not found")
