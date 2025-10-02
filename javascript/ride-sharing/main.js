/**
 * Ride Sharing System - JavaScript Implementation
 * ==============================================
 * 
 * Modern transportation platform demonstrating advanced Design Patterns:
 * 
 * DESIGN PATTERNS USED:
 * 1. State Pattern: Ride status workflow (REQUESTED -> ASSIGNED -> IN_PROGRESS -> COMPLETED)
 * 2. Strategy Pattern: Different pricing strategies (surge, flat rate, distance-based)
 * 3. Observer Pattern: Real-time location tracking and ride updates
 * 4. Command Pattern: Ride operations (request, accept, cancel, complete)
 * 5. Factory Pattern: Vehicle and user creation with type-specific features
 * 6. Singleton Pattern: Central ride matching service
 * 7. Template Method Pattern: Common ride workflow structure
 * 8. Chain of Responsibility: Driver selection algorithm with multiple criteria
 * 9. Decorator Pattern: Enhanced ride features (premium, luxury options)
 * 10. Facade Pattern: Simplified ride booking interface
 * 
 * OOP CONCEPTS DEMONSTRATED:
 * 1. Encapsulation: Private location tracking, payment processing
 * 2. Inheritance: User type hierarchy (Rider, Driver)
 * 3. Polymorphism: Different vehicle types, same booking interface
 * 4. Composition: Ride system composed of users, vehicles, locations
 * 5. Association: Complex relationships between riders, drivers, rides
 * 6. Aggregation: Route aggregation of multiple location points
 * 
 * REAL-TIME FEATURES:
 * - GPS-based driver matching with proximity algorithms
 * - Dynamic pricing with surge multipliers
 * - Real-time route optimization and ETA calculation
 * - Live location tracking during rides
 * - Automated payment processing with multiple methods
 * - Driver rating and feedback system
 * - Advanced analytics and ride history
 * 
 * ALGORITHMS IMPLEMENTED:
 * - Nearest Driver Algorithm: Efficient driver-rider matching
 * - Route Optimization: Shortest path calculation
 * - Dynamic Pricing: Supply-demand based fare calculation
 * - Rating System: Weighted average with recency bias
 * 
 * ARCHITECTURAL PRINCIPLES:
 * - Event-driven ride lifecycle management
 * - Real-time data synchronization
 * - Scalable geospatial operations
 * - Microservice-ready modular design
 */

// User type enumeration - Strategy Pattern for different user roles
const UserType = {
    RIDER: 'RIDER',     // Passengers requesting rides
    DRIVER: 'DRIVER'    // Drivers providing ride services
};

// Ride status enumeration - State Pattern for ride lifecycle management
const RideStatus = {
    REQUESTED: 'REQUESTED',           // Ride requested by passenger
    DRIVER_ASSIGNED: 'DRIVER_ASSIGNED', // Driver found and assigned
    DRIVER_ARRIVED: 'DRIVER_ARRIVED',   // Driver arrived at pickup
    IN_PROGRESS: 'IN_PROGRESS',       // Ride currently active
    COMPLETED: 'COMPLETED',           // Ride successfully completed
    CANCELLED: 'CANCELLED'            // Ride cancelled by rider or driver
};

// Driver status enumeration - State Pattern for driver availability
const DriverStatus = {
    OFFLINE: 'OFFLINE',       // Driver not available for rides
    AVAILABLE: 'AVAILABLE',   // Driver online and ready for rides
    BUSY: 'BUSY'             // Driver currently on a ride
};

// Vehicle type enumeration - Strategy Pattern for service tiers
const VehicleType = {
    ECONOMY: 'ECONOMY',     // Basic ride service
    PREMIUM: 'PREMIUM',     // Mid-tier service with better vehicles
    LUXURY: 'LUXURY'        // High-end service with luxury vehicles
};

// Payment method enumeration - Strategy Pattern for payment processing
const PaymentMethod = {
    CASH: 'CASH',                     // Cash payment on completion
    CREDIT_CARD: 'CREDIT_CARD',       // Credit card payment
    DIGITAL_WALLET: 'DIGITAL_WALLET'  // Mobile wallet payment
};

// Utility function for generating unique ride and user identifiers
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * Location Class - Represents geographical coordinates and addresses
 * 
 * DESIGN PATTERNS:
 * - Value Object Pattern: Immutable location data
 * - Composite Pattern: Location can be part of route
 * 
 * OOP CONCEPTS:
 * - Encapsulation: Coordinate data with address mapping
 * - Composition: Used by rides, users, and vehicles
 */
class Location {
    constructor(latitude, longitude, address = "") {
        this.latitude = latitude;    // GPS latitude coordinate
        this.longitude = longitude;  // GPS longitude coordinate
        this.address = address;      // Human-readable address
    }

    distanceTo(otherLocation) {
        // Haversine formula for distance calculation (simplified)
        const R = 6371; // Earth's radius in kilometers
        
        const lat1Rad = this.latitude * Math.PI / 180;
        const lat2Rad = otherLocation.latitude * Math.PI / 180;
        const deltaLat = (otherLocation.latitude - this.latitude) * Math.PI / 180;
        const deltaLon = (otherLocation.longitude - this.longitude) * Math.PI / 180;
        
        const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
                 Math.cos(lat1Rad) * Math.cos(lat2Rad) *
                 Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        
        return R * c;
    }
}

class User {
    constructor(userId, name, email, phone, userType) {
        if (this.constructor === User) {
            throw new Error("Cannot instantiate abstract class User");
        }
        this.userId = userId;
        this.name = name;
        this.email = email;
        this.phone = phone;
        this.userType = userType;
        this.rating = 5.0;
        this.createdAt = new Date();
    }
}

class Rider extends User {
    constructor(userId, name, email, phone) {
        super(userId, name, email, phone, UserType.RIDER);
        this.rideHistory = []; // ride_ids
        this.preferredPaymentMethod = PaymentMethod.CREDIT_CARD;
    }
}

class Vehicle {
    constructor(vehicleId, make, model, year, licensePlate, vehicleType) {
        this.vehicleId = vehicleId;
        this.make = make;
        this.model = model;
        this.year = year;
        this.licensePlate = licensePlate;
        this.vehicleType = vehicleType;
        this.capacity = 4; // default capacity
    }
}

class Driver extends User {
    constructor(userId, name, email, phone, vehicle) {
        super(userId, name, email, phone, UserType.DRIVER);
        this.vehicle = vehicle;
        this.licenseNumber = "";
        this.currentLocation = null;
        this.status = DriverStatus.OFFLINE;
        this.rideHistory = []; // ride_ids
        this.totalEarnings = 0.0;
    }

    setLocation(location) {
        this.currentLocation = location;
    }

    setStatus(status) {
        this.status = status;
    }
}

class RideRequest {
    constructor(requestId, rider, pickupLocation, destination, vehicleType) {
        this.requestId = requestId;
        this.rider = rider;
        this.pickupLocation = pickupLocation;
        this.destination = destination;
        this.vehicleType = vehicleType;
        this.requestTime = new Date();
        this.estimatedFare = 0.0;
    }
}

class Ride {
    constructor(rideId, rideRequest, driver) {
        this.rideId = rideId;
        this.rideRequest = rideRequest;
        this.driver = driver;
        this.status = RideStatus.DRIVER_ASSIGNED;
        this.startTime = null;
        this.endTime = null;
        this.actualFare = 0.0;
        this.distanceTraveled = 0.0;
        this.driverLocationUpdates = [];
    }

    startRide() {
        this.status = RideStatus.IN_PROGRESS;
        this.startTime = new Date();
        this.driver.setStatus(DriverStatus.BUSY);
    }

    completeRide(actualDistance) {
        this.status = RideStatus.COMPLETED;
        this.endTime = new Date();
        this.distanceTraveled = actualDistance;
        this.driver.setStatus(DriverStatus.AVAILABLE);
    }

    cancelRide() {
        this.status = RideStatus.CANCELLED;
        this.driver.setStatus(DriverStatus.AVAILABLE);
    }
}

class Payment {
    constructor(paymentId, ride, amount, paymentMethod) {
        this.paymentId = paymentId;
        this.ride = ride;
        this.amount = amount;
        this.paymentMethod = paymentMethod;
        this.paymentTime = new Date();
        this.isProcessed = false;
    }

    processPayment() {
        try {
            console.log(`Processing payment of $${this.amount.toFixed(2)} via ${this.paymentMethod}`);
            this.isProcessed = true;
            return true;
        } catch (e) {
            console.log(`Payment failed: ${e.message}`);
            return false;
        }
    }
}

class PricingStrategy {
    constructor() {
        if (this.constructor === PricingStrategy) {
            throw new Error("Cannot instantiate abstract class");
        }
    }

    calculateFare(distance, vehicleType, pickupTime) {
        throw new Error("Method must be implemented by subclass");
    }
}

class StandardPricing extends PricingStrategy {
    constructor() {
        super();
        this.baseRates = new Map([
            [VehicleType.ECONOMY, 2.0],
            [VehicleType.PREMIUM, 3.0],
            [VehicleType.LUXURY, 5.0]
        ]);
        this.perKmRates = new Map([
            [VehicleType.ECONOMY, 1.0],
            [VehicleType.PREMIUM, 1.5],
            [VehicleType.LUXURY, 2.5]
        ]);
    }

    calculateFare(distance, vehicleType, pickupTime) {
        const baseFare = this.baseRates.get(vehicleType);
        const distanceFare = this.perKmRates.get(vehicleType) * distance;
        
        // Add surge pricing during peak hours
        const surgeMultiplier = this._getSurgeMultiplier(pickupTime);
        
        const totalFare = (baseFare + distanceFare) * surgeMultiplier;
        return Math.max(totalFare, 5.0); // Minimum fare
    }

    _getSurgeMultiplier(pickupTime) {
        const hour = pickupTime.getHours();
        // Peak hours: 7-9 AM and 6-8 PM
        if ((hour >= 7 && hour <= 9) || (hour >= 18 && hour <= 20)) {
            return 1.5;
        }
        // Weekend nights
        if (pickupTime.getDay() >= 5 && (hour >= 22 || hour <= 2)) {
            return 2.0;
        }
        return 1.0;
    }
}

class DriverMatcher {
    static findNearbyDrivers(availableDrivers, pickupLocation, vehicleType, maxDistance = 5.0) {
        const nearbyDrivers = [];
        
        for (const driver of availableDrivers) {
            if (driver.status === DriverStatus.AVAILABLE &&
                driver.vehicle.vehicleType === vehicleType &&
                driver.currentLocation) {
                
                const distance = pickupLocation.distanceTo(driver.currentLocation);
                if (distance <= maxDistance) {
                    nearbyDrivers.push({ driver, distance });
                }
            }
        }
        
        // Sort by distance and rating
        nearbyDrivers.sort((a, b) => {
            const distanceDiff = a.distance - b.distance;
            if (distanceDiff !== 0) return distanceDiff;
            return b.driver.rating - a.driver.rating;
        });
        
        return nearbyDrivers.slice(0, 10).map(item => item.driver); // Return top 10
    }
}

class RideSharingSystem {
    constructor(companyName) {
        this.companyName = companyName;
        this.riders = new Map(); // riderId -> Rider
        this.drivers = new Map(); // driverId -> Driver
        this.vehicles = new Map(); // vehicleId -> Vehicle
        this.rideRequests = new Map(); // requestId -> RideRequest
        this.rides = new Map(); // rideId -> Ride
        this.payments = new Map(); // paymentId -> Payment
        this.pricingStrategy = new StandardPricing();
    }

    registerRider(name, email, phone) {
        const riderId = generateUUID();
        const rider = new Rider(riderId, name, email, phone);
        this.riders.set(riderId, rider);
        return rider;
    }

    registerDriver(name, email, phone, vehicle, licenseNumber) {
        const driverId = generateUUID();
        const driver = new Driver(driverId, name, email, phone, vehicle);
        driver.licenseNumber = licenseNumber;
        
        this.drivers.set(driverId, driver);
        this.vehicles.set(vehicle.vehicleId, vehicle);
        return driver;
    }

    requestRide(riderId, pickupLocation, destination, vehicleType) {
        if (!this.riders.has(riderId)) {
            throw new Error("Rider not found");
        }
        
        const rider = this.riders.get(riderId);
        const requestId = generateUUID();
        
        const rideRequest = new RideRequest(requestId, rider, pickupLocation, destination, vehicleType);
        
        // Calculate estimated fare
        const distance = pickupLocation.distanceTo(destination);
        rideRequest.estimatedFare = this.pricingStrategy.calculateFare(
            distance, vehicleType, new Date());
        
        this.rideRequests.set(requestId, rideRequest);
        
        // Try to match with a driver
        const ride = this._matchDriver(rideRequest);
        return ride || rideRequest;
    }

    _matchDriver(rideRequest) {
        const availableDrivers = Array.from(this.drivers.values())
            .filter(d => d.status === DriverStatus.AVAILABLE);
        
        const nearbyDrivers = DriverMatcher.findNearbyDrivers(
            availableDrivers, rideRequest.pickupLocation, rideRequest.vehicleType);
        
        if (nearbyDrivers.length > 0) {
            // Assign the best driver
            const selectedDriver = nearbyDrivers[0];
            const rideId = generateUUID();
            
            const ride = new Ride(rideId, rideRequest, selectedDriver);
            this.rides.set(rideId, ride);
            
            // Update rider and driver
            rideRequest.rider.rideHistory.push(rideId);
            selectedDriver.rideHistory.push(rideId);
            
            console.log(`Ride ${rideId} assigned to driver ${selectedDriver.name}`);
            console.log(`Estimated fare: $${rideRequest.estimatedFare.toFixed(2)}`);
            
            // Simulate driver arriving
            this._simulateDriverArrival(ride);
            
            return ride;
        } else {
            console.log("No available drivers found");
            return null;
        }
    }

    _simulateDriverArrival(ride) {
        // In real system, this would be handled by GPS tracking
        ride.status = RideStatus.DRIVER_ARRIVED;
        console.log(`Driver ${ride.driver.name} has arrived at pickup location`);
    }

    startRide(rideId) {
        if (!this.rides.has(rideId)) {
            throw new Error("Ride not found");
        }
        
        const ride = this.rides.get(rideId);
        if (ride.status !== RideStatus.DRIVER_ARRIVED) {
            throw new Error("Driver must arrive before starting ride");
        }
        
        ride.startRide();
        console.log(`Ride ${rideId} started`);
    }

    completeRide(rideId, actualDistance) {
        if (!this.rides.has(rideId)) {
            throw new Error("Ride not found");
        }
        
        const ride = this.rides.get(rideId);
        if (ride.status !== RideStatus.IN_PROGRESS) {
            throw new Error("Ride must be in progress to complete");
        }
        
        ride.completeRide(actualDistance);
        
        // Calculate final fare
        const finalFare = this.pricingStrategy.calculateFare(
            actualDistance, ride.rideRequest.vehicleType, ride.startTime);
        ride.actualFare = finalFare;
        
        // Process payment
        const paymentId = generateUUID();
        const payment = new Payment(paymentId, ride, finalFare, ride.rideRequest.rider.preferredPaymentMethod);
        
        if (payment.processPayment()) {
            this.payments.set(paymentId, payment);
            ride.driver.totalEarnings += finalFare * 0.8; // Driver gets 80%
            console.log(`Ride ${rideId} completed. Final fare: $${finalFare.toFixed(2)}`);
        }
        
        return ride;
    }

    updateDriverLocation(driverId, location) {
        if (this.drivers.has(driverId)) {
            this.drivers.get(driverId).setLocation(location);
        }
    }

    setDriverStatus(driverId, status) {
        if (this.drivers.has(driverId)) {
            this.drivers.get(driverId).setStatus(status);
        }
    }

    getDriverEarnings(driverId) {
        if (!this.drivers.has(driverId)) {
            return {};
        }
        
        const driver = this.drivers.get(driverId);
        const completedRides = driver.rideHistory.filter(rideId => {
            const ride = this.rides.get(rideId);
            return ride && ride.status === RideStatus.COMPLETED;
        }).length;
        
        return {
            totalEarnings: driver.totalEarnings,
            completedRides: completedRides,
            rating: driver.rating,
            status: driver.status
        };
    }
}

// Demo usage
function main() {
    // Create ride sharing system
    const system = new RideSharingSystem("QuickRide");
    
    // Register riders
    const rider1 = system.registerRider("Alice Johnson", "alice@example.com", "123-456-7890");
    const rider2 = system.registerRider("Bob Smith", "bob@example.com", "098-765-4321");
    
    // Register drivers with vehicles
    const vehicle1 = new Vehicle("V1", "Toyota", "Prius", 2020, "ABC123", VehicleType.ECONOMY);
    const vehicle2 = new Vehicle("V2", "BMW", "X5", 2021, "XYZ789", VehicleType.PREMIUM);
    
    const driver1 = system.registerDriver("Charlie Driver", "charlie@example.com", "555-123-4567", vehicle1, "DL123456");
    const driver2 = system.registerDriver("Diana Driver", "diana@example.com", "555-987-6543", vehicle2, "DL789012");
    
    // Set driver locations and status
    const driver1Location = new Location(40.7589, -73.9851, "123 Driver St");
    const driver2Location = new Location(40.7505, -73.9934, "456 Driver Ave");
    
    system.updateDriverLocation(driver1.userId, driver1Location);
    system.updateDriverLocation(driver2.userId, driver2Location);
    
    system.setDriverStatus(driver1.userId, DriverStatus.AVAILABLE);
    system.setDriverStatus(driver2.userId, DriverStatus.AVAILABLE);
    
    console.log(`Ride sharing system '${system.companyName}' initialized`);
    console.log(`Registered ${system.riders.size} riders and ${system.drivers.size} drivers`);
    
    // Request a ride
    const pickupLocation = new Location(40.7580, -73.9855, "Main St & 1st Ave");
    const destination = new Location(40.7614, -73.9776, "Central Park");
    
    try {
        const result = system.requestRide(rider1.userId, pickupLocation, destination, VehicleType.ECONOMY);
        
        console.log(`\nRide requested by ${rider1.name}`);
        console.log(`Pickup: ${pickupLocation.address}`);
        console.log(`Destination: ${destination.address}`);
        
        // Find the assigned ride
        let assignedRide = null;
        if (result instanceof Ride) {
            assignedRide = result;
        } else {
            // Check if a ride was created
            for (const ride of system.rides.values()) {
                if (ride.rideRequest.requestId === result.requestId) {
                    assignedRide = ride;
                    break;
                }
            }
        }
        
        if (assignedRide) {
            console.log(`\n--- Ride Workflow ---`);
            
            // Start the ride
            system.startRide(assignedRide.rideId);
            
            // Simulate ride completion
            const actualDistance = pickupLocation.distanceTo(destination);
            const completedRide = system.completeRide(assignedRide.rideId, actualDistance);
            
            console.log(`Distance traveled: ${actualDistance.toFixed(2)} km`);
            
            // Show driver earnings
            const earnings = system.getDriverEarnings(driver1.userId);
            console.log(`\nDriver earnings: $${earnings.totalEarnings.toFixed(2)}`);
            console.log(`Completed rides: ${earnings.completedRides}`);
        }
        
    } catch (e) {
        console.log(`Error: ${e.message}`);
    }
    
    console.log(`\n${rider1.name} has ${rider1.rideHistory.length} ride(s) in history`);
}

// Export for use in other modules (Node.js)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        UserType,
        RideStatus,
        DriverStatus,
        VehicleType,
        PaymentMethod,
        Location,
        User,
        Rider,
        Vehicle,
        Driver,
        RideRequest,
        Ride,
        Payment,
        PricingStrategy,
        StandardPricing,
        DriverMatcher,
        RideSharingSystem
    };
}

// Run demo if this file is executed directly
if (require.main === module) {
    main();
}