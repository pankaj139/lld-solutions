// ATM System in JavaScript

// Enums
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

class Card {
    constructor(cardNumber, customerName, expiryDate, pin) {
        this.cardNumber = cardNumber;
        this.customerName = customerName;
        this.expiryDate = expiryDate;
        this.pin = pin;
        this.isBlocked = false;
        this.failedAttempts = 0;
        this.maxFailedAttempts = 3;
    }

    isValid() {
        return !this.isBlocked && new Date() < this.expiryDate;
    }

    validatePin(inputPin) {
        if (this.isBlocked) {
            return false;
        }
        
        if (this.pin === inputPin) {
            this.failedAttempts = 0;
            return true;
        } else {
            this.failedAttempts++;
            if (this.failedAttempts >= this.maxFailedAttempts) {
                this.isBlocked = true;
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

class Account {
    constructor(accountNumber, accountType, balance) {
        this.accountNumber = accountNumber;
        this.accountType = accountType;
        this.balance = balance;
        this.dailyWithdrawalLimit = 1000.0;
        this.dailyWithdrawn = 0.0;
        this.lastWithdrawalDate = null;
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

class CashDispenser {
    constructor(totalFiveBills, totalTenBills, totalTwentyBills) {
        this.totalFiveBills = totalFiveBills;
        this.totalTenBills = totalTenBills;
        this.totalTwentyBills = totalTwentyBills;
    }

    getTotalAmount() {
        return (this.totalFiveBills * 5) + 
               (this.totalTenBills * 10) + 
               (this.totalTwentyBills * 20);
    }

    dispenseCash(amount) {
        if (amount % 5 !== 0) {
            throw new Error("Amount must be in multiples of $5");
        }

        if (amount > this.getTotalAmount()) {
            throw new Error("Insufficient cash in ATM");
        }

        // Greedy algorithm: start with largest denomination
        let remainingAmount = amount;
        let twenties = Math.min(Math.floor(remainingAmount / 20), this.totalTwentyBills);
        remainingAmount -= twenties * 20;

        let tens = Math.min(Math.floor(remainingAmount / 10), this.totalTenBills);
        remainingAmount -= tens * 10;

        let fives = Math.min(Math.floor(remainingAmount / 5), this.totalFiveBills);
        remainingAmount -= fives * 5;

        if (remainingAmount > 0) {
            throw new Error("Cannot dispense exact amount with available denominations");
        }

        // Update cash inventory
        this.totalTwentyBills -= twenties;
        this.totalTenBills -= tens;
        this.totalFiveBills -= fives;

        console.log(`Dispensed: $${twenties * 20} in twenties, $${tens * 10} in tens, $${fives * 5} in fives`);
        return { twenties, tens, fives };
    }

    addCash(fiveBills, tenBills, twentyBills) {
        this.totalFiveBills += fiveBills;
        this.totalTenBills += tenBills;
        this.totalTwentyBills += twentyBills;
    }
}

class BankingService {
    constructor() {
        this.accounts = new Map(); // cardNumber -> Account
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

class ATM {
    constructor(atmId, location, cashDispenser, bankingService) {
        this.atmId = atmId;
        this.location = location;
        this.cashDispenser = cashDispenser;
        this.bankingService = bankingService;
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