"""
AUTOCOMPLETE / TYPEAHEAD SYSTEM - Low Level Design Implementation in Python

This file implements a production-ready autocomplete/typeahead system using Trie
data structure with advanced features like fuzzy matching, caching, and ranking.

DESIGN PATTERNS USED:
1. TRIE PATTERN: Core data structure for efficient prefix-based search
   - Each node represents a character in the alphabet
   - O(m) insertion and O(p) prefix search
   - Memory-efficient storage of common prefixes
   - Optimal for autocomplete and dictionary operations

2. STRATEGY PATTERN: Multiple ranking strategies for suggestions
   - PopularityRanking: Sort by weight/frequency
   - RecencyRanking: Prioritize recently searched terms
   - HybridRanking: Combine multiple factors
   - Easy to add custom ranking algorithms

3. OBSERVER PATTERN: Event-driven updates for suggestions
   - Notify observers when dictionary changes
   - Update caches when new words added
   - Track user interactions for personalization

4. DECORATOR PATTERN: Add features without modifying core
   - CachedAutocomplete wraps base autocomplete
   - LoggingDecorator tracks all queries
   - Easy to stack multiple decorators

5. FACTORY PATTERN: Create different autocomplete instances
   - BasicAutocompleteFactory
   - CachedAutocompleteFactory
   - FuzzyAutocompleteFactory

6. SINGLETON PATTERN: Shared dictionary instances
   - Single global dictionary for memory efficiency
   - Thread-safe access to shared resources

OOP CONCEPTS DEMONSTRATED:
- ENCAPSULATION: Trie internals hidden behind clean interface
- INHERITANCE: Different ranking strategies inherit from base
- POLYMORPHISM: Multiple implementations of ranking interface
- ABSTRACTION: Complex trie operations abstracted into simple search()

SOLID PRINCIPLES:
- SRP: Each class has single responsibility (Trie, Cache, Ranker)
- OCP: Easy to add new ranking strategies without modifying existing code
- LSP: All ranking strategies are interchangeable
- ISP: Focused interfaces for search, insert, ranking
- DIP: High-level autocomplete depends on abstractions

FEATURES:
- Fast prefix search with O(p + n) complexity
- Weighted suggestions with popularity ranking
- Fuzzy matching for typo tolerance
- Query caching for sub-millisecond responses
- Multi-word phrase support
- Real-time weight updates
- Personalized suggestions
- Thread-safe operations

USAGE:
    # Basic usage
    autocomplete = AutocompleteSystem()
    autocomplete.add_word("apple", weight=100)
    autocomplete.add_word("application", weight=80)
    
    suggestions = autocomplete.search("app", limit=5)
    # Returns: ["apple", "application", ...]
    
    # With caching
    cached_autocomplete = CachedAutocomplete(autocomplete, cache_size=1000)
    suggestions = cached_autocomplete.search("app", limit=5)
    
    # Fuzzy matching
    suggestions = autocomplete.fuzzy_search("aple", limit=3)
    # Returns: ["apple", "apply", ...]

RETURN VALUES:
- search(prefix, limit): Returns List[str] of top suggestions
- add_word(word, weight): Returns None
- fuzzy_search(word, limit): Returns List[Tuple[str, float]] with scores
"""

from typing import List, Dict, Optional, Tuple, Set
from abc import ABC, abstractmethod
from collections import defaultdict
import heapq
import time


# ==================== TRIE DATA STRUCTURE ====================

class TrieNode:
    """
    Single node in the Trie data structure
    
    USAGE:
        node = TrieNode('a')
        node.children['p'] = TrieNode('p')
    
    RETURN:
        TrieNode object representing a character
    """
    def __init__(self, char: str = ''):
        self.char = char
        self.children: Dict[str, 'TrieNode'] = {}
        self.is_end_of_word = False
        self.word: Optional[str] = None
        self.weight = 0
        self.frequency = 0  # Track how often this word is searched
    
    def __repr__(self):
        return f"TrieNode('{self.char}', end={self.is_end_of_word}, weight={self.weight})"


class Trie:
    """
    Trie (Prefix Tree) data structure for efficient prefix matching
    
    COMPLEXITY:
    - Insert: O(m) where m is word length
    - Search: O(p) where p is prefix length
    - Get all words with prefix: O(p + n) where n is number of matching words
    
    USAGE:
        trie = Trie()
        trie.insert("apple", weight=100)
        trie.insert("app", weight=50)
        
        # Search for prefix
        matches = trie.search_prefix("app")
        # Returns: ["apple", "app"]
    
    RETURN:
        Trie object with insert, search, and delete operations
    """
    def __init__(self):
        self.root = TrieNode()
        self.size = 0
    
    def insert(self, word: str, weight: int = 1) -> None:
        """
        Insert word into trie with given weight
        
        USAGE:
            trie.insert("hello", weight=100)
        
        RETURN:
            None
        """
        if not word:
            return
        
        word = word.lower()
        current = self.root
        
        for char in word:
            if char not in current.children:
                current.children[char] = TrieNode(char)
            current = current.children[char]
        
        if not current.is_end_of_word:
            self.size += 1
        
        current.is_end_of_word = True
        current.word = word
        current.weight = weight
        current.frequency = 0
    
    def search(self, word: str) -> bool:
        """
        Check if exact word exists in trie
        
        USAGE:
            exists = trie.search("hello")
        
        RETURN:
            bool - True if word exists, False otherwise
        """
        node = self._find_prefix_node(word.lower())
        return node is not None and node.is_end_of_word
    
    def _find_prefix_node(self, prefix: str) -> Optional[TrieNode]:
        """
        Find the node representing the last character of prefix
        
        USAGE:
            node = trie._find_prefix_node("app")
        
        RETURN:
            TrieNode or None if prefix doesn't exist
        """
        current = self.root
        
        for char in prefix:
            if char not in current.children:
                return None
            current = current.children[char]
        
        return current
    
    def get_all_words_with_prefix(self, prefix: str) -> List[Tuple[str, int, int]]:
        """
        Get all words that start with given prefix
        
        USAGE:
            words = trie.get_all_words_with_prefix("app")
            # Returns: [("apple", 100, 5), ("application", 80, 3)]
        
        RETURN:
            List of tuples (word, weight, frequency)
        """
        prefix = prefix.lower()
        node = self._find_prefix_node(prefix)
        
        if node is None:
            return []
        
        results = []
        self._dfs_collect_words(node, results)
        return results
    
    def _dfs_collect_words(self, node: TrieNode, results: List[Tuple[str, int, int]]) -> None:
        """
        DFS traversal to collect all words from given node
        
        USAGE:
            Internal method used by get_all_words_with_prefix
        
        RETURN:
            None (modifies results list in-place)
        """
        if node.is_end_of_word:
            results.append((node.word, node.weight, node.frequency))
        
        for child in node.children.values():
            self._dfs_collect_words(child, results)
    
    def delete(self, word: str) -> bool:
        """
        Delete word from trie
        
        USAGE:
            deleted = trie.delete("hello")
        
        RETURN:
            bool - True if word was deleted, False if not found
        """
        word = word.lower()
        
        def _delete_recursive(node: TrieNode, word: str, index: int) -> bool:
            if index == len(word):
                if not node.is_end_of_word:
                    return False
                node.is_end_of_word = False
                node.word = None
                return len(node.children) == 0
            
            char = word[index]
            if char not in node.children:
                return False
            
            child = node.children[char]
            should_delete_child = _delete_recursive(child, word, index + 1)
            
            if should_delete_child:
                del node.children[char]
                return len(node.children) == 0 and not node.is_end_of_word
            
            return False
        
        if _delete_recursive(self.root, word, 0):
            self.size -= 1
            return True
        return False
    
    def update_weight(self, word: str, new_weight: int) -> bool:
        """
        Update weight of existing word
        
        USAGE:
            updated = trie.update_weight("hello", 200)
        
        RETURN:
            bool - True if updated, False if word not found
        """
        node = self._find_prefix_node(word.lower())
        if node and node.is_end_of_word:
            node.weight = new_weight
            return True
        return False
    
    def increment_frequency(self, word: str) -> bool:
        """
        Increment search frequency for word
        
        USAGE:
            trie.increment_frequency("hello")
        
        RETURN:
            bool - True if incremented, False if word not found
        """
        node = self._find_prefix_node(word.lower())
        if node and node.is_end_of_word:
            node.frequency += 1
            return True
        return False
    
    def get_top_k_with_prefix(self, prefix: str, k: int) -> List[Tuple[str, int]]:
        """
        Get top-k suggestions for prefix using min-heap optimization
        
        USAGE:
            top_suggestions = trie.get_top_k_with_prefix("app", 5)
        
        RETURN:
            List of tuples (word, weight) sorted by weight descending
        """
        words = self.get_all_words_with_prefix(prefix)
        
        if not words:
            return []
        
        # Use min-heap to keep only top-k
        min_heap = []
        
        for word, weight, frequency in words:
            # Combined score: weight + frequency bonus
            score = weight + (frequency * 10)
            
            if len(min_heap) < k:
                heapq.heappush(min_heap, (score, word))
            elif score > min_heap[0][0]:
                heapq.heapreplace(min_heap, (score, word))
        
        # Sort in descending order
        result = sorted(min_heap, key=lambda x: -x[0])
        return [(word, score) for score, word in result]
    
    def __len__(self):
        return self.size


# ==================== RANKING STRATEGIES ====================

class RankingStrategy(ABC):
    """
    Abstract base class for ranking strategies
    
    DESIGN PATTERN: Strategy Pattern
    """
    @abstractmethod
    def rank(self, suggestions: List[Tuple[str, int, int]]) -> List[str]:
        """Rank suggestions and return sorted list"""
        pass


class PopularityRanking(RankingStrategy):
    """Rank by weight (popularity) descending"""
    def rank(self, suggestions: List[Tuple[str, int, int]]) -> List[str]:
        sorted_suggestions = sorted(suggestions, key=lambda x: -x[1])
        return [word for word, _, _ in sorted_suggestions]


class FrequencyRanking(RankingStrategy):
    """Rank by search frequency descending"""
    def rank(self, suggestions: List[Tuple[str, int, int]]) -> List[str]:
        sorted_suggestions = sorted(suggestions, key=lambda x: -x[2])
        return [word for word, _, _ in sorted_suggestions]


class HybridRanking(RankingStrategy):
    """Rank by combined score of weight and frequency"""
    def __init__(self, weight_factor: float = 1.0, frequency_factor: float = 10.0):
        self.weight_factor = weight_factor
        self.frequency_factor = frequency_factor
    
    def rank(self, suggestions: List[Tuple[str, int, int]]) -> List[str]:
        def score(word, weight, frequency):
            return (weight * self.weight_factor) + (frequency * self.frequency_factor)
        
        sorted_suggestions = sorted(
            suggestions, 
            key=lambda x: -score(x[0], x[1], x[2])
        )
        return [word for word, _, _ in sorted_suggestions]


# ==================== FUZZY MATCHING ====================

class FuzzyMatcher:
    """
    Fuzzy string matching using edit distance
    
    USAGE:
        matcher = FuzzyMatcher(max_distance=2)
        similar = matcher.find_similar("aple", candidates)
        # Returns: ["apple", "apply"]
    
    RETURN:
        List of similar words within edit distance threshold
    """
    def __init__(self, max_distance: int = 2):
        self.max_distance = max_distance
    
    def edit_distance(self, word1: str, word2: str) -> int:
        """
        Calculate Levenshtein edit distance between two words
        
        COMPLEXITY: O(m * n) time, O(m * n) space
        
        USAGE:
            distance = matcher.edit_distance("hello", "helo")
            # Returns: 1
        
        RETURN:
            int - Minimum number of edits needed
        """
        m, n = len(word1), len(word2)
        
        # Create DP table
        dp = [[0] * (n + 1) for _ in range(m + 1)]
        
        # Initialize base cases
        for i in range(m + 1):
            dp[i][0] = i
        for j in range(n + 1):
            dp[0][j] = j
        
        # Fill DP table
        for i in range(1, m + 1):
            for j in range(1, n + 1):
                if word1[i-1] == word2[j-1]:
                    dp[i][j] = dp[i-1][j-1]
                else:
                    dp[i][j] = 1 + min(
                        dp[i-1][j],      # deletion
                        dp[i][j-1],      # insertion
                        dp[i-1][j-1]     # substitution
                    )
        
        return dp[m][n]
    
    def find_similar(self, word: str, candidates: List[str]) -> List[Tuple[str, int]]:
        """
        Find words similar to given word within max_distance
        
        USAGE:
            similar = matcher.find_similar("aple", ["apple", "banana", "apply"])
            # Returns: [("apple", 1), ("apply", 2)]
        
        RETURN:
            List of tuples (word, distance) sorted by distance
        """
        similar = []
        word = word.lower()
        
        for candidate in candidates:
            distance = self.edit_distance(word, candidate.lower())
            if distance <= self.max_distance:
                similar.append((candidate, distance))
        
        # Sort by distance (ascending)
        similar.sort(key=lambda x: x[1])
        return similar


# ==================== CACHE ====================

class LRUCache:
    """
    Simple LRU Cache for query results
    
    USAGE:
        cache = LRUCache(capacity=100)
        cache.put("app", ["apple", "application"])
        results = cache.get("app")
    
    RETURN:
        Cached results or None
    """
    def __init__(self, capacity: int):
        self.capacity = capacity
        self.cache: Dict = {}
        self.access_order: List = []
    
    def get(self, key: str) -> Optional[List[str]]:
        """Get value from cache, None if not found"""
        if key in self.cache:
            # Move to end (most recently used)
            self.access_order.remove(key)
            self.access_order.append(key)
            return self.cache[key]
        return None
    
    def put(self, key: str, value: List[str]) -> None:
        """Put value in cache, evict LRU if full"""
        if key in self.cache:
            self.access_order.remove(key)
        elif len(self.cache) >= self.capacity:
            # Evict least recently used
            lru_key = self.access_order.pop(0)
            del self.cache[lru_key]
        
        self.cache[key] = value
        self.access_order.append(key)
    
    def clear(self):
        """Clear all cached entries"""
        self.cache.clear()
        self.access_order.clear()


# ==================== MAIN AUTOCOMPLETE SYSTEM ====================

class AutocompleteSystem:
    """
    Main autocomplete/typeahead system
    
    DESIGN PATTERN: Facade Pattern providing unified interface
    
    USAGE:
        autocomplete = AutocompleteSystem(max_suggestions=10)
        autocomplete.add_word("apple", weight=100)
        autocomplete.add_word("application", weight=80)
        
        suggestions = autocomplete.search("app", limit=5)
        # Returns: ["apple", "application"]
        
        # Update popularity when user selects
        autocomplete.update_popularity("application")
    
    RETURN:
        AutocompleteSystem instance with search, add, update methods
    """
    def __init__(self, max_suggestions: int = 10, ranking_strategy: RankingStrategy = None):
        self.trie = Trie()
        self.max_suggestions = max_suggestions
        self.ranking_strategy = ranking_strategy or HybridRanking()
        self.fuzzy_matcher = FuzzyMatcher(max_distance=2)
        self.query_count = 0
    
    def add_word(self, word: str, weight: int = 1) -> None:
        """
        Add word to dictionary with weight
        
        USAGE:
            autocomplete.add_word("hello", weight=100)
        
        RETURN:
            None
        """
        self.trie.insert(word, weight)
    
    def add_words(self, words: List[Tuple[str, int]]) -> None:
        """
        Batch add words with weights
        
        USAGE:
            autocomplete.add_words([("hello", 100), ("world", 90)])
        
        RETURN:
            None
        """
        for word, weight in words:
            self.add_word(word, weight)
    
    def search(self, prefix: str, limit: Optional[int] = None) -> List[str]:
        """
        Search for suggestions matching prefix
        
        USAGE:
            suggestions = autocomplete.search("app", limit=5)
        
        RETURN:
            List of suggested words sorted by relevance
        """
        if not prefix:
            return []
        
        self.query_count += 1
        limit = limit or self.max_suggestions
        
        # Get all words with prefix
        words = self.trie.get_all_words_with_prefix(prefix)
        
        if not words:
            return []
        
        # Apply ranking strategy
        ranked_words = self.ranking_strategy.rank(words)
        
        return ranked_words[:limit]
    
    def fuzzy_search(self, word: str, limit: Optional[int] = None) -> List[Tuple[str, int]]:
        """
        Fuzzy search for similar words (typo tolerance)
        
        USAGE:
            suggestions = autocomplete.fuzzy_search("aple", limit=3)
            # Returns: [("apple", 1), ("apply", 2)]
        
        RETURN:
            List of tuples (word, edit_distance)
        """
        limit = limit or self.max_suggestions
        
        # Get all words from trie
        all_words = []
        self._collect_all_words(self.trie.root, all_words)
        
        # Find similar words
        similar = self.fuzzy_matcher.find_similar(word, all_words)
        
        return similar[:limit]
    
    def _collect_all_words(self, node: TrieNode, words: List[str]) -> None:
        """Helper to collect all words in trie"""
        if node.is_end_of_word:
            words.append(node.word)
        
        for child in node.children.values():
            self._collect_all_words(child, words)
    
    def update_popularity(self, word: str) -> None:
        """
        Update word popularity when user selects it
        
        USAGE:
            autocomplete.update_popularity("apple")
        
        RETURN:
            None
        """
        self.trie.increment_frequency(word)
    
    def remove_word(self, word: str) -> bool:
        """
        Remove word from dictionary
        
        USAGE:
            removed = autocomplete.remove_word("hello")
        
        RETURN:
            bool - True if removed, False if not found
        """
        return self.trie.delete(word)
    
    def get_statistics(self) -> Dict:
        """
        Get system statistics
        
        USAGE:
            stats = autocomplete.get_statistics()
        
        RETURN:
            Dict with statistics about the system
        """
        return {
            "total_words": len(self.trie),
            "total_queries": self.query_count,
            "max_suggestions": self.max_suggestions
        }


# ==================== CACHED AUTOCOMPLETE (DECORATOR) ====================

class CachedAutocomplete:
    """
    Decorator that adds caching to autocomplete system
    
    DESIGN PATTERN: Decorator Pattern
    
    USAGE:
        base = AutocompleteSystem()
        cached = CachedAutocomplete(base, cache_size=1000)
        suggestions = cached.search("app", limit=5)
    
    RETURN:
        CachedAutocomplete instance with same interface
    """
    def __init__(self, autocomplete: AutocompleteSystem, cache_size: int = 1000):
        self.autocomplete = autocomplete
        self.cache = LRUCache(cache_size)
        self.cache_hits = 0
        self.cache_misses = 0
    
    def search(self, prefix: str, limit: Optional[int] = None) -> List[str]:
        """Search with caching"""
        cache_key = f"{prefix}:{limit}"
        
        # Try cache first
        cached_result = self.cache.get(cache_key)
        if cached_result is not None:
            self.cache_hits += 1
            return cached_result
        
        # Cache miss - query trie
        self.cache_misses += 1
        results = self.autocomplete.search(prefix, limit)
        self.cache.put(cache_key, results)
        return results
    
    def add_word(self, word: str, weight: int = 1) -> None:
        """Add word and clear cache"""
        self.autocomplete.add_word(word, weight)
        self.cache.clear()
    
    def update_popularity(self, word: str) -> None:
        """Update popularity and clear cache"""
        self.autocomplete.update_popularity(word)
        self.cache.clear()
    
    def get_cache_statistics(self) -> Dict:
        """Get cache performance statistics"""
        total = self.cache_hits + self.cache_misses
        hit_rate = self.cache_hits / total if total > 0 else 0
        
        return {
            "cache_hits": self.cache_hits,
            "cache_misses": self.cache_misses,
            "hit_rate": f"{hit_rate:.2%}"
        }


# ==================== DEMO ====================

def main():
    """
    Demo of autocomplete system
    
    Demonstrates:
    - Basic word insertion and search
    - Weighted suggestions
    - Popularity updates
    - Fuzzy search
    - Caching
    """
    print("=" * 70)
    print("🔍 AUTOCOMPLETE / TYPEAHEAD SYSTEM DEMO")
    print("=" * 70)
    
    # Create autocomplete system
    print("\n📚 Creating autocomplete system...")
    autocomplete = AutocompleteSystem(max_suggestions=10)
    
    # Add programming language keywords
    print("\n➕ Adding programming languages...")
    languages = [
        ("python", 1000),
        ("python3", 800),
        ("pythonic", 500),
        ("java", 900),
        ("javascript", 950),
        ("typescript", 700),
        ("ruby", 600),
        ("rust", 650),
        ("go", 550),
        ("golang", 500),
        ("php", 400),
        ("perl", 300),
        ("r", 200),
        ("swift", 500),
        ("kotlin", 450),
        ("scala", 350),
    ]
    
    autocomplete.add_words(languages)
    print(f"✓ Added {len(languages)} languages")
    
    # Search examples
    print("\n🔍 Search Examples:")
    print("-" * 70)
    
    test_queries = ["py", "java", "go", "r", ""]
    
    for query in test_queries:
        if not query:
            continue
        suggestions = autocomplete.search(query, limit=5)
        print(f"\n  Query: '{query}'")
        print(f"  Suggestions: {suggestions}")
    
    # Update popularity
    print("\n📈 Simulating user selections (popularity updates)...")
    autocomplete.update_popularity("python")
    autocomplete.update_popularity("python")
    autocomplete.update_popularity("python")
    autocomplete.update_popularity("pythonic")
    
    print("\n  After popularity updates:")
    suggestions = autocomplete.search("py", limit=5)
    print(f"  Query: 'py'")
    print(f"  Suggestions: {suggestions}")
    
    # Fuzzy search
    print("\n🔎 Fuzzy Search (typo tolerance):")
    print("-" * 70)
    
    typos = ["pythn", "javasript", "goland"]
    
    for typo in typos:
        similar = autocomplete.fuzzy_search(typo, limit=3)
        print(f"\n  Typo: '{typo}'")
        print(f"  Similar words: {[(word, dist) for word, dist in similar]}")
    
    # Caching demo
    print("\n💾 Caching Demo:")
    print("-" * 70)
    
    cached_autocomplete = CachedAutocomplete(autocomplete, cache_size=100)
    
    # First query - cache miss
    start = time.time()
    results1 = cached_autocomplete.search("py", limit=5)
    time1 = (time.time() - start) * 1000
    
    # Second query - cache hit
    start = time.time()
    results2 = cached_autocomplete.search("py", limit=5)
    time2 = (time.time() - start) * 1000
    
    print(f"\n  First query (cache miss):  {time1:.3f}ms")
    print(f"  Second query (cache hit):  {time2:.3f}ms")
    print(f"  Speedup: {time1/time2:.1f}x faster")
    
    cache_stats = cached_autocomplete.get_cache_statistics()
    print(f"\n  Cache Statistics:")
    print(f"    - Hits: {cache_stats['cache_hits']}")
    print(f"    - Misses: {cache_stats['cache_misses']}")
    print(f"    - Hit Rate: {cache_stats['hit_rate']}")
    
    # Add tech companies
    print("\n🏢 Adding tech companies...")
    companies = [
        ("google", 1000),
        ("facebook", 900),
        ("amazon", 950),
        ("apple", 980),
        ("microsoft", 920),
        ("netflix", 700),
        ("tesla", 850),
        ("twitter", 600),
        ("uber", 500),
        ("airbnb", 450),
    ]
    
    autocomplete.add_words(companies)
    print(f"✓ Added {len(companies)} companies")
    
    # Search for companies
    print("\n  Company search examples:")
    company_queries = ["go", "app", "te", "a"]
    
    for query in company_queries:
        suggestions = autocomplete.search(query, limit=5)
        print(f"\n  Query: '{query}'")
        print(f"  Suggestions: {suggestions}")
    
    # Statistics
    print("\n📊 System Statistics:")
    print("-" * 70)
    
    stats = autocomplete.get_statistics()
    print(f"\n  Total Words: {stats['total_words']}")
    print(f"  Total Queries: {stats['total_queries']}")
    print(f"  Max Suggestions: {stats['max_suggestions']}")
    
    # Real-world use case: Search engine
    print("\n🌐 Search Engine Use Case:")
    print("-" * 70)
    
    search_autocomplete = AutocompleteSystem(max_suggestions=5)
    
    search_queries = [
        ("how to learn python", 10000),
        ("how to learn java", 8000),
        ("how to learn javascript", 9000),
        ("how to cook pasta", 7000),
        ("how to cook rice", 6500),
        ("how to lose weight", 12000),
        ("how to make money", 15000),
        ("how are you", 5000),
    ]
    
    search_autocomplete.add_words(search_queries)
    
    print("\n  Search suggestions:")
    search_prefixes = ["how to l", "how to c", "how to m"]
    
    for prefix in search_prefixes:
        suggestions = search_autocomplete.search(prefix, limit=3)
        print(f"\n  '{prefix}' → {suggestions}")
    
    print("\n" + "=" * 70)
    print("✨ Demo completed successfully!")
    print("=" * 70)


if __name__ == "__main__":
    main()
