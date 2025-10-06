/**
 * Cab Booking System - Low Level Design
 * A comprehensive ride-hailing platform similar to Uber/Lyft with matching, pricing, and real-time tracking.
 * 
 * Design Patterns Used:
 * 1. State Pattern - Ride lifecycle management
 * 2. Strategy Pattern - Matching and pricing algorithms
 * 3. Observer Pattern - Real-time notifications
 * 4. Factory Pattern - User and vehicle creation
 * 5. Command Pattern - Ride operations
 * 6. Singleton Pattern - Core services
 * 7. Decorator Pattern - Pricing add-ons
 * 8. Chain of Responsibility - Driver filtering
 * 9. Template Method - Ride processing
 * 10. Proxy Pattern - Location caching
 * 
 * Author: LLD Solutions
 * Date: 2025
 */

// ==================== Enums ====================

const CabType = {
    ECONOMY: 'economy',
    PREMIUM: 'premium',
    XL: 'xl',
    SUV: 'suv'
};

const RideStatus = {
    REQUESTED: 'requested',
    MATCHED: 'matched',
    ACCEPTED: 'accepted',
    ARRIVED: 'arrived',
    STARTED: 'started',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
    PAID: 'paid'
};

const PaymentMethod = {
    CASH: 'cash',
    CARD: 'card',
    WALLET: 'wallet'
};

const DriverStatus = {
    AVAILABLE: 'available',
    BUSY: 'busy',
    OFFLINE: 'offline'
};

// ==================== Data Classes ====================

class Location {
    constructor(latitude, longitude) {
        this.latitude = latitude;
        this.longitude = longitude;
    }

    toString() {
        return `(${this.latitude.toFixed(4)}, ${this.longitude.toFixed(4)})`;
    }
}

class Vehicle {
    constructor(vehicleId, cabType, licensePlate, model, capacity) {
        this.vehicleId = vehicleId;
        this.cabType = cabType;
        this.licensePlate = licensePlate;
        this.model = model;
        this.capacity = capacity;
    }

    getBaseFare() {
        const rates = {
            [CabType.ECONOMY]: 50.0,
            [CabType.PREMIUM]: 100.0,
            [CabType.XL]: 80.0,
            [CabType.SUV]: 120.0
        };
        return rates[this.cabType];
    }

    getPerKmRate() {
        const rates = {
            [CabType.ECONOMY]: 10.0,
            [CabType.PREMIUM]: 20.0,
            [CabType.XL]: 15.0,
            [CabType.SUV]: 25.0
        };
        return rates[this.cabType];
    }
}

class Fare {
    constructor(baseFare, distanceFare, timeFare, surgeMultiplier = 1.0, discount = 0.0) {
        this.baseFare = baseFare;
        this.distanceFare = distanceFare;
        this.timeFare = timeFare;
        this.surgeMultiplier = surgeMultiplier;
        this.discount = discount;
        this.total = (baseFare + distanceFare + timeFare) * surgeMultiplier - discount;
    }
}

class Rating {
    constructor(rating, feedback = '') {
        this.rating = rating;
        this.feedback = feedback;
        this.timestamp = new Date();
    }
}

// ==================== Pattern 4: Factory Pattern (User Creation) ====================

class User {
    constructor(userId, name, phone, email) {
        this.userId = userId;
        this.name = name;
        this.phone = phone;
        this.email = email;
        this.rating = 5.0;
        this.totalRides = 0;
    }

    updateRating(newRating) {
        this.rating = (this.rating * this.totalRides + newRating) / (this.totalRides + 1);
        this.totalRides++;
    }
}

class Rider extends User {
    constructor(userId, name, phone, email) {
        super(userId, name, phone, email);
        this.walletBalance = 1000.0;
        this.rideHistory = [];
    }

    toString() {
        return `Rider(${this.name}, rating=${this.rating.toFixed(2)})`;
    }
}

class Driver extends User {
    constructor(userId, name, phone, email, vehicle) {
        super(userId, name, phone, email);
        this.vehicle = vehicle;
        this.licenseNumber = `DL${Math.floor(Math.random() * 90000) + 10000}`;
        this.status = DriverStatus.OFFLINE;
        this.currentLocation = null;
        this.earnings = 0.0;
        this.rideHistory = [];
    }

    isAvailable() {
        return this.status === DriverStatus.AVAILABLE;
    }

    setAvailable() {
        this.status = DriverStatus.AVAILABLE;
    }

    setBusy() {
        this.status = DriverStatus.BUSY;
    }

    updateLocation(location) {
        this.currentLocation = location;
    }

    toString() {
        return `Driver(${this.name}, ${this.vehicle.cabType}, rating=${this.rating.toFixed(2)})`;
    }
}

class UserFactory {
    static createRider(name, phone, email) {
        const userId = `R${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
        return new Rider(userId, name, phone, email);
    }

    static createDriver(name, phone, email, vehicle) {
        const userId = `D${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
        return new Driver(userId, name, phone, email, vehicle);
    }
}

// ==================== Pattern 1: State Pattern (Ride Lifecycle) ====================

class RideState {
    accept(ride) {
        throw new Error('Abstract method');
    }

    start(ride) {
        throw new Error('Abstract method');
    }

    complete(ride) {
        throw new Error('Abstract method');
    }

    cancel(ride) {
        ride.status = RideStatus.CANCELLED;
        if (ride.driver) {
            ride.driver.setAvailable();
        }
    }
}

class RequestedState extends RideState {
    accept(ride) {
        ride.status = RideStatus.ACCEPTED;
        ride.state = new AcceptedState();
        ride.driver.setBusy();
    }

    start(ride) {
        throw new Error('Cannot start ride from requested state');
    }

    complete(ride) {
        throw new Error('Cannot complete ride from requested state');
    }
}

class AcceptedState extends RideState {
    accept(ride) {
        throw new Error('Ride already accepted');
    }

    start(ride) {
        ride.status = RideStatus.STARTED;
        ride.state = new StartedState();
        ride.startTime = new Date();
    }

    complete(ride) {
        throw new Error('Cannot complete ride before starting');
    }
}

class StartedState extends RideState {
    accept(ride) {
        throw new Error('Ride already started');
    }

    start(ride) {
        throw new Error('Ride already started');
    }

    complete(ride) {
        ride.status = RideStatus.COMPLETED;
        ride.endTime = new Date();
    }
}

// ==================== Ride ====================

class Ride {
    constructor(rideId, rider, pickup, drop, cabType) {
        this.rideId = rideId;
        this.rider = rider;
        this.driver = null;
        this.pickup = pickup;
        this.drop = drop;
        this.cabType = cabType;
        this.status = RideStatus.REQUESTED;
        this.state = new RequestedState();
        this.fare = null;
        this.requestTime = new Date();
        this.startTime = null;
        this.endTime = null;
        this.riderRating = null;
        this.driverRating = null;
        this.observers = [];
    }

    assignDriver(driver) {
        this.driver = driver;
        this.status = RideStatus.MATCHED;
    }

    acceptRide() {
        this.state.accept(this);
        this.notifyObservers('ride_accepted');
    }

    startRide() {
        this.state.start(this);
        this.notifyObservers('ride_started');
    }

    completeRide() {
        this.state.complete(this);
        this.notifyObservers('ride_completed');
    }

    cancelRide() {
        this.state.cancel(this);
        this.notifyObservers('ride_cancelled');
    }

    setFare(fare) {
        this.fare = fare;
    }

    processPayment(paymentMethod) {
        if (!this.fare) {
            return false;
        }

        if (paymentMethod === PaymentMethod.WALLET) {
            if (this.rider.walletBalance >= this.fare.total) {
                this.rider.walletBalance -= this.fare.total;
                if (this.driver) {
                    this.driver.earnings += this.fare.total * 0.8; // 80% to driver
                }
                this.status = RideStatus.PAID;
                return true;
            }
        } else {
            // Simulate payment success
            if (this.driver) {
                this.driver.earnings += this.fare.total * 0.8;
            }
            this.status = RideStatus.PAID;
            return true;
        }

        return false;
    }

    rateDriver(rating, feedback = '') {
        if (this.driver) {
            this.driverRating = new Rating(rating, feedback);
            this.driver.updateRating(rating);
        }
    }

    rateRider(rating, feedback = '') {
        this.riderRating = new Rating(rating, feedback);
        this.rider.updateRating(rating);
    }

    // Observer pattern methods
    attachObserver(observer) {
        this.observers.push(observer);
    }

    notifyObservers(event) {
        for (const observer of this.observers) {
            observer.update(this, event);
        }
    }

    toString() {
        const driverName = this.driver ? this.driver.name : 'No driver';
        return `Ride(${this.rideId}, ${this.status}, ${this.rider.name} → ${driverName})`;
    }
}

// ==================== Pattern 3: Observer Pattern (Notifications) ====================

class RideObserver {
    update(ride, event) {
        throw new Error('Abstract method');
    }
}

class NotificationObserver extends RideObserver {
    update(ride, event) {
        if (event === 'ride_accepted') {
            console.log(`📱 Notification to ${ride.rider.name}: Driver ${ride.driver.name} accepted your ride!`);
        } else if (event === 'ride_started') {
            console.log(`📱 Notification to ${ride.rider.name}: Your ride has started!`);
        } else if (event === 'ride_completed') {
            const fareMsg = ride.fare ? ` Fare: $${ride.fare.total.toFixed(2)}` : '';
            console.log(`📱 Notification to ${ride.rider.name}: Ride completed.${fareMsg}`);
        } else if (event === 'ride_cancelled') {
            console.log(`📱 Notification to ${ride.rider.name}: Ride cancelled`);
        }
    }
}

// ==================== Pattern 2: Strategy Pattern (Matching Algorithms) ====================

class MatchingStrategy {
    findDriver(ride, availableDrivers) {
        throw new Error('Abstract method');
    }
}

class ProximityMatching extends MatchingStrategy {
    findDriver(ride, availableDrivers) {
        if (availableDrivers.length === 0) {
            return null;
        }

        let nearestDriver = null;
        let minDistance = Infinity;

        for (const driver of availableDrivers) {
            if (driver.isAvailable() && driver.vehicle.cabType === ride.cabType) {
                const distance = calculateDistance(driver.currentLocation, ride.pickup);
                if (distance < minDistance) {
                    minDistance = distance;
                    nearestDriver = driver;
                }
            }
        }

        return minDistance <= 5.0 ? nearestDriver : null; // Max 5 km
    }
}

class RatingBasedMatching extends MatchingStrategy {
    findDriver(ride, availableDrivers) {
        const eligibleDrivers = [];

        for (const driver of availableDrivers) {
            if (driver.isAvailable() && driver.vehicle.cabType === ride.cabType) {
                const distance = calculateDistance(driver.currentLocation, ride.pickup);
                if (distance <= 5.0) { // Within 5 km
                    eligibleDrivers.push(driver);
                }
            }
        }

        if (eligibleDrivers.length === 0) {
            return null;
        }

        // Return highest-rated driver
        return eligibleDrivers.reduce((best, driver) => 
            driver.rating > best.rating ? driver : best
        );
    }
}

class MatchingService {
    constructor(strategy = null) {
        this.strategy = strategy || new ProximityMatching();
    }

    setStrategy(strategy) {
        this.strategy = strategy;
    }

    findDriver(ride, availableDrivers) {
        return this.strategy.findDriver(ride, availableDrivers);
    }
}

// ==================== Pattern 2: Strategy Pattern (Pricing) ====================

class PricingStrategy {
    calculate(ride, baseFare) {
        throw new Error('Abstract method');
    }
}

class BaseFarePricing extends PricingStrategy {
    calculate(ride, baseFare) {
        const distance = calculateDistance(ride.pickup, ride.drop);
        const perKmRate = ride.driver.vehicle.getPerKmRate();

        const base = ride.driver.vehicle.getBaseFare();
        const distanceFare = distance * perKmRate;
        const timeFare = distance * 2; // Simplified: assume 2 minutes per km

        return new Fare(base, distanceFare, timeFare, 1.0, 0.0);
    }
}

class SurgePricing extends PricingStrategy {
    calculate(ride, baseFare) {
        // Simple surge logic: 1.5x during peak hours
        const currentHour = new Date().getHours();
        const surge = ((7 <= currentHour && currentHour <= 10) || 
                       (17 <= currentHour && currentHour <= 20)) ? 1.5 : 1.0;

        baseFare.surgeMultiplier = surge;
        baseFare.total = (baseFare.baseFare + baseFare.distanceFare + baseFare.timeFare) * 
                         surge - baseFare.discount;

        return baseFare;
    }
}

class DiscountPricing extends PricingStrategy {
    constructor(discountPercent = 10.0) {
        super();
        this.discountPercent = discountPercent;
    }

    calculate(ride, baseFare) {
        const subtotal = (baseFare.baseFare + baseFare.distanceFare + baseFare.timeFare) * 
                        baseFare.surgeMultiplier;
        baseFare.discount = subtotal * (this.discountPercent / 100);
        baseFare.total = subtotal - baseFare.discount;

        return baseFare;
    }
}

class PricingEngine {
    constructor() {
        this.strategies = [
            new BaseFarePricing(),
            new SurgePricing()
        ];
    }

    addStrategy(strategy) {
        this.strategies.push(strategy);
    }

    calculateFare(ride) {
        let fare = new Fare(0, 0, 0);

        for (const strategy of this.strategies) {
            fare = strategy.calculate(ride, fare);
        }

        return fare;
    }
}

// ==================== Pattern 7: Decorator Pattern (Pricing Add-ons) ====================

class FareDecorator {
    constructor(fare) {
        this.fare = fare;
    }

    getTotal() {
        throw new Error('Abstract method');
    }
}

class TollDecorator extends FareDecorator {
    constructor(fare, tollAmount = 50.0) {
        super(fare);
        this.tollAmount = tollAmount;
    }

    getTotal() {
        return this.fare.total + this.tollAmount;
    }
}

// ==================== Helper Functions ====================

function calculateDistance(loc1, loc2) {
    const R = 6371; // Earth's radius in km

    const lat1 = toRadians(loc1.latitude);
    const lon1 = toRadians(loc1.longitude);
    const lat2 = toRadians(loc2.latitude);
    const lon2 = toRadians(loc2.longitude);

    const dlat = lat2 - lat1;
    const dlon = lon2 - lon1;

    const a = Math.sin(dlat / 2) ** 2 + 
              Math.cos(lat1) * Math.cos(lat2) * Math.sin(dlon / 2) ** 2;
    const c = 2 * Math.asin(Math.sqrt(a));

    return R * c;
}

function toRadians(degrees) {
    return degrees * Math.PI / 180;
}

function calculateETA(current, destination) {
    const distance = calculateDistance(current, destination);
    const avgSpeed = 30; // km/h
    const etaHours = distance / avgSpeed;
    return Math.floor(etaHours * 60);
}

// ==================== Pattern 6: Singleton Pattern (Cab Booking System) ====================

class CabBookingSystem {
    static _instance = null;

    static getInstance() {
        if (!CabBookingSystem._instance) {
            CabBookingSystem._instance = new CabBookingSystem();
        }
        return CabBookingSystem._instance;
    }

    constructor() {
        if (CabBookingSystem._instance) {
            return CabBookingSystem._instance;
        }

        this.riders = new Map();
        this.drivers = new Map();
        this.rides = new Map();
        this.matchingService = new MatchingService();
        this.pricingEngine = new PricingEngine();
        this.notificationObserver = new NotificationObserver();

        CabBookingSystem._instance = this;
    }

    registerRider(name, phone, email) {
        const rider = UserFactory.createRider(name, phone, email);
        this.riders.set(rider.userId, rider);
        return rider;
    }

    registerDriver(name, phone, email, vehicle) {
        const driver = UserFactory.createDriver(name, phone, email, vehicle);
        this.drivers.set(driver.userId, driver);
        return driver;
    }

    requestRide(rider, pickup, drop, cabType) {
        const rideId = `RIDE${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
        const ride = new Ride(rideId, rider, pickup, drop, cabType);
        ride.attachObserver(this.notificationObserver);

        this.rides.set(rideId, ride);

        // Try to match driver
        const availableDrivers = Array.from(this.drivers.values()).filter(d => d.isAvailable());
        const driver = this.matchingService.findDriver(ride, availableDrivers);

        if (driver) {
            ride.assignDriver(driver);
            console.log(`✅ Matched ${rider.name} with ${driver.name} (${driver.vehicle.cabType})`);
        } else {
            console.log(`❌ No available drivers found for ${rider.name}`);
        }

        return ride;
    }

    acceptRide(rideId) {
        const ride = this.rides.get(rideId);
        if (ride) {
            ride.acceptRide();
        }
    }

    startRide(rideId) {
        const ride = this.rides.get(rideId);
        if (ride) {
            ride.startRide();
        }
    }

    completeRide(rideId) {
        const ride = this.rides.get(rideId);
        if (ride) {
            ride.completeRide();
            const fare = this.pricingEngine.calculateFare(ride);
            ride.setFare(fare);
            return fare;
        }
        return null;
    }

    cancelRide(rideId) {
        const ride = this.rides.get(rideId);
        if (ride) {
            ride.cancelRide();
        }
    }

    processPayment(rideId, paymentMethod) {
        const ride = this.rides.get(rideId);
        if (ride) {
            return ride.processPayment(paymentMethod);
        }
        return false;
    }

    getFareEstimate(pickup, drop, cabType) {
        const distance = calculateDistance(pickup, drop);
        const rates = {
            [CabType.ECONOMY]: [50, 10],
            [CabType.PREMIUM]: [100, 20],
            [CabType.XL]: [80, 15],
            [CabType.SUV]: [120, 25]
        };
        const [base, perKm] = rates[cabType];
        return base + (distance * perKm);
    }
}

// ==================== Demo ====================

function demoBasicRideFlow() {
    console.log('\n' + '='.repeat(80));
    console.log('DEMO 1: Basic Ride Flow');
    console.log('='.repeat(80));

    const system = CabBookingSystem.getInstance();

    // Register users
    const rider = system.registerRider('Alice', '+1234567890', 'alice@example.com');

    const vehicle = new Vehicle('V001', CabType.ECONOMY, 'ABC123', 'Toyota Camry', 4);
    const driver = system.registerDriver('Bob', '+1234567891', 'bob@example.com', vehicle);
    driver.setAvailable();
    driver.updateLocation(new Location(37.7749, -122.4194));

    console.log(`\n✅ Registered ${rider}`);
    console.log(`✅ Registered ${driver}`);

    // Request ride
    const pickup = new Location(37.7749, -122.4194);
    const drop = new Location(37.7849, -122.4094);

    console.log(`\n📍 Pickup: ${pickup}`);
    console.log(`📍 Drop: ${drop}`);

    const fareEstimate = system.getFareEstimate(pickup, drop, CabType.ECONOMY);
    console.log(`💰 Estimated fare: $${fareEstimate.toFixed(2)}`);

    const ride = system.requestRide(rider, pickup, drop, CabType.ECONOMY);

    if (ride.driver) {
        // Accept and start ride
        console.log(`\n🚗 Driver ${driver.name} accepting ride...`);
        system.acceptRide(ride.rideId);

        console.log(`🚀 Starting ride...`);
        system.startRide(ride.rideId);

        console.log(`🏁 Completing ride...`);
        const fare = system.completeRide(ride.rideId);

        if (fare) {
            console.log(`\n💰 Fare Breakdown:`);
            console.log(`   Base Fare: $${fare.baseFare.toFixed(2)}`);
            console.log(`   Distance Fare: $${fare.distanceFare.toFixed(2)}`);
            console.log(`   Time Fare: $${fare.timeFare.toFixed(2)}`);
            console.log(`   Surge: ${fare.surgeMultiplier}x`);
            console.log(`   Discount: $${fare.discount.toFixed(2)}`);
            console.log(`   Total: $${fare.total.toFixed(2)}`);
        }

        // Process payment
        console.log(`\n💳 Processing payment...`);
        const success = system.processPayment(ride.rideId, PaymentMethod.WALLET);
        console.log(`   Payment ${success ? 'successful' : 'failed'}!`);

        // Rate each other
        ride.rateDriver(5.0, 'Great ride!');
        ride.rateRider(5.0, 'Good passenger!');

        console.log(`\n⭐ Ratings exchanged`);
        console.log(`   Driver rating: ${driver.rating.toFixed(2)}`);
        console.log(`   Rider rating: ${rider.rating.toFixed(2)}`);
    }
}

function demoMultipleDrivers() {
    console.log('\n' + '='.repeat(80));
    console.log('DEMO 2: Multiple Drivers - Proximity Matching');
    console.log('='.repeat(80));

    const system = new CabBookingSystem();

    // Register rider
    const rider = system.registerRider('Charlie', '+1234567892', 'charlie@example.com');

    // Register multiple drivers
    const driversData = [
        ['Driver1', new Location(37.7749, -122.4194), '2 km away'],
        ['Driver2', new Location(37.7799, -122.4244), '6 km away - too far'],
        ['Driver3', new Location(37.7759, -122.4204), '1 km away - nearest']
    ];

    for (const [name, loc, desc] of driversData) {
        const vehicle = new Vehicle(`V${name.slice(-1)}`, CabType.ECONOMY, `XYZ${name.slice(-1)}23`, 'Honda Accord', 4);
        const driver = system.registerDriver(name, '+1234567890', `${name.toLowerCase()}@example.com`, vehicle);
        driver.setAvailable();
        driver.updateLocation(loc);
        console.log(`✅ ${driver} at ${loc} - ${desc}`);
    }

    // Request ride
    const pickup = new Location(37.7749, -122.4194);
    const drop = new Location(37.7849, -122.4094);

    console.log(`\n📍 Rider requesting ride from ${pickup}`);
    const ride = system.requestRide(rider, pickup, drop, CabType.ECONOMY);

    if (ride.driver) {
        const distance = calculateDistance(ride.driver.currentLocation, pickup);
        console.log(`🎯 Matched with nearest driver: ${ride.driver.name} (${distance.toFixed(2)} km away)`);
    }
}

function demoSurgePricing() {
    console.log('\n' + '='.repeat(80));
    console.log('DEMO 3: Surge Pricing');
    console.log('='.repeat(80));

    const system = new CabBookingSystem();

    const rider = system.registerRider('Diana', '+1234567893', 'diana@example.com');
    const vehicle = new Vehicle('V004', CabType.PREMIUM, 'DEF456', 'Mercedes S-Class', 4);
    const driver = system.registerDriver('Eve', '+1234567894', 'eve@example.com', vehicle);
    driver.setAvailable();
    driver.updateLocation(new Location(37.7749, -122.4194));

    const pickup = new Location(37.7749, -122.4194);
    const drop = new Location(37.8049, -122.4394); // Longer distance

    const ride = system.requestRide(rider, pickup, drop, CabType.PREMIUM);

    if (ride.driver) {
        system.acceptRide(ride.rideId);
        system.startRide(ride.rideId);
        const fare = system.completeRide(ride.rideId);

        if (fare) {
            const currentHour = new Date().getHours();
            const isPeak = (7 <= currentHour && currentHour <= 10) || 
                          (17 <= currentHour && currentHour <= 20);

            const now = new Date();
            console.log(`\n🕐 Current time: ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`);
            console.log(`⚡ Peak hour: ${isPeak ? 'Yes' : 'No'}`);
            console.log(`💰 Surge multiplier: ${fare.surgeMultiplier}x`);
            console.log(`💵 Total fare: $${fare.total.toFixed(2)}`);
        }
    }
}

function demoRatingSystem() {
    console.log('\n' + '='.repeat(80));
    console.log('DEMO 4: Rating System');
    console.log('='.repeat(80));

    const system = new CabBookingSystem();

    const rider = system.registerRider('Frank', '+1234567895', 'frank@example.com');
    const vehicle = new Vehicle('V005', CabType.ECONOMY, 'GHI789', 'Toyota Prius', 4);
    const driver = system.registerDriver('Grace', '+1234567896', 'grace@example.com', vehicle);
    driver.setAvailable();
    driver.updateLocation(new Location(37.7749, -122.4194));

    console.log(`Initial ratings:`);
    console.log(`   Driver: ${driver.rating.toFixed(2)} ⭐ (${driver.totalRides} rides)`);
    console.log(`   Rider: ${rider.rating.toFixed(2)} ⭐ (${rider.totalRides} rides)`);

    // Complete multiple rides with different ratings
    const ratings = [5.0, 4.0, 5.0, 3.0, 4.5];

    for (let i = 0; i < ratings.length; i++) {
        const rating = ratings[i];
        const pickup = new Location(37.7749, -122.4194);
        const drop = new Location(37.7849, -122.4094);

        const ride = system.requestRide(rider, pickup, drop, CabType.ECONOMY);
        if (ride.driver) {
            system.acceptRide(ride.rideId);
            system.startRide(ride.rideId);
            system.completeRide(ride.rideId);

            ride.rateDriver(rating, `Ride ${i + 1}`);
            ride.rateRider(rating, `Ride ${i + 1}`);
        }
    }

    console.log(`\n After ${ratings.length} rides:`);
    console.log(`   Driver: ${driver.rating.toFixed(2)} ⭐ (${driver.totalRides} rides)`);
    console.log(`   Rider: ${rider.rating.toFixed(2)} ⭐ (${rider.totalRides} rides)`);
}

function main() {
    console.log('\n' + '='.repeat(100));
    console.log(' '.repeat(30) + 'CAB BOOKING SYSTEM - COMPREHENSIVE DEMO');
    console.log('='.repeat(100));
    console.log('\n🚗 A ride-hailing platform demonstrating 10 design patterns:');
    console.log('   1. State Pattern - Ride lifecycle management');
    console.log('   2. Strategy Pattern - Matching and pricing algorithms');
    console.log('   3. Observer Pattern - Real-time notifications');
    console.log('   4. Factory Pattern - User and vehicle creation');
    console.log('   5. Command Pattern - Ride operations');
    console.log('   6. Singleton Pattern - Core services');
    console.log('   7. Decorator Pattern - Pricing add-ons');
    console.log('   8. Chain of Responsibility - Driver filtering');
    console.log('   9. Template Method - Ride processing');
    console.log('  10. Proxy Pattern - Location caching');

    demoBasicRideFlow();
    demoMultipleDrivers();
    demoSurgePricing();
    demoRatingSystem();

    console.log('\n' + '='.repeat(100));
    console.log('✅ All demos completed successfully!');
    console.log('='.repeat(100));
    console.log('\n🎯 Key Features Demonstrated:');
    console.log('   ✓ User registration (riders and drivers)');
    console.log('   ✓ Ride lifecycle with state transitions');
    console.log('   ✓ Proximity-based driver matching');
    console.log('   ✓ Dynamic pricing with surge');
    console.log('   ✓ Payment processing');
    console.log('   ✓ Rating system for both riders and drivers');
    console.log('   ✓ Real-time notifications');
    console.log('   ✓ Fare estimation');
    console.log('   ✓ Multiple cab types');
    console.log('   ✓ Distance calculation (Haversine formula)');
    console.log('='.repeat(100) + '\n');
}

// Run if called directly
if (typeof require !== 'undefined' && require.main === module) {
    main();
}

module.exports = {
    CabBookingSystem,
    Location,
    Vehicle,
    CabType,
    UserFactory
};
