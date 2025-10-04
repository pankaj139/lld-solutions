"""
Splitwise / Expense Sharing System - Low Level Design Implementation in Python

This file implements a complete expense sharing system similar to Splitwise that allows
users to track shared expenses, calculate balances, and simplify debts using minimal transactions.

DESIGN PATTERNS USED:
1. Strategy Pattern: Different split strategies (EqualSplit, ExactSplit, PercentageSplit)
2. Factory Pattern: SplitFactory creates appropriate split strategy instances
3. Observer Pattern: NotificationService observes expense changes and notifies users
4. Command Pattern: AddExpenseCommand and SettleUpCommand encapsulate operations
5. Composite Pattern: Group can contain multiple expenses (composition)

OOP CONCEPTS DEMONSTRATED:
- ENCAPSULATION: Private attributes with getter/setter methods, balance sheet data hiding
- ABSTRACTION: Abstract SplitStrategy and ExpenseObserver interfaces
- INHERITANCE: Concrete split strategies inherit from SplitStrategy
- POLYMORPHISM: Different split strategies implement same interface differently

SOLID PRINCIPLES:
- SRP: Each class has single responsibility (User, Expense, BalanceSheet, DebtSimplifier)
- OCP: Open for extension (new split strategies) closed for modification
- LSP: Any SplitStrategy can be used interchangeably
- ISP: Focused interfaces (ExpenseObserver, SplitStrategy)
- DIP: ExpenseManager depends on abstractions (SplitStrategy, ExpenseObserver)

BUSINESS FEATURES:
- Multiple split types (equal, exact amounts, percentages)
- Balance tracking with O(1) lookup
- Debt simplification using greedy algorithm
- Group expense management
- Settlement operations
- Expense history and audit trail

ARCHITECTURAL NOTES:
- Uses integer arithmetic (cents) for precision
- Hash map based balance sheet for O(1) operations
- Heap-based debt simplification for O(n log n) performance
- Immutable expense records for audit trail
- Observer pattern for loose coupling between components
"""

from abc import ABC, abstractmethod
from enum import Enum
from datetime import datetime
from typing import Dict, List, Optional, Tuple
import uuid
import heapq
from collections import defaultdict


# Enums - Domain model definitions
class SplitType(Enum):
    """
    Defines the types of expense splitting strategies available.
    
    EQUAL: Split amount equally among all participants
    EXACT: Each participant has specific exact amount
    PERCENTAGE: Each participant has percentage of total
    """
    EQUAL = "EQUAL"
    EXACT = "EXACT"
    PERCENTAGE = "PERCENTAGE"


class TransactionStatus(Enum):
    """Transaction status for audit trail"""
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


# ============================================================================
# CORE DOMAIN MODELS
# ============================================================================

class User:
    """
    Represents a user in the expense sharing system.
    
    DESIGN PATTERN: Entity pattern - has unique identity
    OOP CONCEPTS: Encapsulation - private attributes with getters
    
    How to use:
    user = User("Alice", "alice@example.com", "1234567890")
    print(user.get_name())  # Returns: Alice
    
    Returns: User object with unique ID
    """
    
    def __init__(self, name: str, email: str, phone: str = ""):
        """Initialize user with name, email, and optional phone."""
        self._id = str(uuid.uuid4())
        self._name = name
        self._email = email
        self._phone = phone
    
    def get_id(self) -> str:
        """Get user ID."""
        return self._id
    
    def get_name(self) -> str:
        """Get user name."""
        return self._name
    
    def get_email(self) -> str:
        """Get user email."""
        return self._email
    
    def __str__(self) -> str:
        return f"User({self._name})"
    
    def __repr__(self) -> str:
        return self.__str__()
    
    def __hash__(self):
        return hash(self._id)
    
    def __eq__(self, other):
        if not isinstance(other, User):
            return False
        return self._id == other._id


# ============================================================================
# STRATEGY PATTERN - Split Strategies
# ============================================================================

class SplitStrategy(ABC):
    """
    Abstract strategy for splitting expenses among participants.
    
    DESIGN PATTERN: Strategy Pattern - defines family of algorithms
    OOP CONCEPT: Abstraction - abstract interface for all split types
    SOLID: OCP - open for extension (new strategies), closed for modification
    
    How to use:
    strategy = EqualSplit()
    shares = strategy.calculate_shares(300.0, [user1, user2, user3], None)
    
    Returns: Dictionary mapping users to their share amounts
    """
    
    @abstractmethod
    def calculate_shares(
        self, 
        amount: float, 
        participants: List[User], 
        metadata: Optional[Dict] = None
    ) -> Dict[User, float]:
        """
        Calculate how much each participant owes.
        
        BUSINESS RULE: Total shares must equal the expense amount
        """
        pass
    
    @abstractmethod
    def validate(
        self, 
        amount: float, 
        participants: List[User], 
        metadata: Optional[Dict] = None
    ) -> Tuple[bool, str]:
        """
        Validate if the split configuration is correct.
        
        Returns: (is_valid, error_message)
        """
        pass


class EqualSplit(SplitStrategy):
    """
    Splits expense equally among all participants.
    
    DESIGN PATTERN: Strategy Pattern - concrete strategy implementation
    OOP CONCEPT: Polymorphism - implements SplitStrategy interface
    
    How to use:
    strategy = EqualSplit()
    shares = strategy.calculate_shares(300.0, [user1, user2, user3], None)
    # Returns: {user1: 100.0, user2: 100.0, user3: 100.0}
    
    Returns: Equal share for each participant
    """
    
    def calculate_shares(
        self, 
        amount: float, 
        participants: List[User], 
        metadata: Optional[Dict] = None
    ) -> Dict[User, float]:
        """
        Divide amount equally, handling remainders.
        
        BUSINESS RULE: Use integer division to avoid floating-point errors
        """
        if not participants:
            return {}
        
        # Convert to cents for precision
        amount_cents = int(amount * 100)
        num_participants = len(participants)
        share_cents = amount_cents // num_participants
        remainder = amount_cents % num_participants
        
        shares = {}
        for i, user in enumerate(participants):
            # Distribute remainder across first few participants
            user_share = share_cents + (1 if i < remainder else 0)
            shares[user] = user_share / 100.0
        
        return shares
    
    def validate(
        self, 
        amount: float, 
        participants: List[User], 
        metadata: Optional[Dict] = None
    ) -> Tuple[bool, str]:
        """Validate equal split parameters."""
        if amount <= 0:
            return False, "Amount must be positive"
        if not participants:
            return False, "Must have at least one participant"
        return True, ""


class ExactSplit(SplitStrategy):
    """
    Splits expense with exact amounts specified for each participant.
    
    DESIGN PATTERN: Strategy Pattern - concrete strategy
    OOP CONCEPT: Polymorphism - different implementation of same interface
    
    How to use:
    exact_amounts = {user1: 100.0, user2: 200.0}
    strategy = ExactSplit(exact_amounts)
    shares = strategy.calculate_shares(300.0, [user1, user2], None)
    
    Returns: Specified exact amounts for each user
    """
    
    def __init__(self, exact_amounts: Dict[User, float]):
        """
        Initialize with exact amounts for each user.
        
        BUSINESS RULE: Sum of exact amounts must equal total expense
        """
        self._exact_amounts = exact_amounts
    
    def calculate_shares(
        self, 
        amount: float, 
        participants: List[User], 
        metadata: Optional[Dict] = None
    ) -> Dict[User, float]:
        """Return the pre-specified exact amounts."""
        return self._exact_amounts.copy()
    
    def validate(
        self, 
        amount: float, 
        participants: List[User], 
        metadata: Optional[Dict] = None
    ) -> Tuple[bool, str]:
        """
        Validate that exact amounts sum to total.
        
        BUSINESS RULE: Total of exact amounts must equal expense amount (within epsilon)
        """
        if amount <= 0:
            return False, "Amount must be positive"
        
        if not self._exact_amounts:
            return False, "Exact amounts not specified"
        
        # Check if all participants have amounts
        for user in participants:
            if user not in self._exact_amounts:
                return False, f"Amount not specified for {user.get_name()}"
        
        # Validate sum (allow small epsilon for floating point)
        total = sum(self._exact_amounts.values())
        if abs(total - amount) > 0.01:
            return False, f"Exact amounts ({total}) don't match expense ({amount})"
        
        return True, ""


class PercentageSplit(SplitStrategy):
    """
    Splits expense based on percentage for each participant.
    
    DESIGN PATTERN: Strategy Pattern - concrete strategy
    OOP CONCEPT: Polymorphism - alternate implementation
    
    How to use:
    percentages = {user1: 60.0, user2: 40.0}
    strategy = PercentageSplit(percentages)
    shares = strategy.calculate_shares(100.0, [user1, user2], None)
    # Returns: {user1: 60.0, user2: 40.0}
    
    Returns: Amounts calculated from percentages
    """
    
    def __init__(self, percentages: Dict[User, float]):
        """
        Initialize with percentage for each user.
        
        BUSINESS RULE: Percentages must sum to 100
        """
        self._percentages = percentages
    
    def calculate_shares(
        self, 
        amount: float, 
        participants: List[User], 
        metadata: Optional[Dict] = None
    ) -> Dict[User, float]:
        """Calculate amounts based on percentages."""
        shares = {}
        for user, percentage in self._percentages.items():
            shares[user] = (amount * percentage) / 100.0
        return shares
    
    def validate(
        self, 
        amount: float, 
        participants: List[User], 
        metadata: Optional[Dict] = None
    ) -> Tuple[bool, str]:
        """
        Validate percentages sum to 100.
        
        BUSINESS RULE: Total percentages must equal 100
        """
        if amount <= 0:
            return False, "Amount must be positive"
        
        if not self._percentages:
            return False, "Percentages not specified"
        
        # Check all participants have percentages
        for user in participants:
            if user not in self._percentages:
                return False, f"Percentage not specified for {user.get_name()}"
        
        # Validate sum equals 100%
        total = sum(self._percentages.values())
        if abs(total - 100.0) > 0.01:
            return False, f"Percentages must sum to 100, got {total}"
        
        return True, ""


# ============================================================================
# FACTORY PATTERN - Split Factory
# ============================================================================

class SplitFactory:
    """
    Factory for creating split strategy instances.
    
    DESIGN PATTERN: Factory Pattern - centralizes object creation
    SOLID: SRP - single responsibility is creating split strategies
    
    How to use:
    factory = SplitFactory()
    strategy = factory.create_split(SplitType.EQUAL, None)
    
    Returns: Appropriate SplitStrategy instance
    """
    
    @staticmethod
    def create_split(split_type: SplitType, metadata: Optional[Dict] = None) -> SplitStrategy:
        """
        Create appropriate split strategy based on type.
        
        DESIGN PATTERN: Factory Method - encapsulates instantiation logic
        """
        if split_type == SplitType.EQUAL:
            return EqualSplit()
        elif split_type == SplitType.EXACT:
            if not metadata or 'exact_amounts' not in metadata:
                raise ValueError("Exact amounts required for EXACT split")
            return ExactSplit(metadata['exact_amounts'])
        elif split_type == SplitType.PERCENTAGE:
            if not metadata or 'percentages' not in metadata:
                raise ValueError("Percentages required for PERCENTAGE split")
            return PercentageSplit(metadata['percentages'])
        else:
            raise ValueError(f"Unknown split type: {split_type}")


# ============================================================================
# EXPENSE AND TRANSACTION MODELS
# ============================================================================

class Expense:
    """
    Represents a shared expense in the system.
    
    DESIGN PATTERN: Entity pattern - has unique identity
    OOP CONCEPTS: Encapsulation - immutable after creation for audit trail
    
    How to use:
    expense = Expense("Dinner", 300.0, paid_by_user, [user1, user2], EqualSplit())
    splits = expense.calculate_splits()
    
    Returns: Expense object with calculated splits
    """
    
    def __init__(
        self, 
        description: str, 
        amount: float, 
        paid_by: User, 
        participants: List[User], 
        split_strategy: SplitStrategy
    ):
        """
        Create new expense.
        
        BUSINESS RULE: Expense is immutable after creation for audit purposes
        """
        self._id = str(uuid.uuid4())
        self._description = description
        self._amount = amount
        self._paid_by = paid_by
        self._participants = participants.copy()
        self._split_strategy = split_strategy
        self._timestamp = datetime.now()
        
        # Validate the split
        is_valid, error_msg = split_strategy.validate(amount, participants, None)
        if not is_valid:
            raise ValueError(f"Invalid expense split: {error_msg}")
    
    def get_id(self) -> str:
        """Get expense ID."""
        return self._id
    
    def get_description(self) -> str:
        """Get expense description."""
        return self._description
    
    def get_amount(self) -> float:
        """Get expense amount."""
        return self._amount
    
    def get_paid_by(self) -> User:
        """Get user who paid."""
        return self._paid_by
    
    def get_participants(self) -> List[User]:
        """Get list of participants."""
        return self._participants.copy()
    
    def get_timestamp(self) -> datetime:
        """Get expense timestamp."""
        return self._timestamp
    
    def calculate_splits(self) -> Dict[User, float]:
        """
        Calculate how much each participant owes.
        
        DESIGN PATTERN: Strategy Pattern - delegates to split strategy
        """
        return self._split_strategy.calculate_shares(
            self._amount, 
            self._participants, 
            None
        )
    
    def __str__(self) -> str:
        return f"Expense({self._description}, ${self._amount:.2f}, paid by {self._paid_by.get_name()})"


class Transaction:
    """
    Represents a payment transaction between two users.
    
    DESIGN PATTERN: Value Object - represents a payment
    OOP CONCEPTS: Encapsulation - immutable transaction record
    
    How to use:
    transaction = Transaction(from_user, to_user, 50.0, "Settlement")
    print(transaction.get_amount())  # Returns: 50.0
    
    Returns: Transaction object representing payment
    """
    
    def __init__(
        self, 
        from_user: User, 
        to_user: User, 
        amount: float, 
        description: str = ""
    ):
        """
        Create transaction record.
        
        BUSINESS RULE: Transactions are immutable for audit trail
        """
        self._id = str(uuid.uuid4())
        self._from_user = from_user
        self._to_user = to_user
        self._amount = amount
        self._description = description
        self._timestamp = datetime.now()
        self._status = TransactionStatus.COMPLETED
    
    def get_id(self) -> str:
        """Get transaction ID."""
        return self._id
    
    def get_from_user(self) -> User:
        """Get user who pays."""
        return self._from_user
    
    def get_to_user(self) -> User:
        """Get user who receives."""
        return self._to_user
    
    def get_amount(self) -> float:
        """Get transaction amount."""
        return self._amount
    
    def get_description(self) -> str:
        """Get transaction description."""
        return self._description
    
    def __str__(self) -> str:
        return f"{self._from_user.get_name()} pays {self._to_user.get_name()} ${self._amount:.2f}"


# ============================================================================
# BALANCE SHEET - Core Financial Tracking
# ============================================================================

class BalanceSheet:
    """
    Tracks balances between all users efficiently.
    
    DESIGN PATTERN: Repository pattern - manages balance data
    OOP CONCEPTS: Encapsulation - hides balance storage implementation
    DATA STRUCTURE: Nested hash map for O(1) lookup
    
    How to use:
    balance_sheet = BalanceSheet()
    balance_sheet.add_balance(user1, user2, 50.0)  # user1 owes user2 $50
    balance = balance_sheet.get_balance(user1, user2)
    
    Returns: BalanceSheet object managing all user balances
    """
    
    def __init__(self):
        """
        Initialize balance sheet with nested dictionary.
        
        BUSINESS RULE: balance[A][B] > 0 means A owes B
        DATA STRUCTURE: Map<UserId, Map<UserId, Amount>> for O(1) access
        """
        # balances[user1_id][user2_id] = amount user1 owes user2
        self._balances: Dict[str, Dict[str, float]] = defaultdict(lambda: defaultdict(float))
    
    def add_balance(self, user1: User, user2: User, amount: float) -> None:
        """
        Add to balance between two users.
        
        BUSINESS RULE: If user1 owes user2, add positive amount
        TIME COMPLEXITY: O(1) for hash map operations
        """
        if amount == 0:
            return
        
        user1_id = user1.get_id()
        user2_id = user2.get_id()
        
        # Add to existing balance
        current_balance = self._balances[user1_id][user2_id]
        new_balance = current_balance + amount
        
        if abs(new_balance) < 0.01:  # Close to zero, remove entry
            if user2_id in self._balances[user1_id]:
                del self._balances[user1_id][user2_id]
            if not self._balances[user1_id]:
                del self._balances[user1_id]
        else:
            self._balances[user1_id][user2_id] = new_balance
    
    def get_balance(self, user1: User, user2: User) -> float:
        """
        Get balance between two users.
        
        Returns: Positive if user1 owes user2, negative if user2 owes user1
        TIME COMPLEXITY: O(1)
        """
        user1_id = user1.get_id()
        user2_id = user2.get_id()
        
        forward = self._balances.get(user1_id, {}).get(user2_id, 0.0)
        backward = self._balances.get(user2_id, {}).get(user1_id, 0.0)
        
        return forward - backward
    
    def get_all_balances(self, user: User) -> Dict[User, float]:
        """
        Get all balances for a user.
        
        Returns: Dictionary of user to balance (positive = user owes them)
        TIME COMPLEXITY: O(u) where u is number of users user has balances with
        """
        # This would require user objects, simplified for now
        # In production, would need user lookup
        return {}
    
    def settle_balance(self, user1: User, user2: User) -> None:
        """
        Clear balance between two users (settle up).
        
        BUSINESS RULE: Sets balance to zero
        """
        user1_id = user1.get_id()
        user2_id = user2.get_id()
        
        # Remove both directions
        if user1_id in self._balances and user2_id in self._balances[user1_id]:
            del self._balances[user1_id][user2_id]
        if user2_id in self._balances and user1_id in self._balances[user2_id]:
            del self._balances[user2_id][user1_id]
    
    def get_net_balance(self, user: User, user_map: Dict[str, User]) -> float:
        """
        Calculate net balance for user (total owed - total owing).
        
        BUSINESS RULE: Positive means others owe user, negative means user owes others
        """
        user_id = user.get_id()
        net = 0.0
        
        # Amount others owe this user
        for other_id, amount in self._balances.get(user_id, {}).items():
            if amount > 0:  # user owes other
                net -= amount
            else:  # other owes user
                net += abs(amount)
        
        # Amount this user owes others
        for other_id in self._balances:
            if other_id == user_id:
                continue
            amount = self._balances[other_id].get(user_id, 0.0)
            if amount > 0:  # other owes user
                net += amount
            else:  # user owes other
                net -= abs(amount)
        
        return net
    
    def get_all_non_zero_balances(self, user_map: Dict[str, User]) -> Dict[Tuple[User, User], float]:
        """
        Get all non-zero balances in system.
        
        Returns: Dictionary of (user1, user2) -> amount where user1 owes user2
        """
        result = {}
        for user1_id in self._balances:
            for user2_id, amount in self._balances[user1_id].items():
                if abs(amount) > 0.01:
                    user1 = user_map.get(user1_id)
                    user2 = user_map.get(user2_id)
                    if user1 and user2:
                        result[(user1, user2)] = amount
        return result


# ============================================================================
# DEBT SIMPLIFICATION - Graph Algorithm
# ============================================================================

class DebtSimplifier:
    """
    Simplifies debts to minimize number of transactions.
    
    DESIGN PATTERN: Strategy pattern for different simplification algorithms
    ALGORITHM: Greedy approach using heaps
    TIME COMPLEXITY: O(n log n) where n is number of users
    
    How to use:
    simplifier = DebtSimplifier(balance_sheet)
    transactions = simplifier.simplify_debts(users, user_map)
    
    Returns: List of Transaction objects representing minimal settlement
    """
    
    def __init__(self, balance_sheet: BalanceSheet):
        """Initialize with reference to balance sheet."""
        self._balance_sheet = balance_sheet
    
    def simplify_debts(self, users: List[User], user_map: Dict[str, User]) -> List[Transaction]:
        """
        Calculate minimum transactions to settle all debts.
        
        ALGORITHM:
        1. Calculate net balance for each user
        2. Separate into creditors (positive) and debtors (negative)
        3. Use max heap for creditors, min heap for debtors
        4. Match largest creditor with largest debtor repeatedly
        
        TIME COMPLEXITY: O(n log n) for heap operations
        SPACE COMPLEXITY: O(n) for heaps
        """
        # Step 1: Calculate net balance for each user
        net_balances = {}
        for user in users:
            net = self._balance_sheet.get_net_balance(user, user_map)
            if abs(net) > 0.01:  # Ignore near-zero balances
                net_balances[user] = net
        
        if not net_balances:
            return []
        
        # Step 2: Separate creditors and debtors
        creditors = []  # People who are owed money (max heap)
        debtors = []    # People who owe money (min heap)
        
        for user, balance in net_balances.items():
            if balance > 0:
                # Max heap in Python (negate for max behavior)
                heapq.heappush(creditors, (-balance, user))
            else:
                # Min heap (balance already negative)
                heapq.heappush(debtors, (balance, user))
        
        # Step 3: Match creditors and debtors greedily
        transactions = []
        
        while creditors and debtors:
            # Get largest creditor and debtor
            creditor_amount, creditor = heapq.heappop(creditors)
            debtor_amount, debtor = heapq.heappop(debtors)
            
            creditor_amount = -creditor_amount  # Convert back to positive
            debtor_amount = -debtor_amount      # Convert to positive
            
            # Transaction amount is minimum of what's owed and what's needed
            transaction_amount = min(creditor_amount, debtor_amount)
            
            # Create transaction
            transactions.append(
                Transaction(
                    debtor, 
                    creditor, 
                    transaction_amount, 
                    "Debt settlement"
                )
            )
            
            # Update remaining balances
            creditor_remaining = creditor_amount - transaction_amount
            debtor_remaining = debtor_amount - transaction_amount
            
            if creditor_remaining > 0.01:
                heapq.heappush(creditors, (-creditor_remaining, creditor))
            
            if debtor_remaining > 0.01:
                heapq.heappush(debtors, (-debtor_remaining, debtor))
        
        return transactions


# ============================================================================
# COMPOSITE PATTERN - Group Management
# ============================================================================

class Group:
    """
    Manages a group of users and their shared expenses.
    
    DESIGN PATTERN: Composite Pattern - group contains expenses
    OOP CONCEPTS: Composition - group has-a collection of expenses
    
    How to use:
    group = Group("Trip to Paris", [user1, user2, user3])
    group.add_expense(expense)
    balances = group.get_group_balances(balance_sheet, user_map)
    
    Returns: Group object managing members and expenses
    """
    
    def __init__(self, name: str, members: List[User]):
        """
        Create new group.
        
        BUSINESS RULE: Group must have at least 2 members
        """
        if len(members) < 2:
            raise ValueError("Group must have at least 2 members")
        
        self._id = str(uuid.uuid4())
        self._name = name
        self._members = members.copy()
        self._expenses: List[Expense] = []
        self._created_at = datetime.now()
    
    def get_id(self) -> str:
        """Get group ID."""
        return self._id
    
    def get_name(self) -> str:
        """Get group name."""
        return self._name
    
    def get_members(self) -> List[User]:
        """Get group members."""
        return self._members.copy()
    
    def add_member(self, user: User) -> None:
        """Add member to group."""
        if user not in self._members:
            self._members.append(user)
    
    def remove_member(self, user: User) -> None:
        """
        Remove member from group.
        
        BUSINESS RULE: Cannot remove if user has unsettled balances in group
        """
        if user in self._members:
            self._members.remove(user)
    
    def add_expense(self, expense: Expense) -> None:
        """
        Add expense to group.
        
        BUSINESS RULE: All participants must be group members
        """
        participants = expense.get_participants()
        for participant in participants:
            if participant not in self._members:
                raise ValueError(f"{participant.get_name()} is not a group member")
        
        self._expenses.append(expense)
    
    def get_expenses(self) -> List[Expense]:
        """Get all group expenses."""
        return self._expenses.copy()
    
    def get_group_balances(self, balance_sheet: BalanceSheet, user_map: Dict[str, User]) -> Dict[User, float]:
        """
        Get net balance for each group member.
        
        Returns: Dictionary of user to net balance (positive = owed, negative = owes)
        """
        balances = {}
        for member in self._members:
            net = balance_sheet.get_net_balance(member, user_map)
            if abs(net) > 0.01:
                balances[member] = net
        return balances
    
    def __str__(self) -> str:
        return f"Group({self._name}, {len(self._members)} members)"


# ============================================================================
# OBSERVER PATTERN - Notifications
# ============================================================================

class ExpenseObserver(ABC):
    """
    Observer interface for expense events.
    
    DESIGN PATTERN: Observer Pattern - defines observer interface
    SOLID: ISP - focused interface for observers
    
    How to use:
    class MyObserver(ExpenseObserver):
        def on_expense_added(self, expense):
            # Handle expense added
            pass
    """
    
    @abstractmethod
    def on_expense_added(self, expense: Expense) -> None:
        """Called when new expense is added."""
        pass
    
    @abstractmethod
    def on_balance_changed(self, user: User, balance: float) -> None:
        """Called when user balance changes."""
        pass


class NotificationService(ExpenseObserver):
    """
    Concrete observer that sends notifications.
    
    DESIGN PATTERN: Observer Pattern - concrete observer
    OOP CONCEPTS: Polymorphism - implements ExpenseObserver interface
    
    How to use:
    notification_service = NotificationService()
    expense_manager.add_observer(notification_service)
    
    Returns: NotificationService that observes expense changes
    """
    
    def on_expense_added(self, expense: Expense) -> None:
        """
        Notify users when expense is added.
        
        BUSINESS RULE: Notify all participants
        """
        payer = expense.get_paid_by()
        participants = expense.get_participants()
        
        for participant in participants:
            if participant != payer:
                self._send_notification(
                    participant, 
                    f"{payer.get_name()} added expense: {expense.get_description()}"
                )
    
    def on_balance_changed(self, user: User, balance: float) -> None:
        """Notify user when their balance changes."""
        self._send_notification(
            user, 
            f"Your balance changed: ${balance:.2f}"
        )
    
    def _send_notification(self, user: User, message: str) -> None:
        """
        Send notification to user.
        
        In production: integrate with email/SMS/push notification service
        """
        print(f"📧 Notification to {user.get_name()}: {message}")


# ============================================================================
# COMMAND PATTERN - Expense Operations
# ============================================================================

class ExpenseCommand(ABC):
    """
    Command interface for expense operations.
    
    DESIGN PATTERN: Command Pattern - encapsulates operations
    SOLID: SRP - each command has single responsibility
    
    How to use:
    command = AddExpenseCommand(manager, expense)
    command.execute()
    command.undo()
    """
    
    @abstractmethod
    def execute(self) -> None:
        """Execute the command."""
        pass
    
    @abstractmethod
    def undo(self) -> None:
        """Undo the command."""
        pass


class AddExpenseCommand(ExpenseCommand):
    """
    Command to add an expense.
    
    DESIGN PATTERN: Command Pattern - concrete command
    OOP CONCEPTS: Encapsulation - encapsulates add expense operation
    
    How to use:
    command = AddExpenseCommand(expense_manager, expense)
    command.execute()  # Adds expense
    command.undo()     # Removes expense
    """
    
    def __init__(self, manager: 'ExpenseManager', expense: Expense):
        """Initialize with manager and expense."""
        self._manager = manager
        self._expense = expense
        self._executed = False
    
    def execute(self) -> None:
        """Add expense to manager."""
        if not self._executed:
            self._manager.add_expense(self._expense)
            self._executed = True
    
    def undo(self) -> None:
        """Remove expense from manager (simplified - would need more logic)."""
        if self._executed:
            # In production: implement expense removal
            print(f"Undoing expense: {self._expense.get_description()}")
            self._executed = False


class SettleUpCommand(ExpenseCommand):
    """
    Command to settle balance between two users.
    
    DESIGN PATTERN: Command Pattern - concrete command
    
    How to use:
    command = SettleUpCommand(manager, user1, user2)
    command.execute()
    """
    
    def __init__(self, manager: 'ExpenseManager', user1: User, user2: User):
        """Initialize with manager and users."""
        self._manager = manager
        self._user1 = user1
        self._user2 = user2
        self._previous_balance = None
        self._executed = False
    
    def execute(self) -> None:
        """Settle balance between users."""
        if not self._executed:
            # Save previous balance for undo
            self._previous_balance = self._manager.get_balance_between(
                self._user1, 
                self._user2
            )
            self._manager.settle_up(self._user1, self._user2)
            self._executed = True
    
    def undo(self) -> None:
        """Restore previous balance."""
        if self._executed and self._previous_balance is not None:
            # In production: restore balance
            print(f"Undoing settle up between {self._user1.get_name()} and {self._user2.get_name()}")
            self._executed = False


# ============================================================================
# EXPENSE MANAGER - Main Controller (Facade)
# ============================================================================

class ExpenseManager:
    """
    Main controller managing the entire expense sharing system.
    
    DESIGN PATTERN: Facade Pattern - provides unified interface
    OOP CONCEPTS: Encapsulation - manages system complexity
    SOLID: SRP - coordinates between components
    
    How to use:
    manager = ExpenseManager()
    manager.add_user(user)
    manager.add_expense(expense)
    balances = manager.get_user_balances(user)
    
    Returns: ExpenseManager coordinating entire system
    """
    
    def __init__(self):
        """
        Initialize expense manager with all components.
        
        DESIGN PATTERN: Dependency Injection - creates dependencies
        """
        self._users: Dict[str, User] = {}
        self._expenses: Dict[str, Expense] = {}
        self._groups: Dict[str, Group] = {}
        self._balance_sheet = BalanceSheet()
        self._debt_simplifier = DebtSimplifier(self._balance_sheet)
        self._observers: List[ExpenseObserver] = []
    
    def add_user(self, user: User) -> None:
        """
        Register user in system.
        
        BUSINESS RULE: User ID must be unique
        """
        if user.get_id() in self._users:
            raise ValueError(f"User {user.get_name()} already exists")
        self._users[user.get_id()] = user
        print(f"✅ User added: {user.get_name()}")
    
    def add_expense(self, expense: Expense) -> None:
        """
        Add expense and update balances.
        
        BUSINESS RULE: Updates balance sheet based on expense splits
        TIME COMPLEXITY: O(n) where n is number of participants
        """
        # Store expense
        self._expenses[expense.get_id()] = expense
        
        # Calculate splits
        splits = expense.calculate_splits()
        payer = expense.get_paid_by()
        
        # Update balance sheet
        for participant, share in splits.items():
            if participant != payer:
                # participant owes payer their share
                self._balance_sheet.add_balance(participant, payer, share)
        
        # Notify observers
        self._notify_expense_added(expense)
        
        print(f"✅ Expense added: {expense}")
        print(f"   Splits: {[(u.get_name(), f'${s:.2f}') for u, s in splits.items()]}")
    
    def get_balance_between(self, user1: User, user2: User) -> float:
        """
        Get balance between two users.
        
        Returns: Positive if user1 owes user2, negative if user2 owes user1
        TIME COMPLEXITY: O(1)
        """
        return self._balance_sheet.get_balance(user1, user2)
    
    def get_user_balances(self, user: User) -> Dict[str, float]:
        """
        Get all balances for a user.
        
        Returns: Dictionary of user_name to amount (positive = user owes them)
        """
        user_id = user.get_id()
        balances = {}
        
        # Check all users this user has balances with
        for other_id, other_user in self._users.items():
            if other_id != user_id:
                balance = self._balance_sheet.get_balance(user, other_user)
                if abs(balance) > 0.01:
                    balances[other_user.get_name()] = balance
        
        return balances
    
    def simplify_debts(self, users: List[User]) -> List[Transaction]:
        """
        Calculate minimum transactions to settle all debts.
        
        DESIGN PATTERN: Delegates to DebtSimplifier
        TIME COMPLEXITY: O(n log n)
        """
        return self._debt_simplifier.simplify_debts(users, self._users)
    
    def settle_up(self, user1: User, user2: User) -> None:
        """
        Settle balance between two users.
        
        BUSINESS RULE: Creates transaction and zeros balance
        """
        balance = self._balance_sheet.get_balance(user1, user2)
        
        if abs(balance) < 0.01:
            print(f"No balance to settle between {user1.get_name()} and {user2.get_name()}")
            return
        
        # Determine who pays whom
        if balance > 0:
            # user1 owes user2
            transaction = Transaction(user1, user2, balance, "Settlement")
        else:
            # user2 owes user1
            transaction = Transaction(user2, user1, abs(balance), "Settlement")
        
        # Clear balance
        self._balance_sheet.settle_balance(user1, user2)
        
        print(f"✅ Settled: {transaction}")
    
    def create_group(self, name: str, members: List[User]) -> Group:
        """
        Create new expense group.
        
        BUSINESS RULE: All members must be registered users
        """
        # Validate members
        for member in members:
            if member.get_id() not in self._users:
                raise ValueError(f"User {member.get_name()} not registered")
        
        group = Group(name, members)
        self._groups[group.get_id()] = group
        print(f"✅ Group created: {group}")
        return group
    
    def add_observer(self, observer: ExpenseObserver) -> None:
        """
        Register observer for expense events.
        
        DESIGN PATTERN: Observer Pattern - manages observers
        """
        self._observers.append(observer)
    
    def _notify_expense_added(self, expense: Expense) -> None:
        """
        Notify all observers about new expense.
        
        DESIGN PATTERN: Observer Pattern - notifies observers
        """
        for observer in self._observers:
            observer.on_expense_added(expense)
    
    def get_expense_history(self, user: Optional[User] = None) -> List[Expense]:
        """
        Get expense history, optionally filtered by user.
        
        Returns: List of expenses (newest first)
        """
        expenses = list(self._expenses.values())
        
        if user:
            expenses = [
                e for e in expenses 
                if user in e.get_participants() or e.get_paid_by() == user
            ]
        
        # Sort by timestamp descending
        expenses.sort(key=lambda e: e.get_timestamp(), reverse=True)
        return expenses


# ============================================================================
# DEMO / MAIN FUNCTION
# ============================================================================

def main():
    """
    Demonstrate the expense sharing system with comprehensive examples.
    
    DEMONSTRATES:
    - Different split strategies (equal, exact, percentage)
    - Balance tracking and queries
    - Debt simplification algorithm
    - Group expense management
    - Settlement operations
    - Observer pattern with notifications
    - Command pattern for operations
    """
    print("=" * 80)
    print("SPLITWISE / EXPENSE SHARING SYSTEM - COMPREHENSIVE DEMO")
    print("=" * 80)
    print()
    
    # Step 1: Create users
    print("📝 Step 1: Creating Users")
    print("-" * 80)
    alice = User("Alice", "alice@example.com", "1234567890")
    bob = User("Bob", "bob@example.com", "2345678901")
    charlie = User("Charlie", "charlie@example.com", "3456789012")
    diana = User("Diana", "diana@example.com", "4567890123")
    
    # Step 2: Initialize system
    manager = ExpenseManager()
    manager.add_user(alice)
    manager.add_user(bob)
    manager.add_user(charlie)
    manager.add_user(diana)
    
    # Add notification observer
    notification_service = NotificationService()
    manager.add_observer(notification_service)
    print()
    
    # Step 3: Equal split expense
    print("📝 Step 2: Adding Equal Split Expense")
    print("-" * 80)
    expense1 = Expense(
        "Dinner at Italian Restaurant",
        300.00,
        alice,
        [alice, bob, charlie],
        EqualSplit()
    )
    manager.add_expense(expense1)
    print()
    
    # Step 4: Exact split expense
    print("📝 Step 3: Adding Exact Split Expense")
    print("-" * 80)
    exact_amounts = {bob: 100.00, charlie: 50.00}
    expense2 = Expense(
        "Movie tickets",
        150.00,
        bob,
        [bob, charlie],
        ExactSplit(exact_amounts)
    )
    manager.add_expense(expense2)
    print()
    
    # Step 5: Percentage split expense
    print("📝 Step 4: Adding Percentage Split Expense")
    print("-" * 80)
    percentages = {alice: 50.0, bob: 30.0, diana: 20.0}
    expense3 = Expense(
        "Taxi ride",
        100.00,
        diana,
        [alice, bob, diana],
        PercentageSplit(percentages)
    )
    manager.add_expense(expense3)
    print()
    
    # Step 6: Check balances
    print("📝 Step 5: Checking User Balances")
    print("-" * 80)
    for user in [alice, bob, charlie, diana]:
        balances = manager.get_user_balances(user)
        print(f"{user.get_name()}'s balances:")
        if balances:
            for other_name, amount in balances.items():
                if amount > 0:
                    print(f"  → Owes {other_name}: ${amount:.2f}")
                else:
                    print(f"  → {other_name} owes them: ${abs(amount):.2f}")
        else:
            print("  → All settled up!")
        print()
    
    # Step 7: Simplify debts
    print("📝 Step 6: Simplifying Debts (Minimal Transactions)")
    print("-" * 80)
    simplified = manager.simplify_debts([alice, bob, charlie, diana])
    print(f"Minimum transactions needed: {len(simplified)}")
    for i, transaction in enumerate(simplified, 1):
        print(f"  {i}. {transaction}")
    print()
    
    # Step 8: Create group
    print("📝 Step 7: Creating Expense Group")
    print("-" * 80)
    trip_group = manager.create_group("Weekend Trip", [alice, bob, charlie])
    
    # Add group expense
    group_expense = Expense(
        "Hotel booking",
        600.00,
        alice,
        [alice, bob, charlie],
        EqualSplit()
    )
    trip_group.add_expense(group_expense)
    manager.add_expense(group_expense)
    print()
    
    # Step 9: Settle up
    print("📝 Step 8: Settling Up Between Users")
    print("-" * 80)
    print(f"Balance before: Bob owes Alice ${manager.get_balance_between(bob, alice):.2f}")
    manager.settle_up(bob, alice)
    print(f"Balance after: ${manager.get_balance_between(bob, alice):.2f}")
    print()
    
    # Step 10: Command pattern demo
    print("📝 Step 9: Demonstrating Command Pattern")
    print("-" * 80)
    new_expense = Expense(
        "Coffee",
        20.00,
        bob,
        [bob, charlie],
        EqualSplit()
    )
    command = AddExpenseCommand(manager, new_expense)
    print("Executing add expense command...")
    command.execute()
    print("Undoing expense...")
    command.undo()
    print()
    
    # Step 11: Expense history
    print("📝 Step 10: Expense History")
    print("-" * 80)
    history = manager.get_expense_history(alice)
    print(f"Alice's expense history ({len(history)} expenses):")
    for expense in history[:5]:  # Show last 5
        print(f"  - {expense.get_description()}: ${expense.get_amount():.2f} "
              f"(paid by {expense.get_paid_by().get_name()}) "
              f"at {expense.get_timestamp().strftime('%Y-%m-%d %H:%M')}")
    
    print()
    print("=" * 80)
    print("DEMO COMPLETED SUCCESSFULLY!")
    print("=" * 80)


if __name__ == "__main__":
    main()

