from abc import ABC, abstractmethod
from enum import Enum
from datetime import datetime
from typing import List, Dict, Optional
import uuid

class Direction(Enum):
    UP = 1
    DOWN = 2
    IDLE = 3

class ElevatorState(Enum):
    IDLE = 1
    MOVING_UP = 2
    MOVING_DOWN = 3
    DOOR_OPENING = 4
    DOOR_CLOSING = 5
    MAINTENANCE = 6

class RequestType(Enum):
    INTERNAL = 1  # Button pressed inside elevator
    EXTERNAL = 2  # Button pressed on floor

class Request:
    def __init__(self, floor: int, direction: Direction, request_type: RequestType):
        self.floor = floor
        self.direction = direction
        self.request_type = request_type
        self.timestamp = datetime.now()

class ElevatorCar:
    def __init__(self, car_id: str, max_capacity: int, max_floor: int):
        self.car_id = car_id
        self.current_floor = 1
        self.max_capacity = max_capacity
        self.max_floor = max_floor
        self.current_capacity = 0
        self.state = ElevatorState.IDLE
        self.direction = Direction.IDLE
        self.requests: List[Request] = []
        self.doors_open = False

    def add_request(self, request: Request):
        if request not in self.requests:
            self.requests.append(request)
            self._sort_requests()

    def _sort_requests(self):
        # Sort requests based on current direction and floor
        if self.direction == Direction.UP:
            # Sort ascending for upward movement
            self.requests.sort(key=lambda r: (r.floor if r.floor >= self.current_floor else float('inf'), r.timestamp))
        elif self.direction == Direction.DOWN:
            # Sort descending for downward movement  
            self.requests.sort(key=lambda r: (-r.floor if r.floor <= self.current_floor else float('-inf'), r.timestamp))
        else:
            # When idle, sort by closest floor
            self.requests.sort(key=lambda r: (abs(r.floor - self.current_floor), r.timestamp))

    def move_to_next_floor(self):
        if not self.requests:
            self.state = ElevatorState.IDLE
            self.direction = Direction.IDLE
            return

        next_request = self.requests[0]
        target_floor = next_request.floor

        if target_floor > self.current_floor:
            self.direction = Direction.UP
            self.state = ElevatorState.MOVING_UP
            self.current_floor += 1
        elif target_floor < self.current_floor:
            self.direction = Direction.DOWN
            self.state = ElevatorState.MOVING_DOWN
            self.current_floor -= 1
        else:
            # Reached the target floor
            self.arrive_at_floor()

    def arrive_at_floor(self):
        # Remove requests for current floor
        self.requests = [r for r in self.requests if r.floor != self.current_floor]
        
        # Open doors
        self.open_doors()
        
        # If no more requests, become idle
        if not self.requests:
            self.state = ElevatorState.IDLE
            self.direction = Direction.IDLE

    def open_doors(self):
        self.state = ElevatorState.DOOR_OPENING
        self.doors_open = True
        print(f"Elevator {self.car_id}: Doors opening at floor {self.current_floor}")

    def close_doors(self):
        self.state = ElevatorState.DOOR_CLOSING
        self.doors_open = False
        print(f"Elevator {self.car_id}: Doors closing at floor {self.current_floor}")

    def can_take_passengers(self, num_passengers: int) -> bool:
        return self.current_capacity + num_passengers <= self.max_capacity

    def add_passengers(self, num_passengers: int):
        if self.can_take_passengers(num_passengers):
            self.current_capacity += num_passengers

    def remove_passengers(self, num_passengers: int):
        self.current_capacity = max(0, self.current_capacity - num_passengers)

class Floor:
    def __init__(self, floor_number: int):
        self.floor_number = floor_number
        self.up_button_pressed = False
        self.down_button_pressed = False
        self.waiting_passengers_up = 0
        self.waiting_passengers_down = 0

    def press_up_button(self, num_passengers: int = 1):
        self.up_button_pressed = True
        self.waiting_passengers_up += num_passengers

    def press_down_button(self, num_passengers: int = 1):
        self.down_button_pressed = True
        self.waiting_passengers_down += num_passengers

    def reset_up_button(self):
        self.up_button_pressed = False
        self.waiting_passengers_up = 0

    def reset_down_button(self):
        self.down_button_pressed = False
        self.waiting_passengers_down = 0

class ElevatorController:
    def __init__(self, num_floors: int, num_elevators: int):
        self.num_floors = num_floors
        self.elevators: List[ElevatorCar] = []
        self.floors: Dict[int, Floor] = {}
        
        # Initialize elevators
        for i in range(num_elevators):
            elevator = ElevatorCar(f"E{i+1}", max_capacity=10, max_floor=num_floors)
            self.elevators.append(elevator)
        
        # Initialize floors
        for i in range(1, num_floors + 1):
            self.floors[i] = Floor(i)

    def request_elevator(self, floor: int, direction: Direction, num_passengers: int = 1):
        if floor not in self.floors:
            raise Exception(f"Invalid floor: {floor}")
        
        floor_obj = self.floors[floor]
        
        # Mark button as pressed
        if direction == Direction.UP:
            floor_obj.press_up_button(num_passengers)
        elif direction == Direction.DOWN:
            floor_obj.press_down_button(num_passengers)
        
        # Find best elevator to assign
        best_elevator = self._find_best_elevator(floor, direction)
        
        if best_elevator:
            request = Request(floor, direction, RequestType.EXTERNAL)
            best_elevator.add_request(request)
            print(f"Elevator {best_elevator.car_id} assigned to floor {floor}")
        else:
            print(f"No available elevator for floor {floor}")

    def _find_best_elevator(self, floor: int, direction: Direction) -> Optional[ElevatorCar]:
        available_elevators = []
        
        for elevator in self.elevators:
            if elevator.state == ElevatorState.MAINTENANCE:
                continue
            
            # Calculate a score for each elevator
            distance = abs(elevator.current_floor - floor)
            
            # Prefer elevators going in the same direction
            direction_bonus = 0
            if elevator.direction == direction:
                direction_bonus = -5  # Lower score is better
            elif elevator.direction == Direction.IDLE:
                direction_bonus = -2
            
            # Prefer less busy elevators
            load_penalty = len(elevator.requests)
            
            score = distance + direction_bonus + load_penalty
            available_elevators.append((elevator, score))
        
        if available_elevators:
            # Sort by score and return the best one
            available_elevators.sort(key=lambda x: x[1])
            return available_elevators[0][0]
        
        return None

    def press_floor_button(self, elevator_id: str, target_floor: int):
        elevator = self._get_elevator_by_id(elevator_id)
        if not elevator:
            raise Exception(f"Elevator {elevator_id} not found")
        
        if target_floor < 1 or target_floor > self.num_floors:
            raise Exception(f"Invalid floor: {target_floor}")
        
        # Determine direction based on current floor
        if target_floor > elevator.current_floor:
            direction = Direction.UP
        elif target_floor < elevator.current_floor:
            direction = Direction.DOWN
        else:
            return  # Already at target floor
        
        request = Request(target_floor, direction, RequestType.INTERNAL)
        elevator.add_request(request)
        print(f"Floor {target_floor} button pressed in elevator {elevator_id}")

    def _get_elevator_by_id(self, elevator_id: str) -> Optional[ElevatorCar]:
        for elevator in self.elevators:
            if elevator.car_id == elevator_id:
                return elevator
        return None

    def step_simulation(self):
        """Simulate one step of elevator movement"""
        for elevator in self.elevators:
            if elevator.state == ElevatorState.MAINTENANCE:
                continue
            
            if elevator.doors_open:
                # Simulate passenger boarding/alighting
                self._handle_passenger_exchange(elevator)
                elevator.close_doors()
            elif elevator.requests:
                elevator.move_to_next_floor()

    def _handle_passenger_exchange(self, elevator: ElevatorCar):
        current_floor = elevator.current_floor
        floor = self.floors[current_floor]
        
        # Passengers getting off
        passengers_leaving = min(elevator.current_capacity, 2)  # Simulate 2 passengers leaving
        elevator.remove_passengers(passengers_leaving)
        if passengers_leaving > 0:
            print(f"Elevator {elevator.car_id}: {passengers_leaving} passengers exited at floor {current_floor}")
        
        # Passengers getting on
        if elevator.direction == Direction.UP and floor.waiting_passengers_up > 0:
            passengers_boarding = min(floor.waiting_passengers_up, 
                                    elevator.max_capacity - elevator.current_capacity)
            elevator.add_passengers(passengers_boarding)
            floor.waiting_passengers_up -= passengers_boarding
            if floor.waiting_passengers_up == 0:
                floor.reset_up_button()
            print(f"Elevator {elevator.car_id}: {passengers_boarding} passengers boarded at floor {current_floor}")
        
        elif elevator.direction == Direction.DOWN and floor.waiting_passengers_down > 0:
            passengers_boarding = min(floor.waiting_passengers_down,
                                    elevator.max_capacity - elevator.current_capacity)
            elevator.add_passengers(passengers_boarding)
            floor.waiting_passengers_down -= passengers_boarding
            if floor.waiting_passengers_down == 0:
                floor.reset_down_button()
            print(f"Elevator {elevator.car_id}: {passengers_boarding} passengers boarded at floor {current_floor}")

    def get_elevator_status(self) -> List[Dict]:
        status = []
        for elevator in self.elevators:
            status.append({
                "elevator_id": elevator.car_id,
                "current_floor": elevator.current_floor,
                "state": elevator.state.name,
                "direction": elevator.direction.name,
                "capacity": f"{elevator.current_capacity}/{elevator.max_capacity}",
                "requests": len(elevator.requests),
                "doors_open": elevator.doors_open
            })
        return status

    def get_floor_status(self) -> List[Dict]:
        status = []
        for floor_num, floor in self.floors.items():
            status.append({
                "floor": floor_num,
                "up_button": floor.up_button_pressed,
                "down_button": floor.down_button_pressed,
                "waiting_up": floor.waiting_passengers_up,
                "waiting_down": floor.waiting_passengers_down
            })
        return status

# Demo usage
def main():
    # Create elevator system for a 10-floor building with 3 elevators
    controller = ElevatorController(num_floors=10, num_elevators=3)
    
    print("Elevator System initialized")
    print(f"Building: {controller.num_floors} floors, {len(controller.elevators)} elevators")
    
    # Simulate some elevator requests
    print("\n--- Simulation Start ---")
    
    # People on floor 3 want to go up
    controller.request_elevator(3, Direction.UP, 2)
    
    # People on floor 7 want to go down  
    controller.request_elevator(7, Direction.DOWN, 1)
    
    # Someone on floor 1 wants to go up
    controller.request_elevator(1, Direction.UP, 3)
    
    # Show initial status
    print("\nElevator Status:")
    for status in controller.get_elevator_status():
        print(f"  {status['elevator_id']}: Floor {status['current_floor']}, {status['state']}, {status['direction']}")
    
    # Simulate elevator movements
    print("\n--- Elevator Movements ---")
    for step in range(15):  # Simulate 15 steps
        print(f"\nStep {step + 1}:")
        controller.step_simulation()
        
        # Add some internal floor button presses
        if step == 3:
            controller.press_floor_button("E1", 5)
        if step == 6:
            controller.press_floor_button("E2", 2)
        
        # Show elevator positions
        positions = []
        for elevator in controller.elevators:
            positions.append(f"{elevator.car_id}:F{elevator.current_floor}")
        print(f"Positions: {', '.join(positions)}")
        
        # Check if all elevators are idle
        all_idle = all(len(elevator.requests) == 0 and elevator.state == ElevatorState.IDLE 
                      for elevator in controller.elevators)
        if all_idle:
            print("All elevators are idle")
            break
    
    # Final status
    print("\n--- Final Status ---")
    print("Elevator Status:")
    for status in controller.get_elevator_status():
        print(f"  {status['elevator_id']}: Floor {status['current_floor']}, "
              f"{status['state']}, Capacity: {status['capacity']}")

if __name__ == "__main__":
    main()