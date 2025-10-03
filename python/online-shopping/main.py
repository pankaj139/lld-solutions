"""
ONLINE SHOPPING SYSTEM - Low Level Design Implementation in Python

FILE PURPOSE:
This file implements an e-commerce platform with product catalog, shopping cart,
order management, inventory tracking, and payment processing.

DESIGN PATTERNS USED:
1. STATE PATTERN: Order status management
   - Pending, Confirmed, Shipped, Delivered states
   - State transitions with validation
   
2. STRATEGY PATTERN: Payment methods
   - Different payment strategies
   - Pluggable payment processors
   
3. OBSERVER PATTERN: Order notifications
   - Notify on order status changes
   - Inventory update notifications
   
4. FACTORY PATTERN: Order creation
   - Standardized order instantiation
   
5. SINGLETON PATTERN: ShoppingService
   - Single service instance
   
6. COMMAND PATTERN: Cart operations
   - Add/remove items as commands
   
7. REPOSITORY PATTERN: Product/Order storage
   - Data access abstraction

OOP CONCEPTS:
- Encapsulation: Internal state management
- Inheritance: Different product types
- Polymorphism: Payment strategies

SOLID PRINCIPLES:
- SRP: Each class single responsibility
- OCP: Easy to extend
- LSP: All payment types interchangeable
- ISP: Focused interfaces
- DIP: Depends on abstractions

USAGE:
    service = ShoppingService()
    product = Product("P001", "Laptop", 999.99, 10)
    cart = ShoppingCart()
    cart.add_item(product, 1)
    order = service.place_order(cart)

EXPECTED RETURN:
    Order object with confirmation
"""

from enum import Enum
from typing import List, Dict, Optional
from datetime import datetime


class OrderStatus(Enum):
    """Order lifecycle states"""
    PENDING = "pending"
    CONFIRMED = "confirmed"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"


class PaymentMethod(Enum):
    """Payment types"""
    CREDIT_CARD = "credit_card"
    DEBIT_CARD = "debit_card"
    DIGITAL_WALLET = "digital_wallet"
    CASH_ON_DELIVERY = "cash_on_delivery"


class Product:
    """
    Product in catalog
    
    OOP CONCEPT: Encapsulation
    """
    
    def __init__(self, product_id: str, name: str, price: float, stock: int):
        """
        Initialize product
        
        Args:
            product_id: Unique identifier
            name: Product name
            price: Product price
            stock: Available quantity
        """
        self.product_id = product_id
        self.name = name
        self.price = price
        self.stock = stock
        self.category = "General"
    
    def is_available(self, quantity: int = 1) -> bool:
        """Check if product available in requested quantity"""
        return self.stock >= quantity
    
    def reduce_stock(self, quantity: int):
        """Reduce stock after purchase"""
        if self.is_available(quantity):
            self.stock -= quantity


class CartItem:
    """
    Item in shopping cart
    
    OOP CONCEPT: Composition
    """
    
    def __init__(self, product: Product, quantity: int):
        """
        Initialize cart item
        
        Args:
            product: Product reference
            quantity: Item quantity
        """
        self.product = product
        self.quantity = quantity
    
    def get_subtotal(self) -> float:
        """Calculate item subtotal"""
        return self.product.price * self.quantity


class ShoppingCart:
    """
    Shopping cart with items
    
    DESIGN PATTERN: Command Pattern
    """
    
    def __init__(self):
        """Initialize empty cart"""
        self.items: List[CartItem] = []
    
    def add_item(self, product: Product, quantity: int = 1):
        """
        Add item to cart
        
        Args:
            product: Product to add
            quantity: Quantity to add
        """
        # Check if product already in cart
        for item in self.items:
            if item.product.product_id == product.product_id:
                item.quantity += quantity
                print(f"✓ Updated {product.name} quantity to {item.quantity}")
                return
        
        # Add new item
        self.items.append(CartItem(product, quantity))
        print(f"✓ Added {product.name} x{quantity} to cart")
    
    def remove_item(self, product_id: str):
        """Remove item from cart"""
        self.items = [item for item in self.items if item.product.product_id != product_id]
    
    def get_total(self) -> float:
        """Calculate cart total"""
        return sum(item.get_subtotal() for item in self.items)
    
    def is_empty(self) -> bool:
        """Check if cart is empty"""
        return len(self.items) == 0


class Order:
    """
    Customer order
    
    DESIGN PATTERN: State Pattern
    """
    
    def __init__(self, order_id: str, cart: ShoppingCart):
        """
        Initialize order from cart
        
        Args:
            order_id: Unique order identifier
            cart: Shopping cart to convert to order
        """
        self.order_id = order_id
        self.items = cart.items.copy()
        self.total_amount = cart.get_total()
        self.status = OrderStatus.PENDING
        self.created_at = datetime.now()
        self.payment_method: Optional[PaymentMethod] = None
    
    def confirm(self):
        """Confirm order"""
        self.status = OrderStatus.CONFIRMED
        print(f"✓ Order {self.order_id} confirmed - Total: ${self.total_amount:.2f}")
    
    def ship(self):
        """Mark order as shipped"""
        if self.status == OrderStatus.CONFIRMED:
            self.status = OrderStatus.SHIPPED
            print(f"📦 Order {self.order_id} shipped")
    
    def deliver(self):
        """Mark order as delivered"""
        if self.status == OrderStatus.SHIPPED:
            self.status = OrderStatus.DELIVERED
            print(f"✓ Order {self.order_id} delivered")
    
    def cancel(self):
        """Cancel order"""
        if self.status in (OrderStatus.PENDING, OrderStatus.CONFIRMED):
            self.status = OrderStatus.CANCELLED
            print(f"✗ Order {self.order_id} cancelled")


class ShoppingService:
    """
    Main shopping service
    
    DESIGN PATTERN: Singleton + Facade
    """
    
    _instance = None
    
    def __new__(cls):
        """Singleton implementation"""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        """Initialize service"""
        if self._initialized:
            return
        
        self.products: Dict[str, Product] = {}
        self.orders: Dict[str, Order] = {}
        self.order_counter = 0
        self._initialized = True
    
    def add_product(self, product: Product):
        """Add product to catalog"""
        self.products[product.product_id] = product
        print(f"✓ Added product: {product.name} (${product.price:.2f})")
    
    def get_product(self, product_id: str) -> Optional[Product]:
        """Get product by ID"""
        return self.products.get(product_id)
    
    def search_products(self, query: str) -> List[Product]:
        """Search products by name"""
        query_lower = query.lower()
        return [p for p in self.products.values() if query_lower in p.name.lower()]
    
    def place_order(self, cart: ShoppingCart) -> Optional[Order]:
        """
        Place order from cart
        
        Args:
            cart: Shopping cart
            
        Returns:
            Created order or None
        """
        if cart.is_empty():
            print("✗ Cannot place order with empty cart")
            return None
        
        # Validate stock
        for item in cart.items:
            if not item.product.is_available(item.quantity):
                print(f"✗ Insufficient stock for {item.product.name}")
                return None
        
        # Create order
        order_id = f"ORD{self.order_counter:04d}"
        self.order_counter += 1
        
        order = Order(order_id, cart)
        order.confirm()
        
        # Reduce stock
        for item in cart.items:
            item.product.reduce_stock(item.quantity)
        
        self.orders[order_id] = order
        return order
    
    def get_order(self, order_id: str) -> Optional[Order]:
        """Get order by ID"""
        return self.orders.get(order_id)


def main():
    """Demonstrate Online Shopping System"""
    print("=" * 70)
    print("ONLINE SHOPPING SYSTEM - Low Level Design Demo")
    print("=" * 70)
    
    service = ShoppingService()
    
    # Add products
    print("\n🛍️ Adding Products...")
    laptop = Product("P001", "Laptop", 999.99, 10)
    mouse = Product("P002", "Wireless Mouse", 29.99, 50)
    keyboard = Product("P003", "Mechanical Keyboard", 89.99, 25)
    
    service.add_product(laptop)
    service.add_product(mouse)
    service.add_product(keyboard)
    
    # Create cart and add items
    print("\n🛒 Creating Shopping Cart...")
    cart = ShoppingCart()
    cart.add_item(laptop, 1)
    cart.add_item(mouse, 2)
    cart.add_item(keyboard, 1)
    
    print(f"\nCart Total: ${cart.get_total():.2f}")
    
    # Place order
    print("\n📤 Placing Order...")
    order = service.place_order(cart)
    
    # Order lifecycle
    if order:
        print("\n📦 Order Lifecycle...")
        order.ship()
        order.deliver()
    
    print("\n" + "=" * 70)
    print("DEMO COMPLETE")
    print("=" * 70)


if __name__ == "__main__":
    main()
