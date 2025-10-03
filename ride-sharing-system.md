# Ride Sharing System

## 🔗 Implementation Links

- **Python Implementation**: [python/ride-sharing/main.py](python/ride-sharing/main.py)
- **JavaScript Implementation**: [javascript/ride-sharing/main.js](javascript/ride-sharing/main.js)

## Problem Statement

Design a ride-sharing platform (like Uber/Lyft) that can match riders with drivers, handle ride requests, track rides in real-time, and process payments.

## Requirements

### Functional Requirements

- Register riders and drivers with profiles
- Request ride with pickup and destination
- Match rider with nearby available driver
- Calculate fare based on distance and time
- Track ride status (Requested, Accepted, InProgress, Completed)
- Support multiple ride types (Economy, Premium, Shared)
- Handle payment processing
- Rate drivers and riders
- View ride history

### Non-Functional Requirements

- Ride matching < 30 seconds
- Real-time location tracking
- Support 100,000+ concurrent rides
- 99.9% availability
- Scalable pricing algorithm

## Design Decisions

### Design Patterns Used

1. **State Pattern**: Ride status management
2. **Strategy Pattern**: Pricing strategies, matching algorithms
3. **Observer Pattern**: Location updates, ride notifications
4. **Factory Pattern**: Ride type creation
5. **Singleton Pattern**: RideService
6. **Command Pattern**: Ride operations

## State Diagram

```text
RIDE LIFECYCLE:
REQUESTED → ACCEPTED → IN_PROGRESS → COMPLETED → RATED
         ↓           ↓
    CANCELLED   CANCELLED
```

## Class Diagram

```text
RideStatus (Enum)
├── REQUESTED
├── ACCEPTED
├── IN_PROGRESS
├── COMPLETED
└── CANCELLED

RideType (Enum)
├── ECONOMY
├── PREMIUM
└── SHARED

Location
├── latitude: float
├── longitude: float
└── distance_to(other) → float

Rider
├── rider_id: str
├── name: str
├── rating: float
└── request_ride(pickup, destination, type) → Ride

Driver
├── driver_id: str
├── name: str
├── vehicle: Vehicle
├── location: Location
├── is_available: bool
└── accept_ride(ride) → bool

Ride
├── ride_id: str
├── rider: Rider
├── driver: Driver
├── pickup_location: Location
├── destination: Location
├── status: RideStatus
├── fare: float
└── update_status(status) → None

RideService (Singleton)
├── riders: Dict
├── drivers: Dict
├── rides: Dict
├── request_ride(rider_id, pickup, destination, type) → Ride
├── match_driver(ride) → Driver
└── complete_ride(ride_id) → None
```

## Time Complexity

- **Match Driver**: O(d) where d is nearby drivers
- **Calculate Fare**: O(1)
- **Request Ride**: O(d) for matching

## Space Complexity

- O(r) for riders
- O(d) for drivers
- O(a) for active rides

