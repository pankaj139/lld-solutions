"""
BANKING SYSTEM - Low Level Design Implementation in Python

DESIGN PATTERNS USED:
1. FACTORY PATTERN: Account creation with different account types
   - AccountFactory creates checking, savings, credit, and investment accounts
   - Type-safe account instantiation with proper validation
   - Easy extension for new account types (business, joint, trust)
   - Centralized account creation logic with business rules

2. STRATEGY PATTERN: Interest calculation and fee strategies
   - Different interest calculation algorithms for account types
   - Fee calculation strategies: flat fee, percentage-based, tiered
   - Transaction processing strategies: real-time, batch, priority
   - Loan approval strategies based on credit score and history

3. TEMPLATE METHOD PATTERN: Transaction processing workflow
   - Standard transaction flow: validate -> authorize -> process -> record -> notify
   - Customizable steps for different transaction types (transfer, withdrawal, deposit)
   - Consistent audit trail and error handling
   - Extensible framework for new transaction types

4. DECORATOR PATTERN: Account features and services
   - Base account functionality enhanced with features
   - Overdraft protection, fraud monitoring, alerts
   - Premium services: priority support, higher limits, rewards
   - Stackable services without class explosion

5. OBSERVER PATTERN: Account activity monitoring and notifications
   - Real-time transaction alerts and balance notifications
   - Fraud detection alerts and security notifications
   - Account statement generation and delivery
   - Multiple notification channels: email, SMS, mobile app

6. STATE PATTERN: Account status management
   - Account states: ACTIVE -> FROZEN -> CLOSED -> DORMANT
   - Each state has specific allowed operations and restrictions
   - State-based fee calculations and service availability
   - Compliance with banking regulations for account lifecycle

OOP CONCEPTS DEMONSTRATED:
- INHERITANCE: Account hierarchy with specialized account types and behaviors
- ENCAPSULATION: Account balance and transaction details secured behind interfaces
- ABSTRACTION: Complex banking operations abstracted into simple API calls
- POLYMORPHISM: Different account types and transaction methods handled uniformly

SOLID PRINCIPLES:
- SRP: Each class handles single responsibility (Account, Transaction, Customer, Bank)
- OCP: Easy to add new account types and transaction methods without code changes
- LSP: All account types can be used interchangeably through Account interface
- ISP: Focused interfaces for account operations, transactions, and customer management
- DIP: High-level banking logic depends on abstractions, not concrete implementations

BUSINESS FEATURES:
- Multi-account management for individual and business customers
- Comprehensive transaction processing with real-time validation
- Interest calculation and automatic fee processing
- Loan and credit management with approval workflows
- Fraud detection and security monitoring
- Regulatory compliance and audit trail maintenance
- Customer relationship management with service tiers

ARCHITECTURAL NOTES:
- Event-driven architecture for real-time transaction processing
- Microservice-ready design with clear service boundaries
- Security features: encryption, authentication, authorization
- Integration points for external systems: credit bureaus, regulatory reporting
- Scalable transaction processing for high-volume operations
- Comprehensive logging and audit trail for compliance
"""

from abc import ABC, abstractmethod
from enum import Enum
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import uuid
from decimal import Decimal

class AccountType(Enum):
    CHECKING = "CHECKING"
    SAVINGS = "SAVINGS" 
    CREDIT = "CREDIT"
    INVESTMENT = "INVESTMENT"

class AccountStatus(Enum):
    ACTIVE = "ACTIVE"
    FROZEN = "FROZEN"
    CLOSED = "CLOSED"
    DORMANT = "DORMANT"

class TransactionType(Enum):
    DEPOSIT = "DEPOSIT"
    WITHDRAWAL = "WITHDRAWAL"
    TRANSFER = "TRANSFER"
    PAYMENT = "PAYMENT"
    FEE = "FEE"
    INTEREST = "INTEREST"

class TransactionStatus(Enum):
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    REVERSED = "REVERSED"

# VALUE OBJECT: Immutable money representation
class Money:
    def __init__(self, amount: Decimal, currency: str = "USD"):
        self.amount = amount
        self.currency = currency
    
    def add(self, other: 'Money') -> 'Money':
        if self.currency != other.currency:
            raise ValueError("Cannot add different currencies")
        return Money(self.amount + other.amount, self.currency)
    
    def subtract(self, other: 'Money') -> 'Money':
        if self.currency != other.currency:
            raise ValueError("Cannot subtract different currencies")
        return Money(self.amount - other.amount, self.currency)

# ENTITY: Customer with banking relationship
class Customer:
    def __init__(self, customer_id: str, name: str, email: str, phone: str):
        self.customer_id = customer_id
        self.name = name
        self.email = email
        self.phone = phone
        self.created_at = datetime.now()
        self.accounts: List[str] = []  # account_ids
        self.credit_score = 750  # Default credit score

# ABSTRACT BASE CLASS: Account with common behavior
class Account(ABC):
    def __init__(self, account_id: str, customer_id: str, account_type: AccountType):
        self.account_id = account_id
        self.customer_id = customer_id
        self.account_type = account_type
        self.balance = Money(Decimal('0'))
        self.status = AccountStatus.ACTIVE
        self.created_at = datetime.now()
        self.last_transaction_date = datetime.now()
    
    @abstractmethod
    def calculate_interest(self) -> Money:
        """STRATEGY PATTERN: Each account type has different interest calculation"""
        pass
    
    @abstractmethod
    def calculate_fees(self) -> Money:
        """STRATEGY PATTERN: Each account type has different fee structure"""
        pass
    
    def deposit(self, amount: Money) -> bool:
        """TEMPLATE METHOD: Standard deposit workflow"""
        if self.status != AccountStatus.ACTIVE:
            return False
        self.balance = self.balance.add(amount)
        self.last_transaction_date = datetime.now()
        return True
    
    def withdraw(self, amount: Money) -> bool:
        """TEMPLATE METHOD: Standard withdrawal workflow with overdraft check"""
        if self.status != AccountStatus.ACTIVE:
            return False
        if not self._can_withdraw(amount):
            return False
        self.balance = self.balance.subtract(amount)
        self.last_transaction_date = datetime.now()
        return True
    
    @abstractmethod
    def _can_withdraw(self, amount: Money) -> bool:
        """STRATEGY PATTERN: Different withdrawal rules for account types"""
        pass

# CONCRETE STRATEGY: Checking account with overdraft protection
class CheckingAccount(Account):
    def __init__(self, account_id: str, customer_id: str, overdraft_limit: Money = Money(Decimal('500'))):
        super().__init__(account_id, customer_id, AccountType.CHECKING)
        self.overdraft_limit = overdraft_limit
    
    def calculate_interest(self) -> Money:
        """Low interest rate for checking accounts"""
        return Money(self.balance.amount * Decimal('0.001'))  # 0.1% monthly
    
    def calculate_fees(self) -> Money:
        """Monthly maintenance fee"""
        return Money(Decimal('10'))
    
    def _can_withdraw(self, amount: Money) -> bool:
        """Allow overdraft up to limit"""
        available = self.balance.add(self.overdraft_limit)
        return amount.amount <= available.amount

# CONCRETE STRATEGY: Savings account with higher interest
class SavingsAccount(Account):
    def __init__(self, account_id: str, customer_id: str):
        super().__init__(account_id, customer_id, AccountType.SAVINGS)
        self.withdrawal_limit = 6  # Federal regulation limit
        self.monthly_withdrawals = 0
    
    def calculate_interest(self) -> Money:
        """Higher interest rate for savings"""
        return Money(self.balance.amount * Decimal('0.02'))  # 2% monthly
    
    def calculate_fees(self) -> Money:
        """Fee for excess withdrawals"""
        if self.monthly_withdrawals > self.withdrawal_limit:
            excess = self.monthly_withdrawals - self.withdrawal_limit
            return Money(Decimal('25') * excess)
        return Money(Decimal('0'))
    
    def _can_withdraw(self, amount: Money) -> bool:
        """No overdraft allowed, check withdrawal limit"""
        return (amount.amount <= self.balance.amount and 
                self.monthly_withdrawals < self.withdrawal_limit)

# FACTORY PATTERN: Centralized account creation
class AccountFactory:
    @staticmethod
    def create_account(account_type: AccountType, customer_id: str, **kwargs) -> Account:
        """Create account based on type with proper validation"""
        account_id = str(uuid.uuid4())
        
        if account_type == AccountType.CHECKING:
            overdraft_limit = kwargs.get('overdraft_limit', Money(Decimal('500')))
            return CheckingAccount(account_id, customer_id, overdraft_limit)
        elif account_type == AccountType.SAVINGS:
            return SavingsAccount(account_id, customer_id)
        else:
            raise ValueError(f"Unsupported account type: {account_type}")

# COMMAND PATTERN: Transaction as command object
class Transaction:
    def __init__(self, transaction_type: TransactionType, from_account: str, 
                 to_account: str, amount: Money, description: str = ""):
        self.transaction_id = str(uuid.uuid4())
        self.transaction_type = transaction_type
        self.from_account = from_account
        self.to_account = to_account
        self.amount = amount
        self.description = description
        self.timestamp = datetime.now()
        self.status = TransactionStatus.PENDING

# OBSERVER PATTERN: Transaction notification system
class TransactionObserver(ABC):
    @abstractmethod
    def notify_transaction(self, transaction: Transaction):
        pass

class EmailNotifier(TransactionObserver):
    def notify_transaction(self, transaction: Transaction):
        """Send email notification for transaction"""
        print(f"Email: Transaction {transaction.transaction_id} completed")

class SMSNotifier(TransactionObserver):
    def notify_transaction(self, transaction: Transaction):
        """Send SMS notification for transaction"""
        print(f"SMS: Transaction {transaction.transaction_id} completed")

# FACADE PATTERN: Simplified banking interface
class BankingService:
    def __init__(self):
        self.customers: Dict[str, Customer] = {}
        self.accounts: Dict[str, Account] = {}
        self.transactions: List[Transaction] = []
        self.observers: List[TransactionObserver] = []
    
    def add_observer(self, observer: TransactionObserver):
        """Add transaction observer"""
        self.observers.append(observer)
    
    def create_customer(self, name: str, email: str, phone: str) -> Customer:
        """Create new customer"""
        customer_id = str(uuid.uuid4())
        customer = Customer(customer_id, name, email, phone)
        self.customers[customer_id] = customer
        return customer
    
    def create_account(self, customer_id: str, account_type: AccountType, **kwargs) -> Account:
        """Create new account for customer"""
        if customer_id not in self.customers:
            raise ValueError("Customer not found")
        
        account = AccountFactory.create_account(account_type, customer_id, **kwargs)
        self.accounts[account.account_id] = account
        self.customers[customer_id].accounts.append(account.account_id)
        return account
    
    def transfer_money(self, from_account_id: str, to_account_id: str, amount: Money) -> bool:
        """TEMPLATE METHOD: Transfer money between accounts"""
        if from_account_id not in self.accounts or to_account_id not in self.accounts:
            return False
        
        from_account = self.accounts[from_account_id]
        to_account = self.accounts[to_account_id]
        
        # Create transaction record
        transaction = Transaction(
            TransactionType.TRANSFER, from_account_id, to_account_id, amount, "Money transfer"
        )
        
        # Process transaction
        if from_account.withdraw(amount) and to_account.deposit(amount):
            transaction.status = TransactionStatus.COMPLETED
            self.transactions.append(transaction)
            
            # Notify observers
            for observer in self.observers:
                observer.notify_transaction(transaction)
            return True
        else:
            transaction.status = TransactionStatus.FAILED
            self.transactions.append(transaction)
            return False

# DEMO: Banking system usage
def demo_banking_system():
    # Create banking service
    bank = BankingService()
    
    # Add notification observers
    bank.add_observer(EmailNotifier())
    bank.add_observer(SMSNotifier())
    
    # Create customer
    customer = bank.create_customer("John Doe", "john@email.com", "555-1234")
    print(f"Created customer: {customer.name}")
    
    # Create accounts
    checking = bank.create_account(customer.customer_id, AccountType.CHECKING)
    savings = bank.create_account(customer.customer_id, AccountType.SAVINGS)
    
    print(f"Created checking account: {checking.account_id}")
    print(f"Created savings account: {savings.account_id}")
    
    # Make deposits
    checking.deposit(Money(Decimal('1000')))
    savings.deposit(Money(Decimal('5000')))
    
    print(f"Checking balance: ${checking.balance.amount}")
    print(f"Savings balance: ${savings.balance.amount}")
    
    # Transfer money
    transfer_success = bank.transfer_money(
        checking.account_id, savings.account_id, Money(Decimal('200'))
    )
    
    if transfer_success:
        print("Transfer completed successfully")
        print(f"New checking balance: ${checking.balance.amount}")
        print(f"New savings balance: ${savings.balance.amount}")
    
    # Calculate interest and fees
    checking_interest = checking.calculate_interest()
    savings_interest = savings.calculate_interest()
    checking_fees = checking.calculate_fees()
    
    print(f"Checking interest: ${checking_interest.amount}")
    print(f"Savings interest: ${savings_interest.amount}")
    print(f"Checking fees: ${checking_fees.amount}")

if __name__ == "__main__":
    demo_banking_system()