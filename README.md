# LLD Solutions 🏗️

A comprehensive repository containing solutions to 50+ Low-Level Design interview questions in **Python** and **JavaScript**. Includes detailed documentation on OOP, SOLID principles, and design patterns for FAANG-level interviews.

## 📚 Documentation

Comprehensive guides to master LLD concepts:

- **[Object-Oriented Programming (OOP)](./docs/oop.md)** - Core OOP principles with examples
- **[SOLID Principles](./docs/solid.md)** - The five pillars of good design
- **[Design Patterns](./docs/design-patterns.md)** - Common patterns and when to use them  
- **[LLD Framework](./docs/lld-framework.md)** - Step-by-step approach to solving LLD problems

## 🎯 Problem Solutions

Each problem includes:
- ✅ **Python implementation** (`python/<problem>/main.py`)
- ✅ **JavaScript implementation** (`javascript/<problem>/main.js`) 
- ✅ **Detailed README** with problem analysis and design decisions
- ✅ **Working demo code** you can run immediately

### 🚗 System Design Problems

| Problem | Python | JavaScript | Difficulty | Key Patterns |
|---------|---------|------------|------------|--------------|
| [Parking Lot System](./python/parking-lot/) | ✅ | ✅ | Medium | Strategy, State, Factory |
| [Library Management](./python/library-management/) | ✅ | 🔄 | Medium | Template Method, Strategy |
| Hotel Booking System | 🔄 | 🔄 | Hard | Observer, Command, State |
| Chat Application | 🔄 | 🔄 | Medium | Observer, Mediator |
| Food Delivery System | 🔄 | 🔄 | Hard | Strategy, Observer, Factory |
| Ride Sharing System | 🔄 | 🔄 | Hard | Strategy, State, Observer |
| Movie Ticket Booking | 🔄 | 🔄 | Medium | Command, State, Factory |
| ATM System | 🔄 | 🔄 | Medium | State, Command, Chain of Responsibility |
| Elevator System | 🔄 | 🔄 | Hard | State, Strategy, Observer |
| URL Shortener | 🔄 | 🔄 | Medium | Factory, Strategy |

### 🎮 Game Design Problems

| Problem | Python | JavaScript | Difficulty | Key Patterns |
|---------|---------|------------|------------|--------------|
| Chess Game | 🔄 | 🔄 | Hard | Command, Strategy, State |
| Tic-Tac-Toe | 🔄 | 🔄 | Easy | Strategy, State |
| Snake and Ladder | 🔄 | 🔄 | Medium | Command, State |
| Card Game (Poker) | 🔄 | 🔄 | Hard | Strategy, Factory, Observer |

### 💼 Business System Problems

| Problem | Python | JavaScript | Difficulty | Key Patterns |
|---------|---------|------------|------------|--------------|
| Online Shopping System | 🔄 | 🔄 | Hard | Factory, Observer, Strategy |
| Banking System | 🔄 | 🔄 | Medium | Command, State, Template Method |
| Social Media Platform | 🔄 | 🔄 | Hard | Observer, Mediator, Factory |
| File System | 🔄 | 🔄 | Medium | Composite, Visitor |

## 🚀 Quick Start

### Running Python Solutions
```bash
# Navigate to any Python solution
cd python/parking-lot/

# Run the demo
python main.py
```

### Running JavaScript Solutions  
```bash
# Navigate to any JavaScript solution
cd javascript/parking-lot/

# Run the demo
node main.js
```

## 📖 How to Use This Repository

1. **Start with [Documentation](./docs/)** - Review OOP, SOLID, and Design Patterns
2. **Follow the [LLD Framework](./docs/lld-framework.md)** - Learn the systematic approach
3. **Practice with Solutions** - Start with easier problems and work your way up
4. **Compare Implementations** - See how the same problem is solved in both languages
5. **Study the READMEs** - Understand the design decisions and trade-offs

## 🎯 Interview Preparation Tips

### For Each Problem:
1. **Understand Requirements** - Clarify functional and non-functional needs
2. **Design Classes** - Identify entities, relationships, and responsibilities  
3. **Apply Patterns** - Use appropriate design patterns
4. **Handle Edge Cases** - Consider error scenarios and constraints
5. **Discuss Trade-offs** - Explain design decisions and alternatives

### Common Interview Questions:
- How would you scale this to handle 1M users?
- What design patterns did you use and why?
- How would you handle concurrency issues?
- What are the trade-offs in your design?
- How would you add new features without breaking existing code?

## 🔧 Development Setup

### Prerequisites
- **Python 3.7+** for Python solutions
- **Node.js 14+** for JavaScript solutions
- **Git** for version control

### Project Structure
```
lld-solutions/
├── docs/                    # Documentation
│   ├── oop.md
│   ├── solid.md  
│   ├── design-patterns.md
│   └── lld-framework.md
├── python/                  # Python solutions
│   ├── parking-lot/
│   │   ├── main.py
│   │   └── README.md
│   └── library-management/
│       ├── main.py
│       └── README.md
├── javascript/              # JavaScript solutions
│   ├── parking-lot/
│   │   ├── main.js
│   │   └── README.md
│   └── library-management/
│       ├── main.js
│       └── README.md
└── README.md
```

## 🤝 Contributing

We welcome contributions! Please:

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/new-problem`)
3. **Follow the existing structure** - Add both Python and JavaScript implementations
4. **Include comprehensive READMEs** with design explanations
5. **Test your code** - Ensure all examples work correctly
6. **Submit a pull request**

### Adding New Problems:
1. Create directories: `python/<problem-name>/` and `javascript/<problem-name>/`
2. Add `main.py`, `main.js`, and `README.md` files
3. Update this main README with the new problem
4. Include working demo code in both implementations

## 📊 Progress Tracker

- **Documentation**: ✅ Complete (4/4 files)
- **Python Solutions**: 🔄 In Progress (2/50 problems) 
- **JavaScript Solutions**: 🔄 In Progress (1/50 problems)
- **Total Implementation**: 6% complete

## 📞 Support

- **Issues**: Report bugs or request features via GitHub Issues
- **Discussions**: Join discussions about design patterns and solutions
- **Wiki**: Additional resources and advanced topics

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Happy Coding!** 🚀 Star ⭐ this repository if you find it helpful for your interview preparation!
