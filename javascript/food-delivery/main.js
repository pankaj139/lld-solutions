// Food Delivery System - Simplified JavaScript Implementation

// Enums
const UserType = {
    CUSTOMER: 'CUSTOMER',
    RESTAURANT_OWNER: 'RESTAURANT_OWNER',
    DELIVERY_PARTNER: 'DELIVERY_PARTNER'
};

const OrderStatus = {
    PLACED: 'PLACED',
    CONFIRMED: 'CONFIRMED',
    PREPARING: 'PREPARING',
    READY_FOR_PICKUP: 'READY_FOR_PICKUP',
    OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
    DELIVERED: 'DELIVERED',
    CANCELLED: 'CANCELLED'
};

const DeliveryStatus = {
    PENDING: 'PENDING',
    ASSIGNED: 'ASSIGNED',
    PICKED_UP: 'PICKED_UP',
    IN_TRANSIT: 'IN_TRANSIT',
    DELIVERED: 'DELIVERED'
};

const PaymentStatus = {
    PENDING: 'PENDING',
    COMPLETED: 'COMPLETED',
    FAILED: 'FAILED',
    REFUNDED: 'REFUNDED'
};

// Simple UUID generator
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

class Location {
    constructor(latitude, longitude, address) {
        this.latitude = latitude;
        this.longitude = longitude;
        this.address = address;
    }

    distanceTo(otherLocation) {
        // Simplified distance calculation (in km)
        const latDiff = Math.abs(this.latitude - otherLocation.latitude);
        const lonDiff = Math.abs(this.longitude - otherLocation.longitude);
        return Math.sqrt(latDiff * latDiff + lonDiff * lonDiff) * 111; // Rough conversion to km
    }
}

class User {
    constructor(userId, name, email, phone, userType) {
        if (this.constructor === User) {
            throw new Error("Cannot instantiate abstract class User");
        }
        this.userId = userId;
        this.name = name;
        this.email = email;
        this.phone = phone;
        this.userType = userType;
        this.createdAt = new Date();
    }
}

class Customer extends User {
    constructor(userId, name, email, phone) {
        super(userId, name, email, phone, UserType.CUSTOMER);
        this.deliveryAddresses = [];
        this.orderHistory = []; // order_ids
    }

    addDeliveryAddress(location) {
        this.deliveryAddresses.push(location);
    }
}

class RestaurantOwner extends User {
    constructor(userId, name, email, phone) {
        super(userId, name, email, phone, UserType.RESTAURANT_OWNER);
        this.restaurants = []; // restaurant_ids
    }
}

class DeliveryPartner extends User {
    constructor(userId, name, email, phone) {
        super(userId, name, email, phone, UserType.DELIVERY_PARTNER);
        this.currentLocation = null;
        this.isAvailable = true;
        this.activeDeliveries = []; // delivery_ids
        this.rating = 5.0;
        this.totalDeliveries = 0;
    }
}

class MenuItem {
    constructor(itemId, name, description, price) {
        this.itemId = itemId;
        this.name = name;
        this.description = description;
        this.price = price;
        this.isAvailable = true;
        this.category = "General";
        this.preparationTime = 15; // minutes
    }
}

class Restaurant {
    constructor(restaurantId, name, owner, location) {
        this.restaurantId = restaurantId;
        this.name = name;
        this.owner = owner;
        this.location = location;
        this.menuItems = new Map(); // itemId -> MenuItem
        this.isOpen = true;
        this.rating = 4.0;
        this.totalOrders = 0;
        this.cuisines = [];
    }

    addMenuItem(item) {
        this.menuItems.set(item.itemId, item);
    }

    removeMenuItem(itemId) {
        this.menuItems.delete(itemId);
    }

    updateItemAvailability(itemId, isAvailable) {
        if (this.menuItems.has(itemId)) {
            this.menuItems.get(itemId).isAvailable = isAvailable;
        }
    }
}

class OrderItem {
    constructor(menuItem, quantity) {
        this.menuItem = menuItem;
        this.quantity = quantity;
        this.totalPrice = menuItem.price * quantity;
        this.specialInstructions = "";
    }
}

class Order {
    constructor(orderId, customer, restaurant, deliveryAddress) {
        this.orderId = orderId;
        this.customer = customer;
        this.restaurant = restaurant;
        this.deliveryAddress = deliveryAddress;
        this.items = [];
        this.status = OrderStatus.PLACED;
        this.orderTime = new Date();
        this.estimatedDeliveryTime = null;
        this.actualDeliveryTime = null;
        this.totalAmount = 0.0;
        this.deliveryFee = 0.0;
        this.taxAmount = 0.0;
        this.discountAmount = 0.0;
    }

    addItem(menuItem, quantity, specialInstructions = "") {
        const orderItem = new OrderItem(menuItem, quantity);
        orderItem.specialInstructions = specialInstructions;
        this.items.push(orderItem);
        this._calculateTotal();
    }

    _calculateTotal() {
        const subtotal = this.items.reduce((sum, item) => sum + item.totalPrice, 0);
        this.deliveryFee = this._calculateDeliveryFee();
        this.taxAmount = subtotal * 0.1; // 10% tax
        this.totalAmount = subtotal + this.deliveryFee + this.taxAmount - this.discountAmount;
    }

    _calculateDeliveryFee() {
        const distance = this.restaurant.location.distanceTo(this.deliveryAddress);
        const baseFee = 2.0;
        const distanceFee = distance * 0.5;
        return baseFee + distanceFee;
    }

    confirmOrder() {
        this.status = OrderStatus.CONFIRMED;
        // Estimate delivery time
        const prepTime = Math.max(...this.items.map(item => item.menuItem.preparationTime));
        const deliveryTime = this.restaurant.location.distanceTo(this.deliveryAddress) * 2; // 2 min per km
        this.estimatedDeliveryTime = new Date(Date.now() + (prepTime + deliveryTime) * 60000);
    }

    updateStatus(status) {
        this.status = status;
        if (status === OrderStatus.DELIVERED) {
            this.actualDeliveryTime = new Date();
        }
    }
}

class Delivery {
    constructor(deliveryId, order) {
        this.deliveryId = deliveryId;
        this.order = order;
        this.deliveryPartner = null;
        this.status = DeliveryStatus.PENDING;
        this.pickupTime = null;
        this.deliveryTime = null;
        this.estimatedDeliveryTime = order.estimatedDeliveryTime;
    }

    assignDeliveryPartner(partner) {
        this.deliveryPartner = partner;
        this.status = DeliveryStatus.ASSIGNED;
        partner.activeDeliveries.push(this.deliveryId);
        partner.isAvailable = false;
    }

    markPickedUp() {
        this.status = DeliveryStatus.PICKED_UP;
        this.pickupTime = new Date();
        this.order.updateStatus(OrderStatus.OUT_FOR_DELIVERY);
    }

    markDelivered() {
        this.status = DeliveryStatus.DELIVERED;
        this.deliveryTime = new Date();
        this.order.updateStatus(OrderStatus.DELIVERED);
        if (this.deliveryPartner) {
            const index = this.deliveryPartner.activeDeliveries.indexOf(this.deliveryId);
            if (index > -1) {
                this.deliveryPartner.activeDeliveries.splice(index, 1);
            }
            this.deliveryPartner.isAvailable = true;
            this.deliveryPartner.totalDeliveries++;
        }
    }
}

class Payment {
    constructor(paymentId, order, amount, paymentMethod) {
        this.paymentId = paymentId;
        this.order = order;
        this.amount = amount;
        this.paymentMethod = paymentMethod;
        this.status = PaymentStatus.PENDING;
        this.transactionTime = null;
    }

    processPayment() {
        try {
            console.log(`Processing payment of $${this.amount.toFixed(2)} via ${this.paymentMethod}`);
            this.status = PaymentStatus.COMPLETED;
            this.transactionTime = new Date();
            return true;
        } catch (e) {
            console.log(`Payment failed: ${e.message}`);
            this.status = PaymentStatus.FAILED;
            return false;
        }
    }
}

class FoodDeliverySystem {
    constructor(platformName) {
        this.platformName = platformName;
        this.customers = new Map(); // customerId -> Customer
        this.restaurantOwners = new Map(); // ownerId -> RestaurantOwner
        this.deliveryPartners = new Map(); // partnerId -> DeliveryPartner
        this.restaurants = new Map(); // restaurantId -> Restaurant
        this.orders = new Map(); // orderId -> Order
        this.deliveries = new Map(); // deliveryId -> Delivery
        this.payments = new Map(); // paymentId -> Payment
    }

    registerCustomer(name, email, phone) {
        const customerId = generateUUID();
        const customer = new Customer(customerId, name, email, phone);
        this.customers.set(customerId, customer);
        return customer;
    }

    registerRestaurantOwner(name, email, phone) {
        const ownerId = generateUUID();
        const owner = new RestaurantOwner(ownerId, name, email, phone);
        this.restaurantOwners.set(ownerId, owner);
        return owner;
    }

    registerDeliveryPartner(name, email, phone) {
        const partnerId = generateUUID();
        const partner = new DeliveryPartner(partnerId, name, email, phone);
        this.deliveryPartners.set(partnerId, partner);
        return partner;
    }

    addRestaurant(name, ownerId, location) {
        if (!this.restaurantOwners.has(ownerId)) {
            throw new Error("Restaurant owner not found");
        }
        
        const restaurantId = generateUUID();
        const owner = this.restaurantOwners.get(ownerId);
        const restaurant = new Restaurant(restaurantId, name, owner, location);
        
        this.restaurants.set(restaurantId, restaurant);
        owner.restaurants.push(restaurantId);
        
        return restaurant;
    }

    searchRestaurants(customerLocation, maxDistance = 10.0) {
        const nearbyRestaurants = [];
        
        for (const restaurant of this.restaurants.values()) {
            if (restaurant.isOpen) {
                const distance = customerLocation.distanceTo(restaurant.location);
                if (distance <= maxDistance) {
                    nearbyRestaurants.push(restaurant);
                }
            }
        }
        
        // Sort by rating and distance
        return nearbyRestaurants.sort((a, b) => {
            const ratingDiff = b.rating - a.rating;
            if (ratingDiff !== 0) return ratingDiff;
            return customerLocation.distanceTo(a.location) - customerLocation.distanceTo(b.location);
        });
    }

    createOrder(customerId, restaurantId, deliveryAddress) {
        if (!this.customers.has(customerId)) {
            throw new Error("Customer not found");
        }
        
        if (!this.restaurants.has(restaurantId)) {
            throw new Error("Restaurant not found");
        }
        
        const customer = this.customers.get(customerId);
        const restaurant = this.restaurants.get(restaurantId);
        
        if (!restaurant.isOpen) {
            throw new Error("Restaurant is currently closed");
        }
        
        const orderId = generateUUID();
        const order = new Order(orderId, customer, restaurant, deliveryAddress);
        
        this.orders.set(orderId, order);
        customer.orderHistory.push(orderId);
        
        return order;
    }

    placeOrder(orderId, paymentMethod) {
        if (!this.orders.has(orderId)) {
            throw new Error("Order not found");
        }
        
        const order = this.orders.get(orderId);
        
        if (order.items.length === 0) {
            throw new Error("Order must have at least one item");
        }
        
        // Process payment
        const paymentId = generateUUID();
        const payment = new Payment(paymentId, order, order.totalAmount, paymentMethod);
        
        if (payment.processPayment()) {
            order.confirmOrder();
            this.payments.set(paymentId, payment);
            
            // Create delivery request
            const deliveryId = generateUUID();
            const delivery = new Delivery(deliveryId, order);
            this.deliveries.set(deliveryId, delivery);
            
            // Try to assign delivery partner
            this._assignDeliveryPartner(delivery);
            
            console.log(`Order ${orderId} placed successfully`);
            console.log(`Estimated delivery time: ${order.estimatedDeliveryTime.toLocaleTimeString()}`);
            return true;
        } else {
            console.log(`Payment failed for order ${orderId}`);
            return false;
        }
    }

    _assignDeliveryPartner(delivery) {
        const availablePartners = Array.from(this.deliveryPartners.values())
            .filter(p => p.isAvailable);
        
        if (availablePartners.length > 0) {
            // Simple assignment: closest partner
            let bestPartner = null;
            let bestDistance = Infinity;
            
            for (const partner of availablePartners) {
                if (partner.currentLocation) {
                    const distance = partner.currentLocation.distanceTo(delivery.order.restaurant.location);
                    if (distance < bestDistance) {
                        bestDistance = distance;
                        bestPartner = partner;
                    }
                }
            }
            
            if (bestPartner) {
                delivery.assignDeliveryPartner(bestPartner);
                console.log(`Delivery assigned to ${bestPartner.name}`);
            } else {
                console.log("No delivery partners available. Order will be queued.");
            }
        } else {
            console.log("No delivery partners available. Order will be queued.");
        }
    }

    markOrderReady(orderId) {
        if (!this.orders.has(orderId)) {
            throw new Error("Order not found");
        }
        
        const order = this.orders.get(orderId);
        order.updateStatus(OrderStatus.READY_FOR_PICKUP);
        
        // Notify delivery partner
        for (const delivery of this.deliveries.values()) {
            if (delivery.order.orderId === orderId && delivery.deliveryPartner) {
                console.log(`Order ${orderId} is ready for pickup by ${delivery.deliveryPartner.name}`);
                break;
            }
        }
    }

    pickupOrder(deliveryId) {
        if (!this.deliveries.has(deliveryId)) {
            throw new Error("Delivery not found");
        }
        
        const delivery = this.deliveries.get(deliveryId);
        delivery.markPickedUp();
        console.log(`Order ${delivery.order.orderId} picked up by ${delivery.deliveryPartner.name}`);
    }

    deliverOrder(deliveryId) {
        if (!this.deliveries.has(deliveryId)) {
            throw new Error("Delivery not found");
        }
        
        const delivery = this.deliveries.get(deliveryId);
        delivery.markDelivered();
        console.log(`Order ${delivery.order.orderId} delivered successfully`);
    }
}

// Demo usage
function main() {
    // Create food delivery platform
    const platform = new FoodDeliverySystem("QuickEats");
    
    // Register users
    const customer = platform.registerCustomer("Alice Johnson", "alice@example.com", "123-456-7890");
    const owner = platform.registerRestaurantOwner("Mario Rossi", "mario@restaurant.com", "098-765-4321");
    const partner = platform.registerDeliveryPartner("Bob Driver", "bob@delivery.com", "555-123-4567");
    
    // Set up locations
    const customerLocation = new Location(40.7589, -73.9851, "123 Main St, New York");
    const restaurantLocation = new Location(40.7614, -73.9776, "456 Restaurant Ave, New York");
    const partnerLocation = new Location(40.7505, -73.9934, "789 Driver St, New York");
    
    customer.addDeliveryAddress(customerLocation);
    partner.currentLocation = partnerLocation;
    
    // Add restaurant
    const restaurant = platform.addRestaurant("Mario's Pizza", owner.userId, restaurantLocation);
    restaurant.cuisines = ["Italian", "Pizza"];
    
    // Add menu items
    const pizzaMargherita = new MenuItem("item1", "Margherita Pizza", "Classic tomato and mozzarella", 12.99);
    const pizzaPepperoni = new MenuItem("item2", "Pepperoni Pizza", "Pepperoni with mozzarella cheese", 15.99);
    const garlicBread = new MenuItem("item3", "Garlic Bread", "Fresh baked garlic bread", 4.99);
    
    restaurant.addMenuItem(pizzaMargherita);
    restaurant.addMenuItem(pizzaPepperoni);
    restaurant.addMenuItem(garlicBread);
    
    console.log(`Platform '${platform.platformName}' initialized`);
    console.log(`Restaurant '${restaurant.name}' added with ${restaurant.menuItems.size} menu items`);
    
    // Search for restaurants
    const nearbyRestaurants = platform.searchRestaurants(customerLocation, 5.0);
    console.log(`\nFound ${nearbyRestaurants.length} nearby restaurants`);
    
    // Create and place order
    if (nearbyRestaurants.length > 0) {
        try {
            const order = platform.createOrder(customer.userId, restaurant.restaurantId, customerLocation);
            
            // Add items to order
            order.addItem(pizzaMargherita, 1, "Extra cheese please");
            order.addItem(garlicBread, 2);
            
            console.log(`\nOrder created: ${order.orderId}`);
            console.log(`Items: ${order.items.length}`);
            console.log(`Total amount: $${order.totalAmount.toFixed(2)}`);
            console.log(`Delivery fee: $${order.deliveryFee.toFixed(2)}`);
            
            // Place order
            if (platform.placeOrder(order.orderId, "Credit Card")) {
                console.log(`Order status: ${order.status}`);
                
                // Simulate restaurant workflow
                console.log("\n--- Restaurant prepares order ---");
                platform.markOrderReady(order.orderId);
                
                // Find delivery for this order
                let deliveryId = null;
                for (const [did, delivery] of platform.deliveries) {
                    if (delivery.order.orderId === order.orderId) {
                        deliveryId = did;
                        break;
                    }
                }
                
                if (deliveryId) {
                    console.log("\n--- Delivery partner picks up order ---");
                    platform.pickupOrder(deliveryId);
                    
                    console.log("\n--- Order delivered ---");
                    platform.deliverOrder(deliveryId);
                }
            }
        } catch (e) {
            console.log(`Error: ${e.message}`);
        }
    }
    
    // Show customer's order history
    console.log(`\n${customer.name} has ${customer.orderHistory.length} order(s) in history`);
}

// Export for use in other modules (Node.js)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        UserType,
        OrderStatus,
        DeliveryStatus,
        PaymentStatus,
        Location,
        User,
        Customer,
        RestaurantOwner,
        DeliveryPartner,
        MenuItem,
        Restaurant,
        OrderItem,
        Order,
        Delivery,
        Payment,
        FoodDeliverySystem
    };
}

// Run demo if this file is executed directly
if (require.main === module) {
    main();
}