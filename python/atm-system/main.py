from abc import ABC, abstractmethod
from enum import Enum
from datetime import datetime
import uuid

class AccountType(Enum):
    CHECKING = 1
    SAVINGS = 2
    CREDIT = 3

class TransactionType(Enum):
    WITHDRAWAL = 1
    DEPOSIT = 2
    BALANCE_INQUIRY = 3
    TRANSFER = 4

class ATMState(Enum):
    IDLE = 1
    CARD_INSERTED = 2
    PIN_ENTERED = 3
    OPTION_SELECTED = 4
    TRANSACTION_COMPLETED = 5
    OUT_OF_SERVICE = 6

class TransactionStatus(Enum):
    SUCCESS = 1
    FAILED = 2
    BLOCKED = 3
    FULL_CASSETTE = 4
    INSUFFICIENT_FUNDS = 5
    INCORRECT_PIN = 6

class Card:
    def __init__(self, card_number, customer_name, expiry_date, pin):
        self.card_number = card_number
        self.customer_name = customer_name
        self.expiry_date = expiry_date
        self.pin = pin
        self.is_blocked = False

    def is_valid(self):
        return not self.is_blocked and datetime.now() < self.expiry_date

class Account:
    def __init__(self, account_number, account_type, balance=0.0):
        self.account_number = account_number
        self.account_type = account_type
        self.balance = balance
        self.daily_withdrawal_limit = 1000.0
        self.daily_withdrawn = 0.0
        self.last_transaction_date = datetime.now().date()

    def can_withdraw(self, amount):
        # Reset daily limit if new day
        if datetime.now().date() != self.last_transaction_date:
            self.daily_withdrawn = 0.0
            self.last_transaction_date = datetime.now().date()
        
        return (self.balance >= amount and 
                self.daily_withdrawn + amount <= self.daily_withdrawal_limit)

    def withdraw(self, amount):
        if self.can_withdraw(amount):
            self.balance -= amount
            self.daily_withdrawn += amount
            return True
        return False

    def deposit(self, amount):
        self.balance += amount
        return True

    def get_balance(self):
        return self.balance

class Transaction:
    def __init__(self, transaction_id, transaction_type, amount, account):
        self.transaction_id = transaction_id
        self.transaction_type = transaction_type
        self.amount = amount
        self.account = account
        self.timestamp = datetime.now()
        self.status = TransactionStatus.SUCCESS

class CashDispenser:
    def __init__(self, total_five_bills, total_ten_bills, total_twenty_bills):
        self.total_five_bills = total_five_bills
        self.total_ten_bills = total_ten_bills
        self.total_twenty_bills = total_twenty_bills

    def get_total_amount(self):
        return (self.total_five_bills * 5 + 
                self.total_ten_bills * 10 + 
                self.total_twenty_bills * 20)

    def can_dispense(self, amount):
        if amount % 5 != 0:
            return False
        
        # Try to dispense with available bills
        temp_twenty = min(amount // 20, self.total_twenty_bills)
        remaining = amount - (temp_twenty * 20)
        
        temp_ten = min(remaining // 10, self.total_ten_bills)
        remaining -= (temp_ten * 10)
        
        temp_five = min(remaining // 5, self.total_five_bills)
        remaining -= (temp_five * 5)
        
        return remaining == 0

    def dispense_cash(self, amount):
        if not self.can_dispense(amount):
            return False
        
        # Dispense bills (greedy approach)
        twenty_bills = min(amount // 20, self.total_twenty_bills)
        amount -= (twenty_bills * 20)
        
        ten_bills = min(amount // 10, self.total_ten_bills)
        amount -= (ten_bills * 10)
        
        five_bills = amount // 5
        
        # Update cash inventory
        self.total_twenty_bills -= twenty_bills
        self.total_ten_bills -= ten_bills
        self.total_five_bills -= five_bills
        
        print(f"Dispensed: ${twenty_bills * 20} in twenties, ${ten_bills * 10} in tens, ${five_bills * 5} in fives")
        return True

class BankingService:
    def __init__(self):
        self.accounts = {}  # card_number -> Account
        self.cards = {}     # card_number -> Card

    def add_account(self, card, account):
        self.cards[card.card_number] = card
        self.accounts[card.card_number] = account

    def authenticate_user(self, card_number, pin):
        if card_number not in self.cards:
            return False
        
        card = self.cards[card_number]
        return card.is_valid() and card.pin == pin

    def get_account(self, card_number):
        return self.accounts.get(card_number)

    def process_transaction(self, card_number, transaction_type, amount=0.0):
        account = self.get_account(card_number)
        if not account:
            return None
        
        transaction_id = str(uuid.uuid4())
        transaction = Transaction(transaction_id, transaction_type, amount, account)
        
        if transaction_type == TransactionType.WITHDRAWAL:
            if account.withdraw(amount):
                transaction.status = TransactionStatus.SUCCESS
            else:
                transaction.status = TransactionStatus.INSUFFICIENT_FUNDS
        elif transaction_type == TransactionType.DEPOSIT:
            account.deposit(amount)
            transaction.status = TransactionStatus.SUCCESS
        elif transaction_type == TransactionType.BALANCE_INQUIRY:
            transaction.status = TransactionStatus.SUCCESS
        
        return transaction

class ATM:
    def __init__(self, atm_id, location, cash_dispenser, banking_service):
        self.atm_id = atm_id
        self.location = location
        self.cash_dispenser = cash_dispenser
        self.banking_service = banking_service
        self.current_state = ATMState.IDLE
        self.current_card_number = None

    def insert_card(self, card_number):
        if self.current_state != ATMState.IDLE:
            return False
        
        if card_number not in self.banking_service.cards:
            print("Invalid card")
            return False
        
        card = self.banking_service.cards[card_number]
        if not card.is_valid():
            print("Card is expired or blocked")
            return False
        
        self.current_card_number = card_number
        self.current_state = ATMState.CARD_INSERTED
        print("Card inserted successfully. Please enter PIN.")
        return True

    def enter_pin(self, pin):
        if self.current_state != ATMState.CARD_INSERTED:
            return False
        
        if self.banking_service.authenticate_user(self.current_card_number, pin):
            self.current_state = ATMState.PIN_ENTERED
            print("PIN verified. Please select transaction type.")
            return True
        else:
            print("Incorrect PIN")
            self.eject_card()
            return False

    def select_operation(self, operation):
        if self.current_state != ATMState.PIN_ENTERED and self.current_state != ATMState.TRANSACTION_COMPLETED:
            return False
        
        self.current_state = ATMState.OPTION_SELECTED
        return True

    def withdraw_cash(self, amount):
        if self.current_state != ATMState.OPTION_SELECTED:
            return False
        
        if amount <= 0 or amount % 5 != 0:
            print("Invalid amount. Amount must be positive and multiple of 5.")
            return False
        
        if not self.cash_dispenser.can_dispense(amount):
            print("Unable to dispense requested amount")
            return False
        
        transaction = self.banking_service.process_transaction(
            self.current_card_number, TransactionType.WITHDRAWAL, amount)
        
        if transaction.status == TransactionStatus.SUCCESS:
            self.cash_dispenser.dispense_cash(amount)
            print(f"Withdrawal successful. Amount: ${amount}")
            self.current_state = ATMState.TRANSACTION_COMPLETED
            return True
        elif transaction.status == TransactionStatus.INSUFFICIENT_FUNDS:
            print("Insufficient funds in account")
        
        return False

    def deposit_cash(self, amount):
        if self.current_state != ATMState.OPTION_SELECTED:
            return False
        
        if amount <= 0:
            print("Invalid amount")
            return False
        
        transaction = self.banking_service.process_transaction(
            self.current_card_number, TransactionType.DEPOSIT, amount)
        
        if transaction.status == TransactionStatus.SUCCESS:
            print(f"Deposit successful. Amount: ${amount}")
            self.current_state = ATMState.TRANSACTION_COMPLETED
            return True
        
        return False

    def check_balance(self):
        if self.current_state != ATMState.OPTION_SELECTED:
            return False
        
        account = self.banking_service.get_account(self.current_card_number)
        if account:
            balance = account.get_balance()
            print(f"Current balance: ${balance:.2f}")
            self.current_state = ATMState.TRANSACTION_COMPLETED
            return True
        
        return False

    def eject_card(self):
        print("Card ejected")
        self.current_card_number = None
        self.current_state = ATMState.IDLE

    def display_menu(self):
        if self.current_state == ATMState.PIN_ENTERED:
            print("\nATM Menu:")
            print("1. Withdraw Cash")
            print("2. Deposit Cash")
            print("3. Check Balance")
            print("4. Exit")

# Demo usage
def main():
    # Create banking service
    banking_service = BankingService()
    
    # Create accounts and cards
    card1 = Card("1234567890123456", "John Doe", datetime(2025, 12, 31), "1234")
    account1 = Account("ACC001", AccountType.CHECKING, 1500.0)
    banking_service.add_account(card1, account1)
    
    card2 = Card("9876543210987654", "Jane Smith", datetime(2025, 12, 31), "5678")
    account2 = Account("ACC002", AccountType.SAVINGS, 2500.0)
    banking_service.add_account(card2, account2)
    
    # Create cash dispenser with initial cash
    cash_dispenser = CashDispenser(total_five_bills=50, total_ten_bills=50, total_twenty_bills=100)
    print(f"ATM initialized with ${cash_dispenser.get_total_amount()} in cash")
    
    # Create ATM
    atm = ATM("ATM001", "Main Branch", cash_dispenser, banking_service)
    
    # Simulate ATM usage
    print("\n=== ATM Transaction Demo ===")
    
    # Insert card
    if atm.insert_card("1234567890123456"):
        # Enter PIN
        if atm.enter_pin("1234"):
            atm.display_menu()
            
            # Perform operations
            print("\n--- Checking Balance ---")
            atm.select_operation("balance")
            atm.check_balance()
            
            print("\n--- Withdrawing Cash ---")
            atm.select_operation("withdraw")
            atm.withdraw_cash(100)
            
            print("\n--- Depositing Cash ---")
            atm.select_operation("deposit")
            atm.deposit_cash(50)
            
            print("\n--- Final Balance Check ---")
            atm.select_operation("balance")
            atm.check_balance()
        
        # Eject card
        atm.eject_card()
    
    print(f"\nRemaining cash in ATM: ${cash_dispenser.get_total_amount()}")

if __name__ == "__main__":
    main()