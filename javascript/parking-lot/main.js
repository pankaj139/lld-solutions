/**
 * Parking Lot Management System Implementation in JavaScript
 * =========================================================
 * 
 * This implementation demonstrates several key Design Patterns and OOP Concepts:
 * 
 * DESIGN PATTERNS USED:
 * 1. Strategy Pattern: Different parking strategies for different vehicle types
 * 2. Abstract Factory Pattern: Vehicle creation (Vehicle abstract class)
 * 3. State Pattern: Parking spot status management
 * 4. Observer Pattern: Payment status updates
 * 5. Command Pattern: Parking and exit operations
 * 6. Composite Pattern: ParkingLot composed of multiple ParkingSpots
 * 
 * OOP CONCEPTS DEMONSTRATED:
 * 1. Inheritance: Vehicle -> Motorcycle/Car/Truck hierarchy
 * 2. Polymorphism: Different vehicle types, same interface
 * 3. Encapsulation: Private validation methods, internal state
 * 4. Abstraction: Vehicle abstract class, clear interfaces
 * 5. Composition: ParkingLot contains ParkingSpots, Tickets contain Vehicles
 * 
 * ARCHITECTURAL PRINCIPLES:
 * - Single Responsibility: Each class handles one concern
 * - Open/Closed: Easy to add new vehicle types or payment methods
 * - Liskov Substitution: Any vehicle can be parked using same interface
 * - Interface Segregation: Focused, minimal interfaces
 * - Dependency Inversion: High-level modules don't depend on low-level details
 */

// Simple UUID generator (no external dependencies)
function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Enums
const VehicleType = {
    MOTORCYCLE: 'MOTORCYCLE',
    CAR: 'CAR',
    TRUCK: 'TRUCK'
};

const ParkingSpotType = {
    MOTORCYCLE: 'MOTORCYCLE',
    CAR: 'CAR',
    TRUCK: 'TRUCK'
};

const PaymentStatus = {
    PENDING: 'PENDING',
    COMPLETED: 'COMPLETED',
    FAILED: 'FAILED'
};

/**
 * Abstract Vehicle Class - Base class for all vehicle types
 * 
 * DESIGN PATTERNS:
 * - Abstract Factory Pattern: Base class for vehicle creation
 * - Template Method Pattern: Common vehicle structure
 * 
 * OOP CONCEPTS:
 * - Inheritance: Base class for vehicle hierarchy
 * - Encapsulation: Vehicle properties and type management
 * - Abstraction: Cannot be instantiated directly (abstract class simulation)
 */
class Vehicle {
    constructor(licensePlate, vehicleType) {
        // Abstract Class Pattern: Prevent direct instantiation
        if (this.constructor === Vehicle) {
            throw new Error("Cannot instantiate abstract class Vehicle");
        }
        this.licensePlate = licensePlate;  // Unique identifier
        this.vehicleType = vehicleType;    // Type classification
    }
}

/**
 * Concrete Vehicle Classes - Inheritance and Polymorphism demonstration
 * 
 * These classes demonstrate:
 * - Inheritance: Extending Vehicle base class
 * - Polymorphism: Different types, same interface
 * - Specialization: Each vehicle type has specific characteristics
 */

// Motorcycle: Smallest vehicle, can fit in any spot
class Motorcycle extends Vehicle {
    constructor(licensePlate) {
        super(licensePlate, VehicleType.MOTORCYCLE);  // Call parent constructor
    }
}

// Car: Medium vehicle, fits in car and truck spots
class Car extends Vehicle {
    constructor(licensePlate) {
        super(licensePlate, VehicleType.CAR);
    }
}

// Truck: Largest vehicle, only fits in truck spots
class Truck extends Vehicle {
    constructor(licensePlate) {
        super(licensePlate, VehicleType.TRUCK);
    }
}

/**
 * ParkingSpot Class - Represents individual parking spaces
 * 
 * DESIGN PATTERNS:
 * - State Pattern: Manages occupied/available states
 * - Strategy Pattern: Different fitting strategies for different spot types
 * 
 * OOP CONCEPTS:
 * - Encapsulation: Spot state and vehicle management
 * - Business Logic: Vehicle-spot compatibility rules
 * - State Management: Tracks occupancy and vehicle assignment
 */
class ParkingSpot {
    constructor(spotId, spotType) {
        this.spotId = spotId;          // Unique spot identifier
        this.spotType = spotType;      // Spot size classification
        this.isOccupied = false;       // State: occupancy status
        this.vehicle = null;           // Currently parked vehicle (if any)
    }

    /**
     * Command Pattern: Park vehicle operation
     * 
     * Demonstrates:
     * - Pre-condition validation
     * - State mutation
     * - Business rule enforcement
     */
    parkVehicle(vehicle) {
        // Pre-condition: Check if spot is available
        if (this.isOccupied) {
            throw new Error("Parking spot is already occupied");
        }

        // Business Rule: Validate vehicle-spot compatibility
        if (!this._canFitVehicle(vehicle)) {
            throw new Error("Vehicle cannot fit in this spot");
        }

        // State Change: Mark as occupied and assign vehicle
        this.isOccupied = true;
        this.vehicle = vehicle;
    }

    /**
     * Command Pattern: Remove vehicle operation
     * 
     * Demonstrates:
     * - State reset
     * - Return value pattern
     */
    removeVehicle() {
        this.isOccupied = false;
        const vehicle = this.vehicle;
        this.vehicle = null;
        return vehicle;  // Return removed vehicle for confirmation
    }

    /**
     * Strategy Pattern: Vehicle fitting algorithm
     * 
     * Business Rules (Flexible Parking Strategy):
     * - Trucks: Only truck spots
     * - Cars: Car spots or truck spots (if needed)
     * - Motorcycles: Any spot type (most flexible)
     * 
     * This private method encapsulates the parking strategy logic
     */
    _canFitVehicle(vehicle) {
        return (this.spotType === ParkingSpotType.TRUCK ||
                (this.spotType === ParkingSpotType.CAR && vehicle.vehicleType !== VehicleType.TRUCK) ||
                (this.spotType === ParkingSpotType.MOTORCYCLE && vehicle.vehicleType === VehicleType.MOTORCYCLE));
    }
}

// Parking ticket class
class ParkingTicket {
    constructor(vehicle, parkingSpot, entryTime) {
        this.ticketId = uuidv4();
        this.vehicle = vehicle;
        this.parkingSpot = parkingSpot;
        this.entryTime = entryTime;
        this.exitTime = null;
        this.fee = 0.0;
        this.paymentStatus = PaymentStatus.PENDING;
    }
}

// Parking rate calculator
class ParkingRate {
    constructor() {
        this.hourlyRates = {
            [VehicleType.MOTORCYCLE]: 2.0,
            [VehicleType.CAR]: 5.0,
            [VehicleType.TRUCK]: 10.0
        };
    }

    calculateFee(vehicleType, hours) {
        return this.hourlyRates[vehicleType] * hours;
    }
}

// Payment processor
class PaymentProcessor {
    processPayment(amount, paymentMethod) {
        // Simulate payment processing
        console.log(`Processing payment of $${amount} via ${paymentMethod}`);
        return true;
    }
}

// Main parking lot system
class ParkingLot {
    constructor(name) {
        this.name = name;
        this.parkingSpots = new Map();
        this.availableSpots = {
            [ParkingSpotType.MOTORCYCLE]: [],
            [ParkingSpotType.CAR]: [],
            [ParkingSpotType.TRUCK]: []
        };
        this.occupiedSpots = new Map();
        this.activeTickets = new Map();
        this.parkingRate = new ParkingRate();
        this.paymentProcessor = new PaymentProcessor();
    }

    addParkingSpot(parkingSpot) {
        this.parkingSpots.set(parkingSpot.spotId, parkingSpot);
        this.availableSpots[parkingSpot.spotType].push(parkingSpot);
    }

    findAvailableSpot(vehicleType) {
        // Find the best fitting spot for the vehicle
        if (vehicleType === VehicleType.MOTORCYCLE) {
            // Motorcycle can park in any spot, but prefer motorcycle spots
            const spotTypes = [ParkingSpotType.MOTORCYCLE, ParkingSpotType.CAR, ParkingSpotType.TRUCK];
            for (const spotType of spotTypes) {
                if (this.availableSpots[spotType].length > 0) {
                    return this.availableSpots[spotType][0];
                }
            }
        } else if (vehicleType === VehicleType.CAR) {
            // Car can park in car or truck spots
            const spotTypes = [ParkingSpotType.CAR, ParkingSpotType.TRUCK];
            for (const spotType of spotTypes) {
                if (this.availableSpots[spotType].length > 0) {
                    return this.availableSpots[spotType][0];
                }
            }
        } else if (vehicleType === VehicleType.TRUCK) {
            // Truck can only park in truck spots
            if (this.availableSpots[ParkingSpotType.TRUCK].length > 0) {
                return this.availableSpots[ParkingSpotType.TRUCK][0];
            }
        }

        return null;
    }

    parkVehicle(vehicle) {
        const spot = this.findAvailableSpot(vehicle.vehicleType);
        if (!spot) {
            throw new Error("No available parking spot for this vehicle type");
        }

        // Park the vehicle
        spot.parkVehicle(vehicle);

        // Move spot from available to occupied
        const spotTypeArray = this.availableSpots[spot.spotType];
        const index = spotTypeArray.indexOf(spot);
        spotTypeArray.splice(index, 1);
        this.occupiedSpots.set(spot.spotId, spot);

        // Create and store ticket
        const ticket = new ParkingTicket(vehicle, spot, new Date());
        this.activeTickets.set(ticket.ticketId, ticket);

        return ticket;
    }

    exitVehicle(ticketId) {
        if (!this.activeTickets.has(ticketId)) {
            throw new Error("Invalid ticket");
        }

        const ticket = this.activeTickets.get(ticketId);
        ticket.exitTime = new Date();

        // Calculate fee
        const durationHours = (ticket.exitTime - ticket.entryTime) / (1000 * 60 * 60);
        const billableHours = Math.max(1, durationHours); // Minimum 1 hour
        ticket.fee = this.parkingRate.calculateFee(ticket.vehicle.vehicleType, billableHours);

        return ticket;
    }

    processPayment(ticketId, paymentMethod) {
        if (!this.activeTickets.has(ticketId)) {
            throw new Error("Invalid ticket");
        }

        const ticket = this.activeTickets.get(ticketId);

        if (this.paymentProcessor.processPayment(ticket.fee, paymentMethod)) {
            ticket.paymentStatus = PaymentStatus.COMPLETED;

            // Free up the parking spot
            const spot = ticket.parkingSpot;
            spot.removeVehicle();

            // Move spot from occupied to available
            this.occupiedSpots.delete(spot.spotId);
            this.availableSpots[spot.spotType].push(spot);

            // Remove ticket from active tickets
            this.activeTickets.delete(ticketId);

            return true;
        } else {
            ticket.paymentStatus = PaymentStatus.FAILED;
            return false;
        }
    }

    getAvailableSpotsCount() {
        const result = {};
        for (const [spotType, spots] of Object.entries(this.availableSpots)) {
            result[spotType] = spots.length;
        }
        return result;
    }
}

// Demo usage
function main() {
    // Create parking lot
    const parkingLot = new ParkingLot("City Center Parking");

    // Add parking spots
    for (let i = 0; i < 10; i++) {
        parkingLot.addParkingSpot(new ParkingSpot(`M${i}`, ParkingSpotType.MOTORCYCLE));
    }
    for (let i = 0; i < 20; i++) {
        parkingLot.addParkingSpot(new ParkingSpot(`C${i}`, ParkingSpotType.CAR));
    }
    for (let i = 0; i < 5; i++) {
        parkingLot.addParkingSpot(new ParkingSpot(`T${i}`, ParkingSpotType.TRUCK));
    }

    console.log("Available spots:", parkingLot.getAvailableSpotsCount());

    // Park vehicles
    const car1 = new Car("ABC123");
    const ticket1 = parkingLot.parkVehicle(car1);
    console.log(`Car parked with ticket: ${ticket1.ticketId}`);

    const motorcycle1 = new Motorcycle("XYZ789");
    const ticket2 = parkingLot.parkVehicle(motorcycle1);
    console.log(`Motorcycle parked with ticket: ${ticket2.ticketId}`);

    console.log("Available spots after parking:", parkingLot.getAvailableSpotsCount());

    // Simulate exit and payment
    setTimeout(() => {
        const exitTicket = parkingLot.exitVehicle(ticket1.ticketId);
        console.log(`Exit ticket fee: $${exitTicket.fee.toFixed(2)}`);

        const paymentSuccess = parkingLot.processPayment(ticket1.ticketId, "Credit Card");
        console.log(`Payment successful: ${paymentSuccess}`);

        console.log("Available spots after exit:", parkingLot.getAvailableSpotsCount());
    }, 1000); // Simulate some parking time
}

// Export classes for use in other modules (Node.js)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        VehicleType,
        ParkingSpotType,
        PaymentStatus,
        Vehicle,
        Motorcycle,
        Car,
        Truck,
        ParkingSpot,
        ParkingTicket,
        ParkingRate,
        PaymentProcessor,
        ParkingLot
    };
}

// Run demo if this file is executed directly
if (require.main === module) {
    main();
}