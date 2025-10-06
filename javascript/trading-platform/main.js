/**
 * Trading Platform - Stock Trading System
 * 
 * Comprehensive trading platform with order matching, portfolio management,
 * and real-time market data.
 * 
 * Features:
 * - Multiple order types (Market, Limit)
 * - Real-time order matching with price-time priority
 * - Portfolio management with P&L tracking
 * - Order book management
 * - 6 Design Patterns: Strategy, Observer, Singleton, Factory, Command, State
 * 
 * Author: LLD Solutions
 * Date: 2025
 */

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

const OrderSide = {
    BUY: 'BUY',
    SELL: 'SELL'
};

const OrderType = {
    MARKET: 'MARKET',
    LIMIT: 'LIMIT'
};

// ============================================================================
// 6. STATE PATTERN - Order States
// ============================================================================

class OrderState {
    canCancel() { throw new Error('Must implement'); }
    canFill() { throw new Error('Must implement'); }
    getName() { throw new Error('Must implement'); }
}

class OpenState extends OrderState {
    canCancel() { return true; }
    canFill() { return true; }
    getName() { return 'OPEN'; }
}

class PartiallyFilledState extends OrderState {
    canCancel() { return true; }
    canFill() { return true; }
    getName() { return 'PARTIALLY_FILLED'; }
}

class FilledState extends OrderState {
    canCancel() { return false; }
    canFill() { return false; }
    getName() { return 'FILLED'; }
}

class CancelledState extends OrderState {
    canCancel() { return false; }
    canFill() { return false; }
    getName() { return 'CANCELLED'; }
}

// ============================================================================
// DOMAIN MODELS
// ============================================================================

class User {
    constructor(userId, name, cashBalance) {
        this.userId = userId;
        this.name = name;
        this.cashBalance = Number(cashBalance);
    }
}

class Position {
    constructor(symbol) {
        this.symbol = symbol;
        this.quantity = 0;
        this.averagePrice = 0;
        this.realizedPnl = 0;
    }

    update(qty, price) {
        if (this.quantity === 0) {
            this.averagePrice = price;
        } else {
            const totalCost = this.averagePrice * this.quantity + price * qty;
            this.quantity += qty;
            if (this.quantity !== 0) {
                this.averagePrice = totalCost / this.quantity;
            }
        }
    }

    calculateUnrealizedPnl(currentPrice) {
        return (currentPrice - this.averagePrice) * this.quantity;
    }
}

class Trade {
    constructor(tradeId, symbol, buyer, seller, price, quantity) {
        this.tradeId = tradeId;
        this.symbol = symbol;
        this.buyer = buyer;
        this.seller = seller;
        this.price = Number(price);
        this.quantity = quantity;
        this.timestamp = new Date();
    }

    toString() {
        return `Trade(${this.symbol}: ${this.quantity}@$${this.price})`;
    }
}

class Order {
    constructor(orderId, user, symbol, side, orderType, quantity, price = null) {
        this.orderId = orderId;
        this.user = user;
        this.symbol = symbol;
        this.side = side;
        this.orderType = orderType;
        this.quantity = quantity;
        this.price = price ? Number(price) : null;
        this.filledQuantity = 0;
        this.state = new OpenState();
        this.timestamp = new Date();
    }

    remainingQuantity() {
        return this.quantity - this.filledQuantity;
    }

    isFullyFilled() {
        return this.filledQuantity >= this.quantity;
    }

    fill(qty) {
        if (!this.state.canFill()) {
            throw new Error(`Cannot fill order in ${this.state.getName()} state`);
        }

        this.filledQuantity += qty;

        if (this.isFullyFilled()) {
            this.state = new FilledState();
        } else if (this.filledQuantity > 0) {
            this.state = new PartiallyFilledState();
        }
    }

    cancel() {
        if (!this.state.canCancel()) {
            return false;
        }
        this.state = new CancelledState();
        return true;
    }

    toString() {
        return `Order(${this.orderId}: ${this.side} ${this.quantity} ${this.symbol})`;
    }
}

// ============================================================================
// 1. STRATEGY PATTERN - Order Execution Strategies
// ============================================================================

class OrderStrategy {
    canExecute(order, bestPrice) { throw new Error('Must implement'); }
    getExecutionPrice(order, bestPrice) { throw new Error('Must implement'); }
}

class MarketOrderStrategy extends OrderStrategy {
    canExecute(order, bestPrice) {
        return bestPrice !== null;
    }

    getExecutionPrice(order, bestPrice) {
        return bestPrice;
    }
}

class LimitOrderStrategy extends OrderStrategy {
    canExecute(order, bestPrice) {
        if (bestPrice === null || order.price === null) {
            return false;
        }

        if (order.side === OrderSide.BUY) {
            return bestPrice <= order.price;
        } else {
            return bestPrice >= order.price;
        }
    }

    getExecutionPrice(order, bestPrice) {
        if (order.side === OrderSide.BUY) {
            return Math.min(order.price, bestPrice);
        } else {
            return Math.max(order.price, bestPrice);
        }
    }
}

// ============================================================================
// 2. OBSERVER PATTERN - Market Data Updates
// ============================================================================

class MarketDataObserver {
    onTrade(trade) {}
    onOrderBookUpdate(symbol, bestBid, bestAsk) {}
}

class PriceDisplayObserver extends MarketDataObserver {
    onTrade(trade) {
        console.log(`💰 Trade: ${trade.symbol} ${trade.quantity}@$${trade.price}`);
    }

    onOrderBookUpdate(symbol, bestBid, bestAsk) {
        const spread = (bestBid && bestAsk) ? (bestAsk - bestBid).toFixed(2) : '0';
        console.log(`📊 ${symbol}: Bid=$${bestBid} Ask=$${bestAsk} Spread=$${spread}`);
    }
}

class PortfolioObserver extends MarketDataObserver {
    constructor(platform) {
        super();
        this.platform = platform;
    }

    onTrade(trade) {
        // Update buyer position
        const buyerPortfolio = this.platform.getPortfolio(trade.buyer);
        buyerPortfolio.addPosition(trade.symbol, trade.quantity, trade.price);

        // Update seller position
        const sellerPortfolio = this.platform.getPortfolio(trade.seller);
        sellerPortfolio.addPosition(trade.symbol, -trade.quantity, trade.price);
    }

    onOrderBookUpdate(symbol, bestBid, bestAsk) {}
}

// ============================================================================
// ORDER BOOK
// ============================================================================

class OrderBook {
    constructor(symbol) {
        this.symbol = symbol;
        this.buyOrders = [];  // Max heap (highest price first)
        this.sellOrders = []; // Min heap (lowest price first)
        this.orderMap = new Map();
    }

    addOrder(order) {
        this.orderMap.set(order.orderId, order);

        if (order.side === OrderSide.BUY) {
            this.buyOrders.push(order);
            this.buyOrders.sort((a, b) => {
                const priceA = a.price || 999999;
                const priceB = b.price || 999999;
                if (priceB !== priceA) return priceB - priceA; // Descending
                return a.timestamp - b.timestamp; // Time priority
            });
        } else {
            this.sellOrders.push(order);
            this.sellOrders.sort((a, b) => {
                const priceA = a.price || 0;
                const priceB = b.price || 0;
                if (priceA !== priceB) return priceA - priceB; // Ascending
                return a.timestamp - b.timestamp; // Time priority
            });
        }
    }

    removeOrder(orderId) {
        return this.orderMap.delete(orderId);
    }

    getBestBid() {
        this._cleanBuyOrders();
        return this.buyOrders.length > 0 ? this.buyOrders[0].price : null;
    }

    getBestAsk() {
        this._cleanSellOrders();
        return this.sellOrders.length > 0 ? this.sellOrders[0].price : null;
    }

    _cleanBuyOrders() {
        while (this.buyOrders.length > 0) {
            const order = this.buyOrders[0];
            if (order.isFullyFilled() || order.state instanceof CancelledState) {
                this.buyOrders.shift();
            } else {
                break;
            }
        }
    }

    _cleanSellOrders() {
        while (this.sellOrders.length > 0) {
            const order = this.sellOrders[0];
            if (order.isFullyFilled() || order.state instanceof CancelledState) {
                this.sellOrders.shift();
            } else {
                break;
            }
        }
    }

    getTopBuyOrder() {
        this._cleanBuyOrders();
        return this.buyOrders.length > 0 ? this.buyOrders[0] : null;
    }

    getTopSellOrder() {
        this._cleanSellOrders();
        return this.sellOrders.length > 0 ? this.sellOrders[0] : null;
    }
}

// ============================================================================
// 3. SINGLETON PATTERN - Order Matching Engine
// ============================================================================

class OrderMatchingEngine {
    static _instance = null;

    static getInstance() {
        if (!OrderMatchingEngine._instance) {
            OrderMatchingEngine._instance = new OrderMatchingEngine();
        }
        return OrderMatchingEngine._instance;
    }

    constructor() {
        if (OrderMatchingEngine._instance) {
            return OrderMatchingEngine._instance;
        }

        this.orderBooks = new Map();
        this.trades = [];
        this.observers = [];
        this.strategies = {
            [OrderType.MARKET]: new MarketOrderStrategy(),
            [OrderType.LIMIT]: new LimitOrderStrategy()
        };

        OrderMatchingEngine._instance = this;
    }

    registerObserver(observer) {
        this.observers.push(observer);
    }

    _notifyTrade(trade) {
        for (const observer of this.observers) {
            observer.onTrade(trade);
        }
    }

    _notifyBookUpdate(symbol) {
        const book = this.orderBooks.get(symbol);
        if (book) {
            const bestBid = book.getBestBid();
            const bestAsk = book.getBestAsk();
            for (const observer of this.observers) {
                observer.onOrderBookUpdate(symbol, bestBid, bestAsk);
            }
        }
    }

    submitOrder(order) {
        // Get or create order book
        if (!this.orderBooks.has(order.symbol)) {
            this.orderBooks.set(order.symbol, new OrderBook(order.symbol));
        }

        const book = this.orderBooks.get(order.symbol);

        // Add order to book
        book.addOrder(order);

        // Try to match
        this.matchOrders(order.symbol);

        // Notify observers
        this._notifyBookUpdate(order.symbol);
    }

    matchOrders(symbol) {
        const book = this.orderBooks.get(symbol);
        if (!book) return;

        while (true) {
            const buyOrder = book.getTopBuyOrder();
            const sellOrder = book.getTopSellOrder();

            if (!buyOrder || !sellOrder) break;

            // Check if orders can match
            const buyStrategy = this.strategies[buyOrder.orderType];
            const sellStrategy = this.strategies[sellOrder.orderType];

            const bestAsk = sellOrder.price || 0;
            const bestBid = buyOrder.price || 999999;

            if (!buyStrategy.canExecute(buyOrder, bestAsk)) break;
            if (!sellStrategy.canExecute(sellOrder, bestBid)) break;

            // Execute trade at seller's price
            const tradePrice = sellOrder.price || buyOrder.price;
            const tradeQty = Math.min(buyOrder.remainingQuantity(), sellOrder.remainingQuantity());

            // Create trade
            const trade = new Trade(
                Math.random().toString(36).substr(2, 8),
                symbol,
                buyOrder.user,
                sellOrder.user,
                tradePrice,
                tradeQty
            );

            // Update orders
            buyOrder.fill(tradeQty);
            sellOrder.fill(tradeQty);

            // Record trade
            this.trades.push(trade);

            // Notify observers
            this._notifyTrade(trade);
        }
    }

    cancelOrder(order) {
        return order.cancel();
    }
}

// ============================================================================
// 5. COMMAND PATTERN - Order Commands
// ============================================================================

class OrderCommand {
    execute() { throw new Error('Must implement'); }
    undo() { throw new Error('Must implement'); }
}

class PlaceOrderCommand extends OrderCommand {
    constructor(engine, order) {
        super();
        this.engine = engine;
        this.order = order;
    }

    execute() {
        this.engine.submitOrder(this.order);
        return true;
    }

    undo() {
        return this.engine.cancelOrder(this.order);
    }
}

class CancelOrderCommand extends OrderCommand {
    constructor(engine, order) {
        super();
        this.engine = engine;
        this.order = order;
    }

    execute() {
        return this.engine.cancelOrder(this.order);
    }

    undo() {
        return false; // Cannot undo cancellation
    }
}

// ============================================================================
// 4. FACTORY PATTERN - Order Factory
// ============================================================================

class OrderFactory {
    static createMarketOrder(user, symbol, side, quantity) {
        return new Order(
            Math.random().toString(36).substr(2, 8),
            user,
            symbol,
            side,
            OrderType.MARKET,
            quantity,
            null
        );
    }

    static createLimitOrder(user, symbol, side, quantity, price) {
        return new Order(
            Math.random().toString(36).substr(2, 8),
            user,
            symbol,
            side,
            OrderType.LIMIT,
            quantity,
            price
        );
    }
}

// ============================================================================
// PORTFOLIO
// ============================================================================

class Portfolio {
    constructor(user) {
        this.user = user;
        this.positions = new Map();
    }

    addPosition(symbol, qty, price) {
        if (!this.positions.has(symbol)) {
            this.positions.set(symbol, new Position(symbol));
        }

        const position = this.positions.get(symbol);

        // Handle buy/sell - realize P&L
        if ((position.quantity > 0 && qty < 0) || (position.quantity < 0 && qty > 0)) {
            const closingQty = Math.min(Math.abs(qty), Math.abs(position.quantity));
            let pnl = (price - position.averagePrice) * closingQty;
            if (position.quantity < 0) pnl = -pnl;
            position.realizedPnl += pnl;
        }

        position.update(qty, price);
    }

    getPosition(symbol) {
        return this.positions.get(symbol);
    }

    calculateTotalValue(prices) {
        let total = this.user.cashBalance;
        for (const [symbol, position] of this.positions) {
            if (prices.has(symbol)) {
                total += position.quantity * prices.get(symbol);
            }
        }
        return total;
    }
}

// ============================================================================
// TRADING PLATFORM
// ============================================================================

class TradingPlatform {
    constructor() {
        this.engine = OrderMatchingEngine.getInstance();
        this.portfolios = new Map();
        this.users = new Map();

        // Register observers
        this.engine.registerObserver(new PriceDisplayObserver());
        this.engine.registerObserver(new PortfolioObserver(this));
    }

    registerUser(user) {
        this.users.set(user.userId, user);
        this.portfolios.set(user.userId, new Portfolio(user));
    }

    getPortfolio(user) {
        return this.portfolios.get(user.userId);
    }

    placeOrder(user, symbol, side, quantity, orderType, price = null) {
        // Create order using factory
        let order;
        if (orderType === OrderType.MARKET) {
            order = OrderFactory.createMarketOrder(user, symbol, side, quantity);
        } else {
            order = OrderFactory.createLimitOrder(user, symbol, side, quantity, price);
        }

        // Execute using command
        const command = new PlaceOrderCommand(this.engine, order);
        command.execute();

        return order;
    }

    cancelOrder(order) {
        const command = new CancelOrderCommand(this.engine, order);
        return command.execute();
    }
}

// ============================================================================
// DEMONSTRATION
// ============================================================================

function demoTrading() {
    console.log('='.repeat(70));
    console.log('TRADING PLATFORM - COMPREHENSIVE DEMONSTRATION');
    console.log('='.repeat(70));

    // Create platform
    const platform = new TradingPlatform();

    // Create users
    const alice = new User('alice', 'Alice', 10000);
    const bob = new User('bob', 'Bob', 10000);
    const charlie = new User('charlie', 'Charlie', 10000);

    platform.registerUser(alice);
    platform.registerUser(bob);
    platform.registerUser(charlie);

    console.log('\n📝 Demo 1: Limit Orders with Perfect Match');
    console.log('-'.repeat(70));

    // Bob wants to buy 10 AAPL at $150
    const order1 = platform.placeOrder(bob, 'AAPL', OrderSide.BUY, 10, OrderType.LIMIT, 150);
    console.log('Bob placed: BUY 10 AAPL @ $150');

    // Alice wants to sell 10 AAPL at $150
    const order2 = platform.placeOrder(alice, 'AAPL', OrderSide.SELL, 10, OrderType.LIMIT, 150);
    console.log('Alice placed: SELL 10 AAPL @ $150');

    console.log(`\nBob's AAPL position: ${platform.getPortfolio(bob).getPosition('AAPL')?.quantity || 0} shares`);
    console.log(`Alice's AAPL position: ${platform.getPortfolio(alice).getPosition('AAPL')?.quantity || 0} shares`);

    console.log('\n📝 Demo 2: Partial Fill');
    console.log('-'.repeat(70));

    // Charlie wants to buy 20 AAPL at $151
    const order3 = platform.placeOrder(charlie, 'AAPL', OrderSide.BUY, 20, OrderType.LIMIT, 151);
    console.log('Charlie placed: BUY 20 AAPL @ $151');

    // Alice sells 10 AAPL at $151
    const order4 = platform.placeOrder(alice, 'AAPL', OrderSide.SELL, 10, OrderType.LIMIT, 151);
    console.log('Alice placed: SELL 10 AAPL @ $151');

    console.log(`\nCharlie's order status: ${order3.state.getName()}`);
    console.log(`Charlie filled: ${order3.filledQuantity}/${order3.quantity}`);

    console.log('\n📝 Demo 3: Market Order');
    console.log('-'.repeat(70));

    // Fill remaining of Charlie's order with market order
    const order5 = platform.placeOrder(bob, 'AAPL', OrderSide.SELL, 10, OrderType.MARKET);
    console.log('Bob placed: SELL 10 AAPL MARKET');

    console.log(`\nCharlie's order status: ${order3.state.getName()}`);
    console.log(`Bob's AAPL position: ${platform.getPortfolio(bob).getPosition('AAPL')?.quantity || 0} shares`);

    console.log('\n📝 Demo 4: Order Cancellation');
    console.log('-'.repeat(70));

    const order6 = platform.placeOrder(alice, 'AAPL', OrderSide.SELL, 5, OrderType.LIMIT, 155);
    console.log('Alice placed: SELL 5 AAPL @ $155');
    console.log(`Order status: ${order6.state.getName()}`);

    platform.cancelOrder(order6);
    console.log('Cancelled order');
    console.log(`Order status: ${order6.state.getName()}`);

    console.log('\n' + '='.repeat(70));
    console.log('✅ ALL DEMONSTRATIONS COMPLETED!');
    console.log('='.repeat(70));
    console.log('\n📊 Summary:');
    console.log('   - 6 Design Patterns implemented');
    console.log('   - Order matching with price-time priority');
    console.log('   - Portfolio tracking with positions');
    console.log('   - Real-time market data updates');
    console.log('='.repeat(70) + '\n');
}

// Run demonstration
demoTrading();
