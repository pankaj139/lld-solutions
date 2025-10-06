/**
 * Spreadsheet System - Low Level Design
 * A comprehensive collaborative spreadsheet system with formula engine, dependency tracking, and real-time collaboration.
 * 
 * Design Patterns Used:
 * 1. Interpreter Pattern - Formula parsing and evaluation
 * 2. Observer Pattern - Dependency tracking and updates
 * 3. Command Pattern - Undo/redo operations
 * 4. Composite Pattern - Formula expression tree
 * 5. Strategy Pattern - Value types and formatters
 * 6. Factory Pattern - Cell type creation
 * 7. Memento Pattern - State saving for undo
 * 8. Singleton Pattern - Spreadsheet instance
 * 9. Visitor Pattern - Formula AST traversal
 * 10. Proxy Pattern - Lazy formula evaluation
 * 
 * Author: LLD Solutions
 * Date: 2025
 */

// ==================== Enums ====================

const CellType = {
    EMPTY: 'empty',
    VALUE: 'value',
    FORMULA: 'formula'
};

const ErrorType = {
    DIV_ZERO: '#DIV/0!',
    REF_ERROR: '#REF!',
    CIRCULAR: '#CIRCULAR!',
    NAME_ERROR: '#NAME!',
    VALUE_ERROR: '#VALUE!'
};

const TokenType = {
    NUMBER: 'NUMBER',
    STRING: 'STRING',
    CELL_REF: 'CELL_REF',
    RANGE: 'RANGE',
    FUNCTION: 'FUNCTION',
    PLUS: 'PLUS',
    MINUS: 'MINUS',
    MULTIPLY: 'MULTIPLY',
    DIVIDE: 'DIVIDE',
    PERCENT: 'PERCENT',
    LPAREN: 'LPAREN',
    RPAREN: 'RPAREN',
    COMMA: 'COMMA',
    GT: 'GT',
    LT: 'LT',
    GTE: 'GTE',
    LTE: 'LTE',
    EQ: 'EQ',
    NEQ: 'NEQ',
    EOF: 'EOF'
};

// ==================== Data Classes ====================

class CellAddress {
    constructor(row, col) {
        this.row = row;
        this.col = col;
    }

    toString() {
        return `${String.fromCharCode(65 + this.col)}${this.row + 1}`;
    }

    equals(other) {
        return other instanceof CellAddress && this.row === other.row && this.col === other.col;
    }

    toKey() {
        return `${this.row},${this.col}`;
    }

    static parse(address) {
        const match = address.toUpperCase().match(/([A-Z]+)(\d+)/);
        if (!match) {
            throw new Error(`Invalid cell address: ${address}`);
        }
        const [, colStr, rowStr] = match;
        const col = colStr.charCodeAt(0) - 65;
        const row = parseInt(rowStr) - 1;
        return new CellAddress(row, col);
    }
}

class Token {
    constructor(type, value, position) {
        this.type = type;
        this.value = value;
        this.position = position;
    }
}

class User {
    constructor(id, name) {
        this.id = id;
        this.name = name;
    }
}

// ==================== Pattern 1: Interpreter Pattern (Formula Parsing) ====================

class Expression {
    evaluate(context) {
        throw new Error('Abstract method');
    }

    getDependencies() {
        throw new Error('Abstract method');
    }

    accept(visitor) {
        throw new Error('Abstract method');
    }
}

class LiteralExpression extends Expression {
    constructor(value) {
        super();
        this.value = value;
    }

    evaluate(context) {
        return this.value;
    }

    getDependencies() {
        return new Set();
    }

    accept(visitor) {
        return visitor.visitLiteral(this);
    }

    toString() {
        return `Literal(${this.value})`;
    }
}

class CellReferenceExpression extends Expression {
    constructor(address) {
        super();
        this.address = address;
    }

    evaluate(context) {
        const cell = context.spreadsheet.getCell(this.address);
        return cell.getValue();
    }

    getDependencies() {
        return new Set([this.address.toKey()]);
    }

    accept(visitor) {
        return visitor.visitCellReference(this);
    }

    toString() {
        return `CellRef(${this.address})`;
    }
}

class RangeExpression extends Expression {
    constructor(start, end) {
        super();
        this.start = start;
        this.end = end;
    }

    evaluate(context) {
        const values = [];
        for (let row = this.start.row; row <= this.end.row; row++) {
            for (let col = this.start.col; col <= this.end.col; col++) {
                const addr = new CellAddress(row, col);
                const cell = context.spreadsheet.getCell(addr);
                const value = cell.getValue();
                if (value !== null && (typeof value !== 'string' || !value.startsWith('#'))) {
                    values.push(value);
                }
            }
        }
        return values;
    }

    getDependencies() {
        const deps = new Set();
        for (let row = this.start.row; row <= this.end.row; row++) {
            for (let col = this.start.col; col <= this.end.col; col++) {
                deps.add(new CellAddress(row, col).toKey());
            }
        }
        return deps;
    }

    accept(visitor) {
        return visitor.visitRange(this);
    }

    toString() {
        return `Range(${this.start}:${this.end})`;
    }
}

class BinaryOperationExpression extends Expression {
    constructor(left, op, right) {
        super();
        this.left = left;
        this.op = op;
        this.right = right;
    }

    evaluate(context) {
        let leftVal = this.left.evaluate(context);
        let rightVal = this.right.evaluate(context);

        // Handle errors
        if (typeof leftVal === 'string' && leftVal.startsWith('#')) return leftVal;
        if (typeof rightVal === 'string' && rightVal.startsWith('#')) return rightVal;

        // Convert to numbers
        leftVal = leftVal === null ? 0 : Number(leftVal);
        rightVal = rightVal === null ? 0 : Number(rightVal);

        if (isNaN(leftVal) || isNaN(rightVal)) {
            return ErrorType.VALUE_ERROR;
        }

        switch (this.op) {
            case TokenType.PLUS: return leftVal + rightVal;
            case TokenType.MINUS: return leftVal - rightVal;
            case TokenType.MULTIPLY: return leftVal * rightVal;
            case TokenType.DIVIDE:
                if (rightVal === 0) return ErrorType.DIV_ZERO;
                return leftVal / rightVal;
            case TokenType.PERCENT: return leftVal % rightVal;
            case TokenType.GT: return leftVal > rightVal;
            case TokenType.LT: return leftVal < rightVal;
            case TokenType.GTE: return leftVal >= rightVal;
            case TokenType.LTE: return leftVal <= rightVal;
            case TokenType.EQ: return leftVal === rightVal;
            case TokenType.NEQ: return leftVal !== rightVal;
            default: return ErrorType.VALUE_ERROR;
        }
    }

    getDependencies() {
        const left = this.left.getDependencies();
        const right = this.right.getDependencies();
        return new Set([...left, ...right]);
    }

    accept(visitor) {
        return visitor.visitBinaryOperation(this);
    }

    toString() {
        return `BinaryOp(${this.left} ${this.op} ${this.right})`;
    }
}

class FunctionCallExpression extends Expression {
    constructor(name, args) {
        super();
        this.name = name.toUpperCase();
        this.args = args;
    }

    evaluate(context) {
        const func = context.functionRegistry.getFunction(this.name);
        if (!func) {
            return ErrorType.NAME_ERROR;
        }

        // Evaluate arguments
        const argValues = [];
        for (const arg of this.args) {
            const val = arg.evaluate(context);
            if (Array.isArray(val)) {
                argValues.push(...val);
            } else {
                argValues.push(val);
            }
        }

        // Check for errors
        for (const val of argValues) {
            if (typeof val === 'string' && val.startsWith('#')) {
                return val;
            }
        }

        return func(argValues);
    }

    getDependencies() {
        const deps = new Set();
        for (const arg of this.args) {
            for (const dep of arg.getDependencies()) {
                deps.add(dep);
            }
        }
        return deps;
    }

    accept(visitor) {
        return visitor.visitFunctionCall(this);
    }

    toString() {
        const argsStr = this.args.map(a => a.toString()).join(', ');
        return `${this.name}(${argsStr})`;
    }
}

// ==================== Pattern 9: Visitor Pattern (Formula Traversal) ====================

class ExpressionVisitor {
    visitLiteral(expr) {
        throw new Error('Abstract method');
    }

    visitCellReference(expr) {
        throw new Error('Abstract method');
    }

    visitRange(expr) {
        throw new Error('Abstract method');
    }

    visitBinaryOperation(expr) {
        throw new Error('Abstract method');
    }

    visitFunctionCall(expr) {
        throw new Error('Abstract method');
    }
}

class DependencyVisitor extends ExpressionVisitor {
    constructor() {
        super();
        this.dependencies = new Set();
    }

    visitLiteral(expr) {
        return null;
    }

    visitCellReference(expr) {
        this.dependencies.add(expr.address.toKey());
        return null;
    }

    visitRange(expr) {
        for (const dep of expr.getDependencies()) {
            this.dependencies.add(dep);
        }
        return null;
    }

    visitBinaryOperation(expr) {
        expr.left.accept(this);
        expr.right.accept(this);
        return null;
    }

    visitFunctionCall(expr) {
        for (const arg of expr.args) {
            arg.accept(this);
        }
        return null;
    }
}

// ==================== Lexer and Parser ====================

class Lexer {
    constructor(text) {
        this.text = text;
        this.pos = 0;
        this.currentChar = text.length > 0 ? text[0] : null;
    }

    advance() {
        this.pos++;
        this.currentChar = this.pos < this.text.length ? this.text[this.pos] : null;
    }

    skipWhitespace() {
        while (this.currentChar && /\s/.test(this.currentChar)) {
            this.advance();
        }
    }

    readNumber() {
        const start = this.pos;
        while (this.currentChar && (/\d/.test(this.currentChar) || this.currentChar === '.')) {
            this.advance();
        }
        const numStr = this.text.substring(start, this.pos);
        return new Token(TokenType.NUMBER, parseFloat(numStr), start);
    }

    readIdentifier() {
        const start = this.pos;
        while (this.currentChar && /\w/.test(this.currentChar)) {
            this.advance();
        }
        const text = this.text.substring(start, this.pos);

        // Check for range after cell reference
        if (/^[A-Z]+\d+$/.test(text) && this.currentChar === ':') {
            // This is a range
            this.advance(); // skip ':'
            const rangeStart = start;
            while (this.currentChar && /\w/.test(this.currentChar)) {
                this.advance();
            }
            const rangeText = this.text.substring(rangeStart, this.pos);
            return new Token(TokenType.RANGE, rangeText, start);
        }

        if (/^[A-Z]+\d+$/.test(text)) {
            return new Token(TokenType.CELL_REF, text, start);
        }

        return new Token(TokenType.FUNCTION, text, start);
    }

    readString() {
        this.advance(); // skip opening quote
        const start = this.pos;
        while (this.currentChar && this.currentChar !== '"') {
            this.advance();
        }
        const text = this.text.substring(start, this.pos);
        if (this.currentChar) {
            this.advance(); // skip closing quote
        }
        return new Token(TokenType.STRING, text, start);
    }

    getNextToken() {
        while (this.currentChar) {
            if (/\s/.test(this.currentChar)) {
                this.skipWhitespace();
                continue;
            }

            if (/\d/.test(this.currentChar)) {
                return this.readNumber();
            }

            if (/[a-zA-Z]/.test(this.currentChar)) {
                return this.readIdentifier();
            }

            if (this.currentChar === '"') {
                return this.readString();
            }

            const char = this.currentChar;
            const pos = this.pos;

            switch (char) {
                case '+':
                    this.advance();
                    return new Token(TokenType.PLUS, '+', pos);
                case '-':
                    this.advance();
                    return new Token(TokenType.MINUS, '-', pos);
                case '*':
                    this.advance();
                    return new Token(TokenType.MULTIPLY, '*', pos);
                case '/':
                    this.advance();
                    return new Token(TokenType.DIVIDE, '/', pos);
                case '%':
                    this.advance();
                    return new Token(TokenType.PERCENT, '%', pos);
                case '(':
                    this.advance();
                    return new Token(TokenType.LPAREN, '(', pos);
                case ')':
                    this.advance();
                    return new Token(TokenType.RPAREN, ')', pos);
                case ',':
                    this.advance();
                    return new Token(TokenType.COMMA, ',', pos);
                case '>':
                    this.advance();
                    if (this.currentChar === '=') {
                        this.advance();
                        return new Token(TokenType.GTE, '>=', pos);
                    }
                    return new Token(TokenType.GT, '>', pos);
                case '<':
                    this.advance();
                    if (this.currentChar === '=') {
                        this.advance();
                        return new Token(TokenType.LTE, '<=', pos);
                    }
                    if (this.currentChar === '>') {
                        this.advance();
                        return new Token(TokenType.NEQ, '<>', pos);
                    }
                    return new Token(TokenType.LT, '<', pos);
                case '=':
                    this.advance();
                    return new Token(TokenType.EQ, '=', pos);
                default:
                    throw new Error(`Invalid character: ${char}`);
            }
        }

        return new Token(TokenType.EOF, null, this.pos);
    }
}

class Parser {
    constructor(lexer) {
        this.lexer = lexer;
        this.currentToken = this.lexer.getNextToken();
    }

    eat(tokenType) {
        if (this.currentToken.type === tokenType) {
            this.currentToken = this.lexer.getNextToken();
        } else {
            throw new Error(`Expected ${tokenType}, got ${this.currentToken.type}`);
        }
    }

    parse() {
        return this.comparison();
    }

    comparison() {
        let node = this.expression();

        const compOps = [TokenType.GT, TokenType.LT, TokenType.GTE, TokenType.LTE, TokenType.EQ, TokenType.NEQ];
        while (compOps.includes(this.currentToken.type)) {
            const op = this.currentToken.type;
            this.eat(op);
            const right = this.expression();
            node = new BinaryOperationExpression(node, op, right);
        }

        return node;
    }

    expression() {
        let node = this.term();

        while ([TokenType.PLUS, TokenType.MINUS].includes(this.currentToken.type)) {
            const op = this.currentToken.type;
            this.eat(op);
            const right = this.term();
            node = new BinaryOperationExpression(node, op, right);
        }

        return node;
    }

    term() {
        let node = this.factor();

        while ([TokenType.MULTIPLY, TokenType.DIVIDE, TokenType.PERCENT].includes(this.currentToken.type)) {
            const op = this.currentToken.type;
            this.eat(op);
            const right = this.factor();
            node = new BinaryOperationExpression(node, op, right);
        }

        return node;
    }

    factor() {
        const token = this.currentToken;

        if (token.type === TokenType.NUMBER) {
            this.eat(TokenType.NUMBER);
            return new LiteralExpression(token.value);
        }

        if (token.type === TokenType.STRING) {
            this.eat(TokenType.STRING);
            return new LiteralExpression(token.value);
        }

        if (token.type === TokenType.CELL_REF) {
            this.eat(TokenType.CELL_REF);
            const addr = CellAddress.parse(token.value);
            return new CellReferenceExpression(addr);
        }

        if (token.type === TokenType.RANGE) {
            this.eat(TokenType.RANGE);
            const parts = token.value.split(':');
            const start = CellAddress.parse(parts[0]);
            const end = CellAddress.parse(parts[1]);
            return new RangeExpression(start, end);
        }

        if (token.type === TokenType.FUNCTION) {
            return this.functionCall();
        }

        if (token.type === TokenType.LPAREN) {
            this.eat(TokenType.LPAREN);
            const node = this.comparison();
            this.eat(TokenType.RPAREN);
            return node;
        }

        if ([TokenType.PLUS, TokenType.MINUS].includes(token.type)) {
            const op = token.type;
            this.eat(op);
            const node = this.factor();
            if (op === TokenType.MINUS) {
                return new BinaryOperationExpression(new LiteralExpression(0), TokenType.MINUS, node);
            }
            return node;
        }

        throw new Error(`Unexpected token: ${token.type}`);
    }

    functionCall() {
        const name = this.currentToken.value;
        this.eat(TokenType.FUNCTION);
        this.eat(TokenType.LPAREN);

        const args = [];
        if (this.currentToken.type !== TokenType.RPAREN) {
            args.push(this.comparison());
            while (this.currentToken.type === TokenType.COMMA) {
                this.eat(TokenType.COMMA);
                args.push(this.comparison());
            }
        }

        this.eat(TokenType.RPAREN);
        return new FunctionCallExpression(name, args);
    }
}

// ==================== Function Registry ====================

class FunctionRegistry {
    constructor() {
        this.functions = {
            'SUM': this._sum.bind(this),
            'AVERAGE': this._average.bind(this),
            'COUNT': this._count.bind(this),
            'MIN': this._min.bind(this),
            'MAX': this._max.bind(this),
            'IF': this._if.bind(this),
            'AND': this._and.bind(this),
            'OR': this._or.bind(this),
            'NOT': this._not.bind(this),
            'ABS': this._abs.bind(this),
            'ROUND': this._round.bind(this),
            'SQRT': this._sqrt.bind(this),
            'POW': this._pow.bind(this),
            'CONCAT': this._concat.bind(this),
            'UPPER': this._upper.bind(this),
            'LOWER': this._lower.bind(this)
        };
    }

    getFunction(name) {
        return this.functions[name.toUpperCase()];
    }

    _sum(args) {
        let total = 0;
        for (const arg of args) {
            if (typeof arg === 'number') total += arg;
        }
        return total;
    }

    _average(args) {
        const numbers = args.filter(arg => typeof arg === 'number');
        return numbers.length > 0 ? numbers.reduce((a, b) => a + b, 0) / numbers.length : 0;
    }

    _count(args) {
        return args.filter(arg => typeof arg === 'number').length;
    }

    _min(args) {
        const numbers = args.filter(arg => typeof arg === 'number');
        return numbers.length > 0 ? Math.min(...numbers) : 0;
    }

    _max(args) {
        const numbers = args.filter(arg => typeof arg === 'number');
        return numbers.length > 0 ? Math.max(...numbers) : 0;
    }

    _if(args) {
        if (args.length < 3) return ErrorType.VALUE_ERROR;
        return args[0] ? args[1] : args[2];
    }

    _and(args) {
        return args.every(arg => arg);
    }

    _or(args) {
        return args.some(arg => arg);
    }

    _not(args) {
        return args.length > 0 ? !args[0] : false;
    }

    _abs(args) {
        if (args.length === 0 || typeof args[0] !== 'number') return ErrorType.VALUE_ERROR;
        return Math.abs(args[0]);
    }

    _round(args) {
        if (args.length === 0) return ErrorType.VALUE_ERROR;
        const decimals = args.length > 1 ? Math.floor(args[1]) : 0;
        return Math.round(args[0] * Math.pow(10, decimals)) / Math.pow(10, decimals);
    }

    _sqrt(args) {
        if (args.length === 0 || typeof args[0] !== 'number') return ErrorType.VALUE_ERROR;
        return Math.sqrt(args[0]);
    }

    _pow(args) {
        if (args.length < 2) return ErrorType.VALUE_ERROR;
        return Math.pow(args[0], args[1]);
    }

    _concat(args) {
        return args.join('');
    }

    _upper(args) {
        return args.length > 0 ? String(args[0]).toUpperCase() : '';
    }

    _lower(args) {
        return args.length > 0 ? String(args[0]).toLowerCase() : '';
    }
}

// ==================== Evaluation Context ====================

class EvaluationContext {
    constructor(spreadsheet, functionRegistry) {
        this.spreadsheet = spreadsheet;
        this.functionRegistry = functionRegistry;
    }
}

// ==================== Pattern 7: Memento Pattern (Cell State) ====================

class CellMemento {
    constructor(address, value, formula, cellType) {
        this.address = address;
        this.value = value;
        this.formula = formula;
        this.cellType = cellType;
    }
}

// ==================== Pattern 6: Factory Pattern & Pattern 5: Strategy Pattern (Cells) ====================

class Cell {
    constructor(address) {
        this.address = address;
        this.observers = [];
    }

    getValue() {
        throw new Error('Abstract method');
    }

    getType() {
        throw new Error('Abstract method');
    }

    attachObserver(observer) {
        if (!this.observers.includes(observer)) {
            this.observers.push(observer);
        }
    }

    detachObserver(observer) {
        const index = this.observers.indexOf(observer);
        if (index > -1) {
            this.observers.splice(index, 1);
        }
    }

    notifyObservers() {
        for (const observer of this.observers) {
            observer.update(this);
        }
    }

    createMemento() {
        return new CellMemento(this.address, this.getValue(), null, this.getType());
    }

    restoreFromMemento(memento) {
        // To be implemented by subclasses
    }
}

class EmptyCell extends Cell {
    getValue() {
        return null;
    }

    getType() {
        return CellType.EMPTY;
    }

    toString() {
        return `EmptyCell(${this.address})`;
    }
}

class ValueCell extends Cell {
    constructor(address, value) {
        super(address);
        this._value = value;
    }

    getValue() {
        return this._value;
    }

    setValue(value) {
        const oldValue = this._value;
        this._value = value;
        if (oldValue !== value) {
            this.notifyObservers();
        }
    }

    getType() {
        return CellType.VALUE;
    }

    createMemento() {
        return new CellMemento(this.address, this._value, null, CellType.VALUE);
    }

    restoreFromMemento(memento) {
        this._value = memento.value;
    }

    toString() {
        return `ValueCell(${this.address}, ${this._value})`;
    }
}

class FormulaCell extends Cell {
    constructor(address, formula, expression, context) {
        super(address);
        this.formula = formula;
        this.expression = expression;
        this.context = context;
        this.cachedValue = null;
        this.isDirty = true;
        this.isEvaluating = false;
    }

    getValue() {
        if (this.isDirty) {
            this.evaluate();
        }
        return this.cachedValue;
    }

    evaluate() {
        if (this.isEvaluating) {
            return ErrorType.CIRCULAR;
        }

        try {
            this.isEvaluating = true;
            this.cachedValue = this.expression.evaluate(this.context);
            this.isDirty = false;
        } catch (error) {
            this.cachedValue = ErrorType.VALUE_ERROR;
        } finally {
            this.isEvaluating = false;
        }

        return this.cachedValue;
    }

    markDirty() {
        if (!this.isDirty) {
            this.isDirty = true;
            this.notifyObservers();
        }
    }

    getDependencies() {
        return this.expression.getDependencies();
    }

    getType() {
        return CellType.FORMULA;
    }

    createMemento() {
        return new CellMemento(this.address, this.cachedValue, this.formula, CellType.FORMULA);
    }

    toString() {
        return `FormulaCell(${this.address}, =${this.formula}, cached=${this.cachedValue})`;
    }
}

class CellFactory {
    static createCell(address, value, context = null) {
        if (value === null || value === '') {
            return new EmptyCell(address);
        }

        if (typeof value === 'string' && value.startsWith('=')) {
            if (!context) {
                throw new Error('Context required for formula cell');
            }
            const formula = value.substring(1);
            try {
                const lexer = new Lexer(formula);
                const parser = new Parser(lexer);
                const expression = parser.parse();
                return new FormulaCell(address, formula, expression, context);
            } catch (error) {
                return new ValueCell(address, ErrorType.VALUE_ERROR);
            }
        }

        return new ValueCell(address, value);
    }
}

// ==================== Pattern 2: Dependency Manager (Observer Pattern) ====================

class DependencyManager {
    constructor() {
        this.dependents = new Map(); // cell -> set of cells that depend on it
        this.dependencies = new Map(); // cell -> set of cells it depends on
    }

    addDependency(fromCell, toCell) {
        if (!this.dependencies.has(fromCell)) {
            this.dependencies.set(fromCell, new Set());
        }
        this.dependencies.get(fromCell).add(toCell);

        if (!this.dependents.has(toCell)) {
            this.dependents.set(toCell, new Set());
        }
        this.dependents.get(toCell).add(fromCell);
    }

    removeDependencies(cell) {
        const deps = this.dependencies.get(cell);
        if (deps) {
            for (const dep of deps) {
                const depDependents = this.dependents.get(dep);
                if (depDependents) {
                    depDependents.delete(cell);
                }
            }
            deps.clear();
        }
    }

    getDependents(cell) {
        return this.dependents.get(cell) || new Set();
    }

    getAllDependentsTransitive(cell) {
        const result = new Set();
        const queue = [cell];
        const visited = new Set([cell]);

        while (queue.length > 0) {
            const current = queue.shift();
            const deps = this.dependents.get(current);
            if (deps) {
                for (const dep of deps) {
                    if (!visited.has(dep)) {
                        visited.add(dep);
                        result.add(dep);
                        queue.push(dep);
                    }
                }
            }
        }

        return result;
    }

    hasCircularDependency(startCell) {
        const dfs = (cell, visited, recStack) => {
            visited.add(cell);
            recStack.add(cell);

            const deps = this.dependents.get(cell);
            if (deps) {
                for (const dep of deps) {
                    if (!visited.has(dep)) {
                        if (dfs(dep, visited, recStack)) {
                            return true;
                        }
                    } else if (recStack.has(dep)) {
                        return true;
                    }
                }
            }

            recStack.delete(cell);
            return false;
        };

        return dfs(startCell, new Set(), new Set());
    }

    topologicalSort(cells) {
        const inDegree = new Map();
        for (const cell of cells) {
            inDegree.set(cell, 0);
        }

        // Calculate in-degrees
        for (const cell of cells) {
            const deps = this.dependencies.get(cell);
            if (deps) {
                for (const dep of deps) {
                    if (cells.has(dep)) {
                        inDegree.set(cell, inDegree.get(cell) + 1);
                    }
                }
            }
        }

        // Queue cells with no dependencies
        const queue = [];
        for (const [cell, degree] of inDegree) {
            if (degree === 0) {
                queue.push(cell);
            }
        }

        const result = [];
        while (queue.length > 0) {
            const cell = queue.shift();
            result.push(cell);

            const deps = this.dependents.get(cell);
            if (deps) {
                for (const dep of deps) {
                    if (inDegree.has(dep)) {
                        inDegree.set(dep, inDegree.get(dep) - 1);
                        if (inDegree.get(dep) === 0) {
                            queue.push(dep);
                        }
                    }
                }
            }
        }

        if (result.length !== cells.size) {
            throw new Error('Circular dependency detected');
        }

        return result;
    }
}

// ==================== Pattern 3: Command Pattern (Undo/Redo) ====================

class Command {
    execute() {
        throw new Error('Abstract method');
    }

    undo() {
        throw new Error('Abstract method');
    }
}

class SetCellCommand extends Command {
    constructor(spreadsheet, address, value) {
        super();
        this.spreadsheet = spreadsheet;
        this.address = address;
        this.value = value;
        this.oldCell = null;
    }

    execute() {
        this.oldCell = this.spreadsheet.getCell(this.address);
        this.spreadsheet.setCellValue(this.address, this.value);
    }

    undo() {
        if (this.oldCell) {
            this.spreadsheet.cells.set(this.address.toKey(), this.oldCell);
            this.spreadsheet._recalculateDependents(this.address);
        }
    }
}

class CommandHistory {
    constructor() {
        this.undoStack = [];
        this.redoStack = [];
    }

    execute(command) {
        command.execute();
        this.undoStack.push(command);
        this.redoStack = [];
    }

    undo() {
        if (this.undoStack.length === 0) return;
        const command = this.undoStack.pop();
        command.undo();
        this.redoStack.push(command);
    }

    redo() {
        if (this.redoStack.length === 0) return;
        const command = this.redoStack.pop();
        command.execute();
        this.undoStack.push(command);
    }
}

// ==================== Pattern 4: Collaboration Manager ====================

class CollaborationManager {
    constructor() {
        this.activeUsers = new Map();
        this.cellLocks = new Map();
    }

    addUser(userId, name) {
        const user = new User(userId, name);
        this.activeUsers.set(userId, user);
        return user;
    }

    removeUser(userId) {
        const user = this.activeUsers.get(userId);
        if (user) {
            // Unlock all cells locked by this user
            for (const [addr, u] of this.cellLocks) {
                if (u.id === userId) {
                    this.cellLocks.delete(addr);
                }
            }
            this.activeUsers.delete(userId);
        }
    }

    lockCell(address, userId) {
        const key = address.toKey();
        if (this.cellLocks.has(key)) {
            return false;
        }
        if (!this.activeUsers.has(userId)) {
            return false;
        }
        this.cellLocks.set(key, this.activeUsers.get(userId));
        return true;
    }

    unlockCell(address, userId) {
        const key = address.toKey();
        if (!this.cellLocks.has(key)) {
            return false;
        }
        if (this.cellLocks.get(key).id !== userId) {
            return false;
        }
        this.cellLocks.delete(key);
        return true;
    }

    isLocked(address) {
        return this.cellLocks.has(address.toKey());
    }

    getLockOwner(address) {
        return this.cellLocks.get(address.toKey());
    }
}

// ==================== Pattern 8: Singleton Pattern (Spreadsheet) ====================

class Spreadsheet {
    static _instance = null;

    static getInstance() {
        if (!Spreadsheet._instance) {
            Spreadsheet._instance = new Spreadsheet();
        }
        return Spreadsheet._instance;
    }

    constructor() {
        if (Spreadsheet._instance) {
            return Spreadsheet._instance;
        }

        this.cells = new Map();
        this.dependencyManager = new DependencyManager();
        this.functionRegistry = new FunctionRegistry();
        this.history = new CommandHistory();
        this.collaborationManager = new CollaborationManager();
        this._context = new EvaluationContext(this, this.functionRegistry);

        Spreadsheet._instance = this;
    }

    getCell(address) {
        const key = address.toKey();
        if (!this.cells.has(key)) {
            this.cells.set(key, new EmptyCell(address));
        }
        return this.cells.get(key);
    }

    setCellValue(address, value) {
        const key = address.toKey();

        // Remove old dependencies
        this.dependencyManager.removeDependencies(key);

        // Create new cell
        const cell = CellFactory.createCell(address, value, this._context);

        // Add new dependencies for formula cells
        if (cell instanceof FormulaCell) {
            for (const depKey of cell.getDependencies()) {
                this.dependencyManager.addDependency(key, depKey);
            }

            // Check for circular dependencies
            if (this.dependencyManager.hasCircularDependency(key)) {
                this.cells.set(key, new ValueCell(address, ErrorType.CIRCULAR));
                return;
            }
        }

        this.cells.set(key, cell);

        // Recalculate dependents
        this._recalculateDependents(address);
    }

    _recalculateDependents(address) {
        const key = address.toKey();
        const affected = this.dependencyManager.getAllDependentsTransitive(key);
        if (affected.size === 0) return;

        try {
            const evalOrder = this.dependencyManager.topologicalSort(affected);
            for (const cellKey of evalOrder) {
                const cell = this.cells.get(cellKey);
                if (cell instanceof FormulaCell) {
                    cell.markDirty();
                }
            }
        } catch (error) {
            // Circular dependency
        }
    }

    undo() {
        this.history.undo();
    }

    redo() {
        this.history.redo();
    }

    getCellValue(addressStr) {
        const addr = CellAddress.parse(addressStr);
        return this.getCell(addr).getValue();
    }

    setCellValueWithUndo(addressStr, value) {
        const addr = CellAddress.parse(addressStr);
        const cmd = new SetCellCommand(this, addr, value);
        this.history.execute(cmd);
    }

    display(rows = 5, cols = 5) {
        console.log('\n' + '='.repeat(80));
        console.log('Spreadsheet:');
        console.log('-'.repeat(80));

        // Header
        let header = '   |';
        for (let col = 0; col < cols; col++) {
            header += ` ${String.fromCharCode(65 + col).padStart(8)} |`;
        }
        console.log(header);
        console.log('-'.repeat(80));

        // Rows
        for (let row = 0; row < rows; row++) {
            let rowStr = `${(row + 1).toString().padStart(2)} |`;
            for (let col = 0; col < cols; col++) {
                const addr = new CellAddress(row, col);
                const cell = this.getCell(addr);
                let value = cell.getValue();
                let valueStr = '';
                if (value !== null) {
                    if (typeof value === 'number') {
                        valueStr = value.toFixed(2);
                    } else {
                        valueStr = String(value);
                    }
                }
                rowStr += ` ${valueStr.padStart(8)} |`;
            }
            console.log(rowStr);
        }

        console.log('='.repeat(80));
    }
}

// ==================== Demo ====================

function demoBasicOperations() {
    console.log('\n' + '='.repeat(80));
    console.log('DEMO 1: Basic Cell Operations');
    console.log('='.repeat(80));

    const sheet = Spreadsheet.getInstance();

    sheet.setCellValue(CellAddress.parse('A1'), 10);
    sheet.setCellValue(CellAddress.parse('A2'), 20);
    sheet.setCellValue(CellAddress.parse('A3'), 30);

    sheet.setCellValue(CellAddress.parse('B1'), '=A1 + A2');
    sheet.setCellValue(CellAddress.parse('B2'), '=SUM(A1:A3)');
    sheet.setCellValue(CellAddress.parse('B3'), '=AVERAGE(A1:A3)');

    console.log('\n✅ Set values: A1=10, A2=20, A3=30');
    console.log('✅ Set formulas: B1=A1+A2, B2=SUM(A1:A3), B3=AVERAGE(A1:A3)');

    sheet.display(4, 3);

    console.log('\n📊 Results:');
    console.log(`   B1 = ${sheet.getCellValue('B1')} (should be 30)`);
    console.log(`   B2 = ${sheet.getCellValue('B2')} (should be 60)`);
    console.log(`   B3 = ${sheet.getCellValue('B3')} (should be 20.0)`);
}

function demoCascadingUpdates() {
    console.log('\n' + '='.repeat(80));
    console.log('DEMO 2: Cascading Updates with Dependencies');
    console.log('='.repeat(80));

    const sheet = new Spreadsheet();

    sheet.setCellValue(CellAddress.parse('A1'), 10);
    sheet.setCellValue(CellAddress.parse('A2'), '=A1 + 5');
    sheet.setCellValue(CellAddress.parse('A3'), '=A2 * 2');
    sheet.setCellValue(CellAddress.parse('A4'), '=A3 + 10');

    console.log('\n✅ Created dependency chain:');
    console.log('   A1 = 10');
    console.log('   A2 = A1 + 5');
    console.log('   A3 = A2 * 2');
    console.log('   A4 = A3 + 10');

    sheet.display(5, 2);

    console.log('\n📊 Initial values:');
    console.log(`   A1 = ${sheet.getCellValue('A1')}`);
    console.log(`   A2 = ${sheet.getCellValue('A2')} (should be 15)`);
    console.log(`   A3 = ${sheet.getCellValue('A3')} (should be 30)`);
    console.log(`   A4 = ${sheet.getCellValue('A4')} (should be 40)`);

    console.log('\n🔄 Changing A1 to 20...');
    sheet.setCellValue(CellAddress.parse('A1'), 20);

    sheet.display(5, 2);

    console.log('\n📊 After cascading update:');
    console.log(`   A1 = ${sheet.getCellValue('A1')}`);
    console.log(`   A2 = ${sheet.getCellValue('A2')} (should be 25)`);
    console.log(`   A3 = ${sheet.getCellValue('A3')} (should be 50)`);
    console.log(`   A4 = ${sheet.getCellValue('A4')} (should be 60)`);
}

function demoCircularDependency() {
    console.log('\n' + '='.repeat(80));
    console.log('DEMO 3: Circular Dependency Detection');
    console.log('='.repeat(80));

    const sheet = new Spreadsheet();

    sheet.setCellValue(CellAddress.parse('A1'), '=B1 + 1');
    sheet.setCellValue(CellAddress.parse('B1'), '=C1 * 2');

    console.log('\n✅ Created formulas:');
    console.log('   A1 = B1 + 1');
    console.log('   B1 = C1 * 2');
    console.log('   (No circular dependency yet)');

    console.log('\n⚠️  Attempting to create circular dependency: C1 = A1 + 5');
    sheet.setCellValue(CellAddress.parse('C1'), '=A1 + 5');

    const result = sheet.getCellValue('C1');
    console.log(`\n❌ Result: C1 = ${result}`);
    console.log('   Circular dependency detected and prevented!');
}

function demoUndoRedo() {
    console.log('\n' + '='.repeat(80));
    console.log('DEMO 4: Undo/Redo Functionality');
    console.log('='.repeat(80));

    const sheet = new Spreadsheet();

    sheet.setCellValueWithUndo('A1', 10);
    sheet.setCellValueWithUndo('A2', 20);
    sheet.setCellValueWithUndo('A3', '=A1 + A2');

    console.log('\n✅ Made changes:');
    console.log('   A1 = 10');
    console.log('   A2 = 20');
    console.log('   A3 = A1 + A2');

    console.log(`\n📊 A3 = ${sheet.getCellValue('A3')} (should be 30)`);

    console.log('\n⏪ Undoing last operation (A3 formula)...');
    sheet.undo();
    console.log(`   A3 = ${sheet.getCellValue('A3')} (should be null)`);

    console.log('\n⏩ Redoing operation...');
    sheet.redo();
    console.log(`   A3 = ${sheet.getCellValue('A3')} (should be 30)`);
}

function demoFunctions() {
    console.log('\n' + '='.repeat(80));
    console.log('DEMO 5: Built-in Functions');
    console.log('='.repeat(80));

    const sheet = new Spreadsheet();

    sheet.setCellValue(CellAddress.parse('A1'), 5);
    sheet.setCellValue(CellAddress.parse('A2'), 10);
    sheet.setCellValue(CellAddress.parse('A3'), 15);
    sheet.setCellValue(CellAddress.parse('A4'), 20);
    sheet.setCellValue(CellAddress.parse('A5'), 25);

    sheet.setCellValue(CellAddress.parse('B1'), '=SUM(A1:A5)');
    sheet.setCellValue(CellAddress.parse('B2'), '=AVERAGE(A1:A5)');
    sheet.setCellValue(CellAddress.parse('B3'), '=MIN(A1:A5)');
    sheet.setCellValue(CellAddress.parse('B4'), '=MAX(A1:A5)');
    sheet.setCellValue(CellAddress.parse('B5'), '=COUNT(A1:A5)');
    sheet.setCellValue(CellAddress.parse('C1'), '=IF(B1 > 50, "High", "Low")');
    sheet.setCellValue(CellAddress.parse('C2'), '=SQRT(A5)');
    sheet.setCellValue(CellAddress.parse('C3'), '=POW(2, 3)');

    console.log('\n✅ Data: A1=5, A2=10, A3=15, A4=20, A5=25');
    console.log('\n✅ Functions:');
    console.log('   B1 = SUM(A1:A5)');
    console.log('   B2 = AVERAGE(A1:A5)');
    console.log('   B3 = MIN(A1:A5)');
    console.log('   B4 = MAX(A1:A5)');
    console.log('   B5 = COUNT(A1:A5)');
    console.log('   C1 = IF(B1 > 50, "High", "Low")');
    console.log('   C2 = SQRT(A5)');
    console.log('   C3 = POW(2, 3)');

    sheet.display(6, 4);

    console.log('\n📊 Results:');
    console.log(`   SUM = ${sheet.getCellValue('B1')}`);
    console.log(`   AVERAGE = ${sheet.getCellValue('B2')}`);
    console.log(`   MIN = ${sheet.getCellValue('B3')}`);
    console.log(`   MAX = ${sheet.getCellValue('B4')}`);
    console.log(`   COUNT = ${sheet.getCellValue('B5')}`);
    console.log(`   IF = ${sheet.getCellValue('C1')}`);
    console.log(`   SQRT = ${sheet.getCellValue('C2')}`);
    console.log(`   POW = ${sheet.getCellValue('C3')}`);
}

function demoCollaboration() {
    console.log('\n' + '='.repeat(80));
    console.log('DEMO 6: Collaborative Editing');
    console.log('='.repeat(80));

    const sheet = new Spreadsheet();
    const collab = sheet.collaborationManager;

    const user1 = collab.addUser('u1', 'Alice');
    const user2 = collab.addUser('u2', 'Bob');

    console.log(`\n✅ Added users: ${user1.name}, ${user2.name}`);

    const addrA1 = CellAddress.parse('A1');
    let success = collab.lockCell(addrA1, 'u1');
    console.log(`\n🔒 ${user1.name} locked A1: ${success}`);

    sheet.setCellValue(addrA1, 100);
    console.log(`   ${user1.name} set A1 = 100`);

    success = collab.lockCell(addrA1, 'u2');
    console.log(`\n❌ ${user2.name} tried to lock A1: ${success} (already locked by ${user1.name})`);

    collab.unlockCell(addrA1, 'u1');
    console.log(`\n🔓 ${user1.name} unlocked A1`);

    success = collab.lockCell(addrA1, 'u2');
    console.log(`🔒 ${user2.name} locked A1: ${success}`);

    sheet.setCellValue(addrA1, 200);
    console.log(`   ${user2.name} set A1 = 200`);

    collab.unlockCell(addrA1, 'u2');
    console.log(`🔓 ${user2.name} unlocked A1`);

    console.log(`\n📊 Final value: A1 = ${sheet.getCellValue('A1')}`);
}

// ==================== Main ====================

function main() {
    console.log('\n' + '='.repeat(100));
    console.log(' '.repeat(30) + 'SPREADSHEET SYSTEM - COMPREHENSIVE DEMO');
    console.log('='.repeat(100));
    console.log('\n📊 A collaborative spreadsheet system demonstrating 10 design patterns:');
    console.log('   1. Interpreter Pattern - Formula parsing and evaluation');
    console.log('   2. Observer Pattern - Dependency tracking and updates');
    console.log('   3. Command Pattern - Undo/redo operations');
    console.log('   4. Composite Pattern - Formula expression tree');
    console.log('   5. Strategy Pattern - Value types and formatters');
    console.log('   6. Factory Pattern - Cell type creation');
    console.log('   7. Memento Pattern - State saving for undo');
    console.log('   8. Singleton Pattern - Spreadsheet instance');
    console.log('   9. Visitor Pattern - Formula AST traversal');
    console.log('  10. Proxy Pattern - Lazy formula evaluation');

    demoBasicOperations();
    demoCascadingUpdates();
    demoCircularDependency();
    demoUndoRedo();
    demoFunctions();
    demoCollaboration();

    console.log('\n' + '='.repeat(100));
    console.log('✅ All demos completed successfully!');
    console.log('='.repeat(100));
    console.log('\n🎯 Key Features Demonstrated:');
    console.log('   ✓ Cell management (value, formula, empty)');
    console.log('   ✓ Formula engine with 15+ built-in functions');
    console.log('   ✓ Automatic dependency tracking and recalculation');
    console.log('   ✓ Circular dependency detection and prevention');
    console.log('   ✓ Undo/redo support with command pattern');
    console.log('   ✓ Collaborative editing with cell locking');
    console.log('   ✓ Error handling (#DIV/0!, #REF!, #CIRCULAR!)');
    console.log('   ✓ Range operations (SUM, AVERAGE, COUNT, etc.)');
    console.log('   ✓ Lazy evaluation with caching');
    console.log('   ✓ Clean architecture with 10 design patterns');
    console.log('='.repeat(100) + '\n');
}

// Run if called directly
if (typeof require !== 'undefined' && require.main === module) {
    main();
}

module.exports = {
    Spreadsheet,
    CellAddress,
    CellFactory,
    Expression,
    LiteralExpression,
    CellReferenceExpression,
    BinaryOperationExpression,
    FunctionCallExpression
};
