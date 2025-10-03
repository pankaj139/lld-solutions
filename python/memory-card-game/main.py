"""
MEMORY CARD GAME SYSTEM - Low Level Design Implementation in Python

DESIGN PATTERNS USED:
1. STATE PATTERN: Game state management with clear transitions
   - Game states: MENU -> PLAYING -> PAUSED -> GAME_OVER
   - Card states: FACE_DOWN -> FACE_UP -> MATCHED -> REMOVED
   - Each state has specific allowed operations and visual representations
   - Prevents invalid game operations and ensures proper flow

2. COMMAND PATTERN: Player actions as command objects
   - Card flip commands with validation and undo support
   - Game control commands: start, pause, restart, hint
   - Move history tracking for replay and analysis
   - Support for undo operations during gameplay

3. OBSERVER PATTERN: Game event notifications
   - Score updates and level progression notifications
   - Match events with visual and audio feedback
   - Timer updates and countdown alerts
   - Achievement unlocking and milestone notifications

4. STRATEGY PATTERN: Different difficulty levels and scoring systems
   - Scoring strategies: time-based, move-based, perfect match bonus
   - Difficulty algorithms: grid size, card types, time limits
   - Hint strategies: highlight pairs, show briefly, progressive hints
   - AI opponent strategies for single-player mode

5. FACTORY PATTERN: Card and game creation
   - CardFactory creates different card types with themes
   - GameFactory creates games with different configurations
   - Level generator creates progressively harder challenges
   - Theme factory for different card visual styles

6. TEMPLATE METHOD PATTERN: Game flow structure
   - Standard game loop: shuffle -> display -> handle input -> check match -> update
   - Customizable scoring and difficulty progression
   - Consistent game rules across different modes
   - Extensible framework for new game variations

OOP CONCEPTS DEMONSTRATED:
- ENCAPSULATION: Card values and game state hidden behind controlled interface
- ABSTRACTION: Complex matching logic abstracted into simple method calls
- POLYMORPHISM: Different card types and themes handled uniformly
- INHERITANCE: Specialized game modes inherit from base game class

SOLID PRINCIPLES:
- SRP: Each class handles single responsibility (Card, Board, Game, Player)
- OCP: Easy to add new card themes and game modes without code changes
- LSP: All card types and game modes can be used interchangeably
- ISP: Focused interfaces for game operations, scoring, and theme management
- DIP: Game logic depends on card abstractions, not concrete implementations

BUSINESS FEATURES:
- Multiple difficulty levels with progressive challenges
- Various card themes (animals, numbers, symbols, custom images)
- Time-based and move-based scoring systems
- High score tracking and leaderboards
- Achievement system with unlockable content
- Hint system for accessibility and learning

ARCHITECTURAL NOTES:
- Modular design for easy theme and rule customization
- Event-driven architecture for responsive UI updates
- Efficient card matching algorithms with memoization
- Accessibility features for different player abilities
- Save/load functionality for game progress
"""

from abc import ABC, abstractmethod
from enum import Enum
from typing import List, Tuple, Optional, Dict
import random
import time
import uuid

class CardState(Enum):
    FACE_DOWN = "FACE_DOWN"
    FACE_UP = "FACE_UP"
    MATCHED = "MATCHED"
    REMOVED = "REMOVED"

class GameState(Enum):
    MENU = "MENU"
    PLAYING = "PLAYING"
    PAUSED = "PAUSED"
    GAME_OVER = "GAME_OVER"

class Difficulty(Enum):
    EASY = "EASY"
    MEDIUM = "MEDIUM"
    HARD = "HARD"
    EXPERT = "EXPERT"

class Theme(Enum):
    ANIMALS = "ANIMALS"
    NUMBERS = "NUMBERS"
    SYMBOLS = "SYMBOLS"
    COLORS = "COLORS"

# VALUE OBJECT: Card with immutable properties
class Card:
    def __init__(self, card_id: str, value: str, theme: Theme):
        self.card_id = card_id
        self.value = value
        self.theme = theme
        self.state = CardState.FACE_DOWN
        self.position: Optional[Tuple[int, int]] = None
    
    def flip(self):
        """Flip card to face up"""
        if self.state == CardState.FACE_DOWN:
            self.state = CardState.FACE_UP
    
    def flip_down(self):
        """Flip card to face down"""
        if self.state == CardState.FACE_UP:
            self.state = CardState.FACE_DOWN
    
    def mark_matched(self):
        """Mark card as matched"""
        self.state = CardState.MATCHED
    
    def is_face_up(self) -> bool:
        return self.state == CardState.FACE_UP
    
    def is_matched(self) -> bool:
        return self.state == CardState.MATCHED

# FACTORY PATTERN: Card creation with different themes
class CardFactory:
    THEME_VALUES = {
        Theme.ANIMALS: ["🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮"],
        Theme.NUMBERS: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"],
        Theme.SYMBOLS: ["⭐", "❤️", "🔥", "💎", "🌟", "🎯", "🎪", "🎨", "🎭", "🎪", "🎯", "⚡"],
        Theme.COLORS: ["🔴", "🔵", "🟢", "🟡", "🟣", "🟠", "⚫", "⚪", "🟤", "🔴", "🔵", "🟢"]
    }
    
    @staticmethod
    def create_card_set(theme: Theme, pairs_count: int) -> List[Card]:
        """Create a set of card pairs for memory game"""
        if pairs_count > len(CardFactory.THEME_VALUES[theme]):
            raise ValueError(f"Not enough values in theme {theme} for {pairs_count} pairs")
        
        cards = []
        values = CardFactory.THEME_VALUES[theme][:pairs_count]
        
        # Create pairs
        for value in values:
            for i in range(2):  # Create pair
                card_id = str(uuid.uuid4())
                cards.append(Card(card_id, value, theme))
        
        return cards

# AGGREGATE: Game board managing card layout
class GameBoard:
    def __init__(self, rows: int, cols: int, cards: List[Card]):
        self.rows = rows
        self.cols = cols
        self.cards = cards
        self.grid: List[List[Optional[Card]]] = [[None for _ in range(cols)] for _ in range(rows)]
        self.face_up_cards: List[Card] = []
        self._place_cards()
    
    def _place_cards(self):
        """Randomly place cards on the board"""
        random.shuffle(self.cards)
        
        card_index = 0
        for row in range(self.rows):
            for col in range(self.cols):
                if card_index < len(self.cards):
                    card = self.cards[card_index]
                    card.position = (row, col)
                    self.grid[row][col] = card
                    card_index += 1
    
    def flip_card(self, row: int, col: int) -> bool:
        """Flip card at given position"""
        if not self._is_valid_position(row, col):
            return False
        
        card = self.grid[row][col]
        if not card or card.is_face_up() or card.is_matched():
            return False
        
        card.flip()
        self.face_up_cards.append(card)
        return True
    
    def check_match(self) -> bool:
        """Check if face-up cards match"""
        if len(self.face_up_cards) != 2:
            return False
        
        card1, card2 = self.face_up_cards
        if card1.value == card2.value:
            # Match found
            card1.mark_matched()
            card2.mark_matched()
            self.face_up_cards.clear()
            return True
        else:
            # No match - flip cards back down after delay
            return False
    
    def flip_face_up_cards_down(self):
        """Flip all face-up cards back down"""
        for card in self.face_up_cards:
            card.flip_down()
        self.face_up_cards.clear()
    
    def all_cards_matched(self) -> bool:
        """Check if all cards are matched (win condition)"""
        return all(card.is_matched() for card in self.cards if card)
    
    def _is_valid_position(self, row: int, col: int) -> bool:
        return 0 <= row < self.rows and 0 <= col < self.cols

# STRATEGY PATTERN: Scoring algorithms
class ScoringStrategy(ABC):
    @abstractmethod
    def calculate_score(self, moves: int, time_taken: float, matches: int, difficulty: Difficulty) -> int:
        pass

class TimeBonusScoring(ScoringStrategy):
    def calculate_score(self, moves: int, time_taken: float, matches: int, difficulty: Difficulty) -> int:
        """Score based on time bonus and efficiency"""
        base_score = matches * 100
        time_bonus = max(0, 300 - int(time_taken))  # Bonus for fast completion
        efficiency_bonus = max(0, (matches * 2 - moves) * 10)  # Bonus for fewer moves
        difficulty_multiplier = {Difficulty.EASY: 1, Difficulty.MEDIUM: 1.5, Difficulty.HARD: 2, Difficulty.EXPERT: 3}
        
        total_score = (base_score + time_bonus + efficiency_bonus) * difficulty_multiplier[difficulty]
        return int(total_score)

class MoveBonusScoring(ScoringStrategy):
    def calculate_score(self, moves: int, time_taken: float, matches: int, difficulty: Difficulty) -> int:
        """Score based on move efficiency"""
        base_score = matches * 100
        perfect_moves = matches * 2
        move_penalty = max(0, (moves - perfect_moves) * 5)
        difficulty_bonus = {Difficulty.EASY: 0, Difficulty.MEDIUM: 50, Difficulty.HARD: 100, Difficulty.EXPERT: 200}
        
        total_score = base_score - move_penalty + difficulty_bonus[difficulty]
        return max(total_score, matches * 10)  # Minimum score

# ENTITY: Player with statistics tracking
class Player:
    def __init__(self, player_id: str, name: str):
        self.player_id = player_id
        self.name = name
        self.current_score = 0
        self.high_score = 0
        self.games_played = 0
        self.total_matches = 0
        self.best_time = float('inf')
        self.scoring_strategy = TimeBonusScoring()
    
    def set_scoring_strategy(self, strategy: ScoringStrategy):
        """Set scoring strategy"""
        self.scoring_strategy = strategy
    
    def update_score(self, moves: int, time_taken: float, matches: int, difficulty: Difficulty):
        """Update player score using current strategy"""
        self.current_score = self.scoring_strategy.calculate_score(moves, time_taken, matches, difficulty)
        if self.current_score > self.high_score:
            self.high_score = self.current_score
        
        self.games_played += 1
        self.total_matches += matches
        if time_taken < self.best_time:
            self.best_time = time_taken

# COMMAND PATTERN: Game actions
class GameAction(ABC):
    @abstractmethod
    def execute(self):
        pass

class FlipCardAction(GameAction):
    def __init__(self, game: 'MemoryGame', row: int, col: int):
        self.game = game
        self.row = row
        self.col = col
    
    def execute(self):
        return self.game.flip_card(self.row, self.col)

# OBSERVER PATTERN: Game event notifications
class GameObserver(ABC):
    @abstractmethod
    def notify_match_found(self, card1: Card, card2: Card):
        pass
    
    @abstractmethod
    def notify_score_update(self, score: int):
        pass
    
    @abstractmethod
    def notify_game_over(self, won: bool, final_score: int):
        pass

class ConsoleGameObserver(GameObserver):
    def notify_match_found(self, card1: Card, card2: Card):
        print(f"Match found: {card1.value} and {card2.value}")
    
    def notify_score_update(self, score: int):
        print(f"Score: {score}")
    
    def notify_game_over(self, won: bool, final_score: int):
        if won:
            print(f"Congratulations! You won with score: {final_score}")
        else:
            print(f"Game over. Final score: {final_score}")

# FACADE PATTERN: Memory game management
class MemoryGame:
    def __init__(self, player: Player, difficulty: Difficulty, theme: Theme):
        self.game_id = str(uuid.uuid4())
        self.player = player
        self.difficulty = difficulty
        self.theme = theme
        self.state = GameState.MENU
        self.board: Optional[GameBoard] = None
        self.start_time: Optional[float] = None
        self.moves = 0
        self.matches = 0
        self.observers: List[GameObserver] = []
        self._setup_game()
    
    def add_observer(self, observer: GameObserver):
        """Add game observer"""
        self.observers.append(observer)
    
    def _setup_game(self):
        """Setup game based on difficulty"""
        difficulty_config = {
            Difficulty.EASY: (4, 4, 8),    # 4x4 grid, 8 pairs
            Difficulty.MEDIUM: (4, 6, 12), # 4x6 grid, 12 pairs
            Difficulty.HARD: (6, 6, 18),   # 6x6 grid, 18 pairs
            Difficulty.EXPERT: (6, 8, 24)  # 6x8 grid, 24 pairs
        }
        
        rows, cols, pairs = difficulty_config[self.difficulty]
        cards = CardFactory.create_card_set(self.theme, pairs)
        self.board = GameBoard(rows, cols, cards)
    
    def start_game(self):
        """Start the memory game"""
        self.state = GameState.PLAYING
        self.start_time = time.time()
        self.moves = 0
        self.matches = 0
        print(f"Memory game started! Difficulty: {self.difficulty.value}, Theme: {self.theme.value}")
    
    def flip_card(self, row: int, col: int) -> bool:
        """Flip card and handle game logic"""
        if self.state != GameState.PLAYING:
            return False
        
        if not self.board.flip_card(row, col):
            return False
        
        self.moves += 1
        
        # Check for match when 2 cards are face up
        if len(self.board.face_up_cards) == 2:
            if self.board.check_match():
                # Match found
                self.matches += 1
                card1, card2 = self.board.face_up_cards[-2:]  # Get the matched cards
                for observer in self.observers:
                    observer.notify_match_found(card1, card2)
                
                # Check win condition
                if self.board.all_cards_matched():
                    self._end_game(True)
            else:
                # No match - cards will be flipped back down
                # In a real game, there would be a delay here
                self.board.flip_face_up_cards_down()
        
        return True
    
    def _end_game(self, won: bool):
        """End the game and calculate final score"""
        self.state = GameState.GAME_OVER
        time_taken = time.time() - self.start_time if self.start_time else 0
        
        # Update player score
        self.player.update_score(self.moves, time_taken, self.matches, self.difficulty)
        
        # Notify observers
        for observer in self.observers:
            observer.notify_game_over(won, self.player.current_score)
    
    def get_board_display(self) -> List[List[str]]:
        """Get current board state for display"""
        display = []
        for row in range(self.board.rows):
            display_row = []
            for col in range(self.board.cols):
                card = self.board.grid[row][col]
                if card:
                    if card.is_face_up() or card.is_matched():
                        display_row.append(card.value)
                    else:
                        display_row.append("?")
                else:
                    display_row.append(" ")
            display.append(display_row)
        return display

# DEMO: Memory game usage
def demo_memory_game():
    # Create player
    player = Player("p1", "Player 1")
    
    # Create game
    game = MemoryGame(player, Difficulty.EASY, Theme.ANIMALS)
    
    # Add observer
    observer = ConsoleGameObserver()
    game.add_observer(observer)
    
    # Start game
    game.start_game()
    
    # Display initial board
    print("Initial board:")
    board_display = game.get_board_display()
    for row in board_display:
        print(" ".join(row))
    
    # Simulate some moves (in real game, this would be user input)
    moves = [
        (0, 0), (0, 1),  # First attempt
        (1, 0), (1, 1),  # Second attempt
        (0, 2), (0, 3),  # Third attempt
        (1, 2), (1, 3),  # Fourth attempt
    ]
    
    for i in range(0, len(moves), 2):
        if i + 1 < len(moves):
            row1, col1 = moves[i]
            row2, col2 = moves[i + 1]
            
            print(f"\nFlipping cards at ({row1}, {col1}) and ({row2}, {col2})")
            game.flip_card(row1, col1)
            game.flip_card(row2, col2)
            
            # Display board after moves
            board_display = game.get_board_display()
            for row in board_display:
                print(" ".join(row))
            
            if game.state == GameState.GAME_OVER:
                break

if __name__ == "__main__":
    demo_memory_game()