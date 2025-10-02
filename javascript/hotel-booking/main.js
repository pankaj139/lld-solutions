// Hotel Booking System in JavaScript

// Enums
const RoomType = {
    SINGLE: 'SINGLE',
    DOUBLE: 'DOUBLE', 
    SUITE: 'SUITE',
    DELUXE: 'DELUXE'
};

const RoomStatus = {
    AVAILABLE: 'AVAILABLE',
    BOOKED: 'BOOKED',
    OCCUPIED: 'OCCUPIED',
    MAINTENANCE: 'MAINTENANCE'
};

const BookingStatus = {
    CONFIRMED: 'CONFIRMED',
    PENDING: 'PENDING',
    CANCELLED: 'CANCELLED',
    CHECKED_IN: 'CHECKED_IN',
    CHECKED_OUT: 'CHECKED_OUT'
};

const PaymentStatus = {
    PENDING: 'PENDING',
    COMPLETED: 'COMPLETED',
    FAILED: 'FAILED',
    REFUNDED: 'REFUNDED'
};

// Simple UUID generator
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

class Guest {
    constructor(guestId, name, email, phone) {
        this.guestId = guestId;
        this.name = name;
        this.email = email;
        this.phone = phone;
        this.bookings = []; // booking_ids
    }
}

class Room {
    constructor(roomNumber, roomType, pricePerNight) {
        this.roomNumber = roomNumber;
        this.roomType = roomType;
        this.pricePerNight = pricePerNight;
        this.status = RoomStatus.AVAILABLE;
        this.amenities = [];
        this.floor = parseInt(roomNumber.charAt(0)) || 1;
    }

    setStatus(status) {
        this.status = status;
    }

    addAmenity(amenity) {
        if (!this.amenities.includes(amenity)) {
            this.amenities.push(amenity);
        }
    }
}

class Booking {
    constructor(bookingId, guest, room, checkInDate, checkOutDate) {
        this.bookingId = bookingId;
        this.guest = guest;
        this.room = room;
        this.checkInDate = checkInDate;
        this.checkOutDate = checkOutDate;
        this.bookingDate = new Date();
        this.status = BookingStatus.PENDING;
        this.totalAmount = this._calculateTotalAmount();
        this.paymentStatus = PaymentStatus.PENDING;
    }

    _calculateTotalAmount() {
        const nights = Math.ceil((this.checkOutDate - this.checkInDate) / (24 * 60 * 60 * 1000));
        return nights * this.room.pricePerNight;
    }

    confirmBooking() {
        this.status = BookingStatus.CONFIRMED;
        this.room.setStatus(RoomStatus.BOOKED);
    }

    cancelBooking() {
        this.status = BookingStatus.CANCELLED;
        this.room.setStatus(RoomStatus.AVAILABLE);
    }

    checkIn() {
        if (this.status !== BookingStatus.CONFIRMED) {
            throw new Error("Booking must be confirmed before check-in");
        }
        this.status = BookingStatus.CHECKED_IN;
        this.room.setStatus(RoomStatus.OCCUPIED);
    }

    checkOut() {
        if (this.status !== BookingStatus.CHECKED_IN) {
            throw new Error("Guest must be checked in before check-out");
        }
        this.status = BookingStatus.CHECKED_OUT;
        this.room.setStatus(RoomStatus.AVAILABLE);
    }
}

class Payment {
    constructor(paymentId, booking, amount, paymentMethod) {
        this.paymentId = paymentId;
        this.booking = booking;
        this.amount = amount;
        this.paymentMethod = paymentMethod;
        this.paymentDate = new Date();
        this.status = PaymentStatus.PENDING;
    }

    processPayment() {
        try {
            console.log(`Processing payment of $${this.amount} via ${this.paymentMethod}`);
            this.status = PaymentStatus.COMPLETED;
            this.booking.paymentStatus = PaymentStatus.COMPLETED;
            return true;
        } catch (e) {
            console.log(`Payment failed: ${e.message}`);
            this.status = PaymentStatus.FAILED;
            this.booking.paymentStatus = PaymentStatus.FAILED;
            return false;
        }
    }

    refundPayment() {
        if (this.status !== PaymentStatus.COMPLETED) {
            return false;
        }
        
        this.status = PaymentStatus.REFUNDED;
        this.booking.paymentStatus = PaymentStatus.REFUNDED;
        console.log(`Refunded $${this.amount} to ${this.paymentMethod}`);
        return true;
    }
}

class RoomSearchCriteria {
    constructor(checkInDate, checkOutDate, roomType = null, maxPrice = null) {
        this.checkInDate = checkInDate;
        this.checkOutDate = checkOutDate;
        this.roomType = roomType;
        this.maxPrice = maxPrice;
    }
}

class HotelBookingSystem {
    constructor(hotelName) {
        this.hotelName = hotelName;
        this.rooms = new Map(); // roomNumber -> Room
        this.guests = new Map(); // guestId -> Guest
        this.bookings = new Map(); // bookingId -> Booking
        this.payments = new Map(); // paymentId -> Payment
    }

    addRoom(room) {
        this.rooms.set(room.roomNumber, room);
    }

    registerGuest(name, email, phone) {
        const guestId = generateUUID();
        const guest = new Guest(guestId, name, email, phone);
        this.guests.set(guestId, guest);
        return guest;
    }

    searchAvailableRooms(criteria) {
        const availableRooms = [];
        
        for (const room of this.rooms.values()) {
            // Check if room matches criteria
            if (criteria.roomType && room.roomType !== criteria.roomType) {
                continue;
            }
            
            if (criteria.maxPrice && room.pricePerNight > criteria.maxPrice) {
                continue;
            }
            
            // Check availability for the date range
            if (this._isRoomAvailable(room, criteria.checkInDate, criteria.checkOutDate)) {
                availableRooms.push(room);
            }
        }
        
        return availableRooms.sort((a, b) => a.pricePerNight - b.pricePerNight);
    }

    _isRoomAvailable(room, checkIn, checkOut) {
        // Check if room has any conflicting bookings
        for (const booking of this.bookings.values()) {
            if (booking.room.roomNumber === room.roomNumber) {
                if ([BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN].includes(booking.status)) {
                    // Check for date overlap
                    if (checkIn < booking.checkOutDate && checkOut > booking.checkInDate) {
                        return false;
                    }
                }
            }
        }
        
        return [RoomStatus.AVAILABLE, RoomStatus.BOOKED].includes(room.status);
    }

    createBooking(guestId, roomNumber, checkInDate, checkOutDate) {
        if (!this.guests.has(guestId)) {
            throw new Error("Guest not found");
        }
        
        if (!this.rooms.has(roomNumber)) {
            throw new Error("Room not found");
        }
        
        const guest = this.guests.get(guestId);
        const room = this.rooms.get(roomNumber);
        
        // Validate dates
        if (checkInDate >= checkOutDate) {
            throw new Error("Check-out date must be after check-in date");
        }
        
        if (checkInDate < new Date()) {
            throw new Error("Check-in date cannot be in the past");
        }
        
        // Check room availability
        if (!this._isRoomAvailable(room, checkInDate, checkOutDate)) {
            throw new Error("Room is not available for the selected dates");
        }
        
        const bookingId = generateUUID();
        const booking = new Booking(bookingId, guest, room, checkInDate, checkOutDate);
        
        this.bookings.set(bookingId, booking);
        guest.bookings.push(bookingId);
        
        return booking;
    }

    confirmBooking(bookingId, paymentMethod) {
        if (!this.bookings.has(bookingId)) {
            throw new Error("Booking not found");
        }
        
        const booking = this.bookings.get(bookingId);
        
        // Process payment
        const paymentId = generateUUID();
        const payment = new Payment(paymentId, booking, booking.totalAmount, paymentMethod);
        
        if (payment.processPayment()) {
            booking.confirmBooking();
            this.payments.set(paymentId, payment);
            console.log(`Booking ${booking.bookingId} confirmed for ${booking.guest.name}`);
            return true;
        } else {
            console.log(`Payment failed for booking ${booking.bookingId}`);
            return false;
        }
    }

    checkInGuest(bookingId) {
        if (!this.bookings.has(bookingId)) {
            throw new Error("Booking not found");
        }
        
        const booking = this.bookings.get(bookingId);
        
        // Check if it's the check-in date
        const today = new Date().toDateString();
        if (booking.checkInDate.toDateString() > today) {
            throw new Error("Check-in date has not arrived yet");
        }
        
        booking.checkIn();
        console.log(`Guest ${booking.guest.name} checked in to room ${booking.room.roomNumber}`);
        return true;
    }

    checkOutGuest(bookingId) {
        if (!this.bookings.has(bookingId)) {
            throw new Error("Booking not found");
        }
        
        const booking = this.bookings.get(bookingId);
        booking.checkOut();
        console.log(`Guest ${booking.guest.name} checked out from room ${booking.room.roomNumber}`);
        return true;
    }

    getOccupancyReport(date) {
        const totalRooms = this.rooms.size;
        let occupiedRooms = 0;
        let availableRooms = 0;
        let maintenanceRooms = 0;
        
        for (const room of this.rooms.values()) {
            if (room.status === RoomStatus.OCCUPIED) {
                occupiedRooms++;
            } else if (room.status === RoomStatus.AVAILABLE) {
                availableRooms++;
            } else if (room.status === RoomStatus.MAINTENANCE) {
                maintenanceRooms++;
            }
        }
        
        const occupancyRate = totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0;
        
        return {
            date: date.toISOString().split('T')[0],
            totalRooms: totalRooms,
            occupiedRooms: occupiedRooms,
            availableRooms: availableRooms,
            maintenanceRooms: maintenanceRooms,
            occupancyRate: Math.round(occupancyRate * 100) / 100
        };
    }
}

// Demo usage
function main() {
    // Create hotel booking system
    const hotel = new HotelBookingSystem("Grand Palace Hotel");
    
    // Add rooms
    const roomsData = [
        ["101", RoomType.SINGLE, 100.0],
        ["102", RoomType.SINGLE, 100.0],
        ["201", RoomType.DOUBLE, 150.0],
        ["202", RoomType.DOUBLE, 150.0],
        ["301", RoomType.SUITE, 300.0],
        ["401", RoomType.DELUXE, 500.0]
    ];
    
    for (const [roomNumber, roomType, price] of roomsData) {
        const room = new Room(roomNumber, roomType, price);
        room.addAmenity("WiFi");
        room.addAmenity("TV");
        if ([RoomType.SUITE, RoomType.DELUXE].includes(roomType)) {
            room.addAmenity("Mini Bar");
            room.addAmenity("Balcony");
        }
        hotel.addRoom(room);
    }
    
    console.log(`Hotel '${hotel.hotelName}' initialized with ${hotel.rooms.size} rooms`);
    
    // Register guests
    const guest1 = hotel.registerGuest("John Doe", "john@example.com", "123-456-7890");
    const guest2 = hotel.registerGuest("Jane Smith", "jane@example.com", "098-765-4321");
    
    // Search for available rooms
    const checkIn = new Date();
    checkIn.setDate(checkIn.getDate() + 1);
    const checkOut = new Date();
    checkOut.setDate(checkOut.getDate() + 3);
    
    const criteria = new RoomSearchCriteria(checkIn, checkOut, RoomType.DOUBLE, 200.0);
    const availableRooms = hotel.searchAvailableRooms(criteria);
    
    console.log(`\nAvailable ${criteria.roomType} rooms for ${checkIn.toDateString()} to ${checkOut.toDateString()}:`);
    for (const room of availableRooms) {
        console.log(`  Room ${room.roomNumber}: $${room.pricePerNight}/night`);
    }
    
    // Create and confirm booking
    if (availableRooms.length > 0) {
        try {
            const booking = hotel.createBooking(guest1.guestId, availableRooms[0].roomNumber, 
                                              checkIn, checkOut);
            console.log(`\nBooking created: ${booking.bookingId}`);
            console.log(`Total amount: $${booking.totalAmount}`);
            
            // Confirm booking with payment
            if (hotel.confirmBooking(booking.bookingId, "Credit Card")) {
                console.log("Booking confirmed successfully!");
                
                // Simulate check-in (would normally happen on check-in date)
                console.log("\n--- Simulating Check-in ---");
                booking.checkInDate = new Date(); // Simulate it's check-in day
                hotel.checkInGuest(booking.bookingId);
                
                // Get occupancy report
                const report = hotel.getOccupancyReport(new Date());
                console.log(`\nOccupancy Report:`);
                console.log(`  Occupied: ${report.occupiedRooms}/${report.totalRooms} rooms`);
                console.log(`  Occupancy Rate: ${report.occupancyRate}%`);
            }
        } catch (e) {
            console.log(`Error: ${e.message}`);
        }
    }
}

// Export for use in other modules (Node.js)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        RoomType,
        RoomStatus,
        BookingStatus,
        PaymentStatus,
        Guest,
        Room,
        Booking,
        Payment,
        RoomSearchCriteria,
        HotelBookingSystem
    };
}

// Run demo if this file is executed directly
if (require.main === module) {
    main();
}