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

// Vehicle classes
class Vehicle {
    constructor(licensePlate, vehicleType) {
        if (this.constructor === Vehicle) {
            throw new Error("Cannot instantiate abstract class Vehicle");
        }
        this.licensePlate = licensePlate;
        this.vehicleType = vehicleType;
    }
}

class Motorcycle extends Vehicle {
    constructor(licensePlate) {
        super(licensePlate, VehicleType.MOTORCYCLE);
    }
}

class Car extends Vehicle {
    constructor(licensePlate) {
        super(licensePlate, VehicleType.CAR);
    }
}

class Truck extends Vehicle {
    constructor(licensePlate) {
        super(licensePlate, VehicleType.TRUCK);
    }
}

// Parking spot class
class ParkingSpot {
    constructor(spotId, spotType) {
        this.spotId = spotId;
        this.spotType = spotType;
        this.isOccupied = false;
        this.vehicle = null;
    }

    parkVehicle(vehicle) {
        if (this.isOccupied) {
            throw new Error("Parking spot is already occupied");
        }

        if (!this._canFitVehicle(vehicle)) {
            throw new Error("Vehicle cannot fit in this spot");
        }

        this.isOccupied = true;
        this.vehicle = vehicle;
    }

    removeVehicle() {
        this.isOccupied = false;
        const vehicle = this.vehicle;
        this.vehicle = null;
        return vehicle;
    }

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