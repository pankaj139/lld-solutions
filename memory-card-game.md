# Memory Card Game

## 🔗 Implementation Links

- **Python Implementation**: [python/memory-card-game/main.py](python/memory-card-game/main.py)
- **JavaScript Implementation**: [javascript/memory-card-game/main.js](javascript/memory-card-game/main.js)

## Problem Statement

Design a Memory Card matching game system that can:

1. **Manage card grid** with configurable board sizes (4×4, 6×6, 8×8)
2. **Handle card flipping** with face-up and face-down states
3. **Detect matching pairs** when two cards are revealed
4. **Support multiple players** with turn-based gameplay
5. **Track game statistics** including moves, time, and matches found
6. **Implement difficulty levels** affecting board size and card types
7. **Provide single-player mode** with timer and high score tracking

## Requirements

### Functional Requirements

- Initialize game board with pairs of matching cards (e.g., 4×4 board = 8 pairs)
- Shuffle cards randomly at game start to ensure different layouts
- Allow player to flip two cards per turn
- Reveal card content when flipped
- Check if two flipped cards match
- Keep matched pairs face-up permanently
- Flip non-matching cards back face-down after brief display
- Track number of moves/attempts made
- Support 1-4 players with turn rotation
- Detect game completion when all pairs are matched
- Calculate and display final score based on moves and time

### Non-Functional Requirements

- Card flip animation should be smooth (simulated in console with delay)
- Match detection should be instant (< 1ms)
- Support board sizes from 4×4 to 8×8 (8 to 32 pairs)
- Game state should be easily serializable for save/load
- Clear visual representation showing card states
- Extensible for different card themes (numbers, letters, symbols, images)

## Design Decisions

### Key Classes

1. **Card System**
   - `Card`: Individual card with symbol/value and state
   - `CardState`: Enum for card states (FaceDown, FaceUp, Matched)
   - `CardPair`: Represents matching pair of cards

2. **Board Management**
   - `Board`: Grid of cards with position tracking
   - `Position`: Row and column coordinates
   - `Difficulty`: Enum for board sizes (Easy: 4×4, Medium: 6×6, Hard: 8×8)

3. **Game Logic**
   - `Turn`: Represents player's turn with two card selections
   - `Move`: Single card flip action
   - `MatchChecker`: Validates if two cards match

4. **Player System**
   - `Player`: Represents player with score and statistics
   - `PlayerStats`: Tracks matches found, moves made, accuracy

5. **Game Management**
   - `Game`: Main controller managing game flow
   - `GameState`: Enum for states (Setup, Playing, Paused, Finished)
   - `Timer`: Tracks elapsed time for single-player mode
   - `ScoreCalculator`: Computes final score based on performance

### Design Patterns Used

1. **State Pattern**: Card state management (FaceDown → FaceUp → Matched)
2. **Observer Pattern**: Game event notifications (match found, turn complete, game over)
3. **Strategy Pattern**: Different difficulty levels with board size strategies
4. **Memento Pattern**: Save/restore game state for undo functionality
5. **Factory Pattern**: Card creation with symbol assignment
6. **Command Pattern**: Turn/move as reversible command

### Key Features

- **Automatic Shuffling**: Random card placement at game start
- **Match Detection**: Instant validation of card pairs
- **Turn Management**: Proper rotation in multiplayer mode
- **Statistics Tracking**: Comprehensive game metrics
- **Difficulty Scaling**: Adjustable board sizes

## State Diagram

```text
SETUP
  ↓ (shuffle_cards, place_on_board)
PLAYING
  ├─→ (flip_first_card) → WAITING_SECOND_FLIP
  │                         ↓ (flip_second_card)
  │                       CHECK_MATCH
  │                         ├─→ MATCH → [keep_face_up, increment_score]
  │                         │             ↓ (check_completion)
  │                         │           [all_matched] → FINISHED
  │                         │           [continue] → PLAYING (same/next player)
  │                         └─→ NO_MATCH → [flip_back, next_player] → PLAYING
  └─→ (pause) → PAUSED
                  ↓ (resume)
               PLAYING
FINISHED
  ↓ (restart)
SETUP
```

## Class Diagram

```text
CardState (Enum)
├── FACE_DOWN
├── FACE_UP
└── MATCHED

Difficulty (Enum)
├── EASY (4×4, 8 pairs)
├── MEDIUM (6×6, 18 pairs)
└── HARD (8×8, 32 pairs)

GameState (Enum)
├── SETUP
├── PLAYING
├── PAUSED
└── FINISHED

Position
├── row: int
├── col: int
└── __eq__(other) → bool

Card
├── id: int
├── symbol: str
├── state: CardState
├── position: Position
├── flip() → None
├── match() → None
├── reset() → None
└── is_matched() → bool

Board
├── size: int
├── grid: List[List[Card]]
├── cards: List[Card]
├── get_card(position) → Card
├── flip_card(position) → Card
└── display() → None

Move
├── card: Card
├── position: Position
├── player: Player
└── timestamp: datetime

Turn
├── first_card: Card
├── second_card: Card
├── is_match: bool
├── player: Player
└── complete() → bool

MatchChecker
└── check_match(card1, card2) → bool

PlayerStats
├── matches_found: int
├── moves_made: int
├── turns_taken: int
└── accuracy() → float

Player
├── name: str
├── score: int
├── stats: PlayerStats
├── increment_score() → None
└── record_move(is_match) → None

Timer
├── start_time: datetime
├── elapsed_time: float
├── start() → None
├── stop() → None
└── get_elapsed() → float

ScoreCalculator
├── calculate_final_score(moves, time, matches) → int
└── calculate_efficiency(moves, matches) → float

Game
├── board: Board
├── players: List[Player]
├── current_player_idx: int
├── state: GameState
├── timer: Timer
├── difficulty: Difficulty
├── turn_history: List[Turn]
├── start_game() → None
├── flip_card(position) → bool
├── check_for_match() → bool
├── next_turn() → None
└── is_game_complete() → bool
```

## Usage Example

```python
# Create game with 2 players, medium difficulty
game = MemoryCardGame(
    player_names=["Alice", "Bob"],
    difficulty=Difficulty.MEDIUM
)

# Start game
game.start_game()

# Display board
game.board.display()

# Player makes move (flip first card)
position1 = Position(2, 3)
card1 = game.flip_card(position1)

# Flip second card
position2 = Position(1, 4)
card2 = game.flip_card(position2)

# Check for match
if game.check_for_match():
    print(f"Match found! {game.current_player.name} scores!")
else:
    print("No match. Next player's turn.")
    game.next_turn()

# Check if game complete
if game.is_game_complete():
    winner = game.get_winner()
    print(f"Game Over! Winner: {winner.name}")
    print(f"Final Score: {winner.score}")
```

## Business Rules

1. **Card Setup Rules**
   - Board must have even number of cards (pairs)
   - Each symbol/value appears exactly twice
   - Cards are shuffled randomly at game start
   - All cards start face-down
   - Once matched, cards stay face-up permanently

2. **Turn Rules**
   - Player flips exactly two cards per turn
   - First card stays revealed until second card is flipped
   - If cards match, player scores and gets another turn (optional rule)
   - If cards don't match, both flip back after brief delay
   - Cannot flip already matched cards
   - Cannot flip same card twice in one turn

3. **Matching Rules**
   - Cards match if they have identical symbol/value
   - Match must be validated immediately after second flip
   - Matched pairs contribute to player's score
   - Matched cards remain face-up for rest of game

4. **Scoring Rules**
   - Each match worth 10 points
   - Bonus points for consecutive matches (combo multiplier)
   - Time bonus in single-player mode (faster = higher score)
   - Accuracy bonus for high match rate (matches/total_moves)
   - Efficiency rating: (matches × 2) / total_moves × 100

5. **Victory Conditions**
   - Game ends when all pairs are matched
   - In multiplayer, player with most matches wins
   - In single-player, compare time/moves to high score
   - Tie-breaker: fewer moves wins

## Extension Points

1. **Themes**: Add card themes (animals, fruits, colors, custom images)
2. **Power-Ups**: Peek at random card, reveal all briefly, extra flip
3. **Challenges**: Time limits, move limits, memory tests
4. **Multiplayer Online**: Network play with turn synchronization
5. **Leaderboards**: Global/local high score tracking
6. **Achievements**: Unlock badges for milestones
7. **Custom Boards**: Non-rectangular layouts, obstacles
8. **Sound Effects**: Audio feedback for flips, matches, wins

## Time Complexity

- **Card Shuffle**: O(n) where n is number of cards
- **Card Flip**: O(1) - Direct position access
- **Match Check**: O(1) - Compare two card symbols
- **Board Display**: O(r×c) where r is rows, c is columns
- **Game Complete Check**: O(n) - Check all cards matched
- **Get Winner**: O(p) where p is number of players

## Space Complexity

- O(r×c) for board grid where r and c are dimensions
- O(n) for card list where n is total cards
- O(t) for turn history where t is number of turns
- O(p) for player list where p is number of players
- O(1) for game state and current player tracking
