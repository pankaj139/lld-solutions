# Tic-Tac-Toe Game

## 🔗 Implementation Links

- **Python Implementation**: [python/tic-tac-toe/main.py](python/tic-tac-toe/main.py)
- **JavaScript Implementation**: [javascript/tic-tac-toe/main.js](javascript/tic-tac-toe/main.js)

## Problem Statement

Design a tic-tac-toe game system that can:

1. **Support multiple game modes** (Human vs Human, Human vs AI)
2. **Implement intelligent AI** using minimax algorithm with different difficulty levels
3. **Validate moves** and detect win/draw conditions efficiently
4. **Track game statistics** including wins, losses, and draws for each player
5. **Provide undo functionality** to reverse moves during practice mode
6. **Support different board sizes** (extensible from 3x3 to larger grids)

## Requirements

### Functional Requirements

- Initialize 3x3 game board with empty cells
- Support two-player mode (Human vs Human)
- Implement AI opponent with multiple difficulty levels (Easy, Medium, Hard)
- Validate player moves (prevent placing marks on occupied cells)
- Detect win conditions (three in a row: horizontal, vertical, diagonal)
- Detect draw conditions (board full with no winner)
- Track game statistics (wins, losses, draws for each player)
- Support undo/redo functionality for practice mode
- Display board state clearly after each move

### Non-Functional Requirements

- Move validation should execute in O(1) time
- Win detection should execute in O(n) time where n is board size
- AI should respond within 1 second for 3x3 board
- Support board sizes up to 5x5 with reasonable AI response time
- Clean console visualization of game state
- Extensible design for adding new AI strategies

## Design Decisions

### Key Classes

1. **Board Management**
   - `Board`: Represents the game grid with cell state management
   - `Cell`: Individual cell with position and mark (X, O, or empty)
   - Handles board initialization, move placement, and state queries

2. **Player System**
   - `Player`: Abstract base class defining player interface
   - `HumanPlayer`: Takes input from console for move selection
   - `AIPlayer`: Computer player with configurable difficulty strategy

3. **AI Strategy**
   - `AIStrategy`: Abstract strategy interface for AI algorithms
   - `EasyAI`: Random valid move selection
   - `MediumAI`: Basic heuristic-based move selection
   - `HardAI`: Minimax algorithm with alpha-beta pruning for perfect play

4. **Game Controller**
   - `Game`: Main game coordinator managing turns and game flow
   - `GameState`: Tracks current state (waiting, in progress, finished)
   - `Statistics`: Records game outcomes and player performance

### Design Patterns Used

1. **Strategy Pattern**: AI difficulty levels implemented as pluggable strategies
2. **State Pattern**: Game state management (Waiting, InProgress, Finished)
3. **Template Method Pattern**: Common game flow with customizable player move logic
4. **Command Pattern**: Move operations with undo/redo capability
5. **Observer Pattern**: Game event notifications for UI updates and statistics

### Key Features

- **Minimax AI**: Perfect play algorithm for unbeatable AI opponent
- **Multiple Difficulty Levels**: Easy (random), Medium (heuristic), Hard (minimax)
- **Move History**: Complete move tracking with undo functionality
- **Win Detection**: Efficient checking for all win conditions
- **Statistics Tracking**: Comprehensive game outcome recording

## State Diagram

```text
WAITING
  ↓ (start_game)
IN_PROGRESS
  ├─→ (make_move) → [check_win]
  │                      ├─→ WIN → FINISHED
  │                      ├─→ DRAW → FINISHED
  │                      └─→ CONTINUE → IN_PROGRESS
  └─→ (undo_move) → IN_PROGRESS
FINISHED
  ↓ (restart)
WAITING
```

## Class Diagram

```text
Player (Abstract)
├── name: str
├── mark: str (X or O)
└── get_move(board) → Position

HumanPlayer extends Player
└── get_move(board) → Position (from console input)

AIPlayer extends Player
├── strategy: AIStrategy
└── get_move(board) → Position (from strategy)

AIStrategy (Abstract)
└── calculate_move(board, mark) → Position

EasyAI extends AIStrategy
└── calculate_move() → random valid position

MediumAI extends AIStrategy
└── calculate_move() → heuristic-based position

HardAI extends AIStrategy
└── calculate_move() → minimax optimal position

Board
├── grid: List[List[str]]
├── size: int
├── make_move(position, mark) → bool
├── is_valid_move(position) → bool
├── check_win(mark) → bool
└── is_full() → bool

Game
├── board: Board
├── players: List[Player]
├── current_player_idx: int
├── state: GameState
├── move_history: List[Move]
├── play() → None
└── undo_last_move() → bool

GameState (Enum)
├── WAITING
├── IN_PROGRESS
└── FINISHED
```

## Usage Example

```python
# Create game with Human vs Hard AI
player1 = HumanPlayer("Alice", "X")
ai_player = AIPlayer("Computer", "O", HardAI())
game = Game(player1, ai_player)

# Play the game
game.play()

# In practice mode, undo moves
if game.undo_last_move():
    print("Move undone successfully")

# View statistics
print(f"Alice wins: {game.statistics.get_wins('Alice')}")
print(f"Computer wins: {game.statistics.get_wins('Computer')}")
print(f"Draws: {game.statistics.get_draws()}")
```

## Business Rules

1. **Turn Management**
   - Player X always makes the first move
   - Players alternate turns throughout the game
   - Turn switches only after a valid move is made
   - Game ends immediately when win or draw condition is met

2. **Move Validation**
   - Moves can only be made on empty cells
   - Cell position must be within board bounds (0 to size-1)
   - Invalid moves are rejected and same player retries
   - Move history is updated only for valid moves

3. **Win Conditions**
   - Three marks in a row horizontally wins immediately
   - Three marks in a row vertically wins immediately
   - Three marks in a row diagonally wins immediately
   - First player to achieve win condition wins the game

4. **Draw Conditions**
   - Board completely filled with no winner results in draw
   - Draw is checked only after board is full
   - Both players receive draw credit in statistics

5. **AI Response Time**
   - Easy AI responds instantly (< 10ms)
   - Medium AI responds within 100ms
   - Hard AI must respond within 1 second for 3x3 board
   - AI calculations timeout after maximum time to ensure responsiveness

## Extension Points

1. **Variable Board Sizes**: Support N×N boards (4×4, 5×5) with configurable win length
2. **Network Multiplayer**: Online play with remote opponents via websockets
3. **Tournament Mode**: Multiple games with ranking and leaderboard
4. **Graphical UI**: Web-based or desktop GUI instead of console
5. **Advanced AI**: Machine learning-based AI that learns from games
6. **Time Limits**: Add turn timers for competitive play
7. **Save/Load Games**: Persist game state for continuation later
8. **Replay Mode**: Visualize complete game history with playback

## Time Complexity

- **Move Validation**: O(1) - Direct array access to check cell state
- **Win Detection**: O(n) where n is board size - Check row, column, diagonals
- **AI Easy Move**: O(k) where k is empty cells - Random selection from valid moves
- **AI Medium Move**: O(k) where k is empty cells - Heuristic evaluation of positions
- **AI Hard Move**: O(b^d) where b is branching factor and d is depth - Minimax with pruning
- **Undo Move**: O(1) - Pop from move history and update board

## Space Complexity

- O(n²) where n is board size for grid storage
- O(m) where m is total moves for move history
- O(1) for game state and player information
- O(b^d) for minimax algorithm call stack in worst case
