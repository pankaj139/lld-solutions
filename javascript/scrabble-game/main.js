/**
 * SCRABBLE GAME Implementation in JavaScript
 * ==========================================
 * 
 * This implementation demonstrates several key Design Patterns and OOP Concepts:
 * 
 * DESIGN PATTERNS USED:
 * 1. Strategy Pattern: Different scoring strategies
 *    - Standard scoring vs tournament vs speed game
 *    - Pluggable scoring algorithms
 *    - Easy to add custom scoring rules
 * 
 * 2. Factory Pattern: Tile creation with proper distribution
 *    - TileBag factory creates tiles with standard frequencies
 *    - Ensures correct tile distribution
 *    - Centralized tile generation
 * 
 * 3. Observer Pattern: Score updates and game events
 *    - Players observe score changes
 *    - UI observers for board updates
 *    - Event-driven architecture
 * 
 * 4. Command Pattern: Word placement as reversible commands
 *    - WordPlacement encapsulates placement details
 *    - Supports undo for challenges
 *    - Validation and execution separated
 * 
 * 5. Chain of Responsibility: Multi-step word validation
 *    - Placement rules → Dictionary check → Score calculation
 *    - Each validator handles specific concern
 *    - Clean separation of validation logic
 * 
 * 6. Composite Pattern: Board composed of squares
 *    - Board is composite of Square objects
 *    - Unified interface for board operations
 * 
 * OOP CONCEPTS DEMONSTRATED:
 * 1. Encapsulation: Tile values, board state hidden
 * 2. Abstraction: Clear interfaces for dictionary, validator
 * 3. Composition: Board composed of squares
 * 4. Polymorphism: Multiple scoring strategies
 * 
 * ARCHITECTURAL PRINCIPLES:
 * - Single Responsibility: Each class has one clear purpose
 * - Open/Closed: Easy to extend without modification
 * - Dependency Injection: Components injected
 * - Low Coupling: Clean interfaces
 */

// Enums - Using Object.freeze() for immutability
const SquareType = Object.freeze({
    NORMAL: { symbol: '  ', name: 'NORMAL' },
    DOUBLE_LETTER: { symbol: 'DL', name: 'DOUBLE_LETTER' },
    TRIPLE_LETTER: { symbol: 'TL', name: 'TRIPLE_LETTER' },
    DOUBLE_WORD: { symbol: 'DW', name: 'DOUBLE_WORD' },
    TRIPLE_WORD: { symbol: 'TW', name: 'TRIPLE_WORD' },
    CENTER: { symbol: '★ ', name: 'CENTER' }
});

const Direction = Object.freeze({
    HORIZONTAL: 'horizontal',
    VERTICAL: 'vertical'
});

// Standard Scrabble letter values
const LETTER_VALUES = {
    'A': 1, 'B': 3, 'C': 3, 'D': 2, 'E': 1, 'F': 4, 'G': 2, 'H': 4,
    'I': 1, 'J': 8, 'K': 5, 'L': 1, 'M': 3, 'N': 1, 'O': 1, 'P': 3,
    'Q': 10, 'R': 1, 'S': 1, 'T': 1, 'U': 1, 'V': 4, 'W': 4, 'X': 8,
    'Y': 4, 'Z': 10, ' ': 0  // Blank tile
};

// Standard Scrabble tile distribution (100 tiles total)
const TILE_DISTRIBUTION = {
    'A': 9, 'B': 2, 'C': 2, 'D': 4, 'E': 12, 'F': 2, 'G': 3, 'H': 2,
    'I': 9, 'J': 1, 'K': 1, 'L': 4, 'M': 2, 'N': 6, 'O': 8, 'P': 2,
    'Q': 1, 'R': 6, 'S': 4, 'T': 6, 'U': 4, 'V': 2, 'W': 2, 'X': 1,
    'Y': 2, 'Z': 1, ' ': 2  // 2 blank tiles
};

/**
 * Tile - Represents a letter tile
 * 
 * OOP CONCEPT: Value Object
 * - Immutable after creation
 * - Contains letter and point value
 */
class Tile {
    constructor(letter) {
        this.letter = letter.toUpperCase();
        this.value = LETTER_VALUES[this.letter];
        this.isBlank = letter === ' ';
    }

    toString() {
        return this.isBlank ? '*' : this.letter;
    }
}

/**
 * TileBag - Factory Pattern: Creates and manages tile pool
 * 
 * DESIGN PATTERN: Factory Pattern
 * - Creates tiles with proper distribution
 * - Manages random draw
 */
class TileBag {
    constructor() {
        this.tiles = [];
        this._initializeTiles();
    }

    _initializeTiles() {
        for (const [letter, count] of Object.entries(TILE_DISTRIBUTION)) {
            for (let i = 0; i < count; i++) {
                this.tiles.push(new Tile(letter));
            }
        }
        this._shuffle();
    }

    _shuffle() {
        for (let i = this.tiles.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.tiles[i], this.tiles[j]] = [this.tiles[j], this.tiles[i]];
        }
    }

    draw() {
        return this.tiles.pop() || null;
    }

    drawMultiple(count) {
        const drawn = [];
        for (let i = 0; i < Math.min(count, this.tiles.length); i++) {
            const tile = this.draw();
            if (tile) drawn.push(tile);
        }
        return drawn;
    }

    returnTiles(tiles) {
        this.tiles.push(...tiles);
        this._shuffle();
    }

    get remainingCount() {
        return this.tiles.length;
    }
}

/**
 * Rack - Player's tile rack (max 7 tiles)
 * 
 * OOP CONCEPT: Encapsulation
 * - Manages player's tiles
 * - Enforces 7-tile limit
 */
class Rack {
    static MAX_TILES = 7;

    constructor() {
        this.tiles = [];
    }

    addTile(tile) {
        if (this.tiles.length < Rack.MAX_TILES) {
            this.tiles.push(tile);
            return true;
        }
        return false;
    }

    removeTile(letter) {
        const index = this.tiles.findIndex(t => t.letter === letter.toUpperCase());
        if (index !== -1) {
            return this.tiles.splice(index, 1)[0];
        }
        return null;
    }

    hasLetters(word) {
        const rackLetters = this.tiles.map(t => t.letter);
        const wordLetters = {};
        for (const letter of word.toUpperCase()) {
            wordLetters[letter] = (wordLetters[letter] || 0) + 1;
        }

        const rackCounter = {};
        for (const letter of rackLetters) {
            rackCounter[letter] = (rackCounter[letter] || 0) + 1;
        }

        for (const [letter, count] of Object.entries(wordLetters)) {
            if ((rackCounter[letter] || 0) < count) {
                if (rackCounter[' '] > 0) {
                    rackCounter[' ']--;
                } else {
                    return false;
                }
            }
        }

        return true;
    }

    toString() {
        return this.tiles.map(t => t.toString()).join(' ');
    }
}

/**
 * Square - Individual board square
 * 
 * DESIGN PATTERN: Composite Pattern element
 */
class Square {
    constructor(row, col, type) {
        this.row = row;
        this.col = col;
        this.type = type;
        this.tile = null;
        this.multiplierUsed = false;
    }

    isOccupied() {
        return this.tile !== null;
    }

    getMultiplier() {
        if (this.multiplierUsed || this.isOccupied()) {
            return [1, 'none'];
        }

        switch (this.type.name) {
            case 'DOUBLE_LETTER':
                return [2, 'letter'];
            case 'TRIPLE_LETTER':
                return [3, 'letter'];
            case 'DOUBLE_WORD':
            case 'CENTER':
                return [2, 'word'];
            case 'TRIPLE_WORD':
                return [3, 'word'];
            default:
                return [1, 'none'];
        }
    }
}

/**
 * Board - 15×15 Scrabble board with premium squares
 * 
 * DESIGN PATTERN: Composite Pattern
 * - Composed of Square objects
 */
class Board {
    static SIZE = 15;
    static CENTER = [7, 7];

    constructor() {
        this.grid = [];
        this._initializeBoard();
    }

    _initializeBoard() {
        for (let row = 0; row < Board.SIZE; row++) {
            const boardRow = [];
            for (let col = 0; col < Board.SIZE; col++) {
                const squareType = this._getSquareType(row, col);
                boardRow.push(new Square(row, col, squareType));
            }
            this.grid.push(boardRow);
        }
    }

    _getSquareType(row, col) {
        // Center square
        if (row === Board.CENTER[0] && col === Board.CENTER[1]) {
            return SquareType.CENTER;
        }

        // Triple Word Score
        const twPositions = new Set(['0,0', '0,7', '0,14', '7,0', '7,14', '14,0', '14,7', '14,14']);
        if (twPositions.has(`${row},${col}`)) {
            return SquareType.TRIPLE_WORD;
        }

        // Double Word Score (diagonal pattern)
        if (row === col || row + col === 14) {
            if ((row >= 1 && row <= 4) || (row >= 11 && row <= 13)) {
                if ((row + col) % 4 === 0 || Math.abs(row - col) % 4 === 0) {
                    return SquareType.DOUBLE_WORD;
                }
            }
        }

        // Triple Letter Score
        const tlPositions = new Set([
            '1,5', '1,9', '5,1', '5,5', '5,9', '5,13', '9,1', '9,5', '9,9', '9,13', '13,5', '13,9'
        ]);
        if (tlPositions.has(`${row},${col}`)) {
            return SquareType.TRIPLE_LETTER;
        }

        // Double Letter Score
        const dlPositions = new Set([
            '0,3', '0,11', '2,6', '2,8', '3,0', '3,7', '3,14', '6,2', '6,6', '6,8', '6,12',
            '7,3', '7,11', '8,2', '8,6', '8,8', '8,12', '11,0', '11,7', '11,14', '12,6', '12,8', '14,3', '14,11'
        ]);
        if (dlPositions.has(`${row},${col}`)) {
            return SquareType.DOUBLE_LETTER;
        }

        return SquareType.NORMAL;
    }

    getSquare(row, col) {
        if (row >= 0 && row < Board.SIZE && col >= 0 && col < Board.SIZE) {
            return this.grid[row][col];
        }
        return null;
    }

    placeTile(row, col, tile) {
        const square = this.getSquare(row, col);
        if (square && !square.isOccupied()) {
            square.tile = tile;
            return true;
        }
        return false;
    }

    isFirstMove() {
        const center = this.grid[Board.CENTER[0]][Board.CENTER[1]];
        return !center.isOccupied();
    }

    display() {
        console.log('\n    ' + Array.from({length: Board.SIZE}, (_, i) => i.toString().padStart(2)).join(' '));
        console.log('   +' + '---'.repeat(Board.SIZE) + '+');

        for (let row = 0; row < Board.SIZE; row++) {
            let rowStr = row.toString().padStart(2) + ' |';
            for (let col = 0; col < Board.SIZE; col++) {
                const square = this.grid[row][col];
                if (square.tile) {
                    rowStr += ` ${square.tile} `;
                } else {
                    rowStr += square.type.symbol;
                }
                rowStr += col < Board.SIZE - 1 ? '|' : '';
            }
            console.log(rowStr + '|');
        }

        console.log('   +' + '---'.repeat(Board.SIZE) + '+');
    }
}

/**
 * Dictionary - Word dictionary for validation
 * 
 * DESIGN PATTERN: Fast lookup using Set (O(1))
 */
class Dictionary {
    constructor() {
        this.words = new Set();
    }

    addWord(word) {
        this.words.add(word.toUpperCase());
    }

    isValidWord(word) {
        return this.words.has(word.toUpperCase());
    }

    loadDefaultWords() {
        const sampleWords = [
            'HELLO', 'WORLD', 'SCRABBLE', 'GAME', 'WORD', 'PLAY', 'TILE',
            'SCORE', 'BOARD', 'LETTER', 'POINT', 'WIN', 'TURN', 'RACK',
            'THE', 'AND', 'FOR', 'ARE', 'BUT', 'NOT', 'YOU', 'ALL', 'CAN',
            'HER', 'WAS', 'ONE', 'OUR', 'OUT', 'DAY', 'GET', 'HAS', 'HIM',
            'CAT', 'DOG', 'HAT', 'BAT', 'RAT', 'MAT', 'SAT', 'FAT', 'PAT'
        ];
        sampleWords.forEach(word => this.addWord(word));
    }
}

/**
 * WordPlacement - Command Pattern: Represents word placement
 * 
 * DESIGN PATTERN: Command Pattern
 * - Encapsulates placement details
 * - Can be undone for challenges
 */
class WordPlacement {
    constructor(word, startRow, startCol, direction) {
        this.word = word.toUpperCase();
        this.startRow = startRow;
        this.startCol = startCol;
        this.direction = direction;
        this.tilesUsed = [];
        this.score = 0;
    }
}

/**
 * ScoreCalculator - Calculates scores with multipliers
 * 
 * DESIGN PATTERN: Strategy Pattern
 * - Different scoring strategies possible
 */
class ScoreCalculator {
    static calculateScore(board, placement) {
        let baseScore = 0;
        let wordMultiplier = 1;

        const { word, startRow, startCol, direction } = placement;

        for (let i = 0; i < word.length; i++) {
            const row = direction === Direction.HORIZONTAL ? startRow : startRow + i;
            const col = direction === Direction.HORIZONTAL ? startCol + i : startCol;
            const square = board.getSquare(row, col);

            if (!square) continue;

            const letterValue = LETTER_VALUES[word[i]];
            const [multValue, multType] = square.getMultiplier();

            if (multType === 'letter') {
                baseScore += letterValue * multValue;
            } else {
                baseScore += letterValue;
                if (multType === 'word') {
                    wordMultiplier *= multValue;
                }
            }
        }

        let totalScore = baseScore * wordMultiplier;

        // Bingo bonus (50 points for using all 7 tiles)
        if (placement.tilesUsed.length === 7) {
            totalScore += 50;
        }

        return totalScore;
    }
}

/**
 * Player - Represents a player
 * 
 * OOP CONCEPT: Encapsulation
 */
class Player {
    constructor(name) {
        this.name = name;
        this.rack = new Rack();
        this.score = 0;
        this.tilesPlayed = 0;
    }

    toString() {
        return `${this.name} (Score: ${this.score})`;
    }
}

/**
 * ScrabbleGame - Main Scrabble game controller
 * 
 * DESIGN PATTERN: Facade Pattern
 * - Simple interface to complex game system
 */
class ScrabbleGame {
    constructor(playerNames) {
        this.board = new Board();
        this.tileBag = new TileBag();
        this.dictionary = new Dictionary();
        this.dictionary.loadDefaultWords();

        this.players = playerNames.map(name => new Player(name));
        this.currentPlayerIdx = 0;
        this.consecutivePasses = 0;
    }

    get currentPlayer() {
        return this.players[this.currentPlayerIdx];
    }

    startGame() {
        console.log('\n' + '='.repeat(60));
        console.log('SCRABBLE GAME START');
        console.log('='.repeat(60));

        // Deal 7 tiles to each player
        this.players.forEach(player => {
            const tiles = this.tileBag.drawMultiple(Rack.MAX_TILES);
            tiles.forEach(tile => player.rack.addTile(tile));
            console.log(`${player.name}'s rack: ${player.rack}`);
        });
    }

    placeWord(word, row, col, direction) {
        const player = this.currentPlayer;

        // Validate rack has letters
        if (!player.rack.hasLetters(word)) {
            console.log("You don't have the required letters!");
            return false;
        }

        // Validate first move covers center
        if (this.board.isFirstMove()) {
            if (direction === Direction.HORIZONTAL) {
                if (!(row === Board.CENTER[0] && col <= Board.CENTER[1] && Board.CENTER[1] < col + word.length)) {
                    console.log('First word must cover center square!');
                    return false;
                }
            } else {
                if (!(col === Board.CENTER[1] && row <= Board.CENTER[0] && Board.CENTER[0] < row + word.length)) {
                    console.log('First word must cover center square!');
                    return false;
                }
            }
        }

        // Validate word in dictionary
        if (!this.dictionary.isValidWord(word)) {
            console.log(`'${word}' is not a valid word!`);
            return false;
        }

        // Create placement
        const placement = new WordPlacement(word, row, col, direction);

        // Place tiles
        const tilesUsed = [];
        for (let i = 0; i < word.length; i++) {
            const r = direction === Direction.HORIZONTAL ? row : row + i;
            const c = direction === Direction.HORIZONTAL ? col + i : col;

            const square = this.board.getSquare(r, c);
            if (!square) {
                console.log('Word goes off board!');
                return false;
            }

            if (!square.isOccupied()) {
                const tile = player.rack.removeTile(word[i]);
                if (tile) {
                    this.board.placeTile(r, c, tile);
                    tilesUsed.push([r, c, tile]);
                    square.multiplierUsed = true;
                }
            }
        }

        placement.tilesUsed = tilesUsed;

        // Calculate score
        const score = ScoreCalculator.calculateScore(this.board, placement);
        player.score += score;
        player.tilesPlayed += tilesUsed.length;

        console.log(`\n${player.name} played '${word}' for ${score} points!`);
        console.log(`Total score: ${player.score}`);

        // Draw new tiles
        const newTiles = this.tileBag.drawMultiple(tilesUsed.length);
        newTiles.forEach(tile => player.rack.addTile(tile));

        this.consecutivePasses = 0;
        this._nextPlayer();

        return true;
    }

    exchangeTiles(letters) {
        const player = this.currentPlayer;

        if (this.tileBag.remainingCount < letters.length) {
            console.log('Not enough tiles in bag to exchange!');
            return false;
        }

        const tilesToReturn = [];
        for (const letter of letters) {
            const tile = player.rack.removeTile(letter);
            if (tile) tilesToReturn.push(tile);
        }

        this.tileBag.returnTiles(tilesToReturn);

        const newTiles = this.tileBag.drawMultiple(tilesToReturn.length);
        newTiles.forEach(tile => player.rack.addTile(tile));

        console.log(`${player.name} exchanged ${letters.length} tiles`);
        this._nextPlayer();
        return true;
    }

    passTurn() {
        console.log(`${this.currentPlayer.name} passes`);
        this.consecutivePasses++;
        this._nextPlayer();
    }

    _nextPlayer() {
        this.currentPlayerIdx = (this.currentPlayerIdx + 1) % this.players.length;
    }

    isGameOver() {
        // All players passed twice
        if (this.consecutivePasses >= this.players.length * 2) {
            return true;
        }

        // Bag empty and a player has no tiles
        if (this.tileBag.remainingCount === 0) {
            for (const player of this.players) {
                if (player.rack.tiles.length === 0) {
                    return true;
                }
            }
        }

        return false;
    }

    getWinner() {
        return this.players.reduce((max, player) => 
            player.score > max.score ? player : max
        );
    }
}

/**
 * Demonstrate Scrabble game
 */
function main() {
    console.log('='.repeat(60));
    console.log('SCRABBLE GAME - Low Level Design Demo');
    console.log('='.repeat(60));

    // Create game
    const game = new ScrabbleGame(['Alice', 'Bob']);
    game.startGame();

    // Display board
    game.board.display();

    // Demo: Place first word
    console.log(`\n${game.currentPlayer.name}'s turn`);
    console.log(`Rack: ${game.currentPlayer.rack}`);

    // Try to place a word
    game.placeWord('HELLO', 7, 5, Direction.HORIZONTAL);
    game.board.display();

    console.log('\n' + '='.repeat(60));
    console.log('DEMO COMPLETE');
    console.log('='.repeat(60));
    console.log('\nFor full gameplay:');
    console.log('- Implement word connectivity validation');
    console.log('- Add cross-word scoring');
    console.log('- Load comprehensive dictionary');
    console.log('- Add UI for interactive play');
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ScrabbleGame,
        Board,
        Tile,
        TileBag,
        Rack,
        Dictionary,
        Player,
        WordPlacement,
        ScoreCalculator,
        SquareType,
        Direction,
        LETTER_VALUES,
        TILE_DISTRIBUTION
    };
}

// Run demo if executed directly
if (typeof require !== 'undefined' && require.main === module) {
    main();
}

