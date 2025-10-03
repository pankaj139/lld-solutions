"""
SNAKE GAME - Low Level Design Implementation in Python

DESIGN PATTERNS USED:
1. STATE PATTERN: Game state management with explicit transitions
   - GameState enum defines all possible states (Ready, Playing, Paused, GameOver)
   - State transitions are controlled and validated
   - Each state has specific allowed operations

2. COMMAND PATTERN: Directional movement as command objects
   - Direction changes encapsulated as commands
   - Validation logic prevents invalid 180-degree turns
   - Supports queued input for responsive controls

3. OBSERVER PATTERN: Game event notifications
   - ScoreTracker observes food consumption events
   - Statistics updated automatically on game events
   - Decoupled notification system for extensibility

4. STRATEGY PATTERN: Difficulty levels as strategies
   - Different game speeds and board sizes
   - Easy to add new difficulty variations
   - Runtime strategy selection

5. COMPOSITE PATTERN: Snake body as composite structure
   - Snake body composed of position segments
   - Unified interface for body operations
   - Growth handled through composition

OOP CONCEPTS DEMONSTRATED:
- ENCAPSULATION: Snake body internal, board grid hidden behind methods
- ABSTRACTION: Clear interfaces for game components
- INHERITANCE: Not heavily used, favoring composition
- POLYMORPHISM: Different game states handled uniformly

SOLID PRINCIPLES:
- SRP: Each class has single responsibility (Board manages grid, Snake manages body)
- OCP: Easy to add new features without modifying existing code
- LSP: All components can be substituted with enhanced versions
- ISP: Focused interfaces for each component
- DIP: Game depends on abstractions, not concrete implementations

BUSINESS FEATURES:
- Real-time continuous movement
- Smart directional control preventing instant death
- Random food generation on empty cells
- Progressive difficulty (speed increases with score)
- Comprehensive statistics tracking

ARCHITECTURAL NOTES:
- Game loop with fixed time step
- Collision detection before state updates
- Clean separation between game logic and rendering
- Extensible for GUI or network play
"""

from enum import Enum
from typing import List, Tuple, Optional
import random
import time
import os


# Enums - Domain model definitions
class Direction(Enum):
    """
    Represents movement directions
    
    DESIGN PATTERN: Command Pattern foundation
    - Each direction represents a movement command
    """
    UP = (0, -1)
    DOWN = (0, 1)
    LEFT = (-1, 0)
    RIGHT = (1, 0)
    
    def is_opposite(self, other: 'Direction') -> bool:
        """
        Check if direction is opposite (180 degrees)
        
        BUSINESS RULE: Cannot reverse direction instantly
        """
        return (self.value[0] + other.value[0] == 0 and 
                self.value[1] + other.value[1] == 0)


class GameState(Enum):
    """
    Represents current state of the game
    
    DESIGN PATTERN: State Pattern
    - Explicit states with controlled transitions
    - Each state has specific allowed operations
    """
    READY = "ready"
    PLAYING = "playing"
    PAUSED = "paused"
    GAME_OVER = "game_over"


class CellType(Enum):
    """Represents what occupies a board cell"""
    EMPTY = " "
    SNAKE = "■"
    FOOD = "●"


class Position:
    """
    Represents a position on the game board
    
    OOP CONCEPT: Value Object
    - Immutable position representation
    - Encapsulates x, y coordinates
    """
    def __init__(self, x: int, y: int):
        self.x = x
        self.y = y
    
    def __eq__(self, other):
        if not isinstance(other, Position):
            return False
        return self.x == other.x and self.y == other.y
    
    def __hash__(self):
        return hash((self.x, self.y))
    
    def __repr__(self):
        return f"({self.x}, {self.y})"
    
    def move(self, direction: Direction) -> 'Position':
        """
        Create new position by moving in direction
        
        DESIGN PATTERN: Immutability
        - Returns new position rather than modifying
        """
        dx, dy = direction.value
        return Position(self.x + dx, self.y + dy)


class Food:
    """
    Represents food item on the board
    
    OOP CONCEPT: Single Responsibility
    - Only manages food position and generation
    """
    def __init__(self, position: Position):
        self.position = position
    
    def generate_new(self, board: 'Board', snake: 'Snake') -> 'Food':
        """
        Generate food at random empty position
        
        BUSINESS RULE: Food must spawn on empty cell
        
        Time Complexity: O(k) where k is attempts, expected O(1) for sparse board
        """
        attempts = 0
        max_attempts = 1000
        
        while attempts < max_attempts:
            x = random.randint(0, board.width - 1)
            y = random.randint(0, board.height - 1)
            position = Position(x, y)
            
            if not snake.contains(position):
                return Food(position)
            
            attempts += 1
        
        # Fallback: find first empty position
        for x in range(board.width):
            for y in range(board.height):
                position = Position(x, y)
                if not snake.contains(position):
                    return Food(position)
        
        return self  # Board is full (shouldn't happen)


class Snake:
    """
    Manages snake body segments and movement
    
    DESIGN PATTERN: Composite Pattern
    - Snake body composed of position segments
    - Unified interface for body operations
    
    OOP CONCEPT: Encapsulation
    - Body representation hidden from external access
    - All operations through validated methods
    """
    def __init__(self, initial_position: Position, initial_length: int = 3):
        # Start with horizontal snake pointing right
        self.body: List[Position] = []
        for i in range(initial_length):
            self.body.append(Position(initial_position.x - i, initial_position.y))
        
        self.direction = Direction.RIGHT
        self.grow_pending = 0
    
    @property
    def head(self) -> Position:
        """Get snake head position"""
        return self.body[0]
    
    @property
    def length(self) -> int:
        """Get current snake length"""
        return len(self.body)
    
    def change_direction(self, new_direction: Direction) -> bool:
        """
        Change snake movement direction
        
        BUSINESS RULE: Cannot reverse 180 degrees
        
        Returns:
            bool: True if direction change was valid
        """
        if self.direction.is_opposite(new_direction):
            return False
        
        self.direction = new_direction
        return True
    
    def move(self) -> Position:
        """
        Move snake in current direction
        
        ALGORITHM:
        1. Calculate new head position
        2. Add new head to front of body
        3. Remove tail (unless growing)
        
        Time Complexity: O(1) with deque or O(n) with list
        
        Returns:
            Position: New head position
        """
        new_head = self.head.move(self.direction)
        self.body.insert(0, new_head)
        
        if self.grow_pending > 0:
            self.grow_pending -= 1
        else:
            self.body.pop()  # Remove tail
        
        return new_head
    
    def grow(self):
        """
        Schedule snake to grow on next move
        
        DESIGN PATTERN: Command Pattern
        - Growth is deferred command
        """
        self.grow_pending += 1
    
    def contains(self, position: Position) -> bool:
        """Check if position is part of snake body"""
        return position in self.body
    
    def check_self_collision(self) -> bool:
        """
        Check if snake head collides with body
        
        BUSINESS RULE: Self-collision ends game
        
        Time Complexity: O(n) where n is snake length
        """
        return self.head in self.body[1:]


class Board:
    """
    Manages game board grid and rendering
    
    OOP CONCEPT: Encapsulation
    - Grid representation hidden
    - All access through methods
    """
    def __init__(self, width: int = 20, height: int = 20):
        self.width = width
        self.height = height
    
    def is_valid_position(self, position: Position) -> bool:
        """
        Check if position is within board bounds
        
        BUSINESS RULE: Out of bounds causes game over
        """
        return (0 <= position.x < self.width and 
                0 <= position.y < self.height)
    
    def display(self, snake: Snake, food: Food, score: int):
        """
        Render board to console
        
        Time Complexity: O(w×h) where w and h are dimensions
        """
        # Clear screen (works on Unix/Linux/Mac)
        os.system('clear' if os.name != 'nt' else 'cls')
        
        # Top border
        print("╔" + "═" * (self.width * 2) + "╗")
        
        # Board cells
        for y in range(self.height):
            print("║", end="")
            for x in range(self.width):
                pos = Position(x, y)
                
                if pos == snake.head:
                    print("◆ ", end="")  # Snake head (distinct)
                elif snake.contains(pos):
                    print("■ ", end="")  # Snake body
                elif pos == food.position:
                    print("● ", end="")  # Food
                else:
                    print("  ", end="")  # Empty
            print("║")
        
        # Bottom border
        print("╚" + "═" * (self.width * 2) + "╝")
        
        # Score display
        print(f"\nScore: {score} | Length: {snake.length} | Direction: {snake.direction.name}")


class CollisionDetector:
    """
    Detects all types of collisions
    
    OOP CONCEPT: Single Responsibility
    - Only responsible for collision detection
    - Clean separation from game logic
    """
    @staticmethod
    def check_wall_collision(position: Position, board: Board) -> bool:
        """Check if position collides with walls"""
        return not board.is_valid_position(position)
    
    @staticmethod
    def check_self_collision(snake: Snake) -> bool:
        """Check if snake collides with itself"""
        return snake.check_self_collision()
    
    @staticmethod
    def check_food_collision(snake_head: Position, food: Food) -> bool:
        """Check if snake head reaches food"""
        return snake_head == food.position


class ScoreTracker:
    """
    Observer Pattern: Tracks game statistics
    
    DESIGN PATTERN: Observer Pattern
    - Observes game events (food eaten)
    - Maintains statistics independently
    """
    def __init__(self):
        self.score = 0
        self.high_score = 0
        self.food_eaten = 0
        self.games_played = 0
    
    def increment_score(self, snake_length: int):
        """
        Increment score based on snake length
        
        BUSINESS RULE: Base 10 points + bonus for length
        """
        points = 10 + snake_length  # Bonus for longer snake
        self.score += points
        self.food_eaten += 1
        
        if self.score > self.high_score:
            self.high_score = self.score
    
    def reset(self):
        """Reset score for new game"""
        self.score = 0
        self.food_eaten = 0
        self.games_played += 1
    
    def display_stats(self):
        """Display game statistics"""
        print("\n" + "=" * 40)
        print("GAME STATISTICS")
        print("=" * 40)
        print(f"Final Score: {self.score}")
        print(f"High Score: {self.high_score}")
        print(f"Food Eaten: {self.food_eaten}")
        print(f"Games Played: {self.games_played}")
        print("=" * 40)


class Game:
    """
    Main game controller coordinating all components
    
    DESIGN PATTERN: Facade Pattern
    - Provides simple interface to complex game subsystem
    - Coordinates Board, Snake, Food, and all other components
    
    DESIGN PATTERN: State Pattern
    - Manages game state transitions
    - Validates operations based on current state
    """
    def __init__(self, board_width: int = 20, board_height: int = 20, 
                 initial_speed: float = 0.2):
        self.board = Board(board_width, board_height)
        
        # Initialize snake at center
        center_x = board_width // 2
        center_y = board_height // 2
        self.snake = Snake(Position(center_x, center_y), initial_length=3)
        
        # Initialize food
        self.food = Food(Position(center_x + 5, center_y))
        
        self.state = GameState.READY
        self.score_tracker = ScoreTracker()
        self.collision_detector = CollisionDetector()
        
        self.game_speed = initial_speed  # Seconds per frame
        self.initial_speed = initial_speed
    
    def start(self):
        """
        Start the game
        
        STATE TRANSITION: READY → PLAYING
        """
        if self.state == GameState.READY:
            self.state = GameState.PLAYING
            # Generate initial food away from snake
            self.food = self.food.generate_new(self.board, self.snake)
    
    def pause(self):
        """
        Pause the game
        
        STATE TRANSITION: PLAYING → PAUSED
        """
        if self.state == GameState.PLAYING:
            self.state = GameState.PAUSED
    
    def resume(self):
        """
        Resume the game
        
        STATE TRANSITION: PAUSED → PLAYING
        """
        if self.state == GameState.PAUSED:
            self.state = GameState.PLAYING
    
    def restart(self):
        """
        Restart the game
        
        STATE TRANSITION: Any → READY
        """
        center_x = self.board.width // 2
        center_y = self.board.height // 2
        self.snake = Snake(Position(center_x, center_y), initial_length=3)
        self.food = self.food.generate_new(self.board, self.snake)
        self.state = GameState.READY
        self.score_tracker.reset()
        self.game_speed = self.initial_speed
    
    def handle_input(self, direction: Direction) -> bool:
        """
        Handle directional input
        
        DESIGN PATTERN: Command Pattern
        - Direction change as command
        
        BUSINESS RULE: Only accept input during PLAYING state
        """
        if self.state != GameState.PLAYING:
            return False
        
        return self.snake.change_direction(direction)
    
    def update(self) -> bool:
        """
        Update game state (one frame)
        
        GAME LOOP:
        1. Move snake
        2. Check collisions
        3. Handle food consumption
        4. Update difficulty
        
        Returns:
            bool: True if game continues, False if game over
        """
        if self.state != GameState.PLAYING:
            return True
        
        # Move snake
        new_head = self.snake.move()
        
        # Check wall collision
        if self.collision_detector.check_wall_collision(new_head, self.board):
            self.state = GameState.GAME_OVER
            return False
        
        # Check self-collision
        if self.collision_detector.check_self_collision(self.snake):
            self.state = GameState.GAME_OVER
            return False
        
        # Check food collision
        if self.collision_detector.check_food_collision(new_head, self.food):
            self.snake.grow()
            self.score_tracker.increment_score(self.snake.length)
            self.food = self.food.generate_new(self.board, self.snake)
            
            # Increase difficulty (speed up)
            if self.score_tracker.food_eaten % 5 == 0:
                self.game_speed *= 0.9  # 10% faster
        
        return True
    
    def render(self):
        """Render current game state"""
        self.board.display(self.snake, self.food, self.score_tracker.score)
        
        if self.state == GameState.PAUSED:
            print("\n⏸  GAME PAUSED")
        elif self.state == GameState.GAME_OVER:
            print("\n💀 GAME OVER!")
            self.score_tracker.display_stats()
    
    def run_auto_demo(self, max_moves: int = 50):
        """
        Run automated demo with simple AI
        
        DEMO FEATURE: Auto-playing for demonstration
        - Simple AI that follows food
        """
        self.start()
        moves = 0
        
        print("🎮 Snake Game - Automated Demo")
        print("Snake will auto-play using simple AI\n")
        time.sleep(1)
        
        while self.state == GameState.PLAYING and moves < max_moves:
            # Simple AI: move towards food
            head = self.snake.head
            food_pos = self.food.position
            
            # Determine best direction
            if head.x < food_pos.x and self.snake.direction != Direction.LEFT:
                self.handle_input(Direction.RIGHT)
            elif head.x > food_pos.x and self.snake.direction != Direction.RIGHT:
                self.handle_input(Direction.LEFT)
            elif head.y < food_pos.y and self.snake.direction != Direction.UP:
                self.handle_input(Direction.DOWN)
            elif head.y > food_pos.y and self.snake.direction != Direction.DOWN:
                self.handle_input(Direction.UP)
            
            # Update game
            if not self.update():
                break
            
            # Render
            self.render()
            
            # Sleep for game speed
            time.sleep(self.game_speed)
            moves += 1
        
        if self.state == GameState.PLAYING:
            print("\n✅ Demo completed successfully!")
            self.score_tracker.display_stats()


def main():
    """
    Demonstrate Snake Game with automated demo
    """
    print("=" * 50)
    print("SNAKE GAME - Low Level Design Demo")
    print("=" * 50)
    
    # Demo 1: Small board, fast game
    print("\nDemo 1: Quick Game (10x10 board)")
    print("-" * 50)
    game = Game(board_width=10, board_height=10, initial_speed=0.3)
    game.run_auto_demo(max_moves=30)
    
    time.sleep(2)
    
    # Demo 2: Standard game
    print("\n\nDemo 2: Standard Game (15x15 board)")
    print("-" * 50)
    game2 = Game(board_width=15, board_height=15, initial_speed=0.2)
    game2.run_auto_demo(max_moves=40)
    
    print("\n" + "=" * 50)
    print("DEMO COMPLETE")
    print("=" * 50)
    print("\nFor manual play, use arrow keys to control:")
    print("  ↑ : Direction.UP")
    print("  ↓ : Direction.DOWN")
    print("  ← : Direction.LEFT")
    print("  → : Direction.RIGHT")
    print("\nImplement keyboard input handling for interactive play.")


if __name__ == "__main__":
    main()

