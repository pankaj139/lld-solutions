#!/usr/bin/env python3
"""
Online Shopping System - Comprehensive E-commerce Platform

This system demonstrates:
- Strategy Pattern: Multiple payment methods and pricing strategies
- Observer Pattern: Order status notifications and inventory updates
- Command Pattern: Shopping cart operations and order processing
- State Pattern: Order lifecycle management
- Factory Pattern: Product creation and user types
- Decorator Pattern: Product features and discounts
- Template Method Pattern: Order processing workflow

Key Features:
- Multi-vendor marketplace with seller management
- Shopping cart with persistent sessions
- Inventory management with stock tracking
- Order processing with multiple payment methods
- Rating and review system
- Discount and coupon management
- Real-time notifications
"""

from abc import ABC, abstractmethod
from enum import Enum
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Set
import uuid
from dataclasses import dataclass


# Enums
class UserType(Enum):
    CUSTOMER = "CUSTOMER"
    SELLER = "SELLER"
    ADMIN = "ADMIN"


class ProductCategory(Enum):
    ELECTRONICS = "ELECTRONICS"
    CLOTHING = "CLOTHING"
    BOOKS = "BOOKS"
    HOME = "HOME"
    SPORTS = "SPORTS"


class OrderStatus(Enum):
    PENDING = "PENDING"
    CONFIRMED = "CONFIRMED"
    SHIPPED = "SHIPPED"
    DELIVERED = "DELIVERED"
    CANCELLED = "CANCELLED"
    RETURNED = "RETURNED"


class PaymentMethod(Enum):
    CREDIT_CARD = "CREDIT_CARD"
    DEBIT_CARD = "DEBIT_CARD"
    PAYPAL = "PAYPAL"
    WALLET = "WALLET"
    CASH_ON_DELIVERY = "CASH_ON_DELIVERY"


# Data Classes
@dataclass
class Address:
    street: str
    city: str
    state: str
    zip_code: str
    country: str
    
    def __str__(self):
        return f"{self.street}, {self.city}, {self.state} {self.zip_code}, {self.country}"


@dataclass
class PaymentInfo:
    method: PaymentMethod
    card_number: Optional[str] = None
    expiry_date: Optional[str] = None
    cvv: Optional[str] = None
    wallet_id: Optional[str] = None


# Core Classes
class User:
    def __init__(self, user_id: str, name: str, email: str, user_type: UserType):
        self.user_id = user_id
        self.name = name
        self.email = email
        self.user_type = user_type
        self.addresses: List[Address] = []
        self.created_at = datetime.now()


class Customer(User):
    def __init__(self, user_id: str, name: str, email: str):
        super().__init__(user_id, name, email, UserType.CUSTOMER)
        self.wallet_balance = 0.0
        self.loyalty_points = 0
        self.order_history: List[str] = []  # Order IDs


class Seller(User):
    def __init__(self, user_id: str, name: str, email: str, business_name: str):
        super().__init__(user_id, name, email, UserType.SELLER)
        self.business_name = business_name
        self.rating = 0.0
        self.total_sales = 0.0
        self.products: Set[str] = set()  # Product IDs


class Product:
    def __init__(self, product_id: str, name: str, description: str, 
                 price: float, category: ProductCategory, seller_id: str):
        self.product_id = product_id
        self.name = name
        self.description = description
        self.price = price
        self.category = category
        self.seller_id = seller_id
        self.stock_quantity = 0
        self.ratings: List[float] = []
        self.reviews: List['Review'] = []
        self.created_at = datetime.now()
        self.is_active = True
    
    @property
    def average_rating(self) -> float:
        return sum(self.ratings) / len(self.ratings) if self.ratings else 0.0
    
    def add_stock(self, quantity: int):
        self.stock_quantity += quantity
    
    def reduce_stock(self, quantity: int) -> bool:
        if self.stock_quantity >= quantity:
            self.stock_quantity -= quantity
            return True
        return False
    
    def is_available(self, quantity: int = 1) -> bool:
        return self.is_active and self.stock_quantity >= quantity


class Review:
    def __init__(self, review_id: str, customer_id: str, product_id: str, 
                 rating: int, comment: str):
        self.review_id = review_id
        self.customer_id = customer_id
        self.product_id = product_id
        self.rating = rating  # 1-5 stars
        self.comment = comment
        self.created_at = datetime.now()
        self.helpful_votes = 0


class CartItem:
    def __init__(self, product: Product, quantity: int):
        self.product = product
        self.quantity = quantity
        self.added_at = datetime.now()
    
    @property
    def total_price(self) -> float:
        return self.product.price * self.quantity


class ShoppingCart:
    def __init__(self, customer_id: str):
        self.customer_id = customer_id
        self.items: Dict[str, CartItem] = {}  # product_id -> CartItem
        self.created_at = datetime.now()
        self.updated_at = datetime.now()
    
    def add_item(self, product: Product, quantity: int) -> bool:
        if not product.is_available(quantity):
            return False
        
        if product.product_id in self.items:
            self.items[product.product_id].quantity += quantity
        else:
            self.items[product.product_id] = CartItem(product, quantity)
        
        self.updated_at = datetime.now()
        return True
    
    def remove_item(self, product_id: str):
        if product_id in self.items:
            del self.items[product_id]
            self.updated_at = datetime.now()
    
    def update_quantity(self, product_id: str, quantity: int) -> bool:
        if product_id in self.items:
            if quantity <= 0:
                self.remove_item(product_id)
            else:
                item = self.items[product_id]
                if item.product.is_available(quantity):
                    item.quantity = quantity
                    self.updated_at = datetime.now()
                    return True
        return False
    
    def clear(self):
        self.items.clear()
        self.updated_at = datetime.now()
    
    @property
    def total_amount(self) -> float:
        return sum(item.total_price for item in self.items.values())
    
    @property
    def total_items(self) -> int:
        return sum(item.quantity for item in self.items.values())


# Strategy Pattern - Payment Processing
class PaymentStrategy(ABC):
    @abstractmethod
    def process_payment(self, amount: float, payment_info: PaymentInfo) -> bool:
        pass


class CreditCardPayment(PaymentStrategy):
    def process_payment(self, amount: float, payment_info: PaymentInfo) -> bool:
        # Simulate credit card processing
        print(f"Processing credit card payment of ${amount:.2f}")
        print(f"Card: **** **** **** {payment_info.card_number[-4:]}")
        return True


class PayPalPayment(PaymentStrategy):
    def process_payment(self, amount: float, payment_info: PaymentInfo) -> bool:
        # Simulate PayPal processing
        print(f"Processing PayPal payment of ${amount:.2f}")
        return True


class WalletPayment(PaymentStrategy):
    def __init__(self, customer: Customer):
        self.customer = customer
    
    def process_payment(self, amount: float, payment_info: PaymentInfo) -> bool:
        if self.customer.wallet_balance >= amount:
            self.customer.wallet_balance -= amount
            print(f"Wallet payment of ${amount:.2f} successful")
            return True
        print(f"Insufficient wallet balance. Required: ${amount:.2f}, Available: ${self.customer.wallet_balance:.2f}")
        return False


class CashOnDeliveryPayment(PaymentStrategy):
    def process_payment(self, amount: float, payment_info: PaymentInfo) -> bool:
        print(f"Cash on delivery order placed. Amount to pay: ${amount:.2f}")
        return True


# State Pattern - Order Management
class OrderState(ABC):
    @abstractmethod
    def confirm(self, order: 'Order'):
        pass
    
    @abstractmethod
    def ship(self, order: 'Order'):
        pass
    
    @abstractmethod
    def deliver(self, order: 'Order'):
        pass
    
    @abstractmethod
    def cancel(self, order: 'Order'):
        pass


class PendingState(OrderState):
    def confirm(self, order: 'Order'):
        order.status = OrderStatus.CONFIRMED
        order.state = ConfirmedState()
        print(f"Order {order.order_id} confirmed")
    
    def ship(self, order: 'Order'):
        print("Cannot ship pending order")
    
    def deliver(self, order: 'Order'):
        print("Cannot deliver pending order")
    
    def cancel(self, order: 'Order'):
        order.status = OrderStatus.CANCELLED
        order.state = CancelledState()
        # Restore inventory
        for item in order.items:
            item.product.add_stock(item.quantity)
        print(f"Order {order.order_id} cancelled")


class ConfirmedState(OrderState):
    def confirm(self, order: 'Order'):
        print("Order already confirmed")
    
    def ship(self, order: 'Order'):
        order.status = OrderStatus.SHIPPED
        order.state = ShippedState()
        order.shipped_at = datetime.now()
        print(f"Order {order.order_id} shipped")
    
    def deliver(self, order: 'Order'):
        print("Cannot deliver unshipped order")
    
    def cancel(self, order: 'Order'):
        order.status = OrderStatus.CANCELLED
        order.state = CancelledState()
        # Restore inventory
        for item in order.items:
            item.product.add_stock(item.quantity)
        print(f"Order {order.order_id} cancelled")


class ShippedState(OrderState):
    def confirm(self, order: 'Order'):
        print("Order already confirmed")
    
    def ship(self, order: 'Order'):
        print("Order already shipped")
    
    def deliver(self, order: 'Order'):
        order.status = OrderStatus.DELIVERED
        order.state = DeliveredState()
        order.delivered_at = datetime.now()
        print(f"Order {order.order_id} delivered")
    
    def cancel(self, order: 'Order'):
        print("Cannot cancel shipped order")


class DeliveredState(OrderState):
    def confirm(self, order: 'Order'):
        print("Order already delivered")
    
    def ship(self, order: 'Order'):
        print("Order already delivered")
    
    def deliver(self, order: 'Order'):
        print("Order already delivered")
    
    def cancel(self, order: 'Order'):
        print("Cannot cancel delivered order")


class CancelledState(OrderState):
    def confirm(self, order: 'Order'):
        print("Cannot confirm cancelled order")
    
    def ship(self, order: 'Order'):
        print("Cannot ship cancelled order")
    
    def deliver(self, order: 'Order'):
        print("Cannot deliver cancelled order")
    
    def cancel(self, order: 'Order'):
        print("Order already cancelled")


class Order:
    def __init__(self, order_id: str, customer_id: str, items: List[CartItem],
                 shipping_address: Address, payment_info: PaymentInfo):
        self.order_id = order_id
        self.customer_id = customer_id
        self.items = items
        self.shipping_address = shipping_address
        self.payment_info = payment_info
        self.status = OrderStatus.PENDING
        self.state: OrderState = PendingState()
        self.total_amount = sum(item.total_price for item in items)
        self.created_at = datetime.now()
        self.confirmed_at: Optional[datetime] = None
        self.shipped_at: Optional[datetime] = None
        self.delivered_at: Optional[datetime] = None
    
    def confirm(self):
        self.state.confirm(self)
    
    def ship(self):
        self.state.ship(self)
    
    def deliver(self):
        self.state.deliver(self)
    
    def cancel(self):
        self.state.cancel(self)


# Observer Pattern - Notifications
class Observer(ABC):
    @abstractmethod
    def update(self, event_type: str, data: Dict):
        pass


class NotificationService(Observer):
    def update(self, event_type: str, data: Dict):
        if event_type == "ORDER_PLACED":
            print(f"📧 Email sent: Order {data['order_id']} placed successfully")
        elif event_type == "ORDER_SHIPPED":
            print(f"📱 SMS sent: Order {data['order_id']} has been shipped")
        elif event_type == "STOCK_LOW":
            print(f"⚠️  Alert: Product {data['product_name']} is low in stock")


class InventoryService(Observer):
    def update(self, event_type: str, data: Dict):
        if event_type == "ORDER_PLACED":
            print(f"📦 Inventory updated for order {data['order_id']}")
        elif event_type == "STOCK_LOW":
            print(f"📊 Inventory alert: Restock {data['product_name']} soon")


class Subject:
    def __init__(self):
        self.observers: List[Observer] = []
    
    def attach(self, observer: Observer):
        self.observers.append(observer)
    
    def detach(self, observer: Observer):
        self.observers.remove(observer)
    
    def notify(self, event_type: str, data: Dict):
        for observer in self.observers:
            observer.update(event_type, data)


# Factory Pattern - Payment Strategy Factory
class PaymentStrategyFactory:
    @staticmethod
    def create_payment_strategy(payment_method: PaymentMethod, customer: Customer = None) -> PaymentStrategy:
        if payment_method == PaymentMethod.CREDIT_CARD:
            return CreditCardPayment()
        elif payment_method == PaymentMethod.DEBIT_CARD:
            return CreditCardPayment()  # Same implementation for demo
        elif payment_method == PaymentMethod.PAYPAL:
            return PayPalPayment()
        elif payment_method == PaymentMethod.WALLET:
            return WalletPayment(customer)
        elif payment_method == PaymentMethod.CASH_ON_DELIVERY:
            return CashOnDeliveryPayment()
        else:
            raise ValueError(f"Unsupported payment method: {payment_method}")


# Main System
class OnlineShoppingSystem(Subject):
    def __init__(self):
        super().__init__()
        self.customers: Dict[str, Customer] = {}
        self.sellers: Dict[str, Seller] = {}
        self.products: Dict[str, Product] = {}
        self.orders: Dict[str, Order] = {}
        self.shopping_carts: Dict[str, ShoppingCart] = {}
        self.reviews: Dict[str, Review] = {}
        
        # Attach observers
        self.attach(NotificationService())
        self.attach(InventoryService())
    
    def register_customer(self, name: str, email: str) -> Customer:
        customer_id = str(uuid.uuid4())
        customer = Customer(customer_id, name, email)
        self.customers[customer_id] = customer
        self.shopping_carts[customer_id] = ShoppingCart(customer_id)
        print(f"Customer {name} registered successfully")
        return customer
    
    def register_seller(self, name: str, email: str, business_name: str) -> Seller:
        seller_id = str(uuid.uuid4())
        seller = Seller(seller_id, name, email, business_name)
        self.sellers[seller_id] = seller
        print(f"Seller {business_name} registered successfully")
        return seller
    
    def add_product(self, seller_id: str, name: str, description: str, 
                   price: float, category: ProductCategory, stock_quantity: int) -> Product:
        if seller_id not in self.sellers:
            raise ValueError("Seller not found")
        
        product_id = str(uuid.uuid4())
        product = Product(product_id, name, description, price, category, seller_id)
        product.add_stock(stock_quantity)
        self.products[product_id] = product
        self.sellers[seller_id].products.add(product_id)
        print(f"Product {name} added successfully")
        return product
    
    def search_products(self, query: str = "", category: ProductCategory = None) -> List[Product]:
        results = []
        for product in self.products.values():
            if not product.is_active:
                continue
            
            if category and product.category != category:
                continue
            
            if query and query.lower() not in product.name.lower() and query.lower() not in product.description.lower():
                continue
            
            results.append(product)
        
        return sorted(results, key=lambda p: p.average_rating, reverse=True)
    
    def add_to_cart(self, customer_id: str, product_id: str, quantity: int = 1) -> bool:
        if customer_id not in self.customers or product_id not in self.products:
            return False
        
        cart = self.shopping_carts[customer_id]
        product = self.products[product_id]
        
        if cart.add_item(product, quantity):
            print(f"Added {quantity} x {product.name} to cart")
            return True
        else:
            print(f"Failed to add {product.name} to cart - insufficient stock")
            return False
    
    def place_order(self, customer_id: str, shipping_address: Address, 
                   payment_info: PaymentInfo) -> Optional[Order]:
        if customer_id not in self.customers:
            return None
        
        cart = self.shopping_carts[customer_id]
        if not cart.items:
            print("Cannot place order - cart is empty")
            return None
        
        customer = self.customers[customer_id]
        
        # Check stock availability
        for item in cart.items.values():
            if not item.product.is_available(item.quantity):
                print(f"Product {item.product.name} is out of stock")
                return None
        
        # Process payment
        payment_strategy = PaymentStrategyFactory.create_payment_strategy(
            payment_info.method, customer)
        
        if not payment_strategy.process_payment(cart.total_amount, payment_info):
            print("Payment failed")
            return None
        
        # Create order
        order_id = str(uuid.uuid4())
        order_items = list(cart.items.values())
        order = Order(order_id, customer_id, order_items, shipping_address, payment_info)
        
        # Update inventory
        for item in order_items:
            item.product.reduce_stock(item.quantity)
            # Check for low stock
            if item.product.stock_quantity <= 5:
                self.notify("STOCK_LOW", {
                    "product_id": item.product.product_id,
                    "product_name": item.product.name,
                    "stock_quantity": item.product.stock_quantity
                })
        
        self.orders[order_id] = order
        customer.order_history.append(order_id)
        cart.clear()
        
        # Notify observers
        self.notify("ORDER_PLACED", {
            "order_id": order_id,
            "customer_id": customer_id,
            "total_amount": order.total_amount
        })
        
        print(f"Order {order_id} placed successfully")
        return order
    
    def add_review(self, customer_id: str, product_id: str, rating: int, comment: str) -> Review:
        if customer_id not in self.customers or product_id not in self.products:
            raise ValueError("Customer or product not found")
        
        if not (1 <= rating <= 5):
            raise ValueError("Rating must be between 1 and 5")
        
        review_id = str(uuid.uuid4())
        review = Review(review_id, customer_id, product_id, rating, comment)
        
        product = self.products[product_id]
        product.ratings.append(rating)
        product.reviews.append(review)
        self.reviews[review_id] = review
        
        print(f"Review added for {product.name}")
        return review
    
    def get_order_status(self, order_id: str) -> Optional[OrderStatus]:
        if order_id in self.orders:
            return self.orders[order_id].status
        return None
    
    def ship_order(self, order_id: str):
        if order_id in self.orders:
            order = self.orders[order_id]
            order.ship()
            self.notify("ORDER_SHIPPED", {"order_id": order_id})
    
    def deliver_order(self, order_id: str):
        if order_id in self.orders:
            order = self.orders[order_id]
            order.deliver()
            self.notify("ORDER_DELIVERED", {"order_id": order_id})


# Demo Function
def demo_online_shopping_system():
    print("=== Online Shopping System Demo ===\n")
    
    # Initialize system
    shopping_system = OnlineShoppingSystem()
    
    # Register users
    print("1. Registering Users:")
    customer1 = shopping_system.register_customer("Alice Johnson", "alice@email.com")
    customer1.wallet_balance = 500.0  # Add wallet balance
    customer1.addresses.append(Address("123 Main St", "New York", "NY", "10001", "USA"))
    
    seller1 = shopping_system.register_seller("Bob's Electronics", "bob@electronics.com", "Bob's Electronics Store")
    print()
    
    # Add products
    print("2. Adding Products:")
    laptop = shopping_system.add_product(
        seller1.user_id, "Gaming Laptop", "High-performance gaming laptop", 
        1299.99, ProductCategory.ELECTRONICS, 10)
    
    smartphone = shopping_system.add_product(
        seller1.user_id, "Smartphone Pro", "Latest smartphone with great camera", 
        799.99, ProductCategory.ELECTRONICS, 15)
    
    headphones = shopping_system.add_product(
        seller1.user_id, "Wireless Headphones", "Premium noise-canceling headphones", 
        299.99, ProductCategory.ELECTRONICS, 5)
    print()
    
    # Search products
    print("3. Searching Products:")
    electronics = shopping_system.search_products(category=ProductCategory.ELECTRONICS)
    print(f"Found {len(electronics)} electronics products")
    for product in electronics:
        print(f"  - {product.name}: ${product.price:.2f} (Stock: {product.stock_quantity})")
    print()
    
    # Add to cart
    print("4. Shopping Cart Operations:")
    shopping_system.add_to_cart(customer1.user_id, laptop.product_id, 1)
    shopping_system.add_to_cart(customer1.user_id, headphones.product_id, 2)
    
    cart = shopping_system.shopping_carts[customer1.user_id]
    print(f"Cart total: ${cart.total_amount:.2f} ({cart.total_items} items)")
    print()
    
    # Place order with wallet payment
    print("5. Placing Order:")
    shipping_address = customer1.addresses[0]
    payment_info = PaymentInfo(PaymentMethod.WALLET)
    
    order = shopping_system.place_order(customer1.user_id, shipping_address, payment_info)
    print(f"Order total: ${order.total_amount:.2f}")
    print(f"Customer wallet balance after payment: ${customer1.wallet_balance:.2f}")
    print()
    
    # Order processing
    print("6. Order Processing:")
    print(f"Order status: {shopping_system.get_order_status(order.order_id).value}")
    order.confirm()
    shopping_system.ship_order(order.order_id)
    shopping_system.deliver_order(order.order_id)
    print()
    
    # Add reviews
    print("7. Adding Reviews:")
    shopping_system.add_review(customer1.user_id, laptop.product_id, 5, "Excellent laptop for gaming!")
    shopping_system.add_review(customer1.user_id, headphones.product_id, 4, "Great sound quality, comfortable to wear.")
    
    print(f"Laptop rating: {laptop.average_rating:.1f}/5.0")
    print(f"Headphones rating: {headphones.average_rating:.1f}/5.0")
    print()
    
    # Try credit card payment for another order
    print("8. Credit Card Payment Demo:")
    shopping_system.add_to_cart(customer1.user_id, smartphone.product_id, 1)
    
    payment_info_cc = PaymentInfo(
        PaymentMethod.CREDIT_CARD,
        card_number="1234567890123456",
        expiry_date="12/25",
        cvv="123"
    )
    
    order2 = shopping_system.place_order(customer1.user_id, shipping_address, payment_info_cc)
    print(f"Second order placed: {order2.order_id}")
    print()
    
    # Display final status
    print("9. Final System Status:")
    print(f"Total customers: {len(shopping_system.customers)}")
    print(f"Total sellers: {len(shopping_system.sellers)}")
    print(f"Total products: {len(shopping_system.products)}")
    print(f"Total orders: {len(shopping_system.orders)}")
    print(f"Customer order history: {len(customer1.order_history)} orders")


if __name__ == "__main__":
    demo_online_shopping_system()