# Snake Game

## Problem Statement

Design a real-time snake game that can:

1. **Implement smooth snake movement** in four directions
2. **Handle food generation** and collision detection
3. **Manage game speed** and difficulty progression
4. **Track high scores** and provide game statistics
5. **Support different game modes** and power-ups

## Key Requirements

### Functional Requirements
- **Real-time Movement**: Continuous snake movement with direction changes
- **Collision Detection**: Wall collisions and self-collision
- **Food System**: Random food placement and consumption
- **Score System**: Points based on food eaten and game duration
- **Speed Progression**: Increasing difficulty over time

### Non-Functional Requirements
- **Performance**: Smooth 60 FPS gameplay
- **Responsiveness**: Immediate response to direction changes
- **Scalability**: Support for different board sizes

## Design Patterns Used

1. **Observer Pattern**: Score and status updates
2. **State Pattern**: Game states (Playing, Paused, Game Over)
3. **Command Pattern**: Direction change commands
4. **Strategy Pattern**: Different food generation strategies

## Extensions

1. **Power-ups**: Special foods with temporary effects
2. **Multiplayer**: Multiple snakes on same board
3. **Obstacles**: Static barriers on the game board
4. **Themes**: Different visual styles and environments