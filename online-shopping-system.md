# Online Shopping System

## 🔗 Implementation Links

- **Python Implementation**: [python/online-shopping/main.py](python/online-shopping/main.py)
- **JavaScript Implementation**: [javascript/online-shopping/main.js](javascript/online-shopping/main.js)

## Problem Statement

Design a comprehensive e-commerce platform with product catalog management, shopping cart functionality, order processing, inventory tracking, payment integration, and customer management that can handle millions of products and thousands of concurrent users.

## Requirements

### Functional Requirements

- Browse product catalog with search and filters
- Add/remove items from shopping cart
- Update cart item quantities
- View cart total with tax calculation
- Checkout with multiple payment methods
- Track order status (Pending, Confirmed, Shipped, Delivered)
- Manage product inventory (stock levels)
- Apply discount codes and promotions
- Generate order invoices
- Support multiple shipping addresses
- Handle returns and refunds
- Rate and review products
- Save items to wishlist

### Non-Functional Requirements

- Support 1 million+ products
- Handle 100,000 concurrent users
- Checkout process < 3 seconds
- 99.99% availability
- Real-time inventory updates
- Secure payment processing (PCI DSS compliant)
- Scalable horizontally
- ACID transactions for orders

## Design Decisions

### Key Classes

1. **Product Management**
   - `Product`: Product with details and inventory
   - `ProductCategory`: Product categorization
   - `ProductCatalog`: Searchable product repository
   - `Inventory`: Stock tracking

2. **Shopping Cart**
   - `ShoppingCart`: User's cart with items
   - `CartItem`: Product with quantity in cart
   - `CartSession`: Temporary cart storage

3. **Order Management**
   - `Order`: Customer order with items
   - `OrderItem`: Product in order with price snapshot
   - `OrderStatus`: Order lifecycle states
   - `Invoice`: Order billing document

4. **Payment Processing**
   - `Payment`: Payment transaction
   - `PaymentMethod`: Payment types
   - `PaymentGateway`: Payment processor interface

5. **User Management**
   - `Customer`: User account
   - `Address`: Shipping/billing addresses
   - `Wishlist`: Saved items

6. **Service Layer**
   - `ShoppingService`: Main service (Singleton)
   - `OrderProcessor`: Order handling
   - `InventoryManager`: Stock management

### Design Patterns Used

1. **State Pattern**: Order status management
   - Pending → Confirmed → Shipped → Delivered
   - State-specific operations
   - Clean transitions

2. **Strategy Pattern**: Payment processing
   - Different payment gateways
   - Pluggable payment methods
   - Easy to add providers

3. **Observer Pattern**: Inventory notifications
   - Stock level alerts
   - Out-of-stock notifications
   - Price change alerts

4. **Factory Pattern**: Order creation
   - Standardized order generation
   - Different order types
   - Configuration-based

5. **Singleton Pattern**: Service instances
   - Single catalog instance
   - Single order processor
   - Resource management

6. **Command Pattern**: Cart operations
   - Add/remove as commands
   - Undo capability
   - History tracking

7. **Repository Pattern**: Data access
   - Product repository
   - Order repository
   - Clean abstraction

### Key Features

- **Smart Search**: Full-text search with filters
- **Real-Time Inventory**: Prevent overselling
- **Cart Persistence**: Save cart across sessions
- **Multiple Payments**: Credit card, PayPal, etc.
- **Order Tracking**: Real-time status updates

## State Diagram

```text
ORDER LIFECYCLE:

CART
  ↓ (checkout)
PENDING (payment processing)
  ├─→ (payment_success) → CONFIRMED
  │                         ↓ (warehouse_processes)
  │                       PREPARING
  │                         ↓ (shipped)
  │                       SHIPPED
  │                         ↓ (delivered)
  │                       DELIVERED
  │                         ↓ (customer_accepts)
  │                       COMPLETED
  ├─→ (payment_failure) → PAYMENT_FAILED
  │                         ↓ (retry_payment)
  │                       PENDING
  └─→ (cancel) → CANCELLED

DELIVERED
  ↓ (return_request)
RETURN_REQUESTED
  ↓ (approve)
RETURNED → REFUND_PROCESSED
```

## Class Diagram

```text
OrderStatus (Enum)
├── PENDING
├── CONFIRMED
├── PREPARING
├── SHIPPED
├── DELIVERED
├── COMPLETED
├── CANCELLED
└── RETURNED

PaymentMethod (Enum)
├── CREDIT_CARD
├── DEBIT_CARD
├── PAYPAL
├── DIGITAL_WALLET
└── CASH_ON_DELIVERY

Product
├── product_id: str
├── name: str
├── description: str
├── price: float
├── stock: int
├── category: str
├── rating: float
├── is_available(quantity) → bool
└── reduce_stock(quantity) → None

CartItem
├── product: Product
├── quantity: int
└── get_subtotal() → float

ShoppingCart
├── cart_id: str
├── customer: Customer
├── items: List[CartItem]
├── add_item(product, quantity) → None
├── remove_item(product_id) → None
├── update_quantity(product_id, quantity) → None
├── get_total() → float
└── is_empty() → bool

Order
├── order_id: str
├── customer: Customer
├── items: List[OrderItem]
├── status: OrderStatus
├── total_amount: float
├── shipping_address: Address
├── payment: Payment
├── created_at: datetime
├── confirm() → None
├── ship() → None
├── deliver() → None
└── cancel() → None

Payment
├── payment_id: str
├── order: Order
├── amount: float
├── method: PaymentMethod
├── status: PaymentStatus
├── transaction_id: str
├── process() → bool
└── refund() → bool

Customer
├── customer_id: str
├── name: str
├── email: str
├── addresses: List[Address]
├── order_history: List[Order]
└── wishlist: List[Product]

ShoppingService (Singleton)
├── products: Dict[str, Product]
├── orders: Dict[str, Order]
├── customers: Dict[str, Customer]
├── add_product(product) → None
├── search_products(query) → List[Product]
├── place_order(cart) → Order
├── get_order(order_id) → Order
└── update_inventory(product_id, quantity) → None
```

## Usage Example

```python
# Initialize service
service = ShoppingService()

# Add products
laptop = Product("P001", "Laptop", 999.99, 10)
service.add_product(laptop)

# Create cart
cart = ShoppingCart()
cart.add_item(laptop, 1)
cart.add_item(mouse, 2)

# View cart
print(f"Cart Total: ${cart.get_total():.2f}")

# Place order
order = service.place_order(cart)

# Process payment
payment = Payment(order, PaymentMethod.CREDIT_CARD)
if payment.process():
    order.confirm()

# Track order
order.ship()
order.deliver()

# Order history
orders = customer.order_history
```

## Business Rules

1. **Inventory Rules**
   - Cannot order more than available stock
   - Stock reserved during checkout
   - Stock released if payment fails
   - Low stock alerts at 10% threshold

2. **Pricing Rules**
   - Prices fixed at order placement
   - Tax calculated based on shipping address
   - Shipping costs added to total
   - Discounts applied before tax

3. **Cart Rules**
   - Cart expires after 24 hours
   - Maximum 50 items per cart
   - Minimum order value may apply
   - Quantity limited per product

4. **Order Rules**
   - Cannot modify after confirmation
   - Cancellation allowed before shipping
   - Returns within 30 days
   - Refund processed in 7-10 days

5. **Payment Rules**
   - Payment gateway timeout: 10 minutes
   - Retry failed payments 3 times
   - Refund to original payment method
   - Partial refunds supported

## Extension Points

1. **Recommendations**: AI-based product recommendations
2. **Subscriptions**: Recurring orders
3. **Auctions**: Bidding functionality
4. **Flash Sales**: Limited-time offers
5. **Gift Cards**: Digital gift cards
6. **Loyalty Program**: Points and rewards
7. **Multi-Vendor**: Marketplace platform
8. **Social Shopping**: Share with friends

## Security Considerations

- **PCI DSS Compliance**: Secure payment handling
- **HTTPS Only**: Encrypted communication
- **Input Validation**: Prevent injection attacks
- **Rate Limiting**: Prevent cart spam
- **Fraud Detection**: Suspicious order detection
- **Data Privacy**: GDPR compliance
- **Session Security**: Secure cart sessions

## Time Complexity

- **Search Products**: O(log n) with indexing
- **Add to Cart**: O(1) for add, O(m) for total where m is cart items
- **Place Order**: O(m) where m is cart items
- **Update Inventory**: O(1) with hash map
- **Check Stock**: O(1) direct lookup
- **Payment Processing**: O(1) for API call

## Space Complexity

- O(p) for products where p is total products
- O(c) for customers
- O(o) for orders
- O(cart) for active carts
- O(inventory) for stock tracking
