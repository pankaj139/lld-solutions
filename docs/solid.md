# SOLID Principles

The SOLID principles are five design principles that help create more maintainable, flexible, and scalable object-oriented software.

## 1. Single Responsibility Principle (SRP)

**Definition:** A class should have only one reason to change, meaning it should have only one job or responsibility.

**Why it matters:**

- Easier to understand and maintain
- Reduces coupling between functionalities
- Makes testing simpler

**Example - Violation:**

```python
class User:
    def __init__(self, name, email):
        self.name = name
        self.email = email
    
    def save_to_database(self):
        # Database logic here
        pass
    
    def send_email(self):
        # Email sending logic here
        pass
    
    def validate_email(self):
        # Email validation logic here
        pass
```

**Example - Following SRP:**

```python
class User:
    def __init__(self, name, email):
        self.name = name
        self.email = email

class UserRepository:
    def save(self, user):
        # Database logic here
        pass

class EmailService:
    def send_email(self, user, message):
        # Email sending logic here
        pass

class EmailValidator:
    def validate(self, email):
        # Email validation logic here
        pass
```

## 2. Open/Closed Principle (OCP)

**Definition:** Software entities should be open for extension but closed for modification.

**Why it matters:**

- Prevents breaking existing code when adding new features
- Promotes code reusability
- Reduces the risk of introducing bugs

**Example - Violation:**

```python
class Rectangle:
    def __init__(self, width, height):
        self.width = width
        self.height = height

class AreaCalculator:
    def calculate_area(self, shapes):
        total_area = 0
        for shape in shapes:
            if isinstance(shape, Rectangle):
                total_area += shape.width * shape.height
            # If we add Circle, we need to modify this method
        return total_area
```

**Example - Following OCP:**

```python
from abc import ABC, abstractmethod

class Shape(ABC):
    @abstractmethod
    def calculate_area(self):
        pass

class Rectangle(Shape):
    def __init__(self, width, height):
        self.width = width
        self.height = height
    
    def calculate_area(self):
        return self.width * self.height

class Circle(Shape):
    def __init__(self, radius):
        self.radius = radius
    
    def calculate_area(self):
        return 3.14159 * self.radius * self.radius

class AreaCalculator:
    def calculate_area(self, shapes):
        return sum(shape.calculate_area() for shape in shapes)
```

## 3. Liskov Substitution Principle (LSP)

**Definition:** Objects of a superclass should be replaceable with objects of a subclass without breaking the application.

**Why it matters:**

- Ensures proper inheritance hierarchy
- Maintains behavioral compatibility
- Prevents unexpected behavior in polymorphic code

**Example - Violation:**

```python
class Bird:
    def fly(self):
        return "Flying"

class Penguin(Bird):
    def fly(self):
        raise Exception("Penguins can't fly!")  # Violates LSP
```

**Example - Following LSP:**

```python
from abc import ABC, abstractmethod

class Bird(ABC):
    @abstractmethod
    def move(self):
        pass

class FlyingBird(Bird):
    def move(self):
        return "Flying"
    
    def fly(self):
        return "Flying"

class SwimmingBird(Bird):
    def move(self):
        return "Swimming"
    
    def swim(self):
        return "Swimming"

class Eagle(FlyingBird):
    pass

class Penguin(SwimmingBird):
    pass
```

## 4. Interface Segregation Principle (ISP)

**Definition:** Clients should not be forced to depend on interfaces they do not use.

**Why it matters:**

- Prevents unnecessary dependencies
- Makes interfaces more focused and cohesive
- Reduces the impact of changes

**Example - Violation:**

```python
from abc import ABC, abstractmethod

class Worker(ABC):
    @abstractmethod
    def work(self):
        pass
    
    @abstractmethod
    def eat(self):
        pass

class HumanWorker(Worker):
    def work(self):
        return "Working"
    
    def eat(self):
        return "Eating"

class RobotWorker(Worker):
    def work(self):
        return "Working"
    
    def eat(self):
        # Robots don't eat! Forced to implement unnecessary method
        raise NotImplementedError("Robots don't eat")
```

**Example - Following ISP:**

```python
from abc import ABC, abstractmethod

class Workable(ABC):
    @abstractmethod
    def work(self):
        pass

class Eatable(ABC):
    @abstractmethod
    def eat(self):
        pass

class HumanWorker(Workable, Eatable):
    def work(self):
        return "Working"
    
    def eat(self):
        return "Eating"

class RobotWorker(Workable):
    def work(self):
        return "Working"
```

## 5. Dependency Inversion Principle (DIP)

**Definition:** High-level modules should not depend on low-level modules. Both should depend on abstractions.

**Why it matters:**

- Reduces coupling between modules
- Makes code more flexible and testable
- Easier to swap implementations

**Example - Violation:**

```python
class MySQLDatabase:
    def save(self, data):
        # MySQL specific code
        pass

class UserService:
    def __init__(self):
        self.database = MySQLDatabase()  # Tight coupling
    
    def save_user(self, user):
        self.database.save(user)
```

**Example - Following DIP:**

```python
from abc import ABC, abstractmethod

class Database(ABC):
    @abstractmethod
    def save(self, data):
        pass

class MySQLDatabase(Database):
    def save(self, data):
        # MySQL specific code
        pass

class PostgreSQLDatabase(Database):
    def save(self, data):
        # PostgreSQL specific code
        pass

class UserService:
    def __init__(self, database: Database):
        self.database = database  # Depends on abstraction
    
    def save_user(self, user):
        self.database.save(user)

# Usage
mysql_db = MySQLDatabase()
user_service = UserService(mysql_db)
```

## Benefits of Following SOLID Principles

1. **Maintainability**: Code is easier to understand and modify
2. **Testability**: Each component can be tested in isolation
3. **Flexibility**: Easy to extend and adapt to changing requirements
4. **Reusability**: Components can be reused in different contexts
5. **Reduced Coupling**: Components are less dependent on each other

## Common Anti-patterns to Avoid

1. **God Objects**: Classes that know too much or do too much
2. **Tight Coupling**: Classes that are overly dependent on each other
3. **Shotgun Surgery**: Small changes requiring modifications in many classes
4. **Feature Envy**: Classes that use methods of other classes excessively

## Applying SOLID in LLD Problems

1. **Identify responsibilities** clearly for each class
2. **Use interfaces** to define contracts between components
3. **Apply dependency injection** for better testability
4. **Design for extension** rather than modification
5. **Keep interfaces focused** and cohesive
6. **Think in terms of abstractions** rather than concrete implementations
