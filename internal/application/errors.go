package application

import "errors"

// ErrInvalidCells reports that a submitted cells grid does not match the
// puzzle's height×width shape (a malformed check request).
var ErrInvalidCells = errors.New("cells do not match puzzle dimensions")
