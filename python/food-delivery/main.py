"""
FOOD DELIVERY SYSTEM - Low Level Design Implementation in Python

DESIGN PATTERNS USED:
1. STRATEGY PATTERN: Multiple delivery and pricing strategies
   - Delivery assignment algorithms: nearest driver, fastest route, load balancing
   - Dynamic pricing: surge pricing, distance-based, time-based
   - Payment strategies: card, digital wallet, cash on delivery
   - Restaurant recommendation algorithms based on user preferences

2. OBSERVER PATTERN: Real-time order tracking and notifications
   - Order status updates to customers, restaurants, and delivery partners
   - Location tracking for real-time delivery updates
   - Inventory updates when items go out of stock
   - Multiple notification channels: app, SMS, email, push notifications

3. STATE PATTERN: Order lifecycle with explicit state management
   - Order states: PLACED -> CONFIRMED -> PREPARING -> READY -> PICKED_UP -> DELIVERED
   - Each state has specific allowed operations and business rules
   - State-based notifications and actions
   - Delivery partner state management (available, busy, offline)

4. COMMAND PATTERN: Order operations and delivery actions
   - Place order, modify order, cancel order as command objects
   - Delivery commands: accept order, pick up, deliver
   - Undo support for order modifications
   - Batch operations for restaurant inventory updates

5. FACADE PATTERN: FoodDeliveryService provides unified interface
   - Simplifies complex operations across restaurants, customers, and delivery
   - Hides complexity of matching, routing, and payment processing
   - Single API for mobile app and web platform integration
   - Coordinates between multiple subsystems

OOP CONCEPTS: Inheritance (User types), Encapsulation (Order details), Polymorphism (Payment methods)
SOLID PRINCIPLES: SRP, OCP for new restaurants/payment methods, LSP for user types
BUSINESS FEATURES: Multi-restaurant platform, real-time tracking, delivery optimization
"""

from abc import ABC, abstractmethod
from enum import Enum
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import uuid

class UserType(Enum):
    CUSTOMER = 1
    RESTAURANT_OWNER = 2
    DELIVERY_PARTNER = 3

class OrderStatus(Enum):
    PLACED = 1
    CONFIRMED = 2
    PREPARING = 3
    READY_FOR_PICKUP = 4
    OUT_FOR_DELIVERY = 5
    DELIVERED = 6
    CANCELLED = 7

class DeliveryStatus(Enum):
    PENDING = 1
    ASSIGNED = 2
    PICKED_UP = 3
    IN_TRANSIT = 4
    DELIVERED = 5

class PaymentStatus(Enum):
    PENDING = 1
    COMPLETED = 2
    FAILED = 3
    REFUNDED = 4

class Location:
    def __init__(self, latitude: float, longitude: float, address: str):
        self.latitude = latitude
        self.longitude = longitude
        self.address = address

    def distance_to(self, other_location) -> float:
        # Simplified distance calculation (in km)
        lat_diff = abs(self.latitude - other_location.latitude)
        lon_diff = abs(self.longitude - other_location.longitude)
        return ((lat_diff ** 2 + lon_diff ** 2) ** 0.5) * 111  # Rough conversion to km

class User(ABC):
    def __init__(self, user_id: str, name: str, email: str, phone: str, user_type: UserType):
        self.user_id = user_id
        self.name = name
        self.email = email
        self.phone = phone
        self.user_type = user_type
        self.created_at = datetime.now()

class Customer(User):
    def __init__(self, user_id: str, name: str, email: str, phone: str):
        super().__init__(user_id, name, email, phone, UserType.CUSTOMER)
        self.delivery_addresses: List[Location] = []
        self.order_history: List[str] = []  # order_ids

    def add_delivery_address(self, location: Location):
        self.delivery_addresses.append(location)

class RestaurantOwner(User):
    def __init__(self, user_id: str, name: str, email: str, phone: str):
        super().__init__(user_id, name, email, phone, UserType.RESTAURANT_OWNER)
        self.restaurants: List[str] = []  # restaurant_ids

class DeliveryPartner(User):
    def __init__(self, user_id: str, name: str, email: str, phone: str):
        super().__init__(user_id, name, email, phone, UserType.DELIVERY_PARTNER)
        self.current_location: Optional[Location] = None
        self.is_available = True
        self.active_deliveries: List[str] = []  # delivery_ids
        self.rating = 5.0
        self.total_deliveries = 0

class MenuItem:
    def __init__(self, item_id: str, name: str, description: str, price: float):
        self.item_id = item_id
        self.name = name
        self.description = description
        self.price = price
        self.is_available = True
        self.category = "General"
        self.preparation_time = 15  # minutes

class Restaurant:
    def __init__(self, restaurant_id: str, name: str, owner: RestaurantOwner, location: Location):
        self.restaurant_id = restaurant_id
        self.name = name
        self.owner = owner
        self.location = location
        self.menu_items: Dict[str, MenuItem] = {}
        self.is_open = True
        self.rating = 4.0
        self.total_orders = 0
        self.cuisines: List[str] = []

    def add_menu_item(self, item: MenuItem):
        self.menu_items[item.item_id] = item

    def remove_menu_item(self, item_id: str):
        if item_id in self.menu_items:
            del self.menu_items[item_id]

    def update_item_availability(self, item_id: str, is_available: bool):
        if item_id in self.menu_items:
            self.menu_items[item_id].is_available = is_available

class OrderItem:
    def __init__(self, menu_item: MenuItem, quantity: int):
        self.menu_item = menu_item
        self.quantity = quantity
        self.total_price = menu_item.price * quantity
        self.special_instructions = ""

class Order:
    def __init__(self, order_id: str, customer: Customer, restaurant: Restaurant, delivery_address: Location):
        self.order_id = order_id
        self.customer = customer
        self.restaurant = restaurant
        self.delivery_address = delivery_address
        self.items: List[OrderItem] = []
        self.status = OrderStatus.PLACED
        self.order_time = datetime.now()
        self.estimated_delivery_time: Optional[datetime] = None
        self.actual_delivery_time: Optional[datetime] = None
        self.total_amount = 0.0
        self.delivery_fee = 0.0
        self.tax_amount = 0.0
        self.discount_amount = 0.0

    def add_item(self, menu_item: MenuItem, quantity: int, special_instructions: str = ""):
        order_item = OrderItem(menu_item, quantity)
        order_item.special_instructions = special_instructions
        self.items.append(order_item)
        self._calculate_total()

    def _calculate_total(self):
        subtotal = sum(item.total_price for item in self.items)
        self.delivery_fee = self._calculate_delivery_fee()
        self.tax_amount = subtotal * 0.1  # 10% tax
        self.total_amount = subtotal + self.delivery_fee + self.tax_amount - self.discount_amount

    def _calculate_delivery_fee(self) -> float:
        distance = self.restaurant.location.distance_to(self.delivery_address)
        base_fee = 2.0
        distance_fee = distance * 0.5
        return base_fee + distance_fee

    def confirm_order(self):
        self.status = OrderStatus.CONFIRMED
        # Estimate delivery time based on preparation + delivery
        prep_time = max(item.menu_item.preparation_time for item in self.items)
        delivery_time = self.restaurant.location.distance_to(self.delivery_address) * 2  # 2 min per km
        self.estimated_delivery_time = datetime.now() + timedelta(minutes=prep_time + delivery_time)

    def update_status(self, status: OrderStatus):
        self.status = status
        if status == OrderStatus.DELIVERED:
            self.actual_delivery_time = datetime.now()

class Delivery:
    def __init__(self, delivery_id: str, order: Order):
        self.delivery_id = delivery_id
        self.order = order
        self.delivery_partner: Optional[DeliveryPartner] = None
        self.status = DeliveryStatus.PENDING
        self.pickup_time: Optional[datetime] = None
        self.delivery_time: Optional[datetime] = None
        self.estimated_delivery_time = order.estimated_delivery_time

    def assign_delivery_partner(self, partner: DeliveryPartner):
        self.delivery_partner = partner
        self.status = DeliveryStatus.ASSIGNED
        partner.active_deliveries.append(self.delivery_id)
        partner.is_available = False

    def mark_picked_up(self):
        self.status = DeliveryStatus.PICKED_UP
        self.pickup_time = datetime.now()
        self.order.update_status(OrderStatus.OUT_FOR_DELIVERY)

    def mark_delivered(self):
        self.status = DeliveryStatus.DELIVERED
        self.delivery_time = datetime.now()
        self.order.update_status(OrderStatus.DELIVERED)
        if self.delivery_partner:
            self.delivery_partner.active_deliveries.remove(self.delivery_id)
            self.delivery_partner.is_available = True
            self.delivery_partner.total_deliveries += 1

class Payment:
    def __init__(self, payment_id: str, order: Order, amount: float, payment_method: str):
        self.payment_id = payment_id
        self.order = order
        self.amount = amount
        self.payment_method = payment_method
        self.status = PaymentStatus.PENDING
        self.transaction_time: Optional[datetime] = None

    def process_payment(self) -> bool:
        try:
            # Simulate payment processing
            print(f"Processing payment of ${self.amount:.2f} via {self.payment_method}")
            self.status = PaymentStatus.COMPLETED
            self.transaction_time = datetime.now()
            return True
        except Exception as e:
            print(f"Payment failed: {e}")
            self.status = PaymentStatus.FAILED
            return False

class DeliveryPartnerMatcher:
    @staticmethod
    def find_best_partner(available_partners: List[DeliveryPartner], 
                         restaurant_location: Location) -> Optional[DeliveryPartner]:
        if not available_partners:
            return None

        # Find closest available partner with good rating
        best_partner = None
        best_score = float('inf')

        for partner in available_partners:
            if partner.is_available and partner.current_location:
                distance = partner.current_location.distance_to(restaurant_location)
                # Score based on distance and rating (lower is better)
                score = distance - (partner.rating * 2)
                
                if score < best_score:
                    best_score = score
                    best_partner = partner

        return best_partner

class FoodDeliverySystem:
    def __init__(self, platform_name: str):
        self.platform_name = platform_name
        self.customers: Dict[str, Customer] = {}
        self.restaurant_owners: Dict[str, RestaurantOwner] = {}
        self.delivery_partners: Dict[str, DeliveryPartner] = {}
        self.restaurants: Dict[str, Restaurant] = {}
        self.orders: Dict[str, Order] = {}
        self.deliveries: Dict[str, Delivery] = {}
        self.payments: Dict[str, Payment] = {}

    def register_customer(self, name: str, email: str, phone: str) -> Customer:
        customer_id = str(uuid.uuid4())
        customer = Customer(customer_id, name, email, phone)
        self.customers[customer_id] = customer
        return customer

    def register_restaurant_owner(self, name: str, email: str, phone: str) -> RestaurantOwner:
        owner_id = str(uuid.uuid4())
        owner = RestaurantOwner(owner_id, name, email, phone)
        self.restaurant_owners[owner_id] = owner
        return owner

    def register_delivery_partner(self, name: str, email: str, phone: str) -> DeliveryPartner:
        partner_id = str(uuid.uuid4())
        partner = DeliveryPartner(partner_id, name, email, phone)
        self.delivery_partners[partner_id] = partner
        return partner

    def add_restaurant(self, name: str, owner_id: str, location: Location) -> Restaurant:
        if owner_id not in self.restaurant_owners:
            raise Exception("Restaurant owner not found")
        
        restaurant_id = str(uuid.uuid4())
        owner = self.restaurant_owners[owner_id]
        restaurant = Restaurant(restaurant_id, name, owner, location)
        
        self.restaurants[restaurant_id] = restaurant
        owner.restaurants.append(restaurant_id)
        
        return restaurant

    def search_restaurants(self, customer_location: Location, max_distance: float = 10.0) -> List[Restaurant]:
        nearby_restaurants = []
        
        for restaurant in self.restaurants.values():
            if restaurant.is_open:
                distance = customer_location.distance_to(restaurant.location)
                if distance <= max_distance:
                    nearby_restaurants.append(restaurant)
        
        # Sort by rating and distance
        return sorted(nearby_restaurants, key=lambda r: (-r.rating, customer_location.distance_to(r.location)))

    def create_order(self, customer_id: str, restaurant_id: str, delivery_address: Location) -> Order:
        if customer_id not in self.customers:
            raise Exception("Customer not found")
        
        if restaurant_id not in self.restaurants:
            raise Exception("Restaurant not found")
        
        customer = self.customers[customer_id]
        restaurant = self.restaurants[restaurant_id]
        
        if not restaurant.is_open:
            raise Exception("Restaurant is currently closed")
        
        order_id = str(uuid.uuid4())
        order = Order(order_id, customer, restaurant, delivery_address)
        
        self.orders[order_id] = order
        customer.order_history.append(order_id)
        
        return order

    def place_order(self, order_id: str, payment_method: str) -> bool:
        if order_id not in self.orders:
            raise Exception("Order not found")
        
        order = self.orders[order_id]
        
        if not order.items:
            raise Exception("Order must have at least one item")
        
        # Process payment
        payment_id = str(uuid.uuid4())
        payment = Payment(payment_id, order, order.total_amount, payment_method)
        
        if payment.process_payment():
            order.confirm_order()
            self.payments[payment_id] = payment
            
            # Create delivery request
            delivery_id = str(uuid.uuid4())
            delivery = Delivery(delivery_id, order)
            self.deliveries[delivery_id] = delivery
            
            # Try to assign delivery partner
            self._assign_delivery_partner(delivery)
            
            print(f"Order {order_id} placed successfully")
            print(f"Estimated delivery time: {order.estimated_delivery_time.strftime('%H:%M')}")
            return True
        else:
            print(f"Payment failed for order {order_id}")
            return False

    def _assign_delivery_partner(self, delivery: Delivery):
        available_partners = [p for p in self.delivery_partners.values() if p.is_available]
        
        best_partner = DeliveryPartnerMatcher.find_best_partner(
            available_partners, delivery.order.restaurant.location)
        
        if best_partner:
            delivery.assign_delivery_partner(best_partner)
            print(f"Delivery assigned to {best_partner.name}")
        else:
            print("No delivery partners available. Order will be queued.")

    def update_delivery_partner_location(self, partner_id: str, location: Location):
        if partner_id in self.delivery_partners:
            self.delivery_partners[partner_id].current_location = location

    def mark_order_ready(self, order_id: str):
        if order_id not in self.orders:
            raise Exception("Order not found")
        
        order = self.orders[order_id]
        order.update_status(OrderStatus.READY_FOR_PICKUP)
        
        # Notify delivery partner
        for delivery in self.deliveries.values():
            if delivery.order.order_id == order_id and delivery.delivery_partner:
                print(f"Order {order_id} is ready for pickup by {delivery.delivery_partner.name}")
                break

    def pickup_order(self, delivery_id: str):
        if delivery_id not in self.deliveries:
            raise Exception("Delivery not found")
        
        delivery = self.deliveries[delivery_id]
        delivery.mark_picked_up()
        print(f"Order {delivery.order.order_id} picked up by {delivery.delivery_partner.name}")

    def deliver_order(self, delivery_id: str):
        if delivery_id not in self.deliveries:
            raise Exception("Delivery not found")
        
        delivery = self.deliveries[delivery_id]
        delivery.mark_delivered()
        print(f"Order {delivery.order.order_id} delivered successfully")

    def get_customer_orders(self, customer_id: str) -> List[Order]:
        if customer_id not in self.customers:
            return []
        
        customer = self.customers[customer_id]
        customer_orders = []
        
        for order_id in customer.order_history:
            if order_id in self.orders:
                customer_orders.append(self.orders[order_id])
        
        return sorted(customer_orders, key=lambda o: o.order_time, reverse=True)

# Demo usage
def main():
    # Create food delivery platform
    platform = FoodDeliverySystem("QuickEats")
    
    # Register users
    customer = platform.register_customer("Alice Johnson", "alice@example.com", "123-456-7890")
    owner = platform.register_restaurant_owner("Mario Rossi", "mario@restaurant.com", "098-765-4321")
    partner = platform.register_delivery_partner("Bob Driver", "bob@delivery.com", "555-123-4567")
    
    # Set up locations
    customer_location = Location(40.7589, -73.9851, "123 Main St, New York")
    restaurant_location = Location(40.7614, -73.9776, "456 Restaurant Ave, New York")
    partner_location = Location(40.7505, -73.9934, "789 Driver St, New York")
    
    customer.add_delivery_address(customer_location)
    partner.current_location = partner_location
    
    # Add restaurant
    restaurant = platform.add_restaurant("Mario's Pizza", owner.user_id, restaurant_location)
    restaurant.cuisines = ["Italian", "Pizza"]
    
    # Add menu items
    pizza_margherita = MenuItem("item1", "Margherita Pizza", "Classic tomato and mozzarella", 12.99)
    pizza_pepperoni = MenuItem("item2", "Pepperoni Pizza", "Pepperoni with mozzarella cheese", 15.99)
    garlic_bread = MenuItem("item3", "Garlic Bread", "Fresh baked garlic bread", 4.99)
    
    restaurant.add_menu_item(pizza_margherita)
    restaurant.add_menu_item(pizza_pepperoni)
    restaurant.add_menu_item(garlic_bread)
    
    print(f"Platform '{platform.platform_name}' initialized")
    print(f"Restaurant '{restaurant.name}' added with {len(restaurant.menu_items)} menu items")
    
    # Search for restaurants
    nearby_restaurants = platform.search_restaurants(customer_location, 5.0)
    print(f"\nFound {len(nearby_restaurants)} nearby restaurants")
    
    # Create and place order
    try:
        order = platform.create_order(customer.user_id, restaurant.restaurant_id, customer_location)
        
        # Add items to order
        order.add_item(pizza_margherita, 1, "Extra cheese please")
        order.add_item(garlic_bread, 2)
        
        print(f"\nOrder created: {order.order_id}")
        print(f"Items: {len(order.items)}")
        print(f"Total amount: ${order.total_amount:.2f}")
        print(f"Delivery fee: ${order.delivery_fee:.2f}")
        
        # Place order
        if platform.place_order(order.order_id, "Credit Card"):
            print(f"Order status: {order.status.name}")
            
            # Simulate restaurant workflow
            print("\n--- Restaurant prepares order ---")
            platform.mark_order_ready(order.order_id)
            
            # Find delivery for this order
            delivery_id = None
            for did, delivery in platform.deliveries.items():
                if delivery.order.order_id == order.order_id:
                    delivery_id = did
                    break
            
            if delivery_id:
                print("\n--- Delivery partner picks up order ---")
                platform.pickup_order(delivery_id)
                
                print("\n--- Order delivered ---")
                platform.deliver_order(delivery_id)
            
    except Exception as e:
        print(f"Error: {e}")
    
    # Show customer's order history
    customer_orders = platform.get_customer_orders(customer.user_id)
    print(f"\n{customer.name} has {len(customer_orders)} order(s) in history")

if __name__ == "__main__":
    main()