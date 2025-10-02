// Memory Card Game - JavaScript Implementation
// Pattern matching game with difficulty levels and scoring

const CardState = { FACE_DOWN: 'FACE_DOWN', FACE_UP: 'FACE_UP', MATCHED: 'MATCHED', DISABLED: 'DISABLED' };
const GameState = { SETUP: 'SETUP', PLAYING: 'PLAYING', PAUSED: 'PAUSED', FINISHED: 'FINISHED' };
const Difficulty = { EASY: 'EASY', MEDIUM: 'MEDIUM', HARD: 'HARD', EXPERT: 'EXPERT' };

class Card {
    constructor(cardId, symbol, value = null) {
        this.cardId = cardId;
        this.symbol = symbol;
        this.value = value || symbol;
        this.state = CardState.FACE_DOWN;
        this.isFlipped = false;
        this.matchTime = null;
        this.flipCount = 0;
    }
    
    flip() {
        if (this.state === CardState.MATCHED || this.state === CardState.DISABLED) {
            return false;
        }
        
        this.isFlipped = !this.isFlipped;
        this.state = this.isFlipped ? CardState.FACE_UP : CardState.FACE_DOWN;
        this.flipCount++;
        return true;
    }
    
    markAsMatched() {
        this.state = CardState.MATCHED;
        this.isFlipped = true;
        this.matchTime = new Date();
    }
    
    reset() {
        this.state = CardState.FACE_DOWN;
        this.isFlipped = false;
        this.matchTime = null;
        this.flipCount = 0;
    }
    
    matches(otherCard) {
        return this.value === otherCard.value && this.cardId !== otherCard.cardId;
    }
}

class GameBoard {
    constructor(rows, cols) {
        this.rows = rows;
        this.cols = cols;
        this.totalCards = rows * cols;
        this.cards = [];
        this.flippedCards = [];
        this.matchedPairs = 0;
        this.grid = Array(rows).fill().map(() => Array(cols).fill(null));
    }
    
    initializeCards(symbols) {
        this.cards = [];
        let cardId = 0;
        
        // Create pairs of cards
        for (let i = 0; i < this.totalCards / 2; i++) {
            const symbol = symbols[i % symbols.length];
            
            // Create two cards with the same symbol
            this.cards.push(new Card(cardId++, symbol));
            this.cards.push(new Card(cardId++, symbol));
        }
        
        this.shuffleCards();
        this.placeCardsOnGrid();
    }
    
    shuffleCards() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }
    
    placeCardsOnGrid() {
        let cardIndex = 0;
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                this.grid[row][col] = this.cards[cardIndex++];
            }
        }
    }
    
    getCard(row, col) {
        if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) {
            return null;
        }
        return this.grid[row][col];
    }
    
    flipCard(row, col) {
        const card = this.getCard(row, col);
        if (!card || !card.flip()) {
            return null;
        }
        
        if (card.isFlipped) {
            this.flippedCards.push({ card, row, col });
        } else {
            this.flippedCards = this.flippedCards.filter(fc => fc.card !== card);
        }
        
        return card;
    }
    
    getFlippedCards() {
        return this.flippedCards.filter(fc => fc.card.state === CardState.FACE_UP);
    }
    
    checkForMatches() {
        const flipped = this.getFlippedCards();
        if (flipped.length !== 2) return null;
        
        const [first, second] = flipped;
        
        if (first.card.matches(second.card)) {
            first.card.markAsMatched();
            second.card.markAsMatched();
            this.matchedPairs++;
            this.flippedCards = [];
            
            return {
                matched: true,
                cards: [first, second],
                symbol: first.card.symbol
            };
        } else {
            return {
                matched: false,
                cards: [first, second]
            };
        }
    }
    
    hideUnmatchedCards() {
        this.flippedCards.forEach(fc => {
            if (fc.card.state === CardState.FACE_UP) {
                fc.card.flip(); // Flip back to face down
            }
        });
        this.flippedCards = [];
    }
    
    isComplete() {
        return this.matchedPairs === this.totalCards / 2;
    }
    
    reset() {
        this.cards.forEach(card => card.reset());
        this.flippedCards = [];
        this.matchedPairs = 0;
        this.shuffleCards();
        this.placeCardsOnGrid();
    }
    
    revealAllCards(duration = 3000) {
        this.cards.forEach(card => {
            if (card.state === CardState.FACE_DOWN) {
                card.flip();
            }
        });
        
        setTimeout(() => {
            this.cards.forEach(card => {
                if (card.state === CardState.FACE_UP) {
                    card.flip();
                }
            });
        }, duration);
    }
}

class Player {
    constructor(playerId, name) {
        this.playerId = playerId;
        this.name = name;
        this.score = 0;
        this.matches = 0;
        this.attempts = 0;
        this.bestTime = null;
        this.gamesPlayed = 0;
        this.gamesWon = 0;
        this.totalTime = 0;
        this.averageTime = 0;
    }
    
    addMatch(points = 10) {
        this.matches++;
        this.score += points;
    }
    
    addAttempt() {
        this.attempts++;
    }
    
    getAccuracy() {
        return this.attempts > 0 ? (this.matches / this.attempts) * 100 : 0;
    }
    
    updateGameStats(gameTime, won) {
        this.gamesPlayed++;
        this.totalTime += gameTime;
        this.averageTime = this.totalTime / this.gamesPlayed;
        
        if (won) {
            this.gamesWon++;
            if (!this.bestTime || gameTime < this.bestTime) {
                this.bestTime = gameTime;
            }
        }
    }
    
    reset() {
        this.score = 0;
        this.matches = 0;
        this.attempts = 0;
    }
}

class MemoryCardGame {
    constructor(difficulty = Difficulty.MEDIUM, playerNames = ['Player']) {
        this.difficulty = difficulty;
        this.players = playerNames.map((name, index) => new Player(index, name));
        this.currentPlayerIndex = 0;
        this.board = null;
        this.gameState = GameState.SETUP;
        this.startTime = null;
        this.endTime = null;
        this.flipTimer = null;
        this.moveHistory = [];
        this.timeLimit = null;
        this.gameTimer = null;
        this.bonusMultiplier = 1;
        
        this.initializeGame();
    }
    
    initializeGame() {
        const config = this.getDifficultyConfig();
        this.board = new GameBoard(config.rows, config.cols);
        this.board.initializeCards(config.symbols);
        this.timeLimit = config.timeLimit;
        
        console.log(`Memory Card Game initialized - ${this.difficulty} difficulty`);
        console.log(`Board: ${config.rows}x${config.cols}, Time limit: ${this.timeLimit ? this.timeLimit + 's' : 'None'}`);
    }
    
    getDifficultyConfig() {
        const configs = {
            [Difficulty.EASY]: {
                rows: 2,
                cols: 4,
                symbols: ['🐶', '🐱', '🐼', '🦊'],
                timeLimit: null,
                flipDelay: 2000
            },
            [Difficulty.MEDIUM]: {
                rows: 4,
                cols: 4,
                symbols: ['🐶', '🐱', '🐼', '🦊', '🐸', '🐯', '🐨', '🐷'],
                timeLimit: 180,
                flipDelay: 1500
            },
            [Difficulty.HARD]: {
                rows: 4,
                cols: 6,
                symbols: ['🐶', '🐱', '🐼', '🦊', '🐸', '🐯', '🐨', '🐷', '🐵', '🦁', '🐺', '🐸'],
                timeLimit: 120,
                flipDelay: 1000
            },
            [Difficulty.EXPERT]: {
                rows: 6,
                cols: 6,
                symbols: ['🐶', '🐱', '🐼', '🦊', '🐸', '🐯', '🐨', '🐷', '🐵', '🦁', '🐺', '🐸', '🦄', '🐲', '🦋', '🐝', '🐢', '🦀'],
                timeLimit: 90,
                flipDelay: 800
            }
        };
        
        return configs[this.difficulty];
    }
    
    startGame() {
        this.gameState = GameState.PLAYING;
        this.startTime = new Date();
        
        // Show all cards briefly at start
        this.board.revealAllCards(2000);
        
        // Start game timer if there's a time limit
        if (this.timeLimit) {
            this.startGameTimer();
        }
        
        console.log(`Game started! ${this.getCurrentPlayer().name} goes first.`);
        return true;
    }
    
    startGameTimer() {
        this.gameTimer = setTimeout(() => {
            this.endGame(false);
        }, this.timeLimit * 1000);
    }
    
    getCurrentPlayer() {
        return this.players[this.currentPlayerIndex];
    }
    
    nextPlayer() {
        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
    }
    
    flipCard(row, col) {
        if (this.gameState !== GameState.PLAYING) {
            return { success: false, message: 'Game not in progress' };
        }
        
        const player = this.getCurrentPlayer();
        const flippedCards = this.board.getFlippedCards();
        
        // Don't allow more than 2 cards to be flipped
        if (flippedCards.length >= 2) {
            return { success: false, message: 'Two cards already flipped' };
        }
        
        const card = this.board.flipCard(row, col);
        if (!card) {
            return { success: false, message: 'Cannot flip this card' };
        }
        
        // Record the move
        this.moveHistory.push({
            player: player.name,
            position: { row, col },
            card: { symbol: card.symbol, id: card.cardId },
            timestamp: new Date()
        });
        
        console.log(`${player.name} flipped card at (${row}, ${col}): ${card.symbol}`);
        
        // Check if we now have 2 cards flipped
        const currentFlipped = this.board.getFlippedCards();
        if (currentFlipped.length === 2) {
            player.addAttempt();
            
            // Set timer to check for matches
            this.flipTimer = setTimeout(() => {
                this.processMatch();
            }, this.getDifficultyConfig().flipDelay);
        }
        
        return { success: true, card, flippedCount: currentFlipped.length };
    }
    
    processMatch() {
        const matchResult = this.board.checkForMatches();
        const player = this.getCurrentPlayer();
        
        if (matchResult.matched) {
            // Calculate score based on time and difficulty
            const timeBonus = this.calculateTimeBonus();
            const points = Math.floor(10 * this.bonusMultiplier * timeBonus);
            
            player.addMatch(points);
            console.log(`${player.name} found a match! +${points} points (${matchResult.symbol})`);
            
            // Check for game completion
            if (this.board.isComplete()) {
                this.endGame(true);
                return;
            }
            
            // Same player continues on match
        } else {
            console.log(`${player.name} - No match, cards will be hidden`);
            this.board.hideUnmatchedCards();
            
            // Switch to next player on miss (in multiplayer)
            if (this.players.length > 1) {
                this.nextPlayer();
                console.log(`${this.getCurrentPlayer().name}'s turn`);
            }
        }
        
        this.flipTimer = null;
    }
    
    calculateTimeBonus() {
        if (!this.startTime) return 1;
        
        const elapsed = (new Date() - this.startTime) / 1000;
        const maxTime = this.timeLimit || 300; // Default 5 minutes if no limit
        
        // Time bonus decreases as time passes
        return Math.max(0.5, 1 - (elapsed / maxTime) * 0.5);
    }
    
    endGame(completed) {
        this.gameState = GameState.FINISHED;
        this.endTime = new Date();
        
        if (this.gameTimer) {
            clearTimeout(this.gameTimer);
            this.gameTimer = null;
        }
        
        if (this.flipTimer) {
            clearTimeout(this.flipTimer);
            this.flipTimer = null;
        }
        
        const gameTime = this.getGameTime();
        const winner = this.getWinner();
        
        // Update player statistics
        this.players.forEach(player => {
            player.updateGameStats(gameTime, player === winner);
        });
        
        if (completed) {
            console.log(`🎉 Game completed in ${gameTime} seconds!`);
            if (winner) {
                console.log(`Winner: ${winner.name} with ${winner.score} points!`);
            }
        } else {
            console.log(`⏰ Time's up! Game ended.`);
        }
        
        this.displayFinalStats();
    }
    
    getWinner() {
        if (this.players.length === 1) {
            return this.players[0];
        }
        
        return this.players.reduce((best, player) => 
            player.score > best.score ? player : best
        );
    }
    
    pauseGame() {
        if (this.gameState === GameState.PLAYING) {
            this.gameState = GameState.PAUSED;
            
            if (this.gameTimer) {
                clearTimeout(this.gameTimer);
                this.gameTimer = null;
            }
            
            if (this.flipTimer) {
                clearTimeout(this.flipTimer);
                this.flipTimer = null;
            }
            
            console.log("Game paused");
        }
    }
    
    resumeGame() {
        if (this.gameState === GameState.PAUSED) {
            this.gameState = GameState.PLAYING;
            
            // Restart timers if needed
            if (this.timeLimit) {
                const elapsed = (new Date() - this.startTime) / 1000;
                const remaining = this.timeLimit - elapsed;
                
                if (remaining > 0) {
                    this.gameTimer = setTimeout(() => {
                        this.endGame(false);
                    }, remaining * 1000);
                } else {
                    this.endGame(false);
                    return;
                }
            }
            
            console.log("Game resumed");
        }
    }
    
    getHint() {
        const faceDownCards = this.board.cards.filter(card => 
            card.state === CardState.FACE_DOWN
        );
        
        if (faceDownCards.length < 2) return null;
        
        // Find a matching pair
        for (let i = 0; i < faceDownCards.length; i++) {
            for (let j = i + 1; j < faceDownCards.length; j++) {
                if (faceDownCards[i].matches(faceDownCards[j])) {
                    // Find positions of these cards
                    const positions = [];
                    
                    for (let row = 0; row < this.board.rows; row++) {
                        for (let col = 0; col < this.board.cols; col++) {
                            const card = this.board.getCard(row, col);
                            if (card === faceDownCards[i] || card === faceDownCards[j]) {
                                positions.push({ row, col });
                            }
                        }
                    }
                    
                    console.log(`💡 Hint: Look for ${faceDownCards[i].symbol} at positions (${positions[0].row}, ${positions[0].col}) and (${positions[1].row}, ${positions[1].col})`);
                    return {
                        symbol: faceDownCards[i].symbol,
                        positions
                    };
                }
            }
        }
        
        return null;
    }
    
    resetGame() {
        this.gameState = GameState.SETUP;
        this.startTime = null;
        this.endTime = null;
        this.currentPlayerIndex = 0;
        this.moveHistory = [];
        this.bonusMultiplier = 1;
        
        if (this.gameTimer) {
            clearTimeout(this.gameTimer);
            this.gameTimer = null;
        }
        
        if (this.flipTimer) {
            clearTimeout(this.flipTimer);
            this.flipTimer = null;
        }
        
        this.players.forEach(player => player.reset());
        this.board.reset();
        
        console.log("Game reset - ready to start new game");
    }
    
    getGameTime() {
        if (!this.startTime) return 0;
        const endTime = this.endTime || new Date();
        return Math.floor((endTime - this.startTime) / 1000);
    }
    
    getGameStats() {
        return {
            difficulty: this.difficulty,
            gameState: this.gameState,
            currentPlayer: this.getCurrentPlayer()?.name,
            gameTime: this.getGameTime(),
            timeLimit: this.timeLimit,
            boardSize: `${this.board.rows}x${this.board.cols}`,
            totalPairs: this.board.totalCards / 2,
            matchedPairs: this.board.matchedPairs,
            progress: (this.board.matchedPairs / (this.board.totalCards / 2)) * 100,
            moveCount: this.moveHistory.length,
            players: this.players.map(player => ({
                name: player.name,
                score: player.score,
                matches: player.matches,
                attempts: player.attempts,
                accuracy: player.getAccuracy()
            }))
        };
    }
    
    displayBoard() {
        console.log(`\nMemory Card Game Board (${this.difficulty}):`);
        console.log(`Time: ${this.getGameTime()}s${this.timeLimit ? ' / ' + this.timeLimit + 's' : ''}`);
        console.log(`Matches: ${this.board.matchedPairs} / ${this.board.totalCards / 2}`);
        
        // Display column headers
        let header = "   ";
        for (let col = 0; col < this.board.cols; col++) {
            header += String.fromCharCode(65 + col) + "  ";
        }
        console.log(header);
        
        // Display rows
        for (let row = 0; row < this.board.rows; row++) {
            let line = (row + 1).toString().padStart(2) + " ";
            
            for (let col = 0; col < this.board.cols; col++) {
                const card = this.board.getCard(row, col);
                
                if (card.state === CardState.MATCHED) {
                    line += card.symbol + " ";
                } else if (card.state === CardState.FACE_UP) {
                    line += card.symbol + " ";
                } else {
                    line += "? ";
                }
            }
            
            console.log(line);
        }
        
        console.log(`\nCurrent player: ${this.getCurrentPlayer()?.name}`);
    }
    
    displayFinalStats() {
        console.log("\n=== Final Game Statistics ===");
        
        this.players.forEach(player => {
            console.log(`\n${player.name}:`);
            console.log(`  Score: ${player.score}`);
            console.log(`  Matches: ${player.matches}`);
            console.log(`  Attempts: ${player.attempts}`);
            console.log(`  Accuracy: ${player.getAccuracy().toFixed(1)}%`);
            console.log(`  Games won: ${player.gamesWon}/${player.gamesPlayed}`);
            if (player.bestTime) {
                console.log(`  Best time: ${player.bestTime}s`);
            }
            console.log(`  Average time: ${player.averageTime.toFixed(1)}s`);
        });
        
        console.log(`\nGame completed: ${this.board.isComplete()}`);
        console.log(`Total moves: ${this.moveHistory.length}`);
        console.log(`Game duration: ${this.getGameTime()}s`);
    }
}

function runDemo() {
    console.log("=== Memory Card Game Demo ===\n");
    
    // Create game with medium difficulty
    const game = new MemoryCardGame(Difficulty.MEDIUM, ['Alice']);
    
    console.log("1. Starting new game...");
    game.startGame();
    game.displayBoard();
    
    // Simulate some moves
    console.log("\n2. Making some moves...");
    const moves = [
        [0, 0], [0, 1], // First attempt
        [1, 0], [1, 1], // Second attempt  
        [0, 2], [2, 0], // Third attempt
        [0, 3], [2, 1]  // Fourth attempt
    ];
    
    let moveIndex = 0;
    const makeMove = () => {
        if (moveIndex < moves.length && game.gameState === GameState.PLAYING) {
            const [row, col] = moves[moveIndex];
            const result = game.flipCard(row, col);
            
            if (result.success) {
                moveIndex++;
                game.displayBoard();
                
                // Continue after processing match
                setTimeout(makeMove, 2000);
            } else {
                console.log(`Move failed: ${result.message}`);
                setTimeout(makeMove, 500);
            }
        } else if (game.gameState === GameState.PLAYING) {
            // Game still going, show final state
            console.log("\n3. Demo moves completed");
            game.displayBoard();
            
            // Get a hint
            console.log("\n4. Getting a hint...");
            const hint = game.getHint();
            if (hint) {
                console.log(`Hint provided for ${hint.symbol}`);
            }
            
            // Show game statistics
            console.log("\n5. Current Game Statistics:");
            const stats = game.getGameStats();
            console.log(`Progress: ${stats.progress.toFixed(1)}%`);
            console.log(`Moves made: ${stats.moveCount}`);
            console.log(`Game time: ${stats.gameTime}s`);
            
            stats.players.forEach(player => {
                console.log(`${player.name}: ${player.score} points, ${player.accuracy.toFixed(1)}% accuracy`);
            });
            
            // Pause and resume demo
            console.log("\n6. Pausing game...");
            game.pauseGame();
            
            setTimeout(() => {
                console.log("Resuming game...");
                game.resumeGame();
                
                setTimeout(() => {
                    console.log("\n7. Ending demo...");
                    game.endGame(false);
                }, 2000);
            }, 2000);
        }
    };
    
    // Start making moves after initial reveal
    setTimeout(makeMove, 3000);
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MemoryCardGame, GameBoard, Card, Player };
}

if (typeof require !== 'undefined' && require.main === module) {
    runDemo();
}