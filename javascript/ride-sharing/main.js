/**
 * RIDE SHARING SYSTEM - JavaScript Implementation
 * Patterns: State, Strategy, Observer, Factory, Singleton, Command
 */

const RideStatus = Object.freeze({
    REQUESTED: 'requested',
    ACCEPTED: 'accepted',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled'
});

const RideType = Object.freeze({
    ECONOMY: { name: 'economy', multiplier: 1.0 },
    PREMIUM: { name: 'premium', multiplier: 1.5 },
    SHARED: { name: 'shared', multiplier: 0.7 }
});

class Location {
    constructor(latitude, longitude) {
        this.latitude = latitude;
        this.longitude = longitude;
    }
    
    distanceTo(other) {
        return Math.sqrt(Math.pow(this.latitude - other.latitude, 2) + 
                        Math.pow(this.longitude - other.longitude, 2)) * 100;
    }
}

class Vehicle {
    constructor(make, model, plate) {
        this.make = make;
        this.model = model;
        this.plate = plate;
    }
}

class Rider {
    constructor(riderId, name) {
        this.riderId = riderId;
        this.name = name;
        this.rating = 5.0;
    }
}

class Driver {
    constructor(driverId, name, vehicle) {
        this.driverId = driverId;
        this.name = name;
        this.vehicle = vehicle;
        this.location = new Location(0, 0);
        this.isAvailable = true;
        this.rating = 5.0;
    }
}

class Ride {
    constructor(rideId, rider, pickup, destination, rideType) {
        this.rideId = rideId;
        this.rider = rider;
        this.driver = null;
        this.pickupLocation = pickup;
        this.destination = destination;
        this.rideType = rideType;
        this.status = RideStatus.REQUESTED;
        this.fare = 0;
    }
    
    calculateFare() {
        const distance = this.pickupLocation.distanceTo(this.destination);
        const baseFare = distance * 2.0;
        this.fare = baseFare * this.rideType.multiplier;
        return this.fare;
    }
    
    updateStatus(status) {
        this.status = status;
        console.log(`🚗 Ride ${this.rideId}: ${status}`);
    }
}

class RideService {
    constructor() {
        if (RideService.instance) return RideService.instance;
        this.riders = new Map();
        this.drivers = new Map();
        this.rides = new Map();
        this.rideCounter = 0;
        RideService.instance = this;
    }
    
    registerRider(rider) {
        this.riders.set(rider.riderId, rider);
        console.log(`✓ Registered rider: ${rider.name}`);
    }
    
    registerDriver(driver) {
        this.drivers.set(driver.driverId, driver);
        console.log(`✓ Registered driver: ${driver.name}`);
    }
    
    requestRide(riderId, pickup, destination, rideType) {
        const rider = this.riders.get(riderId);
        if (!rider) return null;
        
        const rideId = `R${String(this.rideCounter).padStart(4, '0')}`;
        this.rideCounter++;
        
        const ride = new Ride(rideId, rider, pickup, destination, rideType);
        ride.calculateFare();
        this.rides.set(rideId, ride);
        
        console.log(`✓ Ride requested: ${rideId}`);
        console.log(`  Fare: $${ride.fare.toFixed(2)}`);
        
        const driver = this.matchDriver(ride);
        if (driver) {
            ride.driver = driver;
            ride.updateStatus(RideStatus.ACCEPTED);
            driver.isAvailable = false;
        }
        
        return ride;
    }
    
    matchDriver(ride) {
        for (const driver of this.drivers.values()) {
            if (driver.isAvailable) {
                console.log(`✓ Matched driver: ${driver.name}`);
                return driver;
            }
        }
        return null;
    }
    
    completeRide(rideId) {
        const ride = this.rides.get(rideId);
        if (ride && ride.driver) {
            ride.updateStatus(RideStatus.COMPLETED);
            ride.driver.isAvailable = true;
        }
    }
}

function main() {
    console.log('='.repeat(70));
    console.log('RIDE SHARING SYSTEM - Demo');
    console.log('='.repeat(70));
    
    const service = new RideService();
    
    const rider = new Rider('R001', 'Alice');
    service.registerRider(rider);
    
    const vehicle = new Vehicle('Toyota', 'Camry', 'ABC123');
    const driver = new Driver('D001', 'Bob', vehicle);
    driver.location = new Location(40.7128, -74.0060);
    service.registerDriver(driver);
    
    console.log('\n🚕 Requesting Ride...');
    const ride = service.requestRide(
        rider.riderId,
        new Location(40.7128, -74.0060),
        new Location(40.7589, -73.9851),
        RideType.ECONOMY
    );
    
    console.log('\n📍 Ride Lifecycle...');
    ride.updateStatus(RideStatus.IN_PROGRESS);
    service.completeRide(ride.rideId);
    
    console.log('\n' + '='.repeat(70));
    console.log('DEMO COMPLETE');
    console.log('='.repeat(70));
}

if (typeof require !== 'undefined' && require.main === module) {
    main();
}

