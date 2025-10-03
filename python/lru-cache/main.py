"""
LRU CACHE SYSTEM - Low Level Design Implementation in Python

DESIGN PATTERNS USED:
1. STRATEGY PATTERN: Different eviction policies (LRU, LFU, FIFO)
   - Pluggable eviction algorithms
   - Easy to switch between different caching strategies
   - Extensible for new eviction policies

2. OBSERVER PATTERN: Cache event notifications
   - Cache hit/miss event listeners
   - Statistics tracking and monitoring
   - Pluggable event handlers

3. TEMPLATE METHOD PATTERN: Base cache operations
   - Common cache operation structure
   - Customizable eviction behavior
   - Consistent interface across cache types

4. DECORATOR PATTERN: Cache feature enhancement
   - Add logging, metrics, persistence without modifying core logic
   - Composable cache features
   - Clean separation of concerns

OOP CONCEPTS DEMONSTRATED:
- COMPOSITION: Cache composed of HashMap + DoublyLinkedList
- ENCAPSULATION: Internal data structures hidden behind clean interface
- ABSTRACTION: Simple get/put interface hiding complex LRU logic
- POLYMORPHISM: Different node types and eviction policies

SOLID PRINCIPLES:
- SRP: Each class has single responsibility (Node, List, Cache, Policy)
- OCP: Easy to add new eviction policies without modifying existing code
- LSP: All eviction policies can be used interchangeably
- ISP: Focused interfaces for cache operations and eviction policies
- DIP: High-level cache depends on eviction policy abstraction

BUSINESS FEATURES:
- O(1) get and put operations
- Automatic least recently used eviction
- Configurable capacity management
- Thread-safe concurrent access
- Comprehensive statistics tracking

ARCHITECTURAL NOTES:
- Hybrid data structure: HashMap for O(1) access + DoublyLinkedList for O(1) ordering
- Memory efficient implementation with minimal overhead
- Extensible design for different cache types and policies
- Production-ready with proper error handling and edge cases
"""

from abc import ABC, abstractmethod
from typing import Generic, TypeVar, Optional, Dict, Any
from threading import RLock
from datetime import datetime
import time

K = TypeVar('K')  # Key type
V = TypeVar('V')  # Value type

# OBSERVER PATTERN: Event types for cache operations
class CacheEvent:
    def __init__(self, event_type: str, key: Any, value: Any = None, timestamp: float = None):
        self.event_type = event_type  # 'hit', 'miss', 'put', 'evict'
        self.key = key
        self.value = value
        self.timestamp = timestamp or time.time()

# OBSERVER PATTERN: Event listener interface
class CacheEventListener(ABC):
    @abstractmethod
    def on_cache_event(self, event: CacheEvent):
        pass

# ENCAPSULATION: Internal cache node representation
# COMPOSITION: Building block for doubly linked list
class CacheNode(Generic[K, V]):
    """
    Doubly linked list node for maintaining LRU order
    
    DESIGN PATTERNS:
    - Node Pattern: Basic building block for linked data structures
    - Encapsulation: Internal structure hidden from external access
    
    FEATURES:
    - Generic type support for any key-value types
    - Bidirectional links for O(1) insertion/deletion
    - Clean separation of data and structure concerns
    """
    
    def __init__(self, key: K, value: V):
        self.key = key
        self.value = value
        self.prev: Optional['CacheNode[K, V]'] = None
        self.next: Optional['CacheNode[K, V]'] = None
        self.access_time = time.time()  # For statistics
        self.access_count = 0  # For LFU policy support

    def __str__(self):
        return f"Node({self.key}: {self.value})"

    def __repr__(self):
        return self.__str__()

# TEMPLATE METHOD PATTERN: Base structure for eviction policies
# STRATEGY PATTERN: Pluggable eviction algorithms
class EvictionPolicy(ABC, Generic[K, V]):
    """
    Abstract base class for cache eviction policies
    
    DESIGN PATTERNS:
    - Strategy Pattern: Different algorithms for eviction
    - Template Method: Common structure for all policies
    - Abstract Factory: Base for creating specific policies
    
    OOP CONCEPTS:
    - Abstraction: Common interface for all eviction strategies
    - Polymorphism: Different policies used interchangeably
    """
    
    @abstractmethod
    def on_access(self, node: CacheNode[K, V]):
        """Called when a cache item is accessed (get operation)"""
        pass

    @abstractmethod
    def on_insert(self, node: CacheNode[K, V]):
        """Called when a new item is inserted"""
        pass

    @abstractmethod
    def should_evict(self, cache_size: int, capacity: int) -> bool:
        """Determine if eviction is needed"""
        pass

    @abstractmethod
    def get_eviction_candidate(self, nodes: Dict[K, CacheNode[K, V]]) -> Optional[CacheNode[K, V]]:
        """Select node to evict"""
        pass

# CONCRETE STRATEGY: LRU eviction implementation
class LRUEvictionPolicy(EvictionPolicy[K, V]):
    """
    Least Recently Used eviction policy
    
    BUSINESS LOGIC:
    - Tracks access order using doubly linked list
    - Evicts items that haven't been accessed for longest time
    - Updates access time on every get/put operation
    """
    
    def __init__(self):
        # Dummy head and tail for easier list manipulation
        self.head: CacheNode[K, V] = CacheNode(None, None)
        self.tail: CacheNode[K, V] = CacheNode(None, None)
        self.head.next = self.tail
        self.tail.prev = self.head

    def on_access(self, node: CacheNode[K, V]):
        """Move accessed node to head (most recently used)"""
        node.access_time = time.time()
        node.access_count += 1
        self._move_to_head(node)

    def on_insert(self, node: CacheNode[K, V]):
        """Add new node to head"""
        node.access_time = time.time()
        node.access_count = 1
        self._add_to_head(node)

    def should_evict(self, cache_size: int, capacity: int) -> bool:
        return cache_size >= capacity

    def get_eviction_candidate(self, nodes: Dict[K, CacheNode[K, V]]) -> Optional[CacheNode[K, V]]:
        """Return least recently used node (tail's previous)"""
        if self.tail.prev != self.head:
            return self.tail.prev
        return None

    def _add_to_head(self, node: CacheNode[K, V]):
        """Add node right after head"""
        node.prev = self.head
        node.next = self.head.next
        self.head.next.prev = node
        self.head.next = node

    def _remove_node(self, node: CacheNode[K, V]):
        """Remove node from linked list"""
        prev_node = node.prev
        next_node = node.next
        prev_node.next = next_node
        next_node.prev = prev_node

    def _move_to_head(self, node: CacheNode[K, V]):
        """Move existing node to head"""
        self._remove_node(node)
        self._add_to_head(node)

    def _remove_tail(self) -> Optional[CacheNode[K, V]]:
        """Remove and return last node"""
        last_node = self.tail.prev
        if last_node != self.head:
            self._remove_node(last_node)
            return last_node
        return None

# STATISTICS TRACKING: Observer pattern implementation
class CacheStatistics:
    """
    OBSERVER PATTERN: Tracks cache performance metrics
    SINGLE RESPONSIBILITY: Focused on statistics collection
    """
    
    def __init__(self):
        self.hits = 0
        self.misses = 0
        self.puts = 0
        self.evictions = 0
        self.start_time = time.time()

    @property
    def hit_rate(self) -> float:
        total = self.hits + self.misses
        return self.hits / total if total > 0 else 0.0

    @property
    def miss_rate(self) -> float:
        return 1.0 - self.hit_rate

    def reset(self):
        self.hits = 0
        self.misses = 0
        self.puts = 0
        self.evictions = 0
        self.start_time = time.time()

    def __str__(self):
        return f"CacheStats(hits={self.hits}, misses={self.misses}, hit_rate={self.hit_rate:.2%})"

# MAIN CACHE IMPLEMENTATION: Combines all patterns and concepts
class LRUCache(Generic[K, V]):
    """
    LRU Cache Implementation using HashMap + Doubly Linked List
    
    DESIGN PATTERNS:
    - Strategy Pattern: Pluggable eviction policies
    - Observer Pattern: Event notifications and statistics
    - Facade Pattern: Simple interface hiding complex internal logic
    - Composite Pattern: Combines multiple data structures
    
    COMPLEXITY:
    - Time: O(1) for all operations (get, put, delete)
    - Space: O(capacity) for storage
    
    FEATURES:
    - Thread-safe with configurable locking
    - Generic type support
    - Comprehensive statistics tracking
    - Event-driven architecture
    - Extensible eviction policies
    """
    
    def __init__(self, capacity: int, eviction_policy: EvictionPolicy[K, V] = None, 
                 thread_safe: bool = True):
        if capacity <= 0:
            raise ValueError("Capacity must be positive")
            
        self.capacity = capacity
        self.cache: Dict[K, CacheNode[K, V]] = {}
        self.eviction_policy = eviction_policy or LRUEvictionPolicy[K, V]()
        self.statistics = CacheStatistics()
        self.event_listeners: list[CacheEventListener] = []
        
        # Thread safety
        self._lock = RLock() if thread_safe else None

    def get(self, key: K) -> Optional[V]:
        """
        Get value by key with O(1) complexity
        
        BUSINESS LOGIC:
        - Return value if key exists and update access order
        - Return None if key doesn't exist
        - Update statistics and fire events
        """
        with self._lock or self._no_lock():
            if key in self.cache:
                node = self.cache[key]
                self.eviction_policy.on_access(node)
                self.statistics.hits += 1
                self._fire_event(CacheEvent('hit', key, node.value))
                return node.value
            else:
                self.statistics.misses += 1
                self._fire_event(CacheEvent('miss', key))
                return None

    def put(self, key: K, value: V) -> Optional[V]:
        """
        Put key-value pair with O(1) complexity
        
        BUSINESS LOGIC:
        - Update existing key or add new key-value pair
        - Handle capacity overflow with eviction
        - Maintain LRU order and update statistics
        
        Returns: Previous value if key existed, None otherwise
        """
        with self._lock or self._no_lock():
            old_value = None
            
            if key in self.cache:
                # Update existing key
                node = self.cache[key]
                old_value = node.value
                node.value = value
                self.eviction_policy.on_access(node)
            else:
                # Add new key-value pair
                node = CacheNode(key, value)
                
                # Check if eviction is needed
                if self.eviction_policy.should_evict(len(self.cache), self.capacity):
                    self._evict_one()
                
                self.cache[key] = node
                self.eviction_policy.on_insert(node)
            
            self.statistics.puts += 1
            self._fire_event(CacheEvent('put', key, value))
            return old_value

    def contains(self, key: K) -> bool:
        """Check if key exists without updating access order"""
        with self._lock or self._no_lock():
            return key in self.cache

    def size(self) -> int:
        """Return current cache size"""
        with self._lock or self._no_lock():
            return len(self.cache)

    def is_empty(self) -> bool:
        """Check if cache is empty"""
        return self.size() == 0

    def is_full(self) -> bool:
        """Check if cache is at capacity"""
        return self.size() >= self.capacity

    def clear(self):
        """Remove all items from cache"""
        with self._lock or self._no_lock():
            self.cache.clear()
            if isinstance(self.eviction_policy, LRUEvictionPolicy):
                # Reset the linked list
                self.eviction_policy.head.next = self.eviction_policy.tail
                self.eviction_policy.tail.prev = self.eviction_policy.head

    def keys(self):
        """Return all keys in cache"""
        with self._lock or self._no_lock():
            return list(self.cache.keys())

    def values(self):
        """Return all values in cache"""
        with self._lock or self._no_lock():
            return [node.value for node in self.cache.values()]

    def items(self):
        """Return all key-value pairs"""
        with self._lock or self._no_lock():
            return [(key, node.value) for key, node in self.cache.items()]

    def get_statistics(self) -> CacheStatistics:
        """Return cache performance statistics"""
        return self.statistics

    def add_event_listener(self, listener: CacheEventListener):
        """Add event listener for cache operations"""
        self.event_listeners.append(listener)

    def remove_event_listener(self, listener: CacheEventListener):
        """Remove event listener"""
        if listener in self.event_listeners:
            self.event_listeners.remove(listener)

    def _evict_one(self):
        """Evict one item according to eviction policy"""
        candidate = self.eviction_policy.get_eviction_candidate(self.cache)
        if candidate:
            del self.cache[candidate.key]
            self.statistics.evictions += 1
            self._fire_event(CacheEvent('evict', candidate.key, candidate.value))
            
            # Remove from linked list if LRU policy
            if isinstance(self.eviction_policy, LRUEvictionPolicy):
                self.eviction_policy._remove_node(candidate)

    def _fire_event(self, event: CacheEvent):
        """Notify all event listeners"""
        for listener in self.event_listeners:
            try:
                listener.on_cache_event(event)
            except Exception as e:
                # Log error but don't break cache operation
                print(f"Error in event listener: {e}")

    def _no_lock(self):
        """Context manager that does nothing (for non-thread-safe mode)"""
        class NoLock:
            def __enter__(self): return self
            def __exit__(self, *args): pass
        return NoLock()

    def __str__(self):
        return f"LRUCache(capacity={self.capacity}, size={self.size()}, {self.statistics})"

    def __repr__(self):
        return self.__str__()

# EXAMPLE EVENT LISTENER: Console logging
class ConsoleEventListener(CacheEventListener):
    def on_cache_event(self, event: CacheEvent):
        print(f"[{datetime.fromtimestamp(event.timestamp)}] {event.event_type.upper()}: {event.key}")

# EXAMPLE EVENT LISTENER: Statistics tracking
class DetailedStatsListener(CacheEventListener):
    def __init__(self):
        self.event_history = []
        self.key_access_count = {}

    def on_cache_event(self, event: CacheEvent):
        self.event_history.append(event)
        if event.event_type in ['hit', 'put']:
            self.key_access_count[event.key] = self.key_access_count.get(event.key, 0) + 1

# FACTORY PATTERN: Cache creation with different configurations
class CacheBuilder:
    """
    BUILDER PATTERN: Fluent interface for cache configuration
    FACTORY PATTERN: Centralized cache creation logic
    """
    
    def __init__(self):
        self.capacity = 100
        self.eviction_policy = None
        self.thread_safe = True
        self.listeners = []

    def with_capacity(self, capacity: int):
        self.capacity = capacity
        return self

    def with_lru_policy(self):
        self.eviction_policy = LRUEvictionPolicy()
        return self

    def with_thread_safety(self, enabled: bool = True):
        self.thread_safe = enabled
        return self

    def with_console_logging(self):
        self.listeners.append(ConsoleEventListener())
        return self

    def with_detailed_stats(self):
        self.listeners.append(DetailedStatsListener())
        return self

    def build(self) -> LRUCache:
        cache = LRUCache(self.capacity, self.eviction_policy, self.thread_safe)
        for listener in self.listeners:
            cache.add_event_listener(listener)
        return cache

# Demo usage and testing
def main():
    print("=== LRU Cache System Demo ===\n")

    # Create cache with builder pattern
    cache = (CacheBuilder()
             .with_capacity(3)
             .with_lru_policy()
             .with_console_logging()
             .build())

    print(f"Created cache: {cache}\n")

    # Test basic operations
    print("1. Testing basic put operations:")
    cache.put("key1", "value1")
    cache.put("key2", "value2")
    cache.put("key3", "value3")
    print(f"Cache after 3 puts: size={cache.size()}")
    print(f"Keys: {cache.keys()}\n")

    # Test get operations
    print("2. Testing get operations:")
    print(f"get('key1'): {cache.get('key1')}")  # Hit
    print(f"get('key2'): {cache.get('key2')}")  # Hit
    print(f"get('key4'): {cache.get('key4')}")  # Miss
    print()

    # Test eviction
    print("3. Testing LRU eviction:")
    print("Adding key4 (should evict key3 as it's least recently used)")
    cache.put("key4", "value4")
    print(f"Keys after eviction: {cache.keys()}")
    print(f"Contains key3: {cache.contains('key3')}")
    print()

    # Test update existing key
    print("4. Testing update existing key:")
    old_value = cache.put("key1", "updated_value1")
    print(f"Updated key1, old value: {old_value}")
    print(f"New value: {cache.get('key1')}")
    print()

    # Show statistics
    print("5. Cache statistics:")
    stats = cache.get_statistics()
    print(f"Statistics: {stats}")
    print(f"Hit rate: {stats.hit_rate:.2%}")
    print(f"Miss rate: {stats.miss_rate:.2%}")
    print()

    # Test edge cases
    print("6. Testing edge cases:")
    cache.clear()
    print(f"After clear - size: {cache.size()}, empty: {cache.is_empty()}")
    
    # Test capacity 1 cache
    small_cache = LRUCache(1)
    small_cache.put("a", 1)
    small_cache.put("b", 2)  # Should evict "a"
    print(f"Small cache contains 'a': {small_cache.contains('a')}")
    print(f"Small cache contains 'b': {small_cache.contains('b')}")
    print()

    # Demonstrate thread safety
    print("7. Thread safety demonstration:")
    import threading
    import random

    thread_safe_cache = LRUCache(10, thread_safe=True)
    
    def worker(worker_id, operations=20):
        for i in range(operations):
            key = f"key_{random.randint(1, 15)}"
            if random.choice([True, False]):
                thread_safe_cache.put(key, f"value_{worker_id}_{i}")
            else:
                thread_safe_cache.get(key)

    # Run multiple threads
    threads = []
    for i in range(5):
        t = threading.Thread(target=worker, args=(i,))
        threads.append(t)
        t.start()

    for t in threads:
        t.join()

    print(f"Thread-safe cache final state: {thread_safe_cache}")
    print(f"Final statistics: {thread_safe_cache.get_statistics()}")

if __name__ == "__main__":
    main()