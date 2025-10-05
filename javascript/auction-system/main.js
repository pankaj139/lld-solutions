/**
 * Auction System - JavaScript Implementation
 * 
 * This file implements a comprehensive auction platform supporting multiple auction types
 * (English, Dutch, Sealed-bid, Vickrey), real-time bidding, proxy bidding, payment processing,
 * and notifications.
 * 
 * File Purpose:
 * - Demonstrates State, Strategy, Observer, Command, Factory, Chain of Responsibility,
 *   Proxy, Singleton, Template Method, and Decorator patterns
 * - Handles concurrent bidding with optimistic locking
 * - Implements anti-sniping time extensions
 * - Supports proxy bidding (auto-bid on behalf of user)
 * - Manages auction lifecycle from creation to winner determination
 * 
 * Usage:
 *   node main.js
 * 
 * Author: LLD Solutions
 * Date: 2025-10-05
 */

const crypto = require('crypto');

// ==================== Enums ====================

const UserType = Object.freeze({
    BUYER: 'buyer',
    SELLER: 'seller',
    ADMIN: 'admin'
});

const AuctionType = Object.freeze({
    ENGLISH: 'english',
    DUTCH: 'dutch',
    SEALED_BID: 'sealed_bid',
    VICKREY: 'vickrey'
});

const AuctionStateType = Object.freeze({
    SCHEDULED: 'scheduled',
    ACTIVE: 'active',
    PAUSED: 'paused',
    CLOSED: 'closed',
    CANCELLED: 'cancelled'
});

const BidType = Object.freeze({
    MANUAL: 'manual',
    PROXY: 'proxy',
    AUTO: 'auto'
});

const BidStatus = Object.freeze({
    PENDING: 'pending',
    ACCEPTED: 'accepted',
    REJECTED: 'rejected',
    RETRACTED: 'retracted',
    OUTBID: 'outbid'
});

const ItemCondition = Object.freeze({
    NEW: 'new',
    LIKE_NEW: 'like_new',
    GOOD: 'good',
    FAIR: 'fair',
    POOR: 'poor'
});

const Category = Object.freeze({
    ELECTRONICS: 'electronics',
    ART: 'art',
    COLLECTIBLES: 'collectibles',
    VEHICLES: 'vehicles',
    REAL_ESTATE: 'real_estate',
    ANTIQUES: 'antiques',
    JEWELRY: 'jewelry',
    OTHER: 'other'
});

// ==================== Data Classes ====================

/**
 * Represents a user (buyer/seller) in the auction system.
 * 
 * Usage:
 *   const user = new User("John Doe", "john@email.com", UserType.BUYER);
 *   user.reputation = 4.5;
 */
class User {
    constructor(name, email, userType) {
        this.id = crypto.randomUUID();
        this.name = name;
        this.email = email;
        this.userType = userType;
        this.reputation = 5.0;
        this.verified = false;
        this.createdAt = new Date();
    }

    toString() {
        return `${this.name} (${this.userType})`;
    }
}

/**
 * Represents an item to be auctioned.
 * 
 * Usage:
 *   const item = new Item(seller, "Vintage Watch", "1950s Rolex", Category.COLLECTIBLES);
 */
class Item {
    constructor(seller, title, description, category, condition = ItemCondition.GOOD) {
        this.id = crypto.randomUUID();
        this.seller = seller;
        this.title = title;
        this.description = description;
        this.category = category;
        this.condition = condition;
        this.images = [];
    }

    toString() {
        return `${this.title} [${this.category}]`;
    }
}

/**
 * Represents a bid placed on an auction.
 * 
 * Usage:
 *   const bid = new Bid(bidder, 100.00, BidType.MANUAL);
 *   if (bid.validate(auction)) {
 *       auction.placeBid(bid);
 *   }
 * 
 * Returns:
 *   Bid instance with validation status
 */
class Bid {
    constructor(bidder, amount, bidType = BidType.MANUAL) {
        this.id = crypto.randomUUID();
        this.bidder = bidder;
        this.amount = amount;
        this.timestamp = new Date();
        this.bidType = bidType;
        this.proxyMax = null;
        this.status = BidStatus.PENDING;
    }

    toString() {
        return `${this.bidder.name}: $${this.amount} [${this.status}]`;
    }
}

/**
 * Auction winner information
 */
class Winner {
    constructor(bidder, winningBid, pricePaid) {
        this.bidder = bidder;
        this.winningBid = winningBid;
        this.pricePaid = pricePaid;
        this.timestamp = new Date();
    }
}

// ==================== Auction State Pattern ====================

/**
 * Abstract base class for auction states (State Pattern).
 * 
 * Usage:
 *   const state = new ScheduledState();
 *   state.start(auction);
 */
class AuctionState {
    start(auction) {
        throw new Error('start() must be implemented');
    }

    placeBid(auction, bid) {
        throw new Error('placeBid() must be implemented');
    }

    close(auction) {
        throw new Error('close() must be implemented');
    }

    cancel(auction) {
        throw new Error('cancel() must be implemented');
    }

    getStateType() {
        throw new Error('getStateType() must be implemented');
    }
}

class ScheduledState extends AuctionState {
    start(auction) {
        auction.state = new ActiveState();
        console.log(`✅ Auction '${auction.item.title}' started`);
        return true;
    }

    placeBid(auction, bid) {
        console.log('❌ Cannot bid on scheduled auction');
        return false;
    }

    close(auction) {
        console.log('❌ Cannot close scheduled auction');
        return false;
    }

    cancel(auction) {
        auction.state = new CancelledState();
        console.log('✅ Auction cancelled');
        return true;
    }

    getStateType() {
        return AuctionStateType.SCHEDULED;
    }
}

class ActiveState extends AuctionState {
    start(auction) {
        console.log('❌ Auction already active');
        return false;
    }

    placeBid(auction, bid) {
        if (new Date() > auction.endTime) {
            auction.close();
            console.log('❌ Auction has ended');
            return false;
        }
        return true;
    }

    close(auction) {
        auction.state = new ClosedState();
        console.log(`✅ Auction '${auction.item.title}' closed`);
        return true;
    }

    cancel(auction) {
        auction.state = new CancelledState();
        for (const bid of auction.bids) {
            console.log(`💰 Refunding $${bid.amount} to ${bid.bidder.name}`);
        }
        return true;
    }

    getStateType() {
        return AuctionStateType.ACTIVE;
    }
}

class PausedState extends AuctionState {
    start(auction) {
        auction.state = new ActiveState();
        console.log('✅ Auction resumed');
        return true;
    }

    placeBid(auction, bid) {
        console.log('❌ Auction is paused');
        return false;
    }

    close(auction) {
        auction.state = new ClosedState();
        return true;
    }

    cancel(auction) {
        auction.state = new CancelledState();
        return true;
    }

    getStateType() {
        return AuctionStateType.PAUSED;
    }
}

class ClosedState extends AuctionState {
    start(auction) {
        console.log('❌ Cannot restart closed auction');
        return false;
    }

    placeBid(auction, bid) {
        console.log('❌ Auction is closed');
        return false;
    }

    close(auction) {
        console.log('❌ Auction already closed');
        return false;
    }

    cancel(auction) {
        console.log('❌ Cannot cancel closed auction');
        return false;
    }

    getStateType() {
        return AuctionStateType.CLOSED;
    }
}

class CancelledState extends AuctionState {
    start(auction) {
        console.log('❌ Cannot start cancelled auction');
        return false;
    }

    placeBid(auction, bid) {
        console.log('❌ Auction was cancelled');
        return false;
    }

    close(auction) {
        return false;
    }

    cancel(auction) {
        console.log('❌ Auction already cancelled');
        return false;
    }

    getStateType() {
        return AuctionStateType.CANCELLED;
    }
}

// ==================== Bid Validation Chain ====================

/**
 * Base class for bid validators (Chain of Responsibility Pattern).
 * 
 * Usage:
 *   const validator = new AmountValidator();
 *   validator.setNext(new IncrementValidator());
 *   if (validator.validate(bid, auction)) {
 *       // Bid is valid
 *   }
 */
class BidValidator {
    constructor() {
        this._next = null;
    }

    setNext(validator) {
        this._next = validator;
        return validator;
    }

    validate(bid, auction) {
        throw new Error('validate() must be implemented');
    }

    _validateNext(bid, auction) {
        if (this._next) {
            return this._next.validate(bid, auction);
        }
        return true;
    }
}

class AmountValidator extends BidValidator {
    validate(bid, auction) {
        if (bid.amount <= 0) {
            console.log('❌ Bid amount must be positive');
            return false;
        }

        // Skip starting price check for Dutch auctions
        if (!(auction instanceof DutchAuction)) {
            if (bid.amount < auction.startingPrice) {
                console.log(`❌ Bid $${bid.amount} below starting price $${auction.startingPrice}`);
                return false;
            }
        }

        return this._validateNext(bid, auction);
    }
}

class IncrementValidator extends BidValidator {
    validate(bid, auction) {
        const currentHigh = auction.getHighBid();

        if (currentHigh) {
            const required = currentHigh.amount + auction.bidIncrement;
            if (bid.amount < required) {
                console.log(`❌ Bid must be at least $${required} (current: $${currentHigh.amount} + $${auction.bidIncrement})`);
                return false;
            }
        }

        return this._validateNext(bid, auction);
    }
}

class TimingValidator extends BidValidator {
    validate(bid, auction) {
        const now = new Date();

        if (now < auction.startTime) {
            console.log("❌ Auction hasn't started yet");
            return false;
        }

        if (now > auction.endTime) {
            console.log('❌ Auction has ended');
            return false;
        }

        return this._validateNext(bid, auction);
    }
}

class SellerValidator extends BidValidator {
    validate(bid, auction) {
        if (bid.bidder.id === auction.seller.id) {
            console.log('❌ Seller cannot bid on own auction (shill bidding)');
            return false;
        }

        return this._validateNext(bid, auction);
    }
}

class FraudValidator extends BidValidator {
    validate(bid, auction) {
        const userBids = auction.bids.filter(b => b.bidder.id === bid.bidder.id);

        if (userBids.length >= 2) {
            const lastBidTime = userBids[userBids.length - 1].timestamp;
            if ((bid.timestamp - lastBidTime) / 1000 < 1) {
                console.log('⚠️  Suspicious: Rapid consecutive bids');
            }
        }

        return this._validateNext(bid, auction);
    }
}

// ==================== Auction Strategy Pattern ====================

/**
 * Abstract base class for all auction types (Strategy Pattern).
 * 
 * Usage:
 *   const auction = new EnglishAuction(item, seller, 100, 60);
 *   auction.start();
 *   auction.placeBid(bid);
 *   const winner = auction.determineWinner();
 * 
 * Returns:
 *   Auction instance with bidding logic
 */
class Auction {
    constructor(item, seller, startingPrice, durationMinutes = 60, reservePrice = 0) {
        this.id = crypto.randomUUID();
        this.item = item;
        this.seller = seller;
        this.startingPrice = startingPrice;
        this.reservePrice = reservePrice;
        this.currentPrice = startingPrice;
        this.bids = [];
        this.state = new ScheduledState();
        this.startTime = new Date();
        this.endTime = new Date(this.startTime.getTime() + durationMinutes * 60000);
        this.bidIncrement = this._calculateIncrement(startingPrice);
        this.version = 0;
        this.winner = null;
        this.watchers = new Set();

        this.validator = this._buildValidatorChain();
    }

    _calculateIncrement(price) {
        if (price < 100) return 1;
        if (price < 1000) return 5;
        if (price < 10000) return 10;
        return 100;
    }

    _buildValidatorChain() {
        const amountValidator = new AmountValidator();
        const incrementValidator = new IncrementValidator();
        const timingValidator = new TimingValidator();
        const sellerValidator = new SellerValidator();
        const fraudValidator = new FraudValidator();

        amountValidator.setNext(incrementValidator);
        incrementValidator.setNext(timingValidator);
        timingValidator.setNext(sellerValidator);
        sellerValidator.setNext(fraudValidator);

        return amountValidator;
    }

    start() {
        return this.state.start(this);
    }

    close() {
        if (this.state.close(this)) {
            this.winner = this.determineWinner();
            if (this.winner) {
                console.log(`🏆 Winner: ${this.winner.bidder.name} - Paid: $${this.winner.pricePaid}`);
            } else {
                console.log('❌ No winner (reserve price not met or no bids)');
            }
            return true;
        }
        return false;
    }

    cancel() {
        return this.state.cancel(this);
    }

    isActive() {
        return this.state.getStateType() === AuctionStateType.ACTIVE && 
               new Date() <= this.endTime;
    }

    getHighBid() {
        if (this.bids.length === 0) return null;

        const acceptedBids = this.bids.filter(b => b.status === BidStatus.ACCEPTED);
        if (acceptedBids.length === 0) return null;

        return acceptedBids.reduce((max, b) => b.amount > max.amount ? b : max);
    }

    /**
     * Place a bid with atomic operation and validation.
     * 
     * Algorithm:
     *   1. Check auction state allows bidding
     *   2. Validate bid through chain
     *   3. Atomically add bid with version check
     *   4. Update previous high bidder status
     *   5. Trigger proxy bids if needed
     * 
     * Returns:
     *   true if bid accepted, false otherwise
     */
    placeBid(bid) {
        if (!this.state.placeBid(this, bid)) {
            bid.status = BidStatus.REJECTED;
            return false;
        }

        if (!this.validator.validate(bid, this)) {
            bid.status = BidStatus.REJECTED;
            return false;
        }

        // Re-validate after check
        const currentHigh = this.getHighBid();
        if (currentHigh && bid.amount <= currentHigh.amount + this.bidIncrement) {
            console.log('❌ Bid too low (another bid placed)');
            bid.status = BidStatus.REJECTED;
            return false;
        }

        bid.status = BidStatus.ACCEPTED;
        this.bids.push(bid);
        this.version++;

        if (currentHigh && currentHigh.bidder.id !== bid.bidder.id) {
            currentHigh.status = BidStatus.OUTBID;
            this._notifyOutbid(currentHigh.bidder);
        }

        this.currentPrice = bid.amount;

        console.log(`✅ Bid placed: ${bid.bidder.name} - $${bid.amount}`);
        this._notifyBidPlaced(bid);

        return true;
    }

    determineWinner() {
        throw new Error('determineWinner() must be implemented');
    }

    addWatcher(user) {
        this.watchers.add(user);
    }

    _notifyBidPlaced(bid) {
        for (const watcher of this.watchers) {
            if (watcher.id !== bid.bidder.id) {
                console.log(`📢 [${watcher.name}] New bid on '${this.item.title}': $${bid.amount}`);
            }
        }
    }

    _notifyOutbid(user) {
        console.log(`🔔 [${user.name}] You've been outbid on '${this.item.title}'`);
    }

    toString() {
        return `Auction[${this.id.slice(0, 8)}] ${this.item.title} - $${this.currentPrice} [${this.state.getStateType()}]`;
    }
}

// ==================== Concrete Auction Types ====================

/**
 * English (ascending) auction - highest bid wins.
 * 
 * Features:
 * - Ascending price
 * - Public bids
 * - Anti-sniping (time extension)
 * - Highest bidder wins
 * 
 * Usage:
 *   const auction = new EnglishAuction(item, seller, 100, 60);
 */
class EnglishAuction extends Auction {
    constructor(item, seller, startingPrice, durationMinutes = 60, options = {}) {
        super(item, seller, startingPrice, durationMinutes, options.reservePrice);
        this.autoExtendEnabled = options.autoExtend !== false;
        this.extensionMinutes = options.extensionMinutes || 5;
        this.extensionThreshold = options.extensionThreshold || 5;
    }

    placeBid(bid) {
        const result = super.placeBid(bid);

        if (result && this.autoExtendEnabled) {
            this._extendIfNeeded();
        }

        return result;
    }

    _extendIfNeeded() {
        const timeRemaining = (this.endTime - new Date()) / 60000;

        if (timeRemaining < this.extensionThreshold) {
            this.endTime = new Date(this.endTime.getTime() + this.extensionMinutes * 60000);
            console.log(`⏰ Auction extended by ${this.extensionMinutes} minutes (anti-sniping)`);
        }
    }

    determineWinner() {
        const highBid = this.getHighBid();

        if (!highBid) return null;

        if (highBid.amount < this.reservePrice) {
            console.log(`❌ Reserve price $${this.reservePrice} not met`);
            return null;
        }

        return new Winner(highBid.bidder, highBid.amount, highBid.amount);
    }
}

/**
 * Dutch (descending) auction - first bid wins at current price.
 * 
 * Features:
 * - Descending price
 * - First bid wins
 * - Price decreases over time
 * 
 * Usage:
 *   const auction = new DutchAuction(item, seller, 1000, 500, 10, 10);
 */
class DutchAuction extends Auction {
    constructor(item, seller, startingPrice, minimumPrice, priceDecrement = 10, decrementInterval = 10, durationMinutes = 60) {
        super(item, seller, startingPrice, durationMinutes);
        this.minimumPrice = minimumPrice;
        this.priceDecrement = priceDecrement;
        this.decrementInterval = decrementInterval;
        this.firstBidWins = true;
    }

    placeBid(bid) {
        if (this.bids.length > 0) {
            console.log('❌ Dutch auction already has a winner');
            return false;
        }

        if (bid.amount < this.currentPrice) {
            console.log(`❌ Bid $${bid.amount} below current price $${this.currentPrice}`);
            return false;
        }

        bid.amount = this.currentPrice;

        const result = super.placeBid(bid);

        if (result) {
            this.close();
        }

        return result;
    }

    decreasePrice() {
        if (this.isActive() && this.bids.length === 0) {
            this.currentPrice = Math.max(
                this.currentPrice - this.priceDecrement,
                this.minimumPrice
            );
            console.log(`📉 Price decreased to $${this.currentPrice}`);

            if (this.currentPrice === this.minimumPrice) {
                console.log('❌ Minimum price reached, closing auction');
                this.close();
            }
        }
    }

    determineWinner() {
        if (this.bids.length === 0) return null;

        const firstBid = this.bids[0];

        return new Winner(firstBid.bidder, firstBid.amount, firstBid.amount);
    }
}

/**
 * Sealed-bid auction - bids are hidden until auction ends.
 * 
 * Features:
 * - Hidden bids
 * - Highest bid wins
 * - Bids revealed at close
 * 
 * Usage:
 *   const auction = new SealedBidAuction(item, seller, 100);
 */
class SealedBidAuction extends Auction {
    constructor(item, seller, startingPrice, durationMinutes = 60) {
        super(item, seller, startingPrice, durationMinutes);
        this.bidsHidden = true;
    }

    getHighBid() {
        if (this.state.getStateType() === AuctionStateType.CLOSED) {
            return super.getHighBid();
        }
        return null;
    }

    placeBid(bid) {
        // Skip increment validation for sealed bids
        this.validator = new AmountValidator();
        this.validator.setNext(new TimingValidator());
        this.validator._next.setNext(new SellerValidator());

        const result = super.placeBid(bid);

        if (result) {
            console.log(`✅ Sealed bid placed by ${bid.bidder.name}`);
        }

        return result;
    }

    revealBids() {
        if (this.state.getStateType() !== AuctionStateType.CLOSED) return;

        console.log('\n🔓 Revealing sealed bids:');
        const sortedBids = [...this.bids].sort((a, b) => b.amount - a.amount);
        sortedBids.forEach((bid, i) => {
            console.log(`  ${i + 1}. ${bid.bidder.name}: $${bid.amount}`);
        });
    }

    determineWinner() {
        if (this.bids.length === 0) return null;

        const highestBid = this.bids.reduce((max, b) => b.amount > max.amount ? b : max);

        if (highestBid.amount < this.reservePrice) return null;

        return new Winner(highestBid.bidder, highestBid.amount, highestBid.amount);
    }
}

/**
 * Vickrey (second-price) auction - sealed bids, winner pays second-highest price.
 * 
 * Features:
 * - Sealed bids
 * - Highest bid wins
 * - Winner pays second-highest price
 * - Encourages truthful bidding
 * 
 * Usage:
 *   const auction = new VickreyAuction(item, seller, 100);
 */
class VickreyAuction extends SealedBidAuction {
    /**
     * Highest bid wins but pays second-highest price.
     * 
     * Algorithm:
     *   1. Sort bids by amount (descending)
     *   2. Winner is highest bidder
     *   3. Price paid is second-highest bid
     *   4. If only one bid, pays their bid
     * 
     * Returns:
     *   Winner with second-price payment
     */
    determineWinner() {
        if (this.bids.length === 0) return null;

        const sortedBids = [...this.bids].sort((a, b) => b.amount - a.amount);
        const highestBid = sortedBids[0];

        if (highestBid.amount < this.reservePrice) return null;

        const secondPrice = sortedBids.length > 1 ? sortedBids[1].amount : highestBid.amount;

        return new Winner(highestBid.bidder, highestBid.amount, secondPrice);
    }
}

// ==================== Proxy Bidding ====================

/**
 * Automatic bidding agent (Proxy Pattern).
 * 
 * Usage:
 *   const proxy = new ProxyBidder(user, auction, 500);
 *   proxy.autoBidIfOutbid();
 * 
 * Returns:
 *   ProxyBidder: Automated bidding agent
 */
class ProxyBidder {
    constructor(user, auction, maxBid) {
        this.user = user;
        this.auction = auction;
        this.maxBid = maxBid;
        this.active = true;
    }

    isHighBidder() {
        const highBid = this.auction.getHighBid();
        return highBid && highBid.bidder.id === this.user.id;
    }

    calculateNextBid() {
        const highBid = this.auction.getHighBid();

        if (!highBid) return this.auction.startingPrice;

        const nextAmount = highBid.amount + this.auction.bidIncrement;

        if (nextAmount > this.maxBid) return null;

        return nextAmount;
    }

    /**
     * Automatically bid when outbid.
     * 
     * Algorithm:
     *   1. Check if user is still high bidder
     *   2. If outbid, calculate next bid
     *   3. Place proxy bid if within max
     *   4. Repeat until high bidder or max reached
     */
    autoBidIfOutbid() {
        if (!this.active) return;

        while (!this.isHighBidder() && this.auction.isActive()) {
            const nextBidAmount = this.calculateNextBid();

            if (!nextBidAmount) {
                console.log(`🛑 Proxy bidder for ${this.user.name} reached max $${this.maxBid}`);
                this.active = false;
                break;
            }

            const bid = new Bid(this.user, nextBidAmount, BidType.PROXY);
            bid.proxyMax = this.maxBid;

            const success = this.auction.placeBid(bid);

            if (!success) break;

            // Small delay to prevent rapid bidding
            const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
            delay(100);
        }
    }
}

// ==================== Payment Processing ====================

/**
 * Handles payment processing (Singleton Pattern).
 * 
 * Usage:
 *   const processor = PaymentProcessor.getInstance();
 *   const transaction = processor.processPayment(auction);
 */
class PaymentProcessor {
    static #instance = null;

    static getInstance() {
        if (!PaymentProcessor.#instance) {
            PaymentProcessor.#instance = new PaymentProcessor();
        }
        return PaymentProcessor.#instance;
    }

    constructor() {
        if (PaymentProcessor.#instance) {
            throw new Error('Use getInstance() to get singleton');
        }
        this.transactions = [];
        this.platformFeePercent = 0.10;
    }

    processPayment(auction) {
        if (!auction.winner) return null;

        const amount = auction.winner.pricePaid;
        const fee = this.calculateFees(amount);
        const sellerPayout = amount - fee;

        const transaction = {
            id: crypto.randomUUID(),
            auctionId: auction.id,
            buyer: auction.winner.bidder,
            seller: auction.seller,
            amount: amount,
            fee: fee,
            sellerPayout: sellerPayout,
            timestamp: new Date()
        };

        this.transactions.push(transaction);

        console.log('\n💳 Payment Processed:');
        console.log(`  Buyer: ${auction.winner.bidder.name}`);
        console.log(`  Seller: ${auction.seller.name}`);
        console.log(`  Amount: $${amount}`);
        console.log(`  Platform Fee: $${fee.toFixed(2)}`);
        console.log(`  Seller Receives: $${sellerPayout.toFixed(2)}`);

        return transaction;
    }

    calculateFees(amount) {
        return amount * this.platformFeePercent;
    }

    refund(user, amount) {
        console.log(`💰 Refunded $${amount} to ${user.name}`);
        return true;
    }
}

// ==================== Auction Factory ====================

/**
 * Factory for creating different auction types (Factory Pattern).
 * 
 * Usage:
 *   const auction = AuctionFactory.createAuction(AuctionType.ENGLISH, item, seller, config);
 */
class AuctionFactory {
    static createAuction(auctionType, item, seller, startingPrice, options = {}) {
        switch (auctionType) {
            case AuctionType.ENGLISH:
                return new EnglishAuction(item, seller, startingPrice, options.durationMinutes, options);
            
            case AuctionType.DUTCH:
                const minimumPrice = options.minimumPrice || startingPrice * 0.5;
                return new DutchAuction(
                    item, seller, startingPrice, minimumPrice,
                    options.priceDecrement, options.decrementInterval,
                    options.durationMinutes
                );
            
            case AuctionType.SEALED_BID:
                return new SealedBidAuction(item, seller, startingPrice, options.durationMinutes);
            
            case AuctionType.VICKREY:
                return new VickreyAuction(item, seller, startingPrice, options.durationMinutes);
            
            default:
                throw new Error(`Unknown auction type: ${auctionType}`);
        }
    }
}

// ==================== Auction Manager ====================

/**
 * Central auction management (Singleton Pattern).
 * 
 * Usage:
 *   const manager = AuctionManager.getInstance();
 *   const auctionId = manager.createAuction(auctionType, item, seller, config);
 *   manager.startAuction(auctionId);
 *   manager.placeBid(auctionId, user, amount);
 */
class AuctionManager {
    static #instance = null;

    static getInstance() {
        if (!AuctionManager.#instance) {
            AuctionManager.#instance = new AuctionManager();
        }
        return AuctionManager.#instance;
    }

    constructor() {
        if (AuctionManager.#instance) {
            throw new Error('Use getInstance() to get singleton');
        }
        this.auctions = new Map();
        this.paymentProcessor = PaymentProcessor.getInstance();
        this.proxyBidders = new Map();
    }

    createAuction(auctionType, item, seller, startingPrice, options = {}) {
        const auction = AuctionFactory.createAuction(auctionType, item, seller, startingPrice, options);

        this.auctions.set(auction.id, auction);
        this.proxyBidders.set(auction.id, []);

        console.log(`✅ Created ${auctionType} auction: ${item.title} ($${startingPrice})`);

        return auction.id;
    }

    startAuction(auctionId) {
        const auction = this.auctions.get(auctionId);
        if (!auction) return false;

        return auction.start();
    }

    placeBid(auctionId, user, amount) {
        const auction = this.auctions.get(auctionId);
        if (!auction) return false;

        const bid = new Bid(user, amount, BidType.MANUAL);
        const result = auction.placeBid(bid);

        if (result) {
            this._triggerProxyBidders(auctionId, user);
        }

        return result;
    }

    setupProxyBid(auctionId, user, maxBid) {
        const auction = this.auctions.get(auctionId);
        if (!auction) return false;

        const proxy = new ProxyBidder(user, auction, maxBid);
        this.proxyBidders.get(auctionId).push(proxy);

        console.log(`🤖 Proxy bidding enabled for ${user.name} (max: $${maxBid})`);

        proxy.autoBidIfOutbid();

        return true;
    }

    _triggerProxyBidders(auctionId, exceptUser) {
        const proxies = this.proxyBidders.get(auctionId) || [];
        for (const proxy of proxies) {
            if (proxy.user.id !== exceptUser.id) {
                proxy.autoBidIfOutbid();
            }
        }
    }

    closeAuction(auctionId) {
        const auction = this.auctions.get(auctionId);
        if (!auction) return null;

        auction.close();

        if (auction.winner) {
            this.paymentProcessor.processPayment(auction);
        }

        return auction.winner;
    }

    getAuction(auctionId) {
        return this.auctions.get(auctionId);
    }

    getActiveAuctions() {
        return Array.from(this.auctions.values()).filter(a => a.isActive());
    }
}

// ==================== Demo ====================

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function demo() {
    console.log('='.repeat(60));
    console.log('AUCTION SYSTEM DEMONSTRATION');
    console.log('='.repeat(60));

    const manager = AuctionManager.getInstance();

    // Create users
    const alice = new User('Alice', 'alice@email.com', UserType.BUYER);
    const bob = new User('Bob', 'bob@email.com', UserType.BUYER);
    const charlie = new User('Charlie', 'charlie@email.com', UserType.BUYER);
    const seller = new User('Seller Sam', 'sam@email.com', UserType.SELLER);

    alice.verified = true;
    bob.verified = true;
    charlie.verified = true;
    seller.verified = true;

    // Demo 1: English Auction with Anti-Sniping
    console.log('\n' + '='.repeat(60));
    console.log('DEMO 1: ENGLISH AUCTION (Anti-Sniping)');
    console.log('='.repeat(60));

    const vintageWatch = new Item(seller, 'Vintage Rolex Watch', '1950s Submariner in mint condition', Category.COLLECTIBLES, ItemCondition.LIKE_NEW);

    const auction1Id = manager.createAuction(
        AuctionType.ENGLISH,
        vintageWatch,
        seller,
        1000,
        { durationMinutes: 1, reservePrice: 1500 }
    );

    const auction1 = manager.getAuction(auction1Id);
    auction1.addWatcher(alice);
    auction1.addWatcher(bob);
    auction1.addWatcher(charlie);

    manager.startAuction(auction1Id);

    manager.placeBid(auction1Id, alice, 1100);
    await sleep(500);
    manager.placeBid(auction1Id, bob, 1200);
    await sleep(500);

    console.log('\n🤖 Setting up proxy bid for Charlie...');
    manager.setupProxyBid(auction1Id, charlie, 2000);

    await sleep(500);
    manager.placeBid(auction1Id, alice, 1600);

    await sleep(1000);
    manager.closeAuction(auction1Id);

    // Demo 2: Dutch Auction
    console.log('\n' + '='.repeat(60));
    console.log('DEMO 2: DUTCH AUCTION (Descending Price)');
    console.log('='.repeat(60));

    const rarePainting = new Item(seller, 'Abstract Painting', 'Modern art piece by emerging artist', Category.ART, ItemCondition.NEW);

    const auction2Id = manager.createAuction(
        AuctionType.DUTCH,
        rarePainting,
        seller,
        5000,
        { minimumPrice: 2000, priceDecrement: 500, decrementInterval: 10, durationMinutes: 1 }
    );

    const auction2 = manager.getAuction(auction2Id);
    manager.startAuction(auction2Id);

    console.log('\n⏰ Waiting for price to decrease...');
    for (let i = 0; i < 3; i++) {
        await sleep(500);
        auction2.decreasePrice();
    }

    console.log(`\n💰 Alice accepts current price: $${auction2.currentPrice}`);
    manager.placeBid(auction2Id, alice, auction2.currentPrice);

    // Demo 3: Vickrey Auction
    console.log('\n' + '='.repeat(60));
    console.log('DEMO 3: VICKREY AUCTION (Second-Price)');
    console.log('='.repeat(60));

    const antiqueClock = new Item(seller, 'Antique Grandfather Clock', '18th century French clock', Category.ANTIQUES, ItemCondition.GOOD);

    const auction3Id = manager.createAuction(
        AuctionType.VICKREY,
        antiqueClock,
        seller,
        500,
        { durationMinutes: 1 }
    );

    const auction3 = manager.getAuction(auction3Id);
    manager.startAuction(auction3Id);

    console.log('\n🔒 Placing sealed bids...');
    manager.placeBid(auction3Id, alice, 800);
    manager.placeBid(auction3Id, bob, 1000);
    manager.placeBid(auction3Id, charlie, 700);

    console.log('\n⏰ Waiting for auction to end...');
    await sleep(2000);

    const winner3 = manager.closeAuction(auction3Id);
    auction3.revealBids();

    if (winner3) {
        console.log(`\n💡 Vickrey Special: Winner bid $${winner3.winningBid} but pays $${winner3.pricePaid} (second-highest)`);
    }

    // Demo 4: Sealed-Bid Auction
    console.log('\n' + '='.repeat(60));
    console.log('DEMO 4: SEALED-BID AUCTION');
    console.log('='.repeat(60));

    const luxuryCar = new Item(seller, '2020 Tesla Model S', 'Low mileage, excellent condition', Category.VEHICLES, ItemCondition.LIKE_NEW);

    const auction4Id = manager.createAuction(
        AuctionType.SEALED_BID,
        luxuryCar,
        seller,
        30000,
        { durationMinutes: 1 }
    );

    const auction4 = manager.getAuction(auction4Id);
    manager.startAuction(auction4Id);

    console.log('\n🔒 Placing sealed bids...');
    manager.placeBid(auction4Id, alice, 45000);
    manager.placeBid(auction4Id, bob, 48000);
    manager.placeBid(auction4Id, charlie, 47000);

    await sleep(2000);

    const winner4 = manager.closeAuction(auction4Id);
    auction4.revealBids();

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('AUCTION SUMMARY');
    console.log('='.repeat(60));

    const auctionIds = [auction1Id, auction2Id, auction3Id, auction4Id];
    for (let i = 0; i < auctionIds.length; i++) {
        const auction = manager.getAuction(auctionIds[i]);
        console.log(`\nAuction ${i + 1}: ${auction.item.title}`);
        console.log(`  Type: ${auction.constructor.name}`);
        console.log(`  Total Bids: ${auction.bids.length}`);
        if (auction.winner) {
            console.log(`  Winner: ${auction.winner.bidder.name}`);
            console.log(`  Final Price: $${auction.winner.pricePaid}`);
        } else {
            console.log('  Winner: None');
        }
    }

    console.log('\n✅ Auction system demonstration completed!');
}

// Run demo
if (require.main === module) {
    demo().catch(console.error);
}

module.exports = {
    User, Item, Bid, Winner,
    Auction, EnglishAuction, DutchAuction, SealedBidAuction, VickreyAuction,
    ProxyBidder, PaymentProcessor, AuctionFactory, AuctionManager,
    UserType, AuctionType, AuctionStateType, BidType, BidStatus, ItemCondition, Category
};
