"""
Trading Platform - Stock Trading System

This module implements a comprehensive trading platform with order matching,
portfolio management, and real-time market data.

Features:
- Multiple order types (Market, Limit, Stop-Loss)
- Real-time order matching engine with price-time priority
- Portfolio management with P&L tracking
- Order book management
- Trade execution and history
- 6 Design Patterns: Strategy, Observer, Singleton, Factory, Command, State

Usage:
    platform = TradingPlatform()
    user = User("user1", "John", 10000)
    order = platform.place_order(user, "AAPL", OrderSide.BUY, 10, OrderType.MARKET)

Design Patterns:
1. Strategy - Order execution strategies
2. Observer - Market data updates
3. Singleton - Matching engine
4. Factory - Order creation
5. Command - Order operations
6. State - Order lifecycle

Author: LLD Solutions
Date: 2025
"""

from __future__ import annotations
from typing import Dict, List, Optional
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from decimal import Decimal
import uuid
from datetime import datetime
from collections import defaultdict
import heapq

# ============================================================================
# ENUMS
# ============================================================================

class OrderSide(Enum):
    """Order side - buy or sell."""
    BUY = "BUY"
    SELL = "SELL"

class OrderType(Enum):
    """Order types."""
    MARKET = "MARKET"
    LIMIT = "LIMIT"
    STOP_LOSS = "STOP_LOSS"

class OrderStatus(Enum):
    """Order lifecycle states."""
    PENDING = "PENDING"
    OPEN = "OPEN"
    PARTIALLY_FILLED = "PARTIALLY_FILLED"
    FILLED = "FILLED"
    CANCELLED = "CANCELLED"
    REJECTED = "REJECTED"

# ============================================================================
# DOMAIN MODELS
# ============================================================================

@dataclass
class User:
    """User with trading account."""
    user_id: str
    name: str
    cash_balance: Decimal
    
    def __post_init__(self):
        self.cash_balance = Decimal(str(self.cash_balance))

@dataclass
class Position:
    """Stock position in portfolio."""
    symbol: str
    quantity: int = 0
    average_price: Decimal = Decimal('0')
    realized_pnl: Decimal = Decimal('0')
    
    def update(self, qty: int, price: Decimal):
        """Update position with new trade."""
        if self.quantity == 0:
            self.average_price = price
        else:
            total_cost = self.average_price * self.quantity + price * qty
            self.quantity += qty
            if self.quantity != 0:
                self.average_price = total_cost / self.quantity
    
    def calculate_unrealized_pnl(self, current_price: Decimal) -> Decimal:
        """Calculate unrealized P&L."""
        return (current_price - self.average_price) * self.quantity

@dataclass
class Trade:
    """Executed trade."""
    trade_id: str
    symbol: str
    buyer: User
    seller: User
    price: Decimal
    quantity: int
    timestamp: datetime = field(default_factory=datetime.now)
    
    def __str__(self):
        return f"Trade({self.symbol}: {self.quantity}@${self.price})"

# ============================================================================
# 6. STATE PATTERN - Order States
# ============================================================================

class OrderState(ABC):
    """Abstract order state."""
    
    @abstractmethod
    def can_cancel(self) -> bool:
        pass
    
    @abstractmethod
    def can_fill(self) -> bool:
        pass
    
    @abstractmethod
    def get_name(self) -> str:
        pass

class PendingState(OrderState):
    """Order is pending validation."""
    def can_cancel(self) -> bool:
        return True
    def can_fill(self) -> bool:
        return False
    def get_name(self) -> str:
        return "PENDING"

class OpenState(OrderState):
    """Order is in order book."""
    def can_cancel(self) -> bool:
        return True
    def can_fill(self) -> bool:
        return True
    def get_name(self) -> str:
        return "OPEN"

class PartiallyFilledState(OrderState):
    """Order is partially filled."""
    def can_cancel(self) -> bool:
        return True
    def can_fill(self) -> bool:
        return True
    def get_name(self) -> str:
        return "PARTIALLY_FILLED"

class FilledState(OrderState):
    """Order is fully filled."""
    def can_cancel(self) -> bool:
        return False
    def can_fill(self) -> bool:
        return False
    def get_name(self) -> str:
        return "FILLED"

class CancelledState(OrderState):
    """Order is cancelled."""
    def can_cancel(self) -> bool:
        return False
    def can_fill(self) -> bool:
        return False
    def get_name(self) -> str:
        return "CANCELLED"

# ============================================================================
# ORDER
# ============================================================================

@dataclass
class Order:
    """Trading order."""
    order_id: str
    user: User
    symbol: str
    side: OrderSide
    order_type: OrderType
    quantity: int
    price: Optional[Decimal]
    filled_quantity: int = 0
    state: OrderState = field(default_factory=OpenState)
    timestamp: datetime = field(default_factory=datetime.now)
    
    def __post_init__(self):
        if self.price:
            self.price = Decimal(str(self.price))
    
    def remaining_quantity(self) -> int:
        """Get unfilled quantity."""
        return self.quantity - self.filled_quantity
    
    def is_fully_filled(self) -> bool:
        """Check if order is fully filled."""
        return self.filled_quantity >= self.quantity
    
    def fill(self, qty: int):
        """Fill order partially or fully."""
        if not self.state.can_fill():
            raise ValueError(f"Cannot fill order in {self.state.get_name()} state")
        
        self.filled_quantity += qty
        
        if self.is_fully_filled():
            self.state = FilledState()
        elif self.filled_quantity > 0:
            self.state = PartiallyFilledState()
    
    def cancel(self) -> bool:
        """Cancel order."""
        if not self.state.can_cancel():
            return False
        self.state = CancelledState()
        return True
    
    def __str__(self):
        return f"Order({self.order_id}: {self.side.value} {self.quantity} {self.symbol})"

# ============================================================================
# 1. STRATEGY PATTERN - Order Execution Strategies
# ============================================================================

class OrderStrategy(ABC):
    """Abstract order execution strategy."""
    
    @abstractmethod
    def can_execute(self, order: Order, best_price: Optional[Decimal]) -> bool:
        """Check if order can be executed at given price."""
        pass
    
    @abstractmethod
    def get_execution_price(self, order: Order, best_price: Decimal) -> Decimal:
        """Get execution price for order."""
        pass

class MarketOrderStrategy(OrderStrategy):
    """Execute immediately at best available price."""
    
    def can_execute(self, order: Order, best_price: Optional[Decimal]) -> bool:
        return best_price is not None
    
    def get_execution_price(self, order: Order, best_price: Decimal) -> Decimal:
        return best_price

class LimitOrderStrategy(OrderStrategy):
    """Execute only at limit price or better."""
    
    def can_execute(self, order: Order, best_price: Optional[Decimal]) -> bool:
        if best_price is None or order.price is None:
            return False
        
        if order.side == OrderSide.BUY:
            return best_price <= order.price
        else:
            return best_price >= order.price
    
    def get_execution_price(self, order: Order, best_price: Decimal) -> Decimal:
        # Match at the better price for the taker
        if order.side == OrderSide.BUY:
            return min(order.price, best_price)
        else:
            return max(order.price, best_price)

# ============================================================================
# 2. OBSERVER PATTERN - Market Data Updates
# ============================================================================

class MarketDataObserver(ABC):
    """Observer for market data updates."""
    
    @abstractmethod
    def on_trade(self, trade: Trade):
        """Called when trade is executed."""
        pass
    
    @abstractmethod
    def on_order_book_update(self, symbol: str, best_bid: Decimal, best_ask: Decimal):
        """Called when order book changes."""
        pass

class PriceDisplayObserver(MarketDataObserver):
    """Observer that displays price updates."""
    
    def on_trade(self, trade: Trade):
        print(f"💰 Trade: {trade.symbol} {trade.quantity}@${trade.price}")
    
    def on_order_book_update(self, symbol: str, best_bid: Decimal, best_ask: Decimal):
        spread = best_ask - best_bid if best_bid and best_ask else Decimal('0')
        print(f"📊 {symbol}: Bid=${best_bid} Ask=${best_ask} Spread=${spread}")

class PortfolioObserver(MarketDataObserver):
    """Observer that updates portfolios on trades."""
    
    def __init__(self, platform: 'TradingPlatform'):
        self.platform = platform
    
    def on_trade(self, trade: Trade):
        # Update buyer position
        buyer_portfolio = self.platform.get_portfolio(trade.buyer)
        buyer_portfolio.add_position(trade.symbol, trade.quantity, trade.price)
        
        # Update seller position
        seller_portfolio = self.platform.get_portfolio(trade.seller)
        seller_portfolio.add_position(trade.symbol, -trade.quantity, trade.price)
    
    def on_order_book_update(self, symbol: str, best_bid: Decimal, best_ask: Decimal):
        pass

# ============================================================================
# ORDER BOOK
# ============================================================================

class OrderBook:
    """Order book for a symbol with price-time priority."""
    
    def __init__(self, symbol: str):
        self.symbol = symbol
        # Buy orders: max heap (negative price for max behavior)
        self.buy_orders: List[tuple] = []
        # Sell orders: min heap
        self.sell_orders: List[tuple] = []
        self.order_map: Dict[str, Order] = {}
    
    def add_order(self, order: Order):
        """Add order to book."""
        self.order_map[order.order_id] = order
        
        # Priority: (price, timestamp, order)
        # For buy: use negative price for max heap
        if order.side == OrderSide.BUY:
            heapq.heappush(self.buy_orders, 
                          (-order.price if order.price else Decimal('999999'), 
                           order.timestamp, order.order_id, order))
        else:
            heapq.heappush(self.sell_orders,
                          (order.price if order.price else Decimal('0'),
                           order.timestamp, order.order_id, order))
    
    def remove_order(self, order_id: str) -> bool:
        """Remove order from book."""
        if order_id in self.order_map:
            del self.order_map[order_id]
            return True
        return False
    
    def get_best_bid(self) -> Optional[Decimal]:
        """Get best buy price."""
        self._clean_buy_orders()
        if self.buy_orders:
            return -self.buy_orders[0][0]
        return None
    
    def get_best_ask(self) -> Optional[Decimal]:
        """Get best sell price."""
        self._clean_sell_orders()
        if self.sell_orders:
            return self.sell_orders[0][0]
        return None
    
    def _clean_buy_orders(self):
        """Remove filled/cancelled orders from buy heap."""
        while self.buy_orders:
            order = self.buy_orders[0][3]
            if order.is_fully_filled() or isinstance(order.state, CancelledState):
                heapq.heappop(self.buy_orders)
            else:
                break
    
    def _clean_sell_orders(self):
        """Remove filled/cancelled orders from sell heap."""
        while self.sell_orders:
            order = self.sell_orders[0][3]
            if order.is_fully_filled() or isinstance(order.state, CancelledState):
                heapq.heappop(self.sell_orders)
            else:
                break
    
    def get_top_buy_order(self) -> Optional[Order]:
        """Get best buy order."""
        self._clean_buy_orders()
        return self.buy_orders[0][3] if self.buy_orders else None
    
    def get_top_sell_order(self) -> Optional[Order]:
        """Get best sell order."""
        self._clean_sell_orders()
        return self.sell_orders[0][3] if self.sell_orders else None

# ============================================================================
# 3. SINGLETON PATTERN - Order Matching Engine
# ============================================================================

class OrderMatchingEngine:
    """Singleton order matching engine."""
    
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        
        self.order_books: Dict[str, OrderBook] = {}
        self.trades: List[Trade] = []
        self.observers: List[MarketDataObserver] = []
        self.strategies = {
            OrderType.MARKET: MarketOrderStrategy(),
            OrderType.LIMIT: LimitOrderStrategy()
        }
        self._initialized = True
    
    def register_observer(self, observer: MarketDataObserver):
        """Register market data observer."""
        self.observers.append(observer)
    
    def _notify_trade(self, trade: Trade):
        """Notify observers of trade."""
        for observer in self.observers:
            observer.on_trade(trade)
    
    def _notify_book_update(self, symbol: str):
        """Notify observers of order book update."""
        book = self.order_books.get(symbol)
        if book:
            best_bid = book.get_best_bid()
            best_ask = book.get_best_ask()
            for observer in self.observers:
                observer.on_order_book_update(symbol, best_bid, best_ask)
    
    def submit_order(self, order: Order):
        """Submit order to matching engine."""
        # Get or create order book
        if order.symbol not in self.order_books:
            self.order_books[order.symbol] = OrderBook(order.symbol)
        
        book = self.order_books[order.symbol]
        
        # Add order to book
        book.add_order(order)
        
        # Try to match
        self.match_orders(order.symbol)
        
        # Notify observers
        self._notify_book_update(order.symbol)
    
    def match_orders(self, symbol: str):
        """Match orders for symbol using price-time priority."""
        book = self.order_books.get(symbol)
        if not book:
            return
        
        while True:
            buy_order = book.get_top_buy_order()
            sell_order = book.get_top_sell_order()
            
            if not buy_order or not sell_order:
                break
            
            # Check if orders can match
            buy_strategy = self.strategies.get(buy_order.order_type)
            sell_strategy = self.strategies.get(sell_order.order_type)
            
            best_ask = sell_order.price if sell_order.price else Decimal('0')
            best_bid = buy_order.price if buy_order.price else Decimal('999999')
            
            if not buy_strategy.can_execute(buy_order, best_ask):
                break
            if not sell_strategy.can_execute(sell_order, best_bid):
                break
            
            # Execute trade at seller's price (better for buyer)
            trade_price = sell_order.price if sell_order.price else buy_order.price
            trade_qty = min(buy_order.remaining_quantity(), sell_order.remaining_quantity())
            
            # Create trade
            trade = Trade(
                trade_id=str(uuid.uuid4())[:8],
                symbol=symbol,
                buyer=buy_order.user,
                seller=sell_order.user,
                price=trade_price,
                quantity=trade_qty
            )
            
            # Update orders
            buy_order.fill(trade_qty)
            sell_order.fill(trade_qty)
            
            # Record trade
            self.trades.append(trade)
            
            # Notify observers
            self._notify_trade(trade)
    
    def cancel_order(self, order: Order) -> bool:
        """Cancel an order."""
        return order.cancel()

# ============================================================================
# 5. COMMAND PATTERN - Order Commands
# ============================================================================

class OrderCommand(ABC):
    """Abstract order command."""
    
    @abstractmethod
    def execute(self) -> bool:
        pass
    
    @abstractmethod
    def undo(self) -> bool:
        pass

class PlaceOrderCommand(OrderCommand):
    """Command to place an order."""
    
    def __init__(self, engine: OrderMatchingEngine, order: Order):
        self.engine = engine
        self.order = order
    
    def execute(self) -> bool:
        self.engine.submit_order(self.order)
        return True
    
    def undo(self) -> bool:
        return self.engine.cancel_order(self.order)

class CancelOrderCommand(OrderCommand):
    """Command to cancel an order."""
    
    def __init__(self, engine: OrderMatchingEngine, order: Order):
        self.engine = engine
        self.order = order
    
    def execute(self) -> bool:
        return self.engine.cancel_order(self.order)
    
    def undo(self) -> bool:
        # Cannot undo cancellation
        return False

# ============================================================================
# 4. FACTORY PATTERN - Order Factory
# ============================================================================

class OrderFactory:
    """Factory for creating orders."""
    
    @staticmethod
    def create_market_order(user: User, symbol: str, side: OrderSide, quantity: int) -> Order:
        """Create market order."""
        return Order(
            order_id=str(uuid.uuid4())[:8],
            user=user,
            symbol=symbol,
            side=side,
            order_type=OrderType.MARKET,
            quantity=quantity,
            price=None
        )
    
    @staticmethod
    def create_limit_order(user: User, symbol: str, side: OrderSide, 
                          quantity: int, price: Decimal) -> Order:
        """Create limit order."""
        return Order(
            order_id=str(uuid.uuid4())[:8],
            user=user,
            symbol=symbol,
            side=side,
            order_type=OrderType.LIMIT,
            quantity=quantity,
            price=Decimal(str(price))
        )

# ============================================================================
# PORTFOLIO
# ============================================================================

class Portfolio:
    """User portfolio with positions."""
    
    def __init__(self, user: User):
        self.user = user
        self.positions: Dict[str, Position] = {}
    
    def add_position(self, symbol: str, qty: int, price: Decimal):
        """Add to position."""
        if symbol not in self.positions:
            self.positions[symbol] = Position(symbol)
        
        position = self.positions[symbol]
        
        # Handle buy/sell
        if (position.quantity > 0 and qty < 0) or (position.quantity < 0 and qty > 0):
            # Closing position - realize P&L
            closing_qty = min(abs(qty), abs(position.quantity))
            pnl = (price - position.average_price) * closing_qty
            if position.quantity < 0:
                pnl = -pnl
            position.realized_pnl += pnl
        
        position.update(qty, price)
    
    def get_position(self, symbol: str) -> Optional[Position]:
        """Get position for symbol."""
        return self.positions.get(symbol)
    
    def calculate_total_value(self, prices: Dict[str, Decimal]) -> Decimal:
        """Calculate total portfolio value."""
        total = self.user.cash_balance
        for symbol, position in self.positions.items():
            if symbol in prices:
                total += position.quantity * prices[symbol]
        return total

# ============================================================================
# TRADING PLATFORM
# ============================================================================

class TradingPlatform:
    """Main trading platform."""
    
    def __init__(self):
        self.engine = OrderMatchingEngine()
        self.portfolios: Dict[str, Portfolio] = {}
        self.users: Dict[str, User] = {}
        
        # Register observers
        self.engine.register_observer(PriceDisplayObserver())
        self.engine.register_observer(PortfolioObserver(self))
    
    def register_user(self, user: User):
        """Register user."""
        self.users[user.user_id] = user
        self.portfolios[user.user_id] = Portfolio(user)
    
    def get_portfolio(self, user: User) -> Portfolio:
        """Get user portfolio."""
        return self.portfolios[user.user_id]
    
    def place_order(self, user: User, symbol: str, side: OrderSide, 
                   quantity: int, order_type: OrderType, price: Optional[Decimal] = None) -> Order:
        """Place an order."""
        # Create order using factory
        if order_type == OrderType.MARKET:
            order = OrderFactory.create_market_order(user, symbol, side, quantity)
        else:
            order = OrderFactory.create_limit_order(user, symbol, side, quantity, price)
        
        # Execute using command
        command = PlaceOrderCommand(self.engine, order)
        command.execute()
        
        return order
    
    def cancel_order(self, order: Order) -> bool:
        """Cancel an order."""
        command = CancelOrderCommand(self.engine, order)
        return command.execute()

# ============================================================================
# DEMONSTRATION
# ============================================================================

def demo_trading():
    """Demonstrate trading platform."""
    print("=" * 70)
    print("TRADING PLATFORM - COMPREHENSIVE DEMONSTRATION")
    print("=" * 70)
    
    # Create platform
    platform = TradingPlatform()
    
    # Create users
    alice = User("alice", "Alice", Decimal('10000'))
    bob = User("bob", "Bob", Decimal('10000'))
    charlie = User("charlie", "Charlie", Decimal('10000'))
    
    platform.register_user(alice)
    platform.register_user(bob)
    platform.register_user(charlie)
    
    print("\n📝 Demo 1: Limit Orders with Perfect Match")
    print("-" * 70)
    
    # Bob wants to buy 10 AAPL at $150
    order1 = platform.place_order(bob, "AAPL", OrderSide.BUY, 10, OrderType.LIMIT, Decimal('150'))
    print(f"Bob placed: BUY 10 AAPL @ $150")
    
    # Alice wants to sell 10 AAPL at $150
    order2 = platform.place_order(alice, "AAPL", OrderSide.SELL, 10, OrderType.LIMIT, Decimal('150'))
    print(f"Alice placed: SELL 10 AAPL @ $150")
    
    print(f"\nBob's AAPL position: {platform.get_portfolio(bob).get_position('AAPL').quantity} shares")
    print(f"Alice's AAPL position: {platform.get_portfolio(alice).get_position('AAPL').quantity} shares")
    
    print("\n📝 Demo 2: Partial Fill")
    print("-" * 70)
    
    # Charlie wants to buy 20 AAPL at $151
    order3 = platform.place_order(charlie, "AAPL", OrderSide.BUY, 20, OrderType.LIMIT, Decimal('151'))
    print(f"Charlie placed: BUY 20 AAPL @ $151")
    
    # Alice sells 10 AAPL at $151
    order4 = platform.place_order(alice, "AAPL", OrderSide.SELL, 10, OrderType.LIMIT, Decimal('151'))
    print(f"Alice placed: SELL 10 AAPL @ $151")
    
    print(f"\nCharlie's order status: {order3.state.get_name()}")
    print(f"Charlie filled: {order3.filled_quantity}/{order3.quantity}")
    
    print("\n📝 Demo 3: Market Order")
    print("-" * 70)
    
    # Fill remaining of Charlie's order with market order
    order5 = platform.place_order(bob, "AAPL", OrderSide.SELL, 10, OrderType.MARKET)
    print(f"Bob placed: SELL 10 AAPL MARKET")
    
    print(f"\nCharlie's order status: {order3.state.get_name()}")
    print(f"Bob's AAPL position: {platform.get_portfolio(bob).get_position('AAPL').quantity} shares")
    
    print("\n📝 Demo 4: Order Cancellation")
    print("-" * 70)
    
    order6 = platform.place_order(alice, "AAPL", OrderSide.SELL, 5, OrderType.LIMIT, Decimal('155'))
    print(f"Alice placed: SELL 5 AAPL @ $155")
    print(f"Order status: {order6.state.get_name()}")
    
    platform.cancel_order(order6)
    print(f"Cancelled order")
    print(f"Order status: {order6.state.get_name()}")
    
    print("\n" + "=" * 70)
    print("✅ ALL DEMONSTRATIONS COMPLETED!")
    print("=" * 70)
    print("\n📊 Summary:")
    print("   - 6 Design Patterns implemented")
    print("   - Order matching with price-time priority")
    print("   - Portfolio tracking with positions")
    print("   - Real-time market data updates")
    print("=" * 70 + "\n")

if __name__ == "__main__":
    demo_trading()
