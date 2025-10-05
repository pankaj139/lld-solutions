# Auction System - Low Level Design

## Table of Contents

- [Overview](#overview)
- [Requirements](#requirements)
  - [Functional Requirements](#functional-requirements)
  - [Non-Functional Requirements](#non-functional-requirements)
- [Core Use Cases](#core-use-cases)
- [Design Patterns Used](#design-patterns-used)
- [Class Diagram](#class-diagram)
- [Component Design](#component-design)
- [Data Structures](#data-structures)
- [API Design](#api-design)
- [Implementation Details](#implementation-details)
- [Business Rules](#business-rules)
- [Extension Points](#extension-points)
- [Complexity Analysis](#complexity-analysis)
- [Trade-offs and Design Decisions](#trade-offs-and-design-decisions)

## Overview

An Auction System is a platform (like eBay, Christie's, Sotheby's) that enables users to buy and sell items through competitive bidding. The system supports multiple auction types, real-time bidding, payment processing, and winner determination with various bidding strategies.

### Key Features

- **Multiple Auction Types**: English (ascending), Dutch (descending), Sealed-bid, Vickrey (second-price)
- **Real-time Bidding**: Concurrent bid processing with race condition handling
- **Bid Management**: Place, retract, proxy bidding, auto-bidding
- **Auction Lifecycle**: Schedule, start, extend, close, cancel
- **Payment Processing**: Winner determination, payment, escrow, refunds
- **Notifications**: Real-time bid updates, outbid alerts, auction end notifications
- **User Management**: Buyers, sellers, admins with reputation system
- **Search and Discovery**: Category filtering, featured auctions, watchlist
- **Anti-Sniping**: Time extensions on last-minute bids
- **Fraud Prevention**: Bid validation, user verification, dispute resolution

## Requirements

### Functional Requirements

1. **Auction Creation**
   - Create auction with item details
   - Set starting price, reserve price (minimum acceptable)
   - Configure auction type and duration
   - Set bid increment rules
   - Add images and description
   - Schedule start time

2. **Auction Types**
   - **English Auction**: Ascending price, highest bid wins
   - **Dutch Auction**: Descending price, first bid wins
   - **Sealed-bid Auction**: Hidden bids, highest wins
   - **Vickrey Auction**: Sealed-bid, second-highest price
   - **Buy Now**: Fixed price option

3. **Bidding**
   - Place manual bid with validation
   - Proxy bidding (auto-bid up to max)
   - View current bid and bid history
   - Retract bid (with restrictions)
   - Outbid notifications
   - Bid increment enforcement

4. **Auction Lifecycle**
   - Schedule auction start
   - Auto-start at scheduled time
   - Real-time bid updates
   - Time extension on last-minute bids
   - Auto-close at end time
   - Winner determination
   - Payment processing

5. **Payment and Settlement**
   - Winner notification
   - Payment collection
   - Escrow management
   - Seller payout
   - Refund processing
   - Transaction fees

6. **User Features**
   - Register as buyer/seller
   - User reputation and ratings
   - Watchlist management
   - Bid history tracking
   - Won/sold items history
   - Saved searches

7. **Notifications**
   - Outbid alerts
   - Auction ending soon
   - Auction won/lost
   - Payment reminders
   - Delivery updates

8. **Search and Browse**
   - Category browsing
   - Keyword search
   - Filter by price, time, location
   - Featured auctions
   - Trending items

9. **Admin Functions**
   - Monitor auctions
   - Resolve disputes
   - Ban fraudulent users
   - Cancel problematic auctions
   - Analytics and reporting

10. **Fraud Prevention**
    - Bid validation
    - Shill bidding detection
    - User verification
    - Suspicious activity alerts
    - Dispute resolution

### Non-Functional Requirements

1. **Performance**
   - Handle 10,000+ concurrent auctions
   - Process bids in <100ms
   - Real-time bid updates (<1s latency)
   - Scalable to millions of users

2. **Reliability**
   - 99.9% uptime
   - No lost bids
   - Accurate winner determination
   - Transaction consistency

3. **Concurrency**
   - Handle simultaneous bids
   - Prevent race conditions
   - Optimistic locking for bids
   - Atomic operations

4. **Security**
   - Encrypted payment data
   - Secure authentication
   - Fraud detection
   - DDoS protection

5. **Availability**
   - 24/7 operation
   - Failover mechanisms
   - Data replication
   - Disaster recovery

## Core Use Cases

### Use Case 1: Create and Start Auction

```text
Actor: Seller
Precondition: User is registered and verified

Main Flow:
1. Seller creates new auction
2. Provides item details, images, description
3. Sets starting price and reserve price
4. Chooses auction type and duration
5. Schedules start time
6. System validates auction details
7. System schedules auction
8. Auction starts at scheduled time
9. System notifies interested buyers

Alternative Flow:
- Immediate start → Auction begins instantly
- Invalid details → Show validation errors
- Reserve not met → Auction ends without winner
```

### Use Case 2: Place Bid

```text
Actor: Buyer
Precondition: Auction is active, buyer is authenticated

Main Flow:
1. Buyer views auction details
2. Buyer enters bid amount
3. System validates bid (amount, increment, timing)
4. System checks for concurrent bids
5. System places bid if valid
6. System outbids previous high bidder
7. System notifies all watchers
8. Buyer becomes current high bidder

Alternative Flow:
- Bid too low → Reject with minimum required
- Concurrent bid → Handle race condition
- Proxy bid active → Auto-increment if needed
- Auction ended → Reject bid
```

### Use Case 3: Close Auction and Determine Winner

```text
Actor: System
Precondition: Auction time expires

Main Flow:
1. Auction end time reached
2. System checks for last-minute bids
3. Apply time extension if needed
4. Close auction when time expires
5. Determine winner (highest bidder)
6. Check if reserve price met
7. Notify winner and seller
8. Initiate payment process
9. Update item status to sold

Alternative Flow:
- No bids → Auction ends without winner
- Reserve not met → Notify seller, no sale
- Winner doesn't pay → Offer to second highest
- Dispute raised → Admin review
```

## Design Patterns Used

### 1. State Pattern

- **Purpose**: Manage auction lifecycle states
- **Usage**: Scheduled, Active, Paused, Closed, Cancelled states
- **Benefit**: Clean state transitions and behavior isolation

### 2. Strategy Pattern

- **Purpose**: Different auction and bidding strategies
- **Usage**: EnglishAuction, DutchAuction, SealedBid, VickreyAuction strategies
- **Benefit**: Easy to add new auction types

### 3. Observer Pattern

- **Purpose**: Real-time notifications for auction events
- **Usage**: Bid placed, outbid, auction ending, auction closed
- **Benefit**: Decoupled notification system

### 4. Command Pattern

- **Purpose**: Encapsulate bid operations
- **Usage**: PlaceBidCommand, RetractBidCommand with undo capability
- **Benefit**: Transaction support, undo/redo, logging

### 5. Factory Pattern

- **Purpose**: Create different auction types
- **Usage**: AuctionFactory creates English, Dutch, Sealed, Vickrey auctions
- **Benefit**: Centralized creation logic

### 6. Chain of Responsibility Pattern

- **Purpose**: Bid validation pipeline
- **Usage**: AmountValidator → IncrementValidator → TimingValidator → FraudValidator
- **Benefit**: Extensible validation chain

### 7. Proxy Pattern

- **Purpose**: Proxy bidding (auto-bid on behalf of user)
- **Usage**: ProxyBidder with max bid limit
- **Benefit**: Automatic bidding without user interaction

### 8. Singleton Pattern

- **Purpose**: Single auction manager instance
- **Usage**: AuctionManager, PaymentProcessor
- **Benefit**: Centralized auction management

### 9. Template Method Pattern

- **Purpose**: Standardize auction workflow
- **Usage**: AuctionTemplate defines common steps, subclasses implement specifics
- **Benefit**: Consistent auction behavior

### 10. Decorator Pattern

- **Purpose**: Add features to auctions
- **Usage**: FeaturedAuction, ReserveAuction, BuyNowAuction decorators
- **Benefit**: Dynamic feature addition

## Class Diagram

```text
┌─────────────────────────────────┐
│   User                          │
├─────────────────────────────────┤
│ - id: str                       │
│ - name: str                     │
│ - email: str                    │
│ - type: UserType (Buyer/Seller)│
│ - reputation: float             │
│ - verified: bool                │
├─────────────────────────────────┤
│ + place_bid(auction, amount)    │
│ + create_auction(item)          │
│ + get_watchlist(): List         │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│   Item                          │
├─────────────────────────────────┤
│ - id: str                       │
│ - title: str                    │
│ - description: str              │
│ - category: Category            │
│ - images: List[str]             │
│ - condition: Condition          │
│ - seller: User                  │
├─────────────────────────────────┤
│ + get_details(): Dict           │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│   Auction                       │
│   <<abstract>>                  │
├─────────────────────────────────┤
│ - id: str                       │
│ - item: Item                    │
│ - seller: User                  │
│ - starting_price: Decimal       │
│ - reserve_price: Decimal        │
│ - current_price: Decimal        │
│ - bids: List[Bid]               │
│ - state: AuctionState           │
│ - start_time: datetime          │
│ - end_time: datetime            │
│ - bid_increment: Decimal        │
├─────────────────────────────────┤
│ + place_bid(bid): bool          │
│ + start()                       │
│ + close()                       │
│ + determine_winner(): User      │
│ + is_active(): bool             │
└─────────────────────────────────┘
         ▲
         │
    ┌────┴─────┬──────────┬─────────┐
    │          │          │         │
┌───┴───────┐ ┌┴────────┐ ┌┴───────┐ ┌┴─────────┐
│English    │ │Dutch    │ │Sealed  │ │Vickrey   │
│Auction    │ │Auction  │ │Bid     │ │Auction   │
└───────────┘ └─────────┘ └────────┘ └──────────┘

┌─────────────────────────────────┐
│   EnglishAuction                │
├─────────────────────────────────┤
│ - current_high_bidder: User     │
│ - auto_extend_enabled: bool     │
├─────────────────────────────────┤
│ + place_bid(bid): bool          │
│ + extend_if_needed()            │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│   DutchAuction                  │
├─────────────────────────────────┤
│ - price_decrement: Decimal      │
│ - decrement_interval: int       │
│ - first_bid_wins: bool          │
├─────────────────────────────────┤
│ + decrease_price()              │
│ + accept_first_bid()            │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│   SealedBidAuction              │
├─────────────────────────────────┤
│ - bids_hidden: bool             │
├─────────────────────────────────┤
│ + place_bid(bid): bool          │
│ + reveal_bids()                 │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│   VickreyAuction                │
├─────────────────────────────────┤
│ - second_price: Decimal         │
├─────────────────────────────────┤
│ + determine_winner(): User      │
│ + calculate_price(): Decimal    │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│   Bid                           │
├─────────────────────────────────┤
│ - id: str                       │
│ - bidder: User                  │
│ - amount: Decimal               │
│ - timestamp: datetime           │
│ - bid_type: BidType             │
│ - proxy_max: Decimal            │
│ - status: BidStatus             │
├─────────────────────────────────┤
│ + validate(): bool              │
│ + is_valid_increment(): bool    │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│   ProxyBidder                   │
├─────────────────────────────────┤
│ - user: User                    │
│ - max_bid: Decimal              │
│ - auction: Auction              │
├─────────────────────────────────┤
│ + auto_bid_if_outbid()          │
│ + calculate_next_bid(): Decimal │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│   AuctionState                  │
│   <<interface>>                 │
├─────────────────────────────────┤
│ + start(auction)                │
│ + place_bid(auction, bid)       │
│ + close(auction)                │
│ + cancel(auction)               │
└─────────────────────────────────┘
         ▲
         │
    ┌────┴─────┬──────────┬────────┐
    │          │          │        │
┌───┴─────┐ ┌──┴────┐  ┌──┴────┐ ┌┴────────┐
│Scheduled│ │Active │  │Paused │ │Closed   │
└─────────┘ └───────┘  └───────┘ └─────────┘

┌─────────────────────────────────┐
│   BidValidator                  │
│   <<interface>>                 │
├─────────────────────────────────┤
│ + validate(bid, auction): bool  │
│ + set_next(validator)           │
└─────────────────────────────────┘
         ▲
         │
    ┌────┴─────┬──────────┬─────────┐
    │          │          │         │
┌───┴────────┐ ┌┴────────┐ ┌┴───────┐ ┌┴──────────┐
│Amount      │ │Increment│ │Timing  │ │Fraud      │
│Validator   │ │Validator│ │Validator│ │Validator  │
└────────────┘ └─────────┘ └────────┘ └───────────┘

┌─────────────────────────────────┐
│   PaymentProcessor              │
├─────────────────────────────────┤
│ - transactions: List[Txn]       │
│ - escrow_accounts: Dict         │
├─────────────────────────────────┤
│ + process_payment(auction)      │
│ + refund(user, amount)          │
│ + payout_seller(auction)        │
│ + calculate_fees(amount)        │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│   NotificationManager           │
│   (Observer)                    │
├─────────────────────────────────┤
│ - observers: List[Observer]     │
├─────────────────────────────────┤
│ + notify_bid_placed(auction)    │
│ + notify_outbid(user, auction)  │
│ + notify_auction_ending(auction)│
│ + notify_auction_closed(auction)│
│ + subscribe(observer)           │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│   AuctionManager                │
│   (Singleton)                   │
├─────────────────────────────────┤
│ - auctions: Dict[str, Auction]  │
│ - active_auctions: Set[str]     │
│ - scheduled_auctions: PriorityQ │
│ - notification_manager          │
│ - payment_processor             │
├─────────────────────────────────┤
│ + create_auction(details)       │
│ + start_auction(auction_id)     │
│ + place_bid(auction_id, bid)    │
│ + close_auction(auction_id)     │
│ + get_active_auctions(): List   │
│ + search_auctions(query): List  │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│   WatchlistManager              │
├─────────────────────────────────┤
│ - watchlists: Dict[User, List]  │
├─────────────────────────────────┤
│ + add_to_watchlist(user, auction)│
│ + remove_from_watchlist(...)    │
│ + get_watchlist(user): List     │
│ + notify_watched_auctions(user) │
└─────────────────────────────────┘
```

## Component Design

### 1. Auction Component

```python
class Auction:
    """
    Base class for all auction types.
    
    Usage:
        auction = EnglishAuction(item, seller, starting_price, duration)
        auction.place_bid(bid)
        auction.close()
        winner = auction.determine_winner()
    
    Returns:
        Auction: Auction instance with bidding logic
    """
    - id: Unique auction identifier
    - item: Item being auctioned
    - seller: User selling the item
    - starting_price, reserve_price: Price constraints
    - current_price: Current highest bid
    - bids: List of all bids (sorted by time)
    - state: Current auction state
    - start_time, end_time: Auction schedule
    - bid_increment: Minimum bid increase
```

### 2. Bid Component

```python
class Bid:
    """
    Represents a bid placed by a user.
    
    Usage:
        bid = Bid(bidder, amount, BidType.MANUAL)
        if bid.validate(auction):
            auction.place_bid(bid)
    
    Returns:
        Bid: Bid instance with validation
    """
    - bidder: User placing bid
    - amount: Bid amount
    - timestamp: When bid was placed
    - bid_type: MANUAL, PROXY, AUTO
    - proxy_max: Maximum for proxy bids
    - status: PENDING, ACCEPTED, REJECTED, RETRACTED
```

### 3. ProxyBidder Component

```python
class ProxyBidder:
    """
    Automatic bidding agent for a user.
    
    Usage:
        proxy = ProxyBidder(user, auction, max_bid=1000)
        proxy.auto_bid_if_outbid()
    
    Returns:
        ProxyBidder: Proxy bidding agent
    """
    - Automatically bids when user is outbid
    - Bids minimum increment above current price
    - Stops at max_bid limit
    - Transparent to other bidders
```

### 4. State Management

```python
class AuctionState:
    """
    State pattern for auction lifecycle.
    
    States:
    - Scheduled: Created but not started
    - Active: Accepting bids
    - Paused: Temporarily suspended
    - Closed: Ended, winner determined
    - Cancelled: Cancelled by seller/admin
    """
```

## Data Structures

### 1. Priority Queue (for Scheduled Auctions)

```text
Purpose: Manage auctions by start time
Structure: Min-heap by start_time
Operations:
  - Insert: O(log N)
  - Get next: O(log N)
  - Peek: O(1)

Usage: Auto-start auctions at scheduled time
```

### 2. Sorted List (for Bids)

```text
Purpose: Maintain bids in chronological order
Structure: List sorted by timestamp
Operations:
  - Insert: O(N) worst case, O(1) amortized
  - Get highest: O(1) for cached high bid
  - Search: O(log N) binary search

Usage: Quickly find highest bid and bid history
```

### 3. Hash Set (for Active Auctions)

```text
Purpose: Fast lookup of active auctions
Structure: Hash set of auction IDs
Operations:
  - Add: O(1)
  - Remove: O(1)
  - Contains: O(1)

Usage: Check if auction is active
```

### 4. Trie (for Search)

```text
Purpose: Fast prefix search for auction titles
Structure: Prefix tree
Operations:
  - Insert: O(L)
  - Search: O(L + K)

Usage: Autocomplete and keyword search
```

## API Design

### Auction Management APIs

```python
# Create Auction
create_auction(item: Item, type: AuctionType, config: AuctionConfig) -> Auction
    """Create new auction"""
    
start_auction(auction_id: str) -> bool
    """Start a scheduled auction"""
    
close_auction(auction_id: str) -> Winner
    """Close auction and determine winner"""
    
cancel_auction(auction_id: str, reason: str) -> bool
    """Cancel an active auction"""

# Bidding
place_bid(auction_id: str, user: User, amount: Decimal) -> BidResult
    """Place a manual bid"""
    
place_proxy_bid(auction_id: str, user: User, max_bid: Decimal) -> bool
    """Set up proxy bidding"""
    
retract_bid(bid_id: str, reason: str) -> bool
    """Retract a bid (restricted)"""

# Query
get_auction(auction_id: str) -> Auction
    """Get auction details"""
    
get_active_auctions(filters: Dict) -> List[Auction]
    """Get all active auctions with filters"""
    
search_auctions(query: str, filters: Dict) -> List[Auction]
    """Search auctions by keyword"""
    
get_bid_history(auction_id: str) -> List[Bid]
    """Get all bids for an auction"""
```

### User APIs

```python
# Watchlist
add_to_watchlist(user: User, auction_id: str) -> bool
    """Add auction to watchlist"""
    
get_watchlist(user: User) -> List[Auction]
    """Get user's watchlist"""

# History
get_bid_history_for_user(user: User) -> List[Bid]
    """Get user's bidding history"""
    
get_won_auctions(user: User) -> List[Auction]
    """Get auctions won by user"""
    
get_sold_items(seller: User) -> List[Auction]
    """Get items sold by user"""
```

### Payment APIs

```python
# Payment Processing
process_winning_payment(auction: Auction) -> Transaction
    """Collect payment from winner"""
    
payout_seller(auction: Auction) -> Transaction
    """Pay seller after fees"""
    
refund_bidder(user: User, amount: Decimal) -> Transaction
    """Refund a bidder"""
    
calculate_fees(amount: Decimal) -> Decimal
    """Calculate platform fees"""
```

## Implementation Details

### 1. Concurrent Bid Handling

```python
def place_bid_atomic(auction: Auction, bid: Bid) -> bool:
    """
    Atomically place bid with optimistic locking.
    
    Algorithm:
        1. Read current auction state and version
        2. Validate bid against current state
        3. Attempt to update with version check
        4. If version changed, retry (optimistic lock)
        5. If successful, notify observers
    
    Complexity: O(1) average, O(K) with K retries
    """
    max_retries = 3
    for attempt in range(max_retries):
        # Read current state
        current_version = auction.version
        current_high_bid = auction.get_high_bid()
        
        # Validate
        if bid.amount <= current_high_bid.amount + auction.bid_increment:
            return False
        
        # Attempt atomic update
        success = auction.update_if_version(
            new_bid=bid,
            expected_version=current_version
        )
        
        if success:
            notify_bid_placed(auction, bid)
            return True
    
    return False  # Failed after retries
```

### 2. Proxy Bidding Logic

```python
def auto_bid_if_outbid(proxy: ProxyBidder) -> None:
    """
    Automatically bid when proxy user is outbid.
    
    Algorithm:
        1. Check if proxy user is still high bidder
        2. If outbid, calculate next bid
        3. Next bid = current_high + increment
        4. If next_bid <= max_bid, place bid
        5. Repeat until user is high bidder or max reached
    
    Complexity: O(K) where K = number of auto-bids
    """
    while not proxy.is_high_bidder():
        current_high = proxy.auction.get_high_bid().amount
        next_bid = current_high + proxy.auction.bid_increment
        
        if next_bid > proxy.max_bid:
            break  # Max bid reached
        
        bid = Bid(proxy.user, next_bid, BidType.PROXY)
        success = proxy.auction.place_bid(bid)
        
        if not success:
            break  # Bid failed
```

### 3. Dutch Auction Price Decrement

```python
def decrease_price_periodically(dutch_auction: DutchAuction) -> None:
    """
    Decrease price at regular intervals.
    
    Algorithm:
        1. Start at starting_price
        2. Every decrement_interval seconds:
           a. Decrease price by price_decrement
           b. Notify watchers of new price
           c. Check if anyone bids
        3. First bid wins at current price
        4. Or end when minimum price reached
    
    Complexity: O(1) per decrement
    """
    current_price = dutch_auction.starting_price
    
    while dutch_auction.is_active() and current_price > dutch_auction.minimum_price:
        time.sleep(dutch_auction.decrement_interval)
        current_price -= dutch_auction.price_decrement
        dutch_auction.current_price = current_price
        
        notify_price_update(dutch_auction, current_price)
        
        # Check for bids
        if dutch_auction.has_bids():
            dutch_auction.close()
            break
```

### 4. Vickrey Second-Price Calculation

```python
def determine_vickrey_winner(auction: VickreyAuction) -> Winner:
    """
    Determine winner and price in Vickrey auction.
    
    Algorithm:
        1. Reveal all sealed bids
        2. Find highest bid (winner)
        3. Find second-highest bid
        4. Winner pays second-highest price
        5. If reserve not met, no winner
    
    Complexity: O(N log N) for sorting
    """
    if not auction.bids:
        return None
    
    # Sort bids by amount (descending)
    sorted_bids = sorted(auction.bids, key=lambda b: b.amount, reverse=True)
    
    highest_bid = sorted_bids[0]
    second_highest = sorted_bids[1] if len(sorted_bids) > 1 else highest_bid
    
    # Check reserve price
    if highest_bid.amount < auction.reserve_price:
        return None
    
    return Winner(
        bidder=highest_bid.bidder,
        winning_bid=highest_bid.amount,
        price_paid=second_highest.amount  # Pays second price!
    )
```

### 5. Anti-Sniping Time Extension

```python
def extend_if_last_minute_bid(auction: EnglishAuction, bid: Bid) -> None:
    """
    Extend auction time if bid placed in last minutes.
    
    Algorithm:
        1. Check time remaining in auction
        2. If bid placed in last 5 minutes:
           a. Extend end_time by 5 minutes
           b. Notify all watchers
           c. Continue until no bids in extension
    
    Complexity: O(1)
    """
    time_remaining = auction.end_time - datetime.now()
    
    if time_remaining.total_seconds() < 300:  # 5 minutes
        auction.end_time += timedelta(minutes=5)
        notify_time_extended(auction)
        print(f"⏰ Auction extended by 5 minutes due to late bid")
```

## Business Rules

### Rule 1: Minimum Bid Increment

```text
Constraint: Each bid must be at least [increment] above current high bid
Default Increments:
- $0-$99: $1 increment
- $100-$999: $5 increment  
- $1000-$9999: $10 increment
- $10000+: $100 increment

Rationale: Prevent penny increments, encourage meaningful bids
```

### Rule 2: Reserve Price

```text
Definition: Minimum price seller will accept
Visibility: Hidden from buyers
Behavior: If highest bid < reserve, auction ends without sale
Notification: Seller notified if reserve not met

Rationale: Protect seller from selling below acceptable price
```

### Rule 3: Bid Retraction

```text
Allowed: Only in first hour and if no subsequent bids
Not Allowed: In last 12 hours of auction
Penalty: Counts against user reputation
Limit: Maximum 3 retractions per month

Rationale: Prevent manipulation while allowing genuine mistakes
```

### Rule 4: Proxy Bid Privacy

```text
Visibility: Only current bid shown, not max bid
Display: Shows proxy bidder as regular bidder
Behavior: Auto-bids appear immediately after being outbid
Limit: One proxy bid per user per auction

Rationale: Keep max bid secret, prevent gaming
```

### Rule 5: Winner Payment Deadline

```text
Deadline: 72 hours to complete payment
Reminders: At 24h, 48h, and 72h
If unpaid: 
- Negative feedback
- Offer to second-highest bidder
- Ban after 3 unpaid items

Rationale: Ensure transaction completion
```

### Rule 6: Shill Bidding Prevention

```text
Prohibited: Seller bidding on own auction
Detection: Check bidder relationships to seller
Action: Cancel auction, ban user, refund bids
Warning: Flagged accounts monitored

Rationale: Ensure fair competitive bidding
```

## Extension Points

### 1. Multiple Item Auctions

```python
class MultiItemAuction(Auction):
    """
    Auction for multiple identical items.
    
    Features:
    - K identical items available
    - Top K bidders win
    - All winners pay K+1th price (uniform price)
    """
```

### 2. Reverse Auctions

```python
class ReverseAuction(Auction):
    """
    Buyers post what they want, sellers bid to provide.
    
    Features:
    - Buyer specifies requirements
    - Sellers compete with lower prices
    - Lowest bid wins
    """
```

### 3. Penny Auctions

```python
class PennyAuction(Auction):
    """
    Each bid costs money and increases price by $0.01.
    
    Features:
    - Pay per bid
    - Price increases minimally
    - Timer resets on each bid
    """
```

### 4. Live Auction Integration

```python
class LiveAuction(Auction):
    """
    Real-time live auction with auctioneer.
    
    Features:
    - Video streaming
    - Real-time bidding
    - Phone/paddle bidding
    - Auctioneer controls
    """
```

## Complexity Analysis

### Time Complexity

| Operation | Complexity | Notes |
|-----------|------------|-------|
| Place bid | O(log N) | Insert into sorted bids + validation |
| Get high bid | O(1) | Cached highest bid |
| Close auction | O(N log N) | Sort bids for sealed/Vickrey |
| Search auctions | O(log N + K) | Binary search + K results |
| Proxy auto-bid | O(K) | K auto-bids triggered |
| Extend time | O(1) | Update end_time |
| Determine winner | O(1) or O(N log N) | Depends on auction type |

### Space Complexity

| Component | Complexity | Notes |
|-----------|------------|-------|
| Auction | O(N) | N = number of bids |
| Active auctions | O(A) | A = active auction count |
| User watchlist | O(W) | W = watched auctions |
| Bid history | O(B) | B = total bids |
| Search index | O(A × L) | L = avg auction title length |
| Total | O(A + B + W) | Dominated by bid history |

## Trade-offs and Design Decisions

### 1. Real-time vs. Batch Processing

**Decision:** Real-time bid processing with event-driven notifications

| Approach | Latency | Scalability | Complexity |
|----------|---------|-------------|------------|
| Real-time | Low (<1s) | Moderate | High |
| Batch (every 5s) | High (5s) | High | Low |
| Hybrid | Medium | High | Medium |

**Rationale:** User experience demands real-time feedback for bids.

### 2. Optimistic vs. Pessimistic Locking

**Decision:** Optimistic locking with retry logic

**Pros:**

- Better performance under low contention
- No lock waiting
- Scales better

**Cons:**

- Retry overhead under high contention
- More complex code

**Rationale:** Most auctions don't have concurrent bids; optimistic is faster.

### 3. Bid Storage

**Decision:** Store all bids in append-only log

| Approach | Auditability | Storage | Query Speed |
|----------|--------------|---------|-------------|
| Latest only | Poor | Low | Fast |
| Full history | Excellent | High | Slow |
| Compressed | Good | Medium | Fast |

**Rationale:** Auditability and dispute resolution require full history.

### 4. Proxy Bid Visibility

**Decision:** Hide max bid, show only current winning bid

**Pros:**

- Prevents bid sniping
- Fair competition
- Protects bidder strategy

**Cons:**

- Less transparency
- May frustrate some users

**Rationale:** Standard industry practice, prevents gaming.

### 5. Time Extension Strategy

**Decision:** Extend by 5 minutes if bid in last 5 minutes

| Strategy | Pros | Cons |
|----------|------|------|
| No extension | Predictable end | Sniping prevalent |
| Fixed extension (5 min) | Fair, simple | Could extend indefinitely |
| Diminishing extension | Bounded | Complex |

**Rationale:** Balance fairness with predictability.

## Summary

The Auction System provides a comprehensive online auction platform with:

- **Multiple Auction Types**: English, Dutch, Sealed-bid, Vickrey auctions
- **Real-time Bidding**: Concurrent bid processing with race condition handling
- **Proxy Bidding**: Automatic bidding up to user's max bid
- **Anti-Sniping**: Time extensions on last-minute bids
- **Payment Processing**: Winner determination, escrow, fees
- **Fraud Prevention**: Bid validation, shill detection
- **Notifications**: Real-time updates for all auction events

**Key Design Principles:**

1. **Fairness**: Equal opportunity for all bidders, anti-sniping measures
2. **Performance**: Handle concurrent bids with low latency
3. **Reliability**: No lost bids, accurate winner determination
4. **Flexibility**: Support multiple auction formats
5. **Security**: Fraud detection, secure payments

**Perfect for:**

- E-commerce platforms (eBay-like)
- Art auction houses (Christie's, Sotheby's)
- Government procurement
- Real estate auctions
- Charity fundraising events
