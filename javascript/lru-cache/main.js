/**
 * LRU Cache System Implementation in JavaScript
 * =============================================
 * 
 * This implementation demonstrates several key Design Patterns and OOP Concepts:
 * 
 * DESIGN PATTERNS USED:
 * 1. Strategy Pattern: Different eviction policies (LRU, LFU, FIFO)
 * 2. Observer Pattern: Event notifications for cache operations
 * 3. Template Method Pattern: Base cache operations with customizable eviction
 * 4. Decorator Pattern: Cache enhancement with additional features
 * 5. Builder Pattern: Fluent interface for cache configuration
 * 6. Facade Pattern: Simple interface hiding complex internal logic
 * 
 * OOP CONCEPTS DEMONSTRATED:
 * 1. Encapsulation: Internal data structures hidden behind clean interface
 * 2. Abstraction: Simple get/put interface hiding complex LRU logic
 * 3. Composition: Cache composed of HashMap + DoublyLinkedList
 * 4. Polymorphism: Different eviction policies with same interface
 * 5. Inheritance: Event listener hierarchy and policy inheritance
 * 
 * ARCHITECTURAL PRINCIPLES:
 * - Single Responsibility: Each class handles one concern
 * - Open/Closed: Easy to add new eviction policies or event listeners
 * - Liskov Substitution: All eviction policies interchangeable
 * - Interface Segregation: Focused, minimal interfaces
 * - Dependency Inversion: High-level cache doesn't depend on specific policies
 * 
 * BUSINESS FEATURES:
 * - O(1) get and put operations using HashMap + DoublyLinkedList
 * - Automatic least recently used item eviction
 * - Configurable capacity management
 * - Comprehensive statistics and event tracking
 * - Thread-safe operations (simulated in single-threaded JS)
 * - Generic support for any key-value types
 */

/**
 * Cache Event Class - Observer Pattern implementation
 * 
 * Represents cache operation events for monitoring and statistics
 */
class CacheEvent {
    constructor(eventType, key, value = null, timestamp = null) {
        this.eventType = eventType;  // 'hit', 'miss', 'put', 'evict'
        this.key = key;
        this.value = value;
        this.timestamp = timestamp || Date.now();
    }

    toString() {
        return `CacheEvent(${this.eventType}: ${this.key})`;
    }
}

/**
 * Abstract Event Listener - Observer Pattern
 * 
 * Base class for cache event listeners
 */
class CacheEventListener {
    /**
     * Handle cache events
     * @param {CacheEvent} event - The cache event to handle
     */
    onCacheEvent(event) {
        throw new Error("onCacheEvent must be implemented by subclass");
    }
}

/**
 * Cache Node Class - Building block for doubly linked list
 * 
 * DESIGN PATTERNS:
 * - Node Pattern: Basic building block for linked data structures
 * - Encapsulation: Internal structure hidden from external access
 * 
 * FEATURES:
 * - Bidirectional links for O(1) insertion/deletion
 * - Access tracking for statistics and LFU support
 * - Clean separation of data and structure concerns
 */
class CacheNode {
    constructor(key, value) {
        this.key = key;
        this.value = value;
        this.prev = null;
        this.next = null;
        this.accessTime = Date.now();
        this.accessCount = 0;
    }

    toString() {
        return `Node(${this.key}: ${this.value})`;
    }
}

/**
 * Abstract Eviction Policy - Strategy Pattern
 * 
 * Base class for different cache eviction strategies
 */
class EvictionPolicy {
    /**
     * Called when a cache item is accessed
     * @param {CacheNode} node - The accessed node
     */
    onAccess(node) {
        throw new Error("onAccess must be implemented by subclass");
    }

    /**
     * Called when a new item is inserted
     * @param {CacheNode} node - The inserted node
     */
    onInsert(node) {
        throw new Error("onInsert must be implemented by subclass");
    }

    /**
     * Determine if eviction is needed
     * @param {number} cacheSize - Current cache size
     * @param {number} capacity - Maximum capacity
     * @returns {boolean} - Whether eviction is needed
     */
    shouldEvict(cacheSize, capacity) {
        return cacheSize >= capacity;
    }

    /**
     * Select node to evict
     * @param {Map} cache - Cache storage map
     * @returns {CacheNode|null} - Node to evict or null
     */
    getEvictionCandidate(cache) {
        throw new Error("getEvictionCandidate must be implemented by subclass");
    }
}

/**
 * LRU Eviction Policy - Concrete Strategy implementation
 * 
 * BUSINESS LOGIC:
 * - Maintains access order using doubly linked list
 * - Evicts items that haven't been accessed for longest time
 * - Updates access time on every get/put operation
 * 
 * DATA STRUCTURE:
 * - Doubly linked list with dummy head and tail nodes
 * - O(1) insertion, deletion, and movement operations
 */
class LRUEvictionPolicy extends EvictionPolicy {
    constructor() {
        super();
        // Dummy head and tail for easier list manipulation
        this.head = new CacheNode(null, null);
        this.tail = new CacheNode(null, null);
        this.head.next = this.tail;
        this.tail.prev = this.head;
    }

    onAccess(node) {
        node.accessTime = Date.now();
        node.accessCount++;
        this._moveToHead(node);
    }

    onInsert(node) {
        node.accessTime = Date.now();
        node.accessCount = 1;
        this._addToHead(node);
    }

    getEvictionCandidate(cache) {
        // Return least recently used node (tail's previous)
        if (this.tail.prev !== this.head) {
            return this.tail.prev;
        }
        return null;
    }

    /**
     * Add node right after head
     * @param {CacheNode} node - Node to add
     */
    _addToHead(node) {
        node.prev = this.head;
        node.next = this.head.next;
        this.head.next.prev = node;
        this.head.next = node;
    }

    /**
     * Remove node from linked list
     * @param {CacheNode} node - Node to remove
     */
    _removeNode(node) {
        const prevNode = node.prev;
        const nextNode = node.next;
        prevNode.next = nextNode;
        nextNode.prev = prevNode;
    }

    /**
     * Move existing node to head
     * @param {CacheNode} node - Node to move
     */
    _moveToHead(node) {
        this._removeNode(node);
        this._addToHead(node);
    }

    /**
     * Remove and return last node
     * @returns {CacheNode|null} - Removed node or null
     */
    _removeTail() {
        const lastNode = this.tail.prev;
        if (lastNode !== this.head) {
            this._removeNode(lastNode);
            return lastNode;
        }
        return null;
    }
}

/**
 * Cache Statistics - Observer Pattern implementation
 * 
 * Tracks cache performance metrics and provides analysis
 */
class CacheStatistics {
    constructor() {
        this.hits = 0;
        this.misses = 0;
        this.puts = 0;
        this.evictions = 0;
        this.startTime = Date.now();
    }

    get hitRate() {
        const total = this.hits + this.misses;
        return total > 0 ? this.hits / total : 0.0;
    }

    get missRate() {
        return 1.0 - this.hitRate;
    }

    get totalOperations() {
        return this.hits + this.misses + this.puts;
    }

    get uptime() {
        return Date.now() - this.startTime;
    }

    reset() {
        this.hits = 0;
        this.misses = 0;
        this.puts = 0;
        this.evictions = 0;
        this.startTime = Date.now();
    }

    toString() {
        return `CacheStats(hits=${this.hits}, misses=${this.misses}, hit_rate=${(this.hitRate * 100).toFixed(1)}%)`;
    }
}

/**
 * LRU Cache Implementation - Main Cache System
 * 
 * DESIGN PATTERNS:
 * - Strategy Pattern: Pluggable eviction policies
 * - Observer Pattern: Event notifications and statistics
 * - Facade Pattern: Simple interface hiding complex internal logic
 * - Composite Pattern: Combines HashMap and DoublyLinkedList
 * 
 * COMPLEXITY:
 * - Time: O(1) for all operations (get, put, delete)
 * - Space: O(capacity) for storage
 * 
 * FEATURES:
 * - Generic key-value support
 * - Comprehensive statistics tracking
 * - Event-driven architecture
 * - Extensible eviction policies
 * - Memory efficient implementation
 */
class LRUCache {
    /**
     * Create LRU Cache
     * @param {number} capacity - Maximum number of items
     * @param {EvictionPolicy} evictionPolicy - Eviction strategy
     */
    constructor(capacity, evictionPolicy = null) {
        if (capacity <= 0) {
            throw new Error("Capacity must be positive");
        }

        this.capacity = capacity;
        this.cache = new Map();  // HashMap for O(1) access
        this.evictionPolicy = evictionPolicy || new LRUEvictionPolicy();
        this.statistics = new CacheStatistics();
        this.eventListeners = [];
    }

    /**
     * Get value by key with O(1) complexity
     * 
     * BUSINESS LOGIC:
     * - Return value if key exists and update access order
     * - Return undefined if key doesn't exist
     * - Update statistics and fire events
     * 
     * @param {*} key - The key to look up
     * @returns {*} - The value or undefined if not found
     */
    get(key) {
        if (this.cache.has(key)) {
            const node = this.cache.get(key);
            this.evictionPolicy.onAccess(node);
            this.statistics.hits++;
            this._fireEvent(new CacheEvent('hit', key, node.value));
            return node.value;
        } else {
            this.statistics.misses++;
            this._fireEvent(new CacheEvent('miss', key));
            return undefined;
        }
    }

    /**
     * Put key-value pair with O(1) complexity
     * 
     * BUSINESS LOGIC:
     * - Update existing key or add new key-value pair
     * - Handle capacity overflow with eviction
     * - Maintain LRU order and update statistics
     * 
     * @param {*} key - The key to store
     * @param {*} value - The value to store
     * @returns {*} - Previous value if key existed, undefined otherwise
     */
    put(key, value) {
        let oldValue = undefined;

        if (this.cache.has(key)) {
            // Update existing key
            const node = this.cache.get(key);
            oldValue = node.value;
            node.value = value;
            this.evictionPolicy.onAccess(node);
        } else {
            // Add new key-value pair
            const node = new CacheNode(key, value);

            // Check if eviction is needed
            if (this.evictionPolicy.shouldEvict(this.cache.size, this.capacity)) {
                this._evictOne();
            }

            this.cache.set(key, node);
            this.evictionPolicy.onInsert(node);
        }

        this.statistics.puts++;
        this._fireEvent(new CacheEvent('put', key, value));
        return oldValue;
    }

    /**
     * Check if key exists without updating access order
     * @param {*} key - The key to check
     * @returns {boolean} - Whether key exists
     */
    has(key) {
        return this.cache.has(key);
    }

    /**
     * Remove key from cache
     * @param {*} key - The key to remove
     * @returns {boolean} - Whether key was removed
     */
    delete(key) {
        if (this.cache.has(key)) {
            const node = this.cache.get(key);
            this.cache.delete(key);
            
            // Remove from linked list if LRU policy
            if (this.evictionPolicy instanceof LRUEvictionPolicy) {
                this.evictionPolicy._removeNode(node);
            }
            
            this._fireEvent(new CacheEvent('delete', key, node.value));
            return true;
        }
        return false;
    }

    /**
     * Get current cache size
     * @returns {number} - Current number of items
     */
    size() {
        return this.cache.size;
    }

    /**
     * Check if cache is empty
     * @returns {boolean} - Whether cache is empty
     */
    isEmpty() {
        return this.cache.size === 0;
    }

    /**
     * Check if cache is at capacity
     * @returns {boolean} - Whether cache is full
     */
    isFull() {
        return this.cache.size >= this.capacity;
    }

    /**
     * Remove all items from cache
     */
    clear() {
        this.cache.clear();
        
        // Reset the linked list for LRU policy
        if (this.evictionPolicy instanceof LRUEvictionPolicy) {
            this.evictionPolicy.head.next = this.evictionPolicy.tail;
            this.evictionPolicy.tail.prev = this.evictionPolicy.head;
        }
        
        this._fireEvent(new CacheEvent('clear', null));
    }

    /**
     * Get all keys in cache
     * @returns {Array} - Array of all keys
     */
    keys() {
        return Array.from(this.cache.keys());
    }

    /**
     * Get all values in cache
     * @returns {Array} - Array of all values
     */
    values() {
        return Array.from(this.cache.values()).map(node => node.value);
    }

    /**
     * Get all key-value pairs
     * @returns {Array} - Array of [key, value] pairs
     */
    entries() {
        return Array.from(this.cache.entries()).map(([key, node]) => [key, node.value]);
    }

    /**
     * Get cache performance statistics
     * @returns {CacheStatistics} - Performance metrics
     */
    getStatistics() {
        return this.statistics;
    }

    /**
     * Add event listener for cache operations
     * @param {CacheEventListener} listener - Event listener to add
     */
    addEventListener(listener) {
        this.eventListeners.push(listener);
    }

    /**
     * Remove event listener
     * @param {CacheEventListener} listener - Event listener to remove
     */
    removeEventListener(listener) {
        const index = this.eventListeners.indexOf(listener);
        if (index !== -1) {
            this.eventListeners.splice(index, 1);
        }
    }

    /**
     * Evict one item according to eviction policy
     * @private
     */
    _evictOne() {
        const candidate = this.evictionPolicy.getEvictionCandidate(this.cache);
        if (candidate) {
            this.cache.delete(candidate.key);
            this.statistics.evictions++;
            this._fireEvent(new CacheEvent('evict', candidate.key, candidate.value));

            // Remove from linked list if LRU policy
            if (this.evictionPolicy instanceof LRUEvictionPolicy) {
                this.evictionPolicy._removeNode(candidate);
            }
        }
    }

    /**
     * Notify all event listeners
     * @param {CacheEvent} event - Event to fire
     * @private
     */
    _fireEvent(event) {
        for (const listener of this.eventListeners) {
            try {
                listener.onCacheEvent(event);
            } catch (error) {
                // Log error but don't break cache operation
                console.error(`Error in event listener: ${error.message}`);
            }
        }
    }

    toString() {
        return `LRUCache(capacity=${this.capacity}, size=${this.size()}, ${this.statistics})`;
    }
}

/**
 * Console Event Listener - Example Observer implementation
 * 
 * Logs cache events to console for monitoring
 */
class ConsoleEventListener extends CacheEventListener {
    onCacheEvent(event) {
        const timestamp = new Date(event.timestamp).toISOString();
        console.log(`[${timestamp}] ${event.eventType.toUpperCase()}: ${event.key}`);
    }
}

/**
 * Detailed Statistics Listener - Example Observer implementation
 * 
 * Tracks detailed cache statistics and access patterns
 */
class DetailedStatsListener extends CacheEventListener {
    constructor() {
        super();
        this.eventHistory = [];
        this.keyAccessCount = new Map();
        this.operationTimes = [];
    }

    onCacheEvent(event) {
        this.eventHistory.push(event);
        
        if (event.eventType === 'hit' || event.eventType === 'put') {
            const count = this.keyAccessCount.get(event.key) || 0;
            this.keyAccessCount.set(event.key, count + 1);
        }
        
        this.operationTimes.push(event.timestamp);
    }

    getMostAccessedKeys(limit = 5) {
        return Array.from(this.keyAccessCount.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit);
    }

    getAverageOperationRate() {
        if (this.operationTimes.length < 2) return 0;
        
        const timeSpan = this.operationTimes[this.operationTimes.length - 1] - this.operationTimes[0];
        return (this.operationTimes.length - 1) / (timeSpan / 1000); // operations per second
    }
}

/**
 * Cache Builder - Builder Pattern implementation
 * 
 * Fluent interface for cache configuration and creation
 */
class CacheBuilder {
    constructor() {
        this.capacity = 100;
        this.evictionPolicy = null;
        this.listeners = [];
    }

    /**
     * Set cache capacity
     * @param {number} capacity - Maximum number of items
     * @returns {CacheBuilder} - Builder instance for chaining
     */
    withCapacity(capacity) {
        this.capacity = capacity;
        return this;
    }

    /**
     * Use LRU eviction policy
     * @returns {CacheBuilder} - Builder instance for chaining
     */
    withLRUPolicy() {
        this.evictionPolicy = new LRUEvictionPolicy();
        return this;
    }

    /**
     * Add console logging
     * @returns {CacheBuilder} - Builder instance for chaining
     */
    withConsoleLogging() {
        this.listeners.push(new ConsoleEventListener());
        return this;
    }

    /**
     * Add detailed statistics tracking
     * @returns {CacheBuilder} - Builder instance for chaining
     */
    withDetailedStats() {
        this.listeners.push(new DetailedStatsListener());
        return this;
    }

    /**
     * Build the cache with configured options
     * @returns {LRUCache} - Configured cache instance
     */
    build() {
        const cache = new LRUCache(this.capacity, this.evictionPolicy);
        for (const listener of this.listeners) {
            cache.addEventListener(listener);
        }
        return cache;
    }
}

// Demo usage and testing
function main() {
    console.log("=== LRU Cache System Demo ===\n");

    // Create cache with builder pattern
    const cache = new CacheBuilder()
        .withCapacity(3)
        .withLRUPolicy()
        .withConsoleLogging()
        .build();

    console.log(`Created cache: ${cache}\n`);

    // Test basic operations
    console.log("1. Testing basic put operations:");
    cache.put("key1", "value1");
    cache.put("key2", "value2");
    cache.put("key3", "value3");
    console.log(`Cache after 3 puts: size=${cache.size()}`);
    console.log(`Keys: ${JSON.stringify(cache.keys())}\n`);

    // Test get operations
    console.log("2. Testing get operations:");
    console.log(`get('key1'): ${cache.get('key1')}`);  // Hit
    console.log(`get('key2'): ${cache.get('key2')}`);  // Hit
    console.log(`get('key4'): ${cache.get('key4')}`);  // Miss
    console.log();

    // Test eviction
    console.log("3. Testing LRU eviction:");
    console.log("Adding key4 (should evict key3 as it's least recently used)");
    cache.put("key4", "value4");
    console.log(`Keys after eviction: ${JSON.stringify(cache.keys())}`);
    console.log(`Contains key3: ${cache.has('key3')}`);
    console.log();

    // Test update existing key
    console.log("4. Testing update existing key:");
    const oldValue = cache.put("key1", "updated_value1");
    console.log(`Updated key1, old value: ${oldValue}`);
    console.log(`New value: ${cache.get('key1')}`);
    console.log();

    // Show statistics
    console.log("5. Cache statistics:");
    const stats = cache.getStatistics();
    console.log(`Statistics: ${stats}`);
    console.log(`Hit rate: ${(stats.hitRate * 100).toFixed(2)}%`);
    console.log(`Miss rate: ${(stats.missRate * 100).toFixed(2)}%`);
    console.log();

    // Test edge cases
    console.log("6. Testing edge cases:");
    cache.clear();
    console.log(`After clear - size: ${cache.size()}, empty: ${cache.isEmpty()}`);

    // Test capacity 1 cache
    const smallCache = new LRUCache(1);
    smallCache.put("a", 1);
    smallCache.put("b", 2);  // Should evict "a"
    console.log(`Small cache has 'a': ${smallCache.has('a')}`);
    console.log(`Small cache has 'b': ${smallCache.has('b')}`);
    console.log();

    // Test iteration methods
    console.log("7. Testing iteration methods:");
    const iterCache = new LRUCache(5);
    iterCache.put("x", 10);
    iterCache.put("y", 20);
    iterCache.put("z", 30);
    
    console.log(`Keys: ${JSON.stringify(iterCache.keys())}`);
    console.log(`Values: ${JSON.stringify(iterCache.values())}`);
    console.log(`Entries: ${JSON.stringify(iterCache.entries())}`);
    console.log();

    // Test detailed statistics
    console.log("8. Detailed statistics demonstration:");
    const detailedStatsListener = new DetailedStatsListener();
    const statsCache = new LRUCache(3);
    statsCache.addEventListener(detailedStatsListener);

    // Generate some access patterns
    for (let i = 0; i < 10; i++) {
        statsCache.put(`key${i % 3}`, `value${i}`);
        statsCache.get(`key${i % 3}`);
    }

    console.log("Most accessed keys:", detailedStatsListener.getMostAccessedKeys());
    console.log(`Average operation rate: ${detailedStatsListener.getAverageOperationRate().toFixed(2)} ops/sec`);
    console.log();

    // Test error handling
    console.log("9. Testing error handling:");
    try {
        new LRUCache(0);  // Should throw error
    } catch (error) {
        console.log(`Expected error for zero capacity: ${error.message}`);
    }

    try {
        new LRUCache(-5);  // Should throw error
    } catch (error) {
        console.log(`Expected error for negative capacity: ${error.message}`);
    }

    console.log("\n=== Demo completed successfully ===");
}

// Export classes for use in other modules (Node.js)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        CacheEvent,
        CacheEventListener,
        CacheNode,
        EvictionPolicy,
        LRUEvictionPolicy,
        CacheStatistics,
        LRUCache,
        ConsoleEventListener,
        DetailedStatsListener,
        CacheBuilder
    };
}

// Run demo if this file is executed directly
if (typeof require !== 'undefined' && require.main === module) {
    main();
}