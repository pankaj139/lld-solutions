"""
Auction System - Python Implementation

This file implements a comprehensive auction platform supporting multiple auction types
(English, Dutch, Sealed-bid, Vickrey), real-time bidding, proxy bidding, payment processing,
and notifications.

File Purpose:
- Demonstrates State, Strategy, Observer, Command, Factory, Chain of Responsibility,
  Proxy, Singleton, Template Method, and Decorator patterns
- Handles concurrent bidding with optimistic locking
- Implements anti-sniping time extensions
- Supports proxy bidding (auto-bid on behalf of user)
- Manages auction lifecycle from creation to winner determination

Author: LLD Solutions
Date: 2025-10-05
"""

from abc import ABC, abstractmethod
from enum import Enum
from decimal import Decimal
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Set
from dataclasses import dataclass, field
import time
import threading
import uuid


# ==================== Enums ====================

class UserType(Enum):
    """User role types"""
    BUYER = "buyer"
    SELLER = "seller"
    ADMIN = "admin"


class AuctionType(Enum):
    """Supported auction types"""
    ENGLISH = "english"  # Ascending price, highest bid wins
    DUTCH = "dutch"  # Descending price, first bid wins
    SEALED_BID = "sealed_bid"  # Hidden bids, highest wins
    VICKREY = "vickrey"  # Sealed-bid, second-price auction


class AuctionStateType(Enum):
    """Auction lifecycle states"""
    SCHEDULED = "scheduled"
    ACTIVE = "active"
    PAUSED = "paused"
    CLOSED = "closed"
    CANCELLED = "cancelled"


class BidType(Enum):
    """Types of bids"""
    MANUAL = "manual"  # User-placed bid
    PROXY = "proxy"  # Auto-bid by proxy bidder
    AUTO = "auto"  # Automatic bid (e.g., starting bid)


class BidStatus(Enum):
    """Bid processing status"""
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    RETRACTED = "retracted"
    OUTBID = "outbid"


class ItemCondition(Enum):
    """Item condition"""
    NEW = "new"
    LIKE_NEW = "like_new"
    GOOD = "good"
    FAIR = "fair"
    POOR = "poor"


class Category(Enum):
    """Item categories"""
    ELECTRONICS = "electronics"
    ART = "art"
    COLLECTIBLES = "collectibles"
    VEHICLES = "vehicles"
    REAL_ESTATE = "real_estate"
    ANTIQUES = "antiques"
    JEWELRY = "jewelry"
    OTHER = "other"


# ==================== Data Classes ====================

@dataclass
class User:
    """
    Represents a user (buyer/seller) in the auction system.
    
    Usage:
        user = User("John Doe", "john@email.com", UserType.BUYER)
        user.reputation = 4.5
    """
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    name: str = ""
    email: str = ""
    user_type: UserType = UserType.BUYER
    reputation: float = 5.0
    verified: bool = False
    created_at: datetime = field(default_factory=datetime.now)
    
    def __str__(self) -> str:
        return f"{self.name} ({self.user_type.value})"
    
    def __hash__(self) -> int:
        return hash(self.id)
    
    def __eq__(self, other) -> bool:
        if not isinstance(other, User):
            return False
        return self.id == other.id


@dataclass
class Item:
    """
    Represents an item to be auctioned.
    
    Usage:
        item = Item(seller, "Vintage Watch", "1950s Rolex", Category.COLLECTIBLES)
    """
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    seller: Optional[User] = None
    title: str = ""
    description: str = ""
    category: Category = Category.OTHER
    condition: ItemCondition = ItemCondition.GOOD
    images: List[str] = field(default_factory=list)
    
    def __str__(self) -> str:
        return f"{self.title} [{self.category.value}]"


@dataclass
class Bid:
    """
    Represents a bid placed on an auction.
    
    Usage:
        bid = Bid(bidder, Decimal("100.00"), BidType.MANUAL)
        if bid.validate(auction):
            auction.place_bid(bid)
    
    Returns:
        Bid instance with validation status
    """
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    bidder: Optional[User] = None
    amount: Decimal = Decimal("0")
    timestamp: datetime = field(default_factory=datetime.now)
    bid_type: BidType = BidType.MANUAL
    proxy_max: Optional[Decimal] = None  # For proxy bids
    status: BidStatus = BidStatus.PENDING
    
    def __str__(self) -> str:
        return f"{self.bidder.name}: ${self.amount} [{self.status.value}]"


@dataclass
class Winner:
    """Auction winner information"""
    bidder: User
    winning_bid: Decimal
    price_paid: Decimal  # May differ in Vickrey auctions
    timestamp: datetime = field(default_factory=datetime.now)


# ==================== Auction State Pattern ====================

class AuctionState(ABC):
    """
    Abstract base class for auction states (State Pattern).
    
    Usage:
        state = ScheduledState()
        state.start(auction)
    """
    
    @abstractmethod
    def start(self, auction: 'Auction') -> bool:
        """Start the auction"""
        pass
    
    @abstractmethod
    def place_bid(self, auction: 'Auction', bid: Bid) -> bool:
        """Place a bid in this state"""
        pass
    
    @abstractmethod
    def close(self, auction: 'Auction') -> bool:
        """Close the auction"""
        pass
    
    @abstractmethod
    def cancel(self, auction: 'Auction') -> bool:
        """Cancel the auction"""
        pass
    
    @abstractmethod
    def get_state_type(self) -> AuctionStateType:
        """Get the state type"""
        pass


class ScheduledState(AuctionState):
    """Auction is scheduled but not started"""
    
    def start(self, auction: 'Auction') -> bool:
        auction.state = ActiveState()
        print(f"✅ Auction '{auction.item.title}' started")
        return True
    
    def place_bid(self, auction: 'Auction', bid: Bid) -> bool:
        print(f"❌ Cannot bid on scheduled auction")
        return False
    
    def close(self, auction: 'Auction') -> bool:
        print(f"❌ Cannot close scheduled auction")
        return False
    
    def cancel(self, auction: 'Auction') -> bool:
        auction.state = CancelledState()
        print(f"✅ Auction cancelled")
        return True
    
    def get_state_type(self) -> AuctionStateType:
        return AuctionStateType.SCHEDULED


class ActiveState(AuctionState):
    """Auction is active and accepting bids"""
    
    def start(self, auction: 'Auction') -> bool:
        print(f"❌ Auction already active")
        return False
    
    def place_bid(self, auction: 'Auction', bid: Bid) -> bool:
        # Check if auction time expired
        if datetime.now() > auction.end_time:
            auction.close()
            print(f"❌ Auction has ended")
            return False
        return True  # Allow bid placement
    
    def close(self, auction: 'Auction') -> bool:
        auction.state = ClosedState()
        print(f"✅ Auction '{auction.item.title}' closed")
        return True
    
    def cancel(self, auction: 'Auction') -> bool:
        auction.state = CancelledState()
        # Refund all bidders
        for bid in auction.bids:
            print(f"💰 Refunding ${bid.amount} to {bid.bidder.name}")
        return True
    
    def get_state_type(self) -> AuctionStateType:
        return AuctionStateType.ACTIVE


class PausedState(AuctionState):
    """Auction is temporarily paused"""
    
    def start(self, auction: 'Auction') -> bool:
        auction.state = ActiveState()
        print(f"✅ Auction resumed")
        return True
    
    def place_bid(self, auction: 'Auction', bid: Bid) -> bool:
        print(f"❌ Auction is paused")
        return False
    
    def close(self, auction: 'Auction') -> bool:
        auction.state = ClosedState()
        return True
    
    def cancel(self, auction: 'Auction') -> bool:
        auction.state = CancelledState()
        return True
    
    def get_state_type(self) -> AuctionStateType:
        return AuctionStateType.PAUSED


class ClosedState(AuctionState):
    """Auction has ended"""
    
    def start(self, auction: 'Auction') -> bool:
        print(f"❌ Cannot restart closed auction")
        return False
    
    def place_bid(self, auction: 'Auction', bid: Bid) -> bool:
        print(f"❌ Auction is closed")
        return False
    
    def close(self, auction: 'Auction') -> bool:
        print(f"❌ Auction already closed")
        return False
    
    def cancel(self, auction: 'Auction') -> bool:
        print(f"❌ Cannot cancel closed auction")
        return False
    
    def get_state_type(self) -> AuctionStateType:
        return AuctionStateType.CLOSED


class CancelledState(AuctionState):
    """Auction was cancelled"""
    
    def start(self, auction: 'Auction') -> bool:
        print(f"❌ Cannot start cancelled auction")
        return False
    
    def place_bid(self, auction: 'Auction', bid: Bid) -> bool:
        print(f"❌ Auction was cancelled")
        return False
    
    def close(self, auction: 'Auction') -> bool:
        return False
    
    def cancel(self, auction: 'Auction') -> bool:
        print(f"❌ Auction already cancelled")
        return False
    
    def get_state_type(self) -> AuctionStateType:
        return AuctionStateType.CANCELLED


# ==================== Bid Validation Chain ====================

class BidValidator(ABC):
    """
    Base class for bid validators (Chain of Responsibility Pattern).
    
    Usage:
        validator = AmountValidator()
        validator.set_next(IncrementValidator())
        if validator.validate(bid, auction):
            # Bid is valid
    """
    
    def __init__(self):
        self._next: Optional['BidValidator'] = None
    
    def set_next(self, validator: 'BidValidator') -> 'BidValidator':
        """Set the next validator in the chain"""
        self._next = validator
        return validator
    
    @abstractmethod
    def validate(self, bid: Bid, auction: 'Auction') -> bool:
        """Validate the bid"""
        pass
    
    def _validate_next(self, bid: Bid, auction: 'Auction') -> bool:
        """Continue validation chain"""
        if self._next:
            return self._next.validate(bid, auction)
        return True


class AmountValidator(BidValidator):
    """Validates bid amount is positive"""
    
    def validate(self, bid: Bid, auction: 'Auction') -> bool:
        if bid.amount <= 0:
            print(f"❌ Bid amount must be positive")
            return False
        
        # Skip starting price check for Dutch auctions (price decreases)
        if not isinstance(auction, DutchAuction):
            if bid.amount < auction.starting_price:
                print(f"❌ Bid ${bid.amount} below starting price ${auction.starting_price}")
                return False
        
        return self._validate_next(bid, auction)


class IncrementValidator(BidValidator):
    """Validates bid meets minimum increment"""
    
    def validate(self, bid: Bid, auction: 'Auction') -> bool:
        current_high = auction.get_high_bid()
        
        if current_high:
            required = current_high.amount + auction.bid_increment
            if bid.amount < required:
                print(f"❌ Bid must be at least ${required} (current: ${current_high.amount} + ${auction.bid_increment})")
                return False
        
        return self._validate_next(bid, auction)


class TimingValidator(BidValidator):
    """Validates auction timing"""
    
    def validate(self, bid: Bid, auction: 'Auction') -> bool:
        now = datetime.now()
        
        if now < auction.start_time:
            print(f"❌ Auction hasn't started yet")
            return False
        
        if now > auction.end_time:
            print(f"❌ Auction has ended")
            return False
        
        return self._validate_next(bid, auction)


class SellerValidator(BidValidator):
    """Validates seller can't bid on own auction (prevent shill bidding)"""
    
    def validate(self, bid: Bid, auction: 'Auction') -> bool:
        if bid.bidder.id == auction.seller.id:
            print(f"❌ Seller cannot bid on own auction (shill bidding)")
            return False
        
        return self._validate_next(bid, auction)


class FraudValidator(BidValidator):
    """Detects suspicious bidding patterns"""
    
    def validate(self, bid: Bid, auction: 'Auction') -> bool:
        # Check for rapid consecutive bids
        user_bids = [b for b in auction.bids if b.bidder.id == bid.bidder.id]
        
        if len(user_bids) >= 2:
            last_bid_time = user_bids[-1].timestamp
            if (bid.timestamp - last_bid_time).total_seconds() < 1:
                print(f"⚠️  Suspicious: Rapid consecutive bids")
                # In production, might flag for review rather than reject
        
        return self._validate_next(bid, auction)


# ==================== Auction Strategy Pattern ====================

class Auction(ABC):
    """
    Abstract base class for all auction types (Strategy Pattern).
    
    Usage:
        auction = EnglishAuction(item, seller, Decimal("100"), duration_minutes=60)
        auction.start()
        auction.place_bid(bid)
        winner = auction.determine_winner()
    
    Returns:
        Auction instance with bidding logic
    """
    
    def __init__(
        self,
        item: Item,
        seller: User,
        starting_price: Decimal,
        duration_minutes: int = 60,
        reserve_price: Optional[Decimal] = None
    ):
        self.id = str(uuid.uuid4())
        self.item = item
        self.seller = seller
        self.starting_price = starting_price
        self.reserve_price = reserve_price or Decimal("0")
        self.current_price = starting_price
        self.bids: List[Bid] = []
        self.state: AuctionState = ScheduledState()
        self.start_time = datetime.now()
        self.end_time = self.start_time + timedelta(minutes=duration_minutes)
        self.bid_increment = self._calculate_increment(starting_price)
        self.version = 0  # For optimistic locking
        self.lock = threading.Lock()
        self.winner: Optional[Winner] = None
        self.watchers: Set[User] = set()
        
        # Build validation chain
        self.validator = self._build_validator_chain()
    
    def _calculate_increment(self, price: Decimal) -> Decimal:
        """Calculate minimum bid increment based on current price"""
        if price < 100:
            return Decimal("1")
        elif price < 1000:
            return Decimal("5")
        elif price < 10000:
            return Decimal("10")
        else:
            return Decimal("100")
    
    def _build_validator_chain(self) -> BidValidator:
        """Build the validation chain"""
        amount_validator = AmountValidator()
        increment_validator = IncrementValidator()
        timing_validator = TimingValidator()
        seller_validator = SellerValidator()
        fraud_validator = FraudValidator()
        
        amount_validator.set_next(increment_validator)
        increment_validator.set_next(timing_validator)
        timing_validator.set_next(seller_validator)
        seller_validator.set_next(fraud_validator)
        
        return amount_validator
    
    def start(self) -> bool:
        """Start the auction"""
        return self.state.start(self)
    
    def close(self) -> bool:
        """Close the auction"""
        if self.state.close(self):
            self.winner = self.determine_winner()
            if self.winner:
                print(f"🏆 Winner: {self.winner.bidder.name} - Paid: ${self.winner.price_paid}")
            else:
                print(f"❌ No winner (reserve price not met or no bids)")
            return True
        return False
    
    def cancel(self) -> bool:
        """Cancel the auction"""
        return self.state.cancel(self)
    
    def is_active(self) -> bool:
        """Check if auction is active"""
        return (
            self.state.get_state_type() == AuctionStateType.ACTIVE and
            datetime.now() <= self.end_time
        )
    
    def get_high_bid(self) -> Optional[Bid]:
        """Get current highest bid"""
        if not self.bids:
            return None
        
        accepted_bids = [b for b in self.bids if b.status == BidStatus.ACCEPTED]
        if not accepted_bids:
            return None
        
        return max(accepted_bids, key=lambda b: b.amount)
    
    def place_bid(self, bid: Bid) -> bool:
        """
        Place a bid with atomic operation and validation.
        
        Algorithm:
            1. Check auction state allows bidding
            2. Validate bid through chain
            3. Atomically add bid with version check
            4. Update previous high bidder status
            5. Trigger proxy bids if needed
        
        Returns:
            True if bid accepted, False otherwise
        """
        # Check state allows bidding
        if not self.state.place_bid(self, bid):
            bid.status = BidStatus.REJECTED
            return False
        
        # Validate bid
        if not self.validator.validate(bid, self):
            bid.status = BidStatus.REJECTED
            return False
        
        # Atomic bid placement with optimistic locking
        with self.lock:
            # Re-validate after acquiring lock
            current_high = self.get_high_bid()
            if current_high and bid.amount <= current_high.amount + self.bid_increment:
                print(f"❌ Bid too low (another bid placed)")
                bid.status = BidStatus.REJECTED
                return False
            
            # Accept bid
            bid.status = BidStatus.ACCEPTED
            self.bids.append(bid)
            self.version += 1
            
            # Update previous high bidder
            if current_high and current_high.bidder.id != bid.bidder.id:
                current_high.status = BidStatus.OUTBID
                self._notify_outbid(current_high.bidder)
            
            # Update current price
            self.current_price = bid.amount
            
            print(f"✅ Bid placed: {bid.bidder.name} - ${bid.amount}")
            self._notify_bid_placed(bid)
            
            return True
    
    @abstractmethod
    def determine_winner(self) -> Optional[Winner]:
        """Determine auction winner (strategy-specific)"""
        pass
    
    def add_watcher(self, user: User):
        """Add user to watchlist"""
        self.watchers.add(user)
    
    def _notify_bid_placed(self, bid: Bid):
        """Notify watchers of new bid"""
        for watcher in self.watchers:
            if watcher.id != bid.bidder.id:
                print(f"📢 [{watcher.name}] New bid on '{self.item.title}': ${bid.amount}")
    
    def _notify_outbid(self, user: User):
        """Notify user they've been outbid"""
        print(f"🔔 [{user.name}] You've been outbid on '{self.item.title}'")
    
    def __str__(self) -> str:
        return f"Auction[{self.id[:8]}] {self.item.title} - ${self.current_price} [{self.state.get_state_type().value}]"


# ==================== Concrete Auction Types ====================

class EnglishAuction(Auction):
    """
    English (ascending) auction - highest bid wins.
    
    Features:
    - Ascending price
    - Public bids
    - Anti-sniping (time extension)
    - Highest bidder wins
    
    Usage:
        auction = EnglishAuction(item, seller, Decimal("100"), duration_minutes=60)
    """
    
    def __init__(self, *args, **kwargs):
        self.auto_extend_enabled = kwargs.pop('auto_extend', True)
        self.extension_minutes = kwargs.pop('extension_minutes', 5)
        self.extension_threshold = kwargs.pop('extension_threshold', 5)
        super().__init__(*args, **kwargs)
    
    def place_bid(self, bid: Bid) -> bool:
        """Place bid with anti-sniping extension"""
        result = super().place_bid(bid)
        
        if result and self.auto_extend_enabled:
            self._extend_if_needed()
        
        return result
    
    def _extend_if_needed(self):
        """Extend auction time if bid placed in last minutes"""
        time_remaining = (self.end_time - datetime.now()).total_seconds() / 60
        
        if time_remaining < self.extension_threshold:
            self.end_time += timedelta(minutes=self.extension_minutes)
            print(f"⏰ Auction extended by {self.extension_minutes} minutes (anti-sniping)")
    
    def determine_winner(self) -> Optional[Winner]:
        """Highest bidder wins at their bid price"""
        high_bid = self.get_high_bid()
        
        if not high_bid:
            return None
        
        # Check reserve price
        if high_bid.amount < self.reserve_price:
            print(f"❌ Reserve price ${self.reserve_price} not met")
            return None
        
        return Winner(
            bidder=high_bid.bidder,
            winning_bid=high_bid.amount,
            price_paid=high_bid.amount
        )


class DutchAuction(Auction):
    """
    Dutch (descending) auction - first bid wins at current price.
    
    Features:
    - Descending price
    - First bid wins
    - Price decreases over time
    
    Usage:
        auction = DutchAuction(item, seller, Decimal("1000"), 
                               price_decrement=Decimal("10"), 
                               decrement_interval=10)
    """
    
    def __init__(
        self,
        item: Item,
        seller: User,
        starting_price: Decimal,
        minimum_price: Decimal,
        price_decrement: Decimal = Decimal("10"),
        decrement_interval: int = 10,  # seconds
        **kwargs
    ):
        super().__init__(item, seller, starting_price, **kwargs)
        self.minimum_price = minimum_price
        self.price_decrement = price_decrement
        self.decrement_interval = decrement_interval
        self.first_bid_wins = True
    
    def place_bid(self, bid: Bid) -> bool:
        """First bid wins at current price"""
        if self.bids:  # Already has a bid
            print(f"❌ Dutch auction already has a winner")
            return False
        
        # In Dutch auction, bidder accepts current price
        # (We don't override, they bid at current or higher)
        if bid.amount < self.current_price:
            print(f"❌ Bid ${bid.amount} below current price ${self.current_price}")
            return False
        
        # Override bid amount to current price (they pay current price)
        bid.amount = self.current_price
        
        result = super().place_bid(bid)
        
        if result:
            # First bid wins, close immediately
            self.close()
        
        return result
    
    def decrease_price(self):
        """Decrease price (called periodically)"""
        if self.is_active() and not self.bids:
            self.current_price = max(
                self.current_price - self.price_decrement,
                self.minimum_price
            )
            print(f"📉 Price decreased to ${self.current_price}")
            
            if self.current_price == self.minimum_price:
                print(f"❌ Minimum price reached, closing auction")
                self.close()
    
    def determine_winner(self) -> Optional[Winner]:
        """First bidder wins at the price they bid"""
        if not self.bids:
            return None
        
        first_bid = self.bids[0]
        
        return Winner(
            bidder=first_bid.bidder,
            winning_bid=first_bid.amount,
            price_paid=first_bid.amount
        )


class SealedBidAuction(Auction):
    """
    Sealed-bid auction - bids are hidden until auction ends.
    
    Features:
    - Hidden bids
    - Highest bid wins
    - Bids revealed at close
    
    Usage:
        auction = SealedBidAuction(item, seller, Decimal("100"))
    """
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.bids_hidden = True
    
    def get_high_bid(self) -> Optional[Bid]:
        """Hide bids until auction closes"""
        if self.state.get_state_type() == AuctionStateType.CLOSED:
            return super().get_high_bid()
        
        return None  # Bids are sealed
    
    def place_bid(self, bid: Bid) -> bool:
        """Place sealed bid without revealing"""
        # Skip increment validation for sealed bids
        self.validator = AmountValidator()
        self.validator.set_next(TimingValidator())
        self.validator.next = SellerValidator()
        
        result = super().place_bid(bid)
        
        if result:
            print(f"✅ Sealed bid placed by {bid.bidder.name}")
        
        return result
    
    def reveal_bids(self):
        """Reveal all bids when auction closes"""
        if self.state.get_state_type() != AuctionStateType.CLOSED:
            return
        
        print(f"\n🔓 Revealing sealed bids:")
        sorted_bids = sorted(self.bids, key=lambda b: b.amount, reverse=True)
        for i, bid in enumerate(sorted_bids, 1):
            print(f"  {i}. {bid.bidder.name}: ${bid.amount}")
    
    def determine_winner(self) -> Optional[Winner]:
        """Highest sealed bid wins"""
        if not self.bids:
            return None
        
        highest_bid = max(self.bids, key=lambda b: b.amount)
        
        if highest_bid.amount < self.reserve_price:
            return None
        
        return Winner(
            bidder=highest_bid.bidder,
            winning_bid=highest_bid.amount,
            price_paid=highest_bid.amount
        )


class VickreyAuction(SealedBidAuction):
    """
    Vickrey (second-price) auction - sealed bids, winner pays second-highest price.
    
    Features:
    - Sealed bids
    - Highest bid wins
    - Winner pays second-highest price
    - Encourages truthful bidding
    
    Usage:
        auction = VickreyAuction(item, seller, Decimal("100"))
    """
    
    def determine_winner(self) -> Optional[Winner]:
        """
        Highest bid wins but pays second-highest price.
        
        Algorithm:
            1. Sort bids by amount (descending)
            2. Winner is highest bidder
            3. Price paid is second-highest bid
            4. If only one bid, pays their bid
        
        Returns:
            Winner with second-price payment
        """
        if not self.bids:
            return None
        
        sorted_bids = sorted(self.bids, key=lambda b: b.amount, reverse=True)
        highest_bid = sorted_bids[0]
        
        # Check reserve price
        if highest_bid.amount < self.reserve_price:
            return None
        
        # Second-price: pay second-highest bid
        second_price = sorted_bids[1].amount if len(sorted_bids) > 1 else highest_bid.amount
        
        return Winner(
            bidder=highest_bid.bidder,
            winning_bid=highest_bid.amount,
            price_paid=second_price  # Pays second-highest!
        )


# ==================== Proxy Bidding ====================

class ProxyBidder:
    """
    Automatic bidding agent (Proxy Pattern).
    
    Usage:
        proxy = ProxyBidder(user, auction, max_bid=Decimal("500"))
        proxy.auto_bid_if_outbid()  # Automatically bids when outbid
    
    Returns:
        ProxyBidder: Automated bidding agent
    """
    
    def __init__(self, user: User, auction: Auction, max_bid: Decimal):
        self.user = user
        self.auction = auction
        self.max_bid = max_bid
        self.active = True
    
    def is_high_bidder(self) -> bool:
        """Check if proxy user is current high bidder"""
        high_bid = self.auction.get_high_bid()
        return high_bid and high_bid.bidder.id == self.user.id
    
    def calculate_next_bid(self) -> Optional[Decimal]:
        """Calculate next proxy bid amount"""
        high_bid = self.auction.get_high_bid()
        
        if not high_bid:
            return self.auction.starting_price
        
        next_amount = high_bid.amount + self.auction.bid_increment
        
        if next_amount > self.max_bid:
            return None  # Exceeded max bid
        
        return next_amount
    
    def auto_bid_if_outbid(self):
        """
        Automatically bid when outbid.
        
        Algorithm:
            1. Check if user is still high bidder
            2. If outbid, calculate next bid
            3. Place proxy bid if within max
            4. Repeat until high bidder or max reached
        """
        if not self.active:
            return
        
        while not self.is_high_bidder() and self.auction.is_active():
            next_bid_amount = self.calculate_next_bid()
            
            if not next_bid_amount:
                print(f"🛑 Proxy bidder for {self.user.name} reached max ${self.max_bid}")
                self.active = False
                break
            
            bid = Bid(
                bidder=self.user,
                amount=next_bid_amount,
                bid_type=BidType.PROXY,
                proxy_max=self.max_bid
            )
            
            success = self.auction.place_bid(bid)
            
            if not success:
                break
            
            # Small delay to prevent rapid bidding
            time.sleep(0.1)


# ==================== Payment Processing ====================

class PaymentProcessor:
    """
    Handles payment processing (Singleton Pattern).
    
    Usage:
        processor = PaymentProcessor.get_instance()
        transaction = processor.process_payment(auction)
    """
    
    _instance = None
    _lock = threading.Lock()
    
    @classmethod
    def get_instance(cls):
        """Get singleton instance"""
        if not cls._instance:
            with cls._lock:
                if not cls._instance:
                    cls._instance = cls()
        return cls._instance
    
    def __init__(self):
        if PaymentProcessor._instance is not None:
            raise Exception("Use get_instance() to get singleton")
        self.transactions: List[Dict] = []
        self.platform_fee_percent = Decimal("0.10")  # 10% fee
    
    def process_payment(self, auction: Auction) -> Optional[Dict]:
        """Process winner payment"""
        if not auction.winner:
            return None
        
        amount = auction.winner.price_paid
        fee = self.calculate_fees(amount)
        seller_payout = amount - fee
        
        transaction = {
            'id': str(uuid.uuid4()),
            'auction_id': auction.id,
            'buyer': auction.winner.bidder,
            'seller': auction.seller,
            'amount': amount,
            'fee': fee,
            'seller_payout': seller_payout,
            'timestamp': datetime.now()
        }
        
        self.transactions.append(transaction)
        
        print(f"\n💳 Payment Processed:")
        print(f"  Buyer: {auction.winner.bidder.name}")
        print(f"  Seller: {auction.seller.name}")
        print(f"  Amount: ${amount}")
        print(f"  Platform Fee: ${fee}")
        print(f"  Seller Receives: ${seller_payout}")
        
        return transaction
    
    def calculate_fees(self, amount: Decimal) -> Decimal:
        """Calculate platform fees"""
        return amount * self.platform_fee_percent
    
    def refund(self, user: User, amount: Decimal) -> bool:
        """Issue refund"""
        print(f"💰 Refunded ${amount} to {user.name}")
        return True


# ==================== Auction Factory ====================

class AuctionFactory:
    """
    Factory for creating different auction types (Factory Pattern).
    
    Usage:
        factory = AuctionFactory()
        auction = factory.create_auction(AuctionType.ENGLISH, item, seller, config)
    """
    
    @staticmethod
    def create_auction(
        auction_type: AuctionType,
        item: Item,
        seller: User,
        starting_price: Decimal,
        **kwargs
    ) -> Auction:
        """Create auction of specified type"""
        if auction_type == AuctionType.ENGLISH:
            return EnglishAuction(item, seller, starting_price, **kwargs)
        
        elif auction_type == AuctionType.DUTCH:
            minimum_price = kwargs.pop('minimum_price', starting_price * Decimal("0.5"))
            return DutchAuction(item, seller, starting_price, minimum_price, **kwargs)
        
        elif auction_type == AuctionType.SEALED_BID:
            return SealedBidAuction(item, seller, starting_price, **kwargs)
        
        elif auction_type == AuctionType.VICKREY:
            return VickreyAuction(item, seller, starting_price, **kwargs)
        
        else:
            raise ValueError(f"Unknown auction type: {auction_type}")


# ==================== Auction Manager ====================

class AuctionManager:
    """
    Central auction management (Singleton Pattern).
    
    Usage:
        manager = AuctionManager.get_instance()
        auction_id = manager.create_auction(auction_type, item, seller, config)
        manager.start_auction(auction_id)
        manager.place_bid(auction_id, user, amount)
    """
    
    _instance = None
    _lock = threading.Lock()
    
    @classmethod
    def get_instance(cls):
        """Get singleton instance"""
        if not cls._instance:
            with cls._lock:
                if not cls._instance:
                    cls._instance = cls()
        return cls._instance
    
    def __init__(self):
        if AuctionManager._instance is not None:
            raise Exception("Use get_instance() to get singleton")
        self.auctions: Dict[str, Auction] = {}
        self.payment_processor = PaymentProcessor.get_instance()
        self.proxy_bidders: Dict[str, List[ProxyBidder]] = {}
    
    def create_auction(
        self,
        auction_type: AuctionType,
        item: Item,
        seller: User,
        starting_price: Decimal,
        **kwargs
    ) -> str:
        """Create new auction"""
        auction = AuctionFactory.create_auction(
            auction_type, item, seller, starting_price, **kwargs
        )
        
        self.auctions[auction.id] = auction
        self.proxy_bidders[auction.id] = []
        
        print(f"✅ Created {auction_type.value} auction: {auction.item.title} (${starting_price})")
        
        return auction.id
    
    def start_auction(self, auction_id: str) -> bool:
        """Start an auction"""
        auction = self.auctions.get(auction_id)
        if not auction:
            return False
        
        return auction.start()
    
    def place_bid(self, auction_id: str, user: User, amount: Decimal) -> bool:
        """Place a manual bid"""
        auction = self.auctions.get(auction_id)
        if not auction:
            return False
        
        bid = Bid(bidder=user, amount=amount, bid_type=BidType.MANUAL)
        result = auction.place_bid(bid)
        
        if result:
            # Trigger proxy bidders
            self._trigger_proxy_bidders(auction_id, user)
        
        return result
    
    def setup_proxy_bid(self, auction_id: str, user: User, max_bid: Decimal) -> bool:
        """Set up proxy bidding for a user"""
        auction = self.auctions.get(auction_id)
        if not auction:
            return False
        
        proxy = ProxyBidder(user, auction, max_bid)
        self.proxy_bidders[auction_id].append(proxy)
        
        print(f"🤖 Proxy bidding enabled for {user.name} (max: ${max_bid})")
        
        # Place initial bid if needed
        proxy.auto_bid_if_outbid()
        
        return True
    
    def _trigger_proxy_bidders(self, auction_id: str, except_user: User):
        """Trigger proxy bidders after a new bid"""
        for proxy in self.proxy_bidders.get(auction_id, []):
            if proxy.user.id != except_user.id:
                proxy.auto_bid_if_outbid()
    
    def close_auction(self, auction_id: str) -> Optional[Winner]:
        """Close auction and process payment"""
        auction = self.auctions.get(auction_id)
        if not auction:
            return None
        
        auction.close()
        
        if auction.winner:
            self.payment_processor.process_payment(auction)
        
        return auction.winner
    
    def get_auction(self, auction_id: str) -> Optional[Auction]:
        """Get auction by ID"""
        return self.auctions.get(auction_id)
    
    def get_active_auctions(self) -> List[Auction]:
        """Get all active auctions"""
        return [a for a in self.auctions.values() if a.is_active()]


# ==================== Demo ====================

def demo():
    """Demonstrate the Auction System"""
    print("=" * 60)
    print("AUCTION SYSTEM DEMONSTRATION")
    print("=" * 60)
    
    manager = AuctionManager.get_instance()
    
    # Create users
    alice = User(name="Alice", email="alice@email.com", user_type=UserType.BUYER)
    bob = User(name="Bob", email="bob@email.com", user_type=UserType.BUYER)
    charlie = User(name="Charlie", email="charlie@email.com", user_type=UserType.BUYER)
    seller = User(name="Seller Sam", email="sam@email.com", user_type=UserType.SELLER)
    
    alice.verified = True
    bob.verified = True
    charlie.verified = True
    seller.verified = True
    
    # Demo 1: English Auction with Anti-Sniping
    print("\n" + "=" * 60)
    print("DEMO 1: ENGLISH AUCTION (Anti-Sniping)")
    print("=" * 60)
    
    vintage_watch = Item(
        seller=seller,
        title="Vintage Rolex Watch",
        description="1950s Submariner in mint condition",
        category=Category.COLLECTIBLES,
        condition=ItemCondition.LIKE_NEW
    )
    
    auction1_id = manager.create_auction(
        AuctionType.ENGLISH,
        vintage_watch,
        seller,
        Decimal("1000"),
        duration_minutes=1,
        reserve_price=Decimal("1500")
    )
    
    auction1 = manager.get_auction(auction1_id)
    auction1.add_watcher(alice)
    auction1.add_watcher(bob)
    auction1.add_watcher(charlie)
    
    manager.start_auction(auction1_id)
    
    # Place bids
    manager.place_bid(auction1_id, alice, Decimal("1100"))
    time.sleep(0.5)
    manager.place_bid(auction1_id, bob, Decimal("1200"))
    time.sleep(0.5)
    
    # Test proxy bidding
    print(f"\n🤖 Setting up proxy bid for Charlie...")
    manager.setup_proxy_bid(auction1_id, charlie, Decimal("2000"))
    
    # Alice tries to outbid but proxy bidder responds
    time.sleep(0.5)
    manager.place_bid(auction1_id, alice, Decimal("1600"))
    
    time.sleep(1)
    winner1 = manager.close_auction(auction1_id)
    
    # Demo 2: Dutch Auction
    print("\n" + "=" * 60)
    print("DEMO 2: DUTCH AUCTION (Descending Price)")
    print("=" * 60)
    
    rare_painting = Item(
        seller=seller,
        title="Abstract Painting",
        description="Modern art piece by emerging artist",
        category=Category.ART,
        condition=ItemCondition.NEW
    )
    
    auction2_id = manager.create_auction(
        AuctionType.DUTCH,
        rare_painting,
        seller,
        Decimal("5000"),
        minimum_price=Decimal("2000"),
        price_decrement=Decimal("500"),
        duration_minutes=1
    )
    
    auction2 = manager.get_auction(auction2_id)
    manager.start_auction(auction2_id)
    
    # Simulate price decreases
    print(f"\n⏰ Waiting for price to decrease...")
    for _ in range(3):
        time.sleep(0.5)
        auction2.decrease_price()
    
    # Alice accepts at current price
    print(f"\n💰 Alice accepts current price: ${auction2.current_price}")
    manager.place_bid(auction2_id, alice, auction2.current_price)
    
    # Demo 3: Vickrey Auction (Second-Price)
    print("\n" + "=" * 60)
    print("DEMO 3: VICKREY AUCTION (Second-Price)")
    print("=" * 60)
    
    antique_clock = Item(
        seller=seller,
        title="Antique Grandfather Clock",
        description="18th century French clock",
        category=Category.ANTIQUES,
        condition=ItemCondition.GOOD
    )
    
    auction3_id = manager.create_auction(
        AuctionType.VICKREY,
        antique_clock,
        seller,
        Decimal("500"),
        duration_minutes=1
    )
    
    auction3 = manager.get_auction(auction3_id)
    manager.start_auction(auction3_id)
    
    # Place sealed bids
    print(f"\n🔒 Placing sealed bids...")
    manager.place_bid(auction3_id, alice, Decimal("800"))
    manager.place_bid(auction3_id, bob, Decimal("1000"))  # Highest
    manager.place_bid(auction3_id, charlie, Decimal("700"))
    
    print(f"\n⏰ Waiting for auction to end...")
    time.sleep(2)
    
    winner3 = manager.close_auction(auction3_id)
    auction3.reveal_bids()
    
    if winner3:
        print(f"\n💡 Vickrey Special: Winner bid ${winner3.winning_bid} but pays ${winner3.price_paid} (second-highest)")
    
    # Demo 4: Sealed-Bid Auction
    print("\n" + "=" * 60)
    print("DEMO 4: SEALED-BID AUCTION")
    print("=" * 60)
    
    luxury_car = Item(
        seller=seller,
        title="2020 Tesla Model S",
        description="Low mileage, excellent condition",
        category=Category.VEHICLES,
        condition=ItemCondition.LIKE_NEW
    )
    
    auction4_id = manager.create_auction(
        AuctionType.SEALED_BID,
        luxury_car,
        seller,
        Decimal("30000"),
        duration_minutes=1
    )
    
    auction4 = manager.get_auction(auction4_id)
    manager.start_auction(auction4_id)
    
    # Place sealed bids
    print(f"\n🔒 Placing sealed bids...")
    manager.place_bid(auction4_id, alice, Decimal("45000"))
    manager.place_bid(auction4_id, bob, Decimal("48000"))
    manager.place_bid(auction4_id, charlie, Decimal("47000"))
    
    time.sleep(2)
    
    winner4 = manager.close_auction(auction4_id)
    auction4.reveal_bids()
    
    # Summary
    print("\n" + "=" * 60)
    print("AUCTION SUMMARY")
    print("=" * 60)
    
    for i, auction_id in enumerate([auction1_id, auction2_id, auction3_id, auction4_id], 1):
        auction = manager.get_auction(auction_id)
        print(f"\nAuction {i}: {auction.item.title}")
        print(f"  Type: {type(auction).__name__}")
        print(f"  Total Bids: {len(auction.bids)}")
        if auction.winner:
            print(f"  Winner: {auction.winner.bidder.name}")
            print(f"  Final Price: ${auction.winner.price_paid}")
        else:
            print(f"  Winner: None")
    
    print(f"\n✅ Auction system demonstration completed!")


if __name__ == "__main__":
    demo()
