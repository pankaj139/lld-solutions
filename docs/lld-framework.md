# LLD Framework: A Systematic Approach

This document provides a step-by-step framework for solving Low-Level Design problems effectively.

## Phase 1: Requirements Clarification (5-10 minutes)

### 1.1 Functional Requirements
Ask specific questions to understand what the system should do:

**Sample Questions:**
- What are the core features needed?
- What operations should users be able to perform?
- What are the expected user flows?
- Are there any specific business rules?

**Example (Parking Lot System):**
- Can customers reserve parking spots?
- How do we handle different vehicle types?
- What payment methods are supported?
- How do we track occupancy?

### 1.2 Non-Functional Requirements
Understand system qualities and constraints:

**Performance:**
- Expected number of users/requests
- Response time requirements
- Throughput expectations

**Scalability:**
- How many concurrent users?
- How much data storage needed?
- Geographic distribution requirements?

**Other Considerations:**
- Security requirements
- Availability expectations
- Consistency requirements

### 1.3 Constraints and Assumptions
Clarify what's in and out of scope:
- Technology constraints
- Time/resource limitations
- Third-party integrations
- Legacy system considerations

## Phase 2: High-Level Design (10-15 minutes)

### 2.1 Identify Core Entities
List the main objects in your system:
- Users/Actors (Customer, Admin, Manager)
- Core Business Objects (Vehicle, ParkingSpot, Ticket)
- System Components (PaymentProcessor, NotificationService)

### 2.2 Define Relationships
Map how entities interact:
- One-to-One relationships
- One-to-Many relationships
- Many-to-Many relationships
- Composition vs Aggregation

### 2.3 Core Use Cases
Define main user workflows:
1. Primary use cases (most important)
2. Secondary use cases (nice to have)
3. Edge cases and error scenarios

### 2.4 API Design
Define key operations:
```python
# Example for Parking Lot
class ParkingLot:
    def find_parking_spot(self, vehicle_type) -> ParkingSpot
    def park_vehicle(self, vehicle, spot) -> Ticket
    def calculate_fee(self, ticket) -> float
    def process_payment(self, ticket, payment_method) -> bool
    def exit_vehicle(self, ticket) -> bool
```

## Phase 3: Detailed Design (20-25 minutes)

### 3.1 Class Diagram
Design your classes with:
- Attributes (data members)
- Methods (behavior)
- Access modifiers (public, private, protected)
- Relationships between classes

### 3.2 Apply Design Patterns
Choose appropriate patterns:
- **Singleton**: For system-wide unique instances
- **Factory**: For object creation logic
- **Strategy**: For different algorithms/behaviors
- **Observer**: For notifications
- **Command**: For operations that can be undone

### 3.3 Design Considerations

#### SOLID Principles
- **Single Responsibility**: Each class has one reason to change
- **Open/Closed**: Open for extension, closed for modification
- **Liskov Substitution**: Subtypes must be substitutable for base types
- **Interface Segregation**: Many specific interfaces are better than one general
- **Dependency Inversion**: Depend on abstractions, not concretions

#### Other Best Practices
- **Encapsulation**: Hide internal details
- **Composition over Inheritance**: Prefer has-a over is-a relationships
- **Immutability**: Use immutable objects where possible
- **Error Handling**: Plan for failure scenarios

## Phase 4: Implementation (15-20 minutes)

### 4.1 Start with Core Classes
Begin with the most important entities:
```python
# Example structure
class Vehicle:
    def __init__(self, license_plate, vehicle_type):
        self.license_plate = license_plate
        self.vehicle_type = vehicle_type

class ParkingSpot:
    def __init__(self, spot_id, spot_type):
        self.spot_id = spot_id
        self.spot_type = spot_type
        self.is_occupied = False
        self.vehicle = None
```

### 4.2 Implement Key Methods
Focus on core functionality:
```python
def park_vehicle(self, vehicle, spot):
    if spot.is_occupied:
        raise Exception("Spot is already occupied")
    
    spot.is_occupied = True
    spot.vehicle = vehicle
    
    return Ticket(vehicle, spot, datetime.now())
```

### 4.3 Add Error Handling
Handle edge cases:
```python
def find_parking_spot(self, vehicle_type):
    available_spots = [
        spot for spot in self.spots 
        if not spot.is_occupied and spot.spot_type == vehicle_type
    ]
    
    if not available_spots:
        raise NoAvailableSpotsException("No spots available for this vehicle type")
    
    return available_spots[0]
```

### 4.4 Demonstrate Usage
Show how your system works:
```python
# Demo
parking_lot = ParkingLot()
car = Vehicle("ABC123", VehicleType.CAR)
spot = parking_lot.find_parking_spot(VehicleType.CAR)
ticket = parking_lot.park_vehicle(car, spot)
```

## Phase 5: Discussion and Extension (5-10 minutes)

### 5.1 Handle Follow-up Questions
Be prepared to discuss:
- **Scalability**: How would you handle 1M users?
- **Database Design**: How would you store this data?
- **Concurrency**: How to handle race conditions?
- **Monitoring**: How to track system health?

### 5.2 Potential Extensions
Suggest future enhancements:
- Mobile app integration
- Real-time spot availability
- Dynamic pricing
- Analytics and reporting
- Integration with payment gateways

### 5.3 Trade-offs Discussion
Acknowledge design decisions:
- **Memory vs Speed**: Caching strategies
- **Consistency vs Availability**: CAP theorem implications
- **Complexity vs Simplicity**: When to add features
- **Cost vs Performance**: Resource optimization

## Common LLD Problem Categories

### 1. Reservation Systems
- Parking Lot, Hotel Booking, Movie Tickets
- **Key Patterns**: State, Command, Observer
- **Focus**: Booking lifecycle, availability management

### 2. Communication Systems
- Chat Application, Email System
- **Key Patterns**: Observer, Mediator, Chain of Responsibility
- **Focus**: Message routing, user management

### 3. Game Design
- Chess, Tic-Tac-Toe, Snake and Ladder
- **Key Patterns**: State, Strategy, Command
- **Focus**: Game rules, player management, board representation

### 4. E-commerce Systems
- Online Shopping, Food Delivery
- **Key Patterns**: Factory, Strategy, Observer
- **Focus**: Order processing, inventory management, payments

### 5. Transportation Systems
- Ride Sharing, Public Transit
- **Key Patterns**: Strategy, State, Observer
- **Focus**: Route optimization, pricing, driver/rider matching

## Time Management Tips

1. **Spend time on clarification** (don't rush into coding)
2. **Start with simple design** (avoid over-engineering initially)
3. **Implement core features first** (leave nice-to-haves for later)
4. **Keep talking** (explain your thought process)
5. **Be ready to iterate** (designs evolve during discussion)

## Red Flags to Avoid

1. **Starting to code immediately** without design
2. **Overcomplicating** the initial design
3. **Ignoring edge cases** completely
4. **Not considering scalability** at all
5. **Poor naming conventions** for classes and methods
6. **Tight coupling** between components
7. **Not applying OOP principles** properly

## Practice Strategy

1. **Start with simple problems** (Parking Lot, Library Management)
2. **Time yourself** (aim for 45-60 minutes total)
3. **Practice explaining** your design out loud
4. **Review and iterate** on your solutions
5. **Study existing solutions** and compare approaches
6. **Focus on different problem types** to build versatility

Remember: The goal is not just to write code, but to demonstrate your systematic thinking, design skills, and ability to build maintainable software systems.