# Restaurant Reservation System

## 🔗 Implementation Links

- **Python Implementation**: [python/restaurant-reservation/main.py](python/restaurant-reservation/main.py)
- **JavaScript Implementation**: [javascript/restaurant-reservation/main.js](javascript/restaurant-reservation/main.js)

## Problem Statement

Design a restaurant reservation system that can:

1. **Manage restaurant tables** with different sizes and locations
2. **Handle customer reservations** with party size and time slots
3. **Track table availability** in real-time
4. **Manage waitlist** for walk-in customers
5. **Handle special requests** and dietary preferences
6. **Send notifications** for reservation confirmations and reminders
7. **Support multiple restaurant branches** and time zones

## Requirements

### Functional Requirements

- Register customers with contact information and preferences
- Add and manage tables with different capacities and locations
- Create, modify, and cancel reservations
- Search available tables for specific date, time, and party size
- Manage waitlist for walk-in customers
- Handle special requests (dietary restrictions, celebrations, seating preferences)
- Send reservation confirmations and reminders
- Track reservation history and customer preferences
- Prevent overbooking and handle time conflicts
- Support different meal periods (breakfast, lunch, dinner)

### Non-Functional Requirements

- System should handle concurrent reservations
- Fast table availability checking (< 1 second)
- Real-time updates for table status
- Scalable to handle multiple restaurant locations
- High availability during peak hours
- Mobile-friendly interface for reservations

## Design Decisions

### Key Classes

1. **Customer Management**
   - `Customer`: Customer profile with contact info and preferences
   - Customer registration and profile management
   - Reservation history tracking

2. **Table Management**
   - `Table`: Individual table with capacity and location
   - `TableStatus`: Track table availability (Available, Reserved, Occupied, Maintenance)
   - `TableLocation`: Enum for different seating areas (Indoor, Outdoor, Private, Bar)

3. **Reservation System**
   - `Reservation`: Booking with date, time, party size, and special requests
   - `ReservationStatus`: Track reservation lifecycle (Pending, Confirmed, Seated, Completed, Cancelled, No-Show)
   - `TimeSlot`: Represent available time slots for reservations

4. **Waitlist Management**
   - `WaitlistEntry`: Track walk-in customers waiting for tables
   - Priority-based queue management
   - Estimated wait time calculation

5. **Notification System**
   - `NotificationService`: Send confirmations, reminders, and updates
   - Multiple channels (Email, SMS, Push)
   - Observer pattern for event-based notifications

### Design Patterns Used

1. **Strategy Pattern**: Different table assignment strategies (first-available, preference-based, optimization)
2. **State Pattern**: Reservation status transitions with validation
3. **Observer Pattern**: Notification system for reservation events
4. **Factory Pattern**: Creating different types of reservations
5. **Singleton Pattern**: Restaurant system instance management
6. **Command Pattern**: Reservation operations (create, modify, cancel)

### Key Features

- **Smart Table Assignment**: Automatically assigns optimal tables based on party size
- **Time Slot Management**: Configurable dining duration and turnover times
- **Waitlist Algorithm**: Priority-based with wait time estimation
- **Overbooking Prevention**: Real-time conflict detection
- **Customer Preferences**: Track and apply seating preferences
- **Special Occasions**: Handle birthdays, anniversaries with special setups
- **Multi-Branch Support**: Manage multiple restaurant locations

## Class Diagram

```text
Customer
├── customer_id: str
├── name: str
├── email: str
├── phone: str
├── preferences: Dict
└── reservation_history: List[str]

Table
├── table_id: str
├── table_number: str
├── capacity: int
├── min_capacity: int
├── location: TableLocation
├── status: TableStatus
└── features: List[str]

Reservation
├── reservation_id: str
├── customer: Customer
├── table: Table
├── date: date
├── time_slot: TimeSlot
├── party_size: int
├── status: ReservationStatus
├── special_requests: str
└── created_at: datetime

TimeSlot
├── start_time: time
├── end_time: time
├── meal_period: MealPeriod
└── duration_minutes: int

WaitlistEntry
├── entry_id: str
├── customer: Customer
├── party_size: int
├── arrival_time: datetime
├── estimated_wait_minutes: int
└── priority: int

RestaurantReservationSystem
├── restaurant_name: str
├── tables: Dict[str, Table]
├── customers: Dict[str, Customer]
├── reservations: Dict[str, Reservation]
├── waitlist: List[WaitlistEntry]
├── time_slots: List[TimeSlot]
├── search_available_tables()
├── create_reservation()
├── modify_reservation()
├── cancel_reservation()
├── add_to_waitlist()
└── seat_from_waitlist()
```

## Usage Example

```python
# Initialize restaurant system
restaurant = RestaurantReservationSystem("La Belle Cuisine")

# Add tables
table1 = Table("T01", 4, TableLocation.INDOOR)
restaurant.add_table(table1)

# Register customer
customer = restaurant.register_customer("Alice Johnson", "alice@example.com", "555-1234")

# Search available tables
date = datetime(2024, 12, 25).date()
time_slot = TimeSlot(time(19, 0), time(21, 0), MealPeriod.DINNER)
available_tables = restaurant.search_available_tables(date, time_slot, party_size=4)

# Create reservation
reservation = restaurant.create_reservation(
    customer.customer_id,
    table1.table_id,
    date,
    time_slot,
    party_size=4,
    special_requests="Window seat, celebrating anniversary"
)

# Modify reservation
restaurant.modify_reservation(reservation.reservation_id, new_party_size=5)

# Cancel reservation
restaurant.cancel_reservation(reservation.reservation_id)

# Handle walk-ins
entry = restaurant.add_to_waitlist(customer, party_size=2)
restaurant.seat_from_waitlist(entry.entry_id, table1.table_id)
```

## Business Rules

1. **Reservation Validation**
   - Party size must not exceed table capacity
   - Reservations must be made at least 1 hour in advance
   - Maximum reservation duration: 2-3 hours depending on meal period
   - Cannot book more than 30 days in advance

2. **Table Assignment**
   - Assign smallest suitable table for party size
   - Respect customer seating preferences when possible
   - Allow table combinations for large parties
   - Keep buffer time between reservations (15-30 minutes)

3. **Cancellation Policies**
   - Free cancellation up to 2 hours before reservation
   - Late cancellations may incur fees (configurable)
   - No-shows tracked in customer history
   - Multiple no-shows may restrict future bookings

4. **Waitlist Management**
   - Priority based on arrival time and party size
   - Customers notified when table becomes available
   - 10-minute response window for waitlist notifications
   - Automatic removal if customer doesn't respond

5. **Special Occasions**
   - Birthday/anniversary flags trigger special setups
   - Advance notice required for large group reservations
   - Special menu accommodations for dietary restrictions

## Extension Points

1. **Advanced Features**
   - Online ordering integration
   - Table layout visualization
   - Capacity planning and analytics
   - Revenue management and yield optimization

2. **Integration**
   - POS system integration
   - Payment gateway for deposits
   - Third-party booking platforms (OpenTable, Yelp)
   - CRM system integration

3. **Mobile Features**
   - Mobile check-in
   - QR code-based table confirmation
   - Real-time waitlist updates
   - Push notifications

4. **Analytics**
   - Reservation trends and patterns
   - No-show rate analysis
   - Table turnover optimization
   - Customer lifetime value tracking

## Advanced Features

### Dynamic Pricing

- Premium time slots (Friday/Saturday evenings)
- Holiday pricing adjustments
- Last-minute availability discounts

### Smart Scheduling

- AI-based optimal table assignment
- Predict reservation duration based on party size
- Automatic waitlist optimization

### Customer Experience

- Loyalty program integration
- Personalized recommendations
- Dietary preference tracking
- Birthday/anniversary reminders

### Operations

- Staff shift integration
- Kitchen capacity management
- Real-time occupancy dashboard
- Automated reminder calls/texts

## Time Complexity

- **Table Search**: O(n) where n is number of tables
- **Availability Check**: O(m) where m is number of reservations for that day
- **Reservation Creation**: O(1) for insertion, O(m) for conflict checking
- **Waitlist Operations**: O(log n) with priority queue
- **Customer Lookup**: O(1) with hash map

## Space Complexity

- O(t) for tables where t is total number of tables
- O(c) for customers where c is total number of customers
- O(r) for reservations where r is total number of reservations
- O(w) for waitlist where w is current waitlist size

## Security Considerations

1. **Data Privacy**: Encrypt customer personal information (GDPR compliance)
2. **Access Control**: Role-based access for staff (host, manager, admin)
3. **Audit Trail**: Log all reservation modifications and cancellations
4. **Rate Limiting**: Prevent reservation system abuse
5. **Payment Security**: PCI compliance for deposit processing

## Real-World Scenarios

### Peak Hour Management

```python
# Handle dinner rush
if restaurant.is_peak_hour(current_time):
    # Reduce time slot duration
    # Enable aggressive waitlist management
    # Send staff alerts for high occupancy
```

### No-Show Handling

```python
# Mark as no-show after grace period
if reservation.is_no_show():
    restaurant.mark_no_show(reservation_id)
    # Release table for waitlist
    # Update customer reliability score
```

### Table Combination

```python
# Combine tables for large party
large_party_reservation = restaurant.create_large_party_reservation(
    customer_id, party_size=12, required_tables=3
)
```

## Performance Optimizations

1. **Caching**: Cache available time slots for frequently searched dates
2. **Indexing**: Index reservations by date and time for fast lookups
3. **Batch Processing**: Group notification sending for efficiency
4. **Database Optimization**: Use composite indexes on (date, time, table_id)

## Testing Scenarios

1. **Concurrent Bookings**: Multiple customers booking same table simultaneously
2. **Boundary Conditions**: Maximum party size, edge of operating hours
3. **Cancellation Edge Cases**: Cancel already cancelled, modify completed
4. **Waitlist Scenarios**: Customer leaves before table available
5. **Special Dates**: Valentine's Day, New Year's Eve high demand

## Interview Discussion Points

1. How to handle overbooking strategically?
2. Algorithm for optimal table assignment
3. Scaling to thousands of restaurants
4. Real-time synchronization across multiple devices
5. Handling time zone differences for multi-location chains
6. Machine learning for no-show prediction
7. Dynamic pricing strategies
8. Integration with restaurant POS systems
