from abc import ABC, abstractmethod
from enum import Enum
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import uuid

class MovieGenre(Enum):
    ACTION = 1
    COMEDY = 2
    DRAMA = 3
    HORROR = 4
    ROMANCE = 5
    THRILLER = 6
    DOCUMENTARY = 7

class SeatType(Enum):
    REGULAR = 1
    PREMIUM = 2
    VIP = 3

class SeatStatus(Enum):
    AVAILABLE = 1
    BOOKED = 2
    RESERVED = 3

class BookingStatus(Enum):
    PENDING = 1
    CONFIRMED = 2
    CANCELLED = 3

class PaymentStatus(Enum):
    PENDING = 1
    COMPLETED = 2
    FAILED = 3

class Movie:
    def __init__(self, movie_id: str, title: str, description: str, duration_minutes: int, genre: MovieGenre):
        self.movie_id = movie_id
        self.title = title
        self.description = description
        self.duration_minutes = duration_minutes
        self.genre = genre
        self.rating = "PG-13"
        self.release_date = datetime.now()

class Theater:
    def __init__(self, theater_id: str, name: str, location: str):
        self.theater_id = theater_id
        self.name = name
        self.location = location
        self.screens: Dict[str, 'Screen'] = {}

    def add_screen(self, screen: 'Screen'):
        self.screens[screen.screen_id] = screen

class Seat:
    def __init__(self, seat_id: str, row: str, number: int, seat_type: SeatType):
        self.seat_id = seat_id
        self.row = row
        self.number = number
        self.seat_type = seat_type
        self.status = SeatStatus.AVAILABLE

    def reserve(self):
        if self.status == SeatStatus.AVAILABLE:
            self.status = SeatStatus.RESERVED
            return True
        return False

    def book(self):
        if self.status in [SeatStatus.AVAILABLE, SeatStatus.RESERVED]:
            self.status = SeatStatus.BOOKED
            return True
        return False

    def release(self):
        self.status = SeatStatus.AVAILABLE

class Screen:
    def __init__(self, screen_id: str, name: str, total_seats: int):
        self.screen_id = screen_id
        self.name = name
        self.total_seats = total_seats
        self.seats: Dict[str, Seat] = {}
        self._initialize_seats()

    def _initialize_seats(self):
        rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
        seats_per_row = self.total_seats // len(rows)
        
        for i, row in enumerate(rows):
            for seat_num in range(1, seats_per_row + 1):
                seat_type = SeatType.VIP if i < 2 else SeatType.PREMIUM if i < 4 else SeatType.REGULAR
                seat_id = f"{row}{seat_num}"
                seat = Seat(seat_id, row, seat_num, seat_type)
                self.seats[seat_id] = seat

    def get_available_seats(self) -> List[Seat]:
        return [seat for seat in self.seats.values() if seat.status == SeatStatus.AVAILABLE]

class ShowTime:
    def __init__(self, show_id: str, movie: Movie, screen: Screen, start_time: datetime):
        self.show_id = show_id
        self.movie = movie
        self.screen = screen
        self.start_time = start_time
        self.end_time = start_time + timedelta(minutes=movie.duration_minutes)
        self.seat_pricing = {
            SeatType.REGULAR: 10.0,
            SeatType.PREMIUM: 15.0,
            SeatType.VIP: 25.0
        }

    def get_available_seats(self) -> List[Seat]:
        return self.screen.get_available_seats()

    def get_seat_price(self, seat_type: SeatType) -> float:
        return self.seat_pricing[seat_type]

class Customer:
    def __init__(self, customer_id: str, name: str, email: str, phone: str):
        self.customer_id = customer_id
        self.name = name
        self.email = email
        self.phone = phone
        self.booking_history: List[str] = []  # booking_ids

class Booking:
    def __init__(self, booking_id: str, customer: Customer, show_time: ShowTime, seats: List[Seat]):
        self.booking_id = booking_id
        self.customer = customer
        self.show_time = show_time
        self.seats = seats
        self.booking_time = datetime.now()
        self.status = BookingStatus.PENDING
        self.total_amount = self._calculate_total_amount()
        self.payment_status = PaymentStatus.PENDING

    def _calculate_total_amount(self) -> float:
        total = 0.0
        for seat in self.seats:
            total += self.show_time.get_seat_price(seat.seat_type)
        return total

    def confirm_booking(self):
        self.status = BookingStatus.CONFIRMED
        for seat in self.seats:
            seat.book()

    def cancel_booking(self):
        self.status = BookingStatus.CANCELLED
        for seat in self.seats:
            seat.release()

class Payment:
    def __init__(self, payment_id: str, booking: Booking, amount: float, payment_method: str):
        self.payment_id = payment_id
        self.booking = booking
        self.amount = amount
        self.payment_method = payment_method
        self.payment_time = datetime.now()
        self.status = PaymentStatus.PENDING

    def process_payment(self) -> bool:
        try:
            print(f"Processing payment of ${self.amount} via {self.payment_method}")
            self.status = PaymentStatus.COMPLETED
            self.booking.payment_status = PaymentStatus.COMPLETED
            return True
        except Exception as e:
            print(f"Payment failed: {e}")
            self.status = PaymentStatus.FAILED
            return False

class SeatReservationManager:
    def __init__(self):
        self.reservations: Dict[str, datetime] = {}  # seat_id -> reservation_time
        self.reservation_timeout = 10  # minutes

    def reserve_seats(self, seats: List[Seat]) -> bool:
        current_time = datetime.now()
        
        # Check if seats are available
        for seat in seats:
            if seat.seat_id in self.reservations:
                reservation_time = self.reservations[seat.seat_id]
                if current_time - reservation_time < timedelta(minutes=self.reservation_timeout):
                    return False  # Seat still reserved
                else:
                    # Reservation expired
                    del self.reservations[seat.seat_id]
                    seat.release()
        
        # Reserve seats
        for seat in seats:
            if seat.reserve():
                self.reservations[seat.seat_id] = current_time
            else:
                # Rollback if any seat cannot be reserved
                for reserved_seat in seats:
                    if reserved_seat.seat_id in self.reservations:
                        del self.reservations[reserved_seat.seat_id]
                        reserved_seat.release()
                return False
        
        return True

    def release_expired_reservations(self):
        current_time = datetime.now()
        expired_seats = []
        
        for seat_id, reservation_time in self.reservations.items():
            if current_time - reservation_time >= timedelta(minutes=self.reservation_timeout):
                expired_seats.append(seat_id)
        
        for seat_id in expired_seats:
            del self.reservations[seat_id]

class MovieTicketBookingSystem:
    def __init__(self, system_name: str):
        self.system_name = system_name
        self.movies: Dict[str, Movie] = {}
        self.theaters: Dict[str, Theater] = {}
        self.customers: Dict[str, Customer] = {}
        self.show_times: Dict[str, ShowTime] = {}
        self.bookings: Dict[str, Booking] = {}
        self.payments: Dict[str, Payment] = {}
        self.reservation_manager = SeatReservationManager()

    def add_movie(self, movie: Movie):
        self.movies[movie.movie_id] = movie

    def add_theater(self, theater: Theater):
        self.theaters[theater.theater_id] = theater

    def register_customer(self, name: str, email: str, phone: str) -> Customer:
        customer_id = str(uuid.uuid4())
        customer = Customer(customer_id, name, email, phone)
        self.customers[customer_id] = customer
        return customer

    def add_show_time(self, show_time: ShowTime):
        self.show_times[show_time.show_id] = show_time

    def search_movies(self, title: str = "", genre: MovieGenre = None, 
                     theater_id: str = "", date: datetime = None) -> List[ShowTime]:
        matching_shows = []
        
        for show in self.show_times.values():
            if title and title.lower() not in show.movie.title.lower():
                continue
            if genre and show.movie.genre != genre:
                continue
            if theater_id and show.screen.screen_id not in self.theaters[theater_id].screens:
                continue
            if date and show.start_time.date() != date.date():
                continue
            
            matching_shows.append(show)
        
        return sorted(matching_shows, key=lambda s: s.start_time)

    def get_available_seats(self, show_id: str) -> List[Seat]:
        if show_id not in self.show_times:
            return []
        
        # Clean up expired reservations first
        self.reservation_manager.release_expired_reservations()
        
        show_time = self.show_times[show_id]
        return show_time.get_available_seats()

    def reserve_seats(self, show_id: str, seat_ids: List[str]) -> bool:
        if show_id not in self.show_times:
            return False
        
        show_time = self.show_times[show_id]
        seats = []
        
        for seat_id in seat_ids:
            if seat_id in show_time.screen.seats:
                seats.append(show_time.screen.seats[seat_id])
            else:
                return False
        
        return self.reservation_manager.reserve_seats(seats)

    def create_booking(self, customer_id: str, show_id: str, seat_ids: List[str]) -> Booking:
        if customer_id not in self.customers:
            raise Exception("Customer not found")
        
        if show_id not in self.show_times:
            raise Exception("Show not found")
        
        customer = self.customers[customer_id]
        show_time = self.show_times[show_id]
        
        # Get seats
        seats = []
        for seat_id in seat_ids:
            if seat_id in show_time.screen.seats:
                seat = show_time.screen.seats[seat_id]
                if seat.status != SeatStatus.RESERVED:
                    raise Exception(f"Seat {seat_id} is not reserved")
                seats.append(seat)
            else:
                raise Exception(f"Seat {seat_id} not found")
        
        booking_id = str(uuid.uuid4())
        booking = Booking(booking_id, customer, show_time, seats)
        
        self.bookings[booking_id] = booking
        customer.booking_history.append(booking_id)
        
        return booking

    def confirm_booking(self, booking_id: str, payment_method: str) -> bool:
        if booking_id not in self.bookings:
            raise Exception("Booking not found")
        
        booking = self.bookings[booking_id]
        
        # Process payment
        payment_id = str(uuid.uuid4())
        payment = Payment(payment_id, booking, booking.total_amount, payment_method)
        
        if payment.process_payment():
            booking.confirm_booking()
            self.payments[payment_id] = payment
            
            # Remove from reservation manager
            for seat in booking.seats:
                if seat.seat_id in self.reservation_manager.reservations:
                    del self.reservation_manager.reservations[seat.seat_id]
            
            print(f"Booking {booking_id} confirmed")
            return True
        else:
            print(f"Payment failed for booking {booking_id}")
            return False

    def cancel_booking(self, booking_id: str) -> bool:
        if booking_id not in self.bookings:
            raise Exception("Booking not found")
        
        booking = self.bookings[booking_id]
        
        # Check if cancellation is allowed (e.g., before show time)
        time_until_show = booking.show_time.start_time - datetime.now()
        if time_until_show < timedelta(hours=2):
            raise Exception("Cannot cancel booking less than 2 hours before show")
        
        booking.cancel_booking()
        print(f"Booking {booking_id} cancelled")
        return True

    def get_customer_bookings(self, customer_id: str) -> List[Booking]:
        if customer_id not in self.customers:
            return []
        
        customer = self.customers[customer_id]
        customer_bookings = []
        
        for booking_id in customer.booking_history:
            if booking_id in self.bookings:
                customer_bookings.append(self.bookings[booking_id])
        
        return sorted(customer_bookings, key=lambda b: b.booking_time, reverse=True)

# Demo usage
def main():
    # Create movie ticket booking system
    system = MovieTicketBookingSystem("CineMax")
    
    # Add movies
    movie1 = Movie("M1", "Avengers: Endgame", "Epic superhero movie", 180, MovieGenre.ACTION)
    movie2 = Movie("M2", "The Hangover", "Comedy about a bachelor party", 100, MovieGenre.COMEDY)
    
    system.add_movie(movie1)
    system.add_movie(movie2)
    
    # Add theater and screen
    theater = Theater("T1", "CineMax Downtown", "123 Main St")
    screen = Screen("S1", "Screen 1", 80)
    theater.add_screen(screen)
    system.add_theater(theater)
    
    # Add show times
    show1 = ShowTime("SH1", movie1, screen, datetime.now() + timedelta(hours=2))
    show2 = ShowTime("SH2", movie2, screen, datetime.now() + timedelta(hours=5))
    
    system.add_show_time(show1)
    system.add_show_time(show2)
    
    # Register customer
    customer = system.register_customer("Alice Johnson", "alice@example.com", "123-456-7890")
    
    print(f"Movie booking system '{system.system_name}' initialized")
    print(f"Added {len(system.movies)} movies and {len(system.theaters)} theaters")
    
    # Search movies
    action_movies = system.search_movies(genre=MovieGenre.ACTION)
    print(f"\nFound {len(action_movies)} action movies")
    
    if action_movies:
        show = action_movies[0]
        print(f"Show: {show.movie.title} at {show.start_time.strftime('%Y-%m-%d %H:%M')}")
        
        # Check available seats
        available_seats = system.get_available_seats(show.show_id)
        print(f"Available seats: {len(available_seats)}")
        
        # Reserve some seats
        seat_ids = ["A1", "A2", "A3"]
        if system.reserve_seats(show.show_id, seat_ids):
            print(f"Reserved seats: {seat_ids}")
            
            try:
                # Create booking
                booking = system.create_booking(customer.customer_id, show.show_id, seat_ids)
                print(f"\nBooking created: {booking.booking_id}")
                print(f"Total amount: ${booking.total_amount}")
                print(f"Seats: {[f'{seat.row}{seat.number}' for seat in booking.seats]}")
                
                # Confirm booking
                if system.confirm_booking(booking.booking_id, "Credit Card"):
                    print("Booking confirmed successfully!")
                    
                    # Show customer bookings
                    customer_bookings = system.get_customer_bookings(customer.customer_id)
                    print(f"\n{customer.name} has {len(customer_bookings)} booking(s)")
                
            except Exception as e:
                print(f"Error creating booking: {e}")
        else:
            print("Failed to reserve seats")

if __name__ == "__main__":
    main()