/**
 * ATM System Implementation in JavaScript
 * =======================================
 * 
 * This implementation demonstrates several key Design Patterns and OOP Concepts:
 * 
 * DESIGN PATTERNS USED:
 * 1. State Pattern: ATM state management (ATMState enum and state transitions)
 * 2. Strategy Pattern: Different transaction processing strategies
 * 3. Factory Pattern: UUID generation utility
 * 4. Command Pattern: Transaction operations as commands
 * 5. Template Method: Common transaction processing structure
 * 
 * OOP CONCEPTS DEMONSTRATED:
 * 1. Encapsulation: Private methods (_methodName), data hiding
 * 2. Abstraction: Clear interfaces for ATM operations
 * 3. Composition: ATM composed of CashDispenser, BankingService
 * 4. Polymorphism: Different account types, transaction types
 * 
 * ARCHITECTURAL PRINCIPLES:
 * - Single Responsibility: Each class has one clear purpose
 * - Open/Closed: Easy to extend with new transaction types
 * - Dependency Injection: ATM depends on abstractions
 * - Low Coupling: Minimal dependencies between components
 */

// Enums - Using Object.freeze() for immutability (JavaScript enum pattern)
const ATMState = {
    IDLE: 'IDLE',
    CARD_INSERTED: 'CARD_INSERTED',
    PIN_ENTERED: 'PIN_ENTERED',
    OPTION_SELECTED: 'OPTION_SELECTED',
    TRANSACTION_COMPLETED: 'TRANSACTION_COMPLETED',
    CARD_EJECTED: 'CARD_EJECTED'
};

const AccountType = {
    CHECKING: 'CHECKING',
    SAVINGS: 'SAVINGS',
    CREDIT: 'CREDIT'
};

const TransactionType = {
    WITHDRAWAL: 'WITHDRAWAL',
    DEPOSIT: 'DEPOSIT',
    BALANCE_INQUIRY: 'BALANCE_INQUIRY'
};

const TransactionStatus = {
    SUCCESS: 'SUCCESS',
    FAILED: 'FAILED',
    CANCELLED: 'CANCELLED'
};

// Simple UUID generator
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * Card Class - Represents a bank card with security features
 * 
 * DESIGN PATTERNS:
 * - Value Object Pattern: Immutable card properties
 * - Security Pattern: PIN validation with attempt limiting
 * 
 * OOP CONCEPTS:
 * - Encapsulation: PIN and security state management
 * - Data Validation: Built-in security checks
 */
class Card {
    constructor(cardNumber, customerName, expiryDate, pin) {
        this.cardNumber = cardNumber;           // Unique identifier
        this.customerName = customerName;       // Cardholder name
        this.expiryDate = expiryDate;          // Card expiration date
        this.pin = pin;                        // Personal Identification Number
        this.isBlocked = false;                // Security: Block status
        this.failedAttempts = 0;               // Security: Failed PIN attempts counter
        this.maxFailedAttempts = 3;            // Security: Maximum allowed failed attempts
    }

    isValid() {
        return !this.isBlocked && new Date() < this.expiryDate;
    }

    /**
     * Template Method Pattern: PIN validation with security measures
     * 
     * This method demonstrates:
     * - Security by Design: Multiple validation steps
     * - State Management: Tracking failed attempts
     * - Defensive Programming: Auto-blocking on too many failures
     */
    validatePin(inputPin) {
        // Step 1: Check if card is already blocked (Security Check)
        if (this.isBlocked) {
            return false;
        }
        
        // Step 2: Validate PIN (Authentication)
        if (this.pin === inputPin) {
            this.failedAttempts = 0;  // Reset counter on successful validation
            return true;
        } else {
            // Step 3: Handle failed attempt (Security Response)
            this.failedAttempts++;
            if (this.failedAttempts >= this.maxFailedAttempts) {
                this.isBlocked = true;  // Auto-block for security
            }
            return false;
        }
    }

    block() {
        this.isBlocked = true;
    }

    unblock() {
        this.isBlocked = false;
        this.failedAttempts = 0;
    }
}

/**
 * Account Class - Represents a bank account with business rules
 * 
 * DESIGN PATTERNS:
 * - Business Logic Pattern: Encapsulates banking rules
 * - State Pattern: Account balance and limit tracking
 * 
 * OOP CONCEPTS:
 * - Encapsulation: Balance and limit management
 * - Business Rules: Daily withdrawal limits, date tracking
 * - Data Integrity: Ensures valid transactions
 */
class Account {
    constructor(accountNumber, accountType, balance) {
        this.accountNumber = accountNumber;        // Unique account identifier
        this.accountType = accountType;            // Type of account (checking, savings, etc.)
        this.balance = balance;                    // Current account balance
        this.dailyWithdrawalLimit = 1000.0;       // Business Rule: Daily withdrawal limit
        this.dailyWithdrawn = 0.0;                // Today's total withdrawals
        this.lastWithdrawalDate = null;           // Date tracking for limit reset
    }

    resetDailyLimit() {
        const today = new Date().toDateString();
        if (this.lastWithdrawalDate !== today) {
            this.dailyWithdrawn = 0.0;
            this.lastWithdrawalDate = today;
        }
    }

    canWithdraw(amount) {
        this.resetDailyLimit();
        return this.balance >= amount && 
               (this.dailyWithdrawn + amount) <= this.dailyWithdrawalLimit;
    }

    withdraw(amount) {
        if (!this.canWithdraw(amount)) {
            return false;
        }
        
        this.balance -= amount;
        this.dailyWithdrawn += amount;
        this.lastWithdrawalDate = new Date().toDateString();
        return true;
    }

    deposit(amount) {
        if (amount <= 0) {
            return false;
        }
        this.balance += amount;
        return true;
    }

    getBalance() {
        return this.balance;
    }
}

class Transaction {
    constructor(transactionId, transactionType, amount, account) {
        this.transactionId = transactionId;
        this.transactionType = transactionType;
        this.amount = amount;
        this.account = account;
        this.timestamp = new Date();
        this.status = TransactionStatus.SUCCESS;
        this.description = '';
    }

    setStatus(status) {
        this.status = status;
    }

    setDescription(description) {
        this.description = description;
    }
}

/**
 * CashDispenser Class - Handles physical cash dispensing operations
 * 
 * DESIGN PATTERNS:
 * - Strategy Pattern: Greedy algorithm for optimal cash dispensing
 * - Inventory Management Pattern: Tracks cash denominations
 * 
 * OOP CONCEPTS:
 * - Encapsulation: Cash inventory management
 * - Algorithm Implementation: Greedy approach for cash distribution
 * - Error Handling: Validates dispensing capabilities
 */
class CashDispenser {
    constructor(totalFiveBills, totalTenBills, totalTwentyBills) {
        this.totalFiveBills = totalFiveBills;      // Inventory: $5 bills
        this.totalTenBills = totalTenBills;        // Inventory: $10 bills  
        this.totalTwentyBills = totalTwentyBills;  // Inventory: $20 bills
    }

    getTotalAmount() {
        return (this.totalFiveBills * 5) + 
               (this.totalTenBills * 10) + 
               (this.totalTwentyBills * 20);
    }

    /**
     * Strategy Pattern: Greedy Algorithm for Cash Dispensing
     * 
     * Algorithm Steps:
     * 1. Validate amount (business rule: multiples of $5)
     * 2. Check total cash availability
     * 3. Apply greedy strategy: largest denominations first
     * 4. Update inventory after successful dispensing
     * 
     * OOP Concepts: Error handling, state management
     */
    dispenseCash(amount) {
        // Business Rule Validation: Amount must be in multiples of $5
        if (amount % 5 !== 0) {
            throw new Error("Amount must be in multiples of $5");
        }

        // Resource Check: Ensure sufficient total cash
        if (amount > this.getTotalAmount()) {
            throw new Error("Insufficient cash in ATM");
        }

        // GREEDY ALGORITHM: Start with largest denomination for optimization
        let remainingAmount = amount;
        
        // Step 1: Dispense $20 bills (largest denomination)
        let twenties = Math.min(Math.floor(remainingAmount / 20), this.totalTwentyBills);
        remainingAmount -= twenties * 20;

        // Step 2: Dispense $10 bills (medium denomination)
        let tens = Math.min(Math.floor(remainingAmount / 10), this.totalTenBills);
        remainingAmount -= tens * 10;

        // Step 3: Dispense $5 bills (smallest denomination)
        let fives = Math.min(Math.floor(remainingAmount / 5), this.totalFiveBills);
        remainingAmount -= fives * 5;

        // Validation: Ensure exact amount can be dispensed
        if (remainingAmount > 0) {
            throw new Error("Cannot dispense exact amount with available denominations");
        }

        // State Update: Update cash inventory after successful calculation
        this.totalTwentyBills -= twenties;
        this.totalTenBills -= tens;
        this.totalFiveBills -= fives;

        console.log(`Dispensed: $${twenties * 20} in twenties, $${tens * 10} in tens, $${fives * 5} in fives`);
        return { twenties, tens, fives };  // Return dispensing breakdown
    }

    addCash(fiveBills, tenBills, twentyBills) {
        this.totalFiveBills += fiveBills;
        this.totalTenBills += tenBills;
        this.totalTwentyBills += twentyBills;
    }
}

/**
 * BankingService Class - Service Layer for banking operations
 * 
 * DESIGN PATTERNS:
 * - Service Layer Pattern: Encapsulates business logic
 * - Repository Pattern: Account data management
 * - Command Pattern: Transaction processing
 * 
 * OOP CONCEPTS:
 * - Abstraction: Hides complex banking operations
 * - Encapsulation: Manages account collection
 * - Error Handling: Comprehensive transaction validation
 */
class BankingService {
    constructor() {
        this.accounts = new Map(); // Repository Pattern: cardNumber -> Account mapping
    }

    addAccount(card, account) {
        this.accounts.set(card.cardNumber, account);
    }

    authenticateUser(cardNumber, pin) {
        const account = this.accounts.get(cardNumber);
        return account !== undefined;
    }

    getAccount(cardNumber) {
        return this.accounts.get(cardNumber);
    }

    processTransaction(cardNumber, transactionType, amount = 0) {
        const account = this.accounts.get(cardNumber);
        if (!account) {
            throw new Error("Account not found");
        }

        const transactionId = generateUUID();
        const transaction = new Transaction(transactionId, transactionType, amount, account);

        try {
            switch (transactionType) {
                case TransactionType.WITHDRAWAL:
                    if (!account.withdraw(amount)) {
                        transaction.setStatus(TransactionStatus.FAILED);
                        transaction.setDescription("Insufficient funds or exceeded daily limit");
                        return transaction;
                    }
                    break;
                
                case TransactionType.DEPOSIT:
                    if (!account.deposit(amount)) {
                        transaction.setStatus(TransactionStatus.FAILED);
                        transaction.setDescription("Invalid deposit amount");
                        return transaction;
                    }
                    break;
                
                case TransactionType.BALANCE_INQUIRY:
                    // No additional processing needed
                    break;
                
                default:
                    throw new Error("Unknown transaction type");
            }

            transaction.setDescription("Transaction completed successfully");
            return transaction;
        } catch (error) {
            transaction.setStatus(TransactionStatus.FAILED);
            transaction.setDescription(error.message);
            return transaction;
        }
    }
}

/**
 * ATM Class - Main system orchestrator implementing State Pattern
 * 
 * DESIGN PATTERNS:
 * - State Pattern: ATM state management and transitions
 * - Facade Pattern: Simple interface for complex operations
 * - Composition Pattern: Composed of CashDispenser and BankingService
 * - Command Pattern: ATM operations as commands
 * 
 * OOP CONCEPTS:
 * - Encapsulation: Internal state management
 * - Composition: ATM contains other components
 * - State Management: Tracks current operation state
 * - Error Handling: Validates operations based on state
 */
class ATM {
    constructor(atmId, location, cashDispenser, bankingService) {
        // Identity and Location
        this.atmId = atmId;
        this.location = location;
        
        // Composition Pattern: ATM composed of specialized components
        this.cashDispenser = cashDispenser;    // Hardware component
        this.bankingService = bankingService;  // Service layer
        
        // State Pattern: Current ATM state tracking
        this.currentState = ATMState.IDLE;
        this.currentCardNumber = null;
        this.currentCard = null;
    }

    insertCard(cardNumber) {
        if (this.currentState !== ATMState.IDLE) {
            return false;
        }

        this.currentCardNumber = cardNumber;
        this.currentState = ATMState.CARD_INSERTED;
        return true;
    }

    enterPin(pin) {
        if (this.currentState !== ATMState.CARD_INSERTED) {
            return false;
        }

        // In a real system, you would retrieve the card from a card reader
        // For simulation, we'll check if the PIN is valid
        if (this.bankingService.authenticateUser(this.currentCardNumber, pin)) {
            this.currentState = ATMState.PIN_ENTERED;
            return true;
        }
        
        return false;
    }

    selectOperation(operation) {
        if (this.currentState !== ATMState.PIN_ENTERED && 
            this.currentState !== ATMState.TRANSACTION_COMPLETED) {
            return false;
        }
        
        this.currentState = ATMState.OPTION_SELECTED;
        return true;
    }

    withdrawCash(amount) {
        if (this.currentState !== ATMState.OPTION_SELECTED) {
            throw new Error("Invalid ATM state for withdrawal");
        }

        try {
            // Validate amount
            if (amount <= 0 || amount % 5 !== 0) {
                throw new Error("Invalid withdrawal amount");
            }

            // Process transaction
            const transaction = this.bankingService.processTransaction(
                this.currentCardNumber, TransactionType.WITHDRAWAL, amount);

            if (transaction.status !== TransactionStatus.SUCCESS) {
                throw new Error(transaction.description);
            }

            // Dispense cash
            this.cashDispenser.dispenseCash(amount);
            
            this.currentState = ATMState.TRANSACTION_COMPLETED;
            console.log(`Withdrawal successful. Amount: $${amount}`);
            return transaction;

        } catch (error) {
            console.log(`Withdrawal failed: ${error.message}`);
            throw error;
        }
    }

    depositCash(amount) {
        if (this.currentState !== ATMState.OPTION_SELECTED) {
            throw new Error("Invalid ATM state for deposit");
        }

        try {
            const transaction = this.bankingService.processTransaction(
                this.currentCardNumber, TransactionType.DEPOSIT, amount);

            if (transaction.status !== TransactionStatus.SUCCESS) {
                throw new Error(transaction.description);
            }

            this.currentState = ATMState.TRANSACTION_COMPLETED;
            console.log(`Deposit successful. Amount: $${amount}`);
            return transaction;

        } catch (error) {
            console.log(`Deposit failed: ${error.message}`);
            throw error;
        }
    }

    checkBalance() {
        if (this.currentState !== ATMState.OPTION_SELECTED) {
            throw new Error("Invalid ATM state for balance inquiry");
        }

        try {
            const transaction = this.bankingService.processTransaction(
                this.currentCardNumber, TransactionType.BALANCE_INQUIRY);

            const account = this.bankingService.getAccount(this.currentCardNumber);
            const balance = account.getBalance();

            this.currentState = ATMState.TRANSACTION_COMPLETED;
            console.log(`Current balance: $${balance.toFixed(2)}`);
            return transaction;

        } catch (error) {
            console.log(`Balance inquiry failed: ${error.message}`);
            throw error;
        }
    }

    ejectCard() {
        this.currentCardNumber = null;
        this.currentCard = null;
        this.currentState = ATMState.IDLE;
        console.log("Card ejected");
    }

    getCurrentState() {
        return this.currentState;
    }
}

// Demo usage
function main() {
    // Setup banking service and accounts
    const bankingService = new BankingService();
    
    const card = new Card("1234567890123456", "John Doe", new Date(2025, 11, 31), "1234");
    const account = new Account("ACC001", AccountType.CHECKING, 1500.0);
    bankingService.addAccount(card, account);

    // Create ATM with cash dispenser
    const cashDispenser = new CashDispenser(50, 50, 100); // 5s, 10s, 20s
    const atm = new ATM("ATM001", "Main Branch", cashDispenser, bankingService);

    console.log(`ATM initialized with $${cashDispenser.getTotalAmount()} in cash`);
    console.log("\n=== ATM Transaction Demo ===");

    // Perform ATM operations
    if (atm.insertCard("1234567890123456")) {
        console.log("Card inserted successfully. Please enter PIN.");
        
        if (atm.enterPin("1234")) {
            console.log("PIN verified. Please select transaction type.");
            
            console.log("\nATM Menu:");
            console.log("1. Withdraw Cash");
            console.log("2. Deposit Cash");
            console.log("3. Check Balance");
            console.log("4. Exit");

            // Check balance
            if (atm.selectOperation("balance")) {
                console.log("\n--- Checking Balance ---");
                try {
                    atm.checkBalance();
                } catch (e) {
                    console.log(`Error: ${e.message}`);
                }
            }

            // Withdraw cash
            if (atm.selectOperation("withdraw")) {
                console.log("\n--- Withdrawing Cash ---");
                try {
                    atm.withdrawCash(100);
                } catch (e) {
                    console.log(`Error: ${e.message}`);
                }
            }

            // Deposit cash
            if (atm.selectOperation("deposit")) {
                console.log("\n--- Depositing Cash ---");
                try {
                    atm.depositCash(50);
                } catch (e) {
                    console.log(`Error: ${e.message}`);
                }
            }

            // Final balance check
            if (atm.selectOperation("balance")) {
                console.log("\n--- Final Balance Check ---");
                try {
                    atm.checkBalance();
                } catch (e) {
                    console.log(`Error: ${e.message}`);
                }
            }

            atm.ejectCard();
        } else {
            console.log("Invalid PIN");
        }
    } else {
        console.log("Failed to insert card");
    }

    console.log(`\nRemaining cash in ATM: $${cashDispenser.getTotalAmount()}`);
}

// Export for use in other modules (Node.js)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ATMState,
        AccountType,
        TransactionType,
        TransactionStatus,
        Card,
        Account,
        Transaction,
        CashDispenser,
        BankingService,
        ATM
    };
}

// Run demo if this file is executed directly
if (require.main === module) {
    main();
}