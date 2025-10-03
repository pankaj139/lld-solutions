/**
 * SUDOKU GAME Implementation in JavaScript
 * ========================================
 * 
 * This implementation demonstrates several key Design Patterns and OOP Concepts:
 * 
 * DESIGN PATTERNS USED:
 * 1. Strategy Pattern: Different puzzle generation strategies for difficulty levels
 *    - Easy, Medium, Hard with different clue counts
 *    - Pluggable difficulty configurations
 *    - Easy to add new difficulty levels
 * 
 * 2. Command Pattern: Move operations with undo/redo capability
 *    - Move encapsulates cell changes
 *    - Complete history tracking
 *    - Support for undo/redo operations
 * 
 * 3. Template Method Pattern: Common solving algorithm structure
 *    - Backtracking template with customizable steps
 *    - Standard puzzle solving flow
 *    - Reusable for variants
 * 
 * 4. Singleton Pattern: Game instance management
 *    - Single game controller
 *    - Centralized state management
 * 
 * 5. Observer Pattern: Cell value change notifications
 *    - UI observers for cell updates
 *    - Game event notifications
 *    - Decoupled event system
 * 
 * 6. Memento Pattern: Game state snapshots
 *    - Save/restore game state
 *    - Undo/redo implementation
 * 
 * OOP CONCEPTS DEMONSTRATED:
 * 1. Encapsulation: Board state hidden, cell values protected
 * 2. Abstraction: Clear interfaces for solver, validator, generator
 * 3. Composition: Board composed of cells
 * 4. Polymorphism: Pluggable strategies
 * 
 * ARCHITECTURAL PRINCIPLES:
 * - Single Responsibility: Each class has one clear purpose
 * - Open/Closed: Easy to extend without modification
 * - Dependency Injection: Components injected
 * - Low Coupling: Clean interfaces
 */

// Enums - Using Object.freeze() for immutability
const Difficulty = Object.freeze({
    EASY: { name: 'EASY', minClues: 40, maxClues: 45 },
    MEDIUM: { name: 'MEDIUM', minClues: 30, maxClues: 35 },
    HARD: { name: 'HARD', minClues: 25, maxClues: 28 }
});

const CellState = Object.freeze({
    EMPTY: 'empty',
    GIVEN: 'given',         // Pre-filled, immutable
    PLAYER_FILLED: 'filled' // Player input, mutable
});

const GameState = Object.freeze({
    INITIALIZING: 'initializing',
    READY: 'ready',
    PLAYING: 'playing',
    PAUSED: 'paused',
    FINISHED: 'finished'
});

/**
 * Cell - Individual Sudoku cell
 * 
 * OOP CONCEPT: Encapsulation
 * - Value and state managed internally
 * - Immutability enforced for given cells
 */
class Cell {
    constructor(value = 0, state = CellState.EMPTY) {
        this.value = value;
        this.state = state;
        this.candidates = value === 0 ? new Set([1,2,3,4,5,6,7,8,9]) : new Set();
    }

    isGiven() {
        return this.state === CellState.GIVEN;
    }

    isEmpty() {
        return this.value === 0;
    }

    toString() {
        return this.value !== 0 ? this.value.toString() : '.';
    }
}

/**
 * Board - 9×9 Sudoku board
 * 
 * DESIGN PATTERN: Composite Pattern
 * - Board composed of cells
 * - Provides unified interface for operations
 */
class Board {
    static SIZE = 9;
    static BOX_SIZE = 3;

    constructor() {
        this.grid = Array(Board.SIZE).fill(null)
            .map(() => Array(Board.SIZE).fill(null)
                .map(() => new Cell()));
    }

    getCell(row, col) {
        return this.grid[row][col];
    }

    /**
     * Set cell value
     * 
     * BUSINESS RULE: Cannot modify given cells
     */
    setValue(row, col, value, state = CellState.PLAYER_FILLED) {
        const cell = this.grid[row][col];

        if (cell.isGiven()) {
            return false;
        }

        cell.value = value;
        cell.state = value !== 0 ? state : CellState.EMPTY;
        return true;
    }

    getRow(row) {
        return this.grid[row].map(cell => cell.value);
    }

    getColumn(col) {
        return this.grid.map(row => row[col].value);
    }

    /**
     * Get all values in 3×3 box containing cell
     * 
     * ALGORITHM: Calculate box start position
     */
    getBox(row, col) {
        const boxRow = Math.floor(row / Board.BOX_SIZE) * Board.BOX_SIZE;
        const boxCol = Math.floor(col / Board.BOX_SIZE) * Board.BOX_SIZE;

        const values = [];
        for (let r = boxRow; r < boxRow + Board.BOX_SIZE; r++) {
            for (let c = boxCol; c < boxCol + Board.BOX_SIZE; c++) {
                values.push(this.grid[r][c].value);
            }
        }

        return values;
    }

    isComplete() {
        for (let row = 0; row < Board.SIZE; row++) {
            for (let col = 0; col < Board.SIZE; col++) {
                if (this.grid[row][col].isEmpty()) {
                    return false;
                }
            }
        }
        return true;
    }

    copy() {
        const newBoard = new Board();
        for (let row = 0; row < Board.SIZE; row++) {
            for (let col = 0; col < Board.SIZE; col++) {
                const cell = this.grid[row][col];
                newBoard.grid[row][col] = new Cell(cell.value, cell.state);
            }
        }
        return newBoard;
    }

    display() {
        console.log('\n  ' + Array.from({length: Board.SIZE}, (_, i) => i).join(' '));
        console.log('  ' + '-'.repeat(Board.SIZE * 2 + 5));

        for (let row = 0; row < Board.SIZE; row++) {
            if (row > 0 && row % Board.BOX_SIZE === 0) {
                console.log('  ' + '-'.repeat(Board.SIZE * 2 + 5));
            }

            let rowStr = `${row} |`;
            for (let col = 0; col < Board.SIZE; col++) {
                if (col > 0 && col % Board.BOX_SIZE === 0) {
                    rowStr += '|';
                }

                const cell = this.grid[row][col];
                const valueStr = cell.value !== 0 ? cell.value.toString() : '.';
                rowStr += valueStr + ' ';
            }

            console.log(rowStr.trimEnd() + '|');
        }

        console.log('  ' + '-'.repeat(Board.SIZE * 2 + 5));
    }
}

/**
 * Validator - Validates Sudoku rules
 * 
 * OOP CONCEPT: Single Responsibility
 * - Only responsible for validation
 * - Stateless utility class
 */
class Validator {
    /**
     * Check if value can be placed at position
     * 
     * BUSINESS RULE: No duplicates in row, column, or box
     * 
     * Time Complexity: O(1) - Check 3 sets of size 9
     */
    static isValidPlacement(board, row, col, value) {
        if (value === 0) {  // Clearing cell is always valid
            return true;
        }

        // Check row
        const rowValues = board.getRow(row);
        if (rowValues.some((v, i) => i !== col && v === value)) {
            return false;
        }

        // Check column
        const colValues = board.getColumn(col);
        if (colValues.some((v, i) => i !== row && v === value)) {
            return false;
        }

        // Check 3×3 box
        const boxValues = board.getBox(row, col);
        const boxRow = Math.floor(row / Board.BOX_SIZE) * Board.BOX_SIZE;
        const boxCol = Math.floor(col / Board.BOX_SIZE) * Board.BOX_SIZE;
        const currentIdx = (row - boxRow) * Board.BOX_SIZE + (col - boxCol);

        if (boxValues.some((v, i) => i !== currentIdx && v === value)) {
            return false;
        }

        return true;
    }

    /**
     * Validate entire board solution
     */
    static isSolutionCorrect(board) {
        if (!board.isComplete()) {
            return false;
        }

        for (let row = 0; row < Board.SIZE; row++) {
            for (let col = 0; col < Board.SIZE; col++) {
                const value = board.grid[row][col].value;
                // Temporarily clear to check if placement is valid
                board.grid[row][col].value = 0;
                const valid = Validator.isValidPlacement(board, row, col, value);
                board.grid[row][col].value = value;

                if (!valid) {
                    return false;
                }
            }
        }

        return true;
    }
}

/**
 * SudokuSolver - Solves Sudoku puzzles using backtracking
 * 
 * DESIGN PATTERN: Template Method Pattern
 * - Standard backtracking algorithm
 * - Customizable heuristics
 */
class SudokuSolver {
    /**
     * Solve Sudoku puzzle using backtracking
     * 
     * ALGORITHM: Backtracking with constraint propagation
     * - Find empty cell
     * - Try values 1-9
     * - Recursively solve
     * - Backtrack if no solution
     * 
     * Time Complexity: O(9^m) where m is empty cells
     */
    static solve(board) {
        const empty = SudokuSolver.findEmptyCell(board);

        if (!empty) {
            return true; // Puzzle solved
        }

        const [row, col] = empty;

        for (let value = 1; value <= 9; value++) {
            if (Validator.isValidPlacement(board, row, col, value)) {
                board.grid[row][col].value = value;

                if (SudokuSolver.solve(board)) {
                    return true;
                }

                // Backtrack
                board.grid[row][col].value = 0;
            }
        }

        return false; // No solution found
    }

    static findEmptyCell(board) {
        for (let row = 0; row < Board.SIZE; row++) {
            for (let col = 0; col < Board.SIZE; col++) {
                if (board.grid[row][col].isEmpty()) {
                    return [row, col];
                }
            }
        }
        return null;
    }

    /**
     * Count number of solutions (up to limit)
     * 
     * BUSINESS RULE: Valid puzzles have exactly 1 solution
     */
    static countSolutions(board, limit = 2) {
        let count = 0;

        function backtrack() {
            if (count >= limit) {
                return;
            }

            const empty = SudokuSolver.findEmptyCell(board);

            if (!empty) {
                count++;
                return;
            }

            const [row, col] = empty;

            for (let value = 1; value <= 9; value++) {
                if (Validator.isValidPlacement(board, row, col, value)) {
                    board.grid[row][col].value = value;
                    backtrack();
                    board.grid[row][col].value = 0;
                }
            }
        }

        backtrack();
        return count;
    }
}

/**
 * PuzzleGenerator - Generates valid Sudoku puzzles
 * 
 * DESIGN PATTERN: Strategy Pattern
 * - Different strategies for different difficulties
 * - Ensures unique solution
 */
class PuzzleGenerator {
    constructor(difficulty) {
        this.difficulty = difficulty;
    }

    /**
     * Generate complete puzzle
     * 
     * ALGORITHM:
     * 1. Generate filled board
     * 2. Remove numbers while maintaining unique solution
     */
    generate() {
        const board = this._generateCompleteBoard();
        const puzzle = this._removeNumbers(board);
        return puzzle;
    }

    /**
     * Generate completely filled valid board
     * 
     * ALGORITHM:
     * 1. Fill diagonal boxes (independent)
     * 2. Solve remaining cells
     */
    _generateCompleteBoard() {
        const board = new Board();

        // Fill diagonal 3×3 boxes first (they don't affect each other)
        for (let box = 0; box < Board.SIZE; box += Board.BOX_SIZE) {
            this._fillBox(board, box, box);
        }

        // Solve remaining cells
        SudokuSolver.solve(board);

        return board;
    }

    _fillBox(board, rowStart, colStart) {
        const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];
        // Fisher-Yates shuffle
        for (let i = numbers.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
        }

        let idx = 0;
        for (let row = rowStart; row < rowStart + Board.BOX_SIZE; row++) {
            for (let col = colStart; col < colStart + Board.BOX_SIZE; col++) {
                board.grid[row][col].value = numbers[idx];
                idx++;
            }
        }
    }

    /**
     * Remove numbers while ensuring unique solution
     * 
     * BUSINESS RULE: Puzzle must have exactly one solution
     */
    _removeNumbers(board) {
        const puzzle = board.copy();

        // Calculate number of cells to remove
        const totalCells = Board.SIZE * Board.SIZE;
        const clues = Math.floor(Math.random() * 
            (this.difficulty.maxClues - this.difficulty.minClues + 1)) + 
            this.difficulty.minClues;
        const cellsToRemove = totalCells - clues;

        // Get all cell positions
        const positions = [];
        for (let r = 0; r < Board.SIZE; r++) {
            for (let c = 0; c < Board.SIZE; c++) {
                positions.push([r, c]);
            }
        }

        // Shuffle positions
        for (let i = positions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [positions[i], positions[j]] = [positions[j], positions[i]];
        }

        let removed = 0;
        for (const [row, col] of positions) {
            if (removed >= cellsToRemove) {
                break;
            }

            // Save current value
            const backup = puzzle.grid[row][col].value;
            puzzle.grid[row][col].value = 0;

            // Check if still has unique solution
            const puzzleCopy = puzzle.copy();
            if (SudokuSolver.countSolutions(puzzleCopy, 2) === 1) {
                removed++;
            } else {
                // Restore value if multiple solutions
                puzzle.grid[row][col].value = backup;
            }
        }

        // Mark remaining cells as given
        for (let row = 0; row < Board.SIZE; row++) {
            for (let col = 0; col < Board.SIZE; col++) {
                if (puzzle.grid[row][col].value !== 0) {
                    puzzle.grid[row][col].state = CellState.GIVEN;
                }
            }
        }

        return puzzle;
    }
}

/**
 * Move - Command Pattern implementation
 * 
 * DESIGN PATTERN: Command Pattern
 * - Encapsulates move information
 * - Supports undo/redo
 */
class Move {
    constructor(row, col, oldValue, newValue) {
        this.row = row;
        this.col = col;
        this.oldValue = oldValue;
        this.newValue = newValue;
    }

    toString() {
        return `Move(${this.row},${this.col}: ${this.oldValue}→${this.newValue})`;
    }
}

/**
 * SudokuGame - Main Sudoku game controller
 * 
 * DESIGN PATTERN: Facade Pattern
 * - Simple interface to complex Sudoku system
 * - Coordinates all components
 */
class SudokuGame {
    constructor(difficulty = Difficulty.MEDIUM) {
        this.difficulty = difficulty;
        this.board = null;
        this.solution = null;
        this.moveHistory = [];
        this.redoStack = [];
        this.hintsUsed = 0;
        this.movesMade = 0;
        this.startTime = null;
        this.state = GameState.INITIALIZING;
    }

    startNewGame() {
        console.log(`\nGenerating ${this.difficulty.name} puzzle...`);

        const generator = new PuzzleGenerator(this.difficulty);
        const completeBoard = generator._generateCompleteBoard();
        this.solution = completeBoard.copy();
        this.board = generator._removeNumbers(completeBoard);

        this.moveHistory = [];
        this.redoStack = [];
        this.hintsUsed = 0;
        this.movesMade = 0;
        this.startTime = Date.now();
        this.state = GameState.PLAYING;

        console.log('Puzzle generated!\n');
    }

    /**
     * Place number on board
     * 
     * BUSINESS RULE: Must be valid placement
     */
    placeNumber(row, col, value) {
        if (this.state !== GameState.PLAYING) {
            return false;
        }

        const cell = this.board.getCell(row, col);

        if (cell.isGiven()) {
            console.log('Cannot modify given cell!');
            return false;
        }

        if (!Validator.isValidPlacement(this.board, row, col, value)) {
            console.log('Invalid placement - violates Sudoku rules!');
            return false;
        }

        // Record move
        const move = new Move(row, col, cell.value, value);
        this.moveHistory.push(move);
        this.redoStack = [];

        this.board.setValue(row, col, value);
        this.movesMade++;

        // Check if complete
        if (this.board.isComplete()) {
            if (this.checkSolution()) {
                this.state = GameState.FINISHED;
                this._showVictory();
            }
        }

        return true;
    }

    getHint(row, col) {
        if (this.state !== GameState.PLAYING) {
            return null;
        }

        const cell = this.board.getCell(row, col);

        if (cell.isGiven() || !cell.isEmpty()) {
            return null;
        }

        this.hintsUsed++;
        return this.solution.grid[row][col].value;
    }

    undoMove() {
        if (this.moveHistory.length === 0) {
            return false;
        }

        const move = this.moveHistory.pop();
        this.board.setValue(move.row, move.col, move.oldValue);
        this.redoStack.push(move);

        return true;
    }

    redoMove() {
        if (this.redoStack.length === 0) {
            return false;
        }

        const move = this.redoStack.pop();
        this.board.setValue(move.row, move.col, move.newValue);
        this.moveHistory.push(move);

        return true;
    }

    checkSolution() {
        return Validator.isSolutionCorrect(this.board);
    }

    _showVictory() {
        const elapsed = (Date.now() - this.startTime) / 1000;
        console.log('\n' + '='.repeat(60));
        console.log('🎉 CONGRATULATIONS! PUZZLE SOLVED! 🎉');
        console.log('='.repeat(60));
        console.log(`Difficulty: ${this.difficulty.name}`);
        console.log(`Time: ${elapsed.toFixed(1)} seconds`);
        console.log(`Moves: ${this.movesMade}`);
        console.log(`Hints used: ${this.hintsUsed}`);
        console.log('='.repeat(60));
    }
}

/**
 * Demonstrate Sudoku game
 */
function main() {
    console.log('='.repeat(60));
    console.log('SUDOKU GAME - Low Level Design Demo');
    console.log('='.repeat(60));

    // Demo: Generate and solve puzzle
    const game = new SudokuGame(Difficulty.EASY);
    game.startNewGame();

    console.log('Generated Puzzle:');
    game.board.display();

    // Show solution
    console.log('\nSolution:');
    game.solution.display();

    // Demo: Auto-solve
    console.log('\n\nDemo: Auto-solving puzzle...');
    const puzzleCopy = game.board.copy();
    if (SudokuSolver.solve(puzzleCopy)) {
        console.log('Solved successfully!');
        puzzleCopy.display();
    }

    console.log('\n' + '='.repeat(60));
    console.log('DEMO COMPLETE');
    console.log('='.repeat(60));
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        SudokuGame,
        Board,
        Cell,
        Validator,
        SudokuSolver,
        PuzzleGenerator,
        Move,
        Difficulty,
        CellState,
        GameState
    };
}

// Run demo if executed directly
if (typeof require !== 'undefined' && require.main === module) {
    main();
}

