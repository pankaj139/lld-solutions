"""
SCRABBLE GAME SYSTEM - Low Level Design Implementation in Python

DESIGN PATTERNS USED:
1. STRATEGY PATTERN: Word validation and scoring algorithms
   - Dictionary implementations: in-memory, database, API-based
   - Scoring strategies: standard, double letter/word scores, bonus multipliers
   - AI strategies: conservative (high-scoring safe words), aggressive (risk-taking)
   - Tile placement strategies: maximize points, block opponents, maintain good rack

2. STATE PATTERN: Game flow with proper turn management
   - Game states: WAITING -> SETUP -> PLAYING -> PAUSED -> FINISHED
   - Turn states: PLACING_TILES -> CONFIRMING_WORD -> EXCHANGING_TILES -> TURN_COMPLETE
   - Player states: ACTIVE -> THINKING -> CHALLENGING -> SKIPPING
   - Proper state transitions ensure fair gameplay

3. COMMAND PATTERN: Player moves as reversible commands
   - Tile placement commands with position validation
   - Word formation commands with score calculation
   - Tile exchange commands with bag management
   - Challenge commands with word verification
   - Undo support for practice mode and correction

4. OBSERVER PATTERN: Game event broadcasting
   - Score updates and leaderboard changes
   - Turn notifications and time limit warnings
   - Board state changes and new word formations
   - Game completion and winner announcements

5. FACTORY PATTERN: Game component creation
   - Tile bag creation with proper letter distribution
   - Board creation with premium square layouts
   - Player creation for different types (human, AI, online)
   - Dictionary factory for different languages and rule sets

6. COMPOSITE PATTERN: Board structure with squares
   - Board composed of Square objects
   - Premium squares (double letter, triple word, etc.)
   - Word formation from connected letter tiles
   - Complex board patterns built from simple components

OOP CONCEPTS DEMONSTRATED:
- INHERITANCE: Tile types and square specialization
- ENCAPSULATION: Hidden tile bag contents and player racks
- ABSTRACTION: Complex word validation abstracted to simple interface
- POLYMORPHISM: Different player types and AI levels handled uniformly

SOLID PRINCIPLES:
- SRP: Each class has single responsibility (Board, TileBag, WordValidator, ScoreCalculator)
- OCP: Easy to add new languages, premium squares, and game variants
- LSP: All player types and dictionary implementations interchangeable
- ISP: Focused interfaces for different game aspects
- DIP: Game logic depends on abstractions, not concrete implementations

BUSINESS FEATURES:
- Standard Scrabble rules with authentic tile distribution
- Premium squares: double/triple letter and word scores
- Word challenges and dictionary validation
- Multiplayer support with turn management
- AI opponents with configurable difficulty levels
- Comprehensive scoring with bonus calculations

ARCHITECTURAL NOTES:
- Immutable tile and move representations for consistency
- Event-driven updates for real-time multiplayer
- Pluggable dictionary system for internationalization
- Scalable design for tournament play
- Integration points for online dictionaries and anti-cheating
"""

from abc import ABC, abstractmethod
from enum import Enum
from typing import List, Dict, Optional, Tuple, Set
from dataclasses import dataclass
import random
import uuid

class TileType(Enum):
    LETTER = "LETTER"
    BLANK = "BLANK"

class SquareType(Enum):
    NORMAL = "NORMAL"
    DOUBLE_LETTER = "DL"
    TRIPLE_LETTER = "TL"
    DOUBLE_WORD = "DW"
    TRIPLE_WORD = "TW"
    START = "START"

class GameState(Enum):
    WAITING = "WAITING"
    SETUP = "SETUP"
    PLAYING = "PLAYING"
    PAUSED = "PAUSED"
    FINISHED = "FINISHED"

class TurnState(Enum):
    PLACING_TILES = "PLACING_TILES"
    CONFIRMING_WORD = "CONFIRMING_WORD"
    EXCHANGING_TILES = "EXCHANGING_TILES"
    TURN_COMPLETE = "TURN_COMPLETE"

class Direction(Enum):
    HORIZONTAL = "HORIZONTAL"
    VERTICAL = "VERTICAL"

# VALUE OBJECT: Scrabble tile with letter and points
@dataclass(frozen=True)
class Tile:
    letter: str
    points: int
    tile_type: TileType = TileType.LETTER
    is_played: bool = False
    
    def __str__(self):
        return f"{self.letter}({self.points})"

# VALUE OBJECT: Board position
@dataclass(frozen=True)
class Position:
    row: int
    col: int
    
    def __add__(self, direction_offset):
        return Position(self.row + direction_offset[0], self.col + direction_offset[1])

# VALUE OBJECT: Word placement on board
@dataclass(frozen=True)
class WordPlacement:
    word: str
    start_position: Position
    direction: Direction
    tiles_used: List[Tuple[Position, Tile]]
    score: int

# ENTITY: Board square with premium multipliers
class Square:
    def __init__(self, square_type: SquareType = SquareType.NORMAL):
        self.square_type = square_type
        self.tile: Optional[Tile] = None
        self.is_premium_used = False
    
    def place_tile(self, tile: Tile) -> bool:
        """Place tile on square if empty"""
        if self.tile is None:
            self.tile = tile
            return True
        return False
    
    def remove_tile(self) -> Optional[Tile]:
        """Remove and return tile from square"""
        tile = self.tile
        self.tile = None
        return tile
    
    def get_letter_multiplier(self) -> int:
        """Get letter score multiplier"""
        if self.is_premium_used:
            return 1
        
        if self.square_type == SquareType.DOUBLE_LETTER:
            return 2
        elif self.square_type == SquareType.TRIPLE_LETTER:
            return 3
        return 1
    
    def get_word_multiplier(self) -> int:
        """Get word score multiplier"""
        if self.is_premium_used:
            return 1
        
        if self.square_type in [SquareType.DOUBLE_WORD, SquareType.START]:
            return 2
        elif self.square_type == SquareType.TRIPLE_WORD:
            return 3
        return 1
    
    def use_premium(self):
        """Mark premium square as used"""
        self.is_premium_used = True

# AGGREGATE: Scrabble board with 15x15 grid
class Board:
    def __init__(self):
        self.size = 15
        self.squares = [[Square() for _ in range(self.size)] for _ in range(self.size)]
        self._setup_premium_squares()
        self.center_position = Position(7, 7)
    
    def _setup_premium_squares(self):
        """Set up premium squares according to standard Scrabble layout"""
        # Triple word scores
        triple_word_positions = [
            (0, 0), (0, 7), (0, 14),
            (7, 0), (7, 14),
            (14, 0), (14, 7), (14, 14)
        ]
        
        # Double word scores
        double_word_positions = [
            (1, 1), (2, 2), (3, 3), (4, 4),
            (1, 13), (2, 12), (3, 11), (4, 10),
            (13, 1), (12, 2), (11, 3), (10, 4),
            (13, 13), (12, 12), (11, 11), (10, 10)
        ]
        
        # Triple letter scores
        triple_letter_positions = [
            (1, 5), (1, 9), (5, 1), (5, 5), (5, 9), (5, 13),
            (9, 1), (9, 5), (9, 9), (9, 13), (13, 5), (13, 9)
        ]
        
        # Double letter scores
        double_letter_positions = [
            (0, 3), (0, 11), (2, 6), (2, 8), (3, 0), (3, 7), (3, 14),
            (6, 2), (6, 6), (6, 8), (6, 12), (7, 3), (7, 11),
            (8, 2), (8, 6), (8, 8), (8, 12), (11, 0), (11, 7), (11, 14),
            (12, 6), (12, 8), (14, 3), (14, 11)
        ]
        
        # Set square types
        for row, col in triple_word_positions:
            self.squares[row][col] = Square(SquareType.TRIPLE_WORD)
        
        for row, col in double_word_positions:
            self.squares[row][col] = Square(SquareType.DOUBLE_WORD)
        
        for row, col in triple_letter_positions:
            self.squares[row][col] = Square(SquareType.TRIPLE_LETTER)
        
        for row, col in double_letter_positions:
            self.squares[row][col] = Square(SquareType.DOUBLE_LETTER)
        
        # Center square (start)
        self.squares[7][7] = Square(SquareType.START)
    
    def is_valid_position(self, position: Position) -> bool:
        """Check if position is within board bounds"""
        return 0 <= position.row < self.size and 0 <= position.col < self.size
    
    def get_square(self, position: Position) -> Optional[Square]:
        """Get square at position"""
        if self.is_valid_position(position):
            return self.squares[position.row][position.col]
        return None
    
    def place_tile(self, position: Position, tile: Tile) -> bool:
        """Place tile at position"""
        square = self.get_square(position)
        if square and square.place_tile(tile):
            return True
        return False
    
    def get_tile(self, position: Position) -> Optional[Tile]:
        """Get tile at position"""
        square = self.get_square(position)
        return square.tile if square else None
    
    def is_empty(self) -> bool:
        """Check if board is empty"""
        for row in self.squares:
            for square in row:
                if square.tile is not None:
                    return False
        return True
    
    def get_connected_words(self, placed_positions: List[Position]) -> List[WordPlacement]:
        """Get all words formed by placing tiles at positions"""
        words = []
        
        # Check main word
        if len(placed_positions) > 1:
            # Sort positions to determine direction
            sorted_positions = sorted(placed_positions, key=lambda p: (p.row, p.col))
            
            if all(p.row == sorted_positions[0].row for p in sorted_positions):
                # Horizontal word
                word, start_pos = self._get_word_at_position(sorted_positions[0], Direction.HORIZONTAL)
                if len(word) > 1:
                    score = self._calculate_word_score(word, start_pos, Direction.HORIZONTAL, placed_positions)
                    tiles_used = [(pos, self.get_tile(pos)) for pos in placed_positions]
                    words.append(WordPlacement(word, start_pos, Direction.HORIZONTAL, tiles_used, score))
            elif all(p.col == sorted_positions[0].col for p in sorted_positions):
                # Vertical word
                word, start_pos = self._get_word_at_position(sorted_positions[0], Direction.VERTICAL)
                if len(word) > 1:
                    score = self._calculate_word_score(word, start_pos, Direction.VERTICAL, placed_positions)
                    tiles_used = [(pos, self.get_tile(pos)) for pos in placed_positions]
                    words.append(WordPlacement(word, start_pos, Direction.VERTICAL, tiles_used, score))
        
        # Check perpendicular words formed by each placed tile
        for position in placed_positions:
            for direction in Direction:
                word, start_pos = self._get_word_at_position(position, direction)
                if len(word) > 1:
                    # Only count if it's a new word (not the main word)
                    is_new_word = True
                    for existing_word in words:
                        if (existing_word.start_position == start_pos and 
                            existing_word.direction == direction):
                            is_new_word = False
                            break
                    
                    if is_new_word:
                        score = self._calculate_word_score(word, start_pos, direction, [position])
                        tiles_used = [(position, self.get_tile(position))]
                        words.append(WordPlacement(word, start_pos, direction, tiles_used, score))
        
        return words
    
    def _get_word_at_position(self, position: Position, direction: Direction) -> Tuple[str, Position]:
        """Get complete word containing the position in given direction"""
        direction_offset = (0, 1) if direction == Direction.HORIZONTAL else (1, 0)
        
        # Find start of word
        start_pos = position
        while True:
            prev_pos = Position(start_pos.row - direction_offset[0], 
                              start_pos.col - direction_offset[1])
            if (self.is_valid_position(prev_pos) and 
                self.get_tile(prev_pos) is not None):
                start_pos = prev_pos
            else:
                break
        
        # Build word from start position
        word = ""
        current_pos = start_pos
        while (self.is_valid_position(current_pos) and 
               self.get_tile(current_pos) is not None):
            tile = self.get_tile(current_pos)
            word += tile.letter
            current_pos = current_pos + direction_offset
        
        return word, start_pos
    
    def _calculate_word_score(self, word: str, start_position: Position, 
                            direction: Direction, new_positions: List[Position]) -> int:
        """Calculate score for a word"""
        direction_offset = (0, 1) if direction == Direction.HORIZONTAL else (1, 0)
        
        letter_score = 0
        word_multiplier = 1
        current_pos = start_position
        
        for letter in word:
            tile = self.get_tile(current_pos)
            square = self.get_square(current_pos)
            
            # Base tile points
            tile_points = tile.points
            
            # Apply letter multiplier if this is a newly placed tile
            if current_pos in new_positions:
                tile_points *= square.get_letter_multiplier()
                word_multiplier *= square.get_word_multiplier()
            
            letter_score += tile_points
            current_pos = current_pos + direction_offset
        
        return letter_score * word_multiplier

# FACTORY PATTERN: Tile bag creation
class TileBag:
    def __init__(self):
        self.tiles: List[Tile] = []
        self._create_standard_tiles()
        self.shuffle()
    
    def _create_standard_tiles(self):
        """Create standard Scrabble tile distribution"""
        tile_distribution = {
            'A': (1, 9), 'B': (3, 2), 'C': (3, 2), 'D': (2, 4), 'E': (1, 12),
            'F': (4, 2), 'G': (2, 3), 'H': (4, 2), 'I': (1, 9), 'J': (8, 1),
            'K': (5, 1), 'L': (1, 4), 'M': (3, 2), 'N': (1, 6), 'O': (1, 8),
            'P': (3, 2), 'Q': (10, 1), 'R': (1, 6), 'S': (1, 4), 'T': (1, 6),
            'U': (1, 4), 'V': (4, 2), 'W': (4, 2), 'X': (8, 1), 'Y': (4, 2),
            'Z': (10, 1)
        }
        
        self.tiles = []
        for letter, (points, count) in tile_distribution.items():
            for _ in range(count):
                self.tiles.append(Tile(letter, points))
        
        # Add blank tiles
        for _ in range(2):
            self.tiles.append(Tile('', 0, TileType.BLANK))
    
    def shuffle(self):
        """Shuffle the tile bag"""
        random.shuffle(self.tiles)
    
    def draw_tiles(self, count: int) -> List[Tile]:
        """Draw specified number of tiles from bag"""
        drawn = []
        for _ in range(min(count, len(self.tiles))):
            drawn.append(self.tiles.pop())
        return drawn
    
    def return_tiles(self, tiles: List[Tile]):
        """Return tiles to bag and shuffle"""
        self.tiles.extend(tiles)
        self.shuffle()
    
    def tiles_remaining(self) -> int:
        """Get number of tiles remaining"""
        return len(self.tiles)

# STRATEGY PATTERN: Word validation
class WordValidator(ABC):
    @abstractmethod
    def is_valid_word(self, word: str) -> bool:
        pass

class InMemoryDictionary(WordValidator):
    def __init__(self):
        # Simple word list for demo
        self.words = {
            'CAT', 'DOG', 'BIRD', 'FISH', 'HORSE', 'MOUSE', 'ELEPHANT',
            'TIGER', 'LION', 'BEAR', 'WOLF', 'FOX', 'RABBIT', 'DEER',
            'SCRABBLE', 'WORD', 'GAME', 'PLAY', 'SCORE', 'TILE', 'BOARD',
            'LETTER', 'POINT', 'CHALLENGE', 'DICTIONARY', 'VALID'
        }
    
    def is_valid_word(self, word: str) -> bool:
        return word.upper() in self.words

# COMMAND PATTERN: Player moves
class GameMove:
    def __init__(self, player_id: str):
        self.move_id = str(uuid.uuid4())
        self.player_id = player_id

class PlaceTilesMove(GameMove):
    def __init__(self, player_id: str, placements: List[Tuple[Position, Tile]]):
        super().__init__(player_id)
        self.placements = placements

class ExchangeTilesMove(GameMove):
    def __init__(self, player_id: str, tiles_to_exchange: List[Tile]):
        super().__init__(player_id)
        self.tiles_to_exchange = tiles_to_exchange

class ChallengeMove(GameMove):
    def __init__(self, player_id: str, challenged_word: str):
        super().__init__(player_id)
        self.challenged_word = challenged_word

# ENTITY: Scrabble player
class Player:
    def __init__(self, player_id: str, name: str):
        self.player_id = player_id
        self.name = name
        self.score = 0
        self.rack: List[Tile] = []
        self.max_rack_size = 7
    
    def add_tiles(self, tiles: List[Tile]):
        """Add tiles to player's rack"""
        for tile in tiles:
            if len(self.rack) < self.max_rack_size:
                self.rack.append(tile)
    
    def remove_tiles(self, tiles: List[Tile]) -> bool:
        """Remove tiles from rack if they exist"""
        for tile in tiles:
            if tile in self.rack:
                self.rack.remove(tile)
            else:
                return False
        return True
    
    def add_score(self, points: int):
        """Add points to player's score"""
        self.score += points
    
    def get_rack_size(self) -> int:
        """Get current number of tiles in rack"""
        return len(self.rack)

# OBSERVER PATTERN: Game event notifications
class ScrabbleGameObserver(ABC):
    @abstractmethod
    def notify_move(self, player: Player, move: GameMove, words_formed: List[WordPlacement]):
        pass
    
    @abstractmethod
    def notify_score_update(self, player: Player, points_earned: int):
        pass
    
    @abstractmethod
    def notify_game_end(self, winner: Player, final_scores: Dict[str, int]):
        pass

class ConsoleScrabbleObserver(ScrabbleGameObserver):
    def notify_move(self, player: Player, move: GameMove, words_formed: List[WordPlacement]):
        print(f"{player.name} played:")
        for word_placement in words_formed:
            print(f"  {word_placement.word} for {word_placement.score} points")
    
    def notify_score_update(self, player: Player, points_earned: int):
        print(f"{player.name} earned {points_earned} points (Total: {player.score})")
    
    def notify_game_end(self, winner: Player, final_scores: Dict[str, int]):
        print(f"\n=== GAME OVER ===")
        print(f"Winner: {winner.name} with {winner.score} points!")
        print("Final Scores:")
        for name, score in sorted(final_scores.items(), key=lambda x: x[1], reverse=True):
            print(f"  {name}: {score}")

# FACADE: Scrabble game management
class ScrabbleGame:
    def __init__(self):
        self.game_id = str(uuid.uuid4())
        self.board = Board()
        self.tile_bag = TileBag()
        self.players: List[Player] = []
        self.current_player_index = 0
        self.word_validator = InMemoryDictionary()
        self.game_state = GameState.WAITING
        self.turn_state = TurnState.PLACING_TILES
        self.observers: List[ScrabbleGameObserver] = []
        self.move_history: List[GameMove] = []
        self.passes_in_a_row = 0
        self.max_passes = 6  # Game ends after 6 consecutive passes
    
    def add_observer(self, observer: ScrabbleGameObserver):
        """Add game observer"""
        self.observers.append(observer)
    
    def add_player(self, player: Player):
        """Add player to game"""
        if len(self.players) < 4:  # Max 4 players
            self.players.append(player)
            return True
        return False
    
    def start_game(self):
        """Start the game"""
        if len(self.players) < 2:
            return False
        
        # Deal initial tiles to each player
        for player in self.players:
            tiles = self.tile_bag.draw_tiles(7)
            player.add_tiles(tiles)
        
        self.game_state = GameState.PLAYING
        self.current_player_index = 0
        return True
    
    def make_move(self, player_id: str, move: GameMove) -> bool:
        """Process player move"""
        if self.game_state != GameState.PLAYING:
            return False
        
        current_player = self.players[self.current_player_index]
        if current_player.player_id != player_id:
            return False
        
        success = False
        words_formed = []
        
        if isinstance(move, PlaceTilesMove):
            success, words_formed = self._process_tile_placement(current_player, move)
        elif isinstance(move, ExchangeTilesMove):
            success = self._process_tile_exchange(current_player, move)
        
        if success:
            self.move_history.append(move)
            self.passes_in_a_row = 0
            
            # Notify observers
            for observer in self.observers:
                observer.notify_move(current_player, move, words_formed)
            
            # Advance to next player
            self._next_turn()
        
        return success
    
    def _process_tile_placement(self, player: Player, move: PlaceTilesMove) -> Tuple[bool, List[WordPlacement]]:
        """Process tile placement move"""
        # Validate placement
        if not self._is_valid_placement(move.placements):
            return False, []
        
        # Temporarily place tiles
        for position, tile in move.placements:
            self.board.place_tile(position, tile)
        
        # Get formed words
        placed_positions = [pos for pos, _ in move.placements]
        words_formed = self.board.get_connected_words(placed_positions)
        
        # Validate all words
        valid_words = True
        for word_placement in words_formed:
            if not self.word_validator.is_valid_word(word_placement.word):
                valid_words = False
                break
        
        if not valid_words:
            # Remove placed tiles
            for position, _ in move.placements:
                self.board.get_square(position).remove_tile()
            return False, []
        
        # Calculate total score
        total_score = sum(word.score for word in words_formed)
        
        # Bonus for using all 7 tiles
        if len(move.placements) == 7:
            total_score += 50
        
        # Remove tiles from player's rack
        tiles_to_remove = [tile for _, tile in move.placements]
        player.remove_tiles(tiles_to_remove)
        
        # Add score
        player.add_score(total_score)
        
        # Draw new tiles
        new_tiles = self.tile_bag.draw_tiles(len(move.placements))
        player.add_tiles(new_tiles)
        
        # Mark premium squares as used
        for position, _ in move.placements:
            square = self.board.get_square(position)
            square.use_premium()
        
        # Notify score update
        for observer in self.observers:
            observer.notify_score_update(player, total_score)
        
        return True, words_formed
    
    def _process_tile_exchange(self, player: Player, move: ExchangeTilesMove) -> bool:
        """Process tile exchange move"""
        if self.tile_bag.tiles_remaining() < len(move.tiles_to_exchange):
            return False
        
        # Remove tiles from rack
        if not player.remove_tiles(move.tiles_to_exchange):
            return False
        
        # Return tiles to bag
        self.tile_bag.return_tiles(move.tiles_to_exchange)
        
        # Draw new tiles
        new_tiles = self.tile_bag.draw_tiles(len(move.tiles_to_exchange))
        player.add_tiles(new_tiles)
        
        return True
    
    def _is_valid_placement(self, placements: List[Tuple[Position, Tile]]) -> bool:
        """Validate tile placement"""
        if not placements:
            return False
        
        # Check if all positions are empty
        for position, _ in placements:
            if not self.board.is_valid_position(position):
                return False
            if self.board.get_tile(position) is not None:
                return False
        
        # First move must cover center square
        if self.board.is_empty():
            center_covered = any(pos == self.board.center_position for pos, _ in placements)
            if not center_covered:
                return False
        
        # Subsequent moves must connect to existing tiles
        else:
            connected = False
            for position, _ in placements:
                # Check adjacent squares for existing tiles
                for dr, dc in [(0, 1), (0, -1), (1, 0), (-1, 0)]:
                    adj_pos = Position(position.row + dr, position.col + dc)
                    if (self.board.is_valid_position(adj_pos) and 
                        self.board.get_tile(adj_pos) is not None):
                        connected = True
                        break
                if connected:
                    break
            
            if not connected:
                return False
        
        return True
    
    def pass_turn(self, player_id: str) -> bool:
        """Player passes their turn"""
        current_player = self.players[self.current_player_index]
        if current_player.player_id != player_id:
            return False
        
        self.passes_in_a_row += 1
        
        if self.passes_in_a_row >= self.max_passes:
            self._end_game()
        else:
            self._next_turn()
        
        return True
    
    def _next_turn(self):
        """Advance to next player's turn"""
        self.current_player_index = (self.current_player_index + 1) % len(self.players)
        
        # Check if game should end (player has no tiles or bag is empty)
        current_player = self.players[self.current_player_index]
        if (current_player.get_rack_size() == 0 or 
            (self.tile_bag.tiles_remaining() == 0 and 
             any(p.get_rack_size() == 0 for p in self.players))):
            self._end_game()
    
    def _end_game(self):
        """End the game and determine winner"""
        self.game_state = GameState.FINISHED
        
        # Subtract remaining tile values from scores
        for player in self.players:
            penalty = sum(tile.points for tile in player.rack)
            player.add_score(-penalty)
        
        # Find winner
        winner = max(self.players, key=lambda p: p.score)
        final_scores = {player.name: player.score for player in self.players}
        
        # Notify observers
        for observer in self.observers:
            observer.notify_game_end(winner, final_scores)

# DEMO: Scrabble game usage
def demo_scrabble_game():
    # Create players
    player1 = Player("p1", "Alice")
    player2 = Player("p2", "Bob")
    
    # Create game
    game = ScrabbleGame()
    
    # Add observer
    observer = ConsoleScrabbleObserver()
    game.add_observer(observer)
    
    # Add players
    game.add_player(player1)
    game.add_player(player2)
    
    # Start game
    print("Starting Scrabble game...")
    game.start_game()
    
    # Show initial racks
    for player in game.players:
        rack_str = ", ".join(str(tile) for tile in player.rack)
        print(f"{player.name}'s rack: {rack_str}")
    
    # Simulate first move (place "CAT" horizontally from center)
    print("\n--- First Move ---")
    alice_tiles = [tile for tile in player1.rack if tile.letter in ['C', 'A', 'T']][:3]
    if len(alice_tiles) == 3:
        placements = [
            (Position(7, 7), alice_tiles[0]),  # C at center
            (Position(7, 8), alice_tiles[1]),  # A
            (Position(7, 9), alice_tiles[2])   # T
        ]
        move = PlaceTilesMove(player1.player_id, placements)
        game.make_move(player1.player_id, move)
    
    # Simulate second move (place "DOG" vertically)
    print("\n--- Second Move ---")
    bob_tiles = [tile for tile in player2.rack if tile.letter in ['D', 'O', 'G']][:3]
    if len(bob_tiles) == 3:
        placements = [
            (Position(6, 7), bob_tiles[0]),  # D above C
            (Position(8, 7), bob_tiles[1]),  # O below C
            (Position(9, 7), bob_tiles[2])   # G
        ]
        move = PlaceTilesMove(player2.player_id, placements)
        game.make_move(player2.player_id, move)

if __name__ == "__main__":
    demo_scrabble_game()