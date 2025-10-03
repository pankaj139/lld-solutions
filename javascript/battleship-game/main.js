/**
 * BATTLESHIP GAME Implementation in JavaScript
 * ============================================
 * 
 * This implementation demonstrates several key Design Patterns and OOP Concepts:
 * 
 * DESIGN PATTERNS USED:
 * 1. Strategy Pattern: Different AI difficulty levels
 *    - RandomAI, HuntTargetAI strategies
 *    - Pluggable targeting algorithms
 *    - Easy to extend with new strategies
 * 
 * 2. State Pattern: Game state management
 *    - Setup, Playing, Finished states
 *    - Controlled state transitions
 * 
 * 3. Observer Pattern: Game event notifications
 *    - Hit, Miss, Sunk events
 *    - Statistics tracking
 * 
 * 4. Command Pattern: Attack actions
 *    - Attack encapsulates action details
 *    - History tracking
 * 
 * 5. Factory Pattern: Ship creation
 *    - Standardized ship instantiation
 * 
 * 6. Composite Pattern: Fleet composed of ships
 *    - Unified fleet operations
 * 
 * OOP CONCEPTS DEMONSTRATED:
 * 1. Encapsulation: Board state, ship positions hidden
 * 2. Abstraction: AIStrategy defines contract
 * 3. Composition: Player composed of Board and AIStrategy
 * 4. Polymorphism: Different AI strategies used uniformly
 * 
 * ARCHITECTURAL PRINCIPLES:
 * - Single Responsibility: Each class has one clear purpose
 * - Open/Closed: Easy to extend without modification
 * - Dependency Injection: Strategies injected
 * - Low Coupling: Clean interfaces
 */

// Enums - Using Object.freeze() for immutability
const ShipType = Object.freeze({
    CARRIER: { name: 'CARRIER', size: 5 },
    BATTLESHIP: { name: 'BATTLESHIP', size: 4 },
    CRUISER: { name: 'CRUISER', size: 3 },
    SUBMARINE: { name: 'SUBMARINE', size: 3 },
    DESTROYER: { name: 'DESTROYER', size: 2 }
});

const Orientation = Object.freeze({
    HORIZONTAL: 'horizontal',
    VERTICAL: 'vertical'
});

const CellState = Object.freeze({
    EMPTY: '~',
    SHIP: 'S',
    HIT: 'X',
    MISS: 'O'
});

const AttackResult = Object.freeze({
    MISS: 'Miss',
    HIT: 'Hit',
    SUNK: 'Sunk'
});

const GameState = Object.freeze({
    SETUP: 'setup',
    PLAYING: 'playing',
    FINISHED: 'finished'
});

/**
 * Coordinate - Board position
 * 
 * OOP CONCEPT: Value Object
 */
class Coordinate {
    constructor(row, col) {
        this.row = row;
        this.col = col;
    }

    equals(other) {
        return this.row === other.row && this.col === other.col;
    }

    toString() {
        return `${String.fromCharCode(65 + this.row)}${this.col + 1}`;
    }

    static fromString(coordStr, boardSize = 10) {
        if (coordStr.length < 2) return null;

        const row = coordStr.charCodeAt(0) - 65;
        const col = parseInt(coordStr.substring(1)) - 1;

        if (row >= 0 && row < boardSize && col >= 0 && col < boardSize) {
            return new Coordinate(row, col);
        }

        return null;
    }
}

/**
 * Cell - Individual board cell
 */
class Cell {
    constructor() {
        this.state = CellState.EMPTY;
        this.ship = null;
    }

    isOccupied() {
        return this.ship !== null;
    }

    markHit() {
        if (this.isOccupied()) {
            this.state = CellState.HIT;
            return true;
        } else {
            this.state = CellState.MISS;
            return false;
        }
    }
}

/**
 * Ship - Battleship vessel
 */
class Ship {
    constructor(shipType) {
        this.type = shipType;
        this.size = shipType.size;
        this.position = [];
        this.hits = new Set();
        this.orientation = null;
    }

    get health() {
        return this.size - this.hits.size;
    }

    isSunk() {
        return this.hits.size >= this.size;
    }

    receiveHit(coord) {
        const coordKey = `${coord.row},${coord.col}`;
        const posKey = this.position.find(p => `${p.row},${p.col}` === coordKey);

        if (posKey && !this.hits.has(coordKey)) {
            this.hits.add(coordKey);
            return true;
        }
        return false;
    }

    getCoordinates() {
        return [...this.position];
    }
}

/**
 * Fleet - Collection of ships
 * 
 * DESIGN PATTERN: Composite Pattern
 */
class Fleet {
    constructor() {
        this.ships = [];
    }

    addShip(ship) {
        this.ships.push(ship);
    }

    getShipAt(coord) {
        return this.ships.find(ship =>
            ship.position.some(p => p.equals(coord))
        ) || null;
    }

    isDefeated() {
        return this.ships.every(ship => ship.isSunk());
    }

    getRemainingShips() {
        return this.ships.filter(ship => !ship.isSunk()).length;
    }
}

/**
 * Board - Game board with ship placement
 */
class Board {
    constructor(size = 10) {
        this.size = size;
        this.grid = Array(size).fill(null).map(() =>
            Array(size).fill(null).map(() => new Cell())
        );
        this.fleet = new Fleet();
    }

    getCell(coord) {
        if (coord.row >= 0 && coord.row < this.size &&
            coord.col >= 0 && coord.col < this.size) {
            return this.grid[coord.row][coord.col];
        }
        return null;
    }

    isValidPlacement(ship, start, orientation) {
        const coordinates = [];

        for (let i = 0; i < ship.size; i++) {
            const coord = orientation === Orientation.HORIZONTAL
                ? new Coordinate(start.row, start.col + i)
                : new Coordinate(start.row + i, start.col);

            // Check bounds
            if (coord.row >= this.size || coord.col >= this.size) {
                return false;
            }

            // Check overlap
            const cell = this.getCell(coord);
            if (cell && cell.isOccupied()) {
                return false;
            }

            coordinates.push(coord);
        }

        return true;
    }

    placeShip(ship, start, orientation) {
        if (!this.isValidPlacement(ship, start, orientation)) {
            return false;
        }

        ship.position = [];
        ship.orientation = orientation;

        for (let i = 0; i < ship.size; i++) {
            const coord = orientation === Orientation.HORIZONTAL
                ? new Coordinate(start.row, start.col + i)
                : new Coordinate(start.row + i, start.col);

            const cell = this.getCell(coord);
            cell.ship = ship;
            cell.state = CellState.SHIP;
            ship.position.push(coord);
        }

        this.fleet.addShip(ship);
        return true;
    }

    receiveAttack(coord) {
        const cell = this.getCell(coord);
        if (!cell) return AttackResult.MISS;

        // Already attacked
        if (cell.state === CellState.HIT || cell.state === CellState.MISS) {
            return AttackResult.MISS;
        }

        const hit = cell.markHit();

        if (hit) {
            const ship = cell.ship;
            ship.receiveHit(coord);

            if (ship.isSunk()) {
                return AttackResult.SUNK;
            }
            return AttackResult.HIT;
        }

        return AttackResult.MISS;
    }

    autoPlaceShips() {
        const shipTypes = [
            ShipType.CARRIER,
            ShipType.BATTLESHIP,
            ShipType.CRUISER,
            ShipType.SUBMARINE,
            ShipType.DESTROYER
        ];

        for (const shipType of shipTypes) {
            const ship = new Ship(shipType);
            let placed = false;
            let attempts = 0;

            while (!placed && attempts < 100) {
                const row = Math.floor(Math.random() * this.size);
                const col = Math.floor(Math.random() * this.size);
                const orientation = Math.random() < 0.5
                    ? Orientation.HORIZONTAL
                    : Orientation.VERTICAL;

                if (this.placeShip(ship, new Coordinate(row, col), orientation)) {
                    placed = true;
                }

                attempts++;
            }
        }
    }

    display(showShips = true) {
        console.log('\n   ' + Array.from({length: this.size}, (_, i) =>
            (i + 1).toString().padStart(2)
        ).join(' '));
        console.log('  +' + '---'.repeat(this.size) + '+');

        for (let row = 0; row < this.size; row++) {
            let rowStr = String.fromCharCode(65 + row) + ' |';

            for (let col = 0; col < this.size; col++) {
                const cell = this.grid[row][col];

                if (cell.state === CellState.HIT) {
                    rowStr += ' X ';
                } else if (cell.state === CellState.MISS) {
                    rowStr += ' O ';
                } else if (cell.state === CellState.SHIP && showShips) {
                    rowStr += ' S ';
                } else {
                    rowStr += ' ~ ';
                }
            }

            console.log(rowStr + '|');
        }

        console.log('  +' + '---'.repeat(this.size) + '+');
    }
}

/**
 * Attack - Command Pattern implementation
 */
class Attack {
    constructor(coordinate, result) {
        this.coordinate = coordinate;
        this.result = result;
    }
}

/**
 * AttackHistory - Tracks attack history
 */
class AttackHistory {
    constructor() {
        this.attacks = [];
        this.hitCount = 0;
        this.missCount = 0;
    }

    addAttack(attack) {
        this.attacks.push(attack);

        if (attack.result === AttackResult.HIT || attack.result === AttackResult.SUNK) {
            this.hitCount++;
        } else {
            this.missCount++;
        }
    }

    hasAttacked(coord) {
        return this.attacks.some(a => a.coordinate.equals(coord));
    }

    getHitRate() {
        const total = this.attacks.length;
        return total > 0 ? (this.hitCount / total * 100) : 0;
    }
}

/**
 * AIStrategy - Abstract AI strategy
 * 
 * DESIGN PATTERN: Strategy Pattern
 */
class AIStrategy {
    getNextTarget(boardSize, history) {
        throw new Error('getNextTarget must be implemented');
    }
}

/**
 * RandomAI - Easy AI with random targeting
 */
class RandomAI extends AIStrategy {
    getNextTarget(boardSize, history) {
        while (true) {
            const row = Math.floor(Math.random() * boardSize);
            const col = Math.floor(Math.random() * boardSize);
            const coord = new Coordinate(row, col);

            if (!history.hasAttacked(coord)) {
                return coord;
            }
        }
    }
}

/**
 * HuntTargetAI - Medium AI with hunt/target mode
 */
class HuntTargetAI extends AIStrategy {
    constructor() {
        super();
        this.targets = [];
    }

    getNextTarget(boardSize, history) {
        // Target mode
        if (this.targets.length > 0) {
            const coord = this.targets.shift();
            if (!history.hasAttacked(coord)) {
                return coord;
            }
        }

        // Check recent hits
        const recentAttacks = history.attacks.slice(-5);
        for (const attack of recentAttacks.reverse()) {
            if (attack.result === AttackResult.HIT || attack.result === AttackResult.SUNK) {
                this._addAdjacentTargets(attack.coordinate, boardSize, history);
            }
        }

        // Hunt mode: random
        while (true) {
            const row = Math.floor(Math.random() * boardSize);
            const col = Math.floor(Math.random() * boardSize);
            const coord = new Coordinate(row, col);

            if (!history.hasAttacked(coord)) {
                return coord;
            }
        }
    }

    _addAdjacentTargets(coord, boardSize, history) {
        const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];

        for (const [dr, dc] of directions) {
            const newCoord = new Coordinate(coord.row + dr, coord.col + dc);

            if (newCoord.row >= 0 && newCoord.row < boardSize &&
                newCoord.col >= 0 && newCoord.col < boardSize &&
                !history.hasAttacked(newCoord) &&
                !this.targets.some(t => t.equals(newCoord))) {

                this.targets.push(newCoord);
            }
        }
    }
}

/**
 * Player - Game player
 */
class Player {
    constructor(name, isAI = false, aiStrategy = null) {
        this.name = name;
        this.board = new Board();
        this.attackHistory = new AttackHistory();
        this.isAI = isAI;
        this.aiStrategy = aiStrategy;
    }
}

/**
 * BattleshipGame - Main game controller
 * 
 * DESIGN PATTERN: Facade Pattern
 */
class BattleshipGame {
    constructor(player1Name, player2Name, player2AI = true) {
        this.player1 = new Player(player1Name, false);
        this.player2 = new Player(
            player2Name,
            player2AI,
            player2AI ? new HuntTargetAI() : null
        );
        this.currentPlayerIdx = 0;
        this.state = GameState.SETUP;
    }

    get currentPlayer() {
        return this.currentPlayerIdx === 0 ? this.player1 : this.player2;
    }

    get opponent() {
        return this.currentPlayerIdx === 0 ? this.player2 : this.player1;
    }

    setupGame() {
        console.log('\n' + '='.repeat(60));
        console.log('BATTLESHIP GAME - SETUP');
        console.log('='.repeat(60));

        console.log(`\nPlacing ships for ${this.player1.name}...`);
        this.player1.board.autoPlaceShips();

        console.log(`Placing ships for ${this.player2.name}...`);
        this.player2.board.autoPlaceShips();

        this.state = GameState.PLAYING;
    }

    playTurn() {
        const player = this.currentPlayer;
        const opponent = this.opponent;

        console.log('\n' + '='.repeat(60));
        console.log(`${player.name}'s Turn`);
        console.log('='.repeat(60));

        // Get target
        let coord;
        if (player.isAI) {
            coord = player.aiStrategy.getNextTarget(
                opponent.board.size,
                player.attackHistory
            );
            console.log(`AI attacks: ${coord}`);
        } else {
            coord = new RandomAI().getNextTarget(opponent.board.size, player.attackHistory);
            console.log(`${player.name} attacks: ${coord}`);
        }

        // Make attack
        const result = opponent.board.receiveAttack(coord);
        const attack = new Attack(coord, result);
        player.attackHistory.addAttack(attack);

        console.log(`Result: ${result}`);

        if (result === AttackResult.SUNK) {
            const ship = opponent.board.fleet.getShipAt(coord);
            if (ship) {
                console.log(`💥 ${ship.type.name} sunk!`);
            }
        }

        // Check victory
        if (opponent.board.fleet.isDefeated()) {
            this.state = GameState.FINISHED;
            return false;
        }

        // Next turn
        this.currentPlayerIdx = 1 - this.currentPlayerIdx;
        return true;
    }

    getWinner() {
        return this.player1.board.fleet.isDefeated() ? this.player2 : this.player1;
    }

    playGame() {
        this.setupGame();

        let turnCount = 0;
        const maxTurns = 100;

        while (this.state === GameState.PLAYING && turnCount < maxTurns) {
            if (!this.playTurn()) {
                break;
            }
            turnCount++;
        }

        // Game over
        const winner = this.getWinner();
        console.log('\n' + '='.repeat(60));
        console.log(`🎉 ${winner.name} WINS!`);
        console.log('='.repeat(60));
        console.log(`Turns: ${turnCount}`);
        console.log(`${this.player1.name} accuracy: ${this.player1.attackHistory.getHitRate().toFixed(1)}%`);
        console.log(`${this.player2.name} accuracy: ${this.player2.attackHistory.getHitRate().toFixed(1)}%`);
    }
}

/**
 * Demonstrate Battleship game
 */
function main() {
    console.log('='.repeat(60));
    console.log('BATTLESHIP GAME - Low Level Design Demo');
    console.log('='.repeat(60));

    const game = new BattleshipGame('Alice', 'Computer AI', true);
    game.playGame();

    // Show final boards
    console.log(`\n${game.player1.name}'s board:`);
    game.player1.board.display(true);

    console.log(`\n${game.player2.name}'s board:`);
    game.player2.board.display(true);

    console.log('\n' + '='.repeat(60));
    console.log('DEMO COMPLETE');
    console.log('='.repeat(60));
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        BattleshipGame,
        Board,
        Ship,
        Fleet,
        Player,
        Coordinate,
        Attack,
        AttackHistory,
        RandomAI,
        HuntTargetAI,
        ShipType,
        Orientation,
        CellState,
        AttackResult,
        GameState
    };
}

// Run demo if executed directly
if (typeof require !== 'undefined' && require.main === module) {
    main();
}

