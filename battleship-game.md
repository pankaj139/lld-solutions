# Battleship Game

## 🔗 Implementation Links
- **Python Implementation**: [python/battleship-game/main.py](python/battleship-game/main.py)
- **JavaScript Implementation**: [javascript/battleship-game/main.js](javascript/battleship-game/main.js)

## Problem Statement

Design a Battleship naval strategy game that can:

1. **Implement ship placement** with size and orientation constraints
2. **Handle attack coordination** and hit/miss tracking
3. **Implement intelligent AI** with probabilistic targeting
4. **Manage game progression** until all ships are sunk
5. **Support different board sizes** and ship configurations

## Key Requirements

### Functional Requirements
- **Ship Placement**: Various ship sizes placed horizontally or vertically
- **Attack System**: Coordinate-based attacks with hit/miss feedback
- **Game State**: Track ship health and overall game progress
- **AI Strategy**: Intelligent targeting after finding hits
- **Victory Conditions**: Game ends when all ships of a player are sunk

### Non-Functional Requirements
- **Performance**: Fast AI decision making
- **User Experience**: Clear visual feedback for attacks
- **Flexibility**: Configurable board sizes and ship types

## Design Patterns Used

1. **Strategy Pattern**: Different AI attack strategies
2. **State Pattern**: Ship states (intact, hit, sunk)
3. **Observer Pattern**: Attack result notifications
4. **Factory Pattern**: Ship creation with different types

## Extensions

1. **Advanced AI**: Machine learning for optimal strategies
2. **Custom Ships**: User-defined ship shapes and sizes
3. **Power-ups**: Special attacks and defensive abilities
4. **Team Play**: Multi-player team-based battles