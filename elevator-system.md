# Elevator System

## 🔗 Implementation Links

- **Python Implementation**: [python/elevator-system/main.py](python/elevator-system/main.py)
- **JavaScript Implementation**: [javascript/elevator-system/main.js](javascript/elevator-system/main.js)

## Problem Statement

Design an intelligent elevator control system for multi-story buildings that efficiently manages multiple elevators, handles floor requests from users, optimizes wait times, and ensures smooth operation across the building.

## Requirements

### Functional Requirements

- Support multiple elevators in a single building
- Handle floor requests from any floor (up/down buttons)
- Track current floor position of each elevator
- Manage elevator direction (up, down, idle)
- Implement efficient scheduling algorithm to assign requests
- Handle door operations (open, close with timers)
- Support emergency stop functionality
- Display current floor on elevator panel
- Queue multiple floor requests per elevator
- Handle concurrent requests from multiple floors

### Non-Functional Requirements

- Request assignment should be < 1 second
- Support buildings with up to 100 floors
- Handle up to 20 elevators per building
- 99.99% uptime requirement
- Minimize average wait time for passengers
- Energy-efficient scheduling
- Thread-safe for concurrent operations

## Design Decisions

### Key Classes

1. **Elevator Management**
   - `Elevator`: Individual elevator with state and position
   - `ElevatorState`: Enum for elevator states (Idle, MovingUp, MovingDown, Stopped)
   - `Direction`: Movement direction tracking

2. **Request Handling**
   - `Request`: Floor request with direction
   - `RequestQueue`: Priority queue for floor requests
   - `RequestType`: Internal vs external requests

3. **Control System**
   - `ElevatorController`: Main system controller
   - `Scheduler`: Request assignment algorithm
   - `Building`: Building configuration

### Design Patterns Used

1. **State Pattern**: Elevator state management
   - Different states (Idle, Moving Up/Down, Stopped)
   - State-specific behavior and transitions
   - Clean state machine implementation

2. **Strategy Pattern**: Scheduling algorithms
   - Nearest elevator strategy
   - Look algorithm (scan algorithm)
   - Destination dispatch algorithm
   - Easy to switch strategies

3. **Observer Pattern**: Floor request notifications
   - Elevators notified of new requests
   - Floor displays updated on elevator movement
   - Real-time status updates

4. **Singleton Pattern**: Elevator controller
   - Single control system per building
   - Global access point
   - Resource coordination

5. **Command Pattern**: Elevator operations
   - Requests as command objects
   - Queue management
   - Undo capability for request cancellation

### Key Features

- **Intelligent Assignment**: Nearest available elevator selection
- **Energy Optimization**: Minimize empty travel
- **Load Balancing**: Distribute requests across elevators
- **Emergency Handling**: Priority emergency operations

## State Diagram

```text
ELEVATOR STATES:

IDLE (waiting at floor)
  ↓ (receive_request)
MOVING_UP
  ├─→ (reach_floor) → STOPPED
  │                      ↓ (open_doors)
  │                    DOOR_OPEN
  │                      ↓ (close_doors, has_requests_up)
  │                    MOVING_UP
  │                      ↓ (no_more_requests_up)
  │                    IDLE
  └─→ (change_direction) → MOVING_DOWN

MOVING_DOWN
  ├─→ (reach_floor) → STOPPED → DOOR_OPEN → MOVING_DOWN
  └─→ (change_direction) → MOVING_UP

EMERGENCY_STOP
  ↓ (reset)
IDLE
```

## Class Diagram

```text
ElevatorState (Enum)
├── IDLE
├── MOVING_UP
├── MOVING_DOWN
├── STOPPED
└── EMERGENCY_STOP

Direction (Enum)
├── UP
├── DOWN
└── NONE

Elevator
├── elevator_id: str
├── current_floor: int
├── state: ElevatorState
├── direction: Direction
├── max_floor: int
├── request_queue: List[int]
├── move_to(floor) → None
├── add_request(floor) → None
├── get_distance_to(floor) → int
└── update_state() → None

Request
├── request_id: str
├── floor: int
├── direction: Direction
├── timestamp: datetime
└── is_internal: bool

ElevatorController (Singleton)
├── elevators: Dict[str, Elevator]
├── pending_requests: List[Request]
├── scheduler: Scheduler
├── add_elevator(elevator) → None
├── request(floor, direction) → Elevator
├── assign_request(request) → Elevator
└── get_status() → Dict

Scheduler (Strategy)
├── find_best_elevator(request, elevators) → Elevator
└── optimize_routes() → None

Building
├── num_floors: int
├── num_elevators: int
├── controller: ElevatorController
└── initialize() → None
```

## Usage Example

```python
# Initialize building with elevators
controller = ElevatorController()

# Add elevators
elevator1 = Elevator("E1", max_floor=10)
elevator2 = Elevator("E2", max_floor=10)
controller.add_elevator(elevator1)
controller.add_elevator(elevator2)

# Request elevator from floor 5 going up
elevator = controller.request(floor=5, direction=Direction.UP)

# Internal request (passenger inside elevator)
elevator.add_request(8)

# Check status
controller.get_status()
# Output: All elevator positions and states

# Emergency stop
elevator.emergency_stop()
```

## Business Rules

1. **Request Handling Rules**
   - External requests include direction (up/down)
   - Internal requests are always honored
   - Emergency requests have highest priority
   - Cannot request beyond max_floor or below 0

2. **Assignment Rules**
   - Assign nearest available elevator
   - Elevator moving towards request gets priority
   - Idle elevators considered first
   - Load balancing for simultaneous requests

3. **Movement Rules**
   - Elevator stops at all requested floors in current direction
   - Direction changes only when no more requests in current direction
   - Must open doors at destination floor
   - Doors auto-close after timeout (5 seconds)

4. **Safety Rules**
   - Weight limit enforcement
   - Door obstruction detection
   - Emergency stop accessible at all times
   - Regular maintenance scheduling

5. **Energy Efficiency**
   - Return to designated floors when idle
   - Group nearby floor requests
   - Minimize direction changes

## Extension Points

1. **Advanced Scheduling**: Destination dispatch, AI-based prediction
2. **IoT Integration**: Smart building integration, energy monitoring
3. **Access Control**: Card reader, floor access restrictions
4. **Analytics**: Wait time analysis, usage patterns
5. **Maintenance**: Predictive maintenance, automated diagnostics
6. **Multi-Building**: Coordinated control across building complex
7. **VIP Service**: Priority elevator for VIP users
8. **Voice Control**: Voice-activated floor selection

## Security Considerations

- **Access Control**: Restrict access to certain floors
- **Emergency Override**: Fire service access
- **Video Surveillance**: Security monitoring
- **Audit Trail**: Log all elevator movements
- **Tampering Detection**: Sensor validation

## Time Complexity

- **Request Assignment**: O(e) where e is number of elevators
- **Add Request**: O(log r) where r is requests in queue (priority queue)
- **Move Elevator**: O(1) - state update
- **Find Nearest**: O(e) - iterate through elevators
- **Get Status**: O(e) - check all elevators

## Space Complexity

- O(e) for elevator storage where e is number of elevators
- O(r) for pending requests where r is active requests
- O(f × e) for request queues where f is floors, e is elevators
- O(1) for building configuration
- O(h) for movement history where h is history size
