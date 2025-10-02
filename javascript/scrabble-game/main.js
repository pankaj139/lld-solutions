// Scrabble Game - JavaScript Implementation
// Word formation game with scoring and board management

const TileType = { NORMAL: 'NORMAL', BLANK: 'BLANK' };
const SquareType = { NORMAL: 'NORMAL', DOUBLE_LETTER: 'DL', TRIPLE_LETTER: 'TL', DOUBLE_WORD: 'DW', TRIPLE_WORD: 'TW', CENTER: 'CENTER' };
const Direction = { HORIZONTAL: 'HORIZONTAL', VERTICAL: 'VERTICAL' };

class Tile {
    constructor(letter, value, isBlank = false) {
        this.letter = letter;
        this.value = value;
        this.isBlank = isBlank;
        this.selectedLetter = isBlank ? null : letter;
    }
    
    setBlankLetter(letter) {
        if (this.isBlank) this.selectedLetter = letter.toUpperCase();
    }
}

class Square {
    constructor(type = SquareType.NORMAL) {
        this.type = type;
        this.tile = null;
        this.isOccupied = false;
        this.multiplier = this.getMultiplier();
    }
    
    getMultiplier() {
        switch (this.type) {
            case SquareType.DOUBLE_LETTER: return { type: 'letter', value: 2 };
            case SquareType.TRIPLE_LETTER: return { type: 'letter', value: 3 };
            case SquareType.DOUBLE_WORD: return { type: 'word', value: 2 };
            case SquareType.TRIPLE_WORD: return { type: 'word', value: 3 };
            case SquareType.CENTER: return { type: 'word', value: 2 };
            default: return { type: 'none', value: 1 };
        }
    }
    
    placeTile(tile) {
        if (!this.isOccupied) {
            this.tile = tile;
            this.isOccupied = true;
            return true;
        }
        return false;
    }
    
    removeTile() {
        const tile = this.tile;
        this.tile = null;
        this.isOccupied = false;
        return tile;
    }
}

class ScrabbleBoard {
    constructor() {
        this.size = 15;
        this.board = this.initializeBoard();
        this.center = { row: 7, col: 7 };
    }
    
    initializeBoard() {
        const board = Array(this.size).fill().map(() => 
            Array(this.size).fill().map(() => new Square())
        );
        
        // Set premium squares
        const premiumSquares = {
            [SquareType.TRIPLE_WORD]: [[0,0], [0,7], [0,14], [7,0], [7,14], [14,0], [14,7], [14,14]],
            [SquareType.DOUBLE_WORD]: [[1,1], [2,2], [3,3], [4,4], [1,13], [2,12], [3,11], [4,10], 
                                      [13,1], [12,2], [11,3], [10,4], [13,13], [12,12], [11,11], [10,10]],
            [SquareType.TRIPLE_LETTER]: [[1,5], [1,9], [5,1], [5,5], [5,9], [5,13], [9,1], [9,5], 
                                        [9,9], [9,13], [13,5], [13,9]],
            [SquareType.DOUBLE_LETTER]: [[0,3], [0,11], [2,6], [2,8], [3,0], [3,7], [3,14], [6,2], 
                                        [6,6], [6,8], [6,12], [7,3], [7,11], [8,2], [8,6], [8,8], 
                                        [8,12], [11,0], [11,7], [11,14], [12,6], [12,8], [14,3], [14,11]]
        };
        
        Object.entries(premiumSquares).forEach(([type, positions]) => {
            positions.forEach(([row, col]) => {
                board[row][col] = new Square(type);
            });
        });
        
        // Center square
        board[7][7] = new Square(SquareType.CENTER);
        
        return board;
    }
    
    getSquare(row, col) {
        if (row < 0 || row >= this.size || col < 0 || col >= this.size) return null;
        return this.board[row][col];
    }
    
    placeTile(row, col, tile) {
        const square = this.getSquare(row, col);
        return square ? square.placeTile(tile) : false;
    }
    
    removeTile(row, col) {
        const square = this.getSquare(row, col);
        return square ? square.removeTile() : null;
    }
    
    isValidPlacement(words) {
        // Check if first move uses center
        if (this.isEmpty() && !this.usesCenterSquare(words[0])) return false;
        
        // Check if all words are connected to existing tiles (if not first move)
        if (!this.isEmpty() && !this.isConnectedToBoard(words)) return false;
        
        // Check if all placements are in straight lines
        for (const word of words) {
            if (!this.isValidLine(word.placements)) return false;
        }
        
        return true;
    }
    
    isEmpty() {
        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                if (this.board[row][col].isOccupied) return false;
            }
        }
        return true;
    }
    
    usesCenterSquare(word) {
        return word.placements.some(p => p.row === 7 && p.col === 7);
    }
    
    isConnectedToBoard(words) {
        const newPlacements = words.flatMap(w => w.placements);
        
        for (const placement of newPlacements) {
            const { row, col } = placement;
            
            // Check adjacent squares for existing tiles
            const adjacent = [[-1,0], [1,0], [0,-1], [0,1]];
            for (const [dr, dc] of adjacent) {
                const newRow = row + dr;
                const newCol = col + dc;
                const square = this.getSquare(newRow, newCol);
                
                if (square && square.isOccupied) {
                    // Check if this existing tile is not part of new placements
                    const isNewPlacement = newPlacements.some(p => p.row === newRow && p.col === newCol);
                    if (!isNewPlacement) return true;
                }
            }
        }
        
        return false;
    }
    
    isValidLine(placements) {
        if (placements.length <= 1) return true;
        
        const rows = placements.map(p => p.row);
        const cols = placements.map(p => p.col);
        
        const sameRow = rows.every(r => r === rows[0]);
        const sameCol = cols.every(c => c === cols[0]);
        
        return sameRow || sameCol;
    }
    
    findWordsFormed(placements) {
        const words = [];
        const visited = new Set();
        
        for (const placement of placements) {
            const { row, col } = placement;
            const key = `${row},${col}`;
            
            if (!visited.has(key)) {
                // Check horizontal word
                const horizontalWord = this.getWordAt(row, col, Direction.HORIZONTAL);
                if (horizontalWord.length > 1) {
                    words.push(horizontalWord);
                    horizontalWord.positions.forEach(pos => visited.add(`${pos.row},${pos.col}`));
                }
                
                // Check vertical word
                const verticalWord = this.getWordAt(row, col, Direction.VERTICAL);
                if (verticalWord.length > 1) {
                    words.push(verticalWord);
                    verticalWord.positions.forEach(pos => visited.add(`${pos.row},${pos.col}`));
                }
            }
        }
        
        return words;
    }
    
    getWordAt(row, col, direction) {
        const dr = direction === Direction.VERTICAL ? 1 : 0;
        const dc = direction === Direction.HORIZONTAL ? 1 : 0;
        
        // Find start of word
        let startRow = row, startCol = col;
        while (true) {
            const prevRow = startRow - dr;
            const prevCol = startCol - dc;
            const square = this.getSquare(prevRow, prevCol);
            
            if (!square || !square.isOccupied) break;
            startRow = prevRow;
            startCol = prevCol;
        }
        
        // Build word from start
        const letters = [];
        const positions = [];
        let currentRow = startRow, currentCol = startCol;
        
        while (true) {
            const square = this.getSquare(currentRow, currentCol);
            if (!square || !square.isOccupied) break;
            
            letters.push(square.tile.selectedLetter || square.tile.letter);
            positions.push({ row: currentRow, col: currentCol });
            
            currentRow += dr;
            currentCol += dc;
        }
        
        return {
            word: letters.join(''),
            positions,
            length: letters.length,
            direction
        };
    }
}

class TileBag {
    constructor() {
        this.tiles = this.initializeTiles();
        this.shuffle();
    }
    
    initializeTiles() {
        const distribution = {
            'A': {count: 9, value: 1}, 'B': {count: 2, value: 3}, 'C': {count: 2, value: 3},
            'D': {count: 4, value: 2}, 'E': {count: 12, value: 1}, 'F': {count: 2, value: 4},
            'G': {count: 3, value: 2}, 'H': {count: 2, value: 4}, 'I': {count: 9, value: 1},
            'J': {count: 1, value: 8}, 'K': {count: 1, value: 5}, 'L': {count: 4, value: 1},
            'M': {count: 2, value: 3}, 'N': {count: 6, value: 1}, 'O': {count: 8, value: 1},
            'P': {count: 2, value: 3}, 'Q': {count: 1, value: 10}, 'R': {count: 6, value: 1},
            'S': {count: 4, value: 1}, 'T': {count: 6, value: 1}, 'U': {count: 4, value: 1},
            'V': {count: 2, value: 4}, 'W': {count: 2, value: 4}, 'X': {count: 1, value: 8},
            'Y': {count: 2, value: 4}, 'Z': {count: 1, value: 10}, ' ': {count: 2, value: 0}
        };
        
        const tiles = [];
        Object.entries(distribution).forEach(([letter, info]) => {
            for (let i = 0; i < info.count; i++) {
                tiles.push(new Tile(letter, info.value, letter === ' '));
            }
        });
        
        return tiles;
    }
    
    shuffle() {
        for (let i = this.tiles.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.tiles[i], this.tiles[j]] = [this.tiles[j], this.tiles[i]];
        }
    }
    
    drawTiles(count) {
        const drawn = [];
        for (let i = 0; i < count && this.tiles.length > 0; i++) {
            drawn.push(this.tiles.pop());
        }
        return drawn;
    }
    
    returnTiles(tiles) {
        this.tiles.push(...tiles);
        this.shuffle();
    }
    
    remainingCount() { return this.tiles.length; }
    isEmpty() { return this.tiles.length === 0; }
}

class Player {
    constructor(playerId, name) {
        this.playerId = playerId;
        this.name = name;
        this.rack = [];
        this.score = 0;
        this.wordsPlayed = [];
    }
    
    addTiles(tiles) {
        this.rack.push(...tiles);
        this.rack.sort((a, b) => a.letter.localeCompare(b.letter));
    }
    
    removeTiles(tiles) {
        tiles.forEach(tile => {
            const index = this.rack.findIndex(t => t === tile);
            if (index > -1) this.rack.splice(index, 1);
        });
    }
    
    addScore(points) { this.score += points; }
    
    hasLetter(letter) {
        return this.rack.some(tile => 
            tile.letter === letter || (tile.isBlank && !tile.selectedLetter)
        );
    }
    
    getRackLetters() {
        return this.rack.map(tile => tile.isBlank ? '_' : tile.letter).join(' ');
    }
}

class Dictionary {
    constructor() {
        // Simple word list for demo - in real implementation, load from file
        this.words = new Set([
            'HELLO', 'WORLD', 'SCRABBLE', 'GAME', 'WORD', 'LETTER', 'TILE', 'BOARD',
            'PLAY', 'SCORE', 'POINT', 'RACK', 'DRAW', 'PLACE', 'VALID', 'CHECK',
            'CAT', 'DOG', 'HOUSE', 'TREE', 'BOOK', 'TABLE', 'CHAIR', 'LIGHT',
            'WATER', 'FIRE', 'EARTH', 'WIND', 'SUN', 'MOON', 'STAR', 'SKY'
        ]);
    }
    
    isValidWord(word) {
        return this.words.has(word.toUpperCase());
    }
    
    addWord(word) {
        this.words.add(word.toUpperCase());
    }
}

class ScrabbleGame {
    constructor(playerNames) {
        this.board = new ScrabbleBoard();
        this.tileBag = new TileBag();
        this.dictionary = new Dictionary();
        this.players = playerNames.map((name, index) => new Player(index, name));
        this.currentPlayerIndex = 0;
        this.gameStarted = false;
        this.gameEnded = false;
        this.moveHistory = [];
        
        this.dealInitialTiles();
    }
    
    dealInitialTiles() {
        this.players.forEach(player => {
            const tiles = this.tileBag.drawTiles(7);
            player.addTiles(tiles);
        });
    }
    
    getCurrentPlayer() {
        return this.players[this.currentPlayerIndex];
    }
    
    startGame() {
        this.gameStarted = true;
        console.log(`Scrabble game started with ${this.players.length} players!`);
        console.log(`${this.getCurrentPlayer().name}'s turn`);
    }
    
    playWord(word, startRow, startCol, direction, tileSelections = []) {
        if (!this.gameStarted || this.gameEnded) return false;
        
        const player = this.getCurrentPlayer();
        const placements = this.calculatePlacements(word, startRow, startCol, direction);
        
        // Validate player has required tiles
        if (!this.hasRequiredTiles(player, word, placements, tileSelections)) {
            console.log("Player doesn't have required tiles");
            return false;
        }
        
        // Temporarily place tiles to check validity
        const placedTiles = this.temporarilyPlaceTiles(placements, player, tileSelections);
        
        // Find all words formed
        const wordsFormed = this.board.findWordsFormed(placements);
        
        // Validate all words
        const allWordsValid = wordsFormed.every(w => this.dictionary.isValidWord(w.word));
        if (!allWordsValid) {
            this.removePlacedTiles(placements);
            console.log("Invalid word(s) formed");
            return false;
        }
        
        // Validate board placement rules
        if (!this.board.isValidPlacement(wordsFormed)) {
            this.removePlacedTiles(placements);
            console.log("Invalid board placement");
            return false;
        }
        
        // Calculate score
        const score = this.calculateScore(wordsFormed, placements);
        player.addScore(score);
        player.wordsPlayed.push(...wordsFormed.map(w => w.word));
        
        // Remove used tiles from player's rack
        player.removeTiles(placedTiles);
        
        // Draw new tiles
        const newTiles = this.tileBag.drawTiles(Math.min(7 - player.rack.length, this.tileBag.remainingCount()));
        player.addTiles(newTiles);
        
        // Record move
        this.moveHistory.push({
            player: player.name,
            words: wordsFormed.map(w => w.word),
            score,
            timestamp: new Date()
        });
        
        console.log(`${player.name} played: ${wordsFormed.map(w => w.word).join(', ')} for ${score} points`);
        
        // Check for game end
        if (player.rack.length === 0 || this.tileBag.isEmpty()) {
            this.endGame();
            return true;
        }
        
        // Next player's turn
        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
        console.log(`${this.getCurrentPlayer().name}'s turn`);
        
        return true;
    }
    
    calculatePlacements(word, startRow, startCol, direction) {
        const placements = [];
        const dr = direction === Direction.VERTICAL ? 1 : 0;
        const dc = direction === Direction.HORIZONTAL ? 1 : 0;
        
        for (let i = 0; i < word.length; i++) {
            const row = startRow + (i * dr);
            const col = startCol + (i * dc);
            const square = this.board.getSquare(row, col);
            
            // Only place new tiles on empty squares
            if (square && !square.isOccupied) {
                placements.push({
                    row,
                    col,
                    letter: word[i],
                    isNew: true
                });
            }
        }
        
        return placements;
    }
    
    hasRequiredTiles(player, word, placements, tileSelections) {
        const requiredLetters = placements.map(p => p.letter);
        const availableTiles = [...player.rack];
        
        for (const letter of requiredLetters) {
            const tileIndex = availableTiles.findIndex(tile => 
                tile.letter === letter || (tile.isBlank && !tile.selectedLetter)
            );
            
            if (tileIndex === -1) return false;
            
            // If using a blank tile, set its letter
            if (availableTiles[tileIndex].isBlank) {
                availableTiles[tileIndex].setBlankLetter(letter);
            }
            
            availableTiles.splice(tileIndex, 1);
        }
        
        return true;
    }
    
    temporarilyPlaceTiles(placements, player, tileSelections) {
        const placedTiles = [];
        
        placements.forEach((placement, index) => {
            const letter = placement.letter;
            const tileIndex = player.rack.findIndex(tile => 
                tile.letter === letter || (tile.isBlank && !tile.selectedLetter)
            );
            
            if (tileIndex > -1) {
                const tile = player.rack[tileIndex];
                if (tile.isBlank) tile.setBlankLetter(letter);
                
                this.board.placeTile(placement.row, placement.col, tile);
                placedTiles.push(tile);
            }
        });
        
        return placedTiles;
    }
    
    removePlacedTiles(placements) {
        placements.forEach(placement => {
            this.board.removeTile(placement.row, placement.col);
        });
    }
    
    calculateScore(wordsFormed, newPlacements) {
        let totalScore = 0;
        
        wordsFormed.forEach(wordInfo => {
            let wordScore = 0;
            let wordMultiplier = 1;
            
            wordInfo.positions.forEach(pos => {
                const square = this.board.getSquare(pos.row, pos.col);
                const tile = square.tile;
                let letterScore = tile.value;
                
                // Apply letter multipliers only for new tiles
                const isNewTile = newPlacements.some(p => p.row === pos.row && p.col === pos.col);
                if (isNewTile && square.multiplier.type === 'letter') {
                    letterScore *= square.multiplier.value;
                }
                
                wordScore += letterScore;
                
                // Apply word multipliers only for new tiles
                if (isNewTile && square.multiplier.type === 'word') {
                    wordMultiplier *= square.multiplier.value;
                }
            });
            
            wordScore *= wordMultiplier;
            totalScore += wordScore;
        });
        
        // Bonus for using all 7 tiles (Bingo)
        if (newPlacements.length === 7) {
            totalScore += 50;
            console.log("BINGO! +50 bonus points");
        }
        
        return totalScore;
    }
    
    pass() {
        console.log(`${this.getCurrentPlayer().name} passes`);
        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
        console.log(`${this.getCurrentPlayer().name}'s turn`);
    }
    
    exchangeTiles(tileIndices) {
        const player = this.getCurrentPlayer();
        const tilesToExchange = tileIndices.map(i => player.rack[i]).filter(Boolean);
        
        if (tilesToExchange.length === 0) return false;
        
        // Return tiles to bag
        player.removeTiles(tilesToExchange);
        this.tileBag.returnTiles(tilesToExchange);
        
        // Draw new tiles
        const newTiles = this.tileBag.drawTiles(tilesToExchange.length);
        player.addTiles(newTiles);
        
        console.log(`${player.name} exchanged ${tilesToExchange.length} tiles`);
        
        // Next player's turn
        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
        return true;
    }
    
    endGame() {
        this.gameEnded = true;
        
        // Subtract remaining tile values from players' scores
        this.players.forEach(player => {
            const penalty = player.rack.reduce((sum, tile) => sum + tile.value, 0);
            player.addScore(-penalty);
        });
        
        // Find winner
        const winner = this.players.reduce((best, player) => 
            player.score > best.score ? player : best
        );
        
        console.log("\n=== Game Over ===");
        console.log("Final Scores:");
        this.players.forEach(player => {
            console.log(`${player.name}: ${player.score} points`);
        });
        console.log(`Winner: ${winner.name}!`);
    }
    
    getGameState() {
        return {
            currentPlayer: this.getCurrentPlayer().name,
            scores: this.players.map(p => ({ name: p.name, score: p.score })),
            tilesRemaining: this.tileBag.remainingCount(),
            gameStarted: this.gameStarted,
            gameEnded: this.gameEnded,
            moveCount: this.moveHistory.length
        };
    }
    
    displayBoard() {
        console.log("\nScrabble Board:");
        console.log("   " + Array.from({length: 15}, (_, i) => String.fromCharCode(65 + i)).join(" "));
        
        for (let row = 0; row < 15; row++) {
            let line = (row + 1).toString().padStart(2) + " ";
            
            for (let col = 0; col < 15; col++) {
                const square = this.board.getSquare(row, col);
                if (square.isOccupied) {
                    line += square.tile.selectedLetter || square.tile.letter;
                } else {
                    switch (square.type) {
                        case SquareType.TRIPLE_WORD: line += "★"; break;
                        case SquareType.DOUBLE_WORD: line += "♦"; break;
                        case SquareType.TRIPLE_LETTER: line += "▲"; break;
                        case SquareType.DOUBLE_LETTER: line += "•"; break;
                        case SquareType.CENTER: line += "✚"; break;
                        default: line += "."; break;
                    }
                }
                line += " ";
            }
            
            console.log(line);
        }
        
        console.log("\nLegend: ★=3W ♦=2W ▲=3L •=2L ✚=Center");
    }
    
    displayPlayerInfo() {
        const player = this.getCurrentPlayer();
        console.log(`\n${player.name}'s turn (Score: ${player.score})`);
        console.log(`Rack: ${player.getRackLetters()}`);
        console.log(`Tiles remaining: ${this.tileBag.remainingCount()}`);
    }
}

function runDemo() {
    console.log("=== Scrabble Game Demo ===\n");
    
    const game = new ScrabbleGame(["Alice", "Bob"]);
    game.startGame();
    
    // Display initial state
    game.displayBoard();
    game.displayPlayerInfo();
    
    // Make some moves
    console.log("\n1. Alice plays 'HELLO' horizontally from center...");
    if (game.playWord("HELLO", 7, 7, Direction.HORIZONTAL)) {
        game.displayBoard();
    }
    
    console.log("\n2. Bob plays 'WORLD' vertically...");
    if (game.playWord("WORLD", 6, 11, Direction.VERTICAL)) {
        game.displayBoard();
    }
    
    // Show game state
    console.log("\n3. Current Game State:");
    const state = game.getGameState();
    console.log(`Current Player: ${state.currentPlayer}`);
    console.log("Scores:");
    state.scores.forEach(score => {
        console.log(`  ${score.name}: ${score.score} points`);
    });
    console.log(`Tiles Remaining: ${state.tilesRemaining}`);
    console.log(`Moves Played: ${state.moveCount}`);
    
    // Show move history
    console.log("\n4. Move History:");
    game.moveHistory.forEach((move, index) => {
        console.log(`${index + 1}. ${move.player}: ${move.words.join(', ')} (${move.score} points)`);
    });
    
    // Demonstrate other actions
    console.log("\n5. Alice passes this turn...");
    game.pass();
    
    console.log("\n6. Bob exchanges 2 tiles...");
    game.exchangeTiles([0, 1]);
    
    game.displayPlayerInfo();
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ScrabbleGame, ScrabbleBoard, Player, Tile };
}

if (typeof require !== 'undefined' && require.main === module) {
    runDemo();
}