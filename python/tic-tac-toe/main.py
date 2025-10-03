"""
TIC-TAC-TOE GAME - Low Level Design Implementation in Python

DESIGN PATTERNS USED:
1. STRATEGY PATTERN: AI difficulty levels as pluggable strategies
   - AIStrategy interface with Easy, Medium, Hard implementations
   - Allows runtime switching of AI behavior without changing game logic
   - Easy to add new AI algorithms without modifying existing code

2. STATE PATTERN: Game state management with explicit transitions
   - GameState enum defines all possible states (Waiting, InProgress, Finished)
   - State transitions are controlled and validated
   - Each state has specific allowed operations

3. TEMPLATE METHOD PATTERN: Common game flow structure
   - Game.play() defines the skeleton of game algorithm
   - Player.get_move() allows subclasses to customize move selection
   - Consistent game flow across different player types

4. COMMAND PATTERN: Move operations with undo/redo capability
   - Move class encapsulates all information needed to execute and undo
   - Move history maintained as command stack
   - Supports undo functionality for practice mode

5. OBSERVER PATTERN: Game event notifications
   - Statistics observer tracks game outcomes
   - Easy to add UI observers for visual updates
   - Decoupled notification system

OOP CONCEPTS DEMONSTRATED:
- ENCAPSULATION: Board state hidden behind methods, validation logic internal
- ABSTRACTION: Player and AIStrategy abstract base classes define contracts
- INHERITANCE: HumanPlayer and AIPlayer inherit from Player base class
- POLYMORPHISM: Different player types and AI strategies used uniformly

SOLID PRINCIPLES:
- SRP: Each class has single responsibility (Board manages grid, Game manages flow)
- OCP: Easy to add new AI strategies without modifying existing game logic
- LSP: All Player subtypes can be used interchangeably
- ISP: Focused interfaces for Player and AIStrategy
- DIP: Game depends on Player abstraction, not concrete player types

BUSINESS FEATURES:
- Multiple game modes (Human vs Human, Human vs AI)
- Three AI difficulty levels with distinct strategies
- Win/draw detection with immediate game termination
- Move history tracking with undo functionality
- Comprehensive statistics for player performance

ARCHITECTURAL NOTES:
- Clean separation between game logic and player input
- Extensible AI system using strategy pattern
- Efficient win detection using smart checking algorithm
- Console-based interface with clear board visualization
"""

from abc import ABC, abstractmethod
from enum import Enum
from typing import List, Optional, Tuple
import random


# Enums - Domain model definitions
class GameState(Enum):
    """
    Represents the current state of the game
    
    DESIGN PATTERN: State Pattern
    - Explicit states prevent invalid operations
    - Clear state transitions
    """
    WAITING = "waiting"
    IN_PROGRESS = "in_progress"
    FINISHED = "finished"


class Mark(Enum):
    """Represents the marks on the board"""
    X = "X"
    O = "O"
    EMPTY = " "


# Position and Move classes
class Position:
    """
    Represents a position on the game board
    
    OOP CONCEPT: Encapsulation
    - Combines row and column into single entity
    - Validation logic encapsulated
    """
    def __init__(self, row: int, col: int):
        self.row = row
        self.col = col
    
    def __eq__(self, other):
        return self.row == other.row and self.col == other.col
    
    def __repr__(self):
        return f"({self.row}, {self.col})"


class Move:
    """
    Command Pattern: Encapsulates move information for undo/redo
    
    DESIGN PATTERN: Command Pattern
    - Stores all information needed to execute and undo move
    - Enables move history and replay functionality
    """
    def __init__(self, position: Position, mark: str):
        self.position = position
        self.mark = mark
    
    def __repr__(self):
        return f"Move({self.mark} at {self.position})"


class Board:
    """
    Manages the game board state and operations
    
    DESIGN PATTERN: Encapsulation
    - Internal grid representation hidden
    - All board operations go through validated methods
    
    OOP CONCEPT: Single Responsibility
    - Only responsible for board state management
    - Does not handle game flow or player logic
    """
    def __init__(self, size: int = 3):
        self.size = size
        self.grid = [[Mark.EMPTY.value for _ in range(size)] for _ in range(size)]
        self.move_count = 0
    
    def make_move(self, position: Position, mark: str) -> bool:
        """
        Place a mark on the board at specified position
        
        BUSINESS RULE: Moves only allowed on empty cells
        
        Returns:
            bool: True if move was successful, False otherwise
        """
        if not self.is_valid_move(position):
            return False
        
        self.grid[position.row][position.col] = mark
        self.move_count += 1
        return True
    
    def undo_move(self, position: Position):
        """
        Remove a mark from the board
        
        DESIGN PATTERN: Command Pattern support
        - Enables undo functionality
        """
        self.grid[position.row][position.col] = Mark.EMPTY.value
        self.move_count -= 1
    
    def is_valid_move(self, position: Position) -> bool:
        """
        Validate if a move can be made at given position
        
        BUSINESS RULE: Position must be in bounds and cell must be empty
        """
        if not (0 <= position.row < self.size and 0 <= position.col < self.size):
            return False
        return self.grid[position.row][position.col] == Mark.EMPTY.value
    
    def check_win(self, mark: str) -> bool:
        """
        Check if specified mark has won the game
        
        ALGORITHM: Check all possible win conditions
        - Rows, columns, and diagonals
        
        Time Complexity: O(n) where n is board size
        """
        # Check rows
        for row in self.grid:
            if all(cell == mark for cell in row):
                return True
        
        # Check columns
        for col in range(self.size):
            if all(self.grid[row][col] == mark for row in range(self.size)):
                return True
        
        # Check main diagonal
        if all(self.grid[i][i] == mark for i in range(self.size)):
            return True
        
        # Check anti-diagonal
        if all(self.grid[i][self.size - 1 - i] == mark for i in range(self.size)):
            return True
        
        return False
    
    def is_full(self) -> bool:
        """
        Check if board is completely filled
        
        BUSINESS RULE: Draw condition when board is full with no winner
        """
        return self.move_count == self.size * self.size
    
    def get_empty_positions(self) -> List[Position]:
        """
        Get list of all empty positions on the board
        
        Used by AI to determine valid moves
        """
        empty_positions = []
        for row in range(self.size):
            for col in range(self.size):
                if self.grid[row][col] == Mark.EMPTY.value:
                    empty_positions.append(Position(row, col))
        return empty_positions
    
    def display(self):
        """Display the current board state in console"""
        print("\n  " + " | ".join(str(i) for i in range(self.size)))
        print("  " + "---" * self.size)
        for i, row in enumerate(self.grid):
            print(f"{i} " + " | ".join(row))
            if i < self.size - 1:
                print("  " + "---" * self.size)
        print()


class Player(ABC):
    """
    Abstract base class for all player types
    
    DESIGN PATTERN: Template Method Pattern
    - Defines interface for player behavior
    - Subclasses implement specific move selection logic
    
    OOP CONCEPT: Abstraction
    - Defines contract that all players must follow
    - Allows polymorphic player usage
    """
    def __init__(self, name: str, mark: str):
        self.name = name
        self.mark = mark
    
    @abstractmethod
    def get_move(self, board: Board) -> Position:
        """Get next move from player - to be implemented by subclasses"""
        pass


class HumanPlayer(Player):
    """
    Human player that gets moves from console input
    
    OOP CONCEPT: Inheritance and Polymorphism
    - Inherits from Player base class
    - Provides human-specific move selection
    """
    def get_move(self, board: Board) -> Position:
        """
        Get move from human player via console input
        
        BUSINESS RULE: Keep asking until valid position is provided
        """
        while True:
            try:
                row = int(input(f"{self.name} ({self.mark}), enter row (0-{board.size-1}): "))
                col = int(input(f"{self.name} ({self.mark}), enter col (0-{board.size-1}): "))
                position = Position(row, col)
                
                if board.is_valid_move(position):
                    return position
                else:
                    print("Invalid move! Cell is occupied or out of bounds. Try again.")
            except ValueError:
                print("Invalid input! Please enter numbers.")
            except KeyboardInterrupt:
                print("\nGame interrupted!")
                exit(0)


class AIStrategy(ABC):
    """
    Strategy Pattern: Abstract interface for AI algorithms
    
    DESIGN PATTERN: Strategy Pattern
    - Defines interface for different AI behaviors
    - Allows runtime switching of AI strategies
    """
    @abstractmethod
    def calculate_move(self, board: Board, mark: str) -> Position:
        """Calculate best move for AI - implemented by strategy subclasses"""
        pass


class EasyAI(AIStrategy):
    """
    Easy AI: Makes random moves
    
    DESIGN PATTERN: Strategy Pattern implementation
    - Simplest strategy for beginner-level play
    """
    def calculate_move(self, board: Board, mark: str) -> Position:
        """
        Random move selection from available positions
        
        Time Complexity: O(k) where k is number of empty cells
        """
        empty_positions = board.get_empty_positions()
        return random.choice(empty_positions) if empty_positions else None


class MediumAI(AIStrategy):
    """
    Medium AI: Uses basic heuristics
    
    DESIGN PATTERN: Strategy Pattern implementation
    - Checks for immediate wins and blocks opponent wins
    """
    def calculate_move(self, board: Board, mark: str) -> Position:
        """
        Heuristic-based move selection
        
        Strategy:
        1. Check if AI can win in next move
        2. Check if opponent can win, block them
        3. Take center if available
        4. Take corner if available
        5. Take any edge
        """
        empty_positions = board.get_empty_positions()
        if not empty_positions:
            return None
        
        # Get opponent mark
        opponent_mark = Mark.O.value if mark == Mark.X.value else Mark.X.value
        
        # Check for winning move
        for pos in empty_positions:
            board.make_move(pos, mark)
            if board.check_win(mark):
                board.undo_move(pos)
                return pos
            board.undo_move(pos)
        
        # Block opponent's winning move
        for pos in empty_positions:
            board.make_move(pos, opponent_mark)
            if board.check_win(opponent_mark):
                board.undo_move(pos)
                return pos
            board.undo_move(pos)
        
        # Take center if available
        center = Position(board.size // 2, board.size // 2)
        if center in empty_positions:
            return center
        
        # Take corners
        corners = [Position(0, 0), Position(0, board.size-1), 
                  Position(board.size-1, 0), Position(board.size-1, board.size-1)]
        available_corners = [c for c in corners if c in empty_positions]
        if available_corners:
            return random.choice(available_corners)
        
        # Take any remaining position
        return random.choice(empty_positions)


class HardAI(AIStrategy):
    """
    Hard AI: Uses Minimax algorithm for perfect play
    
    DESIGN PATTERN: Strategy Pattern implementation
    - Unbeatable AI using game theory
    """
    def calculate_move(self, board: Board, mark: str) -> Position:
        """
        Minimax algorithm with alpha-beta pruning
        
        ALGORITHM: Minimax Decision Tree
        - Explores all possible game outcomes
        - Chooses move that maximizes AI's chances
        - Alpha-beta pruning for efficiency
        
        Time Complexity: O(b^d) where b is branching factor, d is depth
        """
        best_score = float('-inf')
        best_move = None
        opponent_mark = Mark.O.value if mark == Mark.X.value else Mark.X.value
        
        for position in board.get_empty_positions():
            board.make_move(position, mark)
            score = self._minimax(board, 0, False, mark, opponent_mark, float('-inf'), float('inf'))
            board.undo_move(position)
            
            if score > best_score:
                best_score = score
                best_move = position
        
        return best_move
    
    def _minimax(self, board: Board, depth: int, is_maximizing: bool, 
                 ai_mark: str, opponent_mark: str, alpha: float, beta: float) -> int:
        """
        Minimax recursive function with alpha-beta pruning
        
        ALGORITHM: Game Tree Search
        - Recursively evaluates all possible game states
        - Alpha-beta pruning eliminates unnecessary branches
        """
        # Terminal conditions
        if board.check_win(ai_mark):
            return 10 - depth  # Prefer faster wins
        if board.check_win(opponent_mark):
            return depth - 10  # Prefer slower losses
        if board.is_full():
            return 0  # Draw
        
        if is_maximizing:
            max_score = float('-inf')
            for position in board.get_empty_positions():
                board.make_move(position, ai_mark)
                score = self._minimax(board, depth + 1, False, ai_mark, opponent_mark, alpha, beta)
                board.undo_move(position)
                max_score = max(score, max_score)
                alpha = max(alpha, score)
                if beta <= alpha:
                    break  # Alpha-beta pruning
            return max_score
        else:
            min_score = float('inf')
            for position in board.get_empty_positions():
                board.make_move(position, opponent_mark)
                score = self._minimax(board, depth + 1, True, ai_mark, opponent_mark, alpha, beta)
                board.undo_move(position)
                min_score = min(score, min_score)
                beta = min(beta, score)
                if beta <= alpha:
                    break  # Alpha-beta pruning
            return min_score


class AIPlayer(Player):
    """
    AI player using pluggable strategy
    
    DESIGN PATTERN: Strategy Pattern usage
    - Delegates move calculation to strategy object
    - Strategy can be changed at runtime
    
    OOP CONCEPT: Composition over Inheritance
    - Uses AIStrategy through composition
    - More flexible than inheritance-based approach
    """
    def __init__(self, name: str, mark: str, strategy: AIStrategy):
        super().__init__(name, mark)
        self.strategy = strategy
    
    def get_move(self, board: Board) -> Position:
        """
        Get move from AI using configured strategy
        
        DESIGN PATTERN: Strategy Pattern in action
        """
        print(f"{self.name} ({self.mark}) is thinking...")
        return self.strategy.calculate_move(board, self.mark)
    
    def set_strategy(self, strategy: AIStrategy):
        """Allow runtime strategy change"""
        self.strategy = strategy


class Statistics:
    """
    Observer Pattern: Tracks game outcomes
    
    DESIGN PATTERN: Observer Pattern
    - Observes game completion events
    - Maintains statistics independently
    """
    def __init__(self):
        self.wins = {}
        self.draws = 0
        self.total_games = 0
    
    def record_win(self, player_name: str):
        """Record a win for specified player"""
        self.wins[player_name] = self.wins.get(player_name, 0) + 1
        self.total_games += 1
    
    def record_draw(self):
        """Record a draw game"""
        self.draws += 1
        self.total_games += 1
    
    def get_wins(self, player_name: str) -> int:
        """Get win count for player"""
        return self.wins.get(player_name, 0)
    
    def get_draws(self) -> int:
        """Get total draw count"""
        return self.draws
    
    def display(self):
        """Display statistics summary"""
        print("\n=== Game Statistics ===")
        print(f"Total games: {self.total_games}")
        for player, wins in self.wins.items():
            print(f"{player}: {wins} wins")
        print(f"Draws: {self.draws}")
        print()


class Game:
    """
    Main game controller coordinating all components
    
    DESIGN PATTERN: Facade Pattern
    - Provides simple interface to complex game subsystem
    - Coordinates between Board, Players, and Statistics
    
    DESIGN PATTERN: State Pattern
    - Manages game state transitions
    - Validates operations based on current state
    """
    def __init__(self, player1: Player, player2: Player, board_size: int = 3):
        self.board = Board(board_size)
        self.players = [player1, player2]
        self.current_player_idx = 0
        self.state = GameState.WAITING
        self.move_history: List[Move] = []
        self.statistics = Statistics()
        self.winner = None
    
    def play(self):
        """
        Template Method Pattern: Defines game flow skeleton
        
        BUSINESS RULES:
        1. Players alternate turns
        2. Game ends on win or draw
        3. Winner announced immediately
        """
        self.state = GameState.IN_PROGRESS
        print("\n=== Tic-Tac-Toe Game Started ===")
        self.board.display()
        
        while self.state == GameState.IN_PROGRESS:
            current_player = self.players[self.current_player_idx]
            
            # Get move from current player
            position = current_player.get_move(self.board)
            
            # Make move
            if self.board.make_move(position, current_player.mark):
                move = Move(position, current_player.mark)
                self.move_history.append(move)
                
                self.board.display()
                
                # Check win condition
                if self.board.check_win(current_player.mark):
                    self.winner = current_player
                    self.state = GameState.FINISHED
                    print(f"🎉 {current_player.name} ({current_player.mark}) wins!")
                    self.statistics.record_win(current_player.name)
                    break
                
                # Check draw condition
                if self.board.is_full():
                    self.state = GameState.FINISHED
                    print("🤝 It's a draw!")
                    self.statistics.record_draw()
                    break
                
                # Switch player
                self.current_player_idx = 1 - self.current_player_idx
            else:
                print("Invalid move! Try again.")
    
    def undo_last_move(self) -> bool:
        """
        Undo the last move made
        
        DESIGN PATTERN: Command Pattern
        - Uses move history to reverse actions
        
        BUSINESS RULE: Can only undo during active game
        """
        if not self.move_history or self.state != GameState.IN_PROGRESS:
            return False
        
        last_move = self.move_history.pop()
        self.board.undo_move(last_move.position)
        self.current_player_idx = 1 - self.current_player_idx
        
        print(f"Undid move: {last_move}")
        return True
    
    def restart(self):
        """Reset game for new round"""
        self.board = Board(self.board.size)
        self.current_player_idx = 0
        self.state = GameState.WAITING
        self.move_history = []
        self.winner = None


def main():
    """
    Demonstrate Tic-Tac-Toe game with different modes
    """
    print("=== Tic-Tac-Toe Game Demo ===\n")
    
    # Demo 1: Human vs Easy AI
    print("Demo 1: Human vs Easy AI")
    print("-" * 40)
    human = HumanPlayer("Alice", Mark.X.value)
    easy_ai = AIPlayer("Easy Bot", Mark.O.value, EasyAI())
    
    # For automated demo, let's use AI vs AI instead
    print("\n(Running AI vs AI for automated demo)\n")
    
    # Demo 2: Medium AI vs Hard AI
    print("Demo 2: Medium AI vs Hard AI")
    print("-" * 40)
    medium_ai = AIPlayer("Medium Bot", Mark.X.value, MediumAI())
    hard_ai = AIPlayer("Hard Bot", Mark.O.value, HardAI())
    
    game = Game(medium_ai, hard_ai)
    game.play()
    
    # Demo 3: Multiple games for statistics
    print("\nDemo 3: Multiple Games for Statistics")
    print("-" * 40)
    for i in range(3):
        print(f"\nGame {i+1}:")
        game.restart()
        game.play()
    
    game.statistics.display()
    
    print("\n=== Demo Complete ===")
    print("\nTo play Human vs AI, create players as:")
    print("human = HumanPlayer('Your Name', 'X')")
    print("ai = AIPlayer('Computer', 'O', HardAI())")
    print("game = Game(human, ai)")
    print("game.play()")


if __name__ == "__main__":
    main()

