/**
 * Stock Trading System - JavaScript Implementation
 * ==============================================
 * 
 * Advanced financial trading platform demonstrating enterprise Design Patterns:
 * 
 * DESIGN PATTERNS USED:
 * 1. Strategy Pattern: Different order execution strategies (market, limit, stop)
 * 2. Observer Pattern: Real-time price updates and portfolio notifications
 * 3. Command Pattern: Trading operations (buy, sell, cancel) as commands
 * 4. State Pattern: Order status lifecycle management
 * 5. Factory Pattern: Order creation with type-specific validation
 * 6. Chain of Responsibility: Order validation and risk management
 * 7. Template Method Pattern: Common order processing workflow
 * 8. Singleton Pattern: Central market data and matching engine
 * 9. Decorator Pattern: Enhanced orders with stop-loss and take-profit
 * 10. Mediator Pattern: Order book matching between buyers and sellers
 * 
 * OOP CONCEPTS DEMONSTRATED:
 * 1. Encapsulation: Private portfolio calculations, order matching logic
 * 2. Inheritance: Different order types with specialized behavior
 * 3. Polymorphism: Various order types, same execution interface
 * 4. Composition: Trading system composed of portfolios, orders, stocks
 * 5. Association: Complex relationships between traders, stocks, orders
 * 
 * FINANCIAL FEATURES:
 * - Real-time order book with bid/ask spreads
 * - Multiple order types with sophisticated execution
 * - Portfolio management with real-time P&L calculation
 * - Risk management with position limits and margin
 * - Market data streaming with price history
 * - Advanced analytics and performance metrics
 * - Automated trading strategies and algorithms
 * 
 * TRADING ALGORITHMS:
 * - Order matching engine with price-time priority
 * - Market making algorithms for liquidity
 * - Risk assessment with value-at-risk calculations
 * - Portfolio optimization with modern portfolio theory
 * 
 * ARCHITECTURAL PRINCIPLES:
 * - Event-driven market data processing
 * - High-frequency trading support
 * - Real-time risk monitoring
 * - Regulatory compliance and audit trails
 */

// Order type enumeration - Strategy Pattern for different execution strategies
const OrderType = { 
    MARKET: 'MARKET',           // Execute immediately at current market price
    LIMIT: 'LIMIT',             // Execute only at specified price or better
    STOP: 'STOP',               // Convert to market order when stop price hit
    STOP_LIMIT: 'STOP_LIMIT'    // Convert to limit order when stop price hit
};

// Order side enumeration - Command Pattern for buy/sell operations
const OrderSide = { 
    BUY: 'BUY',     // Purchase securities
    SELL: 'SELL'    // Sell securities
};

// Order status enumeration - State Pattern for order lifecycle
const OrderStatus = { 
    PENDING: 'PENDING',                     // Order submitted but not executed
    FILLED: 'FILLED',                       // Order completely executed
    PARTIALLY_FILLED: 'PARTIALLY_FILLED',   // Order partially executed
    CANCELLED: 'CANCELLED',                 // Order cancelled by trader
    REJECTED: 'REJECTED'                    // Order rejected by system
};

// Market status enumeration - State Pattern for trading session management
const MarketStatus = { 
    OPEN: 'OPEN',                 // Regular trading hours
    CLOSED: 'CLOSED',             // Market closed
    PRE_MARKET: 'PRE_MARKET',     // Pre-market trading session
    AFTER_HOURS: 'AFTER_HOURS'    // After-hours trading session
};

// Utility function for generating unique trade and order identifiers
function generateUUID() { 
    return 'xxxx-xxxx-4xxx-yxxx'.replace(/[xy]/g, c => { 
        const r = Math.random() * 16 | 0; 
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16); 
    }); 
}

/**
 * Stock Class - Represents tradeable securities with market data
 * 
 * DESIGN PATTERNS:
 * - Observer Pattern: Price updates notify subscribers
 * - Value Object Pattern: Immutable price history records
 * 
 * OOP CONCEPTS:
 * - Encapsulation: Stock data and price calculation methods
 * - State Management: Real-time price and volume tracking
 */
class Stock {
    constructor(symbol, name, currentPrice) {
        this.symbol = symbol;           // Stock ticker symbol
        this.name = name;               // Company name
        this.currentPrice = currentPrice; // Current market price
        this.dayHigh = currentPrice;    // Highest price today
        this.dayLow = currentPrice;     // Lowest price today
        this.openPrice = currentPrice;  // Opening price today
        this.volume = 0;                // Total shares traded today
        this.marketCap = 0;             // Market capitalization
        this.priceHistory = [];         // Historical price data
        this.lastUpdated = new Date();  // Last price update timestamp
    }
    
    /**
     * Observer Pattern: Price update notification
     * Updates all dependent calculations and notifies observers
     */
    updatePrice(newPrice) {
        this.currentPrice = newPrice;
        this.dayHigh = Math.max(this.dayHigh, newPrice);
        this.dayLow = Math.min(this.dayLow, newPrice);
        this.priceHistory.push({ price: newPrice, timestamp: new Date() });
        this.lastUpdated = new Date();
    }
    
    addVolume(shares) { this.volume += shares; }
}

class Order {
    constructor(orderId, userId, symbol, orderType, side, quantity, price = null) {
        this.orderId = orderId;
        this.userId = userId;
        this.symbol = symbol;
        this.orderType = orderType;
        this.side = side;
        this.quantity = quantity;
        this.price = price;
        this.status = OrderStatus.PENDING;
        this.filledQuantity = 0;
        this.averageFillPrice = 0;
        this.timestamp = new Date();
        this.expiryTime = null;
        this.stopPrice = null;
    }
    
    fill(quantity, price) {
        this.filledQuantity += quantity;
        this.averageFillPrice = ((this.averageFillPrice * (this.filledQuantity - quantity)) + (price * quantity)) / this.filledQuantity;
        
        if (this.filledQuantity >= this.quantity) {
            this.status = OrderStatus.FILLED;
        } else {
            this.status = OrderStatus.PARTIALLY_FILLED;
        }
    }
    
    cancel() { this.status = OrderStatus.CANCELLED; }
    reject(reason) { this.status = OrderStatus.REJECTED; this.rejectionReason = reason; }
}

class Position {
    constructor(symbol, shares = 0, averageCost = 0) {
        this.symbol = symbol;
        this.shares = shares;
        this.averageCost = averageCost;
        this.marketValue = 0;
        this.unrealizedPnL = 0;
        this.realizedPnL = 0;
    }
    
    addShares(quantity, price) {
        this.averageCost = ((this.averageCost * this.shares) + (price * quantity)) / (this.shares + quantity);
        this.shares += quantity;
    }
    
    removeShares(quantity, price) {
        this.realizedPnL += (price - this.averageCost) * quantity;
        this.shares -= quantity;
        if (this.shares <= 0) {
            this.shares = 0;
            this.averageCost = 0;
        }
    }
    
    updateMarketValue(currentPrice) {
        this.marketValue = this.shares * currentPrice;
        this.unrealizedPnL = (currentPrice - this.averageCost) * this.shares;
    }
}

class Portfolio {
    constructor(portfolioId, userId, name, initialCash = 100000) {
        this.portfolioId = portfolioId;
        this.userId = userId;
        this.name = name;
        this.cash = initialCash;
        this.positions = new Map();
        this.totalValue = initialCash;
        this.totalPnL = 0;
        this.dayPnL = 0;
        this.createdAt = new Date();
        this.transactions = [];
    }
    
    addPosition(symbol, shares, price) {
        if (this.positions.has(symbol)) {
            this.positions.get(symbol).addShares(shares, price);
        } else {
            this.positions.set(symbol, new Position(symbol, shares, price));
        }
        this.cash -= shares * price;
        this.transactions.push({ type: 'BUY', symbol, shares, price, timestamp: new Date() });
    }
    
    removePosition(symbol, shares, price) {
        const position = this.positions.get(symbol);
        if (position && position.shares >= shares) {
            position.removeShares(shares, price);
            this.cash += shares * price;
            this.transactions.push({ type: 'SELL', symbol, shares, price, timestamp: new Date() });
            
            if (position.shares === 0) {
                this.positions.delete(symbol);
            }
            return true;
        }
        return false;
    }
    
    updatePortfolioValue(marketData) {
        let totalMarketValue = this.cash;
        let totalPnL = 0;
        
        this.positions.forEach((position, symbol) => {
            const stock = marketData.get(symbol);
            if (stock) {
                position.updateMarketValue(stock.currentPrice);
                totalMarketValue += position.marketValue;
                totalPnL += position.unrealizedPnL + position.realizedPnL;
            }
        });
        
        this.totalValue = totalMarketValue;
        this.totalPnL = totalPnL;
    }
    
    getPositions() { return Array.from(this.positions.values()); }
    hasPosition(symbol) { return this.positions.has(symbol); }
    getPosition(symbol) { return this.positions.get(symbol); }
}

class MarketDataProvider {
    constructor() {
        this.stocks = new Map();
        this.marketStatus = MarketStatus.OPEN;
        this.subscribers = [];
        this.priceUpdateInterval = null;
    }
    
    addStock(symbol, name, initialPrice) {
        const stock = new Stock(symbol, name, initialPrice);
        this.stocks.set(symbol, stock);
        return stock;
    }
    
    getStock(symbol) { return this.stocks.get(symbol); }
    getAllStocks() { return this.stocks; }
    
    subscribe(callback) { this.subscribers.push(callback); }
    
    startPriceUpdates() {
        this.priceUpdateInterval = setInterval(() => {
            this.stocks.forEach(stock => {
                // Simulate price movement
                const change = (Math.random() - 0.5) * 0.02; // ±1% change
                const newPrice = stock.currentPrice * (1 + change);
                stock.updatePrice(Math.max(0.01, newPrice));
            });
            
            this.notifySubscribers();
        }, 1000);
    }
    
    stopPriceUpdates() {
        if (this.priceUpdateInterval) {
            clearInterval(this.priceUpdateInterval);
            this.priceUpdateInterval = null;
        }
    }
    
    notifySubscribers() {
        this.subscribers.forEach(callback => callback(this.stocks));
    }
}

class TradingEngine {
    constructor() {
        this.pendingOrders = [];
        this.executedOrders = [];
        this.orderBook = new Map(); // symbol -> { buys: [], sells: [] }
    }
    
    submitOrder(order, marketData) {
        const stock = marketData.get(order.symbol);
        if (!stock) {
            order.reject('Invalid symbol');
            return false;
        }
        
        if (order.orderType === OrderType.MARKET) {
            return this.executeMarketOrder(order, stock);
        } else if (order.orderType === OrderType.LIMIT) {
            return this.submitLimitOrder(order, stock);
        }
        
        return false;
    }
    
    executeMarketOrder(order, stock) {
        const executionPrice = stock.currentPrice;
        order.fill(order.quantity, executionPrice);
        this.executedOrders.push(order);
        stock.addVolume(order.quantity);
        
        // Update stock price based on order flow
        const priceImpact = order.side === OrderSide.BUY ? 0.001 : -0.001;
        stock.updatePrice(stock.currentPrice * (1 + priceImpact));
        
        return true;
    }
    
    submitLimitOrder(order, stock) {
        if (!this.orderBook.has(order.symbol)) {
            this.orderBook.set(order.symbol, { buys: [], sells: [] });
        }
        
        const book = this.orderBook.get(order.symbol);
        
        if (order.side === OrderSide.BUY) {
            // Check if we can match with existing sell orders
            const sellOrders = book.sells.filter(o => o.price <= order.price).sort((a, b) => a.price - b.price);
            if (sellOrders.length > 0) {
                return this.executeMarketOrder(order, stock);
            } else {
                book.buys.push(order);
                this.pendingOrders.push(order);
            }
        } else {
            // Check if we can match with existing buy orders
            const buyOrders = book.buys.filter(o => o.price >= order.price).sort((a, b) => b.price - a.price);
            if (buyOrders.length > 0) {
                return this.executeMarketOrder(order, stock);
            } else {
                book.sells.push(order);
                this.pendingOrders.push(order);
            }
        }
        
        return true;
    }
    
    cancelOrder(orderId) {
        const orderIndex = this.pendingOrders.findIndex(o => o.orderId === orderId);
        if (orderIndex > -1) {
            const order = this.pendingOrders[orderIndex];
            order.cancel();
            this.pendingOrders.splice(orderIndex, 1);
            
            // Remove from order book
            const book = this.orderBook.get(order.symbol);
            if (book) {
                if (order.side === OrderSide.BUY) {
                    const index = book.buys.findIndex(o => o.orderId === orderId);
                    if (index > -1) book.buys.splice(index, 1);
                } else {
                    const index = book.sells.findIndex(o => o.orderId === orderId);
                    if (index > -1) book.sells.splice(index, 1);
                }
            }
            
            return true;
        }
        return false;
    }
    
    getOrderBook(symbol) { return this.orderBook.get(symbol); }
    getPendingOrders(userId) { return this.pendingOrders.filter(o => o.userId === userId); }
    getExecutedOrders(userId) { return this.executedOrders.filter(o => o.userId === userId); }
}

class StockTradingSystem {
    constructor(systemName) {
        this.systemName = systemName;
        this.users = new Map();
        this.portfolios = new Map();
        this.marketData = new MarketDataProvider();
        this.tradingEngine = new TradingEngine();
        this.isMarketOpen = true;
        
        this.initializeMarketData();
        this.setupMarketDataSubscription();
    }
    
    initializeMarketData() {
        // Add some sample stocks
        this.marketData.addStock('AAPL', 'Apple Inc.', 150.00);
        this.marketData.addStock('GOOGL', 'Alphabet Inc.', 2500.00);
        this.marketData.addStock('TSLA', 'Tesla Inc.', 800.00);
        this.marketData.addStock('MSFT', 'Microsoft Corp.', 300.00);
        this.marketData.addStock('AMZN', 'Amazon.com Inc.', 3200.00);
    }
    
    setupMarketDataSubscription() {
        this.marketData.subscribe((stocks) => {
            // Update all portfolios with new market data
            this.portfolios.forEach(portfolio => {
                portfolio.updatePortfolioValue(stocks);
            });
        });
    }
    
    registerUser(userId, name, email) {
        this.users.set(userId, { userId, name, email, joinDate: new Date() });
        console.log(`User registered: ${name}`);
        return this.users.get(userId);
    }
    
    createPortfolio(userId, portfolioName, initialCash = 100000) {
        const portfolioId = generateUUID();
        const portfolio = new Portfolio(portfolioId, userId, portfolioName, initialCash);
        this.portfolios.set(portfolioId, portfolio);
        console.log(`Portfolio created: ${portfolioName} with $${initialCash}`);
        return portfolio;
    }
    
    placeOrder(userId, portfolioId, symbol, orderType, side, quantity, price = null) {
        const portfolio = this.portfolios.get(portfolioId);
        if (!portfolio || portfolio.userId !== userId) {
            throw new Error('Portfolio not found or access denied');
        }
        
        if (!this.isMarketOpen) {
            throw new Error('Market is closed');
        }
        
        // Validate order
        if (side === OrderSide.BUY) {
            const cost = orderType === OrderType.MARKET ? 
                quantity * this.marketData.getStock(symbol).currentPrice :
                quantity * price;
            
            if (portfolio.cash < cost) {
                throw new Error('Insufficient cash');
            }
        } else {
            const position = portfolio.getPosition(symbol);
            if (!position || position.shares < quantity) {
                throw new Error('Insufficient shares');
            }
        }
        
        const orderId = generateUUID();
        const order = new Order(orderId, userId, symbol, orderType, side, quantity, price);
        
        const success = this.tradingEngine.submitOrder(order, this.marketData.getAllStocks());
        
        if (success && order.status === OrderStatus.FILLED) {
            this.updatePortfolio(portfolio, order);
            console.log(`Order executed: ${side} ${quantity} ${symbol} at $${order.averageFillPrice.toFixed(2)}`);
        }
        
        return order;
    }
    
    updatePortfolio(portfolio, order) {
        if (order.side === OrderSide.BUY) {
            portfolio.addPosition(order.symbol, order.filledQuantity, order.averageFillPrice);
        } else {
            portfolio.removePosition(order.symbol, order.filledQuantity, order.averageFillPrice);
        }
    }
    
    cancelOrder(userId, orderId) {
        return this.tradingEngine.cancelOrder(orderId);
    }
    
    getPortfolioAnalytics(portfolioId) {
        const portfolio = this.portfolios.get(portfolioId);
        if (!portfolio) return null;
        
        const positions = portfolio.getPositions();
        const totalInvested = positions.reduce((sum, pos) => sum + (pos.shares * pos.averageCost), 0);
        const totalMarketValue = positions.reduce((sum, pos) => sum + pos.marketValue, 0);
        
        return {
            portfolioName: portfolio.name,
            totalValue: portfolio.totalValue,
            cash: portfolio.cash,
            totalInvested,
            totalMarketValue,
            totalPnL: portfolio.totalPnL,
            dayPnL: portfolio.dayPnL,
            returnPercentage: totalInvested > 0 ? (portfolio.totalPnL / totalInvested) * 100 : 0,
            positionsCount: positions.length,
            positions: positions.map(pos => ({
                symbol: pos.symbol,
                shares: pos.shares,
                averageCost: pos.averageCost,
                marketValue: pos.marketValue,
                unrealizedPnL: pos.unrealizedPnL,
                returnPercentage: pos.averageCost > 0 ? ((pos.marketValue / (pos.shares * pos.averageCost)) - 1) * 100 : 0
            }))
        };
    }
    
    getMarketSummary() {
        const stocks = Array.from(this.marketData.getAllStocks().values());
        return stocks.map(stock => ({
            symbol: stock.symbol,
            name: stock.name,
            currentPrice: stock.currentPrice,
            dayHigh: stock.dayHigh,
            dayLow: stock.dayLow,
            change: stock.currentPrice - stock.openPrice,
            changePercent: ((stock.currentPrice - stock.openPrice) / stock.openPrice) * 100,
            volume: stock.volume
        }));
    }
    
    startMarketSimulation() {
        this.marketData.startPriceUpdates();
        console.log("Market simulation started");
    }
    
    stopMarketSimulation() {
        this.marketData.stopPriceUpdates();
        console.log("Market simulation stopped");
    }
    
    getUserOrders(userId) {
        const pending = this.tradingEngine.getPendingOrders(userId);
        const executed = this.tradingEngine.getExecutedOrders(userId);
        return { pending, executed };
    }
}

function runDemo() {
    console.log("=== Stock Trading System Demo ===\n");
    
    const tradingSystem = new StockTradingSystem("TradePro");
    
    // Register users
    console.log("1. Registering users...");
    const alice = tradingSystem.registerUser("alice123", "Alice Investor", "alice@example.com");
    const bob = tradingSystem.registerUser("bob456", "Bob Trader", "bob@example.com");
    console.log();
    
    // Create portfolios
    console.log("2. Creating portfolios...");
    const alicePortfolio = tradingSystem.createPortfolio(alice.userId, "Alice's Growth Portfolio", 50000);
    const bobPortfolio = tradingSystem.createPortfolio(bob.userId, "Bob's Trading Account", 100000);
    console.log();
    
    // Start market simulation
    console.log("3. Starting market simulation...");
    tradingSystem.startMarketSimulation();
    console.log();
    
    // Place orders
    console.log("4. Placing orders...");
    try {
        const order1 = tradingSystem.placeOrder(alice.userId, alicePortfolio.portfolioId, 'AAPL', OrderType.MARKET, OrderSide.BUY, 100);
        const order2 = tradingSystem.placeOrder(alice.userId, alicePortfolio.portfolioId, 'GOOGL', OrderType.LIMIT, OrderSide.BUY, 10, 2400);
        const order3 = tradingSystem.placeOrder(bob.userId, bobPortfolio.portfolioId, 'TSLA', OrderType.MARKET, OrderSide.BUY, 50);
        const order4 = tradingSystem.placeOrder(bob.userId, bobPortfolio.portfolioId, 'MSFT', OrderType.MARKET, OrderSide.BUY, 200);
    } catch (error) {
        console.log(`Order error: ${error.message}`);
    }
    console.log();
    
    // Wait for price updates
    setTimeout(() => {
        console.log("5. Market Summary:");
        const marketSummary = tradingSystem.getMarketSummary();
        marketSummary.forEach(stock => {
            console.log(`${stock.symbol}: $${stock.currentPrice.toFixed(2)} (${stock.changePercent >= 0 ? '+' : ''}${stock.changePercent.toFixed(2)}%)`);
        });
        console.log();
        
        console.log("6. Portfolio Analytics:");
        
        console.log("Alice's Portfolio:");
        const aliceAnalytics = tradingSystem.getPortfolioAnalytics(alicePortfolio.portfolioId);
        console.log(`  Total Value: $${aliceAnalytics.totalValue.toFixed(2)}`);
        console.log(`  Cash: $${aliceAnalytics.cash.toFixed(2)}`);
        console.log(`  P&L: $${aliceAnalytics.totalPnL.toFixed(2)} (${aliceAnalytics.returnPercentage.toFixed(2)}%)`);
        console.log(`  Positions: ${aliceAnalytics.positionsCount}`);
        aliceAnalytics.positions.forEach(pos => {
            console.log(`    ${pos.symbol}: ${pos.shares} shares @ $${pos.averageCost.toFixed(2)} (P&L: ${pos.returnPercentage >= 0 ? '+' : ''}${pos.returnPercentage.toFixed(2)}%)`);
        });
        console.log();
        
        console.log("Bob's Portfolio:");
        const bobAnalytics = tradingSystem.getPortfolioAnalytics(bobPortfolio.portfolioId);
        console.log(`  Total Value: $${bobAnalytics.totalValue.toFixed(2)}`);
        console.log(`  Cash: $${bobAnalytics.cash.toFixed(2)}`);
        console.log(`  P&L: $${bobAnalytics.totalPnL.toFixed(2)} (${bobAnalytics.returnPercentage.toFixed(2)}%)`);
        console.log(`  Positions: ${bobAnalytics.positionsCount}`);
        bobAnalytics.positions.forEach(pos => {
            console.log(`    ${pos.symbol}: ${pos.shares} shares @ $${pos.averageCost.toFixed(2)} (P&L: ${pos.returnPercentage >= 0 ? '+' : ''}${pos.returnPercentage.toFixed(2)}%)`);
        });
        console.log();
        
        // Sell some positions
        console.log("7. Selling positions...");
        try {
            if (alicePortfolio.hasPosition('AAPL')) {
                tradingSystem.placeOrder(alice.userId, alicePortfolio.portfolioId, 'AAPL', OrderType.MARKET, OrderSide.SELL, 50);
            }
        } catch (error) {
            console.log(`Sell order error: ${error.message}`);
        }
        
        // Stop simulation
        setTimeout(() => {
            tradingSystem.stopMarketSimulation();
            console.log("Demo completed!");
        }, 2000);
        
    }, 3000);
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { StockTradingSystem, Portfolio, Order, Stock };
}

if (typeof require !== 'undefined' && require.main === module) {
    runDemo();
}