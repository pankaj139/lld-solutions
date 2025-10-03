**Description**: Create a complete new LLD problem with all required files (markdown documentation, Python implementation, JavaScript implementation)

**Usage**: `/create-lld <system-name> <category> <difficulty>`

**Parameters**:
- `system-name`: Name of the system (e.g., "streaming-service", "cloud-storage")
- `category`: One of: system-design, game-design, business-system, data-structure
- `difficulty`: One of: easy, medium, hard

**Example**: `/create-lld streaming-service system-design hard`

**What it creates**:
1. `<system-name>.md` - Complete documentation with all required sections
2. `python/<system-name>/main.py` - Python implementation
3. `javascript/<system-name>/main.js` - JavaScript implementation
4. Updates README.md with the new problem

**AI Instructions**:
When this command is invoked:

1. **Create Markdown Documentation** (`<system-name>.md`) with these sections:
   - 🔗 Implementation Links (to Python and JavaScript files)
   - Problem Statement (clear 2-3 sentence overview + 5-6 core capabilities)
   - Requirements:
     - Functional Requirements (bulleted list, 6-8 items)
     - Non-Functional Requirements (bulleted list, 4-5 items)
   - Design Decisions:
     - Key Classes (3-5 main classes with descriptions)
     - Design Patterns Used (numbered list, 3-5 patterns)
     - Key Features (bulleted list, 4-5 features)
   - State Diagram (text format using arrows, if applicable)
   - Class Diagram (text format showing hierarchy and attributes)
   - Usage Example (code snippet showing how to use the system)
   - Business Rules (numbered list, 4-5 rules)
   - Extension Points (numbered list, 5-6 future enhancements)
   - Security Considerations (if applicable, numbered list)
   - Time Complexity (for key operations)
   - Space Complexity (overall system)

2. **Create Python Implementation** (`python/<system-name>/main.py`):
   ```python
   """
   [SYSTEM NAME] - Low Level Design Implementation in Python
   
   DESIGN PATTERNS USED:
   1. [Pattern Name]: [Brief description of usage]
   2. [Pattern Name]: [Brief description of usage]
   ...
   
   OOP CONCEPTS DEMONSTRATED:
   - ENCAPSULATION: [How it's used]
   - ABSTRACTION: [How it's used]
   - INHERITANCE: [How it's used]
   - POLYMORPHISM: [How it's used]
   
   SOLID PRINCIPLES:
   - SRP: [How it's applied]
   - OCP: [How it's applied]
   - LSP: [How it's applied]
   - ISP: [How it's applied]
   - DIP: [How it's applied]
   
   BUSINESS FEATURES:
   - [Feature 1]
   - [Feature 2]
   ...
   
   ARCHITECTURAL NOTES:
   - [Note 1]
   - [Note 2]
   ...
   """
   
   from abc import ABC, abstractmethod
   from enum import Enum
   from datetime import datetime
   import uuid
   
   # Enums - Domain model definitions
   class [StateEnum](Enum):
       # Define states
       pass
   
   # Classes with detailed docstrings
   class [ClassName]:
       """
       [Class Purpose]
       
       DESIGN PATTERNS:
       - [Pattern]: [Usage]
       
       OOP CONCEPTS:
       - [Concept]: [Usage]
       """
       def __init__(self, ...):
           # Initialize with comments
           pass
       
       def method(self):
           """
           [Method purpose]
           
           DESIGN PATTERN: [Pattern name and why]
           BUSINESS RULE: [Any rules enforced]
           """
           pass
   
   # Demo function
   def main():
       """Demonstrate system usage"""
       print("=== [System Name] Demo ===")
       # Working example code
       pass
   
   if __name__ == "__main__":
       main()
   ```

3. **Create JavaScript Implementation** (`javascript/<system-name>/main.js`):
   ```javascript
   /**
    * [SYSTEM NAME] Implementation in JavaScript
    * ==========================================
    * 
    * This implementation demonstrates several key Design Patterns and OOP Concepts:
    * 
    * DESIGN PATTERNS USED:
    * 1. [Pattern Name]: [Description]
    * 2. [Pattern Name]: [Description]
    * ...
    * 
    * OOP CONCEPTS DEMONSTRATED:
    * 1. Encapsulation: [Usage]
    * 2. Abstraction: [Usage]
    * 3. Composition: [Usage]
    * 4. Polymorphism: [Usage]
    * 
    * ARCHITECTURAL PRINCIPLES:
    * - Single Responsibility: [Usage]
    * - Open/Closed: [Usage]
    * - Dependency Injection: [Usage]
    * - Low Coupling: [Usage]
    */
   
   // Enums - Using Object.freeze() for immutability
   const [EnumName] = Object.freeze({
       VALUE1: 'VALUE1',
       VALUE2: 'VALUE2'
   });
   
   // Helper functions if needed
   function generateUUID() {
       return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
           const r = Math.random() * 16 | 0;
           const v = c == 'x' ? r : (r & 0x3 | 0x8);
           return v.toString(16);
       });
   }
   
   /**
    * [ClassName] - [Purpose]
    * 
    * DESIGN PATTERNS:
    * - [Pattern]: [Usage]
    * 
    * OOP CONCEPTS:
    * - [Concept]: [Usage]
    */
   class [ClassName] {
       constructor(...) {
           // Initialize with detailed comments
       }
       
       /**
        * [Method purpose]
        * 
        * DESIGN PATTERN: [Pattern and reasoning]
        * BUSINESS RULE: [Any rules]
        */
       method() {
           // Implementation
       }
   }
   
   // Demo usage
   function main() {
       console.log("=== [System Name] Demo ===");
       // Working example code
   }
   
   // Export for use in other modules
   if (typeof module !== 'undefined' && module.exports) {
       module.exports = {
           // Export classes
       };
   }
   
   // Run demo if executed directly
   if (require.main === module) {
       main();
   }
   ```

4. **Update README.md** - Add the new problem to the appropriate category table

**Requirements Checklist**:
- ✅ All code blocks in markdown have language specified (```python, ```javascript, ```text, etc.)
- ✅ Use #### headings instead of **bold** for decision/section titles
- ✅ Add blank lines around all code blocks, lists, and headings
- ✅ Include at least 3-5 design patterns
- ✅ Add extensive inline comments explaining patterns and business rules
- ✅ Include working demo code that can run immediately
- ✅ Follow exact structure from atm-system reference files
- ✅ All classes have detailed docstrings/comments
- ✅ Include complexity analysis


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

