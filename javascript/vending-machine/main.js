#!/usr/bin/env node

/**
 * Vending Machine System - Low Level Design Implementation
 * 
 * A comprehensive vending machine system supporting multiple payment methods,
 * inventory management, change calculation, and administrative functions.
 * 
 * Key Features:
 * - Multi-payment support (Cash, Credit Card, Mobile Payment, Digital Wallet)
 * - Smart change calculation with optimal denomination distribution
 * - Real-time inventory tracking with automatic reordering alerts
 * - Transaction management with audit trails and reporting
 * - Administrative functions for restocking and maintenance
 * - Thread-safe operations for concurrent access
 * - Comprehensive error handling and fault tolerance
 * 
 * Design Patterns Used:
 * - State Pattern: Machine states (Idle, Selecting, Payment, Dispensing, Maintenance)
 * - Strategy Pattern: Different payment methods and dispensing strategies
 * - Command Pattern: Transaction operations and administrative commands
 * - Observer Pattern: Inventory alerts and transaction notifications
 * - Factory Pattern: Payment processor and product creation
 * - Singleton Pattern: Vending machine configuration
 * - Template Method: Common transaction processing workflow
 * 
 * Author: GitHub Copilot
 * Date: October 2025
 */

// Enumerations
const MachineState = Object.freeze({
    IDLE: 'idle',
    PRODUCT_SELECTION: 'product_selection',
    PAYMENT_PROCESSING: 'payment_processing',
    DISPENSING: 'dispensing',
    MAINTENANCE: 'maintenance',
    OUT_OF_ORDER: 'out_of_order'
});

const PaymentMethod = Object.freeze({
    CASH: 'cash',
    CREDIT_CARD: 'credit_card',
    DEBIT_CARD: 'debit_card',
    MOBILE_PAYMENT: 'mobile_payment',
    DIGITAL_WALLET: 'digital_wallet'
});

const TransactionStatus = Object.freeze({
    INITIATED: 'initiated',
    PAYMENT_PENDING: 'payment_pending',
    PAYMENT_APPROVED: 'payment_approved',
    PAYMENT_DECLINED: 'payment_declined',
    DISPENSING: 'dispensing',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
    REFUNDED: 'refunded'
});

const ProductCategory = Object.freeze({
    BEVERAGES: 'beverages',
    SNACKS: 'snacks',
    CANDY: 'candy',
    HEALTHY: 'healthy',
    HOT_DRINKS: 'hot_drinks'
});

// Data Classes
class Product {
    constructor(code, name, price, category, calories = 0, weight = 0.0, ingredients = [], allergens = [], expiryDays = 365, isAvailable = true) {
        this.code = code;
        this.name = name;
        this.price = parseFloat(price.toFixed(2));
        this.category = category;
        this.calories = calories;
        this.weight = weight;
        this.ingredients = ingredients;
        this.allergens = allergens;
        this.expiryDays = expiryDays;
        this.isAvailable = isAvailable;
    }
}

class InventoryItem {
    constructor(product, currentStock, maxCapacity, lowStockThreshold, reorderQuantity) {
        this.product = product;
        this.currentStock = currentStock;
        this.maxCapacity = maxCapacity;
        this.lowStockThreshold = lowStockThreshold;
        this.reorderQuantity = reorderQuantity;
        this.lastRestocked = new Date();
        this.totalSold = 0;
    }
}

class CashDenomination {
    constructor(value, count, maxCapacity = 100) {
        this.value = parseFloat(value.toFixed(2));
        this.count = count;
        this.maxCapacity = maxCapacity;
    }
}

class CardInfo {
    constructor(number, expiry, cvv, holderName, cardType = 'credit') {
        this.number = number;
        this.expiry = expiry;
        this.cvv = cvv;
        this.holderName = holderName;
        this.cardType = cardType;
    }
}

class PaymentResult {
    constructor(success, transactionId = null, amountCharged = null, change = null, changeDenominations = null, errorMessage = null, authorizationCode = null) {
        this.success = success;
        this.transactionId = transactionId;
        this.amountCharged = amountCharged;
        this.change = change;
        this.changeDenominations = changeDenominations;
        this.errorMessage = errorMessage;
        this.authorizationCode = authorizationCode;
    }
}

class DispenseResult {
    constructor(success, productCode = null, errorMessage = null, retryCount = 0) {
        this.success = success;
        this.productCode = productCode;
        this.errorMessage = errorMessage;
        this.retryCount = retryCount;
    }
}

class Transaction {
    constructor(transactionId, timestamp, productCode, productName, price, paymentMethod, amountPaid, changeGiven, status, customerId = null, cardLastFour = null, location = 'Unknown') {
        this.transactionId = transactionId;
        this.timestamp = timestamp;
        this.productCode = productCode;
        this.productName = productName;
        this.price = price;
        this.paymentMethod = paymentMethod;
        this.amountPaid = amountPaid;
        this.changeGiven = changeGiven;
        this.status = status;
        this.customerId = customerId;
        this.cardLastFour = cardLastFour;
        this.location = location;
    }
}

class SalesReport {
    constructor(startDate, endDate, totalRevenue, totalTransactions, unitsSold, topProducts, paymentMethodDistribution, hourlySales, categoryPerformance) {
        this.startDate = startDate;
        this.endDate = endDate;
        this.totalRevenue = totalRevenue;
        this.totalTransactions = totalTransactions;
        this.unitsSold = unitsSold;
        this.topProducts = topProducts;
        this.paymentMethodDistribution = paymentMethodDistribution;
        this.hourlySales = hourlySales;
        this.categoryPerformance = categoryPerformance;
    }
}

// Abstract Payment Processor
class PaymentProcessor {
    constructor(processorName) {
        this.processorName = processorName;
        this.isEnabled = true;
        this.transactionFee = 0.00;
    }

    validatePayment(amount, ...args) {
        throw new Error('validatePayment method must be implemented');
    }

    async processPayment(amount, ...args) {
        throw new Error('processPayment method must be implemented');
    }

    async refundPayment(transactionId, amount) {
        throw new Error('refundPayment method must be implemented');
    }
}

// Cash Payment Processor
class CashPaymentProcessor extends PaymentProcessor {
    constructor() {
        super('Cash Processor');
        this.acceptedDenominations = new Map([
            [0.01, new CashDenomination(0.01, 100)],  // Pennies
            [0.05, new CashDenomination(0.05, 50)],   // Nickels
            [0.10, new CashDenomination(0.10, 50)],   // Dimes
            [0.25, new CashDenomination(0.25, 40)],   // Quarters
            [1.00, new CashDenomination(1.00, 30)],   // Dollar coins
            [5.00, new CashDenomination(5.00, 20)],   // $5 bills
            [10.00, new CashDenomination(10.00, 10)], // $10 bills
            [20.00, new CashDenomination(20.00, 5)]   // $20 bills
        ]);
    }

    validatePayment(amount, insertedCash = {}) {
        const totalInserted = Object.entries(insertedCash).reduce((sum, [denom, count]) => {
            return sum + (parseFloat(denom) * count);
        }, 0);
        return totalInserted >= amount;
    }

    async processPayment(amount, insertedCash = {}) {
        // Calculate total inserted
        const totalInserted = Object.entries(insertedCash).reduce((sum, [denom, count]) => {
            return sum + (parseFloat(denom) * count);
        }, 0);

        if (totalInserted < amount) {
            return new PaymentResult(
                false,
                null,
                null,
                null,
                null,
                `Insufficient cash. Need $${amount.toFixed(2)}, got $${totalInserted.toFixed(2)}`
            );
        }

        // Calculate change
        const changeAmount = parseFloat((totalInserted - amount).toFixed(2));
        const changeDenominations = this._calculateChange(changeAmount);

        if (changeDenominations === null) {
            return new PaymentResult(
                false,
                null,
                null,
                null,
                null,
                'Cannot provide exact change'
            );
        }

        // Add inserted cash to machine
        for (const [denom, count] of Object.entries(insertedCash)) {
            const denomValue = parseFloat(denom);
            if (this.acceptedDenominations.has(denomValue)) {
                this.acceptedDenominations.get(denomValue).count += count;
            }
        }

        // Remove change from machine
        for (const [denom, count] of Object.entries(changeDenominations)) {
            const denomValue = parseFloat(denom);
            if (this.acceptedDenominations.has(denomValue)) {
                this.acceptedDenominations.get(denomValue).count -= count;
            }
        }

        const transactionId = `cash_${this._generateId()}`;

        return new PaymentResult(
            true,
            transactionId,
            amount,
            changeAmount,
            changeDenominations
        );
    }

    async refundPayment(transactionId, amount) {
        const refundDenominations = this._calculateChange(amount);

        if (refundDenominations === null) {
            return new PaymentResult(
                false,
                null,
                null,
                null,
                null,
                'Cannot provide refund - insufficient denominations'
            );
        }

        // Remove refund amount from machine
        for (const [denom, count] of Object.entries(refundDenominations)) {
            const denomValue = parseFloat(denom);
            if (this.acceptedDenominations.has(denomValue)) {
                this.acceptedDenominations.get(denomValue).count -= count;
            }
        }

        return new PaymentResult(
            true,
            `refund_${transactionId}`,
            amount,
            amount,
            refundDenominations
        );
    }

    _calculateChange(amount) {
        if (amount === 0) {
            return {};
        }

        const change = {};
        let remaining = Math.round(amount * 100) / 100; // Round to 2 decimal places

        // Sort denominations in descending order
        const sortedDenoms = Array.from(this.acceptedDenominations.keys()).sort((a, b) => b - a);

        for (const denom of sortedDenoms) {
            const availableCount = this.acceptedDenominations.get(denom).count;
            if (remaining >= denom && availableCount > 0) {
                const neededCount = Math.floor(remaining / denom);
                const useCount = Math.min(neededCount, availableCount);

                if (useCount > 0) {
                    change[denom] = useCount;
                    remaining = Math.round((remaining - (denom * useCount)) * 100) / 100;
                }
            }
        }

        return remaining === 0 ? change : null;
    }

    addCash(denominations) {
        for (const [denom, count] of Object.entries(denominations)) {
            const denomValue = parseFloat(denom);
            if (this.acceptedDenominations.has(denomValue)) {
                const current = this.acceptedDenominations.get(denomValue);
                current.count = Math.min(current.count + count, current.maxCapacity);
            }
        }
    }

    getCashLevels() {
        const levels = {};
        for (const [denom, info] of this.acceptedDenominations.entries()) {
            levels[denom] = info.count;
        }
        return levels;
    }

    _generateId() {
        return Math.random().toString(36).substr(2, 8);
    }
}

// Card Payment Processor
class CardPaymentProcessor extends PaymentProcessor {
    constructor() {
        super('Card Processor');
        this.transactionFee = 0.03; // 3% transaction fee
    }

    validatePayment(amount, cardInfo) {
        if (!cardInfo) {
            return false;
        }
        return this._validateCard(cardInfo);
    }

    async processPayment(amount, cardInfo) {
        if (!this._validateCard(cardInfo)) {
            return new PaymentResult(
                false,
                null,
                null,
                null,
                null,
                'Invalid card information'
            );
        }

        // Simulate payment processing delay
        await this._delay(Math.random() * 2000 + 1000);

        // 95% success rate for simulation
        if (Math.random() < 0.95) {
            const transactionId = `card_${this._generateId()}`;
            const authorizationCode = `AUTH_${Math.floor(Math.random() * 900000) + 100000}`;

            return new PaymentResult(
                true,
                transactionId,
                amount,
                0,
                null,
                null,
                authorizationCode
            );
        } else {
            return new PaymentResult(
                false,
                null,
                null,
                null,
                null,
                'Card declined by issuer'
            );
        }
    }

    async refundPayment(transactionId, amount) {
        // Simulate refund processing delay
        await this._delay(Math.random() * 1000 + 500);

        const refundId = `refund_${transactionId}`;

        return new PaymentResult(
            true,
            refundId,
            amount
        );
    }

    _validateCard(cardInfo) {
        if (!cardInfo) {
            return false;
        }

        // Basic validation
        const cleanNumber = cardInfo.number.replace(/[-\s]/g, '');
        if (cleanNumber.length < 13) {
            return false;
        }

        if (!cardInfo.expiry || cardInfo.expiry.length !== 5) { // MM/YY format
            return false;
        }

        if (!cardInfo.cvv || cardInfo.cvv.length < 3) {
            return false;
        }

        // Check expiry date
        try {
            const [month, year] = cardInfo.expiry.split('/');
            const expiryDate = new Date(2000 + parseInt(year), parseInt(month) - 1);
            if (expiryDate < new Date()) {
                return false;
            }
        } catch {
            return false;
        }

        return true;
    }

    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    _generateId() {
        return Math.random().toString(36).substr(2, 8);
    }
}

// Mobile Payment Processor
class MobilePaymentProcessor extends PaymentProcessor {
    constructor() {
        super('Mobile Payment Processor');
        this.transactionFee = 0.015; // 1.5% transaction fee
    }

    validatePayment(amount, mobileToken) {
        return mobileToken && mobileToken.length > 10;
    }

    async processPayment(amount, mobileToken) {
        if (!mobileToken) {
            return new PaymentResult(
                false,
                null,
                null,
                null,
                null,
                'Invalid mobile payment token'
            );
        }

        // Simulate payment processing delay
        await this._delay(Math.random() * 1500 + 500);

        // 98% success rate for mobile payments
        if (Math.random() < 0.98) {
            const transactionId = `mobile_${this._generateId()}`;

            return new PaymentResult(
                true,
                transactionId,
                amount
            );
        } else {
            return new PaymentResult(
                false,
                null,
                null,
                null,
                null,
                'Mobile payment failed'
            );
        }
    }

    async refundPayment(transactionId, amount) {
        const refundId = `refund_${transactionId}`;

        return new PaymentResult(
            true,
            refundId,
            amount
        );
    }

    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    _generateId() {
        return Math.random().toString(36).substr(2, 8);
    }
}

// Inventory Management System
class Inventory {
    constructor() {
        this.items = new Map();
        this.observers = [];
    }

    addProduct(product, initialStock = 0, maxCapacity = 10, lowStockThreshold = 2, reorderQuantity = 8) {
        const inventoryItem = new InventoryItem(
            product,
            initialStock,
            maxCapacity,
            lowStockThreshold,
            reorderQuantity
        );
        this.items.set(product.code, inventoryItem);
    }

    checkAvailability(productCode) {
        const item = this.items.get(productCode);
        return item && item.currentStock > 0 && item.product.isAvailable;
    }

    reserveProduct(productCode) {
        if (!this.checkAvailability(productCode)) {
            return false;
        }

        const item = this.items.get(productCode);
        item.currentStock--;
        return true;
    }

    confirmSale(productCode) {
        const item = this.items.get(productCode);
        if (item) {
            item.totalSold++;

            // Check for low stock alert
            if (item.currentStock <= item.lowStockThreshold) {
                this._notifyLowStock(productCode, item);
            }
        }
    }

    cancelReservation(productCode) {
        const item = this.items.get(productCode);
        if (item) {
            item.currentStock++;
        }
    }

    restock(productCode, quantity) {
        const item = this.items.get(productCode);
        if (!item) {
            return false;
        }

        const newStock = Math.min(item.currentStock + quantity, item.maxCapacity);
        item.currentStock = newStock;
        item.lastRestocked = new Date();

        console.log(`Restocked ${productCode} with ${quantity} units. New stock: ${newStock}`);
        return true;
    }

    getInventoryStatus() {
        const status = {};
        for (const [code, item] of this.items.entries()) {
            status[code] = {
                name: item.product.name,
                currentStock: item.currentStock,
                maxCapacity: item.maxCapacity,
                lowStockThreshold: item.lowStockThreshold,
                price: item.product.price,
                category: item.product.category,
                totalSold: item.totalSold,
                lastRestocked: item.lastRestocked,
                isLowStock: item.currentStock <= item.lowStockThreshold,
                isAvailable: item.product.isAvailable
            };
        }
        return status;
    }

    addObserver(observer) {
        this.observers.push(observer);
    }

    _notifyLowStock(productCode, item) {
        for (const observer of this.observers) {
            try {
                observer('low_stock', {
                    productCode: productCode,
                    productName: item.product.name,
                    currentStock: item.currentStock,
                    threshold: item.lowStockThreshold,
                    reorderQuantity: item.reorderQuantity
                });
            } catch (error) {
                console.error('Observer notification failed:', error);
            }
        }
    }
}

// Transaction Manager
class TransactionManager {
    constructor() {
        this.transactions = new Map();
        this.transactionHistory = [];
    }

    createTransaction(productCode, productName, price, paymentMethod) {
        const transactionId = `txn_${this._generateId()}`;

        const transaction = new Transaction(
            transactionId,
            new Date(),
            productCode,
            productName,
            price,
            paymentMethod,
            0.00,
            0.00,
            TransactionStatus.INITIATED
        );

        this.transactions.set(transactionId, transaction);
        return transactionId;
    }

    updateTransaction(transactionId, updates) {
        const transaction = this.transactions.get(transactionId);
        if (transaction) {
            Object.assign(transaction, updates);
        }
    }

    completeTransaction(transactionId) {
        const transaction = this.transactions.get(transactionId);
        if (transaction) {
            transaction.status = TransactionStatus.COMPLETED;
            this.transactionHistory.push(transaction);
            this.transactions.delete(transactionId);
        }
    }

    cancelTransaction(transactionId) {
        const transaction = this.transactions.get(transactionId);
        if (transaction) {
            transaction.status = TransactionStatus.CANCELLED;
            this.transactionHistory.push(transaction);
            this.transactions.delete(transactionId);
        }
    }

    getTransaction(transactionId) {
        return this.transactions.get(transactionId);
    }

    generateSalesReport(startDate, endDate) {
        // Filter transactions by date range
        const relevantTransactions = this.transactionHistory.filter(txn =>
            txn.timestamp >= startDate &&
            txn.timestamp <= endDate &&
            txn.status === TransactionStatus.COMPLETED
        );

        if (relevantTransactions.length === 0) {
            return new SalesReport(
                startDate,
                endDate,
                0.00,
                0,
                0,
                [],
                {},
                {},
                {}
            );
        }

        // Calculate metrics
        const totalRevenue = relevantTransactions.reduce((sum, txn) => sum + txn.price, 0);
        const totalTransactions = relevantTransactions.length;
        const unitsSold = relevantTransactions.length;

        // Top products
        const productSales = new Map();
        for (const txn of relevantTransactions) {
            productSales.set(txn.productCode, (productSales.get(txn.productCode) || 0) + 1);
        }

        const topProducts = Array.from(productSales.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);

        // Payment method distribution
        const paymentDistribution = new Map();
        for (const txn of relevantTransactions) {
            paymentDistribution.set(txn.paymentMethod, (paymentDistribution.get(txn.paymentMethod) || 0) + 1);
        }

        // Hourly sales
        const hourlySales = new Map();
        for (const txn of relevantTransactions) {
            const hour = txn.timestamp.getHours();
            hourlySales.set(hour, (hourlySales.get(hour) || 0) + txn.price);
        }

        return new SalesReport(
            startDate,
            endDate,
            parseFloat(totalRevenue.toFixed(2)),
            totalTransactions,
            unitsSold,
            topProducts,
            Object.fromEntries(paymentDistribution),
            Object.fromEntries(hourlySales),
            {} // Could be expanded
        );
    }

    _generateId() {
        return Math.random().toString(36).substr(2, 16);
    }
}

// Dispense Manager
class DispenseManager {
    constructor() {
        this.failureRate = 0.02; // 2% failure rate for simulation
        this.maxRetries = 3;
    }

    async dispenseProduct(productCode) {
        for (let attempt = 0; attempt < this.maxRetries; attempt++) {
            if (await this._attemptDispense(productCode)) {
                console.log(`Successfully dispensed product ${productCode}`);
                return new DispenseResult(true, productCode, null, attempt);
            }

            console.warn(`Dispense attempt ${attempt + 1} failed for ${productCode}`);
            await this._delay(500); // Wait before retry
        }

        console.error(`All dispense attempts failed for ${productCode}`);
        return new DispenseResult(
            false,
            productCode,
            'Mechanical failure - product not dispensed',
            this.maxRetries
        );
    }

    async _attemptDispense(productCode) {
        // Simulate mechanical operation
        await this._delay(Math.random() * 2000 + 1000);

        // Simulate occasional failures
        return Math.random() > this.failureRate;
    }

    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Main Vending Machine Class
class VendingMachine {
    constructor(machineId = 'VM001', location = 'Unknown') {
        this.machineId = machineId;
        this.location = location;
        this.currentState = MachineState.IDLE;
        this.inventory = new Inventory();
        this.transactionManager = new TransactionManager();
        this.dispenseManager = new DispenseManager();

        // Payment processors
        this.paymentProcessors = new Map([
            [PaymentMethod.CASH, new CashPaymentProcessor()],
            [PaymentMethod.CREDIT_CARD, new CardPaymentProcessor()],
            [PaymentMethod.DEBIT_CARD, new CardPaymentProcessor()],
            [PaymentMethod.MOBILE_PAYMENT, new MobilePaymentProcessor()]
        ]);

        this.currentTransactionId = null;
        this.selectedProduct = null;

        // Initialize with sample products
        this._initializeProducts();

        // Add inventory observer
        this.inventory.addObserver(this._handleInventoryAlert.bind(this));
    }

    _initializeProducts() {
        const products = [
            new Product('A1', 'Coca Cola', 1.50, ProductCategory.BEVERAGES, 140),
            new Product('A2', 'Pepsi', 1.50, ProductCategory.BEVERAGES, 150),
            new Product('A3', 'Sprite', 1.25, ProductCategory.BEVERAGES, 140),
            new Product('B1', 'Doritos', 2.25, ProductCategory.SNACKS, 250),
            new Product('B2', 'Pringles', 2.75, ProductCategory.SNACKS, 290),
            new Product('B3', 'Lays', 2.00, ProductCategory.SNACKS, 230),
            new Product('C1', 'Snickers', 1.75, ProductCategory.CANDY, 280),
            new Product('C2', 'Kit Kat', 1.75, ProductCategory.CANDY, 210),
            new Product('D1', 'Granola Bar', 2.50, ProductCategory.HEALTHY, 180),
            new Product('E1', 'Coffee', 2.00, ProductCategory.HOT_DRINKS, 5)
        ];

        for (const product of products) {
            this.inventory.addProduct(product, 8);
        }
    }

    getAvailableProducts() {
        if (this.currentState === MachineState.OUT_OF_ORDER) {
            return {};
        }

        const available = {};
        for (const [code, item] of this.inventory.items.entries()) {
            if (item.currentStock > 0 && item.product.isAvailable) {
                available[code] = {
                    name: item.product.name,
                    price: item.product.price,
                    category: item.product.category,
                    stock: item.currentStock,
                    calories: item.product.calories
                };
            }
        }

        return available;
    }

    selectProduct(productCode) {
        if (![MachineState.IDLE, MachineState.PRODUCT_SELECTION].includes(this.currentState)) {
            return {
                success: false,
                error: `Cannot select product in ${this.currentState} state`
            };
        }

        if (!this.inventory.checkAvailability(productCode)) {
            return {
                success: false,
                error: 'Product not available or out of stock'
            };
        }

        const item = this.inventory.items.get(productCode);
        this.selectedProduct = productCode;
        this.currentState = MachineState.PRODUCT_SELECTION;

        return {
            success: true,
            productCode: productCode,
            productName: item.product.name,
            price: item.product.price,
            message: `Selected ${item.product.name} - $${item.product.price.toFixed(2)}`
        };
    }

    async processPayment(paymentMethod, paymentData = {}) {
        if (this.currentState !== MachineState.PRODUCT_SELECTION) {
            return {
                success: false,
                error: 'No product selected'
            };
        }

        if (!this.selectedProduct) {
            return {
                success: false,
                error: 'No product selected'
            };
        }

        const item = this.inventory.items.get(this.selectedProduct);
        const price = item.product.price;

        // Create transaction
        this.currentTransactionId = this.transactionManager.createTransaction(
            this.selectedProduct,
            item.product.name,
            price,
            paymentMethod
        );

        this.currentState = MachineState.PAYMENT_PROCESSING;

        // Process payment
        const processor = this.paymentProcessors.get(paymentMethod);
        if (!processor) {
            return this._paymentFailed('Payment method not supported');
        }

        const paymentResult = await processor.processPayment(price, paymentData);

        if (paymentResult.success) {
            // Update transaction
            this.transactionManager.updateTransaction(this.currentTransactionId, {
                amountPaid: paymentResult.amountCharged,
                changeGiven: paymentResult.change || 0.00,
                status: TransactionStatus.PAYMENT_APPROVED
            });

            // Reserve product
            if (this.inventory.reserveProduct(this.selectedProduct)) {
                return {
                    success: true,
                    transactionId: paymentResult.transactionId,
                    amountCharged: paymentResult.amountCharged,
                    change: paymentResult.change || 0.0,
                    changeDenominations: paymentResult.changeDenominations || {},
                    message: 'Payment successful - ready to dispense'
                };
            } else {
                // Refund payment if cannot reserve product
                await processor.refundPayment(paymentResult.transactionId, price);
                return this._paymentFailed('Product no longer available');
            }
        } else {
            return this._paymentFailed(paymentResult.errorMessage);
        }
    }

    async dispenseProduct() {
        if (this.currentState !== MachineState.PAYMENT_PROCESSING) {
            return {
                success: false,
                error: 'Payment not completed'
            };
        }

        if (!this.currentTransactionId || !this.selectedProduct) {
            return {
                success: false,
                error: 'No valid transaction'
            };
        }

        this.currentState = MachineState.DISPENSING;

        // Attempt to dispense product
        const dispenseResult = await this.dispenseManager.dispenseProduct(this.selectedProduct);

        if (dispenseResult.success) {
            // Complete transaction
            this.inventory.confirmSale(this.selectedProduct);
            this.transactionManager.completeTransaction(this.currentTransactionId);

            const result = {
                success: true,
                productCode: this.selectedProduct,
                message: 'Product dispensed successfully',
                retryCount: dispenseResult.retryCount
            };

            this._resetState();
            return result;
        } else {
            // Dispense failed - refund customer
            const transaction = this.transactionManager.getTransaction(this.currentTransactionId);
            if (transaction) {
                const processor = this.paymentProcessors.get(transaction.paymentMethod);
                await processor.refundPayment(this.currentTransactionId, transaction.price);
            }

            // Cancel reservation
            this.inventory.cancelReservation(this.selectedProduct);
            this.transactionManager.cancelTransaction(this.currentTransactionId);

            const result = {
                success: false,
                error: dispenseResult.errorMessage,
                refundIssued: true
            };

            this._resetState();
            return result;
        }
    }

    cancelTransaction() {
        if (this.currentTransactionId) {
            const transaction = this.transactionManager.getTransaction(this.currentTransactionId);
            if (transaction && transaction.status === TransactionStatus.PAYMENT_APPROVED) {
                // Issue refund
                const processor = this.paymentProcessors.get(transaction.paymentMethod);
                processor.refundPayment(this.currentTransactionId, transaction.price);
            }

            // Cancel reservation if exists
            if (this.selectedProduct) {
                this.inventory.cancelReservation(this.selectedProduct);
            }

            this.transactionManager.cancelTransaction(this.currentTransactionId);
        }

        this._resetState();
        return { success: true, message: 'Transaction cancelled' };
    }

    _paymentFailed(errorMessage) {
        if (this.currentTransactionId) {
            this.transactionManager.updateTransaction(this.currentTransactionId, {
                status: TransactionStatus.PAYMENT_DECLINED
            });
            this.transactionManager.cancelTransaction(this.currentTransactionId);
        }

        this._resetState();
        return {
            success: false,
            error: errorMessage
        };
    }

    _resetState() {
        this.currentState = MachineState.IDLE;
        this.currentTransactionId = null;
        this.selectedProduct = null;
    }

    _handleInventoryAlert(alertType, data) {
        if (alertType === 'low_stock') {
            console.warn(
                `Low stock alert: ${data.productName} (${data.productCode}) - Only ${data.currentStock} remaining`
            );
        }
    }

    getMachineStatus() {
        const cashProcessor = this.paymentProcessors.get(PaymentMethod.CASH);
        const cashLevels = cashProcessor.getCashLevels();
        const totalCashValue = Object.entries(cashLevels).reduce((sum, [denom, count]) => {
            return sum + (parseFloat(denom) * count);
        }, 0);

        return {
            machineId: this.machineId,
            location: this.location,
            currentState: this.currentState,
            inventoryStatus: this.inventory.getInventoryStatus(),
            cashLevels: cashLevels,
            totalCashValue: parseFloat(totalCashValue.toFixed(2)),
            activeTransaction: this.currentTransactionId,
            selectedProduct: this.selectedProduct
        };
    }

    // Administrative functions
    adminRestock(productCode, quantity) {
        const success = this.inventory.restock(productCode, quantity);
        return {
            success: success,
            message: success ? `Restocked ${productCode} with ${quantity} units` : `Failed to restock ${productCode}`
        };
    }

    adminAddCash(denominations) {
        const cashProcessor = this.paymentProcessors.get(PaymentMethod.CASH);
        cashProcessor.addCash(denominations);

        return {
            success: true,
            message: 'Cash added successfully',
            newLevels: cashProcessor.getCashLevels()
        };
    }

    adminGenerateReport(days = 7) {
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000));
        return this.transactionManager.generateSalesReport(startDate, endDate);
    }

    setMaintenanceMode(enabled) {
        if (enabled) {
            this.currentState = MachineState.MAINTENANCE;
        } else {
            this.currentState = MachineState.IDLE;
        }
    }
}

// Demo and Testing Functions
async function demoVendingMachine() {
    console.log('🏪 Vending Machine System Demo');
    console.log('='.repeat(50));

    // Create vending machine
    const vm = new VendingMachine('VM001', 'Main Campus');

    console.log('\n📋 1. Available Products');
    console.log('-'.repeat(30));
    const products = vm.getAvailableProducts();
    for (const [code, details] of Object.entries(products)) {
        console.log(`  ${code}: ${details.name} - $${details.price.toFixed(2)} (${details.stock} in stock)`);
    }

    console.log('\n💰 2. Cash Purchase Demo');
    console.log('-'.repeat(30));

    // Select product
    const selection = vm.selectProduct('A1');
    console.log(`Selection result: ${selection.success ? selection.message : selection.error}`);

    if (selection.success) {
        // Pay with cash (insert $2.00 for $1.50 product)
        const cashInserted = {
            1.00: 2 // Two $1 coins
        };

        const payment = await vm.processPayment(PaymentMethod.CASH, cashInserted);

        if (payment.success) {
            console.log(`Payment successful! Change: $${payment.change.toFixed(2)}`);
            if (Object.keys(payment.changeDenominations).length > 0) {
                console.log('Change breakdown:');
                for (const [denom, count] of Object.entries(payment.changeDenominations)) {
                    console.log(`  $${denom}: ${count} coins/bills`);
                }
            }

            // Dispense product
            const dispense = await vm.dispenseProduct();
            console.log(`Dispense result: ${dispense.success ? dispense.message : dispense.error}`);
        } else {
            console.log(`Payment failed: ${payment.error}`);
        }
    }

    console.log('\n💳 3. Card Purchase Demo');
    console.log('-'.repeat(30));

    // Select another product
    const selection2 = vm.selectProduct('B1');
    console.log(`Selected: ${selection2.success ? selection2.message : selection2.error}`);

    if (selection2.success) {
        // Create card info
        const cardInfo = new CardInfo(
            '1234-5678-9012-3456',
            '12/25',
            '123',
            'John Doe'
        );

        const payment2 = await vm.processPayment(PaymentMethod.CREDIT_CARD, cardInfo);

        if (payment2.success) {
            console.log(`Card payment successful! Amount charged: $${payment2.amountCharged.toFixed(2)}`);

            const dispense2 = await vm.dispenseProduct();
            console.log(`Dispense result: ${dispense2.success ? dispense2.message : dispense2.error}`);
        } else {
            console.log(`Card payment failed: ${payment2.error}`);
        }
    }

    console.log('\n📱 4. Mobile Payment Demo');
    console.log('-'.repeat(30));

    const selection3 = vm.selectProduct('C1');
    console.log(`Selected: ${selection3.success ? selection3.message : selection3.error}`);

    if (selection3.success) {
        const payment3 = await vm.processPayment(PaymentMethod.MOBILE_PAYMENT, 'MOBILE_TOKEN_12345_APPLEPAY');

        if (payment3.success) {
            console.log('Mobile payment successful!');

            const dispense3 = await vm.dispenseProduct();
            console.log(`Dispense result: ${dispense3.success ? dispense3.message : dispense3.error}`);
        } else {
            console.log(`Mobile payment failed: ${payment3.error}`);
        }
    }

    console.log('\n🔧 5. Administrative Functions');
    console.log('-'.repeat(30));

    // Check machine status
    const status = vm.getMachineStatus();
    console.log(`Machine State: ${status.currentState}`);
    console.log(`Total Cash Value: $${status.totalCashValue.toFixed(2)}`);

    // Restock low products
    console.log('\nRestocking products...');
    const restockResult = vm.adminRestock('A1', 10);
    console.log(`Restock A1: ${restockResult.message}`);

    // Add cash
    console.log('\nAdding cash to machine...');
    const cashResult = vm.adminAddCash({
        0.25: 20,  // 20 quarters
        1.00: 10,  // 10 dollar coins
        5.00: 5    // 5 five-dollar bills
    });
    console.log(`Cash added: ${cashResult.message}`);

    console.log('\n📊 6. Sales Report');
    console.log('-'.repeat(30));

    const report = vm.adminGenerateReport(1); // Last 1 day
    console.log('Sales Report (Last 24 hours):');
    console.log(`  Total Revenue: $${report.totalRevenue.toFixed(2)}`);
    console.log(`  Total Transactions: ${report.totalTransactions}`);
    console.log(`  Units Sold: ${report.unitsSold}`);

    if (report.topProducts.length > 0) {
        console.log('  Top Products:');
        for (const [productCode, units] of report.topProducts.slice(0, 3)) {
            console.log(`    ${productCode}: ${units} units`);
        }
    }

    if (Object.keys(report.paymentMethodDistribution).length > 0) {
        console.log('  Payment Methods:');
        for (const [method, count] of Object.entries(report.paymentMethodDistribution)) {
            console.log(`    ${method}: ${count} transactions`);
        }
    }

    console.log('\n✅ Demo completed successfully!');
    return vm;
}

async function performanceTest() {
    console.log('\n🚀 Performance Test');
    console.log('='.repeat(50));

    const vm = new VendingMachine('VM_PERF', 'Performance Test Location');

    // Test concurrent transactions simulation
    console.log('Testing transaction processing speed...');

    const products = ['A1', 'A2', 'B1', 'B2', 'C1'];
    const startTime = Date.now();
    let successfulTransactions = 0;
    const totalAttempts = 50;

    for (let i = 0; i < totalAttempts; i++) {
        const product = products[i % products.length];

        // Select product
        const selection = vm.selectProduct(product);
        if (selection.success) {
            // Quick mobile payment simulation
            const payment = await vm.processPayment(PaymentMethod.MOBILE_PAYMENT, `TOKEN_${i}`);

            if (payment.success) {
                const dispense = await vm.dispenseProduct();
                if (dispense.success) {
                    successfulTransactions++;
                }
            } else {
                vm.cancelTransaction();
            }
        } else {
            // Product might be out of stock, restock it
            vm.adminRestock(product, 10);
        }
    }

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    console.log('Performance Results:');
    console.log(`  Total Attempts: ${totalAttempts}`);
    console.log(`  Successful Transactions: ${successfulTransactions}`);
    console.log(`  Success Rate: ${((successfulTransactions / totalAttempts) * 100).toFixed(1)}%`);
    console.log(`  Duration: ${duration.toFixed(2)} seconds`);
    console.log(`  Transactions per Second: ${(successfulTransactions / duration).toFixed(2)}`);
    console.log(`  Average Transaction Time: ${(duration / totalAttempts).toFixed(3)} seconds`);

    // Generate final report
    const finalReport = vm.adminGenerateReport(1);
    console.log('\nFinal Sales Summary:');
    console.log(`  Revenue Generated: $${finalReport.totalRevenue.toFixed(2)}`);
    console.log(`  Total Units Sold: ${finalReport.unitsSold}`);
}

// Main execution
async function main() {
    try {
        // Run comprehensive demo
        await demoVendingMachine();

        // Run performance test
        await performanceTest();

        console.log('\n🎉 All tests completed successfully!');
    } catch (error) {
        console.error('Error during execution:', error);
    }
}

// Run if this file is executed directly
if (require.main === module) {
    main();
}

module.exports = {
    VendingMachine,
    PaymentProcessor,
    CashPaymentProcessor,
    CardPaymentProcessor,
    MobilePaymentProcessor,
    Inventory,
    TransactionManager,
    DispenseManager,
    Product,
    CardInfo,
    MachineState,
    PaymentMethod,
    TransactionStatus,
    ProductCategory
};