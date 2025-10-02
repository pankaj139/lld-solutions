from abc import ABC, abstractmethod
from enum import Enum
from datetime import datetime
import uuid

class VehicleType(Enum):
    MOTORCYCLE = 1
    CAR = 2
    TRUCK = 3

class ParkingSpotType(Enum):
    MOTORCYCLE = 1
    CAR = 2
    TRUCK = 3

class PaymentStatus(Enum):
    PENDING = 1
    COMPLETED = 2
    FAILED = 3

class Vehicle(ABC):
    def __init__(self, license_plate, vehicle_type):
        self.license_plate = license_plate
        self.vehicle_type = vehicle_type

class Motorcycle(Vehicle):
    def __init__(self, license_plate):
        super().__init__(license_plate, VehicleType.MOTORCYCLE)

class Car(Vehicle):
    def __init__(self, license_plate):
        super().__init__(license_plate, VehicleType.CAR)

class Truck(Vehicle):
    def __init__(self, license_plate):
        super().__init__(license_plate, VehicleType.TRUCK)

class ParkingSpot:
    def __init__(self, spot_id, spot_type):
        self.spot_id = spot_id
        self.spot_type = spot_type
        self.is_occupied = False
        self.vehicle = None

    def park_vehicle(self, vehicle):
        if self.is_occupied:
            raise Exception("Parking spot is already occupied")
        
        if not self._can_fit_vehicle(vehicle):
            raise Exception("Vehicle cannot fit in this spot")
        
        self.is_occupied = True
        self.vehicle = vehicle

    def remove_vehicle(self):
        self.is_occupied = False
        vehicle = self.vehicle
        self.vehicle = None
        return vehicle

    def _can_fit_vehicle(self, vehicle):
        return (self.spot_type == ParkingSpotType.TRUCK or 
                (self.spot_type == ParkingSpotType.CAR and vehicle.vehicle_type != VehicleType.TRUCK) or
                (self.spot_type == ParkingSpotType.MOTORCYCLE and vehicle.vehicle_type == VehicleType.MOTORCYCLE))

class ParkingTicket:
    def __init__(self, vehicle, parking_spot, entry_time):
        self.ticket_id = str(uuid.uuid4())
        self.vehicle = vehicle
        self.parking_spot = parking_spot
        self.entry_time = entry_time
        self.exit_time = None
        self.fee = 0.0
        self.payment_status = PaymentStatus.PENDING

class ParkingRate:
    def __init__(self):
        self.hourly_rates = {
            VehicleType.MOTORCYCLE: 2.0,
            VehicleType.CAR: 5.0,
            VehicleType.TRUCK: 10.0
        }

    def calculate_fee(self, vehicle_type, hours):
        return self.hourly_rates[vehicle_type] * hours

class PaymentProcessor:
    def process_payment(self, amount, payment_method):
        # Simulate payment processing
        print(f"Processing payment of ${amount} via {payment_method}")
        return True

class ParkingLot:
    def __init__(self, name):
        self.name = name
        self.parking_spots = {}
        self.available_spots = {
            ParkingSpotType.MOTORCYCLE: [],
            ParkingSpotType.CAR: [],
            ParkingSpotType.TRUCK: []
        }
        self.occupied_spots = {}
        self.active_tickets = {}
        self.parking_rate = ParkingRate()
        self.payment_processor = PaymentProcessor()

    def add_parking_spot(self, parking_spot):
        self.parking_spots[parking_spot.spot_id] = parking_spot
        self.available_spots[parking_spot.spot_type].append(parking_spot)

    def find_available_spot(self, vehicle_type):
        # Find the best fitting spot for the vehicle
        if vehicle_type == VehicleType.MOTORCYCLE:
            # Motorcycle can park in any spot, but prefer motorcycle spots
            for spot_type in [ParkingSpotType.MOTORCYCLE, ParkingSpotType.CAR, ParkingSpotType.TRUCK]:
                if self.available_spots[spot_type]:
                    return self.available_spots[spot_type][0]
        elif vehicle_type == VehicleType.CAR:
            # Car can park in car or truck spots
            for spot_type in [ParkingSpotType.CAR, ParkingSpotType.TRUCK]:
                if self.available_spots[spot_type]:
                    return self.available_spots[spot_type][0]
        elif vehicle_type == VehicleType.TRUCK:
            # Truck can only park in truck spots
            if self.available_spots[ParkingSpotType.TRUCK]:
                return self.available_spots[ParkingSpotType.TRUCK][0]
        
        return None

    def park_vehicle(self, vehicle):
        spot = self.find_available_spot(vehicle.vehicle_type)
        if not spot:
            raise Exception("No available parking spot for this vehicle type")

        # Park the vehicle
        spot.park_vehicle(vehicle)
        
        # Move spot from available to occupied
        self.available_spots[spot.spot_type].remove(spot)
        self.occupied_spots[spot.spot_id] = spot

        # Create and store ticket
        ticket = ParkingTicket(vehicle, spot, datetime.now())
        self.active_tickets[ticket.ticket_id] = ticket

        return ticket

    def exit_vehicle(self, ticket_id):
        if ticket_id not in self.active_tickets:
            raise Exception("Invalid ticket")

        ticket = self.active_tickets[ticket_id]
        ticket.exit_time = datetime.now()

        # Calculate fee
        duration_hours = (ticket.exit_time - ticket.entry_time).total_seconds() / 3600
        duration_hours = max(1, duration_hours)  # Minimum 1 hour
        ticket.fee = self.parking_rate.calculate_fee(ticket.vehicle.vehicle_type, duration_hours)

        return ticket

    def process_payment(self, ticket_id, payment_method):
        if ticket_id not in self.active_tickets:
            raise Exception("Invalid ticket")

        ticket = self.active_tickets[ticket_id]
        
        if self.payment_processor.process_payment(ticket.fee, payment_method):
            ticket.payment_status = PaymentStatus.COMPLETED
            
            # Free up the parking spot
            spot = ticket.parking_spot
            spot.remove_vehicle()
            
            # Move spot from occupied to available
            del self.occupied_spots[spot.spot_id]
            self.available_spots[spot.spot_type].append(spot)
            
            # Remove ticket from active tickets
            del self.active_tickets[ticket_id]
            
            return True
        else:
            ticket.payment_status = PaymentStatus.FAILED
            return False

    def get_available_spots_count(self):
        return {
            spot_type: len(spots) for spot_type, spots in self.available_spots.items()
        }

# Demo usage
def main():
    # Create parking lot
    parking_lot = ParkingLot("City Center Parking")
    
    # Add parking spots
    for i in range(10):
        parking_lot.add_parking_spot(ParkingSpot(f"M{i}", ParkingSpotType.MOTORCYCLE))
    for i in range(20):
        parking_lot.add_parking_spot(ParkingSpot(f"C{i}", ParkingSpotType.CAR))
    for i in range(5):
        parking_lot.add_parking_spot(ParkingSpot(f"T{i}", ParkingSpotType.TRUCK))

    print("Available spots:", parking_lot.get_available_spots_count())

    # Park vehicles
    car1 = Car("ABC123")
    ticket1 = parking_lot.park_vehicle(car1)
    print(f"Car parked with ticket: {ticket1.ticket_id}")

    motorcycle1 = Motorcycle("XYZ789")
    ticket2 = parking_lot.park_vehicle(motorcycle1)
    print(f"Motorcycle parked with ticket: {ticket2.ticket_id}")

    print("Available spots after parking:", parking_lot.get_available_spots_count())

    # Simulate exit and payment
    import time
    time.sleep(1)  # Simulate some parking time
    
    exit_ticket = parking_lot.exit_vehicle(ticket1.ticket_id)
    print(f"Exit ticket fee: ${exit_ticket.fee:.2f}")
    
    payment_success = parking_lot.process_payment(ticket1.ticket_id, "Credit Card")
    print(f"Payment successful: {payment_success}")

    print("Available spots after exit:", parking_lot.get_available_spots_count())

if __name__ == "__main__":
    main()