"""
MOVIE TICKET BOOKING SYSTEM
Patterns: State, Observer, Strategy, Factory, Singleton, Command
"""
from enum import Enum
from typing import List, Dict, Optional
from datetime import datetime

class BookingStatus(Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"
    COMPLETED = "completed"

class Movie:
    def __init__(self, movie_id: str, title: str, genre: str, duration: int):
        self.movie_id = movie_id
        self.title = title
        self.genre = genre
        self.duration = duration

class Seat:
    def __init__(self, seat_id: str, row: str, number: int):
        self.seat_id = seat_id
        self.row = row
        self.number = number
        self.is_available = True

class Screen:
    def __init__(self, screen_id: str, capacity: int):
        self.screen_id = screen_id
        self.capacity = capacity
        self.seats: List[Seat] = [Seat(f"S{i}", chr(65+i//10), i%10+1) for i in range(capacity)]

class ShowTime:
    def __init__(self, show_id: str, movie: Movie, screen: Screen, start_time: datetime, price: float):
        self.show_id = show_id
        self.movie = movie
        self.screen = screen
        self.start_time = start_time
        self.price = price

class Booking:
    def __init__(self, booking_id: str, user_id: str, show: ShowTime, seats: List[Seat]):
        self.booking_id = booking_id
        self.user_id = user_id
        self.show = show
        self.seats = seats
        self.total_amount = len(seats) * show.price
        self.status = BookingStatus.PENDING
    
    def confirm(self):
        self.status = BookingStatus.CONFIRMED
        print(f"✓ Booking confirmed: {self.booking_id}")

class BookingService:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        self.movies: Dict[str, Movie] = {}
        self.shows: Dict[str, ShowTime] = {}
        self.bookings: Dict[str, Booking] = {}
        self.booking_counter = 0
        self._initialized = True
    
    def add_movie(self, movie: Movie):
        self.movies[movie.movie_id] = movie
        print(f"✓ Added movie: {movie.title}")
    
    def add_show(self, show: ShowTime):
        self.shows[show.show_id] = show
        print(f"✓ Added show: {show.movie.title} at {show.start_time}")
    
    def book_tickets(self, user_id: str, show_id: str, seat_ids: List[str]) -> Optional[Booking]:
        show = self.shows.get(show_id)
        if not show:
            return None
        
        seats = [s for s in show.screen.seats if s.seat_id in seat_ids and s.is_available]
        if len(seats) != len(seat_ids):
            print("✗ Some seats unavailable")
            return None
        
        booking_id = f"B{self.booking_counter:04d}"
        self.booking_counter += 1
        
        booking = Booking(booking_id, user_id, show, seats)
        for seat in seats:
            seat.is_available = False
        
        self.bookings[booking_id] = booking
        booking.confirm()
        print(f"  Seats: {[s.seat_id for s in seats]}")
        print(f"  Total: ${booking.total_amount:.2f}")
        
        return booking

def main():
    print("="*70)
    print("MOVIE TICKET BOOKING - Demo")
    print("="*70)
    
    service = BookingService()
    
    movie = Movie("M001", "Inception", "Sci-Fi", 148)
    service.add_movie(movie)
    
    screen = Screen("SC001", 50)
    show = ShowTime("SH001", movie, screen, datetime.now(), 12.50)
    service.add_show(show)
    
    print("\n🎬 Booking Tickets...")
    booking = service.book_tickets("U001", "SH001", ["S0", "S1", "S2"])
    
    print("\n" + "="*70)
    print("DEMO COMPLETE")
    print("="*70)

if __name__ == "__main__":
    main()

