# Snake Game

## 🔗 Implementation Links

- **Python Implementation**: [python/snake-game/main.py](python/snake-game/main.py)
- **JavaScript Implementation**: [javascript/snake-game/main.js](javascript/snake-game/main.js)

## Problem Statement

Design a classic Snake game system that can:

1. **Control snake movement** in four directions (up, down, left, right) with smooth directional changes
2. **Generate food items** at random positions for the snake to consume
3. **Handle collision detection** for walls, self-collision, and food consumption
4. **Implement growth mechanics** where snake extends upon eating food
5. **Track scoring system** with increasing difficulty as score rises
6. **Support multiple difficulty levels** with varying speeds and challenges
7. **Provide game state management** including pause, resume, and restart functionality

## Requirements

### Functional Requirements

- Initialize game board with configurable dimensions (default 20x20)
- Spawn snake at center with initial length of 3 segments
- Generate food at random empty positions on the board
- Accept directional input to control snake movement (cannot reverse 180 degrees)
- Move snake continuously in current direction at fixed intervals
- Detect food consumption and grow snake by one segment
- Detect collision with walls resulting in game over
- Detect self-collision (snake head hitting body) resulting in game over
- Track and display current score (incrementing with each food eaten)
- Support pause and resume functionality during gameplay
- Allow game restart after game over

### Non-Functional Requirements

- Game loop should run at configurable frame rate (10-30 FPS)
- Movement should feel smooth and responsive to user input
- Food generation must be random but fair (always on empty cells)
- Score calculation should be instant (< 1ms)
- Support board sizes from 10x10 to 50x50 without performance degradation
- Console-based visualization with clear board rendering

## Design Decisions

### Key Classes

1. **Game Core**
   - `Game`: Main game controller managing game loop and state transitions
   - `Board`: Represents the game grid and manages cell states
   - `GameState`: Enum representing current game state (Ready, Playing, Paused, GameOver)

2. **Snake Management**
   - `Snake`: Manages snake body segments, movement, and growth
   - `Position`: Represents x, y coordinates on the board
   - `Direction`: Enum for movement directions (Up, Down, Left, Right)

3. **Game Elements**
   - `Food`: Represents food items on the board with position
   - `Cell`: Represents individual board cell (Empty, Snake, Food)

4. **Controllers**
   - `MovementController`: Handles directional commands and validates moves
   - `CollisionDetector`: Checks for all collision types
   - `ScoreTracker`: Manages scoring and statistics

### Design Patterns Used

1. **State Pattern**: Game state management with explicit state transitions (Ready → Playing → Paused → GameOver)
2. **Command Pattern**: Directional movement as command objects with validation and execution
3. **Observer Pattern**: Game events (food eaten, collision, score change) notify observers
4. **Strategy Pattern**: Different difficulty levels implemented as speed and board size strategies
5. **Composite Pattern**: Snake body as composite of position segments with unified interface

### Key Features

- **Real-time Movement**: Continuous snake movement with configurable speed
- **Smart Direction Control**: Prevents invalid 180-degree turns that would cause instant death
- **Intelligent Food Generation**: Random placement ensuring no overlap with snake body
- **Progressive Difficulty**: Game speed increases as score rises
- **Comprehensive Statistics**: Track high scores, games played, and total food eaten

## State Diagram

```text
READY
  ↓ (start_game)
PLAYING
  ├─→ (pause) → PAUSED
  │              ↓ (resume)
  │          PLAYING
  ├─→ (collision) → GAME_OVER
  │                     ↓ (restart)
  │                  READY
  └─→ (eat_food) → [grow_snake, update_score] → PLAYING
```

## Class Diagram

```text
Direction (Enum)
├── UP
├── DOWN
├── LEFT
└── RIGHT

GameState (Enum)
├── READY
├── PLAYING
├── PAUSED
└── GAME_OVER

Position
├── x: int
├── y: int
└── equals(other) → bool

Food
├── position: Position
└── generate_new(board) → Position

Snake
├── body: List[Position]
├── direction: Direction
├── length: int
├── move() → Position (new head position)
├── grow() → None
├── change_direction(new_direction) → bool
├── check_self_collision() → bool
└── contains(position) → bool

Board
├── width: int
├── height: int
├── grid: 2D array
├── is_valid_position(position) → bool
├── is_empty(position) → bool
└── display() → None

CollisionDetector
├── check_wall_collision(position, board) → bool
├── check_self_collision(snake) → bool
└── check_food_collision(snake_head, food) → bool

MovementController
├── current_direction: Direction
├── validate_direction(new_direction) → bool
└── get_next_position(head, direction) → Position

ScoreTracker (Observer)
├── score: int
├── high_score: int
├── food_eaten: int
├── increment_score(points) → None
└── reset() → None

Game
├── board: Board
├── snake: Snake
├── food: Food
├── state: GameState
├── score_tracker: ScoreTracker
├── collision_detector: CollisionDetector
├── movement_controller: MovementController
├── game_speed: float
├── start() → None
├── pause() → None
├── resume() → None
├── restart() → None
├── update() → None (game loop tick)
└── handle_input(direction) → None
```

## Usage Example

```python
# Create game with default settings
game = Game(board_width=20, board_height=20, initial_speed=10)

# Start the game
game.start()

# In game loop
while game.state != GameState.GAME_OVER:
    # Handle user input
    direction = get_user_input()  # Up, Down, Left, Right
    game.handle_input(direction)
    
    # Update game state
    game.update()
    
    # Render board
    game.board.display()
    
    # Show score
    print(f"Score: {game.score_tracker.score}")

# Game over
print(f"Final Score: {game.score_tracker.score}")
print(f"High Score: {game.score_tracker.high_score}")

# Restart for another round
game.restart()
```

## Business Rules

1. **Movement Rules**
   - Snake moves continuously in the current direction
   - Direction can only change to perpendicular directions (no 180-degree turns)
   - Movement speed increases by 10% for every 5 food items eaten
   - Snake cannot stop moving once game starts

2. **Food Rules**
   - Only one food item exists on board at any time
   - New food spawns immediately after previous is consumed
   - Food position is random but must be on empty cell
   - Each food consumed increases score by 10 points
   - Each food consumed grows snake by 1 segment

3. **Collision Rules**
   - Hitting any wall immediately ends the game
   - Snake head touching any body segment immediately ends the game
   - Food is consumed when snake head position equals food position
   - All collisions are checked before rendering new frame

4. **Scoring Rules**
   - Base score: 10 points per food item
   - Bonus points: +1 for each segment length when food is eaten
   - High score persists across game sessions
   - Score resets to 0 on game restart

5. **Game State Rules**
   - Game can only be paused during PLAYING state
   - Resume only works from PAUSED state
   - Restart is allowed from any state
   - Direction changes only accepted during PLAYING state

## Extension Points

1. **Power-Ups**: Add special food items with temporary effects (speed boost, invincibility, score multiplier)
2. **Obstacles**: Add static walls or moving obstacles on the board
3. **Multiplayer Mode**: Two snakes competing on same board
4. **AI Mode**: Auto-playing snake using pathfinding algorithms (A*, BFS)
5. **Progressive Levels**: Multiple levels with different board layouts
6. **Custom Themes**: Different visual themes and color schemes
7. **Leaderboard**: Persistent high score tracking with player names
8. **Sound Effects**: Audio feedback for food consumption and collisions

## Time Complexity

- **Snake Movement**: O(1) - Update head position and remove tail
- **Growth Operation**: O(1) - Add new segment, don't remove tail
- **Collision Detection**: O(n) where n is snake length - Check each body segment
- **Food Generation**: O(k) where k is attempts to find empty cell - Expected O(1) for sparse board
- **Board Rendering**: O(w×h) where w and h are board dimensions - Iterate all cells
- **Direction Validation**: O(1) - Simple comparison against current direction

## Space Complexity

- O(w×h) where w and h are board dimensions for grid storage
- O(n) where n is snake length for body segment storage
- O(1) for game state, score, and direction tracking
- O(1) for food position storage
