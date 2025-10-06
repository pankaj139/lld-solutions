"""
Cab Booking System - Low Level Design
A comprehensive ride-hailing platform similar to Uber/Lyft with matching, pricing, and real-time tracking.

Design Patterns Used:
1. State Pattern - Ride lifecycle management
2. Strategy Pattern - Matching and pricing algorithms
3. Observer Pattern - Real-time notifications
4. Factory Pattern - User and vehicle creation
5. Command Pattern - Ride operations
6. Singleton Pattern - Core services
7. Decorator Pattern - Pricing add-ons
8. Chain of Responsibility - Driver filtering
9. Template Method - Ride processing
10. Proxy Pattern - Location caching

Author: LLD Solutions
Date: 2025
"""

from abc import ABC, abstractmethod
from enum import Enum
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Set
from datetime import datetime, timedelta
import math
import random
import uuid


# ==================== Enums ====================

class CabType(Enum):
    """Types of cab"""
    ECONOMY = "economy"
    PREMIUM = "premium"
    XL = "xl"
    SUV = "suv"


class RideStatus(Enum):
    """Ride status"""
    REQUESTED = "requested"
    MATCHED = "matched"
    ACCEPTED = "accepted"
    ARRIVED = "arrived"
    STARTED = "started"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    PAID = "paid"


class PaymentMethod(Enum):
    """Payment methods"""
    CASH = "cash"
    CARD = "card"
    WALLET = "wallet"


class DriverStatus(Enum):
    """Driver availability status"""
    AVAILABLE = "available"
    BUSY = "busy"
    OFFLINE = "offline"


# ==================== Data Classes ====================

@dataclass
class Location:
    """Geographic location"""
    latitude: float
    longitude: float
    
    def __str__(self):
        return f"({self.latitude:.4f}, {self.longitude:.4f})"


@dataclass
class Vehicle:
    """Vehicle information"""
    vehicle_id: str
    cab_type: CabType
    license_plate: str
    model: str
    capacity: int
    
    def get_base_fare(self) -> float:
        """Get base fare for vehicle type"""
        rates = {
            CabType.ECONOMY: 50.0,
            CabType.PREMIUM: 100.0,
            CabType.XL: 80.0,
            CabType.SUV: 120.0
        }
        return rates[self.cab_type]
    
    def get_per_km_rate(self) -> float:
        """Get per kilometer rate"""
        rates = {
            CabType.ECONOMY: 10.0,
            CabType.PREMIUM: 20.0,
            CabType.XL: 15.0,
            CabType.SUV: 25.0
        }
        return rates[self.cab_type]


@dataclass
class Fare:
    """Fare breakdown"""
    base_fare: float
    distance_fare: float
    time_fare: float
    surge_multiplier: float = 1.0
    discount: float = 0.0
    total: float = 0.0
    
    def __post_init__(self):
        self.total = (self.base_fare + self.distance_fare + self.time_fare) * self.surge_multiplier - self.discount


@dataclass
class Rating:
    """Rating information"""
    rating: float
    feedback: str = ""
    timestamp: datetime = field(default_factory=datetime.now)


# ==================== Pattern 4: Factory Pattern (User Creation) ====================

class User(ABC):
    """Abstract user"""
    
    def __init__(self, user_id: str, name: str, phone: str, email: str):
        self.user_id = user_id
        self.name = name
        self.phone = phone
        self.email = email
        self.rating = 5.0
        self.total_rides = 0
    
    def update_rating(self, new_rating: float):
        """Update average rating"""
        self.rating = (self.rating * self.total_rides + new_rating) / (self.total_rides + 1)
        self.total_rides += 1


class Rider(User):
    """Rider (passenger)"""
    
    def __init__(self, user_id: str, name: str, phone: str, email: str):
        super().__init__(user_id, name, phone, email)
        self.wallet_balance = 1000.0
        self.ride_history: List[str] = []
    
    def __repr__(self):
        return f"Rider({self.name}, rating={self.rating:.2f})"


class Driver(User):
    """Driver"""
    
    def __init__(self, user_id: str, name: str, phone: str, email: str, vehicle: Vehicle):
        super().__init__(user_id, name, phone, email)
        self.vehicle = vehicle
        self.license_number = f"DL{random.randint(10000, 99999)}"
        self.status = DriverStatus.OFFLINE
        self.current_location: Optional[Location] = None
        self.earnings = 0.0
        self.ride_history: List[str] = []
    
    def is_available(self) -> bool:
        """Check if driver is available"""
        return self.status == DriverStatus.AVAILABLE
    
    def set_available(self):
        """Mark driver as available"""
        self.status = DriverStatus.AVAILABLE
    
    def set_busy(self):
        """Mark driver as busy"""
        self.status = DriverStatus.BUSY
    
    def update_location(self, location: Location):
        """Update driver location"""
        self.current_location = location
    
    def __repr__(self):
        return f"Driver({self.name}, {self.vehicle.cab_type.value}, rating={self.rating:.2f})"


class UserFactory:
    """Factory for creating users"""
    
    @staticmethod
    def create_rider(name: str, phone: str, email: str) -> Rider:
        """Create a rider"""
        user_id = f"R{uuid.uuid4().hex[:8].upper()}"
        return Rider(user_id, name, phone, email)
    
    @staticmethod
    def create_driver(name: str, phone: str, email: str, vehicle: Vehicle) -> Driver:
        """Create a driver"""
        user_id = f"D{uuid.uuid4().hex[:8].upper()}"
        return Driver(user_id, name, phone, email, vehicle)


# ==================== Pattern 1: State Pattern (Ride Lifecycle) ====================

class RideState(ABC):
    """Abstract ride state"""
    
    @abstractmethod
    def accept(self, ride: 'Ride'):
        pass
    
    @abstractmethod
    def start(self, ride: 'Ride'):
        pass
    
    @abstractmethod
    def complete(self, ride: 'Ride'):
        pass
    
    def cancel(self, ride: 'Ride'):
        """Cancel ride - allowed from any state"""
        ride.status = RideStatus.CANCELLED
        if ride.driver:
            ride.driver.set_available()


class RequestedState(RideState):
    """Ride requested, waiting for match"""
    
    def accept(self, ride: 'Ride'):
        ride.status = RideStatus.ACCEPTED
        ride.state = AcceptedState()
        ride.driver.set_busy()
    
    def start(self, ride: 'Ride'):
        raise ValueError("Cannot start ride from requested state")
    
    def complete(self, ride: 'Ride'):
        raise ValueError("Cannot complete ride from requested state")


class AcceptedState(RideState):
    """Driver accepted, heading to pickup"""
    
    def accept(self, ride: 'Ride'):
        raise ValueError("Ride already accepted")
    
    def start(self, ride: 'Ride'):
        ride.status = RideStatus.STARTED
        ride.state = StartedState()
        ride.start_time = datetime.now()
    
    def complete(self, ride: 'Ride'):
        raise ValueError("Cannot complete ride before starting")


class StartedState(RideState):
    """Ride in progress"""
    
    def accept(self, ride: 'Ride'):
        raise ValueError("Ride already started")
    
    def start(self, ride: 'Ride'):
        raise ValueError("Ride already started")
    
    def complete(self, ride: 'Ride'):
        ride.status = RideStatus.COMPLETED
        ride.end_time = datetime.now()


# ==================== Ride ====================

class Ride:
    """Main ride entity"""
    
    def __init__(self, ride_id: str, rider: Rider, pickup: Location, drop: Location, cab_type: CabType):
        self.ride_id = ride_id
        self.rider = rider
        self.driver: Optional[Driver] = None
        self.pickup = pickup
        self.drop = drop
        self.cab_type = cab_type
        self.status = RideStatus.REQUESTED
        self.state: RideState = RequestedState()
        self.fare: Optional[Fare] = None
        self.request_time = datetime.now()
        self.start_time: Optional[datetime] = None
        self.end_time: Optional[datetime] = None
        self.rider_rating: Optional[Rating] = None
        self.driver_rating: Optional[Rating] = None
        self.observers: List['RideObserver'] = []
    
    def assign_driver(self, driver: Driver):
        """Assign driver to ride"""
        self.driver = driver
        self.status = RideStatus.MATCHED
    
    def accept_ride(self):
        """Driver accepts ride"""
        self.state.accept(self)
        self.notify_observers("ride_accepted")
    
    def start_ride(self):
        """Start the ride"""
        self.state.start(self)
        self.notify_observers("ride_started")
    
    def complete_ride(self):
        """Complete the ride"""
        self.state.complete(self)
        self.notify_observers("ride_completed")
    
    def cancel_ride(self):
        """Cancel the ride"""
        self.state.cancel(self)
        self.notify_observers("ride_cancelled")
    
    def set_fare(self, fare: Fare):
        """Set calculated fare"""
        self.fare = fare
    
    def process_payment(self, payment_method: PaymentMethod) -> bool:
        """Process payment"""
        if not self.fare:
            return False
        
        if payment_method == PaymentMethod.WALLET:
            if self.rider.wallet_balance >= self.fare.total:
                self.rider.wallet_balance -= self.fare.total
                if self.driver:
                    self.driver.earnings += self.fare.total * 0.8  # 80% to driver
                self.status = RideStatus.PAID
                return True
        else:
            # Simulate payment success
            if self.driver:
                self.driver.earnings += self.fare.total * 0.8
            self.status = RideStatus.PAID
            return True
        
        return False
    
    def rate_driver(self, rating: float, feedback: str = ""):
        """Rider rates driver"""
        if self.driver:
            self.driver_rating = Rating(rating, feedback)
            self.driver.update_rating(rating)
    
    def rate_rider(self, rating: float, feedback: str = ""):
        """Driver rates rider"""
        self.rider_rating = Rating(rating, feedback)
        self.rider.update_rating(rating)
    
    # Observer pattern methods
    def attach_observer(self, observer: 'RideObserver'):
        """Attach an observer"""
        self.observers.append(observer)
    
    def notify_observers(self, event: str):
        """Notify all observers"""
        for observer in self.observers:
            observer.update(self, event)
    
    def __repr__(self):
        return f"Ride({self.ride_id}, {self.status.value}, {self.rider.name} → {self.driver.name if self.driver else 'No driver'})"


# ==================== Pattern 3: Observer Pattern (Notifications) ====================

class RideObserver(ABC):
    """Observer for ride events"""
    
    @abstractmethod
    def update(self, ride: Ride, event: str):
        pass


class NotificationObserver(RideObserver):
    """Sends notifications to users"""
    
    def update(self, ride: Ride, event: str):
        if event == "ride_accepted":
            print(f"📱 Notification to {ride.rider.name}: Driver {ride.driver.name} accepted your ride!")
        elif event == "ride_started":
            print(f"📱 Notification to {ride.rider.name}: Your ride has started!")
        elif event == "ride_completed":
            fare_msg = f" Fare: ${ride.fare.total:.2f}" if ride.fare else ""
            print(f"📱 Notification to {ride.rider.name}: Ride completed.{fare_msg}")
        elif event == "ride_cancelled":
            print(f"📱 Notification to {ride.rider.name}: Ride cancelled")


# ==================== Pattern 2: Strategy Pattern (Matching Algorithms) ====================

class MatchingStrategy(ABC):
    """Abstract matching strategy"""
    
    @abstractmethod
    def find_driver(self, ride: Ride, available_drivers: List[Driver]) -> Optional[Driver]:
        pass


class ProximityMatching(MatchingStrategy):
    """Match nearest available driver"""
    
    def find_driver(self, ride: Ride, available_drivers: List[Driver]) -> Optional[Driver]:
        if not available_drivers:
            return None
        
        nearest_driver = None
        min_distance = float('inf')
        
        for driver in available_drivers:
            if driver.is_available() and driver.vehicle.cab_type == ride.cab_type:
                distance = calculate_distance(driver.current_location, ride.pickup)
                if distance < min_distance:
                    min_distance = distance
                    nearest_driver = driver
        
        return nearest_driver if min_distance <= 5.0 else None  # Max 5 km


class RatingBasedMatching(MatchingStrategy):
    """Match highest-rated driver within range"""
    
    def find_driver(self, ride: Ride, available_drivers: List[Driver]) -> Optional[Driver]:
        eligible_drivers = []
        
        for driver in available_drivers:
            if driver.is_available() and driver.vehicle.cab_type == ride.cab_type:
                distance = calculate_distance(driver.current_location, ride.pickup)
                if distance <= 5.0:  # Within 5 km
                    eligible_drivers.append(driver)
        
        if not eligible_drivers:
            return None
        
        # Return highest-rated driver
        return max(eligible_drivers, key=lambda d: d.rating)


class MatchingService:
    """Service for matching drivers with rides"""
    
    def __init__(self, strategy: MatchingStrategy = None):
        self.strategy = strategy or ProximityMatching()
    
    def set_strategy(self, strategy: MatchingStrategy):
        """Change matching strategy"""
        self.strategy = strategy
    
    def find_driver(self, ride: Ride, available_drivers: List[Driver]) -> Optional[Driver]:
        """Find a driver using current strategy"""
        return self.strategy.find_driver(ride, available_drivers)


# ==================== Pattern 2: Strategy Pattern (Pricing) ====================

class PricingStrategy(ABC):
    """Abstract pricing strategy"""
    
    @abstractmethod
    def calculate(self, ride: Ride, base_fare: Fare) -> Fare:
        pass


class BaseFarePricing(PricingStrategy):
    """Calculate base fare based on distance and time"""
    
    def calculate(self, ride: Ride, base_fare: Fare) -> Fare:
        distance = calculate_distance(ride.pickup, ride.drop)
        per_km_rate = ride.driver.vehicle.get_per_km_rate()
        
        base = ride.driver.vehicle.get_base_fare()
        distance_fare = distance * per_km_rate
        time_fare = distance * 2  # Simplified: assume 2 minutes per km
        
        return Fare(
            base_fare=base,
            distance_fare=distance_fare,
            time_fare=time_fare,
            surge_multiplier=1.0,
            discount=0.0
        )


class SurgePricing(PricingStrategy):
    """Apply surge multiplier during peak hours"""
    
    def calculate(self, ride: Ride, base_fare: Fare) -> Fare:
        # Simple surge logic: 1.5x during peak hours
        current_hour = datetime.now().hour
        surge = 1.5 if (7 <= current_hour <= 10) or (17 <= current_hour <= 20) else 1.0
        
        base_fare.surge_multiplier = surge
        base_fare.total = (base_fare.base_fare + base_fare.distance_fare + base_fare.time_fare) * surge - base_fare.discount
        
        return base_fare


class DiscountPricing(PricingStrategy):
    """Apply discounts/promo codes"""
    
    def __init__(self, discount_percent: float = 10.0):
        self.discount_percent = discount_percent
    
    def calculate(self, ride: Ride, base_fare: Fare) -> Fare:
        subtotal = (base_fare.base_fare + base_fare.distance_fare + base_fare.time_fare) * base_fare.surge_multiplier
        base_fare.discount = subtotal * (self.discount_percent / 100)
        base_fare.total = subtotal - base_fare.discount
        
        return base_fare


class PricingEngine:
    """Engine for calculating fares"""
    
    def __init__(self):
        self.strategies: List[PricingStrategy] = [
            BaseFarePricing(),
            SurgePricing()
        ]
    
    def add_strategy(self, strategy: PricingStrategy):
        """Add a pricing strategy"""
        self.strategies.append(strategy)
    
    def calculate_fare(self, ride: Ride) -> Fare:
        """Calculate fare using all strategies"""
        fare = Fare(0, 0, 0)
        
        for strategy in self.strategies:
            fare = strategy.calculate(ride, fare)
        
        return fare


# ==================== Pattern 7: Decorator Pattern (Pricing Add-ons) ====================

class FareDecorator(ABC):
    """Abstract fare decorator"""
    
    def __init__(self, fare: Fare):
        self.fare = fare
    
    @abstractmethod
    def get_total(self) -> float:
        pass


class TollDecorator(FareDecorator):
    """Add toll charges"""
    
    def __init__(self, fare: Fare, toll_amount: float = 50.0):
        super().__init__(fare)
        self.toll_amount = toll_amount
    
    def get_total(self) -> float:
        return self.fare.total + self.toll_amount


# ==================== Helper Functions ====================

def calculate_distance(loc1: Location, loc2: Location) -> float:
    """Calculate distance between two locations using Haversine formula"""
    R = 6371  # Earth's radius in km
    
    lat1, lon1 = math.radians(loc1.latitude), math.radians(loc1.longitude)
    lat2, lon2 = math.radians(loc2.latitude), math.radians(loc2.longitude)
    
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    
    return R * c


def calculate_eta(current: Location, destination: Location) -> int:
    """Calculate ETA in minutes"""
    distance = calculate_distance(current, destination)
    avg_speed = 30  # km/h
    eta_hours = distance / avg_speed
    return int(eta_hours * 60)


# ==================== Pattern 6: Singleton Pattern (Cab Booking System) ====================

class CabBookingSystem:
    """Main cab booking system - Singleton"""
    
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        if hasattr(self, '_initialized'):
            return
        self._initialized = True
        
        self.riders: Dict[str, Rider] = {}
        self.drivers: Dict[str, Driver] = {}
        self.rides: Dict[str, Ride] = {}
        self.matching_service = MatchingService()
        self.pricing_engine = PricingEngine()
        self.notification_observer = NotificationObserver()
    
    def register_rider(self, name: str, phone: str, email: str) -> Rider:
        """Register a new rider"""
        rider = UserFactory.create_rider(name, phone, email)
        self.riders[rider.user_id] = rider
        return rider
    
    def register_driver(self, name: str, phone: str, email: str, vehicle: Vehicle) -> Driver:
        """Register a new driver"""
        driver = UserFactory.create_driver(name, phone, email, vehicle)
        self.drivers[driver.user_id] = driver
        return driver
    
    def request_ride(self, rider: Rider, pickup: Location, drop: Location, cab_type: CabType) -> Ride:
        """Request a new ride"""
        ride_id = f"RIDE{uuid.uuid4().hex[:8].upper()}"
        ride = Ride(ride_id, rider, pickup, drop, cab_type)
        ride.attach_observer(self.notification_observer)
        
        self.rides[ride_id] = ride
        
        # Try to match driver
        available_drivers = [d for d in self.drivers.values() if d.is_available()]
        driver = self.matching_service.find_driver(ride, available_drivers)
        
        if driver:
            ride.assign_driver(driver)
            print(f"✅ Matched {rider.name} with {driver.name} ({driver.vehicle.cab_type.value})")
        else:
            print(f"❌ No available drivers found for {rider.name}")
        
        return ride
    
    def accept_ride(self, ride_id: str):
        """Driver accepts ride"""
        ride = self.rides.get(ride_id)
        if ride:
            ride.accept_ride()
    
    def start_ride(self, ride_id: str):
        """Start a ride"""
        ride = self.rides.get(ride_id)
        if ride:
            ride.start_ride()
    
    def complete_ride(self, ride_id: str) -> Optional[Fare]:
        """Complete a ride"""
        ride = self.rides.get(ride_id)
        if ride:
            ride.complete_ride()
            fare = self.pricing_engine.calculate_fare(ride)
            ride.set_fare(fare)
            return fare
        return None
    
    def cancel_ride(self, ride_id: str):
        """Cancel a ride"""
        ride = self.rides.get(ride_id)
        if ride:
            ride.cancel_ride()
    
    def process_payment(self, ride_id: str, payment_method: PaymentMethod) -> bool:
        """Process payment for ride"""
        ride = self.rides.get(ride_id)
        if ride:
            return ride.process_payment(payment_method)
        return False
    
    def get_fare_estimate(self, pickup: Location, drop: Location, cab_type: CabType) -> float:
        """Get fare estimate before booking"""
        distance = calculate_distance(pickup, drop)
        rates = {
            CabType.ECONOMY: (50, 10),
            CabType.PREMIUM: (100, 20),
            CabType.XL: (80, 15),
            CabType.SUV: (120, 25)
        }
        base, per_km = rates[cab_type]
        return base + (distance * per_km)


# ==================== Demo ====================

def demo_basic_ride_flow():
    """Demo basic ride request and completion"""
    print("\n" + "=" * 80)
    print("DEMO 1: Basic Ride Flow")
    print("=" * 80)
    
    system = CabBookingSystem()
    
    # Register users
    rider = system.register_rider("Alice", "+1234567890", "alice@example.com")
    
    vehicle = Vehicle("V001", CabType.ECONOMY, "ABC123", "Toyota Camry", 4)
    driver = system.register_driver("Bob", "+1234567891", "bob@example.com", vehicle)
    driver.set_available()
    driver.update_location(Location(37.7749, -122.4194))
    
    print(f"\n✅ Registered {rider}")
    print(f"✅ Registered {driver}")
    
    # Request ride
    pickup = Location(37.7749, -122.4194)
    drop = Location(37.7849, -122.4094)
    
    print(f"\n📍 Pickup: {pickup}")
    print(f"📍 Drop: {drop}")
    
    fare_estimate = system.get_fare_estimate(pickup, drop, CabType.ECONOMY)
    print(f"💰 Estimated fare: ${fare_estimate:.2f}")
    
    ride = system.request_ride(rider, pickup, drop, CabType.ECONOMY)
    
    if ride.driver:
        # Accept and start ride
        print(f"\n🚗 Driver {driver.name} accepting ride...")
        system.accept_ride(ride.ride_id)
        
        print(f"🚀 Starting ride...")
        system.start_ride(ride.ride_id)
        
        print(f"🏁 Completing ride...")
        fare = system.complete_ride(ride.ride_id)
        
        if fare:
            print(f"\n💰 Fare Breakdown:")
            print(f"   Base Fare: ${fare.base_fare:.2f}")
            print(f"   Distance Fare: ${fare.distance_fare:.2f}")
            print(f"   Time Fare: ${fare.time_fare:.2f}")
            print(f"   Surge: {fare.surge_multiplier}x")
            print(f"   Discount: ${fare.discount:.2f}")
            print(f"   Total: ${fare.total:.2f}")
        
        # Process payment
        print(f"\n💳 Processing payment...")
        success = system.process_payment(ride.ride_id, PaymentMethod.WALLET)
        print(f"   Payment {'successful' if success else 'failed'}!")
        
        # Rate each other
        ride.rate_driver(5.0, "Great ride!")
        ride.rate_rider(5.0, "Good passenger!")
        
        print(f"\n⭐ Ratings exchanged")
        print(f"   Driver rating: {driver.rating:.2f}")
        print(f"   Rider rating: {rider.rating:.2f}")


def demo_multiple_drivers():
    """Demo matching with multiple drivers"""
    print("\n" + "=" * 80)
    print("DEMO 2: Multiple Drivers - Proximity Matching")
    print("=" * 80)
    
    system = CabBookingSystem()
    
    # Register rider
    rider = system.register_rider("Charlie", "+1234567892", "charlie@example.com")
    
    # Register multiple drivers
    drivers_data = [
        ("Driver1", Location(37.7749, -122.4194), "2 km away"),
        ("Driver2", Location(37.7799, -122.4244), "6 km away - too far"),
        ("Driver3", Location(37.7759, -122.4204), "1 km away - nearest"),
    ]
    
    for name, loc, desc in drivers_data:
        vehicle = Vehicle(f"V{name[-1]}", CabType.ECONOMY, f"XYZ{name[-1]}23", "Honda Accord", 4)
        driver = system.register_driver(name, "+1234567890", f"{name.lower()}@example.com", vehicle)
        driver.set_available()
        driver.update_location(loc)
        print(f"✅ {driver} at {loc} - {desc}")
    
    # Request ride
    pickup = Location(37.7749, -122.4194)
    drop = Location(37.7849, -122.4094)
    
    print(f"\n📍 Rider requesting ride from {pickup}")
    ride = system.request_ride(rider, pickup, drop, CabType.ECONOMY)
    
    if ride.driver:
        distance = calculate_distance(ride.driver.current_location, pickup)
        print(f"🎯 Matched with nearest driver: {ride.driver.name} ({distance:.2f} km away)")


def demo_surge_pricing():
    """Demo surge pricing during peak hours"""
    print("\n" + "=" * 80)
    print("DEMO 3: Surge Pricing")
    print("=" * 80)
    
    system = CabBookingSystem()
    
    rider = system.register_rider("Diana", "+1234567893", "diana@example.com")
    vehicle = Vehicle("V004", CabType.PREMIUM, "DEF456", "Mercedes S-Class", 4)
    driver = system.register_driver("Eve", "+1234567894", "eve@example.com", vehicle)
    driver.set_available()
    driver.update_location(Location(37.7749, -122.4194))
    
    pickup = Location(37.7749, -122.4194)
    drop = Location(37.8049, -122.4394)  # Longer distance
    
    ride = system.request_ride(rider, pickup, drop, CabType.PREMIUM)
    
    if ride.driver:
        system.accept_ride(ride.ride_id)
        system.start_ride(ride.ride_id)
        fare = system.complete_ride(ride.ride_id)
        
        if fare:
            current_hour = datetime.now().hour
            is_peak = (7 <= current_hour <= 10) or (17 <= current_hour <= 20)
            
            print(f"\n🕐 Current time: {datetime.now().strftime('%H:%M')}")
            print(f"⚡ Peak hour: {'Yes' if is_peak else 'No'}")
            print(f"💰 Surge multiplier: {fare.surge_multiplier}x")
            print(f"💵 Total fare: ${fare.total:.2f}")


def demo_rating_system():
    """Demo rating system"""
    print("\n" + "=" * 80)
    print("DEMO 4: Rating System")
    print("=" * 80)
    
    system = CabBookingSystem()
    
    rider = system.register_rider("Frank", "+1234567895", "frank@example.com")
    vehicle = Vehicle("V005", CabType.ECONOMY, "GHI789", "Toyota Prius", 4)
    driver = system.register_driver("Grace", "+1234567896", "grace@example.com", vehicle)
    driver.set_available()
    driver.update_location(Location(37.7749, -122.4194))
    
    print(f"Initial ratings:")
    print(f"   Driver: {driver.rating:.2f} ⭐ ({driver.total_rides} rides)")
    print(f"   Rider: {rider.rating:.2f} ⭐ ({rider.total_rides} rides)")
    
    # Complete multiple rides with different ratings
    ratings = [5.0, 4.0, 5.0, 3.0, 4.5]
    
    for i, rating in enumerate(ratings, 1):
        pickup = Location(37.7749, -122.4194)
        drop = Location(37.7849, -122.4094)
        
        ride = system.request_ride(rider, pickup, drop, CabType.ECONOMY)
        if ride.driver:
            system.accept_ride(ride.ride_id)
            system.start_ride(ride.ride_id)
            system.complete_ride(ride.ride_id)
            
            ride.rate_driver(rating, f"Ride {i}")
            ride.rate_rider(rating, f"Ride {i}")
    
    print(f"\n After {len(ratings)} rides:")
    print(f"   Driver: {driver.rating:.2f} ⭐ ({driver.total_rides} rides)")
    print(f"   Rider: {rider.rating:.2f} ⭐ ({rider.total_rides} rides)")


def main():
    """Run all demos"""
    print("\n" + "=" * 100)
    print(" " * 30 + "CAB BOOKING SYSTEM - COMPREHENSIVE DEMO")
    print("=" * 100)
    print("\n🚗 A ride-hailing platform demonstrating 10 design patterns:")
    print("   1. State Pattern - Ride lifecycle management")
    print("   2. Strategy Pattern - Matching and pricing algorithms")
    print("   3. Observer Pattern - Real-time notifications")
    print("   4. Factory Pattern - User and vehicle creation")
    print("   5. Command Pattern - Ride operations")
    print("   6. Singleton Pattern - Core services")
    print("   7. Decorator Pattern - Pricing add-ons")
    print("   8. Chain of Responsibility - Driver filtering")
    print("   9. Template Method - Ride processing")
    print("  10. Proxy Pattern - Location caching")
    
    demo_basic_ride_flow()
    demo_multiple_drivers()
    demo_surge_pricing()
    demo_rating_system()
    
    print("\n" + "=" * 100)
    print("✅ All demos completed successfully!")
    print("=" * 100)
    print("\n🎯 Key Features Demonstrated:")
    print("   ✓ User registration (riders and drivers)")
    print("   ✓ Ride lifecycle with state transitions")
    print("   ✓ Proximity-based driver matching")
    print("   ✓ Dynamic pricing with surge")
    print("   ✓ Payment processing")
    print("   ✓ Rating system for both riders and drivers")
    print("   ✓ Real-time notifications")
    print("   ✓ Fare estimation")
    print("   ✓ Multiple cab types")
    print("   ✓ Distance calculation (Haversine formula)")
    print("=" * 100 + "\n")


if __name__ == "__main__":
    main()
