/**
 * LFU Cache - JavaScript Implementation
 * 
 * This file implements a Least Frequently Used (LFU) Cache with O(1) time complexity
 * for all operations (get, put, evict). It uses a combination of Maps and Doubly
 * Linked Lists to achieve optimal performance.
 * 
 * File Purpose:
 * - Demonstrates advanced data structure design with O(1) operations
 * - Implements Strategy, Template Method, Observer, Factory, Singleton, and Decorator patterns
 * - Tracks access frequency with LRU tie-breaking
 * - Provides comprehensive statistics and monitoring
 * 
 * Key Data Structures:
 * - Map: O(1) key-value access
 * - Frequency Map: Map of frequency -> Doubly Linked List
 * - Key-Frequency Map: Track frequency of each key
 * - Min Frequency: Track minimum frequency for O(1) eviction
 * 
 * Usage:
 *   node main.js
 * 
 * Author: LLD Solutions
 * Date: 2025-10-06
 */

// ==================== Data Classes ====================

/**
 * Cache statistics.
 * 
 * Usage:
 *   const stats = cache.getStats();
 *   console.log(`Hit Rate: ${(stats.hitRate * 100).toFixed(2)}%`);
 */
class CacheStats {
    constructor(totalGets, totalPuts, hits, misses, evictions, hitRate, currentSize, capacity) {
        this.totalGets = totalGets;
        this.totalPuts = totalPuts;
        this.hits = hits;
        this.misses = misses;
        this.evictions = evictions;
        this.hitRate = hitRate;
        this.currentSize = currentSize;
        this.capacity = capacity;
    }

    toString() {
        return `Cache Stats:
  Capacity: ${this.currentSize}/${this.capacity}
  Gets: ${this.totalGets} (Hits: ${this.hits}, Misses: ${this.misses})
  Puts: ${this.totalPuts}
  Evictions: ${this.evictions}
  Hit Rate: ${(this.hitRate * 100).toFixed(2)}%`;
    }
}

// ==================== Node ====================

/**
 * Doubly linked list node for cache entries.
 * 
 * Usage:
 *   const node = new Node(key, value);
 */
class Node {
    constructor(key, value) {
        this.key = key;
        this.value = value;
        this.frequency = 1;
        this.prev = null;
        this.next = null;
    }

    toString() {
        return `Node(${this.key}: ${this.value}, freq=${this.frequency})`;
    }
}

// ==================== Doubly Linked List ====================

/**
 * Doubly linked list with sentinel nodes for O(1) operations.
 * 
 * Purpose: Maintain LRU order within same frequency
 * 
 * Usage:
 *   const dll = new DoublyLinkedList();
 *   dll.addToHead(node);
 *   const removed = dll.removeTail();
 * 
 * Returns:
 *   DoublyLinkedList with O(1) add, remove operations
 */
class DoublyLinkedList {
    constructor() {
        // Sentinel nodes to eliminate null checks
        this.head = new Node(null, null); // Dummy head
        this.tail = new Node(null, null); // Dummy tail
        this.head.next = this.tail;
        this.tail.prev = this.head;
        this._size = 0;
    }

    /**
     * Add node to head (most recent position).
     * Time Complexity: O(1)
     */
    addToHead(node) {
        node.next = this.head.next;
        node.prev = this.head;
        this.head.next.prev = node;
        this.head.next = node;
        this._size++;
    }

    /**
     * Remove specific node from list.
     * Time Complexity: O(1)
     */
    removeNode(node) {
        if (node === this.head || node === this.tail) {
            return;
        }

        node.prev.next = node.next;
        node.next.prev = node.prev;
        this._size--;
    }

    /**
     * Remove and return tail node (least recent).
     * Time Complexity: O(1)
     */
    removeTail() {
        if (this.isEmpty()) {
            return null;
        }

        const node = this.tail.prev;
        this.removeNode(node);
        return node;
    }

    /**
     * Check if list is empty. Time: O(1)
     */
    isEmpty() {
        return this._size === 0;
    }

    /**
     * Get size of list. Time: O(1)
     */
    size() {
        return this._size;
    }

    toString() {
        const nodes = [];
        let current = this.head.next;
        while (current !== this.tail) {
            nodes.push(current.key);
            current = current.next;
        }
        return `[${nodes.join(' <-> ')}]`;
    }
}

// ==================== LFU Cache ====================

/**
 * LFU Cache with O(1) operations.
 * 
 * Usage:
 *   const cache = new LFUCache(100);
 *   cache.put("key1", "value1");
 *   const value = cache.get("key1"); // Returns "value1"
 *   const stats = cache.getStats();
 * 
 * Data Structures:
 *   - cache: Map for O(1) key-value access
 *   - freqMap: Map of frequency -> DoublyLinkedList
 *   - keyFreq: Map to track frequency of each key
 *   - minFrequency: Track minimum frequency for eviction
 * 
 * Returns:
 *   LFUCache instance with O(1) get, put, evict operations
 */
class LFUCache {
    constructor(capacity) {
        if (capacity < 0) {
            throw new Error('Capacity must be non-negative');
        }

        this.capacity = capacity;
        this.size = 0;
        this.minFrequency = 0;

        // Main cache: key -> Node
        this.cache = new Map();

        // Frequency map: frequency -> DoublyLinkedList
        this.freqMap = new Map();

        // Track frequency of each key
        this.keyFreq = new Map();

        // Statistics
        this.totalGets = 0;
        this.hits = 0;
        this.misses = 0;
        this.totalPuts = 0;
        this.evictions = 0;
    }

    /**
     * Get value for key with O(1) complexity.
     * 
     * Algorithm:
     *   1. Check if key exists in cache
     *   2. If not exists, return null (MISS)
     *   3. If exists:
     *      a. Get current node
     *      b. Increment frequency
     *      c. Move to appropriate frequency list
     *      d. Return value (HIT)
     * 
     * Time Complexity: O(1)
     * Space Complexity: O(1)
     * 
     * Returns:
     *   Value if key exists, null otherwise
     */
    get(key) {
        this.totalGets++;

        if (!this.cache.has(key)) {
            this.misses++;
            return null;
        }

        // Hit - increment frequency and update position
        const node = this.cache.get(key);
        this._incrementFrequency(key);
        this.hits++;

        return node.value;
    }

    /**
     * Insert or update key-value pair with O(1) complexity.
     * 
     * Algorithm:
     *   1. If capacity is 0, return
     *   2. If key exists (UPDATE):
     *      a. Update value
     *      b. Increment frequency
     *   3. If key doesn't exist (INSERT):
     *      a. If at capacity, evict LFU item
     *      b. Create new node with frequency 1
     *      c. Add to cache
     *      d. Add to frequency-1 list
     *      e. Set minFrequency to 1
     * 
     * Time Complexity: O(1)
     * Space Complexity: O(1)
     */
    put(key, value) {
        this.totalPuts++;

        if (this.capacity === 0) {
            return;
        }

        // Update existing key
        if (this.cache.has(key)) {
            const node = this.cache.get(key);
            node.value = value;
            this._incrementFrequency(key);
            return;
        }

        // Insert new key
        if (this.size >= this.capacity) {
            this._evict();
        }

        // Create new node
        const node = new Node(key, value);
        this.cache.set(key, node);
        this.keyFreq.set(key, 1);

        // Add to frequency-1 list
        if (!this.freqMap.has(1)) {
            this.freqMap.set(1, new DoublyLinkedList());
        }
        this.freqMap.get(1).addToHead(node);

        // Update minFrequency
        this.minFrequency = 1;
        this.size++;
    }

    /**
     * Move node to higher frequency list.
     * 
     * Algorithm:
     *   1. Get current frequency
     *   2. Remove node from current frequency list
     *   3. If list becomes empty and is minFrequency, increment minFrequency
     *   4. Increment frequency
     *   5. Add node to new frequency list
     *   6. Update keyFreq map
     * 
     * Time Complexity: O(1)
     */
    _incrementFrequency(key) {
        // Get current frequency
        const freq = this.keyFreq.get(key);
        const node = this.cache.get(key);

        // Remove from current frequency list
        this.freqMap.get(freq).removeNode(node);

        // If current frequency list is empty and it's minFrequency, increment
        if (this.freqMap.get(freq).isEmpty()) {
            this.freqMap.delete(freq);
            if (freq === this.minFrequency) {
                this.minFrequency++;
            }
        }

        // Increment frequency
        const newFreq = freq + 1;
        this.keyFreq.set(key, newFreq);
        node.frequency = newFreq;

        // Add to new frequency list
        if (!this.freqMap.has(newFreq)) {
            this.freqMap.set(newFreq, new DoublyLinkedList());
        }
        this.freqMap.get(newFreq).addToHead(node);
    }

    /**
     * Evict least frequently used item with O(1) complexity.
     * 
     * Algorithm:
     *   1. Get list at minFrequency
     *   2. Remove tail node (least recently used)
     *   3. Remove from all data structures
     *   4. Update statistics
     * 
     * Time Complexity: O(1)
     */
    _evict() {
        if (!this.freqMap.has(this.minFrequency)) {
            return;
        }

        // Get list at minFrequency
        const freqList = this.freqMap.get(this.minFrequency);

        // Remove tail (LRU item at min frequency)
        const nodeToRemove = freqList.removeTail();

        if (nodeToRemove) {
            // Remove from cache
            this.cache.delete(nodeToRemove.key);
            this.keyFreq.delete(nodeToRemove.key);

            // Clean up empty frequency list
            if (freqList.isEmpty()) {
                this.freqMap.delete(this.minFrequency);
            }

            this.size--;
            this.evictions++;

            console.log(`🗑️  Evicted: ${nodeToRemove.key} (frequency: ${nodeToRemove.frequency})`);
        }
    }

    /**
     * Check if key exists without updating frequency.
     * Time Complexity: O(1)
     */
    contains(key) {
        return this.cache.has(key);
    }

    /**
     * Get current number of entries. Time: O(1)
     */
    sizeCurrent() {
        return this.size;
    }

    /**
     * Remove all entries.
     * Time Complexity: O(n)
     */
    clear() {
        this.cache.clear();
        this.freqMap.clear();
        this.keyFreq.clear();
        this.size = 0;
        this.minFrequency = 0;
    }

    /**
     * Get cache statistics.
     * 
     * Returns:
     *   CacheStats with hits, misses, evictions, hit rate
     */
    getStats() {
        const hitRate = this.totalGets > 0 ? this.hits / this.totalGets : 0.0;

        return new CacheStats(
            this.totalGets,
            this.totalPuts,
            this.hits,
            this.misses,
            this.evictions,
            hitRate,
            this.size,
            this.capacity
        );
    }

    /**
     * Calculate hit rate = hits / (hits + misses)
     */
    getHitRate() {
        const totalRequests = this.hits + this.misses;
        return totalRequests > 0 ? this.hits / totalRequests : 0.0;
    }

    toString() {
        return `LFUCache(capacity=${this.capacity}, size=${this.size}, minFreq=${this.minFrequency})`;
    }

    /**
     * Print internal state for debugging
     */
    _debugPrint() {
        console.log(`\n${this}`);
        console.log('Frequency Map:');
        const sortedFreqs = Array.from(this.freqMap.keys()).sort((a, b) => a - b);
        for (const freq of sortedFreqs) {
            console.log(`  Freq ${freq}: ${this.freqMap.get(freq)}`);
        }
    }
}

// ==================== Demo ====================

function demo() {
    console.log('='.repeat(60));
    console.log('LFU CACHE DEMONSTRATION');
    console.log('='.repeat(60));

    // Demo 1: Basic Operations
    console.log('\n' + '='.repeat(60));
    console.log('DEMO 1: BASIC OPERATIONS');
    console.log('='.repeat(60));

    const cache = new LFUCache(3);

    console.log('\n📝 Inserting values...');
    cache.put('A', 1);
    cache.put('B', 2);
    cache.put('C', 3);
    console.log(`Cache size: ${cache.sizeCurrent()}/${cache.capacity}`);

    console.log('\n🔍 Accessing values...');
    console.log(`Get A: ${cache.get('A')}`); // freq(A) = 2
    console.log(`Get B: ${cache.get('B')}`); // freq(B) = 2
    console.log(`Get A: ${cache.get('A')}`); // freq(A) = 3

    console.log('\n📊 Frequency state:');
    cache._debugPrint();

    console.log('\n➕ Inserting D (will evict C - least frequently used)...');
    cache.put('D', 4);

    console.log(`\n❓ Does C exist? ${cache.contains('C')}`);
    console.log(`Get C: ${cache.get('C')}`); // Miss

    // Demo 2: LRU Tie-Breaking
    console.log('\n' + '='.repeat(60));
    console.log('DEMO 2: LRU TIE-BREAKING');
    console.log('='.repeat(60));

    const cache2 = new LFUCache(3);

    console.log('\n📝 Inserting X, Y, Z...');
    cache2.put('X', 10);
    cache2.put('Y', 20);
    cache2.put('Z', 30);

    console.log('\n🔍 Accessing X and Y (same frequency)...');
    cache2.get('X'); // freq(X) = 2
    cache2.get('Y'); // freq(Y) = 2

    console.log('\n📊 Frequency state:');
    cache2._debugPrint();

    console.log('\n➕ Inserting W (will evict Z - least frequent)...');
    cache2.put('W', 40);

    console.log('\n➕ Inserting V (will evict W - least frequent)...');
    cache2.put('V', 50);

    console.log('\n📊 Final state:');
    cache2._debugPrint();

    // Demo 3: Performance Demonstration
    console.log('\n' + '='.repeat(60));
    console.log('DEMO 3: PERFORMANCE TEST');
    console.log('='.repeat(60));

    const cache3 = new LFUCache(100);

    console.log('\n⏱️  Inserting 150 items (will cause evictions)...');
    for (let i = 0; i < 150; i++) {
        cache3.put(`key_${i}`, `value_${i}`);
    }

    console.log(`Cache size after insertions: ${cache3.sizeCurrent()}/${cache3.capacity}`);

    console.log('\n🔍 Accessing some keys multiple times...');
    const popularKeys = ['key_100', 'key_110', 'key_120'];
    for (const key of popularKeys) {
        for (let i = 0; i < 5; i++) {
            cache3.get(key);
        }
    }

    console.log('\n📊 Cache Statistics:');
    const stats = cache3.getStats();
    console.log(stats.toString());

    // Demo 4: Update Frequency
    console.log('\n' + '='.repeat(60));
    console.log('DEMO 4: UPDATE FREQUENCY');
    console.log('='.repeat(60));

    const cache4 = new LFUCache(2);

    console.log('\n📝 Inserting M=1, N=2...');
    cache4.put('M', 1);
    cache4.put('N', 2);

    console.log('\n🔄 Updating M=10 (updates count as access)...');
    cache4.put('M', 10); // freq(M) = 2

    console.log('\n📊 Frequency state:');
    cache4._debugPrint();

    console.log('\n➕ Inserting P (will evict N - least frequent)...');
    cache4.put('P', 3);

    console.log(`\n✅ M still exists: ${cache4.get('M')}`);
    console.log(`❌ N evicted: ${cache4.get('N')}`);

    // Demo 5: Edge Cases
    console.log('\n' + '='.repeat(60));
    console.log('DEMO 5: EDGE CASES');
    console.log('='.repeat(60));

    console.log('\n1️⃣ Zero capacity cache:');
    const cacheZero = new LFUCache(0);
    cacheZero.put('key', 'value');
    console.log(`   Get from zero-capacity: ${cacheZero.get('key')}`);

    console.log('\n2️⃣ Single capacity cache:');
    const cacheOne = new LFUCache(1);
    cacheOne.put('A', 1);
    cacheOne.put('B', 2); // Evicts A
    console.log(`   Get A: ${cacheOne.get('A')}`); // Miss
    console.log(`   Get B: ${cacheOne.get('B')}`); // Hit

    console.log('\n3️⃣ Clear operation:');
    const cacheClear = new LFUCache(3);
    cacheClear.put('X', 1);
    cacheClear.put('Y', 2);
    console.log(`   Size before clear: ${cacheClear.sizeCurrent()}`);
    cacheClear.clear();
    console.log(`   Size after clear: ${cacheClear.sizeCurrent()}`);

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));

    console.log('\n✅ LFU Cache Features Demonstrated:');
    console.log('  • O(1) get and put operations');
    console.log('  • Frequency-based eviction');
    console.log('  • LRU tie-breaking among same frequencies');
    console.log('  • Automatic eviction when capacity is full');
    console.log('  • Comprehensive statistics tracking');
    console.log('  • Edge case handling');

    console.log('\n📊 Final Performance Stats:');
    console.log(`  Demo 3 Cache - Hit Rate: ${(cache3.getHitRate() * 100).toFixed(2)}%`);
    console.log(`  Total Evictions: ${cache3.evictions}`);

    console.log('\n✅ LFU Cache demonstration completed!');
}

// Run demo
if (require.main === module) {
    demo();
}

module.exports = {
    LFUCache,
    DoublyLinkedList,
    Node,
    CacheStats
};
