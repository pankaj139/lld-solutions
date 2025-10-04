/**
 * Splitwise / Expense Sharing System - Low Level Design Implementation in JavaScript
 * ====================================================================================
 * 
 * This file implements a complete expense sharing system similar to Splitwise that allows
 * users to track shared expenses, calculate balances, and simplify debts using minimal transactions.
 * 
 * DESIGN PATTERNS USED:
 * 1. Strategy Pattern: Different expense split strategies (EqualSplit, ExactSplit, PercentageSplit)
 * 2. Factory Pattern: SplitFactory creates appropriate split strategy instances based on type
 * 3. Observer Pattern: NotificationService observes expense changes and notifies users
 * 4. Command Pattern: AddExpenseCommand and SettleUpCommand encapsulate operations with undo capability
 * 5. Composite Pattern: Group contains multiple expenses (composition relationship)
 * 
 * OOP CONCEPTS DEMONSTRATED:
 * 1. Encapsulation: Private fields using # syntax, data hiding in BalanceSheet
 * 2. Abstraction: Abstract interfaces for SplitStrategy and ExpenseObserver
 * 3. Composition: Group has-a collection of expenses, ExpenseManager has-a BalanceSheet
 * 4. Polymorphism: Different split strategies implement same interface with different behavior
 * 
 * ARCHITECTURAL PRINCIPLES:
 * - Single Responsibility: Each class handles one concern (User, Expense, BalanceSheet, DebtSimplifier)
 * - Open/Closed: Open for extension (new split types) but closed for modification
 * - Dependency Injection: ExpenseManager receives dependencies
 * - Low Coupling: Components communicate through interfaces
 * 
 * BUSINESS FEATURES:
 * - Multiple split types (equal, exact, percentage-based)
 * - Efficient balance tracking with O(1) lookup
 * - Debt simplification algorithm using greedy approach
 * - Group expense management
 * - Settlement operations with transaction history
 * - Real-time notifications through observer pattern
 * 
 * ALGORITHMS:
 * - Debt Simplification: O(n log n) using heap-based greedy algorithm
 * - Balance Lookup: O(1) using nested Map structure
 * - Expense Split: O(n) where n is number of participants
 */

// ============================================================================
// ENUMS - Domain Definitions
// ============================================================================

/**
 * Enum for split types using Object.freeze for immutability
 */
const SplitType = Object.freeze({
    EQUAL: 'EQUAL',
    EXACT: 'EXACT',
    PERCENTAGE: 'PERCENTAGE'
});

/**
 * Enum for transaction status
 */
const TransactionStatus = Object.freeze({
    PENDING: 'PENDING',
    COMPLETED: 'COMPLETED',
    CANCELLED: 'CANCELLED'
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate UUID for unique identifiers
 * 
 * Returns: Random UUID string
 */
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// ============================================================================
// CORE DOMAIN MODELS
// ============================================================================

/**
 * User - Represents a user in the expense sharing system
 * 
 * DESIGN PATTERNS: Entity pattern with unique identity
 * OOP CONCEPTS: Encapsulation using private fields
 * 
 * How to use:
 * const user = new User("Alice", "alice@example.com", "1234567890");
 * console.log(user.getName());  // Returns: Alice
 * 
 * Returns: User object with unique ID and contact details
 */
class User {
    #id;
    #name;
    #email;
    #phone;

    /**
     * Initialize user with name, email, and optional phone
     * 
     * @param {string} name - User's name
     * @param {string} email - User's email
     * @param {string} phone - User's phone (optional)
     */
    constructor(name, email, phone = '') {
        this.#id = generateUUID();
        this.#name = name;
        this.#email = email;
        this.#phone = phone;
    }

    getId() { return this.#id; }
    getName() { return this.#name; }
    getEmail() { return this.#email; }
    getPhone() { return this.#phone; }

    toString() {
        return `User(${this.#name})`;
    }
}

// ============================================================================
// STRATEGY PATTERN - Split Strategies
// ============================================================================

/**
 * SplitStrategy - Abstract strategy for splitting expenses
 * 
 * DESIGN PATTERN: Strategy Pattern - defines family of algorithms
 * OOP CONCEPT: Abstraction - defines interface for all split types
 * SOLID: OCP - open for extension (new strategies), closed for modification
 * 
 * How to use:
 * Subclass this and implement calculateShares and validate methods
 */
class SplitStrategy {
    /**
     * Calculate how much each participant owes
     * 
     * BUSINESS RULE: Total shares must equal expense amount
     * 
     * @param {number} amount - Total expense amount
     * @param {Array<User>} participants - List of participants
     * @param {Object} metadata - Additional data (amounts, percentages)
     * @returns {Map<User, number>} - Map of user to their share
     */
    calculateShares(amount, participants, metadata) {
        throw new Error('calculateShares must be implemented by subclass');
    }

    /**
     * Validate if the split configuration is correct
     * 
     * @param {number} amount - Total amount
     * @param {Array<User>} participants - Participants
     * @param {Object} metadata - Additional data
     * @returns {Object} - {isValid: boolean, errorMessage: string}
     */
    validate(amount, participants, metadata) {
        throw new Error('validate must be implemented by subclass');
    }
}

/**
 * EqualSplit - Splits expense equally among participants
 * 
 * DESIGN PATTERN: Strategy Pattern - concrete strategy
 * OOP CONCEPT: Polymorphism - implements SplitStrategy interface
 * 
 * How to use:
 * const strategy = new EqualSplit();
 * const shares = strategy.calculateShares(300, [user1, user2, user3], null);
 * // Returns: Map with 100 for each user
 */
class EqualSplit extends SplitStrategy {
    /**
     * Divide amount equally, handling remainders
     * 
     * BUSINESS RULE: Use integer arithmetic (cents) to avoid floating-point errors
     * TIME COMPLEXITY: O(n) where n is number of participants
     */
    calculateShares(amount, participants, metadata) {
        if (!participants || participants.length === 0) {
            return new Map();
        }

        // Convert to cents for precision
        const amountCents = Math.round(amount * 100);
        const numParticipants = participants.length;
        const shareCents = Math.floor(amountCents / numParticipants);
        const remainder = amountCents % numParticipants;

        const shares = new Map();
        participants.forEach((user, index) => {
            // Distribute remainder across first few participants
            const userShare = shareCents + (index < remainder ? 1 : 0);
            shares.set(user, userShare / 100);
        });

        return shares;
    }

    validate(amount, participants, metadata) {
        if (amount <= 0) {
            return { isValid: false, errorMessage: 'Amount must be positive' };
        }
        if (!participants || participants.length === 0) {
            return { isValid: false, errorMessage: 'Must have at least one participant' };
        }
        return { isValid: true, errorMessage: '' };
    }
}

/**
 * ExactSplit - Splits expense with exact amounts for each participant
 * 
 * DESIGN PATTERN: Strategy Pattern - concrete strategy
 * OOP CONCEPT: Polymorphism - different implementation of same interface
 * 
 * How to use:
 * const exactAmounts = new Map([[user1, 100], [user2, 200]]);
 * const strategy = new ExactSplit(exactAmounts);
 * const shares = strategy.calculateShares(300, [user1, user2], null);
 */
class ExactSplit extends SplitStrategy {
    #exactAmounts;

    /**
     * Initialize with exact amounts for each user
     * 
     * BUSINESS RULE: Sum of exact amounts must equal total expense
     * 
     * @param {Map<User, number>} exactAmounts - Exact amount for each user
     */
    constructor(exactAmounts) {
        super();
        this.#exactAmounts = exactAmounts;
    }

    calculateShares(amount, participants, metadata) {
        return new Map(this.#exactAmounts);
    }

    validate(amount, participants, metadata) {
        if (amount <= 0) {
            return { isValid: false, errorMessage: 'Amount must be positive' };
        }

        if (!this.#exactAmounts || this.#exactAmounts.size === 0) {
            return { isValid: false, errorMessage: 'Exact amounts not specified' };
        }

        // Check all participants have amounts
        for (const user of participants) {
            if (!this.#exactAmounts.has(user)) {
                return { isValid: false, errorMessage: `Amount not specified for ${user.getName()}` };
            }
        }

        // Validate sum (allow small epsilon for floating point)
        let total = 0;
        for (const amt of this.#exactAmounts.values()) {
            total += amt;
        }

        if (Math.abs(total - amount) > 0.01) {
            return { isValid: false, errorMessage: `Exact amounts (${total}) don't match expense (${amount})` };
        }

        return { isValid: true, errorMessage: '' };
    }
}

/**
 * PercentageSplit - Splits expense based on percentages
 * 
 * DESIGN PATTERN: Strategy Pattern - concrete strategy
 * OOP CONCEPT: Polymorphism - alternate implementation
 * 
 * How to use:
 * const percentages = new Map([[user1, 60], [user2, 40]]);
 * const strategy = new PercentageSplit(percentages);
 * const shares = strategy.calculateShares(100, [user1, user2], null);
 * // Returns: user1: 60, user2: 40
 */
class PercentageSplit extends SplitStrategy {
    #percentages;

    /**
     * Initialize with percentage for each user
     * 
     * BUSINESS RULE: Percentages must sum to 100
     * 
     * @param {Map<User, number>} percentages - Percentage for each user
     */
    constructor(percentages) {
        super();
        this.#percentages = percentages;
    }

    calculateShares(amount, participants, metadata) {
        const shares = new Map();
        for (const [user, percentage] of this.#percentages.entries()) {
            shares.set(user, (amount * percentage) / 100);
        }
        return shares;
    }

    validate(amount, participants, metadata) {
        if (amount <= 0) {
            return { isValid: false, errorMessage: 'Amount must be positive' };
        }

        if (!this.#percentages || this.#percentages.size === 0) {
            return { isValid: false, errorMessage: 'Percentages not specified' };
        }

        // Check all participants have percentages
        for (const user of participants) {
            if (!this.#percentages.has(user)) {
                return { isValid: false, errorMessage: `Percentage not specified for ${user.getName()}` };
            }
        }

        // Validate sum equals 100%
        let total = 0;
        for (const pct of this.#percentages.values()) {
            total += pct;
        }

        if (Math.abs(total - 100) > 0.01) {
            return { isValid: false, errorMessage: `Percentages must sum to 100, got ${total}` };
        }

        return { isValid: true, errorMessage: '' };
    }
}

// ============================================================================
// FACTORY PATTERN - Split Factory
// ============================================================================

/**
 * SplitFactory - Factory for creating split strategy instances
 * 
 * DESIGN PATTERN: Factory Pattern - centralizes object creation
 * SOLID: SRP - single responsibility is creating strategies
 * 
 * How to use:
 * const strategy = SplitFactory.createSplit(SplitType.EQUAL, null);
 * 
 * Returns: Appropriate SplitStrategy instance
 */
class SplitFactory {
    /**
     * Create appropriate split strategy based on type
     * 
     * DESIGN PATTERN: Factory Method - encapsulates instantiation
     * 
     * @param {string} splitType - Type from SplitType enum
     * @param {Object} metadata - Additional data needed
     * @returns {SplitStrategy} - Appropriate strategy instance
     */
    static createSplit(splitType, metadata) {
        switch (splitType) {
            case SplitType.EQUAL:
                return new EqualSplit();
            
            case SplitType.EXACT:
                if (!metadata || !metadata.exactAmounts) {
                    throw new Error('Exact amounts required for EXACT split');
                }
                return new ExactSplit(metadata.exactAmounts);
            
            case SplitType.PERCENTAGE:
                if (!metadata || !metadata.percentages) {
                    throw new Error('Percentages required for PERCENTAGE split');
                }
                return new PercentageSplit(metadata.percentages);
            
            default:
                throw new Error(`Unknown split type: ${splitType}`);
        }
    }
}

// ============================================================================
// EXPENSE AND TRANSACTION MODELS
// ============================================================================

/**
 * Expense - Represents a shared expense
 * 
 * DESIGN PATTERN: Entity pattern with unique identity
 * OOP CONCEPTS: Encapsulation - immutable after creation for audit
 * 
 * How to use:
 * const expense = new Expense("Dinner", 300, paidByUser, [user1, user2], new EqualSplit());
 * const splits = expense.calculateSplits();
 * 
 * Returns: Expense object with calculated splits
 */
class Expense {
    #id;
    #description;
    #amount;
    #paidBy;
    #participants;
    #splitStrategy;
    #timestamp;

    /**
     * Create new expense
     * 
     * BUSINESS RULE: Expense is immutable after creation for audit purposes
     * 
     * @param {string} description - Expense description
     * @param {number} amount - Total amount
     * @param {User} paidBy - User who paid
     * @param {Array<User>} participants - All participants
     * @param {SplitStrategy} splitStrategy - How to split
     */
    constructor(description, amount, paidBy, participants, splitStrategy) {
        this.#id = generateUUID();
        this.#description = description;
        this.#amount = amount;
        this.#paidBy = paidBy;
        this.#participants = [...participants];
        this.#splitStrategy = splitStrategy;
        this.#timestamp = new Date();

        // Validate the split
        const validation = splitStrategy.validate(amount, participants, null);
        if (!validation.isValid) {
            throw new Error(`Invalid expense split: ${validation.errorMessage}`);
        }
    }

    getId() { return this.#id; }
    getDescription() { return this.#description; }
    getAmount() { return this.#amount; }
    getPaidBy() { return this.#paidBy; }
    getParticipants() { return [...this.#participants]; }
    getTimestamp() { return this.#timestamp; }

    /**
     * Calculate how much each participant owes
     * 
     * DESIGN PATTERN: Strategy Pattern - delegates to split strategy
     * 
     * @returns {Map<User, number>} - Map of user to their share
     */
    calculateSplits() {
        return this.#splitStrategy.calculateShares(
            this.#amount,
            this.#participants,
            null
        );
    }

    toString() {
        return `Expense(${this.#description}, $${this.#amount.toFixed(2)}, paid by ${this.#paidBy.getName()})`;
    }
}

/**
 * Transaction - Represents a payment between two users
 * 
 * DESIGN PATTERN: Value Object - represents a payment
 * OOP CONCEPTS: Encapsulation - immutable transaction record
 * 
 * How to use:
 * const transaction = new Transaction(fromUser, toUser, 50, "Settlement");
 * console.log(transaction.getAmount());  // Returns: 50
 * 
 * Returns: Transaction object representing payment
 */
class Transaction {
    #id;
    #fromUser;
    #toUser;
    #amount;
    #description;
    #timestamp;
    #status;

    /**
     * Create transaction record
     * 
     * BUSINESS RULE: Transactions are immutable for audit trail
     */
    constructor(fromUser, toUser, amount, description = '') {
        this.#id = generateUUID();
        this.#fromUser = fromUser;
        this.#toUser = toUser;
        this.#amount = amount;
        this.#description = description;
        this.#timestamp = new Date();
        this.#status = TransactionStatus.COMPLETED;
    }

    getId() { return this.#id; }
    getFromUser() { return this.#fromUser; }
    getToUser() { return this.#toUser; }
    getAmount() { return this.#amount; }
    getDescription() { return this.#description; }
    getTimestamp() { return this.#timestamp; }
    getStatus() { return this.#status; }

    toString() {
        return `${this.#fromUser.getName()} pays ${this.#toUser.getName()} $${this.#amount.toFixed(2)}`;
    }
}

// ============================================================================
// BALANCE SHEET - Core Financial Tracking
// ============================================================================

/**
 * BalanceSheet - Tracks balances between all users efficiently
 * 
 * DESIGN PATTERN: Repository pattern - manages balance data
 * OOP CONCEPTS: Encapsulation - hides balance storage implementation
 * DATA STRUCTURE: Nested Map for O(1) lookup
 * 
 * How to use:
 * const balanceSheet = new BalanceSheet();
 * balanceSheet.addBalance(user1, user2, 50);  // user1 owes user2 $50
 * const balance = balanceSheet.getBalance(user1, user2);
 * 
 * Returns: BalanceSheet managing all user balances
 */
class BalanceSheet {
    #balances;

    /**
     * Initialize balance sheet
     * 
     * BUSINESS RULE: balance[A][B] > 0 means A owes B
     * DATA STRUCTURE: Map<UserId, Map<UserId, Amount>> for O(1) access
     */
    constructor() {
        // balances[user1.id][user2.id] = amount user1 owes user2
        this.#balances = new Map();
    }

    /**
     * Add to balance between two users
     * 
     * BUSINESS RULE: If user1 owes user2, add positive amount
     * TIME COMPLEXITY: O(1) for Map operations
     * 
     * @param {User} user1 - First user
     * @param {User} user2 - Second user
     * @param {number} amount - Amount to add
     */
    addBalance(user1, user2, amount) {
        if (amount === 0) return;

        const user1Id = user1.getId();
        const user2Id = user2.getId();

        if (!this.#balances.has(user1Id)) {
            this.#balances.set(user1Id, new Map());
        }

        const currentBalance = this.#balances.get(user1Id).get(user2Id) || 0;
        const newBalance = currentBalance + amount;

        if (Math.abs(newBalance) < 0.01) {
            // Close to zero, remove entry
            this.#balances.get(user1Id).delete(user2Id);
            if (this.#balances.get(user1Id).size === 0) {
                this.#balances.delete(user1Id);
            }
        } else {
            this.#balances.get(user1Id).set(user2Id, newBalance);
        }
    }

    /**
     * Get balance between two users
     * 
     * Returns: Positive if user1 owes user2, negative if user2 owes user1
     * TIME COMPLEXITY: O(1)
     * 
     * @param {User} user1 - First user
     * @param {User} user2 - Second user
     * @returns {number} - Balance amount
     */
    getBalance(user1, user2) {
        const user1Id = user1.getId();
        const user2Id = user2.getId();

        const forward = this.#balances.get(user1Id)?.get(user2Id) || 0;
        const backward = this.#balances.get(user2Id)?.get(user1Id) || 0;

        return forward - backward;
    }

    /**
     * Clear balance between two users (settle up)
     * 
     * BUSINESS RULE: Sets balance to zero
     * 
     * @param {User} user1 - First user
     * @param {User} user2 - Second user
     */
    settleBalance(user1, user2) {
        const user1Id = user1.getId();
        const user2Id = user2.getId();

        // Remove both directions
        if (this.#balances.has(user1Id)) {
            this.#balances.get(user1Id).delete(user2Id);
        }
        if (this.#balances.has(user2Id)) {
            this.#balances.get(user2Id).delete(user1Id);
        }
    }

    /**
     * Calculate net balance for user
     * 
     * BUSINESS RULE: Positive means others owe user, negative means user owes others
     * 
     * @param {User} user - User to calculate for
     * @param {Map<string, User>} userMap - Map of user IDs to users
     * @returns {number} - Net balance
     */
    getNetBalance(user, userMap) {
        const userId = user.getId();
        let net = 0;

        // Amount this user is owed by others (they owe user, so user has negative balance to them)
        if (this.#balances.has(userId)) {
            for (const [otherId, amount] of this.#balances.get(userId).entries()) {
                net -= amount;  // user owes other, so subtract from net
            }
        }

        // Amount others owe this user
        for (const [otherId, balances] of this.#balances.entries()) {
            if (otherId !== userId && balances.has(userId)) {
                const amount = balances.get(userId);
                net += amount;  // other owes user
            }
        }

        return net;
    }

    /**
     * Get all non-zero balances
     * 
     * @param {Map<string, User>} userMap - Map of user IDs to users
     * @returns {Map} - Map of user pairs to amounts
     */
    getAllNonZeroBalances(userMap) {
        const result = new Map();
        for (const [user1Id, balances] of this.#balances.entries()) {
            for (const [user2Id, amount] of balances.entries()) {
                if (Math.abs(amount) > 0.01) {
                    const user1 = userMap.get(user1Id);
                    const user2 = userMap.get(user2Id);
                    if (user1 && user2) {
                        result.set([user1, user2], amount);
                    }
                }
            }
        }
        return result;
    }
}

// ============================================================================
// MIN HEAP IMPLEMENTATION
// ============================================================================

/**
 * MinHeap - Min heap for debt simplification algorithm
 * 
 * TIME COMPLEXITY: O(log n) for insert/extract
 */
class MinHeap {
    #heap;
    #compareFn;

    constructor(compareFn = (a, b) => a[0] - b[0]) {
        this.#heap = [];
        this.#compareFn = compareFn;
    }

    push(item) {
        this.#heap.push(item);
        this.#bubbleUp(this.#heap.length - 1);
    }

    pop() {
        if (this.size() === 0) return null;
        if (this.size() === 1) return this.#heap.pop();

        const top = this.#heap[0];
        this.#heap[0] = this.#heap.pop();
        this.#bubbleDown(0);
        return top;
    }

    size() {
        return this.#heap.length;
    }

    #bubbleUp(index) {
        while (index > 0) {
            const parentIndex = Math.floor((index - 1) / 2);
            if (this.#compareFn(this.#heap[index], this.#heap[parentIndex]) >= 0) break;
            [this.#heap[index], this.#heap[parentIndex]] = [this.#heap[parentIndex], this.#heap[index]];
            index = parentIndex;
        }
    }

    #bubbleDown(index) {
        while (true) {
            const leftChild = 2 * index + 1;
            const rightChild = 2 * index + 2;
            let smallest = index;

            if (leftChild < this.#heap.length && 
                this.#compareFn(this.#heap[leftChild], this.#heap[smallest]) < 0) {
                smallest = leftChild;
            }

            if (rightChild < this.#heap.length && 
                this.#compareFn(this.#heap[rightChild], this.#heap[smallest]) < 0) {
                smallest = rightChild;
            }

            if (smallest === index) break;

            [this.#heap[index], this.#heap[smallest]] = [this.#heap[smallest], this.#heap[index]];
            index = smallest;
        }
    }
}

// ============================================================================
// DEBT SIMPLIFICATION - Graph Algorithm
// ============================================================================

/**
 * DebtSimplifier - Simplifies debts to minimize transactions
 * 
 * DESIGN PATTERN: Strategy pattern for simplification algorithms
 * ALGORITHM: Greedy approach using heaps
 * TIME COMPLEXITY: O(n log n) where n is number of users
 * 
 * How to use:
 * const simplifier = new DebtSimplifier(balanceSheet);
 * const transactions = simplifier.simplifyDebts(users, userMap);
 * 
 * Returns: List of Transaction objects for minimal settlement
 */
class DebtSimplifier {
    #balanceSheet;

    constructor(balanceSheet) {
        this.#balanceSheet = balanceSheet;
    }

    /**
     * Calculate minimum transactions to settle all debts
     * 
     * ALGORITHM:
     * 1. Calculate net balance for each user
     * 2. Separate into creditors (positive) and debtors (negative)
     * 3. Use heaps to match largest creditor with largest debtor
     * 
     * TIME COMPLEXITY: O(n log n) for heap operations
     * SPACE COMPLEXITY: O(n) for heaps
     * 
     * @param {Array<User>} users - All users
     * @param {Map<string, User>} userMap - User ID to User mapping
     * @returns {Array<Transaction>} - Minimal transactions
     */
    simplifyDebts(users, userMap) {
        // Step 1: Calculate net balance for each user
        const netBalances = new Map();
        for (const user of users) {
            const net = this.#balanceSheet.getNetBalance(user, userMap);
            if (Math.abs(net) > 0.01) {
                netBalances.set(user, net);
            }
        }

        if (netBalances.size === 0) {
            return [];
        }

        // Step 2: Separate creditors and debtors
        const creditors = new MinHeap((a, b) => b[0] - a[0]); // Max heap (negate)
        const debtors = new MinHeap((a, b) => a[0] - b[0]);   // Min heap

        for (const [user, balance] of netBalances.entries()) {
            if (balance > 0) {
                creditors.push([balance, user]);
            } else {
                debtors.push([balance, user]);
            }
        }

        // Step 3: Match creditors and debtors greedily
        const transactions = [];

        while (creditors.size() > 0 && debtors.size() > 0) {
            const [creditorAmount, creditor] = creditors.pop();
            const [debtorAmount, debtor] = debtors.pop();

            const transactionAmount = Math.min(creditorAmount, -debtorAmount);

            transactions.push(
                new Transaction(debtor, creditor, transactionAmount, 'Debt settlement')
            );

            const creditorRemaining = creditorAmount - transactionAmount;
            const debtorRemaining = -debtorAmount - transactionAmount;

            if (creditorRemaining > 0.01) {
                creditors.push([creditorRemaining, creditor]);
            }

            if (debtorRemaining > 0.01) {
                debtors.push([-debtorRemaining, debtor]);
            }
        }

        return transactions;
    }
}

// ============================================================================
// COMPOSITE PATTERN - Group Management
// ============================================================================

/**
 * Group - Manages a group of users and shared expenses
 * 
 * DESIGN PATTERN: Composite Pattern - group contains expenses
 * OOP CONCEPTS: Composition - group has-a collection of expenses
 * 
 * How to use:
 * const group = new Group("Trip to Paris", [user1, user2, user3]);
 * group.addExpense(expense);
 * 
 * Returns: Group object managing members and expenses
 */
class Group {
    #id;
    #name;
    #members;
    #expenses;
    #createdAt;

    /**
     * Create new group
     * 
     * BUSINESS RULE: Group must have at least 2 members
     */
    constructor(name, members) {
        if (members.length < 2) {
            throw new Error('Group must have at least 2 members');
        }

        this.#id = generateUUID();
        this.#name = name;
        this.#members = [...members];
        this.#expenses = [];
        this.#createdAt = new Date();
    }

    getId() { return this.#id; }
    getName() { return this.#name; }
    getMembers() { return [...this.#members]; }
    getExpenses() { return [...this.#expenses]; }
    getCreatedAt() { return this.#createdAt; }

    /**
     * Add member to group
     */
    addMember(user) {
        if (!this.#members.includes(user)) {
            this.#members.push(user);
        }
    }

    /**
     * Remove member from group
     * 
     * BUSINESS RULE: Cannot remove if user has unsettled balances
     */
    removeMember(user) {
        const index = this.#members.indexOf(user);
        if (index !== -1) {
            this.#members.splice(index, 1);
        }
    }

    /**
     * Add expense to group
     * 
     * BUSINESS RULE: All participants must be group members
     */
    addExpense(expense) {
        const participants = expense.getParticipants();
        for (const participant of participants) {
            if (!this.#members.includes(participant)) {
                throw new Error(`${participant.getName()} is not a group member`);
            }
        }
        this.#expenses.push(expense);
    }

    toString() {
        return `Group(${this.#name}, ${this.#members.length} members)`;
    }
}

// ============================================================================
// OBSERVER PATTERN - Notifications
// ============================================================================

/**
 * ExpenseObserver - Observer interface for expense events
 * 
 * DESIGN PATTERN: Observer Pattern - defines observer interface
 * SOLID: ISP - focused interface
 */
class ExpenseObserver {
    onExpenseAdded(expense) {
        throw new Error('onExpenseAdded must be implemented');
    }

    onBalanceChanged(user, balance) {
        throw new Error('onBalanceChanged must be implemented');
    }
}

/**
 * NotificationService - Concrete observer for notifications
 * 
 * DESIGN PATTERN: Observer Pattern - concrete observer
 * OOP CONCEPTS: Polymorphism - implements ExpenseObserver
 */
class NotificationService extends ExpenseObserver {
    /**
     * Notify users when expense is added
     * 
     * BUSINESS RULE: Notify all participants
     */
    onExpenseAdded(expense) {
        const payer = expense.getPaidBy();
        const participants = expense.getParticipants();

        for (const participant of participants) {
            if (participant !== payer) {
                this._sendNotification(
                    participant,
                    `${payer.getName()} added expense: ${expense.getDescription()}`
                );
            }
        }
    }

    onBalanceChanged(user, balance) {
        this._sendNotification(user, `Your balance changed: $${balance.toFixed(2)}`);
    }

    _sendNotification(user, message) {
        console.log(`📧 Notification to ${user.getName()}: ${message}`);
    }
}

// ============================================================================
// COMMAND PATTERN - Expense Operations
// ============================================================================

/**
 * ExpenseCommand - Command interface
 * 
 * DESIGN PATTERN: Command Pattern - encapsulates operations
 */
class ExpenseCommand {
    execute() {
        throw new Error('execute must be implemented');
    }

    undo() {
        throw new Error('undo must be implemented');
    }
}

/**
 * AddExpenseCommand - Command to add expense
 * 
 * DESIGN PATTERN: Command Pattern - concrete command
 */
class AddExpenseCommand extends ExpenseCommand {
    #manager;
    #expense;
    #executed;

    constructor(manager, expense) {
        super();
        this.#manager = manager;
        this.#expense = expense;
        this.#executed = false;
    }

    execute() {
        if (!this.#executed) {
            this.#manager.addExpense(this.#expense);
            this.#executed = true;
        }
    }

    undo() {
        if (this.#executed) {
            console.log(`Undoing expense: ${this.#expense.getDescription()}`);
            this.#executed = false;
        }
    }
}

/**
 * SettleUpCommand - Command to settle balance
 */
class SettleUpCommand extends ExpenseCommand {
    #manager;
    #user1;
    #user2;
    #previousBalance;
    #executed;

    constructor(manager, user1, user2) {
        super();
        this.#manager = manager;
        this.#user1 = user1;
        this.#user2 = user2;
        this.#previousBalance = null;
        this.#executed = false;
    }

    execute() {
        if (!this.#executed) {
            this.#previousBalance = this.#manager.getBalanceBetween(this.#user1, this.#user2);
            this.#manager.settleUp(this.#user1, this.#user2);
            this.#executed = true;
        }
    }

    undo() {
        if (this.#executed) {
            console.log(`Undoing settle up between ${this.#user1.getName()} and ${this.#user2.getName()}`);
            this.#executed = false;
        }
    }
}

// ============================================================================
// EXPENSE MANAGER - Main Controller (Facade)
// ============================================================================

/**
 * ExpenseManager - Main controller managing entire system
 * 
 * DESIGN PATTERN: Facade Pattern - provides unified interface
 * OOP CONCEPTS: Encapsulation - manages system complexity
 * SOLID: SRP - coordinates between components
 * 
 * How to use:
 * const manager = new ExpenseManager();
 * manager.addUser(user);
 * manager.addExpense(expense);
 * const balances = manager.getUserBalances(user);
 */
class ExpenseManager {
    #users;
    #expenses;
    #groups;
    #balanceSheet;
    #debtSimplifier;
    #observers;

    constructor() {
        this.#users = new Map();
        this.#expenses = new Map();
        this.#groups = new Map();
        this.#balanceSheet = new BalanceSheet();
        this.#debtSimplifier = new DebtSimplifier(this.#balanceSheet);
        this.#observers = [];
    }

    /**
     * Register user in system
     * 
     * BUSINESS RULE: User ID must be unique
     */
    addUser(user) {
        if (this.#users.has(user.getId())) {
            throw new Error(`User ${user.getName()} already exists`);
        }
        this.#users.set(user.getId(), user);
        console.log(`✅ User added: ${user.getName()}`);
    }

    /**
     * Add expense and update balances
     * 
     * BUSINESS RULE: Updates balance sheet based on splits
     * TIME COMPLEXITY: O(n) where n is participants
     */
    addExpense(expense) {
        this.#expenses.set(expense.getId(), expense);

        const splits = expense.calculateSplits();
        const payer = expense.getPaidBy();

        for (const [participant, share] of splits.entries()) {
            if (participant !== payer) {
                this.#balanceSheet.addBalance(participant, payer, share);
            }
        }

        this._notifyExpenseAdded(expense);

        console.log(`✅ Expense added: ${expense}`);
        console.log(`   Splits: ${Array.from(splits.entries()).map(([u, s]) => `${u.getName()}: $${s.toFixed(2)}`).join(', ')}`);
    }

    getBalanceBetween(user1, user2) {
        return this.#balanceSheet.getBalance(user1, user2);
    }

    getUserBalances(user) {
        const balances = {};
        for (const [otherId, otherUser] of this.#users.entries()) {
            if (otherId !== user.getId()) {
                const balance = this.#balanceSheet.getBalance(user, otherUser);
                if (Math.abs(balance) > 0.01) {
                    balances[otherUser.getName()] = balance;
                }
            }
        }
        return balances;
    }

    simplifyDebts(users) {
        return this.#debtSimplifier.simplifyDebts(users, this.#users);
    }

    settleUp(user1, user2) {
        const balance = this.#balanceSheet.getBalance(user1, user2);

        if (Math.abs(balance) < 0.01) {
            console.log(`No balance to settle between ${user1.getName()} and ${user2.getName()}`);
            return;
        }

        const transaction = balance > 0
            ? new Transaction(user1, user2, balance, 'Settlement')
            : new Transaction(user2, user1, Math.abs(balance), 'Settlement');

        this.#balanceSheet.settleBalance(user1, user2);
        console.log(`✅ Settled: ${transaction}`);
    }

    createGroup(name, members) {
        for (const member of members) {
            if (!this.#users.has(member.getId())) {
                throw new Error(`User ${member.getName()} not registered`);
            }
        }

        const group = new Group(name, members);
        this.#groups.set(group.getId(), group);
        console.log(`✅ Group created: ${group}`);
        return group;
    }

    addObserver(observer) {
        this.#observers.push(observer);
    }

    _notifyExpenseAdded(expense) {
        for (const observer of this.#observers) {
            observer.onExpenseAdded(expense);
        }
    }

    getExpenseHistory(user = null) {
        let expenses = Array.from(this.#expenses.values());

        if (user) {
            expenses = expenses.filter(e => 
                e.getParticipants().includes(user) || e.getPaidBy() === user
            );
        }

        expenses.sort((a, b) => b.getTimestamp() - a.getTimestamp());
        return expenses;
    }
}

// ============================================================================
// DEMO / MAIN FUNCTION
// ============================================================================

/**
 * Demonstrate the expense sharing system
 */
function main() {
    console.log('='.repeat(80));
    console.log('SPLITWISE / EXPENSE SHARING SYSTEM - COMPREHENSIVE DEMO');
    console.log('='.repeat(80));
    console.log();

    // Step 1: Create users
    console.log('📝 Step 1: Creating Users');
    console.log('-'.repeat(80));
    const alice = new User('Alice', 'alice@example.com', '1234567890');
    const bob = new User('Bob', 'bob@example.com', '2345678901');
    const charlie = new User('Charlie', 'charlie@example.com', '3456789012');
    const diana = new User('Diana', 'diana@example.com', '4567890123');

    // Step 2: Initialize system
    const manager = new ExpenseManager();
    manager.addUser(alice);
    manager.addUser(bob);
    manager.addUser(charlie);
    manager.addUser(diana);

    const notificationService = new NotificationService();
    manager.addObserver(notificationService);
    console.log();

    // Step 3: Equal split expense
    console.log('📝 Step 2: Adding Equal Split Expense');
    console.log('-'.repeat(80));
    const expense1 = new Expense(
        'Dinner at Italian Restaurant',
        300.00,
        alice,
        [alice, bob, charlie],
        new EqualSplit()
    );
    manager.addExpense(expense1);
    console.log();

    // Step 4: Exact split expense
    console.log('📝 Step 3: Adding Exact Split Expense');
    console.log('-'.repeat(80));
    const exactAmounts = new Map([[bob, 100.00], [charlie, 50.00]]);
    const expense2 = new Expense(
        'Movie tickets',
        150.00,
        bob,
        [bob, charlie],
        new ExactSplit(exactAmounts)
    );
    manager.addExpense(expense2);
    console.log();

    // Step 5: Percentage split expense
    console.log('📝 Step 4: Adding Percentage Split Expense');
    console.log('-'.repeat(80));
    const percentages = new Map([[alice, 50.0], [bob, 30.0], [diana, 20.0]]);
    const expense3 = new Expense(
        'Taxi ride',
        100.00,
        diana,
        [alice, bob, diana],
        new PercentageSplit(percentages)
    );
    manager.addExpense(expense3);
    console.log();

    // Step 6: Check balances
    console.log('📝 Step 5: Checking User Balances');
    console.log('-'.repeat(80));
    for (const user of [alice, bob, charlie, diana]) {
        const balances = manager.getUserBalances(user);
        console.log(`${user.getName()}'s balances:`);
        if (Object.keys(balances).length > 0) {
            for (const [otherName, amount] of Object.entries(balances)) {
                if (amount > 0) {
                    console.log(`  → Owes ${otherName}: $${amount.toFixed(2)}`);
                } else {
                    console.log(`  → ${otherName} owes them: $${Math.abs(amount).toFixed(2)}`);
                }
            }
        } else {
            console.log('  → All settled up!');
        }
        console.log();
    }

    // Step 7: Simplify debts
    console.log('📝 Step 6: Simplifying Debts (Minimal Transactions)');
    console.log('-'.repeat(80));
    const simplified = manager.simplifyDebts([alice, bob, charlie, diana]);
    console.log(`Minimum transactions needed: ${simplified.length}`);
    simplified.forEach((transaction, i) => {
        console.log(`  ${i + 1}. ${transaction}`);
    });
    console.log();

    // Step 8: Create group
    console.log('📝 Step 7: Creating Expense Group');
    console.log('-'.repeat(80));
    const tripGroup = manager.createGroup('Weekend Trip', [alice, bob, charlie]);
    const groupExpense = new Expense(
        'Hotel booking',
        600.00,
        alice,
        [alice, bob, charlie],
        new EqualSplit()
    );
    tripGroup.addExpense(groupExpense);
    manager.addExpense(groupExpense);
    console.log();

    // Step 9: Settle up
    console.log('📝 Step 8: Settling Up Between Users');
    console.log('-'.repeat(80));
    console.log(`Balance before: Bob owes Alice $${manager.getBalanceBetween(bob, alice).toFixed(2)}`);
    manager.settleUp(bob, alice);
    console.log(`Balance after: $${manager.getBalanceBetween(bob, alice).toFixed(2)}`);
    console.log();

    // Step 10: Command pattern demo
    console.log('📝 Step 9: Demonstrating Command Pattern');
    console.log('-'.repeat(80));
    const newExpense = new Expense(
        'Coffee',
        20.00,
        bob,
        [bob, charlie],
        new EqualSplit()
    );
    const command = new AddExpenseCommand(manager, newExpense);
    console.log('Executing add expense command...');
    command.execute();
    console.log('Undoing expense...');
    command.undo();
    console.log();

    console.log('='.repeat(80));
    console.log('DEMO COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(80));
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        User,
        Expense,
        Transaction,
        SplitStrategy,
        EqualSplit,
        ExactSplit,
        PercentageSplit,
        SplitFactory,
        BalanceSheet,
        DebtSimplifier,
        Group,
        ExpenseManager,
        ExpenseObserver,
        NotificationService,
        ExpenseCommand,
        AddExpenseCommand,
        SettleUpCommand,
        SplitType,
        TransactionStatus
    };
}

// Run demo if executed directly
if (typeof require !== 'undefined' && require.main === module) {
    main();
}

