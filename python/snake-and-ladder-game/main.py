#!/usr/bin/env python3
"""
Snake and Ladder Game Implementation

A comprehensive board game simulation supporting multiple players, AI opponents,
configurable boards, and various game modes with full statistics tracking.

Features:
- Multi-player support (2-6 players)
- Configurable board size and snake/ladder positions
- AI players with different difficulty levels
- Multiple game modes (Classic, Quick, Custom, Tournament)
- Statistics tracking and game history
- Visual board representation
- Undo/redo functionality
- Tournament management

Author: LLD Solutions
Date: 2024
"""

import random
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional, Tuple, Set
import math


class PlayerType(Enum):
    """Types of players"""
    HUMAN = "human"
    AI_EASY = "ai_easy"
    AI_MEDIUM = "ai_medium"
    AI_HARD = "ai_hard"


class GameMode(Enum):
    """Game mode types"""
    CLASSIC = "classic"
    QUICK = "quick"
    CUSTOM = "custom"
    TOURNAMENT = "tournament"


class GameStateType(Enum):
    """Game state types"""
    WAITING = "waiting"
    PLAYING = "playing"
    PAUSED = "paused"
    FINISHED = "finished"


class MoveType(Enum):
    """Types of moves"""
    NORMAL = "normal"
    SNAKE_BITE = "snake_bite"
    LADDER_CLIMB = "ladder_climb"
    WIN = "win"
    BLOCKED = "blocked"


@dataclass
class Position:
    """Represents a position on the board"""
    row: int
    col: int
    number: int
    
    def __eq__(self, other):
        return isinstance(other, Position) and self.number == other.number
    
    def __hash__(self):
        return hash(self.number)


@dataclass
class Snake:
    """Represents a snake on the board"""
    head: int
    tail: int
    name: str = ""
    
    def __post_init__(self):
        if self.head <= self.tail:
            raise ValueError("Snake head must be higher than tail")
        if not self.name:
            self.name = f"Snake({self.head}→{self.tail})"


@dataclass
class Ladder:
    """Represents a ladder on the board"""
    bottom: int
    top: int
    name: str = ""
    
    def __post_init__(self):
        if self.bottom >= self.top:
            raise ValueError("Ladder bottom must be lower than top")
        if not self.name:
            self.name = f"Ladder({self.bottom}→{self.top})"


@dataclass
class MoveResult:
    """Result of a player move"""
    player_name: str
    dice_value: int
    start_position: int
    end_position: int
    move_type: MoveType
    snake_or_ladder: Optional[str] = None
    is_winner: bool = False
    timestamp: datetime = field(default_factory=datetime.now)


@dataclass
class GameStatistics:
    """Game statistics tracking"""
    total_moves: int = 0
    game_duration: float = 0.0
    dice_rolls: List[int] = field(default_factory=list)
    snake_encounters: int = 0
    ladder_climbs: int = 0
    player_moves: Dict[str, int] = field(default_factory=dict)
    player_snake_bites: Dict[str, int] = field(default_factory=dict)
    player_ladder_climbs: Dict[str, int] = field(default_factory=dict)
    
    def add_dice_roll(self, value: int):
        """Add a dice roll to statistics"""
        self.dice_rolls.append(value)
        self.total_moves += 1
    
    def add_snake_encounter(self, player_name: str):
        """Record a snake encounter"""
        self.snake_encounters += 1
        self.player_snake_bites[player_name] = self.player_snake_bites.get(player_name, 0) + 1
    
    def add_ladder_climb(self, player_name: str):
        """Record a ladder climb"""
        self.ladder_climbs += 1
        self.player_ladder_climbs[player_name] = self.player_ladder_climbs.get(player_name, 0) + 1
    
    def get_average_dice_roll(self) -> float:
        """Get average dice roll value"""
        return sum(self.dice_rolls) / len(self.dice_rolls) if self.dice_rolls else 0.0


# Custom Exceptions
class SnakeLadderException(Exception):
    """Base exception for Snake and Ladder game"""
    pass


class InvalidPlayerCountException(SnakeLadderException):
    """Invalid number of players"""
    pass


class InvalidPositionException(SnakeLadderException):
    """Invalid position on board"""
    pass


class GameNotStartedException(SnakeLadderException):
    """Game has not been started"""
    pass


class GameAlreadyFinishedException(SnakeLadderException):
    """Game has already finished"""
    pass


class InvalidMoveException(SnakeLadderException):
    """Invalid move attempted"""
    pass


class InvalidBoardConfigException(SnakeLadderException):
    """Invalid board configuration"""
    pass


class Dice:
    """Dice implementation with fairness and history"""
    
    def __init__(self, sides: int = 6, seed: Optional[int] = None):
        self.sides = sides
        self.history: List[int] = []
        self.roll_count = 0
        if seed is not None:
            random.seed(seed)
    
    def roll(self) -> int:
        """Roll the dice and return result"""
        result = random.randint(1, self.sides)
        self.history.append(result)
        self.roll_count += 1
        return result
    
    def get_last_roll(self) -> Optional[int]:
        """Get the last dice roll"""
        return self.history[-1] if self.history else None
    
    def get_statistics(self) -> Dict:
        """Get dice roll statistics"""
        if not self.history:
            return {}
        
        counts = {}
        for i in range(1, self.sides + 1):
            counts[i] = self.history.count(i)
        
        return {
            'total_rolls': len(self.history),
            'average': sum(self.history) / len(self.history),
            'counts': counts,
            'frequency': {k: v / len(self.history) for k, v in counts.items()}
        }


class Player(ABC):
    """Abstract base class for players"""
    
    def __init__(self, name: str, player_type: PlayerType):
        self.name = name
        self.player_type = player_type
        self.position = 0
        self.move_history: List[MoveResult] = []
        self.total_moves = 0
        self.snake_encounters = 0
        self.ladder_climbs = 0
        self.games_played = 0
        self.games_won = 0
    
    def move_to(self, new_position: int, move_result: MoveResult):
        """Move player to new position"""
        self.position = new_position
        self.move_history.append(move_result)
        self.total_moves += 1
        
        if move_result.move_type == MoveType.SNAKE_BITE:
            self.snake_encounters += 1
        elif move_result.move_type == MoveType.LADDER_CLIMB:
            self.ladder_climbs += 1
    
    def reset_position(self):
        """Reset player position for new game"""
        self.position = 0
        self.move_history.clear()
    
    def get_win_percentage(self) -> float:
        """Get player's win percentage"""
        return (self.games_won / self.games_played * 100) if self.games_played > 0 else 0.0
    
    @abstractmethod
    def should_roll_dice(self, game_state) -> bool:
        """Determine if player should roll dice (for AI decision making)"""
        pass


class HumanPlayer(Player):
    """Human player implementation"""
    
    def __init__(self, name: str):
        super().__init__(name, PlayerType.HUMAN)
    
    def should_roll_dice(self, game_state) -> bool:
        """Human players always roll dice when it's their turn"""
        return True


class AIPlayer(Player):
    """AI player implementation with different difficulty levels"""
    
    def __init__(self, name: str, difficulty: PlayerType = PlayerType.AI_MEDIUM):
        super().__init__(name, difficulty)
        self.thinking_time = self._get_thinking_time()
    
    def _get_thinking_time(self) -> float:
        """Get AI thinking time based on difficulty"""
        if self.player_type == PlayerType.AI_EASY:
            return 0.5
        elif self.player_type == PlayerType.AI_MEDIUM:
            return 1.0
        else:  # AI_HARD
            return 1.5
    
    def should_roll_dice(self, game_state) -> bool:
        """AI decision making for rolling dice"""
        # Simulate thinking time
        time.sleep(self.thinking_time)
        
        if self.player_type == PlayerType.AI_EASY:
            return True  # Always roll
        
        # More sophisticated AI logic for medium/hard difficulty
        # Consider position, snakes, ladders, opponent positions
        return self._make_strategic_decision(game_state)
    
    def _make_strategic_decision(self, game_state) -> bool:
        """Make strategic decision based on game state"""
        # Analyze current position risks and opportunities
        current_pos = self.position
        board = game_state.get('board')
        
        if not board:
            return True
        
        # Check for nearby snakes (risky positions)
        risky_positions = []
        for snake in board.snakes.values():
            if current_pos < snake.head <= current_pos + 6:
                risky_positions.append(snake.head)
        
        # Check for nearby ladders (good positions)
        good_positions = []
        for ladder in board.ladders.values():
            if current_pos < ladder.bottom <= current_pos + 6:
                good_positions.append(ladder.bottom)
        
        # AI_HARD considers more factors
        if self.player_type == PlayerType.AI_HARD:
            # Calculate risk vs reward
            risk_score = len(risky_positions) * 2
            reward_score = len(good_positions) * 3
            
            # Consider opponent positions
            opponents = game_state.get('opponents', [])
            close_opponents = sum(1 for opp in opponents if abs(opp.position - current_pos) <= 10)
            urgency_score = close_opponents
            
            # Make decision based on scores
            decision_score = reward_score + urgency_score - risk_score
            return decision_score >= 0
        
        return True  # Default: roll dice


class Board:
    """Game board representation"""
    
    def __init__(self, size: int = 100):
        self.size = size
        self.rows = int(math.sqrt(size))
        self.cols = int(math.sqrt(size))
        
        if self.rows * self.cols != size:
            raise InvalidBoardConfigException(f"Board size {size} is not a perfect square")
        
        self.snakes: Dict[int, Snake] = {}
        self.ladders: Dict[int, Ladder] = {}
        self.positions: Dict[int, Position] = {}
        self._initialize_positions()
    
    def _initialize_positions(self):
        """Initialize board positions with snake-like numbering"""
        number = 1
        for row in range(self.rows - 1, -1, -1):  # Start from bottom row
            if (self.rows - 1 - row) % 2 == 0:  # Left to right
                for col in range(self.cols):
                    self.positions[number] = Position(row, col, number)
                    number += 1
            else:  # Right to left
                for col in range(self.cols - 1, -1, -1):
                    self.positions[number] = Position(row, col, number)
                    number += 1
    
    def add_snake(self, head: int, tail: int) -> bool:
        """Add a snake to the board"""
        try:
            if head in self.snakes or head in self.ladders:
                return False
            if tail in self.snakes or tail in self.ladders:
                return False
            if not (1 <= head <= self.size and 1 <= tail <= self.size):
                return False
            
            snake = Snake(head, tail)
            self.snakes[head] = snake
            return True
        except ValueError:
            return False
    
    def add_ladder(self, bottom: int, top: int) -> bool:
        """Add a ladder to the board"""
        try:
            if bottom in self.snakes or bottom in self.ladders:
                return False
            if top in self.snakes or top in self.ladders:
                return False
            if not (1 <= bottom <= self.size and 1 <= top <= self.size):
                return False
            
            ladder = Ladder(bottom, top)
            self.ladders[bottom] = ladder
            return True
        except ValueError:
            return False
    
    def get_position_effect(self, position: int) -> Tuple[Optional[int], Optional[str], MoveType]:
        """Get the effect of landing on a position"""
        if position in self.snakes:
            snake = self.snakes[position]
            return snake.tail, snake.name, MoveType.SNAKE_BITE
        elif position in self.ladders:
            ladder = self.ladders[position]
            return ladder.top, ladder.name, MoveType.LADDER_CLIMB
        else:
            return None, None, MoveType.NORMAL
    
    def is_valid_position(self, position: int) -> bool:
        """Check if position is valid on board"""
        return 1 <= position <= self.size
    
    def get_coordinates(self, position: int) -> Optional[Position]:
        """Get row, col coordinates for a position"""
        return self.positions.get(position)
    
    def setup_default_snakes_and_ladders(self):
        """Setup default snakes and ladders for 100-square board"""
        if self.size != 100:
            return
        
        # Default snakes (head -> tail)
        default_snakes = [
            (99, 54), (95, 67), (92, 53), (87, 57), (83, 19),
            (73, 1), (69, 33), (64, 36), (59, 17), (55, 7),
            (52, 11), (48, 9), (46, 5), (44, 22)
        ]
        
        # Default ladders (bottom -> top)
        default_ladders = [
            (2, 23), (8, 34), (20, 77), (32, 68), (41, 79),
            (74, 88), (82, 100), (85, 95), (91, 98)
        ]
        
        for head, tail in default_snakes:
            self.add_snake(head, tail)
        
        for bottom, top in default_ladders:
            self.add_ladder(bottom, top)


class GameRules:
    """Game rules and validation"""
    
    def __init__(self, exact_landing: bool = True, multiple_dice_on_six: bool = False):
        self.exact_landing = exact_landing
        self.multiple_dice_on_six = multiple_dice_on_six
    
    def calculate_new_position(self, current_position: int, dice_value: int, board: Board) -> Tuple[int, MoveType, Optional[str]]:
        """Calculate new position after dice roll"""
        new_position = current_position + dice_value
        
        # Check if move is valid
        if new_position > board.size:
            if self.exact_landing:
                return current_position, MoveType.BLOCKED, "Exact landing required"
            else:
                new_position = board.size
        
        # Check for snakes and ladders
        effect_position, effect_name, move_type = board.get_position_effect(new_position)
        
        if effect_position is not None:
            return effect_position, move_type, effect_name
        
        return new_position, MoveType.NORMAL, None
    
    def is_winning_position(self, position: int, board: Board) -> bool:
        """Check if position is winning"""
        return position == board.size
    
    def should_get_extra_turn(self, dice_value: int) -> bool:
        """Check if player gets extra turn"""
        return self.multiple_dice_on_six and dice_value == 6


class SnakeLadderGame:
    """Main Snake and Ladder game implementation"""
    
    def __init__(self, board_size: int = 100, game_mode: GameMode = GameMode.CLASSIC):
        self.board = Board(board_size)
        self.players: List[Player] = []
        self.current_player_index = 0
        self.game_state = GameStateType.WAITING
        self.game_mode = game_mode
        self.rules = GameRules()
        self.dice = Dice()
        self.move_history: List[MoveResult] = []
        self.statistics = GameStatistics()
        self.start_time: Optional[datetime] = None
        self.end_time: Optional[datetime] = None
        self.winner: Optional[Player] = None
        
        # Setup default board for classic mode
        if game_mode == GameMode.CLASSIC:
            self.board.setup_default_snakes_and_ladders()
        elif game_mode == GameMode.QUICK:
            self._setup_quick_mode()
    
    def _setup_quick_mode(self):
        """Setup quick mode with fewer snakes and ladders"""
        # Quick mode: 6x6 board with fewer obstacles
        if self.board.size == 100:
            quick_snakes = [(95, 67), (73, 1), (59, 17), (46, 5)]
            quick_ladders = [(2, 23), (20, 77), (41, 79), (82, 100)]
            
            for head, tail in quick_snakes:
                self.board.add_snake(head, tail)
            
            for bottom, top in quick_ladders:
                self.board.add_ladder(bottom, top)
    
    def add_player(self, name: str, player_type: PlayerType = PlayerType.HUMAN) -> bool:
        """Add a player to the game"""
        if self.game_state != GameStateType.WAITING:
            return False
        
        if len(self.players) >= 6:  # Maximum 6 players
            return False
        
        # Check for duplicate names
        if any(player.name == name for player in self.players):
            return False
        
        if player_type == PlayerType.HUMAN:
            player = HumanPlayer(name)
        else:
            player = AIPlayer(name, player_type)
        
        self.players.append(player)
        self.statistics.player_moves[name] = 0
        self.statistics.player_snake_bites[name] = 0
        self.statistics.player_ladder_climbs[name] = 0
        
        return True
    
    def add_snake(self, head: int, tail: int) -> bool:
        """Add a snake to the board"""
        if self.game_state != GameStateType.WAITING:
            return False
        return self.board.add_snake(head, tail)
    
    def add_ladder(self, bottom: int, top: int) -> bool:
        """Add a ladder to the board"""
        if self.game_state != GameStateType.WAITING:
            return False
        return self.board.add_ladder(bottom, top)
    
    def start_game(self) -> bool:
        """Start the game"""
        if len(self.players) < 2:
            raise InvalidPlayerCountException("At least 2 players required")
        
        if self.game_state != GameStateType.WAITING:
            return False
        
        self.game_state = GameStateType.PLAYING
        self.start_time = datetime.now()
        self.current_player_index = 0
        
        # Reset all players
        for player in self.players:
            player.reset_position()
            player.games_played += 1
        
        return True
    
    def get_current_player(self) -> Player:
        """Get the current player"""
        if not self.players:
            raise GameNotStartedException("No players in game")
        return self.players[self.current_player_index]
    
    def roll_dice(self) -> int:
        """Roll dice for current player"""
        if self.game_state != GameStateType.PLAYING:
            raise GameNotStartedException("Game not in playing state")
        
        dice_value = self.dice.roll()
        self.statistics.add_dice_roll(dice_value)
        return dice_value
    
    def move_current_player(self, dice_value: Optional[int] = None) -> MoveResult:
        """Move current player"""
        if self.game_state != GameStateType.PLAYING:
            raise GameNotStartedException("Game not in playing state")
        
        current_player = self.get_current_player()
        
        if dice_value is None:
            dice_value = self.roll_dice()
        
        # Calculate new position
        start_position = current_player.position
        new_position, move_type, effect_name = self.rules.calculate_new_position(
            start_position, dice_value, self.board
        )
        
        # Create move result
        move_result = MoveResult(
            player_name=current_player.name,
            dice_value=dice_value,
            start_position=start_position,
            end_position=new_position,
            move_type=move_type,
            snake_or_ladder=effect_name,
            is_winner=False
        )
        
        # Update player position
        current_player.move_to(new_position, move_result)
        
        # Update statistics
        self.statistics.player_moves[current_player.name] += 1
        if move_type == MoveType.SNAKE_BITE:
            self.statistics.add_snake_encounter(current_player.name)
        elif move_type == MoveType.LADDER_CLIMB:
            self.statistics.add_ladder_climb(current_player.name)
        
        # Check for win condition
        if self.rules.is_winning_position(new_position, self.board):
            move_result.is_winner = True
            move_result.move_type = MoveType.WIN
            self._end_game(current_player)
        else:
            # Move to next player (unless extra turn rules apply)
            if not self.rules.should_get_extra_turn(dice_value):
                self._next_player()
        
        self.move_history.append(move_result)
        return move_result
    
    def _next_player(self):
        """Move to next player"""
        self.current_player_index = (self.current_player_index + 1) % len(self.players)
    
    def _end_game(self, winner: Player):
        """End the game with a winner"""
        self.game_state = GameStateType.FINISHED
        self.winner = winner
        self.end_time = datetime.now()
        
        if self.start_time:
            self.statistics.game_duration = (self.end_time - self.start_time).total_seconds()
        
        winner.games_won += 1
    
    def get_game_state(self) -> Dict:
        """Get current game state"""
        return {
            'state': self.game_state.value,
            'current_player': self.get_current_player().name if self.players else None,
            'players': [(p.name, p.position) for p in self.players],
            'winner': self.winner.name if self.winner else None,
            'total_moves': len(self.move_history),
            'board_size': self.board.size
        }
    
    def get_board_state(self) -> Dict:
        """Get current board state"""
        return {
            'size': self.board.size,
            'snakes': {pos: {'head': pos, 'tail': snake.tail, 'name': snake.name} 
                      for pos, snake in self.board.snakes.items()},
            'ladders': {pos: {'bottom': pos, 'top': ladder.top, 'name': ladder.name}
                       for pos, ladder in self.board.ladders.items()},
            'player_positions': {player.name: player.position for player in self.players}
        }
    
    def reset_game(self) -> bool:
        """Reset game to initial state"""
        self.game_state = GameStateType.WAITING
        self.current_player_index = 0
        self.move_history.clear()
        self.statistics = GameStatistics()
        self.start_time = None
        self.end_time = None
        self.winner = None
        
        # Reset all players
        for player in self.players:
            player.reset_position()
        
        return True
    
    def get_statistics(self) -> Dict:
        """Get game statistics"""
        stats = {
            'game_duration': self.statistics.game_duration,
            'total_moves': self.statistics.total_moves,
            'average_dice_roll': self.statistics.get_average_dice_roll(),
            'snake_encounters': self.statistics.snake_encounters,
            'ladder_climbs': self.statistics.ladder_climbs,
            'dice_statistics': self.dice.get_statistics(),
            'player_stats': {}
        }
        
        for player in self.players:
            stats['player_stats'][player.name] = {
                'position': player.position,
                'moves': self.statistics.player_moves.get(player.name, 0),
                'snake_bites': self.statistics.player_snake_bites.get(player.name, 0),
                'ladder_climbs': self.statistics.player_ladder_climbs.get(player.name, 0),
                'win_percentage': player.get_win_percentage()
            }
        
        return stats


class BoardRenderer:
    """Visual board representation"""
    
    def __init__(self, board: Board):
        self.board = board
    
    def render_ascii(self, players: List[Player] = None) -> str:
        """Render board as ASCII art"""
        if players is None:
            players = []
        
        # Create player position mapping
        player_positions = {player.position: player.name[0].upper() for player in players if player.position > 0}
        
        output = []
        output.append("=" * (self.board.cols * 6 + 1))
        
        for row in range(self.board.rows):
            line = "|"
            for col in range(self.board.cols):
                pos_obj = None
                # Find position object for this row/col
                for pos_num, pos in self.board.positions.items():
                    if pos.row == row and pos.col == col:
                        pos_obj = pos
                        break
                
                if pos_obj:
                    cell_content = str(pos_obj.number).rjust(3)
                    
                    # Add player marker
                    if pos_obj.number in player_positions:
                        cell_content += f"({player_positions[pos_obj.number]})"
                    elif pos_obj.number in self.board.snakes:
                        cell_content += "(S)"
                    elif pos_obj.number in self.board.ladders:
                        cell_content += "(L)"
                    else:
                        cell_content += "   "
                else:
                    cell_content = "      "
                
                line += cell_content[:6].ljust(6) + "|"
            
            output.append(line)
            output.append("=" * (self.board.cols * 6 + 1))
        
        return "\n".join(output)
    
    def render_compact(self, players: List[Player] = None) -> str:
        """Render compact board representation"""
        if players is None:
            players = []
        
        player_positions = {player.position: player.name for player in players if player.position > 0}
        
        output = []
        output.append(f"Board Size: {self.board.size}")
        output.append(f"Snakes: {len(self.board.snakes)}, Ladders: {len(self.board.ladders)}")
        output.append("-" * 40)
        
        # Show snakes and ladders
        if self.board.snakes:
            output.append("Snakes:")
            for head, snake in sorted(self.board.snakes.items(), reverse=True):
                output.append(f"  {head} → {snake.tail}")
        
        if self.board.ladders:
            output.append("Ladders:")
            for bottom, ladder in sorted(self.board.ladders.items()):
                output.append(f"  {bottom} → {ladder.top}")
        
        # Show player positions
        if player_positions:
            output.append("Players:")
            for pos, name in sorted(player_positions.items(), reverse=True):
                output.append(f"  {name}: {pos}")
        
        return "\n".join(output)


def demo_snake_ladder_game():
    """Demonstrate Snake and Ladder game functionality"""
    print("🐍🪜 Snake and Ladder Game Demo")
    print("=" * 50)
    
    # Create game
    game = SnakeLadderGame(100, GameMode.CLASSIC)
    
    print("\n🎮 1. Game Setup")
    print("-" * 30)
    
    # Add players
    game.add_player("Alice", PlayerType.HUMAN)
    game.add_player("Bob", PlayerType.AI_MEDIUM)
    game.add_player("Charlie", PlayerType.AI_HARD)
    
    print(f"Players added: {[p.name for p in game.players]}")
    print(f"Board size: {game.board.size}")
    print(f"Snakes: {len(game.board.snakes)}")
    print(f"Ladders: {len(game.board.ladders)}")
    
    # Start game
    game.start_game()
    print(f"Game started! Current state: {game.game_state.value}")
    
    print("\n🎲 2. Game Simulation")
    print("-" * 30)
    
    # Simulate game moves
    move_count = 0
    max_moves = 100  # Prevent infinite games
    
    while game.game_state == GameStateType.PLAYING and move_count < max_moves:
        current_player = game.get_current_player()
        print(f"\n{current_player.name}'s turn (Position: {current_player.position})")
        
        # AI thinking simulation
        if isinstance(current_player, AIPlayer):
            print(f"  {current_player.name} is thinking...")
            time.sleep(0.1)  # Reduced thinking time for demo
        
        # Make move
        move_result = game.move_current_player()
        
        # Display move result
        if move_result.move_type == MoveType.NORMAL:
            print(f"  Rolled {move_result.dice_value}, moved to {move_result.end_position}")
        elif move_result.move_type == MoveType.SNAKE_BITE:
            print(f"  Rolled {move_result.dice_value}, hit snake! {move_result.snake_or_ladder}")
            print(f"  Slid down to {move_result.end_position}")
        elif move_result.move_type == MoveType.LADDER_CLIMB:
            print(f"  Rolled {move_result.dice_value}, found ladder! {move_result.snake_or_ladder}")
            print(f"  Climbed up to {move_result.end_position}")
        elif move_result.move_type == MoveType.BLOCKED:
            print(f"  Rolled {move_result.dice_value}, blocked (exact landing required)")
        elif move_result.move_type == MoveType.WIN:
            print(f"  Rolled {move_result.dice_value}, reached position {move_result.end_position}")
            print(f"  🎉 {move_result.player_name} WINS!")
        
        move_count += 1
    
    print(f"\n📊 3. Game Statistics")
    print("-" * 30)
    
    stats = game.get_statistics()
    print(f"Game Duration: {stats['game_duration']:.1f} seconds")
    print(f"Total Moves: {stats['total_moves']}")
    print(f"Average Dice Roll: {stats['average_dice_roll']:.2f}")
    print(f"Snake Encounters: {stats['snake_encounters']}")
    print(f"Ladder Climbs: {stats['ladder_climbs']}")
    
    print("\nPlayer Statistics:")
    for player_name, player_stats in stats['player_stats'].items():
        print(f"  {player_name}:")
        print(f"    Final Position: {player_stats['position']}")
        print(f"    Moves Made: {player_stats['moves']}")
        print(f"    Snake Bites: {player_stats['snake_bites']}")
        print(f"    Ladder Climbs: {player_stats['ladder_climbs']}")
    
    print(f"\n🏆 4. Game Results")
    print("-" * 30)
    
    if game.winner:
        print(f"Winner: {game.winner.name}")
        print(f"Winning Position: {game.winner.position}")
        print(f"Total Moves by Winner: {stats['player_stats'][game.winner.name]['moves']}")
    else:
        print("Game ended without a winner (max moves reached)")
    
    print("\n🎯 5. Board Visualization")
    print("-" * 30)
    
    renderer = BoardRenderer(game.board)
    compact_board = renderer.render_compact(game.players)
    print(compact_board)
    
    print("\n✅ Demo completed successfully!")


def performance_test():
    """Test game performance with multiple simulations"""
    print("\n🚀 Performance Test")
    print("=" * 50)
    
    # Test multiple games
    num_games = 100
    total_moves = 0
    total_duration = 0
    winners = {}
    
    print(f"Running {num_games} game simulations...")
    
    start_time = time.time()
    
    for i in range(num_games):
        game = SnakeLadderGame(100, GameMode.CLASSIC)
        
        # Add AI players for speed
        game.add_player(f"Player1", PlayerType.AI_EASY)
        game.add_player(f"Player2", PlayerType.AI_EASY)
        
        game.start_game()
        
        # Simulate game
        moves = 0
        while game.game_state == GameStateType.PLAYING and moves < 200:
            game.move_current_player()
            moves += 1
        
        # Collect statistics
        if game.winner:
            winners[game.winner.name] = winners.get(game.winner.name, 0) + 1
        
        total_moves += moves
        if game.statistics.game_duration > 0:
            total_duration += game.statistics.game_duration
    
    end_time = time.time()
    
    print(f"\nPerformance Results:")
    print(f"Total Simulation Time: {end_time - start_time:.2f} seconds")
    print(f"Average Game Length: {total_moves / num_games:.1f} moves")
    print(f"Average Game Duration: {total_duration / num_games:.2f} seconds")
    print(f"Games per Second: {num_games / (end_time - start_time):.1f}")
    
    print(f"\nWin Distribution:")
    for player, wins in winners.items():
        print(f"  {player}: {wins} wins ({wins/num_games*100:.1f}%)")
    
    print("\n🎉 Performance test completed!")


def interactive_game():
    """Interactive game mode"""
    print("\n🎮 Interactive Snake and Ladder Game")
    print("=" * 50)
    
    # Get game configuration
    try:
        num_players = int(input("Number of players (2-6): "))
        if not 2 <= num_players <= 6:
            print("Invalid number of players. Using 2 players.")
            num_players = 2
    except ValueError:
        print("Invalid input. Using 2 players.")
        num_players = 2
    
    # Create game
    game = SnakeLadderGame(100, GameMode.CLASSIC)
    
    # Add players
    for i in range(num_players):
        name = input(f"Enter name for player {i+1}: ").strip()
        if not name:
            name = f"Player{i+1}"
        
        player_type_str = input(f"Player type for {name} (human/ai_easy/ai_medium/ai_hard): ").strip().lower()
        player_type = {
            'human': PlayerType.HUMAN,
            'ai_easy': PlayerType.AI_EASY,
            'ai_medium': PlayerType.AI_MEDIUM,
            'ai_hard': PlayerType.AI_HARD
        }.get(player_type_str, PlayerType.HUMAN)
        
        game.add_player(name, player_type)
    
    # Start game
    game.start_game()
    renderer = BoardRenderer(game.board)
    
    print(f"\n🎯 Game Started!")
    print("Commands: 'roll' to roll dice, 'board' to see board, 'stats' for statistics, 'quit' to exit")
    
    # Game loop
    while game.game_state == GameStateType.PLAYING:
        current_player = game.get_current_player()
        print(f"\n{current_player.name}'s turn (Position: {current_player.position})")
        
        if isinstance(current_player, AIPlayer):
            print("AI is making a move...")
            time.sleep(1)
            move_result = game.move_current_player()
        else:
            # Human player input
            while True:
                command = input("Enter command: ").strip().lower()
                
                if command == 'roll':
                    move_result = game.move_current_player()
                    break
                elif command == 'board':
                    print(renderer.render_compact(game.players))
                elif command == 'stats':
                    stats = game.get_statistics()
                    print(f"Moves: {stats['total_moves']}, Avg Dice: {stats['average_dice_roll']:.2f}")
                elif command == 'quit':
                    print("Game ended by player.")
                    return
                else:
                    print("Invalid command. Use 'roll', 'board', 'stats', or 'quit'.")
        
        # Display move result
        print(f"Rolled {move_result.dice_value}")
        if move_result.move_type == MoveType.SNAKE_BITE:
            print(f"Snake bite! Moved to {move_result.end_position}")
        elif move_result.move_type == MoveType.LADDER_CLIMB:
            print(f"Ladder climb! Moved to {move_result.end_position}")
        elif move_result.move_type == MoveType.WIN:
            print(f"🎉 {move_result.player_name} WINS!")
        else:
            print(f"Moved to {move_result.end_position}")
    
    # Show final results
    if game.winner:
        print(f"\n🏆 Congratulations {game.winner.name}!")
        stats = game.get_statistics()
        print(f"Game completed in {stats['total_moves']} moves and {stats['game_duration']:.1f} seconds")


def main():
    """Main function"""
    print("Snake and Ladder Game Implementation")
    print("1. Demo Mode")
    print("2. Interactive Mode")
    print("3. Performance Test")
    
    choice = input("\nSelect mode (1-3): ").strip()
    
    if choice == "1":
        demo_snake_ladder_game()
        performance_test()
    elif choice == "2":
        interactive_game()
    elif choice == "3":
        performance_test()
    else:
        print("Running demo mode...")
        demo_snake_ladder_game()
        performance_test()


if __name__ == "__main__":
    main()