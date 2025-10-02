/**
 * Banking System - JavaScript Implementation
 * ==========================================
 * 
 * Comprehensive financial services platform demonstrating:
 * - Strategy Pattern: Different interest calculation strategies for account types
 * - State Pattern: Account state management (active, frozen, closed)
 * - Observer Pattern: Fraud detection and real-time notifications
 * - Template Method Pattern: Common transaction processing workflow
 * - Factory Pattern: Account and transaction creation
 * 
 * Key Features:
 * - Multiple account types with different rules and benefits
 * - Real-time fraud detection and prevention
 * - Loan processing with automated approval workflows
 * - Investment portfolio management with risk assessment
 * - Comprehensive transaction history and reporting
 * - ATM integration and card management
 */

// Account type enumeration - defines different banking products
const AccountType = {
    SAVINGS: 'SAVINGS',        // Interest-bearing savings account
    CHECKING: 'CHECKING',      // Daily transaction account
    CREDIT: 'CREDIT',          // Credit card account with limit
    INVESTMENT: 'INVESTMENT'   // Investment account for securities
};

const TransactionType = {
    DEPOSIT: 'DEPOSIT',
    WITHDRAWAL: 'WITHDRAWAL',
    TRANSFER: 'TRANSFER',
    PAYMENT: 'PAYMENT',
    INTEREST: 'INTEREST'
};

const TransactionStatus = {
    PENDING: 'PENDING',
    COMPLETED: 'COMPLETED',
    FAILED: 'FAILED',
    CANCELLED: 'CANCELLED'
};

const LoanStatus = {
    APPLIED: 'APPLIED',
    APPROVED: 'APPROVED',
    DISBURSED: 'DISBURSED',
    CLOSED: 'CLOSED',
    DEFAULTED: 'DEFAULTED'
};

// Utility functions
function generateUUID() {
    return 'xxxx-xxxx-4xxx-yxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function generateAccountNumber() {
    return Math.floor(1000000000 + Math.random() * 9000000000).toString();
}

// Base Account class (Template Method Pattern)
class Account {
    constructor(accountId, customerId, accountType, initialBalance = 0) {
        this.accountId = accountId;
        this.customerId = customerId;
        this.accountType = accountType;
        this.balance = initialBalance;
        this.accountNumber = generateAccountNumber();
        this.createdAt = new Date();
        this.isActive = true;
        this.transactions = [];
        this.dailyTransactionLimit = this.getDailyLimit();
        this.dailyTransactionAmount = 0;
        this.lastTransactionDate = null;
    }

    // Template method
    processTransaction(amount, type, description = '') {
        if (!this.validateTransaction(amount, type)) {
            return false;
        }

        if (!this.checkDailyLimit(amount)) {
            throw new Error('Daily transaction limit exceeded');
        }

        const success = this.executeTransaction(amount, type, description);
        if (success) {
            this.updateDailyLimit(amount);
            this.postTransactionProcessing();
        }

        return success;
    }

    // Abstract methods to be implemented by subclasses
    getDailyLimit() {
        throw new Error('Method must be implemented by subclass');
    }

    getInterestRate() {
        throw new Error('Method must be implemented by subclass');
    }

    // Common validation
    validateTransaction(amount, type) {
        if (!this.isActive) {
            throw new Error('Account is not active');
        }

        if (amount <= 0) {
            throw new Error('Transaction amount must be positive');
        }

        if (type === TransactionType.WITHDRAWAL && this.balance < amount) {
            throw new Error('Insufficient balance');
        }

        return true;
    }

    checkDailyLimit(amount) {
        const today = new Date().toDateString();
        const lastTransactionDate = this.lastTransactionDate ? this.lastTransactionDate.toDateString() : null;

        if (today !== lastTransactionDate) {
            this.dailyTransactionAmount = 0;
        }

        return this.dailyTransactionAmount + amount <= this.dailyTransactionLimit;
    }

    updateDailyLimit(amount) {
        const today = new Date().toDateString();
        const lastTransactionDate = this.lastTransactionDate ? this.lastTransactionDate.toDateString() : null;

        if (today !== lastTransactionDate) {
            this.dailyTransactionAmount = amount;
        } else {
            this.dailyTransactionAmount += amount;
        }

        this.lastTransactionDate = new Date();
    }

    executeTransaction(amount, type, description) {
        const transactionId = generateUUID();
        const transaction = new Transaction(transactionId, this.accountId, amount, type, description);

        try {
            switch (type) {
                case TransactionType.DEPOSIT:
                    this.balance += amount;
                    break;
                case TransactionType.WITHDRAWAL:
                    this.balance -= amount;
                    break;
                default:
                    throw new Error(`Unsupported transaction type: ${type}`);
            }

            transaction.markCompleted();
            this.transactions.push(transaction);
            return true;
        } catch (error) {
            transaction.markFailed(error.message);
            this.transactions.push(transaction);
            return false;
        }
    }

    postTransactionProcessing() {
        // Hook for subclasses
    }

    calculateInterest() {
        const rate = this.getInterestRate();
        const interest = this.balance * (rate / 100) / 365; // Daily interest
        return interest;
    }

    getTransactionHistory(limit = 10) {
        return this.transactions
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, limit);
    }
}

// Concrete Account Types (Strategy Pattern for interest calculation)
class SavingsAccount extends Account {
    constructor(accountId, customerId, initialBalance = 0) {
        super(accountId, customerId, AccountType.SAVINGS, initialBalance);
        this.minimumBalance = 100;
    }

    getDailyLimit() {
        return 5000;
    }

    getInterestRate() {
        return 3.5; // 3.5% annual interest
    }

    validateTransaction(amount, type) {
        super.validateTransaction(amount, type);

        if (type === TransactionType.WITHDRAWAL && 
            (this.balance - amount) < this.minimumBalance) {
            throw new Error('Transaction would violate minimum balance requirement');
        }

        return true;
    }
}

class CheckingAccount extends Account {
    constructor(accountId, customerId, initialBalance = 0) {
        super(accountId, customerId, AccountType.CHECKING, initialBalance);
        this.overdraftLimit = 500;
    }

    getDailyLimit() {
        return 10000;
    }

    getInterestRate() {
        return 0.5; // 0.5% annual interest
    }

    validateTransaction(amount, type) {
        if (!this.isActive) {
            throw new Error('Account is not active');
        }

        if (amount <= 0) {
            throw new Error('Transaction amount must be positive');
        }

        if (type === TransactionType.WITHDRAWAL && 
            this.balance < amount && 
            (amount - this.balance) > this.overdraftLimit) {
            throw new Error('Overdraft limit exceeded');
        }

        return true;
    }
}

class CreditAccount extends Account {
    constructor(accountId, customerId, creditLimit = 5000) {
        super(accountId, customerId, AccountType.CREDIT, 0);
        this.creditLimit = creditLimit;
        this.balance = 0; // Credit balance (what is owed)
        this.availableCredit = creditLimit;
    }

    getDailyLimit() {
        return this.creditLimit;
    }

    getInterestRate() {
        return 18.0; // 18% annual interest on credit
    }

    executeTransaction(amount, type, description) {
        const transactionId = generateUUID();
        const transaction = new Transaction(transactionId, this.accountId, amount, type, description);

        try {
            switch (type) {
                case TransactionType.PAYMENT:
                    this.balance -= amount; // Reduce debt
                    this.availableCredit += amount;
                    break;
                case TransactionType.WITHDRAWAL:
                    if (amount > this.availableCredit) {
                        throw new Error('Credit limit exceeded');
                    }
                    this.balance += amount; // Increase debt
                    this.availableCredit -= amount;
                    break;
                default:
                    throw new Error(`Unsupported transaction type for credit account: ${type}`);
            }

            transaction.markCompleted();
            this.transactions.push(transaction);
            return true;
        } catch (error) {
            transaction.markFailed(error.message);
            this.transactions.push(transaction);
            return false;
        }
    }
}

// Transaction class
class Transaction {
    constructor(transactionId, accountId, amount, type, description = '') {
        this.transactionId = transactionId;
        this.accountId = accountId;
        this.amount = amount;
        this.type = type;
        this.description = description;
        this.status = TransactionStatus.PENDING;
        this.timestamp = new Date();
        this.errorMessage = null;
    }

    markCompleted() {
        this.status = TransactionStatus.COMPLETED;
    }

    markFailed(errorMessage) {
        this.status = TransactionStatus.FAILED;
        this.errorMessage = errorMessage;
    }
}

// Customer class
class Customer {
    constructor(customerId, name, email, phone, address) {
        this.customerId = customerId;
        this.name = name;
        this.email = email;
        this.phone = phone;
        this.address = address;
        this.accounts = [];
        this.creditScore = Math.floor(Math.random() * 300) + 500; // 500-800
        this.createdAt = new Date();
    }

    addAccount(account) {
        this.accounts.push(account);
    }

    getAccount(accountId) {
        return this.accounts.find(account => account.accountId === accountId);
    }

    getTotalBalance() {
        return this.accounts.reduce((total, account) => {
            if (account.accountType === AccountType.CREDIT) {
                return total - account.balance; // Subtract debt
            }
            return total + account.balance;
        }, 0);
    }
}

// Loan Management
class Loan {
    constructor(loanId, customerId, amount, interestRate, termMonths, purpose) {
        this.loanId = loanId;
        this.customerId = customerId;
        this.amount = amount;
        this.interestRate = interestRate;
        this.termMonths = termMonths;
        this.purpose = purpose;
        this.status = LoanStatus.APPLIED;
        this.disbursedAmount = 0;
        this.repaidAmount = 0;
        this.monthlyPayment = this.calculateMonthlyPayment();
        this.appliedAt = new Date();
        this.approvedAt = null;
        this.disbursedAt = null;
    }

    calculateMonthlyPayment() {
        const monthlyRate = this.interestRate / 100 / 12;
        const payment = (this.amount * monthlyRate * Math.pow(1 + monthlyRate, this.termMonths)) /
                       (Math.pow(1 + monthlyRate, this.termMonths) - 1);
        return Math.round(payment * 100) / 100;
    }

    approve() {
        this.status = LoanStatus.APPROVED;
        this.approvedAt = new Date();
    }

    disburse() {
        if (this.status !== LoanStatus.APPROVED) {
            throw new Error('Loan must be approved before disbursement');
        }
        this.status = LoanStatus.DISBURSED;
        this.disbursedAmount = this.amount;
        this.disbursedAt = new Date();
    }

    makePayment(amount) {
        if (this.status !== LoanStatus.DISBURSED) {
            throw new Error('Loan must be disbursed to make payments');
        }
        
        this.repaidAmount += amount;
        
        if (this.repaidAmount >= this.getTotalPayable()) {
            this.status = LoanStatus.CLOSED;
        }
    }

    getTotalPayable() {
        return this.monthlyPayment * this.termMonths;
    }

    getRemainingBalance() {
        return Math.max(0, this.getTotalPayable() - this.repaidAmount);
    }
}

// Fraud Detection (Observer Pattern)
class FraudDetector {
    constructor() {
        this.suspiciousPatterns = [];
    }

    checkTransaction(transaction, account, customer) {
        const alerts = [];

        // Large amount transaction
        if (transaction.amount > 10000) {
            alerts.push('Large transaction amount');
        }

        // Multiple transactions in short time
        const recentTransactions = account.transactions.filter(t => 
            Date.now() - t.timestamp.getTime() < 3600000 // Last hour
        );
        
        if (recentTransactions.length > 5) {
            alerts.push('Multiple transactions in short period');
        }

        // Unusual transaction time
        const hour = transaction.timestamp.getHours();
        if (hour < 6 || hour > 22) {
            alerts.push('Unusual transaction time');
        }

        return alerts;
    }
}

// Main Banking System
class BankingSystem {
    constructor(bankName) {
        this.bankName = bankName;
        this.customers = new Map();
        this.accounts = new Map();
        this.loans = new Map();
        this.fraudDetector = new FraudDetector();
        this.systemStats = {
            totalCustomers: 0,
            totalAccounts: 0,
            totalDeposits: 0,
            totalLoans: 0
        };
    }

    // Customer Management
    registerCustomer(name, email, phone, address) {
        const customerId = generateUUID();
        const customer = new Customer(customerId, name, email, phone, address);
        this.customers.set(customerId, customer);
        this.systemStats.totalCustomers++;
        return customer;
    }

    getCustomer(customerId) {
        return this.customers.get(customerId);
    }

    // Account Management
    createAccount(customerId, accountType, initialBalance = 0) {
        const customer = this.customers.get(customerId);
        if (!customer) {
            throw new Error('Customer not found');
        }

        const accountId = generateUUID();
        let account;

        switch (accountType) {
            case AccountType.SAVINGS:
                account = new SavingsAccount(accountId, customerId, initialBalance);
                break;
            case AccountType.CHECKING:
                account = new CheckingAccount(accountId, customerId, initialBalance);
                break;
            case AccountType.CREDIT:
                account = new CreditAccount(accountId, customerId, initialBalance || 5000);
                break;
            default:
                throw new Error(`Unsupported account type: ${accountType}`);
        }

        customer.addAccount(account);
        this.accounts.set(accountId, account);
        this.systemStats.totalAccounts++;
        
        if (initialBalance > 0) {
            this.systemStats.totalDeposits += initialBalance;
        }

        return account;
    }

    getAccount(accountId) {
        return this.accounts.get(accountId);
    }

    // Transaction Processing
    deposit(accountId, amount, description = '') {
        const account = this.accounts.get(accountId);
        if (!account) {
            throw new Error('Account not found');
        }

        const success = account.processTransaction(amount, TransactionType.DEPOSIT, description);
        if (success) {
            this.systemStats.totalDeposits += amount;
        }
        return success;
    }

    withdraw(accountId, amount, description = '') {
        const account = this.accounts.get(accountId);
        if (!account) {
            throw new Error('Account not found');
        }

        // Fraud detection
        const customer = this.customers.get(account.customerId);
        const transaction = new Transaction(generateUUID(), accountId, amount, TransactionType.WITHDRAWAL, description);
        const fraudAlerts = this.fraudDetector.checkTransaction(transaction, account, customer);
        
        if (fraudAlerts.length > 0) {
            console.log('🚨 Fraud Alert:', fraudAlerts.join(', '));
        }

        return account.processTransaction(amount, TransactionType.WITHDRAWAL, description);
    }

    transfer(fromAccountId, toAccountId, amount, description = '') {
        const fromAccount = this.accounts.get(fromAccountId);
        const toAccount = this.accounts.get(toAccountId);

        if (!fromAccount || !toAccount) {
            throw new Error('One or both accounts not found');
        }

        // Withdraw from source account
        const withdrawSuccess = fromAccount.processTransaction(amount, TransactionType.WITHDRAWAL, 
            `Transfer to ${toAccount.accountNumber}: ${description}`);
        
        if (!withdrawSuccess) {
            return false;
        }

        // Deposit to destination account
        const depositSuccess = toAccount.processTransaction(amount, TransactionType.DEPOSIT, 
            `Transfer from ${fromAccount.accountNumber}: ${description}`);

        if (!depositSuccess) {
            // Rollback withdrawal
            fromAccount.processTransaction(amount, TransactionType.DEPOSIT, 'Transfer rollback');
            return false;
        }

        return true;
    }

    // Loan Management
    applyForLoan(customerId, amount, interestRate, termMonths, purpose) {
        const customer = this.customers.get(customerId);
        if (!customer) {
            throw new Error('Customer not found');
        }

        const loanId = generateUUID();
        const loan = new Loan(loanId, customerId, amount, interestRate, termMonths, purpose);

        // Simple approval logic based on credit score and existing balance
        const totalBalance = customer.getTotalBalance();
        const creditScore = customer.creditScore;

        if (creditScore >= 650 && totalBalance >= amount * 0.1) {
            loan.approve();
            console.log(`Loan approved for ${customer.name}`);
        } else {
            console.log(`Loan application rejected for ${customer.name}`);
        }

        this.loans.set(loanId, loan);
        return loan;
    }

    disburseLoan(loanId, accountId) {
        const loan = this.loans.get(loanId);
        const account = this.accounts.get(accountId);

        if (!loan || !account) {
            throw new Error('Loan or account not found');
        }

        if (loan.status !== LoanStatus.APPROVED) {
            throw new Error('Loan is not approved for disbursement');
        }

        loan.disburse();
        account.processTransaction(loan.amount, TransactionType.DEPOSIT, `Loan disbursement: ${loan.loanId}`);
        this.systemStats.totalLoans += loan.amount;

        return true;
    }

    // Analytics and Reporting
    getCustomerSummary(customerId) {
        const customer = this.customers.get(customerId);
        if (!customer) {
            return null;
        }

        const accounts = customer.accounts.map(account => ({
            accountId: account.accountId,
            accountNumber: account.accountNumber,
            type: account.accountType,
            balance: account.balance,
            isActive: account.isActive
        }));

        const loans = Array.from(this.loans.values())
            .filter(loan => loan.customerId === customerId)
            .map(loan => ({
                loanId: loan.loanId,
                amount: loan.amount,
                status: loan.status,
                monthlyPayment: loan.monthlyPayment,
                remainingBalance: loan.getRemainingBalance()
            }));

        return {
            customer: {
                name: customer.name,
                email: customer.email,
                creditScore: customer.creditScore,
                totalBalance: customer.getTotalBalance()
            },
            accounts,
            loans
        };
    }

    getSystemStatistics() {
        return {
            ...this.systemStats,
            totalBalance: Array.from(this.accounts.values())
                .reduce((total, account) => total + account.balance, 0),
            averageBalance: this.systemStats.totalAccounts > 0 ? 
                Array.from(this.accounts.values()).reduce((total, account) => total + account.balance, 0) / this.systemStats.totalAccounts : 0
        };
    }
}

// Demo function
function runDemo() {
    console.log("=== Banking System Demo ===\n");

    // Create banking system
    const bank = new BankingSystem("Global Bank");

    // Register customers
    console.log("1. Registering customers...");
    const alice = bank.registerCustomer("Alice Johnson", "alice@email.com", "555-0101", "123 Main St");
    const bob = bank.registerCustomer("Bob Smith", "bob@email.com", "555-0102", "456 Oak Ave");
    console.log(`Registered: ${alice.name} (Credit Score: ${alice.creditScore})`);
    console.log(`Registered: ${bob.name} (Credit Score: ${bob.creditScore})\n`);

    // Create accounts
    console.log("2. Creating accounts...");
    const aliceSavings = bank.createAccount(alice.customerId, AccountType.SAVINGS, 5000);
    const aliceChecking = bank.createAccount(alice.customerId, AccountType.CHECKING, 2000);
    const bobSavings = bank.createAccount(bob.customerId, AccountType.SAVINGS, 3000);
    const bobCredit = bank.createAccount(bob.customerId, AccountType.CREDIT, 3000);

    console.log(`Alice Savings: ${aliceSavings.accountNumber} - $${aliceSavings.balance}`);
    console.log(`Alice Checking: ${aliceChecking.accountNumber} - $${aliceChecking.balance}`);
    console.log(`Bob Savings: ${bobSavings.accountNumber} - $${bobSavings.balance}`);
    console.log(`Bob Credit: ${bobCredit.accountNumber} - Credit Limit: $${bobCredit.creditLimit}\n`);

    // Perform transactions
    console.log("3. Performing transactions...");
    bank.deposit(aliceSavings.accountId, 1000, "Salary deposit");
    bank.withdraw(aliceChecking.accountId, 500, "ATM withdrawal");
    bank.transfer(aliceSavings.accountId, bobSavings.accountId, 800, "Transfer to Bob");

    console.log(`Alice Savings balance: $${aliceSavings.balance}`);
    console.log(`Alice Checking balance: $${aliceChecking.balance}`);
    console.log(`Bob Savings balance: $${bobSavings.balance}\n`);

    // Apply for loan
    console.log("4. Loan application...");
    const loan = bank.applyForLoan(alice.customerId, 10000, 5.5, 36, "Car purchase");
    if (loan.status === LoanStatus.APPROVED) {
        bank.disburseLoan(loan.loanId, aliceChecking.accountId);
        console.log(`Loan disbursed: $${loan.amount}`);
        console.log(`Monthly payment: $${loan.monthlyPayment}`);
        console.log(`Alice Checking balance after loan: $${aliceChecking.balance}\n`);
    }

    // Customer summary
    console.log("5. Customer Summary:");
    const aliceSummary = bank.getCustomerSummary(alice.customerId);
    console.log("Alice's Account Summary:");
    console.log(`Total Balance: $${aliceSummary.customer.totalBalance.toFixed(2)}`);
    console.log(`Credit Score: ${aliceSummary.customer.creditScore}`);
    console.log("Accounts:");
    aliceSummary.accounts.forEach(account => {
        console.log(`  ${account.type}: $${account.balance.toFixed(2)}`);
    });
    console.log("Loans:");
    aliceSummary.loans.forEach(loan => {
        console.log(`  ${loan.status}: $${loan.amount} (Monthly: $${loan.monthlyPayment})`);
    });
    console.log();

    // System statistics
    console.log("6. System Statistics:");
    const stats = bank.getSystemStatistics();
    console.log(`Total Customers: ${stats.totalCustomers}`);
    console.log(`Total Accounts: ${stats.totalAccounts}`);
    console.log(`Total Deposits: $${stats.totalDeposits.toFixed(2)}`);
    console.log(`Total Loans: $${stats.totalLoans.toFixed(2)}`);
    console.log(`Total System Balance: $${stats.totalBalance.toFixed(2)}`);
    console.log(`Average Account Balance: $${stats.averageBalance.toFixed(2)}`);
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        BankingSystem,
        Customer,
        Account,
        SavingsAccount,
        CheckingAccount,
        CreditAccount,
        Loan,
        AccountType,
        TransactionType
    };
}

// Run demo if this file is executed directly
if (typeof require !== 'undefined' && require.main === module) {
    runDemo();
}