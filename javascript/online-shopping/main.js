// Online Shopping System - JavaScript Implementation
// E-commerce platform with multi-vendor support, shopping cart, and payment processing

// Enums
const UserRole = {
    CUSTOMER: 'CUSTOMER',
    SELLER: 'SELLER',
    ADMIN: 'ADMIN'
};

const OrderStatus = {
    PENDING: 'PENDING',
    CONFIRMED: 'CONFIRMED',
    SHIPPED: 'SHIPPED',
    DELIVERED: 'DELIVERED',
    CANCELLED: 'CANCELLED'
};

const PaymentMethod = {
    CREDIT_CARD: 'CREDIT_CARD',
    PAYPAL: 'PAYPAL',
    DIGITAL_WALLET: 'DIGITAL_WALLET',
    CASH_ON_DELIVERY: 'CASH_ON_DELIVERY'
};

const PaymentStatus = {
    PENDING: 'PENDING',
    COMPLETED: 'COMPLETED',
    FAILED: 'FAILED',
    REFUNDED: 'REFUNDED'
};

// Utility function for UUID generation
function generateUUID() {
    return 'xxxx-xxxx-4xxx-yxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// User Management
class User {
    constructor(userId, name, email, role) {
        this.userId = userId;
        this.name = name;
        this.email = email;
        this.role = role;
        this.addresses = [];
        this.createdAt = new Date();
    }

    addAddress(address) {
        this.addresses.push(address);
    }
}

class Address {
    constructor(street, city, state, zipCode, country) {
        this.street = street;
        this.city = city;
        this.state = state;
        this.zipCode = zipCode;
        this.country = country;
    }

    toString() {
        return `${this.street}, ${this.city}, ${this.state} ${this.zipCode}, ${this.country}`;
    }
}

// Product Management
class Product {
    constructor(productId, name, description, price, sellerId, categoryId) {
        this.productId = productId;
        this.name = name;
        this.description = description;
        this.price = price;
        this.sellerId = sellerId;
        this.categoryId = categoryId;
        this.stockQuantity = 0;
        this.reviews = [];
        this.averageRating = 0.0;
        this.createdAt = new Date();
    }

    updateStock(quantity) {
        this.stockQuantity += quantity;
        if (this.stockQuantity < 0) {
            this.stockQuantity = 0;
        }
    }

    addReview(review) {
        this.reviews.push(review);
        this.updateAverageRating();
    }

    updateAverageRating() {
        if (this.reviews.length === 0) {
            this.averageRating = 0.0;
            return;
        }
        
        const sum = this.reviews.reduce((acc, review) => acc + review.rating, 0);
        this.averageRating = sum / this.reviews.length;
    }

    isAvailable(quantity) {
        return this.stockQuantity >= quantity;
    }
}

class Review {
    constructor(reviewId, userId, productId, rating, comment) {
        this.reviewId = reviewId;
        this.userId = userId;
        this.productId = productId;
        this.rating = rating;
        this.comment = comment;
        this.createdAt = new Date();
    }
}

class Category {
    constructor(categoryId, name, description) {
        this.categoryId = categoryId;
        this.name = name;
        this.description = description;
    }
}

// Shopping Cart
class CartItem {
    constructor(productId, quantity, price) {
        this.productId = productId;
        this.quantity = quantity;
        this.price = price;
    }

    getTotalPrice() {
        return this.quantity * this.price;
    }
}

class ShoppingCart {
    constructor(userId) {
        this.userId = userId;
        this.items = new Map();
        this.lastUpdated = new Date();
    }

    addItem(productId, quantity, price) {
        if (this.items.has(productId)) {
            const existingItem = this.items.get(productId);
            existingItem.quantity += quantity;
        } else {
            this.items.set(productId, new CartItem(productId, quantity, price));
        }
        this.lastUpdated = new Date();
    }

    removeItem(productId) {
        this.items.delete(productId);
        this.lastUpdated = new Date();
    }

    updateQuantity(productId, quantity) {
        if (this.items.has(productId)) {
            if (quantity <= 0) {
                this.removeItem(productId);
            } else {
                this.items.get(productId).quantity = quantity;
                this.lastUpdated = new Date();
            }
        }
    }

    getTotalAmount() {
        let total = 0;
        for (const item of this.items.values()) {
            total += item.getTotalPrice();
        }
        return total;
    }

    clear() {
        this.items.clear();
        this.lastUpdated = new Date();
    }

    isEmpty() {
        return this.items.size === 0;
    }
}

// Order Management
class OrderItem {
    constructor(productId, quantity, price, sellerId) {
        this.productId = productId;
        this.quantity = quantity;
        this.price = price;
        this.sellerId = sellerId;
    }

    getTotalPrice() {
        return this.quantity * this.price;
    }
}

class Order {
    constructor(orderId, customerId, shippingAddress) {
        this.orderId = orderId;
        this.customerId = customerId;
        this.items = [];
        this.status = OrderStatus.PENDING;
        this.totalAmount = 0.0;
        this.shippingAddress = shippingAddress;
        this.orderDate = new Date();
        this.deliveryDate = null;
        this.trackingNumber = null;
    }

    addItem(orderItem) {
        this.items.push(orderItem);
        this.calculateTotal();
    }

    calculateTotal() {
        this.totalAmount = this.items.reduce((total, item) => total + item.getTotalPrice(), 0);
    }

    updateStatus(status) {
        this.status = status;
        if (status === OrderStatus.DELIVERED) {
            this.deliveryDate = new Date();
        }
    }

    setTrackingNumber(trackingNumber) {
        this.trackingNumber = trackingNumber;
    }
}

// Payment Processing
class Payment {
    constructor(paymentId, orderId, amount, method) {
        this.paymentId = paymentId;
        this.orderId = orderId;
        this.amount = amount;
        this.method = method;
        this.status = PaymentStatus.PENDING;
        this.transactionId = null;
        this.paymentDate = new Date();
    }

    markCompleted(transactionId) {
        this.status = PaymentStatus.COMPLETED;
        this.transactionId = transactionId;
    }

    markFailed() {
        this.status = PaymentStatus.FAILED;
    }

    markRefunded() {
        this.status = PaymentStatus.REFUNDED;
    }
}

// Payment Strategy Pattern
class PaymentStrategy {
    processPayment(amount, details) {
        throw new Error("Method must be implemented");
    }
}

class CreditCardPayment extends PaymentStrategy {
    processPayment(amount, details) {
        console.log(`Processing credit card payment of $${amount.toFixed(2)}`);
        console.log(`Card Number: ${details.cardNumber.slice(-4).padStart(details.cardNumber.length, '*')}`);
        // Simulate payment processing
        return Math.random() > 0.1; // 90% success rate
    }
}

class PayPalPayment extends PaymentStrategy {
    processPayment(amount, details) {
        console.log(`Processing PayPal payment of $${amount.toFixed(2)}`);
        console.log(`PayPal Email: ${details.email}`);
        return Math.random() > 0.05; // 95% success rate
    }
}

class DigitalWalletPayment extends PaymentStrategy {
    processPayment(amount, details) {
        console.log(`Processing digital wallet payment of $${amount.toFixed(2)}`);
        console.log(`Wallet ID: ${details.walletId}`);
        return Math.random() > 0.02; // 98% success rate
    }
}

class CashOnDeliveryPayment extends PaymentStrategy {
    processPayment(amount, details) {
        console.log(`Cash on delivery set for $${amount.toFixed(2)}`);
        console.log(`Address: ${details.address}`);
        return true; // Always successful for COD
    }
}

// Payment Context
class PaymentProcessor {
    constructor() {
        this.strategies = new Map([
            [PaymentMethod.CREDIT_CARD, new CreditCardPayment()],
            [PaymentMethod.PAYPAL, new PayPalPayment()],
            [PaymentMethod.DIGITAL_WALLET, new DigitalWalletPayment()],
            [PaymentMethod.CASH_ON_DELIVERY, new CashOnDeliveryPayment()]
        ]);
    }

    processPayment(method, amount, details) {
        const strategy = this.strategies.get(method);
        if (!strategy) {
            throw new Error(`Unsupported payment method: ${method}`);
        }
        return strategy.processPayment(amount, details);
    }
}

// Notification System (Observer Pattern)
class NotificationObserver {
    update(event, data) {
        throw new Error("Method must be implemented");
    }
}

class EmailNotification extends NotificationObserver {
    update(event, data) {
        console.log(`📧 Email: ${event} - ${JSON.stringify(data)}`);
    }
}

class SMSNotification extends NotificationObserver {
    update(event, data) {
        console.log(`📱 SMS: ${event} - Order ${data.orderId || 'N/A'}`);
    }
}

class PushNotification extends NotificationObserver {
    update(event, data) {
        console.log(`🔔 Push: ${event} - ${data.message || 'Update available'}`);
    }
}

// Main Shopping System
class OnlineShoppingSystem {
    constructor(name) {
        this.name = name;
        this.users = new Map();
        this.products = new Map();
        this.categories = new Map();
        this.orders = new Map();
        this.carts = new Map();
        this.payments = new Map();
        this.paymentProcessor = new PaymentProcessor();
        this.observers = [];
        
        this.initializeCategories();
    }

    // Observer Pattern Methods
    addObserver(observer) {
        this.observers.push(observer);
    }

    removeObserver(observer) {
        const index = this.observers.indexOf(observer);
        if (index > -1) {
            this.observers.splice(index, 1);
        }
    }

    notifyObservers(event, data) {
        this.observers.forEach(observer => observer.update(event, data));
    }

    initializeCategories() {
        const categories = [
            new Category("CAT001", "Electronics", "Electronic devices and gadgets"),
            new Category("CAT002", "Clothing", "Fashion and apparel"),
            new Category("CAT003", "Books", "Books and literature"),
            new Category("CAT004", "Home & Garden", "Home improvement and gardening"),
            new Category("CAT005", "Sports", "Sports and outdoor equipment")
        ];

        categories.forEach(category => {
            this.categories.set(category.categoryId, category);
        });
    }

    // User Management
    registerUser(name, email, role = UserRole.CUSTOMER) {
        const userId = generateUUID();
        const user = new User(userId, name, email, role);
        this.users.set(userId, user);
        
        // Create empty cart for customer
        if (role === UserRole.CUSTOMER) {
            this.carts.set(userId, new ShoppingCart(userId));
        }
        
        this.notifyObservers("USER_REGISTERED", { userId, name, email });
        return user;
    }

    getUser(userId) {
        return this.users.get(userId);
    }

    // Product Management
    addProduct(name, description, price, sellerId, categoryId, stockQuantity = 0) {
        const productId = generateUUID();
        const product = new Product(productId, name, description, price, sellerId, categoryId);
        product.stockQuantity = stockQuantity;
        this.products.set(productId, product);
        
        this.notifyObservers("PRODUCT_ADDED", { productId, name, sellerId });
        return product;
    }

    updateProductStock(productId, quantity) {
        const product = this.products.get(productId);
        if (product) {
            product.updateStock(quantity);
            this.notifyObservers("STOCK_UPDATED", { productId, newStock: product.stockQuantity });
            return true;
        }
        return false;
    }

    searchProducts(query, categoryId = null) {
        const results = [];
        for (const product of this.products.values()) {
            const matchesQuery = product.name.toLowerCase().includes(query.toLowerCase()) ||
                               product.description.toLowerCase().includes(query.toLowerCase());
            const matchesCategory = !categoryId || product.categoryId === categoryId;
            
            if (matchesQuery && matchesCategory) {
                results.push(product);
            }
        }
        return results;
    }

    // Shopping Cart Management
    addToCart(customerId, productId, quantity) {
        const cart = this.carts.get(customerId);
        const product = this.products.get(productId);
        
        if (!cart || !product) {
            return false;
        }

        if (!product.isAvailable(quantity)) {
            console.log(`Insufficient stock for product ${product.name}`);
            return false;
        }

        cart.addItem(productId, quantity, product.price);
        this.notifyObservers("ITEM_ADDED_TO_CART", { customerId, productId, quantity });
        return true;
    }

    removeFromCart(customerId, productId) {
        const cart = this.carts.get(customerId);
        if (cart) {
            cart.removeItem(productId);
            this.notifyObservers("ITEM_REMOVED_FROM_CART", { customerId, productId });
            return true;
        }
        return false;
    }

    getCart(customerId) {
        return this.carts.get(customerId);
    }

    // Order Management
    placeOrder(customerId, shippingAddress, paymentMethod, paymentDetails) {
        const cart = this.carts.get(customerId);
        if (!cart || cart.isEmpty()) {
            console.log("Cart is empty");
            return null;
        }

        // Validate stock availability
        for (const [productId, cartItem] of cart.items) {
            const product = this.products.get(productId);
            if (!product || !product.isAvailable(cartItem.quantity)) {
                console.log(`Product ${productId} is not available in required quantity`);
                return null;
            }
        }

        // Create order
        const orderId = generateUUID();
        const order = new Order(orderId, customerId, shippingAddress);

        // Add items to order and update stock
        for (const [productId, cartItem] of cart.items) {
            const product = this.products.get(productId);
            const orderItem = new OrderItem(productId, cartItem.quantity, cartItem.price, product.sellerId);
            order.addItem(orderItem);
            
            // Update stock
            product.updateStock(-cartItem.quantity);
        }

        // Process payment
        const paymentId = generateUUID();
        const payment = new Payment(paymentId, orderId, order.totalAmount, paymentMethod);
        
        const paymentSuccess = this.paymentProcessor.processPayment(paymentMethod, order.totalAmount, paymentDetails);
        
        if (paymentSuccess) {
            payment.markCompleted(generateUUID());
            order.updateStatus(OrderStatus.CONFIRMED);
            order.setTrackingNumber(`TRK${Date.now()}`);
            
            // Clear cart
            cart.clear();
            
            this.orders.set(orderId, order);
            this.payments.set(paymentId, payment);
            
            this.notifyObservers("ORDER_PLACED", { orderId, customerId, amount: order.totalAmount });
            return order;
        } else {
            payment.markFailed();
            this.payments.set(paymentId, payment);
            
            // Restore stock
            for (const item of order.items) {
                const product = this.products.get(item.productId);
                if (product) {
                    product.updateStock(item.quantity);
                }
            }
            
            this.notifyObservers("PAYMENT_FAILED", { orderId, customerId });
            return null;
        }
    }

    updateOrderStatus(orderId, status) {
        const order = this.orders.get(orderId);
        if (order) {
            order.updateStatus(status);
            this.notifyObservers("ORDER_STATUS_UPDATED", { orderId, status });
            return true;
        }
        return false;
    }

    getOrder(orderId) {
        return this.orders.get(orderId);
    }

    getCustomerOrders(customerId) {
        const orders = [];
        for (const order of this.orders.values()) {
            if (order.customerId === customerId) {
                orders.push(order);
            }
        }
        return orders;
    }

    // Review System
    addReview(userId, productId, rating, comment) {
        const product = this.products.get(productId);
        if (!product) {
            return false;
        }

        const reviewId = generateUUID();
        const review = new Review(reviewId, userId, productId, rating, comment);
        product.addReview(review);
        
        this.notifyObservers("REVIEW_ADDED", { productId, rating, userId });
        return review;
    }

    // Analytics and Reporting
    getSellerAnalytics(sellerId) {
        const analytics = {
            totalProducts: 0,
            totalOrders: 0,
            totalRevenue: 0.0,
            averageRating: 0.0,
            topProducts: []
        };

        // Count products
        for (const product of this.products.values()) {
            if (product.sellerId === sellerId) {
                analytics.totalProducts++;
            }
        }

        // Calculate orders and revenue
        const productSales = new Map();
        for (const order of this.orders.values()) {
            for (const item of order.items) {
                if (item.sellerId === sellerId) {
                    analytics.totalOrders++;
                    analytics.totalRevenue += item.getTotalPrice();
                    
                    const productId = item.productId;
                    productSales.set(productId, (productSales.get(productId) || 0) + item.quantity);
                }
            }
        }

        // Find top products
        const sortedProducts = Array.from(productSales.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
        
        analytics.topProducts = sortedProducts.map(([productId, quantity]) => ({
            productId,
            product: this.products.get(productId),
            quantitySold: quantity
        }));

        return analytics;
    }

    // System Statistics
    getSystemStats() {
        return {
            totalUsers: this.users.size,
            totalProducts: this.products.size,
            totalOrders: this.orders.size,
            totalRevenue: Array.from(this.orders.values())
                .reduce((total, order) => total + order.totalAmount, 0),
            activeCategories: this.categories.size
        };
    }
}

// Demo function
function runDemo() {
    console.log("=== Online Shopping System Demo ===\n");

    // Create shopping system
    const platform = new OnlineShoppingSystem("ShopEasy");

    // Add observers
    platform.addObserver(new EmailNotification());
    platform.addObserver(new SMSNotification());
    platform.addObserver(new PushNotification());

    // Register users
    console.log("1. Registering users...");
    const customer = platform.registerUser("John Doe", "john@example.com");
    const seller = platform.registerUser("TechStore Inc", "seller@techstore.com", UserRole.SELLER);
    console.log(`Customer: ${customer.name} (ID: ${customer.userId})`);
    console.log(`Seller: ${seller.name} (ID: ${seller.userId})\n`);

    // Add address
    const shippingAddress = new Address("123 Main St", "Anytown", "ST", "12345", "USA");
    customer.addAddress(shippingAddress);

    // Add products
    console.log("2. Adding products...");
    const laptop = platform.addProduct(
        "Gaming Laptop", 
        "High-performance gaming laptop", 
        1299.99, 
        seller.userId, 
        "CAT001", 
        10
    );
    const mouse = platform.addProduct(
        "Wireless Mouse", 
        "Ergonomic wireless mouse", 
        29.99, 
        seller.userId, 
        "CAT001", 
        50
    );
    console.log(`Added: ${laptop.name} - $${laptop.price}`);
    console.log(`Added: ${mouse.name} - $${mouse.price}\n`);

    // Search products
    console.log("3. Searching products...");
    const searchResults = platform.searchProducts("gaming");
    console.log(`Found ${searchResults.length} products matching 'gaming':`);
    searchResults.forEach(product => {
        console.log(`  - ${product.name}: $${product.price}`);
    });
    console.log();

    // Add to cart
    console.log("4. Adding items to cart...");
    platform.addToCart(customer.userId, laptop.productId, 1);
    platform.addToCart(customer.userId, mouse.productId, 2);
    
    const cart = platform.getCart(customer.userId);
    console.log(`Cart total: $${cart.getTotalAmount().toFixed(2)}\n`);

    // Place order
    console.log("5. Placing order...");
    const paymentDetails = {
        cardNumber: "1234567890123456",
        expiryDate: "12/25",
        cvv: "123"
    };
    
    const order = platform.placeOrder(
        customer.userId, 
        shippingAddress, 
        PaymentMethod.CREDIT_CARD, 
        paymentDetails
    );

    if (order) {
        console.log(`Order placed successfully!`);
        console.log(`Order ID: ${order.orderId}`);
        console.log(`Total: $${order.totalAmount.toFixed(2)}`);
        console.log(`Tracking: ${order.trackingNumber}\n`);

        // Update order status
        console.log("6. Updating order status...");
        platform.updateOrderStatus(order.orderId, OrderStatus.SHIPPED);
        platform.updateOrderStatus(order.orderId, OrderStatus.DELIVERED);
    }

    // Add review
    console.log("7. Adding product review...");
    platform.addReview(customer.userId, laptop.productId, 5, "Excellent gaming laptop!");
    console.log(`Review added for ${laptop.name}\n`);

    // Analytics
    console.log("8. Seller Analytics:");
    const analytics = platform.getSellerAnalytics(seller.userId);
    console.log(`Total Products: ${analytics.totalProducts}`);
    console.log(`Total Orders: ${analytics.totalOrders}`);
    console.log(`Total Revenue: $${analytics.totalRevenue.toFixed(2)}`);
    console.log("Top Products:");
    analytics.topProducts.forEach((item, index) => {
        console.log(`  ${index + 1}. ${item.product.name}: ${item.quantitySold} sold`);
    });
    console.log();

    // System stats
    console.log("9. System Statistics:");
    const stats = platform.getSystemStats();
    console.log(`Total Users: ${stats.totalUsers}`);
    console.log(`Total Products: ${stats.totalProducts}`);
    console.log(`Total Orders: ${stats.totalOrders}`);
    console.log(`Total Revenue: $${stats.totalRevenue.toFixed(2)}`);
    console.log(`Active Categories: ${stats.activeCategories}`);
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        OnlineShoppingSystem,
        User,
        Product,
        Order,
        ShoppingCart,
        UserRole,
        OrderStatus,
        PaymentMethod
    };
}

// Run demo if this file is executed directly
if (typeof require !== 'undefined' && require.main === module) {
    runDemo();
}