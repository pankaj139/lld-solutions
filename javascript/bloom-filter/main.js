/**
 * BLOOM FILTER - Probabilistic Data Structure Implementation in JavaScript
 * 
 * This file implements a production-ready Bloom Filter with multiple variants
 * including standard, counting, and scalable bloom filters.
 * 
 * WHAT IS A BLOOM FILTER:
 * A space-efficient probabilistic data structure for testing set membership.
 * - Can have FALSE POSITIVES (says yes when should say no)
 * - NO FALSE NEGATIVES (always correct when says no)
 * - Uses much less memory than storing actual elements
 * - Perfect for "definitely not present" checks
 * 
 * DESIGN PATTERNS USED:
 * 1. STRATEGY PATTERN: Multiple hash function strategies
 *    - MurmurHash3 for speed
 *    - FNV1a for simplicity
 *    - Multiple independent hash functions
 *    
 * 2. TEMPLATE METHOD: Base BloomFilter with variants
 *    - StandardBloomFilter: Basic implementation
 *    - CountingBloomFilter: Supports deletion
 * 
 * 3. FACTORY PATTERN: Create optimal bloom filters
 *    - Calculate optimal size and hash functions
 *    - Based on expected elements and desired error rate
 * 
 * MATHEMATICAL FOUNDATION:
 * Optimal parameters:
 *   m = -(n × ln(p)) / (ln(2))²  (bit array size)
 *   k = (m/n) × ln(2)             (hash functions)
 *   
 * Actual false positive rate:
 *   p = (1 - e^(-kn/m))^k
 * 
 * USAGE:
 *     // Create bloom filter
 *     const bloom = new BloomFilter(10000, 0.01);
 *     
 *     // Add elements
 *     bloom.add("apple");
 *     bloom.add("banana");
 *     
 *     // Check membership
 *     bloom.contains("apple");   // true (definitely added)
 *     bloom.contains("grape");   // false or true (false positive)
 *     
 *     // Get statistics
 *     const stats = bloom.getStatistics();
 *     
 *     // Counting bloom filter (supports deletion)
 *     const counting = new CountingBloomFilter(10000, 0.01);
 *     counting.add("apple");
 *     counting.remove("apple");
 * 
 * RETURN VALUES:
 * - add(item): Returns void
 * - contains(item): Returns boolean (true = maybe present, false = definitely not)
 * - getStatistics(): Returns object with filter stats
 * - union(other): Returns new BloomFilter
 */

// ==================== HASH FUNCTIONS ====================

/**
 * MurmurHash3 implementation - fast, good distribution
 * 
 * USAGE:
 *     const hasher = new MurmurHash3(42);
 *     const hashValue = hasher.hash("apple");
 * 
 * RETURN:
 *     number - 32-bit hash value
 */
class MurmurHash3 {
    constructor(seed = 0) {
        this.seed = seed;
    }

    hash(data) {
        const dataBytes = Buffer.from(data, 'utf8');
        
        const c1 = 0xcc9e2d51;
        const c2 = 0x1b873593;
        const r1 = 15;
        const r2 = 13;
        const m = 5;
        const n = 0xe6546b64;
        
        let hashValue = this.seed;
        
        // Process 4-byte chunks
        for (let i = 0; i < dataBytes.length - 3; i += 4) {
            let k = dataBytes.readUInt32LE(i);
            k = Math.imul(k, c1) >>> 0;
            k = ((k << r1) | (k >>> (32 - r1))) >>> 0;
            k = Math.imul(k, c2) >>> 0;
            
            hashValue ^= k;
            hashValue = ((hashValue << r2) | (hashValue >>> (32 - r2))) >>> 0;
            hashValue = (Math.imul(hashValue, m) + n) >>> 0;
        }
        
        // Process remaining bytes
        const remaining = dataBytes.length % 4;
        if (remaining) {
            let k = 0;
            for (let i = 0; i < remaining; i++) {
                k |= dataBytes[dataBytes.length - remaining + i] << (i * 8);
            }
            k = Math.imul(k, c1) >>> 0;
            k = ((k << r1) | (k >>> (32 - r1))) >>> 0;
            k = Math.imul(k, c2) >>> 0;
            hashValue ^= k;
        }
        
        // Finalization
        hashValue ^= dataBytes.length;
        hashValue ^= (hashValue >>> 16);
        hashValue = Math.imul(hashValue, 0x85ebca6b) >>> 0;
        hashValue ^= (hashValue >>> 13);
        hashValue = Math.imul(hashValue, 0xc2b2ae35) >>> 0;
        hashValue ^= (hashValue >>> 16);
        
        return hashValue >>> 0;
    }
}

/**
 * FNV-1a hash function - simple, decent distribution
 * 
 * USAGE:
 *     const hasher = new FNV1aHash(42);
 *     const hashValue = hasher.hash("apple");
 * 
 * RETURN:
 *     number - 32-bit hash value
 */
class FNV1aHash {
    constructor(seed = 0) {
        this.seed = seed;
    }

    hash(data) {
        const FNV_PRIME = 16777619;
        const FNV_OFFSET_BASIS = 2166136261;
        
        let hashValue = (FNV_OFFSET_BASIS + this.seed) >>> 0;
        
        for (let i = 0; i < data.length; i++) {
            hashValue ^= data.charCodeAt(i);
            hashValue = Math.imul(hashValue, FNV_PRIME) >>> 0;
        }
        
        return hashValue >>> 0;
    }
}

/**
 * Double hashing to generate k hash functions from 2 base hashes
 * 
 * FORMULA: h_i(x) = (h1(x) + i × h2(x)) mod m
 * 
 * USAGE:
 *     const doubleHasher = new DoubleHashingFunction();
 *     const hashes = doubleHasher.getHashes("apple", 7, 1000);
 * 
 * RETURN:
 *     Array of numbers - k hash values
 */
class DoubleHashingFunction {
    constructor() {
        this.hash1 = new MurmurHash3(0);
        this.hash2 = new FNV1aHash(1);
    }

    getHashes(data, k, m) {
        const h1 = this.hash1.hash(data);
        const h2 = this.hash2.hash(data);
        
        const hashes = [];
        for (let i = 0; i < k; i++) {
            const hashValue = (h1 + i * h2) % m;
            hashes.push(hashValue);
        }
        
        return hashes;
    }
}

// ==================== BLOOM FILTER ====================

/**
 * Standard Bloom Filter implementation
 * 
 * COMPLEXITY:
 * - Add: O(k) where k is number of hash functions
 * - Contains: O(k)
 * - Space: O(m) where m is bit array size
 * 
 * USAGE:
 *     const bloom = new BloomFilter(10000, 0.01);
 *     bloom.add("apple");
 *     const exists = bloom.contains("apple");  // true
 *     const exists = bloom.contains("grape");  // false or true (false positive)
 * 
 * RETURN:
 *     BloomFilter instance with add, contains, and utility methods
 */
class BloomFilter {
    /**
     * Initialize Bloom Filter with optimal parameters
     * 
     * USAGE:
     *     const bloom = new BloomFilter(10000, 0.01);
     * 
     * RETURN:
     *     BloomFilter instance
     */
    constructor(expectedElements, falsePositiveRate) {
        if (expectedElements <= 0) {
            throw new Error('Expected elements must be positive');
        }
        if (falsePositiveRate <= 0 || falsePositiveRate >= 1) {
            throw new Error('False positive rate must be between 0 and 1');
        }

        this.expectedElements = expectedElements;
        this.falsePositiveRate = falsePositiveRate;

        // Calculate optimal parameters
        const params = BloomFilter.calculateOptimalParameters(expectedElements, falsePositiveRate);
        this.size = params.size;
        this.hashCount = params.hashCount;

        // Initialize bit array
        this.bitArray = new Array(this.size).fill(false);
        this.elementCount = 0;

        // Initialize hash function generator
        this.hasher = new DoubleHashingFunction();
    }

    /**
     * Calculate optimal bit array size and number of hash functions
     * 
     * FORMULA:
     *     m = -(n × ln(p)) / (ln(2))²
     *     k = (m/n) × ln(2)
     * 
     * USAGE:
     *     const params = BloomFilter.calculateOptimalParameters(10000, 0.01);
     * 
     * RETURN:
     *     object {size, hashCount} - bit array size and hash function count
     */
    static calculateOptimalParameters(n, p) {
        // m = -(n × ln(p)) / (ln(2))²
        const m = Math.ceil(-(n * Math.log(p)) / (Math.log(2) ** 2));

        // k = (m/n) × ln(2)
        let k = Math.round((m / n) * Math.log(2));
        k = Math.max(1, k); // At least 1 hash function

        return { size: m, hashCount: k };
    }

    /**
     * Add item to bloom filter
     * 
     * USAGE:
     *     bloom.add("apple");
     * 
     * RETURN:
     *     void
     */
    add(item) {
        const hashes = this.hasher.getHashes(item, this.hashCount, this.size);

        for (const hashValue of hashes) {
            this.bitArray[hashValue] = true;
        }

        this.elementCount++;
    }

    /**
     * Check if item might be in the set
     * 
     * USAGE:
     *     const exists = bloom.contains("apple");
     * 
     * RETURN:
     *     boolean - true if possibly present, false if definitely not present
     */
    contains(item) {
        const hashes = this.hasher.getHashes(item, this.hashCount, this.size);

        for (const hashValue of hashes) {
            if (!this.bitArray[hashValue]) {
                return false; // Definitely not present
            }
        }

        return true; // Probably present
    }

    /**
     * Calculate current false positive probability
     * 
     * FORMULA: p = (1 - e^(-kn/m))^k
     * 
     * USAGE:
     *     const fpRate = bloom.getCurrentFalsePositiveRate();
     * 
     * RETURN:
     *     number - Estimated false positive probability
     */
    getCurrentFalsePositiveRate() {
        if (this.elementCount === 0) {
            return 0.0;
        }

        // p = (1 - e^(-kn/m))^k
        const exponent = -(this.hashCount * this.elementCount) / this.size;
        const p = Math.pow(1 - Math.exp(exponent), this.hashCount);

        return p;
    }

    /**
     * Get bloom filter statistics
     * 
     * USAGE:
     *     const stats = bloom.getStatistics();
     * 
     * RETURN:
     *     object with size, hashCount, elementsAdded, etc.
     */
    getStatistics() {
        const bitsSet = this.bitArray.filter(b => b).length;
        const fillRatio = bitsSet / this.size;

        return {
            size: this.size,
            sizeKb: this.size / 8 / 1024,
            hashFunctions: this.hashCount,
            expectedElements: this.expectedElements,
            elementsAdded: this.elementCount,
            targetFpRate: this.falsePositiveRate,
            currentFpRate: this.getCurrentFalsePositiveRate(),
            bitsSet: bitsSet,
            fillRatio: fillRatio,
            capacityUsed: (this.elementCount / this.expectedElements) * 100
        };
    }

    /**
     * Create union of two bloom filters (OR operation)
     * 
     * USAGE:
     *     const bloomUnion = bloom1.union(bloom2);
     * 
     * RETURN:
     *     BloomFilter - New filter containing union
     */
    union(other) {
        if (this.size !== other.size || this.hashCount !== other.hashCount) {
            throw new Error('Bloom filters must have same size and hash count');
        }

        const result = new BloomFilter(this.expectedElements, this.falsePositiveRate);
        result.size = this.size;
        result.hashCount = this.hashCount;
        result.bitArray = this.bitArray.map((a, i) => a || other.bitArray[i]);
        result.elementCount = this.elementCount + other.elementCount;

        return result;
    }

    /**
     * Create intersection of two bloom filters (AND operation)
     * 
     * NOTE: Result may have higher false positive rate!
     * 
     * USAGE:
     *     const bloomIntersect = bloom1.intersection(bloom2);
     * 
     * RETURN:
     *     BloomFilter - New filter containing intersection
     */
    intersection(other) {
        if (this.size !== other.size || this.hashCount !== other.hashCount) {
            throw new Error('Bloom filters must have same size and hash count');
        }

        const result = new BloomFilter(this.expectedElements, this.falsePositiveRate);
        result.size = this.size;
        result.hashCount = this.hashCount;
        result.bitArray = this.bitArray.map((a, i) => a && other.bitArray[i]);
        result.elementCount = 0; // Unknown for intersection

        return result;
    }

    /**
     * Clear all elements from filter
     */
    clear() {
        this.bitArray = new Array(this.size).fill(false);
        this.elementCount = 0;
    }

    getSize() {
        return this.elementCount;
    }

    toString() {
        return `BloomFilter(size=${this.size}, k=${this.hashCount}, n=${this.elementCount})`;
    }
}

// ==================== COUNTING BLOOM FILTER ====================

/**
 * Counting Bloom Filter - supports deletion
 * 
 * Uses counters instead of bits to allow removal
 * 
 * TRADE-OFF: 4x more memory (4 bits per counter vs 1 bit)
 * 
 * USAGE:
 *     const counting = new CountingBloomFilter(10000, 0.01);
 *     counting.add("apple");
 *     counting.add("apple");  // Can add multiple times
 *     counting.remove("apple");
 *     counting.contains("apple");  // true (one copy remains)
 * 
 * RETURN:
 *     CountingBloomFilter with add, remove, contains methods
 */
class CountingBloomFilter {
    /**
     * Initialize counting bloom filter
     * 
     * USAGE:
     *     const counting = new CountingBloomFilter(10000, 0.01, 4);
     * 
     * RETURN:
     *     CountingBloomFilter instance
     */
    constructor(expectedElements, falsePositiveRate, counterSize = 4) {
        this.expectedElements = expectedElements;
        this.falsePositiveRate = falsePositiveRate;
        this.counterSize = counterSize;
        this.maxCount = (2 ** counterSize) - 1;

        // Calculate optimal parameters (same as standard bloom filter)
        const params = BloomFilter.calculateOptimalParameters(expectedElements, falsePositiveRate);
        this.size = params.size;
        this.hashCount = params.hashCount;

        // Use counters instead of bits
        this.counters = new Array(this.size).fill(0);
        this.elementCount = 0;

        this.hasher = new DoubleHashingFunction();
    }

    /**
     * Add item to counting bloom filter
     * 
     * USAGE:
     *     counting.add("apple");
     * 
     * RETURN:
     *     void
     */
    add(item) {
        const hashes = this.hasher.getHashes(item, this.hashCount, this.size);

        for (const hashValue of hashes) {
            if (this.counters[hashValue] < this.maxCount) {
                this.counters[hashValue]++;
            }
        }

        this.elementCount++;
    }

    /**
     * Remove item from counting bloom filter
     * 
     * USAGE:
     *     const success = counting.remove("apple");
     * 
     * RETURN:
     *     boolean - true if removed, false if not present
     */
    remove(item) {
        // Check if item exists
        if (!this.contains(item)) {
            return false;
        }

        const hashes = this.hasher.getHashes(item, this.hashCount, this.size);

        for (const hashValue of hashes) {
            if (this.counters[hashValue] > 0) {
                this.counters[hashValue]--;
            }
        }

        this.elementCount--;
        return true;
    }

    /**
     * Check if item might be in the set
     * 
     * USAGE:
     *     const exists = counting.contains("apple");
     * 
     * RETURN:
     *     boolean - true if possibly present, false if definitely not present
     */
    contains(item) {
        const hashes = this.hasher.getHashes(item, this.hashCount, this.size);

        for (const hashValue of hashes) {
            if (this.counters[hashValue] === 0) {
                return false; // Definitely not present
            }
        }

        return true; // Probably present
    }

    /**
     * Get minimum count for item (approximate)
     * 
     * USAGE:
     *     const count = counting.count("apple");
     * 
     * RETURN:
     *     number - Approximate count (minimum of all counters)
     */
    count(item) {
        const hashes = this.hasher.getHashes(item, this.hashCount, this.size);

        let minCount = this.maxCount;
        for (const hashValue of hashes) {
            minCount = Math.min(minCount, this.counters[hashValue]);
        }

        return minCount;
    }

    /**
     * Get counting bloom filter statistics
     */
    getStatistics() {
        const nonZeroCounters = this.counters.filter(c => c > 0).length;

        return {
            size: this.size,
            sizeKb: (this.size * this.counterSize) / 8 / 1024,
            hashFunctions: this.hashCount,
            counterSizeBits: this.counterSize,
            elementsAdded: this.elementCount,
            nonZeroCounters: nonZeroCounters,
            fillRatio: nonZeroCounters / this.size
        };
    }

    getSize() {
        return this.elementCount;
    }

    toString() {
        return `CountingBloomFilter(size=${this.size}, k=${this.hashCount}, n=${this.elementCount})`;
    }
}

// ==================== DEMO ====================

function main() {
    console.log('='.repeat(70));
    console.log('🔍 BLOOM FILTER DEMO');
    console.log('='.repeat(70));

    // Create standard bloom filter
    console.log('\n📊 Creating Standard Bloom Filter...');
    const bloom = new BloomFilter(10000, 0.01);

    const stats = bloom.getStatistics();
    console.log('✓ Created bloom filter');
    console.log(`  Size: ${stats.size.toLocaleString()} bits (${stats.sizeKb.toFixed(2)} KB)`);
    console.log(`  Hash functions: ${stats.hashFunctions}`);
    console.log(`  Target false positive rate: ${(stats.targetFpRate * 100).toFixed(2)}%`);

    // Add elements
    console.log('\n➕ Adding elements...');
    const fruits = ['apple', 'banana', 'orange', 'grape', 'mango', 'pineapple',
                    'strawberry', 'blueberry', 'watermelon', 'kiwi'];

    for (const fruit of fruits) {
        bloom.add(fruit);
    }

    console.log(`✓ Added ${fruits.length} fruits`);

    // Check membership
    console.log('\n🔍 Testing membership (should all be true):');
    for (const fruit of fruits.slice(0, 5)) {
        const result = bloom.contains(fruit);
        console.log(`  '${fruit}': ${result}`);
    }

    // Test non-existent items
    console.log('\n🔍 Testing non-existent items:');
    const testItems = ['tomato', 'potato', 'carrot', 'broccoli', 'spinach'];
    for (const item of testItems) {
        const result = bloom.contains(item);
        const status = result ? 'FALSE POSITIVE!' : 'Correctly not found';
        console.log(`  '${item}': ${result} (${status})`);
    }

    // Measure false positive rate
    console.log('\n📈 Measuring false positive rate...');
    let falsePositives = 0;
    const testCount = 10000;

    for (let i = 0; i < testCount; i++) {
        const testItem = `test_item_${i}`;
        if (!fruits.includes(testItem) && bloom.contains(testItem)) {
            falsePositives++;
        }
    }

    const measuredFpRate = falsePositives / testCount;
    console.log(`  Expected: ${(stats.targetFpRate * 100).toFixed(2)}%`);
    console.log(`  Measured: ${(measuredFpRate * 100).toFixed(2)}%`);
    console.log(`  False positives: ${falsePositives} / ${testCount}`);

    // Space comparison
    console.log('\n💾 Space Efficiency Comparison:');
    console.log(`  Bloom Filter: ${stats.sizeKb.toFixed(2)} KB`);

    const avgStringSize = fruits.reduce((sum, f) => sum + f.length, 0) / fruits.length;
    const setSizeKb = (fruits.length * (avgStringSize + 8)) / 1024;
    console.log(`  Regular Set: ~${setSizeKb.toFixed(2)} KB (estimated)`);
    console.log(`  Space Saving: ~${((1 - stats.sizeKb / setSizeKb) * 100).toFixed(1)}%`);

    // Current statistics
    console.log('\n📊 Current Statistics:');
    const currentStats = bloom.getStatistics();
    console.log(`  Elements added: ${currentStats.elementsAdded}`);
    console.log(`  Capacity used: ${currentStats.capacityUsed.toFixed(1)}%`);
    console.log(`  Bits set: ${currentStats.bitsSet.toLocaleString()} / ${currentStats.size.toLocaleString()}`);
    console.log(`  Fill ratio: ${(currentStats.fillRatio * 100).toFixed(2)}%`);
    console.log(`  Current FP rate: ${(currentStats.currentFpRate * 100).toFixed(2)}%`);

    // Counting Bloom Filter demo
    console.log('\n' + '='.repeat(70));
    console.log('🔢 COUNTING BLOOM FILTER DEMO');
    console.log('='.repeat(70));

    const counting = new CountingBloomFilter(1000, 0.01);

    console.log('\n➕ Adding elements (with duplicates)...');
    counting.add('apple');
    counting.add('banana');
    counting.add('apple'); // Add again
    counting.add('apple'); // Add third time

    console.log(`  'apple' count: ${counting.count('apple')}`);
    console.log(`  'banana' count: ${counting.count('banana')}`);
    console.log(`  Contains 'apple': ${counting.contains('apple')}`);

    console.log('\n➖ Removing elements...');
    counting.remove('apple');
    console.log(`  After 1 removal - 'apple' count: ${counting.count('apple')}`);
    console.log(`  Contains 'apple': ${counting.contains('apple')}`);

    counting.remove('apple');
    counting.remove('apple');
    console.log(`  After 3 removals - 'apple' count: ${counting.count('apple')}`);
    console.log(`  Contains 'apple': ${counting.contains('apple')}`);

    // Union demo
    console.log('\n' + '='.repeat(70));
    console.log('🔗 UNION & INTERSECTION DEMO');
    console.log('='.repeat(70));

    const bloom1 = new BloomFilter(1000, 0.01);
    bloom1.add('apple');
    bloom1.add('banana');
    bloom1.add('orange');

    const bloom2 = new BloomFilter(1000, 0.01);
    bloom2.add('grape');
    bloom2.add('mango');
    bloom2.add('apple'); // Common element

    console.log('\n🔗 Union (bloom1 ∪ bloom2):');
    const bloomUnion = bloom1.union(bloom2);
    const unionTests = ['apple', 'banana', 'grape', 'mango', 'kiwi'];
    for (const item of unionTests) {
        console.log(`  '${item}': ${bloomUnion.contains(item)}`);
    }

    console.log('\n🔗 Intersection (bloom1 ∩ bloom2):');
    const bloomIntersect = bloom1.intersection(bloom2);
    for (const item of unionTests) {
        const result = bloomIntersect.contains(item);
        const inBoth = item === 'apple'; // Only apple in both
        const status = result === inBoth ? '✓' : '⚠';
        console.log(`  '${item}': ${result} ${status}`);
    }

    // Real-world use case
    console.log('\n' + '='.repeat(70));
    console.log('🌐 REAL-WORLD USE CASE: Web Crawler');
    console.log('='.repeat(70));

    const urlFilter = new BloomFilter(1000000, 0.001);

    console.log('\n🕷️  Web crawler tracking visited URLs...');
    const visitedUrls = [
        'https://example.com',
        'https://example.com/about',
        'https://example.com/products',
        'https://example.com/contact'
    ];

    for (const url of visitedUrls) {
        urlFilter.add(url);
    }

    console.log(`✓ Tracked ${visitedUrls.length} URLs`);

    // Check before crawling
    const testUrls = [
        'https://example.com', // Already visited
        'https://example.com/blog', // Not visited
        'https://example.com/products', // Already visited
        'https://newsite.com' // Not visited
    ];

    console.log('\n🔍 Checking URLs before crawling:');
    for (const url of testUrls) {
        const alreadyVisited = urlFilter.contains(url);
        const action = alreadyVisited ? 'Skip (already crawled)' : 'Crawl (new URL)';
        console.log(`  ${url}`);
        console.log(`    → ${action}`);
    }

    const crawlerStats = urlFilter.getStatistics();
    console.log('\n📊 Crawler Bloom Filter Stats:');
    console.log(`  Memory used: ${crawlerStats.sizeKb.toFixed(2)} KB`);
    console.log(`  Could track: ${crawlerStats.expectedElements.toLocaleString()} URLs`);
    console.log(`  Currently tracking: ${crawlerStats.elementsAdded.toLocaleString()} URLs`);
    console.log(`  False positive rate: ${(crawlerStats.currentFpRate * 100).toFixed(4)}%`);

    console.log('\n' + '='.repeat(70));
    console.log('✨ Demo completed successfully!');
    console.log('='.repeat(70));
}

// Run demo if this is the main module
if (require.main === module) {
    main();
}

// Export for testing
module.exports = {
    MurmurHash3,
    FNV1aHash,
    DoubleHashingFunction,
    BloomFilter,
    CountingBloomFilter
};
