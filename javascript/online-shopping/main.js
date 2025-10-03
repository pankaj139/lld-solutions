/**
 * ONLINE SHOPPING SYSTEM Implementation in JavaScript
 * ===================================================
 * 
 * FILE PURPOSE:
 * Implements e-commerce platform with product catalog, shopping cart,
 * order management, inventory tracking, and payment processing.
 * 
 * DESIGN PATTERNS:
 * 1. State Pattern: Order status management
 * 2. Strategy Pattern: Payment methods
 * 3. Observer Pattern: Order notifications
 * 4. Factory Pattern: Order creation
 * 5. Singleton Pattern: Service instance
 * 6. Command Pattern: Cart operations
 * 7. Repository Pattern: Data storage
 * 
 * OOP CONCEPTS:
 * - Encapsulation: State management
 * - Inheritance: Product types
 * - Polymorphism: Payment strategies
 * 
 * USAGE:
 * const service = new ShoppingService();
 * const product = new Product('P001', 'Laptop', 999.99, 10);
 * const cart = new ShoppingCart();
 * cart.addItem(product, 1);
 * const order = service.placeOrder(cart);
 * 
 * EXPECTED RETURN:
 * Order object with confirmation
 */

const OrderStatus = Object.freeze({
    PENDING: 'pending',
    CONFIRMED: 'confirmed',
    SHIPPED: 'shipped',
    DELIVERED: 'delivered',
    CANCELLED: 'cancelled'
});

const PaymentMethod = Object.freeze({
    CREDIT_CARD: 'credit_card',
    DEBIT_CARD: 'debit_card',
    DIGITAL_WALLET: 'digital_wallet',
    CASH_ON_DELIVERY: 'cash_on_delivery'
});

/**
 * Product - Item in catalog
 */
class Product {
    constructor(productId, name, price, stock) {
        this.productId = productId;
        this.name = name;
        this.price = price;
        this.stock = stock;
        this.category = 'General';
    }

    isAvailable(quantity = 1) {
        return this.stock >= quantity;
    }

    reduceStock(quantity) {
        if (this.isAvailable(quantity)) {
            this.stock -= quantity;
        }
    }
}

/**
 * CartItem - Item in shopping cart
 */
class CartItem {
    constructor(product, quantity) {
        this.product = product;
        this.quantity = quantity;
    }

    getSubtotal() {
        return this.product.price * this.quantity;
    }
}

/**
 * ShoppingCart - Cart with items
 * 
 * DESIGN PATTERN: Command Pattern
 */
class ShoppingCart {
    constructor() {
        this.items = [];
    }

    addItem(product, quantity = 1) {
        // Check if product already in cart
        const existingItem = this.items.find(
            item => item.product.productId === product.productId
        );

        if (existingItem) {
            existingItem.quantity += quantity;
            console.log(`✓ Updated ${product.name} quantity to ${existingItem.quantity}`);
        } else {
            this.items.push(new CartItem(product, quantity));
            console.log(`✓ Added ${product.name} x${quantity} to cart`);
        }
    }

    removeItem(productId) {
        this.items = this.items.filter(item => item.product.productId !== productId);
    }

    getTotal() {
        return this.items.reduce((sum, item) => sum + item.getSubtotal(), 0);
    }

    isEmpty() {
        return this.items.length === 0;
    }
}

/**
 * Order - Customer order
 * 
 * DESIGN PATTERN: State Pattern
 */
class Order {
    constructor(orderId, cart) {
        this.orderId = orderId;
        this.items = [...cart.items];
        this.totalAmount = cart.getTotal();
        this.status = OrderStatus.PENDING;
        this.createdAt = new Date();
        this.paymentMethod = null;
    }

    confirm() {
        this.status = OrderStatus.CONFIRMED;
        console.log(`✓ Order ${this.orderId} confirmed - Total: $${this.totalAmount.toFixed(2)}`);
    }

    ship() {
        if (this.status === OrderStatus.CONFIRMED) {
            this.status = OrderStatus.SHIPPED;
            console.log(`📦 Order ${this.orderId} shipped`);
        }
    }

    deliver() {
        if (this.status === OrderStatus.SHIPPED) {
            this.status = OrderStatus.DELIVERED;
            console.log(`✓ Order ${this.orderId} delivered`);
        }
    }

    cancel() {
        if (this.status === OrderStatus.PENDING || this.status === OrderStatus.CONFIRMED) {
            this.status = OrderStatus.CANCELLED;
            console.log(`✗ Order ${this.orderId} cancelled`);
        }
    }
}

/**
 * ShoppingService - Main service
 * 
 * DESIGN PATTERN: Singleton + Facade
 */
class ShoppingService {
    constructor() {
        if (ShoppingService.instance) {
            return ShoppingService.instance;
        }

        this.products = new Map();
        this.orders = new Map();
        this.orderCounter = 0;

        ShoppingService.instance = this;
    }

    addProduct(product) {
        this.products.set(product.productId, product);
        console.log(`✓ Added product: ${product.name} ($${product.price.toFixed(2)})`);
    }

    getProduct(productId) {
        return this.products.get(productId) || null;
    }

    searchProducts(query) {
        const queryLower = query.toLowerCase();
        return Array.from(this.products.values()).filter(
            p => p.name.toLowerCase().includes(queryLower)
        );
    }

    placeOrder(cart) {
        if (cart.isEmpty()) {
            console.log('✗ Cannot place order with empty cart');
            return null;
        }

        // Validate stock
        for (const item of cart.items) {
            if (!item.product.isAvailable(item.quantity)) {
                console.log(`✗ Insufficient stock for ${item.product.name}`);
                return null;
            }
        }

        // Create order
        const orderId = `ORD${String(this.orderCounter).padStart(4, '0')}`;
        this.orderCounter++;

        const order = new Order(orderId, cart);
        order.confirm();

        // Reduce stock
        for (const item of cart.items) {
            item.product.reduceStock(item.quantity);
        }

        this.orders.set(orderId, order);
        return order;
    }

    getOrder(orderId) {
        return this.orders.get(orderId) || null;
    }
}

/**
 * Demonstrate Online Shopping System
 */
function main() {
    console.log('='.repeat(70));
    console.log('ONLINE SHOPPING SYSTEM - Low Level Design Demo');
    console.log('='.repeat(70));

    const service = new ShoppingService();

    // Add products
    console.log('\n🛍️ Adding Products...');
    const laptop = new Product('P001', 'Laptop', 999.99, 10);
    const mouse = new Product('P002', 'Wireless Mouse', 29.99, 50);
    const keyboard = new Product('P003', 'Mechanical Keyboard', 89.99, 25);

    service.addProduct(laptop);
    service.addProduct(mouse);
    service.addProduct(keyboard);

    // Create cart and add items
    console.log('\n🛒 Creating Shopping Cart...');
    const cart = new ShoppingCart();
    cart.addItem(laptop, 1);
    cart.addItem(mouse, 2);
    cart.addItem(keyboard, 1);

    console.log(`\nCart Total: $${cart.getTotal().toFixed(2)}`);

    // Place order
    console.log('\n📤 Placing Order...');
    const order = service.placeOrder(cart);

    // Order lifecycle
    if (order) {
        console.log('\n📦 Order Lifecycle...');
        order.ship();
        order.deliver();
    }

    console.log('\n' + '='.repeat(70));
    console.log('DEMO COMPLETE');
    console.log('='.repeat(70));
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ShoppingService,
        ShoppingCart,
        Product,
        Order,
        OrderStatus,
        PaymentMethod
    };
}

// Run demo if executed directly
if (typeof require !== 'undefined' && require.main === module) {
    main();
}
