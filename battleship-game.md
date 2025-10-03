# Battleship Game

## 🔗 Implementation Links

- **Python Implementation**: [python/battleship-game/main.py](python/battleship-game/main.py)
- **JavaScript Implementation**: [javascript/battleship-game/main.js](javascript/battleship-game/main.js)

## Problem Statement

Design a Battleship naval strategy game system that can:

1. **Manage game boards** with 10×10 grids for ship placement and attack tracking
2. **Handle ship placement** for 5 different ship types with orientation validation
3. **Process attacks** with hit/miss detection and ship sinking logic
4. **Implement AI opponent** with multiple difficulty levels and targeting strategies
5. **Track game state** including ship health, attack history, and turn management
6. **Detect victory conditions** when all enemy ships are sunk
7. **Support game modes** including Human vs Human and Human vs AI

## Requirements

### Functional Requirements

- Initialize two 10×10 game boards (one per player) with coordinate system (A-J, 1-10)
- Support 5 ship types: Carrier (5 cells), Battleship (4 cells), Cruiser (3 cells), Submarine (3 cells), Destroyer (2 cells)
- Allow ship placement with horizontal or vertical orientation
- Validate ship placement (within bounds, no overlaps, no adjacency violations)
- Process attack coordinates returning hit, miss, or sunk results
- Track all attack attempts with hit/miss markers
- Implement turn-based gameplay alternating between players
- Detect when all ships of a player are sunk (game over)
- Support AI opponent with Easy, Medium, and Hard difficulty levels
- Allow game restart with new ship positions

### Non-Functional Requirements

- Attack validation should execute in O(1) time
- Ship placement validation should execute in O(n) where n is ship length
- Support board sizes from 8×8 to 15×15 (configurable)
- AI response time should be < 100ms for any difficulty
- Clear visual display of both player and opponent boards
- Extensible for network multiplayer

## Design Decisions

### Key Classes

1. **Board Management**
   - `Board`: 10×10 grid managing cell states and ship positions
   - `Cell`: Individual grid cell with state (empty, ship, hit, miss)
   - `Coordinate`: Position on board (row, column) with validation

2. **Ship System**
   - `Ship`: Base ship class with size, health, and position
   - `ShipType`: Enum for ship types (Carrier, Battleship, Cruiser, Submarine, Destroyer)
   - `Fleet`: Collection of all player ships with fleet health tracking

3. **Attack System**
   - `Attack`: Represents attack with coordinate and result
   - `AttackResult`: Enum for results (Miss, Hit, Sunk)
   - `AttackHistory`: Tracks all attacks made by player

4. **AI System**
   - `AIStrategy`: Abstract strategy for AI targeting
   - `RandomAI`: Easy difficulty with random targeting
   - `HuntTargetAI`: Medium difficulty with hunt/target mode
   - `ProbabilityAI`: Hard difficulty with probability density analysis

5. **Game Management**
   - `Player`: Represents player with board, fleet, and attack history
   - `Game`: Main controller managing turns and victory conditions
   - `GameState`: Enum for game states (Setup, Playing, Finished)

### Design Patterns Used

1. **Strategy Pattern**: Different AI difficulty levels with pluggable targeting strategies
2. **State Pattern**: Game state management (Setup → Playing → Finished)
3. **Observer Pattern**: Game event notifications (hit, sunk, game over)
4. **Command Pattern**: Attack actions with validation and result tracking
5. **Factory Pattern**: Ship creation with proper configuration
6. **Composite Pattern**: Fleet as composite of ships

### Key Features

- **Hunt/Target AI**: Switches between random hunting and targeted destruction
- **Probability-Based AI**: Calculates ship placement likelihood for each cell
- **Attack History**: Complete tracking of all attacks with visual display
- **Ship Health**: Individual ship damage tracking
- **Fleet Status**: Real-time fleet health monitoring

## State Diagram

```text
SETUP
  ↓ (place_all_ships)
PLAYING
  ├─→ (make_attack) → [process_result]
  │                      ├─→ MISS → PLAYING (next_player)
  │                      ├─→ HIT → PLAYING (same_player continues)
  │                      └─→ SUNK → [check_victory]
  │                                   ├─→ ALL_SUNK → FINISHED
  │                                   └─→ CONTINUE → PLAYING
  └─→ (forfeit) → FINISHED
FINISHED
  ↓ (restart)
SETUP
```

## Class Diagram

```text
ShipType (Enum)
├── CARRIER (size: 5)
├── BATTLESHIP (size: 4)
├── CRUISER (size: 3)
├── SUBMARINE (size: 3)
└── DESTROYER (size: 2)

Orientation (Enum)
├── HORIZONTAL
└── VERTICAL

CellState (Enum)
├── EMPTY
├── SHIP
├── HIT
└── MISS

AttackResult (Enum)
├── MISS
├── HIT
└── SUNK

Coordinate
├── row: int
├── col: int
├── to_string() → str (e.g., "A5")
└── from_string(str) → Coordinate

Cell
├── state: CellState
├── ship: Optional[Ship]
├── is_occupied() → bool
└── mark_hit() → bool

Ship
├── type: ShipType
├── size: int
├── position: List[Coordinate]
├── hits: Set[Coordinate]
├── orientation: Orientation
├── health: int
├── is_sunk() → bool
├── receive_hit(coord) → bool
└── get_coordinates() → List[Coordinate]

Fleet
├── ships: List[Ship]
├── add_ship(ship) → None
├── get_ship_at(coord) → Optional[Ship]
├── is_defeated() → bool
└── get_remaining_ships() → int

Board
├── size: int (default 10)
├── grid: List[List[Cell]]
├── fleet: Fleet
├── place_ship(ship, start, orientation) → bool
├── receive_attack(coord) → AttackResult
├── is_valid_placement(ship, start, orientation) → bool
├── get_cell(coord) → Cell
└── display(show_ships) → None

Attack
├── coordinate: Coordinate
├── result: AttackResult
├── ship_sunk: Optional[Ship]
└── timestamp: datetime

AttackHistory
├── attacks: List[Attack]
├── add_attack(attack) → None
├── has_attacked(coord) → bool
└── get_hit_rate() → float

AIStrategy (Abstract)
└── get_next_target(board, history) → Coordinate

RandomAI extends AIStrategy
└── get_next_target() → random valid coordinate

HuntTargetAI extends AIStrategy
├── mode: HuntMode (Hunt, Target)
├── targets: List[Coordinate]
└── get_next_target() → smart coordinate

ProbabilityAI extends AIStrategy
├── probability_map: Dict[Coordinate, float]
└── get_next_target() → highest probability coordinate

Player
├── name: str
├── board: Board
├── attack_history: AttackHistory
├── is_ai: bool
├── ai_strategy: Optional[AIStrategy]
└── get_attack() → Coordinate

Game
├── player1: Player
├── player2: Player
├── current_player_idx: int
├── state: GameState
├── start_game() → None
├── place_ships_phase() → None
├── play_turn() → None
└── check_victory() → Optional[Player]
```

## Usage Example

```python
# Create game with AI opponent
game = BattleshipGame(
    player1_name="Alice",
    player2_name="Computer",
    player2_ai=True,
    ai_difficulty=Difficulty.MEDIUM
)

# Setup phase - place ships
game.player1.board.place_ship(
    Ship(ShipType.CARRIER),
    Coordinate(0, 0),
    Orientation.HORIZONTAL
)

# Auto-place remaining ships
game.player1.board.auto_place_remaining_ships()
game.player2.board.auto_place_remaining_ships()

# Start game
game.start_game()

# Play turn
while not game.is_game_over():
    current_player = game.get_current_player()
    opponent = game.get_opponent()
    
    # Get attack coordinate
    if current_player.is_ai:
        coord = current_player.ai_strategy.get_next_target(
            opponent.board,
            current_player.attack_history
        )
    else:
        coord = get_user_input()
    
    # Make attack
    result = opponent.board.receive_attack(coord)
    current_player.attack_history.add_attack(Attack(coord, result))
    
    # Display result
    print(f"Attack {coord}: {result.name}")
    
    # Check victory
    if game.check_victory():
        winner = game.get_winner()
        print(f"{winner.name} wins!")
        break
    
    # Next turn
    game.next_turn()
```

## Business Rules

1. **Ship Placement Rules**
   - 5 ships must be placed: Carrier (5), Battleship (4), Cruiser (3), Submarine (3), Destroyer (2)
   - Ships can be placed horizontally or vertically only (no diagonal)
   - Ships must be completely within board boundaries
   - Ships cannot overlap with other ships
   - Ships cannot be adjacent to other ships (optional rule, configurable)
   - Once game starts, ship positions are locked

2. **Attack Rules**
   - Players alternate turns attacking opponent's board
   - Each turn allows one attack attempt
   - Cannot attack same coordinate twice
   - Hit allows another turn (optional rule, configurable)
   - Must announce "Hit", "Miss", or "Sunk" after each attack
   - All coordinates must be within board boundaries

3. **Ship Sinking Rules**
   - Ship is sunk when all its cells are hit
   - When ship is sunk, opponent must be notified
   - Sunk ship type must be revealed
   - Sunk ships no longer count for targeting

4. **Victory Conditions**
   - Player wins when all opponent ships are sunk
   - Player loses when all their ships are sunk
   - Game can end in forfeit (player quits)

5. **AI Behavior Rules**
   - Easy AI: Random targeting with no memory
   - Medium AI: Hunt/Target mode (random until hit, then adjacent cells)
   - Hard AI: Probability density calculation for optimal targeting
   - AI must follow same rules as human players

## Extension Points

1. **Special Weapons**: Add torpedoes, air strikes, sonar scans
2. **Larger Boards**: Support 15×15 or 20×20 boards
3. **More Ships**: Add submarines, destroyers, or custom ship types
4. **Power-Ups**: Reveal cells, double damage, extra turn
5. **Tournament Mode**: Best of 3 or 5 games
6. **Network Multiplayer**: Online play with matchmaking
7. **Replay System**: Save and replay complete games
8. **Statistics**: Track win rate, average hits to win, accuracy

## Security Considerations

- **Board Hiding**: Ensure opponent's ship positions are hidden
- **Move Validation**: Validate all attacks server-side in multiplayer
- **Anti-Cheating**: Detect impossible shot patterns
- **Fair AI**: Ensure AI doesn't "cheat" by knowing ship positions

## Time Complexity

- **Attack Processing**: O(1) - Direct grid access
- **Ship Placement Validation**: O(n) where n is ship length
- **Victory Check**: O(s) where s is number of ships (typically 5)
- **AI Random**: O(k) where k is remaining valid cells
- **AI Hunt/Target**: O(1) for target selection with cached targets
- **AI Probability**: O(w×h×s) where w×h is board size, s is ships (pre-computed)
- **Board Display**: O(w×h) where w and h are board dimensions

## Space Complexity

- O(w×h) where w and h are board dimensions for grid storage
- O(s×n) where s is number of ships, n is average ship length for fleet
- O(a) where a is number of attacks for attack history
- O(w×h) for AI probability map (Hard difficulty only)
- O(1) for game state and turn tracking
