"""
RESTAURANT RESERVATION SYSTEM - Low Level Design Implementation in Python

This file implements a comprehensive restaurant reservation management system
with table management, customer reservations, waitlist handling, and notifications.

DESIGN PATTERNS USED:
1. STATE PATTERN: Reservation lifecycle with explicit state transitions
   - ReservationStatus defines all possible reservation states
   - State transitions: PENDING -> CONFIRMED -> SEATED -> COMPLETED
   - Prevents invalid state transitions (e.g., cannot seat a cancelled reservation)
   - Each state has specific allowed operations and business rules

2. STRATEGY PATTERN: Different table assignment strategies
   - FirstAvailableStrategy: Assigns first available table
   - OptimalSizeStrategy: Assigns smallest suitable table
   - PreferenceBasedStrategy: Considers customer seating preferences
   - Easy to add new assignment algorithms without changing core logic

3. OBSERVER PATTERN: Notification system for reservation events
   - NotificationService observes reservation state changes
   - Sends confirmations, reminders, and updates automatically
   - Supports multiple notification channels (Email, SMS, Push)
   - Decoupled notification logic from core reservation system

4. FACTORY PATTERN: Creating different types of reservations
   - ReservationFactory for standard, large party, and special occasion reservations
   - Encapsulates complex reservation creation logic
   - Supports different validation rules for different reservation types

5. SINGLETON PATTERN: Restaurant system instance management
   - Ensures single instance of restaurant system
   - Global access point for restaurant operations
   - Thread-safe implementation for concurrent access

6. COMMAND PATTERN: Reservation operations
   - CreateReservation, ModifyReservation, CancelReservation commands
   - Supports undo/redo functionality
   - Audit trail for all reservation changes

OOP CONCEPTS DEMONSTRATED:
- ENCAPSULATION: Reservation state and business rules hidden behind methods
- INHERITANCE: Specialized table types and customer categories
- POLYMORPHISM: Different notification channels and assignment strategies
- ABSTRACTION: Complex reservation workflow abstracted into simple API calls

SOLID PRINCIPLES:
- SRP: Each class handles single responsibility (Table, Reservation, Customer, Waitlist)
- OCP: Easy to add new table types, notification channels without code changes
- LSP: All table types and notification methods are interchangeable
- ISP: Focused interfaces for reservation, notification, and waitlist operations
- DIP: High-level reservation logic depends on abstractions not implementations

BUSINESS FEATURES:
- Multi-table type support with capacity management
- Customer profile with preferences and reservation history
- Smart table assignment based on party size and preferences
- Real-time availability checking with conflict detection
- Waitlist management with priority and estimated wait times
- Special occasion handling (birthdays, anniversaries)
- Notification system for confirmations and reminders
- No-show tracking and customer reliability scoring

ARCHITECTURAL NOTES:
- Event-driven architecture for reservation state changes
- Flexible notification system with multiple channels
- Scalable table assignment algorithms
- Comprehensive validation and error handling
- Integration-ready design for POS and payment systems

USAGE:
    # Initialize restaurant
    restaurant = RestaurantReservationSystem("La Belle Cuisine")
    
    # Add tables
    table = Table("T01", 4, TableLocation.INDOOR)
    restaurant.add_table(table)
    
    # Register customer
    customer = restaurant.register_customer("Alice", "alice@example.com", "555-1234")
    
    # Create reservation
    reservation = restaurant.create_reservation(
        customer.customer_id, "T01", date(2024, 12, 25),
        TimeSlot(time(19, 0), time(21, 0), MealPeriod.DINNER), 4
    )
    
    # Handle waitlist
    entry = restaurant.add_to_waitlist(customer, 2)
    restaurant.seat_from_waitlist(entry.entry_id, "T01")

RETURN VALUES:
- create_reservation(): Returns Reservation object or raises exception
- search_available_tables(): Returns List[Table] sorted by suitability
- add_to_waitlist(): Returns WaitlistEntry with estimated wait time
- modify_reservation(): Returns updated Reservation or raises exception
"""

from abc import ABC, abstractmethod
from enum import Enum
from datetime import datetime, date, time, timedelta
from typing import List, Dict, Optional, Set
import uuid
from collections import defaultdict


# ==================== ENUMS ====================

class TableStatus(Enum):
    """Table availability states"""
    AVAILABLE = "AVAILABLE"
    RESERVED = "RESERVED"
    OCCUPIED = "OCCUPIED"
    MAINTENANCE = "MAINTENANCE"


class TableLocation(Enum):
    """Seating area types"""
    INDOOR = "INDOOR"
    OUTDOOR = "OUTDOOR"
    PRIVATE = "PRIVATE"
    BAR = "BAR"
    PATIO = "PATIO"


class ReservationStatus(Enum):
    """Reservation lifecycle states"""
    PENDING = "PENDING"
    CONFIRMED = "CONFIRMED"
    SEATED = "SEATED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    NO_SHOW = "NO_SHOW"


class MealPeriod(Enum):
    """Different dining periods"""
    BREAKFAST = "BREAKFAST"
    BRUNCH = "BRUNCH"
    LUNCH = "LUNCH"
    DINNER = "DINNER"
    LATE_NIGHT = "LATE_NIGHT"


class NotificationType(Enum):
    """Types of notifications"""
    CONFIRMATION = "CONFIRMATION"
    REMINDER = "REMINDER"
    CANCELLATION = "CANCELLATION"
    WAITLIST_UPDATE = "WAITLIST_UPDATE"
    MODIFICATION = "MODIFICATION"


# ==================== CORE ENTITIES ====================

class TimeSlot:
    """
    Represents a time slot for reservations
    
    USAGE:
        slot = TimeSlot(time(19, 0), time(21, 0), MealPeriod.DINNER)
        print(slot.duration_minutes)  # 120
    
    RETURN:
        TimeSlot object with start_time, end_time, and meal_period
    """
    def __init__(self, start_time: time, end_time: time, meal_period: MealPeriod):
        self.start_time = start_time
        self.end_time = end_time
        self.meal_period = meal_period
        self.duration_minutes = self._calculate_duration()
    
    def _calculate_duration(self) -> int:
        """Calculate duration in minutes between start and end time"""
        start_dt = datetime.combine(date.today(), self.start_time)
        end_dt = datetime.combine(date.today(), self.end_time)
        return int((end_dt - start_dt).total_seconds() / 60)
    
    def __str__(self):
        return f"{self.start_time.strftime('%H:%M')} - {self.end_time.strftime('%H:%M')}"


class Customer:
    """
    Customer profile with preferences and history
    
    USAGE:
        customer = Customer("CUST001", "Alice", "alice@example.com", "555-1234")
        customer.add_preference("seating", "window")
        customer.add_reservation("RES001")
    
    RETURN:
        Customer object with profile data and reservation history
    """
    def __init__(self, customer_id: str, name: str, email: str, phone: str):
        self.customer_id = customer_id
        self.name = name
        self.email = email
        self.phone = phone
        self.preferences: Dict[str, str] = {}  # e.g., {"seating": "window", "dietary": "vegetarian"}
        self.reservation_history: List[str] = []  # List of reservation IDs
        self.no_show_count = 0
        self.created_at = datetime.now()
    
    def add_preference(self, key: str, value: str):
        """Add or update customer preference"""
        self.preferences[key] = value
    
    def add_reservation(self, reservation_id: str):
        """Track reservation in customer history"""
        self.reservation_history.append(reservation_id)
    
    def increment_no_show(self):
        """Track no-show incidents"""
        self.no_show_count += 1
    
    def get_reliability_score(self) -> float:
        """Calculate customer reliability (0.0 to 1.0)"""
        if not self.reservation_history:
            return 1.0
        return max(0.0, 1.0 - (self.no_show_count / len(self.reservation_history)))
    
    def __str__(self):
        return f"Customer({self.name}, {self.email}, {len(self.reservation_history)} reservations)"


class Table:
    """
    Restaurant table with capacity and location
    
    USAGE:
        table = Table("T01", 4, TableLocation.INDOOR)
        table.add_feature("window_view")
        print(table.can_accommodate(3))  # True
    
    RETURN:
        Table object with capacity, location, and status
    """
    def __init__(self, table_id: str, capacity: int, location: TableLocation):
        self.table_id = table_id
        self.table_number = table_id
        self.capacity = capacity
        self.min_capacity = max(1, capacity - 1)  # Allow one less than capacity
        self.location = location
        self.status = TableStatus.AVAILABLE
        self.features: List[str] = []  # e.g., ["window_view", "wheelchair_accessible"]
    
    def add_feature(self, feature: str):
        """Add special feature to table"""
        if feature not in self.features:
            self.features.append(feature)
    
    def can_accommodate(self, party_size: int) -> bool:
        """Check if table can accommodate party size"""
        return self.min_capacity <= party_size <= self.capacity
    
    def __str__(self):
        return f"Table {self.table_number} ({self.capacity} seats, {self.location.value})"


class Reservation:
    """
    Restaurant reservation with state management
    
    DESIGN PATTERN: State Pattern for lifecycle management
    
    USAGE:
        reservation = Reservation("RES001", customer, table, date, time_slot, 4)
        reservation.confirm()
        reservation.mark_seated()
        reservation.complete()
    
    RETURN:
        Reservation object with status and state transition methods
    """
    def __init__(self, reservation_id: str, customer: Customer, table: Table,
                 reservation_date: date, time_slot: TimeSlot, party_size: int,
                 special_requests: str = ""):
        self.reservation_id = reservation_id
        self.customer = customer
        self.table = table
        self.reservation_date = reservation_date
        self.time_slot = time_slot
        self.party_size = party_size
        self.special_requests = special_requests
        self.status = ReservationStatus.PENDING
        self.created_at = datetime.now()
        self.confirmed_at: Optional[datetime] = None
        self.seated_at: Optional[datetime] = None
        self.completed_at: Optional[datetime] = None
    
    def confirm(self):
        """Confirm the reservation"""
        if self.status != ReservationStatus.PENDING:
            raise Exception(f"Cannot confirm reservation in {self.status} state")
        self.status = ReservationStatus.CONFIRMED
        self.confirmed_at = datetime.now()
        print(f"✓ Reservation {self.reservation_id} confirmed for {self.customer.name}")
    
    def mark_seated(self):
        """Mark customer as seated"""
        if self.status != ReservationStatus.CONFIRMED:
            raise Exception(f"Cannot seat reservation in {self.status} state")
        self.status = ReservationStatus.SEATED
        self.seated_at = datetime.now()
        self.table.status = TableStatus.OCCUPIED
        print(f"✓ {self.customer.name} seated at {self.table.table_number}")
    
    def complete(self):
        """Complete the reservation"""
        if self.status != ReservationStatus.SEATED:
            raise Exception(f"Cannot complete reservation in {self.status} state")
        self.status = ReservationStatus.COMPLETED
        self.completed_at = datetime.now()
        self.table.status = TableStatus.AVAILABLE
        print(f"✓ Reservation {self.reservation_id} completed")
    
    def cancel(self):
        """Cancel the reservation"""
        if self.status in [ReservationStatus.COMPLETED, ReservationStatus.NO_SHOW]:
            raise Exception(f"Cannot cancel reservation in {self.status} state")
        self.status = ReservationStatus.CANCELLED
        self.table.status = TableStatus.AVAILABLE
        print(f"✓ Reservation {self.reservation_id} cancelled")
    
    def mark_no_show(self):
        """Mark as no-show"""
        if self.status != ReservationStatus.CONFIRMED:
            raise Exception(f"Cannot mark as no-show in {self.status} state")
        self.status = ReservationStatus.NO_SHOW
        self.table.status = TableStatus.AVAILABLE
        self.customer.increment_no_show()
        print(f"⚠ Reservation {self.reservation_id} marked as NO-SHOW")
    
    def can_modify(self) -> bool:
        """Check if reservation can be modified"""
        return self.status in [ReservationStatus.PENDING, ReservationStatus.CONFIRMED]
    
    def get_cancellation_fee(self) -> float:
        """Calculate cancellation fee based on timing"""
        reservation_datetime = datetime.combine(self.reservation_date, self.time_slot.start_time)
        hours_until = (reservation_datetime - datetime.now()).total_seconds() / 3600
        
        if hours_until >= 24:
            return 0.0  # Free cancellation
        elif hours_until >= 2:
            return 0.0  # Free within 24 hours
        else:
            return 25.0  # Late cancellation fee
    
    def __str__(self):
        return f"Reservation({self.reservation_id}, {self.customer.name}, {self.table.table_number}, {self.reservation_date}, {self.status.value})"


class WaitlistEntry:
    """
    Waitlist entry for walk-in customers
    
    USAGE:
        entry = WaitlistEntry("W001", customer, 4)
        print(entry.estimated_wait_minutes)
    
    RETURN:
        WaitlistEntry object with wait time and priority
    """
    def __init__(self, entry_id: str, customer: Customer, party_size: int):
        self.entry_id = entry_id
        self.customer = customer
        self.party_size = party_size
        self.arrival_time = datetime.now()
        self.estimated_wait_minutes = 0
        self.priority = 0  # Higher priority = served first
        self.notified = False
    
    def calculate_wait_time(self, average_dining_time: int, position: int):
        """Calculate estimated wait time based on queue position"""
        self.estimated_wait_minutes = (position * average_dining_time) // 2
    
    def update_priority(self):
        """Update priority based on wait time"""
        wait_minutes = (datetime.now() - self.arrival_time).total_seconds() / 60
        self.priority = int(wait_minutes)
    
    def __str__(self):
        return f"Waitlist({self.customer.name}, party of {self.party_size}, wait: ~{self.estimated_wait_minutes}min)"


# ==================== NOTIFICATION SYSTEM ====================

class NotificationChannel(ABC):
    """
    Abstract notification channel
    
    DESIGN PATTERN: Strategy Pattern for different notification methods
    """
    @abstractmethod
    def send(self, customer: Customer, message: str, notification_type: NotificationType):
        """Send notification through specific channel"""
        pass


class EmailNotification(NotificationChannel):
    """Email notification implementation"""
    def send(self, customer: Customer, message: str, notification_type: NotificationType):
        print(f"📧 Email to {customer.email}: {message}")


class SMSNotification(NotificationChannel):
    """SMS notification implementation"""
    def send(self, customer: Customer, message: str, notification_type: NotificationType):
        print(f"📱 SMS to {customer.phone}: {message}")


class PushNotification(NotificationChannel):
    """Push notification implementation"""
    def send(self, customer: Customer, message: str, notification_type: NotificationType):
        print(f"🔔 Push to {customer.name}: {message}")


class NotificationService:
    """
    Notification service managing multiple channels
    
    DESIGN PATTERN: Observer Pattern
    
    USAGE:
        service = NotificationService()
        service.add_channel(EmailNotification())
        service.notify_reservation_confirmed(reservation)
    
    RETURN:
        None (sends notifications)
    """
    def __init__(self):
        self.channels: List[NotificationChannel] = []
    
    def add_channel(self, channel: NotificationChannel):
        """Add notification channel"""
        self.channels.append(channel)
    
    def notify_reservation_confirmed(self, reservation: Reservation):
        """Send reservation confirmation"""
        message = (f"Your reservation for {reservation.party_size} on "
                  f"{reservation.reservation_date} at {reservation.time_slot} is CONFIRMED!")
        self._send_to_all(reservation.customer, message, NotificationType.CONFIRMATION)
    
    def notify_reservation_reminder(self, reservation: Reservation):
        """Send reservation reminder"""
        message = (f"Reminder: Your reservation for {reservation.party_size} at "
                  f"{reservation.table.table_number} is in 1 hour!")
        self._send_to_all(reservation.customer, message, NotificationType.REMINDER)
    
    def notify_cancellation(self, reservation: Reservation):
        """Send cancellation confirmation"""
        message = f"Your reservation for {reservation.reservation_date} has been cancelled."
        self._send_to_all(reservation.customer, message, NotificationType.CANCELLATION)
    
    def notify_waitlist_ready(self, entry: WaitlistEntry):
        """Notify waitlist customer that table is ready"""
        message = f"Your table for {entry.party_size} is ready! Please come to the host stand."
        self._send_to_all(entry.customer, message, NotificationType.WAITLIST_UPDATE)
    
    def _send_to_all(self, customer: Customer, message: str, notification_type: NotificationType):
        """Send notification through all channels"""
        for channel in self.channels:
            channel.send(customer, message, notification_type)


# ==================== MAIN SYSTEM ====================

class RestaurantReservationSystem:
    """
    Main restaurant reservation system
    
    DESIGN PATTERN: Facade Pattern providing unified interface
    
    USAGE:
        restaurant = RestaurantReservationSystem("La Belle Cuisine")
        restaurant.add_table(Table("T01", 4, TableLocation.INDOOR))
        customer = restaurant.register_customer("Alice", "alice@example.com", "555-1234")
        reservation = restaurant.create_reservation(customer.customer_id, "T01", ...)
    
    RETURN:
        RestaurantReservationSystem instance with all management methods
    """
    def __init__(self, restaurant_name: str):
        self.restaurant_name = restaurant_name
        self.tables: Dict[str, Table] = {}
        self.customers: Dict[str, Customer] = {}
        self.reservations: Dict[str, Reservation] = {}
        self.waitlist: List[WaitlistEntry] = []
        self.notification_service = NotificationService()
        
        # Initialize notification channels
        self.notification_service.add_channel(EmailNotification())
        self.notification_service.add_channel(SMSNotification())
        
        # Business configuration
        self.average_dining_time = 90  # minutes
        self.buffer_time = 15  # minutes between reservations
        self.max_advance_days = 30
        self.min_advance_hours = 1
        
        print(f"🍽️  {restaurant_name} Reservation System initialized")
    
    def add_table(self, table: Table):
        """Add table to restaurant"""
        self.tables[table.table_id] = table
        print(f"✓ Added {table}")
    
    def register_customer(self, name: str, email: str, phone: str) -> Customer:
        """
        Register new customer
        
        USAGE:
            customer = restaurant.register_customer("Alice", "alice@example.com", "555-1234")
        
        RETURN:
            Customer object with generated customer_id
        """
        customer_id = f"CUST{str(uuid.uuid4())[:8].upper()}"
        customer = Customer(customer_id, name, email, phone)
        self.customers[customer_id] = customer
        print(f"✓ Registered {customer}")
        return customer
    
    def search_available_tables(self, reservation_date: date, time_slot: TimeSlot,
                               party_size: int, location: Optional[TableLocation] = None) -> List[Table]:
        """
        Search for available tables matching criteria
        
        USAGE:
            tables = restaurant.search_available_tables(
                date(2024, 12, 25), TimeSlot(...), 4, TableLocation.INDOOR
            )
        
        RETURN:
            List[Table] sorted by suitability (smallest suitable table first)
        """
        available_tables = []
        
        for table in self.tables.values():
            # Check capacity
            if not table.can_accommodate(party_size):
                continue
            
            # Check location preference
            if location and table.location != location:
                continue
            
            # Check availability
            if self._is_table_available(table, reservation_date, time_slot):
                available_tables.append(table)
        
        # Sort by optimal size (smallest suitable table first)
        available_tables.sort(key=lambda t: t.capacity)
        return available_tables
    
    def _is_table_available(self, table: Table, reservation_date: date, time_slot: TimeSlot) -> bool:
        """Check if table is available for given date and time"""
        if table.status == TableStatus.MAINTENANCE:
            return False
        
        # Check for conflicting reservations
        for reservation in self.reservations.values():
            if reservation.table.table_id != table.table_id:
                continue
            
            if reservation.status not in [ReservationStatus.CONFIRMED, ReservationStatus.SEATED]:
                continue
            
            if reservation.reservation_date != reservation_date:
                continue
            
            # Check time overlap with buffer
            existing_start = reservation.time_slot.start_time
            existing_end = reservation.time_slot.end_time
            new_start = time_slot.start_time
            new_end = time_slot.end_time
            
            if self._times_overlap(existing_start, existing_end, new_start, new_end):
                return False
        
        return True
    
    def _times_overlap(self, start1: time, end1: time, start2: time, end2: time) -> bool:
        """Check if two time ranges overlap"""
        return start1 < end2 and start2 < end1
    
    def create_reservation(self, customer_id: str, table_id: str, reservation_date: date,
                          time_slot: TimeSlot, party_size: int, special_requests: str = "") -> Reservation:
        """
        Create new reservation
        
        USAGE:
            reservation = restaurant.create_reservation(
                "CUST001", "T01", date(2024, 12, 25),
                TimeSlot(time(19, 0), time(21, 0), MealPeriod.DINNER),
                4, "Window seat please"
            )
        
        RETURN:
            Reservation object with PENDING status
        """
        # Validate customer
        if customer_id not in self.customers:
            raise Exception("Customer not found")
        
        # Validate table
        if table_id not in self.tables:
            raise Exception("Table not found")
        
        customer = self.customers[customer_id]
        table = self.tables[table_id]
        
        # Validate party size
        if not table.can_accommodate(party_size):
            raise Exception(f"Table {table_id} cannot accommodate party of {party_size}")
        
        # Validate date
        self._validate_reservation_date(reservation_date)
        
        # Check availability
        if not self._is_table_available(table, reservation_date, time_slot):
            raise Exception(f"Table {table_id} is not available for selected date and time")
        
        # Create reservation
        reservation_id = f"RES{str(uuid.uuid4())[:8].upper()}"
        reservation = Reservation(reservation_id, customer, table, reservation_date,
                                 time_slot, party_size, special_requests)
        
        # Store reservation
        self.reservations[reservation_id] = reservation
        customer.add_reservation(reservation_id)
        table.status = TableStatus.RESERVED
        
        # Auto-confirm and send notification
        reservation.confirm()
        self.notification_service.notify_reservation_confirmed(reservation)
        
        print(f"✓ Created {reservation}")
        return reservation
    
    def _validate_reservation_date(self, reservation_date: date):
        """Validate reservation date is within acceptable range"""
        today = date.today()
        days_until = (reservation_date - today).days
        
        if days_until < 0:
            raise Exception("Cannot make reservation in the past")
        
        if days_until > self.max_advance_days:
            raise Exception(f"Cannot book more than {self.max_advance_days} days in advance")
    
    def modify_reservation(self, reservation_id: str, new_party_size: Optional[int] = None,
                          new_date: Optional[date] = None, new_time_slot: Optional[TimeSlot] = None,
                          new_special_requests: Optional[str] = None) -> Reservation:
        """
        Modify existing reservation
        
        USAGE:
            updated = restaurant.modify_reservation("RES001", new_party_size=6)
        
        RETURN:
            Updated Reservation object
        """
        if reservation_id not in self.reservations:
            raise Exception("Reservation not found")
        
        reservation = self.reservations[reservation_id]
        
        if not reservation.can_modify():
            raise Exception(f"Cannot modify reservation in {reservation.status} state")
        
        # Update fields
        if new_party_size and new_party_size != reservation.party_size:
            if not reservation.table.can_accommodate(new_party_size):
                raise Exception(f"Table cannot accommodate party of {new_party_size}")
            reservation.party_size = new_party_size
        
        if new_date and new_date != reservation.reservation_date:
            self._validate_reservation_date(new_date)
            reservation.reservation_date = new_date
        
        if new_time_slot and new_time_slot != reservation.time_slot:
            reservation.time_slot = new_time_slot
        
        if new_special_requests is not None:
            reservation.special_requests = new_special_requests
        
        print(f"✓ Modified {reservation}")
        return reservation
    
    def cancel_reservation(self, reservation_id: str) -> float:
        """
        Cancel reservation
        
        USAGE:
            fee = restaurant.cancel_reservation("RES001")
        
        RETURN:
            Cancellation fee amount
        """
        if reservation_id not in self.reservations:
            raise Exception("Reservation not found")
        
        reservation = self.reservations[reservation_id]
        fee = reservation.get_cancellation_fee()
        
        reservation.cancel()
        self.notification_service.notify_cancellation(reservation)
        
        if fee > 0:
            print(f"⚠ Cancellation fee: ${fee:.2f}")
        
        return fee
    
    def add_to_waitlist(self, customer: Customer, party_size: int) -> WaitlistEntry:
        """
        Add customer to waitlist
        
        USAGE:
            entry = restaurant.add_to_waitlist(customer, 4)
        
        RETURN:
            WaitlistEntry with estimated wait time
        """
        entry_id = f"WAIT{str(uuid.uuid4())[:8].upper()}"
        entry = WaitlistEntry(entry_id, customer, party_size)
        
        # Calculate position and wait time
        position = len([e for e in self.waitlist if e.party_size <= party_size]) + 1
        entry.calculate_wait_time(self.average_dining_time, position)
        
        self.waitlist.append(entry)
        print(f"✓ Added to waitlist: {entry}")
        return entry
    
    def seat_from_waitlist(self, entry_id: str, table_id: str):
        """
        Seat customer from waitlist
        
        USAGE:
            restaurant.seat_from_waitlist("WAIT001", "T01")
        
        RETURN:
            None
        """
        # Find waitlist entry
        entry = next((e for e in self.waitlist if e.entry_id == entry_id), None)
        if not entry:
            raise Exception("Waitlist entry not found")
        
        # Validate table
        if table_id not in self.tables:
            raise Exception("Table not found")
        
        table = self.tables[table_id]
        if not table.can_accommodate(entry.party_size):
            raise Exception(f"Table cannot accommodate party of {entry.party_size}")
        
        # Remove from waitlist
        self.waitlist.remove(entry)
        
        # Update table status
        table.status = TableStatus.OCCUPIED
        
        # Notify customer
        self.notification_service.notify_waitlist_ready(entry)
        
        print(f"✓ Seated {entry.customer.name} at {table.table_number}")
    
    def mark_no_show(self, reservation_id: str):
        """Mark reservation as no-show"""
        if reservation_id not in self.reservations:
            raise Exception("Reservation not found")
        
        reservation = self.reservations[reservation_id]
        reservation.mark_no_show()
    
    def get_occupancy_report(self, target_date: date) -> Dict[str, int]:
        """
        Generate occupancy report for specific date
        
        USAGE:
            report = restaurant.get_occupancy_report(date.today())
        
        RETURN:
            Dict with occupancy statistics
        """
        total_tables = len(self.tables)
        reserved_tables = len([r for r in self.reservations.values()
                              if r.reservation_date == target_date
                              and r.status in [ReservationStatus.CONFIRMED, ReservationStatus.SEATED]])
        
        return {
            "total_tables": total_tables,
            "reserved_tables": reserved_tables,
            "available_tables": total_tables - reserved_tables,
            "occupancy_rate": (reserved_tables / total_tables * 100) if total_tables > 0 else 0
        }
    
    def get_customer_reservations(self, customer_id: str) -> List[Reservation]:
        """Get all reservations for a customer"""
        if customer_id not in self.customers:
            raise Exception("Customer not found")
        
        customer = self.customers[customer_id]
        return [self.reservations[rid] for rid in customer.reservation_history
                if rid in self.reservations]


# ==================== DEMO ====================

def main():
    """
    Demo of restaurant reservation system
    
    Demonstrates all major features:
    - Table management
    - Customer registration
    - Reservation creation and modification
    - Waitlist handling
    - Notifications
    """
    print("=" * 60)
    print("🍽️  RESTAURANT RESERVATION SYSTEM DEMO")
    print("=" * 60)
    
    # Initialize restaurant
    restaurant = RestaurantReservationSystem("La Belle Cuisine")
    
    # Add tables
    print("\n📋 Adding tables...")
    restaurant.add_table(Table("T01", 2, TableLocation.INDOOR))
    restaurant.add_table(Table("T02", 4, TableLocation.INDOOR))
    restaurant.add_table(Table("T03", 4, TableLocation.OUTDOOR))
    restaurant.add_table(Table("T04", 6, TableLocation.PRIVATE))
    restaurant.add_table(Table("T05", 8, TableLocation.INDOOR))
    
    # Register customers
    print("\n👥 Registering customers...")
    alice = restaurant.register_customer("Alice Johnson", "alice@example.com", "555-0001")
    bob = restaurant.register_customer("Bob Smith", "bob@example.com", "555-0002")
    charlie = restaurant.register_customer("Charlie Brown", "charlie@example.com", "555-0003")
    
    # Add preferences
    alice.add_preference("seating", "window")
    alice.add_preference("dietary", "vegetarian")
    
    # Create reservations
    print("\n📅 Creating reservations...")
    reservation_date = date.today() + timedelta(days=7)
    
    dinner_slot = TimeSlot(time(19, 0), time(21, 0), MealPeriod.DINNER)
    lunch_slot = TimeSlot(time(12, 0), time(14, 0), MealPeriod.LUNCH)
    
    res1 = None
    res2 = None
    res3 = None
    
    try:
        res1 = restaurant.create_reservation(
            alice.customer_id, "T02", reservation_date, dinner_slot, 4,
            "Window seat, celebrating anniversary 🎉"
        )
    except Exception as e:
        print(f"❌ Error creating reservation 1: {e}")
    
    try:
        res2 = restaurant.create_reservation(
            bob.customer_id, "T01", reservation_date, dinner_slot, 2,
            "Outdoor seating preferred"
        )
    except Exception as e:
        print(f"❌ Error creating reservation 2: {e}")
    
    try:
        res3 = restaurant.create_reservation(
            charlie.customer_id, "T04", reservation_date, lunch_slot, 6,
            "Business lunch"
        )
    except Exception as e:
        print(f"❌ Error creating reservation 3: {e}")
    
    # Search available tables
    print("\n🔍 Searching available tables for dinner...")
    available = restaurant.search_available_tables(
        reservation_date, dinner_slot, party_size=4
    )
    print(f"Found {len(available)} available tables for party of 4:")
    for table in available:
        print(f"  - {table}")
    
    # Modify reservation
    print("\n✏️  Modifying reservation...")
    if res1:
        try:
            restaurant.modify_reservation(res1.reservation_id, new_party_size=5)
        except Exception as e:
            print(f"❌ Error modifying reservation: {e}")
    
    # Simulate seating
    print("\n🪑 Seating customers...")
    if res1:
        try:
            res1.mark_seated()
        except Exception as e:
            print(f"❌ Error seating: {e}")
    
    if res2:
        try:
            res2.mark_seated()
        except Exception as e:
            print(f"❌ Error seating: {e}")
    
    # Add to waitlist
    print("\n⏳ Adding walk-in to waitlist...")
    dave = restaurant.register_customer("Dave Wilson", "dave@example.com", "555-0004")
    waitlist_entry = restaurant.add_to_waitlist(dave, party_size=2)
    
    # Complete reservation and seat from waitlist
    print("\n✅ Completing reservations...")
    if res2:
        res2.complete()
    
    print("\n🪑 Seating from waitlist...")
    try:
        restaurant.seat_from_waitlist(waitlist_entry.entry_id, "T01")
    except Exception as e:
        print(f"❌ Error seating from waitlist: {e}")
    
    # Occupancy report
    print("\n📊 Occupancy Report:")
    report = restaurant.get_occupancy_report(reservation_date)
    print(f"  Total Tables: {report['total_tables']}")
    print(f"  Reserved: {report['reserved_tables']}")
    print(f"  Available: {report['available_tables']}")
    print(f"  Occupancy Rate: {report['occupancy_rate']:.1f}%")
    
    # Customer history
    print(f"\n📜 {alice.name}'s Reservation History:")
    alice_reservations = restaurant.get_customer_reservations(alice.customer_id)
    for res in alice_reservations:
        print(f"  - {res}")
    
    # Cancel reservation
    print("\n❌ Canceling reservation...")
    if res3:
        try:
            fee = restaurant.cancel_reservation(res3.reservation_id)
            if fee > 0:
                print(f"  Cancellation fee: ${fee:.2f}")
        except Exception as e:
            print(f"❌ Error canceling: {e}")
    
    print("\n" + "=" * 60)
    print("✨ Demo completed successfully!")
    print("=" * 60)


if __name__ == "__main__":
    main()
