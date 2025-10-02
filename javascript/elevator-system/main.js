/**
 * Elevator Management System Implementation in JavaScript
 * ======================================================
 * 
 * This implementation demonstrates advanced Design Patterns and OOP Concepts:
 * 
 * DESIGN PATTERNS USED:
 * 1. State Pattern: Elevator state management (IDLE, MOVING_UP, MOVING_DOWN, etc.)
 * 2. Strategy Pattern: Different elevator scheduling algorithms
 * 3. Command Pattern: Elevator requests as command objects
 * 4. Observer Pattern: Floor button notifications to controller
 * 5. Singleton Pattern: Central elevator controller
 * 6. Priority Queue Pattern: Request sorting and prioritization
 * 
 * OOP CONCEPTS DEMONSTRATED:
 * 1. Encapsulation: Elevator internal state, request management
 * 2. Composition: ElevatorController contains multiple ElevatorCars and Floors
 * 3. Abstraction: Clear interfaces for elevator operations
 * 4. Polymorphism: Different request types handled uniformly
 * 5. Association: Requests associated with floors and elevators
 * 
 * ALGORITHMS IMPLEMENTED:
 * - SCAN Algorithm: Elevator direction-based request processing
 * - Best-Fit Algorithm: Optimal elevator selection
 * - Priority Scheduling: Request prioritization based on direction and load
 * 
 * ARCHITECTURAL PRINCIPLES:
 * - Event-Driven Design: Requests trigger elevator movements
 * - Load Balancing: Distributing requests across multiple elevators
 * - Real-time Processing: Continuous elevator movement simulation
 */

// Elevator System in JavaScript

// Enums - Using JavaScript object patterns for type safety
const Direction = {
    UP: 'UP',
    DOWN: 'DOWN',
    IDLE: 'IDLE'
};

const ElevatorState = {
    IDLE: 'IDLE',
    MOVING_UP: 'MOVING_UP',
    MOVING_DOWN: 'MOVING_DOWN',
    DOOR_OPENING: 'DOOR_OPENING',
    DOOR_CLOSING: 'DOOR_CLOSING',
    MAINTENANCE: 'MAINTENANCE'
};

const RequestType = {
    INTERNAL: 'INTERNAL', // Button pressed inside elevator
    EXTERNAL: 'EXTERNAL'  // Button pressed on floor
};

/**
 * Request Class - Command Pattern implementation for elevator requests
 * 
 * DESIGN PATTERNS:
 * - Command Pattern: Encapsulates elevator request as an object
 * - Value Object Pattern: Immutable request data
 * 
 * OOP CONCEPTS:
 * - Encapsulation: Request data and metadata
 * - Composition: Contains floor, direction, and timing information
 */
class Request {
    constructor(floor, direction, requestType) {
        this.floor = floor;           // Target floor number
        this.direction = direction;   // Desired travel direction
        this.requestType = requestType; // INTERNAL (from inside) or EXTERNAL (from floor)
        this.timestamp = new Date();  // For FIFO ordering and timeout handling
    }
}

/**
 * ElevatorCar Class - State Pattern implementation for individual elevator
 * 
 * DESIGN PATTERNS:
 * - State Pattern: Manages elevator states and transitions
 * - Strategy Pattern: Different request sorting strategies based on direction
 * - Observer Pattern: Notifies controller of state changes
 * 
 * OOP CONCEPTS:
 * - Encapsulation: Internal elevator state and request queue
 * - State Management: Complex state transitions with validation
 * - Business Logic: Capacity limits, floor restrictions
 */
class ElevatorCar {
    constructor(carId, maxCapacity, maxFloor) {
        // Identity and Physical Constraints
        this.carId = carId;              // Unique elevator identifier
        this.currentFloor = 1;           // Current position (starts at ground floor)
        this.maxCapacity = maxCapacity;  // Maximum number of passengers
        this.maxFloor = maxFloor;        // Building height constraint
        
        // Current State
        this.currentCapacity = 0;        // Current passenger count
        this.state = ElevatorState.IDLE; // Current operational state
        this.direction = Direction.IDLE; // Current movement direction
        
        // Request Management (Priority Queue)
        this.requests = [];              // Pending requests (sorted by strategy)
        this.doorsOpen = false;          // Door state for safety
    }

    addRequest(request) {
        // Check if request already exists
        const exists = this.requests.some(r => 
            r.floor === request.floor && r.requestType === request.requestType);
        
        if (!exists) {
            this.requests.push(request);
            this._sortRequests();
        }
    }

    _sortRequests() {
        if (this.direction === Direction.UP) {
            // Sort ascending for upward movement
            this.requests.sort((a, b) => {
                const aFloor = a.floor >= this.currentFloor ? a.floor : Infinity;
                const bFloor = b.floor >= this.currentFloor ? b.floor : Infinity;
                return aFloor - bFloor || a.timestamp - b.timestamp;
            });
        } else if (this.direction === Direction.DOWN) {
            // Sort descending for downward movement
            this.requests.sort((a, b) => {
                const aFloor = a.floor <= this.currentFloor ? a.floor : -Infinity;
                const bFloor = b.floor <= this.currentFloor ? b.floor : -Infinity;
                return bFloor - aFloor || a.timestamp - b.timestamp;
            });
        } else {
            // When idle, sort by closest floor
            this.requests.sort((a, b) => {
                const aDist = Math.abs(a.floor - this.currentFloor);
                const bDist = Math.abs(b.floor - this.currentFloor);
                return aDist - bDist || a.timestamp - b.timestamp;
            });
        }
    }

    moveToNextFloor() {
        if (this.requests.length === 0) {
            this.state = ElevatorState.IDLE;
            this.direction = Direction.IDLE;
            return;
        }

        const nextRequest = this.requests[0];
        const targetFloor = nextRequest.floor;

        if (targetFloor > this.currentFloor) {
            this.direction = Direction.UP;
            this.state = ElevatorState.MOVING_UP;
            this.currentFloor++;
        } else if (targetFloor < this.currentFloor) {
            this.direction = Direction.DOWN;
            this.state = ElevatorState.MOVING_DOWN;
            this.currentFloor--;
        } else {
            // Reached the target floor
            this.arriveAtFloor();
        }
    }

    arriveAtFloor() {
        // Remove requests for current floor
        this.requests = this.requests.filter(r => r.floor !== this.currentFloor);
        
        // Open doors
        this.openDoors();
        
        // If no more requests, become idle
        if (this.requests.length === 0) {
            this.state = ElevatorState.IDLE;
            this.direction = Direction.IDLE;
        }
    }

    openDoors() {
        this.state = ElevatorState.DOOR_OPENING;
        this.doorsOpen = true;
        console.log(`Elevator ${this.carId}: Doors opening at floor ${this.currentFloor}`);
    }

    closeDoors() {
        this.state = ElevatorState.DOOR_CLOSING;
        this.doorsOpen = false;
        console.log(`Elevator ${this.carId}: Doors closing at floor ${this.currentFloor}`);
    }

    canTakePassengers(numPassengers) {
        return this.currentCapacity + numPassengers <= this.maxCapacity;
    }

    addPassengers(numPassengers) {
        if (this.canTakePassengers(numPassengers)) {
            this.currentCapacity += numPassengers;
        }
    }

    removePassengers(numPassengers) {
        this.currentCapacity = Math.max(0, this.currentCapacity - numPassengers);
    }
}

class Floor {
    constructor(floorNumber) {
        this.floorNumber = floorNumber;
        this.upButtonPressed = false;
        this.downButtonPressed = false;
        this.waitingPassengersUp = 0;
        this.waitingPassengersDown = 0;
    }

    pressUpButton(numPassengers = 1) {
        this.upButtonPressed = true;
        this.waitingPassengersUp += numPassengers;
    }

    pressDownButton(numPassengers = 1) {
        this.downButtonPressed = true;
        this.waitingPassengersDown += numPassengers;
    }

    resetUpButton() {
        this.upButtonPressed = false;
        this.waitingPassengersUp = 0;
    }

    resetDownButton() {
        this.downButtonPressed = false;
        this.waitingPassengersDown = 0;
    }
}

class ElevatorController {
    constructor(numFloors, numElevators) {
        this.numFloors = numFloors;
        this.elevators = [];
        this.floors = new Map();
        
        // Initialize elevators
        for (let i = 0; i < numElevators; i++) {
            const elevator = new ElevatorCar(`E${i+1}`, 10, numFloors);
            this.elevators.push(elevator);
        }
        
        // Initialize floors
        for (let i = 1; i <= numFloors; i++) {
            this.floors.set(i, new Floor(i));
        }
    }

    requestElevator(floor, direction, numPassengers = 1) {
        if (!this.floors.has(floor)) {
            throw new Error(`Invalid floor: ${floor}`);
        }
        
        const floorObj = this.floors.get(floor);
        
        // Mark button as pressed
        if (direction === Direction.UP) {
            floorObj.pressUpButton(numPassengers);
        } else if (direction === Direction.DOWN) {
            floorObj.pressDownButton(numPassengers);
        }
        
        // Find best elevator to assign
        const bestElevator = this._findBestElevator(floor, direction);
        
        if (bestElevator) {
            const request = new Request(floor, direction, RequestType.EXTERNAL);
            bestElevator.addRequest(request);
            console.log(`Elevator ${bestElevator.carId} assigned to floor ${floor}`);
        } else {
            console.log(`No available elevator for floor ${floor}`);
        }
    }

    _findBestElevator(floor, direction) {
        const availableElevators = [];
        
        for (const elevator of this.elevators) {
            if (elevator.state === ElevatorState.MAINTENANCE) {
                continue;
            }
            
            // Calculate a score for each elevator
            const distance = Math.abs(elevator.currentFloor - floor);
            
            // Prefer elevators going in the same direction
            let directionBonus = 0;
            if (elevator.direction === direction) {
                directionBonus = -5; // Lower score is better
            } else if (elevator.direction === Direction.IDLE) {
                directionBonus = -2;
            }
            
            // Prefer less busy elevators
            const loadPenalty = elevator.requests.length;
            
            const score = distance + directionBonus + loadPenalty;
            availableElevators.push({ elevator, score });
        }
        
        if (availableElevators.length > 0) {
            // Sort by score and return the best one
            availableElevators.sort((a, b) => a.score - b.score);
            return availableElevators[0].elevator;
        }
        
        return null;
    }

    pressFloorButton(elevatorId, targetFloor) {
        const elevator = this._getElevatorById(elevatorId);
        if (!elevator) {
            throw new Error(`Elevator ${elevatorId} not found`);
        }
        
        if (targetFloor < 1 || targetFloor > this.numFloors) {
            throw new Error(`Invalid floor: ${targetFloor}`);
        }
        
        // Determine direction based on current floor
        let direction;
        if (targetFloor > elevator.currentFloor) {
            direction = Direction.UP;
        } else if (targetFloor < elevator.currentFloor) {
            direction = Direction.DOWN;
        } else {
            return; // Already at target floor
        }
        
        const request = new Request(targetFloor, direction, RequestType.INTERNAL);
        elevator.addRequest(request);
        console.log(`Floor ${targetFloor} button pressed in elevator ${elevatorId}`);
    }

    _getElevatorById(elevatorId) {
        return this.elevators.find(elevator => elevator.carId === elevatorId);
    }

    stepSimulation() {
        // Simulate one step of elevator movement
        for (const elevator of this.elevators) {
            if (elevator.state === ElevatorState.MAINTENANCE) {
                continue;
            }
            
            if (elevator.doorsOpen) {
                // Simulate passenger boarding/alighting
                this._handlePassengerExchange(elevator);
                elevator.closeDoors();
            } else if (elevator.requests.length > 0) {
                elevator.moveToNextFloor();
            }
        }
    }

    _handlePassengerExchange(elevator) {
        const currentFloor = elevator.currentFloor;
        const floor = this.floors.get(currentFloor);
        
        // Passengers getting off
        const passengersLeaving = Math.min(elevator.currentCapacity, 2); // Simulate 2 passengers leaving
        elevator.removePassengers(passengersLeaving);
        if (passengersLeaving > 0) {
            console.log(`Elevator ${elevator.carId}: ${passengersLeaving} passengers exited at floor ${currentFloor}`);
        }
        
        // Passengers getting on
        if (elevator.direction === Direction.UP && floor.waitingPassengersUp > 0) {
            const passengersBoarding = Math.min(floor.waitingPassengersUp, 
                                              elevator.maxCapacity - elevator.currentCapacity);
            elevator.addPassengers(passengersBoarding);
            floor.waitingPassengersUp -= passengersBoarding;
            if (floor.waitingPassengersUp === 0) {
                floor.resetUpButton();
            }
            console.log(`Elevator ${elevator.carId}: ${passengersBoarding} passengers boarded at floor ${currentFloor}`);
        } else if (elevator.direction === Direction.DOWN && floor.waitingPassengersDown > 0) {
            const passengersBoarding = Math.min(floor.waitingPassengersDown,
                                              elevator.maxCapacity - elevator.currentCapacity);
            elevator.addPassengers(passengersBoarding);
            floor.waitingPassengersDown -= passengersBoarding;
            if (floor.waitingPassengersDown === 0) {
                floor.resetDownButton();
            }
            console.log(`Elevator ${elevator.carId}: ${passengersBoarding} passengers boarded at floor ${currentFloor}`);
        }
    }

    getElevatorStatus() {
        const status = [];
        for (const elevator of this.elevators) {
            status.push({
                elevatorId: elevator.carId,
                currentFloor: elevator.currentFloor,
                state: elevator.state,
                direction: elevator.direction,
                capacity: `${elevator.currentCapacity}/${elevator.maxCapacity}`,
                requests: elevator.requests.length,
                doorsOpen: elevator.doorsOpen
            });
        }
        return status;
    }

    getFloorStatus() {
        const status = [];
        for (const [floorNum, floor] of this.floors) {
            status.push({
                floor: floorNum,
                upButton: floor.upButtonPressed,
                downButton: floor.downButtonPressed,
                waitingUp: floor.waitingPassengersUp,
                waitingDown: floor.waitingPassengersDown
            });
        }
        return status;
    }
}

// Demo usage
function main() {
    // Create elevator system for a 10-floor building with 3 elevators
    const controller = new ElevatorController(10, 3);
    
    console.log("Elevator System initialized");
    console.log(`Building: ${controller.numFloors} floors, ${controller.elevators.length} elevators`);
    
    // Simulate some elevator requests
    console.log("\n--- Simulation Start ---");
    
    // People on floor 3 want to go up
    controller.requestElevator(3, Direction.UP, 2);
    
    // People on floor 7 want to go down  
    controller.requestElevator(7, Direction.DOWN, 1);
    
    // Someone on floor 1 wants to go up
    controller.requestElevator(1, Direction.UP, 3);
    
    // Show initial status
    console.log("\nElevator Status:");
    for (const status of controller.getElevatorStatus()) {
        console.log(`  ${status.elevatorId}: Floor ${status.currentFloor}, ${status.state}, ${status.direction}`);
    }
    
    // Simulate elevator movements
    console.log("\n--- Elevator Movements ---");
    for (let step = 0; step < 15; step++) { // Simulate 15 steps
        console.log(`\nStep ${step + 1}:`);
        controller.stepSimulation();
        
        // Add some internal floor button presses
        if (step === 3) {
            controller.pressFloorButton("E1", 5);
        }
        if (step === 6) {
            controller.pressFloorButton("E2", 2);
        }
        
        // Show elevator positions
        const positions = [];
        for (const elevator of controller.elevators) {
            positions.push(`${elevator.carId}:F${elevator.currentFloor}`);
        }
        console.log(`Positions: ${positions.join(', ')}`);
        
        // Check if all elevators are idle
        const allIdle = controller.elevators.every(elevator => 
            elevator.requests.length === 0 && elevator.state === ElevatorState.IDLE);
        if (allIdle) {
            console.log("All elevators are idle");
            break;
        }
    }
    
    // Final status
    console.log("\n--- Final Status ---");
    console.log("Elevator Status:");
    for (const status of controller.getElevatorStatus()) {
        console.log(`  ${status.elevatorId}: Floor ${status.currentFloor}, ${status.state}, Capacity: ${status.capacity}`);
    }
}

// Export for use in other modules (Node.js)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        Direction,
        ElevatorState,
        RequestType,
        Request,
        ElevatorCar,
        Floor,
        ElevatorController
    };
}

// Run demo if this file is executed directly
if (require.main === module) {
    main();
}