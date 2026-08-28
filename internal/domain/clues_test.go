package domain

import "testing"

func TestRowRuns(t *testing.T) {
	cases := []struct {
		row  []bool
		want []int
	}{
		{[]bool{}, []int{}},
		{[]bool{false, false}, []int{}},
		{[]bool{true}, []int{1}},
		{[]bool{true, true, false, true}, []int{2, 1}},
		{[]bool{false, true, true, true, false}, []int{3}},
		{[]bool{true, true, true, true, true}, []int{5}},
	}
	for _, tt := range cases {
		if got := rowRuns(tt.row); !equalIntSlices(got, tt.want) {
			t.Errorf("rowRuns(%v) = %v, want %v", tt.row, got, tt.want)
		}
	}
}

func TestValidateClueConsistency(t *testing.T) {
	good := consistentPuzzle()
	if err := good.ValidateClueConsistency(); err != nil {
		t.Fatalf("ValidateClueConsistency() = %v, want nil", err)
	}

	badRow := consistentPuzzle()
	badRow.RowHints[0] = []int{3} // actual row 0 run is [2]
	if err := badRow.ValidateClueConsistency(); err == nil {
		t.Error("row hint mismatch: want error, got nil")
	}

	badCol := consistentPuzzle()
	badCol.ColumnHints[2] = []int{1} // actual column 2 run is [2]
	if err := badCol.ValidateClueConsistency(); err == nil {
		t.Error("column hint mismatch: want error, got nil")
	}
}

// consistentPuzzle returns a 5×5 puzzle whose hints match its solution.
func consistentPuzzle() Puzzle {
	return Puzzle{
		ID:          "t01",
		Title:       "Test",
		Width:       5,
		Height:      5,
		Difficulty:  "easy",
		RowHints:    [][]int{{2}, {1, 1}, {}, {1, 1}, {3}},
		ColumnHints: [][]int{{1, 1}, {2}, {2}, {1, 1}, {1}},
		Solution: [][]bool{
			{true, true, false, false, false},
			{false, true, false, true, false},
			{false, false, false, false, false},
			{true, false, true, false, false},
			{false, false, true, true, true},
		},
	}
}
