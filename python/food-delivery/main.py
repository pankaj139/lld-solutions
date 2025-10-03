"""
FOOD DELIVERY SYSTEM - Low Level Design Implementation

FILE PURPOSE:
Implements food delivery platform with restaurants, orders, and delivery agents

DESIGN PATTERNS: State, Strategy, Observer, Factory, Singleton, Command, Repository
OOP CONCEPTS: Encapsulation, Inheritance, Polymorphism, Abstraction

USAGE:
service = DeliveryService()
customer = Customer("C001", "Alice")
cart = Cart(customer, restaurant)
order = service.place_order(customer.customer_id, cart, address)
"""

from enum import Enum
from typing import List, Optional, Dict
from dataclasses import dataclass


class OrderStatus(Enum):
    PLACED = "placed"
    CONFIRMED = "confirmed"
    PREPARING = "preparing"
    OUT_FOR_DELIVERY = "out_for_delivery"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"


class PaymentMethod(Enum):
    CREDIT_CARD = "credit_card"
    DEBIT_CARD = "debit_card"
    DIGITAL_WALLET = "digital_wallet"
    CASH_ON_DELIVERY = "cash_on_delivery"


@dataclass
class Location:
    latitude: float
    longitude: float


@dataclass
class Address:
    street: str
    city: str
    zipcode: str


class MenuItem:
    def __init__(self, item_id: str, name: str, price: float):
        self.item_id = item_id
        self.name = name
        self.price = price
        self.available = True


class Restaurant:
    def __init__(self, restaurant_id: str, name: str, cuisine: str):
        self.restaurant_id = restaurant_id
        self.name = name
        self.cuisine = cuisine
        self.menu_items: List[MenuItem] = []
        self.location = Location(0.0, 0.0)
        self.rating = 4.5
        self.is_open = True


class Cart:
    def __init__(self, customer: 'Customer', restaurant: Restaurant):
        self.customer = customer
        self.restaurant = restaurant
        self.items: Dict[MenuItem, int] = {}
    
    def add_item(self, item: MenuItem, quantity: int = 1):
        self.items[item] = self.items.get(item, 0) + quantity
    
    def calculate_total(self) -> float:
        return sum(item.price * qty for item, qty in self.items.items())


class Customer:
    def __init__(self, customer_id: str, name: str):
        self.customer_id = customer_id
        self.name = name
        self.phone = ""
        self.addresses: List[Address] = []
        self.order_history: List['Order'] = []


class DeliveryAgent:
    def __init__(self, agent_id: str, name: str):
        self.agent_id = agent_id
        self.name = name
        self.location = Location(0.0, 0.0)
        self.is_available = True
        self.rating = 4.8


class Payment:
    def __init__(self, order: 'Order', method: PaymentMethod):
        self.payment_id = f"PAY{id(self)}"
        self.order = order
        self.amount = order.total_amount
        self.method = method
        self.processed = False
    
    def process(self) -> bool:
        self.processed = True
        print(f"✓ Payment processed: ${self.amount:.2f} via {self.method.value}")
        return True


class Order:
    def __init__(self, order_id: str, customer: Customer, restaurant: Restaurant, cart: Cart):
        self.order_id = order_id
        self.customer = customer
        self.restaurant = restaurant
        self.items = list(cart.items.items())
        self.status = OrderStatus.PLACED
        self.total_amount = cart.calculate_total() + 5.0  # +delivery fee
        self.delivery_agent: Optional[DeliveryAgent] = None
        self.payment: Optional[Payment] = None
    
    def update_status(self, status: OrderStatus):
        self.status = status
        print(f"📦 Order {self.order_id}: {status.value}")
    
    def assign_agent(self, agent: DeliveryAgent):
        self.delivery_agent = agent
        agent.is_available = False
        print(f"🚗 Assigned agent: {agent.name}")


class DeliveryService:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        
        self.customers: Dict[str, Customer] = {}
        self.restaurants: Dict[str, Restaurant] = {}
        self.agents: Dict[str, DeliveryAgent] = {}
        self.orders: Dict[str, Order] = {}
        self.order_counter = 0
        self._initialized = True
    
    def register_customer(self, customer: Customer):
        self.customers[customer.customer_id] = customer
        print(f"✓ Registered customer: {customer.name}")
    
    def register_restaurant(self, restaurant: Restaurant):
        self.restaurants[restaurant.restaurant_id] = restaurant
        print(f"✓ Registered restaurant: {restaurant.name}")
    
    def register_agent(self, agent: DeliveryAgent):
        self.agents[agent.agent_id] = agent
        print(f"✓ Registered agent: {agent.name}")
    
    def place_order(self, customer_id: str, cart: Cart, address: Address) -> Optional[Order]:
        customer = self.customers.get(customer_id)
        if not customer or not cart.restaurant.is_open:
            print("✗ Cannot place order")
            return None
        
        order_id = f"ORD{self.order_counter:04d}"
        self.order_counter += 1
        
        order = Order(order_id, customer, cart.restaurant, cart)
        self.orders[order_id] = order
        customer.order_history.append(order)
        
        print(f"✓ Order placed: {order_id} at {cart.restaurant.name}")
        print(f"  Total: ${order.total_amount:.2f}")
        
        return order
    
    def assign_delivery_agent(self, order: Order) -> Optional[DeliveryAgent]:
        for agent in self.agents.values():
            if agent.is_available:
                order.assign_agent(agent)
                return agent
        
        print("✗ No agents available")
        return None
    
    def update_order_status(self, order_id: str, status: OrderStatus):
        order = self.orders.get(order_id)
        if order:
            order.update_status(status)


def main():
    print("=" * 70)
    print("FOOD DELIVERY SYSTEM - Low Level Design Demo")
    print("=" * 70)
    
    service = DeliveryService()
    
    # Register entities
    print("\n👥 Registering Entities...")
    customer = Customer("C001", "Alice Johnson")
    service.register_customer(customer)
    
    restaurant = Restaurant("R001", "Pizza Palace", "Italian")
    item1 = MenuItem("I001", "Margherita Pizza", 12.99)
    item2 = MenuItem("I002", "Garlic Bread", 4.99)
    restaurant.menu_items = [item1, item2]
    service.register_restaurant(restaurant)
    
    agent = DeliveryAgent("A001", "Bob Driver")
    service.register_agent(agent)
    
    # Create cart and order
    print("\n🛒 Creating Cart...")
    cart = Cart(customer, restaurant)
    cart.add_item(item1, 2)
    cart.add_item(item2, 1)
    print(f"Cart total: ${cart.calculate_total():.2f}")
    
    # Place order
    print("\n📤 Placing Order...")
    address = Address("123 Main St", "NYC", "10001")
    order = service.place_order(customer.customer_id, cart, address)
    
    # Process payment
    print("\n💳 Processing Payment...")
    payment = Payment(order, PaymentMethod.CREDIT_CARD)
    payment.process()
    order.payment = payment
    
    # Order lifecycle
    print("\n📦 Order Lifecycle...")
    service.update_order_status(order.order_id, OrderStatus.CONFIRMED)
    service.update_order_status(order.order_id, OrderStatus.PREPARING)
    
    service.assign_delivery_agent(order)
    service.update_order_status(order.order_id, OrderStatus.OUT_FOR_DELIVERY)
    service.update_order_status(order.order_id, OrderStatus.DELIVERED)
    
    print("\n" + "=" * 70)
    print("DEMO COMPLETE")
    print("=" * 70)


if __name__ == "__main__":
    main()

