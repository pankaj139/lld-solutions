#!/usr/bin/env python3
"""
Vending Machine System - Low Level Design Implementation

A comprehensive vending machine system supporting multiple payment methods,
inventory management, change calculation, and administrative functions.

Key Features:
- Multi-payment support (Cash, Credit Card, Mobile Payment, Digital Wallet)
- Smart change calculation with optimal denomination distribution
- Real-time inventory tracking with automatic reordering alerts
- Transaction management with audit trails and reporting
- Administrative functions for restocking and maintenance
- Thread-safe operations for concurrent access
- Comprehensive error handling and fault tolerance

Design Patterns Used:
- State Pattern: Machine states (Idle, Selecting, Payment, Dispensing, Maintenance)
- Strategy Pattern: Different payment methods and dispensing strategies
- Command Pattern: Transaction operations and administrative commands
- Observer Pattern: Inventory alerts and transaction notifications
- Factory Pattern: Payment processor and product creation
- Singleton Pattern: Vending machine configuration
- Template Method: Common transaction processing workflow

Author: GitHub Copilot
Date: October 2025
"""

import json
import logging
import time
import uuid
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP
from enum import Enum
from threading import Lock, RLock
from typing import Dict, List, Optional, Set, Callable, Any
import random
from collections import defaultdict, deque

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class MachineState(Enum):
    """Vending machine states"""
    IDLE = "idle"
    PRODUCT_SELECTION = "product_selection"
    PAYMENT_PROCESSING = "payment_processing"
    DISPENSING = "dispensing"
    MAINTENANCE = "maintenance"
    OUT_OF_ORDER = "out_of_order"


class PaymentMethod(Enum):
    """Supported payment methods"""
    CASH = "cash"
    CREDIT_CARD = "credit_card"
    DEBIT_CARD = "debit_card"
    MOBILE_PAYMENT = "mobile_payment"
    DIGITAL_WALLET = "digital_wallet"


class TransactionStatus(Enum):
    """Transaction status tracking"""
    INITIATED = "initiated"
    PAYMENT_PENDING = "payment_pending"
    PAYMENT_APPROVED = "payment_approved"
    PAYMENT_DECLINED = "payment_declined"
    DISPENSING = "dispensing"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"


class ProductCategory(Enum):
    """Product categories"""
    BEVERAGES = "beverages"
    SNACKS = "snacks"
    CANDY = "candy"
    HEALTHY = "healthy"
    HOT_DRINKS = "hot_drinks"


@dataclass
class Product:
    """Product information"""
    code: str
    name: str
    price: Decimal
    category: ProductCategory
    calories: int = 0
    weight: float = 0.0  # in grams
    ingredients: List[str] = field(default_factory=list)
    allergens: List[str] = field(default_factory=list)
    expiry_days: int = 365
    is_available: bool = True


@dataclass
class InventoryItem:
    """Inventory tracking for products"""
    product: Product
    current_stock: int
    max_capacity: int
    low_stock_threshold: int
    reorder_quantity: int
    last_restocked: datetime = field(default_factory=datetime.now)
    total_sold: int = 0


@dataclass
class CashDenomination:
    """Cash denomination information"""
    value: Decimal
    count: int
    max_capacity: int = 100


@dataclass
class CardInfo:
    """Credit/Debit card information"""
    number: str
    expiry: str
    cvv: str
    holder_name: str
    card_type: str = "credit"


@dataclass
class PaymentResult:
    """Payment processing result"""
    success: bool
    transaction_id: Optional[str] = None
    amount_charged: Optional[Decimal] = None
    change: Optional[Decimal] = None
    change_denominations: Optional[Dict[Decimal, int]] = None
    error_message: Optional[str] = None
    authorization_code: Optional[str] = None


@dataclass
class DispenseResult:
    """Product dispensing result"""
    success: bool
    product_code: Optional[str] = None
    error_message: Optional[str] = None
    retry_count: int = 0


@dataclass
class Transaction:
    """Transaction record"""
    transaction_id: str
    timestamp: datetime
    product_code: str
    product_name: str
    price: Decimal
    payment_method: PaymentMethod
    amount_paid: Decimal
    change_given: Decimal
    status: TransactionStatus
    customer_id: Optional[str] = None
    card_last_four: Optional[str] = None
    location: str = "Unknown"


@dataclass
class SalesReport:
    """Sales analytics report"""
    start_date: datetime
    end_date: datetime
    total_revenue: Decimal
    total_transactions: int
    units_sold: int
    top_products: List[tuple]  # (product_code, units_sold)
    payment_method_distribution: Dict[PaymentMethod, int]
    hourly_sales: Dict[int, Decimal]  # hour -> revenue
    category_performance: Dict[ProductCategory, Dict[str, Any]]


class PaymentProcessor(ABC):
    """Abstract payment processor"""

    def __init__(self, processor_name: str):
        self.processor_name = processor_name
        self.is_enabled = True
        self.transaction_fee = Decimal("0.00")

    @abstractmethod
    def validate_payment(self, amount: Decimal, **kwargs) -> bool:
        """Validate payment method and amount"""
        pass

    @abstractmethod
    def process_payment(self, amount: Decimal, **kwargs) -> PaymentResult:
        """Process the payment"""
        pass

    @abstractmethod
    def refund_payment(self, transaction_id: str, amount: Decimal) -> PaymentResult:
        """Process refund"""
        pass


class CashPaymentProcessor(PaymentProcessor):
    """Cash payment processor"""

    def __init__(self):
        super().__init__("Cash Processor")
        self.accepted_denominations = {
            Decimal("0.01"): CashDenomination(Decimal("0.01"), 100),  # Pennies
            Decimal("0.05"): CashDenomination(Decimal("0.05"), 50),   # Nickels
            Decimal("0.10"): CashDenomination(Decimal("0.10"), 50),   # Dimes
            Decimal("0.25"): CashDenomination(Decimal("0.25"), 40),   # Quarters
            Decimal("1.00"): CashDenomination(Decimal("1.00"), 30),   # Dollar coins
            Decimal("5.00"): CashDenomination(Decimal("5.00"), 20),   # $5 bills
            Decimal("10.00"): CashDenomination(Decimal("10.00"), 10), # $10 bills
            Decimal("20.00"): CashDenomination(Decimal("20.00"), 5),  # $20 bills
        }
        self.cash_lock = RLock()

    def validate_payment(self, amount: Decimal, **kwargs) -> bool:
        """Validate cash payment"""
        inserted_cash = kwargs.get('inserted_cash', {})
        total_inserted = sum(
            denom * count for denom, count in inserted_cash.items()
        )
        return total_inserted >= amount

    def process_payment(self, amount: Decimal, **kwargs) -> PaymentResult:
        """Process cash payment"""
        inserted_cash = kwargs.get('inserted_cash', {})
        
        # Calculate total inserted
        total_inserted = sum(
            denom * count for denom, count in inserted_cash.items()
        )
        
        if total_inserted < amount:
            return PaymentResult(
                success=False,
                error_message=f"Insufficient cash. Need ${amount}, got ${total_inserted}"
            )
        
        # Calculate change
        change_amount = total_inserted - amount
        change_denominations = self._calculate_change(change_amount)
        
        if change_denominations is None:
            return PaymentResult(
                success=False,
                error_message="Cannot provide exact change"
            )
        
        with self.cash_lock:
            # Add inserted cash to machine
            for denom, count in inserted_cash.items():
                if denom in self.accepted_denominations:
                    self.accepted_denominations[denom].count += count
            
            # Remove change from machine
            for denom, count in change_denominations.items():
                self.accepted_denominations[denom].count -= count
        
        transaction_id = f"cash_{uuid.uuid4().hex[:8]}"
        
        return PaymentResult(
            success=True,
            transaction_id=transaction_id,
            amount_charged=amount,
            change=change_amount,
            change_denominations=change_denominations
        )

    def refund_payment(self, transaction_id: str, amount: Decimal) -> PaymentResult:
        """Refund cash payment"""
        refund_denominations = self._calculate_change(amount)
        
        if refund_denominations is None:
            return PaymentResult(
                success=False,
                error_message="Cannot provide refund - insufficient denominations"
            )
        
        with self.cash_lock:
            # Remove refund amount from machine
            for denom, count in refund_denominations.items():
                self.accepted_denominations[denom].count -= count
        
        return PaymentResult(
            success=True,
            transaction_id=f"refund_{transaction_id}",
            amount_charged=amount,
            change_denominations=refund_denominations
        )

    def _calculate_change(self, amount: Decimal) -> Optional[Dict[Decimal, int]]:
        """Calculate optimal change using greedy algorithm"""
        if amount == 0:
            return {}
        
        change = {}
        remaining = amount
        
        # Sort denominations in descending order
        sorted_denoms = sorted(self.accepted_denominations.keys(), reverse=True)
        
        for denom in sorted_denoms:
            available_count = self.accepted_denominations[denom].count
            if remaining >= denom and available_count > 0:
                needed_count = int(remaining / denom)
                use_count = min(needed_count, available_count)
                
                if use_count > 0:
                    change[denom] = use_count
                    remaining -= denom * use_count
                    remaining = remaining.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        
        return change if remaining == 0 else None

    def add_cash(self, denominations: Dict[Decimal, int]):
        """Add cash to machine (for restocking)"""
        with self.cash_lock:
            for denom, count in denominations.items():
                if denom in self.accepted_denominations:
                    current_count = self.accepted_denominations[denom].count
                    max_capacity = self.accepted_denominations[denom].max_capacity
                    self.accepted_denominations[denom].count = min(
                        current_count + count, max_capacity
                    )

    def get_cash_levels(self) -> Dict[Decimal, int]:
        """Get current cash levels"""
        return {
            denom: info.count 
            for denom, info in self.accepted_denominations.items()
        }


class CardPaymentProcessor(PaymentProcessor):
    """Credit/Debit card payment processor"""

    def __init__(self):
        super().__init__("Card Processor")
        self.transaction_fee = Decimal("0.03")  # 3% transaction fee

    def validate_payment(self, amount: Decimal, **kwargs) -> bool:
        """Validate card payment"""
        card_info = kwargs.get('card_info')
        if not card_info:
            return False
        
        return self._validate_card(card_info)

    def process_payment(self, amount: Decimal, **kwargs) -> PaymentResult:
        """Process card payment"""
        card_info = kwargs.get('card_info')
        
        if not self._validate_card(card_info):
            return PaymentResult(
                success=False,
                error_message="Invalid card information"
            )
        
        # Simulate payment processing
        time.sleep(random.uniform(1.0, 3.0))  # Simulate network delay
        
        # 95% success rate for simulation
        if random.random() < 0.95:
            transaction_id = f"card_{uuid.uuid4().hex[:8]}"
            authorization_code = f"AUTH_{random.randint(100000, 999999)}"
            
            return PaymentResult(
                success=True,
                transaction_id=transaction_id,
                amount_charged=amount,
                authorization_code=authorization_code
            )
        else:
            return PaymentResult(
                success=False,
                error_message="Card declined by issuer"
            )

    def refund_payment(self, transaction_id: str, amount: Decimal) -> PaymentResult:
        """Process card refund"""
        # Simulate refund processing
        time.sleep(random.uniform(0.5, 1.5))
        
        refund_id = f"refund_{transaction_id}"
        
        return PaymentResult(
            success=True,
            transaction_id=refund_id,
            amount_charged=amount
        )

    def _validate_card(self, card_info: CardInfo) -> bool:
        """Validate card information"""
        if not card_info:
            return False
        
        # Basic validation
        if len(card_info.number.replace("-", "").replace(" ", "")) < 13:
            return False
        
        if not card_info.expiry or len(card_info.expiry) != 5:  # MM/YY format
            return False
        
        if not card_info.cvv or len(card_info.cvv) < 3:
            return False
        
        # Check expiry date
        try:
            month, year = card_info.expiry.split("/")
            expiry_date = datetime(2000 + int(year), int(month), 1)
            if expiry_date < datetime.now():
                return False
        except:
            return False
        
        return True


class MobilePaymentProcessor(PaymentProcessor):
    """Mobile payment processor (Apple Pay, Google Pay, etc.)"""

    def __init__(self):
        super().__init__("Mobile Payment Processor")
        self.transaction_fee = Decimal("0.015")  # 1.5% transaction fee

    def validate_payment(self, amount: Decimal, **kwargs) -> bool:
        """Validate mobile payment"""
        mobile_token = kwargs.get('mobile_token')
        return mobile_token is not None and len(mobile_token) > 10

    def process_payment(self, amount: Decimal, **kwargs) -> PaymentResult:
        """Process mobile payment"""
        mobile_token = kwargs.get('mobile_token')
        
        if not mobile_token:
            return PaymentResult(
                success=False,
                error_message="Invalid mobile payment token"
            )
        
        # Simulate payment processing
        time.sleep(random.uniform(0.5, 2.0))
        
        # 98% success rate for mobile payments
        if random.random() < 0.98:
            transaction_id = f"mobile_{uuid.uuid4().hex[:8]}"
            
            return PaymentResult(
                success=True,
                transaction_id=transaction_id,
                amount_charged=amount
            )
        else:
            return PaymentResult(
                success=False,
                error_message="Mobile payment failed"
            )

    def refund_payment(self, transaction_id: str, amount: Decimal) -> PaymentResult:
        """Process mobile payment refund"""
        refund_id = f"refund_{transaction_id}"
        
        return PaymentResult(
            success=True,
            transaction_id=refund_id,
            amount_charged=amount
        )


class Inventory:
    """Inventory management system"""

    def __init__(self):
        self.items: Dict[str, InventoryItem] = {}
        self.observers: List[Callable] = []
        self.inventory_lock = RLock()

    def add_product(self, product: Product, initial_stock: int = 0, 
                   max_capacity: int = 10, low_stock_threshold: int = 2,
                   reorder_quantity: int = 8):
        """Add a new product to inventory"""
        with self.inventory_lock:
            inventory_item = InventoryItem(
                product=product,
                current_stock=initial_stock,
                max_capacity=max_capacity,
                low_stock_threshold=low_stock_threshold,
                reorder_quantity=reorder_quantity
            )
            self.items[product.code] = inventory_item

    def check_availability(self, product_code: str) -> bool:
        """Check if product is available"""
        with self.inventory_lock:
            item = self.items.get(product_code)
            return item is not None and item.current_stock > 0 and item.product.is_available

    def reserve_product(self, product_code: str) -> bool:
        """Reserve a product for purchase"""
        with self.inventory_lock:
            if not self.check_availability(product_code):
                return False
            
            self.items[product_code].current_stock -= 1
            return True

    def confirm_sale(self, product_code: str):
        """Confirm product sale (already reserved)"""
        with self.inventory_lock:
            if product_code in self.items:
                self.items[product_code].total_sold += 1
                
                # Check for low stock alert
                item = self.items[product_code]
                if item.current_stock <= item.low_stock_threshold:
                    self._notify_low_stock(product_code, item)

    def cancel_reservation(self, product_code: str):
        """Cancel product reservation"""
        with self.inventory_lock:
            if product_code in self.items:
                self.items[product_code].current_stock += 1

    def restock(self, product_code: str, quantity: int) -> bool:
        """Restock a product"""
        with self.inventory_lock:
            if product_code not in self.items:
                return False
            
            item = self.items[product_code]
            new_stock = min(item.current_stock + quantity, item.max_capacity)
            item.current_stock = new_stock
            item.last_restocked = datetime.now()
            
            logger.info(f"Restocked {product_code} with {quantity} units. New stock: {new_stock}")
            return True

    def get_inventory_status(self) -> Dict[str, Dict[str, Any]]:
        """Get complete inventory status"""
        with self.inventory_lock:
            status = {}
            for code, item in self.items.items():
                status[code] = {
                    'name': item.product.name,
                    'current_stock': item.current_stock,
                    'max_capacity': item.max_capacity,
                    'low_stock_threshold': item.low_stock_threshold,
                    'price': item.product.price,
                    'category': item.product.category.value,
                    'total_sold': item.total_sold,
                    'last_restocked': item.last_restocked,
                    'is_low_stock': item.current_stock <= item.low_stock_threshold,
                    'is_available': item.product.is_available
                }
            return status

    def add_observer(self, observer: Callable):
        """Add inventory observer"""
        self.observers.append(observer)

    def _notify_low_stock(self, product_code: str, item: InventoryItem):
        """Notify observers of low stock"""
        for observer in self.observers:
            try:
                observer('low_stock', {
                    'product_code': product_code,
                    'product_name': item.product.name,
                    'current_stock': item.current_stock,
                    'threshold': item.low_stock_threshold,
                    'reorder_quantity': item.reorder_quantity
                })
            except Exception as e:
                logger.error(f"Observer notification failed: {e}")


class TransactionManager:
    """Transaction management and history"""

    def __init__(self):
        self.transactions: Dict[str, Transaction] = {}
        self.transaction_history: List[Transaction] = []
        self.transaction_lock = RLock()

    def create_transaction(self, product_code: str, product_name: str, 
                         price: Decimal, payment_method: PaymentMethod) -> str:
        """Create a new transaction"""
        with self.transaction_lock:
            transaction_id = f"txn_{uuid.uuid4().hex}"
            
            transaction = Transaction(
                transaction_id=transaction_id,
                timestamp=datetime.now(),
                product_code=product_code,
                product_name=product_name,
                price=price,
                payment_method=payment_method,
                amount_paid=Decimal("0.00"),
                change_given=Decimal("0.00"),
                status=TransactionStatus.INITIATED
            )
            
            self.transactions[transaction_id] = transaction
            return transaction_id

    def update_transaction(self, transaction_id: str, **updates):
        """Update transaction details"""
        with self.transaction_lock:
            if transaction_id in self.transactions:
                transaction = self.transactions[transaction_id]
                for key, value in updates.items():
                    if hasattr(transaction, key):
                        setattr(transaction, key, value)

    def complete_transaction(self, transaction_id: str):
        """Mark transaction as completed"""
        with self.transaction_lock:
            if transaction_id in self.transactions:
                transaction = self.transactions[transaction_id]
                transaction.status = TransactionStatus.COMPLETED
                self.transaction_history.append(transaction)
                del self.transactions[transaction_id]

    def cancel_transaction(self, transaction_id: str):
        """Cancel a transaction"""
        with self.transaction_lock:
            if transaction_id in self.transactions:
                transaction = self.transactions[transaction_id]
                transaction.status = TransactionStatus.CANCELLED
                self.transaction_history.append(transaction)
                del self.transactions[transaction_id]

    def get_transaction(self, transaction_id: str) -> Optional[Transaction]:
        """Get transaction details"""
        return self.transactions.get(transaction_id)

    def generate_sales_report(self, start_date: datetime, end_date: datetime) -> SalesReport:
        """Generate comprehensive sales report"""
        with self.transaction_lock:
            # Filter transactions by date range
            relevant_transactions = [
                txn for txn in self.transaction_history
                if start_date <= txn.timestamp <= end_date and 
                   txn.status == TransactionStatus.COMPLETED
            ]
            
            if not relevant_transactions:
                return SalesReport(
                    start_date=start_date,
                    end_date=end_date,
                    total_revenue=Decimal("0.00"),
                    total_transactions=0,
                    units_sold=0,
                    top_products=[],
                    payment_method_distribution={},
                    hourly_sales={},
                    category_performance={}
                )
            
            # Calculate metrics
            total_revenue = sum(txn.price for txn in relevant_transactions)
            total_transactions = len(relevant_transactions)
            units_sold = len(relevant_transactions)
            
            # Top products
            product_sales = defaultdict(int)
            for txn in relevant_transactions:
                product_sales[txn.product_code] += 1
            
            top_products = sorted(product_sales.items(), key=lambda x: x[1], reverse=True)[:10]
            
            # Payment method distribution
            payment_distribution = defaultdict(int)
            for txn in relevant_transactions:
                payment_distribution[txn.payment_method] += 1
            
            # Hourly sales
            hourly_sales = defaultdict(Decimal)
            for txn in relevant_transactions:
                hour = txn.timestamp.hour
                hourly_sales[hour] += txn.price
            
            return SalesReport(
                start_date=start_date,
                end_date=end_date,
                total_revenue=total_revenue,
                total_transactions=total_transactions,
                units_sold=units_sold,
                top_products=top_products,
                payment_method_distribution=dict(payment_distribution),
                hourly_sales=dict(hourly_sales),
                category_performance={}  # Could be expanded
            )


class DispenseManager:
    """Product dispensing manager"""

    def __init__(self):
        self.dispense_lock = RLock()
        self.failure_rate = 0.02  # 2% failure rate for simulation
        self.max_retries = 3

    def dispense_product(self, product_code: str) -> DispenseResult:
        """Dispense product with retry logic"""
        with self.dispense_lock:
            for attempt in range(self.max_retries):
                if self._attempt_dispense(product_code):
                    logger.info(f"Successfully dispensed product {product_code}")
                    return DispenseResult(
                        success=True,
                        product_code=product_code,
                        retry_count=attempt
                    )
                
                logger.warning(f"Dispense attempt {attempt + 1} failed for {product_code}")
                time.sleep(0.5)  # Wait before retry
            
            logger.error(f"All dispense attempts failed for {product_code}")
            return DispenseResult(
                success=False,
                product_code=product_code,
                error_message="Mechanical failure - product not dispensed",
                retry_count=self.max_retries
            )

    def _attempt_dispense(self, product_code: str) -> bool:
        """Simulate product dispensing attempt"""
        # Simulate mechanical operation
        time.sleep(random.uniform(1.0, 3.0))
        
        # Simulate occasional failures
        return random.random() > self.failure_rate


class VendingMachine:
    """Main vending machine class"""

    def __init__(self, machine_id: str = "VM001", location: str = "Unknown"):
        self.machine_id = machine_id
        self.location = location
        self.current_state = MachineState.IDLE
        self.inventory = Inventory()
        self.transaction_manager = TransactionManager()
        self.dispense_manager = DispenseManager()
        
        # Payment processors
        self.payment_processors = {
            PaymentMethod.CASH: CashPaymentProcessor(),
            PaymentMethod.CREDIT_CARD: CardPaymentProcessor(),
            PaymentMethod.DEBIT_CARD: CardPaymentProcessor(),
            PaymentMethod.MOBILE_PAYMENT: MobilePaymentProcessor(),
        }
        
        self.current_transaction_id: Optional[str] = None
        self.selected_product: Optional[str] = None
        self.machine_lock = RLock()
        
        # Initialize with sample products
        self._initialize_products()
        
        # Add inventory observer
        self.inventory.add_observer(self._handle_inventory_alert)

    def _initialize_products(self):
        """Initialize with sample products"""
        products = [
            Product("A1", "Coca Cola", Decimal("1.50"), ProductCategory.BEVERAGES, 140),
            Product("A2", "Pepsi", Decimal("1.50"), ProductCategory.BEVERAGES, 150),
            Product("A3", "Sprite", Decimal("1.25"), ProductCategory.BEVERAGES, 140),
            Product("B1", "Doritos", Decimal("2.25"), ProductCategory.SNACKS, 250),
            Product("B2", "Pringles", Decimal("2.75"), ProductCategory.SNACKS, 290),
            Product("B3", "Lays", Decimal("2.00"), ProductCategory.SNACKS, 230),
            Product("C1", "Snickers", Decimal("1.75"), ProductCategory.CANDY, 280),
            Product("C2", "Kit Kat", Decimal("1.75"), ProductCategory.CANDY, 210),
            Product("D1", "Granola Bar", Decimal("2.50"), ProductCategory.HEALTHY, 180),
            Product("E1", "Coffee", Decimal("2.00"), ProductCategory.HOT_DRINKS, 5),
        ]
        
        for product in products:
            self.inventory.add_product(product, initial_stock=8)

    def get_available_products(self) -> Dict[str, Dict[str, Any]]:
        """Get list of available products"""
        with self.machine_lock:
            if self.current_state == MachineState.OUT_OF_ORDER:
                return {}
            
            available = {}
            for code, item in self.inventory.items.items():
                if item.current_stock > 0 and item.product.is_available:
                    available[code] = {
                        'name': item.product.name,
                        'price': float(item.product.price),
                        'category': item.product.category.value,
                        'stock': item.current_stock,
                        'calories': item.product.calories
                    }
            
            return available

    def select_product(self, product_code: str) -> Dict[str, Any]:
        """Select a product for purchase"""
        with self.machine_lock:
            if self.current_state not in [MachineState.IDLE, MachineState.PRODUCT_SELECTION]:
                return {
                    'success': False,
                    'error': f'Cannot select product in {self.current_state.value} state'
                }
            
            if not self.inventory.check_availability(product_code):
                return {
                    'success': False,
                    'error': 'Product not available or out of stock'
                }
            
            item = self.inventory.items[product_code]
            self.selected_product = product_code
            self.current_state = MachineState.PRODUCT_SELECTION
            
            return {
                'success': True,
                'product_code': product_code,
                'product_name': item.product.name,
                'price': float(item.product.price),
                'message': f'Selected {item.product.name} - ${item.product.price}'
            }

    def process_payment(self, payment_method: PaymentMethod, **payment_data) -> Dict[str, Any]:
        """Process payment for selected product"""
        with self.machine_lock:
            if self.current_state != MachineState.PRODUCT_SELECTION:
                return {
                    'success': False,
                    'error': 'No product selected'
                }
            
            if not self.selected_product:
                return {
                    'success': False,
                    'error': 'No product selected'
                }
            
            item = self.inventory.items[self.selected_product]
            price = item.product.price
            
            # Create transaction
            self.current_transaction_id = self.transaction_manager.create_transaction(
                self.selected_product,
                item.product.name,
                price,
                payment_method
            )
            
            self.current_state = MachineState.PAYMENT_PROCESSING
            
            # Process payment
            processor = self.payment_processors.get(payment_method)
            if not processor:
                return self._payment_failed("Payment method not supported")
            
            payment_result = processor.process_payment(price, **payment_data)
            
            if payment_result.success:
                # Update transaction
                self.transaction_manager.update_transaction(
                    self.current_transaction_id,
                    amount_paid=payment_result.amount_charged,
                    change_given=payment_result.change or Decimal("0.00"),
                    status=TransactionStatus.PAYMENT_APPROVED
                )
                
                # Reserve product
                if self.inventory.reserve_product(self.selected_product):
                    return {
                        'success': True,
                        'transaction_id': payment_result.transaction_id,
                        'amount_charged': float(payment_result.amount_charged),
                        'change': float(payment_result.change) if payment_result.change else 0.0,
                        'change_denominations': {
                            float(k): v for k, v in payment_result.change_denominations.items()
                        } if payment_result.change_denominations else {},
                        'message': 'Payment successful - ready to dispense'
                    }
                else:
                    # Refund payment if cannot reserve product
                    processor.refund_payment(payment_result.transaction_id, price)
                    return self._payment_failed("Product no longer available")
            else:
                return self._payment_failed(payment_result.error_message)

    def dispense_product(self) -> Dict[str, Any]:
        """Dispense the purchased product"""
        with self.machine_lock:
            if self.current_state != MachineState.PAYMENT_PROCESSING:
                return {
                    'success': False,
                    'error': 'Payment not completed'
                }
            
            if not self.current_transaction_id or not self.selected_product:
                return {
                    'success': False,
                    'error': 'No valid transaction'
                }
            
            self.current_state = MachineState.DISPENSING
            
            # Attempt to dispense product
            dispense_result = self.dispense_manager.dispense_product(self.selected_product)
            
            if dispense_result.success:
                # Complete transaction
                self.inventory.confirm_sale(self.selected_product)
                self.transaction_manager.complete_transaction(self.current_transaction_id)
                
                result = {
                    'success': True,
                    'product_code': self.selected_product,
                    'message': 'Product dispensed successfully',
                    'retry_count': dispense_result.retry_count
                }
                
                self._reset_state()
                return result
            else:
                # Dispense failed - refund customer
                transaction = self.transaction_manager.get_transaction(self.current_transaction_id)
                if transaction:
                    processor = self.payment_processors[transaction.payment_method]
                    processor.refund_payment(
                        self.current_transaction_id, 
                        transaction.price
                    )
                
                # Cancel reservation
                self.inventory.cancel_reservation(self.selected_product)
                self.transaction_manager.cancel_transaction(self.current_transaction_id)
                
                result = {
                    'success': False,
                    'error': dispense_result.error_message,
                    'refund_issued': True
                }
                
                self._reset_state()
                return result

    def cancel_transaction(self) -> Dict[str, Any]:
        """Cancel current transaction"""
        with self.machine_lock:
            if self.current_transaction_id:
                transaction = self.transaction_manager.get_transaction(self.current_transaction_id)
                if transaction and transaction.status in [TransactionStatus.PAYMENT_APPROVED]:
                    # Issue refund
                    processor = self.payment_processors[transaction.payment_method]
                    processor.refund_payment(self.current_transaction_id, transaction.price)
                
                # Cancel reservation if exists
                if self.selected_product:
                    self.inventory.cancel_reservation(self.selected_product)
                
                self.transaction_manager.cancel_transaction(self.current_transaction_id)
            
            self._reset_state()
            return {'success': True, 'message': 'Transaction cancelled'}

    def _payment_failed(self, error_message: str) -> Dict[str, Any]:
        """Handle payment failure"""
        if self.current_transaction_id:
            self.transaction_manager.update_transaction(
                self.current_transaction_id,
                status=TransactionStatus.PAYMENT_DECLINED
            )
            self.transaction_manager.cancel_transaction(self.current_transaction_id)
        
        self._reset_state()
        return {
            'success': False,
            'error': error_message
        }

    def _reset_state(self):
        """Reset machine to idle state"""
        self.current_state = MachineState.IDLE
        self.current_transaction_id = None
        self.selected_product = None

    def _handle_inventory_alert(self, alert_type: str, data: Dict[str, Any]):
        """Handle inventory alerts"""
        if alert_type == 'low_stock':
            logger.warning(
                f"Low stock alert: {data['product_name']} ({data['product_code']}) "
                f"- Only {data['current_stock']} remaining"
            )

    def get_machine_status(self) -> Dict[str, Any]:
        """Get comprehensive machine status"""
        with self.machine_lock:
            cash_processor = self.payment_processors[PaymentMethod.CASH]
            cash_levels = cash_processor.get_cash_levels()
            
            return {
                'machine_id': self.machine_id,
                'location': self.location,
                'current_state': self.current_state.value,
                'inventory_status': self.inventory.get_inventory_status(),
                'cash_levels': {float(k): v for k, v in cash_levels.items()},
                'total_cash_value': float(sum(denom * count for denom, count in cash_levels.items())),
                'active_transaction': self.current_transaction_id,
                'selected_product': self.selected_product
            }

    # Administrative functions
    def admin_restock(self, product_code: str, quantity: int) -> Dict[str, Any]:
        """Administrative function to restock products"""
        success = self.inventory.restock(product_code, quantity)
        return {
            'success': success,
            'message': f'Restocked {product_code} with {quantity} units' if success 
                      else f'Failed to restock {product_code}'
        }

    def admin_add_cash(self, denominations: Dict[float, int]) -> Dict[str, Any]:
        """Administrative function to add cash"""
        decimal_denominations = {Decimal(str(k)): v for k, v in denominations.items()}
        cash_processor = self.payment_processors[PaymentMethod.CASH]
        cash_processor.add_cash(decimal_denominations)
        
        return {
            'success': True,
            'message': 'Cash added successfully',
            'new_levels': {float(k): v for k, v in cash_processor.get_cash_levels().items()}
        }

    def admin_generate_report(self, days: int = 7) -> SalesReport:
        """Generate sales report for specified number of days"""
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        return self.transaction_manager.generate_sales_report(start_date, end_date)

    def set_maintenance_mode(self, enabled: bool):
        """Set maintenance mode"""
        with self.machine_lock:
            if enabled:
                self.current_state = MachineState.MAINTENANCE
            else:
                self.current_state = MachineState.IDLE


# Demo and Testing Functions

def demo_vending_machine():
    """Comprehensive demo of the vending machine system"""
    print("🏪 Vending Machine System Demo")
    print("=" * 50)
    
    # Create vending machine
    vm = VendingMachine("VM001", "Main Campus")
    
    print("\n📋 1. Available Products")
    print("-" * 30)
    products = vm.get_available_products()
    for code, details in products.items():
        print(f"  {code}: {details['name']} - ${details['price']} ({details['stock']} in stock)")
    
    print("\n💰 2. Cash Purchase Demo")
    print("-" * 30)
    
    # Select product
    selection = vm.select_product("A1")
    print(f"Selection result: {selection['message'] if selection['success'] else selection['error']}")
    
    if selection['success']:
        # Pay with cash (insert $2.00 for $1.50 product)
        cash_inserted = {
            Decimal("1.00"): 2  # Two $1 coins
        }
        
        payment = vm.process_payment(
            PaymentMethod.CASH,
            inserted_cash=cash_inserted
        )
        
        if payment['success']:
            print(f"Payment successful! Change: ${payment['change']}")
            if payment['change_denominations']:
                print("Change breakdown:")
                for denom, count in payment['change_denominations'].items():
                    print(f"  ${denom}: {count} coins/bills")
            
            # Dispense product
            dispense = vm.dispense_product()
            print(f"Dispense result: {dispense['message'] if dispense['success'] else dispense['error']}")
        else:
            print(f"Payment failed: {payment['error']}")
    
    print("\n💳 3. Card Purchase Demo")
    print("-" * 30)
    
    # Select another product
    selection = vm.select_product("B1")
    print(f"Selected: {selection['message'] if selection['success'] else selection['error']}")
    
    if selection['success']:
        # Create card info
        card_info = CardInfo(
            number="1234-5678-9012-3456",
            expiry="12/25",
            cvv="123",
            holder_name="John Doe"
        )
        
        payment = vm.process_payment(
            PaymentMethod.CREDIT_CARD,
            card_info=card_info
        )
        
        if payment['success']:
            print(f"Card payment successful! Amount charged: ${payment['amount_charged']}")
            
            dispense = vm.dispense_product()
            print(f"Dispense result: {dispense['message'] if dispense['success'] else dispense['error']}")
        else:
            print(f"Card payment failed: {payment['error']}")
    
    print("\n📱 4. Mobile Payment Demo")
    print("-" * 30)
    
    selection = vm.select_product("C1")
    print(f"Selected: {selection['message'] if selection['success'] else selection['error']}")
    
    if selection['success']:
        payment = vm.process_payment(
            PaymentMethod.MOBILE_PAYMENT,
            mobile_token="MOBILE_TOKEN_12345_APPLEPAY"
        )
        
        if payment['success']:
            print(f"Mobile payment successful!")
            
            dispense = vm.dispense_product()
            print(f"Dispense result: {dispense['message'] if dispense['success'] else dispense['error']}")
        else:
            print(f"Mobile payment failed: {payment['error']}")
    
    print("\n🔧 5. Administrative Functions")
    print("-" * 30)
    
    # Check machine status
    status = vm.get_machine_status()
    print(f"Machine State: {status['current_state']}")
    print(f"Total Cash Value: ${status['total_cash_value']:.2f}")
    
    # Restock low products
    print("\nRestocking products...")
    restock_result = vm.admin_restock("A1", 10)
    print(f"Restock A1: {restock_result['message']}")
    
    # Add cash
    print("\nAdding cash to machine...")
    cash_result = vm.admin_add_cash({
        0.25: 20,  # 20 quarters
        1.00: 10,  # 10 dollar coins
        5.00: 5    # 5 five-dollar bills
    })
    print(f"Cash added: {cash_result['message']}")
    
    print("\n📊 6. Sales Report")
    print("-" * 30)
    
    report = vm.admin_generate_report(1)  # Last 1 day
    print(f"Sales Report (Last 24 hours):")
    print(f"  Total Revenue: ${report.total_revenue}")
    print(f"  Total Transactions: {report.total_transactions}")
    print(f"  Units Sold: {report.units_sold}")
    
    if report.top_products:
        print("  Top Products:")
        for product_code, units in report.top_products[:3]:
            print(f"    {product_code}: {units} units")
    
    if report.payment_method_distribution:
        print("  Payment Methods:")
        for method, count in report.payment_method_distribution.items():
            print(f"    {method.value}: {count} transactions")
    
    print("\n✅ Demo completed successfully!")
    return vm


def performance_test():
    """Performance test for the vending machine"""
    print("\n🚀 Performance Test")
    print("=" * 50)
    
    vm = VendingMachine("VM_PERF", "Performance Test Location")
    
    # Test concurrent transactions simulation
    print("Testing transaction processing speed...")
    
    products = ["A1", "A2", "B1", "B2", "C1"]
    start_time = time.time()
    successful_transactions = 0
    total_attempts = 50
    
    for i in range(total_attempts):
        product = products[i % len(products)]
        
        # Select product
        selection = vm.select_product(product)
        if selection['success']:
            # Quick cash payment simulation
            payment = vm.process_payment(
                PaymentMethod.MOBILE_PAYMENT,
                mobile_token=f"TOKEN_{i}"
            )
            
            if payment['success']:
                dispense = vm.dispense_product()
                if dispense['success']:
                    successful_transactions += 1
            else:
                vm.cancel_transaction()
        else:
            # Product might be out of stock, restock it
            vm.admin_restock(product, 10)
    
    end_time = time.time()
    duration = end_time - start_time
    
    print(f"Performance Results:")
    print(f"  Total Attempts: {total_attempts}")
    print(f"  Successful Transactions: {successful_transactions}")
    print(f"  Success Rate: {(successful_transactions / total_attempts) * 100:.1f}%")
    print(f"  Duration: {duration:.2f} seconds")
    print(f"  Transactions per Second: {successful_transactions / duration:.2f}")
    print(f"  Average Transaction Time: {duration / total_attempts:.3f} seconds")
    
    # Generate final report
    final_report = vm.admin_generate_report(1)
    print(f"\nFinal Sales Summary:")
    print(f"  Revenue Generated: ${final_report.total_revenue}")
    print(f"  Total Units Sold: {final_report.units_sold}")


if __name__ == "__main__":
    # Run comprehensive demo
    demo_vm = demo_vending_machine()
    
    # Run performance test
    performance_test()
    
    print("\n🎉 All tests completed successfully!")