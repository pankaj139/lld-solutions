/**
 * ELEVATOR SYSTEM Implementation in JavaScript
 * ============================================
 * 
 * FILE PURPOSE:
 * Implements elevator control system for multi-story buildings with
 * efficient scheduling and multiple elevator management.
 * 
 * DESIGN PATTERNS:
 * 1. State Pattern: Elevator state management
 * 2. Strategy Pattern: Scheduling algorithms
 * 3. Observer Pattern: Request notifications
 * 4. Singleton Pattern: Controller instance
 * 5. Command Pattern: Elevator operations
 * 
 * OOP CONCEPTS:
 * - Encapsulation: State management
 * - Abstraction: Controller interface
 * - Polymorphism: Different strategies
 * 
 * USAGE:
 * const controller = new ElevatorController();
 * const elevator = new Elevator('E1', 10);
 * controller.addElevator(elevator);
 * controller.request(5);
 * 
 * EXPECTED RETURN:
 * Elevator assignment and movement to requested floor
 */

const ElevatorState = Object.freeze({
    IDLE: 'idle',
    MOVING_UP: 'moving_up',
    MOVING_DOWN: 'moving_down',
    STOPPED: 'stopped'
});

const Direction = Object.freeze({
    UP: 'up',
    DOWN: 'down',
    NONE: 'none'
});

/**
 * Elevator - Represents single elevator
 * 
 * DESIGN PATTERN: State Pattern
 */
class Elevator {
    constructor(elevatorId, maxFloor) {
        this.elevatorId = elevatorId;
        this.currentFloor = 0;
        this.state = ElevatorState.IDLE;
        this.maxFloor = maxFloor;
        this.direction = Direction.NONE;
    }

    moveTo(floor) {
        if (floor < 0 || floor > this.maxFloor) {
            console.log(`✗ Invalid floor: ${floor}`);
            return;
        }

        if (floor > this.currentFloor) {
            this.state = ElevatorState.MOVING_UP;
            this.direction = Direction.UP;
        } else if (floor < this.currentFloor) {
            this.state = ElevatorState.MOVING_DOWN;
            this.direction = Direction.DOWN;
        } else {
            console.log(`🛗 Elevator ${this.elevatorId} already at floor ${floor}`);
            return;
        }

        console.log(`🛗 Elevator ${this.elevatorId}: Floor ${this.currentFloor} → ${floor}`);
        this.currentFloor = floor;
        this.state = ElevatorState.STOPPED;
        this.direction = Direction.NONE;
    }

    getDistanceTo(floor) {
        return Math.abs(this.currentFloor - floor);
    }
}

/**
 * ElevatorController - Main controller
 * 
 * DESIGN PATTERN: Singleton + Strategy
 */
class ElevatorController {
    constructor() {
        if (ElevatorController.instance) {
            return ElevatorController.instance;
        }

        this.elevators = new Map();
        ElevatorController.instance = this;
    }

    addElevator(elevator) {
        this.elevators.set(elevator.elevatorId, elevator);
        console.log(`✓ Added elevator ${elevator.elevatorId} (Max floor: ${elevator.maxFloor})`);
    }

    request(floor) {
        if (this.elevators.size === 0) {
            console.log('✗ No elevators available');
            return null;
        }

        // Find nearest elevator
        let nearest = null;
        let minDistance = Infinity;

        for (const elevator of this.elevators.values()) {
            const distance = elevator.getDistanceTo(floor);
            if (distance < minDistance) {
                minDistance = distance;
                nearest = elevator;
            }
        }

        nearest.moveTo(floor);
        return nearest;
    }

    getStatus() {
        console.log('\n📊 Elevator Status:');
        for (const elevator of this.elevators.values()) {
            console.log(`  ${elevator.elevatorId}: Floor ${elevator.currentFloor} - ${elevator.state}`);
        }
    }
}

/**
 * Demonstrate Elevator System
 */
function main() {
    console.log('='.repeat(70));
    console.log('ELEVATOR SYSTEM - Low Level Design Demo');
    console.log('='.repeat(70));

    // Initialize controller
    const controller = new ElevatorController();

    // Add elevators
    console.log('\n🏢 Adding Elevators...');
    controller.addElevator(new Elevator('E1', 10));
    controller.addElevator(new Elevator('E2', 10));
    controller.addElevator(new Elevator('E3', 10));

    // Request elevators
    console.log('\n📞 Processing Requests...');
    controller.request(5);
    controller.request(8);
    controller.request(3);

    // Show status
    controller.getStatus();

    console.log('\n' + '='.repeat(70));
    console.log('DEMO COMPLETE');
    console.log('='.repeat(70));
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ElevatorController,
        Elevator,
        ElevatorState,
        Direction
    };
}

// Run demo if executed directly
if (typeof require !== 'undefined' && require.main === module) {
    main();
}
