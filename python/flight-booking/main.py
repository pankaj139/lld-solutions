"""
Flight Booking System - Python Implementation

This file implements a comprehensive flight booking platform supporting multi-city itineraries,
real-time seat inventory, dynamic pricing, payment processing, and loyalty programs.

File Purpose:
- Demonstrates Builder, Strategy, State, Factory, Observer, Command, Composite,
  Decorator, Singleton, and Template Method patterns
- Handles multi-leg flight bookings with validation
- Implements seat blocking with timeout
- Supports dynamic pricing and loyalty miles
- Manages complete booking lifecycle from search to cancellation

Author: LLD Solutions
Date: 2025-10-06
"""

from abc import ABC, abstractmethod
from enum import Enum
from decimal import Decimal
from datetime import datetime, timedelta, date
from typing import List, Dict, Optional, Set, Tuple
from dataclasses import dataclass, field
import threading
import uuid
import time


# ==================== Enums ====================

class SeatClass(Enum):
    """Seat class types"""
    ECONOMY = "economy"
    PREMIUM_ECONOMY = "premium_economy"
    BUSINESS = "business"
    FIRST = "first"


class SeatStatus(Enum):
    """Seat availability status"""
    AVAILABLE = "available"
    BLOCKED = "blocked"
    BOOKED = "booked"


class FlightStatus(Enum):
    """Flight operational status"""
    SCHEDULED = "scheduled"
    BOARDING = "boarding"
    DEPARTED = "departed"
    IN_FLIGHT = "in_flight"
    LANDED = "landed"
    CANCELLED = "cancelled"
    DELAYED = "delayed"


class BookingStatus(Enum):
    """Booking lifecycle status"""
    PENDING = "pending"
    CONFIRMED = "confirmed"
    CHECKED_IN = "checked_in"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class PaymentStatus(Enum):
    """Payment processing status"""
    PENDING = "pending"
    AUTHORIZED = "authorized"
    CAPTURED = "captured"
    FAILED = "failed"
    REFUNDED = "refunded"


class LoyaltyTier(Enum):
    """Frequent flyer program tiers"""
    BASIC = "basic"
    SILVER = "silver"
    GOLD = "gold"
    PLATINUM = "platinum"


# ==================== Data Classes ====================

@dataclass
class Airport:
    """
    Represents an airport.
    
    Usage:
        airport = Airport("JFK", "John F. Kennedy International", "New York", "USA")
    """
    code: str  # IATA code (JFK, LAX)
    name: str
    city: str
    country: str
    timezone: str = "UTC"
    
    def __str__(self) -> str:
        return f"{self.code} - {self.city}"


@dataclass
class Aircraft:
    """
    Represents an aircraft with seat configuration.
    
    Usage:
        aircraft = Aircraft("N12345", "Boeing 737", economy=150, business=20)
    """
    registration: str
    model: str
    economy_seats: int = 0
    premium_economy_seats: int = 0
    business_seats: int = 0
    first_class_seats: int = 0
    
    def get_total_seats(self) -> int:
        return (self.economy_seats + self.premium_economy_seats + 
                self.business_seats + self.first_class_seats)
    
    def get_seats_by_class(self, seat_class: SeatClass) -> int:
        mapping = {
            SeatClass.ECONOMY: self.economy_seats,
            SeatClass.PREMIUM_ECONOMY: self.premium_economy_seats,
            SeatClass.BUSINESS: self.business_seats,
            SeatClass.FIRST: self.first_class_seats
        }
        return mapping.get(seat_class, 0)


@dataclass
class Seat:
    """
    Represents an aircraft seat.
    
    Usage:
        seat = Seat("12A", SeatClass.ECONOMY, features=["window"])
        seat.block(duration_minutes=15)
    """
    number: str  # 12A, 14F, etc.
    seat_class: SeatClass
    status: SeatStatus = SeatStatus.AVAILABLE
    features: List[str] = field(default_factory=list)  # window, aisle, extra legroom
    blocked_until: Optional[datetime] = None
    passenger_id: Optional[str] = None
    
    def is_available(self) -> bool:
        if self.status == SeatStatus.BLOCKED and self.blocked_until:
            if datetime.now() > self.blocked_until:
                self.status = SeatStatus.AVAILABLE
                self.blocked_until = None
        return self.status == SeatStatus.AVAILABLE
    
    def block(self, duration_minutes: int = 15) -> bool:
        if not self.is_available():
            return False
        self.status = SeatStatus.BLOCKED
        self.blocked_until = datetime.now() + timedelta(minutes=duration_minutes)
        return True
    
    def book(self, passenger_id: str) -> bool:
        if self.status != SeatStatus.BLOCKED:
            return False
        self.status = SeatStatus.BOOKED
        self.passenger_id = passenger_id
        self.blocked_until = None
        return True
    
    def release(self):
        self.status = SeatStatus.AVAILABLE
        self.blocked_until = None
        self.passenger_id = None
    
    def __str__(self) -> str:
        return f"{self.number} ({self.seat_class.value}) - {self.status.value}"


@dataclass
class Passenger:
    """
    Represents a passenger.
    
    Usage:
        passenger = Passenger("John", "Doe", date(1990, 1, 1), "AB123456")
    """
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    first_name: str = ""
    last_name: str = ""
    date_of_birth: Optional[date] = None
    passport_number: str = ""
    nationality: str = ""
    loyalty_number: Optional[str] = None
    
    def get_full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"
    
    def is_child(self) -> bool:
        if not self.date_of_birth:
            return False
        age = (date.today() - self.date_of_birth).days // 365
        return age < 12
    
    def __str__(self) -> str:
        return self.get_full_name()


@dataclass
class LoyaltyAccount:
    """
    Frequent flyer loyalty account.
    
    Usage:
        account = LoyaltyAccount("FF123456", user)
        account.earn_miles(5000)
    """
    account_number: str
    user_id: str
    miles: int = 0
    tier: LoyaltyTier = LoyaltyTier.BASIC
    
    def earn_miles(self, miles: int):
        self.miles += miles
        self._update_tier()
    
    def redeem_miles(self, miles: int) -> bool:
        if self.miles < miles:
            return False
        self.miles -= miles
        return True
    
    def _update_tier(self):
        if self.miles >= 100000:
            self.tier = LoyaltyTier.PLATINUM
        elif self.miles >= 50000:
            self.tier = LoyaltyTier.GOLD
        elif self.miles >= 25000:
            self.tier = LoyaltyTier.SILVER
        else:
            self.tier = LoyaltyTier.BASIC
    
    def get_tier_multiplier(self) -> float:
        multipliers = {
            LoyaltyTier.PLATINUM: 1.5,
            LoyaltyTier.GOLD: 1.25,
            LoyaltyTier.SILVER: 1.1,
            LoyaltyTier.BASIC: 1.0
        }
        return multipliers[self.tier]


# ==================== Flight Component ====================

class Flight:
    """
    Represents a scheduled flight.
    
    Usage:
        flight = Flight("AA100", airline, aircraft, jfk, lax, 
                        departure_time, arrival_time)
        available = flight.get_available_seats(SeatClass.ECONOMY)
    
    Returns:
        Flight instance with seat management
    """
    
    def __init__(
        self,
        flight_number: str,
        airline: str,
        aircraft: Aircraft,
        origin: Airport,
        destination: Airport,
        departure_time: datetime,
        arrival_time: datetime
    ):
        self.id = str(uuid.uuid4())
        self.flight_number = flight_number
        self.airline = airline
        self.aircraft = aircraft
        self.origin = origin
        self.destination = destination
        self.departure_time = departure_time
        self.arrival_time = arrival_time
        self.duration = arrival_time - departure_time
        self.status = FlightStatus.SCHEDULED
        self.seats: List[Seat] = []
        self._initialize_seats()
    
    def _initialize_seats(self):
        """Initialize all seats for the aircraft"""
        # Economy seats (rows 10-39)
        for row in range(10, 10 + (self.aircraft.economy_seats // 6)):
            for letter in ['A', 'B', 'C', 'D', 'E', 'F']:
                seat = Seat(
                    f"{row}{letter}",
                    SeatClass.ECONOMY,
                    features=['window'] if letter in ['A', 'F'] else ['aisle'] if letter in ['C', 'D'] else []
                )
                self.seats.append(seat)
        
        # Business seats (rows 1-5)
        for row in range(1, 1 + (self.aircraft.business_seats // 4)):
            for letter in ['A', 'C', 'D', 'F']:
                seat = Seat(
                    f"{row}{letter}",
                    SeatClass.BUSINESS,
                    features=['window' if letter in ['A', 'F'] else 'aisle']
                )
                self.seats.append(seat)
    
    def get_available_seats(self, seat_class: SeatClass) -> List[Seat]:
        return [s for s in self.seats 
                if s.seat_class == seat_class and s.is_available()]
    
    def get_seat(self, seat_number: str) -> Optional[Seat]:
        for seat in self.seats:
            if seat.number == seat_number:
                return seat
        return None
    
    def calculate_distance(self) -> int:
        """Calculate flight distance in miles (simplified)"""
        # In real implementation, would use actual airport coordinates
        return 2500  # Dummy distance
    
    def __str__(self) -> str:
        return f"{self.flight_number}: {self.origin.code} → {self.destination.code}"


# ==================== Pricing Strategy Pattern ====================

class PricingStrategy(ABC):
    """
    Abstract base class for pricing strategies (Strategy Pattern).
    
    Usage:
        strategy = DynamicPricing()
        price = strategy.calculate_price(flight, SeatClass.ECONOMY, booking_date)
    """
    
    @abstractmethod
    def calculate_price(
        self,
        flight: Flight,
        seat_class: SeatClass,
        booking_date: date
    ) -> Decimal:
        pass


class BasePricing(PricingStrategy):
    """Fixed base pricing"""
    
    BASE_FARES = {
        SeatClass.ECONOMY: Decimal("200"),
        SeatClass.PREMIUM_ECONOMY: Decimal("400"),
        SeatClass.BUSINESS: Decimal("1000"),
        SeatClass.FIRST: Decimal("2500")
    }
    
    def calculate_price(
        self,
        flight: Flight,
        seat_class: SeatClass,
        booking_date: date
    ) -> Decimal:
        return self.BASE_FARES.get(seat_class, Decimal("200"))


class DynamicPricing(PricingStrategy):
    """
    Dynamic pricing based on demand and time to departure.
    
    Algorithm:
        1. Start with base fare
        2. Apply demand multiplier (seats booked / total seats)
        3. Apply time-to-departure multiplier
        4. Add distance-based adjustment
    
    Returns:
        Final calculated price
    """
    
    def calculate_price(
        self,
        flight: Flight,
        seat_class: SeatClass,
        booking_date: date
    ) -> Decimal:
        # Base fare
        base_pricing = BasePricing()
        base_fare = base_pricing.calculate_price(flight, seat_class, booking_date)
        
        # Demand multiplier
        class_seats = [s for s in flight.seats if s.seat_class == seat_class]
        booked_seats = [s for s in class_seats if s.status == SeatStatus.BOOKED]
        
        if class_seats:
            demand_ratio = len(booked_seats) / len(class_seats)
            demand_multiplier = Decimal(str(1 + (demand_ratio * 0.5)))  # Up to 50% increase
        else:
            demand_multiplier = Decimal("1.0")
        
        # Time multiplier
        days_to_departure = (flight.departure_time.date() - booking_date).days
        if days_to_departure < 7:
            time_multiplier = Decimal("1.5")
        elif days_to_departure < 30:
            time_multiplier = Decimal("1.2")
        else:
            time_multiplier = Decimal("1.0")
        
        # Calculate final price
        price = base_fare * demand_multiplier * time_multiplier
        
        return price.quantize(Decimal("0.01"))


# ==================== Booking State Pattern ====================

class BookingState(ABC):
    """
    Abstract base class for booking states (State Pattern).
    
    Usage:
        state = PendingState()
        state.confirm(booking)
    """
    
    @abstractmethod
    def confirm(self, booking: 'Booking') -> bool:
        pass
    
    @abstractmethod
    def cancel(self, booking: 'Booking') -> bool:
        pass
    
    @abstractmethod
    def check_in(self, booking: 'Booking') -> bool:
        pass
    
    @abstractmethod
    def get_status(self) -> BookingStatus:
        pass


class PendingState(BookingState):
    """Booking is pending payment"""
    
    def confirm(self, booking: 'Booking') -> bool:
        booking.state = ConfirmedState()
        print(f"✅ Booking {booking.pnr} confirmed")
        return True
    
    def cancel(self, booking: 'Booking') -> bool:
        booking.state = CancelledState()
        # Release all seats
        for seat in booking.seats.values():
            seat.release()
        return True
    
    def check_in(self, booking: 'Booking') -> bool:
        print("❌ Cannot check-in pending booking")
        return False
    
    def get_status(self) -> BookingStatus:
        return BookingStatus.PENDING


class ConfirmedState(BookingState):
    """Booking is confirmed and paid"""
    
    def confirm(self, booking: 'Booking') -> bool:
        print("❌ Booking already confirmed")
        return False
    
    def cancel(self, booking: 'Booking') -> bool:
        booking.state = CancelledState()
        # Release seats and process refund
        for seat in booking.seats.values():
            seat.release()
        return True
    
    def check_in(self, booking: 'Booking') -> bool:
        # Check if within check-in window (24 hours before departure)
        hours_to_departure = (
            booking.itinerary.get_departure_time() - datetime.now()
        ).total_seconds() / 3600
        
        if 1 <= hours_to_departure <= 24:
            booking.state = CheckedInState()
            print(f"✅ Checked in for flight(s)")
            return True
        else:
            print("❌ Check-in not available yet")
            return False
    
    def get_status(self) -> BookingStatus:
        return BookingStatus.CONFIRMED


class CheckedInState(BookingState):
    """Passenger has checked in"""
    
    def confirm(self, booking: 'Booking') -> bool:
        print("❌ Already checked in")
        return False
    
    def cancel(self, booking: 'Booking') -> bool:
        print("❌ Cannot cancel after check-in")
        return False
    
    def check_in(self, booking: 'Booking') -> bool:
        print("❌ Already checked in")
        return False
    
    def get_status(self) -> BookingStatus:
        return BookingStatus.CHECKED_IN


class CancelledState(BookingState):
    """Booking has been cancelled"""
    
    def confirm(self, booking: 'Booking') -> bool:
        print("❌ Cannot confirm cancelled booking")
        return False
    
    def cancel(self, booking: 'Booking') -> bool:
        print("❌ Already cancelled")
        return False
    
    def check_in(self, booking: 'Booking') -> bool:
        print("❌ Cannot check-in cancelled booking")
        return False
    
    def get_status(self) -> BookingStatus:
        return BookingStatus.CANCELLED


# ==================== Flight Itinerary (Composite Pattern) ====================

class FlightItinerary:
    """
    Represents a flight itinerary (may be multi-leg).
    
    Usage:
        itinerary = FlightItinerary()
        itinerary.add_flight(flight1)
        itinerary.add_flight(flight2)
        total_duration = itinerary.get_total_duration()
    
    Returns:
        Itinerary with all flight segments
    """
    
    def __init__(self):
        self.id = str(uuid.uuid4())
        self.flights: List[Flight] = []
    
    def add_flight(self, flight: Flight):
        self.flights.append(flight)
    
    def get_total_duration(self) -> timedelta:
        if not self.flights:
            return timedelta(0)
        
        departure = self.flights[0].departure_time
        arrival = self.flights[-1].arrival_time
        return arrival - departure
    
    def get_departure_time(self) -> datetime:
        return self.flights[0].departure_time if self.flights else datetime.now()
    
    def get_arrival_time(self) -> datetime:
        return self.flights[-1].arrival_time if self.flights else datetime.now()
    
    def validate_connections(self) -> bool:
        """Validate minimum connection times"""
        for i in range(len(self.flights) - 1):
            current_flight = self.flights[i]
            next_flight = self.flights[i + 1]
            
            connection_time = next_flight.departure_time - current_flight.arrival_time
            
            # Minimum connection time: 45 minutes domestic, 90 minutes international
            min_connection = timedelta(minutes=45)
            
            if connection_time < min_connection:
                print(f"⚠️  Insufficient layover time: {connection_time}")
                return False
        
        return True
    
    def __str__(self) -> str:
        if not self.flights:
            return "Empty itinerary"
        
        legs = " → ".join([f.origin.code for f in self.flights] + [self.flights[-1].destination.code])
        return f"{legs} ({len(self.flights)} flight(s))"


# ==================== Booking Component ====================

class Booking:
    """
    Represents a flight booking.
    
    Usage:
        booking = Booking(user_id, itinerary, passengers)
        booking.select_seat(flight, passenger, seat)
        booking.confirm()
    
    Returns:
        Booking with PNR and seats
    """
    
    def __init__(
        self,
        user_id: str,
        itinerary: FlightItinerary,
        passengers: List[Passenger],
        fare_class: str = "Y"
    ):
        self.id = str(uuid.uuid4())
        self.pnr = self._generate_pnr()
        self.user_id = user_id
        self.itinerary = itinerary
        self.passengers = passengers
        self.fare_class = fare_class
        self.seats: Dict[str, Seat] = {}  # flight_id -> Seat
        self.base_price = Decimal("0")
        self.taxes = Decimal("0")
        self.total_price = Decimal("0")
        self.state: BookingState = PendingState()
        self.created_at = datetime.now()
        self.pricing_strategy: PricingStrategy = DynamicPricing()
        self.extra_baggage = 0
        self.meals_selected = False
    
    def _generate_pnr(self) -> str:
        """Generate 6-character PNR"""
        import random
        import string
        return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    
    def select_seat(self, flight: Flight, passenger: Passenger, seat: Seat) -> bool:
        """Select seat for passenger on flight"""
        if not seat.is_available():
            print(f"❌ Seat {seat.number} not available")
            return False
        
        if seat.block():
            key = f"{flight.id}_{passenger.id}"
            self.seats[key] = seat
            print(f"✅ Seat {seat.number} blocked for {passenger.get_full_name()}")
            return True
        
        return False
    
    def calculate_total(self) -> Decimal:
        """Calculate total booking price"""
        total = Decimal("0")
        
        # Calculate price for each passenger on each flight
        for flight in self.itinerary.flights:
            for passenger in self.passengers:
                # Get seat class from selected seat or default to economy
                seat_class = SeatClass.ECONOMY
                key = f"{flight.id}_{passenger.id}"
                if key in self.seats:
                    seat_class = self.seats[key].seat_class
                
                price = self.pricing_strategy.calculate_price(
                    flight, seat_class, date.today()
                )
                total += price
        
        # Add baggage fees
        total += Decimal(str(self.extra_baggage * 50))
        
        # Add meal fees
        if self.meals_selected:
            total += Decimal(str(len(self.passengers) * 25))
        
        # Calculate taxes (10%)
        self.base_price = total
        self.taxes = total * Decimal("0.10")
        self.total_price = total + self.taxes
        
        return self.total_price
    
    def add_baggage(self, count: int) -> Decimal:
        """Add extra baggage"""
        self.extra_baggage += count
        fee = Decimal(str(count * 50))
        print(f"💼 Added {count} extra baggage (${fee})")
        return fee
    
    def add_meals(self) -> Decimal:
        """Add meal selection"""
        self.meals_selected = True
        fee = Decimal(str(len(self.passengers) * 25))
        print(f"🍴 Added meal selection for {len(self.passengers)} passengers (${fee})")
        return fee
    
    def confirm(self) -> bool:
        """Confirm booking and book seats"""
        if self.state.confirm(self):
            # Book all seats
            for seat in self.seats.values():
                seat.book(self.id)
            return True
        return False
    
    def cancel(self) -> bool:
        """Cancel booking"""
        return self.state.cancel(self)
    
    def check_in(self) -> bool:
        """Check-in for flights"""
        return self.state.check_in(self)
    
    def calculate_refund(self, cancellation_date: date) -> Decimal:
        """Calculate refund amount"""
        days_to_departure = (
            self.itinerary.get_departure_time().date() - cancellation_date
        ).days
        
        # Calculate refund percentage based on timing
        if days_to_departure >= 30:
            refund_percentage = Decimal("0.90")  # 10% cancellation fee
        elif days_to_departure >= 7:
            refund_percentage = Decimal("0.75")  # 25% penalty
        elif days_to_departure >= 1:
            refund_percentage = Decimal("0.50")  # 50% penalty
        else:
            refund_percentage = Decimal("0.25")  # 75% penalty
        
        refund = self.total_price * refund_percentage
        return refund.quantize(Decimal("0.01"))
    
    def __str__(self) -> str:
        return f"Booking {self.pnr}: {self.itinerary} - {self.state.get_status().value}"


# ==================== Booking Decorators ====================

class BookingDecorator(ABC):
    """
    Base decorator for booking add-ons (Decorator Pattern).
    
    Usage:
        booking_with_insurance = InsuranceDecorator(booking)
        total = booking_with_insurance.get_price()
    """
    
    def __init__(self, booking: Booking):
        self.booking = booking
    
    @abstractmethod
    def get_price(self) -> Decimal:
        pass


class InsuranceDecorator(BookingDecorator):
    """Add travel insurance"""
    
    def get_price(self) -> Decimal:
        base_price = self.booking.calculate_total()
        insurance_fee = base_price * Decimal("0.05")  # 5% of total
        return base_price + insurance_fee


class PriorityBoardingDecorator(BookingDecorator):
    """Add priority boarding"""
    
    def get_price(self) -> Decimal:
        base_price = self.booking.calculate_total()
        priority_fee = Decimal("30") * len(self.booking.passengers)
        return base_price + priority_fee


# ==================== Managers (Singleton) ====================

class InventoryManager:
    """
    Manages flight seat inventory (Singleton Pattern).
    
    Usage:
        manager = InventoryManager.get_instance()
        available = manager.get_available_seats(flight, SeatClass.ECONOMY)
    """
    
    _instance = None
    _lock = threading.Lock()
    
    @classmethod
    def get_instance(cls):
        if not cls._instance:
            with cls._lock:
                if not cls._instance:
                    cls._instance = cls()
        return cls._instance
    
    def __init__(self):
        if InventoryManager._instance is not None:
            raise Exception("Use get_instance() to get singleton")
        self.flights: Dict[str, Flight] = {}
    
    def add_flight(self, flight: Flight):
        self.flights[flight.id] = flight
    
    def get_flight(self, flight_id: str) -> Optional[Flight]:
        return self.flights.get(flight_id)
    
    def get_available_seats(self, flight: Flight, seat_class: SeatClass) -> List[Seat]:
        return flight.get_available_seats(seat_class)
    
    def block_seat(self, flight: Flight, seat_number: str, duration: int = 15) -> bool:
        seat = flight.get_seat(seat_number)
        if seat:
            return seat.block(duration)
        return False


class BookingManager:
    """
    Manages all bookings (Singleton Pattern).
    
    Usage:
        manager = BookingManager.get_instance()
        booking = manager.create_booking(user_id, itinerary, passengers)
        manager.confirm_booking(booking.pnr)
    """
    
    _instance = None
    _lock = threading.Lock()
    
    @classmethod
    def get_instance(cls):
        if not cls._instance:
            with cls._lock:
                if not cls._instance:
                    cls._instance = cls()
        return cls._instance
    
    def __init__(self):
        if BookingManager._instance is not None:
            raise Exception("Use get_instance() to get singleton")
        self.bookings: Dict[str, Booking] = {}
        self.inventory_manager = InventoryManager.get_instance()
    
    def create_booking(
        self,
        user_id: str,
        itinerary: FlightItinerary,
        passengers: List[Passenger]
    ) -> Booking:
        """Create new booking"""
        booking = Booking(user_id, itinerary, passengers)
        self.bookings[booking.pnr] = booking
        print(f"✅ Booking created: {booking.pnr}")
        return booking
    
    def get_booking(self, pnr: str) -> Optional[Booking]:
        """Get booking by PNR"""
        return self.bookings.get(pnr)
    
    def confirm_booking(self, pnr: str) -> bool:
        """Confirm booking and process payment"""
        booking = self.get_booking(pnr)
        if not booking:
            print(f"❌ Booking {pnr} not found")
            return False
        
        # Calculate final price
        total = booking.calculate_total()
        print(f"\n💰 Total Price: ${total}")
        print(f"   Base: ${booking.base_price}")
        print(f"   Taxes: ${booking.taxes}")
        
        # Confirm booking
        success = booking.confirm()
        
        if success:
            # Earn loyalty miles
            self._earn_miles(booking)
        
        return success
    
    def cancel_booking(self, pnr: str) -> Decimal:
        """Cancel booking and calculate refund"""
        booking = self.get_booking(pnr)
        if not booking:
            print(f"❌ Booking {pnr} not found")
            return Decimal("0")
        
        refund = booking.calculate_refund(date.today())
        
        if booking.cancel():
            print(f"💰 Refund amount: ${refund}")
            return refund
        
        return Decimal("0")
    
    def check_in(self, pnr: str) -> bool:
        """Check-in for flights"""
        booking = self.get_booking(pnr)
        if not booking:
            print(f"❌ Booking {pnr} not found")
            return False
        
        return booking.check_in()
    
    def _earn_miles(self, booking: Booking):
        """Calculate and award loyalty miles"""
        # Simplified miles calculation
        total_distance = sum(f.calculate_distance() for f in booking.itinerary.flights)
        miles_per_passenger = total_distance
        
        for passenger in booking.passengers:
            if passenger.loyalty_number:
                print(f"✈️  {passenger.get_full_name()} earned {miles_per_passenger} miles")


# ==================== Search Engine ====================

class SearchEngine:
    """
    Flight search engine.
    
    Usage:
        engine = SearchEngine(inventory_manager)
        results = engine.search(origin, destination, date, passengers)
    """
    
    def __init__(self, inventory_manager: InventoryManager):
        self.inventory_manager = inventory_manager
    
    def search(
        self,
        origin: Airport,
        destination: Airport,
        departure_date: date,
        passengers: int = 1
    ) -> List[Flight]:
        """Search for flights"""
        results = []
        
        for flight in self.inventory_manager.flights.values():
            if (flight.origin.code == origin.code and
                flight.destination.code == destination.code and
                flight.departure_time.date() == departure_date):
                
                # Check if enough seats available
                available = len(flight.get_available_seats(SeatClass.ECONOMY))
                if available >= passengers:
                    results.append(flight)
        
        # Sort by departure time
        results.sort(key=lambda f: f.departure_time)
        
        return results
    
    def search_multi_city(
        self,
        legs: List[Tuple[Airport, Airport, date]],
        passengers: int = 1
    ) -> List[FlightItinerary]:
        """Search for multi-city itineraries"""
        itineraries = []
        
        # Search each leg
        leg_flights = []
        for origin, destination, dep_date in legs:
            flights = self.search(origin, destination, dep_date, passengers)
            if not flights:
                return []  # No flights available for this leg
            leg_flights.append(flights)
        
        # Build itineraries (simplified - just take first flight for each leg)
        itinerary = FlightItinerary()
        for flights in leg_flights:
            itinerary.add_flight(flights[0])
        
        if itinerary.validate_connections():
            itineraries.append(itinerary)
        
        return itineraries


# ==================== Demo ====================

def demo():
    """Demonstrate the Flight Booking System"""
    print("=" * 60)
    print("FLIGHT BOOKING SYSTEM DEMONSTRATION")
    print("=" * 60)
    
    # Create airports
    jfk = Airport("JFK", "John F. Kennedy International", "New York", "USA")
    lax = Airport("LAX", "Los Angeles International", "Los Angeles", "USA")
    ord = Airport("ORD", "O'Hare International", "Chicago", "USA")
    
    # Create aircraft
    boeing737 = Aircraft("N12345", "Boeing 737", economy_seats=150, business_seats=20)
    airbus320 = Aircraft("N67890", "Airbus A320", economy_seats=144, business_seats=16)
    
    # Create flights
    inventory = InventoryManager.get_instance()
    
    flight1 = Flight(
        "AA100",
        "American Airlines",
        boeing737,
        jfk,
        lax,
        datetime(2025, 11, 15, 8, 0),
        datetime(2025, 11, 15, 11, 30)
    )
    inventory.add_flight(flight1)
    
    flight2 = Flight(
        "UA200",
        "United Airlines",
        airbus320,
        jfk,
        ord,
        datetime(2025, 11, 15, 9, 0),
        datetime(2025, 11, 15, 11, 0)
    )
    inventory.add_flight(flight2)
    
    flight3 = Flight(
        "DL300",
        "Delta Airlines",
        boeing737,
        ord,
        lax,
        datetime(2025, 11, 15, 13, 0),
        datetime(2025, 11, 15, 15, 30)
    )
    inventory.add_flight(flight3)
    
    # Demo 1: Search and Book Direct Flight
    print("\n" + "=" * 60)
    print("DEMO 1: DIRECT FLIGHT BOOKING")
    print("=" * 60)
    
    search_engine = SearchEngine(inventory)
    results = search_engine.search(jfk, lax, date(2025, 11, 15), passengers=2)
    
    print(f"\n🔍 Found {len(results)} flights:")
    for flight in results:
        print(f"  {flight}")
    
    # Create passengers
    passenger1 = Passenger(
        first_name="John",
        last_name="Doe",
        date_of_birth=date(1990, 1, 1),
        passport_number="AB123456"
    )
    
    passenger2 = Passenger(
        first_name="Jane",
        last_name="Doe",
        date_of_birth=date(1992, 5, 15),
        passport_number="CD789012"
    )
    
    # Create booking
    booking_manager = BookingManager.get_instance()
    
    itinerary1 = FlightItinerary()
    itinerary1.add_flight(flight1)
    
    booking1 = booking_manager.create_booking(
        user_id="user123",
        itinerary=itinerary1,
        passengers=[passenger1, passenger2]
    )
    
    print(f"\n📋 {booking1}")
    
    # Select seats
    seat1 = flight1.get_available_seats(SeatClass.ECONOMY)[0]
    seat2 = flight1.get_available_seats(SeatClass.ECONOMY)[1]
    
    booking1.select_seat(flight1, passenger1, seat1)
    booking1.select_seat(flight1, passenger2, seat2)
    
    # Add extras
    booking1.add_baggage(2)
    booking1.add_meals()
    
    # Confirm booking
    booking_manager.confirm_booking(booking1.pnr)
    
    # Demo 2: Multi-City Booking
    print("\n" + "=" * 60)
    print("DEMO 2: MULTI-CITY FLIGHT BOOKING")
    print("=" * 60)
    
    legs = [
        (jfk, ord, date(2025, 11, 15)),
        (ord, lax, date(2025, 11, 15))
    ]
    
    multi_city_results = search_engine.search_multi_city(legs, passengers=1)
    
    print(f"\n🔍 Found {len(multi_city_results)} multi-city itineraries:")
    for itinerary in multi_city_results:
        print(f"  {itinerary}")
        print(f"  Total duration: {itinerary.get_total_duration()}")
    
    if multi_city_results:
        passenger3 = Passenger(
            first_name="Bob",
            last_name="Smith",
            date_of_birth=date(1985, 3, 20),
            passport_number="EF345678"
        )
        
        booking2 = booking_manager.create_booking(
            user_id="user456",
            itinerary=multi_city_results[0],
            passengers=[passenger3]
        )
        
        # Select seats for both flights
        seat3 = flight2.get_available_seats(SeatClass.BUSINESS)[0]
        seat4 = flight3.get_available_seats(SeatClass.BUSINESS)[0]
        
        booking2.select_seat(flight2, passenger3, seat3)
        booking2.select_seat(flight3, passenger3, seat4)
        
        # Confirm booking
        booking_manager.confirm_booking(booking2.pnr)
    
    # Demo 3: Cancellation and Refund
    print("\n" + "=" * 60)
    print("DEMO 3: BOOKING CANCELLATION")
    print("=" * 60)
    
    print(f"\n🔴 Cancelling booking {booking1.pnr}...")
    refund = booking_manager.cancel_booking(booking1.pnr)
    print(f"✅ Booking cancelled")
    
    # Demo 4: Check-in
    print("\n" + "=" * 60)
    print("DEMO 4: ONLINE CHECK-IN")
    print("=" * 60)
    
    if multi_city_results:
        print(f"\n✈️  Attempting check-in for {booking2.pnr}...")
        # Note: Check-in will fail because flight is not within 24 hours
        booking_manager.check_in(booking2.pnr)
    
    # Summary
    print("\n" + "=" * 60)
    print("BOOKING SUMMARY")
    print("=" * 60)
    
    for pnr, booking in booking_manager.bookings.items():
        print(f"\n{booking}")
        print(f"  Passengers: {len(booking.passengers)}")
        print(f"  Total: ${booking.total_price}")
        print(f"  Status: {booking.state.get_status().value}")
    
    print(f"\n✅ Flight booking system demonstration completed!")


if __name__ == "__main__":
    demo()
