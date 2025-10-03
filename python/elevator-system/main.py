"""
ELEVATOR SYSTEM - Low Level Design Implementation in Python

FILE PURPOSE:
This file implements an elevator control system for multi-story buildings with
efficient floor scheduling, multiple elevators, and intelligent request handling.

DESIGN PATTERNS USED:
1. STATE PATTERN: Elevator state management
   - Different states (Idle, Moving Up/Down, Stopped)
   - State transitions based on requests
   
2. STRATEGY PATTERN: Scheduling algorithms
   - Nearest elevator selection
   - Different scheduling strategies possible
   
3. OBSERVER PATTERN: Floor request notifications
   - Notify elevators of new requests
   - Real-time status updates
   
4. SINGLETON PATTERN: Elevator controller
   - Single control system instance
   
5. COMMAND PATTERN: Elevator operations
   - Request as command objects
   - Queue management

OOP CONCEPTS:
- Encapsulation: Internal state management
- Abstraction: Controller interface
- Polymorphism: Different elevator types

SOLID PRINCIPLES:
- SRP: Each class has single responsibility
- OCP: Easy to extend with new strategies
- DIP: Depends on abstractions

USAGE:
    controller = ElevatorController()
    elevator = Elevator("E1", 10)
    controller.add_elevator(elevator)
    controller.request(5)  # Request elevator to floor 5

EXPECTED RETURN:
    Elevator assignment and movement to requested floor
"""

from enum import Enum
from typing import List, Dict, Optional


class ElevatorState(Enum):
    """Elevator operational states"""
    IDLE = "idle"
    MOVING_UP = "moving_up"
    MOVING_DOWN = "moving_down"
    STOPPED = "stopped"


class Direction(Enum):
    """Movement direction"""
    UP = "up"
    DOWN = "down"
    NONE = "none"


class Elevator:
    """
    Represents a single elevator
    
    DESIGN PATTERN: State Pattern
    - Manages elevator state transitions
    """
    
    def __init__(self, elevator_id: str, max_floor: int):
        """
        Initialize elevator
        
        Args:
            elevator_id: Unique identifier
            max_floor: Maximum floor number
        """
        self.elevator_id = elevator_id
        self.current_floor = 0
        self.state = ElevatorState.IDLE
        self.max_floor = max_floor
        self.direction = Direction.NONE
    
    def move_to(self, floor: int):
        """
        Move elevator to requested floor
        
        Args:
            floor: Target floor number
        """
        if floor < 0 or floor > self.max_floor:
            print(f"✗ Invalid floor: {floor}")
            return
        
        if floor > self.current_floor:
            self.state = ElevatorState.MOVING_UP
            self.direction = Direction.UP
        elif floor < self.current_floor:
            self.state = ElevatorState.MOVING_DOWN
            self.direction = Direction.DOWN
        else:
            print(f"🛗 Elevator {self.elevator_id} already at floor {floor}")
            return
        
        print(f"🛗 Elevator {self.elevator_id}: Floor {self.current_floor} → {floor}")
        self.current_floor = floor
        self.state = ElevatorState.STOPPED
        self.direction = Direction.NONE
    
    def get_distance_to(self, floor: int) -> int:
        """Calculate distance to floor"""
        return abs(self.current_floor - floor)


class ElevatorController:
    """
    Main controller for elevator system
    
    DESIGN PATTERN: Singleton Pattern + Strategy Pattern
    - Single controller instance
    - Pluggable scheduling strategies
    """
    
    _instance = None
    
    def __new__(cls):
        """Singleton implementation"""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        """Initialize controller"""
        if self._initialized:
            return
        
        self.elevators: Dict[str, Elevator] = {}
        self._initialized = True
    
    def add_elevator(self, elevator: Elevator):
        """
        Add elevator to system
        
        Args:
            elevator: Elevator instance to add
        """
        self.elevators[elevator.elevator_id] = elevator
        print(f"✓ Added elevator {elevator.elevator_id} (Max floor: {elevator.max_floor})")
    
    def request(self, floor: int) -> Optional[Elevator]:
        """
        Request elevator to floor
        
        STRATEGY PATTERN: Nearest elevator selection
        
        Args:
            floor: Requested floor
            
        Returns:
            Assigned elevator or None
        """
        if not self.elevators:
            print("✗ No elevators available")
            return None
        
        # Find nearest available elevator
        nearest = min(
            self.elevators.values(),
            key=lambda e: e.get_distance_to(floor)
        )
        
        nearest.move_to(floor)
        return nearest
    
    def get_status(self):
        """Display status of all elevators"""
        print("\n📊 Elevator Status:")
        for elevator in self.elevators.values():
            print(f"  {elevator.elevator_id}: Floor {elevator.current_floor} - {elevator.state.value}")


def main():
    """Demonstrate Elevator System"""
    print("=" * 70)
    print("ELEVATOR SYSTEM - Low Level Design Demo")
    print("=" * 70)
    
    # Initialize controller
    controller = ElevatorController()
    
    # Add elevators
    print("\n🏢 Adding Elevators...")
    controller.add_elevator(Elevator("E1", 10))
    controller.add_elevator(Elevator("E2", 10))
    controller.add_elevator(Elevator("E3", 10))
    
    # Request elevators
    print("\n📞 Processing Requests...")
    controller.request(5)
    controller.request(8)
    controller.request(3)
    
    # Show status
    controller.get_status()
    
    print("\n" + "=" * 70)
    print("DEMO COMPLETE")
    print("=" * 70)


if __name__ == "__main__":
    main()
