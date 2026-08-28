package domain

import "testing"

func TestPuzzleValidate(t *testing.T) {
	tests := []struct {
		name    string
		mutate  func(*Puzzle)
		wantErr bool
	}{
		{"valid", func(p *Puzzle) {}, false},
		{"empty id", func(p *Puzzle) { p.ID = "" }, true},
		{"zero width", func(p *Puzzle) { p.Width = 0 }, true},
		{"negative height", func(p *Puzzle) { p.Height = -1 }, true},
		{"rowHints length mismatch", func(p *Puzzle) { p.RowHints = p.RowHints[:4] }, true},
		{"columnHints length mismatch", func(p *Puzzle) { p.ColumnHints = p.ColumnHints[:4] }, true},
		{"solution row count mismatch", func(p *Puzzle) { p.Solution = p.Solution[:4] }, true},
		{"solution row width mismatch", func(p *Puzzle) { p.Solution[0] = p.Solution[0][:4] }, true},
		{"nil solution", func(p *Puzzle) { p.Solution = nil }, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			p := validPuzzle()
			tt.mutate(&p)
			err := p.Validate()
			if (err != nil) != tt.wantErr {
				t.Fatalf("Validate() error = %v, wantErr = %v", err, tt.wantErr)
			}
		})
	}
}

func validPuzzle() Puzzle {
	return Puzzle{
		ID:     "001",
		Title:  "Example",
		Width:  5,
		Height: 5,
		RowHints: [][]int{
			{5}, {1, 1}, {1}, {3}, {2},
		},
		ColumnHints: [][]int{
			{1, 1}, {2}, {1, 1}, {2}, {5},
		},
		Solution: [][]bool{
			{true, true, true, true, true},
			{true, false, true, false, true},
			{true, false, false, false, false},
			{true, true, true, false, false},
			{true, true, false, false, false},
		},
	}
}
