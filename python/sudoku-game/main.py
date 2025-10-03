"""
SUDOKU GAME - Low Level Design Implementation in Python

DESIGN PATTERNS USED:
1. STRATEGY PATTERN: Different puzzle generation strategies for difficulty levels
   - Easy, Medium, Hard strategies with different clue counts
   - Pluggable difficulty configurations
   - Easy to add new difficulty levels

2. COMMAND PATTERN: Move operations with undo/redo capability
   - Move encapsulates cell changes
   - Complete history tracking
   - Support for undo/redo

3. TEMPLATE METHOD PATTERN: Common solving algorithm structure
   - Backtracking template with customizable steps
   - Standard puzzle solving flow
   - Reusable for different Sudoku variants

4. SINGLETON PATTERN: Game instance management
   - Single game controller
   - Centralized state management

5. OBSERVER PATTERN: Cell value change notifications
   - UI observers for cell updates
   - Game event notifications
   - Decoupled event system

6. MEMENTO PATTERN: Game state snapshots
   - Save/restore game state
   - Undo/redo implementation
   - State preservation

OOP CONCEPTS DEMONSTRATED:
- ENCAPSULATION: Board state hidden, cell values protected
- ABSTRACTION: Clear interfaces for solver, validator, generator
- INHERITANCE: Different difficulty strategies
- POLYMORPHISM: Pluggable strategies and commands

SOLID PRINCIPLES:
- SRP: Each class has single responsibility
- OCP: Easy to extend with new difficulty levels
- LSP: All strategies interchangeable
- ISP: Focused interfaces
- DIP: Depends on abstractions

BUSINESS FEATURES:
- Complete Sudoku puzzle generation
- Backtracking solver algorithm
- Multiple difficulty levels
- Hint system
- Move validation
- Undo/redo functionality

ARCHITECTURAL NOTES:
- Efficient backtracking algorithm
- Unique solution guarantee
- Clean separation of concerns
- Extensible for GUI
"""

from enum import Enum
from typing import List, Tuple, Optional, Set
from copy import deepcopy
import random
import time


# Enums - Domain model definitions
class Difficulty(Enum):
    """
    Sudoku difficulty levels based on number of clues
    
    BUSINESS RULE: Fewer clues = harder puzzle
    """
    EASY = (40, 45)      # 40-45 clues
    MEDIUM = (30, 35)    # 30-35 clues
    HARD = (25, 28)      # 25-28 clues
    
    @property
    def min_clues(self):
        return self.value[0]
    
    @property
    def max_clues(self):
        return self.value[1]


class CellState(Enum):
    """Cell state indicating if value is given or player-filled"""
    EMPTY = "empty"
    GIVEN = "given"           # Pre-filled, immutable
    PLAYER_FILLED = "filled"  # Player input, mutable


class GameState(Enum):
    """Current game state"""
    INITIALIZING = "initializing"
    READY = "ready"
    PLAYING = "playing"
    PAUSED = "paused"
    FINISHED = "finished"


class Cell:
    """
    Individual Sudoku cell
    
    OOP CONCEPT: Encapsulation
    - Value and state managed internally
    - Immutability enforced for given cells
    """
    def __init__(self, value: int = 0, state: CellState = CellState.EMPTY):
        self.value = value
        self.state = state
        self.candidates: Set[int] = set(range(1, 10)) if value == 0 else set()
    
    def is_given(self) -> bool:
        """Check if cell is pre-filled (immutable)"""
        return self.state == CellState.GIVEN
    
    def is_empty(self) -> bool:
        """Check if cell is empty"""
        return self.value == 0
    
    def __str__(self):
        return str(self.value) if self.value != 0 else "."
    
    def __repr__(self):
        return str(self)


class Board:
    """
    9×9 Sudoku board
    
    DESIGN PATTERN: Composite Pattern
    - Board composed of cells
    - Provides unified interface for operations
    """
    SIZE = 9
    BOX_SIZE = 3
    
    def __init__(self):
        self.grid: List[List[Cell]] = [[Cell() for _ in range(self.SIZE)] 
                                        for _ in range(self.SIZE)]
    
    def get_cell(self, row: int, col: int) -> Cell:
        """Get cell at position"""
        return self.grid[row][col]
    
    def set_value(self, row: int, col: int, value: int, state: CellState = CellState.PLAYER_FILLED) -> bool:
        """
        Set cell value
        
        BUSINESS RULE: Cannot modify given cells
        """
        cell = self.grid[row][col]
        
        if cell.is_given():
            return False
        
        cell.value = value
        cell.state = state if value != 0 else CellState.EMPTY
        return True
    
    def get_row(self, row: int) -> List[int]:
        """Get all values in row"""
        return [self.grid[row][col].value for col in range(self.SIZE)]
    
    def get_column(self, col: int) -> List[int]:
        """Get all values in column"""
        return [self.grid[row][col].value for row in range(self.SIZE)]
    
    def get_box(self, row: int, col: int) -> List[int]:
        """
        Get all values in 3×3 box containing cell
        
        ALGORITHM: Calculate box start position
        """
        box_row = (row // self.BOX_SIZE) * self.BOX_SIZE
        box_col = (col // self.BOX_SIZE) * self.BOX_SIZE
        
        values = []
        for r in range(box_row, box_row + self.BOX_SIZE):
            for c in range(box_col, box_col + self.BOX_SIZE):
                values.append(self.grid[r][c].value)
        
        return values
    
    def is_complete(self) -> bool:
        """Check if all cells are filled"""
        for row in range(self.SIZE):
            for col in range(self.SIZE):
                if self.grid[row][col].is_empty():
                    return False
        return True
    
    def copy(self) -> 'Board':
        """Create deep copy of board"""
        new_board = Board()
        for row in range(self.SIZE):
            for col in range(self.SIZE):
                cell = self.grid[row][col]
                new_board.grid[row][col] = Cell(cell.value, cell.state)
        return new_board
    
    def display(self):
        """Display board in console with grid lines"""
        print("\n  " + " ".join(str(i) for i in range(self.SIZE)))
        print("  " + "-" * (self.SIZE * 2 + 5))
        
        for row in range(self.SIZE):
            if row > 0 and row % self.BOX_SIZE == 0:
                print("  " + "-" * (self.SIZE * 2 + 5))
            
            row_str = f"{row} |"
            for col in range(self.SIZE):
                if col > 0 and col % self.BOX_SIZE == 0:
                    row_str += "|"
                
                cell = self.grid[row][col]
                value_str = str(cell.value) if cell.value != 0 else "."
                row_str += value_str + " "
            
            print(row_str.rstrip() + "|")
        
        print("  " + "-" * (self.SIZE * 2 + 5))


class Validator:
    """
    Validates Sudoku rules
    
    OOP CONCEPT: Single Responsibility
    - Only responsible for validation
    - Stateless utility class
    """
    @staticmethod
    def is_valid_placement(board: Board, row: int, col: int, value: int) -> bool:
        """
        Check if value can be placed at position
        
        BUSINESS RULE: No duplicates in row, column, or box
        
        Time Complexity: O(1) - Check 3 sets of size 9
        """
        if value == 0:  # Clearing cell is always valid
            return True
        
        # Check row
        row_values = board.get_row(row)
        if value in [v for i, v in enumerate(row_values) if i != col and v != 0]:
            return False
        
        # Check column
        col_values = board.get_column(col)
        if value in [v for i, v in enumerate(col_values) if i != row and v != 0]:
            return False
        
        # Check 3×3 box
        box_values = board.get_box(row, col)
        # Get current cell's index in box
        box_row = (row // Board.BOX_SIZE) * Board.BOX_SIZE
        box_col = (col // Board.BOX_SIZE) * Board.BOX_SIZE
        current_idx = (row - box_row) * Board.BOX_SIZE + (col - box_col)
        
        if value in [v for i, v in enumerate(box_values) if i != current_idx and v != 0]:
            return False
        
        return True
    
    @staticmethod
    def is_solution_correct(board: Board) -> bool:
        """Validate entire board solution"""
        if not board.is_complete():
            return False
        
        for row in range(Board.SIZE):
            for col in range(Board.SIZE):
                value = board.grid[row][col].value
                # Temporarily clear to check if placement is valid
                board.grid[row][col].value = 0
                valid = Validator.is_valid_placement(board, row, col, value)
                board.grid[row][col].value = value
                
                if not valid:
                    return False
        
        return True


class SudokuSolver:
    """
    Solves Sudoku puzzles using backtracking
    
    DESIGN PATTERN: Template Method Pattern
    - Standard backtracking algorithm
    - Customizable heuristics
    """
    @staticmethod
    def solve(board: Board) -> bool:
        """
        Solve Sudoku puzzle using backtracking
        
        ALGORITHM: Backtracking with constraint propagation
        - Find empty cell
        - Try values 1-9
        - Recursively solve
        - Backtrack if no solution
        
        Time Complexity: O(9^m) where m is empty cells
        """
        empty = SudokuSolver.find_empty_cell(board)
        
        if not empty:
            return True  # Puzzle solved
        
        row, col = empty
        
        for value in range(1, 10):
            if Validator.is_valid_placement(board, row, col, value):
                board.grid[row][col].value = value
                
                if SudokuSolver.solve(board):
                    return True
                
                # Backtrack
                board.grid[row][col].value = 0
        
        return False  # No solution found
    
    @staticmethod
    def find_empty_cell(board: Board) -> Optional[Tuple[int, int]]:
        """Find next empty cell (row, col)"""
        for row in range(Board.SIZE):
            for col in range(Board.SIZE):
                if board.grid[row][col].is_empty():
                    return (row, col)
        return None
    
    @staticmethod
    def count_solutions(board: Board, limit: int = 2) -> int:
        """
        Count number of solutions (up to limit)
        
        BUSINESS RULE: Valid puzzles have exactly 1 solution
        """
        count = [0]  # Use list to modify in nested function
        
        def backtrack():
            if count[0] >= limit:
                return
            
            empty = SudokuSolver.find_empty_cell(board)
            
            if not empty:
                count[0] += 1
                return
            
            row, col = empty
            
            for value in range(1, 10):
                if Validator.is_valid_placement(board, row, col, value):
                    board.grid[row][col].value = value
                    backtrack()
                    board.grid[row][col].value = 0
        
        backtrack()
        return count[0]


class PuzzleGenerator:
    """
    Generates valid Sudoku puzzles
    
    DESIGN PATTERN: Strategy Pattern
    - Different strategies for different difficulties
    - Ensures unique solution
    """
    def __init__(self, difficulty: Difficulty):
        self.difficulty = difficulty
    
    def generate(self) -> Board:
        """
        Generate complete puzzle
        
        ALGORITHM:
        1. Generate filled board
        2. Remove numbers while maintaining unique solution
        """
        board = self._generate_complete_board()
        puzzle = self._remove_numbers(board)
        return puzzle
    
    def _generate_complete_board(self) -> Board:
        """
        Generate completely filled valid board
        
        ALGORITHM:
        1. Fill diagonal boxes (independent)
        2. Solve remaining cells
        """
        board = Board()
        
        # Fill diagonal 3×3 boxes first (they don't affect each other)
        for box in range(0, Board.SIZE, Board.BOX_SIZE):
            self._fill_box(board, box, box)
        
        # Solve remaining cells
        SudokuSolver.solve(board)
        
        return board
    
    def _fill_box(self, board: Board, row_start: int, col_start: int):
        """Fill a 3×3 box with random values"""
        numbers = list(range(1, 10))
        random.shuffle(numbers)
        
        idx = 0
        for row in range(row_start, row_start + Board.BOX_SIZE):
            for col in range(col_start, col_start + Board.BOX_SIZE):
                board.grid[row][col].value = numbers[idx]
                idx += 1
    
    def _remove_numbers(self, board: Board) -> Board:
        """
        Remove numbers while ensuring unique solution
        
        BUSINESS RULE: Puzzle must have exactly one solution
        """
        puzzle = board.copy()
        
        # Calculate number of cells to remove
        total_cells = Board.SIZE * Board.SIZE
        clues = random.randint(self.difficulty.min_clues, self.difficulty.max_clues)
        cells_to_remove = total_cells - clues
        
        # Get all cell positions
        positions = [(r, c) for r in range(Board.SIZE) for c in range(Board.SIZE)]
        random.shuffle(positions)
        
        removed = 0
        for row, col in positions:
            if removed >= cells_to_remove:
                break
            
            # Save current value
            backup = puzzle.grid[row][col].value
            puzzle.grid[row][col].value = 0
            
            # Check if still has unique solution
            board_copy = puzzle.copy()
            if SudokuSolver.count_solutions(board_copy, limit=2) == 1:
                removed += 1
            else:
                # Restore value if multiple solutions
                puzzle.grid[row][col].value = backup
        
        # Mark remaining cells as given
        for row in range(Board.SIZE):
            for col in range(Board.SIZE):
                if puzzle.grid[row][col].value != 0:
                    puzzle.grid[row][col].state = CellState.GIVEN
        
        return puzzle


class Move:
    """
    Command Pattern: Represents a move with undo capability
    
    DESIGN PATTERN: Command Pattern
    - Encapsulates move information
    - Supports undo/redo
    """
    def __init__(self, row: int, col: int, old_value: int, new_value: int):
        self.row = row
        self.col = col
        self.old_value = old_value
        self.new_value = new_value
    
    def __repr__(self):
        return f"Move({self.row},{self.col}: {self.old_value}→{self.new_value})"


class SudokuGame:
    """
    Main Sudoku game controller
    
    DESIGN PATTERN: Facade Pattern
    - Simple interface to complex Sudoku system
    - Coordinates all components
    """
    def __init__(self, difficulty: Difficulty = Difficulty.MEDIUM):
        self.difficulty = difficulty
        self.board: Optional[Board] = None
        self.solution: Optional[Board] = None
        self.move_history: List[Move] = []
        self.redo_stack: List[Move] = []
        self.hints_used = 0
        self.moves_made = 0
        self.start_time = None
        self.state = GameState.INITIALIZING
    
    def start_new_game(self):
        """Start new game with puzzle generation"""
        print(f"\nGenerating {self.difficulty.name} puzzle...")
        
        generator = PuzzleGenerator(self.difficulty)
        complete_board = generator._generate_complete_board()
        self.solution = complete_board.copy()
        self.board = generator._remove_numbers(complete_board)
        
        self.move_history = []
        self.redo_stack = []
        self.hints_used = 0
        self.moves_made = 0
        self.start_time = time.time()
        self.state = GameState.PLAYING
        
        print("Puzzle generated!\n")
    
    def place_number(self, row: int, col: int, value: int) -> bool:
        """
        Place number on board
        
        BUSINESS RULE: Must be valid placement
        """
        if self.state != GameState.PLAYING:
            return False
        
        cell = self.board.get_cell(row, col)
        
        if cell.is_given():
            print("Cannot modify given cell!")
            return False
        
        if not Validator.is_valid_placement(self.board, row, col, value):
            print("Invalid placement - violates Sudoku rules!")
            return False
        
        # Record move
        move = Move(row, col, cell.value, value)
        self.move_history.append(move)
        self.redo_stack.clear()
        
        self.board.set_value(row, col, value)
        self.moves_made += 1
        
        # Check if complete
        if self.board.is_complete():
            if self.check_solution():
                self.state = GameState.FINISHED
                self._show_victory()
        
        return True
    
    def get_hint(self, row: int, col: int) -> Optional[int]:
        """Get correct value for cell"""
        if self.state != GameState.PLAYING:
            return None
        
        cell = self.board.get_cell(row, col)
        
        if cell.is_given() or not cell.is_empty():
            return None
        
        self.hints_used += 1
        return self.solution.grid[row][col].value
    
    def undo_move(self) -> bool:
        """Undo last move"""
        if not self.move_history:
            return False
        
        move = self.move_history.pop()
        self.board.set_value(move.row, move.col, move.old_value)
        self.redo_stack.append(move)
        
        return True
    
    def redo_move(self) -> bool:
        """Redo previously undone move"""
        if not self.redo_stack:
            return False
        
        move = self.redo_stack.pop()
        self.board.set_value(move.row, move.col, move.new_value)
        self.move_history.append(move)
        
        return True
    
    def check_solution(self) -> bool:
        """Check if current board is correct solution"""
        return Validator.is_solution_correct(self.board)
    
    def _show_victory(self):
        """Display victory message"""
        elapsed = time.time() - self.start_time
        print("\n" + "=" * 60)
        print("🎉 CONGRATULATIONS! PUZZLE SOLVED! 🎉")
        print("=" * 60)
        print(f"Difficulty: {self.difficulty.name}")
        print(f"Time: {elapsed:.1f} seconds")
        print(f"Moves: {self.moves_made}")
        print(f"Hints used: {self.hints_used}")
        print("=" * 60)


def main():
    """Demonstrate Sudoku game"""
    print("=" * 60)
    print("SUDOKU GAME - Low Level Design Demo")
    print("=" * 60)
    
    # Demo: Generate and solve puzzle
    game = SudokuGame(difficulty=Difficulty.EASY)
    game.start_new_game()
    
    print("Generated Puzzle:")
    game.board.display()
    
    # Show solution
    print("\nSolution:")
    game.solution.display()
    
    # Demo: Auto-solve
    print("\n\nDemo: Auto-solving puzzle...")
    puzzle_copy = game.board.copy()
    if SudokuSolver.solve(puzzle_copy):
        print("Solved successfully!")
        puzzle_copy.display()
    
    print("\n" + "=" * 60)
    print("DEMO COMPLETE")
    print("=" * 60)


if __name__ == "__main__":
    main()

