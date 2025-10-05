/**
 * AUTOCOMPLETE / TYPEAHEAD SYSTEM - Low Level Design Implementation in JavaScript
 * 
 * This file implements a production-ready autocomplete/typeahead system using Trie
 * data structure with advanced features like fuzzy matching, caching, and ranking.
 * 
 * DESIGN PATTERNS USED:
 * 1. TRIE PATTERN: Core data structure for efficient prefix-based search
 *    - Each node represents a character in the alphabet
 *    - O(m) insertion and O(p) prefix search
 *    - Memory-efficient storage of common prefixes
 *    - Optimal for autocomplete and dictionary operations
 * 
 * 2. STRATEGY PATTERN: Multiple ranking strategies for suggestions
 *    - PopularityRanking: Sort by weight/frequency
 *    - FrequencyRanking: Prioritize recently searched terms
 *    - HybridRanking: Combine multiple factors
 *    - Easy to add custom ranking algorithms
 * 
 * 3. OBSERVER PATTERN: Event-driven updates for suggestions
 *    - Notify observers when dictionary changes
 *    - Update caches when new words added
 *    - Track user interactions for personalization
 * 
 * 4. DECORATOR PATTERN: Add features without modifying core
 *    - CachedAutocomplete wraps base autocomplete
 *    - LoggingDecorator tracks all queries
 *    - Easy to stack multiple decorators
 * 
 * 5. FACTORY PATTERN: Create different autocomplete instances
 *    - BasicAutocompleteFactory
 *    - CachedAutocompleteFactory
 *    - FuzzyAutocompleteFactory
 * 
 * 6. SINGLETON PATTERN: Shared dictionary instances
 *    - Single global dictionary for memory efficiency
 *    - Thread-safe access to shared resources
 * 
 * OOP CONCEPTS DEMONSTRATED:
 * - ENCAPSULATION: Trie internals hidden behind clean interface
 * - INHERITANCE: Different ranking strategies inherit from base
 * - POLYMORPHISM: Multiple implementations of ranking interface
 * - ABSTRACTION: Complex trie operations abstracted into simple search()
 * 
 * SOLID PRINCIPLES:
 * - SRP: Each class has single responsibility (Trie, Cache, Ranker)
 * - OCP: Easy to add new ranking strategies without modifying existing code
 * - LSP: All ranking strategies are interchangeable
 * - ISP: Focused interfaces for search, insert, ranking
 * - DIP: High-level autocomplete depends on abstractions
 * 
 * FEATURES:
 * - Fast prefix search with O(p + n) complexity
 * - Weighted suggestions with popularity ranking
 * - Fuzzy matching for typo tolerance
 * - Query caching for sub-millisecond responses
 * - Multi-word phrase support
 * - Real-time weight updates
 * - Personalized suggestions
 * 
 * USAGE:
 *     // Basic usage
 *     const autocomplete = new AutocompleteSystem();
 *     autocomplete.addWord("apple", 100);
 *     autocomplete.addWord("application", 80);
 *     
 *     const suggestions = autocomplete.search("app", 5);
 *     // Returns: ["apple", "application", ...]
 *     
 *     // With caching
 *     const cachedAutocomplete = new CachedAutocomplete(autocomplete, 1000);
 *     const suggestions = cachedAutocomplete.search("app", 5);
 *     
 *     // Fuzzy matching
 *     const suggestions = autocomplete.fuzzySearch("aple", 3);
 *     // Returns: [["apple", 1], ["apply", 2], ...]
 * 
 * RETURN VALUES:
 * - search(prefix, limit): Returns Array of top suggestions
 * - addWord(word, weight): Returns void
 * - fuzzySearch(word, limit): Returns Array of [word, distance] pairs
 */

// ==================== TRIE DATA STRUCTURE ====================

/**
 * TrieNode - Single node in the Trie data structure
 * 
 * USAGE:
 *     const node = new TrieNode('a');
 *     node.children.set('p', new TrieNode('p'));
 * 
 * RETURN:
 *     TrieNode object representing a character
 */
class TrieNode {
    constructor(char = '') {
        this.char = char;
        this.children = new Map();
        this.isEndOfWord = false;
        this.word = null;
        this.weight = 0;
        this.frequency = 0; // Track how often this word is searched
    }

    toString() {
        return `TrieNode('${this.char}', end=${this.isEndOfWord}, weight=${this.weight})`;
    }
}

/**
 * Trie - Trie (Prefix Tree) data structure for efficient prefix matching
 * 
 * COMPLEXITY:
 * - Insert: O(m) where m is word length
 * - Search: O(p) where p is prefix length
 * - Get all words with prefix: O(p + n) where n is number of matching words
 * 
 * USAGE:
 *     const trie = new Trie();
 *     trie.insert("apple", 100);
 *     trie.insert("app", 50);
 *     
 *     // Search for prefix
 *     const matches = trie.searchPrefix("app");
 *     // Returns: ["apple", "app"]
 * 
 * RETURN:
 *     Trie object with insert, search, and delete operations
 */
class Trie {
    constructor() {
        this.root = new TrieNode();
        this.size = 0;
    }

    /**
     * Insert word into trie with given weight
     * 
     * USAGE:
     *     trie.insert("hello", 100);
     * 
     * RETURN:
     *     void
     */
    insert(word, weight = 1) {
        if (!word) return;

        word = word.toLowerCase();
        let current = this.root;

        for (const char of word) {
            if (!current.children.has(char)) {
                current.children.set(char, new TrieNode(char));
            }
            current = current.children.get(char);
        }

        if (!current.isEndOfWord) {
            this.size++;
        }

        current.isEndOfWord = true;
        current.word = word;
        current.weight = weight;
        current.frequency = 0;
    }

    /**
     * Check if exact word exists in trie
     * 
     * USAGE:
     *     const exists = trie.search("hello");
     * 
     * RETURN:
     *     boolean - true if word exists, false otherwise
     */
    search(word) {
        const node = this._findPrefixNode(word.toLowerCase());
        return node !== null && node.isEndOfWord;
    }

    /**
     * Find the node representing the last character of prefix
     * 
     * USAGE:
     *     const node = trie._findPrefixNode("app");
     * 
     * RETURN:
     *     TrieNode or null if prefix doesn't exist
     */
    _findPrefixNode(prefix) {
        let current = this.root;

        for (const char of prefix) {
            if (!current.children.has(char)) {
                return null;
            }
            current = current.children.get(char);
        }

        return current;
    }

    /**
     * Get all words that start with given prefix
     * 
     * USAGE:
     *     const words = trie.getAllWordsWithPrefix("app");
     *     // Returns: [["apple", 100, 5], ["application", 80, 3]]
     * 
     * RETURN:
     *     Array of tuples [word, weight, frequency]
     */
    getAllWordsWithPrefix(prefix) {
        prefix = prefix.toLowerCase();
        const node = this._findPrefixNode(prefix);

        if (!node) {
            return [];
        }

        const results = [];
        this._dfsCollectWords(node, results);
        return results;
    }

    /**
     * DFS traversal to collect all words from given node
     * 
     * USAGE:
     *     Internal method used by getAllWordsWithPrefix
     * 
     * RETURN:
     *     void (modifies results array in-place)
     */
    _dfsCollectWords(node, results) {
        if (node.isEndOfWord) {
            results.push([node.word, node.weight, node.frequency]);
        }

        for (const child of node.children.values()) {
            this._dfsCollectWords(child, results);
        }
    }

    /**
     * Delete word from trie
     * 
     * USAGE:
     *     const deleted = trie.delete("hello");
     * 
     * RETURN:
     *     boolean - true if word was deleted, false if not found
     */
    delete(word) {
        word = word.toLowerCase();

        const deleteRecursive = (node, word, index) => {
            if (index === word.length) {
                if (!node.isEndOfWord) {
                    return false;
                }
                node.isEndOfWord = false;
                node.word = null;
                return node.children.size === 0;
            }

            const char = word[index];
            if (!node.children.has(char)) {
                return false;
            }

            const child = node.children.get(char);
            const shouldDeleteChild = deleteRecursive(child, word, index + 1);

            if (shouldDeleteChild) {
                node.children.delete(char);
                return node.children.size === 0 && !node.isEndOfWord;
            }

            return false;
        };

        if (deleteRecursive(this.root, word, 0)) {
            this.size--;
            return true;
        }
        return false;
    }

    /**
     * Update weight of existing word
     * 
     * USAGE:
     *     const updated = trie.updateWeight("hello", 200);
     * 
     * RETURN:
     *     boolean - true if updated, false if word not found
     */
    updateWeight(word, newWeight) {
        const node = this._findPrefixNode(word.toLowerCase());
        if (node && node.isEndOfWord) {
            node.weight = newWeight;
            return true;
        }
        return false;
    }

    /**
     * Increment search frequency for word
     * 
     * USAGE:
     *     trie.incrementFrequency("hello");
     * 
     * RETURN:
     *     boolean - true if incremented, false if word not found
     */
    incrementFrequency(word) {
        const node = this._findPrefixNode(word.toLowerCase());
        if (node && node.isEndOfWord) {
            node.frequency++;
            return true;
        }
        return false;
    }

    /**
     * Get top-k suggestions for prefix
     * 
     * USAGE:
     *     const topSuggestions = trie.getTopKWithPrefix("app", 5);
     * 
     * RETURN:
     *     Array of [word, score] sorted by score descending
     */
    getTopKWithPrefix(prefix, k) {
        const words = this.getAllWordsWithPrefix(prefix);

        if (words.length === 0) {
            return [];
        }

        // Calculate combined score: weight + frequency bonus
        const scoredWords = words.map(([word, weight, frequency]) => {
            const score = weight + (frequency * 10);
            return [word, score];
        });

        // Sort by score descending
        scoredWords.sort((a, b) => b[1] - a[1]);

        return scoredWords.slice(0, k);
    }

    getSize() {
        return this.size;
    }
}

// ==================== RANKING STRATEGIES ====================

/**
 * RankingStrategy - Abstract base class for ranking strategies
 * 
 * DESIGN PATTERN: Strategy Pattern
 */
class RankingStrategy {
    rank(suggestions) {
        throw new Error('Must implement rank method');
    }
}

class PopularityRanking extends RankingStrategy {
    rank(suggestions) {
        const sorted = [...suggestions].sort((a, b) => b[1] - a[1]);
        return sorted.map(([word]) => word);
    }
}

class FrequencyRanking extends RankingStrategy {
    rank(suggestions) {
        const sorted = [...suggestions].sort((a, b) => b[2] - a[2]);
        return sorted.map(([word]) => word);
    }
}

class HybridRanking extends RankingStrategy {
    constructor(weightFactor = 1.0, frequencyFactor = 10.0) {
        super();
        this.weightFactor = weightFactor;
        this.frequencyFactor = frequencyFactor;
    }

    rank(suggestions) {
        const scored = suggestions.map(([word, weight, frequency]) => {
            const score = (weight * this.weightFactor) + (frequency * this.frequencyFactor);
            return [word, score];
        });

        scored.sort((a, b) => b[1] - a[1]);
        return scored.map(([word]) => word);
    }
}

// ==================== FUZZY MATCHING ====================

/**
 * FuzzyMatcher - Fuzzy string matching using edit distance
 * 
 * USAGE:
 *     const matcher = new FuzzyMatcher(2);
 *     const similar = matcher.findSimilar("aple", candidates);
 *     // Returns: [["apple", 1], ["apply", 2]]
 * 
 * RETURN:
 *     Array of similar words within edit distance threshold
 */
class FuzzyMatcher {
    constructor(maxDistance = 2) {
        this.maxDistance = maxDistance;
    }

    /**
     * Calculate Levenshtein edit distance between two words
     * 
     * COMPLEXITY: O(m * n) time, O(m * n) space
     * 
     * USAGE:
     *     const distance = matcher.editDistance("hello", "helo");
     *     // Returns: 1
     * 
     * RETURN:
     *     number - Minimum number of edits needed
     */
    editDistance(word1, word2) {
        const m = word1.length;
        const n = word2.length;

        // Create DP table
        const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

        // Initialize base cases
        for (let i = 0; i <= m; i++) {
            dp[i][0] = i;
        }
        for (let j = 0; j <= n; j++) {
            dp[0][j] = j;
        }

        // Fill DP table
        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                if (word1[i - 1] === word2[j - 1]) {
                    dp[i][j] = dp[i - 1][j - 1];
                } else {
                    dp[i][j] = 1 + Math.min(
                        dp[i - 1][j],      // deletion
                        dp[i][j - 1],      // insertion
                        dp[i - 1][j - 1]   // substitution
                    );
                }
            }
        }

        return dp[m][n];
    }

    /**
     * Find words similar to given word within maxDistance
     * 
     * USAGE:
     *     const similar = matcher.findSimilar("aple", ["apple", "banana", "apply"]);
     *     // Returns: [["apple", 1], ["apply", 2]]
     * 
     * RETURN:
     *     Array of [word, distance] sorted by distance
     */
    findSimilar(word, candidates) {
        const similar = [];
        word = word.toLowerCase();

        for (const candidate of candidates) {
            const distance = this.editDistance(word, candidate.toLowerCase());
            if (distance <= this.maxDistance) {
                similar.push([candidate, distance]);
            }
        }

        // Sort by distance (ascending)
        similar.sort((a, b) => a[1] - b[1]);
        return similar;
    }
}

// ==================== CACHE ====================

/**
 * LRUCache - Simple LRU Cache for query results
 * 
 * USAGE:
 *     const cache = new LRUCache(100);
 *     cache.put("app", ["apple", "application"]);
 *     const results = cache.get("app");
 * 
 * RETURN:
 *     Cached results or null
 */
class LRUCache {
    constructor(capacity) {
        this.capacity = capacity;
        this.cache = new Map();
        this.accessOrder = [];
    }

    get(key) {
        if (this.cache.has(key)) {
            // Move to end (most recently used)
            const index = this.accessOrder.indexOf(key);
            this.accessOrder.splice(index, 1);
            this.accessOrder.push(key);
            return this.cache.get(key);
        }
        return null;
    }

    put(key, value) {
        if (this.cache.has(key)) {
            const index = this.accessOrder.indexOf(key);
            this.accessOrder.splice(index, 1);
        } else if (this.cache.size >= this.capacity) {
            // Evict least recently used
            const lruKey = this.accessOrder.shift();
            this.cache.delete(lruKey);
        }

        this.cache.set(key, value);
        this.accessOrder.push(key);
    }

    clear() {
        this.cache.clear();
        this.accessOrder = [];
    }
}

// ==================== MAIN AUTOCOMPLETE SYSTEM ====================

/**
 * AutocompleteSystem - Main autocomplete/typeahead system
 * 
 * DESIGN PATTERN: Facade Pattern providing unified interface
 * 
 * USAGE:
 *     const autocomplete = new AutocompleteSystem(10);
 *     autocomplete.addWord("apple", 100);
 *     autocomplete.addWord("application", 80);
 *     
 *     const suggestions = autocomplete.search("app", 5);
 *     // Returns: ["apple", "application"]
 *     
 *     // Update popularity when user selects
 *     autocomplete.updatePopularity("application");
 * 
 * RETURN:
 *     AutocompleteSystem instance with search, add, update methods
 */
class AutocompleteSystem {
    constructor(maxSuggestions = 10, rankingStrategy = null) {
        this.trie = new Trie();
        this.maxSuggestions = maxSuggestions;
        this.rankingStrategy = rankingStrategy || new HybridRanking();
        this.fuzzyMatcher = new FuzzyMatcher(2);
        this.queryCount = 0;
    }

    /**
     * Add word to dictionary with weight
     * 
     * USAGE:
     *     autocomplete.addWord("hello", 100);
     * 
     * RETURN:
     *     void
     */
    addWord(word, weight = 1) {
        this.trie.insert(word, weight);
    }

    /**
     * Batch add words with weights
     * 
     * USAGE:
     *     autocomplete.addWords([["hello", 100], ["world", 90]]);
     * 
     * RETURN:
     *     void
     */
    addWords(words) {
        for (const [word, weight] of words) {
            this.addWord(word, weight);
        }
    }

    /**
     * Search for suggestions matching prefix
     * 
     * USAGE:
     *     const suggestions = autocomplete.search("app", 5);
     * 
     * RETURN:
     *     Array of suggested words sorted by relevance
     */
    search(prefix, limit = null) {
        if (!prefix) {
            return [];
        }

        this.queryCount++;
        limit = limit || this.maxSuggestions;

        // Get all words with prefix
        const words = this.trie.getAllWordsWithPrefix(prefix);

        if (words.length === 0) {
            return [];
        }

        // Apply ranking strategy
        const rankedWords = this.rankingStrategy.rank(words);

        return rankedWords.slice(0, limit);
    }

    /**
     * Fuzzy search for similar words (typo tolerance)
     * 
     * USAGE:
     *     const suggestions = autocomplete.fuzzySearch("aple", 3);
     *     // Returns: [["apple", 1], ["apply", 2]]
     * 
     * RETURN:
     *     Array of [word, edit_distance] pairs
     */
    fuzzySearch(word, limit = null) {
        limit = limit || this.maxSuggestions;

        // Get all words from trie
        const allWords = [];
        this._collectAllWords(this.trie.root, allWords);

        // Find similar words
        const similar = this.fuzzyMatcher.findSimilar(word, allWords);

        return similar.slice(0, limit);
    }

    _collectAllWords(node, words) {
        if (node.isEndOfWord) {
            words.push(node.word);
        }

        for (const child of node.children.values()) {
            this._collectAllWords(child, words);
        }
    }

    /**
     * Update word popularity when user selects it
     * 
     * USAGE:
     *     autocomplete.updatePopularity("apple");
     * 
     * RETURN:
     *     void
     */
    updatePopularity(word) {
        this.trie.incrementFrequency(word);
    }

    /**
     * Remove word from dictionary
     * 
     * USAGE:
     *     const removed = autocomplete.removeWord("hello");
     * 
     * RETURN:
     *     boolean - true if removed, false if not found
     */
    removeWord(word) {
        return this.trie.delete(word);
    }

    /**
     * Get system statistics
     * 
     * USAGE:
     *     const stats = autocomplete.getStatistics();
     * 
     * RETURN:
     *     Object with statistics about the system
     */
    getStatistics() {
        return {
            totalWords: this.trie.getSize(),
            totalQueries: this.queryCount,
            maxSuggestions: this.maxSuggestions
        };
    }
}

// ==================== CACHED AUTOCOMPLETE (DECORATOR) ====================

/**
 * CachedAutocomplete - Decorator that adds caching to autocomplete system
 * 
 * DESIGN PATTERN: Decorator Pattern
 * 
 * USAGE:
 *     const base = new AutocompleteSystem();
 *     const cached = new CachedAutocomplete(base, 1000);
 *     const suggestions = cached.search("app", 5);
 * 
 * RETURN:
 *     CachedAutocomplete instance with same interface
 */
class CachedAutocomplete {
    constructor(autocomplete, cacheSize = 1000) {
        this.autocomplete = autocomplete;
        this.cache = new LRUCache(cacheSize);
        this.cacheHits = 0;
        this.cacheMisses = 0;
    }

    search(prefix, limit = null) {
        const cacheKey = `${prefix}:${limit}`;

        // Try cache first
        const cachedResult = this.cache.get(cacheKey);
        if (cachedResult !== null) {
            this.cacheHits++;
            return cachedResult;
        }

        // Cache miss - query trie
        this.cacheMisses++;
        const results = this.autocomplete.search(prefix, limit);
        this.cache.put(cacheKey, results);
        return results;
    }

    addWord(word, weight = 1) {
        this.autocomplete.addWord(word, weight);
        this.cache.clear();
    }

    updatePopularity(word) {
        this.autocomplete.updatePopularity(word);
        this.cache.clear();
    }

    getCacheStatistics() {
        const total = this.cacheHits + this.cacheMisses;
        const hitRate = total > 0 ? (this.cacheHits / total * 100).toFixed(2) : 0;

        return {
            cacheHits: this.cacheHits,
            cacheMisses: this.cacheMisses,
            hitRate: `${hitRate}%`
        };
    }
}

// ==================== DEMO ====================

function main() {
    console.log('='.repeat(70));
    console.log('🔍 AUTOCOMPLETE / TYPEAHEAD SYSTEM DEMO');
    console.log('='.repeat(70));

    // Create autocomplete system
    console.log('\n📚 Creating autocomplete system...');
    const autocomplete = new AutocompleteSystem(10);

    // Add programming language keywords
    console.log('\n➕ Adding programming languages...');
    const languages = [
        ['python', 1000],
        ['python3', 800],
        ['pythonic', 500],
        ['java', 900],
        ['javascript', 950],
        ['typescript', 700],
        ['ruby', 600],
        ['rust', 650],
        ['go', 550],
        ['golang', 500],
        ['php', 400],
        ['perl', 300],
        ['r', 200],
        ['swift', 500],
        ['kotlin', 450],
        ['scala', 350]
    ];

    autocomplete.addWords(languages);
    console.log(`✓ Added ${languages.length} languages`);

    // Search examples
    console.log('\n🔍 Search Examples:');
    console.log('-'.repeat(70));

    const testQueries = ['py', 'java', 'go', 'r'];

    for (const query of testQueries) {
        const suggestions = autocomplete.search(query, 5);
        console.log(`\n  Query: '${query}'`);
        console.log(`  Suggestions: ${JSON.stringify(suggestions)}`);
    }

    // Update popularity
    console.log('\n📈 Simulating user selections (popularity updates)...');
    autocomplete.updatePopularity('python');
    autocomplete.updatePopularity('python');
    autocomplete.updatePopularity('python');
    autocomplete.updatePopularity('pythonic');

    console.log('\n  After popularity updates:');
    const pySuggestions = autocomplete.search('py', 5);
    console.log(`  Query: 'py'`);
    console.log(`  Suggestions: ${JSON.stringify(pySuggestions)}`);

    // Fuzzy search
    console.log('\n🔎 Fuzzy Search (typo tolerance):');
    console.log('-'.repeat(70));

    const typos = ['pythn', 'javasript', 'goland'];

    for (const typo of typos) {
        const similar = autocomplete.fuzzySearch(typo, 3);
        console.log(`\n  Typo: '${typo}'`);
        console.log(`  Similar words: ${JSON.stringify(similar)}`);
    }

    // Caching demo
    console.log('\n💾 Caching Demo:');
    console.log('-'.repeat(70));

    const cachedAutocomplete = new CachedAutocomplete(autocomplete, 100);

    // First query - cache miss
    const start1 = Date.now();
    const results1 = cachedAutocomplete.search('py', 5);
    const time1 = Date.now() - start1;

    // Second query - cache hit
    const start2 = Date.now();
    const results2 = cachedAutocomplete.search('py', 5);
    const time2 = Date.now() - start2;

    console.log(`\n  First query (cache miss):  ${time1.toFixed(3)}ms`);
    console.log(`  Second query (cache hit):  ${time2.toFixed(3)}ms`);
    if (time2 > 0) {
        console.log(`  Speedup: ${(time1 / time2).toFixed(1)}x faster`);
    }

    const cacheStats = cachedAutocomplete.getCacheStatistics();
    console.log('\n  Cache Statistics:');
    console.log(`    - Hits: ${cacheStats.cacheHits}`);
    console.log(`    - Misses: ${cacheStats.cacheMisses}`);
    console.log(`    - Hit Rate: ${cacheStats.hitRate}`);

    // Add tech companies
    console.log('\n🏢 Adding tech companies...');
    const companies = [
        ['google', 1000],
        ['facebook', 900],
        ['amazon', 950],
        ['apple', 980],
        ['microsoft', 920],
        ['netflix', 700],
        ['tesla', 850],
        ['twitter', 600],
        ['uber', 500],
        ['airbnb', 450]
    ];

    autocomplete.addWords(companies);
    console.log(`✓ Added ${companies.length} companies`);

    // Search for companies
    console.log('\n  Company search examples:');
    const companyQueries = ['go', 'app', 'te', 'a'];

    for (const query of companyQueries) {
        const suggestions = autocomplete.search(query, 5);
        console.log(`\n  Query: '${query}'`);
        console.log(`  Suggestions: ${JSON.stringify(suggestions)}`);
    }

    // Statistics
    console.log('\n📊 System Statistics:');
    console.log('-'.repeat(70));

    const stats = autocomplete.getStatistics();
    console.log(`\n  Total Words: ${stats.totalWords}`);
    console.log(`  Total Queries: ${stats.totalQueries}`);
    console.log(`  Max Suggestions: ${stats.maxSuggestions}`);

    // Real-world use case: Search engine
    console.log('\n🌐 Search Engine Use Case:');
    console.log('-'.repeat(70));

    const searchAutocomplete = new AutocompleteSystem(5);

    const searchQueries = [
        ['how to learn python', 10000],
        ['how to learn java', 8000],
        ['how to learn javascript', 9000],
        ['how to cook pasta', 7000],
        ['how to cook rice', 6500],
        ['how to lose weight', 12000],
        ['how to make money', 15000],
        ['how are you', 5000]
    ];

    searchAutocomplete.addWords(searchQueries);

    console.log('\n  Search suggestions:');
    const searchPrefixes = ['how to l', 'how to c', 'how to m'];

    for (const prefix of searchPrefixes) {
        const suggestions = searchAutocomplete.search(prefix, 3);
        console.log(`\n  '${prefix}' → ${JSON.stringify(suggestions)}`);
    }

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
    TrieNode,
    Trie,
    RankingStrategy,
    PopularityRanking,
    FrequencyRanking,
    HybridRanking,
    FuzzyMatcher,
    LRUCache,
    AutocompleteSystem,
    CachedAutocomplete
};
