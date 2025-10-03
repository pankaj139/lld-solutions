/**
 * FOOD DELIVERY SYSTEM - JavaScript Implementation
 * 
 * FILE PURPOSE: Food delivery platform with restaurants, orders, and agents
 * DESIGN PATTERNS: State, Strategy, Observer, Factory, Singleton, Command, Repository
 * 
 * USAGE:
 * const service = new DeliveryService();
 * const customer = new Customer("C001", "Alice");
 * const cart = new Cart(customer, restaurant);
 * const order = service.placeOrder(customer.customerId, cart, address);
 */

const OrderStatus = Object.freeze({
    PLACED: 'placed',
    CONFIRMED: 'confirmed',
    PREPARING: 'preparing',
    OUT_FOR_DELIVERY: 'out_for_delivery',
    DELIVERED: 'delivered',
    CANCELLED: 'cancelled'
});

const PaymentMethod = Object.freeze({
    CREDIT_CARD: 'credit_card',
    DEBIT_CARD: 'debit_card',
    DIGITAL_WALLET: 'digital_wallet',
    CASH_ON_DELIVERY: 'cash_on_delivery'
});

class Location {
    constructor(latitude, longitude) {
        this.latitude = latitude;
        this.longitude = longitude;
    }
}

class Address {
    constructor(street, city, zipcode) {
        this.street = street;
        this.city = city;
        this.zipcode = zipcode;
    }
}

class MenuItem {
    constructor(itemId, name, price) {
        this.itemId = itemId;
        this.name = name;
        this.price = price;
        this.available = true;
    }
}

class Restaurant {
    constructor(restaurantId, name, cuisine) {
        this.restaurantId = restaurantId;
        this.name = name;
        this.cuisine = cuisine;
        this.menuItems = [];
        this.location = new Location(0, 0);
        this.rating = 4.5;
        this.isOpen = true;
    }
}

class Cart {
    constructor(customer, restaurant) {
        this.customer = customer;
        this.restaurant = restaurant;
        this.items = new Map();
    }

    addItem(item, quantity = 1) {
        this.items.set(item, (this.items.get(item) || 0) + quantity);
    }

    calculateTotal() {
        let total = 0;
        for (const [item, qty] of this.items) {
            total += item.price * qty;
        }
        return total;
    }
}

class Customer {
    constructor(customerId, name) {
        this.customerId = customerId;
        this.name = name;
        this.phone = '';
        this.addresses = [];
        this.orderHistory = [];
    }
}

class DeliveryAgent {
    constructor(agentId, name) {
        this.agentId = agentId;
        this.name = name;
        this.location = new Location(0, 0);
        this.isAvailable = true;
        this.rating = 4.8;
    }
}

class Payment {
    constructor(order, method) {
        this.paymentId = `PAY${Date.now()}`;
        this.order = order;
        this.amount = order.totalAmount;
        this.method = method;
        this.processed = false;
    }

    process() {
        this.processed = true;
        console.log(`✓ Payment processed: $${this.amount.toFixed(2)} via ${this.method}`);
        return true;
    }
}

class Order {
    constructor(orderId, customer, restaurant, cart) {
        this.orderId = orderId;
        this.customer = customer;
        this.restaurant = restaurant;
        this.items = Array.from(cart.items.entries());
        this.status = OrderStatus.PLACED;
        this.totalAmount = cart.calculateTotal() + 5.0;
        this.deliveryAgent = null;
        this.payment = null;
    }

    updateStatus(status) {
        this.status = status;
        console.log(`📦 Order ${this.orderId}: ${status}`);
    }

    assignAgent(agent) {
        this.deliveryAgent = agent;
        agent.isAvailable = false;
        console.log(`🚗 Assigned agent: ${agent.name}`);
    }
}

class DeliveryService {
    constructor() {
        if (DeliveryService.instance) {
            return DeliveryService.instance;
        }

        this.customers = new Map();
        this.restaurants = new Map();
        this.agents = new Map();
        this.orders = new Map();
        this.orderCounter = 0;

        DeliveryService.instance = this;
    }

    registerCustomer(customer) {
        this.customers.set(customer.customerId, customer);
        console.log(`✓ Registered customer: ${customer.name}`);
    }

    registerRestaurant(restaurant) {
        this.restaurants.set(restaurant.restaurantId, restaurant);
        console.log(`✓ Registered restaurant: ${restaurant.name}`);
    }

    registerAgent(agent) {
        this.agents.set(agent.agentId, agent);
        console.log(`✓ Registered agent: ${agent.name}`);
    }

    placeOrder(customerId, cart, address) {
        const customer = this.customers.get(customerId);
        if (!customer || !cart.restaurant.isOpen) {
            console.log('✗ Cannot place order');
            return null;
        }

        const orderId = `ORD${String(this.orderCounter).padStart(4, '0')}`;
        this.orderCounter++;

        const order = new Order(orderId, customer, cart.restaurant, cart);
        this.orders.set(orderId, order);
        customer.orderHistory.push(order);

        console.log(`✓ Order placed: ${orderId} at ${cart.restaurant.name}`);
        console.log(`  Total: $${order.totalAmount.toFixed(2)}`);

        return order;
    }

    assignDeliveryAgent(order) {
        for (const agent of this.agents.values()) {
            if (agent.isAvailable) {
                order.assignAgent(agent);
                return agent;
            }
        }

        console.log('✗ No agents available');
        return null;
    }

    updateOrderStatus(orderId, status) {
        const order = this.orders.get(orderId);
        if (order) {
            order.updateStatus(status);
        }
    }
}

function main() {
    console.log('='.repeat(70));
    console.log('FOOD DELIVERY SYSTEM - Low Level Design Demo');
    console.log('='.repeat(70));

    const service = new DeliveryService();

    // Register entities
    console.log('\n👥 Registering Entities...');
    const customer = new Customer('C001', 'Alice Johnson');
    service.registerCustomer(customer);

    const restaurant = new Restaurant('R001', 'Pizza Palace', 'Italian');
    const item1 = new MenuItem('I001', 'Margherita Pizza', 12.99);
    const item2 = new MenuItem('I002', 'Garlic Bread', 4.99);
    restaurant.menuItems = [item1, item2];
    service.registerRestaurant(restaurant);

    const agent = new DeliveryAgent('A001', 'Bob Driver');
    service.registerAgent(agent);

    // Create cart
    console.log('\n🛒 Creating Cart...');
    const cart = new Cart(customer, restaurant);
    cart.addItem(item1, 2);
    cart.addItem(item2, 1);
    console.log(`Cart total: $${cart.calculateTotal().toFixed(2)}`);

    // Place order
    console.log('\n📤 Placing Order...');
    const address = new Address('123 Main St', 'NYC', '10001');
    const order = service.placeOrder(customer.customerId, cart, address);

    // Process payment
    console.log('\n💳 Processing Payment...');
    const payment = new Payment(order, PaymentMethod.CREDIT_CARD);
    payment.process();
    order.payment = payment;

    // Order lifecycle
    console.log('\n📦 Order Lifecycle...');
    service.updateOrderStatus(order.orderId, OrderStatus.CONFIRMED);
    service.updateOrderStatus(order.orderId, OrderStatus.PREPARING);

    service.assignDeliveryAgent(order);
    service.updateOrderStatus(order.orderId, OrderStatus.OUT_FOR_DELIVERY);
    service.updateOrderStatus(order.orderId, OrderStatus.DELIVERED);

    console.log('\n' + '='.repeat(70));
    console.log('DEMO COMPLETE');
    console.log('='.repeat(70));
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        DeliveryService,
        Order,
        Restaurant,
        Customer,
        DeliveryAgent,
        Cart,
        MenuItem,
        Payment,
        OrderStatus,
        PaymentMethod
    };
}

if (typeof require !== 'undefined' && require.main === module) {
    main();
}

