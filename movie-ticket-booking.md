# Movie Ticket Booking System

## Problem Statement

Design a movie ticket booking platform that can:

1. **Manage theaters, screens, and showtimes** with multiple movies
2. **Handle seat selection and reservation** with timeout mechanisms
3. **Implement booking workflow** from selection to confirmation
4. **Process payments** with booking confirmations
5. **Support different seat types** with dynamic pricing
6. **Prevent double booking** with concurrent user access
7. **Manage cancellations** with time-based policies

## Requirements

### Functional Requirements
- Theater and screen management
- Movie catalog with showtimes
- Seat selection and reservation
- Booking creation and confirmation
- Payment processing
- Booking cancellation with policies
- Customer booking history

### Non-Functional Requirements
- Handle concurrent seat selections
- Prevent double booking scenarios
- Fast seat availability checks
- Secure payment processing
- Real-time seat status updates

## Design Patterns Used

1. **State Pattern**: Seat status management (Available → Reserved → Booked)
2. **Strategy Pattern**: Different pricing for seat types
3. **Command Pattern**: Booking operations (create, confirm, cancel)
4. **Template Method**: Booking workflow with customizable steps
5. **Observer Pattern**: Real-time seat status updates

## Key Features

- **Seat Reservation System**: Temporary holds with automatic timeout
- **Multi-tier Pricing**: Different rates for Regular, Premium, VIP seats
- **Concurrent Booking Protection**: Prevents race conditions
- **Flexible Cancellation**: Time-based cancellation policies
- **Theater Management**: Multiple screens per theater support

## Booking Workflow

1. **Search Movies**: Find showtimes by movie, theater, or date
2. **Select Seats**: Choose from available seats with pricing
3. **Reserve Seats**: Temporary hold with 10-minute timeout
4. **Create Booking**: Generate booking with selected seats
5. **Process Payment**: Payment confirmation and booking finalization
6. **Confirmation**: Booking confirmation with seat details

## Time Complexity

- **Seat Search**: O(n) where n is seats per screen
- **Seat Reservation**: O(k) where k is selected seats
- **Booking Creation**: O(1) for booking operations
- **Payment Processing**: O(1) for individual transactions

## Extension Points

1. **Group Bookings**: Multiple tickets in single transaction
2. **Loyalty Programs**: Points and rewards system
3. **Dynamic Pricing**: Peak time and demand-based pricing
4. **Mobile Integration**: QR code tickets and digital wallets
5. **Social Features**: Group booking coordination