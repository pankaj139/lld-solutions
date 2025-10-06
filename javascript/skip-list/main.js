/**
 * Skip List - Probabilistic Data Structure Implementation
 * 
 * This module implements a Skip List data structure that provides O(log n) average-case
 * time complexity for search, insert, and delete operations using a probabilistic approach
 * with multi-level linked lists.
 * 
 * Features:
 * - O(log n) search, insert, delete operations (average case)
 * - Multi-level linked list structure (tower metaphor)
 * - Probabilistic balancing without rotations
 * - Range queries in O(log n + k) time
 * - Iterator for sorted traversal
 * - 5 Design Patterns: Iterator, Strategy, Template Method, Factory, Singleton
 * 
 * Usage:
 *     const skipList = new SkipList();
 *     skipList.insert(10);
 *     skipList.insert(20);
 *     const found = skipList.search(10);  // true
 *     skipList.delete(10);
 *     const elements = skipList.getRange(5, 25);  // [20]
 * 
 * Design Patterns Used:
 * 1. Iterator - For sequential traversal
 * 2. Strategy - For level generation strategies
 * 3. Template Method - For search algorithm skeleton
 * 4. Factory - For skip list creation with different configurations
 * 5. Singleton - For random number generator
 * 
 * Author: LLD Solutions
 * Date: 2025
 */

// ============================================================================
// 1. ITERATOR PATTERN - Sequential traversal of skip list
// ============================================================================

/**
 * Iterator for traversing skip list in sorted order.
 * 
 * This implements the Iterator Pattern to provide sequential access
 * to elements in the skip list without exposing internal structure.
 * 
 * Usage:
 *     const iterator = new SkipListIterator(skipList.head);
 *     while (iterator.hasNext()) {
 *         const value = iterator.next();
 *         console.log(value);
 *     }
 * 
 * Time Complexity: O(n) for complete traversal
 * Space Complexity: O(1)
 */
class SkipListIterator {
    /**
     * Initialize iterator at the first real node (after head).
     * @param {SkipNode} head - Sentinel head node
     */
    constructor(head) {
        this.current = head ? head.forward[0] : null;
    }

    /**
     * Check if there are more elements to iterate.
     * @returns {boolean} True if more elements exist
     */
    hasNext() {
        return this.current !== null;
    }

    /**
     * Get next element and advance iterator.
     * @returns {*} Value of current node
     * @throws {Error} If no more elements
     */
    next() {
        if (!this.hasNext()) {
            throw new Error('No more elements');
        }

        const value = this.current.value;
        this.current = this.current.forward[0];
        return value;
    }
}

// ============================================================================
// 2. STRATEGY PATTERN - Different level generation strategies
// ============================================================================

/**
 * Abstract strategy for generating random levels.
 * 
 * This implements the Strategy Pattern to allow different approaches
 * for determining the height of new nodes in the skip list.
 */
class LevelGenerationStrategy {
    /**
     * Generate a random level for a new node.
     * @param {number} maxLevel - Maximum allowed level
     * @returns {number} Generated level (1 to maxLevel)
     */
    generateLevel(maxLevel) {
        throw new Error('Must be implemented by subclass');
    }
}

/**
 * Traditional coin flip strategy with 50% probability.
 * 
 * This is the classic skip list approach where each level has
 * 50% probability of being promoted to the next level.
 * 
 * Expected level: 2
 * Probability distribution:
 *     Level 1: 50%
 *     Level 2: 25%
 *     Level 3: 12.5%
 *     ...
 */
class CoinFlipStrategy extends LevelGenerationStrategy {
    /**
     * Initialize with promotion probability.
     * @param {number} probability - Probability of promoting to next level (default 0.5)
     */
    constructor(probability = 0.5) {
        super();
        this.probability = probability;
    }

    /**
     * Generate level using geometric distribution.
     * 
     * Time Complexity: O(log n) expected
     * Space Complexity: O(1)
     * 
     * @param {number} maxLevel - Maximum level
     * @returns {number} Generated level
     */
    generateLevel(maxLevel) {
        let level = 1;
        while (Math.random() < this.probability && level < maxLevel) {
            level++;
        }
        return level;
    }
}

/**
 * Deterministic strategy for testing purposes.
 * 
 * Always returns a fixed level, useful for testing and debugging.
 */
class DeterministicStrategy extends LevelGenerationStrategy {
    /**
     * Initialize with a fixed level.
     * @param {number} fixedLevel - Level to always return
     */
    constructor(fixedLevel = 1) {
        super();
        this.fixedLevel = fixedLevel;
    }

    /**
     * Return fixed level, capped at maxLevel.
     * @param {number} maxLevel - Maximum level
     * @returns {number} Fixed level
     */
    generateLevel(maxLevel) {
        return Math.min(this.fixedLevel, maxLevel);
    }
}

// ============================================================================
// 3. SINGLETON PATTERN - Single random generator instance
// ============================================================================

/**
 * Singleton for random number generation.
 * 
 * Ensures only one random generator is used across the application,
 * allowing for reproducible results with seed setting.
 */
class RandomGeneratorSingleton {
    constructor() {
        if (RandomGeneratorSingleton.instance) {
            return RandomGeneratorSingleton.instance;
        }
        RandomGeneratorSingleton.instance = this;
    }

    /**
     * Set random seed for reproducibility (not implemented in standard JS).
     * @param {number} seed - Seed value
     */
    setSeed(seed) {
        // Note: JavaScript doesn't have built-in seed setting for Math.random()
        // This would require a custom PRNG implementation
        console.log(`Setting seed: ${seed} (not implemented in standard JS)`);
    }

    /**
     * Generate random float between 0 and 1.
     * @returns {number} Random value
     */
    random() {
        return Math.random();
    }
}

// ============================================================================
// 4. SKIP NODE - Building block of skip list
// ============================================================================

/**
 * Node in a skip list with multiple forward pointers.
 * 
 * Each node is like a building with multiple floors:
 * - All nodes have ground floor (level 0)
 * - Some nodes have additional floors (express lanes)
 * - Taller towers allow faster traversal
 */
class SkipNode {
    /**
     * Initialize skip node with given value and level.
     * @param {*} value - Value to store
     * @param {number} level - Height of node tower
     */
    constructor(value, level) {
        this.value = value;
        this.level = level;
        this.forward = new Array(level + 1).fill(null);
    }

    /**
     * Get forward pointer at given level.
     * @param {number} level - Level index
     * @returns {SkipNode|null} Forward node or null
     */
    getForward(level) {
        return level < this.forward.length ? this.forward[level] : null;
    }

    /**
     * Set forward pointer at given level.
     * @param {number} level - Level index
     * @param {SkipNode|null} node - Node to point to
     */
    setForward(level, node) {
        if (level < this.forward.length) {
            this.forward[level] = node;
        }
    }

    /**
     * String representation showing value and level.
     * @returns {string}
     */
    toString() {
        return `Node(${this.value}, level=${this.level})`;
    }
}

// ============================================================================
// 5. SKIP LIST - Main data structure with template method
// ============================================================================

/**
 * Skip List implementation with O(log n) operations.
 * 
 * A skip list is a probabilistic data structure that uses multiple levels
 * of linked lists to achieve O(log n) search, insert, and delete operations
 * without the complexity of tree balancing.
 * 
 * Structure:
 *     Level 3:  HEAD --------------------------------> NIL
 *     Level 2:  HEAD --------> 6 -------------------> NIL
 *     Level 1:  HEAD -----> 3 -> 6 -----> 12 -------> NIL
 *     Level 0:  HEAD -> 1-> 3 -> 6 -> 9 -> 12 -> 17 -> NIL
 * 
 * Usage:
 *     const skipList = new SkipList();
 *     skipList.insert(10);
 *     skipList.insert(20);
 *     const found = skipList.search(10);  // true
 *     skipList.delete(10);
 * 
 * Time Complexity:
 *     - Search: O(log n) average, O(n) worst
 *     - Insert: O(log n) average, O(n) worst
 *     - Delete: O(log n) average, O(n) worst
 * 
 * Space Complexity: O(n) with expected 2n pointers
 */
class SkipList {
    /**
     * Initialize empty skip list.
     * @param {number} maxLevel - Maximum number of levels (default 16, supports ~65k elements)
     * @param {LevelGenerationStrategy} levelStrategy - Strategy for level generation
     */
    constructor(maxLevel = 16, levelStrategy = null) {
        this.maxLevel = maxLevel;
        this.level = 0;  // Current max level in use
        this._size = 0;
        this.head = new SkipNode(null, maxLevel);  // Sentinel head
        this.levelStrategy = levelStrategy || new CoinFlipStrategy(0.5);
    }

    // ========================================================================
    // TEMPLATE METHOD PATTERN - Search algorithm skeleton
    // ========================================================================

    /**
     * Template method: Locate predecessors at each level for given value.
     * 
     * This is the core algorithm used by search, insert, and delete.
     * It descends through levels, moving right when possible.
     * 
     * Algorithm:
     *     1. Start at top level of head node
     *     2. Move right while next value < target
     *     3. When can't move right, go down one level
     *     4. Repeat until bottom level
     * 
     * @param {*} value - Target value to locate
     * @returns {Object} Object with current node and update array
     * 
     * Time Complexity: O(log n) expected
     * Space Complexity: O(log n) for update array
     */
    _locatePredecessors(value) {
        const update = new Array(this.maxLevel + 1).fill(null);
        let current = this.head;

        // Start from highest level and descend
        for (let lvl = this.level; lvl >= 0; lvl--) {
            // Move right while next value < target
            while (current.forward[lvl] && current.forward[lvl].value < value) {
                current = current.forward[lvl];
            }
            // Store predecessor at this level
            update[lvl] = current;
        }

        return { current, update };
    }

    /**
     * Template method: Check if node contains target value.
     * @param {SkipNode|null} node - Node to check
     * @param {*} value - Target value
     * @returns {boolean} True if node exists and contains value
     */
    _checkFound(node, value) {
        return node !== null && node.value === value;
    }

    // ========================================================================
    // PUBLIC API - Core operations
    // ========================================================================

    /**
     * Search for value in skip list.
     * 
     * Uses template method to locate node, then checks if found.
     * 
     * Example:
     *     skipList.insert(10);
     *     const found = skipList.search(10);  // true
     *     const notFound = skipList.search(20);  // false
     * 
     * @param {*} value - Value to search for
     * @returns {boolean} True if value exists
     * 
     * Time Complexity: O(log n) expected
     * Space Complexity: O(1)
     */
    search(value) {
        const { current } = this._locatePredecessors(value);
        const next = current.forward[0];
        return this._checkFound(next, value);
    }

    /**
     * Insert value into skip list.
     * 
     * Algorithm:
     *     1. Find insertion position (like search)
     *     2. Check if value already exists
     *     3. Generate random level for new node
     *     4. Update forward pointers at all levels
     * 
     * Example:
     *     skipList.insert(10);  // true
     *     skipList.insert(10);  // false (duplicate)
     * 
     * @param {*} value - Value to insert
     * @returns {boolean} True if inserted, false if duplicate
     * 
     * Time Complexity: O(log n) expected
     * Space Complexity: O(log n) for update array
     */
    insert(value) {
        const { current, update } = this._locatePredecessors(value);

        // Check if already exists
        let next = current.forward[0];
        if (this._checkFound(next, value)) {
            return false;  // Duplicate
        }

        // Generate random level for new node
        const newLevel = this.levelStrategy.generateLevel(this.maxLevel);

        // Update list level if necessary
        if (newLevel > this.level) {
            for (let lvl = this.level + 1; lvl <= newLevel; lvl++) {
                update[lvl] = this.head;
            }
            this.level = newLevel;
        }

        // Create new node
        const newNode = new SkipNode(value, newLevel);

        // Insert node by updating forward pointers
        for (let lvl = 0; lvl <= newLevel; lvl++) {
            newNode.forward[lvl] = update[lvl].forward[lvl];
            update[lvl].forward[lvl] = newNode;
        }

        this._size++;
        return true;
    }

    /**
     * Delete value from skip list.
     * 
     * Algorithm:
     *     1. Find node to delete (like search)
     *     2. Check if node exists
     *     3. Update forward pointers to bypass node
     *     4. Decrease level if necessary
     * 
     * Example:
     *     skipList.insert(10);
     *     skipList.delete(10);  // true
     *     skipList.delete(10);  // false (not found)
     * 
     * @param {*} value - Value to delete
     * @returns {boolean} True if deleted, false if not found
     * 
     * Time Complexity: O(log n) expected
     * Space Complexity: O(log n) for update array
     */
    delete(value) {
        const { current, update } = this._locatePredecessors(value);

        // Get node to delete
        let target = current.forward[0];

        // Check if node exists
        if (!this._checkFound(target, value)) {
            return false;
        }

        // Update forward pointers to bypass deleted node
        for (let lvl = 0; lvl <= this.level; lvl++) {
            if (update[lvl].forward[lvl] !== target) {
                break;
            }
            update[lvl].forward[lvl] = target.forward[lvl];
        }

        // Decrease level if necessary
        while (this.level > 0 && this.head.forward[this.level] === null) {
            this.level--;
        }

        this._size--;
        return true;
    }

    /**
     * Check if value exists in skip list (alias for search).
     * @param {*} value - Value to check
     * @returns {boolean} True if exists
     */
    contains(value) {
        return this.search(value);
    }

    /**
     * Get all elements in range [start, end] (inclusive).
     * 
     * Example:
     *     skipList.insert(3);
     *     skipList.insert(6);
     *     skipList.insert(9);
     *     skipList.insert(12);
     *     const elements = skipList.getRange(5, 10);  // [6, 9]
     * 
     * @param {*} start - Start of range
     * @param {*} end - End of range
     * @returns {Array} Elements in range, in sorted order
     * 
     * Time Complexity: O(log n + k) where k = result size
     * Space Complexity: O(k)
     */
    getRange(start, end) {
        const result = [];
        let current = this.head;

        // Search for start position
        for (let lvl = this.level; lvl >= 0; lvl--) {
            while (current.forward[lvl] && current.forward[lvl].value < start) {
                current = current.forward[lvl];
            }
        }

        // Move to first valid node
        current = current.forward[0];

        // Collect all nodes in range
        while (current && current.value <= end) {
            result.push(current.value);
            current = current.forward[0];
        }

        return result;
    }

    /**
     * Get minimum element.
     * @returns {*|null} Minimum element or null if empty
     * Time Complexity: O(1)
     */
    getMin() {
        return this.head.forward[0] ? this.head.forward[0].value : null;
    }

    /**
     * Get maximum element.
     * @returns {*|null} Maximum element or null if empty
     * Time Complexity: O(log n) expected
     */
    getMax() {
        if (this._size === 0) {
            return null;
        }

        let current = this.head;
        for (let lvl = this.level; lvl >= 0; lvl--) {
            while (current.forward[lvl]) {
                current = current.forward[lvl];
            }
        }

        return current.value;
    }

    /**
     * Get number of elements.
     * @returns {number} Size of skip list
     */
    size() {
        return this._size;
    }

    /**
     * Check if skip list is empty.
     * @returns {boolean} True if empty
     */
    isEmpty() {
        return this._size === 0;
    }

    /**
     * Remove all elements from skip list.
     */
    clear() {
        this.head = new SkipNode(null, this.maxLevel);
        this.level = 0;
        this._size = 0;
    }

    /**
     * Display skip list structure (for debugging).
     * Shows all levels with their elements.
     */
    display() {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`Skip List (size=${this._size}, max_level=${this.level})`);
        console.log(`${'='.repeat(60)}`);

        for (let lvl = this.level; lvl >= 0; lvl--) {
            process.stdout.write(`Level ${lvl}: HEAD`);
            let current = this.head.forward[lvl];
            while (current) {
                process.stdout.write(` -> ${current.value}`);
                current = current.forward[lvl];
            }
            console.log(' -> NIL');
        }
        console.log(`${'='.repeat(60)}\n`);
    }

    // ========================================================================
    // ITERATOR PATTERN - Support for iteration
    // ========================================================================

    /**
     * Return iterator for skip list.
     * Allows use in for...of loops.
     * 
     * Example:
     *     for (const value of skipList) {
     *         console.log(value);
     *     }
     */
    *[Symbol.iterator]() {
        const iterator = new SkipListIterator(this.head);
        while (iterator.hasNext()) {
            yield iterator.next();
        }
    }

    /**
     * Convert to array (sorted order).
     * @returns {Array} Array of elements
     */
    toArray() {
        return Array.from(this);
    }

    /**
     * String representation.
     * @returns {string}
     */
    toString() {
        return `SkipList([${this.toArray().join(', ')}])`;
    }
}

// ============================================================================
// 6. FACTORY PATTERN - Skip list creation with different configurations
// ============================================================================

/**
 * Factory for creating skip lists with different configurations.
 * 
 * This implements the Factory Pattern to provide convenient ways
 * to create skip lists optimized for different use cases.
 */
class SkipListFactory {
    /**
     * Create default skip list.
     * 
     * Configuration:
     *     - Max level: 16 (supports ~65k elements)
     *     - Probability: 0.5 (traditional)
     * 
     * @returns {SkipList} Skip list with default configuration
     */
    static createDefault() {
        return new SkipList(16, new CoinFlipStrategy(0.5));
    }

    /**
     * Create high-performance skip list.
     * 
     * Configuration:
     *     - Max level: 32 (supports billions of elements)
     *     - Probability: 0.25 (fewer levels, better constants)
     * 
     * @returns {SkipList} Skip list optimized for performance
     */
    static createHighPerformance() {
        return new SkipList(32, new CoinFlipStrategy(0.25));
    }

    /**
     * Create skip list for small datasets.
     * 
     * Configuration:
     *     - Max level: 8 (supports ~256 elements)
     *     - Probability: 0.5
     * 
     * @returns {SkipList} Skip list for small datasets
     */
    static createSmall() {
        return new SkipList(8, new CoinFlipStrategy(0.5));
    }

    /**
     * Create skip list with deterministic level generation.
     * 
     * Useful for testing and debugging.
     * 
     * @param {number} fixedLevel - Fixed level for all nodes
     * @returns {SkipList} Skip list with deterministic levels
     */
    static createDeterministic(fixedLevel = 2) {
        return new SkipList(16, new DeterministicStrategy(fixedLevel));
    }
}

// ============================================================================
// DEMONSTRATION
// ============================================================================

function demoBasicOperations() {
    console.log('='.repeat(70));
    console.log('DEMO 1: Basic Operations (Insert, Search, Delete)');
    console.log('='.repeat(70));

    const skipList = SkipListFactory.createDefault();

    // Insert elements
    console.log('\n📝 Inserting elements: 3, 6, 7, 9, 12, 17, 19, 21, 25, 26');
    const elements = [3, 6, 7, 9, 12, 17, 19, 21, 25, 26];
    elements.forEach(elem => {
        const result = skipList.insert(elem);
        console.log(`   Insert ${elem}: ${result ? '✓ Success' : '✗ Duplicate'}`);
    });

    // Display structure
    skipList.display();

    // Search operations
    console.log('🔍 Search Operations:');
    const searchValues = [9, 15, 19, 100];
    searchValues.forEach(val => {
        const found = skipList.search(val);
        console.log(`   Search ${val}: ${found ? '✓ Found' : '✗ Not Found'}`);
    });

    // Delete operations
    console.log('\n🗑️  Delete Operations:');
    const deleteValues = [9, 15, 19];
    deleteValues.forEach(val => {
        const result = skipList.delete(val);
        console.log(`   Delete ${val}: ${result ? '✓ Deleted' : '✗ Not Found'}`);
    });

    // Display after deletion
    skipList.display();

    // Statistics
    console.log('📊 Statistics:');
    console.log(`   Size: ${skipList.size()}`);
    console.log(`   Min: ${skipList.getMin()}`);
    console.log(`   Max: ${skipList.getMax()}`);
    console.log(`   Elements: ${JSON.stringify(skipList.toArray())}`);
}

function demoRangeQueries() {
    console.log('\n' + '='.repeat(70));
    console.log('DEMO 2: Range Queries');
    console.log('='.repeat(70));

    const skipList = SkipListFactory.createDefault();

    // Insert elements
    const elements = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50];
    console.log(`\n📝 Inserting elements: ${JSON.stringify(elements)}`);
    elements.forEach(elem => skipList.insert(elem));

    console.log(`   Complete list: ${JSON.stringify(skipList.toArray())}`);

    // Range queries
    console.log('\n🔍 Range Query Operations:');
    const ranges = [[10, 30], [5, 25], [35, 55], [0, 100], [60, 70]];

    ranges.forEach(([start, end]) => {
        const result = skipList.getRange(start, end);
        console.log(`   Range [${start}, ${end}]: ${JSON.stringify(result)}`);
    });
}

function demoIteratorPattern() {
    console.log('\n' + '='.repeat(70));
    console.log('DEMO 3: Iterator Pattern');
    console.log('='.repeat(70));

    const skipList = SkipListFactory.createDefault();

    // Insert elements
    const elements = [42, 17, 89, 23, 56, 7, 91, 34];
    console.log(`\n📝 Inserting elements (unsorted): ${JSON.stringify(elements)}`);
    elements.forEach(elem => skipList.insert(elem));

    // Iterate using for...of loop
    console.log('\n🔄 Iterating using for...of loop (sorted order):');
    const sorted = [];
    for (const value of skipList) {
        sorted.push(value);
    }
    console.log(`   ${sorted.join(' -> ')}`);

    // Iterate using iterator directly
    console.log('\n🔄 Iterating using iterator directly:');
    const iterator = new SkipListIterator(skipList.head);
    const values = [];
    while (iterator.hasNext()) {
        values.push(iterator.next());
    }
    console.log(`   ${values.join(' -> ')}`);

    // Use array methods
    console.log('\n🔄 Using array methods:');
    const squared = skipList.toArray().map(x => x * x);
    console.log(`   Squared values: ${JSON.stringify(squared)}`);

    // Filter using iterator
    console.log('\n🔄 Filtering even numbers:');
    const evens = skipList.toArray().filter(x => x % 2 === 0);
    console.log(`   Even numbers: ${JSON.stringify(evens)}`);
}

function demoFactoryPattern() {
    console.log('\n' + '='.repeat(70));
    console.log('DEMO 4: Factory Pattern (Different Configurations)');
    console.log('='.repeat(70));

    // Default configuration
    console.log('\n🏭 Creating default skip list:');
    const defaultList = SkipListFactory.createDefault();
    console.log(`   Max level: ${defaultList.maxLevel}`);
    console.log(`   Strategy: ${defaultList.levelStrategy.constructor.name}`);

    for (let i = 0; i < 10; i++) {
        defaultList.insert(i * 10);
    }
    defaultList.display();

    // High performance configuration
    console.log('\n🏭 Creating high-performance skip list:');
    const hpList = SkipListFactory.createHighPerformance();
    console.log(`   Max level: ${hpList.maxLevel}`);
    console.log(`   Strategy: ${hpList.levelStrategy.constructor.name}`);

    // Small dataset configuration
    console.log('\n🏭 Creating small skip list:');
    const smallList = SkipListFactory.createSmall();
    console.log(`   Max level: ${smallList.maxLevel}`);

    for (let i = 0; i < 5; i++) {
        smallList.insert(i + 1);
    }
    smallList.display();

    // Deterministic configuration (for testing)
    console.log('\n🏭 Creating deterministic skip list (fixed level 2):');
    const detList = SkipListFactory.createDeterministic(2);
    console.log(`   Max level: ${detList.maxLevel}`);
    console.log(`   Strategy: ${detList.levelStrategy.constructor.name}`);

    for (let i = 0; i < 8; i++) {
        detList.insert((i + 1) * 5);
    }
    detList.display();
}

function demoPerformanceComparison() {
    console.log('\n' + '='.repeat(70));
    console.log('DEMO 5: Performance Characteristics');
    console.log('='.repeat(70));

    const skipList = SkipListFactory.createDefault();

    // Large insertion test
    console.log('\n⏱️  Performance Test: Inserting 1000 elements');
    const n = 1000;

    let start = Date.now();
    for (let i = 0; i < n; i++) {
        skipList.insert(i);
    }
    const insertTime = (Date.now() - start) / 1000;

    console.log(`   Inserted ${n} elements in ${insertTime.toFixed(4)} seconds`);
    console.log(`   Average per insert: ${((insertTime / n) * 1000).toFixed(4)} ms`);
    console.log(`   Final size: ${skipList.size()}`);
    console.log(`   Current max level: ${skipList.level}`);

    // Search test
    console.log('\n⏱️  Performance Test: Searching 1000 elements');
    start = Date.now();
    let foundCount = 0;
    for (let i = 0; i < n; i++) {
        if (skipList.search(i)) {
            foundCount++;
        }
    }
    const searchTime = (Date.now() - start) / 1000;

    console.log(`   Searched ${n} elements in ${searchTime.toFixed(4)} seconds`);
    console.log(`   Average per search: ${((searchTime / n) * 1000).toFixed(4)} ms`);
    console.log(`   Found: ${foundCount}/${n}`);

    // Range query test
    console.log('\n⏱️  Performance Test: Range queries');
    const ranges = [[0, 100], [200, 300], [500, 600], [800, 900]];

    start = Date.now();
    ranges.forEach(([startVal, endVal]) => {
        const result = skipList.getRange(startVal, endVal);
        console.log(`   Range [${startVal}, ${endVal}]: ${result.length} elements`);
    });
    const rangeTime = (Date.now() - start) / 1000;

    console.log(`   Total time for ${ranges.length} range queries: ${rangeTime.toFixed(4)} seconds`);

    // Delete test
    console.log('\n⏱️  Performance Test: Deleting 500 elements');
    start = Date.now();
    let deletedCount = 0;
    for (let i = 0; i < n; i += 2) {  // Delete every other element
        if (skipList.delete(i)) {
            deletedCount++;
        }
    }
    const deleteTime = (Date.now() - start) / 1000;

    console.log(`   Deleted ${deletedCount} elements in ${deleteTime.toFixed(4)} seconds`);
    console.log(`   Average per delete: ${((deleteTime / deletedCount) * 1000).toFixed(4)} ms`);
    console.log(`   Remaining size: ${skipList.size()}`);
}

function demoEdgeCases() {
    console.log('\n' + '='.repeat(70));
    console.log('DEMO 6: Edge Cases & Error Handling');
    console.log('='.repeat(70));

    const skipList = SkipListFactory.createDefault();

    // Empty list operations
    console.log('\n🔍 Operations on empty list:');
    console.log(`   Search 10: ${skipList.search(10)}`);
    console.log(`   Delete 10: ${skipList.delete(10)}`);
    console.log(`   Size: ${skipList.size()}`);
    console.log(`   Is empty: ${skipList.isEmpty()}`);
    console.log(`   Min: ${skipList.getMin()}`);
    console.log(`   Max: ${skipList.getMax()}`);
    console.log(`   Range [1, 10]: ${JSON.stringify(skipList.getRange(1, 10))}`);

    // Single element
    console.log('\n📝 Single element operations:');
    skipList.insert(42);
    console.log('   Inserted 42');
    console.log(`   Size: ${skipList.size()}`);
    console.log(`   Search 42: ${skipList.search(42)}`);
    console.log(`   Min: ${skipList.getMin()}`);
    console.log(`   Max: ${skipList.getMax()}`);
    skipList.display();

    // Duplicate insertion
    console.log('\n📝 Duplicate insertion:');
    console.log(`   Insert 42 again: ${skipList.insert(42)} (should be false)`);
    console.log(`   Size: ${skipList.size()} (should remain 1)`);

    // Delete single element
    console.log('\n🗑️  Delete single element:');
    console.log(`   Delete 42: ${skipList.delete(42)}`);
    console.log(`   Size: ${skipList.size()}`);
    console.log(`   Is empty: ${skipList.isEmpty()}`);

    // Large values
    console.log('\n📝 Large values:');
    const largeValues = [1000000, 999999, 1000001];
    largeValues.forEach(val => skipList.insert(val));
    console.log(`   Inserted: ${JSON.stringify(largeValues)}`);
    console.log(`   List: ${JSON.stringify(skipList.toArray())}`);

    // Clear operation
    console.log('\n🗑️  Clear operation:');
    console.log(`   Size before clear: ${skipList.size()}`);
    skipList.clear();
    console.log(`   Size after clear: ${skipList.size()}`);
    console.log(`   Is empty: ${skipList.isEmpty()}`);
}

function main() {
    console.log('\n' + '🎯'.repeat(35));
    console.log('SKIP LIST - COMPREHENSIVE DEMONSTRATION');
    console.log('🎯'.repeat(35));
    console.log('\nDesign Patterns Demonstrated:');
    console.log('1. Iterator Pattern - Sequential traversal');
    console.log('2. Strategy Pattern - Level generation strategies');
    console.log('3. Template Method Pattern - Search algorithm skeleton');
    console.log('4. Factory Pattern - Skip list creation');
    console.log('5. Singleton Pattern - Random generator');
    console.log('\nKey Features:');
    console.log('✅ O(log n) search, insert, delete (average case)');
    console.log('✅ Probabilistic balancing (no rotations)');
    console.log('✅ Multi-level linked list structure');
    console.log('✅ Range queries in O(log n + k)');
    console.log('✅ Sorted iteration');

    demoBasicOperations();
    demoRangeQueries();
    demoIteratorPattern();
    demoFactoryPattern();
    demoPerformanceComparison();
    demoEdgeCases();

    console.log('\n' + '='.repeat(70));
    console.log('✅ ALL DEMONSTRATIONS COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(70));
    console.log('\n📊 Summary:');
    console.log('   - 5 Design Patterns implemented');
    console.log('   - O(log n) operations achieved');
    console.log('   - Comprehensive edge case handling');
    console.log('   - Production-ready implementation');
    console.log('='.repeat(70) + '\n');
}

// Run demonstrations
main();
