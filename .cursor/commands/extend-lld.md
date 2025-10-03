*Description**: Add new features to an existing LLD problem

**Usage**: `/extend-lld <system-name> <feature-description>`

**Example**: `/extend-lld atm-system add fingerprint authentication`

**AI Instructions**:
When this command is invoked:
1. Read the existing implementation
2. Design the new feature following existing patterns
3. Update markdown documentation
4. Update both Python and JavaScript implementations
5. Ensure consistency with existing code style

---

## Project Standards

### Markdown Formatting (Markdownlint)
- **MD040**: All code blocks MUST have language specified
- **MD036**: Use headings (####) not bold for section titles
- Add blank lines around code blocks, lists, and headings
- Use proper heading hierarchy

### Python Standards
- Use ABC (Abstract Base Classes) for interfaces
- Use Enum for state/type definitions
- Include comprehensive docstrings
- Add inline comments for patterns and business rules
- Follow PEP 8 naming conventions

### JavaScript Standards
- Use Object.freeze() for enum immutability
- Use classes with proper encapsulation
- Include JSDoc style comments
- Use _methodName for private methods
- Export classes for modular use

### Design Pattern Requirements
Minimum 3-5 patterns from:
- **Creational**: Factory, Singleton, Builder
- **Structural**: Composite, Decorator, Facade, Adapter
- **Behavioral**: State, Strategy, Observer, Command, Template Method, Chain of Responsibility

### Documentation Requirements
Every class must have:
1. Class-level docstring explaining patterns and purpose
2. Method-level comments for complex logic
3. Inline comments for business rules
4. Usage examples in main/demo function

