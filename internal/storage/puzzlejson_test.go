package storage

import (
	"strings"
	"testing"
)

const validPuzzleJSON = `{
  "version": 1,
  "id": "t01",
  "title": "Test",
  "width": 5,
  "height": 5,
  "difficulty": "easy",
  "rowHints": [[2],[1,1],[],[1,1],[3]],
  "columnHints": [[1,1],[2],[2],[1,1],[1]],
  "solution": [
    [true,true,false,false,false],
    [false,true,false,true,false],
    [false,false,false,false,false],
    [true,false,true,false,false],
    [false,false,true,true,true]
  ]
}`

func TestDecodePuzzle(t *testing.T) {
	p, err := DecodePuzzle([]byte(validPuzzleJSON))
	if err != nil {
		t.Fatalf("DecodePuzzle returned error: %v", err)
	}
	if p.ID != "t01" || p.Width != 5 || p.Height != 5 {
		t.Errorf("decoded puzzle = %+v, want id=t01 5x5", p)
	}
	if err := p.Validate(); err != nil {
		t.Errorf("decoded puzzle Validate() = %v, want nil", err)
	}
}

func TestDecodePuzzleErrors(t *testing.T) {
	tests := []struct {
		name string
		json string
	}{
		{"malformed json", `{`},
		{"wrong version", strings.Replace(validPuzzleJSON, `"version": 1`, `"version": 2`, 1)},
		{"missing id", strings.Replace(validPuzzleJSON, `"id": "t01",`, ``, 1)},
		{"missing width", strings.Replace(validPuzzleJSON, `"width": 5,`, ``, 1)},
		{"dimension mismatch", strings.Replace(validPuzzleJSON, `"height": 5,`, `"height": 6,`, 1)},
		{"row hint mismatch", strings.Replace(validPuzzleJSON, `[2],[1,1],[],[1,1],[3]`, `[3],[1,1],[],[1,1],[3]`, 1)},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if _, err := DecodePuzzle([]byte(tt.json)); err == nil {
				t.Errorf("%s: want error, got nil", tt.name)
			}
		})
	}
}
