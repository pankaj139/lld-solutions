# LFU Cache - Low Level Design

## Table of Contents

- [Overview](#overview)
- [Requirements](#requirements)
  - [Functional Requirements](#functional-requirements)
  - [Non-Functional Requirements](#non-functional-requirements)
- [Core Use Cases](#core-use-cases)
- [Design Patterns Used](#design-patterns-used)
- [Class Diagram](#class-diagram)
- [Component Design](#component-design)
- [Data Structures](#data-structures)
- [API Design](#api-design)
- [Implementation Details](#implementation-details)
- [Complexity Analysis](#complexity-analysis)
- [Trade-offs and Design Decisions](#trade-offs-and-design-decisions)

## Overview

An LFU (Least Frequently Used) Cache is a data structure that stores key-value pairs with a fixed capacity. When the cache is full, it evicts the least frequently used item. If multiple items have the same frequency, it evicts the least recently used among them (LRU tie-breaking). This is a classic FAANG interview problem that requires O(1) time complexity for all operations.

### Key Features

- **O(1) Get**: Retrieve value by key in constant time
- **O(1) Put**: Insert/update key-value pair in constant time
- **O(1) Eviction**: Remove least frequently used item in constant time
- **Frequency Tracking**: Track access count for each key
- **LRU Tie-Breaking**: Among items with same frequency, evict least recently used
- **Capacity Management**: Fixed maximum capacity with automatic eviction
- **Statistics**: Track cache hits, misses, evictions

## Requirements

### Functional Requirements

1. **Cache Operations**
   - `get(key)`: Retrieve value for key, increment frequency
   - `put(key, value)`: Insert or update key-value pair
   - Automatic eviction when capacity is full
   - Update frequency on every access

2. **Eviction Policy**
   - Remove least frequently used item
   - If tie (same frequency), remove least recently used
   - Eviction happens automatically on `put()` when full

3. **Frequency Management**
   - Track access frequency for each key
   - Increment frequency on every `get()` and `put()` (update)
   - Start at frequency 1 for new items
   - Move item to higher frequency list on access

4. **Statistics**
   - Track total gets, puts, hits, misses
   - Track eviction count
   - Calculate hit rate
   - Track current size and capacity

5. **Additional Operations**
   - `clear()`: Remove all entries
   - `size()`: Get current number of entries
   - `capacity()`: Get maximum capacity
   - `contains(key)`: Check if key exists (without updating frequency)

### Non-Functional Requirements

1. **Performance**
   - O(1) time complexity for get()
   - O(1) time complexity for put()
   - O(1) time complexity for eviction
   - Minimal memory overhead

2. **Scalability**
   - Handle millions of entries
   - Efficient memory usage
   - No performance degradation with size

3. **Concurrency** (Optional)
   - Thread-safe operations
   - Lock-free reads where possible
   - Minimal lock contention

4. **Reliability**
   - Accurate frequency tracking
   - Correct LRU tie-breaking
   - No memory leaks

## Core Use Cases

### Use Case 1: Get Value from Cache

```text
Actor: Application
Precondition: Cache is initialized

Main Flow:
1. Application calls get(key)
2. Cache checks if key exists
3. If exists:
   a. Retrieve value
   b. Increment frequency count
   c. Move to appropriate frequency list
   d. Update as most recently used in that frequency
   e. Return value (HIT)
4. If not exists:
   a. Return null/None (MISS)

Time Complexity: O(1)
```

### Use Case 2: Put Value into Cache

```text
Actor: Application
Precondition: Cache is initialized

Main Flow:
1. Application calls put(key, value)
2. Cache checks if key exists
3. If exists (UPDATE):
   a. Update value
   b. Increment frequency
   c. Move to higher frequency list
   d. Mark as most recently used
4. If not exists (INSERT):
   a. Check if cache is full
   b. If full, evict LFU item:
      - Find item with minimum frequency
      - Among items with min freq, evict LRU
      - Remove from all data structures
   c. Insert new key-value pair
   d. Set frequency to 1
   e. Add to frequency-1 list
   f. Mark as most recently used

Time Complexity: O(1)
```

### Use Case 3: Evict Least Frequently Used Item

```text
Actor: Cache (internal)
Precondition: Cache is at capacity

Main Flow:
1. Identify minimum frequency (tracked separately)
2. Get list of items with minimum frequency
3. Select least recently used item from that list (head of list)
4. Remove item from:
   a. Key-value map
   b. Key-frequency map
   c. Frequency list
5. Decrement cache size
6. Update minimum frequency if needed

Time Complexity: O(1)
```

## Design Patterns Used

### 1. Strategy Pattern

- **Purpose**: Different eviction strategies
- **Usage**: LFUStrategy, LRUStrategy, FIFOStrategy
- **Benefit**: Pluggable eviction policies

### 2. Template Method Pattern

- **Purpose**: Common cache operation flow
- **Usage**: Abstract Cache class with template methods
- **Benefit**: Consistent behavior across cache types

### 3. Observer Pattern

- **Purpose**: Notify on cache events
- **Usage**: Observers for hits, misses, evictions
- **Benefit**: Monitoring and logging

### 4. Factory Pattern

- **Purpose**: Create different cache types
- **Usage**: CacheFactory creates LFU, LRU, FIFO caches
- **Benefit**: Centralized cache creation

### 5. Singleton Pattern

- **Purpose**: Global cache instance
- **Usage**: Singleton cache for application-wide use
- **Benefit**: Single source of cached data

### 6. Decorator Pattern

- **Purpose**: Add features to cache
- **Usage**: TimedCache, PersistentCache, StatsCache
- **Benefit**: Dynamic feature addition

## Class Diagram

```text
┌─────────────────────────────────┐
│   LFUCache                      │
├─────────────────────────────────┤
│ - capacity: int                 │
│ - size: int                     │
│ - min_frequency: int            │
│ - cache: Map<K, Node>           │
│ - freq_map: Map<int, DLList>    │
│ - key_freq: Map<K, int>         │
│ - hits: int                     │
│ - misses: int                   │
│ - evictions: int                │
├─────────────────────────────────┤
│ + get(key: K): V                │
│ + put(key: K, value: V)         │
│ + size(): int                   │
│ + clear()                       │
│ + get_stats(): CacheStats       │
│ - evict()                       │
│ - increment_frequency(key: K)   │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│   Node                          │
├─────────────────────────────────┤
│ - key: K                        │
│ - value: V                      │
│ - frequency: int                │
│ - prev: Node                    │
│ - next: Node                    │
├─────────────────────────────────┤
│ + __init__(key, value)          │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│   DoublyLinkedList              │
├─────────────────────────────────┤
│ - head: Node (sentinel)         │
│ - tail: Node (sentinel)         │
│ - size: int                     │
├─────────────────────────────────┤
│ + add_to_head(node: Node)       │
│ + remove_node(node: Node)       │
│ + remove_tail(): Node           │
│ + is_empty(): bool              │
│ + size(): int                   │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│   CacheStats                    │
├─────────────────────────────────┤
│ - total_gets: int               │
│ - total_puts: int               │
│ - hits: int                     │
│ - misses: int                   │
│ - evictions: int                │
│ - hit_rate: float               │
├─────────────────────────────────┤
│ + calculate_hit_rate(): float   │
│ + __str__(): str                │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│   EvictionStrategy              │
│   <<interface>>                 │
├─────────────────────────────────┤
│ + evict(cache): K               │
└─────────────────────────────────┘
         ▲
         │
    ┌────┴─────┬──────────┐
    │          │          │
┌───┴───────┐ ┌┴────────┐ ┌┴───────┐
│LFU        │ │LRU      │ │FIFO    │
│Strategy   │ │Strategy │ │Strategy│
└───────────┘ └─────────┘ └────────┘

┌─────────────────────────────────┐
│   CacheObserver                 │
│   <<interface>>                 │
├─────────────────────────────────┤
│ + on_hit(key)                   │
│ + on_miss(key)                  │
│ + on_evict(key, value)          │
│ + on_put(key, value)            │
└─────────────────────────────────┘
```

## Component Design

### 1. LFU Cache Core

```python
class LFUCache:
    """
    LFU Cache with O(1) operations.
    
    Usage:
        cache = LFUCache(capacity=100)
        cache.put("key1", "value1")
        value = cache.get("key1")
    
    Data Structures:
        - cache: HashMap for O(1) key-value access
        - freq_map: HashMap of frequency -> DoublyLinkedList
        - key_freq: HashMap to track frequency of each key
        - min_frequency: Track minimum frequency for eviction
    
    Returns:
        LFUCache instance with O(1) operations
    """
    
    def __init__(self, capacity: int):
        self.capacity = capacity
        self.size = 0
        self.min_frequency = 0
        
        # Main cache: key -> Node
        self.cache: Dict[Any, Node] = {}
        
        # Frequency map: frequency -> DoublyLinkedList
        self.freq_map: Dict[int, DoublyLinkedList] = {}
        
        # Track frequency of each key
        self.key_freq: Dict[Any, int] = {}
        
        # Statistics
        self.hits = 0
        self.misses = 0
        self.evictions = 0
```

### 2. Node Component

```python
class Node:
    """
    Doubly linked list node for cache entries.
    
    Usage:
        node = Node(key, value)
    """
    
    def __init__(self, key, value):
        self.key = key
        self.value = value
        self.frequency = 1
        self.prev = None
        self.next = None
```

### 3. Doubly Linked List

```python
class DoublyLinkedList:
    """
    Doubly linked list with sentinel nodes.
    
    Purpose: Maintain LRU order within same frequency
    
    Usage:
        dll = DoublyLinkedList()
        dll.add_to_head(node)
        removed = dll.remove_tail()
    """
    
    def __init__(self):
        self.head = Node(None, None)  # Sentinel
        self.tail = Node(None, None)  # Sentinel
        self.head.next = self.tail
        self.tail.prev = self.head
        self._size = 0
```

## Data Structures

### 1. Hash Map (Main Cache)

```text
Purpose: O(1) key-value access
Structure: Dict[Key, Node]
Operations:
  - Access: O(1)
  - Insert: O(1)
  - Delete: O(1)

Usage: cache[key] = node
```

### 2. Frequency Map

```text
Purpose: Group nodes by frequency
Structure: Dict[int, DoublyLinkedList]
Operations:
  - Access frequency list: O(1)
  - Add to list: O(1)
  - Remove from list: O(1)

Usage: freq_map[frequency] = list_of_nodes
```

### 3. Doubly Linked List (Data Structure)

```text
Purpose: Maintain LRU order within same frequency
Structure: Sentinel nodes + data nodes
Operations:
  - Add to head (most recent): O(1)
  - Remove from tail (least recent): O(1)
  - Remove specific node: O(1)

Usage: For LRU tie-breaking within same frequency
```

### 4. Key-Frequency Map

```text
Purpose: Track frequency of each key
Structure: Dict[Key, int]
Operations:
  - Get frequency: O(1)
  - Update frequency: O(1)

Usage: key_freq[key] = frequency
```

## API Design

### Core Operations

```python
# Basic Operations
get(key: K) -> V | None
    """
    Get value for key, increment frequency.
    Returns None if key not found.
    Time: O(1)
    """

put(key: K, value: V) -> None
    """
    Insert or update key-value pair.
    Evicts LFU item if at capacity.
    Time: O(1)
    """

# Utility Operations
size() -> int
    """Get current number of entries. Time: O(1)"""

capacity() -> int
    """Get maximum capacity. Time: O(1)"""

clear() -> None
    """Remove all entries. Time: O(n)"""

contains(key: K) -> bool
    """Check if key exists (without updating frequency). Time: O(1)"""

# Statistics
get_stats() -> CacheStats
    """Get cache statistics"""

get_hit_rate() -> float
    """Calculate hit rate = hits / (hits + misses)"""
```

## Implementation Details

### 1. Get Operation

```python
def get(self, key):
    """
    Get value for key with O(1) complexity.
    
    Algorithm:
        1. Check if key exists in cache
        2. If not exists, return None (MISS)
        3. If exists:
           a. Get current node
           b. Increment frequency
           c. Move to appropriate frequency list
           d. Update min_frequency if needed
           e. Return value (HIT)
    
    Time Complexity: O(1)
    Space Complexity: O(1)
    """
    if key not in self.cache:
        self.misses += 1
        return None
    
    # Hit - increment frequency and update position
    node = self.cache[key]
    self._increment_frequency(key)
    self.hits += 1
    
    return node.value


def _increment_frequency(self, key):
    """
    Move node to higher frequency list.
    
    Algorithm:
        1. Get current frequency
        2. Remove node from current frequency list
        3. If list becomes empty and is min_frequency, increment min_frequency
        4. Increment frequency
        5. Add node to new frequency list
        6. Update key_freq map
    
    Time Complexity: O(1)
    """
    # Get current frequency
    freq = self.key_freq[key]
    node = self.cache[key]
    
    # Remove from current frequency list
    self.freq_map[freq].remove_node(node)
    
    # If current frequency list is empty and it's min_frequency
    if self.freq_map[freq].is_empty() and freq == self.min_frequency:
        self.min_frequency += 1
    
    # Increment frequency
    freq += 1
    self.key_freq[key] = freq
    
    # Add to new frequency list
    if freq not in self.freq_map:
        self.freq_map[freq] = DoublyLinkedList()
    self.freq_map[freq].add_to_head(node)
```

### 2. Put Operation

```python
def put(self, key, value):
    """
    Insert or update key-value pair with O(1) complexity.
    
    Algorithm:
        1. If capacity is 0, return
        2. If key exists (UPDATE):
           a. Update value
           b. Increment frequency
        3. If key doesn't exist (INSERT):
           a. If at capacity, evict LFU item
           b. Create new node with frequency 1
           c. Add to cache
           d. Add to frequency-1 list
           e. Set min_frequency to 1
    
    Time Complexity: O(1)
    Space Complexity: O(1)
    """
    if self.capacity == 0:
        return
    
    # Update existing key
    if key in self.cache:
        node = self.cache[key]
        node.value = value
        self._increment_frequency(key)
        return
    
    # Insert new key
    if self.size >= self.capacity:
        self._evict()
    
    # Create new node
    node = Node(key, value)
    self.cache[key] = node
    self.key_freq[key] = 1
    
    # Add to frequency-1 list
    if 1 not in self.freq_map:
        self.freq_map[1] = DoublyLinkedList()
    self.freq_map[1].add_to_head(node)
    
    # Update min_frequency
    self.min_frequency = 1
    self.size += 1


def _evict(self):
    """
    Evict least frequently used item with O(1) complexity.
    
    Algorithm:
        1. Get list at min_frequency
        2. Remove tail node (least recently used)
        3. Remove from all data structures
        4. Update statistics
    
    Time Complexity: O(1)
    """
    # Get list at min_frequency
    freq_list = self.freq_map[self.min_frequency]
    
    # Remove tail (LRU item at min frequency)
    node_to_remove = freq_list.remove_tail()
    
    if node_to_remove:
        # Remove from cache
        del self.cache[node_to_remove.key]
        del self.key_freq[node_to_remove.key]
        
        self.size -= 1
        self.evictions += 1
```

### 3. Doubly Linked List Operations

```python
class DoublyLinkedList:
    """Doubly linked list with sentinel nodes"""
    
    def add_to_head(self, node):
        """
        Add node to head (most recent position).
        
        Time Complexity: O(1)
        """
        node.next = self.head.next
        node.prev = self.head
        self.head.next.prev = node
        self.head.next = node
        self._size += 1
    
    def remove_node(self, node):
        """
        Remove specific node from list.
        
        Time Complexity: O(1)
        """
        node.prev.next = node.next
        node.next.prev = node.prev
        self._size -= 1
    
    def remove_tail(self):
        """
        Remove and return tail node (least recent).
        
        Time Complexity: O(1)
        """
        if self.is_empty():
            return None
        
        node = self.tail.prev
        self.remove_node(node)
        return node
    
    def is_empty(self):
        """Check if list is empty. Time: O(1)"""
        return self._size == 0
```

### 4. Statistics Tracking

```python
def get_stats(self):
    """
    Get cache statistics.
    
    Returns:
        CacheStats with hits, misses, evictions, hit rate
    """
    total_requests = self.hits + self.misses
    hit_rate = self.hits / total_requests if total_requests > 0 else 0.0
    
    return CacheStats(
        total_gets=total_requests,
        total_puts=self.size + self.evictions,
        hits=self.hits,
        misses=self.misses,
        evictions=self.evictions,
        hit_rate=hit_rate,
        current_size=self.size,
        capacity=self.capacity
    )
```

## Complexity Analysis

### Time Complexity

| Operation | Complexity | Explanation |
|-----------|------------|-------------|
| `get(key)` | O(1) | HashMap lookup + DLL operations |
| `put(key, value)` | O(1) | HashMap insert + DLL operations |
| `evict()` | O(1) | Access min_frequency list, remove tail |
| `increment_frequency()` | O(1) | Remove from one list, add to another |
| `size()` | O(1) | Return stored value |
| `clear()` | O(n) | Iterate through all entries |

### Space Complexity

| Component | Complexity | Notes |
|-----------|------------|-------|
| Main cache | O(n) | n = number of entries |
| Frequency map | O(n) | Each node appears in exactly one list |
| Key-frequency map | O(n) | One entry per key |
| Doubly linked lists | O(n) | All nodes distributed across lists |
| **Total** | **O(n)** | Linear space complexity |

### Comparison with LRU Cache

| Aspect | LRU Cache | LFU Cache |
|--------|-----------|-----------|
| Eviction Policy | Least Recently Used | Least Frequently Used |
| Time Complexity | O(1) for all ops | O(1) for all ops |
| Space Complexity | O(n) | O(n) |
| Data Structures | HashMap + 1 DLL | HashMap + Multiple DLLs + Frequency Map |
| Implementation Complexity | Medium | Hard |
| Use Case | Temporal locality | Access frequency matters |

## Trade-offs and Design Decisions

### 1. LFU vs. LRU Eviction

**Decision:** Implement LFU with LRU tie-breaking

| Policy | Pros | Cons | Best For |
|--------|------|------|----------|
| LFU | Keeps frequently accessed items | Ignores recent trends | Stable access patterns |
| LRU | Adapts to recent trends | Ignores overall frequency | Temporal locality |
| LFU + LRU tie-break | Best of both worlds | More complex | General purpose |

**Rationale:** LFU with LRU tie-breaking provides better hit rates for most workloads.

### 2. Data Structure Choice

**Decision:** HashMap + Multiple Doubly Linked Lists

**Pros:**

- O(1) operations for all methods
- Efficient frequency updates
- Natural LRU ordering within frequency

**Cons:**

- More complex than single list
- Higher memory overhead
- More pointers to maintain

**Alternative Considered:**

- Min-Heap for frequencies: O(log n) operations ❌
- Single sorted list: O(n) to find LFU ❌

### 3. Frequency Counter Storage

**Decision:** Store frequency in separate HashMap

**Pros:**

- O(1) frequency lookup
- Easy to update
- Decoupled from node

**Cons:**

- Additional memory
- Need to keep in sync

**Rationale:** O(1) access is worth the extra memory.

### 4. Minimum Frequency Tracking

**Decision:** Maintain `min_frequency` variable

**Pros:**

- O(1) access to minimum frequency
- Enables O(1) eviction
- Simple to update

**Cons:**

- Need to track and update carefully
- Can only be accurate if updated on every operation

**Rationale:** Critical for O(1) eviction performance.

### 5. Sentinel Nodes in Doubly Linked List

**Decision:** Use head and tail sentinel nodes

**Pros:**

- Eliminates null checks
- Simpler insertion/deletion code
- Consistent boundary handling

**Cons:**

- Two extra nodes per list
- Slightly more memory

**Rationale:** Code simplicity and correctness > minimal memory overhead.

### 6. Statistics Tracking

**Decision:** Track hits, misses, evictions inline

| Approach | Performance | Accuracy | Flexibility |
|----------|-------------|----------|-------------|
| Inline tracking | No overhead | 100% | Limited |
| Observer pattern | Small overhead | 100% | High |
| Sampling | Minimal | ~95% | High |

**Rationale:** Inline tracking has negligible overhead and provides accurate statistics.

## Business Rules

### Rule 1: Frequency Initialization

```text
New items start at frequency 1
Rationale: Fair starting point, prevents immediate eviction
```

### Rule 2: Frequency on Update

```text
Updating existing key's value increments frequency
Rationale: Update is an access, should count toward frequency
```

### Rule 3: LRU Tie-Breaking

```text
Among items with same frequency, evict least recently used
Rationale: Recency matters when frequency is equal
```

### Rule 4: Zero Capacity

```text
Cache with capacity 0 accepts no items
Rationale: Invalid configuration, all puts are no-ops
```

### Rule 5: Negative Get

```text
Getting non-existent key returns None and counts as miss
Rationale: Standard cache behavior
```

## Extension Points

### 1. Time-To-Live (TTL)

```python
class TTLLFUCache(LFUCache):
    """
    LFU Cache with time-based expiration.
    
    Features:
    - Items expire after TTL
    - Automatic cleanup of expired items
    - Can combine with LFU eviction
    """
```

### 2. Weighted LFU

```python
class WeightedLFUCache(LFUCache):
    """
    LFU Cache with weighted frequencies.
    
    Features:
    - Different items have different weights
    - Frequency = access_count * weight
    - Useful for prioritizing certain items
    """
```

### 3. Persistent LFU

```python
class PersistentLFUCache(LFUCache):
    """
    LFU Cache with disk persistence.
    
    Features:
    - Periodic snapshots to disk
    - Restore on startup
    - Maintain frequencies across restarts
    """
```

### 4. Distributed LFU

```python
class DistributedLFUCache:
    """
    LFU Cache distributed across multiple nodes.
    
    Features:
    - Consistent hashing for key distribution
    - Replicated frequency tracking
    - Eventual consistency
    """
```

## Summary

The LFU Cache is a performance-critical data structure with:

- **O(1) Operations**: All operations (get, put, evict) are constant time
- **Frequency Tracking**: Accurately tracks access frequency per key
- **LRU Tie-Breaking**: Among equal frequencies, evicts least recently used
- **Efficient Memory**: Linear space complexity with minimal overhead
- **Statistics**: Built-in tracking of hits, misses, evictions

**Key Design Principles:**

1. **Performance**: O(1) operations through careful data structure choice
2. **Correctness**: Accurate frequency tracking and eviction
3. **Efficiency**: Minimal memory overhead beyond stored data
4. **Observability**: Statistics for monitoring cache effectiveness

**Perfect for:**

- Database query caches
- API response caches
- CDN content caching
- Browser caches
- Operating system page caches

**Comparison to LRU:**

- More complex implementation
- Better for workloads where frequency matters
- Worse for workloads with strong temporal locality
- Same O(1) complexity guarantee
