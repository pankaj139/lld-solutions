# Design Patterns

Design patterns are reusable solutions to commonly occurring problems in software design. They represent best practices and provide a common vocabulary for developers.

## Creational Patterns

### 1. Singleton Pattern

**Purpose:** Ensures a class has only one instance and provides global access to it.

**When to use:**
- Database connections
- Logging services
- Configuration managers

**Python Implementation:**
```python
class Singleton:
    _instance = None
    _initialized = False
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        if not self._initialized:
            self._initialized = True
            # Initialize your singleton here
```

**JavaScript Implementation:**
```javascript
class Singleton {
    constructor() {
        if (Singleton.instance) {
            return Singleton.instance;
        }
        Singleton.instance = this;
        return this;
    }
}
```

### 2. Factory Pattern

**Purpose:** Creates objects without specifying their exact class.

**Python Implementation:**
```python
from abc import ABC, abstractmethod

class Vehicle(ABC):
    @abstractmethod
    def start(self):
        pass

class Car(Vehicle):
    def start(self):
        return "Car started"

class Motorcycle(Vehicle):
    def start(self):
        return "Motorcycle started"

class VehicleFactory:
    @staticmethod
    def create_vehicle(vehicle_type):
        if vehicle_type == "car":
            return Car()
        elif vehicle_type == "motorcycle":
            return Motorcycle()
        else:
            raise ValueError("Unknown vehicle type")
```

### 3. Builder Pattern

**Purpose:** Constructs complex objects step by step.

**Python Implementation:**
```python
class House:
    def __init__(self):
        self.foundation = None
        self.walls = None
        self.roof = None
        self.interior = None

class HouseBuilder:
    def __init__(self):
        self.house = House()
    
    def build_foundation(self, foundation_type):
        self.house.foundation = foundation_type
        return self
    
    def build_walls(self, wall_type):
        self.house.walls = wall_type
        return self
    
    def build_roof(self, roof_type):
        self.house.roof = roof_type
        return self
    
    def build_interior(self, interior_type):
        self.house.interior = interior_type
        return self
    
    def get_house(self):
        return self.house

# Usage
house = (HouseBuilder()
         .build_foundation("concrete")
         .build_walls("brick")
         .build_roof("tile")
         .build_interior("modern")
         .get_house())
```

## Structural Patterns

### 1. Adapter Pattern

**Purpose:** Allows incompatible interfaces to work together.

**Python Implementation:**
```python
class OldPrinter:
    def old_print(self, text):
        print(f"Old printer: {text}")

class NewPrinter:
    def print(self, text):
        print(f"New printer: {text}")

class PrinterAdapter:
    def __init__(self, old_printer):
        self.old_printer = old_printer
    
    def print(self, text):
        self.old_printer.old_print(text)

# Usage
old_printer = OldPrinter()
adapter = PrinterAdapter(old_printer)
adapter.print("Hello World")  # Works with new interface
```

### 2. Decorator Pattern

**Purpose:** Adds new functionality to objects without altering their structure.

**Python Implementation:**
```python
from abc import ABC, abstractmethod

class Coffee(ABC):
    @abstractmethod
    def cost(self):
        pass
    
    @abstractmethod
    def description(self):
        pass

class SimpleCoffee(Coffee):
    def cost(self):
        return 2.0
    
    def description(self):
        return "Simple coffee"

class CoffeeDecorator(Coffee):
    def __init__(self, coffee):
        self._coffee = coffee
    
    def cost(self):
        return self._coffee.cost()
    
    def description(self):
        return self._coffee.description()

class MilkDecorator(CoffeeDecorator):
    def cost(self):
        return self._coffee.cost() + 0.5
    
    def description(self):
        return self._coffee.description() + ", milk"

class SugarDecorator(CoffeeDecorator):
    def cost(self):
        return self._coffee.cost() + 0.2
    
    def description(self):
        return self._coffee.description() + ", sugar"

# Usage
coffee = SimpleCoffee()
coffee = MilkDecorator(coffee)
coffee = SugarDecorator(coffee)
print(f"{coffee.description()} costs ${coffee.cost()}")
```

### 3. Facade Pattern

**Purpose:** Provides a simplified interface to a complex subsystem.

**Python Implementation:**
```python
class CPU:
    def freeze(self):
        print("CPU freezing")
    
    def jump(self, position):
        print(f"CPU jumping to {position}")
    
    def execute(self):
        print("CPU executing")

class Memory:
    def load(self, position, data):
        print(f"Loading {data} to {position}")

class HardDrive:
    def read(self, lba, size):
        return f"Data from {lba} with size {size}"

class ComputerFacade:
    def __init__(self):
        self.cpu = CPU()
        self.memory = Memory()
        self.hard_drive = HardDrive()
    
    def start_computer(self):
        self.cpu.freeze()
        self.memory.load("0x00", self.hard_drive.read("boot_sector", 1024))
        self.cpu.jump("0x00")
        self.cpu.execute()

# Usage
computer = ComputerFacade()
computer.start_computer()  # Simple interface for complex operation
```

## Behavioral Patterns

### 1. Observer Pattern

**Purpose:** Defines a one-to-many dependency between objects so that when one object changes state, all dependents are notified.

**Python Implementation:**
```python
from abc import ABC, abstractmethod

class Observer(ABC):
    @abstractmethod
    def update(self, message):
        pass

class Subject:
    def __init__(self):
        self._observers = []
    
    def attach(self, observer):
        self._observers.append(observer)
    
    def detach(self, observer):
        self._observers.remove(observer)
    
    def notify(self, message):
        for observer in self._observers:
            observer.update(message)

class EmailNotifier(Observer):
    def update(self, message):
        print(f"Email notification: {message}")

class SMSNotifier(Observer):
    def update(self, message):
        print(f"SMS notification: {message}")

class NewsAgency(Subject):
    def __init__(self):
        super().__init__()
        self._news = None
    
    def set_news(self, news):
        self._news = news
        self.notify(news)

# Usage
agency = NewsAgency()
email_notifier = EmailNotifier()
sms_notifier = SMSNotifier()

agency.attach(email_notifier)
agency.attach(sms_notifier)
agency.set_news("Breaking news!")
```

### 2. Strategy Pattern

**Purpose:** Defines a family of algorithms, encapsulates each one, and makes them interchangeable.

**Python Implementation:**
```python
from abc import ABC, abstractmethod

class PaymentStrategy(ABC):
    @abstractmethod
    def pay(self, amount):
        pass

class CreditCardPayment(PaymentStrategy):
    def __init__(self, card_number):
        self.card_number = card_number
    
    def pay(self, amount):
        print(f"Paid ${amount} using Credit Card {self.card_number}")

class PayPalPayment(PaymentStrategy):
    def __init__(self, email):
        self.email = email
    
    def pay(self, amount):
        print(f"Paid ${amount} using PayPal {self.email}")

class ShoppingCart:
    def __init__(self):
        self.amount = 0
        self.payment_strategy = None
    
    def set_payment_strategy(self, strategy):
        self.payment_strategy = strategy
    
    def checkout(self):
        self.payment_strategy.pay(self.amount)

# Usage
cart = ShoppingCart()
cart.amount = 100

cart.set_payment_strategy(CreditCardPayment("1234-5678-9012-3456"))
cart.checkout()

cart.set_payment_strategy(PayPalPayment("user@example.com"))
cart.checkout()
```

### 3. Command Pattern

**Purpose:** Encapsulates a request as an object, allowing you to parameterize clients with different requests.

**Python Implementation:**
```python
from abc import ABC, abstractmethod

class Command(ABC):
    @abstractmethod
    def execute(self):
        pass

class Light:
    def turn_on(self):
        print("Light is ON")
    
    def turn_off(self):
        print("Light is OFF")

class LightOnCommand(Command):
    def __init__(self, light):
        self.light = light
    
    def execute(self):
        self.light.turn_on()

class LightOffCommand(Command):
    def __init__(self, light):
        self.light = light
    
    def execute(self):
        self.light.turn_off()

class RemoteControl:
    def __init__(self):
        self.command = None
    
    def set_command(self, command):
        self.command = command
    
    def press_button(self):
        self.command.execute()

# Usage
light = Light()
light_on = LightOnCommand(light)
light_off = LightOffCommand(light)

remote = RemoteControl()
remote.set_command(light_on)
remote.press_button()

remote.set_command(light_off)
remote.press_button()
```

## When to Use Design Patterns

### Creational Patterns
- **Singleton**: When you need exactly one instance (database connections, loggers)
- **Factory**: When object creation logic is complex or needs to be centralized
- **Builder**: When constructing complex objects with many optional parameters

### Structural Patterns
- **Adapter**: When integrating with legacy code or third-party libraries
- **Decorator**: When you need to add responsibilities to objects dynamically
- **Facade**: When you want to simplify a complex subsystem interface

### Behavioral Patterns
- **Observer**: When you need to notify multiple objects about state changes
- **Strategy**: When you have multiple ways to perform a task
- **Command**: When you need to queue operations, support undo, or log requests

## Best Practices

1. **Don't force patterns** - Use them when they solve a real problem
2. **Understand the problem first** - Then choose the appropriate pattern
3. **Keep it simple** - Don't over-engineer with unnecessary patterns
4. **Consider trade-offs** - Patterns add complexity but solve specific problems
5. **Document pattern usage** - Make it clear why and how patterns are used

## Common Mistakes

1. **Pattern overuse** - Using patterns where simple solutions would suffice
2. **Wrong pattern choice** - Using a pattern that doesn't fit the problem
3. **Implementation errors** - Not following the pattern correctly
4. **Mixing patterns incorrectly** - Combining patterns in ways that add confusion

Remember: Design patterns are tools, not goals. Use them to solve problems, not to show off knowledge.