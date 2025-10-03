# Vending Machine System

## 🔗 Implementation Links

- **Python Implementation**: [python/vending-machine/main.py](python/vending-machine/main.py)
- **JavaScript Implementation**: [javascript/vending-machine/main.js](javascript/vending-machine/main.js)

## Problem Statement

Design a comprehensive vending machine system that can:

1. **Manage inventory** of products with stock tracking and low-stock alerts
2. **Handle multiple payment methods** (Cash, Credit Card, Mobile Payment, Digital Wallet)
3. **Process transactions** with proper state management and error handling
4. **Dispense products** with mechanical failure simulation and retry logic
5. **Calculate change** accurately for cash payments with denomination optimization
6. **Track sales analytics** and generate comprehensive reports
7. **Support administrative functions** like restocking, price updates, and maintenance
8. **Handle concurrent operations** safely with proper locking mechanisms

## Requirements

### Functional Requirements

- Support multiple product types with different pricing and stock levels
- Accept various payment methods with validation and processing
- Calculate exact change with optimal denomination distribution
- Maintain transaction history and audit trails
- Provide real-time inventory tracking with automatic reordering
- Support administrative operations (restocking, price changes, maintenance)
- Handle edge cases (insufficient funds, out of stock, exact change unavailable)
- Generate sales reports and analytics dashboards

### Non-Functional Requirements

- High availability with fault tolerance mechanisms
- Thread-safe operations for concurrent access
- Extensible architecture for new payment methods and products
- Comprehensive logging and monitoring capabilities
- Security measures for payment processing and cash handling
- Performance optimization for quick transaction processing
- Scalable design for multiple vending machine management

## Design Decisions

### Key Classes

1. **VendingMachine**
   - Central orchestrator managing all operations
   - State management for different machine states
   - Coordinate interactions between components

2. **Product**
   - Represents items available for purchase
   - Contains pricing, inventory, and metadata information
   - Supports different product categories and attributes

3. **Inventory**
   - Manages stock levels and product availability
   - Handles restocking operations and low-stock alerts
   - Tracks product movement and usage patterns

4. **PaymentProcessor**
   - Abstract interface for different payment methods
   - Handles payment validation, processing, and refunds
   - Maintains transaction security and compliance

5. **CashManager**
   - Manages physical cash inventory and change calculation
   - Optimizes denomination distribution for change
   - Handles cash collection and refill operations

6. **TransactionManager**
   - Records all transaction details and history
   - Manages transaction states and rollback capabilities
   - Provides audit trails and compliance reporting

7. **DispenseManager**
   - Controls physical product dispensing mechanisms
   - Handles dispensing failures and retry logic
   - Manages mechanical component status and maintenance

### Design Patterns Used

1. **State Pattern**: Machine states (Idle, Selecting, Payment, Dispensing, Maintenance)
2. **Strategy Pattern**: Different payment methods and dispensing strategies
3. **Command Pattern**: Transaction operations and administrative commands
4. **Observer Pattern**: Inventory alerts and transaction notifications
5. **Factory Pattern**: Payment processor and product creation
6. **Singleton Pattern**: Vending machine instance and configuration
7. **Template Method**: Common transaction processing workflow

### Key Features

- **Multi-Payment Support**: Cash, card, mobile, and digital wallet payments
- **Smart Change Management**: Optimal denomination calculation and dispensing
- **Real-time Monitoring**: Live inventory tracking and machine status
- **Comprehensive Analytics**: Sales reports, popular products, revenue tracking
- **Maintenance Mode**: Administrative functions and system diagnostics

## Architecture Diagram

```uml
VendingMachine
├── currentState: MachineState
├── inventory: Inventory
├── paymentProcessor: PaymentProcessor
├── cashManager: CashManager
├── transactionManager: TransactionManager
├── dispenseManager: DispenseManager
└── adminPanel: AdminPanel

MachineState (Enum)
├── IDLE: Ready for customer interaction
├── PRODUCT_SELECTION: Customer selecting product
├── PAYMENT_PROCESSING: Processing payment
├── DISPENSING: Dispensing product
├── MAINTENANCE: Administrative mode
└── OUT_OF_ORDER: Machine malfunction

PaymentProcessor (Abstract)
├── validatePayment(amount, method): boolean
├── processPayment(transaction): PaymentResult
├── refundPayment(transaction): RefundResult
└── getPaymentMethods(): List<PaymentMethod>

CashPaymentProcessor : PaymentProcessor
├── acceptedDenominations: Map<Denomination, Integer>
├── calculateChange(amount, paid): Map<Denomination, Integer>
└── dispenseCash(denominations): boolean

CardPaymentProcessor : PaymentProcessor
├── validateCard(cardInfo): boolean
├── authorizePayment(amount): AuthResult
└── capturePayment(authCode): CaptureResult

Inventory
├── products: Map<ProductCode, Product>
├── stockLevels: Map<ProductCode, Integer>
├── lowStockThreshold: Integer
├── checkAvailability(productCode): boolean
├── reserveProduct(productCode): boolean
├── confirmSale(productCode): void
└── restock(productCode, quantity): void

TransactionManager
├── activeTransactions: Map<TransactionId, Transaction>
├── transactionHistory: List<Transaction>
├── startTransaction(customer): Transaction
├── updateTransaction(transactionId, status): void
└── generateReport(period): SalesReport
```

## Usage Examples

### Basic Product Purchase

```python
# Initialize vending machine
vending_machine = VendingMachine()

# Customer selects product
selection_result = vending_machine.select_product("A1")  # Coke $1.50
print(f"Product selected: {selection_result.product_name}")
print(f"Price: ${selection_result.price}")

# Customer inserts cash
payment_result = vending_machine.process_payment(
    payment_method=PaymentMethod.CASH,
    amount=2.00
)

if payment_result.success:
    print(f"Payment accepted. Change: ${payment_result.change}")
    
    # Dispense product
    dispense_result = vending_machine.dispense_product()
    if dispense_result.success:
        print("Product dispensed successfully!")
    else:
        print(f"Dispensing failed: {dispense_result.error}")
```

### Card Payment Transaction

```python
# Card payment flow
card_info = CardInfo(
    number="1234-5678-9012-3456",
    expiry="12/25",
    cvv="123",
    holder_name="John Doe"
)

# Select product and pay with card
vending_machine.select_product("B2")  # Chips $2.25
payment_result = vending_machine.process_payment(
    payment_method=PaymentMethod.CREDIT_CARD,
    card_info=card_info
)

if payment_result.success:
    print(f"Card payment processed: {payment_result.transaction_id}")
```

### Administrative Operations

```python
# Admin login
admin_session = vending_machine.admin_login("admin", "password123")

# Restock products
admin_session.restock_product("A1", quantity=20)
admin_session.restock_product("B2", quantity=15)

# Update prices
admin_session.update_price("A1", new_price=1.75)

# Generate sales report
report = admin_session.generate_sales_report(
    start_date="2025-10-01",
    end_date="2025-10-03"
)

print(f"Total revenue: ${report.total_revenue}")
print(f"Units sold: {report.units_sold}")
print(f"Popular products: {report.top_products}")
```

### Inventory Management

```python
# Check current inventory
inventory_status = vending_machine.get_inventory_status()
for product_code, details in inventory_status.items():
    print(f"{product_code}: {details.name} - {details.stock} units")
    if details.stock < details.low_stock_threshold:
        print(f"  ⚠️ Low stock alert!")

# Set up automatic reordering
vending_machine.configure_auto_reorder(
    product_code="A1",
    reorder_threshold=5,
    reorder_quantity=25
)
```

## Extension Points

1. **Advanced Payment Methods**: Cryptocurrency, loyalty points, subscription-based
2. **IoT Integration**: Remote monitoring, predictive maintenance, temperature control
3. **AI-Powered Features**: Dynamic pricing, demand forecasting, personalized recommendations
4. **Mobile App Integration**: Remote purchasing, product reservations, loyalty programs
5. **Multi-Location Management**: Central monitoring, inventory optimization, route planning
6. **Sustainability Features**: Recycling rewards, eco-friendly product promotions
7. **Security Enhancements**: Biometric authentication, anti-theft measures, encrypted communications

## Time Complexity

### Core Operations

- **Product Selection**: O(1) - Direct product lookup
- **Payment Processing**: O(1) - Payment validation and processing
- **Change Calculation**: O(d) - Linear with number of denominations
- **Inventory Update**: O(1) - Direct stock level modification
- **Transaction Recording**: O(1) - Append to transaction log

### Administrative Operations

- **Inventory Restocking**: O(n) - Linear with number of products
- **Sales Report Generation**: O(t) - Linear with transaction count
- **Price Updates**: O(1) - Direct price modification
- **Stock Analysis**: O(n×t) - Products × time periods

## Space Complexity

- **Product Catalog**: O(p) - Linear with product count
- **Inventory Storage**: O(p) - Linear with product varieties
- **Transaction History**: O(t) - Linear with transaction count
- **Cash Denominations**: O(d) - Linear with denomination types
- **User Sessions**: O(u) - Linear with concurrent users

## Advanced Features

### Smart Change Optimization

```python
class SmartChangeCalculator:
    def calculate_optimal_change(self, amount_due, available_denominations):
        """Calculate change using greedy algorithm with denomination optimization"""
        change = {}
        remaining = amount_due
        
        # Sort denominations in descending order
        sorted_denoms = sorted(available_denominations.keys(), reverse=True)
        
        for denomination in sorted_denoms:
            if remaining >= denomination and available_denominations[denomination] > 0:
                count = min(remaining // denomination, available_denominations[denomination])
                if count > 0:
                    change[denomination] = count
                    remaining -= count * denomination
        
        return change if remaining == 0 else None
```

### Predictive Maintenance

```python
class MaintenancePredictor:
    def __init__(self):
        self.component_usage = {}
        self.failure_patterns = {}
    
    def predict_maintenance_needs(self, machine_id):
        """Predict when maintenance will be needed based on usage patterns"""
        predictions = {}
        
        for component, usage_data in self.component_usage.items():
            # Calculate wear based on usage
            wear_level = self.calculate_wear_level(usage_data)
            
            # Predict failure probability
            failure_probability = self.estimate_failure_probability(
                component, wear_level
            )
            
            predictions[component] = {
                'wear_level': wear_level,
                'failure_probability': failure_probability,
                'recommended_action': self.get_maintenance_recommendation(
                    failure_probability
                )
            }
        
        return predictions
```

### Dynamic Pricing Engine

```python
class DynamicPricingEngine:
    def __init__(self):
        self.demand_history = {}
        self.competitor_prices = {}
        self.profit_margins = {}
    
    def calculate_optimal_price(self, product_code, current_demand, inventory_level):
        """Calculate optimal price based on demand and inventory"""
        base_price = self.get_base_price(product_code)
        
        # Demand-based adjustment
        demand_multiplier = self.calculate_demand_multiplier(
            product_code, current_demand
        )
        
        # Inventory-based adjustment
        inventory_multiplier = self.calculate_inventory_multiplier(
            inventory_level
        )
        
        # Competitor price consideration
        competitive_adjustment = self.analyze_competitive_pricing(
            product_code
        )
        
        optimal_price = base_price * demand_multiplier * inventory_multiplier + competitive_adjustment
        
        return max(optimal_price, self.get_minimum_price(product_code))
```

### Real-time Analytics Dashboard

```python
class AnalyticsDashboard:
    def get_real_time_metrics(self, machine_id):
        """Get real-time performance metrics"""
        return {
            'current_sales_rate': self.calculate_sales_rate(),
            'inventory_turnover': self.calculate_inventory_turnover(),
            'payment_method_distribution': self.get_payment_distribution(),
            'peak_hours': self.identify_peak_hours(),
            'revenue_trend': self.calculate_revenue_trend(),
            'customer_satisfaction': self.estimate_satisfaction_score(),
            'machine_uptime': self.calculate_uptime_percentage()
        }
    
    def generate_predictive_insights(self):
        """Generate AI-powered insights and recommendations"""
        return {
            'demand_forecast': self.forecast_demand(),
            'optimal_restocking_schedule': self.optimize_restocking(),
            'revenue_optimization_tips': self.suggest_revenue_improvements(),
            'maintenance_schedule': self.recommend_maintenance_windows()
        }
```

### Multi-Machine Fleet Management

```python
class FleetManager:
    def __init__(self):
        self.machines = {}
        self.central_inventory = {}
        self.route_optimizer = RouteOptimizer()
    
    def optimize_inventory_distribution(self):
        """Optimize inventory across all machines in the fleet"""
        for machine_id, machine in self.machines.items():
            demand_forecast = self.forecast_demand(machine_id)
            current_inventory = machine.get_inventory_levels()
            
            # Calculate optimal inventory levels
            optimal_levels = self.calculate_optimal_inventory(
                demand_forecast, current_inventory
            )
            
            # Generate restocking recommendations
            restock_plan = self.generate_restock_plan(
                machine_id, optimal_levels
            )
            
            self.schedule_restocking(machine_id, restock_plan)
    
    def coordinate_emergency_restocking(self, machine_id, urgent_products):
        """Coordinate emergency restocking from nearby machines"""
        nearby_machines = self.find_nearby_machines(machine_id)
        
        for product in urgent_products:
            source_machine = self.find_best_source(product, nearby_machines)
            if source_machine:
                self.transfer_inventory(source_machine, machine_id, product)
```
