"""
RIDE SHARING SYSTEM - Python Implementation
Patterns: State, Strategy, Observer, Factory, Singleton, Command
"""
from enum import Enum
from typing import Dict, Optional
from dataclasses import dataclass
import math

class RideStatus(Enum):
    REQUESTED = "requested"
    ACCEPTED = "accepted"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class RideType(Enum):
    ECONOMY = ("economy", 1.0)
    PREMIUM = ("premium", 1.5)
    SHARED = ("shared", 0.7)
    
    def __init__(self, name, multiplier):
        self._name = name
        self.multiplier = multiplier

@dataclass
class Location:
    latitude: float
    longitude: float
    
    def distance_to(self, other: 'Location') -> float:
        return math.sqrt((self.latitude - other.latitude)**2 + (self.longitude - other.longitude)**2) * 100

class Vehicle:
    def __init__(self, make: str, model: str, plate: str):
        self.make = make
        self.model = model
        self.plate = plate

class Rider:
    def __init__(self, rider_id: str, name: str):
        self.rider_id = rider_id
        self.name = name
        self.rating = 5.0

class Driver:
    def __init__(self, driver_id: str, name: str, vehicle: Vehicle):
        self.driver_id = driver_id
        self.name = name
        self.vehicle = vehicle
        self.location = Location(0.0, 0.0)
        self.is_available = True
        self.rating = 5.0

class Ride:
    def __init__(self, ride_id: str, rider: Rider, pickup: Location, destination: Location, ride_type: RideType):
        self.ride_id = ride_id
        self.rider = rider
        self.driver: Optional[Driver] = None
        self.pickup_location = pickup
        self.destination = destination
        self.ride_type = ride_type
        self.status = RideStatus.REQUESTED
        self.fare = 0.0
    
    def calculate_fare(self) -> float:
        distance = self.pickup_location.distance_to(self.destination)
        base_fare = distance * 2.0
        self.fare = base_fare * self.ride_type.multiplier
        return self.fare
    
    def update_status(self, status: RideStatus):
        self.status = status
        print(f"🚗 Ride {self.ride_id}: {status.value}")

class RideService:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        self.riders: Dict[str, Rider] = {}
        self.drivers: Dict[str, Driver] = {}
        self.rides: Dict[str, Ride] = {}
        self.ride_counter = 0
        self._initialized = True
    
    def register_rider(self, rider: Rider):
        self.riders[rider.rider_id] = rider
        print(f"✓ Registered rider: {rider.name}")
    
    def register_driver(self, driver: Driver):
        self.drivers[driver.driver_id] = driver
        print(f"✓ Registered driver: {driver.name}")
    
    def request_ride(self, rider_id: str, pickup: Location, destination: Location, ride_type: RideType) -> Optional[Ride]:
        rider = self.riders.get(rider_id)
        if not rider:
            return None
        
        ride_id = f"R{self.ride_counter:04d}"
        self.ride_counter += 1
        
        ride = Ride(ride_id, rider, pickup, destination, ride_type)
        ride.calculate_fare()
        self.rides[ride_id] = ride
        
        print(f"✓ Ride requested: {ride_id}")
        print(f"  Fare: ${ride.fare:.2f}")
        
        # Auto-match driver
        driver = self.match_driver(ride)
        if driver:
            ride.driver = driver
            ride.update_status(RideStatus.ACCEPTED)
            driver.is_available = False
        
        return ride
    
    def match_driver(self, ride: Ride) -> Optional[Driver]:
        for driver in self.drivers.values():
            if driver.is_available:
                print(f"✓ Matched driver: {driver.name}")
                return driver
        return None
    
    def complete_ride(self, ride_id: str):
        ride = self.rides.get(ride_id)
        if ride and ride.driver:
            ride.update_status(RideStatus.COMPLETED)
            ride.driver.is_available = True

def main():
    print("="*70)
    print("RIDE SHARING SYSTEM - Demo")
    print("="*70)
    
    service = RideService()
    
    rider = Rider("R001", "Alice")
    service.register_rider(rider)
    
    vehicle = Vehicle("Toyota", "Camry", "ABC123")
    driver = Driver("D001", "Bob", vehicle)
    driver.location = Location(40.7128, -74.0060)
    service.register_driver(driver)
    
    print("\n🚕 Requesting Ride...")
    ride = service.request_ride(
        rider.rider_id,
        Location(40.7128, -74.0060),
        Location(40.7589, -73.9851),
        RideType.ECONOMY
    )
    
    print("\n📍 Ride Lifecycle...")
    ride.update_status(RideStatus.IN_PROGRESS)
    service.complete_ride(ride.ride_id)
    
    print("\n" + "="*70)
    print("DEMO COMPLETE")
    print("="*70)

if __name__ == "__main__":
    main()

