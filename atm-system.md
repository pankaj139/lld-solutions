# ATM System

## Problem Statement

Design an ATM (Automated Teller Machine) system that can:

1. **Handle card operations** (insert, validate, eject)
2. **Authenticate users** with PIN verification
3. **Perform transactions** (withdraw, deposit, balance inquiry)
4. **Manage cash inventory** with different bill denominations
5. **Track account balances** and daily withdrawal limits
6. **Handle various states** and error conditions

## Requirements

### Functional Requirements
- Insert and validate debit/credit cards
- Authenticate users with PIN verification
- Support multiple transaction types (withdrawal, deposit, balance inquiry)
- Manage cash inventory with multiple bill denominations
- Track daily withdrawal limits per account
- Handle insufficient funds and invalid PIN scenarios
- Maintain transaction history
- Support multiple account types (checking, savings, credit)

### Non-Functional Requirements
- System should be secure and handle authentication properly
- Cash dispensing algorithm should be optimal
- Support for concurrent transactions (though simplified in this implementation)
- Proper state management throughout transaction lifecycle
- Error handling for edge cases

## Design Decisions

### Key Classes

1. **Card & Account Management**
   - `Card`: Represents physical debit/credit cards with expiry and PIN
   - `Account`: Bank account with balance and withdrawal limits
   - `BankingService`: Handles authentication and account operations

2. **Transaction Management**
   - `Transaction`: Individual transaction records
   - `TransactionType`: Enum for different operation types
   - `TransactionStatus`: Status tracking for operations

3. **ATM Hardware Simulation**
   - `CashDispenser`: Manages cash inventory and dispensing logic
   - `ATM`: Main system coordinator with state management
   - `ATMState`: State machine for transaction flow

### Design Patterns Used

1. **State Pattern**: ATM state management (Idle, Card Inserted, PIN Entered, etc.)
2. **Strategy Pattern**: Different transaction processing strategies
3. **Template Method**: Transaction processing workflow
4. **Factory Method**: Could be extended for creating different transaction types

### Key Features

- **State Machine**: Proper state management for ATM operations
- **Cash Management**: Optimal bill dispensing algorithm
- **Security**: PIN validation and card expiry checking
- **Daily Limits**: Withdrawal limit tracking with daily reset
- **Error Handling**: Comprehensive error scenarios

## State Diagram

```
IDLE
  ↓ (insert_card)
CARD_INSERTED
  ↓ (enter_pin)
PIN_ENTERED
  ↓ (select_operation)
OPTION_SELECTED
  ↓ (perform_transaction)
TRANSACTION_COMPLETED
  ↓ (eject_card)
IDLE
```

## Class Diagram

```
Card
├── card_number: str
├── customer_name: str
├── expiry_date: datetime
├── pin: str
└── is_blocked: bool

Account
├── account_number: str
├── account_type: AccountType
├── balance: float
├── daily_withdrawal_limit: float
└── daily_withdrawn: float

ATM
├── atm_id: str
├── location: str
├── cash_dispenser: CashDispenser
├── banking_service: BankingService
├── current_state: ATMState
└── current_card_number: str

CashDispenser
├── total_five_bills: int
├── total_ten_bills: int
├── total_twenty_bills: int
└── dispense_cash(amount)

Transaction
├── transaction_id: str
├── transaction_type: TransactionType
├── amount: float
├── account: Account
└── status: TransactionStatus
```

## Usage Example

```python
# Setup banking service and accounts
banking_service = BankingService()
card = Card("1234567890123456", "John Doe", datetime(2025, 12, 31), "1234")
account = Account("ACC001", AccountType.CHECKING, 1500.0)
banking_service.add_account(card, account)

# Create ATM with cash dispenser
cash_dispenser = CashDispenser(50, 50, 100)  # 5s, 10s, 20s
atm = ATM("ATM001", "Main Branch", cash_dispenser, banking_service)

# Perform ATM operations
atm.insert_card("1234567890123456")
atm.enter_pin("1234")
atm.select_operation("withdraw")
atm.withdraw_cash(100)
atm.eject_card()
```

## Business Rules

1. **Authentication**
   - Card must be valid (not expired or blocked)
   - PIN must match the card's PIN
   - Maximum 3 PIN attempts before card blocking

2. **Withdrawal Limits**
   - Daily withdrawal limit of $1000 per account
   - Minimum withdrawal amount of $5
   - Amount must be multiple of $5

3. **Cash Dispensing**
   - Greedy algorithm: prefer larger denominations
   - Must have exact change available
   - Update inventory after successful dispensing

4. **State Management**
   - ATM follows strict state transitions
   - Invalid operations in wrong states are rejected
   - Automatic card ejection on errors

## Extension Points

1. **Multi-Account Support**: Allow users to select from multiple accounts
2. **Transfer Operations**: Money transfer between accounts
3. **Receipt Printing**: Generate transaction receipts
4. **Network Integration**: Real-time banking service communication
5. **Security Features**: Camera monitoring, emergency alerts
6. **Maintenance Mode**: Service and cash replenishment support

## Security Considerations

1. **PIN Encryption**: PINs should be encrypted in real systems
2. **Transaction Logs**: Audit trail for all operations
3. **Fraud Detection**: Unusual transaction pattern detection
4. **Timeout Handling**: Automatic session timeout for security
5. **Physical Security**: Card retention for suspicious activity

## Time Complexity

- **Card Validation**: O(1) with hash-based lookup
- **PIN Verification**: O(1) comparison
- **Cash Dispensing**: O(1) with greedy algorithm
- **Transaction Processing**: O(1) for basic operations

## Space Complexity

- O(n) where n is the number of registered cards/accounts
- O(m) for transaction history where m is number of transactions
- O(1) for cash inventory management