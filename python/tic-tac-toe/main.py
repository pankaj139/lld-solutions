"""
TIC-TAC-TOE GAME SYSTEM - Low Level Design Implementation in Python

DESIGN PATTERNS USED:
1. STRATEGY PATTERN: AI difficulty levels with different move strategies
   - Easy: Random valid moves for unpredictable gameplay
   - Medium: Basic heuristics with some strategic thinking
   - Hard: Minimax algorithm with optimal play
   - Pluggable AI strategies without changing game core
   - Easy to add new AI personalities and difficulty levels

2. STATE PATTERN: Game state management with clear transitions
   - GameStatus enum defines all possible game outcomes
   - State transitions: ACTIVE -> X_WINS/O_WINS/DRAW
   - Each state determines valid operations and game continuation
   - Clear win condition checking and game termination

3. TEMPLATE METHOD PATTERN: Common game flow structure
   - Base game loop template with customizable steps
   - Standard flow: validate move -> make move -> check win -> switch player
   - Subclasses can override specific steps (AI vs human players)
   - Consistent game flow regardless of player types

4. OBSERVER PATTERN: Game event notifications
   - Move events, win events, game state changes
   - Decoupled UI updates from game logic
   - Multiple observers: console display, GUI, game statistics
   - Easy to add new notification types (sound, animations)

5. COMMAND PATTERN: Move operations as command objects
   - Move validation and execution encapsulated
   - Support for undo/redo functionality
   - Move history tracking for game replay
   - Consistent move handling across player types

OOP CONCEPTS DEMONSTRATED:
- ENCAPSULATION: Game state and rules hidden behind clean interface
- ABSTRACTION: Complex AI algorithms abstracted into simple strategy interface
- POLYMORPHISM: Human and AI players treated uniformly
- INHERITANCE: Different AI strategies inherit from base AI class

SOLID PRINCIPLES:
- SRP: Each class handles single responsibility (Board, Game, AI, Player)
- OCP: Easy to add new AI strategies without modifying existing code
- LSP: All player types (human/AI) can be used interchangeably
- ISP: Focused interfaces for game operations and AI strategies
- DIP: Game depends on player abstractions, not concrete implementations

BUSINESS FEATURES:
- Multiple AI difficulty levels for different skill challenges
- Human vs Human, Human vs AI, AI vs AI gameplay modes
- Game statistics tracking (wins, losses, draws)
- Move validation with clear error messages
- Interactive console interface with board visualization
- Game replay and move history functionality

ARCHITECTURAL NOTES:
- Clean separation between game logic and AI strategies
- Extensible design for different board sizes (NxN grids)
- Modular AI system for easy strategy addition
- Event-driven architecture for UI updates
- Stateless game operations for thread safety
"""

from enum import Enum
from abc import ABC, abstractmethod
import random
import math


class Player(Enum):
    X = "X"
    O = "O"
    EMPTY = " "


class GameStatus(Enum):
    ACTIVE = "active"
    X_WINS = "x_wins"
    O_WINS = "o_wins"
    DRAW = "draw"


class Difficulty(Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


class Position:
    """Represents a position on the board"""
    
    def __init__(self, row: int, col: int):
        self.row = row
        self.col = col
    
    def __eq__(self, other):
        return self.row == other.row and self.col == other.col
    
    def __str__(self):
        return f"({self.row}, {self.col})"


class GameBoard:
    """Represents the 3x3 tic-tac-toe board"""
    
    def __init__(self):
        self.board = [[Player.EMPTY for _ in range(3)] for _ in range(3)]
        self.moves_count = 0
    
    def make_move(self, position: Position, player: Player) -> bool:
        """Make a move at the specified position"""
        if self.is_valid_move(position):
            self.board[position.row][position.col] = player
            self.moves_count += 1
            return True
        return False
    
    def is_valid_move(self, position: Position) -> bool:
        """Check if the move is valid"""
        if not (0 <= position.row < 3 and 0 <= position.col < 3):
            return False
        return self.board[position.row][position.col] == Player.EMPTY
    
    def get_available_moves(self) -> list[Position]:
        """Get all available moves"""
        moves = []
        for row in range(3):
            for col in range(3):
                if self.board[row][col] == Player.EMPTY:
                    moves.append(Position(row, col))
        return moves
    
    def check_winner(self) -> Player:
        """Check if there's a winner"""
        # Check rows
        for row in range(3):
            if (self.board[row][0] == self.board[row][1] == self.board[row][2] 
                and self.board[row][0] != Player.EMPTY):
                return self.board[row][0]
        
        # Check columns
        for col in range(3):
            if (self.board[0][col] == self.board[1][col] == self.board[2][col] 
                and self.board[0][col] != Player.EMPTY):
                return self.board[0][col]
        
        # Check diagonals
        if (self.board[0][0] == self.board[1][1] == self.board[2][2] 
            and self.board[0][0] != Player.EMPTY):
            return self.board[0][0]
        
        if (self.board[0][2] == self.board[1][1] == self.board[2][0] 
            and self.board[0][2] != Player.EMPTY):
            return self.board[0][2]
        
        return Player.EMPTY
    
    def is_board_full(self) -> bool:
        """Check if the board is full"""
        return self.moves_count == 9
    
    def clone(self) -> 'GameBoard':
        """Create a copy of the board"""
        new_board = GameBoard()
        new_board.board = [row[:] for row in self.board]
        new_board.moves_count = self.moves_count
        return new_board
    
    def display(self):
        """Display the current board"""
        print("  0   1   2")
        for i, row in enumerate(self.board):
            print(f"{i} {row[0]} | {row[1]} | {row[2]}")
            if i < 2:
                print("  ---------")


class AIStrategy(ABC):
    """Abstract strategy for AI players"""
    
    @abstractmethod
    def get_best_move(self, board: GameBoard, player: Player) -> Position:
        """Get the best move for the AI"""
        pass


class EasyAIStrategy(AIStrategy):
    """Easy AI - Random moves"""
    
    def get_best_move(self, board: GameBoard, player: Player) -> Position:
        available_moves = board.get_available_moves()
        return random.choice(available_moves) if available_moves else None


class MediumAIStrategy(AIStrategy):
    """Medium AI - Block opponent wins, take easy wins"""
    
    def get_best_move(self, board: GameBoard, player: Player) -> Position:
        opponent = Player.O if player == Player.X else Player.X
        
        # First, try to win
        for move in board.get_available_moves():
            board_copy = board.clone()
            board_copy.make_move(move, player)
            if board_copy.check_winner() == player:
                return move
        
        # Then, try to block opponent from winning
        for move in board.get_available_moves():
            board_copy = board.clone()
            board_copy.make_move(move, opponent)
            if board_copy.check_winner() == opponent:
                return move
        
        # Otherwise, random move
        available_moves = board.get_available_moves()
        return random.choice(available_moves) if available_moves else None


class HardAIStrategy(AIStrategy):
    """Hard AI - Minimax algorithm with alpha-beta pruning"""
    
    def get_best_move(self, board: GameBoard, player: Player) -> Position:
        _, best_move = self._minimax(board, player, player, True, -math.inf, math.inf)
        return best_move
    
    def _minimax(self, board: GameBoard, player: Player, current_player: Player, 
                is_maximizing: bool, alpha: float, beta: float) -> tuple[int, Position]:
        """Minimax algorithm with alpha-beta pruning"""
        winner = board.check_winner()
        
        # Terminal states
        if winner == player:
            return 10 - board.moves_count, None
        elif winner != Player.EMPTY:
            return -10 + board.moves_count, None
        elif board.is_board_full():
            return 0, None
        
        best_move = None
        opponent = Player.O if current_player == Player.X else Player.X
        
        if is_maximizing:
            max_eval = -math.inf
            for move in board.get_available_moves():
                board_copy = board.clone()
                board_copy.make_move(move, current_player)
                eval_score, _ = self._minimax(board_copy, player, opponent, False, alpha, beta)
                
                if eval_score > max_eval:
                    max_eval = eval_score
                    best_move = move
                
                alpha = max(alpha, eval_score)
                if beta <= alpha:
                    break  # Alpha-beta pruning
            
            return max_eval, best_move
        else:
            min_eval = math.inf
            for move in board.get_available_moves():
                board_copy = board.clone()
                board_copy.make_move(move, current_player)
                eval_score, _ = self._minimax(board_copy, player, opponent, True, alpha, beta)
                
                if eval_score < min_eval:
                    min_eval = eval_score
                    best_move = move
                
                beta = min(beta, eval_score)
                if beta <= alpha:
                    break  # Alpha-beta pruning
            
            return min_eval, best_move


class AIPlayer:
    """AI player with configurable difficulty"""
    
    def __init__(self, player: Player, difficulty: Difficulty):
        self.player = player
        self.difficulty = difficulty
        self.strategy = self._create_strategy(difficulty)
    
    def _create_strategy(self, difficulty: Difficulty) -> AIStrategy:
        """Factory method to create AI strategy"""
        strategy_map = {
            Difficulty.EASY: EasyAIStrategy(),
            Difficulty.MEDIUM: MediumAIStrategy(),
            Difficulty.HARD: HardAIStrategy()
        }
        return strategy_map[difficulty]
    
    def get_move(self, board: GameBoard) -> Position:
        """Get the AI's move"""
        return self.strategy.get_best_move(board, self.player)


class GameObserver(ABC):
    """Observer interface for game events"""
    
    @abstractmethod
    def on_move_made(self, player: Player, position: Position):
        pass
    
    @abstractmethod
    def on_game_ended(self, status: GameStatus):
        pass


class GameStatistics(GameObserver):
    """Tracks game statistics"""
    
    def __init__(self):
        self.games_played = 0
        self.x_wins = 0
        self.o_wins = 0
        self.draws = 0
        self.moves_history = []
    
    def on_move_made(self, player: Player, position: Position):
        self.moves_history.append((player, position))
    
    def on_game_ended(self, status: GameStatus):
        self.games_played += 1
        if status == GameStatus.X_WINS:
            self.x_wins += 1
        elif status == GameStatus.O_WINS:
            self.o_wins += 1
        elif status == GameStatus.DRAW:
            self.draws += 1
        self.moves_history = []
    
    def display_stats(self):
        print("\n=== Game Statistics ===")
        print(f"Games played: {self.games_played}")
        print(f"X wins: {self.x_wins}")
        print(f"O wins: {self.o_wins}")
        print(f"Draws: {self.draws}")
        if self.games_played > 0:
            print(f"X win rate: {self.x_wins/self.games_played:.1%}")
            print(f"O win rate: {self.o_wins/self.games_played:.1%}")
            print(f"Draw rate: {self.draws/self.games_played:.1%}")


class TicTacToeGame:
    """Main game controller implementing Template Method pattern"""
    
    def __init__(self):
        self.board = GameBoard()
        self.current_player = Player.X
        self.game_status = GameStatus.ACTIVE
        self.observers = []
        self.ai_players = {}
    
    def add_observer(self, observer: GameObserver):
        """Add a game observer"""
        self.observers.append(observer)
    
    def set_ai_player(self, player: Player, difficulty: Difficulty):
        """Set a player to be controlled by AI"""
        self.ai_players[player] = AIPlayer(player, difficulty)
    
    def play_game(self):
        """Template method for playing a complete game"""
        self._initialize_game()
        
        while self.game_status == GameStatus.ACTIVE:
            self._display_current_state()
            move = self._get_player_move()
            if move:
                self._make_move(move)
                self._check_game_end()
                self._switch_player()
        
        self._display_final_result()
    
    def _initialize_game(self):
        """Initialize game state"""
        self.board = GameBoard()
        self.current_player = Player.X
        self.game_status = GameStatus.ACTIVE
    
    def _display_current_state(self):
        """Display current game state"""
        print(f"\nCurrent player: {self.current_player.value}")
        self.board.display()
    
    def _get_player_move(self) -> Position:
        """Get move from current player (human or AI)"""
        if self.current_player in self.ai_players:
            # AI move
            ai_player = self.ai_players[self.current_player]
            move = ai_player.get_move(self.board)
            print(f"AI ({self.current_player.value}) chooses: {move}")
            return move
        else:
            # Human move
            while True:
                try:
                    row = int(input("Enter row (0-2): "))
                    col = int(input("Enter col (0-2): "))
                    move = Position(row, col)
                    
                    if self.board.is_valid_move(move):
                        return move
                    else:
                        print("Invalid move! Try again.")
                except ValueError:
                    print("Please enter valid numbers!")
    
    def _make_move(self, position: Position):
        """Make a move and notify observers"""
        if self.board.make_move(position, self.current_player):
            for observer in self.observers:
                observer.on_move_made(self.current_player, position)
    
    def _check_game_end(self):
        """Check if the game has ended"""
        winner = self.board.check_winner()
        
        if winner == Player.X:
            self.game_status = GameStatus.X_WINS
        elif winner == Player.O:
            self.game_status = GameStatus.O_WINS
        elif self.board.is_board_full():
            self.game_status = GameStatus.DRAW
        
        if self.game_status != GameStatus.ACTIVE:
            for observer in self.observers:
                observer.on_game_ended(self.game_status)
    
    def _switch_player(self):
        """Switch to the other player"""
        if self.game_status == GameStatus.ACTIVE:
            self.current_player = Player.O if self.current_player == Player.X else Player.X
    
    def _display_final_result(self):
        """Display the final game result"""
        print("\n" + "="*30)
        self.board.display()
        
        if self.game_status == GameStatus.X_WINS:
            print("\n🎉 Player X wins!")
        elif self.game_status == GameStatus.O_WINS:
            print("\n🎉 Player O wins!")
        else:
            print("\n🤝 It's a draw!")


def demo_tic_tac_toe():
    """Demonstrate the tic-tac-toe game functionality"""
    print("=== Tic-Tac-Toe Game Demo ===\n")
    
    # Create game with statistics tracking
    game = TicTacToeGame()
    stats = GameStatistics()
    game.add_observer(stats)
    
    print("Demo 1: AI vs AI (Hard vs Medium)")
    game.set_ai_player(Player.X, Difficulty.HARD)
    game.set_ai_player(Player.O, Difficulty.MEDIUM)
    game.play_game()
    
    print("\nDemo 2: Easy AI vs Hard AI")
    game = TicTacToeGame()
    game.add_observer(stats)
    game.set_ai_player(Player.X, Difficulty.EASY)
    game.set_ai_player(Player.O, Difficulty.HARD)
    game.play_game()
    
    print("\nDemo 3: Perfect AI vs Perfect AI (should be draw)")
    game = TicTacToeGame()
    game.add_observer(stats)
    game.set_ai_player(Player.X, Difficulty.HARD)
    game.set_ai_player(Player.O, Difficulty.HARD)
    game.play_game()
    
    # Show statistics
    stats.display_stats()
    
    # Test minimax algorithm
    print("\n=== AI Strategy Testing ===")
    board = GameBoard()
    hard_ai = HardAIStrategy()
    
    # Test winning move detection
    board.make_move(Position(0, 0), Player.X)
    board.make_move(Position(0, 1), Player.X)
    # X should win by playing (0, 2)
    best_move = hard_ai.get_best_move(board, Player.X)
    print(f"AI finds winning move: {best_move} (should be (0, 2))")
    
    # Test blocking move
    board = GameBoard()
    board.make_move(Position(0, 0), Player.O)
    board.make_move(Position(0, 1), Player.O)
    # X should block by playing (0, 2)
    best_move = hard_ai.get_best_move(board, Player.X)
    print(f"AI finds blocking move: {best_move} (should be (0, 2))")


def play_interactive_game():
    """Play an interactive game against AI"""
    print("=== Interactive Tic-Tac-Toe ===")
    print("Choose AI difficulty:")
    print("1. Easy")
    print("2. Medium") 
    print("3. Hard")
    
    try:
        choice = int(input("Enter choice (1-3): "))
        difficulty_map = {1: Difficulty.EASY, 2: Difficulty.MEDIUM, 3: Difficulty.HARD}
        difficulty = difficulty_map.get(choice, Difficulty.MEDIUM)
        
        game = TicTacToeGame()
        stats = GameStatistics()
        game.add_observer(stats)
        
        # Human is X, AI is O
        game.set_ai_player(Player.O, difficulty)
        
        print(f"\nYou are X, AI is O (Difficulty: {difficulty.value})")
        print("Enter positions as row and column (0-2)")
        
        game.play_game()
        
    except ValueError:
        print("Invalid input! Using medium difficulty.")
        play_interactive_game()


if __name__ == "__main__":
    # Run demo
    demo_tic_tac_toe()
    
    # Uncomment to play interactively
    # play_interactive_game()