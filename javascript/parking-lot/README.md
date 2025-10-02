# Parking Lot System (JavaScript)

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
- Proper error handling for edge cases
- Support both Node.js and browser environments

## Design Decisions

### Key Classes

1. **Vehicle Hierarchy**
   - Abstract `Vehicle` base class (simulated in JavaScript)
   - Concrete classes: `Motorcycle`, `Car`, `Truck`
   - Uses prototype inheritance to model different vehicle types

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

### JavaScript-Specific Features

- **ES6 Classes**: Modern class syntax for better readability
- **Map Objects**: For efficient key-value storage of spots and tickets
- **UUID Generation**: Unique ticket ID generation (with fallback implementation)
- **Module Exports**: CommonJS exports for Node.js compatibility
- **Error Handling**: Proper exception throwing and catching

### Key Features

- **Flexible Spot Assignment**: Smaller vehicles can use larger spots when needed
- **Time-based Pricing**: Hourly rates vary by vehicle type
- **Payment Processing**: Simulated payment system with status tracking
- **Real-time Availability**: Track available spots by type

## Class Structure

```javascript
// Enums (as objects)
VehicleType = { MOTORCYCLE, CAR, TRUCK }
ParkingSpotType = { MOTORCYCLE, CAR, TRUCK }
PaymentStatus = { PENDING, COMPLETED, FAILED }

// Classes
Vehicle (abstract)
├── Motorcycle
├── Car
└── Truck

ParkingSpot
├── spotId: string
├── spotType: ParkingSpotType
├── isOccupied: boolean
└── vehicle: Vehicle

ParkingTicket
├── ticketId: string (UUID)
├── vehicle: Vehicle
├── parkingSpot: ParkingSpot
├── entryTime: Date
├── exitTime: Date
├── fee: number
└── paymentStatus: PaymentStatus

ParkingLot
├── parkingSpots: Map
├── availableSpots: Object
├── occupiedSpots: Map
├── activeTickets: Map
├── parkingRate: ParkingRate
└── paymentProcessor: PaymentProcessor
```

## Usage Example

```javascript
// Create parking lot and add spots
const parkingLot = new ParkingLot("City Center Parking");
parkingLot.addParkingSpot(new ParkingSpot("C1", ParkingSpotType.CAR));

// Park a vehicle
const car = new Car("ABC123");
const ticket = parkingLot.parkVehicle(car);

// Exit and pay
const exitTicket = parkingLot.exitVehicle(ticket.ticketId);
parkingLot.processPayment(ticket.ticketId, "Credit Card");
```

## Running the Code

### Node.js Environment
```bash
# Install dependencies (if using UUID package)
npm install uuid

# Run the demo
node main.js
```

### Browser Environment
```html
<script src="main.js"></script>
<script>
    // Use the exported classes
    const parkingLot = new ParkingLot("My Parking Lot");
    // ... rest of your code
</script>
```

## Extension Points

1. **Reservation System**: Add ability to reserve spots in advance
2. **Dynamic Pricing**: Implement surge pricing during peak hours
3. **Web API**: Create REST endpoints for mobile/web integration
4. **Real-time Updates**: WebSocket integration for live availability
5. **Multi-level Support**: Extend to support multiple parking levels
6. **Analytics Dashboard**: Track usage patterns and revenue

## Error Handling

The system includes comprehensive error handling for:
- Invalid ticket IDs
- Occupied parking spots
- Vehicle type mismatches
- Payment processing failures
- No available spots scenarios

## Performance Considerations

- **Map Usage**: O(1) lookup time for tickets and spots
- **Array Management**: Efficient spot availability tracking
- **Memory Management**: Proper cleanup of completed tickets
- **Time Complexity**: O(1) for most operations

## Dependencies

- **uuid** (optional): For generating unique ticket IDs
- **Node.js**: For server-side execution
- **Modern Browser**: ES6+ support required

## Testing

The code includes a demo function that:
1. Sets up a parking lot with multiple spot types
2. Parks different vehicles
3. Simulates parking duration
4. Processes payments and exits
5. Displays availability throughout the process