# Movie Ticket Booking System

## 🔗 Implementation Links

- **Python Implementation**: [python/movie-ticket-booking/main.py](python/movie-ticket-booking/main.py)
- **JavaScript Implementation**: [javascript/movie-ticket-booking/main.js](javascript/movie-ticket-booking/main.js)

## Problem Statement

Design a movie ticket booking system that allows users to browse movies, select showtimes, choose seats, and book tickets online.

## Requirements

### Functional Requirements

- Browse movies with details (title, genre, duration, rating)
- View showtimes for theaters
- Select seats from seating layout
- Book multiple seats in single transaction
- Handle concurrent booking conflicts
- Process payments
- Generate booking confirmation
- Cancel bookings with refunds

### Non-Functional Requirements

- Handle 10,000+ concurrent users
- Seat locking during selection (5 min timeout)
- Real-time seat availability
- ACID compliance for bookings

## Design Patterns Used

1. **State Pattern**: Booking status
2. **Observer Pattern**: Seat availability notifications
3. **Strategy Pattern**: Pricing strategies
4. **Factory Pattern**: Booking creation
5. **Singleton Pattern**: BookingService
6. **Command Pattern**: Booking operations

## State Diagram

```text
BOOKING LIFECYCLE:
PENDING → CONFIRMED → COMPLETED
       ↓           ↓
   CANCELLED   CANCELLED
```

## Class Diagram

```text
Movie
├── movie_id: str
├── title: str
├── genre: str
└── duration: int

Theater
├── theater_id: str
├── name: str
└── screens: List[Screen]

Screen
├── screen_id: str
├── seats: List[Seat]
└── capacity: int

Seat
├── seat_id: str
├── row: str
├── number: int
└── is_available: bool

ShowTime
├── show_id: str
├── movie: Movie
├── screen: Screen
├── start_time: datetime
└── price: float

Booking
├── booking_id: str
├── user: User
├── show: ShowTime
├── seats: List[Seat]
├── total_amount: float
└── status: BookingStatus
```

## Time Complexity

- **Search Movies**: O(log n)
- **Book Seats**: O(s) where s is seats
- **Check Availability**: O(1)

## Space Complexity

- O(m) for movies
- O(t) for theaters
- O(b) for bookings

