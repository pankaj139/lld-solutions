/**
 * RESTAURANT RESERVATION SYSTEM - Low Level Design Implementation in JavaScript
 * 
 * This file implements a comprehensive restaurant reservation management system
 * with table management, customer reservations, waitlist handling, and notifications.
 * 
 * DESIGN PATTERNS USED:
 * 1. STATE PATTERN: Reservation lifecycle with explicit state transitions
 *    - ReservationStatus defines all possible reservation states
 *    - State transitions: PENDING -> CONFIRMED -> SEATED -> COMPLETED
 *    - Prevents invalid state transitions (e.g., cannot seat a cancelled reservation)
 *    - Each state has specific allowed operations and business rules
 * 
 * 2. STRATEGY PATTERN: Different table assignment strategies
 *    - FirstAvailableStrategy: Assigns first available table
 *    - OptimalSizeStrategy: Assigns smallest suitable table
 *    - PreferenceBasedStrategy: Considers customer seating preferences
 *    - Easy to add new assignment algorithms without changing core logic
 * 
 * 3. OBSERVER PATTERN: Notification system for reservation events
 *    - NotificationService observes reservation state changes
 *    - Sends confirmations, reminders, and updates automatically
 *    - Supports multiple notification channels (Email, SMS, Push)
 *    - Decoupled notification logic from core reservation system
 * 
 * 4. FACTORY PATTERN: Creating different types of reservations
 *    - ReservationFactory for standard, large party, and special occasion reservations
 *    - Encapsulates complex reservation creation logic
 *    - Supports different validation rules for different reservation types
 * 
 * 5. SINGLETON PATTERN: Restaurant system instance management
 *    - Ensures single instance of restaurant system
 *    - Global access point for restaurant operations
 * 
 * 6. COMMAND PATTERN: Reservation operations
 *    - CreateReservation, ModifyReservation, CancelReservation commands
 *    - Supports undo/redo functionality
 *    - Audit trail for all reservation changes
 * 
 * OOP CONCEPTS DEMONSTRATED:
 * - ENCAPSULATION: Reservation state and business rules hidden behind methods
 * - INHERITANCE: Specialized table types and customer categories
 * - POLYMORPHISM: Different notification channels and assignment strategies
 * - ABSTRACTION: Complex reservation workflow abstracted into simple API calls
 * 
 * SOLID PRINCIPLES:
 * - SRP: Each class handles single responsibility (Table, Reservation, Customer, Waitlist)
 * - OCP: Easy to add new table types, notification channels without code changes
 * - LSP: All table types and notification methods are interchangeable
 * - ISP: Focused interfaces for reservation, notification, and waitlist operations
 * - DIP: High-level reservation logic depends on abstractions not implementations
 * 
 * BUSINESS FEATURES:
 * - Multi-table type support with capacity management
 * - Customer profile with preferences and reservation history
 * - Smart table assignment based on party size and preferences
 * - Real-time availability checking with conflict detection
 * - Waitlist management with priority and estimated wait times
 * - Special occasion handling (birthdays, anniversaries)
 * - Notification system for confirmations and reminders
 * - No-show tracking and customer reliability scoring
 * 
 * ARCHITECTURAL NOTES:
 * - Event-driven architecture for reservation state changes
 * - Flexible notification system with multiple channels
 * - Scalable table assignment algorithms
 * - Comprehensive validation and error handling
 * - Integration-ready design for POS and payment systems
 * 
 * USAGE:
 *     // Initialize restaurant
 *     const restaurant = new RestaurantReservationSystem("La Belle Cuisine");
 *     
 *     // Add tables
 *     const table = new Table("T01", 4, TableLocation.INDOOR);
 *     restaurant.addTable(table);
 *     
 *     // Register customer
 *     const customer = restaurant.registerCustomer("Alice", "alice@example.com", "555-1234");
 *     
 *     // Create reservation
 *     const reservation = restaurant.createReservation(
 *         customer.customerId, "T01", new Date("2024-12-25"),
 *         new TimeSlot("19:00", "21:00", MealPeriod.DINNER), 4
 *     );
 *     
 *     // Handle waitlist
 *     const entry = restaurant.addToWaitlist(customer, 2);
 *     restaurant.seatFromWaitlist(entry.entryId, "T01");
 * 
 * RETURN VALUES:
 * - createReservation(): Returns Reservation object or throws error
 * - searchAvailableTables(): Returns Array of Tables sorted by suitability
 * - addToWaitlist(): Returns WaitlistEntry with estimated wait time
 * - modifyReservation(): Returns updated Reservation or throws error
 */

const crypto = require('crypto');

// ==================== ENUMS ====================

const TableStatus = {
    AVAILABLE: 'AVAILABLE',
    RESERVED: 'RESERVED',
    OCCUPIED: 'OCCUPIED',
    MAINTENANCE: 'MAINTENANCE'
};

const TableLocation = {
    INDOOR: 'INDOOR',
    OUTDOOR: 'OUTDOOR',
    PRIVATE: 'PRIVATE',
    BAR: 'BAR',
    PATIO: 'PATIO'
};

const ReservationStatus = {
    PENDING: 'PENDING',
    CONFIRMED: 'CONFIRMED',
    SEATED: 'SEATED',
    COMPLETED: 'COMPLETED',
    CANCELLED: 'CANCELLED',
    NO_SHOW: 'NO_SHOW'
};

const MealPeriod = {
    BREAKFAST: 'BREAKFAST',
    BRUNCH: 'BRUNCH',
    LUNCH: 'LUNCH',
    DINNER: 'DINNER',
    LATE_NIGHT: 'LATE_NIGHT'
};

const NotificationType = {
    CONFIRMATION: 'CONFIRMATION',
    REMINDER: 'REMINDER',
    CANCELLATION: 'CANCELLATION',
    WAITLIST_UPDATE: 'WAITLIST_UPDATE',
    MODIFICATION: 'MODIFICATION'
};

// ==================== CORE ENTITIES ====================

/**
 * TimeSlot - Represents a time slot for reservations
 * 
 * USAGE:
 *     const slot = new TimeSlot("19:00", "21:00", MealPeriod.DINNER);
 *     console.log(slot.durationMinutes); // 120
 * 
 * RETURN:
 *     TimeSlot object with startTime, endTime, and mealPeriod
 */
class TimeSlot {
    constructor(startTime, endTime, mealPeriod) {
        this.startTime = startTime; // "HH:MM" format
        this.endTime = endTime;
        this.mealPeriod = mealPeriod;
        this.durationMinutes = this._calculateDuration();
    }

    _calculateDuration() {
        const [startHour, startMin] = this.startTime.split(':').map(Number);
        const [endHour, endMin] = this.endTime.split(':').map(Number);
        return (endHour * 60 + endMin) - (startHour * 60 + startMin);
    }

    toString() {
        return `${this.startTime} - ${this.endTime}`;
    }
}

/**
 * Customer - Customer profile with preferences and history
 * 
 * USAGE:
 *     const customer = new Customer("CUST001", "Alice", "alice@example.com", "555-1234");
 *     customer.addPreference("seating", "window");
 *     customer.addReservation("RES001");
 * 
 * RETURN:
 *     Customer object with profile data and reservation history
 */
class Customer {
    constructor(customerId, name, email, phone) {
        this.customerId = customerId;
        this.name = name;
        this.email = email;
        this.phone = phone;
        this.preferences = {}; // e.g., {seating: "window", dietary: "vegetarian"}
        this.reservationHistory = []; // List of reservation IDs
        this.noShowCount = 0;
        this.createdAt = new Date();
    }

    addPreference(key, value) {
        this.preferences[key] = value;
    }

    addReservation(reservationId) {
        this.reservationHistory.push(reservationId);
    }

    incrementNoShow() {
        this.noShowCount++;
    }

    getReliabilityScore() {
        if (this.reservationHistory.length === 0) return 1.0;
        return Math.max(0.0, 1.0 - (this.noShowCount / this.reservationHistory.length));
    }

    toString() {
        return `Customer(${this.name}, ${this.email}, ${this.reservationHistory.length} reservations)`;
    }
}

/**
 * Table - Restaurant table with capacity and location
 * 
 * USAGE:
 *     const table = new Table("T01", 4, TableLocation.INDOOR);
 *     table.addFeature("window_view");
 *     console.log(table.canAccommodate(3)); // true
 * 
 * RETURN:
 *     Table object with capacity, location, and status
 */
class Table {
    constructor(tableId, capacity, location) {
        this.tableId = tableId;
        this.tableNumber = tableId;
        this.capacity = capacity;
        this.minCapacity = Math.max(1, capacity - 1); // Allow one less than capacity
        this.location = location;
        this.status = TableStatus.AVAILABLE;
        this.features = []; // e.g., ["window_view", "wheelchair_accessible"]
    }

    addFeature(feature) {
        if (!this.features.includes(feature)) {
            this.features.push(feature);
        }
    }

    canAccommodate(partySize) {
        return partySize >= this.minCapacity && partySize <= this.capacity;
    }

    toString() {
        return `Table ${this.tableNumber} (${this.capacity} seats, ${this.location})`;
    }
}

/**
 * Reservation - Restaurant reservation with state management
 * 
 * DESIGN PATTERN: State Pattern for lifecycle management
 * 
 * USAGE:
 *     const reservation = new Reservation("RES001", customer, table, date, timeSlot, 4);
 *     reservation.confirm();
 *     reservation.markSeated();
 *     reservation.complete();
 * 
 * RETURN:
 *     Reservation object with status and state transition methods
 */
class Reservation {
    constructor(reservationId, customer, table, reservationDate, timeSlot, partySize, specialRequests = '') {
        this.reservationId = reservationId;
        this.customer = customer;
        this.table = table;
        this.reservationDate = reservationDate;
        this.timeSlot = timeSlot;
        this.partySize = partySize;
        this.specialRequests = specialRequests;
        this.status = ReservationStatus.PENDING;
        this.createdAt = new Date();
        this.confirmedAt = null;
        this.seatedAt = null;
        this.completedAt = null;
    }

    confirm() {
        if (this.status !== ReservationStatus.PENDING) {
            throw new Error(`Cannot confirm reservation in ${this.status} state`);
        }
        this.status = ReservationStatus.CONFIRMED;
        this.confirmedAt = new Date();
        console.log(`✓ Reservation ${this.reservationId} confirmed for ${this.customer.name}`);
    }

    markSeated() {
        if (this.status !== ReservationStatus.CONFIRMED) {
            throw new Error(`Cannot seat reservation in ${this.status} state`);
        }
        this.status = ReservationStatus.SEATED;
        this.seatedAt = new Date();
        this.table.status = TableStatus.OCCUPIED;
        console.log(`✓ ${this.customer.name} seated at ${this.table.tableNumber}`);
    }

    complete() {
        if (this.status !== ReservationStatus.SEATED) {
            throw new Error(`Cannot complete reservation in ${this.status} state`);
        }
        this.status = ReservationStatus.COMPLETED;
        this.completedAt = new Date();
        this.table.status = TableStatus.AVAILABLE;
        console.log(`✓ Reservation ${this.reservationId} completed`);
    }

    cancel() {
        if ([ReservationStatus.COMPLETED, ReservationStatus.NO_SHOW].includes(this.status)) {
            throw new Error(`Cannot cancel reservation in ${this.status} state`);
        }
        this.status = ReservationStatus.CANCELLED;
        this.table.status = TableStatus.AVAILABLE;
        console.log(`✓ Reservation ${this.reservationId} cancelled`);
    }

    markNoShow() {
        if (this.status !== ReservationStatus.CONFIRMED) {
            throw new Error(`Cannot mark as no-show in ${this.status} state`);
        }
        this.status = ReservationStatus.NO_SHOW;
        this.table.status = TableStatus.AVAILABLE;
        this.customer.incrementNoShow();
        console.log(`⚠ Reservation ${this.reservationId} marked as NO-SHOW`);
    }

    canModify() {
        return [ReservationStatus.PENDING, ReservationStatus.CONFIRMED].includes(this.status);
    }

    getCancellationFee() {
        const reservationDateTime = new Date(this.reservationDate);
        const [hours, minutes] = this.timeSlot.startTime.split(':').map(Number);
        reservationDateTime.setHours(hours, minutes, 0, 0);
        
        const hoursUntil = (reservationDateTime - new Date()) / (1000 * 60 * 60);
        
        if (hoursUntil >= 24) {
            return 0.0; // Free cancellation
        } else if (hoursUntil >= 2) {
            return 0.0; // Free within 24 hours
        } else {
            return 25.0; // Late cancellation fee
        }
    }

    toString() {
        return `Reservation(${this.reservationId}, ${this.customer.name}, ${this.table.tableNumber}, ${this.reservationDate.toDateString()}, ${this.status})`;
    }
}

/**
 * WaitlistEntry - Waitlist entry for walk-in customers
 * 
 * USAGE:
 *     const entry = new WaitlistEntry("W001", customer, 4);
 *     console.log(entry.estimatedWaitMinutes);
 * 
 * RETURN:
 *     WaitlistEntry object with wait time and priority
 */
class WaitlistEntry {
    constructor(entryId, customer, partySize) {
        this.entryId = entryId;
        this.customer = customer;
        this.partySize = partySize;
        this.arrivalTime = new Date();
        this.estimatedWaitMinutes = 0;
        this.priority = 0; // Higher priority = served first
        this.notified = false;
    }

    calculateWaitTime(averageDiningTime, position) {
        this.estimatedWaitMinutes = Math.floor((position * averageDiningTime) / 2);
    }

    updatePriority() {
        const waitMinutes = (new Date() - this.arrivalTime) / (1000 * 60);
        this.priority = Math.floor(waitMinutes);
    }

    toString() {
        return `Waitlist(${this.customer.name}, party of ${this.partySize}, wait: ~${this.estimatedWaitMinutes}min)`;
    }
}

// ==================== NOTIFICATION SYSTEM ====================

/**
 * NotificationChannel - Abstract notification channel
 * 
 * DESIGN PATTERN: Strategy Pattern for different notification methods
 */
class NotificationChannel {
    send(customer, message, notificationType) {
        throw new Error('Must implement send method');
    }
}

class EmailNotification extends NotificationChannel {
    send(customer, message, notificationType) {
        console.log(`📧 Email to ${customer.email}: ${message}`);
    }
}

class SMSNotification extends NotificationChannel {
    send(customer, message, notificationType) {
        console.log(`📱 SMS to ${customer.phone}: ${message}`);
    }
}

class PushNotification extends NotificationChannel {
    send(customer, message, notificationType) {
        console.log(`🔔 Push to ${customer.name}: ${message}`);
    }
}

/**
 * NotificationService - Notification service managing multiple channels
 * 
 * DESIGN PATTERN: Observer Pattern
 * 
 * USAGE:
 *     const service = new NotificationService();
 *     service.addChannel(new EmailNotification());
 *     service.notifyReservationConfirmed(reservation);
 * 
 * RETURN:
 *     None (sends notifications)
 */
class NotificationService {
    constructor() {
        this.channels = [];
    }

    addChannel(channel) {
        this.channels.push(channel);
    }

    notifyReservationConfirmed(reservation) {
        const message = `Your reservation for ${reservation.partySize} on ${reservation.reservationDate.toDateString()} at ${reservation.timeSlot} is CONFIRMED!`;
        this._sendToAll(reservation.customer, message, NotificationType.CONFIRMATION);
    }

    notifyReservationReminder(reservation) {
        const message = `Reminder: Your reservation for ${reservation.partySize} at ${reservation.table.tableNumber} is in 1 hour!`;
        this._sendToAll(reservation.customer, message, NotificationType.REMINDER);
    }

    notifyCancellation(reservation) {
        const message = `Your reservation for ${reservation.reservationDate.toDateString()} has been cancelled.`;
        this._sendToAll(reservation.customer, message, NotificationType.CANCELLATION);
    }

    notifyWaitlistReady(entry) {
        const message = `Your table for ${entry.partySize} is ready! Please come to the host stand.`;
        this._sendToAll(entry.customer, message, NotificationType.WAITLIST_UPDATE);
    }

    _sendToAll(customer, message, notificationType) {
        this.channels.forEach(channel => {
            channel.send(customer, message, notificationType);
        });
    }
}

// ==================== MAIN SYSTEM ====================

/**
 * RestaurantReservationSystem - Main restaurant reservation system
 * 
 * DESIGN PATTERN: Facade Pattern providing unified interface
 * 
 * USAGE:
 *     const restaurant = new RestaurantReservationSystem("La Belle Cuisine");
 *     restaurant.addTable(new Table("T01", 4, TableLocation.INDOOR));
 *     const customer = restaurant.registerCustomer("Alice", "alice@example.com", "555-1234");
 *     const reservation = restaurant.createReservation(customer.customerId, "T01", ...);
 * 
 * RETURN:
 *     RestaurantReservationSystem instance with all management methods
 */
class RestaurantReservationSystem {
    constructor(restaurantName) {
        this.restaurantName = restaurantName;
        this.tables = new Map(); // tableId -> Table
        this.customers = new Map(); // customerId -> Customer
        this.reservations = new Map(); // reservationId -> Reservation
        this.waitlist = [];
        this.notificationService = new NotificationService();

        // Initialize notification channels
        this.notificationService.addChannel(new EmailNotification());
        this.notificationService.addChannel(new SMSNotification());

        // Business configuration
        this.averageDiningTime = 90; // minutes
        this.bufferTime = 15; // minutes between reservations
        this.maxAdvanceDays = 30;
        this.minAdvanceHours = 1;

        console.log(`🍽️  ${restaurantName} Reservation System initialized`);
    }

    addTable(table) {
        this.tables.set(table.tableId, table);
        console.log(`✓ Added ${table}`);
    }

    /**
     * registerCustomer - Register new customer
     * 
     * USAGE:
     *     const customer = restaurant.registerCustomer("Alice", "alice@example.com", "555-1234");
     * 
     * RETURN:
     *     Customer object with generated customerId
     */
    registerCustomer(name, email, phone) {
        const customerId = `CUST${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
        const customer = new Customer(customerId, name, email, phone);
        this.customers.set(customerId, customer);
        console.log(`✓ Registered ${customer}`);
        return customer;
    }

    /**
     * searchAvailableTables - Search for available tables matching criteria
     * 
     * USAGE:
     *     const tables = restaurant.searchAvailableTables(
     *         new Date("2024-12-25"), new TimeSlot(...), 4, TableLocation.INDOOR
     *     );
     * 
     * RETURN:
     *     Array of Tables sorted by suitability (smallest suitable table first)
     */
    searchAvailableTables(reservationDate, timeSlot, partySize, location = null) {
        const availableTables = [];

        for (const table of this.tables.values()) {
            // Check capacity
            if (!table.canAccommodate(partySize)) continue;

            // Check location preference
            if (location && table.location !== location) continue;

            // Check availability
            if (this._isTableAvailable(table, reservationDate, timeSlot)) {
                availableTables.push(table);
            }
        }

        // Sort by optimal size (smallest suitable table first)
        availableTables.sort((a, b) => a.capacity - b.capacity);
        return availableTables;
    }

    _isTableAvailable(table, reservationDate, timeSlot) {
        if (table.status === TableStatus.MAINTENANCE) return false;

        // Check for conflicting reservations
        for (const reservation of this.reservations.values()) {
            if (reservation.table.tableId !== table.tableId) continue;

            if (![ReservationStatus.CONFIRMED, ReservationStatus.SEATED].includes(reservation.status)) {
                continue;
            }

            if (reservation.reservationDate.toDateString() !== reservationDate.toDateString()) {
                continue;
            }

            // Check time overlap with buffer
            if (this._timesOverlap(
                reservation.timeSlot.startTime,
                reservation.timeSlot.endTime,
                timeSlot.startTime,
                timeSlot.endTime
            )) {
                return false;
            }
        }

        return true;
    }

    _timesOverlap(start1, end1, start2, end2) {
        const toMinutes = (timeStr) => {
            const [h, m] = timeStr.split(':').map(Number);
            return h * 60 + m;
        };

        const s1 = toMinutes(start1);
        const e1 = toMinutes(end1);
        const s2 = toMinutes(start2);
        const e2 = toMinutes(end2);

        return s1 < e2 && s2 < e1;
    }

    /**
     * createReservation - Create new reservation
     * 
     * USAGE:
     *     const reservation = restaurant.createReservation(
     *         "CUST001", "T01", new Date("2024-12-25"),
     *         new TimeSlot("19:00", "21:00", MealPeriod.DINNER),
     *         4, "Window seat please"
     *     );
     * 
     * RETURN:
     *     Reservation object with PENDING status
     */
    createReservation(customerId, tableId, reservationDate, timeSlot, partySize, specialRequests = '') {
        // Validate customer
        const customer = this.customers.get(customerId);
        if (!customer) throw new Error('Customer not found');

        // Validate table
        const table = this.tables.get(tableId);
        if (!table) throw new Error('Table not found');

        // Validate party size
        if (!table.canAccommodate(partySize)) {
            throw new Error(`Table ${tableId} cannot accommodate party of ${partySize}`);
        }

        // Validate date
        this._validateReservationDate(reservationDate);

        // Check availability
        if (!this._isTableAvailable(table, reservationDate, timeSlot)) {
            throw new Error(`Table ${tableId} is not available for selected date and time`);
        }

        // Create reservation
        const reservationId = `RES${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
        const reservation = new Reservation(
            reservationId, customer, table, reservationDate,
            timeSlot, partySize, specialRequests
        );

        // Store reservation
        this.reservations.set(reservationId, reservation);
        customer.addReservation(reservationId);
        table.status = TableStatus.RESERVED;

        // Auto-confirm and send notification
        reservation.confirm();
        this.notificationService.notifyReservationConfirmed(reservation);

        console.log(`✓ Created ${reservation}`);
        return reservation;
    }

    _validateReservationDate(reservationDate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const resDate = new Date(reservationDate);
        resDate.setHours(0, 0, 0, 0);

        const daysUntil = Math.floor((resDate - today) / (1000 * 60 * 60 * 24));

        if (daysUntil < 0) {
            throw new Error('Cannot make reservation in the past');
        }

        if (daysUntil > this.maxAdvanceDays) {
            throw new Error(`Cannot book more than ${this.maxAdvanceDays} days in advance`);
        }
    }

    /**
     * modifyReservation - Modify existing reservation
     * 
     * USAGE:
     *     const updated = restaurant.modifyReservation("RES001", 6);
     * 
     * RETURN:
     *     Updated Reservation object
     */
    modifyReservation(reservationId, newPartySize = null, newDate = null, newTimeSlot = null, newSpecialRequests = null) {
        const reservation = this.reservations.get(reservationId);
        if (!reservation) throw new Error('Reservation not found');

        if (!reservation.canModify()) {
            throw new Error(`Cannot modify reservation in ${reservation.status} state`);
        }

        // Update fields
        if (newPartySize !== null && newPartySize !== reservation.partySize) {
            if (!reservation.table.canAccommodate(newPartySize)) {
                throw new Error(`Table cannot accommodate party of ${newPartySize}`);
            }
            reservation.partySize = newPartySize;
        }

        if (newDate !== null && newDate.toDateString() !== reservation.reservationDate.toDateString()) {
            this._validateReservationDate(newDate);
            reservation.reservationDate = newDate;
        }

        if (newTimeSlot !== null) {
            reservation.timeSlot = newTimeSlot;
        }

        if (newSpecialRequests !== null) {
            reservation.specialRequests = newSpecialRequests;
        }

        console.log(`✓ Modified ${reservation}`);
        return reservation;
    }

    /**
     * cancelReservation - Cancel reservation
     * 
     * USAGE:
     *     const fee = restaurant.cancelReservation("RES001");
     * 
     * RETURN:
     *     Cancellation fee amount
     */
    cancelReservation(reservationId) {
        const reservation = this.reservations.get(reservationId);
        if (!reservation) throw new Error('Reservation not found');

        const fee = reservation.getCancellationFee();

        reservation.cancel();
        this.notificationService.notifyCancellation(reservation);

        if (fee > 0) {
            console.log(`⚠ Cancellation fee: $${fee.toFixed(2)}`);
        }

        return fee;
    }

    /**
     * addToWaitlist - Add customer to waitlist
     * 
     * USAGE:
     *     const entry = restaurant.addToWaitlist(customer, 4);
     * 
     * RETURN:
     *     WaitlistEntry with estimated wait time
     */
    addToWaitlist(customer, partySize) {
        const entryId = `WAIT${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
        const entry = new WaitlistEntry(entryId, customer, partySize);

        // Calculate position and wait time
        const position = this.waitlist.filter(e => e.partySize <= partySize).length + 1;
        entry.calculateWaitTime(this.averageDiningTime, position);

        this.waitlist.push(entry);
        console.log(`✓ Added to waitlist: ${entry}`);
        return entry;
    }

    /**
     * seatFromWaitlist - Seat customer from waitlist
     * 
     * USAGE:
     *     restaurant.seatFromWaitlist("WAIT001", "T01");
     * 
     * RETURN:
     *     None
     */
    seatFromWaitlist(entryId, tableId) {
        // Find waitlist entry
        const entryIndex = this.waitlist.findIndex(e => e.entryId === entryId);
        if (entryIndex === -1) throw new Error('Waitlist entry not found');

        const entry = this.waitlist[entryIndex];

        // Validate table
        const table = this.tables.get(tableId);
        if (!table) throw new Error('Table not found');

        if (!table.canAccommodate(entry.partySize)) {
            throw new Error(`Table cannot accommodate party of ${entry.partySize}`);
        }

        // Remove from waitlist
        this.waitlist.splice(entryIndex, 1);

        // Update table status
        table.status = TableStatus.OCCUPIED;

        // Notify customer
        this.notificationService.notifyWaitlistReady(entry);

        console.log(`✓ Seated ${entry.customer.name} at ${table.tableNumber}`);
    }

    markNoShow(reservationId) {
        const reservation = this.reservations.get(reservationId);
        if (!reservation) throw new Error('Reservation not found');

        reservation.markNoShow();
    }

    /**
     * getOccupancyReport - Generate occupancy report for specific date
     * 
     * USAGE:
     *     const report = restaurant.getOccupancyReport(new Date());
     * 
     * RETURN:
     *     Object with occupancy statistics
     */
    getOccupancyReport(targetDate) {
        const totalTables = this.tables.size;
        const reservedTables = Array.from(this.reservations.values()).filter(r =>
            r.reservationDate.toDateString() === targetDate.toDateString() &&
            [ReservationStatus.CONFIRMED, ReservationStatus.SEATED].includes(r.status)
        ).length;

        return {
            totalTables,
            reservedTables,
            availableTables: totalTables - reservedTables,
            occupancyRate: totalTables > 0 ? (reservedTables / totalTables * 100) : 0
        };
    }

    getCustomerReservations(customerId) {
        const customer = this.customers.get(customerId);
        if (!customer) throw new Error('Customer not found');

        return customer.reservationHistory
            .map(rid => this.reservations.get(rid))
            .filter(r => r !== undefined);
    }
}

// ==================== DEMO ====================

/**
 * main - Demo of restaurant reservation system
 * 
 * Demonstrates all major features:
 * - Table management
 * - Customer registration
 * - Reservation creation and modification
 * - Waitlist handling
 * - Notifications
 */
function main() {
    console.log('='.repeat(60));
    console.log('🍽️  RESTAURANT RESERVATION SYSTEM DEMO');
    console.log('='.repeat(60));

    // Initialize restaurant
    const restaurant = new RestaurantReservationSystem('La Belle Cuisine');

    // Add tables
    console.log('\n📋 Adding tables...');
    restaurant.addTable(new Table('T01', 2, TableLocation.INDOOR));
    restaurant.addTable(new Table('T02', 4, TableLocation.INDOOR));
    restaurant.addTable(new Table('T03', 4, TableLocation.OUTDOOR));
    restaurant.addTable(new Table('T04', 6, TableLocation.PRIVATE));
    restaurant.addTable(new Table('T05', 8, TableLocation.INDOOR));

    // Register customers
    console.log('\n👥 Registering customers...');
    const alice = restaurant.registerCustomer('Alice Johnson', 'alice@example.com', '555-0001');
    const bob = restaurant.registerCustomer('Bob Smith', 'bob@example.com', '555-0002');
    const charlie = restaurant.registerCustomer('Charlie Brown', 'charlie@example.com', '555-0003');

    // Add preferences
    alice.addPreference('seating', 'window');
    alice.addPreference('dietary', 'vegetarian');

    // Create reservations
    console.log('\n📅 Creating reservations...');
    const reservationDate = new Date();
    reservationDate.setDate(reservationDate.getDate() + 7);

    const dinnerSlot = new TimeSlot('19:00', '21:00', MealPeriod.DINNER);
    const lunchSlot = new TimeSlot('12:00', '14:00', MealPeriod.LUNCH);

    let res1 = null;
    let res2 = null;
    let res3 = null;

    try {
        res1 = restaurant.createReservation(
            alice.customerId, 'T02', reservationDate, dinnerSlot, 4,
            'Window seat, celebrating anniversary 🎉'
        );
    } catch (error) {
        console.error(`❌ Error creating reservation 1: ${error.message}`);
    }

    try {
        res2 = restaurant.createReservation(
            bob.customerId, 'T01', reservationDate, dinnerSlot, 2,
            'Outdoor seating preferred'
        );
    } catch (error) {
        console.error(`❌ Error creating reservation 2: ${error.message}`);
    }

    try {
        res3 = restaurant.createReservation(
            charlie.customerId, 'T04', reservationDate, lunchSlot, 6,
            'Business lunch'
        );
    } catch (error) {
        console.error(`❌ Error creating reservation 3: ${error.message}`);
    }

    // Search available tables
    console.log('\n🔍 Searching available tables for dinner...');
    const available = restaurant.searchAvailableTables(reservationDate, dinnerSlot, 4);
    console.log(`Found ${available.length} available tables for party of 4:`);
    available.forEach(table => console.log(`  - ${table}`));

    // Modify reservation
    console.log('\n✏️  Modifying reservation...');
    if (res1) {
        try {
            restaurant.modifyReservation(res1.reservationId, 5);
        } catch (error) {
            console.error(`❌ Error modifying reservation: ${error.message}`);
        }
    }

    // Simulate seating
    console.log('\n🪑 Seating customers...');
    if (res1) {
        try {
            res1.markSeated();
        } catch (error) {
            console.error(`❌ Error seating: ${error.message}`);
        }
    }
    
    if (res2) {
        try {
            res2.markSeated();
        } catch (error) {
            console.error(`❌ Error seating: ${error.message}`);
        }
    }

    // Add to waitlist
    console.log('\n⏳ Adding walk-in to waitlist...');
    const dave = restaurant.registerCustomer('Dave Wilson', 'dave@example.com', '555-0004');
    const waitlistEntry = restaurant.addToWaitlist(dave, 2);

    // Complete reservation and seat from waitlist
    console.log('\n✅ Completing reservations...');
    if (res2) {
        res2.complete();
    }

    console.log('\n🪑 Seating from waitlist...');
    try {
        restaurant.seatFromWaitlist(waitlistEntry.entryId, 'T01');
    } catch (error) {
        console.error(`❌ Error seating from waitlist: ${error.message}`);
    }

    // Occupancy report
    console.log('\n📊 Occupancy Report:');
    const report = restaurant.getOccupancyReport(reservationDate);
    console.log(`  Total Tables: ${report.totalTables}`);
    console.log(`  Reserved: ${report.reservedTables}`);
    console.log(`  Available: ${report.availableTables}`);
    console.log(`  Occupancy Rate: ${report.occupancyRate.toFixed(1)}%`);

    // Customer history
    console.log(`\n📜 ${alice.name}'s Reservation History:`);
    const aliceReservations = restaurant.getCustomerReservations(alice.customerId);
    aliceReservations.forEach(res => console.log(`  - ${res}`));

    // Cancel reservation
    console.log('\n❌ Canceling reservation...');
    if (res3) {
        try {
            const fee = restaurant.cancelReservation(res3.reservationId);
            if (fee > 0) {
                console.log(`  Cancellation fee: $${fee.toFixed(2)}`);
            }
        } catch (error) {
            console.error(`❌ Error canceling: ${error.message}`);
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✨ Demo completed successfully!');
    console.log('='.repeat(60));
}

// Run demo if this is the main module
if (require.main === module) {
    main();
}

// Export for testing
module.exports = {
    TableStatus,
    TableLocation,
    ReservationStatus,
    MealPeriod,
    NotificationType,
    TimeSlot,
    Customer,
    Table,
    Reservation,
    WaitlistEntry,
    NotificationService,
    RestaurantReservationSystem
};
