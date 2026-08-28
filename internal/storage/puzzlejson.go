package storage

import (
	"encoding/json"
	"fmt"

	"github.com/AlexSimanov1/nanograms/internal/domain"
)

// puzzleFormatVersion is the version of the on-disk JSON schema.
const puzzleFormatVersion = 1

// puzzleFile is the JSON representation of a puzzle in schema v1.
//
// The field names (version, id, title, width, height, difficulty, rowHints,
// columnHints, solution) are part of the stable format and must not change
// without bumping puzzleFormatVersion.
type puzzleFile struct {
	Version     int      `json:"version"`
	ID          string   `json:"id"`
	Title       string   `json:"title"`
	Width       int      `json:"width"`
	Height      int      `json:"height"`
	Difficulty  string   `json:"difficulty"`
	RowHints    [][]int  `json:"rowHints"`
	ColumnHints [][]int  `json:"columnHints"`
	Solution    [][]bool `json:"solution"`
}

// DecodePuzzle parses puzzle JSON in schema v1 and returns an equivalent
// domain puzzle after full validation (format version, structural shape, and
// clue consistency with the solution).
func DecodePuzzle(data []byte) (domain.Puzzle, error) {
	var f puzzleFile
	if err := json.Unmarshal(data, &f); err != nil {
		return domain.Puzzle{}, fmt.Errorf("decode puzzle json: %w", err)
	}
	if err := f.validateVersion(); err != nil {
		return domain.Puzzle{}, err
	}
	p := domain.Puzzle{
		ID:          f.ID,
		Title:       f.Title,
		Width:       f.Width,
		Height:      f.Height,
		Difficulty:  f.Difficulty,
		RowHints:    f.RowHints,
		ColumnHints: f.ColumnHints,
		Solution:    f.Solution,
	}
	if err := p.Validate(); err != nil {
		return domain.Puzzle{}, err
	}
	if err := p.ValidateClueConsistency(); err != nil {
		return domain.Puzzle{}, err
	}
	return p, nil
}

func (f puzzleFile) validateVersion() error {
	if f.Version != puzzleFormatVersion {
		return fmt.Errorf("puzzle %q: unsupported format version %d, want %d",
			f.ID, f.Version, puzzleFormatVersion)
	}
	return nil
}
