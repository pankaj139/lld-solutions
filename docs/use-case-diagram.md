# Use Case Diagram

**Purpose**: Master use case diagrams - the primary tool for capturing functional requirements and showing system functionality from the user's perspective in UML.

---

## Table of Contents

1. [What is a Use Case Diagram?](#what-is-a-use-case-diagram)
2. [Components of Use Case Diagrams](#components-of-use-case-diagrams)
3. [Actors](#actors)
4. [Use Cases](#use-cases)
5. [Relationships](#relationships)
6. [Creating Use Case Diagrams](#creating-use-case-diagrams)
7. [Real-World Examples](#real-world-examples)
8. [Best Practices](#best-practices)
9. [Common Mistakes](#common-mistakes)
10. [Interview Questions](#interview-questions)

---

## What is a Use Case Diagram?

**Use Case Diagram** shows the functional requirements of a system by depicting how users (actors) interact with the system to achieve specific goals (use cases).

### Key Definition

> A Use Case Diagram represents the functionality of a system from an external user's point of view, showing what the system does (not how it does it) and who interacts with it.

### Purpose

```mermaid
mindmap
  root((Use Case Diagram))
    Purpose
      Capture Requirements
      Show System Boundary
      Identify Actors
      Define Functionality
    Benefits
      Easy to Understand
      Stakeholder Communication
      Scope Definition
      Test Case Generation
    When to Use
      Requirements Phase
      System Planning
      Feature Documentation
      User Story Mapping
```

### Visual Overview

```mermaid
graph TB
    subgraph "System Boundary"
        UC1((Use Case 1))
        UC2((Use Case 2))
        UC3((Use Case 3))
    end
    
    A[Actor 1] --> UC1
    A --> UC2
    B[Actor 2] --> UC2
    B --> UC3
    
    style UC1 fill:#87CEEB
    style UC2 fill:#87CEEB
    style UC3 fill:#87CEEB
```

---

## Components of Use Case Diagrams

### 1. System Boundary

The rectangle that defines the scope of the system.

```mermaid
graph LR
    subgraph "Online Shopping System"
        A((Browse Products))
        B((Add to Cart))
        C((Checkout))
    end
```

### 2. Actors

External entities that interact with the system.

### 3. Use Cases

Specific functionality or goals users want to achieve.

### 4. Relationships

Connections between actors and use cases, or between use cases.

### Complete Structure

```mermaid
graph TB
    subgraph "System: Library Management"
        UC1((Borrow Book))
        UC2((Return Book))
        UC3((Search Catalog))
        UC4((Manage Books))
        UC5((Calculate Fine))
        UC6((Send Reminder))
    end
    
    M[Member] -->|uses| UC1
    M -->|uses| UC2
    M -->|uses| UC3
    
    L[Librarian] -->|uses| UC4
    
    UC2 -.->|includes| UC5
    UC5 -.->|extends| UC6
```

---

## Actors

### What is an Actor?

An actor represents a role played by an external entity (person, organization, or system) that interacts with the system.

### Types of Actors

```mermaid
graph TD
    A[Actor Types] --> B[Primary Actor]
    A --> C[Secondary Actor]
    A --> D[External System]
    
    B --> B1[Initiates use case]
    B --> B2[Main beneficiary]
    
    C --> C1[Provides service]
    C --> C2[Supporting role]
    
    D --> D1[Another system]
    D --> D2[API/Service]
```

### Actor Notation

```mermaid
graph LR
    A[Customer]
    B[Admin]
    C[Payment Gateway]
    
    style A fill:#FFD700
    style B fill:#FFD700
    style C fill:#90EE90
```

### Example: E-Commerce System Actors

```mermaid
graph TB
    subgraph "Actors"
        P[Customer - Primary]
        G[Guest - Primary]
        A[Admin - Primary]
        V[Vendor - Primary]
        PG[Payment Gateway - Secondary]
        ES[Email Service - Secondary]
        SS[Shipping Service - Secondary]
    end
    
    style P fill:#FFD700
    style G fill:#FFD700
    style A fill:#FFD700
    style V fill:#FFD700
    style PG fill:#90EE90
    style ES fill:#90EE90
    style SS fill:#90EE90
```

### Identifying Actors

**JavaScript Example:**

```javascript
class ActorIdentification {
    constructor(systemName) {
        this.systemName = systemName;
        this.actors = [];
    }
    
    addActor(name, type, description, responsibilities) {
        this.actors.push({
            name,
            type, // 'primary', 'secondary', 'external_system'
            description,
            responsibilities
        });
    }
    
    listActors() {
        console.log(`\n=== Actors for ${this.systemName} ===\n`);
        
        const primary = this.actors.filter(a => a.type === 'primary');
        const secondary = this.actors.filter(a => a.type === 'secondary');
        const external = this.actors.filter(a => a.type === 'external_system');
        
        console.log("PRIMARY ACTORS:");
        primary.forEach(actor => {
            console.log(`  - ${actor.name}: ${actor.description}`);
            console.log(`    Responsibilities: ${actor.responsibilities.join(', ')}`);
        });
        
        console.log("\nSECONDARY ACTORS:");
        secondary.forEach(actor => {
            console.log(`  - ${actor.name}: ${actor.description}`);
        });
        
        console.log("\nEXTERNAL SYSTEMS:");
        external.forEach(actor => {
            console.log(`  - ${actor.name}: ${actor.description}`);
        });
    }
}

// Example: Online Shopping System
const ecommerce = new ActorIdentification("E-Commerce System");

ecommerce.addActor(
    "Customer",
    "primary",
    "Registered user who shops online",
    ["Browse products", "Place orders", "Track shipments", "Write reviews"]
);

ecommerce.addActor(
    "Guest",
    "primary",
    "Non-registered visitor",
    ["Browse products", "Search items", "View details"]
);

ecommerce.addActor(
    "Admin",
    "primary",
    "System administrator",
    ["Manage products", "Process orders", "Handle disputes", "Generate reports"]
);

ecommerce.addActor(
    "Payment Gateway",
    "external_system",
    "Third-party payment processor",
    []
);

ecommerce.addActor(
    "Email Service",
    "secondary",
    "Email notification system",
    []
);

ecommerce.listActors();
```

**Python Example:**

```python
class ActorIdentification:
    def __init__(self, system_name):
        self.system_name = system_name
        self.actors = []
    
    def add_actor(self, name, actor_type, description, responsibilities):
        self.actors.append({
            'name': name,
            'type': actor_type,  # 'primary', 'secondary', 'external_system'
            'description': description,
            'responsibilities': responsibilities
        })
    
    def list_actors(self):
        print(f"\n=== Actors for {self.system_name} ===\n")
        
        primary = [a for a in self.actors if a['type'] == 'primary']
        secondary = [a for a in self.actors if a['type'] == 'secondary']
        external = [a for a in self.actors if a['type'] == 'external_system']
        
        print("PRIMARY ACTORS:")
        for actor in primary:
            print(f"  - {actor['name']}: {actor['description']}")
            print(f"    Responsibilities: {', '.join(actor['responsibilities'])}")
        
        print("\nSECONDARY ACTORS:")
        for actor in secondary:
            print(f"  - {actor['name']}: {actor['description']}")
        
        print("\nEXTERNAL SYSTEMS:")
        for actor in external:
            print(f"  - {actor['name']}: {actor['description']}")

# Example: Online Shopping System
ecommerce = ActorIdentification("E-Commerce System")

ecommerce.add_actor(
    "Customer",
    "primary",
    "Registered user who shops online",
    ["Browse products", "Place orders", "Track shipments", "Write reviews"]
)

ecommerce.add_actor(
    "Guest",
    "primary",
    "Non-registered visitor",
    ["Browse products", "Search items", "View details"]
)

ecommerce.add_actor(
    "Admin",
    "primary",
    "System administrator",
    ["Manage products", "Process orders", "Handle disputes", "Generate reports"]
)

ecommerce.add_actor(
    "Payment Gateway",
    "external_system",
    "Third-party payment processor",
    []
)

ecommerce.add_actor(
    "Email Service",
    "secondary",
    "Email notification system",
    []
)

ecommerce.list_actors()
```

---

## Use Cases

### What is a Use Case?

A use case represents a specific functionality or goal that an actor wants to achieve using the system.

### Use Case Characteristics

```mermaid
graph TD
    A[Use Case] --> B[Specific Goal]
    A --> C[Actor-Initiated]
    A --> D[Observable Result]
    A --> E[Self-Contained]
    
    B --> B1[Clear objective]
    C --> C1[Started by actor]
    D --> D1[Delivers value]
    E --> E1[Complete scenario]
```

### Use Case Template

```javascript
class UseCase {
    constructor(name, id) {
        this.name = name;
        this.id = id;
        this.actors = [];
        this.description = "";
        this.preconditions = [];
        this.postconditions = [];
        this.mainFlow = [];
        this.alternativeFlows = [];
        this.exceptionFlows = [];
    }
    
    addActor(actor) {
        this.actors.push(actor);
    }
    
    setDescription(desc) {
        this.description = desc;
    }
    
    addPrecondition(condition) {
        this.preconditions.push(condition);
    }
    
    addPostcondition(condition) {
        this.postconditions.push(condition);
    }
    
    addMainFlowStep(step) {
        this.mainFlow.push(step);
    }
    
    addAlternativeFlow(name, steps) {
        this.alternativeFlows.push({ name, steps });
    }
    
    addExceptionFlow(name, steps) {
        this.exceptionFlows.push({ name, steps });
    }
    
    display() {
        console.log(`\n${'='.repeat(70)}`);
        console.log(`USE CASE: ${this.name} (${this.id})`);
        console.log('='.repeat(70));
        
        console.log(`\nDescription: ${this.description}`);
        
        console.log(`\nActors: ${this.actors.join(', ')}`);
        
        console.log(`\nPreconditions:`);
        this.preconditions.forEach((p, i) => console.log(`  ${i + 1}. ${p}`));
        
        console.log(`\nMain Flow:`);
        this.mainFlow.forEach((s, i) => console.log(`  ${i + 1}. ${s}`));
        
        if (this.alternativeFlows.length > 0) {
            console.log(`\nAlternative Flows:`);
            this.alternativeFlows.forEach(flow => {
                console.log(`  ${flow.name}:`);
                flow.steps.forEach((s, i) => console.log(`    ${i + 1}. ${s}`));
            });
        }
        
        if (this.exceptionFlows.length > 0) {
            console.log(`\nException Flows:`);
            this.exceptionFlows.forEach(flow => {
                console.log(`  ${flow.name}:`);
                flow.steps.forEach((s, i) => console.log(`    ${i + 1}. ${s}`));
            });
        }
        
        console.log(`\nPostconditions:`);
        this.postconditions.forEach((p, i) => console.log(`  ${i + 1}. ${p}`));
    }
}

// Example: Place Order Use Case
const placeOrder = new UseCase("Place Order", "UC-001");
placeOrder.addActor("Customer");
placeOrder.setDescription("Customer places an order for products in their cart");

placeOrder.addPrecondition("Customer is logged in");
placeOrder.addPrecondition("Cart contains at least one product");
placeOrder.addPrecondition("All products are in stock");

placeOrder.addMainFlowStep("Customer reviews cart items");
placeOrder.addMainFlowStep("Customer selects shipping address");
placeOrder.addMainFlowStep("Customer chooses shipping method");
placeOrder.addMainFlowStep("System calculates total with shipping");
placeOrder.addMainFlowStep("Customer selects payment method");
placeOrder.addMainFlowStep("System processes payment");
placeOrder.addMainFlowStep("System creates order");
placeOrder.addMainFlowStep("System sends confirmation email");
placeOrder.addMainFlowStep("System displays order confirmation");

placeOrder.addAlternativeFlow("Apply Discount Code", [
    "At step 4, customer enters discount code",
    "System validates code",
    "System applies discount",
    "Continue to step 5"
]);

placeOrder.addExceptionFlow("Payment Failed", [
    "At step 6, payment processing fails",
    "System displays error message",
    "Customer can retry or choose different payment method",
    "Return to step 5"
]);

placeOrder.addExceptionFlow("Out of Stock", [
    "At step 6, system detects item out of stock",
    "System notifies customer",
    "Customer removes item or cancels order",
    "Return to step 1 or end"
]);

placeOrder.addPostcondition("Order is created with unique ID");
placeOrder.addPostcondition("Inventory is updated");
placeOrder.addPostcondition("Confirmation email is sent");
placeOrder.addPostcondition("Payment is processed");

placeOrder.display();
```

---

## Relationships

### Types of Relationships

```mermaid
graph TD
    A[Relationships] --> B[Association]
    A --> C[Include]
    A --> D[Extend]
    A --> E[Generalization]
    
    B --> B1[Actor to Use Case]
    B --> B2[Solid line with arrow]
    
    C --> C1[Mandatory shared behavior]
    C --> C2[Dashed arrow with include]
    
    D --> D1[Optional additional behavior]
    D --> D2[Dashed arrow with extend]
    
    E --> E1[Actor inheritance]
    E --> E2[Use case specialization]
```

### 1. Association

Direct interaction between actor and use case.

```mermaid
graph LR
    A[Customer] -->|uses| B((Place Order))
    A -->|uses| C((Track Order))
```

### 2. Include Relationship

One use case always includes another (mandatory).

```mermaid
graph TB
    A((Place Order))
    B((Process Payment))
    C((Update Inventory))
    
    A -.->|includes| B
    A -.->|includes| C
```

**JavaScript Example:**

```javascript
class UseCaseWithInclude {
    constructor(name) {
        this.name = name;
        this.includedUseCases = [];
    }
    
    include(useCase) {
        this.includedUseCases.push(useCase);
    }
    
    execute() {
        console.log(`\nExecuting: ${this.name}`);
        
        // Execute main use case logic
        console.log(`  - Main logic of ${this.name}`);
        
        // Always execute included use cases
        this.includedUseCases.forEach(uc => {
            console.log(`  - Including: ${uc.name}`);
            uc.execute();
        });
    }
}

// Define use cases
const processPayment = new UseCaseWithInclude("Process Payment");
const updateInventory = new UseCaseWithInclude("Update Inventory");
const sendConfirmation = new UseCaseWithInclude("Send Confirmation");

const placeOrderUC = new UseCaseWithInclude("Place Order");
placeOrderUC.include(processPayment);
placeOrderUC.include(updateInventory);
placeOrderUC.include(sendConfirmation);

// Execute
placeOrderUC.execute();
// Output:
// Executing: Place Order
//   - Main logic of Place Order
//   - Including: Process Payment
//   - Including: Update Inventory
//   - Including: Send Confirmation
```

### 3. Extend Relationship

One use case optionally extends another (conditional).

```mermaid
graph TB
    A((Place Order))
    B((Apply Discount))
    C((Gift Wrap))
    
    B -.->|extends| A
    C -.->|extends| A
```

**JavaScript Example:**

```javascript
class UseCaseWithExtend {
    constructor(name) {
        this.name = name;
        this.extensions = [];
    }
    
    addExtension(useCase, condition) {
        this.extensions.push({ useCase, condition });
    }
    
    execute(context = {}) {
        console.log(`\nExecuting: ${this.name}`);
        console.log(`  - Main flow of ${this.name}`);
        
        // Check and execute extensions if conditions are met
        this.extensions.forEach(({ useCase, condition }) => {
            if (condition(context)) {
                console.log(`  - Extension applied: ${useCase.name}`);
                useCase.execute(context);
            }
        });
    }
}

// Define base use case
const placeOrderBase = new UseCaseWithExtend("Place Order");

// Define extensions
const applyDiscount = new UseCaseWithExtend("Apply Discount");
const giftWrap = new UseCaseWithExtend("Gift Wrap");

// Add extensions with conditions
placeOrderBase.addExtension(
    applyDiscount,
    (ctx) => ctx.hasDiscountCode === true
);

placeOrderBase.addExtension(
    giftWrap,
    (ctx) => ctx.isGift === true
);

// Execute with different contexts
console.log("Scenario 1: Regular order");
placeOrderBase.execute({ hasDiscountCode: false, isGift: false });

console.log("\nScenario 2: Order with discount");
placeOrderBase.execute({ hasDiscountCode: true, isGift: false });

console.log("\nScenario 3: Gift order with discount");
placeOrderBase.execute({ hasDiscountCode: true, isGift: true });
```

### 4. Generalization

Inheritance between actors or use cases.

```mermaid
graph TB
    A[User]
    B[Customer]
    C[Admin]
    
    A --> B
    A --> C
```

---

## Creating Use Case Diagrams

### Step-by-Step Process

```mermaid
graph TD
    A[1. Identify System Boundary] --> B[2. Identify Actors]
    B --> C[3. Identify Use Cases]
    C --> D[4. Define Relationships]
    D --> E[5. Add Details]
    E --> F[6. Review and Refine]
```

### Example: Banking System

```mermaid
graph TB
    subgraph "Banking System"
        UC1((View Balance))
        UC2((Transfer Money))
        UC3((Deposit Money))
        UC4((Withdraw Money))
        UC5((Apply for Loan))
        UC6((Verify Identity))
        UC7((Check Credit Score))
        UC8((Approve Loan))
    end
    
    C[Customer] -->|uses| UC1
    C -->|uses| UC2
    C -->|uses| UC3
    C -->|uses| UC4
    C -->|uses| UC5
    
    T[Teller] -->|uses| UC3
    T -->|uses| UC4
    
    M[Manager] -->|uses| UC8
    
    UC2 -.->|includes| UC6
    UC5 -.->|includes| UC7
    UC8 -.->|extends| UC5
```

**Python Implementation:**

```python
class UseCaseDiagram:
    def __init__(self, system_name):
        self.system_name = system_name
        self.actors = set()
        self.use_cases = set()
        self.associations = []  # (actor, use_case)
        self.includes = []      # (base_uc, included_uc)
        self.extends = []       # (extension_uc, base_uc)
    
    def add_actor(self, actor_name):
        self.actors.add(actor_name)
    
    def add_use_case(self, use_case_name):
        self.use_cases.add(use_case_name)
    
    def add_association(self, actor, use_case):
        self.actors.add(actor)
        self.use_cases.add(use_case)
        self.associations.append((actor, use_case))
    
    def add_include(self, base_uc, included_uc):
        self.use_cases.add(base_uc)
        self.use_cases.add(included_uc)
        self.includes.append((base_uc, included_uc))
    
    def add_extend(self, extension_uc, base_uc):
        self.use_cases.add(extension_uc)
        self.use_cases.add(base_uc)
        self.extends.append((extension_uc, base_uc))
    
    def display(self):
        print(f"\n{'='*70}")
        print(f"USE CASE DIAGRAM: {self.system_name}")
        print('='*70)
        
        print(f"\nACTORS ({len(self.actors)}):")
        for actor in sorted(self.actors):
            print(f"  - {actor}")
        
        print(f"\nUSE CASES ({len(self.use_cases)}):")
        for uc in sorted(self.use_cases):
            print(f"  - {uc}")
        
        print(f"\nASSOCIATIONS ({len(self.associations)}):")
        for actor, uc in self.associations:
            print(f"  - {actor} --> {uc}")
        
        if self.includes:
            print(f"\nINCLUDE RELATIONSHIPS ({len(self.includes)}):")
            for base, included in self.includes:
                print(f"  - {base} <<includes>> {included}")
        
        if self.extends:
            print(f"\nEXTEND RELATIONSHIPS ({len(self.extends)}):")
            for extension, base in self.extends:
                print(f"  - {extension} <<extends>> {base}")

# Create Banking System Use Case Diagram
banking = UseCaseDiagram("Banking System")

# Add associations
banking.add_association("Customer", "View Balance")
banking.add_association("Customer", "Transfer Money")
banking.add_association("Customer", "Deposit Money")
banking.add_association("Customer", "Withdraw Money")
banking.add_association("Customer", "Apply for Loan")

banking.add_association("Teller", "Deposit Money")
banking.add_association("Teller", "Withdraw Money")

banking.add_association("Manager", "Approve Loan")

# Add include relationships
banking.add_include("Transfer Money", "Verify Identity")
banking.add_include("Apply for Loan", "Check Credit Score")

# Add extend relationships
banking.add_extend("Approve Loan", "Apply for Loan")

# Display
banking.display()
```

---

## Real-World Examples

### Example 1: Restaurant Management System

```mermaid
graph TB
    subgraph "Restaurant Management System"
        UC1((Browse Menu))
        UC2((Place Order))
        UC3((Make Reservation))
        UC4((Process Payment))
        UC5((Track Order Status))
        UC6((Manage Menu))
        UC7((View Orders))
        UC8((Update Inventory))
        UC9((Generate Reports))
        UC10((Apply Discount))
    end
    
    CU[Customer] -->|uses| UC1
    CU -->|uses| UC2
    CU -->|uses| UC3
    CU -->|uses| UC5
    
    ST[Staff] -->|uses| UC7
    ST -->|uses| UC8
    
    MG[Manager] -->|uses| UC6
    MG -->|uses| UC9
    
    UC2 -.->|includes| UC4
    UC10 -.->|extends| UC2
```

**JavaScript Implementation:**

```javascript
// Complete Restaurant Management System Use Cases
class RestaurantSystem {
    constructor() {
        this.useCases = new Map();
        this.actors = new Set();
    }
    
    defineUseCase(id, name, actors, description) {
        this.useCases.set(id, {
            name,
            actors,
            description,
            preconditions: [],
            steps: [],
            postconditions: []
        });
        
        actors.forEach(actor => this.actors.add(actor));
    }
    
    demonstrateUseCases() {
        console.log("\n=== Restaurant Management System Use Cases ===\n");
        
        // Customer use cases
        console.log("CUSTOMER USE CASES:");
        console.log("1. Browse Menu - View available dishes and prices");
        console.log("2. Place Order - Order food for dine-in or takeout");
        console.log("3. Make Reservation - Book a table");
        console.log("4. Track Order Status - Check order preparation status");
        
        // Staff use cases
        console.log("\nSTAFF USE CASES:");
        console.log("5. View Orders - See pending and in-progress orders");
        console.log("6. Update Inventory - Manage ingredient stock");
        
        // Manager use cases
        console.log("\nMANAGER USE CASES:");
        console.log("7. Manage Menu - Add/remove/update menu items");
        console.log("8. Generate Reports - Sales, inventory, performance reports");
        
        // System use cases (included)
        console.log("\nSYSTEM USE CASES:");
        console.log("9. Process Payment - Handle payments (included in Place Order)");
        console.log("10. Apply Discount - Optional discount (extends Place Order)");
    }
}

const restaurant = new RestaurantSystem();
restaurant.demonstrateUseCases();
```

### Example 2: Hospital Management System

```mermaid
graph TB
    subgraph "Hospital Management System"
        UC1((Register Patient))
        UC2((Book Appointment))
        UC3((View Medical History))
        UC4((Prescribe Medicine))
        UC5((Order Tests))
        UC6((View Test Results))
        UC7((Process Billing))
        UC8((Manage Staff))
        UC9((Generate Reports))
        UC10((Emergency Admission))
    end
    
    P[Patient] -->|uses| UC1
    P -->|uses| UC2
    P -->|uses| UC3
    P -->|uses| UC6
    
    D[Doctor] -->|uses| UC3
    D -->|uses| UC4
    D -->|uses| UC5
    D -->|uses| UC6
    
    R[Receptionist] -->|uses| UC1
    R -->|uses| UC2
    R -->|uses| UC7
    
    A[Administrator] -->|uses| UC8
    A -->|uses| UC9
    
    UC10 -.->|extends| UC1
```

---

## Best Practices

### 1. Clear Use Case Names

```javascript
// ✅ GOOD: Verb + Noun
const goodNames = [
    "Place Order",
    "Search Products",
    "Update Profile",
    "Cancel Reservation",
    "Generate Report"
];

// ❌ BAD: Vague or technical
const badNames = [
    "Order",              // Missing verb
    "Process",            // Too vague
    "DatabaseUpdate",     // Too technical
    "DoStuff"             // Meaningless
];
```

### 2. Appropriate Granularity

```mermaid
graph LR
    A[❌ Too High Level] --> B["Manage System"]
    
    C[✅ Right Level] --> D["Place Order"]
    C --> E["Update Profile"]
    C --> F["Generate Report"]
    
    G[❌ Too Detailed] --> H["Click Submit Button"]
    G --> I["Validate Email Format"]
```

### 3. Actor Perspective

```javascript
// ✅ GOOD: User's perspective
"Place Order"      // What the user wants to achieve
"Search Products"  // User's goal
"Track Shipment"   // User's need

// ❌ BAD: System perspective
"Process Order"    // System's action
"Query Database"   // Technical detail
"Send Email"       // Implementation
```

### 4. System Boundary

```mermaid
graph TB
    subgraph "✅ Inside System Boundary"
        UC1((Login))
        UC2((Place Order))
        UC3((Process Payment))
    end
    
    A[User] -->|uses| UC1
    A -->|uses| UC2
    UC2 -->|uses| B[Payment Gateway]
    
    note[Payment Gateway is outside - it's an actor, not a use case]
```

### 5. Include vs Extend

```javascript
// ✅ GOOD: Use Include for mandatory behavior
class PlaceOrder {
    execute() {
        this.validateCart();
        this.processPayment();  // Always included - mandatory
        this.updateInventory(); // Always included - mandatory
        this.sendConfirmation(); // Always included - mandatory
    }
}

// ✅ GOOD: Use Extend for optional behavior
class PlaceOrderWithExtensions {
    execute(options = {}) {
        this.validateCart();
        this.processPayment();
        
        // Optional extensions
        if (options.hasGiftWrap) {
            this.applyGiftWrap(); // Extends - optional
        }
        
        if (options.hasDiscount) {
            this.applyDiscount();  // Extends - optional
        }
        
        this.sendConfirmation();
    }
}
```

---

## Common Mistakes

### Mistake 1: Too Many Relationships

```mermaid
graph TB
    A[❌ BAD: Relationship Spaghetti]
    
    subgraph "Confusing"
        UC1((UC1))
        UC2((UC2))
        UC3((UC3))
        UC4((UC4))
    end
    
    UC1 -.-> UC2
    UC2 -.-> UC3
    UC3 -.-> UC4
    UC4 -.-> UC1
    UC1 -.-> UC3
    UC2 -.-> UC4
```

```mermaid
graph TB
    B[✅ GOOD: Clear Relationships]
    
    subgraph "Clear"
        UC5((Place Order))
        UC6((Process Payment))
        UC7((Update Inventory))
    end
    
    UC5 -.->|includes| UC6
    UC5 -.->|includes| UC7
```

### Mistake 2: Implementation Details

```javascript
// ❌ BAD: Technical implementation
const badUseCases = [
    "Execute SQL Query",
    "Call API Endpoint",
    "Update Database Record",
    "Parse JSON Response"
];

// ✅ GOOD: User goals
const goodUseCases = [
    "Search Products",
    "View Order History",
    "Update Profile",
    "Track Shipment"
];
```

### Mistake 3: Missing Actors

```mermaid
graph TB
    A[❌ BAD: Floating Use Cases]
    
    subgraph "System"
        UC1((Process Payment))
        UC2((Send Email))
    end
```

```mermaid
graph TB
    B[✅ GOOD: Connected Actors]
    
    subgraph "System"
        UC3((Place Order))
        UC4((Process Payment))
    end
    
    C[Customer] -->|uses| UC3
    UC3 -.->|includes| UC4
    UC4 -->|uses| D[Payment Gateway]
```

### Mistake 4: Wrong Abstraction Level

```text
❌ BAD: Mixed levels
- Manage System (too high)
- Place Order (good)
- Click Button (too low)

✅ GOOD: Consistent level
- Search Products
- Place Order
- Track Shipment
- Update Profile
```

---

## Interview Questions

### Q1: What is a use case diagram?

**Answer**: A use case diagram is a UML behavioral diagram that shows the functional requirements of a system from an external user's perspective. It depicts actors (users) and use cases (system functionality) and how they interact.

### Q2: What's the difference between an actor and a use case?

**Answer**:
- **Actor**: External entity (person, system) that interacts with the system
- **Use Case**: Specific functionality or goal that the actor wants to achieve

### Q3: When would you use include vs extend relationships?

**Answer**:
- **Include**: When a use case ALWAYS needs another use case (mandatory behavior)
  - Example: "Place Order" always includes "Process Payment"
- **Extend**: When a use case OPTIONALLY adds behavior (conditional)
  - Example: "Apply Discount" optionally extends "Place Order"

### Q4: Can a use case have multiple actors?

**Answer**: Yes! Multiple actors can interact with the same use case. For example, "View Order Status" might be used by both Customer and Admin.

### Q5: What should be inside the system boundary?

**Answer**: Only use cases (system functionality). Actors are always outside the boundary. The boundary defines what the system does, not who uses it.

### Q6: How do you identify actors?

**Answer**:
1. Who uses the system?
2. Who needs information from the system?
3. Who provides information to the system?
4. What external systems interact with it?
5. Who maintains/administers the system?

### Q7: What's the difference between primary and secondary actors?

**Answer**:
- **Primary Actor**: Initiates the use case and receives value (e.g., Customer placing order)
- **Secondary Actor**: Provides supporting service (e.g., Payment Gateway, Email Service)

### Q8: Should you show system internals in use case diagrams?

**Answer**: No! Use case diagrams show WHAT the system does from a user perspective, not HOW it does it internally. Implementation details belong in other diagrams.

---

## Summary

```mermaid
mindmap
  root((Use Case Diagram))
    Components
      Actors
        Primary
        Secondary
        External Systems
      Use Cases
        User Goals
        System Functions
      Relationships
        Association
        Include
        Extend
        Generalization
      System Boundary
    Purpose
      Requirements
      Communication
      Scope Definition
    Best Practices
      Clear Names
      User Perspective
      Right Granularity
      Avoid Implementation
```

---

## Next Steps

1. **Study**: [Class Diagrams](./class-diagram.md)
2. **Study**: [Sequence Diagrams](./sequence-diagram.md)
3. **Practice**: Create use case diagrams for a project you're working on
4. **Exercise**: Identify actors and use cases for common systems (ATM, Library, Hospital)
5. **Review**: Practice converting user stories to use cases

---

**Key Takeaway**: Use case diagrams are the bridge between business requirements and system design. They focus on WHAT the system does from the user's perspective, not HOW it does it. Keep them simple, user-focused, and free of implementation details!

