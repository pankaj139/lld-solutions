# JavaScript Low-Level Design (LLD) Solutions

## Overview

This repository contains comprehensive Low-Level Design implementations in JavaScript, demonstrating advanced software engineering concepts, design patterns, and Object-Oriented Programming (OOP) principles. Each system is thoroughly documented with detailed comments explaining the design decisions, patterns used, and architectural considerations.

## 🎯 Learning Objectives

By studying these implementations, you will master:

- **Design Patterns**: 23 Gang of Four patterns plus modern architectural patterns
- **OOP Concepts**: Encapsulation, Inheritance, Polymorphism, and Abstraction
- **SOLID Principles**: Writing maintainable and extensible code
- **System Architecture**: Designing scalable and robust systems
- **Best Practices**: Clean code, documentation, and testing strategies

## 📁 Repository Structure

```text
lld-solutions/
├── README.md                       # Main repository documentation
├── docs/                           # Design documentation
│   ├── design-patterns.md         # Design patterns reference
│   ├── lld-framework.md           # LLD framework guide
│   ├── oop.md                     # OOP concepts guide
│   ├── solid.md                   # SOLID principles guide
│   └── README.md                  # Documentation index
├── javascript/                     # JavaScript implementations
│   ├── DESIGN_PATTERNS_SUMMARY.md # Comprehensive pattern guide
│   ├── README.md                  # This file
│   ├── atm-system/
│   │   └── main.js                # Banking ATM with state management
│   ├── banking-system/
│   │   └── main.js                # Core banking operations
│   ├── battleship-game/
│   │   └── main.js                # Naval strategy game
│   ├── chat-application/
│   │   └── main.js                # Real-time messaging system
│   ├── chess-game/
│   │   └── main.js                # Complete chess implementation
│   ├── elevator-system/
│   │   └── main.js                # Multi-elevator coordination
│   ├── food-delivery/
│   │   └── main.js                # Food ordering and delivery
│   ├── hotel-booking/
│   │   └── main.js                # Hotel reservation system
│   ├── library-management/
│   │   └── main.js                # Library operations and catalog
│   ├── memory-card-game/
│   │   └── main.js                # Memory matching game
│   ├── movie-ticket-booking/
│   │   └── main.js                # Cinema booking system
│   ├── online-shopping/
│   │   └── main.js                # E-commerce platform
│   ├── parking-lot/
│   │   └── main.js                # Vehicle parking management
│   ├── poker-game/
│   │   └── main.js                # Card game with betting
│   ├── ride-sharing/
│   │   └── main.js                # Transportation platform
│   ├── scrabble-game/
│   │   └── main.js                # Word game with scoring
│   ├── snake-game/
│   │   └── main.js                # Classic arcade game
│   ├── social-media/
│   │   └── main.js                # Social networking platform
│   ├── stock-trading/
│   │   └── main.js                # Financial trading system
│   ├── sudoku-game/
│   │   └── main.js                # Number puzzle game
│   ├── task-management/
│   │   └── main.js                # Project management system
│   ├── tic-tac-toe/
│   │   └── main.js                # Simple strategy game
│   └── url-shortener/
│       └── main.js                # URL shortening service
├── python/                        # Python implementations
│   ├── atm-system/
│   │   └── main.py
│   ├── chat-application/
│   │   └── main.py
│   ├── chess-game/
│   │   └── main.py
│   ├── elevator-system/
│   │   └── main.py
│   ├── food-delivery/
│   │   └── main.py
│   ├── hotel-booking/
│   │   └── main.py
│   ├── library-management/
│   │   └── main.py
│   ├── movie-ticket-booking/
│   │   └── main.py
│   ├── online-shopping/
│   │   └── main.py
│   ├── parking-lot/
│   │   └── main.py
│   ├── ride-sharing/
│   │   └── main.py
│   ├── snake-game/
│   │   └── main.py
│   ├── tic-tac-toe/
│   │   └── main.py
│   └── url-shortener/
│       └── main.py
└── System-specific markdown files
    ├── atm-system.md              # ATM system design
    ├── banking-system.md          # Banking system design
    ├── battleship-game.md         # Battleship game design
    ├── chat-application.md        # Chat application design
    ├── chess-game.md              # Chess game design
    ├── elevator-system.md         # Elevator system design
    ├── food-delivery-system.md    # Food delivery design
    ├── hotel-booking-system.md    # Hotel booking design
    ├── library-management-system.md # Library management design
    ├── memory-card-game.md        # Memory card game design
    ├── movie-ticket-booking.md    # Movie booking design
    ├── online-shopping-system.md  # Online shopping design
    ├── parking-lot-system.md      # Parking lot design
    ├── poker-game.md              # Poker game design
    ├── ride-sharing-system.md     # Ride sharing design
    ├── scrabble-game.md           # Scrabble game design
    ├── snake-game.md              # Snake game design
    ├── social-media-platform.md   # Social media design
    ├── stock-trading-system.md    # Stock trading design
    ├── sudoku-game.md             # Sudoku game design
    ├── task-management-system.md  # Task management design
    ├── tic-tac-toe-game.md        # Tic-tac-toe design
    └── url-shortener.md           # URL shortener design
```

## 🏗️ Design Patterns Catalog

### Creational Patterns

- **Factory Pattern**: `chess-game/`, `banking-system/`, `hotel-booking/`
- **Singleton Pattern**: `elevator-system/`, `url-shortener/`
- **Builder Pattern**: `online-shopping/`, `hotel-booking/`

### Structural Patterns

- **Decorator Pattern**: `hotel-booking/`, `banking-system/`, `task-management/`
- **Facade Pattern**: `atm-system/`, `library-management/`, `online-shopping/`
- **Composite Pattern**: `chess-game/`, `task-management/`, `parking-lot/`

### Behavioral Patterns

- **State Pattern**: `atm-system/`, `elevator-system/`, `chess-game/`
- **Strategy Pattern**: `parking-lot/`, `chess-game/`, `banking-system/`
- **Observer Pattern**: `social-media/`, `banking-system/`, `task-management/`
- **Command Pattern**: `chess-game/`, `atm-system/`, `task-management/`
- **Template Method**: `atm-system/`, `library-management/`, `banking-system/`

## 🔍 How to Study Each System

### 1. Start with the Header Documentation

Each file begins with comprehensive documentation explaining:

- Design patterns used
- OOP concepts demonstrated
- Business features
- Architectural principles

### 2. Understand the Enums

Enums define the system's states and types:

```javascript
// Example: ATM System states
const ATMState = {
    IDLE: 'IDLE',
    CARD_INSERTED: 'CARD_INSERTED',
    PIN_ENTERED: 'PIN_ENTERED',
    // ... more states
};
```

### 3. Study Class Hierarchies

Look for inheritance patterns:

```javascript
// Abstract base class
class Vehicle {
    constructor(licensePlate, vehicleType) {
        if (this.constructor === Vehicle) {
            throw new Error(\"Cannot instantiate abstract class\");
        }
        // ...
    }
}

// Concrete implementations
class Car extends Vehicle {
    constructor(licensePlate) {
        super(licensePlate, VehicleType.CAR);
    }
}
```

### 4. Trace Pattern Implementations

Follow how patterns are implemented:

```javascript
// Strategy Pattern example
class ParkingSpot {
    _canFitVehicle(vehicle) {
        // Different strategies for different vehicle types
        return (this.spotType === ParkingSpotType.TRUCK ||
                (this.spotType === ParkingSpotType.CAR && 
                 vehicle.vehicleType !== VehicleType.TRUCK));
    }
}
```

## 🎮 Running the Code

### Prerequisites

- Node.js (v14 or higher)
- Basic understanding of JavaScript ES6+

### Execution

```bash
# Navigate to any system
cd javascript/chess-game

# Run the system
node main.js

# Or run in browser
# Open HTML file that includes the script
```

### Testing Patterns

```javascript
// Example: Testing State Pattern in ATM
const atm = new ATM(\"ATM001\", \"Main Branch\", cashDispenser, bankingService);
console.log(atm.getCurrentState()); // IDLE

atm.insertCard(\"1234567890123456\");
console.log(atm.getCurrentState()); // CARD_INSERTED

atm.enterPin(\"1234\");
console.log(atm.getCurrentState()); // PIN_ENTERED
```

## 📚 Study Guide by Complexity

### Beginner Level

1. **Tic-Tac-Toe** - Basic game logic, simple state management
2. **Parking Lot** - Inheritance, polymorphism, basic strategies
3. **ATM System** - State pattern, composition, business logic

### Intermediate Level

1. **Hotel Booking** - Complex state management, multiple patterns
2. **Library Management** - Role-based design, chain of responsibility
3. **Chess Game** - Advanced inheritance, strategy pattern, complex rules

### Advanced Level

1. **Social Media** - Observer pattern, complex relationships, real-time features
2. **Stock Trading** - Financial algorithms, real-time data, advanced patterns
3. **Task Management** - Enterprise features, multiple pattern combinations

## 🏛️ Architectural Concepts

### Layered Architecture

```text
Presentation Layer  (UI/CLI interfaces)
    ↓
Business Logic     (Core domain logic)
    ↓
Data Access        (Repository pattern)
    ↓
Data Storage       (In-memory/persistent)
```

### Event-Driven Architecture

```javascript
// Observer Pattern implementation
class EventEmitter {
    constructor() {
        this.listeners = new Map();
    }
    
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }
    
    emit(event, data) {
        const callbacks = this.listeners.get(event) || [];
        callbacks.forEach(callback => callback(data));
    }
}
```

## 🔧 Key Features by System

### Business Systems

- **Banking System**: Account management, transactions, fraud detection
- **Hotel Booking**: Reservation workflow, payment processing, room management
- **Online Shopping**: E-commerce features, cart management, order processing
- **Library Management**: Catalog management, user roles, reservation system

### Real-Time Systems

- **Chat Application**: Messaging, presence, real-time updates
- **Social Media**: News feed, notifications, friend management
- **Stock Trading**: Market data, order execution, portfolio management
- **Ride Sharing**: GPS tracking, driver matching, real-time updates

### Game Systems

- **Chess Game**: Complex rules, move validation, game state
- **Snake Game**: Real-time movement, collision detection, scoring
- **Poker Game**: Card dealing, betting, hand evaluation
- **Memory Card Game**: Game logic, timer, scoring

### Infrastructure Systems

- **Elevator System**: Multi-elevator coordination, scheduling algorithms
- **Parking Lot**: Space allocation, payment processing, optimization
- **URL Shortener**: Encoding algorithms, analytics, scaling
- **Task Management**: Project planning, team collaboration, reporting

## 📖 Code Reading Tips

### 1. Focus on Comments

Comments explain the **why**, not the **what**:

```javascript
/**
 * Strategy Pattern: Greedy Algorithm for Cash Dispensing
 * 
 * Algorithm Steps:
 * 1. Validate amount (business rule: multiples of $5)
 * 2. Check total cash availability
 * 3. Apply greedy strategy: largest denominations first
 */
```

### 2. Understand Relationships

Look for composition and association:

```javascript
// Composition: ATM contains CashDispenser
class ATM {
    constructor(atmId, location, cashDispenser, bankingService) {
        this.cashDispenser = cashDispenser;  // Has-a relationship
        this.bankingService = bankingService;
    }
}
```

### 3. Trace State Changes

Follow how objects change state:

```javascript
// State transitions in booking system
booking.status = BookingStatus.PENDING;     // Initial state
booking.confirmBooking();                   // → CONFIRMED
booking.checkIn();                          // → CHECKED_IN
booking.checkOut();                         // → CHECKED_OUT
```

## 🧪 Extending the Code

### Adding New Features

1. **Identify the Pattern**: What pattern fits your new feature?
2. **Follow Existing Structure**: Maintain consistency with existing code
3. **Update Related Classes**: Ensure all dependencies are updated
4. **Add Tests**: Verify your changes work correctly

### Example: Adding a New Chess Piece

```javascript
// 1. Extend the Piece base class
class Archbishop extends Piece {
    constructor(color, position) {
        super(color, position);
        this.pieceType = PieceType.ARCHBISHOP;
    }
    
    // 2. Implement the strategy
    getPossibleMoves(board) {
        // Combine bishop and knight moves
        const moves = [];
        // ... implementation
        return moves;
    }
}

// 3. Update the factory
class PieceFactory {
    static createPiece(pieceType, color, position) {
        const pieceMap = {
            // ... existing pieces
            [PieceType.ARCHBISHOP]: Archbishop,
        };
        // ...
    }
}
```

## 🚀 Next Steps

1. **Start Small**: Begin with simpler systems like Tic-Tac-Toe
2. **Understand Patterns**: Study one pattern at a time
3. **Modify Code**: Try adding small features
4. **Build Your Own**: Apply these patterns to your projects
5. **Study Interactions**: See how patterns work together

## 📋 Checklist for Each System

- [ ] Read the header documentation
- [ ] Understand the business domain
- [ ] Identify the main classes and their relationships
- [ ] Trace the primary use cases
- [ ] Find the design patterns being used
- [ ] Run the demo code
- [ ] Modify something small
- [ ] Understand the architectural decisions

## 🤝 Contributing

To improve these implementations:

1. Maintain the existing commenting style
2. Add more examples of pattern usage
3. Include additional test cases
4. Improve error handling and edge cases
5. Add performance optimizations where appropriate

## 📚 Further Reading

- **Design Patterns**: \"Gang of Four\" book by Gamma, Helm, Johnson, Vlissides
- **Clean Code**: \"Clean Code\" by Robert Martin
- **System Design**: \"Designing Data-Intensive Applications\" by Martin Kleppmann
- **JavaScript Patterns**: \"Learning JavaScript Design Patterns\" by Addy Osmani

---

**Happy Learning!** These implementations provide a solid foundation for understanding how to build robust, maintainable software systems using proven design patterns and OOP principles.
