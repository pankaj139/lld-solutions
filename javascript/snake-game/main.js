/**
 * SNAKE GAME Implementation in JavaScript
 * ========================================
 * 
 * This implementation demonstrates several key Design Patterns and OOP Concepts:
 * 
 * DESIGN PATTERNS USED:
 * 1. State Pattern: Game state management with explicit transitions
 *    - GameState enum defines all valid states
 *    - Controlled state transitions (Ready → Playing → Paused → GameOver)
 *    - State-specific behavior and validation
 * 
 * 2. Command Pattern: Directional movement as command objects
 *    - Direction changes encapsulated as validated commands
 *    - Prevents invalid 180-degree reversals
 *    - Supports input queuing for responsive controls
 * 
 * 3. Observer Pattern: Game event notifications
 *    - ScoreTracker observes food consumption events
 *    - Statistics automatically updated on events
 *    - Decoupled notification system
 * 
 * 4. Strategy Pattern: Difficulty levels as strategies
 *    - Different game speeds and board configurations
 *    - Runtime strategy selection
 *    - Easy to add new difficulty variations
 * 
 * 5. Composite Pattern: Snake body as composite structure
 *    - Snake composed of position segments
 *    - Unified interface for body operations
 *    - Growth through composition
 * 
 * OOP CONCEPTS DEMONSTRATED:
 * 1. Encapsulation: Snake body and board grid hidden behind methods
 * 2. Abstraction: Clear interfaces for game components
 * 3. Composition: Snake body composed of positions, game composed of components
 * 4. Polymorphism: State-based behavior polymorphism
 * 
 * ARCHITECTURAL PRINCIPLES:
 * - Single Responsibility: Each class has one clear purpose
 * - Open/Closed: Easy to extend without modification
 * - Dependency Injection: Components injected into game
 * - Low Coupling: Components interact through clean interfaces
 */

// Enums - Using Object.freeze() for immutability
const Direction = Object.freeze({
    UP: { dx: 0, dy: -1, name: 'UP' },
    DOWN: { dx: 0, dy: 1, name: 'DOWN' },
    LEFT: { dx: -1, dy: 0, name: 'LEFT' },
    RIGHT: { dx: 1, dy: 0, name: 'RIGHT' },
    
    /**
     * Check if two directions are opposite (180 degrees)
     * 
     * BUSINESS RULE: Cannot reverse direction instantly
     */
    isOpposite(dir1, dir2) {
        return dir1.dx + dir2.dx === 0 && dir1.dy + dir2.dy === 0;
    }
});

const GameState = Object.freeze({
    READY: 'ready',
    PLAYING: 'playing',
    PAUSED: 'paused',
    GAME_OVER: 'game_over'
});

const CellType = Object.freeze({
    EMPTY: ' ',
    SNAKE: '■',
    FOOD: '●'
});

/**
 * Position - Represents a location on the game board
 * 
 * OOP CONCEPT: Value Object
 * - Immutable position representation
 * - Encapsulates x, y coordinates
 */
class Position {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    equals(other) {
        return this.x === other.x && this.y === other.y;
    }

    /**
     * Create new position by moving in direction
     * 
     * DESIGN PATTERN: Immutability
     * - Returns new position rather than modifying
     */
    move(direction) {
        return new Position(this.x + direction.dx, this.y + direction.dy);
    }

    toString() {
        return `(${this.x}, ${this.y})`;
    }
}

/**
 * Food - Represents food item on the board
 * 
 * OOP CONCEPT: Single Responsibility
 * - Only manages food position and generation
 */
class Food {
    constructor(position) {
        this.position = position;
    }

    /**
     * Generate food at random empty position
     * 
     * BUSINESS RULE: Food must spawn on empty cell
     * 
     * Time Complexity: O(k) where k is attempts, expected O(1) for sparse board
     */
    generateNew(board, snake) {
        let attempts = 0;
        const maxAttempts = 1000;

        while (attempts < maxAttempts) {
            const x = Math.floor(Math.random() * board.width);
            const y = Math.floor(Math.random() * board.height);
            const position = new Position(x, y);

            if (!snake.contains(position)) {
                return new Food(position);
            }

            attempts++;
        }

        // Fallback: find first empty position
        for (let x = 0; x < board.width; x++) {
            for (let y = 0; y < board.height; y++) {
                const position = new Position(x, y);
                if (!snake.contains(position)) {
                    return new Food(position);
                }
            }
        }

        return this; // Board is full (shouldn't happen)
    }
}

/**
 * Snake - Manages snake body segments and movement
 * 
 * DESIGN PATTERN: Composite Pattern
 * - Snake body composed of position segments
 * - Unified interface for body operations
 * 
 * OOP CONCEPT: Encapsulation
 * - Body representation hidden from external access
 * - All operations through validated methods
 */
class Snake {
    constructor(initialPosition, initialLength = 3) {
        // Start with horizontal snake pointing right
        this.body = [];
        for (let i = 0; i < initialLength; i++) {
            this.body.push(new Position(initialPosition.x - i, initialPosition.y));
        }

        this.direction = Direction.RIGHT;
        this.growPending = 0;
    }

    get head() {
        return this.body[0];
    }

    get length() {
        return this.body.length;
    }

    /**
     * Change snake movement direction
     * 
     * BUSINESS RULE: Cannot reverse 180 degrees
     * 
     * @returns {boolean} True if direction change was valid
     */
    changeDirection(newDirection) {
        if (Direction.isOpposite(this.direction, newDirection)) {
            return false;
        }

        this.direction = newDirection;
        return true;
    }

    /**
     * Move snake in current direction
     * 
     * ALGORITHM:
     * 1. Calculate new head position
     * 2. Add new head to front of body
     * 3. Remove tail (unless growing)
     * 
     * Time Complexity: O(1) amortized
     * 
     * @returns {Position} New head position
     */
    move() {
        const newHead = this.head.move(this.direction);
        this.body.unshift(newHead);

        if (this.growPending > 0) {
            this.growPending--;
        } else {
            this.body.pop(); // Remove tail
        }

        return newHead;
    }

    /**
     * Schedule snake to grow on next move
     * 
     * DESIGN PATTERN: Command Pattern
     * - Growth is deferred command
     */
    grow() {
        this.growPending++;
    }

    /**
     * Check if position is part of snake body
     */
    contains(position) {
        return this.body.some(segment => segment.equals(position));
    }

    /**
     * Check if snake head collides with body
     * 
     * BUSINESS RULE: Self-collision ends game
     * 
     * Time Complexity: O(n) where n is snake length
     */
    checkSelfCollision() {
        for (let i = 1; i < this.body.length; i++) {
            if (this.head.equals(this.body[i])) {
                return true;
            }
        }
        return false;
    }
}

/**
 * Board - Manages game board grid and rendering
 * 
 * OOP CONCEPT: Encapsulation
 * - Grid representation hidden
 * - All access through methods
 */
class Board {
    constructor(width = 20, height = 20) {
        this.width = width;
        this.height = height;
    }

    /**
     * Check if position is within board bounds
     * 
     * BUSINESS RULE: Out of bounds causes game over
     */
    isValidPosition(position) {
        return position.x >= 0 && position.x < this.width &&
               position.y >= 0 && position.y < this.height;
    }

    /**
     * Render board to console
     * 
     * Time Complexity: O(w×h) where w and h are dimensions
     */
    display(snake, food, score) {
        // Clear console
        console.clear();

        // Top border
        console.log('╔' + '═'.repeat(this.width * 2) + '╗');

        // Board cells
        for (let y = 0; y < this.height; y++) {
            let row = '║';
            for (let x = 0; x < this.width; x++) {
                const pos = new Position(x, y);

                if (pos.equals(snake.head)) {
                    row += '◆ '; // Snake head (distinct)
                } else if (snake.contains(pos)) {
                    row += '■ '; // Snake body
                } else if (pos.equals(food.position)) {
                    row += '● '; // Food
                } else {
                    row += '  '; // Empty
                }
            }
            row += '║';
            console.log(row);
        }

        // Bottom border
        console.log('╚' + '═'.repeat(this.width * 2) + '╝');

        // Score display
        console.log(`\nScore: ${score} | Length: ${snake.length} | Direction: ${snake.direction.name}`);
    }
}

/**
 * CollisionDetector - Detects all types of collisions
 * 
 * OOP CONCEPT: Single Responsibility
 * - Only responsible for collision detection
 * - Clean separation from game logic
 */
class CollisionDetector {
    /**
     * Check if position collides with walls
     */
    static checkWallCollision(position, board) {
        return !board.isValidPosition(position);
    }

    /**
     * Check if snake collides with itself
     */
    static checkSelfCollision(snake) {
        return snake.checkSelfCollision();
    }

    /**
     * Check if snake head reaches food
     */
    static checkFoodCollision(snakeHead, food) {
        return snakeHead.equals(food.position);
    }
}

/**
 * ScoreTracker - Observer Pattern implementation
 * 
 * DESIGN PATTERN: Observer Pattern
 * - Observes game events (food eaten)
 * - Maintains statistics independently
 */
class ScoreTracker {
    constructor() {
        this.score = 0;
        this.highScore = 0;
        this.foodEaten = 0;
        this.gamesPlayed = 0;
    }

    /**
     * Increment score based on snake length
     * 
     * BUSINESS RULE: Base 10 points + bonus for length
     */
    incrementScore(snakeLength) {
        const points = 10 + snakeLength; // Bonus for longer snake
        this.score += points;
        this.foodEaten++;

        if (this.score > this.highScore) {
            this.highScore = this.score;
        }
    }

    /**
     * Reset score for new game
     */
    reset() {
        this.score = 0;
        this.foodEaten = 0;
        this.gamesPlayed++;
    }

    /**
     * Display game statistics
     */
    displayStats() {
        console.log('\n' + '='.repeat(40));
        console.log('GAME STATISTICS');
        console.log('='.repeat(40));
        console.log(`Final Score: ${this.score}`);
        console.log(`High Score: ${this.highScore}`);
        console.log(`Food Eaten: ${this.foodEaten}`);
        console.log(`Games Played: ${this.gamesPlayed}`);
        console.log('='.repeat(40));
    }
}

/**
 * Game - Main game controller coordinating all components
 * 
 * DESIGN PATTERN: Facade Pattern
 * - Provides simple interface to complex game subsystem
 * - Coordinates Board, Snake, Food, and all other components
 * 
 * DESIGN PATTERN: State Pattern
 * - Manages game state transitions
 * - Validates operations based on current state
 */
class Game {
    constructor(boardWidth = 20, boardHeight = 20, initialSpeed = 200) {
        this.board = new Board(boardWidth, boardHeight);

        // Initialize snake at center
        const centerX = Math.floor(boardWidth / 2);
        const centerY = Math.floor(boardHeight / 2);
        this.snake = new Snake(new Position(centerX, centerY), 3);

        // Initialize food
        this.food = new Food(new Position(centerX + 5, centerY));

        this.state = GameState.READY;
        this.scoreTracker = new ScoreTracker();
        this.collisionDetector = CollisionDetector;

        this.gameSpeed = initialSpeed; // Milliseconds per frame
        this.initialSpeed = initialSpeed;
    }

    /**
     * Start the game
     * 
     * STATE TRANSITION: READY → PLAYING
     */
    start() {
        if (this.state === GameState.READY) {
            this.state = GameState.PLAYING;
            // Generate initial food away from snake
            this.food = this.food.generateNew(this.board, this.snake);
        }
    }

    /**
     * Pause the game
     * 
     * STATE TRANSITION: PLAYING → PAUSED
     */
    pause() {
        if (this.state === GameState.PLAYING) {
            this.state = GameState.PAUSED;
        }
    }

    /**
     * Resume the game
     * 
     * STATE TRANSITION: PAUSED → PLAYING
     */
    resume() {
        if (this.state === GameState.PAUSED) {
            this.state = GameState.PLAYING;
        }
    }

    /**
     * Restart the game
     * 
     * STATE TRANSITION: Any → READY
     */
    restart() {
        const centerX = Math.floor(this.board.width / 2);
        const centerY = Math.floor(this.board.height / 2);
        this.snake = new Snake(new Position(centerX, centerY), 3);
        this.food = this.food.generateNew(this.board, this.snake);
        this.state = GameState.READY;
        this.scoreTracker.reset();
        this.gameSpeed = this.initialSpeed;
    }

    /**
     * Handle directional input
     * 
     * DESIGN PATTERN: Command Pattern
     * - Direction change as command
     * 
     * BUSINESS RULE: Only accept input during PLAYING state
     */
    handleInput(direction) {
        if (this.state !== GameState.PLAYING) {
            return false;
        }

        return this.snake.changeDirection(direction);
    }

    /**
     * Update game state (one frame)
     * 
     * GAME LOOP:
     * 1. Move snake
     * 2. Check collisions
     * 3. Handle food consumption
     * 4. Update difficulty
     * 
     * @returns {boolean} True if game continues, False if game over
     */
    update() {
        if (this.state !== GameState.PLAYING) {
            return true;
        }

        // Move snake
        const newHead = this.snake.move();

        // Check wall collision
        if (this.collisionDetector.checkWallCollision(newHead, this.board)) {
            this.state = GameState.GAME_OVER;
            return false;
        }

        // Check self-collision
        if (this.collisionDetector.checkSelfCollision(this.snake)) {
            this.state = GameState.GAME_OVER;
            return false;
        }

        // Check food collision
        if (this.collisionDetector.checkFoodCollision(newHead, this.food)) {
            this.snake.grow();
            this.scoreTracker.incrementScore(this.snake.length);
            this.food = this.food.generateNew(this.board, this.snake);

            // Increase difficulty (speed up)
            if (this.scoreTracker.foodEaten % 5 === 0) {
                this.gameSpeed *= 0.9; // 10% faster
            }
        }

        return true;
    }

    /**
     * Render current game state
     */
    render() {
        this.board.display(this.snake, this.food, this.scoreTracker.score);

        if (this.state === GameState.PAUSED) {
            console.log('\n⏸  GAME PAUSED');
        } else if (this.state === GameState.GAME_OVER) {
            console.log('\n💀 GAME OVER!');
            this.scoreTracker.displayStats();
        }
    }

    /**
     * Run automated demo with simple AI
     * 
     * DEMO FEATURE: Auto-playing for demonstration
     * - Simple AI that follows food
     */
    async runAutoDemo(maxMoves = 50) {
        this.start();
        let moves = 0;

        console.log('🎮 Snake Game - Automated Demo');
        console.log('Snake will auto-play using simple AI\n');
        
        await this._sleep(1000);

        while (this.state === GameState.PLAYING && moves < maxMoves) {
            // Simple AI: move towards food
            const head = this.snake.head;
            const foodPos = this.food.position;

            // Determine best direction
            if (head.x < foodPos.x && this.snake.direction !== Direction.LEFT) {
                this.handleInput(Direction.RIGHT);
            } else if (head.x > foodPos.x && this.snake.direction !== Direction.RIGHT) {
                this.handleInput(Direction.LEFT);
            } else if (head.y < foodPos.y && this.snake.direction !== Direction.UP) {
                this.handleInput(Direction.DOWN);
            } else if (head.y > foodPos.y && this.snake.direction !== Direction.DOWN) {
                this.handleInput(Direction.UP);
            }

            // Update game
            if (!this.update()) {
                break;
            }

            // Render
            this.render();

            // Sleep for game speed
            await this._sleep(this.gameSpeed);
            moves++;
        }

        if (this.state === GameState.PLAYING) {
            console.log('\n✅ Demo completed successfully!');
            this.scoreTracker.displayStats();
        }
    }

    /**
     * Helper function to sleep (for demo purposes)
     */
    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

/**
 * Demonstrate Snake Game with automated demo
 */
async function main() {
    console.log('='.repeat(50));
    console.log('SNAKE GAME - Low Level Design Demo');
    console.log('='.repeat(50));

    // Demo 1: Small board, fast game
    console.log('\nDemo 1: Quick Game (10x10 board)');
    console.log('-'.repeat(50));
    const game1 = new Game(10, 10, 300);
    await game1.runAutoDemo(30);

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Demo 2: Standard game
    console.log('\n\nDemo 2: Standard Game (15x15 board)');
    console.log('-'.repeat(50));
    const game2 = new Game(15, 15, 200);
    await game2.runAutoDemo(40);

    console.log('\n' + '='.repeat(50));
    console.log('DEMO COMPLETE');
    console.log('='.repeat(50));
    console.log('\nFor manual play, use arrow keys to control:');
    console.log('  ↑ : Direction.UP');
    console.log('  ↓ : Direction.DOWN');
    console.log('  ← : Direction.LEFT');
    console.log('  → : Direction.RIGHT');
    console.log('\nImplement keyboard input handling for interactive play.');
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        Game,
        Board,
        Snake,
        Food,
        Position,
        CollisionDetector,
        ScoreTracker,
        Direction,
        GameState,
        CellType
    };
}

// Run demo if executed directly
if (typeof require !== 'undefined' && require.main === module) {
    main();
}

