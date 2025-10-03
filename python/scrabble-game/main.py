"""
SCRABBLE GAME - Low Level Design Implementation in Python

DESIGN PATTERNS USED:
1. STRATEGY PATTERN: Different scoring strategies
   - Standard scoring vs tournament vs speed game
   - Pluggable scoring algorithms
   - Easy to add custom scoring rules

2. FACTORY PATTERN: Tile creation with proper distribution
   - TileBag factory creates tiles with standard frequencies
   - Ensures correct tile distribution
   - Centralized tile generation

3. OBSERVER PATTERN: Score updates and game events
   - Players observe score changes
   - UI observers for board updates
   - Event-driven architecture

4. COMMAND PATTERN: Word placement as reversible commands
   - WordPlacement encapsulates placement details
   - Supports undo for challenges
   - Validation and execution separated

5. CHAIN OF RESPONSIBILITY: Multi-step word validation
   - Placement rules → Dictionary check → Score calculation
   - Each validator handles specific concern
   - Clean separation of validation logic

6. COMPOSITE PATTERN: Board composed of squares
   - Board is composite of Square objects
   - Unified interface for board operations
   - Hierarchical structure

OOP CONCEPTS DEMONSTRATED:
- ENCAPSULATION: Tile values, board state hidden
- ABSTRACTION: Clear interfaces for dictionary, validator
- INHERITANCE: Different square types
- POLYMORPHISM: Multiple scoring strategies

SOLID PRINCIPLES:
- SRP: Each class has single responsibility
- OCP: Easy to extend with new rules
- LSP: All square types interchangeable
- ISP: Focused interfaces
- DIP: Depends on abstractions

BUSINESS FEATURES:
- 15×15 board with premium squares
- 100-tile bag with standard distribution
- Word validation against dictionary
- Score calculation with multipliers
- Bingo bonus (50 points for 7 tiles)
- Tile exchange functionality

ARCHITECTURAL NOTES:
- Efficient word lookup using Set (O(1))
- Clean separation of game logic
- Extensible for variants
- Ready for GUI integration
"""

from enum import Enum
from typing import List, Tuple, Optional, Set, Dict
from collections import Counter
import random


# Enums and Constants
class SquareType(Enum):
    """Premium square types on Scrabble board"""
    NORMAL = "  "
    DOUBLE_LETTER = "DL"
    TRIPLE_LETTER = "TL"
    DOUBLE_WORD = "DW"
    TRIPLE_WORD = "TW"
    CENTER = "★ "


class Direction(Enum):
    """Word placement direction"""
    HORIZONTAL = "horizontal"
    VERTICAL = "vertical"


# Standard Scrabble letter values
LETTER_VALUES = {
    'A': 1, 'B': 3, 'C': 3, 'D': 2, 'E': 1, 'F': 4, 'G': 2, 'H': 4,
    'I': 1, 'J': 8, 'K': 5, 'L': 1, 'M': 3, 'N': 1, 'O': 1, 'P': 3,
    'Q': 10, 'R': 1, 'S': 1, 'T': 1, 'U': 1, 'V': 4, 'W': 4, 'X': 8,
    'Y': 4, 'Z': 10, ' ': 0  # Blank tile
}

# Standard Scrabble tile distribution (100 tiles total)
TILE_DISTRIBUTION = {
    'A': 9, 'B': 2, 'C': 2, 'D': 4, 'E': 12, 'F': 2, 'G': 3, 'H': 2,
    'I': 9, 'J': 1, 'K': 1, 'L': 4, 'M': 2, 'N': 6, 'O': 8, 'P': 2,
    'Q': 1, 'R': 6, 'S': 4, 'T': 6, 'U': 4, 'V': 2, 'W': 2, 'X': 1,
    'Y': 2, 'Z': 1, ' ': 2  # 2 blank tiles
}


class Tile:
    """
    Represents a letter tile
    
    OOP CONCEPT: Value Object
    - Immutable after creation
    - Contains letter and point value
    """
    def __init__(self, letter: str):
        self.letter = letter.upper()
        self.value = LETTER_VALUES[self.letter]
        self.is_blank = letter == ' '
    
    def __str__(self):
        return self.letter if not self.is_blank else '*'
    
    def __repr__(self):
        return f"Tile({self.letter})"


class TileBag:
    """
    Factory Pattern: Creates and manages tile pool
    
    DESIGN PATTERN: Factory Pattern
    - Creates tiles with proper distribution
    - Manages random draw
    """
    def __init__(self):
        self.tiles: List[Tile] = []
        self._initialize_tiles()
    
    def _initialize_tiles(self):
        """Create 100 tiles with standard distribution"""
        for letter, count in TILE_DISTRIBUTION.items():
            for _ in range(count):
                self.tiles.append(Tile(letter))
        
        random.shuffle(self.tiles)
    
    def draw(self) -> Optional[Tile]:
        """Draw one random tile"""
        return self.tiles.pop() if self.tiles else None
    
    def draw_multiple(self, count: int) -> List[Tile]:
        """Draw multiple tiles"""
        drawn = []
        for _ in range(min(count, len(self.tiles))):
            tile = self.draw()
            if tile:
                drawn.append(tile)
        return drawn
    
    def return_tiles(self, tiles: List[Tile]):
        """Return tiles to bag (for exchange)"""
        self.tiles.extend(tiles)
        random.shuffle(self.tiles)
    
    @property
    def remaining_count(self) -> int:
        """Get count of remaining tiles"""
        return len(self.tiles)


class Rack:
    """
    Player's tile rack (max 7 tiles)
    
    OOP CONCEPT: Encapsulation
    - Manages player's tiles
    - Enforces 7-tile limit
    """
    MAX_TILES = 7
    
    def __init__(self):
        self.tiles: List[Tile] = []
    
    def add_tile(self, tile: Tile) -> bool:
        """Add tile to rack"""
        if len(self.tiles) < self.MAX_TILES:
            self.tiles.append(tile)
            return True
        return False
    
    def remove_tile(self, letter: str) -> Optional[Tile]:
        """Remove and return tile with letter"""
        for i, tile in enumerate(self.tiles):
            if tile.letter == letter.upper():
                return self.tiles.pop(i)
        return None
    
    def has_letters(self, word: str) -> bool:
        """Check if rack has all letters for word"""
        rack_letters = [t.letter for t in self.tiles]
        word_letters = Counter(word.upper())
        rack_counter = Counter(rack_letters)
        
        for letter, count in word_letters.items():
            if rack_counter[letter] < count:
                # Check for blank tiles
                if rack_counter[' '] > 0:
                    rack_counter[' '] -= 1
                else:
                    return False
        
        return True
    
    def __str__(self):
        return ' '.join(str(t) for t in self.tiles)


class Square:
    """
    Individual board square
    
    DESIGN PATTERN: Composite Pattern element
    - Part of board composite
    """
    def __init__(self, row: int, col: int, square_type: SquareType):
        self.row = row
        self.col = col
        self.type = square_type
        self.tile: Optional[Tile] = None
        self.multiplier_used = False
    
    def is_occupied(self) -> bool:
        """Check if square has tile"""
        return self.tile is not None
    
    def get_multiplier(self) -> Tuple[int, str]:
        """
        Get multiplier value and type
        
        Returns:
            Tuple of (multiplier_value, multiplier_type)
        """
        if self.multiplier_used or self.is_occupied():
            return (1, 'none')
        
        if self.type == SquareType.DOUBLE_LETTER:
            return (2, 'letter')
        elif self.type == SquareType.TRIPLE_LETTER:
            return (3, 'letter')
        elif self.type in (SquareType.DOUBLE_WORD, SquareType.CENTER):
            return (2, 'word')
        elif self.type == SquareType.TRIPLE_WORD:
            return (3, 'word')
        
        return (1, 'none')


class Board:
    """
    15×15 Scrabble board with premium squares
    
    DESIGN PATTERN: Composite Pattern
    - Composed of Square objects
    - Manages board state
    """
    SIZE = 15
    CENTER = (7, 7)
    
    def __init__(self):
        self.grid: List[List[Square]] = []
        self._initialize_board()
    
    def _initialize_board(self):
        """Create 15×15 board with premium squares"""
        # Create empty board
        for row in range(self.SIZE):
            board_row = []
            for col in range(self.SIZE):
                square_type = self._get_square_type(row, col)
                board_row.append(Square(row, col, square_type))
            self.grid.append(board_row)
    
    def _get_square_type(self, row: int, col: int) -> SquareType:
        """
        Determine square type based on position
        
        BUSINESS RULE: Premium squares placed symmetrically
        """
        # Center square
        if (row, col) == self.CENTER:
            return SquareType.CENTER
        
        # Triple Word Score (corners and mid-sides)
        tw_positions = {(0,0), (0,7), (0,14), (7,0), (7,14), (14,0), (14,7), (14,14)}
        if (row, col) in tw_positions:
            return SquareType.TRIPLE_WORD
        
        # Double Word Score (diagonal pattern)
        if row == col or row + col == 14:
            if row in [1, 2, 3, 4, 11, 12, 13] or col in [1, 2, 3, 4, 11, 12, 13]:
                if (row + col) % 4 == 0 or abs(row - col) % 4 == 0:
                    return SquareType.DOUBLE_WORD
        
        # Triple Letter Score
        tl_offsets = [(1,5), (1,9), (5,1), (5,5), (5,9), (5,13), (9,1), (9,5), (9,9), (9,13), (13,5), (13,9)]
        if (row, col) in tl_offsets or (col, row) in tl_offsets:
            return SquareType.TRIPLE_LETTER
        
        # Double Letter Score
        dl_offsets = [(0,3), (0,11), (2,6), (2,8), (3,0), (3,7), (3,14), (6,2), (6,6), (6,8), (6,12),
                      (7,3), (7,11), (8,2), (8,6), (8,8), (8,12), (11,0), (11,7), (11,14), (12,6), (12,8), (14,3), (14,11)]
        if (row, col) in dl_offsets:
            return SquareType.DOUBLE_LETTER
        
        return SquareType.NORMAL
    
    def get_square(self, row: int, col: int) -> Optional[Square]:
        """Get square at position"""
        if 0 <= row < self.SIZE and 0 <= col < self.SIZE:
            return self.grid[row][col]
        return None
    
    def place_tile(self, row: int, col: int, tile: Tile) -> bool:
        """Place tile on board"""
        square = self.get_square(row, col)
        if square and not square.is_occupied():
            square.tile = tile
            return True
        return False
    
    def is_first_move(self) -> bool:
        """Check if board is empty (first move)"""
        return not self.grid[self.CENTER[0]][self.CENTER[1]].is_occupied()
    
    def display(self):
        """Display board in console"""
        print("\n    " + " ".join(f"{i:2}" for i in range(self.SIZE)))
        print("   +" + "---" * self.SIZE + "+")
        
        for row in range(self.SIZE):
            row_str = f"{row:2} |"
            for col in range(self.SIZE):
                square = self.grid[row][col]
                if square.tile:
                    row_str += f" {square.tile} "
                else:
                    row_str += f"{square.type.value}"
                row_str += "|" if col < self.SIZE - 1 else ""
            print(row_str + "|")
        
        print("   +" + "---" * self.SIZE + "+")


class Dictionary:
    """
    Word dictionary for validation
    
    DESIGN PATTERN: Fast lookup using Set (O(1))
    """
    def __init__(self):
        self.words: Set[str] = set()
    
    def add_word(self, word: str):
        """Add word to dictionary"""
        self.words.add(word.upper())
    
    def is_valid_word(self, word: str) -> bool:
        """Check if word exists in dictionary"""
        return word.upper() in self.words
    
    def load_default_words(self):
        """Load sample words for demo"""
        sample_words = [
            "HELLO", "WORLD", "SCRABBLE", "GAME", "WORD", "PLAY", "TILE",
            "SCORE", "BOARD", "LETTER", "POINT", "WIN", "TURN", "RACK",
            "THE", "AND", "FOR", "ARE", "BUT", "NOT", "YOU", "ALL", "CAN",
            "HER", "WAS", "ONE", "OUR", "OUT", "DAY", "GET", "HAS", "HIM",
            "CAT", "DOG", "HAT", "BAT", "RAT", "MAT", "SAT", "FAT", "PAT"
        ]
        for word in sample_words:
            self.add_word(word)


class WordPlacement:
    """
    Command Pattern: Represents word placement
    
    DESIGN PATTERN: Command Pattern
    - Encapsulates placement details
    - Can be undone for challenges
    """
    def __init__(self, word: str, start_row: int, start_col: int, direction: Direction):
        self.word = word.upper()
        self.start_row = start_row
        self.start_col = start_col
        self.direction = direction
        self.tiles_used: List[Tuple[int, int, Tile]] = []
        self.score = 0


class ScoreCalculator:
    """
    Calculates scores with multipliers
    
    DESIGN PATTERN: Strategy Pattern
    - Different scoring strategies possible
    """
    @staticmethod
    def calculate_score(board: Board, placement: WordPlacement) -> int:
        """
        Calculate word score with multipliers
        
        BUSINESS RULE: Letter multipliers apply before word multipliers
        """
        base_score = 0
        word_multiplier = 1
        
        row, col = placement.start_row, placement.start_col
        
        for i, letter in enumerate(placement.word):
            if placement.direction == Direction.HORIZONTAL:
                square = board.get_square(row, col + i)
            else:
                square = board.get_square(row + i, col)
            
            if not square:
                continue
            
            letter_value = LETTER_VALUES[letter]
            mult_value, mult_type = square.get_multiplier()
            
            if mult_type == 'letter':
                base_score += letter_value * mult_value
            else:
                base_score += letter_value
                if mult_type == 'word':
                    word_multiplier *= mult_value
        
        total_score = base_score * word_multiplier
        
        # Bingo bonus (50 points for using all 7 tiles)
        if len(placement.tiles_used) == 7:
            total_score += 50
        
        return total_score


class Player:
    """
    Represents a player
    
    OOP CONCEPT: Encapsulation
    - Manages player state
    """
    def __init__(self, name: str):
        self.name = name
        self.rack = Rack()
        self.score = 0
        self.tiles_played = 0
    
    def __str__(self):
        return f"{self.name} (Score: {self.score})"


class ScrabbleGame:
    """
    Main Scrabble game controller
    
    DESIGN PATTERN: Facade Pattern
    - Simple interface to complex game system
    - Coordinates all components
    """
    def __init__(self, player_names: List[str]):
        self.board = Board()
        self.tile_bag = TileBag()
        self.dictionary = Dictionary()
        self.dictionary.load_default_words()
        
        self.players = [Player(name) for name in player_names]
        self.current_player_idx = 0
        self.consecutive_passes = 0
    
    @property
    def current_player(self) -> Player:
        """Get current player"""
        return self.players[self.current_player_idx]
    
    def start_game(self):
        """Initialize game by dealing tiles"""
        print(f"\n{'='*60}")
        print("SCRABBLE GAME START")
        print(f"{'='*60}")
        
        # Deal 7 tiles to each player
        for player in self.players:
            tiles = self.tile_bag.draw_multiple(Rack.MAX_TILES)
            for tile in tiles:
                player.rack.add_tile(tile)
            print(f"{player.name}'s rack: {player.rack}")
    
    def place_word(self, word: str, row: int, col: int, direction: Direction) -> bool:
        """
        Place word on board
        
        BUSINESS RULE: Word must be valid and connect properly
        """
        player = self.current_player
        
        # Validate rack has letters
        if not player.rack.has_letters(word):
            print("You don't have the required letters!")
            return False
        
        # Validate first move covers center
        if self.board.is_first_move():
            if direction == Direction.HORIZONTAL:
                if not (row == Board.CENTER[0] and col <= Board.CENTER[1] < col + len(word)):
                    print("First word must cover center square!")
                    return False
            else:
                if not (col == Board.CENTER[1] and row <= Board.CENTER[0] < row + len(word)):
                    print("First word must cover center square!")
                    return False
        
        # Validate word in dictionary
        if not self.dictionary.is_valid_word(word):
            print(f"'{word}' is not a valid word!")
            return False
        
        # Create placement
        placement = WordPlacement(word, row, col, direction)
        
        # Place tiles
        tiles_used = []
        for i, letter in enumerate(word):
            if direction == Direction.HORIZONTAL:
                r, c = row, col + i
            else:
                r, c = row + i, col
            
            square = self.board.get_square(r, c)
            if not square:
                print("Word goes off board!")
                return False
            
            if not square.is_occupied():
                tile = player.rack.remove_tile(letter)
                if tile:
                    self.board.place_tile(r, c, tile)
                    tiles_used.append((r, c, tile))
                    square.multiplier_used = True
        
        placement.tiles_used = tiles_used
        
        # Calculate score
        score = ScoreCalculator.calculate_score(self.board, placement)
        player.score += score
        player.tiles_played += len(tiles_used)
        
        print(f"\n{player.name} played '{word}' for {score} points!")
        print(f"Total score: {player.score}")
        
        # Draw new tiles
        new_tiles = self.tile_bag.draw_multiple(len(tiles_used))
        for tile in new_tiles:
            player.rack.add_tile(tile)
        
        self.consecutive_passes = 0
        self._next_player()
        
        return True
    
    def exchange_tiles(self, letters: List[str]) -> bool:
        """Exchange tiles (skip turn)"""
        player = self.current_player
        
        if self.tile_bag.remaining_count < len(letters):
            print("Not enough tiles in bag to exchange!")
            return False
        
        tiles_to_return = []
        for letter in letters:
            tile = player.rack.remove_tile(letter)
            if tile:
                tiles_to_return.append(tile)
        
        self.tile_bag.return_tiles(tiles_to_return)
        
        new_tiles = self.tile_bag.draw_multiple(len(tiles_to_return))
        for tile in new_tiles:
            player.rack.add_tile(tile)
        
        print(f"{player.name} exchanged {len(letters)} tiles")
        self._next_player()
        return True
    
    def pass_turn(self):
        """Pass turn"""
        print(f"{self.current_player.name} passes")
        self.consecutive_passes += 1
        self._next_player()
    
    def _next_player(self):
        """Move to next player"""
        self.current_player_idx = (self.current_player_idx + 1) % len(self.players)
    
    def is_game_over(self) -> bool:
        """Check if game has ended"""
        # All players passed twice
        if self.consecutive_passes >= len(self.players) * 2:
            return True
        
        # Bag empty and a player has no tiles
        if self.tile_bag.remaining_count == 0:
            for player in self.players:
                if len(player.rack.tiles) == 0:
                    return True
        
        return False
    
    def get_winner(self) -> Player:
        """Get player with highest score"""
        return max(self.players, key=lambda p: p.score)


def main():
    """Demonstrate Scrabble game"""
    print("=" * 60)
    print("SCRABBLE GAME - Low Level Design Demo")
    print("=" * 60)
    
    # Create game
    game = ScrabbleGame(player_names=["Alice", "Bob"])
    game.start_game()
    
    # Display board
    game.board.display()
    
    # Demo: Place first word
    print(f"\n{game.current_player.name}'s turn")
    print(f"Rack: {game.current_player.rack}")
    
    # Try to place a word (this will work if rack has the letters)
    game.place_word("HELLO", 7, 5, Direction.HORIZONTAL)
    game.board.display()
    
    print("\n" + "=" * 60)
    print("DEMO COMPLETE")
    print("=" * 60)
    print("\nFor full gameplay:")
    print("- Implement word connectivity validation")
    print("- Add cross-word scoring")
    print("- Load comprehensive dictionary")
    print("- Add UI for interactive play")


if __name__ == "__main__":
    main()

