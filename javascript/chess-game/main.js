/**
 * Chess Game Implementation in JavaScript
 * =======================================
 * 
 * This implementation demonstrates:
 * - Strategy Pattern: Different piece movement strategies
 * - State Pattern: Game state management
 * - Command Pattern: Move operations
 * - Factory Pattern: Piece creation
 * - Template Method: Common move validation structure
 */

// Enums using JavaScript objects
const Color = {
    WHITE: 'white',
    BLACK: 'black'
};

const PieceType = {
    KING: 'king',
    QUEEN: 'queen',
    ROOK: 'rook',
    BISHOP: 'bishop',
    KNIGHT: 'knight',
    PAWN: 'pawn'
};

const GameStatus = {
    ACTIVE: 'active',
    CHECK: 'check',
    CHECKMATE: 'checkmate',
    STALEMATE: 'stalemate',
    DRAW: 'draw'
};

// Make enums immutable
Object.freeze(Color);
Object.freeze(PieceType);
Object.freeze(GameStatus);


class Position {
    constructor(row, col) {
        this.row = row;
        this.col = col;
    }
    
    equals(other) {
        return this.row === other.row && this.col === other.col;
    }
    
    toString() {
        return `${String.fromCharCode(97 + this.col)}${8 - this.row}`;
    }
    
    isValid() {
        return this.row >= 0 && this.row < 8 && this.col >= 0 && this.col < 8;
    }
}


class Move {
    constructor(fromPos, toPos, capturedPiece = null, isCastling = false, isEnPassant = false, promotionPiece = null) {
        this.fromPos = fromPos;
        this.toPos = toPos;
        this.capturedPiece = capturedPiece;
        this.isCastling = isCastling;
        this.isEnPassant = isEnPassant;
        this.promotionPiece = promotionPiece;
    }
    
    toString() {
        return `${this.fromPos} -> ${this.toPos}`;
    }
}


class Piece {
    constructor(color, position) {
        this.color = color;
        this.position = position;
        this.hasMoved = false;
        this.pieceType = null;
    }
    
    // Abstract method - to be implemented by subclasses
    getPossibleMoves(board) {
        throw new Error('getPossibleMoves must be implemented by subclass');
    }
    
    isMoveValid(toPos, board) {
        return this.getPossibleMoves(board).some(pos => pos.equals(toPos));
    }
    
    toString() {
        const colorSymbol = this.color === Color.WHITE ? 'W' : 'B';
        return `${colorSymbol}${this.pieceType.charAt(0).toUpperCase()}`;
    }
}


class King extends Piece {
    constructor(color, position) {
        super(color, position);
        this.pieceType = PieceType.KING;
    }
    
    getPossibleMoves(board) {
        const moves = [];
        const directions = [[0, 1], [1, 0], [0, -1], [-1, 0], 
                           [1, 1], [1, -1], [-1, 1], [-1, -1]];
        
        for (const [dr, dc] of directions) {
            const newRow = this.position.row + dr;
            const newCol = this.position.col + dc;
            const newPos = new Position(newRow, newCol);
            
            if (newPos.isValid()) {
                const targetPiece = board.getPiece(newPos);
                if (!targetPiece || targetPiece.color !== this.color) {
                    moves.push(newPos);
                }
            }
        }
        
        // Add castling moves
        moves.push(...this._getCastlingMoves(board));
        return moves;
    }
    
    _getCastlingMoves(board) {
        if (this.hasMoved) return [];
        
        const moves = [];
        const row = this.position.row;
        
        // Kingside castling
        if (this._canCastleKingside(board)) {
            moves.push(new Position(row, 6));
        }
        
        // Queenside castling
        if (this._canCastleQueenside(board)) {
            moves.push(new Position(row, 2));
        }
        
        return moves;
    }
    
    _canCastleKingside(board) {
        const row = this.position.row;
        const rook = board.getPiece(new Position(row, 7));
        
        if (!rook || rook.pieceType !== PieceType.ROOK || rook.hasMoved) {
            return false;
        }
        
        // Check if squares between king and rook are empty
        for (const col of [5, 6]) {
            if (board.getPiece(new Position(row, col))) {
                return false;
            }
        }
        
        return true;
    }
    
    _canCastleQueenside(board) {
        const row = this.position.row;
        const rook = board.getPiece(new Position(row, 0));
        
        if (!rook || rook.pieceType !== PieceType.ROOK || rook.hasMoved) {
            return false;
        }
        
        // Check if squares between king and rook are empty
        for (const col of [1, 2, 3]) {
            if (board.getPiece(new Position(row, col))) {
                return false;
            }
        }
        
        return true;
    }
}


class Queen extends Piece {
    constructor(color, position) {
        super(color, position);
        this.pieceType = PieceType.QUEEN;
    }
    
    getPossibleMoves(board) {
        const moves = [];
        const directions = [[0, 1], [1, 0], [0, -1], [-1, 0], 
                           [1, 1], [1, -1], [-1, 1], [-1, -1]];
        
        for (const [dr, dc] of directions) {
            for (let i = 1; i < 8; i++) {
                const newRow = this.position.row + dr * i;
                const newCol = this.position.col + dc * i;
                const newPos = new Position(newRow, newCol);
                
                if (!newPos.isValid()) break;
                
                const targetPiece = board.getPiece(newPos);
                if (!targetPiece) {
                    moves.push(newPos);
                } else if (targetPiece.color !== this.color) {
                    moves.push(newPos);
                    break;
                } else {
                    break;
                }
            }
        }
        
        return moves;
    }
}


class Rook extends Piece {
    constructor(color, position) {
        super(color, position);
        this.pieceType = PieceType.ROOK;
    }
    
    getPossibleMoves(board) {
        const moves = [];
        const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
        
        for (const [dr, dc] of directions) {
            for (let i = 1; i < 8; i++) {
                const newRow = this.position.row + dr * i;
                const newCol = this.position.col + dc * i;
                const newPos = new Position(newRow, newCol);
                
                if (!newPos.isValid()) break;
                
                const targetPiece = board.getPiece(newPos);
                if (!targetPiece) {
                    moves.push(newPos);
                } else if (targetPiece.color !== this.color) {
                    moves.push(newPos);
                    break;
                } else {
                    break;
                }
            }
        }
        
        return moves;
    }
}


class Bishop extends Piece {
    constructor(color, position) {
        super(color, position);
        this.pieceType = PieceType.BISHOP;
    }
    
    getPossibleMoves(board) {
        const moves = [];
        const directions = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
        
        for (const [dr, dc] of directions) {
            for (let i = 1; i < 8; i++) {
                const newRow = this.position.row + dr * i;
                const newCol = this.position.col + dc * i;
                const newPos = new Position(newRow, newCol);
                
                if (!newPos.isValid()) break;
                
                const targetPiece = board.getPiece(newPos);
                if (!targetPiece) {
                    moves.push(newPos);
                } else if (targetPiece.color !== this.color) {
                    moves.push(newPos);
                    break;
                } else {
                    break;
                }
            }
        }
        
        return moves;
    }
}


class Knight extends Piece {
    constructor(color, position) {
        super(color, position);
        this.pieceType = PieceType.KNIGHT;
    }
    
    getPossibleMoves(board) {
        const moves = [];
        const knightMoves = [[2, 1], [2, -1], [-2, 1], [-2, -1],
                            [1, 2], [1, -2], [-1, 2], [-1, -2]];
        
        for (const [dr, dc] of knightMoves) {
            const newRow = this.position.row + dr;
            const newCol = this.position.col + dc;
            const newPos = new Position(newRow, newCol);
            
            if (newPos.isValid()) {
                const targetPiece = board.getPiece(newPos);
                if (!targetPiece || targetPiece.color !== this.color) {
                    moves.push(newPos);
                }
            }
        }
        
        return moves;
    }
}


class Pawn extends Piece {
    constructor(color, position) {
        super(color, position);
        this.pieceType = PieceType.PAWN;
    }
    
    getPossibleMoves(board) {
        const moves = [];
        const direction = this.color === Color.WHITE ? -1 : 1;
        
        // Forward moves
        const newRow = this.position.row + direction;
        if (newRow >= 0 && newRow < 8) {
            const forwardPos = new Position(newRow, this.position.col);
            if (!board.getPiece(forwardPos)) {
                moves.push(forwardPos);
                
                // Double move from starting position
                if (!this.hasMoved) {
                    const doubleMovePos = new Position(newRow + direction, this.position.col);
                    if (doubleMovePos.row >= 0 && doubleMovePos.row < 8 && !board.getPiece(doubleMovePos)) {
                        moves.push(doubleMovePos);
                    }
                }
            }
        }
        
        // Capture moves
        for (const dc of [-1, 1]) {
            const newCol = this.position.col + dc;
            if (newCol >= 0 && newCol < 8) {
                const capturePos = new Position(this.position.row + direction, newCol);
                if (capturePos.isValid()) {
                    const targetPiece = board.getPiece(capturePos);
                    if (targetPiece && targetPiece.color !== this.color) {
                        moves.push(capturePos);
                    }
                }
            }
        }
        
        return moves;
    }
}


class PieceFactory {
    static createPiece(pieceType, color, position) {
        const pieceMap = {
            [PieceType.KING]: King,
            [PieceType.QUEEN]: Queen,
            [PieceType.ROOK]: Rook,
            [PieceType.BISHOP]: Bishop,
            [PieceType.KNIGHT]: Knight,
            [PieceType.PAWN]: Pawn
        };
        
        const PieceClass = pieceMap[pieceType];
        return new PieceClass(color, position);
    }
}


class ChessBoard {
    constructor() {
        this.board = Array(8).fill(null).map(() => Array(8).fill(null));
        this._initializeBoard();
    }
    
    _initializeBoard() {
        // Place pawns
        for (let col = 0; col < 8; col++) {
            this.board[1][col] = PieceFactory.createPiece(PieceType.PAWN, Color.BLACK, new Position(1, col));
            this.board[6][col] = PieceFactory.createPiece(PieceType.PAWN, Color.WHITE, new Position(6, col));
        }
        
        // Place other pieces
        const pieceOrder = [PieceType.ROOK, PieceType.KNIGHT, PieceType.BISHOP, PieceType.QUEEN,
                           PieceType.KING, PieceType.BISHOP, PieceType.KNIGHT, PieceType.ROOK];
        
        for (let col = 0; col < 8; col++) {
            this.board[0][col] = PieceFactory.createPiece(pieceOrder[col], Color.BLACK, new Position(0, col));
            this.board[7][col] = PieceFactory.createPiece(pieceOrder[col], Color.WHITE, new Position(7, col));
        }
    }
    
    getPiece(position) {
        if (position.isValid()) {
            return this.board[position.row][position.col];
        }
        return null;
    }
    
    movePiece(fromPos, toPos) {
        const piece = this.getPiece(fromPos);
        const capturedPiece = this.getPiece(toPos);
        
        if (piece) {
            // Update piece position
            piece.position = toPos;
            piece.hasMoved = true;
            
            // Move piece on board
            this.board[toPos.row][toPos.col] = piece;
            this.board[fromPos.row][fromPos.col] = null;
        }
        
        return new Move(fromPos, toPos, capturedPiece);
    }
    
    getKingPosition(color) {
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && piece.pieceType === PieceType.KING && piece.color === color) {
                    return new Position(row, col);
                }
            }
        }
        return null;
    }
    
    isSquareAttacked(position, byColor) {
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && piece.color === byColor) {
                    if (piece.getPossibleMoves(this).some(pos => pos.equals(position))) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
    
    clone() {
        const newBoard = new ChessBoard();
        newBoard.board = this.board.map(row => 
            row.map(piece => {
                if (!piece) return null;
                const newPiece = PieceFactory.createPiece(piece.pieceType, piece.color, new Position(piece.position.row, piece.position.col));
                newPiece.hasMoved = piece.hasMoved;
                return newPiece;
            })
        );
        return newBoard;
    }
    
    display() {
        console.log("   a b c d e f g h");
        console.log("  ----------------");
        for (let row = 0; row < 8; row++) {
            let rowStr = `${8-row}|`;
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece) {
                    rowStr += `${piece.toString()} `;
                } else {
                    rowStr += ".. ";
                }
            }
            rowStr += `|${8-row}`;
            console.log(rowStr);
        }
        console.log("  ----------------");
        console.log("   a b c d e f g h");
    }
}


class ChessGame {
    constructor() {
        this.board = new ChessBoard();
        this.currentPlayer = Color.WHITE;
        this.gameStatus = GameStatus.ACTIVE;
        this.moveHistory = [];
    }
    
    isValidMove(fromPos, toPos) {
        const piece = this.board.getPiece(fromPos);
        
        if (!piece) return false;
        if (piece.color !== this.currentPlayer) return false;
        if (!piece.isMoveValid(toPos, this.board)) return false;
        
        // Check if move puts own king in check
        return !this._wouldBeInCheckAfterMove(fromPos, toPos);
    }
    
    makeMove(fromPos, toPos) {
        if (!this.isValidMove(fromPos, toPos)) {
            return false;
        }
        
        const move = this.board.movePiece(fromPos, toPos);
        this.moveHistory.push(move);
        
        // Update game status
        this._updateGameStatus();
        
        // Switch players
        this.currentPlayer = this.currentPlayer === Color.WHITE ? Color.BLACK : Color.WHITE;
        
        return true;
    }
    
    _wouldBeInCheckAfterMove(fromPos, toPos) {
        // Create a copy of the board and make the move
        const boardCopy = this.board.clone();
        const piece = boardCopy.getPiece(fromPos);
        
        if (piece) {
            boardCopy.movePiece(fromPos, toPos);
            const kingPos = boardCopy.getKingPosition(this.currentPlayer);
            if (kingPos) {
                const opponentColor = this.currentPlayer === Color.WHITE ? Color.BLACK : Color.WHITE;
                return boardCopy.isSquareAttacked(kingPos, opponentColor);
            }
        }
        
        return false;
    }
    
    isInCheck(color) {
        const kingPos = this.board.getKingPosition(color);
        if (kingPos) {
            const opponentColor = color === Color.WHITE ? Color.BLACK : Color.WHITE;
            return this.board.isSquareAttacked(kingPos, opponentColor);
        }
        return false;
    }
    
    getAllValidMoves(color) {
        const validMoves = [];
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board.getPiece(new Position(row, col));
                if (piece && piece.color === color) {
                    for (const move of piece.getPossibleMoves(this.board)) {
                        if (!this._wouldBeInCheckAfterMove(piece.position, move)) {
                            validMoves.push([piece.position, move]);
                        }
                    }
                }
            }
        }
        
        return validMoves;
    }
    
    _updateGameStatus() {
        const opponentColor = this.currentPlayer === Color.WHITE ? Color.BLACK : Color.WHITE;
        
        if (this.isInCheck(opponentColor)) {
            if (this.getAllValidMoves(opponentColor).length === 0) {
                this.gameStatus = GameStatus.CHECKMATE;
            } else {
                this.gameStatus = GameStatus.CHECK;
            }
        } else if (this.getAllValidMoves(opponentColor).length === 0) {
            this.gameStatus = GameStatus.STALEMATE;
        } else {
            this.gameStatus = GameStatus.ACTIVE;
        }
    }
    
    displayBoard() {
        this.board.display();
        console.log(`Current player: ${this.currentPlayer}`);
        console.log(`Game status: ${this.gameStatus}`);
    }
}


function demoChessGame() {
    console.log("=== Chess Game Demo ===\n");
    
    const game = new ChessGame();
    
    // Display initial board
    console.log("Initial board position:");
    game.displayBoard();
    console.log();
    
    // Make some opening moves
    const moves = [
        // Scholar's Mate attempt
        [new Position(6, 4), new Position(4, 4)],  // e2-e4
        [new Position(1, 4), new Position(3, 4)],  // e7-e5
        [new Position(7, 5), new Position(4, 2)],  // Bf1-c4
        [new Position(0, 1), new Position(2, 2)],  // Nb8-c6
        [new Position(7, 3), new Position(3, 7)],  // Qd1-h5
        [new Position(0, 6), new Position(2, 5)],  // Ng8-f6
    ];
    
    console.log("Playing some moves:");
    for (let i = 0; i < moves.length; i++) {
        const [fromPos, toPos] = moves[i];
        console.log(`\nMove ${i+1}: ${fromPos} -> ${toPos}`);
        
        if (game.makeMove(fromPos, toPos)) {
            console.log("✓ Move successful");
            game.displayBoard();
            
            if (game.gameStatus !== GameStatus.ACTIVE) {
                console.log(`Game ended: ${game.gameStatus}`);
                break;
            }
        } else {
            console.log("✗ Invalid move");
        }
    }
    
    // Show some game statistics
    console.log(`\nTotal moves played: ${game.moveHistory.length}`);
    console.log(`Final game status: ${game.gameStatus}`);
    
    // Test move validation
    console.log("\n=== Move Validation Tests ===");
    console.log("Testing invalid moves:");
    
    // Try to move opponent's piece
    const invalidMove = [new Position(1, 0), new Position(3, 0)];
    console.log(`Trying to move opponent's piece ${invalidMove[0]} -> ${invalidMove[1]}: `, 
                !game.isValidMove(invalidMove[0], invalidMove[1]) ? "✗ Invalid" : "✓ Valid");
    
    // Try to move to invalid position
    const knightPos = new Position(7, 1);  // White knight
    const invalidTarget = new Position(5, 5);  // Invalid knight move
    console.log(`Trying invalid knight move ${knightPos} -> ${invalidTarget}: `,
                !game.isValidMove(knightPos, invalidTarget) ? "✗ Invalid" : "✓ Valid");
}

// Generate UUID for unique identifiers
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Export for Node.js compatibility
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ChessGame,
        ChessBoard,
        Position,
        Move,
        Color,
        PieceType,
        GameStatus,
        demoChessGame
    };
}

// Run demo if this file is executed directly
if (typeof require !== 'undefined' && require.main === module) {
    demoChessGame();
}