from abc import ABC, abstractmethod
from enum import Enum
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import uuid

class RoomType(Enum):
    SINGLE = 1
    DOUBLE = 2
    SUITE = 3
    DELUXE = 4

class RoomStatus(Enum):
    AVAILABLE = 1
    BOOKED = 2
    OCCUPIED = 3
    MAINTENANCE = 4

class BookingStatus(Enum):
    CONFIRMED = 1
    PENDING = 2
    CANCELLED = 3
    CHECKED_IN = 4
    CHECKED_OUT = 5

class PaymentStatus(Enum):
    PENDING = 1
    COMPLETED = 2
    FAILED = 3
    REFUNDED = 4

class Guest:
    def __init__(self, guest_id: str, name: str, email: str, phone: str):
        self.guest_id = guest_id
        self.name = name
        self.email = email
        self.phone = phone
        self.bookings: List[str] = []  # booking_ids

class Room:
    def __init__(self, room_number: str, room_type: RoomType, price_per_night: float):
        self.room_number = room_number
        self.room_type = room_type
        self.price_per_night = price_per_night
        self.status = RoomStatus.AVAILABLE
        self.amenities: List[str] = []
        self.floor = int(room_number[0]) if room_number.isdigit() else 1

    def set_status(self, status: RoomStatus):
        self.status = status

    def add_amenity(self, amenity: str):
        if amenity not in self.amenities:
            self.amenities.append(amenity)

class Booking:
    def __init__(self, booking_id: str, guest: Guest, room: Room, 
                 check_in_date: datetime, check_out_date: datetime):
        self.booking_id = booking_id
        self.guest = guest
        self.room = room
        self.check_in_date = check_in_date
        self.check_out_date = check_out_date
        self.booking_date = datetime.now()
        self.status = BookingStatus.PENDING
        self.total_amount = self._calculate_total_amount()
        self.payment_status = PaymentStatus.PENDING

    def _calculate_total_amount(self) -> float:
        nights = (self.check_out_date - self.check_in_date).days
        return nights * self.room.price_per_night

    def confirm_booking(self):
        self.status = BookingStatus.CONFIRMED
        self.room.set_status(RoomStatus.BOOKED)

    def cancel_booking(self):
        self.status = BookingStatus.CANCELLED
        self.room.set_status(RoomStatus.AVAILABLE)

    def check_in(self):
        if self.status != BookingStatus.CONFIRMED:
            raise Exception("Booking must be confirmed before check-in")
        self.status = BookingStatus.CHECKED_IN
        self.room.set_status(RoomStatus.OCCUPIED)

    def check_out(self):
        if self.status != BookingStatus.CHECKED_IN:
            raise Exception("Guest must be checked in before check-out")
        self.status = BookingStatus.CHECKED_OUT
        self.room.set_status(RoomStatus.AVAILABLE)

class Payment:
    def __init__(self, payment_id: str, booking: Booking, amount: float, payment_method: str):
        self.payment_id = payment_id
        self.booking = booking
        self.amount = amount
        self.payment_method = payment_method
        self.payment_date = datetime.now()
        self.status = PaymentStatus.PENDING

    def process_payment(self) -> bool:
        # Simulate payment processing
        try:
            # In real implementation, this would integrate with payment gateway
            print(f"Processing payment of ${self.amount} via {self.payment_method}")
            self.status = PaymentStatus.COMPLETED
            self.booking.payment_status = PaymentStatus.COMPLETED
            return True
        except Exception as e:
            print(f"Payment failed: {e}")
            self.status = PaymentStatus.FAILED
            self.booking.payment_status = PaymentStatus.FAILED
            return False

    def refund_payment(self) -> bool:
        if self.status != PaymentStatus.COMPLETED:
            return False
        
        self.status = PaymentStatus.REFUNDED
        self.booking.payment_status = PaymentStatus.REFUNDED
        print(f"Refunded ${self.amount} to {self.payment_method}")
        return True

class RoomSearchCriteria:
    def __init__(self, check_in_date: datetime, check_out_date: datetime,
                 room_type: Optional[RoomType] = None, max_price: Optional[float] = None):
        self.check_in_date = check_in_date
        self.check_out_date = check_out_date
        self.room_type = room_type
        self.max_price = max_price

class HotelBookingSystem:
    def __init__(self, hotel_name: str):
        self.hotel_name = hotel_name
        self.rooms: Dict[str, Room] = {}  # room_number -> Room
        self.guests: Dict[str, Guest] = {}  # guest_id -> Guest
        self.bookings: Dict[str, Booking] = {}  # booking_id -> Booking
        self.payments: Dict[str, Payment] = {}  # payment_id -> Payment

    def add_room(self, room: Room):
        self.rooms[room.room_number] = room

    def register_guest(self, name: str, email: str, phone: str) -> Guest:
        guest_id = str(uuid.uuid4())
        guest = Guest(guest_id, name, email, phone)
        self.guests[guest_id] = guest
        return guest

    def search_available_rooms(self, criteria: RoomSearchCriteria) -> List[Room]:
        available_rooms = []
        
        for room in self.rooms.values():
            # Check if room matches criteria
            if criteria.room_type and room.room_type != criteria.room_type:
                continue
            
            if criteria.max_price and room.price_per_night > criteria.max_price:
                continue
            
            # Check availability for the date range
            if self._is_room_available(room, criteria.check_in_date, criteria.check_out_date):
                available_rooms.append(room)
        
        return sorted(available_rooms, key=lambda r: r.price_per_night)

    def _is_room_available(self, room: Room, check_in: datetime, check_out: datetime) -> bool:
        # Check if room has any conflicting bookings
        for booking in self.bookings.values():
            if booking.room.room_number == room.room_number:
                if booking.status in [BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN]:
                    # Check for date overlap
                    if (check_in < booking.check_out_date and check_out > booking.check_in_date):
                        return False
        
        return room.status in [RoomStatus.AVAILABLE, RoomStatus.BOOKED]

    def create_booking(self, guest_id: str, room_number: str, 
                      check_in_date: datetime, check_out_date: datetime) -> Booking:
        if guest_id not in self.guests:
            raise Exception("Guest not found")
        
        if room_number not in self.rooms:
            raise Exception("Room not found")
        
        guest = self.guests[guest_id]
        room = self.rooms[room_number]
        
        # Validate dates
        if check_in_date >= check_out_date:
            raise Exception("Check-out date must be after check-in date")
        
        if check_in_date < datetime.now():
            raise Exception("Check-in date cannot be in the past")
        
        # Check room availability
        if not self._is_room_available(room, check_in_date, check_out_date):
            raise Exception("Room is not available for the selected dates")
        
        booking_id = str(uuid.uuid4())
        booking = Booking(booking_id, guest, room, check_in_date, check_out_date)
        
        self.bookings[booking_id] = booking
        guest.bookings.append(booking_id)
        
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
            print(f"Booking {booking.booking_id} confirmed for {booking.guest.name}")
            return True
        else:
            print(f"Payment failed for booking {booking_id}")
            return False

    def cancel_booking(self, booking_id: str) -> bool:
        if booking_id not in self.bookings:
            raise Exception("Booking not found")
        
        booking = self.bookings[booking_id]
        
        if booking.status == BookingStatus.CHECKED_IN:
            raise Exception("Cannot cancel booking after check-in")
        
        # Calculate cancellation policy (simplified)
        days_until_checkin = (booking.check_in_date - datetime.now()).days
        refund_percentage = 1.0 if days_until_checkin > 7 else 0.5 if days_until_checkin > 1 else 0.0
        
        booking.cancel_booking()
        
        # Process refund if payment was made
        if booking.payment_status == PaymentStatus.COMPLETED:
            # Find the payment and process refund
            for payment in self.payments.values():
                if payment.booking.booking_id == booking_id:
                    if refund_percentage > 0:
                        refund_amount = payment.amount * refund_percentage
                        payment.refund_payment()
                        print(f"Refunded ${refund_amount:.2f} ({refund_percentage*100}% of total)")
                    break
        
        print(f"Booking {booking_id} cancelled")
        return True

    def check_in_guest(self, booking_id: str) -> bool:
        if booking_id not in self.bookings:
            raise Exception("Booking not found")
        
        booking = self.bookings[booking_id]
        
        # Check if it's the check-in date
        today = datetime.now().date()
        if booking.check_in_date.date() > today:
            raise Exception("Check-in date has not arrived yet")
        
        booking.check_in()
        print(f"Guest {booking.guest.name} checked in to room {booking.room.room_number}")
        return True

    def check_out_guest(self, booking_id: str) -> bool:
        if booking_id not in self.bookings:
            raise Exception("Booking not found")
        
        booking = self.bookings[booking_id]
        booking.check_out()
        print(f"Guest {booking.guest.name} checked out from room {booking.room.room_number}")
        return True

    def get_guest_bookings(self, guest_id: str) -> List[Booking]:
        if guest_id not in self.guests:
            return []
        
        guest = self.guests[guest_id]
        guest_bookings = []
        
        for booking_id in guest.bookings:
            if booking_id in self.bookings:
                guest_bookings.append(self.bookings[booking_id])
        
        return sorted(guest_bookings, key=lambda b: b.booking_date, reverse=True)

    def get_occupancy_report(self, date: datetime) -> Dict:
        total_rooms = len(self.rooms)
        occupied_rooms = 0
        available_rooms = 0
        maintenance_rooms = 0
        
        for room in self.rooms.values():
            if room.status == RoomStatus.OCCUPIED:
                occupied_rooms += 1
            elif room.status == RoomStatus.AVAILABLE:
                available_rooms += 1
            elif room.status == RoomStatus.MAINTENANCE:
                maintenance_rooms += 1
        
        occupancy_rate = (occupied_rooms / total_rooms) * 100 if total_rooms > 0 else 0
        
        return {
            "date": date.strftime("%Y-%m-%d"),
            "total_rooms": total_rooms,
            "occupied_rooms": occupied_rooms,
            "available_rooms": available_rooms,
            "maintenance_rooms": maintenance_rooms,
            "occupancy_rate": round(occupancy_rate, 2)
        }

# Demo usage
def main():
    # Create hotel booking system
    hotel = HotelBookingSystem("Grand Palace Hotel")
    
    # Add rooms
    rooms_data = [
        ("101", RoomType.SINGLE, 100.0),
        ("102", RoomType.SINGLE, 100.0),
        ("201", RoomType.DOUBLE, 150.0),
        ("202", RoomType.DOUBLE, 150.0),
        ("301", RoomType.SUITE, 300.0),
        ("401", RoomType.DELUXE, 500.0)
    ]
    
    for room_number, room_type, price in rooms_data:
        room = Room(room_number, room_type, price)
        room.add_amenity("WiFi")
        room.add_amenity("TV")
        if room_type in [RoomType.SUITE, RoomType.DELUXE]:
            room.add_amenity("Mini Bar")
            room.add_amenity("Balcony")
        hotel.add_room(room)
    
    print(f"Hotel '{hotel.hotel_name}' initialized with {len(hotel.rooms)} rooms")
    
    # Register guests
    guest1 = hotel.register_guest("John Doe", "john@example.com", "123-456-7890")
    guest2 = hotel.register_guest("Jane Smith", "jane@example.com", "098-765-4321")
    
    # Search for available rooms
    check_in = datetime.now() + timedelta(days=1)
    check_out = datetime.now() + timedelta(days=3)
    
    criteria = RoomSearchCriteria(check_in, check_out, RoomType.DOUBLE, 200.0)
    available_rooms = hotel.search_available_rooms(criteria)
    
    print(f"\nAvailable {criteria.room_type.name} rooms for {check_in.date()} to {check_out.date()}:")
    for room in available_rooms:
        print(f"  Room {room.room_number}: ${room.price_per_night}/night")
    
    # Create and confirm booking
    if available_rooms:
        try:
            booking = hotel.create_booking(guest1.guest_id, available_rooms[0].room_number, 
                                         check_in, check_out)
            print(f"\nBooking created: {booking.booking_id}")
            print(f"Total amount: ${booking.total_amount}")
            
            # Confirm booking with payment
            if hotel.confirm_booking(booking.booking_id, "Credit Card"):
                print("Booking confirmed successfully!")
                
                # Simulate check-in (would normally happen on check-in date)
                print("\n--- Simulating Check-in ---")
                booking.check_in_date = datetime.now()  # Simulate it's check-in day
                hotel.check_in_guest(booking.booking_id)
                
                # Get occupancy report
                report = hotel.get_occupancy_report(datetime.now())
                print(f"\nOccupancy Report:")
                print(f"  Occupied: {report['occupied_rooms']}/{report['total_rooms']} rooms")
                print(f"  Occupancy Rate: {report['occupancy_rate']}%")
                
        except Exception as e:
            print(f"Error: {e}")
    
    # Show guest bookings
    guest_bookings = hotel.get_guest_bookings(guest1.guest_id)
    print(f"\n{guest1.name} has {len(guest_bookings)} booking(s)")
    
    # Try to create another booking that conflicts
    try:
        conflicting_booking = hotel.create_booking(guest2.guest_id, available_rooms[0].room_number,
                                                 check_in, check_out)
        print("This shouldn't happen - room should be booked!")
    except Exception as e:
        print(f"\nExpected conflict: {e}")

if __name__ == "__main__":
    main()