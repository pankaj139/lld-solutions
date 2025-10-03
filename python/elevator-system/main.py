"""ELEVATOR SYSTEM - Patterns: State, Strategy, Observer, Singleton, Command"""
from enum import Enum
from typing import List, Dict

class ElevatorState(Enum):
    IDLE = "idle"
    MOVING_UP = "moving_up"
    MOVING_DOWN = "moving_down"
    STOPPED = "stopped"

class Elevator:
    def __init__(self, elevator_id: str, max_floor: int):
        self.elevator_id = elevator_id
        self.current_floor = 0
        self.state = ElevatorState.IDLE
        self.max_floor = max_floor
    
    def move_to(self, floor: int):
        if floor > self.current_floor:
            self.state = ElevatorState.MOVING_UP
        elif floor < self.current_floor:
            self.state = ElevatorState.MOVING_DOWN
        print(f"🛗 Elevator {self.elevator_id}: {self.current_floor} → {floor}")
        self.current_floor = floor
        self.state = ElevatorState.STOPPED

class ElevatorController:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        self.elevators: Dict[str, Elevator] = {}
        self._initialized = True
    
    def add_elevator(self, elevator: Elevator):
        self.elevators[elevator.elevator_id] = elevator
    
    def request(self, floor: int):
        elevator = min(self.elevators.values(), key=lambda e: abs(e.current_floor - floor))
        elevator.move_to(floor)

def main():
    print("="*70)
    print("ELEVATOR SYSTEM - Demo")
    print("="*70)
    controller = ElevatorController()
    controller.add_elevator(Elevator("E1", 10))
    controller.add_elevator(Elevator("E2", 10))
    controller.request(5)
    controller.request(8)
    print("\n" + "="*70)
    print("DEMO COMPLETE")
    print("="*70)

if __name__ == "__main__":
    main()

