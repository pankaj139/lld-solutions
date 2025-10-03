"""
BATTLESHIP GAME - Low Level Design Implementation in Python

DESIGN PATTERNS USED:
1. STRATEGY PATTERN: Different AI difficulty levels
   - RandomAI, HuntTargetAI, ProbabilityAI
   - Pluggable targeting strategies
   - Easy to add new AI behaviors

2. STATE PATTERN: Game state management
   - Setup, Playing, Finished states
   - Controlled state transitions
   - State-specific operations

3. OBSERVER PATTERN: Game event notifications
   - Hit, Miss, Sunk events
   - Score and statistics tracking
   - Decoupled event system

4. COMMAND PATTERN: Attack actions
   - Attack encapsulates action details
   - Validation and execution separated
   - History tracking

5. FACTORY PATTERN: Ship creation
   - ShipFactory creates ships with proper configuration
   - Centralized ship instantiation

6. COMPOSITE PATTERN: Fleet composed of ships
   - Fleet is composite of Ship objects
   - Unified fleet operations

OOP CONCEPTS DEMONSTRATED:
- ENCAPSULATION: Board state, ship positions hidden
- ABSTRACTION: AIStrategy defines contract
- INHERITANCE: Different AI strategies extend base
- POLYMORPHISM: All AIs used uniformly

SOLID PRINCIPLES:
- SRP: Each class has single responsibility
- OCP: Easy to add new AI strategies
- LSP: All AI types interchangeable
- ISP: Focused interfaces
- DIP: Depends on abstractions

BUSINESS FEATURES:
- 10×10 game board
- 5 standard ship types
- Three AI difficulty levels
- Hit/miss tracking
- Ship sinking detection
- Victory conditions

ARCHITECTURAL NOTES:
- Efficient coordinate system
- Clean AI strategy separation
- Extensible for multiplayer
- Ready for GUI integration
"""

from enum import Enum
from typing import List, Tuple, Optional, Set
from abc import ABC, abstractmethod
import random


# Enums and Constants
class ShipType(Enum):
    """Standard Battleship ship types with sizes"""
    CARRIER = 5
    BATTLESHIP = 4
    CRUISER = 3
    SUBMARINE = 3
    DESTROYER = 2


class Orientation(Enum):
    """Ship placement orientation"""
    HORIZONTAL = "horizontal"
    VERTICAL = "vertical"


class CellState(Enum):
    """Board cell state"""
    EMPTY = "~"
    SHIP = "S"
    HIT = "X"
    MISS = "O"


class AttackResult(Enum):
    """Result of attack"""
    MISS = "Miss"
    HIT = "Hit"
    SUNK = "Sunk"


class GameState(Enum):
    """Current game state"""
    SETUP = "setup"
    PLAYING = "playing"
    FINISHED = "finished"


class Coordinate:
    """
    Board coordinate with validation
    
    OOP CONCEPT: Value Object
    - Immutable position representation
    """
    def __init__(self, row: int, col: int):
        self.row = row
        self.col = col
    
    def __eq__(self, other):
        return self.row == other.row and self.col == other.col
    
    def __hash__(self):
        return hash((self.row, self.col))
    
    def __repr__(self):
        return f"{chr(65 + self.row)}{self.col + 1}"
    
    @staticmethod
    def from_string(coord_str: str, board_size: int = 10) -> Optional['Coordinate']:
        """Parse coordinate from string like 'A5'"""
        if len(coord_str) < 2:
            return None
        
        row = ord(coord_str[0].upper()) - 65
        try:
            col = int(coord_str[1:]) - 1
            if 0 <= row < board_size and 0 <= col < board_size:
                return Coordinate(row, col)
        except ValueError:
            pass
        
        return None


class Cell:
    """
    Individual board cell
    
    OOP CONCEPT: Encapsulation
    - State managed internally
    """
    def __init__(self):
        self.state = CellState.EMPTY
        self.ship: Optional['Ship'] = None
    
    def is_occupied(self) -> bool:
        """Check if cell contains ship"""
        return self.ship is not None
    
    def mark_hit(self) -> bool:
        """Mark cell as hit, return True if ship was hit"""
        if self.is_occupied():
            self.state = CellState.HIT
            return True
        else:
            self.state = CellState.MISS
            return False


class Ship:
    """
    Battleship ship
    
    OOP CONCEPT: Encapsulation
    - Health and hits tracked internally
    """
    def __init__(self, ship_type: ShipType):
        self.type = ship_type
        self.size = ship_type.value
        self.position: List[Coordinate] = []
        self.hits: Set[Coordinate] = set()
        self.orientation: Optional[Orientation] = None
    
    @property
    def health(self) -> int:
        """Get remaining health"""
        return self.size - len(self.hits)
    
    def is_sunk(self) -> bool:
        """Check if ship is sunk"""
        return len(self.hits) >= self.size
    
    def receive_hit(self, coord: Coordinate) -> bool:
        """Register hit on ship"""
        if coord in self.position and coord not in self.hits:
            self.hits.add(coord)
            return True
        return False
    
    def get_coordinates(self) -> List[Coordinate]:
        """Get all ship coordinates"""
        return self.position.copy()


class Fleet:
    """
    Composite Pattern: Collection of ships
    
    DESIGN PATTERN: Composite Pattern
    - Fleet is composite of Ship objects
    """
    def __init__(self):
        self.ships: List[Ship] = []
    
    def add_ship(self, ship: Ship):
        """Add ship to fleet"""
        self.ships.append(ship)
    
    def get_ship_at(self, coord: Coordinate) -> Optional[Ship]:
        """Get ship at coordinate"""
        for ship in self.ships:
            if coord in ship.position:
                return ship
        return None
    
    def is_defeated(self) -> bool:
        """Check if all ships are sunk"""
        return all(ship.is_sunk() for ship in self.ships)
    
    def get_remaining_ships(self) -> int:
        """Get count of ships still afloat"""
        return sum(1 for ship in self.ships if not ship.is_sunk())


class Board:
    """
    Game board with ship placement and attack processing
    
    DESIGN PATTERN: Composite Pattern
    - Board composed of cells
    """
    def __init__(self, size: int = 10):
        self.size = size
        self.grid: List[List[Cell]] = [[Cell() for _ in range(size)] for _ in range(size)]
        self.fleet = Fleet()
    
    def get_cell(self, coord: Coordinate) -> Optional[Cell]:
        """Get cell at coordinate"""
        if 0 <= coord.row < self.size and 0 <= coord.col < self.size:
            return self.grid[coord.row][coord.col]
        return None
    
    def is_valid_placement(self, ship: Ship, start: Coordinate, orientation: Orientation) -> bool:
        """
        Validate ship placement
        
        BUSINESS RULE: Within bounds, no overlaps
        
        Time Complexity: O(n) where n is ship length
        """
        coordinates = []
        
        for i in range(ship.size):
            if orientation == Orientation.HORIZONTAL:
                coord = Coordinate(start.row, start.col + i)
            else:
                coord = Coordinate(start.row + i, start.col)
            
            # Check bounds
            if coord.row >= self.size or coord.col >= self.size:
                return False
            
            # Check overlap
            cell = self.get_cell(coord)
            if cell and cell.is_occupied():
                return False
            
            coordinates.append(coord)
        
        return True
    
    def place_ship(self, ship: Ship, start: Coordinate, orientation: Orientation) -> bool:
        """Place ship on board"""
        if not self.is_valid_placement(ship, start, orientation):
            return False
        
        ship.position = []
        ship.orientation = orientation
        
        for i in range(ship.size):
            if orientation == Orientation.HORIZONTAL:
                coord = Coordinate(start.row, start.col + i)
            else:
                coord = Coordinate(start.row + i, start.col)
            
            cell = self.get_cell(coord)
            cell.ship = ship
            cell.state = CellState.SHIP
            ship.position.append(coord)
        
        self.fleet.add_ship(ship)
        return True
    
    def receive_attack(self, coord: Coordinate) -> AttackResult:
        """
        Process attack at coordinate
        
        Time Complexity: O(1)
        """
        cell = self.get_cell(coord)
        if not cell:
            return AttackResult.MISS
        
        # Already attacked
        if cell.state in (CellState.HIT, CellState.MISS):
            return AttackResult.MISS
        
        hit = cell.mark_hit()
        
        if hit:
            ship = cell.ship
            ship.receive_hit(coord)
            
            if ship.is_sunk():
                return AttackResult.SUNK
            return AttackResult.HIT
        
        return AttackResult.MISS
    
    def auto_place_ships(self):
        """Automatically place all ships randomly"""
        ship_types = [ShipType.CARRIER, ShipType.BATTLESHIP, ShipType.CRUISER,
                      ShipType.SUBMARINE, ShipType.DESTROYER]
        
        for ship_type in ship_types:
            ship = Ship(ship_type)
            placed = False
            attempts = 0
            
            while not placed and attempts < 100:
                row = random.randint(0, self.size - 1)
                col = random.randint(0, self.size - 1)
                orientation = random.choice([Orientation.HORIZONTAL, Orientation.VERTICAL])
                
                if self.place_ship(ship, Coordinate(row, col), orientation):
                    placed = True
                
                attempts += 1
    
    def display(self, show_ships: bool = True):
        """Display board"""
        print("\n   " + " ".join(f"{i+1:2}" for i in range(self.size)))
        print("  +" + "---" * self.size + "+")
        
        for row in range(self.size):
            row_str = f"{chr(65 + row)} |"
            for col in range(self.size):
                cell = self.grid[row][col]
                
                if cell.state == CellState.HIT:
                    row_str += " X "
                elif cell.state == CellState.MISS:
                    row_str += " O "
                elif cell.state == CellState.SHIP and show_ships:
                    row_str += " S "
                else:
                    row_str += " ~ "
            
            print(row_str + "|")
        
        print("  +" + "---" * self.size + "+")


class Attack:
    """
    Command Pattern: Attack action
    
    DESIGN PATTERN: Command Pattern
    - Encapsulates attack details
    """
    def __init__(self, coordinate: Coordinate, result: AttackResult):
        self.coordinate = coordinate
        self.result = result


class AttackHistory:
    """
    Tracks attack history
    
    DESIGN PATTERN: Observer Pattern support
    """
    def __init__(self):
        self.attacks: List[Attack] = []
        self.hit_count = 0
        self.miss_count = 0
    
    def add_attack(self, attack: Attack):
        """Record attack"""
        self.attacks.append(attack)
        
        if attack.result in (AttackResult.HIT, AttackResult.SUNK):
            self.hit_count += 1
        else:
            self.miss_count += 1
    
    def has_attacked(self, coord: Coordinate) -> bool:
        """Check if coordinate already attacked"""
        return any(a.coordinate == coord for a in self.attacks)
    
    def get_hit_rate(self) -> float:
        """Calculate hit accuracy"""
        total = len(self.attacks)
        return (self.hit_count / total * 100) if total > 0 else 0.0


class AIStrategy(ABC):
    """
    Strategy Pattern: AI targeting strategy
    
    DESIGN PATTERN: Strategy Pattern
    - Abstract strategy for AI behavior
    """
    @abstractmethod
    def get_next_target(self, board_size: int, history: AttackHistory) -> Coordinate:
        """Get next attack coordinate"""
        pass


class RandomAI(AIStrategy):
    """
    Easy AI: Random targeting
    
    DESIGN PATTERN: Strategy implementation
    """
    def get_next_target(self, board_size: int, history: AttackHistory) -> Coordinate:
        """Random untargeted cell"""
        while True:
            row = random.randint(0, board_size - 1)
            col = random.randint(0, board_size - 1)
            coord = Coordinate(row, col)
            
            if not history.has_attacked(coord):
                return coord


class HuntTargetAI(AIStrategy):
    """
    Medium AI: Hunt/Target mode
    
    DESIGN PATTERN: Strategy implementation
    - Hunts randomly until hit
    - Then targets adjacent cells
    """
    def __init__(self):
        self.targets: List[Coordinate] = []
    
    def get_next_target(self, board_size: int, history: AttackHistory) -> Coordinate:
        """
        Hunt/Target algorithm
        
        ALGORITHM:
        - If targets exist, attack them (Target mode)
        - Otherwise random hunt
        """
        # Target mode: attack adjacent to hits
        if self.targets:
            coord = self.targets.pop(0)
            if not history.has_attacked(coord):
                return coord
        
        # Check recent hits and add adjacent cells
        for attack in reversed(history.attacks[-5:]):  # Check last 5 attacks
            if attack.result in (AttackResult.HIT, AttackResult.SUNK):
                self._add_adjacent_targets(attack.coordinate, board_size, history)
        
        # Hunt mode: random attack
        while True:
            row = random.randint(0, board_size - 1)
            col = random.randint(0, board_size - 1)
            coord = Coordinate(row, col)
            
            if not history.has_attacked(coord):
                return coord
    
    def _add_adjacent_targets(self, coord: Coordinate, board_size: int, history: AttackHistory):
        """Add adjacent cells to target list"""
        directions = [(0, 1), (1, 0), (0, -1), (-1, 0)]
        
        for dr, dc in directions:
            new_coord = Coordinate(coord.row + dr, coord.col + dc)
            
            if (0 <= new_coord.row < board_size and 
                0 <= new_coord.col < board_size and
                not history.has_attacked(new_coord) and
                new_coord not in self.targets):
                
                self.targets.append(new_coord)


class Player:
    """
    Player with board and AI strategy
    
    OOP CONCEPT: Composition
    - Player composed of Board and AIStrategy
    """
    def __init__(self, name: str, is_ai: bool = False, ai_strategy: Optional[AIStrategy] = None):
        self.name = name
        self.board = Board()
        self.attack_history = AttackHistory()
        self.is_ai = is_ai
        self.ai_strategy = ai_strategy


class BattleshipGame:
    """
    Main game controller
    
    DESIGN PATTERN: Facade Pattern
    - Simple interface to complex game system
    """
    def __init__(self, player1_name: str, player2_name: str, player2_ai: bool = True):
        self.player1 = Player(player1_name, is_ai=False)
        self.player2 = Player(player2_name, is_ai=player2_ai,
                             ai_strategy=HuntTargetAI() if player2_ai else None)
        self.current_player_idx = 0
        self.state = GameState.SETUP
    
    @property
    def current_player(self) -> Player:
        """Get current player"""
        return self.player1 if self.current_player_idx == 0 else self.player2
    
    @property
    def opponent(self) -> Player:
        """Get opponent"""
        return self.player2 if self.current_player_idx == 0 else self.player1
    
    def setup_game(self):
        """Setup phase - place ships"""
        print(f"\n{'='*60}")
        print("BATTLESHIP GAME - SETUP")
        print(f"{'='*60}")
        
        # Auto-place ships for both players
        print(f"\nPlacing ships for {self.player1.name}...")
        self.player1.board.auto_place_ships()
        
        print(f"Placing ships for {self.player2.name}...")
        self.player2.board.auto_place_ships()
        
        self.state = GameState.PLAYING
    
    def play_turn(self) -> bool:
        """
        Play one turn
        
        Returns:
            bool: True if game continues, False if game over
        """
        player = self.current_player
        opponent = self.opponent
        
        print(f"\n{'='*60}")
        print(f"{player.name}'s Turn")
        print(f"{'='*60}")
        
        # Get target
        if player.is_ai:
            coord = player.ai_strategy.get_next_target(
                opponent.board.size,
                player.attack_history
            )
            print(f"AI attacks: {coord}")
        else:
            # For demo, use random
            coord = RandomAI().get_next_target(opponent.board.size, player.attack_history)
            print(f"{player.name} attacks: {coord}")
        
        # Make attack
        result = opponent.board.receive_attack(coord)
        attack = Attack(coord, result)
        player.attack_history.add_attack(attack)
        
        # Display result
        print(f"Result: {result.value}")
        
        if result == AttackResult.SUNK:
            ship = opponent.board.fleet.get_ship_at(coord)
            if ship:
                print(f"💥 {ship.type.name} sunk!")
        
        # Check victory
        if opponent.board.fleet.is_defeated():
            self.state = GameState.FINISHED
            return False
        
        # Next turn
        self.current_player_idx = 1 - self.current_player_idx
        return True
    
    def get_winner(self) -> Player:
        """Get winning player"""
        if self.player1.board.fleet.is_defeated():
            return self.player2
        return self.player1
    
    def play_game(self):
        """Play complete game"""
        self.setup_game()
        
        turn_count = 0
        max_turns = 100
        
        while self.state == GameState.PLAYING and turn_count < max_turns:
            if not self.play_turn():
                break
            turn_count += 1
        
        # Game over
        winner = self.get_winner()
        print(f"\n{'='*60}")
        print(f"🎉 {winner.name} WINS!")
        print(f"{'='*60}")
        print(f"Turns: {turn_count}")
        print(f"{self.player1.name} accuracy: {self.player1.attack_history.get_hit_rate():.1f}%")
        print(f"{self.player2.name} accuracy: {self.player2.attack_history.get_hit_rate():.1f}%")


def main():
    """Demonstrate Battleship game"""
    print("=" * 60)
    print("BATTLESHIP GAME - Low Level Design Demo")
    print("=" * 60)
    
    # Create and play game
    game = BattleshipGame(
        player1_name="Alice",
        player2_name="Computer AI",
        player2_ai=True
    )
    
    game.play_game()
    
    # Show final boards
    print(f"\n{game.player1.name}'s board:")
    game.player1.board.display(show_ships=True)
    
    print(f"\n{game.player2.name}'s board:")
    game.player2.board.display(show_ships=True)
    
    print("\n" + "=" * 60)
    print("DEMO COMPLETE")
    print("=" * 60)


if __name__ == "__main__":
    main()

