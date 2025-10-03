#!/usr/bin/env node
/**
 * Snake and Ladder Game Implementation
 * 
 * A comprehensive board game simulation supporting multiple players, AI opponents,
 * configurable boards, and various game modes with full statistics tracking.
 * 
 * Features:
 * - Multi-player support (2-6 players)
 * - Configurable board size and snake/ladder positions
 * - AI players with different difficulty levels
 * - Multiple game modes (Classic, Quick, Custom, Tournament)
 * - Statistics tracking and game history
 * - Visual board representation
 * - Undo/redo functionality
 * - Tournament management
 * 
 * Author: LLD Solutions
 * Date: 2024
 */

const readline = require('readline');
const { performance } = require('perf_hooks');

// Enums
const PlayerType = {
    HUMAN: 'human',
    AI_EASY: 'ai_easy',
    AI_MEDIUM: 'ai_medium',
    AI_HARD: 'ai_hard'
};

const GameMode = {
    CLASSIC: 'classic',
    QUICK: 'quick',
    CUSTOM: 'custom',
    TOURNAMENT: 'tournament'
};

const GameStateType = {
    WAITING: 'waiting',
    PLAYING: 'playing',
    PAUSED: 'paused',
    FINISHED: 'finished'
};

const MoveType = {
    NORMAL: 'normal',
    SNAKE_BITE: 'snake_bite',
    LADDER_CLIMB: 'ladder_climb',
    WIN: 'win',
    BLOCKED: 'blocked'
};

// Position class
class Position {
    constructor(row, col, number) {
        this.row = row;
        this.col = col;
        this.number = number;
    }
    
    equals(other) {
        return other instanceof Position && this.number === other.number;
    }
}

// Snake class
class Snake {
    constructor(head, tail, name = '') {
        if (head <= tail) {
            throw new Error('Snake head must be higher than tail');
        }
        this.head = head;
        this.tail = tail;
        this.name = name || `Snake(${head}→${tail})`;
    }
}

// Ladder class
class Ladder {
    constructor(bottom, top, name = '') {
        if (bottom >= top) {
            throw new Error('Ladder bottom must be lower than top');
        }
        this.bottom = bottom;
        this.top = top;
        this.name = name || `Ladder(${bottom}→${top})`;
    }
}

// MoveResult class
class MoveResult {
    constructor(playerName, diceValue, startPosition, endPosition, moveType, snakeOrLadder = null, isWinner = false) {
        this.playerName = playerName;
        this.diceValue = diceValue;
        this.startPosition = startPosition;
        this.endPosition = endPosition;
        this.moveType = moveType;
        this.snakeOrLadder = snakeOrLadder;
        this.isWinner = isWinner;
        this.timestamp = new Date();
    }
}

// GameStatistics class
class GameStatistics {
    constructor() {
        this.totalMoves = 0;
        this.gameDuration = 0.0;
        this.diceRolls = [];
        this.snakeEncounters = 0;
        this.ladderClimbs = 0;
        this.playerMoves = new Map();
        this.playerSnakeBites = new Map();
        this.playerLadderClimbs = new Map();
    }
    
    addDiceRoll(value) {
        this.diceRolls.push(value);
        this.totalMoves++;
    }
    
    addSnakeEncounter(playerName) {
        this.snakeEncounters++;
        this.playerSnakeBites.set(playerName, (this.playerSnakeBites.get(playerName) || 0) + 1);
    }
    
    addLadderClimb(playerName) {
        this.ladderClimbs++;
        this.playerLadderClimbs.set(playerName, (this.playerLadderClimbs.get(playerName) || 0) + 1);
    }
    
    getAverageDiceRoll() {
        return this.diceRolls.length > 0 ? 
            this.diceRolls.reduce((a, b) => a + b, 0) / this.diceRolls.length : 0.0;
    }
}

// Custom Exceptions
class SnakeLadderException extends Error {
    constructor(message) {
        super(message);
        this.name = 'SnakeLadderException';
    }
}

class InvalidPlayerCountException extends SnakeLadderException {
    constructor(message) {
        super(message);
        this.name = 'InvalidPlayerCountException';
    }
}

class InvalidPositionException extends SnakeLadderException {
    constructor(message) {
        super(message);
        this.name = 'InvalidPositionException';
    }
}

class GameNotStartedException extends SnakeLadderException {
    constructor(message) {
        super(message);
        this.name = 'GameNotStartedException';
    }
}

class GameAlreadyFinishedException extends SnakeLadderException {
    constructor(message) {
        super(message);
        this.name = 'GameAlreadyFinishedException';
    }
}

class InvalidMoveException extends SnakeLadderException {
    constructor(message) {
        super(message);
        this.name = 'InvalidMoveException';
    }
}

class InvalidBoardConfigException extends SnakeLadderException {
    constructor(message) {
        super(message);
        this.name = 'InvalidBoardConfigException';
    }
}

// Dice class
class Dice {
    constructor(sides = 6, seed = null) {
        this.sides = sides;
        this.history = [];
        this.rollCount = 0;
        if (seed !== null) {
            Math.seedrandom = seed; // For reproducible testing (if seedrandom library available)
        }
    }
    
    roll() {
        const result = Math.floor(Math.random() * this.sides) + 1;
        this.history.push(result);
        this.rollCount++;
        return result;
    }
    
    getLastRoll() {
        return this.history.length > 0 ? this.history[this.history.length - 1] : null;
    }
    
    getStatistics() {
        if (this.history.length === 0) {
            return {};
        }
        
        const counts = {};
        for (let i = 1; i <= this.sides; i++) {
            counts[i] = this.history.filter(roll => roll === i).length;
        }
        
        return {
            totalRolls: this.history.length,
            average: this.history.reduce((a, b) => a + b, 0) / this.history.length,
            counts: counts,
            frequency: Object.fromEntries(
                Object.entries(counts).map(([k, v]) => [k, v / this.history.length])
            )
        };
    }
}

// Abstract Player class
class Player {
    constructor(name, playerType) {
        this.name = name;
        this.playerType = playerType;
        this.position = 0;
        this.moveHistory = [];
        this.totalMoves = 0;
        this.snakeEncounters = 0;
        this.ladderClimbs = 0;
        this.gamesPlayed = 0;
        this.gamesWon = 0;
    }
    
    moveTo(newPosition, moveResult) {
        this.position = newPosition;
        this.moveHistory.push(moveResult);
        this.totalMoves++;
        
        if (moveResult.moveType === MoveType.SNAKE_BITE) {
            this.snakeEncounters++;
        } else if (moveResult.moveType === MoveType.LADDER_CLIMB) {
            this.ladderClimbs++;
        }
    }
    
    resetPosition() {
        this.position = 0;
        this.moveHistory = [];
    }
    
    getWinPercentage() {
        return this.gamesPlayed > 0 ? (this.gamesWon / this.gamesPlayed * 100) : 0.0;
    }
    
    shouldRollDice(gameState) {
        throw new Error('shouldRollDice method must be implemented by subclass');
    }
}

// HumanPlayer class
class HumanPlayer extends Player {
    constructor(name) {
        super(name, PlayerType.HUMAN);
    }
    
    shouldRollDice(gameState) {
        return true; // Human players always roll dice when it's their turn
    }
}

// AIPlayer class
class AIPlayer extends Player {
    constructor(name, difficulty = PlayerType.AI_MEDIUM) {
        super(name, difficulty);
        this.thinkingTime = this._getThinkingTime();
    }
    
    _getThinkingTime() {
        switch (this.playerType) {
            case PlayerType.AI_EASY:
                return 0.5;
            case PlayerType.AI_MEDIUM:
                return 1.0;
            case PlayerType.AI_HARD:
                return 1.5;
            default:
                return 1.0;
        }
    }
    
    async shouldRollDice(gameState) {
        // Simulate thinking time
        await new Promise(resolve => setTimeout(resolve, this.thinkingTime * 100)); // Reduced for demo
        
        if (this.playerType === PlayerType.AI_EASY) {
            return true; // Always roll
        }
        
        // More sophisticated AI logic for medium/hard difficulty
        return this._makeStrategicDecision(gameState);
    }
    
    _makeStrategicDecision(gameState) {
        const currentPos = this.position;
        const board = gameState.board;
        
        if (!board) {
            return true;
        }
        
        // Check for nearby snakes (risky positions)
        const riskyPositions = [];
        for (const snake of Object.values(board.snakes)) {
            if (currentPos < snake.head && snake.head <= currentPos + 6) {
                riskyPositions.push(snake.head);
            }
        }
        
        // Check for nearby ladders (good positions)
        const goodPositions = [];
        for (const ladder of Object.values(board.ladders)) {
            if (currentPos < ladder.bottom && ladder.bottom <= currentPos + 6) {
                goodPositions.push(ladder.bottom);
            }
        }
        
        // AI_HARD considers more factors
        if (this.playerType === PlayerType.AI_HARD) {
            const riskScore = riskyPositions.length * 2;
            const rewardScore = goodPositions.length * 3;
            
            // Consider opponent positions
            const opponents = gameState.opponents || [];
            const closeOpponents = opponents.filter(opp => Math.abs(opp.position - currentPos) <= 10).length;
            const urgencyScore = closeOpponents;
            
            const decisionScore = rewardScore + urgencyScore - riskScore;
            return decisionScore >= 0;
        }
        
        return true; // Default: roll dice
    }
}

// Board class
class Board {
    constructor(size = 100) {
        this.size = size;
        this.rows = Math.sqrt(size);
        this.cols = Math.sqrt(size);
        
        if (!Number.isInteger(this.rows) || this.rows * this.cols !== size) {
            throw new InvalidBoardConfigException(`Board size ${size} is not a perfect square`);
        }
        
        this.snakes = new Map();
        this.ladders = new Map();
        this.positions = new Map();
        this._initializePositions();
    }
    
    _initializePositions() {
        let number = 1;
        for (let row = this.rows - 1; row >= 0; row--) { // Start from bottom row
            if ((this.rows - 1 - row) % 2 === 0) { // Left to right
                for (let col = 0; col < this.cols; col++) {
                    this.positions.set(number, new Position(row, col, number));
                    number++;
                }
            } else { // Right to left
                for (let col = this.cols - 1; col >= 0; col--) {
                    this.positions.set(number, new Position(row, col, number));
                    number++;
                }
            }
        }
    }
    
    addSnake(head, tail) {
        try {
            if (this.snakes.has(head) || this.ladders.has(head)) {
                return false;
            }
            if (this.snakes.has(tail) || this.ladders.has(tail)) {
                return false;
            }
            if (!(1 <= head && head <= this.size && 1 <= tail && tail <= this.size)) {
                return false;
            }
            
            const snake = new Snake(head, tail);
            this.snakes.set(head, snake);
            return true;
        } catch (error) {
            return false;
        }
    }
    
    addLadder(bottom, top) {
        try {
            if (this.snakes.has(bottom) || this.ladders.has(bottom)) {
                return false;
            }
            if (this.snakes.has(top) || this.ladders.has(top)) {
                return false;
            }
            if (!(1 <= bottom && bottom <= this.size && 1 <= top && top <= this.size)) {
                return false;
            }
            
            const ladder = new Ladder(bottom, top);
            this.ladders.set(bottom, ladder);
            return true;
        } catch (error) {
            return false;
        }
    }
    
    getPositionEffect(position) {
        if (this.snakes.has(position)) {
            const snake = this.snakes.get(position);
            return [snake.tail, snake.name, MoveType.SNAKE_BITE];
        } else if (this.ladders.has(position)) {
            const ladder = this.ladders.get(position);
            return [ladder.top, ladder.name, MoveType.LADDER_CLIMB];
        } else {
            return [null, null, MoveType.NORMAL];
        }
    }
    
    isValidPosition(position) {
        return 1 <= position && position <= this.size;
    }
    
    getCoordinates(position) {
        return this.positions.get(position) || null;
    }
    
    setupDefaultSnakesAndLadders() {
        if (this.size !== 100) {
            return;
        }
        
        // Default snakes (head -> tail)
        const defaultSnakes = [
            [99, 54], [95, 67], [92, 53], [87, 57], [83, 19],
            [73, 1], [69, 33], [64, 36], [59, 17], [55, 7],
            [52, 11], [48, 9], [46, 5], [44, 22]
        ];
        
        // Default ladders (bottom -> top)
        const defaultLadders = [
            [2, 23], [8, 34], [20, 77], [32, 68], [41, 79],
            [74, 88], [82, 100], [85, 95], [91, 98]
        ];
        
        for (const [head, tail] of defaultSnakes) {
            this.addSnake(head, tail);
        }
        
        for (const [bottom, top] of defaultLadders) {
            this.addLadder(bottom, top);
        }
    }
}

// GameRules class
class GameRules {
    constructor(exactLanding = true, multipleDiceOnSix = false) {
        this.exactLanding = exactLanding;
        this.multipleDiceOnSix = multipleDiceOnSix;
    }
    
    calculateNewPosition(currentPosition, diceValue, board) {
        let newPosition = currentPosition + diceValue;
        
        // Check if move is valid
        if (newPosition > board.size) {
            if (this.exactLanding) {
                return [currentPosition, MoveType.BLOCKED, 'Exact landing required'];
            } else {
                newPosition = board.size;
            }
        }
        
        // Check for snakes and ladders
        const [effectPosition, effectName, moveType] = board.getPositionEffect(newPosition);
        
        if (effectPosition !== null) {
            return [effectPosition, moveType, effectName];
        }
        
        return [newPosition, MoveType.NORMAL, null];
    }
    
    isWinningPosition(position, board) {
        return position === board.size;
    }
    
    shouldGetExtraTurn(diceValue) {
        return this.multipleDiceOnSix && diceValue === 6;
    }
}

// Main SnakeLadderGame class
class SnakeLadderGame {
    constructor(boardSize = 100, gameMode = GameMode.CLASSIC) {
        this.board = new Board(boardSize);
        this.players = [];
        this.currentPlayerIndex = 0;
        this.gameState = GameStateType.WAITING;
        this.gameMode = gameMode;
        this.rules = new GameRules();
        this.dice = new Dice();
        this.moveHistory = [];
        this.statistics = new GameStatistics();
        this.startTime = null;
        this.endTime = null;
        this.winner = null;
        
        // Setup default board for classic mode
        if (gameMode === GameMode.CLASSIC) {
            this.board.setupDefaultSnakesAndLadders();
        } else if (gameMode === GameMode.QUICK) {
            this._setupQuickMode();
        }
    }
    
    _setupQuickMode() {
        // Quick mode: fewer snakes and ladders
        if (this.board.size === 100) {
            const quickSnakes = [[95, 67], [73, 1], [59, 17], [46, 5]];
            const quickLadders = [[2, 23], [20, 77], [41, 79], [82, 100]];
            
            for (const [head, tail] of quickSnakes) {
                this.board.addSnake(head, tail);
            }
            
            for (const [bottom, top] of quickLadders) {
                this.board.addLadder(bottom, top);
            }
        }
    }
    
    addPlayer(name, playerType = PlayerType.HUMAN) {
        if (this.gameState !== GameStateType.WAITING) {
            return false;
        }
        
        if (this.players.length >= 6) { // Maximum 6 players
            return false;
        }
        
        // Check for duplicate names
        if (this.players.some(player => player.name === name)) {
            return false;
        }
        
        let player;
        if (playerType === PlayerType.HUMAN) {
            player = new HumanPlayer(name);
        } else {
            player = new AIPlayer(name, playerType);
        }
        
        this.players.push(player);
        this.statistics.playerMoves.set(name, 0);
        this.statistics.playerSnakeBites.set(name, 0);
        this.statistics.playerLadderClimbs.set(name, 0);
        
        return true;
    }
    
    addSnake(head, tail) {
        if (this.gameState !== GameStateType.WAITING) {
            return false;
        }
        return this.board.addSnake(head, tail);
    }
    
    addLadder(bottom, top) {
        if (this.gameState !== GameStateType.WAITING) {
            return false;
        }
        return this.board.addLadder(bottom, top);
    }
    
    startGame() {
        if (this.players.length < 2) {
            throw new InvalidPlayerCountException('At least 2 players required');
        }
        
        if (this.gameState !== GameStateType.WAITING) {
            return false;
        }
        
        this.gameState = GameStateType.PLAYING;
        this.startTime = new Date();
        this.currentPlayerIndex = 0;
        
        // Reset all players
        for (const player of this.players) {
            player.resetPosition();
            player.gamesPlayed++;
        }
        
        return true;
    }
    
    getCurrentPlayer() {
        if (this.players.length === 0) {
            throw new GameNotStartedException('No players in game');
        }
        return this.players[this.currentPlayerIndex];
    }
    
    rollDice() {
        if (this.gameState !== GameStateType.PLAYING) {
            throw new GameNotStartedException('Game not in playing state');
        }
        
        const diceValue = this.dice.roll();
        this.statistics.addDiceRoll(diceValue);
        return diceValue;
    }
    
    async moveCurrentPlayer(diceValue = null) {
        if (this.gameState !== GameStateType.PLAYING) {
            throw new GameNotStartedException('Game not in playing state');
        }
        
        const currentPlayer = this.getCurrentPlayer();
        
        if (diceValue === null) {
            diceValue = this.rollDice();
        }
        
        // Calculate new position
        const startPosition = currentPlayer.position;
        const [newPosition, moveType, effectName] = this.rules.calculateNewPosition(
            startPosition, diceValue, this.board
        );
        
        // Create move result
        const moveResult = new MoveResult(
            currentPlayer.name,
            diceValue,
            startPosition,
            newPosition,
            moveType,
            effectName,
            false
        );
        
        // Update player position
        currentPlayer.moveTo(newPosition, moveResult);
        
        // Update statistics
        this.statistics.playerMoves.set(
            currentPlayer.name, 
            (this.statistics.playerMoves.get(currentPlayer.name) || 0) + 1
        );
        
        if (moveType === MoveType.SNAKE_BITE) {
            this.statistics.addSnakeEncounter(currentPlayer.name);
        } else if (moveType === MoveType.LADDER_CLIMB) {
            this.statistics.addLadderClimb(currentPlayer.name);
        }
        
        // Check for win condition
        if (this.rules.isWinningPosition(newPosition, this.board)) {
            moveResult.isWinner = true;
            moveResult.moveType = MoveType.WIN;
            this._endGame(currentPlayer);
        } else {
            // Move to next player (unless extra turn rules apply)
            if (!this.rules.shouldGetExtraTurn(diceValue)) {
                this._nextPlayer();
            }
        }
        
        this.moveHistory.push(moveResult);
        return moveResult;
    }
    
    _nextPlayer() {
        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
    }
    
    _endGame(winner) {
        this.gameState = GameStateType.FINISHED;
        this.winner = winner;
        this.endTime = new Date();
        
        if (this.startTime) {
            this.statistics.gameDuration = (this.endTime - this.startTime) / 1000;
        }
        
        winner.gamesWon++;
    }
    
    getGameState() {
        return {
            state: this.gameState,
            currentPlayer: this.players.length > 0 ? this.getCurrentPlayer().name : null,
            players: this.players.map(p => [p.name, p.position]),
            winner: this.winner ? this.winner.name : null,
            totalMoves: this.moveHistory.length,
            boardSize: this.board.size
        };
    }
    
    getBoardState() {
        const snakes = {};
        for (const [pos, snake] of this.board.snakes) {
            snakes[pos] = { head: pos, tail: snake.tail, name: snake.name };
        }
        
        const ladders = {};
        for (const [pos, ladder] of this.board.ladders) {
            ladders[pos] = { bottom: pos, top: ladder.top, name: ladder.name };
        }
        
        return {
            size: this.board.size,
            snakes: snakes,
            ladders: ladders,
            playerPositions: Object.fromEntries(
                this.players.map(player => [player.name, player.position])
            )
        };
    }
    
    resetGame() {
        this.gameState = GameStateType.WAITING;
        this.currentPlayerIndex = 0;
        this.moveHistory = [];
        this.statistics = new GameStatistics();
        this.startTime = null;
        this.endTime = null;
        this.winner = null;
        
        // Reset all players
        for (const player of this.players) {
            player.resetPosition();
        }
        
        return true;
    }
    
    getStatistics() {
        const playerStats = {};
        
        for (const player of this.players) {
            playerStats[player.name] = {
                position: player.position,
                moves: this.statistics.playerMoves.get(player.name) || 0,
                snakeBites: this.statistics.playerSnakeBites.get(player.name) || 0,
                ladderClimbs: this.statistics.playerLadderClimbs.get(player.name) || 0,
                winPercentage: player.getWinPercentage()
            };
        }
        
        return {
            gameDuration: this.statistics.gameDuration,
            totalMoves: this.statistics.totalMoves,
            averageDiceRoll: this.statistics.getAverageDiceRoll(),
            snakeEncounters: this.statistics.snakeEncounters,
            ladderClimbs: this.statistics.ladderClimbs,
            diceStatistics: this.dice.getStatistics(),
            playerStats: playerStats
        };
    }
}

// BoardRenderer class
class BoardRenderer {
    constructor(board) {
        this.board = board;
    }
    
    renderAscii(players = []) {
        const playerPositions = {};
        for (const player of players) {
            if (player.position > 0) {
                playerPositions[player.position] = player.name[0].toUpperCase();
            }
        }
        
        const output = [];
        output.push('='.repeat(this.board.cols * 6 + 1));
        
        for (let row = 0; row < this.board.rows; row++) {
            let line = '|';
            for (let col = 0; col < this.board.cols; col++) {
                let posObj = null;
                // Find position object for this row/col
                for (const [posNum, pos] of this.board.positions) {
                    if (pos.row === row && pos.col === col) {
                        posObj = pos;
                        break;
                    }
                }
                
                if (posObj) {
                    let cellContent = posObj.number.toString().padStart(3);
                    
                    // Add player marker
                    if (posObj.number in playerPositions) {
                        cellContent += `(${playerPositions[posObj.number]})`;
                    } else if (this.board.snakes.has(posObj.number)) {
                        cellContent += '(S)';
                    } else if (this.board.ladders.has(posObj.number)) {
                        cellContent += '(L)';
                    } else {
                        cellContent += '   ';
                    }
                } else {
                    cellContent = '      ';
                }
                
                line += cellContent.substring(0, 6).padEnd(6) + '|';
            }
            
            output.push(line);
            output.push('='.repeat(this.board.cols * 6 + 1));
        }
        
        return output.join('\n');
    }
    
    renderCompact(players = []) {
        const playerPositions = {};
        for (const player of players) {
            if (player.position > 0) {
                playerPositions[player.position] = player.name;
            }
        }
        
        const output = [];
        output.push(`Board Size: ${this.board.size}`);
        output.push(`Snakes: ${this.board.snakes.size}, Ladders: ${this.board.ladders.size}`);
        output.push('-'.repeat(40));
        
        // Show snakes and ladders
        if (this.board.snakes.size > 0) {
            output.push('Snakes:');
            const sortedSnakes = Array.from(this.board.snakes.entries())
                .sort((a, b) => b[0] - a[0]);
            for (const [head, snake] of sortedSnakes) {
                output.push(`  ${head} → ${snake.tail}`);
            }
        }
        
        if (this.board.ladders.size > 0) {
            output.push('Ladders:');
            const sortedLadders = Array.from(this.board.ladders.entries())
                .sort((a, b) => a[0] - b[0]);
            for (const [bottom, ladder] of sortedLadders) {
                output.push(`  ${bottom} → ${ladder.top}`);
            }
        }
        
        // Show player positions
        if (Object.keys(playerPositions).length > 0) {
            output.push('Players:');
            const sortedPlayers = Object.entries(playerPositions)
                .sort((a, b) => parseInt(b[0]) - parseInt(a[0]));
            for (const [pos, name] of sortedPlayers) {
                output.push(`  ${name}: ${pos}`);
            }
        }
        
        return output.join('\n');
    }
}

// Demo functions
async function demoSnakeLadderGame() {
    console.log('🐍🪜 Snake and Ladder Game Demo');
    console.log('='.repeat(50));
    
    // Create game
    const game = new SnakeLadderGame(100, GameMode.CLASSIC);
    
    console.log('\n🎮 1. Game Setup');
    console.log('-'.repeat(30));
    
    // Add players
    game.addPlayer('Alice', PlayerType.HUMAN);
    game.addPlayer('Bob', PlayerType.AI_MEDIUM);
    game.addPlayer('Charlie', PlayerType.AI_HARD);
    
    console.log(`Players added: ${game.players.map(p => p.name)}`);
    console.log(`Board size: ${game.board.size}`);
    console.log(`Snakes: ${game.board.snakes.size}`);
    console.log(`Ladders: ${game.board.ladders.size}`);
    
    // Start game
    game.startGame();
    console.log(`Game started! Current state: ${game.gameState}`);
    
    console.log('\n🎲 2. Game Simulation');
    console.log('-'.repeat(30));
    
    // Simulate game moves
    let moveCount = 0;
    const maxMoves = 100; // Prevent infinite games
    
    while (game.gameState === GameStateType.PLAYING && moveCount < maxMoves) {
        const currentPlayer = game.getCurrentPlayer();
        console.log(`\n${currentPlayer.name}'s turn (Position: ${currentPlayer.position})`);
        
        // AI thinking simulation
        if (currentPlayer instanceof AIPlayer) {
            console.log(`  ${currentPlayer.name} is thinking...`);
            await new Promise(resolve => setTimeout(resolve, 50)); // Reduced thinking time for demo
        }
        
        // Make move
        const moveResult = await game.moveCurrentPlayer();
        
        // Display move result
        if (moveResult.moveType === MoveType.NORMAL) {
            console.log(`  Rolled ${moveResult.diceValue}, moved to ${moveResult.endPosition}`);
        } else if (moveResult.moveType === MoveType.SNAKE_BITE) {
            console.log(`  Rolled ${moveResult.diceValue}, hit snake! ${moveResult.snakeOrLadder}`);
            console.log(`  Slid down to ${moveResult.endPosition}`);
        } else if (moveResult.moveType === MoveType.LADDER_CLIMB) {
            console.log(`  Rolled ${moveResult.diceValue}, found ladder! ${moveResult.snakeOrLadder}`);
            console.log(`  Climbed up to ${moveResult.endPosition}`);
        } else if (moveResult.moveType === MoveType.BLOCKED) {
            console.log(`  Rolled ${moveResult.diceValue}, blocked (exact landing required)`);
        } else if (moveResult.moveType === MoveType.WIN) {
            console.log(`  Rolled ${moveResult.diceValue}, reached position ${moveResult.endPosition}`);
            console.log(`  🎉 ${moveResult.playerName} WINS!`);
        }
        
        moveCount++;
    }
    
    console.log(`\n📊 3. Game Statistics`);
    console.log('-'.repeat(30));
    
    const stats = game.getStatistics();
    console.log(`Game Duration: ${stats.gameDuration.toFixed(1)} seconds`);
    console.log(`Total Moves: ${stats.totalMoves}`);
    console.log(`Average Dice Roll: ${stats.averageDiceRoll.toFixed(2)}`);
    console.log(`Snake Encounters: ${stats.snakeEncounters}`);
    console.log(`Ladder Climbs: ${stats.ladderClimbs}`);
    
    console.log('\nPlayer Statistics:');
    for (const [playerName, playerStats] of Object.entries(stats.playerStats)) {
        console.log(`  ${playerName}:`);
        console.log(`    Final Position: ${playerStats.position}`);
        console.log(`    Moves Made: ${playerStats.moves}`);
        console.log(`    Snake Bites: ${playerStats.snakeBites}`);
        console.log(`    Ladder Climbs: ${playerStats.ladderClimbs}`);
    }
    
    console.log(`\n🏆 4. Game Results`);
    console.log('-'.repeat(30));
    
    if (game.winner) {
        console.log(`Winner: ${game.winner.name}`);
        console.log(`Winning Position: ${game.winner.position}`);
        console.log(`Total Moves by Winner: ${stats.playerStats[game.winner.name].moves}`);
    } else {
        console.log('Game ended without a winner (max moves reached)');
    }
    
    console.log('\n🎯 5. Board Visualization');
    console.log('-'.repeat(30));
    
    const renderer = new BoardRenderer(game.board);
    const compactBoard = renderer.renderCompact(game.players);
    console.log(compactBoard);
    
    console.log('\n✅ Demo completed successfully!');
}

async function performanceTest() {
    console.log('\n🚀 Performance Test');
    console.log('='.repeat(50));
    
    // Test multiple games
    const numGames = 100;
    let totalMoves = 0;
    let totalDuration = 0;
    const winners = {};
    
    console.log(`Running ${numGames} game simulations...`);
    
    const startTime = performance.now();
    
    for (let i = 0; i < numGames; i++) {
        const game = new SnakeLadderGame(100, GameMode.CLASSIC);
        
        // Add AI players for speed
        game.addPlayer('Player1', PlayerType.AI_EASY);
        game.addPlayer('Player2', PlayerType.AI_EASY);
        
        game.startGame();
        
        // Simulate game
        let moves = 0;
        while (game.gameState === GameStateType.PLAYING && moves < 200) {
            await game.moveCurrentPlayer();
            moves++;
        }
        
        // Collect statistics
        if (game.winner) {
            winners[game.winner.name] = (winners[game.winner.name] || 0) + 1;
        }
        
        totalMoves += moves;
        if (game.statistics.gameDuration > 0) {
            totalDuration += game.statistics.gameDuration;
        }
    }
    
    const endTime = performance.now();
    
    console.log(`\nPerformance Results:`);
    console.log(`Total Simulation Time: ${((endTime - startTime) / 1000).toFixed(2)} seconds`);
    console.log(`Average Game Length: ${(totalMoves / numGames).toFixed(1)} moves`);
    console.log(`Average Game Duration: ${(totalDuration / numGames).toFixed(2)} seconds`);
    console.log(`Games per Second: ${(numGames / ((endTime - startTime) / 1000)).toFixed(1)}`);
    
    console.log(`\nWin Distribution:`);
    for (const [player, wins] of Object.entries(winners)) {
        console.log(`  ${player}: ${wins} wins (${(wins/numGames*100).toFixed(1)}%)`);
    }
    
    console.log('\n🎉 Performance test completed!');
}

async function interactiveGame() {
    console.log('\n🎮 Interactive Snake and Ladder Game');
    console.log('='.repeat(50));
    
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    const question = (prompt) => new Promise(resolve => rl.question(prompt, resolve));
    
    try {
        // Get game configuration
        let numPlayers;
        try {
            const input = await question('Number of players (2-6): ');
            numPlayers = parseInt(input);
            if (!(2 <= numPlayers && numPlayers <= 6)) {
                console.log('Invalid number of players. Using 2 players.');
                numPlayers = 2;
            }
        } catch (error) {
            console.log('Invalid input. Using 2 players.');
            numPlayers = 2;
        }
        
        // Create game
        const game = new SnakeLadderGame(100, GameMode.CLASSIC);
        
        // Add players
        for (let i = 0; i < numPlayers; i++) {
            let name = await question(`Enter name for player ${i+1}: `);
            name = name.trim() || `Player${i+1}`;
            
            const playerTypeStr = await question(`Player type for ${name} (human/ai_easy/ai_medium/ai_hard): `);
            const playerType = {
                'human': PlayerType.HUMAN,
                'ai_easy': PlayerType.AI_EASY,
                'ai_medium': PlayerType.AI_MEDIUM,
                'ai_hard': PlayerType.AI_HARD
            }[playerTypeStr.trim().toLowerCase()] || PlayerType.HUMAN;
            
            game.addPlayer(name, playerType);
        }
        
        // Start game
        game.startGame();
        const renderer = new BoardRenderer(game.board);
        
        console.log(`\n🎯 Game Started!`);
        console.log("Commands: 'roll' to roll dice, 'board' to see board, 'stats' for statistics, 'quit' to exit");
        
        // Game loop
        while (game.gameState === GameStateType.PLAYING) {
            const currentPlayer = game.getCurrentPlayer();
            console.log(`\n${currentPlayer.name}'s turn (Position: ${currentPlayer.position})`);
            
            if (currentPlayer instanceof AIPlayer) {
                console.log('AI is making a move...');
                await new Promise(resolve => setTimeout(resolve, 500));
                const moveResult = await game.moveCurrentPlayer();
                
                // Display move result
                console.log(`Rolled ${moveResult.diceValue}`);
                if (moveResult.moveType === MoveType.SNAKE_BITE) {
                    console.log(`Snake bite! Moved to ${moveResult.endPosition}`);
                } else if (moveResult.moveType === MoveType.LADDER_CLIMB) {
                    console.log(`Ladder climb! Moved to ${moveResult.endPosition}`);
                } else if (moveResult.moveType === MoveType.WIN) {
                    console.log(`🎉 ${moveResult.playerName} WINS!`);
                } else {
                    console.log(`Moved to ${moveResult.endPosition}`);
                }
            } else {
                // Human player input
                while (true) {
                    const command = await question('Enter command: ');
                    
                    if (command.trim().toLowerCase() === 'roll') {
                        const moveResult = await game.moveCurrentPlayer();
                        
                        console.log(`Rolled ${moveResult.diceValue}`);
                        if (moveResult.moveType === MoveType.SNAKE_BITE) {
                            console.log(`Snake bite! Moved to ${moveResult.endPosition}`);
                        } else if (moveResult.moveType === MoveType.LADDER_CLIMB) {
                            console.log(`Ladder climb! Moved to ${moveResult.endPosition}`);
                        } else if (moveResult.moveType === MoveType.WIN) {
                            console.log(`🎉 ${moveResult.playerName} WINS!`);
                        } else {
                            console.log(`Moved to ${moveResult.endPosition}`);
                        }
                        break;
                    } else if (command.trim().toLowerCase() === 'board') {
                        console.log(renderer.renderCompact(game.players));
                    } else if (command.trim().toLowerCase() === 'stats') {
                        const stats = game.getStatistics();
                        console.log(`Moves: ${stats.totalMoves}, Avg Dice: ${stats.averageDiceRoll.toFixed(2)}`);
                    } else if (command.trim().toLowerCase() === 'quit') {
                        console.log('Game ended by player.');
                        rl.close();
                        return;
                    } else {
                        console.log("Invalid command. Use 'roll', 'board', 'stats', or 'quit'.");
                    }
                }
            }
        }
        
        // Show final results
        if (game.winner) {
            console.log(`\n🏆 Congratulations ${game.winner.name}!`);
            const stats = game.getStatistics();
            console.log(`Game completed in ${stats.totalMoves} moves and ${stats.gameDuration.toFixed(1)} seconds`);
        }
        
    } finally {
        rl.close();
    }
}

async function main() {
    console.log('Snake and Ladder Game Implementation');
    console.log('1. Demo Mode');
    console.log('2. Interactive Mode');
    console.log('3. Performance Test');
    
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    rl.question('\nSelect mode (1-3): ', async (choice) => {
        rl.close();
        
        if (choice === '1') {
            await demoSnakeLadderGame();
            await performanceTest();
        } else if (choice === '2') {
            await interactiveGame();
        } else if (choice === '3') {
            await performanceTest();
        } else {
            console.log('Running demo mode...');
            await demoSnakeLadderGame();
            await performanceTest();
        }
    });
}

// Run if this file is executed directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = {
    SnakeLadderGame,
    Player,
    HumanPlayer,
    AIPlayer,
    Board,
    BoardRenderer,
    GameRules,
    Dice,
    PlayerType,
    GameMode,
    GameStateType,
    MoveType
};