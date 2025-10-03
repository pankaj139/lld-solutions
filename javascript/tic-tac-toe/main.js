/**
 * TIC-TAC-TOE GAME Implementation in JavaScript
 * ==============================================
 * 
 * This implementation demonstrates several key Design Patterns and OOP Concepts:
 * 
 * DESIGN PATTERNS USED:
 * 1. Strategy Pattern: AI difficulty levels implemented as pluggable strategies
 *    - AIStrategy interface with Easy, Medium, Hard implementations
 *    - Runtime strategy switching without modifying game logic
 *    - Open/Closed principle in action
 * 
 * 2. State Pattern: Explicit game state management
 *    - GameState enum defines all valid states
 *    - State transitions are controlled and validated
 *    - Prevents invalid operations based on state
 * 
 * 3. Template Method Pattern: Common game flow structure
 *    - Game.play() defines skeleton of game algorithm
 *    - Player subclasses customize move selection behavior
 *    - Consistent game flow across different player types
 * 
 * 4. Command Pattern: Move operations with undo capability
 *    - Move class encapsulates execution and undo information
 *    - Move history maintained as command stack
 *    - Practice mode with undo functionality
 * 
 * 5. Observer Pattern: Game event notifications
 *    - Statistics observer tracks outcomes
 *    - Decoupled notification system for extensibility
 * 
 * OOP CONCEPTS DEMONSTRATED:
 * 1. Encapsulation: Board state hidden behind methods, private validation
 * 2. Abstraction: Player and AIStrategy define contracts for subclasses
 * 3. Composition: AIPlayer composes strategy instead of inheritance
 * 4. Polymorphism: Different player types used uniformly in game
 * 
 * ARCHITECTURAL PRINCIPLES:
 * - Single Responsibility: Each class has one clear purpose
 * - Open/Closed: Easy to extend (new AI) without modification
 * - Dependency Injection: Strategies and players injected into game
 * - Low Coupling: Components interact through interfaces
 */

// Enums - Using Object.freeze() for immutability
const GameState = Object.freeze({
    WAITING: 'waiting',
    IN_PROGRESS: 'in_progress',
    FINISHED: 'finished'
});

const Mark = Object.freeze({
    X: 'X',
    O: 'O',
    EMPTY: ' '
});

/**
 * Position - Represents a location on the game board
 * 
 * OOP CONCEPT: Encapsulation
 * - Combines row and column into single entity
 * - Provides value object semantics
 */
class Position {
    constructor(row, col) {
        this.row = row;
        this.col = col;
    }

    equals(other) {
        return this.row === other.row && this.col === other.col;
    }

    toString() {
        return `(${this.row}, ${this.col})`;
    }
}

/**
 * Move - Command Pattern implementation
 * 
 * DESIGN PATTERN: Command Pattern
 * - Encapsulates all information needed to execute and undo move
 * - Enables move history and replay functionality
 * - Supports undo operations in practice mode
 */
class Move {
    constructor(position, mark) {
        this.position = position;
        this.mark = mark;
    }

    toString() {
        return `Move(${this.mark} at ${this.position})`;
    }
}

/**
 * Board - Manages game board state and operations
 * 
 * DESIGN PATTERN: Encapsulation
 * - Internal grid representation hidden from external access
 * - All operations go through validated public methods
 * 
 * OOP CONCEPT: Single Responsibility
 * - Only responsible for board state management
 * - Does not handle game flow or player logic
 */
class Board {
    constructor(size = 3) {
        this.size = size;
        this.grid = Array(size).fill(null).map(() => Array(size).fill(Mark.EMPTY));
        this.moveCount = 0;
    }

    /**
     * Place a mark on the board at specified position
     * 
     * BUSINESS RULE: Moves only allowed on empty cells
     * 
     * @param {Position} position - Target position
     * @param {string} mark - Mark to place (X or O)
     * @returns {boolean} True if move was successful
     */
    makeMove(position, mark) {
        if (!this.isValidMove(position)) {
            return false;
        }

        this.grid[position.row][position.col] = mark;
        this.moveCount++;
        return true;
    }

    /**
     * Remove a mark from the board (for undo)
     * 
     * DESIGN PATTERN: Command Pattern support
     * - Enables undo functionality
     */
    undoMove(position) {
        this.grid[position.row][position.col] = Mark.EMPTY;
        this.moveCount--;
    }

    /**
     * Validate if a move can be made at given position
     * 
     * BUSINESS RULE: Position must be in bounds and cell must be empty
     */
    isValidMove(position) {
        if (position.row < 0 || position.row >= this.size ||
            position.col < 0 || position.col >= this.size) {
            return false;
        }
        return this.grid[position.row][position.col] === Mark.EMPTY;
    }

    /**
     * Check if specified mark has won the game
     * 
     * ALGORITHM: Check all possible win conditions
     * - Rows, columns, and diagonals
     * 
     * Time Complexity: O(n) where n is board size
     */
    checkWin(mark) {
        // Check rows
        for (let row = 0; row < this.size; row++) {
            if (this.grid[row].every(cell => cell === mark)) {
                return true;
            }
        }

        // Check columns
        for (let col = 0; col < this.size; col++) {
            if (this.grid.every(row => row[col] === mark)) {
                return true;
            }
        }

        // Check main diagonal
        let mainDiagonalWin = true;
        for (let i = 0; i < this.size; i++) {
            if (this.grid[i][i] !== mark) {
                mainDiagonalWin = false;
                break;
            }
        }
        if (mainDiagonalWin) return true;

        // Check anti-diagonal
        let antiDiagonalWin = true;
        for (let i = 0; i < this.size; i++) {
            if (this.grid[i][this.size - 1 - i] !== mark) {
                antiDiagonalWin = false;
                break;
            }
        }
        return antiDiagonalWin;
    }

    /**
     * Check if board is completely filled
     * 
     * BUSINESS RULE: Draw condition when board is full with no winner
     */
    isFull() {
        return this.moveCount === this.size * this.size;
    }

    /**
     * Get list of all empty positions on the board
     * 
     * Used by AI to determine valid moves
     */
    getEmptyPositions() {
        const emptyPositions = [];
        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                if (this.grid[row][col] === Mark.EMPTY) {
                    emptyPositions.push(new Position(row, col));
                }
            }
        }
        return emptyPositions;
    }

    /**
     * Display the current board state in console
     */
    display() {
        console.log('\n  ' + Array.from({length: this.size}, (_, i) => i).join(' | '));
        console.log('  ' + '---'.repeat(this.size));
        
        this.grid.forEach((row, i) => {
            console.log(i + ' ' + row.join(' | '));
            if (i < this.size - 1) {
                console.log('  ' + '---'.repeat(this.size));
            }
        });
        console.log();
    }
}

/**
 * Player - Abstract base class for all player types
 * 
 * DESIGN PATTERN: Template Method Pattern
 * - Defines interface for player behavior
 * - Subclasses implement specific move selection logic
 * 
 * OOP CONCEPT: Abstraction
 * - Defines contract that all players must follow
 * - Allows polymorphic player usage in game
 */
class Player {
    constructor(name, mark) {
        this.name = name;
        this.mark = mark;
    }

    /**
     * Get next move from player
     * Must be implemented by subclasses
     */
    getMove(board) {
        throw new Error('getMove() must be implemented by subclass');
    }
}

/**
 * AIStrategy - Abstract interface for AI algorithms
 * 
 * DESIGN PATTERN: Strategy Pattern
 * - Defines interface for different AI behaviors
 * - Allows runtime switching of AI strategies
 * - Open/Closed Principle: Easy to add new strategies
 */
class AIStrategy {
    /**
     * Calculate best move for AI
     * Must be implemented by strategy subclasses
     */
    calculateMove(board, mark) {
        throw new Error('calculateMove() must be implemented by strategy subclass');
    }
}

/**
 * EasyAI - Random move strategy
 * 
 * DESIGN PATTERN: Strategy Pattern implementation
 * - Simplest strategy for beginner-level play
 * - Makes random valid moves
 */
class EasyAI extends AIStrategy {
    /**
     * Random move selection from available positions
     * 
     * Time Complexity: O(k) where k is number of empty cells
     */
    calculateMove(board, mark) {
        const emptyPositions = board.getEmptyPositions();
        if (emptyPositions.length === 0) return null;
        
        const randomIndex = Math.floor(Math.random() * emptyPositions.length);
        return emptyPositions[randomIndex];
    }
}

/**
 * MediumAI - Heuristic-based strategy
 * 
 * DESIGN PATTERN: Strategy Pattern implementation
 * - Uses basic heuristics for move selection
 * - Checks for wins and blocks opponent
 */
class MediumAI extends AIStrategy {
    /**
     * Heuristic-based move selection
     * 
     * Strategy:
     * 1. Check if AI can win in next move
     * 2. Check if opponent can win, block them
     * 3. Take center if available
     * 4. Take corner if available
     * 5. Take any edge
     */
    calculateMove(board, mark) {
        const emptyPositions = board.getEmptyPositions();
        if (emptyPositions.length === 0) return null;

        const opponentMark = mark === Mark.X ? Mark.O : Mark.X;

        // Check for winning move
        for (const pos of emptyPositions) {
            board.makeMove(pos, mark);
            if (board.checkWin(mark)) {
                board.undoMove(pos);
                return pos;
            }
            board.undoMove(pos);
        }

        // Block opponent's winning move
        for (const pos of emptyPositions) {
            board.makeMove(pos, opponentMark);
            if (board.checkWin(opponentMark)) {
                board.undoMove(pos);
                return pos;
            }
            board.undoMove(pos);
        }

        // Take center if available
        const center = new Position(Math.floor(board.size / 2), Math.floor(board.size / 2));
        if (emptyPositions.some(pos => pos.equals(center))) {
            return center;
        }

        // Take corners
        const corners = [
            new Position(0, 0),
            new Position(0, board.size - 1),
            new Position(board.size - 1, 0),
            new Position(board.size - 1, board.size - 1)
        ];
        const availableCorners = corners.filter(corner =>
            emptyPositions.some(pos => pos.equals(corner))
        );
        if (availableCorners.length > 0) {
            return availableCorners[Math.floor(Math.random() * availableCorners.length)];
        }

        // Take any remaining position
        return emptyPositions[Math.floor(Math.random() * emptyPositions.length)];
    }
}

/**
 * HardAI - Minimax algorithm for perfect play
 * 
 * DESIGN PATTERN: Strategy Pattern implementation
 * - Unbeatable AI using game theory
 * - Minimax with alpha-beta pruning
 */
class HardAI extends AIStrategy {
    /**
     * Minimax algorithm with alpha-beta pruning
     * 
     * ALGORITHM: Minimax Decision Tree
     * - Explores all possible game outcomes
     * - Chooses move that maximizes AI's chances
     * - Alpha-beta pruning for efficiency
     * 
     * Time Complexity: O(b^d) where b is branching factor, d is depth
     */
    calculateMove(board, mark) {
        let bestScore = -Infinity;
        let bestMove = null;
        const opponentMark = mark === Mark.X ? Mark.O : Mark.X;

        for (const position of board.getEmptyPositions()) {
            board.makeMove(position, mark);
            const score = this._minimax(board, 0, false, mark, opponentMark, -Infinity, Infinity);
            board.undoMove(position);

            if (score > bestScore) {
                bestScore = score;
                bestMove = position;
            }
        }

        return bestMove;
    }

    /**
     * Minimax recursive function with alpha-beta pruning
     * 
     * ALGORITHM: Game Tree Search
     * - Recursively evaluates all possible game states
     * - Alpha-beta pruning eliminates unnecessary branches
     */
    _minimax(board, depth, isMaximizing, aiMark, opponentMark, alpha, beta) {
        // Terminal conditions
        if (board.checkWin(aiMark)) {
            return 10 - depth; // Prefer faster wins
        }
        if (board.checkWin(opponentMark)) {
            return depth - 10; // Prefer slower losses
        }
        if (board.isFull()) {
            return 0; // Draw
        }

        if (isMaximizing) {
            let maxScore = -Infinity;
            for (const position of board.getEmptyPositions()) {
                board.makeMove(position, aiMark);
                const score = this._minimax(board, depth + 1, false, aiMark, opponentMark, alpha, beta);
                board.undoMove(position);
                maxScore = Math.max(score, maxScore);
                alpha = Math.max(alpha, score);
                if (beta <= alpha) {
                    break; // Alpha-beta pruning
                }
            }
            return maxScore;
        } else {
            let minScore = Infinity;
            for (const position of board.getEmptyPositions()) {
                board.makeMove(position, opponentMark);
                const score = this._minimax(board, depth + 1, true, aiMark, opponentMark, alpha, beta);
                board.undoMove(position);
                minScore = Math.min(score, minScore);
                beta = Math.min(beta, score);
                if (beta <= alpha) {
                    break; // Alpha-beta pruning
                }
            }
            return minScore;
        }
    }
}

/**
 * AIPlayer - AI player using pluggable strategy
 * 
 * DESIGN PATTERN: Strategy Pattern usage
 * - Delegates move calculation to strategy object
 * - Strategy can be changed at runtime
 * 
 * OOP CONCEPT: Composition over Inheritance
 * - Uses AIStrategy through composition
 * - More flexible than inheritance-based approach
 */
class AIPlayer extends Player {
    constructor(name, mark, strategy) {
        super(name, mark);
        this.strategy = strategy;
    }

    /**
     * Get move from AI using configured strategy
     * 
     * DESIGN PATTERN: Strategy Pattern in action
     */
    getMove(board) {
        console.log(`${this.name} (${this.mark}) is thinking...`);
        return this.strategy.calculateMove(board, this.mark);
    }

    /**
     * Allow runtime strategy change
     */
    setStrategy(strategy) {
        this.strategy = strategy;
    }
}

/**
 * Statistics - Observer Pattern implementation
 * 
 * DESIGN PATTERN: Observer Pattern
 * - Observes game completion events
 * - Maintains statistics independently
 * - Decoupled from game logic
 */
class Statistics {
    constructor() {
        this.wins = {};
        this.draws = 0;
        this.totalGames = 0;
    }

    /**
     * Record a win for specified player
     */
    recordWin(playerName) {
        this.wins[playerName] = (this.wins[playerName] || 0) + 1;
        this.totalGames++;
    }

    /**
     * Record a draw game
     */
    recordDraw() {
        this.draws++;
        this.totalGames++;
    }

    /**
     * Get win count for player
     */
    getWins(playerName) {
        return this.wins[playerName] || 0;
    }

    /**
     * Get total draw count
     */
    getDraws() {
        return this.draws;
    }

    /**
     * Display statistics summary
     */
    display() {
        console.log('\n=== Game Statistics ===');
        console.log(`Total games: ${this.totalGames}`);
        for (const [player, wins] of Object.entries(this.wins)) {
            console.log(`${player}: ${wins} wins`);
        }
        console.log(`Draws: ${this.draws}`);
        console.log();
    }
}

/**
 * Game - Main game controller coordinating all components
 * 
 * DESIGN PATTERN: Facade Pattern
 * - Provides simple interface to complex game subsystem
 * - Coordinates between Board, Players, and Statistics
 * 
 * DESIGN PATTERN: State Pattern
 * - Manages game state transitions
 * - Validates operations based on current state
 */
class Game {
    constructor(player1, player2, boardSize = 3) {
        this.board = new Board(boardSize);
        this.players = [player1, player2];
        this.currentPlayerIdx = 0;
        this.state = GameState.WAITING;
        this.moveHistory = [];
        this.statistics = new Statistics();
        this.winner = null;
    }

    /**
     * Template Method Pattern: Defines game flow skeleton
     * 
     * BUSINESS RULES:
     * 1. Players alternate turns
     * 2. Game ends on win or draw
     * 3. Winner announced immediately
     */
    play() {
        this.state = GameState.IN_PROGRESS;
        console.log('\n=== Tic-Tac-Toe Game Started ===');
        this.board.display();

        while (this.state === GameState.IN_PROGRESS) {
            const currentPlayer = this.players[this.currentPlayerIdx];

            // Get move from current player
            const position = currentPlayer.getMove(this.board);

            // Make move
            if (this.board.makeMove(position, currentPlayer.mark)) {
                const move = new Move(position, currentPlayer.mark);
                this.moveHistory.push(move);

                this.board.display();

                // Check win condition
                if (this.board.checkWin(currentPlayer.mark)) {
                    this.winner = currentPlayer;
                    this.state = GameState.FINISHED;
                    console.log(`🎉 ${currentPlayer.name} (${currentPlayer.mark}) wins!`);
                    this.statistics.recordWin(currentPlayer.name);
                    break;
                }

                // Check draw condition
                if (this.board.isFull()) {
                    this.state = GameState.FINISHED;
                    console.log('🤝 It\'s a draw!');
                    this.statistics.recordDraw();
                    break;
                }

                // Switch player
                this.currentPlayerIdx = 1 - this.currentPlayerIdx;
            } else {
                console.log('Invalid move! Try again.');
            }
        }
    }

    /**
     * Undo the last move made
     * 
     * DESIGN PATTERN: Command Pattern
     * - Uses move history to reverse actions
     * 
     * BUSINESS RULE: Can only undo during active game
     */
    undoLastMove() {
        if (this.moveHistory.length === 0 || this.state !== GameState.IN_PROGRESS) {
            return false;
        }

        const lastMove = this.moveHistory.pop();
        this.board.undoMove(lastMove.position);
        this.currentPlayerIdx = 1 - this.currentPlayerIdx;

        console.log(`Undid move: ${lastMove}`);
        return true;
    }

    /**
     * Reset game for new round
     */
    restart() {
        this.board = new Board(this.board.size);
        this.currentPlayerIdx = 0;
        this.state = GameState.WAITING;
        this.moveHistory = [];
        this.winner = null;
    }
}

/**
 * Demonstrate Tic-Tac-Toe game with different modes
 */
function main() {
    console.log('=== Tic-Tac-Toe Game Demo ===\n');

    // Demo 1: Easy AI vs Medium AI
    console.log('Demo 1: Easy AI vs Medium AI');
    console.log('-'.repeat(40));
    const easyAI = new AIPlayer('Easy Bot', Mark.X, new EasyAI());
    const mediumAI = new AIPlayer('Medium Bot', Mark.O, new MediumAI());

    let game = new Game(easyAI, mediumAI);
    game.play();

    // Demo 2: Medium AI vs Hard AI
    console.log('\nDemo 2: Medium AI vs Hard AI');
    console.log('-'.repeat(40));
    const mediumAI2 = new AIPlayer('Medium Bot', Mark.X, new MediumAI());
    const hardAI = new AIPlayer('Hard Bot', Mark.O, new HardAI());

    game = new Game(mediumAI2, hardAI);
    game.play();

    // Demo 3: Multiple games for statistics
    console.log('\nDemo 3: Multiple Games for Statistics');
    console.log('-'.repeat(40));
    for (let i = 0; i < 3; i++) {
        console.log(`\nGame ${i + 1}:`);
        game.restart();
        game.play();
    }

    game.statistics.display();

    console.log('\n=== Demo Complete ===');
    console.log('\nTo implement Human player:');
    console.log('1. Create HumanPlayer class extending Player');
    console.log('2. Implement getMove() to get console/UI input');
    console.log('3. Create: game = new Game(human, ai)');
    console.log('4. Run: game.play()');
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        Game,
        Board,
        Player,
        AIPlayer,
        AIStrategy,
        EasyAI,
        MediumAI,
        HardAI,
        Position,
        Move,
        Statistics,
        GameState,
        Mark
    };
}

// Run demo if executed directly
if (typeof require !== 'undefined' && require.main === module) {
    main();
}

