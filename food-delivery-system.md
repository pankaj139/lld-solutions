# Food Delivery System

## 🔗 Implementation Links

- **Python Implementation**: [python/food-delivery/main.py](python/food-delivery/main.py)
- **JavaScript Implementation**: [javascript/food-delivery/main.js](javascript/food-delivery/main.js)

## Problem Statement

Design a comprehensive Food Delivery System that can:

1. **Manage restaurants** with menus, availability, and ratings
2. **Handle customer orders** with cart management and checkout
3. **Assign delivery agents** to orders efficiently
4. **Track order status** from placed to delivered
5. **Process payments** with multiple payment methods
6. **Calculate delivery fees** based on distance and demand
7. **Manage ratings and reviews** for restaurants and delivery agents
8. **Support real-time tracking** of delivery progress

## Requirements

### Functional Requirements

- Register customers, restaurants, and delivery agents
- Browse restaurants by cuisine, rating, distance
- View restaurant menu with items, prices, and availability
- Add items to cart, update quantities, remove items
- Place order with delivery address
- Calculate order total (items + taxes + delivery fee)
- Assign available delivery agent to order
- Track order status (Placed, Confirmed, Preparing, Out for Delivery, Delivered)
- Process payments (Credit Card, Debit Card, Digital Wallet, Cash on Delivery)
- Rate and review restaurants and delivery agents
- Support order history and reordering

### Non-Functional Requirements

- Order assignment should be < 30 seconds
- Real-time order tracking updates
- Support 10,000+ concurrent orders
- Handle 100,000+ restaurant listings
- 99.9% uptime for order placement
- Secure payment processing
- Scalable for peak hours

## Design Decisions

### Key Classes

1. **User Management**
   - `Customer`: Customer profile and order history
   - `Restaurant`: Restaurant details, menu, ratings
   - `DeliveryAgent`: Agent profile, availability, location

2. **Menu Management**
   - `Menu`: Restaurant menu
   - `MenuItem`: Individual dish with price
   - `Category`: Menu categorization

3. **Order Management**
   - `Cart`: Shopping cart
   - `Order`: Customer order
   - `OrderStatus`: Order state tracking
   - `OrderItem`: Order line item

4. **Delivery Management**
   - `DeliveryAssignment`: Agent-order assignment
   - `Location`: Geographic coordinates
   - `DistanceCalculator`: Distance computation

5. **Payment Management**
   - `Payment`: Payment record
   - `PaymentMethod`: Payment type
   - `PaymentStatus`: Payment state

### Design Patterns Used

1. **State Pattern**: Order status management
2. **Strategy Pattern**: Payment methods, distance calculation
3. **Observer Pattern**: Order status notifications
4. **Factory Pattern**: Order creation
5. **Singleton Pattern**: DeliveryService
6. **Command Pattern**: Order operations
7. **Repository Pattern**: Data access

### Key Features

- **Smart Assignment**: Nearest available agent
- **Dynamic Pricing**: Surge pricing during peak hours
- **Real-Time Tracking**: GPS-based order tracking
- **Rating System**: Reviews for restaurants and agents

## State Diagram

```text
ORDER LIFECYCLE:

PLACED
  ↓ (restaurant_confirms)
CONFIRMED
  ↓ (restaurant_prepares)
PREPARING
  ↓ (assign_delivery_agent)
OUT_FOR_DELIVERY
  ↓ (agent_delivers)
DELIVERED
  ↓ (customer_reviews)
COMPLETED

CANCELLATION FLOW:
ANY_STATE → (cancel) → CANCELLED
```

## Class Diagram

```text
OrderStatus (Enum)
├── PLACED
├── CONFIRMED
├── PREPARING
├── OUT_FOR_DELIVERY
├── DELIVERED
├── CANCELLED
└── COMPLETED

PaymentMethod (Enum)
├── CREDIT_CARD
├── DEBIT_CARD
├── DIGITAL_WALLET
└── CASH_ON_DELIVERY

Customer
├── customer_id: str
├── name: str
├── phone: str
├── addresses: List[Address]
├── order_history: List[Order]
└── place_order(cart, address) → Order

Restaurant
├── restaurant_id: str
├── name: str
├── cuisine: str
├── menu: Menu
├── location: Location
├── rating: float
├── is_open: bool
└── accepts_order() → bool

MenuItem
├── item_id: str
├── name: str
├── description: str
├── price: float
├── available: bool
└── category: str

Cart
├── customer: Customer
├── restaurant: Restaurant
├── items: Dict[MenuItem, int]
├── add_item(item, quantity) → None
├── remove_item(item) → None
└── calculate_total() → float

Order
├── order_id: str
├── customer: Customer
├── restaurant: Restaurant
├── items: List[OrderItem]
├── status: OrderStatus
├── total_amount: float
├── delivery_address: Address
├── payment: Payment
├── delivery_agent: Optional[DeliveryAgent]
├── update_status(status) → None
└── assign_agent(agent) → None

DeliveryAgent
├── agent_id: str
├── name: str
├── phone: str
├── location: Location
├── is_available: bool
├── rating: float
├── accept_order(order) → bool
└── complete_delivery(order) → None

Payment
├── payment_id: str
├── order: Order
├── amount: float
├── method: PaymentMethod
├── status: PaymentStatus
├── process() → bool
└── refund() → bool

DeliveryService (Singleton)
├── customers: Dict[str, Customer]
├── restaurants: Dict[str, Restaurant]
├── agents: Dict[str, DeliveryAgent]
├── orders: Dict[str, Order]
├── place_order(customer_id, cart, address) → Order
├── assign_delivery_agent(order) → DeliveryAgent
├── update_order_status(order_id, status) → None
└── search_restaurants(location, cuisine) → List[Restaurant]
```

## Usage Example

```python
# Initialize service
service = DeliveryService()

# Register customer
customer = Customer("C001", "Alice", "555-1234")
service.register_customer(customer)

# Browse restaurants
restaurants = service.search_restaurants(
    location=customer.location,
    cuisine="Italian"
)

# Add items to cart
cart = Cart(customer, restaurants[0])
cart.add_item(menu_item1, quantity=2)
cart.add_item(menu_item2, quantity=1)

# Place order
order = service.place_order(
    customer_id=customer.customer_id,
    cart=cart,
    address=customer.addresses[0]
)

# Process payment
payment = Payment(order, PaymentMethod.CREDIT_CARD)
payment.process()

# Assign delivery agent
agent = service.assign_delivery_agent(order)

# Update order status
service.update_order_status(order.order_id, OrderStatus.PREPARING)
service.update_order_status(order.order_id, OrderStatus.OUT_FOR_DELIVERY)
service.update_order_status(order.order_id, OrderStatus.DELIVERED)
```

## Business Rules

1. **Order Rules**
   - Minimum order value may apply per restaurant
   - Orders only from open restaurants
   - Delivery address must be within service area
   - Cannot modify order after restaurant confirmation

2. **Pricing Rules**
   - Base delivery fee + distance-based charges
   - Surge pricing during peak hours
   - Platform commission on each order
   - Taxes calculated based on location

3. **Assignment Rules**
   - Nearest available agent gets order
   - Agent can decline if overloaded
   - Backup assignment if first declines
   - Maximum 3 active orders per agent

4. **Rating Rules**
   - Customer can rate after delivery
   - Rating scale: 1-5 stars
   - Reviews require completed orders
   - Average rating updated real-time

## Extension Points

1. **Subscriptions**: Premium memberships
2. **Scheduled Orders**: Order for later
3. **Group Orders**: Multiple customers
4. **Loyalty Programs**: Points and rewards
5. **Live Chat**: Customer-restaurant-agent communication

## Time Complexity

- **Search Restaurants**: O(log n) with indexing
- **Place Order**: O(m) where m is cart items
- **Assign Agent**: O(a) where a is available agents
- **Update Status**: O(1)
- **Calculate Total**: O(m) where m is order items

## Space Complexity

- O(c) for customers
- O(r) for restaurants
- O(a) for agents
- O(o) for active orders
