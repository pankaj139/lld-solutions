# Autocomplete / Typeahead System

## 🔗 Implementation Links

- **Python Implementation**: [python/autocomplete-typeahead/main.py](python/autocomplete-typeahead/main.py)
- **JavaScript Implementation**: [javascript/autocomplete-typeahead/main.js](javascript/autocomplete-typeahead/main.js)

## Problem Statement

Design an autocomplete/typeahead system that can:

1. **Provide real-time suggestions** as users type
2. **Support prefix-based search** with high performance
3. **Rank suggestions by popularity** or relevance
4. **Handle large dictionaries** efficiently (millions of words)
5. **Support fuzzy matching** for typo tolerance
6. **Cache frequent queries** for better performance
7. **Scale to handle high request volume**

## Requirements

### Functional Requirements

- Add words/phrases to the dictionary
- Search for suggestions based on prefix
- Return top-k most relevant suggestions
- Support weighted/ranked suggestions based on popularity
- Handle case-insensitive searches
- Support phrase autocomplete (multi-word)
- Update suggestion weights dynamically
- Remove words from dictionary
- Support multiple languages and character sets

### Non-Functional Requirements

- Search latency < 100ms for typical queries
- Support millions of words in dictionary
- Memory-efficient storage
- Handle 10,000+ queries per second
- Support concurrent read operations
- Real-time weight updates
- Scalable to distributed systems

## Design Decisions

### Key Data Structures

1. **Trie (Prefix Tree)**
   - Core data structure for prefix matching
   - Each node represents a character
   - Efficient O(m) search where m is prefix length
   - Memory-efficient for common prefixes

2. **Priority Queue / Heap**
   - Rank suggestions by weight/popularity
   - Return top-k results efficiently
   - O(log k) insertion for k suggestions

3. **LRU Cache**
   - Cache frequent queries
   - O(1) cache lookup
   - Improve response time for popular searches

### Design Patterns Used

1. **Trie Pattern**: Efficient prefix-based search using tree structure
2. **Strategy Pattern**: Different ranking strategies (popularity, recency, relevance)
3. **Observer Pattern**: Update suggestions when dictionary changes
4. **Singleton Pattern**: Single shared dictionary instance
5. **Factory Pattern**: Create different types of autocomplete engines
6. **Decorator Pattern**: Add features like caching, logging to base autocomplete

### Key Features

- **Fast Prefix Search**: O(p + n) where p is prefix length, n is number of matches
- **Weighted Suggestions**: Rank by popularity, frequency, or custom metrics
- **Fuzzy Matching**: Tolerate typos using edit distance
- **Multi-word Support**: Autocomplete phrases and sentences
- **Real-time Updates**: Dynamic weight adjustments
- **Query Caching**: Cache popular searches for sub-millisecond response
- **Personalization**: User-specific suggestions

## Class Diagram

```text
TrieNode
├── character: char
├── children: Dict[char, TrieNode]
├── is_end_of_word: bool
├── weight: int
├── word: str
└── frequency: int

Trie
├── root: TrieNode
├── insert(word: str, weight: int)
├── search(prefix: str)
├── delete(word: str)
├── get_all_words_with_prefix(prefix: str)
└── update_weight(word: str, weight: int)

Suggestion
├── word: str
├── weight: int
├── rank: int
└── metadata: Dict

AutocompleteSystem
├── trie: Trie
├── cache: LRUCache
├── ranking_strategy: RankingStrategy
├── search(prefix: str, limit: int)
├── add_word(word: str, weight: int)
├── remove_word(word: str)
├── update_popularity(word: str)
└── get_suggestions(prefix: str, limit: int)

RankingStrategy (Interface)
├── rank(suggestions: List[Suggestion])
└── implementations:
    ├── PopularityRanking
    ├── RecencyRanking
    ├── PersonalizedRanking
    └── HybridRanking

FuzzyMatcher
├── max_edit_distance: int
├── find_similar_words(word: str)
├── calculate_edit_distance(word1: str, word2: str)
└── get_fuzzy_suggestions(prefix: str)
```

## Usage Example

```python
# Initialize autocomplete system
autocomplete = AutocompleteSystem(max_suggestions=10)

# Add words with weights
autocomplete.add_word("apple", weight=100)
autocomplete.add_word("application", weight=80)
autocomplete.add_word("apply", weight=60)
autocomplete.add_word("appreciate", weight=40)

# Get suggestions
suggestions = autocomplete.search("app", limit=5)
# Returns: ["apple", "application", "apply", "appreciate"]

# Update popularity (e.g., user selected "application")
autocomplete.update_popularity("application")

# Search again - "application" now ranks higher
suggestions = autocomplete.search("app", limit=5)
# Returns: ["application", "apple", "apply", "appreciate"]

# Fuzzy search for typos
suggestions = autocomplete.fuzzy_search("aple", limit=3)
# Returns: ["apple", "apply", "appreciate"]

# Multi-word autocomplete
autocomplete.add_word("apple pie recipe", weight=90)
autocomplete.add_word("apple iphone", weight=95)
suggestions = autocomplete.search("apple", limit=5)
```

## Algorithms

### Trie Insertion

```text
Algorithm: INSERT(word, weight)
Input: word - string to insert, weight - popularity score
Output: None

1. current = root
2. For each character c in word:
     a. If c not in current.children:
          - Create new TrieNode for c
     b. current = current.children[c]
3. current.is_end_of_word = True
4. current.weight = weight
5. current.word = word

Time Complexity: O(m) where m is word length
Space Complexity: O(m) for new nodes
```

### Prefix Search

```text
Algorithm: SEARCH(prefix, limit)
Input: prefix - search string, limit - max suggestions
Output: List of top-k suggestions

1. current = root
2. For each character c in prefix:
     a. If c not in current.children:
          - Return empty list
     b. current = current.children[c]

3. suggestions = []
4. DFS_COLLECT(current, suggestions)
5. Sort suggestions by weight (descending)
6. Return top 'limit' suggestions

DFS_COLLECT(node, suggestions):
1. If node.is_end_of_word:
     - Add (node.word, node.weight) to suggestions
2. For each child in node.children:
     - DFS_COLLECT(child, suggestions)

Time Complexity: O(p + n*log(n)) where p = prefix length, n = matches
Space Complexity: O(n) for storing suggestions
```

### Fuzzy Matching (Edit Distance)

```text
Algorithm: EDIT_DISTANCE(word1, word2)
Input: Two strings to compare
Output: Minimum edit distance

Use Dynamic Programming:
1. Create matrix dp[m+1][n+1]
2. dp[i][0] = i, dp[0][j] = j
3. For i from 1 to m:
     For j from 1 to n:
       If word1[i-1] == word2[j-1]:
         dp[i][j] = dp[i-1][j-1]
       Else:
         dp[i][j] = 1 + min(
           dp[i-1][j],    # deletion
           dp[i][j-1],    # insertion
           dp[i-1][j-1]   # substitution
         )
4. Return dp[m][n]

Time Complexity: O(m*n) where m, n are word lengths
Space Complexity: O(m*n) for DP table
```

## Optimization Techniques

### 1. Query Caching

```python
class CachedAutocomplete:
    def __init__(self, autocomplete, cache_size=1000):
        self.autocomplete = autocomplete
        self.cache = LRUCache(cache_size)
    
    def search(self, prefix, limit):
        cache_key = f"{prefix}:{limit}"
        if cache_key in self.cache:
            return self.cache.get(cache_key)
        
        results = self.autocomplete.search(prefix, limit)
        self.cache.put(cache_key, results)
        return results
```

### 2. Top-K Optimization

Instead of collecting all matches and sorting, use a min-heap of size k:

```python
import heapq

def get_top_k_suggestions(node, k):
    min_heap = []
    
    def dfs(node):
        if len(min_heap) >= k and node.weight <= min_heap[0][0]:
            return  # Prune subtree
        
        if node.is_end_of_word:
            if len(min_heap) < k:
                heapq.heappush(min_heap, (node.weight, node.word))
            elif node.weight > min_heap[0][0]:
                heapq.heapreplace(min_heap, (node.weight, node.word))
        
        for child in node.children.values():
            dfs(child)
    
    dfs(node)
    return sorted(min_heap, key=lambda x: -x[0])
```

### 3. Compact Trie (Patricia Trie)

Compress chains of single-child nodes to save memory:

```text
Normal Trie:
  a -> p -> p -> l -> e

Patricia Trie:
  "apple"

Saves: 60-80% memory for real-world data
```

### 4. Distributed Trie

For massive scale, partition trie by prefix ranges:

```text
Server 1: Handles a-g
Server 2: Handles h-n
Server 3: Handles o-u
Server 4: Handles v-z

Load Balancer routes based on first character
```

## Advanced Features

### 1. Personalized Suggestions

```python
class PersonalizedAutocomplete:
    def __init__(self):
        self.global_trie = Trie()
        self.user_history = {}  # user_id -> search history
    
    def search(self, user_id, prefix, limit):
        global_suggestions = self.global_trie.search(prefix, limit * 2)
        user_history = self.user_history.get(user_id, [])
        
        # Boost suggestions from user history
        personalized = []
        for suggestion in global_suggestions:
            boost = 1.5 if suggestion in user_history else 1.0
            personalized.append((suggestion, score * boost))
        
        personalized.sort(key=lambda x: -x[1])
        return personalized[:limit]
```

### 2. Contextual Autocomplete

```python
class ContextualAutocomplete:
    def search(self, prefix, context):
        # context: {'location': 'US', 'category': 'tech', 'time': 'evening'}
        
        # Different suggestions based on context
        if context['category'] == 'tech':
            return tech_trie.search(prefix, limit)
        elif context['category'] == 'food':
            return food_trie.search(prefix, limit)
```

### 3. Multi-Language Support

```python
class MultiLanguageAutocomplete:
    def __init__(self):
        self.tries = {
            'en': Trie(),
            'es': Trie(),
            'fr': Trie(),
            'de': Trie()
        }
    
    def search(self, prefix, language, limit):
        trie = self.tries.get(language, self.tries['en'])
        return trie.search(prefix, limit)
```

### 4. Emoji and Unicode Support

```python
# Support Unicode characters
autocomplete.add_word("café", weight=50)
autocomplete.add_word("😀 smiley", weight=30)
suggestions = autocomplete.search("ca", limit=5)
# Returns: ["café", "cat", "car", ...]
```

## Real-World Applications

### 1. Search Engines (Google, Bing)

```python
# Google-style autocomplete
google_autocomplete = AutocompleteSystem()
google_autocomplete.add_word("python programming", weight=10000)
google_autocomplete.add_word("python tutorial", weight=8000)
google_autocomplete.add_word("python snake", weight=2000)

suggestions = google_autocomplete.search("pyth", limit=10)
```

### 2. E-commerce (Amazon, eBay)

```python
# Product search autocomplete
product_autocomplete = AutocompleteSystem()
product_autocomplete.add_word("iPhone 15 Pro Max", weight=5000)
product_autocomplete.add_word("iPhone charger", weight=3000)
product_autocomplete.add_word("iPhone case", weight=4000)

suggestions = product_autocomplete.search("iphone", limit=5)
```

### 3. Social Media (Twitter, Facebook)

```python
# Hashtag and @mention autocomplete
social_autocomplete = AutocompleteSystem()
social_autocomplete.add_word("#python", weight=1000)
social_autocomplete.add_word("#programming", weight=800)
social_autocomplete.add_word("@pythondeveloper", weight=500)

suggestions = social_autocomplete.search("#py", limit=5)
```

### 4. IDE Code Completion (VSCode, IntelliJ)

```python
# Code completion
code_autocomplete = AutocompleteSystem()
code_autocomplete.add_word("print()", weight=1000)
code_autocomplete.add_word("println()", weight=500)
code_autocomplete.add_word("printf()", weight=300)

suggestions = code_autocomplete.search("prin", limit=5)
```

## Performance Benchmarks

### Time Complexity

| Operation | Best Case | Average Case | Worst Case |
|-----------|-----------|--------------|------------|
| Insert | O(m) | O(m) | O(m) |
| Search Prefix | O(p) | O(p) | O(p) |
| Get Suggestions | O(p + n log k) | O(p + n log k) | O(p + n log k) |
| Delete | O(m) | O(m) | O(m) |
| Update Weight | O(m) | O(m) | O(m) |

*m = word length, p = prefix length, n = number of matches, k = suggestions limit*

### Space Complexity

| Component | Space |
|-----------|-------|
| Trie Structure | O(ALPHABET_SIZE * N * M) |
| Compact Trie | O(N * M) |
| Cache | O(C * K) |
| Total | O(N * M + C * K) |

*N = number of words, M = average word length, C = cache size, K = suggestions per query*

### Practical Performance

```text
Dictionary Size: 1 million words
Average Query Time:
  - Without cache: 5-10ms
  - With cache: 0.1-0.5ms
  - Cache hit rate: 70-80%

Memory Usage:
  - Standard Trie: ~500MB
  - Compact Trie: ~200MB
  - Cache (10K entries): ~50MB
```

## Scaling Strategies

### 1. Horizontal Scaling

```text
┌─────────────┐
│Load Balancer│
└──────┬──────┘
       │
   ┌───┴───┬───────┬───────┐
   │       │       │       │
┌──▼──┐ ┌──▼──┐ ┌──▼──┐ ┌──▼──┐
│Shard│ │Shard│ │Shard│ │Shard│
│ A-F │ │ G-M │ │ N-S │ │ T-Z │
└─────┘ └─────┘ └─────┘ └─────┘
```

### 2. Caching Strategy

```text
┌──────────┐
│  Client  │
└────┬─────┘
     │
┌────▼─────────┐
│Browser Cache │ (Local Storage)
└────┬─────────┘
     │
┌────▼─────────┐
│  CDN Cache   │ (Edge Locations)
└────┬─────────┘
     │
┌────▼─────────┐
│ Redis Cache  │ (Distributed)
└────┬─────────┘
     │
┌────▼─────────┐
│Trie Database │ (Source of Truth)
└──────────────┘
```

### 3. Replication

```text
Master Trie (Write)
    │
    ├── Replica 1 (Read)
    ├── Replica 2 (Read)
    ├── Replica 3 (Read)
    └── Replica N (Read)

Write to master, read from replicas
```

## Security Considerations

1. **Input Validation**: Sanitize user input to prevent injection attacks
2. **Rate Limiting**: Prevent abuse and DoS attacks
3. **Access Control**: Restrict dictionary updates to authorized users
4. **Query Logging**: Monitor for suspicious patterns
5. **Data Privacy**: Don't leak sensitive data in suggestions

## Testing Scenarios

### Unit Tests

```python
def test_basic_insertion():
    trie = Trie()
    trie.insert("hello", 10)
    assert trie.search("hel") == ["hello"]

def test_weighted_suggestions():
    autocomplete = AutocompleteSystem()
    autocomplete.add_word("apple", 100)
    autocomplete.add_word("application", 50)
    suggestions = autocomplete.search("app", 5)
    assert suggestions[0] == "apple"  # Higher weight comes first

def test_fuzzy_matching():
    autocomplete = AutocompleteSystem()
    autocomplete.add_word("hello", 10)
    suggestions = autocomplete.fuzzy_search("helo", 1)
    assert "hello" in suggestions

def test_empty_prefix():
    autocomplete = AutocompleteSystem()
    suggestions = autocomplete.search("", 5)
    assert isinstance(suggestions, list)
```

### Performance Tests

```python
def test_large_dictionary():
    autocomplete = AutocompleteSystem()
    
    # Insert 1 million words
    for i in range(1_000_000):
        autocomplete.add_word(f"word{i}", i)
    
    # Measure query time
    start = time.time()
    suggestions = autocomplete.search("word123", 10)
    duration = time.time() - start
    
    assert duration < 0.1  # Less than 100ms
```

## Interview Discussion Points

1. **Why use Trie over HashMap?**
   - Trie: O(p) prefix search, memory-efficient for common prefixes
   - HashMap: O(n) prefix search, must scan all keys

2. **How to handle million+ words?**
   - Compact Trie to reduce memory
   - Partition by prefix ranges
   - Cache frequent queries

3. **How to rank suggestions?**
   - Weighted by popularity/frequency
   - Boost by recency
   - Personalize by user history
   - Context-aware ranking

4. **How to handle typos?**
   - Fuzzy matching with edit distance
   - Phonetic matching (Soundex, Metaphone)
   - Common typo patterns

5. **How to scale to billions of queries?**
   - Distributed tries with sharding
   - Multi-level caching (browser, CDN, server)
   - Read replicas
   - Async processing

6. **Memory vs Speed tradeoff?**
   - More memory: Cache more, faster responses
   - Less memory: Compact trie, slightly slower
   - Hybrid: Cache hot queries, compact storage for rest

## Trade-offs

| Approach | Pros | Cons |
|----------|------|------|
| **Standard Trie** | Simple, fast search | High memory usage |
| **Compact Trie** | Memory efficient | Complex implementation |
| **Ternary Search Tree** | Balanced memory/speed | Slower than trie |
| **Inverted Index** | Fast for full-text | Poor for prefix search |
| **Database LIKE** | Simple, no extra structure | Very slow O(n) |

## Extensions and Improvements

1. **Machine Learning Integration**: Use ML models for better ranking
2. **Natural Language Processing**: Understand query intent
3. **Voice Search**: Convert speech to text and autocomplete
4. **Image Search**: Autocomplete for image descriptions
5. **Multi-modal**: Combine text, voice, and images
6. **Real-time Trends**: Adjust suggestions based on trending topics
7. **A/B Testing**: Test different ranking strategies
8. **Analytics**: Track query patterns and user behavior
