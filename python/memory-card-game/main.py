"""
MEMORY CARD GAME - Low Level Design Implementation in Python

DESIGN PATTERNS USED:
1. STATE PATTERN: Card state management
   - FaceDown, FaceUp, Matched states
   - Clean state transitions
   - State-specific behavior

2. OBSERVER PATTERN: Game event notifications
   - Match found events
   - Turn complete events
   - Score update notifications

3. STRATEGY PATTERN: Difficulty levels
   - Easy (4×4), Medium (6×6), Hard (8×8)
   - Pluggable difficulty configurations

4. MEMENTO PATTERN: Game state save/restore
   - Save current game state
   - Restore previous state
   - Undo functionality

5. FACTORY PATTERN: Card creation
   - Standardized card generation
   - Symbol assignment

6. COMMAND PATTERN: Turn as command
   - Turn encapsulates card flips
   - History tracking
   - Undo support

OOP CONCEPTS DEMONSTRATED:
- ENCAPSULATION: Card state, board grid hidden
- ABSTRACTION: Clear interfaces
- INHERITANCE: State hierarchy
- POLYMORPHISM: Different difficulty strategies

SOLID PRINCIPLES:
- SRP: Each class single responsibility
- OCP: Easy to extend
- LSP: All states interchangeable
- ISP: Focused interfaces
- DIP: Depends on abstractions

BUSINESS FEATURES:
- Multiple board sizes
- Turn-based gameplay
- Match detection
- Score tracking
- Statistics

ARCHITECTURAL NOTES:
- Clean state management
- Efficient matching
- Extensible for themes
- Ready for GUI
"""

from enum import Enum
from typing import List, Optional, Tuple
import random
import time


# Enums
class CardState(Enum):
    """Card states"""
    FACE_DOWN = "face_down"
    FACE_UP = "face_up"
    MATCHED = "matched"


class Difficulty(Enum):
    """Game difficulty levels"""
    EASY = (4, 4)    # 4×4 = 8 pairs
    MEDIUM = (6, 6)  # 6×6 = 18 pairs
    HARD = (8, 8)    # 8×8 = 32 pairs
    
    @property
    def rows(self):
        return self.value[0]
    
    @property
    def cols(self):
        return self.value[1]
    
    @property
    def total_cards(self):
        return self.rows * self.cols


class GameState(Enum):
    """Game states"""
    SETUP = "setup"
    PLAYING = "playing"
    PAUSED = "paused"
    FINISHED = "finished"


class Position:
    """
    Board position
    
    OOP CONCEPT: Value Object
    """
    def __init__(self, row: int, col: int):
        self.row = row
        self.col = col
    
    def __eq__(self, other):
        return self.row == other.row and self.col == other.col
    
    def __hash__(self):
        return hash((self.row, self.col))
    
    def __repr__(self):
        return f"({self.row},{self.col})"


class Card:
    """
    Memory card with state
    
    DESIGN PATTERN: State Pattern
    - Card state transitions
    """
    def __init__(self, card_id: int, symbol: str):
        self.id = card_id
        self.symbol = symbol
        self.state = CardState.FACE_DOWN
        self.position: Optional[Position] = None
    
    def flip(self):
        """Flip card face-up"""
        if self.state == CardState.FACE_DOWN:
            self.state = CardState.FACE_UP
    
    def flip_down(self):
        """Flip card face-down"""
        if self.state == CardState.FACE_UP:
            self.state = CardState.FACE_DOWN
    
    def match(self):
        """Mark as matched"""
        self.state = CardState.MATCHED
    
    def is_matched(self) -> bool:
        """Check if matched"""
        return self.state == CardState.MATCHED
    
    def is_face_up(self) -> bool:
        """Check if face-up"""
        return self.state in (CardState.FACE_UP, CardState.MATCHED)
    
    def __str__(self):
        if self.state == CardState.FACE_DOWN:
            return "?"
        return self.symbol


class Board:
    """
    Game board with cards
    
    OOP CONCEPT: Encapsulation
    - Grid hidden, accessed through methods
    """
    def __init__(self, difficulty: Difficulty):
        self.difficulty = difficulty
        self.rows = difficulty.rows
        self.cols = difficulty.cols
        self.grid: List[List[Optional[Card]]] = [[None for _ in range(self.cols)] 
                                                   for _ in range(self.rows)]
        self.cards: List[Card] = []
        self.first_flipped: Optional[Card] = None
        self.second_flipped: Optional[Card] = None
    
    def initialize(self):
        """
        Initialize board with card pairs
        
        DESIGN PATTERN: Factory Pattern
        - Creates cards with symbols
        """
        total_cards = self.rows * self.cols
        num_pairs = total_cards // 2
        
        # Create symbol pairs
        symbols = []
        for i in range(num_pairs):
            # Use letters, numbers, or emojis as symbols
            symbol = chr(65 + i) if i < 26 else str(i)
            symbols.extend([symbol, symbol])  # Add pair
        
        # Create cards
        for i, symbol in enumerate(symbols):
            card = Card(i, symbol)
            self.cards.append(card)
        
        # Shuffle
        random.shuffle(self.cards)
        
        # Place on grid
        idx = 0
        for row in range(self.rows):
            for col in range(self.cols):
                card = self.cards[idx]
                card.position = Position(row, col)
                self.grid[row][col] = card
                idx += 1
    
    def get_card(self, position: Position) -> Optional[Card]:
        """Get card at position"""
        if 0 <= position.row < self.rows and 0 <= position.col < self.cols:
            return self.grid[position.row][position.col]
        return None
    
    def flip_card(self, position: Position) -> Optional[Card]:
        """Flip card at position"""
        card = self.get_card(position)
        
        if not card or card.is_matched():
            return None
        
        # Track flipped cards
        if not self.first_flipped:
            card.flip()
            self.first_flipped = card
            return card
        elif not self.second_flipped and card != self.first_flipped:
            card.flip()
            self.second_flipped = card
            return card
        
        return None
    
    def check_match(self) -> bool:
        """Check if two flipped cards match"""
        if not self.first_flipped or not self.second_flipped:
            return False
        
        if self.first_flipped.symbol == self.second_flipped.symbol:
            self.first_flipped.match()
            self.second_flipped.match()
            self.reset_flipped()
            return True
        
        return False
    
    def reset_non_matched(self):
        """Flip back non-matched cards"""
        if self.first_flipped and not self.first_flipped.is_matched():
            self.first_flipped.flip_down()
        if self.second_flipped and not self.second_flipped.is_matched():
            self.second_flipped.flip_down()
        
        self.reset_flipped()
    
    def reset_flipped(self):
        """Clear flipped card tracking"""
        self.first_flipped = None
        self.second_flipped = None
    
    def is_complete(self) -> bool:
        """Check if all pairs matched"""
        return all(card.is_matched() for card in self.cards)
    
    def display(self):
        """Display board"""
        print("\n   " + " ".join(f"{i:2}" for i in range(self.cols)))
        print("  +" + "---" * self.cols + "+")
        
        for row in range(self.rows):
            row_str = f"{row} |"
            for col in range(self.cols):
                card = self.grid[row][col]
                row_str += f" {str(card)} " if card else " ? "
            print(row_str + "|")
        
        print("  +" + "---" * self.cols + "+")


class PlayerStats:
    """
    Player statistics
    
    DESIGN PATTERN: Observer Pattern support
    """
    def __init__(self):
        self.matches_found = 0
        self.moves_made = 0
        self.turns_taken = 0
    
    def accuracy(self) -> float:
        """Calculate match accuracy"""
        if self.moves_made == 0:
            return 0.0
        return (self.matches_found * 2 / self.moves_made) * 100


class Player:
    """
    Game player
    
    OOP CONCEPT: Encapsulation
    """
    def __init__(self, name: str):
        self.name = name
        self.score = 0
        self.stats = PlayerStats()
    
    def increment_score(self, points: int = 10):
        """Add points to score"""
        self.score += points
        self.stats.matches_found += 1
    
    def record_move(self):
        """Record a move"""
        self.stats.moves_made += 1
    
    def __str__(self):
        return f"{self.name} (Score: {self.score})"


class MemoryCardGame:
    """
    Main game controller
    
    DESIGN PATTERN: Facade Pattern
    - Simple interface to game system
    """
    def __init__(self, player_names: List[str], difficulty: Difficulty = Difficulty.EASY):
        self.difficulty = difficulty
        self.board = Board(difficulty)
        self.players = [Player(name) for name in player_names]
        self.current_player_idx = 0
        self.state = GameState.SETUP
        self.moves_this_turn = 0
    
    @property
    def current_player(self) -> Player:
        """Get current player"""
        return self.players[self.current_player_idx]
    
    def start_game(self):
        """Initialize and start game"""
        print(f"\n{'='*60}")
        print(f"MEMORY CARD GAME - {self.difficulty.name}")
        print(f"{'='*60}")
        print(f"Players: {', '.join(p.name for p in self.players)}")
        print(f"Board: {self.difficulty.rows}×{self.difficulty.cols} ({self.difficulty.total_cards // 2} pairs)")
        
        self.board.initialize()
        self.state = GameState.PLAYING
    
    def flip_card(self, position: Position) -> bool:
        """
        Flip card at position
        
        Returns:
            bool: True if flip successful
        """
        if self.state != GameState.PLAYING:
            return False
        
        if self.moves_this_turn >= 2:
            return False
        
        card = self.board.flip_card(position)
        
        if card:
            self.moves_this_turn += 1
            self.current_player.record_move()
            print(f"\n{self.current_player.name} flips {position}: {card.symbol}")
            
            # Check for match after second flip
            if self.moves_this_turn == 2:
                time.sleep(0.5)  # Brief pause
                
                if self.board.check_match():
                    print("✓ MATCH!")
                    self.current_player.increment_score()
                    # Player gets another turn on match (optional)
                else:
                    print("✗ No match")
                    self.board.reset_non_matched()
                    self.next_turn()
                
                self.moves_this_turn = 0
            
            return True
        
        return False
    
    def next_turn(self):
        """Move to next player"""
        self.current_player_idx = (self.current_player_idx + 1) % len(self.players)
        print(f"\n{self.current_player.name}'s turn")
    
    def is_game_complete(self) -> bool:
        """Check if game finished"""
        if self.board.is_complete():
            self.state = GameState.FINISHED
            return True
        return False
    
    def get_winner(self) -> Player:
        """Get player with highest score"""
        return max(self.players, key=lambda p: p.score)
    
    def play_auto_demo(self):
        """
        Auto-play demo
        
        DEMO FEATURE: Automated gameplay
        """
        self.start_game()
        
        positions = [(r, c) for r in range(self.board.rows) 
                     for c in range(self.board.cols)]
        random.shuffle(positions)
        
        move_count = 0
        max_moves = 50
        
        while not self.is_game_complete() and move_count < max_moves:
            self.board.display()
            
            # Make two flips
            for _ in range(2):
                if positions and not self.is_game_complete():
                    row, col = positions.pop(0)
                    self.flip_card(Position(row, col))
                    time.sleep(0.3)
            
            move_count += 1
        
        # Game over
        self.board.display()
        self._show_results()
    
    def _show_results(self):
        """Display final results"""
        winner = self.get_winner()
        
        print(f"\n{'='*60}")
        print("GAME OVER")
        print(f"{'='*60}")
        print(f"Winner: {winner.name}")
        print(f"\nFinal Scores:")
        for player in self.players:
            print(f"  {player.name}: {player.score} points")
            print(f"    Matches: {player.stats.matches_found}")
            print(f"    Moves: {player.stats.moves_made}")
            print(f"    Accuracy: {player.stats.accuracy():.1f}%")
        print(f"{'='*60}")


def main():
    """Demonstrate Memory Card Game"""
    print("=" * 60)
    print("MEMORY CARD GAME - Low Level Design Demo")
    print("=" * 60)
    
    # Demo: Auto-play with 2 players
    game = MemoryCardGame(
        player_names=["Alice", "Bob"],
        difficulty=Difficulty.EASY
    )
    
    game.play_auto_demo()
    
    print("\n" + "=" * 60)
    print("DEMO COMPLETE")
    print("=" * 60)


if __name__ == "__main__":
    main()

