# Object-Oriented Programming (OOP)

## Core Principles

### 1. Encapsulation
Bundling data and methods that operate on that data within a single unit (class), and restricting access to the internal state.

**Benefits:**
- Data hiding and protection
- Better code organization
- Easier maintenance

**Example:**
```python
class BankAccount:
    def __init__(self, initial_balance):
        self._balance = initial_balance  # Protected attribute
    
    def deposit(self, amount):
        if amount > 0:
            self._balance += amount
    
    def get_balance(self):
        return self._balance
```

### 2. Inheritance
Mechanism where a new class (derived class) inherits properties and methods from an existing class (base class).

**Benefits:**
- Code reusability
- Hierarchical classification
- Method overriding

**Example:**
```python
class Vehicle:
    def __init__(self, brand, model):
        self.brand = brand
        self.model = model
    
    def start_engine(self):
        print("Engine started")

class Car(Vehicle):
    def __init__(self, brand, model, doors):
        super().__init__(brand, model)
        self.doors = doors
    
    def honk(self):
        print("Beep beep!")
```

### 3. Polymorphism
Ability of objects of different types to respond to the same interface in different ways.

**Types:**
- Method overriding (runtime polymorphism)
- Method overloading (compile-time polymorphism)

**Example:**
```python
class Animal:
    def make_sound(self):
        pass

class Dog(Animal):
    def make_sound(self):
        return "Woof!"

class Cat(Animal):
    def make_sound(self):
        return "Meow!"

# Polymorphic usage
animals = [Dog(), Cat()]
for animal in animals:
    print(animal.make_sound())  # Different behavior for each type
```

### 4. Abstraction
Hiding complex implementation details while showing only essential features of an object.

**Implementation:**
- Abstract classes
- Interfaces

**Example:**
```python
from abc import ABC, abstractmethod

class Shape(ABC):
    @abstractmethod
    def calculate_area(self):
        pass
    
    @abstractmethod
    def calculate_perimeter(self):
        pass

class Rectangle(Shape):
    def __init__(self, width, height):
        self.width = width
        self.height = height
    
    def calculate_area(self):
        return self.width * self.height
    
    def calculate_perimeter(self):
        return 2 * (self.width + self.height)
```

## Key Concepts for LLD

### Classes and Objects
- **Class**: Blueprint or template for creating objects
- **Object**: Instance of a class with specific values

### Relationships
- **Association**: "has-a" relationship
- **Composition**: Strong "has-a" relationship (owner controls lifecycle)
- **Aggregation**: Weak "has-a" relationship (independent lifecycle)

### Access Modifiers
- **Public**: Accessible from anywhere
- **Protected**: Accessible within class and subclasses
- **Private**: Accessible only within the same class

## Best Practices

1. **Favor composition over inheritance** when possible
2. **Use meaningful class and method names**
3. **Keep classes focused** on a single responsibility
4. **Minimize coupling** between classes
5. **Maximize cohesion** within classes
6. **Use interfaces** to define contracts
7. **Apply SOLID principles** consistently

## Common Pitfalls

1. **God classes** - Classes that do too much
2. **Tight coupling** - Classes too dependent on each other
3. **Inappropriate inheritance** - Using inheritance when composition is better
4. **Breaking encapsulation** - Exposing internal details unnecessarily

## Practice Tips

1. Start with identifying entities and their relationships
2. Define clear responsibilities for each class
3. Use UML diagrams to visualize your design
4. Iterate and refine your design
5. Test your design with different scenarios