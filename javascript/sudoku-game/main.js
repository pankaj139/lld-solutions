// Sudoku Game - JavaScript Implementation
// Logic puzzle game with solver and generator

const Difficulty = { EASY: 'EASY', MEDIUM: 'MEDIUM', HARD: 'HARD', EXPERT: 'EXPERT' };
const CellState = { EMPTY: 0, GIVEN: 'GIVEN', FILLED: 'FILLED', INVALID: 'INVALID' };

class SudokuCell {
    constructor(value = 0, isGiven = false) {
        this.value = value;
        this.isGiven = isGiven;
        this.state = value === 0 ? CellState.EMPTY : (isGiven ? CellState.GIVEN : CellState.FILLED);
        this.candidates = value === 0 ? new Set([1,2,3,4,5,6,7,8,9]) : new Set();
        this.isValid = true;
    }
    
    setValue(value, isGiven = false) {
        this.value = value;
        this.isGiven = isGiven;
        this.state = value === 0 ? CellState.EMPTY : (isGiven ? CellState.GIVEN : CellState.FILLED);
        this.candidates = value === 0 ? new Set([1,2,3,4,5,6,7,8,9]) : new Set();
    }
    
    addCandidate(value) { if (this.value === 0) this.candidates.add(value); }
    removeCandidate(value) { this.candidates.delete(value); }
    clearCandidates() { this.candidates.clear(); }
}

class SudokuBoard {
    constructor() {
        this.grid = Array(9).fill().map(() => Array(9).fill().map(() => new SudokuCell()));
        this.isValid = true;
        this.isSolved = false;
    }
    
    setCell(row, col, value, isGiven = false) {
        if (row < 0 || row >= 9 || col < 0 || col >= 9) return false;
        if (this.grid[row][col].isGiven && !isGiven) return false;
        
        this.grid[row][col].setValue(value, isGiven);
        this.updateCandidates();
        this.validateBoard();
        return true;
    }
    
    getCell(row, col) {
        if (row < 0 || row >= 9 || col < 0 || col >= 9) return null;
        return this.grid[row][col];
    }
    
    clearCell(row, col) {
        if (this.grid[row][col].isGiven) return false;
        this.grid[row][col].setValue(0);
        this.updateCandidates();
        this.validateBoard();
        return true;
    }
    
    isValidMove(row, col, value) {
        if (value < 1 || value > 9) return false;
        
        // Check row
        for (let c = 0; c < 9; c++) {
            if (c !== col && this.grid[row][c].value === value) return false;
        }
        
        // Check column
        for (let r = 0; r < 9; r++) {
            if (r !== row && this.grid[r][col].value === value) return false;
        }
        
        // Check 3x3 box
        const boxRow = Math.floor(row / 3) * 3;
        const boxCol = Math.floor(col / 3) * 3;
        for (let r = boxRow; r < boxRow + 3; r++) {
            for (let c = boxCol; c < boxCol + 3; c++) {
                if ((r !== row || c !== col) && this.grid[r][c].value === value) return false;
            }
        }
        
        return true;
    }
    
    updateCandidates() {
        // Clear all candidates
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (this.grid[row][col].value === 0) {
                    this.grid[row][col].candidates = new Set([1,2,3,4,5,6,7,8,9]);
                }
            }
        }
        
        // Remove invalid candidates
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (this.grid[row][col].value === 0) {
                    for (let value = 1; value <= 9; value++) {
                        if (!this.isValidMove(row, col, value)) {
                            this.grid[row][col].removeCandidate(value);
                        }
                    }
                }
            }
        }
    }
    
    validateBoard() {
        this.isValid = true;
        
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                const cell = this.grid[row][col];
                if (cell.value !== 0) {
                    cell.isValid = this.isValidMove(row, col, cell.value);
                    if (!cell.isValid) this.isValid = false;
                } else {
                    cell.isValid = true;
                }
            }
        }
        
        this.checkSolved();
    }
    
    checkSolved() {
        if (!this.isValid) {
            this.isSolved = false;
            return;
        }
        
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (this.grid[row][col].value === 0) {
                    this.isSolved = false;
                    return;
                }
            }
        }
        
        this.isSolved = true;
    }
    
    getEmptyCells() {
        const empty = [];
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (this.grid[row][col].value === 0) {
                    empty.push({ row, col });
                }
            }
        }
        return empty;
    }
    
    clone() {
        const newBoard = new SudokuBoard();
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                const cell = this.grid[row][col];
                newBoard.grid[row][col] = new SudokuCell(cell.value, cell.isGiven);
            }
        }
        newBoard.updateCandidates();
        newBoard.validateBoard();
        return newBoard;
    }
    
    reset() {
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (!this.grid[row][col].isGiven) {
                    this.grid[row][col].setValue(0);
                }
            }
        }
        this.updateCandidates();
        this.validateBoard();
    }
    
    toString() {
        let result = '';
        for (let row = 0; row < 9; row++) {
            if (row % 3 === 0) result += '+-------+-------+-------+\n';
            for (let col = 0; col < 9; col++) {
                if (col % 3 === 0) result += '| ';
                const value = this.grid[row][col].value;
                result += (value === 0 ? '.' : value) + ' ';
            }
            result += '|\n';
        }
        result += '+-------+-------+-------+';
        return result;
    }
}

class SudokuSolver {
    constructor() {
        this.solutions = [];
        this.maxSolutions = 2; // Stop after finding 2 solutions
    }
    
    solve(board) {
        this.solutions = [];
        const workingBoard = board.clone();
        this.backtrack(workingBoard);
        return this.solutions;
    }
    
    backtrack(board) {
        if (this.solutions.length >= this.maxSolutions) return;
        
        board.updateCandidates();
        const emptyCells = board.getEmptyCells();
        
        if (emptyCells.length === 0) {
            board.validateBoard();
            if (board.isSolved) {
                this.solutions.push(board.clone());
            }
            return;
        }
        
        // Choose cell with fewest candidates (MRV heuristic)
        let bestCell = null;
        let minCandidates = 10;
        
        for (const cell of emptyCells) {
            const candidates = board.grid[cell.row][cell.col].candidates;
            if (candidates.size < minCandidates) {
                minCandidates = candidates.size;
                bestCell = cell;
            }
        }
        
        if (!bestCell || minCandidates === 0) return;
        
        const candidates = Array.from(board.grid[bestCell.row][bestCell.col].candidates);
        
        for (const value of candidates) {
            if (board.isValidMove(bestCell.row, bestCell.col, value)) {
                board.setCell(bestCell.row, bestCell.col, value);
                this.backtrack(board);
                board.clearCell(bestCell.row, bestCell.col);
            }
        }
    }
    
    hasUniqueSolution(board) {
        const solutions = this.solve(board);
        return solutions.length === 1;
    }
    
    getSolution(board) {
        const solutions = this.solve(board);
        return solutions.length > 0 ? solutions[0] : null;
    }
}

class SudokuGenerator {
    constructor() {
        this.solver = new SudokuSolver();
    }
    
    generate(difficulty = Difficulty.MEDIUM) {
        // Start with empty board and fill it
        const board = new SudokuBoard();
        this.fillBoard(board);
        
        // Remove cells based on difficulty
        const cellsToRemove = this.getCellsToRemove(difficulty);
        this.removeClues(board, cellsToRemove);
        
        return board;
    }
    
    fillBoard(board) {
        const emptyCells = board.getEmptyCells();
        if (emptyCells.length === 0) return true;
        
        // Shuffle the first empty cell candidates
        const cell = emptyCells[0];
        const candidates = [1,2,3,4,5,6,7,8,9].sort(() => Math.random() - 0.5);
        
        for (const value of candidates) {
            if (board.isValidMove(cell.row, cell.col, value)) {
                board.setCell(cell.row, cell.col, value, true);
                
                if (this.fillBoard(board)) {
                    return true;
                }
                
                board.clearCell(cell.row, cell.col);
            }
        }
        
        return false;
    }
    
    getCellsToRemove(difficulty) {
        switch (difficulty) {
            case Difficulty.EASY: return 40;
            case Difficulty.MEDIUM: return 50;
            case Difficulty.HARD: return 58;
            case Difficulty.EXPERT: return 64;
            default: return 50;
        }
    }
    
    removeClues(board, targetRemoved) {
        const allCells = [];
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                allCells.push({ row, col });
            }
        }
        
        // Shuffle cells
        allCells.sort(() => Math.random() - 0.5);
        
        let removed = 0;
        for (const cell of allCells) {
            if (removed >= targetRemoved) break;
            
            const originalValue = board.grid[cell.row][cell.col].value;
            board.clearCell(cell.row, cell.col);
            
            // Check if puzzle still has unique solution
            if (!this.solver.hasUniqueSolution(board)) {
                // Restore the value
                board.setCell(cell.row, cell.col, originalValue, true);
            } else {
                removed++;
            }
        }
    }
}

class SudokuGame {
    constructor(difficulty = Difficulty.MEDIUM) {
        this.board = null;
        this.originalBoard = null;
        this.solver = new SudokuSolver();
        this.generator = new SudokuGenerator();
        this.difficulty = difficulty;
        this.startTime = null;
        this.endTime = null;
        this.moveHistory = [];
        this.hints = 0;
        this.maxHints = 3;
    }
    
    newGame(difficulty = this.difficulty) {
        this.difficulty = difficulty;
        this.board = this.generator.generate(difficulty);
        this.originalBoard = this.board.clone();
        this.startTime = new Date();
        this.endTime = null;
        this.moveHistory = [];
        this.hints = 0;
        console.log(`New ${difficulty} Sudoku game started!`);
        return this.board;
    }
    
    makeMove(row, col, value) {
        if (!this.board || this.isGameOver()) return false;
        
        const cell = this.board.getCell(row, col);
        if (!cell || cell.isGiven) return false;
        
        const oldValue = cell.value;
        const success = this.board.setCell(row, col, value);
        
        if (success) {
            this.moveHistory.push({ row, col, oldValue, newValue: value, timestamp: new Date() });
            
            if (this.board.isSolved) {
                this.endTime = new Date();
                console.log("Congratulations! Puzzle solved!");
            }
        }
        
        return success;
    }
    
    clearCell(row, col) {
        if (!this.board || this.isGameOver()) return false;
        
        const cell = this.board.getCell(row, col);
        if (!cell || cell.isGiven) return false;
        
        const oldValue = cell.value;
        const success = this.board.clearCell(row, col);
        
        if (success) {
            this.moveHistory.push({ row, col, oldValue, newValue: 0, timestamp: new Date() });
        }
        
        return success;
    }
    
    undoMove() {
        if (this.moveHistory.length === 0) return false;
        
        const lastMove = this.moveHistory.pop();
        this.board.setCell(lastMove.row, lastMove.col, lastMove.oldValue);
        
        console.log(`Undid move at (${lastMove.row}, ${lastMove.col})`);
        return true;
    }
    
    getHint() {
        if (this.hints >= this.maxHints) {
            console.log("No more hints available!");
            return null;
        }
        
        const solution = this.solver.getSolution(this.board);
        if (!solution) {
            console.log("No solution found for current state!");
            return null;
        }
        
        // Find an empty cell and give its solution value
        const emptyCells = this.board.getEmptyCells();
        if (emptyCells.length === 0) return null;
        
        const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        const hintValue = solution.grid[randomCell.row][randomCell.col].value;
        
        this.hints++;
        console.log(`Hint ${this.hints}/${this.maxHints}: Cell (${randomCell.row}, ${randomCell.col}) should be ${hintValue}`);
        
        return { row: randomCell.row, col: randomCell.col, value: hintValue };
    }
    
    validateBoard() {
        if (!this.board) return false;
        this.board.validateBoard();
        return this.board.isValid;
    }
    
    autoSolve() {
        if (!this.board) return false;
        
        const solution = this.solver.getSolution(this.board);
        if (solution) {
            this.board = solution;
            this.endTime = new Date();
            console.log("Puzzle auto-solved!");
            return true;
        }
        
        console.log("No solution found!");
        return false;
    }
    
    resetGame() {
        if (this.originalBoard) {
            this.board = this.originalBoard.clone();
            this.startTime = new Date();
            this.endTime = null;
            this.moveHistory = [];
            this.hints = 0;
            console.log("Game reset to original state");
        }
    }
    
    isGameOver() {
        return this.board && this.board.isSolved;
    }
    
    getGameTime() {
        if (!this.startTime) return 0;
        const endTime = this.endTime || new Date();
        return Math.floor((endTime - this.startTime) / 1000);
    }
    
    getGameStats() {
        return {
            difficulty: this.difficulty,
            isCompleted: this.isGameOver(),
            timeElapsed: this.getGameTime(),
            moveCount: this.moveHistory.length,
            hintsUsed: this.hints,
            isValid: this.board ? this.board.isValid : false,
            emptyCells: this.board ? this.board.getEmptyCells().length : 0
        };
    }
    
    displayBoard() {
        if (!this.board) {
            console.log("No game in progress");
            return;
        }
        
        console.log(`\nSudoku (${this.difficulty}) - Time: ${this.getGameTime()}s - Hints: ${this.hints}/${this.maxHints}`);
        console.log(this.board.toString());
        
        if (!this.board.isValid) {
            console.log("⚠️  Invalid moves detected!");
        }
        
        if (this.board.isSolved) {
            console.log("🎉 Puzzle completed!");
        }
    }
}

function runDemo() {
    console.log("=== Sudoku Game Demo ===\n");
    
    const game = new SudokuGame();
    
    // Start a new game
    console.log("1. Starting new Medium difficulty game...");
    game.newGame(Difficulty.MEDIUM);
    game.displayBoard();
    
    // Make some moves
    console.log("\n2. Making some moves...");
    const emptyCells = game.board.getEmptyCells().slice(0, 5);
    
    for (const cell of emptyCells) {
        // Try values 1-9 until we find a valid one
        for (let value = 1; value <= 9; value++) {
            if (game.board.isValidMove(cell.row, cell.col, value)) {
                game.makeMove(cell.row, cell.col, value);
                console.log(`Placed ${value} at (${cell.row}, ${cell.col})`);
                break;
            }
        }
    }
    
    game.displayBoard();
    
    // Get a hint
    console.log("\n3. Getting a hint...");
    const hint = game.getHint();
    if (hint) {
        game.makeMove(hint.row, hint.col, hint.value);
        console.log(`Applied hint: placed ${hint.value} at (${hint.row}, ${hint.col})`);
    }
    
    // Undo last move
    console.log("\n4. Undoing last move...");
    game.undoMove();
    game.displayBoard();
    
    // Show game statistics
    console.log("\n5. Game Statistics:");
    const stats = game.getGameStats();
    console.log(`Difficulty: ${stats.difficulty}`);
    console.log(`Time Elapsed: ${stats.timeElapsed} seconds`);
    console.log(`Moves Made: ${stats.moveCount}`);
    console.log(`Hints Used: ${stats.hintsUsed}/${game.maxHints}`);
    console.log(`Empty Cells: ${stats.emptyCells}`);
    console.log(`Valid State: ${stats.isValid}`);
    console.log(`Completed: ${stats.isCompleted}`);
    
    // Auto-solve for demonstration
    console.log("\n6. Auto-solving puzzle...");
    game.autoSolve();
    game.displayBoard();
    
    console.log("\nFinal Statistics:");
    const finalStats = game.getGameStats();
    console.log(`Completed: ${finalStats.isCompleted}`);
    console.log(`Final Time: ${finalStats.timeElapsed} seconds`);
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SudokuGame, SudokuBoard, SudokuSolver, SudokuGenerator };
}

if (typeof require !== 'undefined' && require.main === module) {
    runDemo();
}