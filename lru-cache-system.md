# LRU Cache System

## 🔗 Implementation Links

- **Python Implementation**: [python/lru-cache/main.py](python/lru-cache/main.py)
- **JavaScript Implementation**: [javascript/lru-cache/main.js](javascript/lru-cache/main.js)

## Problem Statement

Design a Least Recently Used (LRU) Cache data structure that can:

1. **Store key-value pairs** with a maximum capacity
2. **Get values** by key in O(1) time complexity
3. **Put key-value pairs** and handle capacity overflow
4. **Maintain LRU order** - evict least recently used items when capacity is exceeded
5. **Update access time** when items are accessed (both get and put operations)
6. **Support generic types** for both keys and values

## Requirements

### Functional Requirements

- Support get(key) operation to retrieve values in O(1) time
- Support put(key, value) operation to store/update values in O(1) time
- Automatically evict least recently used items when capacity is exceeded
- Update item position to most recently used on both get and put operations
- Handle edge cases like capacity 0, duplicate keys, null values
- Support iteration over cache items in LRU order

### Non-Functional Requirements

- All operations must be O(1) time complexity
- Space complexity should be O(capacity)
- Thread-safe implementation for concurrent access
- Memory efficient with minimal overhead per cache item
- Support for different eviction policies (extensible design)

## Design Decisions

### Key Classes

1. **CacheNode**
   - Represents individual cache items in doubly linked list
   - Contains key, value, and pointers to previous/next nodes
   - Enables O(1) insertion, deletion, and movement operations

2. **DoublyLinkedList**
   - Maintains insertion order with head (most recent) and tail (least recent)
   - Provides O(1) operations for add, remove, and move operations
   - Implements the ordering mechanism for LRU policy

3. **LRUCache** (Main System)
   - Combines hash map for O(1) lookups with doubly linked list for O(1) ordering
   - Manages capacity constraints and eviction policy
   - Handles all cache operations and maintains consistency

4. **EvictionPolicy Interface**
   - Abstract interface for different eviction strategies
   - Allows extension to LFU, FIFO, or custom policies
   - Follows Strategy pattern for pluggable algorithms

### Design Patterns Used

1. **Strategy Pattern**: Pluggable eviction policies (LRU, LFU, FIFO)
2. **Observer Pattern**: Cache events and statistics tracking
3. **Template Method**: Base cache operations with customizable eviction
4. **Decorator Pattern**: Cache with additional features (metrics, logging)
5. **Builder Pattern**: Cache configuration and initialization

### Key Features

- **Hybrid Data Structure**: Hash map + doubly linked list for optimal performance
- **Generic Implementation**: Support for any key-value types
- **Memory Efficient**: Minimal object overhead per cache entry
- **Thread Safety**: Concurrent access support with proper synchronization
- **Extensible Design**: Easy to add new eviction policies or features

## Class Diagram

```uml
CacheNode
├── key: K
├── value: V
├── prev: CacheNode
└── next: CacheNode

DoublyLinkedList
├── head: CacheNode
├── tail: CacheNode
├── addToHead(node): void
├── removeNode(node): void
├── moveToHead(node): void
└── removeTail(): CacheNode

LRUCache<K, V>
├── capacity: int
├── cache: HashMap<K, CacheNode>
├── dll: DoublyLinkedList
├── get(key: K): V
├── put(key: K, value: V): void
├── size(): int
└── clear(): void

EvictionPolicy
├── onAccess(key: K): void
├── onInsert(key: K): void
├── onEvict(key: K): void
└── getEvictionCandidate(): K
```

## Usage Example

```python
# Create LRU cache with capacity 3
cache = LRUCache(3)

# Add items
cache.put("key1", "value1")
cache.put("key2", "value2")
cache.put("key3", "value3")

# Access existing item (moves to front)
value = cache.get("key1")  # Returns "value1"

# Add new item (evicts least recently used)
cache.put("key4", "value4")  # Evicts "key2"

# Check if key exists
exists = cache.contains("key2")  # Returns False
```

## Extension Points

1. **Multiple Eviction Policies**: Add LFU (Least Frequently Used), FIFO, TTL-based
2. **Cache Statistics**: Hit/miss ratios, eviction counts, access patterns
3. **Persistence**: Disk-backed cache with write-through/write-back policies
4. **Distributed Cache**: Network-aware cache with consistent hashing
5. **Cache Warming**: Pre-loading strategies and background refresh
6. **Memory Management**: Soft/weak references for memory-sensitive applications
7. **Event Listeners**: Callbacks for cache events (insert, evict, hit, miss)

## Time Complexity

- **Get Operation**: O(1) - Hash map lookup + linked list movement
- **Put Operation**: O(1) - Hash map insert + linked list operations
- **Eviction**: O(1) - Remove tail node from linked list
- **Size/Contains**: O(1) - Direct hash map or counter access

## Space Complexity

- **Storage**: O(capacity) - Hash map + doubly linked list nodes
- **Per Item Overhead**: O(1) - Fixed overhead per cache entry
- **Total Memory**: O(capacity × (key_size + value_size + pointer_overhead))

## Advanced Features

### Thread Safety

- Concurrent access support with proper locking mechanisms
- Lock-free implementations using atomic operations
- Read-write locks for optimized concurrent reads

### Cache Statistics

- Hit/miss ratios and access patterns tracking
- Eviction statistics and frequency analysis
- Performance metrics and monitoring capabilities

### Memory Management

- Configurable memory limits with soft/hard boundaries
- Garbage collection optimization strategies
- Memory-mapped storage for large caches

### Cache Events

- Event-driven architecture with pluggable listeners
- Cache warming and pre-loading strategies
- Monitoring and alerting integration
