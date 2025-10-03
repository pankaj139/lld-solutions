# Sudoku Game

## 🔗 Implementation Links

- **Python Implementation**: [python/sudoku-game/main.py](python/sudoku-game/main.py)
- **JavaScript Implementation**: [javascript/sudoku-game/main.js](javascript/sudoku-game/main.js)

## Problem Statement

Design a Sudoku puzzle game system that can:

1. **Generate valid Sudoku puzzles** with unique solutions at different difficulty levels
2. **Validate player moves** ensuring they comply with Sudoku rules (no duplicates in row/column/box)
3. **Solve Sudoku puzzles** using efficient backtracking algorithm
4. **Support multiple difficulty levels** (Easy, Medium, Hard) with appropriate number of clues
5. **Track game progress** including moves made, hints used, and time taken
6. **Provide hint system** that reveals correct values for selected cells
7. **Detect puzzle completion** and validate solution correctness

## Requirements

### Functional Requirements

- Initialize 9×9 Sudoku grid with standard 3×3 box structure
- Generate valid complete Sudoku board with random number placement
- Create puzzles by removing numbers while ensuring unique solution
- Support three difficulty levels: Easy (40-45 clues), Medium (30-35 clues), Hard (25-28 clues)
- Validate player input ensuring no duplicate numbers in row, column, or 3×3 box
- Allow player to place, modify, and clear cell values
- Implement backtracking algorithm to solve any valid Sudoku puzzle
- Provide hint functionality revealing correct value for empty cell
- Detect when puzzle is completely and correctly filled
- Track number of moves, hints used, and elapsed time
- Support undo/redo functionality for player moves

### Non-Functional Requirements

- Puzzle generation should complete in < 5 seconds for any difficulty
- Move validation should execute in O(1) time
- Puzzle solving should complete in < 1 second for standard puzzles
- Support concurrent games (multiple puzzle instances)
- Clean console or grid-based visualization
- Extensible for GUI implementation

## Design Decisions

### Key Classes

1. **Board Management**
   - `Board`: Represents 9×9 Sudoku grid with cell state management
   - `Cell`: Individual cell with value, state (given/player-filled), and candidates
   - `Box`: Represents 3×3 sub-grid for validation

2. **Puzzle Generation**
   - `PuzzleGenerator`: Creates valid Sudoku puzzles with unique solutions
   - `Difficulty`: Enum for difficulty levels with clue counts
   - `SolutionCounter`: Verifies puzzle has exactly one solution

3. **Game Logic**
   - `SudokuSolver`: Solves puzzles using backtracking algorithm
   - `Validator`: Validates moves and checks Sudoku rules
   - `Game`: Main game controller managing state and player actions

4. **Player Interaction**
   - `Move`: Represents player move with undo/redo support
   - `HintSystem`: Provides hints using solving algorithm
   - `GameStatistics`: Tracks moves, hints, time, and score

### Design Patterns Used

1. **Strategy Pattern**: Different puzzle generation strategies for difficulty levels
2. **Command Pattern**: Move operations with undo/redo capability
3. **Template Method Pattern**: Common solving algorithm with customizable steps
4. **Singleton Pattern**: Single game instance manager
5. **Observer Pattern**: UI observers for cell value changes and game events
6. **Memento Pattern**: Game state snapshots for undo/redo

### Key Features

- **Backtracking Solver**: Efficient algorithm that solves any valid Sudoku
- **Unique Solution Guarantee**: Generated puzzles always have exactly one solution
- **Smart Hint System**: Uses partial solving to provide strategic hints
- **Move History**: Complete move tracking with undo/redo
- **Progressive Difficulty**: Configurable difficulty based on clue count and placement

## State Diagram

```text
INITIALIZING
  ↓ (generate_puzzle)
READY
  ↓ (start_game)
PLAYING
  ├─→ (place_number) → [validate]
  │                      ├─→ INVALID → PLAYING (reject move)
  │                      └─→ VALID → [check_complete]
  │                                    ├─→ INCOMPLETE → PLAYING
  │                                    └─→ COMPLETE → FINISHED
  ├─→ (request_hint) → PLAYING (show hint)
  ├─→ (undo_move) → PLAYING
  └─→ (pause) → PAUSED
                  ↓ (resume)
               PLAYING
FINISHED
  ↓ (new_game)
INITIALIZING
```

## Class Diagram

```text
Difficulty (Enum)
├── EASY (40-45 clues)
├── MEDIUM (30-35 clues)
└── HARD (25-28 clues)

CellState (Enum)
├── EMPTY
├── GIVEN (pre-filled, immutable)
└── PLAYER_FILLED (player input, mutable)

Cell
├── value: int (0-9, 0 means empty)
├── state: CellState
├── candidates: Set[int]
├── is_given() → bool
└── is_valid_value(value) → bool

Board
├── grid: List[List[Cell]] (9×9)
├── get_cell(row, col) → Cell
├── set_value(row, col, value) → bool
├── get_row(row) → List[Cell]
├── get_column(col) → List[Cell]
├── get_box(row, col) → List[Cell]
├── is_valid_placement(row, col, value) → bool
└── is_complete() → bool

Validator
├── is_valid_row(board, row, value) → bool
├── is_valid_column(board, col, value) → bool
├── is_valid_box(board, row, col, value) → bool
└── is_valid_placement(board, row, col, value) → bool

SudokuSolver
├── solve(board) → bool
├── _solve_backtrack(board, row, col) → bool
├── find_empty_cell(board) → Tuple[int, int]
└── has_unique_solution(board) → bool

PuzzleGenerator
├── difficulty: Difficulty
├── generate_complete_board() → Board
├── remove_numbers(board, difficulty) → Board
└── _fill_diagonal_boxes(board) → None

Move (Command Pattern)
├── row: int
├── col: int
├── old_value: int
├── new_value: int
├── execute() → None
└── undo() → None

HintSystem
├── board: Board
├── get_hint(row, col) → int
└── get_random_hint() → Tuple[int, int, int]

GameStatistics
├── start_time: datetime
├── moves_made: int
├── hints_used: int
├── elapsed_time: float
└── calculate_score() → int

SudokuGame
├── board: Board
├── solution: Board
├── difficulty: Difficulty
├── move_history: List[Move]
├── statistics: GameStatistics
├── state: GameState
├── start_new_game(difficulty) → None
├── place_number(row, col, value) → bool
├── get_hint(row, col) → int
├── undo_move() → bool
├── redo_move() → bool
└── check_solution() → bool
```

## Usage Example

```python
# Create new Sudoku game
game = SudokuGame(difficulty=Difficulty.MEDIUM)

# Generate puzzle
game.start_new_game()

# Display puzzle
game.board.display()

# Player makes move
if game.place_number(row=0, col=0, value=5):
    print("Valid move!")
else:
    print("Invalid move - violates Sudoku rules")

# Request hint
hint_value = game.get_hint(row=1, col=1)
print(f"Hint: Try {hint_value}")

# Undo last move
if game.undo_move():
    print("Move undone")

# Check if puzzle is solved
if game.check_solution():
    print("Congratulations! Puzzle solved!")
    print(f"Time: {game.statistics.elapsed_time:.1f}s")
    print(f"Moves: {game.statistics.moves_made}")
    print(f"Score: {game.statistics.calculate_score()}")
```

## Business Rules

1. **Sudoku Rules**
   - Each row must contain digits 1-9 without repetition
   - Each column must contain digits 1-9 without repetition
   - Each 3×3 box must contain digits 1-9 without repetition
   - Given cells (initial puzzle clues) cannot be modified
   - Empty cells can be filled by player or remain empty

2. **Puzzle Generation Rules**
   - Generated puzzle must have exactly one unique solution
   - Difficulty determined by number of given clues:
     - Easy: 40-45 clues (many helps)
     - Medium: 30-35 clues (moderate challenge)
     - Hard: 25-28 clues (expert level)
   - Clue placement should be symmetric when possible
   - All valid puzzles must be solvable using logical deduction

3. **Move Validation Rules**
   - Player cannot modify given cells
   - Placement must not create duplicate in row
   - Placement must not create duplicate in column
   - Placement must not create duplicate in 3×3 box
   - Value must be between 1-9 (or 0 to clear)

4. **Hint System Rules**
   - Hints reveal correct value for selected cell
   - Each hint usage decreases final score
   - Maximum hints: unlimited (but penalized)
   - Hints only available for empty cells
   - Hint uses solving algorithm to ensure correctness

5. **Scoring Rules**
   - Base score: 1000 points
   - Time penalty: -1 point per 10 seconds
   - Hint penalty: -50 points per hint
   - Difficulty bonus: Easy (×1), Medium (×1.5), Hard (×2)
   - Minimum score: 0 (cannot go negative)

## Extension Points

1. **Multiple Game Modes**: Classic, Killer Sudoku, Diagonal Sudoku, Irregular Sudoku
2. **Progressive Hints**: First hint shows candidates, second shows cell, third reveals value
3. **Auto-Notes**: Automatically track possible candidates for each cell
4. **Error Highlighting**: Highlight conflicting cells when invalid placement occurs
5. **Save/Load Game**: Persist game state to continue later
6. **Multiplayer Mode**: Race mode where players solve same puzzle
7. **Daily Challenge**: New puzzle each day with global leaderboard
8. **Tutorial Mode**: Interactive tutorial teaching Sudoku strategies

## Security Considerations

- **Solution Protection**: Store solution separately, never expose to client in web version
- **Validation Server-Side**: Validate all moves server-side in multiplayer
- **Anti-Cheat**: Detect suspicious solving patterns (too fast, too perfect)
- **Rate Limiting**: Limit hint requests to prevent abuse

## Time Complexity

- **Puzzle Generation**: O(n²) where n=9 for filling board, plus removal time
- **Backtracking Solver**: O(9^m) where m is number of empty cells (exponential worst case)
- **Move Validation**: O(1) - Check 3 sets (row, column, box) of size 9
- **Is Complete Check**: O(n²) = O(81) = O(1) - Scan all cells
- **Undo/Redo**: O(1) - Stack operations
- **Hint Generation**: O(9^m) - Uses solving algorithm (same as solver)

## Space Complexity

- O(n²) = O(81) = O(1) for 9×9 grid storage
- O(m) where m is number of moves for move history
- O(1) for validation (checking fixed size sets)
- O(n²) for solution board storage
- O(9^m) recursion depth for backtracking solver in worst case
