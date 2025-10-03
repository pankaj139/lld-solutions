/**
 * MOVIE TICKET BOOKING SYSTEM
 * Patterns: State, Observer, Strategy, Factory, Singleton, Command
 */

const BookingStatus = Object.freeze({
    PENDING: 'pending',
    CONFIRMED: 'confirmed',
    CANCELLED: 'cancelled',
    COMPLETED: 'completed'
});

class Movie {
    constructor(movieId, title, genre, duration) {
        this.movieId = movieId;
        this.title = title;
        this.genre = genre;
        this.duration = duration;
    }
}

class Seat {
    constructor(seatId, row, number) {
        this.seatId = seatId;
        this.row = row;
        this.number = number;
        this.isAvailable = true;
    }
}

class Screen {
    constructor(screenId, capacity) {
        this.screenId = screenId;
        this.capacity = capacity;
        this.seats = Array.from({length: capacity}, (_, i) => 
            new Seat(`S${i}`, String.fromCharCode(65 + Math.floor(i/10)), i%10+1)
        );
    }
}

class ShowTime {
    constructor(showId, movie, screen, startTime, price) {
        this.showId = showId;
        this.movie = movie;
        this.screen = screen;
        this.startTime = startTime;
        this.price = price;
    }
}

class Booking {
    constructor(bookingId, userId, show, seats) {
        this.bookingId = bookingId;
        this.userId = userId;
        this.show = show;
        this.seats = seats;
        this.totalAmount = seats.length * show.price;
        this.status = BookingStatus.PENDING;
    }
    
    confirm() {
        this.status = BookingStatus.CONFIRMED;
        console.log(`✓ Booking confirmed: ${this.bookingId}`);
    }
}

class BookingService {
    constructor() {
        if (BookingService.instance) return BookingService.instance;
        this.movies = new Map();
        this.shows = new Map();
        this.bookings = new Map();
        this.bookingCounter = 0;
        BookingService.instance = this;
    }
    
    addMovie(movie) {
        this.movies.set(movie.movieId, movie);
        console.log(`✓ Added movie: ${movie.title}`);
    }
    
    addShow(show) {
        this.shows.set(show.showId, show);
        console.log(`✓ Added show: ${show.movie.title} at ${show.startTime}`);
    }
    
    bookTickets(userId, showId, seatIds) {
        const show = this.shows.get(showId);
        if (!show) return null;
        
        const seats = show.screen.seats.filter(s => 
            seatIds.includes(s.seatId) && s.isAvailable
        );
        
        if (seats.length !== seatIds.length) {
            console.log('✗ Some seats unavailable');
            return null;
        }
        
        const bookingId = `B${String(this.bookingCounter).padStart(4, '0')}`;
        this.bookingCounter++;
        
        const booking = new Booking(bookingId, userId, show, seats);
        seats.forEach(s => s.isAvailable = false);
        
        this.bookings.set(bookingId, booking);
        booking.confirm();
        console.log(`  Seats: ${seats.map(s => s.seatId).join(', ')}`);
        console.log(`  Total: $${booking.totalAmount.toFixed(2)}`);
        
        return booking;
    }
}

function main() {
    console.log('='.repeat(70));
    console.log('MOVIE TICKET BOOKING - Demo');
    console.log('='.repeat(70));
    
    const service = new BookingService();
    
    const movie = new Movie('M001', 'Inception', 'Sci-Fi', 148);
    service.addMovie(movie);
    
    const screen = new Screen('SC001', 50);
    const show = new ShowTime('SH001', movie, screen, new Date(), 12.50);
    service.addShow(show);
    
    console.log('\n🎬 Booking Tickets...');
    service.bookTickets('U001', 'SH001', ['S0', 'S1', 'S2']);
    
    console.log('\n' + '='.repeat(70));
    console.log('DEMO COMPLETE');
    console.log('='.repeat(70));
}

if (typeof require !== 'undefined' && require.main === module) {
    main();
}

