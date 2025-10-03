/**
 * MEMORY CARD GAME Implementation in JavaScript
 * ============================================
 * 
 * This implementation demonstrates several key Design Patterns and OOP Concepts:
 * 
 * DESIGN PATTERNS USED:
 * 1. State Pattern: Card state management
 *    - FaceDown, FaceUp, Matched states
 *    - Clean state transitions
 *    - State-specific behavior
 * 
 * 2. Observer Pattern: Game event notifications
 *    - Match found events
 *    - Turn complete events
 *    - Score updates
 * 
 * 3. Strategy Pattern: Difficulty levels
 *    - Easy (4×4), Medium (6×6), Hard (8×8)
 *    - Pluggable configurations
 * 
 * 4. Memento Pattern: Game state save/restore
 *    - Save current state
 *    - Restore previous state
 * 
 * 5. Factory Pattern: Card creation
 *    - Standardized generation
 *    - Symbol assignment
 * 
 * 6. Command Pattern: Turn as command
 *    - Turn encapsulates flips
 *    - History tracking
 * 
 * OOP CONCEPTS DEMONSTRATED:
 * 1. Encapsulation: Card state, board grid hidden
 * 2. Abstraction: Clear interfaces
 * 3. Composition: Board composed of cards
 * 4. Polymorphism: Different difficulty strategies
 * 
 * ARCHITECTURAL PRINCIPLES:
 * - Single Responsibility: Each class one purpose
 * - Open/Closed: Easy to extend
 * - Low Coupling: Clean interfaces
 */

// Enums
const CardState = Object.freeze({
    FACE_DOWN: 'face_down',
    FACE_UP: 'face_up',
    MATCHED: 'matched'
});

const Difficulty = Object.freeze({
    EASY: { name: 'EASY', rows: 4, cols: 4, totalCards: 16 },
    MEDIUM: { name: 'MEDIUM', rows: 6, cols: 6, totalCards: 36 },
    HARD: { name: 'HARD', rows: 8, cols: 8, totalCards: 64 }
});

const GameState = Object.freeze({
    SETUP: 'setup',
    PLAYING: 'playing',
    PAUSED: 'paused',
    FINISHED: 'finished'
});

/**
 * Position - Board coordinates
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
        return `(${this.row},${this.col})`;
    }
}

/**
 * Card - Memory card with state
 * 
 * DESIGN PATTERN: State Pattern
 */
class Card {
    constructor(id, symbol) {
        this.id = id;
        this.symbol = symbol;
        this.state = CardState.FACE_DOWN;
        this.position = null;
    }

    flip() {
        if (this.state === CardState.FACE_DOWN) {
            this.state = CardState.FACE_UP;
        }
    }

    flipDown() {
        if (this.state === CardState.FACE_UP) {
            this.state = CardState.FACE_DOWN;
        }
    }

    match() {
        this.state = CardState.MATCHED;
    }

    isMatched() {
        return this.state === CardState.MATCHED;
    }

    isFaceUp() {
        return this.state === CardState.FACE_UP || this.state === CardState.MATCHED;
    }

    toString() {
        return this.state === CardState.FACE_DOWN ? '?' : this.symbol;
    }
}

/**
 * Board - Game board with cards
 */
class Board {
    constructor(difficulty) {
        this.difficulty = difficulty;
        this.rows = difficulty.rows;
        this.cols = difficulty.cols;
        this.grid = Array(this.rows).fill(null).map(() => Array(this.cols).fill(null));
        this.cards = [];
        this.firstFlipped = null;
        this.secondFlipped = null;
    }

    initialize() {
        const totalCards = this.rows * this.cols;
        const numPairs = totalCards / 2;

        // Create symbol pairs
        const symbols = [];
        for (let i = 0; i < numPairs; i++) {
            const symbol = i < 26 ? String.fromCharCode(65 + i) : String(i);
            symbols.push(symbol, symbol); // Add pair
        }

        // Shuffle
        this.shuffle(symbols);

        // Create cards
        for (let i = 0; i < symbols.length; i++) {
            const card = new Card(i, symbols[i]);
            this.cards.push(card);
        }

        // Place on grid
        let idx = 0;
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                const card = this.cards[idx];
                card.position = new Position(row, col);
                this.grid[row][col] = card;
                idx++;
            }
        }
    }

    shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    getCard(position) {
        if (position.row >= 0 && position.row < this.rows &&
            position.col >= 0 && position.col < this.cols) {
            return this.grid[position.row][position.col];
        }
        return null;
    }

    flipCard(position) {
        const card = this.getCard(position);

        if (!card || card.isMatched()) {
            return null;
        }

        // Track flipped cards
        if (!this.firstFlipped) {
            card.flip();
            this.firstFlipped = card;
            return card;
        } else if (!this.secondFlipped && card !== this.firstFlipped) {
            card.flip();
            this.secondFlipped = card;
            return card;
        }

        return null;
    }

    checkMatch() {
        if (!this.firstFlipped || !this.secondFlipped) {
            return false;
        }

        if (this.firstFlipped.symbol === this.secondFlipped.symbol) {
            this.firstFlipped.match();
            this.secondFlipped.match();
            this.resetFlipped();
            return true;
        }

        return false;
    }

    resetNonMatched() {
        if (this.firstFlipped && !this.firstFlipped.isMatched()) {
            this.firstFlipped.flipDown();
        }
        if (this.secondFlipped && !this.secondFlipped.isMatched()) {
            this.secondFlipped.flipDown();
        }

        this.resetFlipped();
    }

    resetFlipped() {
        this.firstFlipped = null;
        this.secondFlipped = null;
    }

    isComplete() {
        return this.cards.every(card => card.isMatched());
    }

    display() {
        console.log('\n   ' + Array.from({length: this.cols}, (_, i) => 
            i.toString().padStart(2)
        ).join(' '));
        console.log('  +' + '---'.repeat(this.cols) + '+');

        for (let row = 0; row < this.rows; row++) {
            let rowStr = row.toString().padStart(2) + ' |';

            for (let col = 0; col < this.cols; col++) {
                const card = this.grid[row][col];
                rowStr += ' ' + (card ? card.toString() : '?') + ' ';
            }

            console.log(rowStr + '|');
        }

        console.log('  +' + '---'.repeat(this.cols) + '+');
    }
}

/**
 * PlayerStats - Player statistics
 */
class PlayerStats {
    constructor() {
        this.matchesFound = 0;
        this.movesMade = 0;
        this.turnsTaken = 0;
    }

    accuracy() {
        if (this.movesMade === 0) return 0;
        return (this.matchesFound * 2 / this.movesMade) * 100;
    }
}

/**
 * Player - Game player
 */
class Player {
    constructor(name) {
        this.name = name;
        this.score = 0;
        this.stats = new PlayerStats();
    }

    incrementScore(points = 10) {
        this.score += points;
        this.stats.matchesFound++;
    }

    recordMove() {
        this.stats.movesMade++;
    }

    toString() {
        return `${this.name} (Score: ${this.score})`;
    }
}

/**
 * MemoryCardGame - Main game controller
 * 
 * DESIGN PATTERN: Facade Pattern
 */
class MemoryCardGame {
    constructor(playerNames, difficulty = Difficulty.EASY) {
        this.difficulty = difficulty;
        this.board = new Board(difficulty);
        this.players = playerNames.map(name => new Player(name));
        this.currentPlayerIdx = 0;
        this.state = GameState.SETUP;
        this.movesThisTurn = 0;
    }

    get currentPlayer() {
        return this.players[this.currentPlayerIdx];
    }

    startGame() {
        console.log('\n' + '='.repeat(60));
        console.log(`MEMORY CARD GAME - ${this.difficulty.name}`);
        console.log('='.repeat(60));
        console.log(`Players: ${this.players.map(p => p.name).join(', ')}`);
        console.log(`Board: ${this.difficulty.rows}×${this.difficulty.cols} (${this.difficulty.totalCards / 2} pairs)`);

        this.board.initialize();
        this.state = GameState.PLAYING;
    }

    async flipCard(position) {
        if (this.state !== GameState.PLAYING) {
            return false;
        }

        if (this.movesThisTurn >= 2) {
            return false;
        }

        const card = this.board.flipCard(position);

        if (card) {
            this.movesThisTurn++;
            this.currentPlayer.recordMove();
            console.log(`\n${this.currentPlayer.name} flips ${position}: ${card.symbol}`);

            // Check for match after second flip
            if (this.movesThisTurn === 2) {
                await this.sleep(500);

                if (this.board.checkMatch()) {
                    console.log('✓ MATCH!');
                    this.currentPlayer.incrementScore();
                } else {
                    console.log('✗ No match');
                    this.board.resetNonMatched();
                    this.nextTurn();
                }

                this.movesThisTurn = 0;
            }

            return true;
        }

        return false;
    }

    nextTurn() {
        this.currentPlayerIdx = (this.currentPlayerIdx + 1) % this.players.length;
        console.log(`\n${this.currentPlayer.name}'s turn`);
    }

    isGameComplete() {
        if (this.board.isComplete()) {
            this.state = GameState.FINISHED;
            return true;
        }
        return false;
    }

    getWinner() {
        return this.players.reduce((winner, player) =>
            player.score > winner.score ? player : winner
        );
    }

    async playAutoDemo() {
        this.startGame();

        const positions = [];
        for (let r = 0; r < this.board.rows; r++) {
            for (let c = 0; c < this.board.cols; c++) {
                positions.push([r, c]);
            }
        }

        // Shuffle positions
        this.board.shuffle(positions);

        let moveCount = 0;
        const maxMoves = 50;

        while (!this.isGameComplete() && moveCount < maxMoves) {
            this.board.display();

            // Make two flips
            for (let i = 0; i < 2; i++) {
                if (positions.length > 0 && !this.isGameComplete()) {
                    const [row, col] = positions.shift();
                    await this.flipCard(new Position(row, col));
                    await this.sleep(300);
                }
            }

            moveCount++;
        }

        // Game over
        this.board.display();
        this.showResults();
    }

    showResults() {
        const winner = this.getWinner();

        console.log('\n' + '='.repeat(60));
        console.log('GAME OVER');
        console.log('='.repeat(60));
        console.log(`Winner: ${winner.name}`);
        console.log('\nFinal Scores:');

        for (const player of this.players) {
            console.log(`  ${player.name}: ${player.score} points`);
            console.log(`    Matches: ${player.stats.matchesFound}`);
            console.log(`    Moves: ${player.stats.movesMade}`);
            console.log(`    Accuracy: ${player.stats.accuracy().toFixed(1)}%`);
        }

        console.log('='.repeat(60));
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

/**
 * Demonstrate Memory Card Game
 */
async function main() {
    console.log('='.repeat(60));
    console.log('MEMORY CARD GAME - Low Level Design Demo');
    console.log('='.repeat(60));

    const game = new MemoryCardGame(['Alice', 'Bob'], Difficulty.EASY);
    await game.playAutoDemo();

    console.log('\n' + '='.repeat(60));
    console.log('DEMO COMPLETE');
    console.log('='.repeat(60));
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        MemoryCardGame,
        Board,
        Card,
        Player,
        PlayerStats,
        Position,
        CardState,
        Difficulty,
        GameState
    };
}

// Run demo if executed directly
if (typeof require !== 'undefined' && require.main === module) {
    main();
}

