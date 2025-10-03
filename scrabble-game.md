# Scrabble Game

## 🔗 Implementation Links

- **Python Implementation**: [python/scrabble-game/main.py](python/scrabble-game/main.py)
- **JavaScript Implementation**: [javascript/scrabble-game/main.js](javascript/scrabble-game/main.js)

## Problem Statement

Design a Scrabble word game system that can:

1. **Manage game board** with 15×15 grid including special squares (double/triple letter and word scores)
2. **Validate words** against a comprehensive dictionary of valid English words
3. **Calculate scores** based on letter values and board multipliers
4. **Handle tile distribution** from a bag of 100 tiles with standard letter frequencies
5. **Support multiple players** with individual tile racks (7 tiles each)
6. **Enforce placement rules** ensuring words connect to existing words and follow directional constraints
7. **Track game state** including scores, remaining tiles, and turn order

## Requirements

### Functional Requirements

- Initialize 15×15 game board with special premium squares
- Create tile bag with 100 tiles following standard Scrabble letter distribution
- Deal 7 tiles to each player at game start and after each turn
- Validate word placement ensuring connection to existing words (except first word on center)
- Verify all formed words exist in dictionary (main word + cross words)
- Calculate score using letter values and square multipliers (double/triple letter/word)
- Award 50-point bonus for using all 7 tiles in one turn ("bingo")
- Allow tile exchange (skip turn to exchange 1-7 tiles)
- Track each player's score and remaining tiles in bag
- Detect game end (bag empty and player has no tiles, or all players pass twice)
- Support 2-4 players

### Non-Functional Requirements

- Word validation should execute in O(log n) or O(1) time using efficient dictionary structure
- Support dictionary with 100,000+ words
- Board display should be clear and easy to read
- Score calculation should be instant (< 1ms)
- Handle concurrent word lookups efficiently
- Extensible for different board sizes and rule variants

## Design Decisions

### Key Classes

1. **Board Management**
   - `Board`: 15×15 grid with special squares and word placement
   - `Square`: Individual board cell with multiplier type
   - `SquareType`: Enum for square types (Normal, DoubleLetter, TripleLetter, DoubleWord, TripleWord, Center)

2. **Tile System**
   - `Tile`: Represents letter tile with value and letter
   - `TileBag`: Manages 100-tile pool with random draw
   - `Rack`: Player's 7-tile hand

3. **Word Validation**
   - `Dictionary`: Stores valid words using Trie or Set for O(1) lookup
   - `WordValidator`: Validates word placement and dictionary existence
   - `WordExtractor`: Finds all words formed by placement

4. **Scoring System**
   - `ScoreCalculator`: Computes scores with multipliers
   - `LetterValues`: Maps letters to point values
   - `ScoreTracker`: Tracks player scores and statistics

5. **Game Management**
   - `Player`: Represents player with rack, score, and name
   - `Game`: Main controller managing turns and game state
   - `Turn`: Represents word placement or tile exchange action

### Design Patterns Used

1. **Strategy Pattern**: Different scoring strategies for variants (standard, double points, etc.)
2. **Factory Pattern**: Tile creation with proper distribution
3. **Observer Pattern**: Score updates and game event notifications
4. **Command Pattern**: Word placement and tile exchange as commands with validation
5. **Chain of Responsibility**: Multi-step word validation (placement rules → dictionary → scoring)
6. **Composite Pattern**: Board composed of squares

### Key Features

- **Premium Squares**: Double/triple letter and word score multipliers
- **Comprehensive Dictionary**: Fast word lookup using Trie or HashSet
- **Cross-Word Validation**: Validates all words formed including perpendicular words
- **Bingo Bonus**: 50 extra points for using all 7 tiles
- **Tile Exchange**: Strategic tile swapping
- **Statistics Tracking**: Words played, highest score, average score

## State Diagram

```text
INITIALIZING
  ↓ (setup_game)
WAITING
  ↓ (start_game, deal_tiles)
PLAYING
  ├─→ (place_word) → [validate]
  │                     ├─→ INVALID → PLAYING (reject)
  │                     └─→ VALID → [calculate_score]
  │                                   ↓ (update_score, draw_tiles)
  │                                 PLAYING
  ├─→ (exchange_tiles) → PLAYING (skip turn)
  ├─→ (pass_turn) → [check_end_condition]
  │                    ├─→ GAME_OVER → FINISHED
  │                    └─→ PLAYING
  └─→ (challenge_word) → [verify]
                           ├─→ VALID → PLAYING
                           └─→ INVALID → PLAYING (revert)
FINISHED
  ↓ (new_game)
INITIALIZING
```

## Class Diagram

```text
SquareType (Enum)
├── NORMAL
├── DOUBLE_LETTER
├── TRIPLE_LETTER
├── DOUBLE_WORD
├── TRIPLE_WORD
└── CENTER

Direction (Enum)
├── HORIZONTAL
└── VERTICAL

Square
├── row: int
├── col: int
├── type: SquareType
├── tile: Optional[Tile]
├── is_occupied() → bool
└── get_multiplier() → Tuple[int, str]

Tile
├── letter: str
├── value: int
├── is_blank: bool
└── __str__() → str

TileBag
├── tiles: List[Tile]
├── remaining_count: int
├── draw() → Optional[Tile]
├── draw_multiple(count) → List[Tile]
└── exchange(tiles) → List[Tile]

Rack
├── tiles: List[Tile] (max 7)
├── add_tile(tile) → bool
├── remove_tile(letter) → Optional[Tile]
├── has_letters(word) → bool
└── __str__() → str

Dictionary
├── words: Set[str] (or Trie)
├── add_word(word) → None
├── is_valid_word(word) → bool
└── load_from_file(filepath) → None

Board
├── grid: List[List[Square]] (15×15)
├── center: Tuple[int, int]
├── place_tile(row, col, tile) → bool
├── get_square(row, col) → Square
├── is_first_move() → bool
├── get_word_at(row, col, direction) → str
└── display() → None

WordPlacement
├── word: str
├── start_row: int
├── start_col: int
├── direction: Direction
├── tiles_used: List[Tuple[int, int, Tile]]
└── score: int

WordValidator
├── validate_placement(board, placement) → Tuple[bool, str]
├── check_connectivity(board, placement) → bool
├── extract_all_words(board, placement) → List[str]
└── validate_dictionary(words, dictionary) → bool

ScoreCalculator
├── calculate_word_score(board, placement) → int
├── apply_multipliers(squares, base_score) → int
└── calculate_bingo_bonus(tiles_used) → int

Player
├── name: str
├── rack: Rack
├── score: int
├── tiles_played: int
└── make_move(board, word, position) → bool

Game
├── board: Board
├── players: List[Player]
├── tile_bag: TileBag
├── dictionary: Dictionary
├── current_player_idx: int
├── consecutive_passes: int
├── start_game() → None
├── place_word(word, row, col, direction) → bool
├── exchange_tiles(tiles) → bool
├── pass_turn() → None
└── is_game_over() → bool
```

## Usage Example

```python
# Create game with 2 players
game = ScrabbleGame(player_names=["Alice", "Bob"])

# Load dictionary
game.dictionary.load_from_file("words.txt")

# Start game
game.start_game()

# Display board and rack
game.board.display()
print(f"Your rack: {game.current_player.rack}")

# Place first word at center
success = game.place_word(
    word="HELLO",
    row=7,
    col=7,
    direction=Direction.HORIZONTAL
)

if success:
    print(f"Score: {game.current_player.score}")

# Next player's turn
game.place_word("WORLD", row=8, col=7, direction=Direction.VERTICAL)

# Exchange tiles
game.exchange_tiles(["Z", "Q"])

# Check game status
if game.is_game_over():
    winner = game.get_winner()
    print(f"Winner: {winner.name} with {winner.score} points!")
```

## Business Rules

1. **Board Setup Rules**
   - Board is 15×15 grid
   - Center square is marked as starting position (double word score)
   - Premium squares distributed symmetrically:
     - 12 Triple Word Score (corners and mid-sides)
     - 24 Double Letter Score
     - 16 Triple Letter Score
     - 8 Double Word Score
   - Once tile is placed, it cannot be moved

2. **Word Placement Rules**
   - First word must cover center square (H8)
   - All subsequent words must connect to existing tiles
   - Words can be placed horizontally (left-to-right) or vertically (top-to-bottom)
   - All letters must be in straight line
   - Every placement must form at least one valid dictionary word
   - All cross-words formed must also be valid

3. **Scoring Rules**
   - Each letter has point value (A=1, E=1, ... Z=10)
   - Blank tiles are worth 0 points
   - Letter multipliers apply before word multipliers
   - Premium squares only score on first use
   - "Bingo" bonus: 50 points for using all 7 tiles
   - Game ends when:
     - Tile bag is empty and one player uses all tiles, OR
     - All players pass turn twice consecutively

4. **Tile Distribution Rules**
   - Total 100 tiles in standard English Scrabble
   - Letter frequencies: E(12), A(9), I(9), O(8), N(6), R(6), T(6), L(4), S(4), U(4), D(4), G(3), B(2), C(2), M(2), P(2), F(2), H(2), V(2), W(2), Y(2), K(1), J(1), X(1), Q(1), Z(1), Blank(2)
   - Each player maintains rack of 7 tiles
   - After each turn, player draws tiles to refill rack to 7

5. **Turn Rules**
   - Player must either: place word, exchange tiles, or pass
   - Exchanging tiles skips turn and returns tiles to bag
   - Passing twice in a row (by all players) ends game
   - Challenge: opponent can challenge word validity (if invalid, turn reverted and player loses turn)

## Extension Points

1. **Multiple Languages**: Support dictionaries in different languages (French, Spanish, etc.)
2. **AI Opponent**: Implement AI using word-finding algorithms and strategy
3. **Online Multiplayer**: Network play with turn-based synchronization
4. **Word Suggestions**: Hint system showing possible words from current rack
5. **Time Limits**: Chess-clock style time controls per player
6. **Tournament Mode**: Swiss system or round-robin tournaments
7. **Custom Dictionaries**: Allow players to define valid word lists
8. **Replay System**: Save and replay games move-by-move

## Security Considerations

- **Dictionary Integrity**: Protect dictionary from tampering
- **Move Validation**: Validate all moves server-side in multiplayer
- **Anti-Cheating**: Detect impossible words or tile usage
- **Rate Limiting**: Prevent dictionary scraping or abuse

## Time Complexity

- **Word Lookup**: O(1) with HashSet or O(m) with Trie where m is word length
- **Word Placement**: O(k) where k is tiles placed + cross-words formed
- **Score Calculation**: O(n) where n is word length
- **Board Display**: O(225) = O(1) for 15×15 grid
- **Tile Draw**: O(1) for random selection from bag
- **Dictionary Load**: O(w×m) where w is word count, m is average word length

## Space Complexity

- O(225) = O(1) for 15×15 board storage
- O(w×m) for dictionary where w is word count, m is average word length
- O(100) = O(1) for tile bag
- O(p×7) = O(p) where p is number of players for racks
- O(1) for game state and scoring
