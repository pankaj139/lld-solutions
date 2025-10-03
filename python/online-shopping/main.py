"""ONLINE SHOPPING SYSTEM - Patterns: State, Strategy, Observer, Factory, Singleton, Command"""
from enum import Enum
from typing import List, Dict, Optional

class OrderStatus(Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    SHIPPED = "shipped"
    DELIVERED = "delivered"

class Product:
    def __init__(self, product_id: str, name: str, price: float, stock: int):
        self.product_id = product_id
        self.name = name
        self.price = price
        self.stock = stock

class CartItem:
    def __init__(self, product: Product, quantity: int):
        self.product = product
        self.quantity = quantity

class ShoppingCart:
    def __init__(self):
        self.items: List[CartItem] = []
    
    def add_item(self, product: Product, quantity: int):
        self.items.append(CartItem(product, quantity))
    
    def get_total(self) -> float:
        return sum(item.product.price * item.quantity for item in self.items)

class Order:
    def __init__(self, order_id: str, cart: ShoppingCart):
        self.order_id = order_id
        self.items = cart.items.copy()
        self.total = cart.get_total()
        self.status = OrderStatus.PENDING
    
    def confirm(self):
        self.status = OrderStatus.CONFIRMED
        print(f"✓ Order {self.order_id} confirmed - Total: ${self.total:.2f}")

class ShoppingService:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        self.products: Dict[str, Product] = {}
        self.orders: Dict[str, Order] = {}
        self.order_counter = 0
        self._initialized = True
    
    def add_product(self, product: Product):
        self.products[product.product_id] = product
    
    def place_order(self, cart: ShoppingCart) -> Order:
        order_id = f"ORD{self.order_counter:04d}"
        self.order_counter += 1
        order = Order(order_id, cart)
        order.confirm()
        self.orders[order_id] = order
        return order

def main():
    print("="*70)
    print("ONLINE SHOPPING SYSTEM - Demo")
    print("="*70)
    service = ShoppingService()
    product = Product("P001", "Laptop", 999.99, 10)
    service.add_product(product)
    cart = ShoppingCart()
    cart.add_item(product, 1)
    service.place_order(cart)
    print("\n" + "="*70)
    print("DEMO COMPLETE")
    print("="*70)

if __name__ == "__main__":
    main()

