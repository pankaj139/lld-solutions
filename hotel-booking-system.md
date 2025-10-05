# Hotel Booking System

## 🔗 Implementation Links

- **Python Implementation**: [python/hotel-booking/main.py](python/hotel-booking/main.py)
- **JavaScript Implementation**: [javascript/hotel-booking/main.js](javascript/hotel-booking/main.js)

## Problem Statement

Design a hotel booking system that can:

1. **Manage hotel rooms** with different types and pricing
2. **Handle guest registration** and profile management
3. **Search and book available rooms** for specific date ranges
4. **Process payments** and handle cancellations with refund policies
5. **Manage check-in/check-out** processes
6. **Track room availability** and occupancy reports
7. **Handle booking conflicts** and validation

## Requirements

### Functional Requirements

- Register guests with personal information
- Add and manage hotel rooms with different types and amenities
- Search for available rooms based on date range, type, and price
- Create, confirm, and cancel bookings
- Process payments with different payment methods
- Handle check-in and check-out operations
- Generate occupancy and financial reports
- Implement cancellation policies with appropriate refunds
- Prevent double-booking and handle date conflicts

### Non-Functional Requirements

- System should handle concurrent bookings
- Fast room search and availability checking
- Secure payment processing
- Data consistency for room availability
- Scalable to handle multiple hotels and thousands of rooms

## Design Decisions

### Key Classes

1. **Guest Management**
   - `Guest`: Guest profile with contact information and booking history
   - Guest registration and profile management

2. **Room Management**
   - `Room`: Individual room with type, pricing, and amenities
   - `RoomType`: Enum for different room categories
   - `RoomStatus`: Track room availability and maintenance

3. **Booking System**
   - `Booking`: Reservation with dates, guest, and room details
   - `BookingStatus`: Track booking lifecycle
   - `RoomSearchCriteria`: Flexible search parameters

4. **Payment Processing**
   - `Payment`: Handle payment transactions and refunds
   - `PaymentStatus`: Track payment states
   - Integration with payment gateways (simulated)

### Design Patterns Used

1. **Strategy Pattern**: Different cancellation policies and pricing strategies
2. **State Pattern**: Booking status transitions (Pending → Confirmed → Checked In → Checked Out)
3. **Observer Pattern**: Could be extended for notifications
4. **Factory Method**: Room creation with different types
5. **Command Pattern**: Booking operations (create, confirm, cancel)

### Key Features

- **Date Conflict Resolution**: Prevents overlapping bookings for same room
- **Dynamic Pricing**: Support for different room rates
- **Cancellation Policies**: Flexible refund calculation based on timing
- **Occupancy Tracking**: Real-time hotel occupancy reports
- **Guest History**: Track all bookings for each guest

## Class Diagram

```text
Guest
├── guest_id: str
├── name: str
├── email: str
├── phone: str
└── bookings: List[str]

Room
├── room_number: str
├── room_type: RoomType
├── price_per_night: float
├── status: RoomStatus
├── amenities: List[str]
└── floor: int

Booking
├── booking_id: str
├── guest: Guest
├── room: Room
├── check_in_date: datetime
├── check_out_date: datetime
├── status: BookingStatus
├── total_amount: float
└── payment_status: PaymentStatus

Payment
├── payment_id: str
├── booking: Booking
├── amount: float
├── payment_method: str
├── payment_date: datetime
└── status: PaymentStatus

HotelBookingSystem
├── rooms: Dict[str, Room]
├── guests: Dict[str, Guest]
├── bookings: Dict[str, Booking]
├── payments: Dict[str, Payment]
├── search_available_rooms()
├── create_booking()
├── confirm_booking()
└── cancel_booking()
```

## Usage Example

```python
# Create hotel and add rooms
hotel = HotelBookingSystem("Grand Palace Hotel")
room = Room("101", RoomType.DOUBLE, 150.0)
hotel.add_room(room)

# Register guest and search rooms
guest = hotel.register_guest("John Doe", "john@example.com", "123-456-7890")
criteria = RoomSearchCriteria(check_in_date, check_out_date, RoomType.DOUBLE)
available_rooms = hotel.search_available_rooms(criteria)

# Create and confirm booking
booking = hotel.create_booking(guest.guest_id, room.room_number, check_in_date, check_out_date)
hotel.confirm_booking(booking.booking_id, "Credit Card")

# Check-in and check-out
hotel.check_in_guest(booking.booking_id)
hotel.check_out_guest(booking.booking_id)
```

## Business Rules

1. **Booking Validation**
   - Check-out date must be after check-in date
   - Check-in date cannot be in the past
   - Room must be available for the entire stay duration

2. **Payment Processing**
   - Payment required for booking confirmation
   - Failed payments result in booking cancellation
   - Refunds processed based on cancellation timing

3. **Cancellation Policies**
   - Full refund: Cancellation 7+ days before check-in
   - 50% refund: Cancellation 1-7 days before check-in
   - No refund: Cancellation on check-in day or after

4. **Room Management**
   - Rooms can have multiple amenities
   - Different pricing for different room types
   - Rooms can be marked for maintenance

## Extension Points

1. **Multi-Hotel Support**: Extend to manage multiple hotel properties
2. **Dynamic Pricing**: Implement seasonal pricing and demand-based rates
3. **Loyalty Programs**: Add points and tier-based benefits
4. **Room Upgrades**: Automatic and manual room upgrade system
5. **Group Bookings**: Handle corporate and group reservations
6. **Integration APIs**: Connect with travel booking platforms
7. **Mobile Check-in**: QR code-based room access
8. **Housekeeping Integration**: Room cleaning status and scheduling

## Advanced Features

### Inventory Management

- Track room maintenance schedules
- Handle overbooking scenarios
- Waitlist management for popular dates

### Revenue Optimization

- Yield management algorithms
- Revenue per available room (RevPAR) tracking
- Booking trend analysis

### Guest Experience

- Preference tracking (room type, floor, amenities)
- Special request handling
- Guest feedback and rating system

## Time Complexity

- **Room Search**: O(n) where n is number of rooms
- **Availability Check**: O(m) where m is number of existing bookings
- **Booking Creation**: O(1) for validation, O(m) for conflict checking
- **Payment Processing**: O(1) for individual transactions

## Space Complexity

- O(r) for rooms where r is total number of rooms
- O(g) for guests where g is total number of guests
- O(b) for bookings where b is total number of bookings
- O(p) for payments where p is total number of payments

## Security Considerations

1. **Data Privacy**: Encrypt guest personal information
2. **Payment Security**: PCI DSS compliance for payment processing
3. **Access Control**: Role-based access for hotel staff
4. **Audit Trail**: Log all booking modifications and payments
