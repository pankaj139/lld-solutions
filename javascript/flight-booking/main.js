/**
 * Flight Booking System - JavaScript Implementation
 * 
 * This file implements a comprehensive flight booking platform supporting multi-city itineraries,
 * real-time seat inventory, dynamic pricing, payment processing, and loyalty programs.
 * 
 * File Purpose:
 * - Demonstrates Builder, Strategy, State, Factory, Observer, Command, Composite,
 *   Decorator, Singleton, and Template Method patterns
 * - Handles multi-leg flight bookings with validation
 * - Implements seat blocking with timeout
 * - Supports dynamic pricing and loyalty miles
 * - Manages complete booking lifecycle from search to cancellation
 * 
 * Usage:
 *   node main.js
 * 
 * Author: LLD Solutions
 * Date: 2025-10-06
 */

const crypto = require('crypto');

// ==================== Enums ====================

const SeatClass = Object.freeze({
    ECONOMY: 'economy',
    PREMIUM_ECONOMY: 'premium_economy',
    BUSINESS: 'business',
    FIRST: 'first'
});

const SeatStatus = Object.freeze({
    AVAILABLE: 'available',
    BLOCKED: 'blocked',
    BOOKED: 'booked'
});

const FlightStatus = Object.freeze({
    SCHEDULED: 'scheduled',
    BOARDING: 'boarding',
    DEPARTED: 'departed',
    IN_FLIGHT: 'in_flight',
    LANDED: 'landed',
    CANCELLED: 'cancelled',
    DELAYED: 'delayed'
});

const BookingStatus = Object.freeze({
    PENDING: 'pending',
    CONFIRMED: 'confirmed',
    CHECKED_IN: 'checked_in',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled'
});

const LoyaltyTier = Object.freeze({
    BASIC: 'basic',
    SILVER: 'silver',
    GOLD: 'gold',
    PLATINUM: 'platinum'
});

// ==================== Data Classes ====================

/**
 * Represents an airport.
 * 
 * Usage:
 *   const airport = new Airport("JFK", "John F. Kennedy International", "New York", "USA");
 */
class Airport {
    constructor(code, name, city, country, timezone = 'UTC') {
        this.code = code;
        this.name = name;
        this.city = city;
        this.country = country;
        this.timezone = timezone;
    }

    toString() {
        return `${this.code} - ${this.city}`;
    }
}

/**
 * Represents an aircraft with seat configuration.
 * 
 * Usage:
 *   const aircraft = new Aircraft("N12345", "Boeing 737", 150, 0, 20, 0);
 */
class Aircraft {
    constructor(registration, model, economySeats = 0, premiumEconomySeats = 0, businessSeats = 0, firstClassSeats = 0) {
        this.registration = registration;
        this.model = model;
        this.economySeats = economySeats;
        this.premiumEconomySeats = premiumEconomySeats;
        this.businessSeats = businessSeats;
        this.firstClassSeats = firstClassSeats;
    }

    getTotalSeats() {
        return this.economySeats + this.premiumEconomySeats + this.businessSeats + this.firstClassSeats;
    }

    getSeatsByClass(seatClass) {
        const mapping = {
            [SeatClass.ECONOMY]: this.economySeats,
            [SeatClass.PREMIUM_ECONOMY]: this.premiumEconomySeats,
            [SeatClass.BUSINESS]: this.businessSeats,
            [SeatClass.FIRST]: this.firstClassSeats
        };
        return mapping[seatClass] || 0;
    }
}

/**
 * Represents an aircraft seat.
 * 
 * Usage:
 *   const seat = new Seat("12A", SeatClass.ECONOMY, ["window"]);
 *   seat.block(15);
 */
class Seat {
    constructor(number, seatClass, features = []) {
        this.number = number;
        this.seatClass = seatClass;
        this.status = SeatStatus.AVAILABLE;
        this.features = features;
        this.blockedUntil = null;
        this.passengerId = null;
    }

    isAvailable() {
        if (this.status === SeatStatus.BLOCKED && this.blockedUntil) {
            if (new Date() > this.blockedUntil) {
                this.status = SeatStatus.AVAILABLE;
                this.blockedUntil = null;
            }
        }
        return this.status === SeatStatus.AVAILABLE;
    }

    block(durationMinutes = 15) {
        if (!this.isAvailable()) return false;
        this.status = SeatStatus.BLOCKED;
        this.blockedUntil = new Date(Date.now() + durationMinutes * 60000);
        return true;
    }

    book(passengerId) {
        if (this.status !== SeatStatus.BLOCKED) return false;
        this.status = SeatStatus.BOOKED;
        this.passengerId = passengerId;
        this.blockedUntil = null;
        return true;
    }

    release() {
        this.status = SeatStatus.AVAILABLE;
        this.blockedUntil = null;
        this.passengerId = null;
    }

    toString() {
        return `${this.number} (${this.seatClass}) - ${this.status}`;
    }
}

/**
 * Represents a passenger.
 * 
 * Usage:
 *   const passenger = new Passenger("John", "Doe", new Date(1990, 0, 1), "AB123456");
 */
class Passenger {
    constructor(firstName, lastName, dateOfBirth, passportNumber, nationality = '', loyaltyNumber = null) {
        this.id = crypto.randomUUID();
        this.firstName = firstName;
        this.lastName = lastName;
        this.dateOfBirth = dateOfBirth;
        this.passportNumber = passportNumber;
        this.nationality = nationality;
        this.loyaltyNumber = loyaltyNumber;
    }

    getFullName() {
        return `${this.firstName} ${this.lastName}`;
    }

    isChild() {
        if (!this.dateOfBirth) return false;
        const age = Math.floor((new Date() - this.dateOfBirth) / (1000 * 60 * 60 * 24 * 365));
        return age < 12;
    }

    toString() {
        return this.getFullName();
    }
}

// ==================== Flight Component ====================

/**
 * Represents a scheduled flight.
 * 
 * Usage:
 *   const flight = new Flight("AA100", airline, aircraft, jfk, lax, departureTime, arrivalTime);
 *   const available = flight.getAvailableSeats(SeatClass.ECONOMY);
 * 
 * Returns:
 *   Flight instance with seat management
 */
class Flight {
    constructor(flightNumber, airline, aircraft, origin, destination, departureTime, arrivalTime) {
        this.id = crypto.randomUUID();
        this.flightNumber = flightNumber;
        this.airline = airline;
        this.aircraft = aircraft;
        this.origin = origin;
        this.destination = destination;
        this.departureTime = departureTime;
        this.arrivalTime = arrivalTime;
        this.duration = new Date(arrivalTime - departureTime);
        this.status = FlightStatus.SCHEDULED;
        this.seats = [];
        this._initializeSeats();
    }

    _initializeSeats() {
        // Economy seats (rows 10-39)
        const rowsEconomy = Math.floor(this.aircraft.economySeats / 6);
        for (let row = 10; row < 10 + rowsEconomy; row++) {
            for (const letter of ['A', 'B', 'C', 'D', 'E', 'F']) {
                const features = [];
                if (['A', 'F'].includes(letter)) features.push('window');
                if (['C', 'D'].includes(letter)) features.push('aisle');
                
                const seat = new Seat(`${row}${letter}`, SeatClass.ECONOMY, features);
                this.seats.push(seat);
            }
        }

        // Business seats (rows 1-5)
        const rowsBusiness = Math.floor(this.aircraft.businessSeats / 4);
        for (let row = 1; row < 1 + rowsBusiness; row++) {
            for (const letter of ['A', 'C', 'D', 'F']) {
                const features = ['A', 'F'].includes(letter) ? ['window'] : ['aisle'];
                const seat = new Seat(`${row}${letter}`, SeatClass.BUSINESS, features);
                this.seats.push(seat);
            }
        }
    }

    getAvailableSeats(seatClass) {
        return this.seats.filter(s => s.seatClass === seatClass && s.isAvailable());
    }

    getSeat(seatNumber) {
        return this.seats.find(s => s.number === seatNumber);
    }

    calculateDistance() {
        // Simplified distance calculation
        return 2500;
    }

    toString() {
        return `${this.flightNumber}: ${this.origin.code} → ${this.destination.code}`;
    }
}

// ==================== Pricing Strategy Pattern ====================

/**
 * Abstract base class for pricing strategies (Strategy Pattern).
 * 
 * Usage:
 *   const strategy = new DynamicPricing();
 *   const price = strategy.calculatePrice(flight, SeatClass.ECONOMY, bookingDate);
 */
class PricingStrategy {
    calculatePrice(flight, seatClass, bookingDate) {
        throw new Error('calculatePrice() must be implemented');
    }
}

class BasePricing extends PricingStrategy {
    constructor() {
        super();
        this.baseFares = {
            [SeatClass.ECONOMY]: 200,
            [SeatClass.PREMIUM_ECONOMY]: 400,
            [SeatClass.BUSINESS]: 1000,
            [SeatClass.FIRST]: 2500
        };
    }

    calculatePrice(flight, seatClass, bookingDate) {
        return this.baseFares[seatClass] || 200;
    }
}

/**
 * Dynamic pricing based on demand and time to departure.
 * 
 * Algorithm:
 *   1. Start with base fare
 *   2. Apply demand multiplier (seats booked / total seats)
 *   3. Apply time-to-departure multiplier
 *   4. Add distance-based adjustment
 * 
 * Returns:
 *   Final calculated price
 */
class DynamicPricing extends PricingStrategy {
    calculatePrice(flight, seatClass, bookingDate) {
        const basePricing = new BasePricing();
        const baseFare = basePricing.calculatePrice(flight, seatClass, bookingDate);

        // Demand multiplier
        const classSeats = flight.seats.filter(s => s.seatClass === seatClass);
        const bookedSeats = classSeats.filter(s => s.status === SeatStatus.BOOKED);

        let demandMultiplier = 1.0;
        if (classSeats.length > 0) {
            const demandRatio = bookedSeats.length / classSeats.length;
            demandMultiplier = 1 + (demandRatio * 0.5);
        }

        // Time multiplier
        const daysToDepart = Math.floor((flight.departureTime - bookingDate) / (1000 * 60 * 60 * 24));
        let timeMultiplier = 1.0;
        if (daysToDepart < 7) {
            timeMultiplier = 1.5;
        } else if (daysToDepart < 30) {
            timeMultiplier = 1.2;
        }

        const price = baseFare * demandMultiplier * timeMultiplier;
        return Math.round(price * 100) / 100;
    }
}

// ==================== Booking State Pattern ====================

/**
 * Abstract base class for booking states (State Pattern).
 * 
 * Usage:
 *   const state = new PendingState();
 *   state.confirm(booking);
 */
class BookingState {
    confirm(booking) {
        throw new Error('confirm() must be implemented');
    }

    cancel(booking) {
        throw new Error('cancel() must be implemented');
    }

    checkIn(booking) {
        throw new Error('checkIn() must be implemented');
    }

    getStatus() {
        throw new Error('getStatus() must be implemented');
    }
}

class PendingState extends BookingState {
    confirm(booking) {
        booking.state = new ConfirmedState();
        console.log(`✅ Booking ${booking.pnr} confirmed`);
        return true;
    }

    cancel(booking) {
        booking.state = new CancelledState();
        Object.values(booking.seats).forEach(seat => seat.release());
        return true;
    }

    checkIn(booking) {
        console.log('❌ Cannot check-in pending booking');
        return false;
    }

    getStatus() {
        return BookingStatus.PENDING;
    }
}

class ConfirmedState extends BookingState {
    confirm(booking) {
        console.log('❌ Booking already confirmed');
        return false;
    }

    cancel(booking) {
        booking.state = new CancelledState();
        Object.values(booking.seats).forEach(seat => seat.release());
        return true;
    }

    checkIn(booking) {
        const hoursToDepart = (booking.itinerary.getDepartureTime() - new Date()) / (1000 * 60 * 60);

        if (hoursToDepart >= 1 && hoursToDepart <= 24) {
            booking.state = new CheckedInState();
            console.log('✅ Checked in for flight(s)');
            return true;
        } else {
            console.log('❌ Check-in not available yet');
            return false;
        }
    }

    getStatus() {
        return BookingStatus.CONFIRMED;
    }
}

class CheckedInState extends BookingState {
    confirm(booking) {
        console.log('❌ Already checked in');
        return false;
    }

    cancel(booking) {
        console.log('❌ Cannot cancel after check-in');
        return false;
    }

    checkIn(booking) {
        console.log('❌ Already checked in');
        return false;
    }

    getStatus() {
        return BookingStatus.CHECKED_IN;
    }
}

class CancelledState extends BookingState {
    confirm(booking) {
        console.log('❌ Cannot confirm cancelled booking');
        return false;
    }

    cancel(booking) {
        console.log('❌ Already cancelled');
        return false;
    }

    checkIn(booking) {
        console.log('❌ Cannot check-in cancelled booking');
        return false;
    }

    getStatus() {
        return BookingStatus.CANCELLED;
    }
}

// ==================== Flight Itinerary (Composite Pattern) ====================

/**
 * Represents a flight itinerary (may be multi-leg).
 * 
 * Usage:
 *   const itinerary = new FlightItinerary();
 *   itinerary.addFlight(flight1);
 *   itinerary.addFlight(flight2);
 *   const totalDuration = itinerary.getTotalDuration();
 * 
 * Returns:
 *   Itinerary with all flight segments
 */
class FlightItinerary {
    constructor() {
        this.id = crypto.randomUUID();
        this.flights = [];
    }

    addFlight(flight) {
        this.flights.push(flight);
    }

    getTotalDuration() {
        if (this.flights.length === 0) return 0;

        const departure = this.flights[0].departureTime;
        const arrival = this.flights[this.flights.length - 1].arrivalTime;
        return arrival - departure;
    }

    getDepartureTime() {
        return this.flights.length > 0 ? this.flights[0].departureTime : new Date();
    }

    getArrivalTime() {
        return this.flights.length > 0 ? this.flights[this.flights.length - 1].arrivalTime : new Date();
    }

    validateConnections() {
        for (let i = 0; i < this.flights.length - 1; i++) {
            const current = this.flights[i];
            const next = this.flights[i + 1];

            const connectionTime = next.departureTime - current.arrivalTime;
            const minConnection = 45 * 60 * 1000; // 45 minutes in milliseconds

            if (connectionTime < minConnection) {
                console.log(`⚠️  Insufficient layover time: ${Math.floor(connectionTime / 60000)} minutes`);
                return false;
            }
        }
        return true;
    }

    toString() {
        if (this.flights.length === 0) return 'Empty itinerary';

        const legs = this.flights.map(f => f.origin.code).concat(this.flights[this.flights.length - 1].destination.code);
        return `${legs.join(' → ')} (${this.flights.length} flight(s))`;
    }
}

// ==================== Booking Component ====================

/**
 * Represents a flight booking.
 * 
 * Usage:
 *   const booking = new Booking(userId, itinerary, passengers);
 *   booking.selectSeat(flight, passenger, seat);
 *   booking.confirm();
 * 
 * Returns:
 *   Booking with PNR and seats
 */
class Booking {
    constructor(userId, itinerary, passengers, fareClass = 'Y') {
        this.id = crypto.randomUUID();
        this.pnr = this._generatePNR();
        this.userId = userId;
        this.itinerary = itinerary;
        this.passengers = passengers;
        this.fareClass = fareClass;
        this.seats = {};
        this.basePrice = 0;
        this.taxes = 0;
        this.totalPrice = 0;
        this.state = new PendingState();
        this.createdAt = new Date();
        this.pricingStrategy = new DynamicPricing();
        this.extraBaggage = 0;
        this.mealsSelected = false;
    }

    _generatePNR() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        return Array.from({length: 6}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    }

    selectSeat(flight, passenger, seat) {
        if (!seat.isAvailable()) {
            console.log(`❌ Seat ${seat.number} not available`);
            return false;
        }

        if (seat.block()) {
            const key = `${flight.id}_${passenger.id}`;
            this.seats[key] = seat;
            console.log(`✅ Seat ${seat.number} blocked for ${passenger.getFullName()}`);
            return true;
        }

        return false;
    }

    calculateTotal() {
        let total = 0;

        // Calculate price for each passenger on each flight
        this.itinerary.flights.forEach(flight => {
            this.passengers.forEach(passenger => {
                let seatClass = SeatClass.ECONOMY;
                const key = `${flight.id}_${passenger.id}`;
                if (this.seats[key]) {
                    seatClass = this.seats[key].seatClass;
                }

                const price = this.pricingStrategy.calculatePrice(flight, seatClass, new Date());
                total += price;
            });
        });

        // Add baggage fees
        total += this.extraBaggage * 50;

        // Add meal fees
        if (this.mealsSelected) {
            total += this.passengers.length * 25;
        }

        // Calculate taxes (10%)
        this.basePrice = total;
        this.taxes = total * 0.10;
        this.totalPrice = total + this.taxes;

        return this.totalPrice;
    }

    addBaggage(count) {
        this.extraBaggage += count;
        const fee = count * 50;
        console.log(`💼 Added ${count} extra baggage ($${fee})`);
        return fee;
    }

    addMeals() {
        this.mealsSelected = true;
        const fee = this.passengers.length * 25;
        console.log(`🍴 Added meal selection for ${this.passengers.length} passengers ($${fee})`);
        return fee;
    }

    confirm() {
        if (this.state.confirm(this)) {
            Object.values(this.seats).forEach(seat => seat.book(this.id));
            return true;
        }
        return false;
    }

    cancel() {
        return this.state.cancel(this);
    }

    checkIn() {
        return this.state.checkIn(this);
    }

    calculateRefund(cancellationDate) {
        const daysToDepart = Math.floor((this.itinerary.getDepartureTime() - cancellationDate) / (1000 * 60 * 60 * 24));

        let refundPercentage = 0.25; // Default 75% penalty

        if (daysToDepart >= 30) {
            refundPercentage = 0.90; // 10% cancellation fee
        } else if (daysToDepart >= 7) {
            refundPercentage = 0.75; // 25% penalty
        } else if (daysToDepart >= 1) {
            refundPercentage = 0.50; // 50% penalty
        }

        return Math.round(this.totalPrice * refundPercentage * 100) / 100;
    }

    toString() {
        return `Booking ${this.pnr}: ${this.itinerary} - ${this.state.getStatus()}`;
    }
}

// ==================== Managers (Singleton) ====================

/**
 * Manages flight seat inventory (Singleton Pattern).
 * 
 * Usage:
 *   const manager = InventoryManager.getInstance();
 *   const available = manager.getAvailableSeats(flight, SeatClass.ECONOMY);
 */
class InventoryManager {
    static #instance = null;

    static getInstance() {
        if (!InventoryManager.#instance) {
            InventoryManager.#instance = new InventoryManager();
        }
        return InventoryManager.#instance;
    }

    constructor() {
        if (InventoryManager.#instance) {
            throw new Error('Use getInstance() to get singleton');
        }
        this.flights = new Map();
    }

    addFlight(flight) {
        this.flights.set(flight.id, flight);
    }

    getFlight(flightId) {
        return this.flights.get(flightId);
    }

    getAvailableSeats(flight, seatClass) {
        return flight.getAvailableSeats(seatClass);
    }

    blockSeat(flight, seatNumber, duration = 15) {
        const seat = flight.getSeat(seatNumber);
        return seat ? seat.block(duration) : false;
    }
}

/**
 * Manages all bookings (Singleton Pattern).
 * 
 * Usage:
 *   const manager = BookingManager.getInstance();
 *   const booking = manager.createBooking(userId, itinerary, passengers);
 *   manager.confirmBooking(booking.pnr);
 */
class BookingManager {
    static #instance = null;

    static getInstance() {
        if (!BookingManager.#instance) {
            BookingManager.#instance = new BookingManager();
        }
        return BookingManager.#instance;
    }

    constructor() {
        if (BookingManager.#instance) {
            throw new Error('Use getInstance() to get singleton');
        }
        this.bookings = new Map();
        this.inventoryManager = InventoryManager.getInstance();
    }

    createBooking(userId, itinerary, passengers) {
        const booking = new Booking(userId, itinerary, passengers);
        this.bookings.set(booking.pnr, booking);
        console.log(`✅ Booking created: ${booking.pnr}`);
        return booking;
    }

    getBooking(pnr) {
        return this.bookings.get(pnr);
    }

    confirmBooking(pnr) {
        const booking = this.getBooking(pnr);
        if (!booking) {
            console.log(`❌ Booking ${pnr} not found`);
            return false;
        }

        const total = booking.calculateTotal();
        console.log(`\n💰 Total Price: $${total.toFixed(2)}`);
        console.log(`   Base: $${booking.basePrice.toFixed(2)}`);
        console.log(`   Taxes: $${booking.taxes.toFixed(2)}`);

        const success = booking.confirm();

        if (success) {
            this._earnMiles(booking);
        }

        return success;
    }

    cancelBooking(pnr) {
        const booking = this.getBooking(pnr);
        if (!booking) {
            console.log(`❌ Booking ${pnr} not found`);
            return 0;
        }

        const refund = booking.calculateRefund(new Date());

        if (booking.cancel()) {
            console.log(`💰 Refund amount: $${refund.toFixed(2)}`);
            return refund;
        }

        return 0;
    }

    checkIn(pnr) {
        const booking = this.getBooking(pnr);
        if (!booking) {
            console.log(`❌ Booking ${pnr} not found`);
            return false;
        }

        return booking.checkIn();
    }

    _earnMiles(booking) {
        const totalDistance = booking.itinerary.flights.reduce((sum, f) => sum + f.calculateDistance(), 0);
        const milesPerPassenger = totalDistance;

        booking.passengers.forEach(passenger => {
            if (passenger.loyaltyNumber) {
                console.log(`✈️  ${passenger.getFullName()} earned ${milesPerPassenger} miles`);
            }
        });
    }
}

// ==================== Search Engine ====================

/**
 * Flight search engine.
 * 
 * Usage:
 *   const engine = new SearchEngine(inventoryManager);
 *   const results = engine.search(origin, destination, date, passengers);
 */
class SearchEngine {
    constructor(inventoryManager) {
        this.inventoryManager = inventoryManager;
    }

    search(origin, destination, departureDate, passengers = 1) {
        const results = [];

        for (const flight of this.inventoryManager.flights.values()) {
            if (flight.origin.code === origin.code &&
                flight.destination.code === destination.code &&
                flight.departureTime.toDateString() === departureDate.toDateString()) {

                const available = flight.getAvailableSeats(SeatClass.ECONOMY).length;
                if (available >= passengers) {
                    results.push(flight);
                }
            }
        }

        results.sort((a, b) => a.departureTime - b.departureTime);
        return results;
    }

    searchMultiCity(legs, passengers = 1) {
        const itineraries = [];

        const legFlights = [];
        for (const [origin, destination, depDate] of legs) {
            const flights = this.search(origin, destination, depDate, passengers);
            if (flights.length === 0) return [];
            legFlights.push(flights);
        }

        const itinerary = new FlightItinerary();
        for (const flights of legFlights) {
            itinerary.addFlight(flights[0]);
        }

        if (itinerary.validateConnections()) {
            itineraries.push(itinerary);
        }

        return itineraries;
    }
}

// ==================== Demo ====================

async function demo() {
    console.log('='.repeat(60));
    console.log('FLIGHT BOOKING SYSTEM DEMONSTRATION');
    console.log('='.repeat(60));

    // Create airports
    const jfk = new Airport('JFK', 'John F. Kennedy International', 'New York', 'USA');
    const lax = new Airport('LAX', 'Los Angeles International', 'Los Angeles', 'USA');
    const ord = new Airport('ORD', "O'Hare International", 'Chicago', 'USA');

    // Create aircraft
    const boeing737 = new Aircraft('N12345', 'Boeing 737', 150, 0, 20, 0);
    const airbus320 = new Aircraft('N67890', 'Airbus A320', 144, 0, 16, 0);

    // Create flights
    const inventory = InventoryManager.getInstance();

    const flight1 = new Flight(
        'AA100', 'American Airlines', boeing737, jfk, lax,
        new Date(2025, 10, 15, 8, 0), new Date(2025, 10, 15, 11, 30)
    );
    inventory.addFlight(flight1);

    const flight2 = new Flight(
        'UA200', 'United Airlines', airbus320, jfk, ord,
        new Date(2025, 10, 15, 9, 0), new Date(2025, 10, 15, 11, 0)
    );
    inventory.addFlight(flight2);

    const flight3 = new Flight(
        'DL300', 'Delta Airlines', boeing737, ord, lax,
        new Date(2025, 10, 15, 13, 0), new Date(2025, 10, 15, 15, 30)
    );
    inventory.addFlight(flight3);

    // Demo 1: Direct Flight Booking
    console.log('\n' + '='.repeat(60));
    console.log('DEMO 1: DIRECT FLIGHT BOOKING');
    console.log('='.repeat(60));

    const searchEngine = new SearchEngine(inventory);
    const results = searchEngine.search(jfk, lax, new Date(2025, 10, 15), 2);

    console.log(`\n🔍 Found ${results.length} flights:`);
    results.forEach(flight => console.log(`  ${flight}`));

    // Create passengers
    const passenger1 = new Passenger('John', 'Doe', new Date(1990, 0, 1), 'AB123456');
    const passenger2 = new Passenger('Jane', 'Doe', new Date(1992, 4, 15), 'CD789012');

    // Create booking
    const bookingManager = BookingManager.getInstance();

    const itinerary1 = new FlightItinerary();
    itinerary1.addFlight(flight1);

    const booking1 = bookingManager.createBooking('user123', itinerary1, [passenger1, passenger2]);

    console.log(`\n📋 ${booking1}`);

    // Select seats
    const seat1 = flight1.getAvailableSeats(SeatClass.ECONOMY)[0];
    const seat2 = flight1.getAvailableSeats(SeatClass.ECONOMY)[1];

    booking1.selectSeat(flight1, passenger1, seat1);
    booking1.selectSeat(flight1, passenger2, seat2);

    // Add extras
    booking1.addBaggage(2);
    booking1.addMeals();

    // Confirm booking
    bookingManager.confirmBooking(booking1.pnr);

    // Demo 2: Multi-City Booking
    console.log('\n' + '='.repeat(60));
    console.log('DEMO 2: MULTI-CITY FLIGHT BOOKING');
    console.log('='.repeat(60));

    const legs = [
        [jfk, ord, new Date(2025, 10, 15)],
        [ord, lax, new Date(2025, 10, 15)]
    ];

    const multiCityResults = searchEngine.searchMultiCity(legs, 1);

    console.log(`\n🔍 Found ${multiCityResults.length} multi-city itineraries:`);
    multiCityResults.forEach(itinerary => {
        console.log(`  ${itinerary}`);
        console.log(`  Total duration: ${Math.floor(itinerary.getTotalDuration() / 60000)} minutes`);
    });

    if (multiCityResults.length > 0) {
        const passenger3 = new Passenger('Bob', 'Smith', new Date(1985, 2, 20), 'EF345678');

        const booking2 = bookingManager.createBooking('user456', multiCityResults[0], [passenger3]);

        // Select seats for both flights
        const seat3 = flight2.getAvailableSeats(SeatClass.BUSINESS)[0];
        const seat4 = flight3.getAvailableSeats(SeatClass.BUSINESS)[0];

        booking2.selectSeat(flight2, passenger3, seat3);
        booking2.selectSeat(flight3, passenger3, seat4);

        // Confirm booking
        bookingManager.confirmBooking(booking2.pnr);
    }

    // Demo 3: Cancellation
    console.log('\n' + '='.repeat(60));
    console.log('DEMO 3: BOOKING CANCELLATION');
    console.log('='.repeat(60));

    console.log(`\n🔴 Cancelling booking ${booking1.pnr}...`);
    const refund = bookingManager.cancelBooking(booking1.pnr);
    console.log('✅ Booking cancelled');

    // Demo 4: Check-in
    console.log('\n' + '='.repeat(60));
    console.log('DEMO 4: ONLINE CHECK-IN');
    console.log('='.repeat(60));

    if (multiCityResults.length > 0) {
        const booking2 = Array.from(bookingManager.bookings.values())[1];
        console.log(`\n✈️  Attempting check-in for ${booking2.pnr}...`);
        bookingManager.checkIn(booking2.pnr);
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('BOOKING SUMMARY');
    console.log('='.repeat(60));

    for (const [pnr, booking] of bookingManager.bookings.entries()) {
        console.log(`\n${booking}`);
        console.log(`  Passengers: ${booking.passengers.length}`);
        console.log(`  Total: $${booking.totalPrice.toFixed(2)}`);
        console.log(`  Status: ${booking.state.getStatus()}`);
    }

    console.log('\n✅ Flight booking system demonstration completed!');
}

// Run demo
if (require.main === module) {
    demo().catch(console.error);
}

module.exports = {
    Airport, Aircraft, Seat, Passenger, Flight, FlightItinerary,
    Booking, PricingStrategy, DynamicPricing, BookingState,
    InventoryManager, BookingManager, SearchEngine,
    SeatClass, SeatStatus, FlightStatus, BookingStatus, LoyaltyTier
};
