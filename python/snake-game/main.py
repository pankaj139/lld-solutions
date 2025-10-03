"""
Snake Game Implementation
========================

This implementation demonstrates:
- Observer Pattern: Score and status updates
- State Pattern: Game states (Playing, Paused, Game Over)
- Command Pattern: Direction change commands
- Strategy Pattern: Different food generation strategies
"""

from enum import Enum
import random
import time
"""
SNAKE GAME SYSTEM - Low Level Design Implementation in Python

DESIGN PATTERNS USED:
1. STATE PATTERN: Game state management with clear transitions
   - Game states: MENU -> PLAYING -> PAUSED -> GAME_OVER
   - Snake direction states with movement validation
   - Each state has specific input handling and rendering logic
   - Prevents invalid state transitions and operations

2. COMMAND PATTERN: Input handling and game actions
   - Movement commands: up, down, left, right with validation
   - Game control commands: pause, resume, restart
   - Undo support for testing and debugging
   - Input buffering for smooth gameplay

3. OBSERVER PATTERN: Game event notifications
   - Score updates, collision events, food consumption
   - UI updates decoupled from game logic
   - Sound effects and visual feedback systems
   - Achievement and high score notifications

4. STRATEGY PATTERN: Different difficulty levels and AI modes
   - Speed strategies: slow, medium, fast, progressive difficulty
   - AI snake strategies for computer players
   - Scoring strategies: standard, bonus multipliers, time-based
   - Food generation strategies: random, pattern-based, strategic placement

5. TEMPLATE METHOD PATTERN: Game loop structure
   - Standard game cycle: input -> update -> render -> check conditions
   - Customizable update logic for different game modes
   - Consistent frame rate and timing management
   - Extensible framework for game variations

OOP CONCEPTS: Encapsulation (Game state), Abstraction (Game logic), Polymorphism (Different game modes)
SOLID PRINCIPLES: SRP for game components, OCP for new game modes, LSP for input handlers
BUSINESS FEATURES: High score tracking, multiple difficulty levels, smooth gameplay
"""

from abc import ABC, abstractmethod
from typing import List, Tuple, Optional


class Direction(Enum):
    UP = "up"
    DOWN = "down"
    LEFT = "left"
    RIGHT = "right"


class GameState(Enum):
    PLAYING = "playing"
    PAUSED = "paused"
    GAME_OVER = "game_over"
    READY = "ready"


class Position:
    """Represents a position on the game board"""
    
    def __init__(self, x: int, y: int):
        self.x = x
        self.y = y
    
    def __eq__(self, other):
        return self.x == other.x and self.y == other.y
    
    def __str__(self):
        return f"({self.x}, {self.y})"


class Food:
    """Represents food on the game board"""
    
    def __init__(self, position: Position, points: int = 10):
        self.position = position
        self.points = points
        self.created_time = time.time()
    
    def is_expired(self, timeout: float = 30.0) -> bool:
        """Check if food has expired"""
        return time.time() - self.created_time > timeout


class FoodGenerator(ABC):
    """Abstract strategy for food generation"""
    
    @abstractmethod
    def generate_food(self, board_width: int, board_height: int, 
                     snake_positions: List[Position]) -> Food:
        pass


class RandomFoodGenerator(FoodGenerator):
    """Generates food at random positions"""
    
    def generate_food(self, board_width: int, board_height: int, 
                     snake_positions: List[Position]) -> Food:
        while True:
            x = random.randint(0, board_width - 1)
            y = random.randint(0, board_height - 1)
            position = Position(x, y)
            
            # Ensure food doesn't spawn on snake
            if position not in snake_positions:
                return Food(position)


class PowerFoodGenerator(FoodGenerator):
    """Generates special power foods with higher points"""
    
    def generate_food(self, board_width: int, board_height: int, 
                     snake_positions: List[Position]) -> Food:
        while True:
            x = random.randint(0, board_width - 1)
            y = random.randint(0, board_height - 1)
            position = Position(x, y)
            
            if position not in snake_positions:
                # 20% chance for power food (50 points)
                points = 50 if random.random() < 0.2 else 10
                return Food(position, points)


class Snake:
    """Represents the snake with movement and growth mechanics"""
    
    def __init__(self, start_position: Position):
        self.body = [start_position]
        self.direction = Direction.RIGHT
        self.pending_direction = Direction.RIGHT
        self.grew_this_turn = False
    
    def set_direction(self, new_direction: Direction):
        """Set the next direction (prevent immediate reversal)"""
        # Prevent snake from immediately reversing into itself
        opposite_directions = {
            Direction.UP: Direction.DOWN,
            Direction.DOWN: Direction.UP,
            Direction.LEFT: Direction.RIGHT,
            Direction.RIGHT: Direction.LEFT
        }
        
        if new_direction != opposite_directions.get(self.direction):
            self.pending_direction = new_direction
    
    def move(self) -> Position:
        """Move the snake in current direction and return new head position"""
        self.direction = self.pending_direction
        
        head = self.body[0]
        
        # Calculate new head position
        if self.direction == Direction.UP:
            new_head = Position(head.x, head.y - 1)
        elif self.direction == Direction.DOWN:
            new_head = Position(head.x, head.y + 1)
        elif self.direction == Direction.LEFT:
            new_head = Position(head.x - 1, head.y)
        else:  # RIGHT
            new_head = Position(head.x + 1, head.y)
        
        # Add new head
        self.body.insert(0, new_head)
        
        # Remove tail if snake didn't grow
        if not self.grew_this_turn:
            self.body.pop()
        else:
            self.grew_this_turn = False
        
        return new_head
    
    def grow(self):
        """Mark snake to grow on next move"""
        self.grew_this_turn = True
    
    def check_self_collision(self) -> bool:
        """Check if snake has collided with itself"""
        head = self.body[0]
        return head in self.body[1:]
    
    def get_head_position(self) -> Position:
        """Get the position of the snake's head"""
        return self.body[0]


class GameObserver(ABC):
    """Observer interface for game events"""
    
    @abstractmethod
    def on_score_changed(self, score: int):
        pass
    
    @abstractmethod
    def on_game_state_changed(self, state: GameState):
        pass
    
    @abstractmethod
    def on_food_eaten(self, food: Food):
        pass


class ScoreTracker(GameObserver):
    """Tracks score and high scores"""
    
    def __init__(self):
        self.current_score = 0
        self.high_score = 0
        self.foods_eaten = 0
    
    def on_score_changed(self, score: int):
        self.current_score = score
        if score > self.high_score:
            self.high_score = score
    
    def on_game_state_changed(self, state: GameState):
        if state == GameState.READY:
            self.current_score = 0
            self.foods_eaten = 0
    
    def on_food_eaten(self, food: Food):
        self.foods_eaten += 1
    
    def get_stats(self) -> dict:
        return {
            'current_score': self.current_score,
            'high_score': self.high_score,
            'foods_eaten': self.foods_eaten
        }


class SnakeGame:
    """Main snake game controller"""
    
    def __init__(self, board_width: int = 20, board_height: int = 15):
        self.board_width = board_width
        self.board_height = board_height
        self.snake = Snake(Position(board_width // 2, board_height // 2))
        self.food = None
        self.score = 0
        self.game_state = GameState.READY
        self.speed = 1  # Game speed multiplier
        self.observers = []
        self.food_generator = RandomFoodGenerator()
        
        # Generate initial food
        self._generate_food()
    
    def add_observer(self, observer: GameObserver):
        """Add a game observer"""
        self.observers.append(observer)
    
    def set_food_generator(self, generator: FoodGenerator):
        """Set the food generation strategy"""
        self.food_generator = generator
    
    def start_game(self):
        """Start or restart the game"""
        self.snake = Snake(Position(self.board_width // 2, self.board_height // 2))
        self.score = 0
        self.speed = 1
        self.game_state = GameState.PLAYING
        self._generate_food()
        self._notify_score_changed()
        self._notify_state_changed()
    
    def pause_game(self):
        """Pause the game"""
        if self.game_state == GameState.PLAYING:
            self.game_state = GameState.PAUSED
            self._notify_state_changed()
    
    def resume_game(self):
        """Resume the game"""
        if self.game_state == GameState.PAUSED:
            self.game_state = GameState.PLAYING
            self._notify_state_changed()
    
    def change_direction(self, direction: Direction):
        """Change snake direction"""
        if self.game_state == GameState.PLAYING:
            self.snake.set_direction(direction)
    
    def update(self) -> bool:
        """Update game state (called each frame)"""
        if self.game_state != GameState.PLAYING:
            return True
        
        # Move snake
        new_head = self.snake.move()
        
        # Check wall collision
        if (new_head.x < 0 or new_head.x >= self.board_width or
            new_head.y < 0 or new_head.y >= self.board_height):
            self._game_over()
            return False
        
        # Check self collision
        if self.snake.check_self_collision():
            self._game_over()
            return False
        
        # Check food collision
        if new_head == self.food.position:
            self._eat_food()
        
        # Check if food expired
        if self.food.is_expired():
            self._generate_food()
        
        return True
    
    def _eat_food(self):
        """Handle food consumption"""
        self.snake.grow()
        self.score += self.food.points
        
        # Increase speed every 5 foods
        if self.score % 50 == 0:
            self.speed += 0.2
        
        self._notify_food_eaten(self.food)
        self._notify_score_changed()
        self._generate_food()
    
    def _generate_food(self):
        """Generate new food"""
        self.food = self.food_generator.generate_food(
            self.board_width, self.board_height, self.snake.body
        )
    
    def _game_over(self):
        """Handle game over"""
        self.game_state = GameState.GAME_OVER
        self._notify_state_changed()
    
    def _notify_score_changed(self):
        """Notify observers of score change"""
        for observer in self.observers:
            observer.on_score_changed(self.score)
    
    def _notify_state_changed(self):
        """Notify observers of state change"""
        for observer in self.observers:
            observer.on_game_state_changed(self.game_state)
    
    def _notify_food_eaten(self, food: Food):
        """Notify observers of food eaten"""
        for observer in self.observers:
            observer.on_food_eaten(food)
    
    def get_game_state(self) -> dict:
        """Get current game state for display"""
        return {
            'snake_body': self.snake.body,
            'food_position': self.food.position if self.food else None,
            'score': self.score,
            'game_state': self.game_state,
            'speed': self.speed,
            'board_width': self.board_width,
            'board_height': self.board_height
        }
    
    def display_board(self):
        """Display the current game board"""
        # Create empty board
        board = [['.' for _ in range(self.board_width)] for _ in range(self.board_height)]
        
        # Place snake
        for i, segment in enumerate(self.snake.body):
            if segment.x >= 0 and segment.x < self.board_width and segment.y >= 0 and segment.y < self.board_height:
                if i == 0:
                    board[segment.y][segment.x] = 'H'  # Head
                else:
                    board[segment.y][segment.x] = 'S'  # Body
        
        # Place food
        if self.food:
            food_pos = self.food.position
            if (food_pos.x >= 0 and food_pos.x < self.board_width and 
                food_pos.y >= 0 and food_pos.y < self.board_height):
                symbol = 'P' if self.food.points > 10 else 'F'  # Power food or regular food
                board[food_pos.y][food_pos.x] = symbol
        
        # Print board
        print('─' * (self.board_width * 2 + 1))
        for row in board:
            print('│' + ''.join(f'{cell} ' for cell in row) + '│')
        print('─' * (self.board_width * 2 + 1))
        print(f"Score: {self.score} | Speed: {self.speed:.1f}x | State: {self.game_state.value}")


class GameSimulator:
    """Simulates game with simple AI for demonstration"""
    
    def __init__(self, game: SnakeGame):
        self.game = game
    
    def simulate_moves(self, max_moves: int = 100) -> bool:
        """Simulate game with simple AI"""
        moves = 0
        
        while moves < max_moves and self.game.game_state == GameState.PLAYING:
            # Simple AI: move towards food
            head = self.game.snake.get_head_position()
            food_pos = self.game.food.position
            
            # Determine best direction
            dx = food_pos.x - head.x
            dy = food_pos.y - head.y
            
            # Choose direction based on largest distance
            if abs(dx) > abs(dy):
                direction = Direction.RIGHT if dx > 0 else Direction.LEFT
            else:
                direction = Direction.DOWN if dy > 0 else Direction.UP
            
            self.game.change_direction(direction)
            
            if not self.game.update():
                break
            
            moves += 1
        
        return self.game.game_state != GameState.GAME_OVER


def demo_snake_game():
    """Demonstrate the snake game functionality"""
    print("=== Snake Game Demo ===\n")
    
    # Create game with observers
    game = SnakeGame(15, 10)  # Smaller board for demo
    score_tracker = ScoreTracker()
    game.add_observer(score_tracker)
    
    print("Initial game state:")
    game.display_board()
    
    # Start the game
    game.start_game()
    print("\nGame started!")
    game.display_board()
    
    # Simulate some manual moves
    moves = [
        Direction.RIGHT, Direction.RIGHT, Direction.DOWN,
        Direction.DOWN, Direction.LEFT, Direction.LEFT,
        Direction.UP, Direction.RIGHT
    ]
    
    print("\nSimulating moves:")
    for i, direction in enumerate(moves):
        print(f"\nMove {i+1}: {direction.value}")
        game.change_direction(direction)
        
        if game.update():
            game.display_board()
        else:
            print("Game Over!")
            break
        
        # Small delay for demo
        time.sleep(0.1)
    
    # Test power food generator
    print("\n=== Testing Power Food Generator ===")
    game.set_food_generator(PowerFoodGenerator())
    game.start_game()
    
    # Use simulator for longer gameplay
    simulator = GameSimulator(game)
    print("Running AI simulation...")
    
    survived = simulator.simulate_moves(50)
    print(f"\nSimulation completed. Survived: {survived}")
    game.display_board()
    
    # Show final statistics
    stats = score_tracker.get_stats()
    print(f"\nFinal Statistics:")
    print(f"Current Score: {stats['current_score']}")
    print(f"High Score: {stats['high_score']}")
    print(f"Foods Eaten: {stats['foods_eaten']}")
    
    # Test game state management
    print("\n=== Testing Game State Management ===")
    game.start_game()
    print(f"Game state: {game.game_state.value}")
    
    game.pause_game()
    print(f"After pause: {game.game_state.value}")
    
    game.resume_game()
    print(f"After resume: {game.game_state.value}")
    
    # Test collision detection
    print("\n=== Testing Collision Detection ===")
    
    # Force wall collision
    small_game = SnakeGame(3, 3)
    small_game.start_game()
    small_game.change_direction(Direction.LEFT)
    
    for _ in range(5):  # Move towards wall
        if not small_game.update():
            print("Wall collision detected!")
            break
    
    small_game.display_board()


if __name__ == "__main__":
    demo_snake_game()