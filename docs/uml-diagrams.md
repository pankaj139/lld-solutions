# Types of UML Diagrams

**Purpose**: Master all 14 UML diagram types - understanding when and how to use each diagram to effectively model different aspects of software systems.

---

## Table of Contents

1. [Overview of UML Diagrams](#overview-of-uml-diagrams)
2. [Structural Diagrams](#structural-diagrams)
3. [Behavioral Diagrams](#behavioral-diagrams)
4. [Diagram Selection Guide](#diagram-selection-guide)
5. [Comparison Matrix](#comparison-matrix)
6. [Real-World Example](#real-world-example)
7. [Best Practices](#best-practices)
8. [Common Mistakes](#common-mistakes)
9. [Interview Questions](#interview-questions)

---

## Overview of UML Diagrams

UML 2.5 defines **14 different diagram types** organized into two main categories: **Structural** and **Behavioral**.

### Complete Hierarchy

```mermaid
graph TB
    A[UML 2.5 Diagrams] --> B[Structural Diagrams]
    A --> C[Behavioral Diagrams]
    
    B --> B1[Class Diagram]
    B --> B2[Object Diagram]
    B --> B3[Component Diagram]
    B --> B4[Deployment Diagram]
    B --> B5[Package Diagram]
    B --> B6[Composite Structure Diagram]
    B --> B7[Profile Diagram]
    
    C --> C1[Use Case Diagram]
    C --> C2[Activity Diagram]
    C --> C3[State Machine Diagram]
    C --> C4[Interaction Diagrams]
    
    C4 --> C4A[Sequence Diagram]
    C4 --> C4B[Communication Diagram]
    C4 --> C4C[Timing Diagram]
    C4 --> C4D[Interaction Overview Diagram]
    
    style B fill:#90EE90
    style C fill:#87CEEB
    style C4 fill:#FFD700
```

### Quick Reference

| Category | Diagram Type | Purpose | Usage Frequency |
|----------|-------------|---------|-----------------|
| Structural | Class | Show classes and relationships | ⭐⭐⭐⭐⭐ |
| Structural | Component | Show software components | ⭐⭐⭐ |
| Structural | Deployment | Show physical deployment | ⭐⭐⭐ |
| Structural | Object | Show object instances | ⭐⭐ |
| Structural | Package | Show package organization | ⭐⭐ |
| Structural | Composite Structure | Show internal structure | ⭐ |
| Structural | Profile | Extend UML | ⭐ |
| Behavioral | Use Case | Show system functionality | ⭐⭐⭐⭐⭐ |
| Behavioral | Sequence | Show time-ordered interactions | ⭐⭐⭐⭐⭐ |
| Behavioral | Activity | Show workflows | ⭐⭐⭐⭐ |
| Behavioral | State Machine | Show object states | ⭐⭐⭐ |
| Behavioral | Communication | Show message-based interactions | ⭐⭐ |
| Behavioral | Timing | Show time constraints | ⭐ |
| Behavioral | Interaction Overview | Show interaction flow | ⭐ |

---

## Structural Diagrams

Structural diagrams show the **static structure** of the system - what exists and how it's organized.

### 1. Class Diagram ⭐⭐⭐⭐⭐

**Purpose**: Most important diagram showing classes, attributes, methods, and relationships.

**When to Use**:

- Designing object-oriented systems
- Showing class hierarchy
- Documenting system architecture

**Example: E-Commerce System**

```mermaid
classDiagram
    class User {
        -userId: string
        -username: string
        -email: string
        -password: string
        +register()
        +login()
        +updateProfile()
    }
    
    class Customer {
        -shippingAddress: Address
        -paymentMethods: PaymentMethod[]
        +placeOrder()
        +trackOrder()
    }
    
    class Product {
        -productId: string
        -name: string
        -price: float
        -stock: int
        +checkAvailability()
        +updateStock()
    }
    
    class Order {
        -orderId: string
        -orderDate: Date
        -status: OrderStatus
        -total: float
        +calculateTotal()
        +processPayment()
        +ship()
    }
    
    class OrderItem {
        -quantity: int
        -unitPrice: float
        +getSubtotal()
    }
    
    User <|-- Customer
    Customer "1" -- "*" Order: places
    Order "1" *-- "*" OrderItem: contains
    OrderItem "*" -- "1" Product: references
```

**JavaScript Implementation:**

```javascript
class User {
    #userId;
    #username;
    #email;
    #password;
    
    constructor(userId, username, email, password) {
        this.#userId = userId;
        this.#username = username;
        this.#email = email;
        this.#password = password;
    }
    
    register() {
        console.log(`User ${this.#username} registered`);
    }
    
    login(credentials) {
        return credentials.password === this.#password;
    }
}

class Customer extends User {
    #shippingAddress;
    #paymentMethods = [];
    #orders = [];
    
    constructor(userId, username, email, password, address) {
        super(userId, username, email, password);
        this.#shippingAddress = address;
    }
    
    placeOrder(items) {
        const order = new Order(this, items);
        this.#orders.push(order);
        return order;
    }
}
```

### 2. Object Diagram ⭐⭐

**Purpose**: Shows specific instances of classes at a particular moment in time.

**When to Use**:

- Understanding complex relationships
- Showing example scenarios
- Debugging design issues

```mermaid
graph TB
    subgraph "Object Diagram - Snapshot at 2:30 PM"
        A["john: Customer<br/>username='john_doe'<br/>email='john@example.com'"]
        B["order123: Order<br/>orderId='ORD-123'<br/>orderDate='2025-10-04'<br/>status='PROCESSING'<br/>total=159.98"]
        C["item1: OrderItem<br/>quantity=2<br/>unitPrice=49.99"]
        D["item2: OrderItem<br/>quantity=1<br/>unitPrice=59.99"]
        E["laptop: Product<br/>productId='P001'<br/>name='Laptop'<br/>price=49.99"]
        F["mouse: Product<br/>productId='P002'<br/>name='Mouse'<br/>price=59.99"]
    end
    
    A -->|places| B
    B -->|contains| C
    B -->|contains| D
    C -->|references| E
    D -->|references| F
```

### 3. Component Diagram ⭐⭐⭐

**Purpose**: Shows how software components are organized and their dependencies.

**When to Use**:

- Designing system architecture
- Showing module dependencies
- Planning deployments

```mermaid
graph TB
    subgraph "Frontend Components"
        A[Web UI]
        B[Mobile App]
    end
    
    subgraph "API Gateway"
        C[API Gateway]
    end
    
    subgraph "Microservices"
        D[User Service]
        E[Order Service]
        F[Payment Service]
        G[Inventory Service]
        H[Notification Service]
    end
    
    subgraph "Data Layer"
        I[(User DB)]
        J[(Order DB)]
        K[(Product DB)]
        L[Message Queue]
    end
    
    A --> C
    B --> C
    C --> D
    C --> E
    C --> F
    E --> G
    E --> F
    E --> H
    D --> I
    E --> J
    G --> K
    F --> L
    H --> L
```

### 4. Deployment Diagram ⭐⭐⭐

**Purpose**: Shows physical deployment of artifacts on hardware nodes.

**When to Use**:

- Infrastructure planning
- System deployment
- DevOps documentation

```mermaid
graph TB
    subgraph "User Devices"
        A[Browser]
        B[Mobile Device]
    end
    
    subgraph "Load Balancer"
        C[Nginx Load Balancer<br/>IP: 10.0.1.10]
    end
    
    subgraph "Application Servers"
        D[App Server 1<br/>IP: 10.0.2.10<br/>Node.js]
        E[App Server 2<br/>IP: 10.0.2.11<br/>Node.js]
    end
    
    subgraph "Database Cluster"
        F[Primary DB<br/>IP: 10.0.3.10<br/>PostgreSQL]
        G[Replica DB<br/>IP: 10.0.3.11<br/>PostgreSQL]
    end
    
    subgraph "Cache Layer"
        H[Redis Cache<br/>IP: 10.0.4.10]
    end
    
    A -->|HTTPS| C
    B -->|HTTPS| C
    C --> D
    C --> E
    D --> F
    E --> F
    F -.->|Replication| G
    D --> H
    E --> H
```

### 5. Package Diagram ⭐⭐

**Purpose**: Shows how packages are organized and their dependencies.

**When to Use**:

- Organizing large systems
- Managing dependencies
- Modular architecture

```mermaid
graph TD
    subgraph "Application"
        A[Web Layer]
        B[Service Layer]
        C[Data Access Layer]
        D[Domain Model]
        E[Common Utilities]
    end
    
    A --> B
    B --> C
    B --> D
    C --> D
    A --> E
    B --> E
    C --> E
```

### 6. Composite Structure Diagram ⭐

**Purpose**: Shows internal structure of a class and collaborations.

**When to Use**:

- Complex class internals
- Design patterns implementation
- Component interactions

### 7. Profile Diagram ⭐

**Purpose**: Extends UML with custom stereotypes and constraints.

**When to Use**:

- Domain-specific modeling
- Custom notation needed
- Specialized systems

---

## Behavioral Diagrams

Behavioral diagrams show the **dynamic behavior** of the system - what happens and when.

### 1. Use Case Diagram ⭐⭐⭐⭐⭐

**Purpose**: Shows system functionality from user perspective.

**When to Use**:

- Requirements gathering
- Stakeholder communication
- System scope definition

```mermaid
graph LR
    A[Customer] --> B((Browse Products))
    A --> C((Search Products))
    A --> D((Add to Cart))
    A --> E((Checkout))
    A --> F((Track Order))
    A --> G((Write Review))
    
    H[Guest] --> B
    H --> C
    
    I[Admin] --> J((Manage Products))
    I --> K((Process Orders))
    I --> L((View Analytics))
    I --> M((Manage Users))
    
    E --> N((Process Payment))
    E --> O((Send Confirmation))
    N --> P[Payment Gateway]
    O --> Q[Email Service]
```

**JavaScript Example:**

```javascript
// Use Case: Checkout
class CheckoutUseCase {
    constructor(cart, paymentService, orderService, notificationService) {
        this.cart = cart;
        this.paymentService = paymentService;
        this.orderService = orderService;
        this.notificationService = notificationService;
    }
    
    async execute(customer, shippingAddress, paymentMethod) {
        // Validate cart
        if (this.cart.isEmpty()) {
            throw new Error("Cart is empty");
        }
        
        // Calculate total
        const total = this.cart.calculateTotal();
        
        // Process payment (uses Payment Gateway - actor)
        const paymentResult = await this.paymentService.process(
            paymentMethod,
            total
        );
        
        if (!paymentResult.success) {
            throw new Error("Payment failed");
        }
        
        // Create order
        const order = await this.orderService.createOrder({
            customer,
            items: this.cart.getItems(),
            shippingAddress,
            paymentResult
        });
        
        // Send confirmation (uses Email Service - actor)
        await this.notificationService.sendOrderConfirmation(
            customer.email,
            order
        );
        
        // Clear cart
        this.cart.clear();
        
        return order;
    }
}
```

### 2. Sequence Diagram ⭐⭐⭐⭐⭐

**Purpose**: Shows interactions between objects over time.

**When to Use**:

- Designing interactions
- Understanding message flow
- Documenting protocols

```mermaid
sequenceDiagram
    participant User
    participant UI
    participant Controller
    participant OrderService
    participant PaymentService
    participant Database
    participant EmailService
    
    User->>UI: Click "Place Order"
    UI->>Controller: placeOrder(orderData)
    
    Controller->>OrderService: createOrder(orderData)
    OrderService->>Database: saveOrder(order)
    Database-->>OrderService: orderId
    
    OrderService->>PaymentService: processPayment(paymentInfo)
    PaymentService->>PaymentService: validate()
    PaymentService->>PaymentService: charge()
    PaymentService-->>OrderService: paymentConfirmation
    
    OrderService->>Database: updateOrderStatus(orderId, "PAID")
    
    OrderService->>EmailService: sendConfirmation(email, orderId)
    EmailService-->>OrderService: sent
    
    OrderService-->>Controller: orderConfirmation
    Controller-->>UI: showSuccess(orderDetails)
    UI-->>User: Display "Order Placed Successfully"
```

**JavaScript Implementation:**

```javascript
class OrderController {
    constructor(orderService, paymentService, emailService) {
        this.orderService = orderService;
        this.paymentService = paymentService;
        this.emailService = emailService;
    }
    
    async placeOrder(orderData) {
        try {
            // Create order
            const order = await this.orderService.createOrder(orderData);
            
            // Process payment
            const payment = await this.paymentService.processPayment({
                orderId: order.id,
                amount: order.total,
                method: orderData.paymentMethod
            });
            
            // Update order status
            await this.orderService.updateStatus(order.id, 'PAID');
            
            // Send confirmation
            await this.emailService.sendConfirmation(
                orderData.customer.email,
                order.id
            );
            
            return {
                success: true,
                orderId: order.id,
                message: "Order placed successfully"
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}
```

### 3. Activity Diagram ⭐⭐⭐⭐

**Purpose**: Shows workflow, business processes, and algorithms.

**When to Use**:

- Business process modeling
- Workflow documentation
- Algorithm visualization

```mermaid
graph TD
    A[Start: Receive Order] --> B{Items in Stock?}
    B -->|No| C[Notify Customer]
    C --> D[Cancel Order]
    D --> Z[End]
    
    B -->|Yes| E[Reserve Items]
    E --> F{Payment Authorized?}
    
    F -->|No| G[Payment Failed]
    G --> H[Release Items]
    H --> D
    
    F -->|Yes| I[Charge Payment]
    I --> J[Update Inventory]
    J --> K[Generate Invoice]
    K --> L[Send to Warehouse]
    L --> M{Ready to Ship?}
    
    M -->|No| N[Wait for Preparation]
    N --> M
    
    M -->|Yes| O[Ship Order]
    O --> P[Send Tracking Info]
    P --> Q[Update Order Status]
    Q --> Z
```

**Python Implementation:**

```python
class OrderWorkflow:
    def __init__(self, inventory, payment_service, shipping_service):
        self.inventory = inventory
        self.payment_service = payment_service
        self.shipping_service = shipping_service
    
    def process_order(self, order):
        # Check stock
        if not self.inventory.check_availability(order.items):
            self.notify_customer(order, "Items not in stock")
            self.cancel_order(order)
            return False
        
        # Reserve items
        self.inventory.reserve(order.items)
        
        # Authorize payment
        if not self.payment_service.authorize(order.payment_info):
            self.notify_customer(order, "Payment authorization failed")
            self.inventory.release(order.items)
            self.cancel_order(order)
            return False
        
        # Charge payment
        self.payment_service.charge(order.payment_info, order.total)
        
        # Update inventory
        self.inventory.deduct(order.items)
        
        # Generate invoice
        invoice = self.generate_invoice(order)
        
        # Send to warehouse
        self.shipping_service.prepare_shipment(order)
        
        # Wait for shipment ready
        while not self.shipping_service.is_ready(order):
            time.sleep(60)  # Check every minute
        
        # Ship order
        tracking = self.shipping_service.ship(order)
        
        # Send tracking info
        self.notify_customer(order, f"Shipped! Tracking: {tracking}")
        
        # Update status
        order.status = "SHIPPED"
        
        return True
```

### 4. State Machine Diagram ⭐⭐⭐

**Purpose**: Shows states of an object and transitions between states.

**When to Use**:

- Complex object lifecycle
- Protocol design
- UI state management

```mermaid
stateDiagram-v2
    [*] --> Draft
    
    Draft --> Submitted: submit()
    Draft --> Cancelled: cancel()
    
    Submitted --> UnderReview: assign_reviewer()
    Submitted --> Cancelled: cancel()
    
    UnderReview --> ChangesRequested: request_changes()
    UnderReview --> Approved: approve()
    UnderReview --> Rejected: reject()
    
    ChangesRequested --> Submitted: resubmit()
    ChangesRequested --> Cancelled: cancel()
    
    Approved --> Published: publish()
    
    Rejected --> Draft: revise()
    Rejected --> Cancelled: abandon()
    
    Published --> Archived: archive()
    
    Cancelled --> [*]
    Archived --> [*]
```

**JavaScript Implementation:**

```javascript
class Document {
    #state;
    #content;
    
    constructor(content) {
        this.#content = content;
        this.#state = 'DRAFT';
    }
    
    submit() {
        if (this.#state !== 'DRAFT' && this.#state !== 'CHANGES_REQUESTED') {
            throw new Error(`Cannot submit from ${this.#state} state`);
        }
        this.#state = 'SUBMITTED';
        console.log('Document submitted');
    }
    
    assignReviewer(reviewer) {
        if (this.#state !== 'SUBMITTED') {
            throw new Error(`Cannot assign reviewer from ${this.#state} state`);
        }
        this.#state = 'UNDER_REVIEW';
        console.log(`Document under review by ${reviewer}`);
    }
    
    requestChanges(comments) {
        if (this.#state !== 'UNDER_REVIEW') {
            throw new Error(`Cannot request changes from ${this.#state} state`);
        }
        this.#state = 'CHANGES_REQUESTED';
        console.log(`Changes requested: ${comments}`);
    }
    
    approve() {
        if (this.#state !== 'UNDER_REVIEW') {
            throw new Error(`Cannot approve from ${this.#state} state`);
        }
        this.#state = 'APPROVED';
        console.log('Document approved');
    }
    
    reject(reason) {
        if (this.#state !== 'UNDER_REVIEW') {
            throw new Error(`Cannot reject from ${this.#state} state`);
        }
        this.#state = 'REJECTED';
        console.log(`Document rejected: ${reason}`);
    }
    
    publish() {
        if (this.#state !== 'APPROVED') {
            throw new Error(`Cannot publish from ${this.#state} state`);
        }
        this.#state = 'PUBLISHED';
        console.log('Document published');
    }
    
    getState() {
        return this.#state;
    }
}

// Demo
const doc = new Document("My Article");
doc.submit();
doc.assignReviewer("John");
doc.approve();
doc.publish();
console.log(`Final state: ${doc.getState()}`);
```

### 5. Communication Diagram ⭐⭐

**Purpose**: Shows interactions between objects with focus on relationships.

**When to Use**:

- Alternative to sequence diagrams
- Emphasizing object relationships
- Complex collaborations

### 6. Timing Diagram ⭐

**Purpose**: Shows behavior over time with time constraints.

**When to Use**:

- Real-time systems
- Time-critical operations
- Performance analysis

### 7. Interaction Overview Diagram ⭐

**Purpose**: Shows overview of interaction flow.

**When to Use**:

- High-level interaction flow
- Combining multiple scenarios
- System overview

---

## Diagram Selection Guide

### Decision Tree

```mermaid
graph TD
    A{What do you want to show?} --> B{Structure or Behavior?}
    
    B -->|Structure| C{What aspect?}
    C -->|Classes & Relationships| D[Class Diagram]
    C -->|Components & Dependencies| E[Component Diagram]
    C -->|Physical Deployment| F[Deployment Diagram]
    C -->|Package Organization| G[Package Diagram]
    C -->|Object Instances| H[Object Diagram]
    
    B -->|Behavior| I{What aspect?}
    I -->|User Functionality| J[Use Case Diagram]
    I -->|Time-ordered Interactions| K[Sequence Diagram]
    I -->|Workflow/Process| L[Activity Diagram]
    I -->|Object Lifecycle| M[State Machine Diagram]
```

### Common Scenarios

| Scenario | Recommended Diagram |
|----------|---------------------|
| Designing class hierarchy | Class Diagram |
| Showing user features | Use Case Diagram |
| Documenting API calls | Sequence Diagram |
| Business process | Activity Diagram |
| Order lifecycle | State Machine Diagram |
| Microservices architecture | Component Diagram |
| Infrastructure setup | Deployment Diagram |
| Package dependencies | Package Diagram |

---

## Comparison Matrix

### Structural Diagrams Comparison

| Feature | Class | Component | Deployment | Package |
|---------|-------|-----------|------------|---------|
| **Abstraction Level** | Low | Medium | High | Medium |
| **Shows Code Structure** | Yes | Partially | No | Yes |
| **Shows Physical Deployment** | No | No | Yes | No |
| **Used in Design Phase** | Yes | Yes | No | Yes |
| **Used in Development** | Yes | Yes | No | Yes |
| **Used in Operations** | No | Partially | Yes | No |

### Behavioral Diagrams Comparison

| Feature | Use Case | Sequence | Activity | State Machine |
|---------|----------|----------|----------|---------------|
| **Shows User Perspective** | Yes | No | Partially | No |
| **Shows Time Order** | No | Yes | Partially | Yes |
| **Shows Workflow** | No | No | Yes | No |
| **Shows Object States** | No | No | No | Yes |
| **Good for Requirements** | Yes | No | Yes | No |
| **Good for Design** | No | Yes | Yes | Yes |

---

## Real-World Example

### Complete System Documentation

Let's document an **Online Food Ordering System** using multiple diagrams.

#### 1. Use Case Diagram - System Functionality

```mermaid
graph LR
    C[Customer] --> UC1((Browse Restaurants))
    C --> UC2((Search Food))
    C --> UC3((Place Order))
    C --> UC4((Track Delivery))
    C --> UC5((Rate Order))
    
    R[Restaurant] --> UC6((Update Menu))
    R --> UC7((Accept Orders))
    R --> UC8((Update Status))
    
    D[Delivery Driver] --> UC9((Accept Delivery))
    D --> UC10((Update Location))
    D --> UC11((Complete Delivery))
    
    UC3 --> UC12((Process Payment))
    UC12 --> PG[Payment Gateway]
```

#### 2. Class Diagram - System Structure

```mermaid
classDiagram
    class Customer {
        -customerId
        -name
        -phone
        -address
        +browseRestaurants()
        +placeOrder()
        +trackOrder()
    }
    
    class Restaurant {
        -restaurantId
        -name
        -cuisine
        -rating
        +updateMenu()
        +acceptOrder()
    }
    
    class MenuItem {
        -itemId
        -name
        -price
        -description
    }
    
    class Order {
        -orderId
        -orderTime
        -status
        -total
        +calculateTotal()
        +updateStatus()
    }
    
    class OrderItem {
        -quantity
        -specialInstructions
    }
    
    class DeliveryDriver {
        -driverId
        -name
        -vehicle
        -location
        +acceptDelivery()
        +updateLocation()
    }
    
    Customer "1" -- "*" Order
    Restaurant "1" -- "*" MenuItem
    Restaurant "1" -- "*" Order
    Order "1" *-- "*" OrderItem
    OrderItem "*" -- "1" MenuItem
    Order "1" -- "0..1" DeliveryDriver
```

#### 3. Sequence Diagram - Place Order Flow

```mermaid
sequenceDiagram
    participant Customer
    participant App
    participant RestaurantService
    participant OrderService
    participant PaymentService
    participant NotificationService
    
    Customer->>App: Select items
    Customer->>App: Click "Place Order"
    
    App->>OrderService: createOrder(items)
    OrderService->>RestaurantService: checkAvailability(items)
    RestaurantService-->>OrderService: available
    
    OrderService->>PaymentService: processPayment(amount)
    PaymentService-->>OrderService: paymentConfirmed
    
    OrderService->>OrderService: saveOrder()
    OrderService->>NotificationService: notifyRestaurant(order)
    OrderService->>NotificationService: notifyCustomer(order)
    
    OrderService-->>App: orderConfirmation
    App-->>Customer: Show "Order Placed"
```

#### 4. State Machine Diagram - Order Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Created
    Created --> Confirmed: restaurant_accepts
    Created --> Cancelled: customer_cancels
    
    Confirmed --> Preparing: start_cooking
    Preparing --> ReadyForPickup: food_ready
    
    ReadyForPickup --> PickedUp: driver_picks_up
    PickedUp --> InTransit: delivery_started
    
    InTransit --> Delivered: delivery_completed
    Delivered --> Completed: customer_confirms
    
    Confirmed --> Cancelled: restaurant_cancels
    Preparing --> Cancelled: issue_occurred
    
    Completed --> [*]
    Cancelled --> [*]
```

#### 5. Activity Diagram - Order Processing

```mermaid
graph TD
    A[Customer Places Order] --> B{Items Available?}
    B -->|No| C[Notify Customer]
    C --> Z[End]
    
    B -->|Yes| D[Process Payment]
    D --> E{Payment Success?}
    E -->|No| C
    
    E -->|Yes| F[Notify Restaurant]
    F --> G[Restaurant Prepares Food]
    G --> H[Notify Available Drivers]
    H --> I{Driver Accepts?}
    
    I -->|No| J[Wait 1 minute]
    J --> H
    
    I -->|Yes| K[Driver Picks Up]
    K --> L[Driver Delivers]
    L --> M[Customer Receives]
    M --> Z
```

---

## Best Practices

### 1. Choose the Right Diagram

```mermaid
graph LR
    A[Purpose] --> B{Audience}
    B -->|Developers| C[Class, Sequence]
    B -->|Business| D[Use Case, Activity]
    B -->|Operations| E[Deployment, Component]
```

### 2. Keep It Simple

```javascript
// ✅ GOOD: One diagram per concern
// - Class diagram for User Management
// - Class diagram for Order Management
// - Class diagram for Payment Processing

// ❌ BAD: One massive class diagram with everything
```

### 3. Use Consistent Notation

```javascript
// ✅ GOOD: Consistent across all diagrams
/*
+ public
- private
# protected
~ package
*/

// ❌ BAD: Mixed notation
/*
Some diagrams use +public
Others use public:
*/
```

### 4. Add Context

```mermaid
classDiagram
    class PaymentProcessor {
        +process(amount)
    }
    
    note for PaymentProcessor "Implements Strategy pattern\nSupports: Credit Card, PayPal, Crypto\nRetries: 3 times\nTimeout: 30 seconds"
```

### 5. Version and Maintain

```bash
# Store diagrams in version control
docs/
  diagrams/
    class/
      user-management-v1.0.puml
      order-management-v1.0.puml
    sequence/
      checkout-flow-v1.0.mmd
```

---

## Common Mistakes

### Mistake 1: Wrong Diagram Type

```text
❌ BAD:
- Using Class Diagram to show process flow
  (Use Activity Diagram instead)

- Using Sequence Diagram to show class relationships
  (Use Class Diagram instead)

✅ GOOD:
- Use Class Diagram for structure
- Use Sequence Diagram for interactions
- Use Activity Diagram for workflows
```

### Mistake 2: Too Much Detail

```text
❌ BAD: Include every getter/setter
class User {
    -id
    +getId()
    +setId()
    -name
    +getName()
    +setName()
    // ... 20 more properties
}

✅ GOOD: Show only relevant details
class User {
    -id
    -name
    -email
    +authenticate()
    +updateProfile()
}
```

### Mistake 3: Inconsistent Abstraction Levels

```text
❌ BAD: Mixing high and low level
- Some classes show implementation details
- Others show just interfaces
- Inconsistent granularity

✅ GOOD: Consistent abstraction
- All classes at same level
- Either all detailed or all high-level
- Consistent granularity
```

---

## Interview Questions

### Q1: What are the two main categories of UML diagrams?

**Answer**:

1. **Structural Diagrams**: Show static structure (Class, Component, Deployment, Package, Object, Composite Structure, Profile)
2. **Behavioral Diagrams**: Show dynamic behavior (Use Case, Sequence, Activity, State Machine, Communication, Timing, Interaction Overview)

### Q2: When would you use a sequence diagram vs a communication diagram?

**Answer**:

- **Sequence Diagram**: When time ordering is important, showing messages in chronological order
- **Communication Diagram**: When object relationships are important, showing how objects collaborate

### Q3: What's the difference between class diagram and object diagram?

**Answer**:

- **Class Diagram**: Shows classes, attributes, methods, and relationships (general structure)
- **Object Diagram**: Shows specific instances at a point in time (concrete snapshot)

### Q4: When should you use a state machine diagram?

**Answer**: Use state machine diagrams when:

- Object has well-defined states
- Complex lifecycle
- State-dependent behavior
- Protocol design
- Examples: Order status, Document workflow, Connection states

### Q5: What diagram would you use to show system deployment?

**Answer**: **Deployment Diagram** - shows how software components are deployed on physical hardware nodes, including servers, networks, and connections.

### Q6: How do you decide which diagram to create first?

**Answer**:

1. **Use Case Diagram**: Start here for requirements
2. **Class Diagram**: Then design structure
3. **Sequence Diagram**: Then detail interactions
4. **Activity Diagram**: For complex processes
5. **State Machine**: For stateful objects
6. **Deployment**: Finally, for deployment planning

### Q7: Can you combine multiple diagram types?

**Answer**: No, maintain diagram purity. Each diagram should serve one purpose. However, you can create multiple diagrams that complement each other for complete system documentation.

---

## Summary

```mermaid
mindmap
  root((UML Diagrams))
    Structural 7
      Class Most Important
      Component
      Deployment
      Package
      Object
      Composite Structure
      Profile
    Behavioral 7
      Use Case User View
      Sequence Time Order
      Activity Workflow
      State Machine Lifecycle
      Communication
      Timing
      Interaction Overview
    Selection
      Purpose driven
      Audience specific
      Right tool for job
```

---

## Next Steps

1. **Study**: [Use Case Diagrams](./use-case-diagram.md) in detail
2. **Study**: [Class Diagrams](./class-diagram.md) in detail
3. **Study**: [Sequence Diagrams](./sequence-diagram.md) in detail
4. **Practice**: Create diagrams for a small project
5. **Review**: Practice reading and creating each diagram type

---

**Key Takeaway**: Each UML diagram serves a specific purpose. Master the most common ones (Class, Use Case, Sequence, Activity, State Machine) and use the right diagram for your specific need. Don't try to show everything in one diagram!

