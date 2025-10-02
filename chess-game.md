# Chess Game

## 🔗 Implementation Links
- **Python Implementation**: [python/chess-game/main.py](python/chess-game/main.py)
- **JavaScript Implementation**: [javascript/chess-game/main.js](javascript/chess-game/main.js)

## Problem Statement

Design a complete chess game system that can:

1. **Implement all chess pieces** with their specific movement rules
2. **Validate moves** according to chess rules and current board state
3. **Detect check, checkmate, and stalemate** conditions
4. **Handle special moves** like castling, en passant, and pawn promotion
5. **Track game history** and provide move notation
6. **Support different game modes** (Human vs Human, Human vs AI)

## Key Requirements

### Functional Requirements
- **Piece Movement**: Each piece follows its specific movement rules
- **Move Validation**: Prevent illegal moves and moves that put own king in check
- **Game States**: Track whose turn it is, game status (active, check, checkmate, stalemate)
- **Special Rules**: Implement castling, en passant, pawn promotion
- **Move History**: Record all moves in standard chess notation

### Non-Functional Requirements
- **Performance**: Fast move validation and board evaluation
- **Extensibility**: Easy to add new features like different chess variants
- **Maintainability**: Clean separation of concerns between pieces, board, and game logic

## Design Patterns Used

1. **Strategy Pattern**: Different movement strategies for each piece type
2. **State Pattern**: Game state management (Active, Check, Checkmate, Stalemate)
3. **Command Pattern**: Move operations that can be undone
4. **Factory Pattern**: Creating pieces based on type
5. **Template Method**: Common structure for piece movement validation

## Classes and Relationships

### Core Classes
- `ChessGame`: Main game controller
- `ChessBoard`: Represents the 8x8 chess board
- `Position`: Represents a position on the board (row, col)
- `Move`: Represents a chess move from one position to another
- `Piece` (Abstract): Base class for all chess pieces
- `King`, `Queen`, `Rook`, `Bishop`, `Knight`, `Pawn`: Specific piece implementations
- `Player`: Represents a player (White/Black)
- `GameState`: Enum for game status

### Key Methods
- `is_valid_move(from_pos, to_pos)`: Check if a move is legal
- `make_move(from_pos, to_pos)`: Execute a move
- `is_in_check(color)`: Check if king is in check
- `is_checkmate(color)`: Check for checkmate condition
- `get_all_valid_moves(color)`: Get all possible moves for a color

## Advanced Features

### Move Validation
- Check piece-specific movement rules
- Verify path is clear (for sliding pieces)
- Ensure move doesn't put own king in check
- Handle special cases (castling, en passant)

### Game State Detection
- **Check**: King is under attack but can escape
- **Checkmate**: King is under attack and cannot escape
- **Stalemate**: No legal moves available but king not in check
- **Draw Conditions**: Insufficient material, 50-move rule, threefold repetition

### Special Moves
- **Castling**: King and rook special move
- **En Passant**: Special pawn capture
- **Pawn Promotion**: Pawn reaching end of board becomes another piece

## Extensions

1. **AI Integration**: Minimax algorithm with alpha-beta pruning
2. **Chess Variants**: King of the Hill, Chess960, etc.
3. **Time Control**: Chess clocks and time management
4. **Chess Notation**: PGN (Portable Game Notation) support
5. **Opening Book**: Database of chess openings