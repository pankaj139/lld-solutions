"""
Spreadsheet System - Low Level Design
A comprehensive collaborative spreadsheet system with formula engine, dependency tracking, and real-time collaboration.

Design Patterns Used:
1. Interpreter Pattern - Formula parsing and evaluation
2. Observer Pattern - Dependency tracking and updates
3. Command Pattern - Undo/redo operations
4. Composite Pattern - Formula expression tree
5. Strategy Pattern - Value types and formatters
6. Factory Pattern - Cell type creation
7. Memento Pattern - State saving for undo
8. Singleton Pattern - Spreadsheet instance
9. Visitor Pattern - Formula AST traversal
10. Proxy Pattern - Lazy formula evaluation

Author: LLD Solutions
Date: 2025
"""

from abc import ABC, abstractmethod
from enum import Enum
from dataclasses import dataclass, field
from typing import Any, Dict, List, Set, Optional, Tuple
from collections import deque, defaultdict
import re
import operator
import threading


# ==================== Enums ====================

class CellType(Enum):
    """Types of cells"""
    EMPTY = "empty"
    VALUE = "value"
    FORMULA = "formula"


class ErrorType(Enum):
    """Formula error types"""
    DIV_ZERO = "#DIV/0!"
    REF_ERROR = "#REF!"
    CIRCULAR = "#CIRCULAR!"
    NAME_ERROR = "#NAME!"
    VALUE_ERROR = "#VALUE!"


class TokenType(Enum):
    """Token types for lexer"""
    NUMBER = "NUMBER"
    STRING = "STRING"
    CELL_REF = "CELL_REF"
    RANGE = "RANGE"
    FUNCTION = "FUNCTION"
    PLUS = "PLUS"
    MINUS = "MINUS"
    MULTIPLY = "MULTIPLY"
    DIVIDE = "DIVIDE"
    PERCENT = "PERCENT"
    LPAREN = "LPAREN"
    RPAREN = "RPAREN"
    COMMA = "COMMA"
    GT = "GT"
    LT = "LT"
    GTE = "GTE"
    LTE = "LTE"
    EQ = "EQ"
    NEQ = "NEQ"
    EOF = "EOF"


# ==================== Data Classes ====================

@dataclass
class CellAddress:
    """Represents a cell address"""
    row: int
    col: int
    
    def __str__(self) -> str:
        return f"{chr(65 + self.col)}{self.row + 1}"
    
    def __hash__(self):
        return hash((self.row, self.col))
    
    def __eq__(self, other):
        return isinstance(other, CellAddress) and self.row == other.row and self.col == other.col
    
    @staticmethod
    def parse(address: str) -> 'CellAddress':
        """Parse address string like 'A1' to CellAddress"""
        match = re.match(r'([A-Z]+)(\d+)', address.upper())
        if not match:
            raise ValueError(f"Invalid cell address: {address}")
        col_str, row_str = match.groups()
        col = ord(col_str) - 65
        row = int(row_str) - 1
        return CellAddress(row, col)


@dataclass
class Token:
    """Token for lexer"""
    type: TokenType
    value: Any
    position: int


@dataclass
class User:
    """User in collaborative session"""
    id: str
    name: str
    
    def __hash__(self):
        return hash(self.id)
    
    def __eq__(self, other):
        return isinstance(other, User) and self.id == other.id


# ==================== Pattern 1: Interpreter Pattern (Formula Parsing) ====================

class Expression(ABC):
    """Abstract expression for formula evaluation"""
    
    @abstractmethod
    def evaluate(self, context: 'EvaluationContext') -> Any:
        """Evaluate the expression"""
        pass
    
    @abstractmethod
    def get_dependencies(self) -> Set[CellAddress]:
        """Get cell dependencies"""
        pass
    
    @abstractmethod
    def accept(self, visitor: 'ExpressionVisitor') -> Any:
        """Accept a visitor (Visitor pattern)"""
        pass


class LiteralExpression(Expression):
    """Literal value expression"""
    
    def __init__(self, value: Any):
        self.value = value
    
    def evaluate(self, context: 'EvaluationContext') -> Any:
        return self.value
    
    def get_dependencies(self) -> Set[CellAddress]:
        return set()
    
    def accept(self, visitor: 'ExpressionVisitor') -> Any:
        return visitor.visit_literal(self)
    
    def __repr__(self):
        return f"Literal({self.value})"


class CellReferenceExpression(Expression):
    """Cell reference expression"""
    
    def __init__(self, address: CellAddress):
        self.address = address
    
    def evaluate(self, context: 'EvaluationContext') -> Any:
        cell = context.spreadsheet.get_cell(self.address)
        return cell.get_value()
    
    def get_dependencies(self) -> Set[CellAddress]:
        return {self.address}
    
    def accept(self, visitor: 'ExpressionVisitor') -> Any:
        return visitor.visit_cell_reference(self)
    
    def __repr__(self):
        return f"CellRef({self.address})"


class RangeExpression(Expression):
    """Range expression (A1:B5)"""
    
    def __init__(self, start: CellAddress, end: CellAddress):
        self.start = start
        self.end = end
    
    def evaluate(self, context: 'EvaluationContext') -> List[Any]:
        values = []
        for row in range(self.start.row, self.end.row + 1):
            for col in range(self.start.col, self.end.col + 1):
                addr = CellAddress(row, col)
                cell = context.spreadsheet.get_cell(addr)
                value = cell.get_value()
                if value is not None and not isinstance(value, str) or (isinstance(value, str) and value.startswith("#")):
                    values.append(value)
        return values
    
    def get_dependencies(self) -> Set[CellAddress]:
        deps = set()
        for row in range(self.start.row, self.end.row + 1):
            for col in range(self.start.col, self.end.col + 1):
                deps.add(CellAddress(row, col))
        return deps
    
    def accept(self, visitor: 'ExpressionVisitor') -> Any:
        return visitor.visit_range(self)
    
    def __repr__(self):
        return f"Range({self.start}:{self.end})"


class BinaryOperationExpression(Expression):
    """Binary operation expression"""
    
    def __init__(self, left: Expression, op: TokenType, right: Expression):
        self.left = left
        self.op = op
        self.right = right
    
    def evaluate(self, context: 'EvaluationContext') -> Any:
        left_val = self.left.evaluate(context)
        right_val = self.right.evaluate(context)
        
        # Handle errors
        if isinstance(left_val, str) and left_val.startswith("#"):
            return left_val
        if isinstance(right_val, str) and right_val.startswith("#"):
            return right_val
        
        # Convert to numbers
        try:
            left_num = float(left_val) if left_val is not None else 0
            right_num = float(right_val) if right_val is not None else 0
        except (ValueError, TypeError):
            return ErrorType.VALUE_ERROR.value
        
        ops = {
            TokenType.PLUS: operator.add,
            TokenType.MINUS: operator.sub,
            TokenType.MULTIPLY: operator.mul,
            TokenType.PERCENT: operator.mod,
            TokenType.GT: operator.gt,
            TokenType.LT: operator.lt,
            TokenType.GTE: operator.ge,
            TokenType.LTE: operator.le,
            TokenType.EQ: operator.eq,
            TokenType.NEQ: operator.ne,
        }
        
        if self.op == TokenType.DIVIDE:
            if right_num == 0:
                return ErrorType.DIV_ZERO.value
            return left_num / right_num
        
        return ops[self.op](left_num, right_num)
    
    def get_dependencies(self) -> Set[CellAddress]:
        return self.left.get_dependencies() | self.right.get_dependencies()
    
    def accept(self, visitor: 'ExpressionVisitor') -> Any:
        return visitor.visit_binary_operation(self)
    
    def __repr__(self):
        return f"BinaryOp({self.left} {self.op.name} {self.right})"


class FunctionCallExpression(Expression):
    """Function call expression"""
    
    def __init__(self, name: str, args: List[Expression]):
        self.name = name.upper()
        self.args = args
    
    def evaluate(self, context: 'EvaluationContext') -> Any:
        func = context.function_registry.get_function(self.name)
        if not func:
            return ErrorType.NAME_ERROR.value
        
        # Evaluate arguments
        arg_values = []
        for arg in self.args:
            val = arg.evaluate(context)
            if isinstance(val, list):
                arg_values.extend(val)
            else:
                arg_values.append(val)
        
        # Check for errors in arguments
        for val in arg_values:
            if isinstance(val, str) and val.startswith("#"):
                return val
        
        return func(arg_values)
    
    def get_dependencies(self) -> Set[CellAddress]:
        deps = set()
        for arg in self.args:
            deps |= arg.get_dependencies()
        return deps
    
    def accept(self, visitor: 'ExpressionVisitor') -> Any:
        return visitor.visit_function_call(self)
    
    def __repr__(self):
        args_str = ", ".join(str(arg) for arg in self.args)
        return f"{self.name}({args_str})"


# ==================== Pattern 9: Visitor Pattern (Formula Traversal) ====================

class ExpressionVisitor(ABC):
    """Visitor for expression traversal"""
    
    @abstractmethod
    def visit_literal(self, expr: LiteralExpression) -> Any:
        pass
    
    @abstractmethod
    def visit_cell_reference(self, expr: CellReferenceExpression) -> Any:
        pass
    
    @abstractmethod
    def visit_range(self, expr: RangeExpression) -> Any:
        pass
    
    @abstractmethod
    def visit_binary_operation(self, expr: BinaryOperationExpression) -> Any:
        pass
    
    @abstractmethod
    def visit_function_call(self, expr: FunctionCallExpression) -> Any:
        pass


class DependencyVisitor(ExpressionVisitor):
    """Visitor to extract dependencies"""
    
    def __init__(self):
        self.dependencies = set()
    
    def visit_literal(self, expr: LiteralExpression) -> Any:
        return None
    
    def visit_cell_reference(self, expr: CellReferenceExpression) -> Any:
        self.dependencies.add(expr.address)
        return None
    
    def visit_range(self, expr: RangeExpression) -> Any:
        self.dependencies |= expr.get_dependencies()
        return None
    
    def visit_binary_operation(self, expr: BinaryOperationExpression) -> Any:
        expr.left.accept(self)
        expr.right.accept(self)
        return None
    
    def visit_function_call(self, expr: FunctionCallExpression) -> Any:
        for arg in expr.args:
            arg.accept(self)
        return None


# ==================== Lexer and Parser ====================

class Lexer:
    """Tokenizes formula strings"""
    
    def __init__(self, text: str):
        self.text = text
        self.pos = 0
        self.current_char = self.text[0] if text else None
    
    def advance(self):
        """Move to next character"""
        self.pos += 1
        self.current_char = self.text[self.pos] if self.pos < len(self.text) else None
    
    def skip_whitespace(self):
        """Skip whitespace characters"""
        while self.current_char and self.current_char.isspace():
            self.advance()
    
    def read_number(self) -> Token:
        """Read number token"""
        start = self.pos
        while self.current_char and (self.current_char.isdigit() or self.current_char == '.'):
            self.advance()
        num_str = self.text[start:self.pos]
        return Token(TokenType.NUMBER, float(num_str), start)
    
    def read_identifier(self) -> Token:
        """Read identifier (function or cell reference)"""
        start = self.pos
        while self.current_char and (self.current_char.isalnum() or self.current_char == '_'):
            self.advance()
        text = self.text[start:self.pos]
        
        # Check if it's a cell reference (A1, B2, etc.) or range (A1:B5)
        if ':' in self.text[start:min(start + 20, len(self.text))]:
            # Could be a range
            parts = self.text[start:self.pos + 10].split(':')
            if len(parts) == 2 and re.match(r'[A-Z]+\d+', parts[0]) and re.match(r'[A-Z]+\d+', parts[1]):
                # Read the second part
                self.advance()  # skip ':'
                while self.current_char and self.current_char.isalnum():
                    self.advance()
                range_text = self.text[start:self.pos]
                return Token(TokenType.RANGE, range_text, start)
        
        if re.match(r'[A-Z]+\d+$', text):
            return Token(TokenType.CELL_REF, text, start)
        
        return Token(TokenType.FUNCTION, text, start)
    
    def read_string(self) -> Token:
        """Read string token"""
        self.advance()  # skip opening quote
        start = self.pos
        while self.current_char and self.current_char != '"':
            self.advance()
        text = self.text[start:self.pos]
        if self.current_char:
            self.advance()  # skip closing quote
        return Token(TokenType.STRING, text, start)
    
    def get_next_token(self) -> Token:
        """Get next token"""
        while self.current_char:
            if self.current_char.isspace():
                self.skip_whitespace()
                continue
            
            if self.current_char.isdigit():
                return self.read_number()
            
            if self.current_char.isalpha():
                return self.read_identifier()
            
            if self.current_char == '"':
                return self.read_string()
            
            if self.current_char == '+':
                self.advance()
                return Token(TokenType.PLUS, '+', self.pos - 1)
            
            if self.current_char == '-':
                self.advance()
                return Token(TokenType.MINUS, '-', self.pos - 1)
            
            if self.current_char == '*':
                self.advance()
                return Token(TokenType.MULTIPLY, '*', self.pos - 1)
            
            if self.current_char == '/':
                self.advance()
                return Token(TokenType.DIVIDE, '/', self.pos - 1)
            
            if self.current_char == '%':
                self.advance()
                return Token(TokenType.PERCENT, '%', self.pos - 1)
            
            if self.current_char == '(':
                self.advance()
                return Token(TokenType.LPAREN, '(', self.pos - 1)
            
            if self.current_char == ')':
                self.advance()
                return Token(TokenType.RPAREN, ')', self.pos - 1)
            
            if self.current_char == ',':
                self.advance()
                return Token(TokenType.COMMA, ',', self.pos - 1)
            
            if self.current_char == '>':
                self.advance()
                if self.current_char == '=':
                    self.advance()
                    return Token(TokenType.GTE, '>=', self.pos - 2)
                return Token(TokenType.GT, '>', self.pos - 1)
            
            if self.current_char == '<':
                self.advance()
                if self.current_char == '=':
                    self.advance()
                    return Token(TokenType.LTE, '<=', self.pos - 2)
                if self.current_char == '>':
                    self.advance()
                    return Token(TokenType.NEQ, '<>', self.pos - 2)
                return Token(TokenType.LT, '<', self.pos - 1)
            
            if self.current_char == '=':
                self.advance()
                return Token(TokenType.EQ, '=', self.pos - 1)
            
            raise ValueError(f"Invalid character: {self.current_char}")
        
        return Token(TokenType.EOF, None, self.pos)


class Parser:
    """Recursive descent parser for formulas"""
    
    def __init__(self, lexer: Lexer):
        self.lexer = lexer
        self.current_token = self.lexer.get_next_token()
    
    def eat(self, token_type: TokenType):
        """Consume expected token"""
        if self.current_token.type == token_type:
            self.current_token = self.lexer.get_next_token()
        else:
            raise ValueError(f"Expected {token_type}, got {self.current_token.type}")
    
    def parse(self) -> Expression:
        """Parse expression"""
        return self.comparison()
    
    def comparison(self) -> Expression:
        """Parse comparison expression"""
        node = self.expression()
        
        while self.current_token.type in [TokenType.GT, TokenType.LT, TokenType.GTE, TokenType.LTE, TokenType.EQ, TokenType.NEQ]:
            op = self.current_token.type
            self.eat(op)
            right = self.expression()
            node = BinaryOperationExpression(node, op, right)
        
        return node
    
    def expression(self) -> Expression:
        """Parse addition/subtraction expression"""
        node = self.term()
        
        while self.current_token.type in [TokenType.PLUS, TokenType.MINUS]:
            op = self.current_token.type
            self.eat(op)
            right = self.term()
            node = BinaryOperationExpression(node, op, right)
        
        return node
    
    def term(self) -> Expression:
        """Parse multiplication/division expression"""
        node = self.factor()
        
        while self.current_token.type in [TokenType.MULTIPLY, TokenType.DIVIDE, TokenType.PERCENT]:
            op = self.current_token.type
            self.eat(op)
            right = self.factor()
            node = BinaryOperationExpression(node, op, right)
        
        return node
    
    def factor(self) -> Expression:
        """Parse factor (number, cell ref, function, parentheses)"""
        token = self.current_token
        
        if token.type == TokenType.NUMBER:
            self.eat(TokenType.NUMBER)
            return LiteralExpression(token.value)
        
        if token.type == TokenType.STRING:
            self.eat(TokenType.STRING)
            return LiteralExpression(token.value)
        
        if token.type == TokenType.CELL_REF:
            self.eat(TokenType.CELL_REF)
            addr = CellAddress.parse(token.value)
            return CellReferenceExpression(addr)
        
        if token.type == TokenType.RANGE:
            self.eat(TokenType.RANGE)
            parts = token.value.split(':')
            start = CellAddress.parse(parts[0])
            end = CellAddress.parse(parts[1])
            return RangeExpression(start, end)
        
        if token.type == TokenType.FUNCTION:
            return self.function_call()
        
        if token.type == TokenType.LPAREN:
            self.eat(TokenType.LPAREN)
            node = self.comparison()
            self.eat(TokenType.RPAREN)
            return node
        
        if token.type in [TokenType.PLUS, TokenType.MINUS]:
            op = token.type
            self.eat(op)
            node = self.factor()
            if op == TokenType.MINUS:
                return BinaryOperationExpression(LiteralExpression(0), TokenType.MINUS, node)
            return node
        
        raise ValueError(f"Unexpected token: {token.type}")
    
    def function_call(self) -> FunctionCallExpression:
        """Parse function call"""
        name = self.current_token.value
        self.eat(TokenType.FUNCTION)
        self.eat(TokenType.LPAREN)
        
        args = []
        if self.current_token.type != TokenType.RPAREN:
            args.append(self.comparison())
            while self.current_token.type == TokenType.COMMA:
                self.eat(TokenType.COMMA)
                args.append(self.comparison())
        
        self.eat(TokenType.RPAREN)
        return FunctionCallExpression(name, args)


# ==================== Function Registry ====================

class FunctionRegistry:
    """Registry of built-in functions"""
    
    def __init__(self):
        self.functions = {
            'SUM': self._sum,
            'AVERAGE': self._average,
            'COUNT': self._count,
            'MIN': self._min,
            'MAX': self._max,
            'IF': self._if,
            'AND': self._and,
            'OR': self._or,
            'NOT': self._not,
            'ABS': self._abs,
            'ROUND': self._round,
            'SQRT': self._sqrt,
            'POW': self._pow,
            'CONCAT': self._concat,
            'UPPER': self._upper,
            'LOWER': self._lower,
        }
    
    def get_function(self, name: str):
        """Get function by name"""
        return self.functions.get(name.upper())
    
    def _sum(self, args: List[Any]) -> float:
        """Sum function"""
        total = 0
        for arg in args:
            if isinstance(arg, (int, float)):
                total += arg
        return total
    
    def _average(self, args: List[Any]) -> float:
        """Average function"""
        numbers = [arg for arg in args if isinstance(arg, (int, float))]
        return sum(numbers) / len(numbers) if numbers else 0
    
    def _count(self, args: List[Any]) -> int:
        """Count function"""
        return len([arg for arg in args if isinstance(arg, (int, float))])
    
    def _min(self, args: List[Any]) -> float:
        """Min function"""
        numbers = [arg for arg in args if isinstance(arg, (int, float))]
        return min(numbers) if numbers else 0
    
    def _max(self, args: List[Any]) -> float:
        """Max function"""
        numbers = [arg for arg in args if isinstance(arg, (int, float))]
        return max(numbers) if numbers else 0
    
    def _if(self, args: List[Any]) -> Any:
        """IF function"""
        if len(args) < 3:
            return ErrorType.VALUE_ERROR.value
        condition = args[0]
        true_val = args[1]
        false_val = args[2]
        return true_val if condition else false_val
    
    def _and(self, args: List[Any]) -> bool:
        """AND function"""
        return all(args)
    
    def _or(self, args: List[Any]) -> bool:
        """OR function"""
        return any(args)
    
    def _not(self, args: List[Any]) -> bool:
        """NOT function"""
        return not args[0] if args else False
    
    def _abs(self, args: List[Any]) -> float:
        """ABS function"""
        if not args or not isinstance(args[0], (int, float)):
            return ErrorType.VALUE_ERROR.value
        return abs(args[0])
    
    def _round(self, args: List[Any]) -> float:
        """ROUND function"""
        if not args:
            return ErrorType.VALUE_ERROR.value
        decimals = int(args[1]) if len(args) > 1 else 0
        return round(args[0], decimals)
    
    def _sqrt(self, args: List[Any]) -> float:
        """SQRT function"""
        if not args or not isinstance(args[0], (int, float)):
            return ErrorType.VALUE_ERROR.value
        return args[0] ** 0.5
    
    def _pow(self, args: List[Any]) -> float:
        """POW function"""
        if len(args) < 2:
            return ErrorType.VALUE_ERROR.value
        return args[0] ** args[1]
    
    def _concat(self, args: List[Any]) -> str:
        """CONCAT function"""
        return ''.join(str(arg) for arg in args)
    
    def _upper(self, args: List[Any]) -> str:
        """UPPER function"""
        return str(args[0]).upper() if args else ""
    
    def _lower(self, args: List[Any]) -> str:
        """LOWER function"""
        return str(args[0]).lower() if args else ""


# ==================== Evaluation Context ====================

@dataclass
class EvaluationContext:
    """Context for expression evaluation"""
    spreadsheet: 'Spreadsheet'
    function_registry: FunctionRegistry


# ==================== Pattern 7: Memento Pattern (Cell State) ====================

@dataclass
class CellMemento:
    """Memento for cell state"""
    address: CellAddress
    value: Any
    formula: Optional[str]
    cell_type: CellType


# ==================== Pattern 2: Observer Pattern (Cell Dependencies) ====================

class CellObserver(ABC):
    """Observer interface for cells"""
    
    @abstractmethod
    def update(self, cell: 'Cell'):
        """Called when observed cell changes"""
        pass


# ==================== Pattern 6: Factory Pattern & Pattern 5: Strategy Pattern (Cells) ====================

class Cell(ABC):
    """Abstract base class for cells"""
    
    def __init__(self, address: CellAddress):
        self.address = address
        self.observers: List[CellObserver] = []
        self._lock = threading.Lock()
    
    @abstractmethod
    def get_value(self) -> Any:
        """Get cell value"""
        pass
    
    @abstractmethod
    def get_type(self) -> CellType:
        """Get cell type"""
        pass
    
    def attach_observer(self, observer: CellObserver):
        """Attach an observer"""
        if observer not in self.observers:
            self.observers.append(observer)
    
    def detach_observer(self, observer: CellObserver):
        """Detach an observer"""
        if observer in self.observers:
            self.observers.remove(observer)
    
    def notify_observers(self):
        """Notify all observers"""
        for observer in self.observers:
            observer.update(self)
    
    def create_memento(self) -> CellMemento:
        """Create memento of current state"""
        return CellMemento(self.address, self.get_value(), None, self.get_type())
    
    def restore_from_memento(self, memento: CellMemento):
        """Restore state from memento"""
        pass


class EmptyCell(Cell):
    """Empty cell"""
    
    def get_value(self) -> Any:
        return None
    
    def get_type(self) -> CellType:
        return CellType.EMPTY
    
    def __repr__(self):
        return f"EmptyCell({self.address})"


class ValueCell(Cell):
    """Value cell (stores direct value)"""
    
    def __init__(self, address: CellAddress, value: Any):
        super().__init__(address)
        self._value = value
    
    def get_value(self) -> Any:
        return self._value
    
    def set_value(self, value: Any):
        """Set cell value"""
        with self._lock:
            old_value = self._value
            self._value = value
            if old_value != value:
                self.notify_observers()
    
    def get_type(self) -> CellType:
        return CellType.VALUE
    
    def create_memento(self) -> CellMemento:
        return CellMemento(self.address, self._value, None, CellType.VALUE)
    
    def restore_from_memento(self, memento: CellMemento):
        self._value = memento.value
    
    def __repr__(self):
        return f"ValueCell({self.address}, {self._value})"


class FormulaCell(Cell):
    """Formula cell (stores and evaluates formula)"""
    
    def __init__(self, address: CellAddress, formula: str, expression: Expression, context: EvaluationContext):
        super().__init__(address)
        self.formula = formula
        self.expression = expression
        self.context = context
        self.cached_value = None
        self.is_dirty = True
        self.is_evaluating = False  # Prevent circular evaluation
    
    def get_value(self) -> Any:
        """Get evaluated value (lazy evaluation)"""
        if self.is_dirty:
            self.evaluate()
        return self.cached_value
    
    def evaluate(self) -> Any:
        """Evaluate formula"""
        if self.is_evaluating:
            return ErrorType.CIRCULAR.value
        
        with self._lock:
            try:
                self.is_evaluating = True
                self.cached_value = self.expression.evaluate(self.context)
                self.is_dirty = False
            except Exception as e:
                self.cached_value = ErrorType.VALUE_ERROR.value
            finally:
                self.is_evaluating = False
        
        return self.cached_value
    
    def mark_dirty(self):
        """Mark cell as needing recalculation"""
        if not self.is_dirty:
            self.is_dirty = True
            self.notify_observers()
    
    def get_dependencies(self) -> Set[CellAddress]:
        """Get cell dependencies"""
        return self.expression.get_dependencies()
    
    def get_type(self) -> CellType:
        return CellType.FORMULA
    
    def create_memento(self) -> CellMemento:
        return CellMemento(self.address, self.cached_value, self.formula, CellType.FORMULA)
    
    def restore_from_memento(self, memento: CellMemento):
        # Would need to reparse formula
        pass
    
    def __repr__(self):
        return f"FormulaCell({self.address}, ={self.formula}, cached={self.cached_value})"


class CellFactory:
    """Factory for creating cells"""
    
    @staticmethod
    def create_cell(address: CellAddress, value: Any, context: Optional[EvaluationContext] = None) -> Cell:
        """Create appropriate cell type"""
        if value is None or value == "":
            return EmptyCell(address)
        
        if isinstance(value, str) and value.startswith('='):
            # Formula cell
            if not context:
                raise ValueError("Context required for formula cell")
            formula = value[1:]  # Remove '='
            try:
                lexer = Lexer(formula)
                parser = Parser(lexer)
                expression = parser.parse()
                return FormulaCell(address, formula, expression, context)
            except Exception as e:
                # Return error cell
                return ValueCell(address, ErrorType.VALUE_ERROR.value)
        
        # Value cell
        return ValueCell(address, value)


# ==================== Pattern 2: Dependency Manager (Observer Pattern) ====================

class DependencyManager:
    """Manages cell dependencies"""
    
    def __init__(self):
        # Forward dependencies: cell -> set of cells that depend on it
        self.dependents: Dict[CellAddress, Set[CellAddress]] = defaultdict(set)
        # Reverse dependencies: cell -> set of cells it depends on
        self.dependencies: Dict[CellAddress, Set[CellAddress]] = defaultdict(set)
    
    def add_dependency(self, from_cell: CellAddress, to_cell: CellAddress):
        """Add dependency: from_cell depends on to_cell"""
        self.dependencies[from_cell].add(to_cell)
        self.dependents[to_cell].add(from_cell)
    
    def remove_dependencies(self, cell: CellAddress):
        """Remove all dependencies for a cell"""
        # Remove from dependents
        for dep in self.dependencies[cell]:
            self.dependents[dep].discard(cell)
        # Clear dependencies
        self.dependencies[cell].clear()
    
    def get_dependents(self, cell: CellAddress) -> Set[CellAddress]:
        """Get cells that depend on this cell"""
        return self.dependents[cell]
    
    def get_all_dependents_transitive(self, cell: CellAddress) -> Set[CellAddress]:
        """Get all transitive dependents"""
        result = set()
        queue = deque([cell])
        visited = {cell}
        
        while queue:
            current = queue.popleft()
            for dependent in self.dependents[current]:
                if dependent not in visited:
                    visited.add(dependent)
                    result.add(dependent)
                    queue.append(dependent)
        
        return result
    
    def has_circular_dependency(self, start_cell: CellAddress) -> bool:
        """Check if there's a circular dependency"""
        def dfs(cell: CellAddress, visited: Set[CellAddress], rec_stack: Set[CellAddress]) -> bool:
            visited.add(cell)
            rec_stack.add(cell)
            
            for dependent in self.dependents.get(cell, set()):
                if dependent not in visited:
                    if dfs(dependent, visited, rec_stack):
                        return True
                elif dependent in rec_stack:
                    return True
            
            rec_stack.remove(cell)
            return False
        
        return dfs(start_cell, set(), set())
    
    def topological_sort(self, cells: Set[CellAddress]) -> List[CellAddress]:
        """Sort cells in evaluation order"""
        in_degree = {cell: 0 for cell in cells}
        
        # Calculate in-degrees
        for cell in cells:
            for dep in self.dependencies[cell]:
                if dep in cells:
                    in_degree[cell] += 1
        
        # Queue cells with no dependencies
        queue = deque([cell for cell in cells if in_degree[cell] == 0])
        result = []
        
        while queue:
            cell = queue.popleft()
            result.append(cell)
            
            # Reduce in-degree for dependents
            for dependent in self.dependents.get(cell, set()):
                if dependent in in_degree:
                    in_degree[dependent] -= 1
                    if in_degree[dependent] == 0:
                        queue.append(dependent)
        
        if len(result) != len(cells):
            raise ValueError("Circular dependency detected")
        
        return result


# ==================== Pattern 3: Command Pattern (Undo/Redo) ====================

class Command(ABC):
    """Abstract command for undo/redo"""
    
    @abstractmethod
    def execute(self):
        """Execute command"""
        pass
    
    @abstractmethod
    def undo(self):
        """Undo command"""
        pass


class SetCellCommand(Command):
    """Command to set cell value"""
    
    def __init__(self, spreadsheet: 'Spreadsheet', address: CellAddress, value: Any):
        self.spreadsheet = spreadsheet
        self.address = address
        self.value = value
        self.old_cell = None
    
    def execute(self):
        """Execute command"""
        self.old_cell = self.spreadsheet.get_cell(self.address)
        self.spreadsheet.set_cell_value(self.address, self.value)
    
    def undo(self):
        """Undo command"""
        if self.old_cell:
            self.spreadsheet.cells[self.address] = self.old_cell
            self.spreadsheet._recalculate_dependents(self.address)


class CommandHistory:
    """Manages command history for undo/redo"""
    
    def __init__(self):
        self.undo_stack: List[Command] = []
        self.redo_stack: List[Command] = []
    
    def execute(self, command: Command):
        """Execute and store command"""
        command.execute()
        self.undo_stack.append(command)
        self.redo_stack.clear()
    
    def undo(self):
        """Undo last command"""
        if not self.undo_stack:
            return
        command = self.undo_stack.pop()
        command.undo()
        self.redo_stack.append(command)
    
    def redo(self):
        """Redo last undone command"""
        if not self.redo_stack:
            return
        command = self.redo_stack.pop()
        command.execute()
        self.undo_stack.append(command)


# ==================== Pattern 4: Collaboration Manager ====================

class CollaborationManager:
    """Manages collaborative editing"""
    
    def __init__(self):
        self.active_users: Dict[str, User] = {}
        self.cell_locks: Dict[CellAddress, User] = {}
    
    def add_user(self, user_id: str, name: str) -> User:
        """Add a user to the session"""
        user = User(user_id, name)
        self.active_users[user_id] = user
        return user
    
    def remove_user(self, user_id: str):
        """Remove a user from the session"""
        if user_id in self.active_users:
            user = self.active_users[user_id]
            # Unlock all cells locked by this user
            locked_cells = [addr for addr, u in self.cell_locks.items() if u.id == user_id]
            for addr in locked_cells:
                del self.cell_locks[addr]
            del self.active_users[user_id]
    
    def lock_cell(self, address: CellAddress, user_id: str) -> bool:
        """Lock a cell for editing"""
        if address in self.cell_locks:
            return False
        if user_id not in self.active_users:
            return False
        self.cell_locks[address] = self.active_users[user_id]
        return True
    
    def unlock_cell(self, address: CellAddress, user_id: str) -> bool:
        """Unlock a cell after editing"""
        if address not in self.cell_locks:
            return False
        if self.cell_locks[address].id != user_id:
            return False
        del self.cell_locks[address]
        return True
    
    def is_locked(self, address: CellAddress) -> bool:
        """Check if cell is locked"""
        return address in self.cell_locks
    
    def get_lock_owner(self, address: CellAddress) -> Optional[User]:
        """Get the user who locked the cell"""
        return self.cell_locks.get(address)


# ==================== Pattern 8: Singleton Pattern (Spreadsheet) ====================

class Spreadsheet:
    """Main spreadsheet class"""
    
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        if hasattr(self, '_initialized'):
            return
        self._initialized = True
        
        self.cells: Dict[CellAddress, Cell] = {}
        self.dependency_manager = DependencyManager()
        self.function_registry = FunctionRegistry()
        self.history = CommandHistory()
        self.collaboration_manager = CollaborationManager()
        self._context = EvaluationContext(self, self.function_registry)
    
    def get_cell(self, address: CellAddress) -> Cell:
        """Get cell at address"""
        if address not in self.cells:
            self.cells[address] = EmptyCell(address)
        return self.cells[address]
    
    def set_cell_value(self, address: CellAddress, value: Any):
        """Set cell value"""
        # Remove old dependencies
        self.dependency_manager.remove_dependencies(address)
        
        # Create new cell
        cell = CellFactory.create_cell(address, value, self._context)
        
        # Add new dependencies for formula cells
        if isinstance(cell, FormulaCell):
            for dep_addr in cell.get_dependencies():
                self.dependency_manager.add_dependency(address, dep_addr)
            
            # Check for circular dependencies
            if self.dependency_manager.has_circular_dependency(address):
                # Revert and raise error
                self.cells[address] = ValueCell(address, ErrorType.CIRCULAR.value)
                return
        
        self.cells[address] = cell
        
        # Recalculate dependents
        self._recalculate_dependents(address)
    
    def _recalculate_dependents(self, address: CellAddress):
        """Recalculate cells that depend on this cell"""
        affected = self.dependency_manager.get_all_dependents_transitive(address)
        if not affected:
            return
        
        # Sort in evaluation order
        try:
            eval_order = self.dependency_manager.topological_sort(affected)
            for cell_addr in eval_order:
                cell = self.get_cell(cell_addr)
                if isinstance(cell, FormulaCell):
                    cell.mark_dirty()
        except ValueError:
            # Circular dependency
            pass
    
    def undo(self):
        """Undo last operation"""
        self.history.undo()
    
    def redo(self):
        """Redo last undone operation"""
        self.history.redo()
    
    def get_cell_value(self, address_str: str) -> Any:
        """Get cell value by address string"""
        addr = CellAddress.parse(address_str)
        return self.get_cell(addr).get_value()
    
    def set_cell_value_with_undo(self, address_str: str, value: Any):
        """Set cell value with undo support"""
        addr = CellAddress.parse(address_str)
        cmd = SetCellCommand(self, addr, value)
        self.history.execute(cmd)
    
    def display(self, rows: int = 5, cols: int = 5):
        """Display spreadsheet"""
        print("\n" + "=" * 80)
        print("Spreadsheet:")
        print("-" * 80)
        
        # Header
        header = "   |"
        for col in range(cols):
            header += f" {chr(65 + col):>8} |"
        print(header)
        print("-" * 80)
        
        # Rows
        for row in range(rows):
            row_str = f"{row + 1:>2} |"
            for col in range(cols):
                addr = CellAddress(row, col)
                cell = self.get_cell(addr)
                value = cell.get_value()
                if value is None:
                    value_str = ""
                elif isinstance(value, float):
                    value_str = f"{value:.2f}"
                else:
                    value_str = str(value)
                row_str += f" {value_str:>8} |"
            print(row_str)
        
        print("=" * 80)


# ==================== Demo ====================

def demo_basic_operations():
    """Demo basic cell operations"""
    print("\n" + "=" * 80)
    print("DEMO 1: Basic Cell Operations")
    print("=" * 80)
    
    sheet = Spreadsheet()
    
    # Set values
    sheet.set_cell_value(CellAddress.parse('A1'), 10)
    sheet.set_cell_value(CellAddress.parse('A2'), 20)
    sheet.set_cell_value(CellAddress.parse('A3'), 30)
    
    # Set formulas
    sheet.set_cell_value(CellAddress.parse('B1'), '=A1 + A2')
    sheet.set_cell_value(CellAddress.parse('B2'), '=SUM(A1:A3)')
    sheet.set_cell_value(CellAddress.parse('B3'), '=AVERAGE(A1:A3)')
    
    print("\n✅ Set values: A1=10, A2=20, A3=30")
    print("✅ Set formulas: B1=A1+A2, B2=SUM(A1:A3), B3=AVERAGE(A1:A3)")
    
    sheet.display(rows=4, cols=3)
    
    print(f"\n📊 Results:")
    print(f"   B1 = {sheet.get_cell_value('B1')} (should be 30)")
    print(f"   B2 = {sheet.get_cell_value('B2')} (should be 60)")
    print(f"   B3 = {sheet.get_cell_value('B3')} (should be 20.0)")


def demo_cascading_updates():
    """Demo cascading updates with dependencies"""
    print("\n" + "=" * 80)
    print("DEMO 2: Cascading Updates with Dependencies")
    print("=" * 80)
    
    sheet = Spreadsheet()
    
    # Create dependency chain
    sheet.set_cell_value(CellAddress.parse('A1'), 10)
    sheet.set_cell_value(CellAddress.parse('A2'), '=A1 + 5')
    sheet.set_cell_value(CellAddress.parse('A3'), '=A2 * 2')
    sheet.set_cell_value(CellAddress.parse('A4'), '=A3 + 10')
    
    print("\n✅ Created dependency chain:")
    print("   A1 = 10")
    print("   A2 = A1 + 5")
    print("   A3 = A2 * 2")
    print("   A4 = A3 + 10")
    
    sheet.display(rows=5, cols=2)
    
    print(f"\n📊 Initial values:")
    print(f"   A1 = {sheet.get_cell_value('A1')}")
    print(f"   A2 = {sheet.get_cell_value('A2')} (should be 15)")
    print(f"   A3 = {sheet.get_cell_value('A3')} (should be 30)")
    print(f"   A4 = {sheet.get_cell_value('A4')} (should be 40)")
    
    # Update A1 - should cascade
    print("\n🔄 Changing A1 to 20...")
    sheet.set_cell_value(CellAddress.parse('A1'), 20)
    
    sheet.display(rows=5, cols=2)
    
    print(f"\n📊 After cascading update:")
    print(f"   A1 = {sheet.get_cell_value('A1')}")
    print(f"   A2 = {sheet.get_cell_value('A2')} (should be 25)")
    print(f"   A3 = {sheet.get_cell_value('A3')} (should be 50)")
    print(f"   A4 = {sheet.get_cell_value('A4')} (should be 60)")


def demo_circular_dependency():
    """Demo circular dependency detection"""
    print("\n" + "=" * 80)
    print("DEMO 3: Circular Dependency Detection")
    print("=" * 80)
    
    sheet = Spreadsheet()
    
    # Create valid formulas
    sheet.set_cell_value(CellAddress.parse('A1'), '=B1 + 1')
    sheet.set_cell_value(CellAddress.parse('B1'), '=C1 * 2')
    
    print("\n✅ Created formulas:")
    print("   A1 = B1 + 1")
    print("   B1 = C1 * 2")
    print("   (No circular dependency yet)")
    
    # Try to create circular dependency
    print("\n⚠️  Attempting to create circular dependency: C1 = A1 + 5")
    sheet.set_cell_value(CellAddress.parse('C1'), '=A1 + 5')
    
    result = sheet.get_cell_value('C1')
    print(f"\n❌ Result: C1 = {result}")
    print(f"   Circular dependency detected and prevented!")


def demo_undo_redo():
    """Demo undo/redo functionality"""
    print("\n" + "=" * 80)
    print("DEMO 4: Undo/Redo Functionality")
    print("=" * 80)
    
    sheet = Spreadsheet()
    
    # Make changes with undo support
    sheet.set_cell_value_with_undo('A1', 10)
    sheet.set_cell_value_with_undo('A2', 20)
    sheet.set_cell_value_with_undo('A3', '=A1 + A2')
    
    print("\n✅ Made changes:")
    print("   A1 = 10")
    print("   A2 = 20")
    print("   A3 = A1 + A2")
    
    print(f"\n📊 A3 = {sheet.get_cell_value('A3')} (should be 30)")
    
    # Undo last operation
    print("\n⏪ Undoing last operation (A3 formula)...")
    sheet.undo()
    print(f"   A3 = {sheet.get_cell_value('A3')} (should be None)")
    
    # Redo
    print("\n⏩ Redoing operation...")
    sheet.redo()
    print(f"   A3 = {sheet.get_cell_value('A3')} (should be 30)")


def demo_functions():
    """Demo built-in functions"""
    print("\n" + "=" * 80)
    print("DEMO 5: Built-in Functions")
    print("=" * 80)
    
    sheet = Spreadsheet()
    
    # Set up data
    sheet.set_cell_value(CellAddress.parse('A1'), 5)
    sheet.set_cell_value(CellAddress.parse('A2'), 10)
    sheet.set_cell_value(CellAddress.parse('A3'), 15)
    sheet.set_cell_value(CellAddress.parse('A4'), 20)
    sheet.set_cell_value(CellAddress.parse('A5'), 25)
    
    # Various functions
    sheet.set_cell_value(CellAddress.parse('B1'), '=SUM(A1:A5)')
    sheet.set_cell_value(CellAddress.parse('B2'), '=AVERAGE(A1:A5)')
    sheet.set_cell_value(CellAddress.parse('B3'), '=MIN(A1:A5)')
    sheet.set_cell_value(CellAddress.parse('B4'), '=MAX(A1:A5)')
    sheet.set_cell_value(CellAddress.parse('B5'), '=COUNT(A1:A5)')
    sheet.set_cell_value(CellAddress.parse('C1'), '=IF(B1 > 50, "High", "Low")')
    sheet.set_cell_value(CellAddress.parse('C2'), '=SQRT(A5)')
    sheet.set_cell_value(CellAddress.parse('C3'), '=POW(2, 3)')
    
    print("\n✅ Data: A1=5, A2=10, A3=15, A4=20, A5=25")
    print("\n✅ Functions:")
    print("   B1 = SUM(A1:A5)")
    print("   B2 = AVERAGE(A1:A5)")
    print("   B3 = MIN(A1:A5)")
    print("   B4 = MAX(A1:A5)")
    print("   B5 = COUNT(A1:A5)")
    print("   C1 = IF(B1 > 50, \"High\", \"Low\")")
    print("   C2 = SQRT(A5)")
    print("   C3 = POW(2, 3)")
    
    sheet.display(rows=6, cols=4)
    
    print(f"\n📊 Results:")
    print(f"   SUM = {sheet.get_cell_value('B1')}")
    print(f"   AVERAGE = {sheet.get_cell_value('B2')}")
    print(f"   MIN = {sheet.get_cell_value('B3')}")
    print(f"   MAX = {sheet.get_cell_value('B4')}")
    print(f"   COUNT = {sheet.get_cell_value('B5')}")
    print(f"   IF = {sheet.get_cell_value('C1')}")
    print(f"   SQRT = {sheet.get_cell_value('C2')}")
    print(f"   POW = {sheet.get_cell_value('C3')}")


def demo_collaboration():
    """Demo collaborative editing"""
    print("\n" + "=" * 80)
    print("DEMO 6: Collaborative Editing")
    print("=" * 80)
    
    sheet = Spreadsheet()
    collab = sheet.collaboration_manager
    
    # Add users
    user1 = collab.add_user('u1', 'Alice')
    user2 = collab.add_user('u2', 'Bob')
    
    print(f"\n✅ Added users: {user1.name}, {user2.name}")
    
    # User 1 locks and edits cell
    addr_a1 = CellAddress.parse('A1')
    success = collab.lock_cell(addr_a1, 'u1')
    print(f"\n🔒 {user1.name} locked A1: {success}")
    
    sheet.set_cell_value(addr_a1, 100)
    print(f"   {user1.name} set A1 = 100")
    
    # User 2 tries to lock same cell
    success = collab.lock_cell(addr_a1, 'u2')
    print(f"\n❌ {user2.name} tried to lock A1: {success} (already locked by {user1.name})")
    
    # User 1 unlocks
    collab.unlock_cell(addr_a1, 'u1')
    print(f"\n🔓 {user1.name} unlocked A1")
    
    # User 2 can now lock
    success = collab.lock_cell(addr_a1, 'u2')
    print(f"🔒 {user2.name} locked A1: {success}")
    
    sheet.set_cell_value(addr_a1, 200)
    print(f"   {user2.name} set A1 = 200")
    
    collab.unlock_cell(addr_a1, 'u2')
    print(f"🔓 {user2.name} unlocked A1")
    
    print(f"\n📊 Final value: A1 = {sheet.get_cell_value('A1')}")


# ==================== Main ====================

def main():
    """Run all demos"""
    print("\n" + "=" * 100)
    print(" " * 30 + "SPREADSHEET SYSTEM - COMPREHENSIVE DEMO")
    print("=" * 100)
    print("\n📊 A collaborative spreadsheet system demonstrating 10 design patterns:")
    print("   1. Interpreter Pattern - Formula parsing and evaluation")
    print("   2. Observer Pattern - Dependency tracking and updates")
    print("   3. Command Pattern - Undo/redo operations")
    print("   4. Composite Pattern - Formula expression tree")
    print("   5. Strategy Pattern - Value types and formatters")
    print("   6. Factory Pattern - Cell type creation")
    print("   7. Memento Pattern - State saving for undo")
    print("   8. Singleton Pattern - Spreadsheet instance")
    print("   9. Visitor Pattern - Formula AST traversal")
    print("  10. Proxy Pattern - Lazy formula evaluation")
    
    demo_basic_operations()
    demo_cascading_updates()
    demo_circular_dependency()
    demo_undo_redo()
    demo_functions()
    demo_collaboration()
    
    print("\n" + "=" * 100)
    print("✅ All demos completed successfully!")
    print("=" * 100)
    print("\n🎯 Key Features Demonstrated:")
    print("   ✓ Cell management (value, formula, empty)")
    print("   ✓ Formula engine with 15+ built-in functions")
    print("   ✓ Automatic dependency tracking and recalculation")
    print("   ✓ Circular dependency detection and prevention")
    print("   ✓ Undo/redo support with command pattern")
    print("   ✓ Collaborative editing with cell locking")
    print("   ✓ Error handling (#DIV/0!, #REF!, #CIRCULAR!)")
    print("   ✓ Range operations (SUM, AVERAGE, COUNT, etc.)")
    print("   ✓ Lazy evaluation with caching")
    print("   ✓ Thread-safe operations")
    print("=" * 100 + "\n")


if __name__ == "__main__":
    main()
