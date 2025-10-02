/**
 * Tic-Tac-Toe Game Implementation in JavaScript
 * =============================================
 * 
 * This implementation demonstrates:
 * - Strategy Pattern: Different AI difficulty strategies
 * - State Pattern: Game state management
 * - Template Method: Common game flow structure
 * - Observer Pattern: Game event notifications
 */

// Enums using JavaScript objects
const Player = {
    X: 'X',
    O: 'O',
    EMPTY: ' '
};

const GameStatus = {
    ACTIVE: 'active',
    X_WINS: 'x_wins',
    O_WINS: 'o_wins',
    DRAW: 'draw'
};

const Difficulty = {
    EASY: 'easy',
    MEDIUM: 'medium',
    HARD: 'hard'
};

// Make enums immutable
Object.freeze(Player);
Object.freeze(GameStatus);
Object.freeze(Difficulty);


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


class GameBoard {
    constructor() {
        this.board = Array(3).fill(null).map(() => Array(3).fill(Player.EMPTY));
        this.movesCount = 0;
    }
    
    makeMove(position, player) {
        if (this.isValidMove(position)) {
            this.board[position.row][position.col] = player;
            this.movesCount++;
            return true;
        }
        return false;
    }
    
    isValidMove(position) {
        if (position.row < 0 || position.row >= 3 || position.col < 0 || position.col >= 3) {
            return false;
        }
        return this.board[position.row][position.col] === Player.EMPTY;
    }
    
    getAvailableMoves() {
        const moves = [];
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 3; col++) {
                if (this.board[row][col] === Player.EMPTY) {
                    moves.push(new Position(row, col));
                }
            }
        }
        return moves;
    }
    
    checkWinner() {
        // Check rows
        for (let row = 0; row < 3; row++) {
            if (this.board[row][0] === this.board[row][1] && 
                this.board[row][1] === this.board[row][2] && 
                this.board[row][0] !== Player.EMPTY) {
                return this.board[row][0];
            }
        }
        
        // Check columns
        for (let col = 0; col < 3; col++) {
            if (this.board[0][col] === this.board[1][col] && 
                this.board[1][col] === this.board[2][col] && 
                this.board[0][col] !== Player.EMPTY) {
                return this.board[0][col];
            }
        }
        
        // Check diagonals
        if (this.board[0][0] === this.board[1][1] && 
            this.board[1][1] === this.board[2][2] && 
            this.board[0][0] !== Player.EMPTY) {
            return this.board[0][0];
        }
        
        if (this.board[0][2] === this.board[1][1] && 
            this.board[1][1] === this.board[2][0] && 
            this.board[0][2] !== Player.EMPTY) {
            return this.board[0][2];
        }
        
        return Player.EMPTY;
    }
    
    isBoardFull() {
        return this.movesCount === 9;
    }
    
    clone() {
        const newBoard = new GameBoard();
        newBoard.board = this.board.map(row => [...row]);
        newBoard.movesCount = this.movesCount;
        return newBoard;
    }
    
    display() {
        console.log("  0   1   2");
        for (let i = 0; i < 3; i++) {
            const row = this.board[i];
            console.log(`${i} ${row[0]} | ${row[1]} | ${row[2]}`);
            if (i < 2) {
                console.log("  ---------");
            }
        }
    }
}


// Abstract AI Strategy class
class AIStrategy {
    getBestMove(board, player) {
        throw new Error('getBestMove must be implemented by subclass');
    }
}


class EasyAIStrategy extends AIStrategy {
    getBestMove(board, player) {
        const availableMoves = board.getAvailableMoves();
        if (availableMoves.length === 0) return null;
        return availableMoves[Math.floor(Math.random() * availableMoves.length)];
    }
}


class MediumAIStrategy extends AIStrategy {
    getBestMove(board, player) {
        const opponent = player === Player.X ? Player.O : Player.X;
        
        // First, try to win
        for (const move of board.getAvailableMoves()) {
            const boardCopy = board.clone();
            boardCopy.makeMove(move, player);
            if (boardCopy.checkWinner() === player) {
                return move;
            }
        }
        
        // Then, try to block opponent from winning
        for (const move of board.getAvailableMoves()) {
            const boardCopy = board.clone();
            boardCopy.makeMove(move, opponent);
            if (boardCopy.checkWinner() === opponent) {
                return move;
            }
        }
        
        // Otherwise, random move
        const availableMoves = board.getAvailableMoves();
        if (availableMoves.length === 0) return null;
        return availableMoves[Math.floor(Math.random() * availableMoves.length)];
    }
}


class HardAIStrategy extends AIStrategy {
    getBestMove(board, player) {
        const [_, bestMove] = this._minimax(board, player, player, true, -Infinity, Infinity);
        return bestMove;
    }
    
    _minimax(board, player, currentPlayer, isMaximizing, alpha, beta) {
        const winner = board.checkWinner();
        
        // Terminal states
        if (winner === player) {
            return [10 - board.movesCount, null];
        } else if (winner !== Player.EMPTY) {
            return [-10 + board.movesCount, null];
        } else if (board.isBoardFull()) {
            return [0, null];
        }
        
        let bestMove = null;
        const opponent = currentPlayer === Player.X ? Player.O : Player.X;
        
        if (isMaximizing) {
            let maxEval = -Infinity;
            for (const move of board.getAvailableMoves()) {
                const boardCopy = board.clone();
                boardCopy.makeMove(move, currentPlayer);
                const [evalScore, _] = this._minimax(boardCopy, player, opponent, false, alpha, beta);
                
                if (evalScore > maxEval) {
                    maxEval = evalScore;
                    bestMove = move;
                }
                
                alpha = Math.max(alpha, evalScore);
                if (beta <= alpha) {
                    break; // Alpha-beta pruning
                }
            }
            
            return [maxEval, bestMove];
        } else {
            let minEval = Infinity;
            for (const move of board.getAvailableMoves()) {
                const boardCopy = board.clone();
                boardCopy.makeMove(move, currentPlayer);
                const [evalScore, _] = this._minimax(boardCopy, player, opponent, true, alpha, beta);
                
                if (evalScore < minEval) {
                    minEval = evalScore;
                    bestMove = move;
                }
                
                beta = Math.min(beta, evalScore);
                if (beta <= alpha) {
                    break; // Alpha-beta pruning
                }
            }
            
            return [minEval, bestMove];
        }
    }
}


class AIPlayer {
    constructor(player, difficulty) {
        this.player = player;
        this.difficulty = difficulty;
        this.strategy = this._createStrategy(difficulty);
    }
    
    _createStrategy(difficulty) {
        const strategyMap = {
            [Difficulty.EASY]: new EasyAIStrategy(),
            [Difficulty.MEDIUM]: new MediumAIStrategy(),
            [Difficulty.HARD]: new HardAIStrategy()
        };
        return strategyMap[difficulty];
    }
    
    getMove(board) {
        return this.strategy.getBestMove(board, this.player);
    }
}


// Observer interface
class GameObserver {
    onMoveMade(player, position) {
        throw new Error('onMoveMade must be implemented by subclass');
    }
    
    onGameEnded(status) {
        throw new Error('onGameEnded must be implemented by subclass');
    }
}


class GameStatistics extends GameObserver {
    constructor() {
        super();
        this.gamesPlayed = 0;
        this.xWins = 0;
        this.oWins = 0;
        this.draws = 0;
        this.movesHistory = [];
    }
    
    onMoveMade(player, position) {
        this.movesHistory.push([player, position]);
    }
    
    onGameEnded(status) {
        this.gamesPlayed++;
        if (status === GameStatus.X_WINS) {
            this.xWins++;
        } else if (status === GameStatus.O_WINS) {
            this.oWins++;
        } else if (status === GameStatus.DRAW) {
            this.draws++;
        }
        this.movesHistory = [];
    }
    
    displayStats() {
        console.log("\n=== Game Statistics ===");
        console.log(`Games played: ${this.gamesPlayed}`);
        console.log(`X wins: ${this.xWins}`);
        console.log(`O wins: ${this.oWins}`);
        console.log(`Draws: ${this.draws}`);
        if (this.gamesPlayed > 0) {
            console.log(`X win rate: ${(this.xWins/this.gamesPlayed*100).toFixed(1)}%`);
            console.log(`O win rate: ${(this.oWins/this.gamesPlayed*100).toFixed(1)}%`);
            console.log(`Draw rate: ${(this.draws/this.gamesPlayed*100).toFixed(1)}%`);
        }
    }
}


class TicTacToeGame {
    constructor() {
        this.board = new GameBoard();
        this.currentPlayer = Player.X;
        this.gameStatus = GameStatus.ACTIVE;
        this.observers = [];
        this.aiPlayers = new Map();
    }
    
    addObserver(observer) {
        this.observers.push(observer);
    }
    
    setAIPlayer(player, difficulty) {
        this.aiPlayers.set(player, new AIPlayer(player, difficulty));
    }
    
    playGame() {
        this._initializeGame();
        
        while (this.gameStatus === GameStatus.ACTIVE) {
            this._displayCurrentState();
            const move = this._getPlayerMove();
            if (move) {
                this._makeMove(move);
                this._checkGameEnd();
                this._switchPlayer();
            }
        }
        
        this._displayFinalResult();
    }
    
    _initializeGame() {
        this.board = new GameBoard();
        this.currentPlayer = Player.X;
        this.gameStatus = GameStatus.ACTIVE;
    }
    
    _displayCurrentState() {
        console.log(`\nCurrent player: ${this.currentPlayer}`);
        this.board.display();
    }
    
    _getPlayerMove() {
        if (this.aiPlayers.has(this.currentPlayer)) {
            // AI move
            const aiPlayer = this.aiPlayers.get(this.currentPlayer);
            const move = aiPlayer.getMove(this.board);
            console.log(`AI (${this.currentPlayer}) chooses: ${move}`);
            return move;
        } else {
            // For demo purposes, we'll use predetermined moves
            // In a real implementation, this would get input from user
            const availableMoves = this.board.getAvailableMoves();
            if (availableMoves.length > 0) {
                const move = availableMoves[0]; // Take first available move for demo
                console.log(`Human (${this.currentPlayer}) chooses: ${move}`);
                return move;
            }
        }
        return null;
    }
    
    _makeMove(position) {
        if (this.board.makeMove(position, this.currentPlayer)) {
            for (const observer of this.observers) {
                observer.onMoveMade(this.currentPlayer, position);
            }
        }
    }
    
    _checkGameEnd() {
        const winner = this.board.checkWinner();
        
        if (winner === Player.X) {
            this.gameStatus = GameStatus.X_WINS;
        } else if (winner === Player.O) {
            this.gameStatus = GameStatus.O_WINS;
        } else if (this.board.isBoardFull()) {
            this.gameStatus = GameStatus.DRAW;
        }
        
        if (this.gameStatus !== GameStatus.ACTIVE) {
            for (const observer of this.observers) {
                observer.onGameEnded(this.gameStatus);
            }
        }
    }
    
    _switchPlayer() {
        if (this.gameStatus === GameStatus.ACTIVE) {
            this.currentPlayer = this.currentPlayer === Player.X ? Player.O : Player.X;
        }
    }
    
    _displayFinalResult() {
        console.log("\n" + "=".repeat(30));
        this.board.display();
        
        if (this.gameStatus === GameStatus.X_WINS) {
            console.log("\n🎉 Player X wins!");
        } else if (this.gameStatus === GameStatus.O_WINS) {
            console.log("\n🎉 Player O wins!");
        } else {
            console.log("\n🤝 It's a draw!");
        }
    }
}


function demoTicTacToe() {
    console.log("=== Tic-Tac-Toe Game Demo ===\n");
    
    // Create game with statistics tracking
    let game = new TicTacToeGame();
    const stats = new GameStatistics();
    game.addObserver(stats);
    
    console.log("Demo 1: AI vs AI (Hard vs Medium)");
    game.setAIPlayer(Player.X, Difficulty.HARD);
    game.setAIPlayer(Player.O, Difficulty.MEDIUM);
    game.playGame();
    
    console.log("\nDemo 2: Easy AI vs Hard AI");
    game = new TicTacToeGame();
    game.addObserver(stats);
    game.setAIPlayer(Player.X, Difficulty.EASY);
    game.setAIPlayer(Player.O, Difficulty.HARD);
    game.playGame();
    
    console.log("\nDemo 3: Perfect AI vs Perfect AI (should be draw)");
    game = new TicTacToeGame();
    game.addObserver(stats);
    game.setAIPlayer(Player.X, Difficulty.HARD);
    game.setAIPlayer(Player.O, Difficulty.HARD);
    game.playGame();
    
    // Show statistics
    stats.displayStats();
    
    // Test minimax algorithm
    console.log("\n=== AI Strategy Testing ===");
    const board = new GameBoard();
    const hardAI = new HardAIStrategy();
    
    // Test winning move detection
    board.makeMove(new Position(0, 0), Player.X);
    board.makeMove(new Position(0, 1), Player.X);
    // X should win by playing (0, 2)
    const bestMove = hardAI.getBestMove(board, Player.X);
    console.log(`AI finds winning move: ${bestMove} (should be (0, 2))`);
    
    // Test blocking move
    const board2 = new GameBoard();
    board2.makeMove(new Position(0, 0), Player.O);
    board2.makeMove(new Position(0, 1), Player.O);
    // X should block by playing (0, 2)
    const bestMove2 = hardAI.getBestMove(board2, Player.X);
    console.log(`AI finds blocking move: ${bestMove2} (should be (0, 2))`);
}


// Generate UUID for unique identifiers
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}


// Export for Node.js compatibility
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        TicTacToeGame,
        GameBoard,
        Position,
        Player,
        GameStatus,
        Difficulty,
        AIPlayer,
        GameStatistics,
        demoTicTacToe
    };
}


// Run demo if this file is executed directly
if (typeof require !== 'undefined' && require.main === module) {
    demoTicTacToe();
}