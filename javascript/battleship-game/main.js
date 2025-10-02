// Battleship Game - JavaScript Implementation
// Naval strategy game with intelligent AI targeting

const ShipType = { CARRIER: 'CARRIER', BATTLESHIP: 'BATTLESHIP', CRUISER: 'CRUISER', SUBMARINE: 'SUBMARINE', DESTROYER: 'DESTROYER' };
const CellState = { EMPTY: 'EMPTY', SHIP: 'SHIP', HIT: 'HIT', MISS: 'MISS', SUNK: 'SUNK' };
const GameState = { SETUP: 'SETUP', PLAYING: 'PLAYING', FINISHED: 'FINISHED' };
const Orientation = { HORIZONTAL: 'HORIZONTAL', VERTICAL: 'VERTICAL' };

class Ship {
    constructor(type, size) {
        this.type = type;
        this.size = size;
        this.positions = [];
        this.hits = new Set();
        this.isSunk = false;
        this.orientation = null;
    }
    
    setPositions(positions, orientation) {
        this.positions = positions;
        this.orientation = orientation;
    }
    
    hit(row, col) {
        const positionKey = `${row},${col}`;
        if (this.positions.some(pos => `${pos.row},${pos.col}` === positionKey)) {
            this.hits.add(positionKey);
            this.checkIfSunk();
            return true;
        }
        return false;
    }
    
    checkIfSunk() {
        this.isSunk = this.hits.size === this.size;
    }
    
    occupiesPosition(row, col) {
        return this.positions.some(pos => pos.row === row && pos.col === col);
    }
}

class GameBoard {
    constructor(size = 10) {
        this.size = size;
        this.grid = Array(size).fill().map(() => Array(size).fill(CellState.EMPTY));
        this.ships = [];
        this.shots = new Set();
        this.hits = new Set();
        this.misses = new Set();
    }
    
    addShip(ship, startRow, startCol, orientation) {
        const positions = this.calculateShipPositions(ship.size, startRow, startCol, orientation);
        
        if (!this.isValidPlacement(positions)) {
            return false;
        }
        
        ship.setPositions(positions, orientation);
        this.ships.push(ship);
        
        // Mark ship positions on grid
        positions.forEach(pos => {
            this.grid[pos.row][pos.col] = CellState.SHIP;
        });
        
        return true;
    }
    
    calculateShipPositions(size, startRow, startCol, orientation) {
        const positions = [];
        
        for (let i = 0; i < size; i++) {
            const row = orientation === Orientation.VERTICAL ? startRow + i : startRow;
            const col = orientation === Orientation.HORIZONTAL ? startCol + i : startCol;
            positions.push({ row, col });
        }
        
        return positions;
    }
    
    isValidPlacement(positions) {
        for (const pos of positions) {
            // Check boundaries
            if (pos.row < 0 || pos.row >= this.size || pos.col < 0 || pos.col >= this.size) {
                return false;
            }
            
            // Check if position is already occupied
            if (this.grid[pos.row][pos.col] !== CellState.EMPTY) {
                return false;
            }
            
            // Check adjacent cells for other ships (ships can't touch)
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    const newRow = pos.row + dr;
                    const newCol = pos.col + dc;
                    
                    if (newRow >= 0 && newRow < this.size && newCol >= 0 && newCol < this.size) {
                        if (this.grid[newRow][newCol] === CellState.SHIP) {
                            return false;
                        }
                    }
                }
            }
        }
        
        return true;
    }
    
    receiveAttack(row, col) {
        if (row < 0 || row >= this.size || col < 0 || col >= this.size) {
            return { result: 'invalid', message: 'Out of bounds' };
        }
        
        const shotKey = `${row},${col}`;
        if (this.shots.has(shotKey)) {
            return { result: 'invalid', message: 'Already shot here' };
        }
        
        this.shots.add(shotKey);
        
        // Check if any ship is hit
        let hitShip = null;
        for (const ship of this.ships) {
            if (ship.hit(row, col)) {
                hitShip = ship;
                break;
            }
        }
        
        if (hitShip) {
            this.grid[row][col] = hitShip.isSunk ? CellState.SUNK : CellState.HIT;
            this.hits.add(shotKey);
            
            if (hitShip.isSunk) {
                // Mark all ship positions as sunk
                hitShip.positions.forEach(pos => {
                    this.grid[pos.row][pos.col] = CellState.SUNK;
                });
                
                return {
                    result: 'sunk',
                    ship: hitShip,
                    position: { row, col },
                    message: `${hitShip.type} sunk!`
                };
            } else {
                return {
                    result: 'hit',
                    ship: hitShip,
                    position: { row, col },
                    message: 'Hit!'
                };
            }
        } else {
            this.grid[row][col] = CellState.MISS;
            this.misses.add(shotKey);
            
            return {
                result: 'miss',
                position: { row, col },
                message: 'Miss!'
            };
        }
    }
    
    allShipsSunk() {
        return this.ships.every(ship => ship.isSunk);
    }
    
    getShipsRemaining() {
        return this.ships.filter(ship => !ship.isSunk);
    }
    
    getDisplayGrid(showShips = false) {
        const display = Array(this.size).fill().map(() => Array(this.size).fill('.'));
        
        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                const cell = this.grid[row][col];
                
                switch (cell) {
                    case CellState.HIT:
                        display[row][col] = 'X';
                        break;
                    case CellState.MISS:
                        display[row][col] = 'O';
                        break;
                    case CellState.SUNK:
                        display[row][col] = '#';
                        break;
                    case CellState.SHIP:
                        display[row][col] = showShips ? 'S' : '.';
                        break;
                    default:
                        display[row][col] = '.';
                }
            }
        }
        
        return display;
    }
}

class Player {
    constructor(playerId, name, isAI = false) {
        this.playerId = playerId;
        this.name = name;
        this.isAI = isAI;
        this.board = new GameBoard();
        this.shotsBoard = new GameBoard(); // Track shots against opponent
        this.shipsToPlace = this.getStandardFleet();
        this.wins = 0;
    }
    
    getStandardFleet() {
        return [
            new Ship(ShipType.CARRIER, 5),
            new Ship(ShipType.BATTLESHIP, 4),
            new Ship(ShipType.CRUISER, 3),
            new Ship(ShipType.SUBMARINE, 3),
            new Ship(ShipType.DESTROYER, 2)
        ];
    }
    
    placeShip(shipIndex, row, col, orientation) {
        if (shipIndex < 0 || shipIndex >= this.shipsToPlace.length) return false;
        
        const ship = this.shipsToPlace[shipIndex];
        const success = this.board.addShip(ship, row, col, orientation);
        
        if (success) {
            this.shipsToPlace.splice(shipIndex, 1);
        }
        
        return success;
    }
    
    allShipsPlaced() {
        return this.shipsToPlace.length === 0;
    }
    
    makeShot(row, col, opponentBoard) {
        const result = opponentBoard.receiveAttack(row, col);
        
        // Update our tracking board
        if (result.result !== 'invalid') {
            this.shotsBoard.shots.add(`${row},${col}`);
            
            if (result.result === 'hit' || result.result === 'sunk') {
                this.shotsBoard.hits.add(`${row},${col}`);
                this.shotsBoard.grid[row][col] = CellState.HIT;
            } else if (result.result === 'miss') {
                this.shotsBoard.misses.add(`${row},${col}`);
                this.shotsBoard.grid[row][col] = CellState.MISS;
            }
        }
        
        return result;
    }
}

class BattleshipAI extends Player {
    constructor(playerId, name) {
        super(playerId, name, true);
        this.targetQueue = [];
        this.huntMode = true;
        this.lastHit = null;
        this.probabilities = Array(10).fill().map(() => Array(10).fill(0));
    }
    
    placeShipsRandomly() {
        while (this.shipsToPlace.length > 0) {
            const ship = this.shipsToPlace[0];
            let placed = false;
            let attempts = 0;
            
            while (!placed && attempts < 100) {
                const row = Math.floor(Math.random() * 10);
                const col = Math.floor(Math.random() * 10);
                const orientation = Math.random() < 0.5 ? Orientation.HORIZONTAL : Orientation.VERTICAL;
                
                placed = this.placeShip(0, row, col, orientation);
                attempts++;
            }
            
            if (!placed) {
                console.log("AI failed to place ship randomly");
                break;
            }
        }
    }
    
    makeAIShot(opponentBoard) {
        let targetRow, targetCol;
        
        if (this.huntMode) {
            // Hunt mode: search for ships
            const target = this.getHuntTarget();
            targetRow = target.row;
            targetCol = target.col;
        } else {
            // Target mode: attack around known hits
            if (this.targetQueue.length > 0) {
                const target = this.targetQueue.shift();
                targetRow = target.row;
                targetCol = target.col;
            } else {
                // No more targets, return to hunt mode
                this.huntMode = true;
                return this.makeAIShot(opponentBoard);
            }
        }
        
        const result = this.makeShot(targetRow, targetCol, opponentBoard);
        
        if (result.result === 'hit') {
            this.huntMode = false;
            this.lastHit = { row: targetRow, col: targetCol };
            this.addAdjacentTargets(targetRow, targetCol);
        } else if (result.result === 'sunk') {
            // Ship sunk, return to hunt mode
            this.huntMode = true;
            this.targetQueue = [];
            this.lastHit = null;
        }
        
        return result;
    }
    
    getHuntTarget() {
        // Use checkerboard pattern for efficient hunting
        const availableTargets = [];
        
        for (let row = 0; row < 10; row++) {
            for (let col = 0; col < 10; col++) {
                // Checkerboard pattern (only target squares where row + col is even)
                if ((row + col) % 2 === 0 && !this.shotsBoard.shots.has(`${row},${col}`)) {
                    availableTargets.push({ row, col });
                }
            }
        }
        
        // If no checkerboard targets, target any remaining square
        if (availableTargets.length === 0) {
            for (let row = 0; row < 10; row++) {
                for (let col = 0; col < 10; col++) {
                    if (!this.shotsBoard.shots.has(`${row},${col}`)) {
                        availableTargets.push({ row, col });
                    }
                }
            }
        }
        
        if (availableTargets.length === 0) {
            return { row: 0, col: 0 }; // Fallback
        }
        
        // Choose random target from available
        return availableTargets[Math.floor(Math.random() * availableTargets.length)];
    }
    
    addAdjacentTargets(row, col) {
        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        
        directions.forEach(([dr, dc]) => {
            const newRow = row + dr;
            const newCol = col + dc;
            
            if (newRow >= 0 && newRow < 10 && newCol >= 0 && newCol < 10) {
                const shotKey = `${newRow},${newCol}`;
                if (!this.shotsBoard.shots.has(shotKey)) {
                    this.targetQueue.push({ row: newRow, col: newCol });
                }
            }
        });
        
        // Prioritize targets that form a line with previous hits
        this.targetQueue.sort((a, b) => {
            const aScore = this.getTargetPriority(a.row, a.col);
            const bScore = this.getTargetPriority(b.row, b.col);
            return bScore - aScore;
        });
    }
    
    getTargetPriority(row, col) {
        let priority = 0;
        
        // Higher priority for positions that continue a line of hits
        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        
        directions.forEach(([dr, dc]) => {
            let hitCount = 0;
            let checkRow = row + dr;
            let checkCol = col + dc;
            
            while (checkRow >= 0 && checkRow < 10 && checkCol >= 0 && checkCol < 10) {
                if (this.shotsBoard.hits.has(`${checkRow},${checkCol}`)) {
                    hitCount++;
                    checkRow += dr;
                    checkCol += dc;
                } else {
                    break;
                }
            }
            
            priority += hitCount * 10;
        });
        
        return priority;
    }
}

class BattleshipGame {
    constructor(player1Name, player2Name, aiPlayer = false) {
        this.player1 = new Player(1, player1Name);
        this.player2 = aiPlayer ? new BattleshipAI(2, player2Name) : new Player(2, player2Name);
        this.currentPlayer = this.player1;
        this.gameState = GameState.SETUP;
        this.winner = null;
        this.moveHistory = [];
        this.gameNumber = 1;
    }
    
    switchPlayers() {
        this.currentPlayer = this.currentPlayer === this.player1 ? this.player2 : this.player1;
    }
    
    startGame() {
        if (this.player1.allShipsPlaced() && this.player2.allShipsPlaced()) {
            this.gameState = GameState.PLAYING;
            this.currentPlayer = this.player1;
            console.log(`Battleship game started! ${this.currentPlayer.name} goes first.`);
            return true;
        }
        return false;
    }
    
    placePlayerShip(playerId, shipIndex, row, col, orientation) {
        const player = playerId === 1 ? this.player1 : this.player2;
        
        if (this.gameState !== GameState.SETUP) return false;
        
        return player.placeShip(shipIndex, row, col, orientation);
    }
    
    makeAttack(attackerPlayerId, row, col) {
        if (this.gameState !== GameState.PLAYING) return null;
        
        const attacker = attackerPlayerId === 1 ? this.player1 : this.player2;
        const defender = attackerPlayerId === 1 ? this.player2 : this.player1;
        
        if (attacker !== this.currentPlayer) return null;
        
        const result = attacker.makeShot(row, col, defender.board);
        
        if (result.result === 'invalid') return result;
        
        // Record move
        this.moveHistory.push({
            attacker: attacker.name,
            target: { row, col },
            result: result.result,
            timestamp: new Date()
        });
        
        console.log(`${attacker.name} attacks (${row}, ${col}): ${result.message}`);
        
        // Check for game over
        if (defender.board.allShipsSunk()) {
            this.gameState = GameState.FINISHED;
            this.winner = attacker;
            attacker.wins++;
            console.log(`${attacker.name} wins the game!`);
        } else if (result.result === 'miss') {
            // Switch turns on miss
            this.switchPlayers();
        }
        // On hit or sunk, same player continues
        
        return result;
    }
    
    autoPlaceShips(playerId) {
        const player = playerId === 1 ? this.player1 : this.player2;
        
        if (player.isAI) {
            player.placeShipsRandomly();
        } else {
            // Auto-place for human player
            while (player.shipsToPlace.length > 0) {
                const ship = player.shipsToPlace[0];
                let placed = false;
                let attempts = 0;
                
                while (!placed && attempts < 100) {
                    const row = Math.floor(Math.random() * 10);
                    const col = Math.floor(Math.random() * 10);
                    const orientation = Math.random() < 0.5 ? Orientation.HORIZONTAL : Orientation.VERTICAL;
                    
                    placed = player.placeShip(0, row, col, orientation);
                    attempts++;
                }
                
                if (!placed) break;
            }
        }
        
        console.log(`${player.name}'s ships placed automatically`);
    }
    
    makeAIMove() {
        if (this.currentPlayer.isAI && this.gameState === GameState.PLAYING) {
            const opponent = this.currentPlayer === this.player1 ? this.player2 : this.player1;
            return this.currentPlayer.makeAIShot(opponent.board);
        }
        return null;
    }
    
    resetGame() {
        this.player1 = new Player(1, this.player1.name);
        this.player2 = this.player2.isAI ? 
            new BattleshipAI(2, this.player2.name) : 
            new Player(2, this.player2.name);
        this.currentPlayer = this.player1;
        this.gameState = GameState.SETUP;
        this.winner = null;
        this.moveHistory = [];
        this.gameNumber++;
        
        console.log(`Game ${this.gameNumber} setup phase started`);
    }
    
    getGameStats() {
        return {
            gameNumber: this.gameNumber,
            gameState: this.gameState,
            currentPlayer: this.currentPlayer.name,
            player1: {
                name: this.player1.name,
                shipsRemaining: this.player1.board.getShipsRemaining().length,
                shotsTaken: this.player1.shotsBoard.shots.size,
                hits: this.player1.shotsBoard.hits.size,
                accuracy: this.player1.shotsBoard.shots.size > 0 ? 
                    (this.player1.shotsBoard.hits.size / this.player1.shotsBoard.shots.size) * 100 : 0,
                wins: this.player1.wins
            },
            player2: {
                name: this.player2.name,
                shipsRemaining: this.player2.board.getShipsRemaining().length,
                shotsTaken: this.player2.shotsBoard.shots.size,
                hits: this.player2.shotsBoard.hits.size,
                accuracy: this.player2.shotsBoard.shots.size > 0 ? 
                    (this.player2.shotsBoard.hits.size / this.player2.shotsBoard.shots.size) * 100 : 0,
                wins: this.player2.wins
            },
            winner: this.winner?.name,
            moveCount: this.moveHistory.length
        };
    }
    
    displayBoard(playerId, showShips = false) {
        const player = playerId === 1 ? this.player1 : this.player2;
        const grid = player.board.getDisplayGrid(showShips);
        
        console.log(`\n${player.name}'s Board:`);
        console.log("   A B C D E F G H I J");
        
        for (let row = 0; row < 10; row++) {
            let line = (row + 1).toString().padStart(2) + " ";
            for (let col = 0; col < 10; col++) {
                line += grid[row][col] + " ";
            }
            console.log(line);
        }
    }
    
    displayTargetingBoard(playerId) {
        const player = playerId === 1 ? this.player1 : this.player2;
        const grid = player.shotsBoard.getDisplayGrid();
        
        console.log(`\n${player.name}'s Targeting Board:`);
        console.log("   A B C D E F G H I J");
        
        for (let row = 0; row < 10; row++) {
            let line = (row + 1).toString().padStart(2) + " ";
            for (let col = 0; col < 10; col++) {
                line += grid[row][col] + " ";
            }
            console.log(line);
        }
    }
}

function runDemo() {
    console.log("=== Battleship Game Demo ===\n");
    
    // Create game with AI opponent
    const game = new BattleshipGame("Alice", "AI Captain", true);
    
    console.log("1. Setting up ships automatically...");
    game.autoPlaceShips(1); // Alice
    game.autoPlaceShips(2); // AI
    
    console.log("\n2. Starting game...");
    game.startGame();
    
    // Display initial boards
    game.displayBoard(1, true); // Show Alice's ships
    game.displayTargetingBoard(1); // Alice's targeting board
    
    console.log("\n3. Playing game automatically...");
    let moveCount = 0;
    const maxMoves = 50;
    
    while (game.gameState === GameState.PLAYING && moveCount < maxMoves) {
        if (game.currentPlayer.isAI) {
            // AI makes move
            const result = game.makeAIMove();
            if (result) {
                console.log(`AI ${result.message} at (${result.position.row}, ${result.position.col})`);
            }
        } else {
            // Make random move for Alice
            let validMove = false;
            let attempts = 0;
            
            while (!validMove && attempts < 100) {
                const row = Math.floor(Math.random() * 10);
                const col = Math.floor(Math.random() * 10);
                const result = game.makeAttack(1, row, col);
                
                if (result && result.result !== 'invalid') {
                    validMove = true;
                }
                attempts++;
            }
        }
        
        moveCount++;
        
        // Show progress every 10 moves
        if (moveCount % 10 === 0) {
            console.log(`\nAfter ${moveCount} moves:`);
            const stats = game.getGameStats();
            console.log(`${stats.player1.name}: ${stats.player1.shipsRemaining} ships, ${stats.player1.hits} hits, ${stats.player1.accuracy.toFixed(1)}% accuracy`);
            console.log(`${stats.player2.name}: ${stats.player2.shipsRemaining} ships, ${stats.player2.hits} hits, ${stats.player2.accuracy.toFixed(1)}% accuracy`);
        }
    }
    
    console.log("\n4. Final Results:");
    const finalStats = game.getGameStats();
    
    console.log(`Game State: ${finalStats.gameState}`);
    if (finalStats.winner) {
        console.log(`Winner: ${finalStats.winner}`);
    }
    
    console.log("\nFinal Statistics:");
    console.log(`${finalStats.player1.name}: ${finalStats.player1.shipsRemaining} ships remaining, ${finalStats.player1.accuracy.toFixed(1)}% accuracy`);
    console.log(`${finalStats.player2.name}: ${finalStats.player2.shipsRemaining} ships remaining, ${finalStats.player2.accuracy.toFixed(1)}% accuracy`);
    console.log(`Total moves: ${finalStats.moveCount}`);
    
    // Show final boards
    console.log("\n5. Final board states:");
    game.displayBoard(1, true);
    game.displayBoard(2, true);
    
    // Show recent move history
    console.log("\n6. Last 10 moves:");
    const recentMoves = game.moveHistory.slice(-10);
    recentMoves.forEach((move, index) => {
        console.log(`${game.moveHistory.length - 10 + index + 1}. ${move.attacker}: (${move.target.row}, ${move.target.col}) - ${move.result}`);
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BattleshipGame, Player, BattleshipAI, GameBoard, Ship };
}

if (typeof require !== 'undefined' && require.main === module) {
    runDemo();
}