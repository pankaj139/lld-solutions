# Elevator System

## 🔗 Implementation Links

- **Python**: [python/elevator-system/main.py](python/elevator-system/main.py)
- **JavaScript**: [javascript/elevator-system/main.js](javascript/elevator-system/main.js)

## Problem Statement

Design elevator control system for multi-story buildings with efficient floor scheduling.

## Requirements

- Multiple elevators in building
- Request elevator from any floor
- Efficient scheduling algorithm
- Track elevator direction and position
- Handle door operations

## Design Patterns

State, Strategy, Observer, Singleton, Command

## State Diagram

```text
IDLE → MOVING_UP/MOVING_DOWN → STOPPED → IDLE
```

## Time Complexity

- Request: O(e) where e is elevators
- Move: O(1)

## Space Complexity

- O(e) for elevators
- O(r) for requests

