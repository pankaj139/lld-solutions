# Scrabble Game

## Problem Statement

Design a Scrabble word game that can:

1. **Validate word placement** on the board with scoring
2. **Implement dictionary checking** for valid words
3. **Manage tile distribution** and player hands
4. **Calculate scores** with premium squares and bonuses
5. **Support multiple players** with turn-based gameplay

## Key Requirements

### Functional Requirements
- **Board Management**: 15x15 grid with premium squares (double/triple letter/word)
- **Word Validation**: Dictionary lookup and board placement rules
- **Tile Management**: Bag of tiles with letter distribution and point values
- **Score Calculation**: Base points plus premium square bonuses
- **Turn Management**: Player rotation and move validation

### Non-Functional Requirements
- **Performance**: Fast dictionary lookups for word validation
- **Accuracy**: Correct score calculation with all bonuses
- **Extensibility**: Support for different languages and dictionaries

## Design Patterns Used

1. **Strategy Pattern**: Word validation and scoring strategies
2. **Factory Pattern**: Tile creation with proper distribution
3. **Observer Pattern**: Score updates and game progress
4. **Command Pattern**: Move placement with validation

## Extensions

1. **AI Players**: Strategic word placement algorithms
2. **Different Languages**: Multi-language dictionary support
3. **Custom Boards**: Alternative board layouts and sizes
4. **Online Play**: Network multiplayer with matchmaking