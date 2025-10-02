# Poker Game

## 🔗 Implementation Links
- **Python Implementation**: [python/poker-game/main.py](python/poker-game/main.py)
- **JavaScript Implementation**: [javascript/poker-game/main.js](javascript/poker-game/main.js)

## Problem Statement

Design a Texas Hold'em poker game that can:

1. **Implement complete poker hand rankings** and evaluation
2. **Manage betting rounds** with different player actions
3. **Handle pot management** including side pots for all-in scenarios
4. **Support multiple players** with position-based play
5. **Implement tournament structures** and blind management

## Key Requirements

### Functional Requirements
- **Hand Evaluation**: Determine hand strength from 7 cards (2 hole + 5 community)
- **Betting System**: Call, raise, fold, check, all-in actions
- **Pot Management**: Main pot and side pots for complex scenarios
- **Position Management**: Dealer button rotation and blind posting
- **Game Phases**: Pre-flop, flop, turn, river betting rounds

### Non-Functional Requirements
- **Accuracy**: Correct hand evaluation and pot distribution
- **Performance**: Fast hand comparisons for multiple players
- **Fairness**: Proper card shuffling and dealing

## Design Patterns Used

1. **Strategy Pattern**: Different betting strategies and hand evaluation
2. **State Pattern**: Game phase management (pre-flop, flop, turn, river)
3. **Factory Pattern**: Creating different types of poker hands
4. **Observer Pattern**: Pot updates and player notifications

## Extensions

1. **AI Players**: Intelligent betting strategies
2. **Tournament Mode**: Blinds structure and elimination
3. **Different Variants**: Omaha, Seven Card Stud, etc.
4. **Statistics Tracking**: Player performance analytics