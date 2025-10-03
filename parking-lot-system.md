# Parking Lot System

## 🔗 Implementation Links

- **Python Implementation**: [python/parking-lot/main.py](python/parking-lot/main.py)
- **JavaScript Implementation**: [javascript/parking-lot/main.js](javascript/parking-lot/main.js)

## Problem Statement

Design a parking lot system that can:

1. **Park different types of vehicles** (motorcycle, car, truck)
2. **Track available parking spots** for each vehicle type
3. **Generate parking tickets** with entry time
4. **Calculate parking fees** based on duration and vehicle type
5. **Process payments** and free up parking spots
6. **Handle edge cases** like no available spots

## Requirements

### Functional Requirements

- Support multiple vehicle types with different parking spot requirements
- Track parking spot availability in real-time
- Generate unique tickets for each parking session
- Calculate fees based on hourly rates for different vehicle types
- Process payments and manage spot allocation
- Handle vehicle entry and exit operations

### Non-Functional Requirements

- System should be extensible for new vehicle types
- Fast lookup for available parking spots
- Thread-safe operations for concurrent access
- Proper error handling for edge cases

## Design Decisions

### Key Classes

1. **Vehicle Hierarchy**
   - Abstract `Vehicle` base class
   - Concrete classes: `Motorcycle`, `Car`, `Truck`
   - Uses inheritance to model different vehicle types

2. **ParkingSpot**
   - Represents individual parking spaces
   - Tracks occupancy status and parked vehicle
   - Validates vehicle compatibility with spot type

3. **ParkingTicket**
   - Stores parking session information
   - Tracks entry/exit times and payment status
   - Links vehicle to parking spot

4. **ParkingLot** (Main System)
   - Manages all parking spots and active tickets
   - Implements vehicle parking and exit logic
   - Handles payment processing and fee calculation

### Design Patterns Used

1. **Template Method**: Vehicle class hierarchy
2. **Strategy Pattern**: Different parking rates for vehicle types
3. **Factory Method**: Could be extended for vehicle creation
4. **State Pattern**: Parking spot occupancy states

### Key Features

- **Flexible Spot Assignment**: Smaller vehicles can use larger spots when needed
- **Time-based Pricing**: Hourly rates vary by vehicle type
- **Payment Processing**: Simulated payment system with status tracking
- **Real-time Availability**: Track available spots by type

## Class Diagram

```text
Vehicle (Abstract)
├── Motorcycle
├── Car
└── Truck

ParkingSpot
├── spot_id: str
├── spot_type: ParkingSpotType
├── is_occupied: bool
└── vehicle: Vehicle

ParkingTicket
├── ticket_id: str
├── vehicle: Vehicle
├── parking_spot: ParkingSpot
├── entry_time: datetime
├── exit_time: datetime
├── fee: float
└── payment_status: PaymentStatus

ParkingLot
├── parking_spots: dict
├── available_spots: dict
├── occupied_spots: dict
├── active_tickets: dict
├── parking_rate: ParkingRate
└── payment_processor: PaymentProcessor
```

## Usage Example

```python
# Create parking lot and add spots
parking_lot = ParkingLot("City Center Parking")
parking_lot.add_parking_spot(ParkingSpot("C1", ParkingSpotType.CAR))

# Park a vehicle
car = Car("ABC123")
ticket = parking_lot.park_vehicle(car)

# Exit and pay
exit_ticket = parking_lot.exit_vehicle(ticket.ticket_id)
parking_lot.process_payment(ticket.ticket_id, "Credit Card")
```

## Extension Points

1. **Reservation System**: Add ability to reserve spots in advance
2. **Dynamic Pricing**: Implement surge pricing during peak hours
3. **Mobile Integration**: Add QR code generation for tickets
4. **Analytics**: Track usage patterns and revenue
5. **Multi-level Support**: Extend to support multiple parking levels
6. **VIP Parking**: Special spots for premium customers

## Time Complexity

- **Park Vehicle**: O(1) average case with proper spot indexing
- **Exit Vehicle**: O(1) with ticket ID lookup
- **Find Available Spot**: O(1) with categorized available spots list
- **Payment Processing**: O(1) for ticket operations

## Space Complexity

- O(n) where n is the total number of parking spots
- Additional O(m) for active tickets where m is concurrent parked vehicles
