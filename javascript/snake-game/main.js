// Snake Game - JavaScript Implementation
// Real-time arcade game with intelligent pathfinding and collision detection

// Enums
const Direction = {
    UP: 'UP',
    DOWN: 'DOWN',
    LEFT: 'LEFT',
    RIGHT: 'RIGHT'
};

const GameState = {
    READY: 'READY',
    PLAYING: 'PLAYING',
    PAUSED: 'PAUSED',
    GAME_OVER: 'GAME_OVER'
};

const FoodType = {
    NORMAL: 'NORMAL',
    POWER: 'POWER',
    BONUS: 'BONUS'
};

// Utility function for random number generation
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Position class
class Position {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    equals(other) {
        return this.x === other.x && this.y === other.y;
    }

    toString() {
        return `(${this.x}, ${this.y})`;
    }
}

// Food class
class Food {
    constructor(position, type = FoodType.NORMAL, points = 10) {
        this.position = position;
        this.type = type;
        this.points = points;
        this.expiryTime = type === FoodType.POWER ? Date.now() + 5000 : null; // Power food expires in 5s
    }

    isExpired() {
        return this.expiryTime && Date.now() > this.expiryTime;
    }

    getMultiplier() {
        switch (this.type) {
            case FoodType.POWER:
                return 3;
            case FoodType.BONUS:
                return 2;
            default:
                return 1;
        }
    }
}

// Snake class
class Snake {
    constructor(startPosition, direction = Direction.RIGHT) {
        this.body = [startPosition];
        this.direction = direction;
        this.nextDirection = direction;
        this.growthPending = 0;
    }

    getHead() {
        return this.body[0];
    }

    move() {
        this.direction = this.nextDirection;
        const head = this.getHead();
        let newHead;

        switch (this.direction) {
            case Direction.UP:
                newHead = new Position(head.x, head.y - 1);
                break;
            case Direction.DOWN:
                newHead = new Position(head.x, head.y + 1);
                break;
            case Direction.LEFT:
                newHead = new Position(head.x - 1, head.y);
                break;
            case Direction.RIGHT:
                newHead = new Position(head.x + 1, head.y);
                break;
        }

        this.body.unshift(newHead);

        if (this.growthPending > 0) {
            this.growthPending--;
        } else {
            this.body.pop();
        }
    }

    changeDirection(newDirection) {
        // Prevent 180-degree turns
        const opposites = {
            [Direction.UP]: Direction.DOWN,
            [Direction.DOWN]: Direction.UP,
            [Direction.LEFT]: Direction.RIGHT,
            [Direction.RIGHT]: Direction.LEFT
        };

        if (opposites[this.direction] !== newDirection) {
            this.nextDirection = newDirection;
        }
    }

    grow(segments = 1) {
        this.growthPending += segments;
    }

    checkSelfCollision() {
        const head = this.getHead();
        return this.body.slice(1).some(segment => segment.equals(head));
    }

    occupiesPosition(position) {
        return this.body.some(segment => segment.equals(position));
    }

    getLength() {
        return this.body.length;
    }
}

// Game Board
class GameBoard {
    constructor(width, height) {
        this.width = width;
        this.height = height;
    }

    isValidPosition(position) {
        return position.x >= 0 && position.x < this.width &&
               position.y >= 0 && position.y < this.height;
    }

    getRandomEmptyPosition(snake, foods = []) {
        const occupiedPositions = new Set();
        
        // Add snake positions
        snake.body.forEach(segment => {
            occupiedPositions.add(`${segment.x},${segment.y}`);
        });
        
        // Add food positions
        foods.forEach(food => {
            occupiedPositions.add(`${food.position.x},${food.position.y}`);
        });

        let attempts = 0;
        while (attempts < 1000) {
            const x = getRandomInt(0, this.width - 1);
            const y = getRandomInt(0, this.height - 1);
            const key = `${x},${y}`;
            
            if (!occupiedPositions.has(key)) {
                return new Position(x, y);
            }
            attempts++;
        }
        
        return null; // Board is full
    }
}

// Score Manager
class ScoreManager {
    constructor() {
        this.score = 0;
        this.highScore = 0;
        this.level = 1;
        this.foodEaten = 0;
    }

    addScore(points, multiplier = 1) {
        const earnedPoints = points * multiplier * this.level;
        this.score += earnedPoints;
        this.foodEaten++;
        
        // Level up every 10 food items
        if (this.foodEaten % 10 === 0) {
            this.level++;
        }
        
        return earnedPoints;
    }

    updateHighScore() {
        if (this.score > this.highScore) {
            this.highScore = this.score;
            return true;
        }
        return false;
    }

    reset() {
        this.score = 0;
        this.level = 1;
        this.foodEaten = 0;
    }

    getGameSpeed() {
        // Increase speed with level
        const baseSpeed = 200; // milliseconds
        const speedIncrease = Math.min(this.level * 10, 100);
        return Math.max(baseSpeed - speedIncrease, 50);
    }
}

// Food Generator (Strategy Pattern)
class FoodGenerator {
    generateFood(board, snake, foods) {
        throw new Error("Method must be implemented");
    }
}

class BasicFoodGenerator extends FoodGenerator {
    generateFood(board, snake, foods) {
        const position = board.getRandomEmptyPosition(snake, foods);
        if (!position) return null;
        
        return new Food(position, FoodType.NORMAL, 10);
    }
}

class PowerFoodGenerator extends FoodGenerator {
    generateFood(board, snake, foods) {
        const position = board.getRandomEmptyPosition(snake, foods);
        if (!position) return null;
        
        const foodType = Math.random() < 0.3 ? FoodType.POWER : FoodType.NORMAL;
        const points = foodType === FoodType.POWER ? 30 : 10;
        
        return new Food(position, foodType, points);
    }
}

class BonusFoodGenerator extends FoodGenerator {
    generateFood(board, snake, foods) {
        const position = board.getRandomEmptyPosition(snake, foods);
        if (!position) return null;
        
        const rand = Math.random();
        let foodType, points;
        
        if (rand < 0.1) {
            foodType = FoodType.POWER;
            points = 30;
        } else if (rand < 0.3) {
            foodType = FoodType.BONUS;
            points = 20;
        } else {
            foodType = FoodType.NORMAL;
            points = 10;
        }
        
        return new Food(position, foodType, points);
    }
}

// Game Observer Pattern
class GameObserver {
    onScoreUpdate(score, level) {}
    onFoodEaten(food, earnedPoints) {}
    onGameOver(finalScore, highScore) {}
    onLevelUp(newLevel) {}
}

class ConsoleObserver extends GameObserver {
    onScoreUpdate(score, level) {
        console.log(`Score: ${score} | Level: ${level}`);
    }

    onFoodEaten(food, earnedPoints) {
        console.log(`Ate ${food.type} food! +${earnedPoints} points`);
    }

    onGameOver(finalScore, highScore) {
        console.log(`Game Over! Final Score: ${finalScore} | High Score: ${highScore}`);
    }

    onLevelUp(newLevel) {
        console.log(`Level Up! Now at level ${newLevel}`);
    }
}

// AI Snake (for demonstration)
class AISnake {
    constructor(snake, board) {
        this.snake = snake;
        this.board = board;
    }

    getNextMove(food) {
        if (!food) {
            return this.getRandomSafeMove();
        }

        const head = this.snake.getHead();
        const target = food.position;
        
        // Simple pathfinding towards food
        const directions = [];
        
        if (head.x < target.x) directions.push(Direction.RIGHT);
        if (head.x > target.x) directions.push(Direction.LEFT);
        if (head.y < target.y) directions.push(Direction.DOWN);
        if (head.y > target.y) directions.push(Direction.UP);
        
        // Try preferred directions first
        for (const direction of directions) {
            if (this.isSafeMove(direction)) {
                return direction;
            }
        }
        
        // If no preferred direction is safe, try any safe direction
        return this.getRandomSafeMove();
    }

    isSafeMove(direction) {
        const head = this.snake.getHead();
        let nextPosition;

        switch (direction) {
            case Direction.UP:
                nextPosition = new Position(head.x, head.y - 1);
                break;
            case Direction.DOWN:
                nextPosition = new Position(head.x, head.y + 1);
                break;
            case Direction.LEFT:
                nextPosition = new Position(head.x - 1, head.y);
                break;
            case Direction.RIGHT:
                nextPosition = new Position(head.x + 1, head.y);
                break;
        }

        // Check board boundaries
        if (!this.board.isValidPosition(nextPosition)) {
            return false;
        }

        // Check self collision
        if (this.snake.occupiesPosition(nextPosition)) {
            return false;
        }

        return true;
    }

    getRandomSafeMove() {
        const allDirections = [Direction.UP, Direction.DOWN, Direction.LEFT, Direction.RIGHT];
        const safeDirections = allDirections.filter(dir => this.isSafeMove(dir));
        
        if (safeDirections.length === 0) {
            return this.snake.direction; // No safe moves, continue current direction
        }
        
        return safeDirections[getRandomInt(0, safeDirections.length - 1)];
    }
}

// Main Snake Game
class SnakeGame {
    constructor(width = 20, height = 20) {
        this.board = new GameBoard(width, height);
        this.snake = new Snake(new Position(Math.floor(width / 2), Math.floor(height / 2)));
        this.foods = [];
        this.scoreManager = new ScoreManager();
        this.state = GameState.READY;
        this.gameInterval = null;
        this.observers = [];
        this.foodGenerator = new BonusFoodGenerator();
        this.ai = new AISnake(this.snake, this.board);
        this.autoPlay = false;
        
        this.generateInitialFood();
    }

    addObserver(observer) {
        this.observers.push(observer);
    }

    removeObserver(observer) {
        const index = this.observers.indexOf(observer);
        if (index > -1) {
            this.observers.splice(index, 1);
        }
    }

    notifyObservers(method, ...args) {
        this.observers.forEach(observer => {
            if (observer[method]) {
                observer[method](...args);
            }
        });
    }

    generateInitialFood() {
        const food = this.foodGenerator.generateFood(this.board, this.snake, this.foods);
        if (food) {
            this.foods.push(food);
        }
    }

    start() {
        if (this.state === GameState.READY || this.state === GameState.PAUSED) {
            this.state = GameState.PLAYING;
            this.gameLoop();
        }
    }

    pause() {
        if (this.state === GameState.PLAYING) {
            this.state = GameState.PAUSED;
            if (this.gameInterval) {
                clearInterval(this.gameInterval);
                this.gameInterval = null;
            }
        }
    }

    gameLoop() {
        if (this.gameInterval) {
            clearInterval(this.gameInterval);
        }

        this.gameInterval = setInterval(() => {
            if (this.state === GameState.PLAYING) {
                this.update();
            }
        }, this.scoreManager.getGameSpeed());
    }

    update() {
        // AI control if enabled
        if (this.autoPlay && this.foods.length > 0) {
            const nextMove = this.ai.getNextMove(this.foods[0]);
            this.snake.changeDirection(nextMove);
        }

        // Move snake
        this.snake.move();

        // Check collisions
        if (this.checkCollisions()) {
            this.gameOver();
            return;
        }

        // Check food consumption
        this.checkFoodConsumption();

        // Remove expired foods
        this.removeExpiredFoods();

        // Generate new food if needed
        if (this.foods.length === 0 || Math.random() < 0.1) {
            const newFood = this.foodGenerator.generateFood(this.board, this.snake, this.foods);
            if (newFood) {
                this.foods.push(newFood);
            }
        }

        // Update observers
        this.notifyObservers('onScoreUpdate', this.scoreManager.score, this.scoreManager.level);
    }

    checkCollisions() {
        const head = this.snake.getHead();

        // Wall collision
        if (!this.board.isValidPosition(head)) {
            return true;
        }

        // Self collision
        if (this.snake.checkSelfCollision()) {
            return true;
        }

        return false;
    }

    checkFoodConsumption() {
        const head = this.snake.getHead();
        
        for (let i = this.foods.length - 1; i >= 0; i--) {
            const food = this.foods[i];
            if (head.equals(food.position)) {
                // Consume food
                const earnedPoints = this.scoreManager.addScore(food.points, food.getMultiplier());
                this.snake.grow(food.type === FoodType.POWER ? 2 : 1);
                
                this.notifyObservers('onFoodEaten', food, earnedPoints);
                
                // Check for level up
                if (this.scoreManager.foodEaten % 10 === 1) {
                    this.notifyObservers('onLevelUp', this.scoreManager.level);
                    this.gameLoop(); // Restart loop with new speed
                }
                
                this.foods.splice(i, 1);
                break;
            }
        }
    }

    removeExpiredFoods() {
        this.foods = this.foods.filter(food => !food.isExpired());
    }

    changeDirection(direction) {
        if (this.state === GameState.PLAYING) {
            this.snake.changeDirection(direction);
        }
    }

    gameOver() {
        this.state = GameState.GAME_OVER;
        if (this.gameInterval) {
            clearInterval(this.gameInterval);
            this.gameInterval = null;
        }
        
        const isNewHighScore = this.scoreManager.updateHighScore();
        this.notifyObservers('onGameOver', this.scoreManager.score, this.scoreManager.highScore);
        
        if (isNewHighScore) {
            console.log("🎉 New High Score!");
        }
    }

    reset() {
        this.state = GameState.READY;
        this.snake = new Snake(new Position(Math.floor(this.board.width / 2), Math.floor(this.board.height / 2)));
        this.foods = [];
        this.scoreManager.reset();
        this.ai = new AISnake(this.snake, this.board);
        
        if (this.gameInterval) {
            clearInterval(this.gameInterval);
            this.gameInterval = null;
        }
        
        this.generateInitialFood();
    }

    toggleAutoPlay() {
        this.autoPlay = !this.autoPlay;
        console.log(`AI Control: ${this.autoPlay ? 'ON' : 'OFF'}`);
    }

    getGameState() {
        return {
            snake: this.snake.body,
            foods: this.foods,
            score: this.scoreManager.score,
            level: this.scoreManager.level,
            highScore: this.scoreManager.highScore,
            state: this.state,
            boardSize: { width: this.board.width, height: this.board.height }
        };
    }

    displayBoard() {
        const board = Array(this.board.height).fill().map(() => Array(this.board.width).fill('.'));
        
        // Place snake
        this.snake.body.forEach((segment, index) => {
            if (this.board.isValidPosition(segment)) {
                board[segment.y][segment.x] = index === 0 ? 'H' : 'S';
            }
        });
        
        // Place foods
        this.foods.forEach(food => {
            if (this.board.isValidPosition(food.position)) {
                let symbol;
                switch (food.type) {
                    case FoodType.POWER:
                        symbol = 'P';
                        break;
                    case FoodType.BONUS:
                        symbol = 'B';
                        break;
                    default:
                        symbol = 'F';
                }
                board[food.position.y][food.position.x] = symbol;
            }
        });
        
        console.clear();
        console.log(`Score: ${this.scoreManager.score} | Level: ${this.scoreManager.level} | High Score: ${this.scoreManager.highScore}`);
        console.log(`Length: ${this.snake.getLength()} | State: ${this.state} | AI: ${this.autoPlay ? 'ON' : 'OFF'}`);
        console.log('H=Head, S=Snake, F=Food, P=Power, B=Bonus\n');
        
        board.forEach(row => {
            console.log(row.join(' '));
        });
    }
}

// Demo function
function runDemo() {
    console.log("=== Snake Game Demo ===\n");

    // Create game
    const game = new SnakeGame(15, 10);
    
    // Add observer
    game.addObserver(new ConsoleObserver());

    console.log("Starting Snake Game Demo...");
    console.log("Controls: W/A/S/D or Arrow Keys");
    console.log("AI will take over for demonstration\n");

    // Enable AI for demo
    game.toggleAutoPlay();
    
    // Display initial board
    game.displayBoard();
    
    // Start game
    game.start();
    
    // Run demo for a short time
    let demoTime = 0;
    const demoInterval = setInterval(() => {
        if (game.state === GameState.PLAYING) {
            game.displayBoard();
        } else if (game.state === GameState.GAME_OVER) {
            console.log("\nGame Over! Restarting...");
            game.reset();
            game.toggleAutoPlay();
            game.start();
        }
        
        demoTime++;
        if (demoTime > 50) { // Run for ~25 seconds
            clearInterval(demoInterval);
            game.pause();
            console.log("\nDemo completed!");
            
            const finalState = game.getGameState();
            console.log("\nFinal Game Statistics:");
            console.log(`Final Score: ${finalState.score}`);
            console.log(`Final Level: ${finalState.level}`);
            console.log(`High Score: ${finalState.highScore}`);
            console.log(`Snake Length: ${finalState.snake.length}`);
        }
    }, 500);
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        SnakeGame,
        Snake,
        GameBoard,
        Direction,
        GameState,
        FoodType
    };
}

// Run demo if this file is executed directly
if (typeof require !== 'undefined' && require.main === module) {
    runDemo();
}