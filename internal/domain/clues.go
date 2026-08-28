package domain

import "fmt"

// rowRuns returns the run lengths of consecutive filled cells in row.
// An empty row produces an empty slice.
func rowRuns(row []bool) []int {
	runs := make([]int, 0)
	var cur int
	for _, filled := range row {
		if filled {
			cur++
			continue
		}
		if cur > 0 {
			runs = append(runs, cur)
			cur = 0
		}
	}
	if cur > 0 {
		runs = append(runs, cur)
	}
	return runs
}

// ValidateClueConsistency verifies that rowHints and columnHints match the
// filled cells of the solution. It is a heavier check than Validate and is
// intended for use when puzzle data is loaded.
func (p Puzzle) ValidateClueConsistency() error {
	for row := range p.RowHints {
		got := rowRuns(p.Solution[row])
		if !equalIntSlices(got, p.RowHints[row]) {
			return fmt.Errorf("puzzle %q: row %d hints %v do not match solution runs %v",
				p.ID, row, p.RowHints[row], got)
		}
	}
	for col := range p.ColumnHints {
		colCells := make([]bool, p.Height)
		for row := range p.Solution {
			colCells[row] = p.Solution[row][col]
		}
		got := rowRuns(colCells)
		if !equalIntSlices(got, p.ColumnHints[col]) {
			return fmt.Errorf("puzzle %q: column %d hints %v do not match solution runs %v",
				p.ID, col, p.ColumnHints[col], got)
		}
	}
	return nil
}

func equalIntSlices(a, b []int) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}
