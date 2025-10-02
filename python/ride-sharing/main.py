from abc import ABC, abstractmethod
from enum import Enum
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import uuid
import math

class UserType(Enum):
    RIDER = 1
    DRIVER = 2

class RideStatus(Enum):
    REQUESTED = 1
    DRIVER_ASSIGNED = 2
    DRIVER_ARRIVED = 3
    IN_PROGRESS = 4
    COMPLETED = 5
    CANCELLED = 6

class DriverStatus(Enum):
    OFFLINE = 1
    AVAILABLE = 2
    BUSY = 3

class VehicleType(Enum):
    ECONOMY = 1
    PREMIUM = 2
    LUXURY = 3

class PaymentMethod(Enum):
    CASH = 1
    CREDIT_CARD = 2
    DIGITAL_WALLET = 3

class Location:
    def __init__(self, latitude: float, longitude: float, address: str = ""):
        self.latitude = latitude
        self.longitude = longitude
        self.address = address

    def distance_to(self, other_location) -> float:
        # Haversine formula for distance calculation
        R = 6371  # Earth's radius in kilometers
        
        lat1_rad = math.radians(self.latitude)
        lat2_rad = math.radians(other_location.latitude)
        delta_lat = math.radians(other_location.latitude - self.latitude)
        delta_lon = math.radians(other_location.longitude - self.longitude)
        
        a = (math.sin(delta_lat / 2) ** 2 + 
             math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon / 2) ** 2)
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        
        return R * c

class User(ABC):
    def __init__(self, user_id: str, name: str, email: str, phone: str, user_type: UserType):
        self.user_id = user_id
        self.name = name
        self.email = email
        self.phone = phone
        self.user_type = user_type
        self.rating = 5.0
        self.created_at = datetime.now()

class Rider(User):
    def __init__(self, user_id: str, name: str, email: str, phone: str):
        super().__init__(user_id, name, email, phone, UserType.RIDER)
        self.ride_history: List[str] = []  # ride_ids
        self.preferred_payment_method = PaymentMethod.CREDIT_CARD

class Vehicle:
    def __init__(self, vehicle_id: str, make: str, model: str, year: int, 
                 license_plate: str, vehicle_type: VehicleType):
        self.vehicle_id = vehicle_id
        self.make = make
        self.model = model
        self.year = year
        self.license_plate = license_plate
        self.vehicle_type = vehicle_type
        self.capacity = 4  # default capacity

class Driver(User):
    def __init__(self, user_id: str, name: str, email: str, phone: str, vehicle: Vehicle):
        super().__init__(user_id, name, email, phone, UserType.DRIVER)
        self.vehicle = vehicle
        self.license_number = ""
        self.current_location: Optional[Location] = None
        self.status = DriverStatus.OFFLINE
        self.ride_history: List[str] = []  # ride_ids
        self.total_earnings = 0.0

    def set_location(self, location: Location):
        self.current_location = location

    def set_status(self, status: DriverStatus):
        self.status = status

class RideRequest:
    def __init__(self, request_id: str, rider: Rider, pickup_location: Location, 
                 destination: Location, vehicle_type: VehicleType):
        self.request_id = request_id
        self.rider = rider
        self.pickup_location = pickup_location
        self.destination = destination
        self.vehicle_type = vehicle_type
        self.request_time = datetime.now()
        self.estimated_fare = 0.0

class Ride:
    def __init__(self, ride_id: str, ride_request: RideRequest, driver: Driver):
        self.ride_id = ride_id
        self.ride_request = ride_request
        self.driver = driver
        self.status = RideStatus.DRIVER_ASSIGNED
        self.start_time: Optional[datetime] = None
        self.end_time: Optional[datetime] = None
        self.actual_fare = 0.0
        self.distance_traveled = 0.0
        self.driver_location_updates: List[Location] = []

    def start_ride(self):
        self.status = RideStatus.IN_PROGRESS
        self.start_time = datetime.now()
        self.driver.set_status(DriverStatus.BUSY)

    def complete_ride(self, actual_distance: float):
        self.status = RideStatus.COMPLETED
        self.end_time = datetime.now()
        self.distance_traveled = actual_distance
        self.driver.set_status(DriverStatus.AVAILABLE)

    def cancel_ride(self):
        self.status = RideStatus.CANCELLED
        self.driver.set_status(DriverStatus.AVAILABLE)

class Payment:
    def __init__(self, payment_id: str, ride: Ride, amount: float, payment_method: PaymentMethod):
        self.payment_id = payment_id
        self.ride = ride
        self.amount = amount
        self.payment_method = payment_method
        self.payment_time = datetime.now()
        self.is_processed = False

    def process_payment(self) -> bool:
        try:
            print(f"Processing payment of ${self.amount:.2f} via {self.payment_method.name}")
            self.is_processed = True
            return True
        except Exception as e:
            print(f"Payment failed: {e}")
            return False

class PricingStrategy(ABC):
    @abstractmethod
    def calculate_fare(self, distance: float, vehicle_type: VehicleType, 
                      pickup_time: datetime) -> float:
        pass

class StandardPricing(PricingStrategy):
    def __init__(self):
        self.base_rates = {
            VehicleType.ECONOMY: 2.0,
            VehicleType.PREMIUM: 3.0,
            VehicleType.LUXURY: 5.0
        }
        self.per_km_rates = {
            VehicleType.ECONOMY: 1.0,
            VehicleType.PREMIUM: 1.5,
            VehicleType.LUXURY: 2.5
        }

    def calculate_fare(self, distance: float, vehicle_type: VehicleType, 
                      pickup_time: datetime) -> float:
        base_fare = self.base_rates[vehicle_type]
        distance_fare = self.per_km_rates[vehicle_type] * distance
        
        # Add surge pricing during peak hours
        surge_multiplier = self._get_surge_multiplier(pickup_time)
        
        total_fare = (base_fare + distance_fare) * surge_multiplier
        return max(total_fare, 5.0)  # Minimum fare

    def _get_surge_multiplier(self, pickup_time: datetime) -> float:
        hour = pickup_time.hour
        # Peak hours: 7-9 AM and 6-8 PM
        if (7 <= hour <= 9) or (18 <= hour <= 20):
            return 1.5
        # Weekend nights
        if pickup_time.weekday() >= 5 and (22 <= hour <= 2):
            return 2.0
        return 1.0

class DriverMatcher:
    @staticmethod
    def find_nearby_drivers(available_drivers: List[Driver], pickup_location: Location, 
                           vehicle_type: VehicleType, max_distance: float = 5.0) -> List[Driver]:
        nearby_drivers = []
        
        for driver in available_drivers:
            if (driver.status == DriverStatus.AVAILABLE and 
                driver.vehicle.vehicle_type == vehicle_type and
                driver.current_location):
                
                distance = pickup_location.distance_to(driver.current_location)
                if distance <= max_distance:
                    nearby_drivers.append((driver, distance))
        
        # Sort by distance and rating
        nearby_drivers.sort(key=lambda x: (x[1], -x[0].rating))
        return [driver for driver, _ in nearby_drivers[:10]]  # Return top 10

class RideSharingSystem:
    def __init__(self, company_name: str):
        self.company_name = company_name
        self.riders: Dict[str, Rider] = {}
        self.drivers: Dict[str, Driver] = {}
        self.vehicles: Dict[str, Vehicle] = {}
        self.ride_requests: Dict[str, RideRequest] = {}
        self.rides: Dict[str, Ride] = {}
        self.payments: Dict[str, Payment] = {}
        self.pricing_strategy = StandardPricing()

    def register_rider(self, name: str, email: str, phone: str) -> Rider:
        rider_id = str(uuid.uuid4())
        rider = Rider(rider_id, name, email, phone)
        self.riders[rider_id] = rider
        return rider

    def register_driver(self, name: str, email: str, phone: str, vehicle: Vehicle, 
                       license_number: str) -> Driver:
        driver_id = str(uuid.uuid4())
        driver = Driver(driver_id, name, email, phone, vehicle)
        driver.license_number = license_number
        
        self.drivers[driver_id] = driver
        self.vehicles[vehicle.vehicle_id] = vehicle
        return driver

    def request_ride(self, rider_id: str, pickup_location: Location, 
                    destination: Location, vehicle_type: VehicleType) -> RideRequest:
        if rider_id not in self.riders:
            raise Exception("Rider not found")
        
        rider = self.riders[rider_id]
        request_id = str(uuid.uuid4())
        
        ride_request = RideRequest(request_id, rider, pickup_location, destination, vehicle_type)
        
        # Calculate estimated fare
        distance = pickup_location.distance_to(destination)
        ride_request.estimated_fare = self.pricing_strategy.calculate_fare(
            distance, vehicle_type, datetime.now())
        
        self.ride_requests[request_id] = ride_request
        
        # Try to match with a driver
        self._match_driver(ride_request)
        
        return ride_request

    def _match_driver(self, ride_request: RideRequest) -> Optional[Ride]:
        available_drivers = [d for d in self.drivers.values() if d.status == DriverStatus.AVAILABLE]
        
        nearby_drivers = DriverMatcher.find_nearby_drivers(
            available_drivers, ride_request.pickup_location, ride_request.vehicle_type)
        
        if nearby_drivers:
            # Assign the best driver
            selected_driver = nearby_drivers[0]
            ride_id = str(uuid.uuid4())
            
            ride = Ride(ride_id, ride_request, selected_driver)
            self.rides[ride_id] = ride
            
            # Update rider and driver
            ride_request.rider.ride_history.append(ride_id)
            selected_driver.ride_history.append(ride_id)
            
            print(f"Ride {ride_id} assigned to driver {selected_driver.name}")
            print(f"Estimated fare: ${ride_request.estimated_fare:.2f}")
            
            # Simulate driver arriving
            self._simulate_driver_arrival(ride)
            
            return ride
        else:
            print("No available drivers found")
            return None

    def _simulate_driver_arrival(self, ride: Ride):
        # In real system, this would be handled by GPS tracking
        ride.status = RideStatus.DRIVER_ARRIVED
        print(f"Driver {ride.driver.name} has arrived at pickup location")

    def start_ride(self, ride_id: str):
        if ride_id not in self.rides:
            raise Exception("Ride not found")
        
        ride = self.rides[ride_id]
        if ride.status != RideStatus.DRIVER_ARRIVED:
            raise Exception("Driver must arrive before starting ride")
        
        ride.start_ride()
        print(f"Ride {ride_id} started")

    def complete_ride(self, ride_id: str, actual_distance: float):
        if ride_id not in self.rides:
            raise Exception("Ride not found")
        
        ride = self.rides[ride_id]
        if ride.status != RideStatus.IN_PROGRESS:
            raise Exception("Ride must be in progress to complete")
        
        ride.complete_ride(actual_distance)
        
        # Calculate final fare
        final_fare = self.pricing_strategy.calculate_fare(
            actual_distance, ride.ride_request.vehicle_type, ride.start_time)
        ride.actual_fare = final_fare
        
        # Process payment
        payment_id = str(uuid.uuid4())
        payment = Payment(payment_id, ride, final_fare, ride.ride_request.rider.preferred_payment_method)
        
        if payment.process_payment():
            self.payments[payment_id] = payment
            ride.driver.total_earnings += final_fare * 0.8  # Driver gets 80%
            print(f"Ride {ride_id} completed. Final fare: ${final_fare:.2f}")
        
        return ride

    def cancel_ride(self, ride_id: str, cancelled_by: str):
        if ride_id not in self.rides:
            raise Exception("Ride not found")
        
        ride = self.rides[ride_id]
        if ride.status in [RideStatus.COMPLETED, RideStatus.CANCELLED]:
            raise Exception("Cannot cancel completed or already cancelled ride")
        
        ride.cancel_ride()
        print(f"Ride {ride_id} cancelled by {cancelled_by}")

    def update_driver_location(self, driver_id: str, location: Location):
        if driver_id in self.drivers:
            self.drivers[driver_id].set_location(location)

    def set_driver_status(self, driver_id: str, status: DriverStatus):
        if driver_id in self.drivers:
            self.drivers[driver_id].set_status(status)

    def get_rider_history(self, rider_id: str) -> List[Ride]:
        if rider_id not in self.riders:
            return []
        
        rider = self.riders[rider_id]
        rider_rides = []
        
        for ride_id in rider.ride_history:
            if ride_id in self.rides:
                rider_rides.append(self.rides[ride_id])
        
        return sorted(rider_rides, key=lambda r: r.ride_request.request_time, reverse=True)

    def get_driver_earnings(self, driver_id: str) -> Dict:
        if driver_id not in self.drivers:
            return {}
        
        driver = self.drivers[driver_id]
        completed_rides = len([r for r in driver.ride_history if r in self.rides and 
                              self.rides[r].status == RideStatus.COMPLETED])
        
        return {
            "total_earnings": driver.total_earnings,
            "completed_rides": completed_rides,
            "rating": driver.rating,
            "status": driver.status.name
        }

# Demo usage
def main():
    # Create ride sharing system
    system = RideSharingSystem("QuickRide")
    
    # Register riders
    rider1 = system.register_rider("Alice Johnson", "alice@example.com", "123-456-7890")
    rider2 = system.register_rider("Bob Smith", "bob@example.com", "098-765-4321")
    
    # Register drivers with vehicles
    vehicle1 = Vehicle("V1", "Toyota", "Prius", 2020, "ABC123", VehicleType.ECONOMY)
    vehicle2 = Vehicle("V2", "BMW", "X5", 2021, "XYZ789", VehicleType.PREMIUM)
    
    driver1 = system.register_driver("Charlie Driver", "charlie@example.com", "555-123-4567", vehicle1, "DL123456")
    driver2 = system.register_driver("Diana Driver", "diana@example.com", "555-987-6543", vehicle2, "DL789012")
    
    # Set driver locations and status
    driver1_location = Location(40.7589, -73.9851, "123 Driver St")
    driver2_location = Location(40.7505, -73.9934, "456 Driver Ave")
    
    system.update_driver_location(driver1.user_id, driver1_location)
    system.update_driver_location(driver2.user_id, driver2_location)
    
    system.set_driver_status(driver1.user_id, DriverStatus.AVAILABLE)
    system.set_driver_status(driver2.user_id, DriverStatus.AVAILABLE)
    
    print(f"Ride sharing system '{system.company_name}' initialized")
    print(f"Registered {len(system.riders)} riders and {len(system.drivers)} drivers")
    
    # Request a ride
    pickup_location = Location(40.7580, -73.9855, "Main St & 1st Ave")
    destination = Location(40.7614, -73.9776, "Central Park")
    
    try:
        ride_request = system.request_ride(rider1.user_id, pickup_location, destination, VehicleType.ECONOMY)
        
        print(f"\nRide requested by {rider1.name}")
        print(f"Pickup: {pickup_location.address}")
        print(f"Destination: {destination.address}")
        print(f"Vehicle type: {ride_request.vehicle_type.name}")
        
        # Find the assigned ride
        assigned_ride = None
        for ride in system.rides.values():
            if ride.ride_request.request_id == ride_request.request_id:
                assigned_ride = ride
                break
        
        if assigned_ride:
            print(f"\n--- Ride Workflow ---")
            
            # Start the ride
            system.start_ride(assigned_ride.ride_id)
            
            # Simulate ride completion
            actual_distance = pickup_location.distance_to(destination)
            completed_ride = system.complete_ride(assigned_ride.ride_id, actual_distance)
            
            print(f"Distance traveled: {actual_distance:.2f} km")
            
            # Show driver earnings
            earnings = system.get_driver_earnings(driver1.user_id)
            print(f"\nDriver earnings: ${earnings['total_earnings']:.2f}")
            print(f"Completed rides: {earnings['completed_rides']}")
        
    except Exception as e:
        print(f"Error: {e}")
    
    # Show rider history
    rider_history = system.get_rider_history(rider1.user_id)
    print(f"\n{rider1.name} has {len(rider_history)} ride(s) in history")

if __name__ == "__main__":
    main()