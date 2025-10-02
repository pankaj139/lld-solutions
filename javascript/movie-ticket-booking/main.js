// Movie Ticket Booking System in JavaScript

// Enums
const MovieGenre = {
    ACTION: 'ACTION',
    COMEDY: 'COMEDY',
    DRAMA: 'DRAMA',
    HORROR: 'HORROR',
    ROMANCE: 'ROMANCE',
    THRILLER: 'THRILLER',
    DOCUMENTARY: 'DOCUMENTARY'
};

const SeatType = {
    REGULAR: 'REGULAR',
    PREMIUM: 'PREMIUM',
    VIP: 'VIP'
};

const SeatStatus = {
    AVAILABLE: 'AVAILABLE',
    BOOKED: 'BOOKED',
    RESERVED: 'RESERVED'
};

const BookingStatus = {
    PENDING: 'PENDING',
    CONFIRMED: 'CONFIRMED',
    CANCELLED: 'CANCELLED'
};

const PaymentStatus = {
    PENDING: 'PENDING',
    COMPLETED: 'COMPLETED',
    FAILED: 'FAILED'
};

// Simple UUID generator
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

class Movie {
    constructor(movieId, title, description, durationMinutes, genre) {
        this.movieId = movieId;
        this.title = title;
        this.description = description;
        this.durationMinutes = durationMinutes;
        this.genre = genre;
        this.rating = "PG-13";
        this.releaseDate = new Date();
    }
}

class Theater {
    constructor(theaterId, name, location) {
        this.theaterId = theaterId;
        this.name = name;
        this.location = location;
        this.screens = new Map(); // screenId -> Screen
    }

    addScreen(screen) {
        this.screens.set(screen.screenId, screen);
    }
}

class Seat {
    constructor(seatId, row, number, seatType) {
        this.seatId = seatId;
        this.row = row;
        this.number = number;
        this.seatType = seatType;
        this.status = SeatStatus.AVAILABLE;
    }

    reserve() {
        if (this.status === SeatStatus.AVAILABLE) {
            this.status = SeatStatus.RESERVED;
            return true;
        }
        return false;
    }

    book() {
        if ([SeatStatus.AVAILABLE, SeatStatus.RESERVED].includes(this.status)) {
            this.status = SeatStatus.BOOKED;
            return true;
        }
        return false;
    }

    release() {
        this.status = SeatStatus.AVAILABLE;
    }
}

class Screen {
    constructor(screenId, name, totalSeats) {
        this.screenId = screenId;
        this.name = name;
        this.totalSeats = totalSeats;
        this.seats = new Map(); // seatId -> Seat
        this._initializeSeats();
    }

    _initializeSeats() {
        const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
        const seatsPerRow = Math.floor(this.totalSeats / rows.length);
        
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            for (let seatNum = 1; seatNum <= seatsPerRow; seatNum++) {
                let seatType;
                if (i < 2) {
                    seatType = SeatType.VIP;
                } else if (i < 4) {
                    seatType = SeatType.PREMIUM;
                } else {
                    seatType = SeatType.REGULAR;
                }
                
                const seatId = `${row}${seatNum}`;
                const seat = new Seat(seatId, row, seatNum, seatType);
                this.seats.set(seatId, seat);
            }
        }
    }

    getAvailableSeats() {
        return Array.from(this.seats.values()).filter(seat => seat.status === SeatStatus.AVAILABLE);
    }
}

class ShowTime {
    constructor(showId, movie, screen, startTime) {
        this.showId = showId;
        this.movie = movie;
        this.screen = screen;
        this.startTime = startTime;
        this.endTime = new Date(startTime.getTime() + movie.durationMinutes * 60000);
        this.seatPricing = new Map([
            [SeatType.REGULAR, 10.0],
            [SeatType.PREMIUM, 15.0],
            [SeatType.VIP, 25.0]
        ]);
    }

    getAvailableSeats() {
        return this.screen.getAvailableSeats();
    }

    getSeatPrice(seatType) {
        return this.seatPricing.get(seatType);
    }
}

class Customer {
    constructor(customerId, name, email, phone) {
        this.customerId = customerId;
        this.name = name;
        this.email = email;
        this.phone = phone;
        this.bookingHistory = []; // booking_ids
    }
}

class Booking {
    constructor(bookingId, customer, showTime, seats) {
        this.bookingId = bookingId;
        this.customer = customer;
        this.showTime = showTime;
        this.seats = seats;
        this.bookingTime = new Date();
        this.status = BookingStatus.PENDING;
        this.totalAmount = this._calculateTotalAmount();
        this.paymentStatus = PaymentStatus.PENDING;
    }

    _calculateTotalAmount() {
        let total = 0.0;
        for (const seat of this.seats) {
            total += this.showTime.getSeatPrice(seat.seatType);
        }
        return total;
    }

    confirmBooking() {
        this.status = BookingStatus.CONFIRMED;
        for (const seat of this.seats) {
            seat.book();
        }
    }

    cancelBooking() {
        this.status = BookingStatus.CANCELLED;
        for (const seat of this.seats) {
            seat.release();
        }
    }
}

class Payment {
    constructor(paymentId, booking, amount, paymentMethod) {
        this.paymentId = paymentId;
        this.booking = booking;
        this.amount = amount;
        this.paymentMethod = paymentMethod;
        this.paymentTime = new Date();
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
            return false;
        }
    }
}

class SeatReservationManager {
    constructor() {
        this.reservations = new Map(); // seatId -> reservationTime
        this.reservationTimeout = 10; // minutes
    }

    reserveSeats(seats) {
        const currentTime = new Date();
        
        // Check if seats are available
        for (const seat of seats) {
            if (this.reservations.has(seat.seatId)) {
                const reservationTime = this.reservations.get(seat.seatId);
                const timeDiff = (currentTime - reservationTime) / (1000 * 60); // minutes
                if (timeDiff < this.reservationTimeout) {
                    return false; // Seat still reserved
                } else {
                    // Reservation expired
                    this.reservations.delete(seat.seatId);
                    seat.release();
                }
            }
        }
        
        // Reserve seats
        for (const seat of seats) {
            if (seat.reserve()) {
                this.reservations.set(seat.seatId, currentTime);
            } else {
                // Rollback if any seat cannot be reserved
                for (const reservedSeat of seats) {
                    if (this.reservations.has(reservedSeat.seatId)) {
                        this.reservations.delete(reservedSeat.seatId);
                        reservedSeat.release();
                    }
                }
                return false;
            }
        }
        
        return true;
    }

    releaseExpiredReservations() {
        const currentTime = new Date();
        const expiredSeats = [];
        
        for (const [seatId, reservationTime] of this.reservations) {
            const timeDiff = (currentTime - reservationTime) / (1000 * 60); // minutes
            if (timeDiff >= this.reservationTimeout) {
                expiredSeats.push(seatId);
            }
        }
        
        for (const seatId of expiredSeats) {
            this.reservations.delete(seatId);
        }
    }
}

class MovieTicketBookingSystem {
    constructor(systemName) {
        this.systemName = systemName;
        this.movies = new Map(); // movieId -> Movie
        this.theaters = new Map(); // theaterId -> Theater
        this.customers = new Map(); // customerId -> Customer
        this.showTimes = new Map(); // showId -> ShowTime
        this.bookings = new Map(); // bookingId -> Booking
        this.payments = new Map(); // paymentId -> Payment
        this.reservationManager = new SeatReservationManager();
    }

    addMovie(movie) {
        this.movies.set(movie.movieId, movie);
    }

    addTheater(theater) {
        this.theaters.set(theater.theaterId, theater);
    }

    registerCustomer(name, email, phone) {
        const customerId = generateUUID();
        const customer = new Customer(customerId, name, email, phone);
        this.customers.set(customerId, customer);
        return customer;
    }

    addShowTime(showTime) {
        this.showTimes.set(showTime.showId, showTime);
    }

    searchMovies(title = "", genre = null, theaterId = "", date = null) {
        const matchingShows = [];
        
        for (const show of this.showTimes.values()) {
            if (title && !show.movie.title.toLowerCase().includes(title.toLowerCase())) {
                continue;
            }
            if (genre && show.movie.genre !== genre) {
                continue;
            }
            if (theaterId && !this.theaters.get(theaterId)?.screens.has(show.screen.screenId)) {
                continue;
            }
            if (date && show.startTime.toDateString() !== date.toDateString()) {
                continue;
            }
            
            matchingShows.push(show);
        }
        
        return matchingShows.sort((a, b) => a.startTime - b.startTime);
    }

    getAvailableSeats(showId) {
        if (!this.showTimes.has(showId)) {
            return [];
        }
        
        // Clean up expired reservations first
        this.reservationManager.releaseExpiredReservations();
        
        const showTime = this.showTimes.get(showId);
        return showTime.getAvailableSeats();
    }

    reserveSeats(showId, seatIds) {
        if (!this.showTimes.has(showId)) {
            return false;
        }
        
        const showTime = this.showTimes.get(showId);
        const seats = [];
        
        for (const seatId of seatIds) {
            if (showTime.screen.seats.has(seatId)) {
                seats.push(showTime.screen.seats.get(seatId));
            } else {
                return false;
            }
        }
        
        return this.reservationManager.reserveSeats(seats);
    }

    createBooking(customerId, showId, seatIds) {
        if (!this.customers.has(customerId)) {
            throw new Error("Customer not found");
        }
        
        if (!this.showTimes.has(showId)) {
            throw new Error("Show not found");
        }
        
        const customer = this.customers.get(customerId);
        const showTime = this.showTimes.get(showId);
        
        // Get seats
        const seats = [];
        for (const seatId of seatIds) {
            if (showTime.screen.seats.has(seatId)) {
                const seat = showTime.screen.seats.get(seatId);
                if (seat.status !== SeatStatus.RESERVED) {
                    throw new Error(`Seat ${seatId} is not reserved`);
                }
                seats.push(seat);
            } else {
                throw new Error(`Seat ${seatId} not found`);
            }
        }
        
        const bookingId = generateUUID();
        const booking = new Booking(bookingId, customer, showTime, seats);
        
        this.bookings.set(bookingId, booking);
        customer.bookingHistory.push(bookingId);
        
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
            
            // Remove from reservation manager
            for (const seat of booking.seats) {
                if (this.reservationManager.reservations.has(seat.seatId)) {
                    this.reservationManager.reservations.delete(seat.seatId);
                }
            }
            
            console.log(`Booking ${booking.bookingId} confirmed`);
            return true;
        } else {
            console.log(`Payment failed for booking ${booking.bookingId}`);
            return false;
        }
    }
}

// Demo usage
function main() {
    // Create movie ticket booking system
    const system = new MovieTicketBookingSystem("CineMax");
    
    // Add movies
    const movie1 = new Movie("M1", "Avengers: Endgame", "Epic superhero movie", 180, MovieGenre.ACTION);
    const movie2 = new Movie("M2", "The Hangover", "Comedy about a bachelor party", 100, MovieGenre.COMEDY);
    
    system.addMovie(movie1);
    system.addMovie(movie2);
    
    // Add theater and screen
    const theater = new Theater("T1", "CineMax Downtown", "123 Main St");
    const screen = new Screen("S1", "Screen 1", 80);
    theater.addScreen(screen);
    system.addTheater(theater);
    
    // Add show times
    const show1 = new ShowTime("SH1", movie1, screen, new Date(Date.now() + 2 * 60 * 60 * 1000));
    const show2 = new ShowTime("SH2", movie2, screen, new Date(Date.now() + 5 * 60 * 60 * 1000));
    
    system.addShowTime(show1);
    system.addShowTime(show2);
    
    // Register customer
    const customer = system.registerCustomer("Alice Johnson", "alice@example.com", "123-456-7890");
    
    console.log(`Movie booking system '${system.systemName}' initialized`);
    console.log(`Added ${system.movies.size} movies and ${system.theaters.size} theaters`);
    
    // Search movies
    const actionMovies = system.searchMovies("", MovieGenre.ACTION);
    console.log(`\nFound ${actionMovies.length} action movies`);
    
    if (actionMovies.length > 0) {
        const show = actionMovies[0];
        console.log(`Show: ${show.movie.title} at ${show.startTime.toLocaleString()}`);
        
        // Check available seats
        const availableSeats = system.getAvailableSeats(show.showId);
        console.log(`Available seats: ${availableSeats.length}`);
        
        // Reserve some seats
        const seatIds = ["A1", "A2", "A3"];
        if (system.reserveSeats(show.showId, seatIds)) {
            console.log(`Reserved seats: ${seatIds.join(', ')}`);
            
            try {
                // Create booking
                const booking = system.createBooking(customer.customerId, show.showId, seatIds);
                console.log(`\nBooking created: ${booking.bookingId}`);
                console.log(`Total amount: $${booking.totalAmount}`);
                console.log(`Seats: ${booking.seats.map(seat => `${seat.row}${seat.number}`).join(', ')}`);
                
                // Confirm booking
                if (system.confirmBooking(booking.bookingId, "Credit Card")) {
                    console.log("Booking confirmed successfully!");
                }
                
            } catch (e) {
                console.log(`Error creating booking: ${e.message}`);
            }
        } else {
            console.log("Failed to reserve seats");
        }
    }
}

// Export for use in other modules (Node.js)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        MovieGenre,
        SeatType,
        SeatStatus,
        BookingStatus,
        PaymentStatus,
        Movie,
        Theater,
        Seat,
        Screen,
        ShowTime,
        Customer,
        Booking,
        Payment,
        SeatReservationManager,
        MovieTicketBookingSystem
    };
}

// Run demo if this file is executed directly
if (require.main === module) {
    main();
}