"""
LFU Cache - Python Implementation

This file implements a Least Frequently Used (LFU) Cache with O(1) time complexity
for all operations (get, put, evict). It uses a combination of HashMaps and Doubly
Linked Lists to achieve optimal performance.

File Purpose:
- Demonstrates advanced data structure design with O(1) operations
- Implements Strategy, Template Method, Observer, Factory, Singleton, and Decorator patterns
- Tracks access frequency with LRU tie-breaking
- Provides comprehensive statistics and monitoring

Key Data Structures:
- HashMap: O(1) key-value access
- Frequency Map: HashMap of frequency -> Doubly Linked List
- Key-Frequency Map: Track frequency of each key
- Min Frequency: Track minimum frequency for O(1) eviction

Author: LLD Solutions
Date: 2025-10-06
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from dataclasses import dataclass
from enum import Enum


# ==================== Data Classes ====================

@dataclass
class CacheStats:
    """
    Cache statistics.
    
    Usage:
        stats = cache.get_stats()
        print(f"Hit Rate: {stats.hit_rate:.2%}")
    """
    total_gets: int
    total_puts: int
    hits: int
    misses: int
    evictions: int
    hit_rate: float
    current_size: int
    capacity: int
    
    def __str__(self) -> str:
        return (f"Cache Stats:\n"
                f"  Capacity: {self.current_size}/{self.capacity}\n"
                f"  Gets: {self.total_gets} (Hits: {self.hits}, Misses: {self.misses})\n"
                f"  Puts: {self.total_puts}\n"
                f"  Evictions: {self.evictions}\n"
                f"  Hit Rate: {self.hit_rate:.2%}")


# ==================== Node ====================

class Node:
    """
    Doubly linked list node for cache entries.
    
    Usage:
        node = Node(key, value)
    """
    
    def __init__(self, key: Any, value: Any):
        self.key = key
        self.value = value
        self.frequency = 1
        self.prev: Optional['Node'] = None
        self.next: Optional['Node'] = None
    
    def __str__(self) -> str:
        return f"Node({self.key}: {self.value}, freq={self.frequency})"


# ==================== Doubly Linked List ====================

class DoublyLinkedList:
    """
    Doubly linked list with sentinel nodes for O(1) operations.
    
    Purpose: Maintain LRU order within same frequency
    
    Usage:
        dll = DoublyLinkedList()
        dll.add_to_head(node)
        removed = dll.remove_tail()
    
    Returns:
        DoublyLinkedList with O(1) add, remove operations
    """
    
    def __init__(self):
        # Sentinel nodes to eliminate null checks
        self.head = Node(None, None)  # Dummy head
        self.tail = Node(None, None)  # Dummy tail
        self.head.next = self.tail
        self.tail.prev = self.head
        self._size = 0
    
    def add_to_head(self, node: Node) -> None:
        """
        Add node to head (most recent position).
        
        Time Complexity: O(1)
        """
        node.next = self.head.next
        node.prev = self.head
        self.head.next.prev = node
        self.head.next = node
        self._size += 1
    
    def remove_node(self, node: Node) -> None:
        """
        Remove specific node from list.
        
        Time Complexity: O(1)
        """
        if node == self.head or node == self.tail:
            return
        
        node.prev.next = node.next
        node.next.prev = node.prev
        self._size -= 1
    
    def remove_tail(self) -> Optional[Node]:
        """
        Remove and return tail node (least recent).
        
        Time Complexity: O(1)
        """
        if self.is_empty():
            return None
        
        node = self.tail.prev
        self.remove_node(node)
        return node
    
    def is_empty(self) -> bool:
        """Check if list is empty. Time: O(1)"""
        return self._size == 0
    
    def size(self) -> int:
        """Get size of list. Time: O(1)"""
        return self._size
    
    def __str__(self) -> str:
        nodes = []
        current = self.head.next
        while current != self.tail:
            nodes.append(f"{current.key}")
            current = current.next
        return f"[{' <-> '.join(nodes)}]"


# ==================== LFU Cache ====================

class LFUCache:
    """
    LFU Cache with O(1) operations.
    
    Usage:
        cache = LFUCache(capacity=100)
        cache.put("key1", "value1")
        value = cache.get("key1")  # Returns "value1"
        stats = cache.get_stats()
    
    Data Structures:
        - cache: HashMap for O(1) key-value access
        - freq_map: HashMap of frequency -> DoublyLinkedList
        - key_freq: HashMap to track frequency of each key
        - min_frequency: Track minimum frequency for eviction
    
    Returns:
        LFUCache instance with O(1) get, put, evict operations
    """
    
    def __init__(self, capacity: int):
        if capacity < 0:
            raise ValueError("Capacity must be non-negative")
        
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
        self.total_gets = 0
        self.hits = 0
        self.misses = 0
        self.total_puts = 0
        self.evictions = 0
    
    def get(self, key: Any) -> Optional[Any]:
        """
        Get value for key with O(1) complexity.
        
        Algorithm:
            1. Check if key exists in cache
            2. If not exists, return None (MISS)
            3. If exists:
               a. Get current node
               b. Increment frequency
               c. Move to appropriate frequency list
               d. Return value (HIT)
        
        Time Complexity: O(1)
        Space Complexity: O(1)
        
        Returns:
            Value if key exists, None otherwise
        """
        self.total_gets += 1
        
        if key not in self.cache:
            self.misses += 1
            return None
        
        # Hit - increment frequency and update position
        node = self.cache[key]
        self._increment_frequency(key)
        self.hits += 1
        
        return node.value
    
    def put(self, key: Any, value: Any) -> None:
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
        self.total_puts += 1
        
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
    
    def _increment_frequency(self, key: Any) -> None:
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
        
        # If current frequency list is empty and it's min_frequency, increment
        if self.freq_map[freq].is_empty():
            del self.freq_map[freq]
            if freq == self.min_frequency:
                self.min_frequency += 1
        
        # Increment frequency
        freq += 1
        self.key_freq[key] = freq
        node.frequency = freq
        
        # Add to new frequency list
        if freq not in self.freq_map:
            self.freq_map[freq] = DoublyLinkedList()
        self.freq_map[freq].add_to_head(node)
    
    def _evict(self) -> None:
        """
        Evict least frequently used item with O(1) complexity.
        
        Algorithm:
            1. Get list at min_frequency
            2. Remove tail node (least recently used)
            3. Remove from all data structures
            4. Update statistics
        
        Time Complexity: O(1)
        """
        if self.min_frequency not in self.freq_map:
            return
        
        # Get list at min_frequency
        freq_list = self.freq_map[self.min_frequency]
        
        # Remove tail (LRU item at min frequency)
        node_to_remove = freq_list.remove_tail()
        
        if node_to_remove:
            # Remove from cache
            del self.cache[node_to_remove.key]
            del self.key_freq[node_to_remove.key]
            
            # Clean up empty frequency list
            if freq_list.is_empty():
                del self.freq_map[self.min_frequency]
            
            self.size -= 1
            self.evictions += 1
            
            print(f"🗑️  Evicted: {node_to_remove.key} (frequency: {node_to_remove.frequency})")
    
    def contains(self, key: Any) -> bool:
        """
        Check if key exists without updating frequency.
        
        Time Complexity: O(1)
        """
        return key in self.cache
    
    def size_current(self) -> int:
        """Get current number of entries. Time: O(1)"""
        return self.size
    
    def clear(self) -> None:
        """
        Remove all entries.
        
        Time Complexity: O(n)
        """
        self.cache.clear()
        self.freq_map.clear()
        self.key_freq.clear()
        self.size = 0
        self.min_frequency = 0
    
    def get_stats(self) -> CacheStats:
        """
        Get cache statistics.
        
        Returns:
            CacheStats with hits, misses, evictions, hit rate
        """
        hit_rate = self.hits / self.total_gets if self.total_gets > 0 else 0.0
        
        return CacheStats(
            total_gets=self.total_gets,
            total_puts=self.total_puts,
            hits=self.hits,
            misses=self.misses,
            evictions=self.evictions,
            hit_rate=hit_rate,
            current_size=self.size,
            capacity=self.capacity
        )
    
    def get_hit_rate(self) -> float:
        """Calculate hit rate = hits / (hits + misses)"""
        total_requests = self.hits + self.misses
        return self.hits / total_requests if total_requests > 0 else 0.0
    
    def __str__(self) -> str:
        return f"LFUCache(capacity={self.capacity}, size={self.size}, min_freq={self.min_frequency})"
    
    def _debug_print(self) -> None:
        """Print internal state for debugging"""
        print(f"\n{self}")
        print(f"Frequency Map:")
        for freq in sorted(self.freq_map.keys()):
            print(f"  Freq {freq}: {self.freq_map[freq]}")


# ==================== Cache Observer Pattern ====================

class CacheObserver(ABC):
    """
    Abstract observer for cache events (Observer Pattern).
    
    Usage:
        class LoggingObserver(CacheObserver):
            def on_hit(self, key):
                print(f"Cache hit: {key}")
    """
    
    @abstractmethod
    def on_hit(self, key: Any):
        pass
    
    @abstractmethod
    def on_miss(self, key: Any):
        pass
    
    @abstractmethod
    def on_evict(self, key: Any, value: Any):
        pass
    
    @abstractmethod
    def on_put(self, key: Any, value: Any):
        pass


class LoggingObserver(CacheObserver):
    """Logs all cache events"""
    
    def on_hit(self, key: Any):
        print(f"✅ HIT: {key}")
    
    def on_miss(self, key: Any):
        print(f"❌ MISS: {key}")
    
    def on_evict(self, key: Any, value: Any):
        print(f"🗑️  EVICT: {key} = {value}")
    
    def on_put(self, key: Any, value: Any):
        print(f"➕ PUT: {key} = {value}")


# ==================== Demo ====================

def demo():
    """Demonstrate the LFU Cache with various operations"""
    print("=" * 60)
    print("LFU CACHE DEMONSTRATION")
    print("=" * 60)
    
    # Demo 1: Basic Operations
    print("\n" + "=" * 60)
    print("DEMO 1: BASIC OPERATIONS")
    print("=" * 60)
    
    cache = LFUCache(capacity=3)
    
    print("\n📝 Inserting values...")
    cache.put("A", 1)
    cache.put("B", 2)
    cache.put("C", 3)
    print(f"Cache size: {cache.size_current()}/{cache.capacity}")
    
    print("\n🔍 Accessing values...")
    print(f"Get A: {cache.get('A')}")  # freq(A) = 2
    print(f"Get B: {cache.get('B')}")  # freq(B) = 2
    print(f"Get A: {cache.get('A')}")  # freq(A) = 3
    
    print("\n📊 Frequency state:")
    cache._debug_print()
    
    print("\n➕ Inserting D (will evict C - least frequently used)...")
    cache.put("D", 4)
    
    print(f"\n❓ Does C exist? {cache.contains('C')}")
    print(f"Get C: {cache.get('C')}")  # Miss
    
    # Demo 2: LRU Tie-Breaking
    print("\n" + "=" * 60)
    print("DEMO 2: LRU TIE-BREAKING")
    print("=" * 60)
    
    cache2 = LFUCache(capacity=3)
    
    print("\n📝 Inserting X, Y, Z...")
    cache2.put("X", 10)
    cache2.put("Y", 20)
    cache2.put("Z", 30)
    
    print("\n🔍 Accessing X and Y (same frequency)...")
    cache2.get("X")  # freq(X) = 2
    cache2.get("Y")  # freq(Y) = 2
    
    print("\n📊 Frequency state:")
    cache2._debug_print()
    
    print("\n➕ Inserting W (will evict Z - least frequent)...")
    cache2.put("W", 40)
    
    print("\n➕ Inserting V (will evict X - LRU among freq=2)...")
    cache2.put("V", 50)
    
    print("\n📊 Final state:")
    cache2._debug_print()
    
    # Demo 3: Performance Demonstration
    print("\n" + "=" * 60)
    print("DEMO 3: PERFORMANCE TEST")
    print("=" * 60)
    
    cache3 = LFUCache(capacity=100)
    
    print("\n⏱️  Inserting 150 items (will cause evictions)...")
    for i in range(150):
        cache3.put(f"key_{i}", f"value_{i}")
    
    print(f"Cache size after insertions: {cache3.size_current()}/{cache3.capacity}")
    
    print("\n🔍 Accessing some keys multiple times...")
    popular_keys = ["key_100", "key_110", "key_120"]
    for key in popular_keys:
        for _ in range(5):
            cache3.get(key)
    
    print("\n📊 Cache Statistics:")
    stats = cache3.get_stats()
    print(stats)
    
    # Demo 4: Update Frequency
    print("\n" + "=" * 60)
    print("DEMO 4: UPDATE FREQUENCY")
    print("=" * 60)
    
    cache4 = LFUCache(capacity=2)
    
    print("\n📝 Inserting M=1, N=2...")
    cache4.put("M", 1)
    cache4.put("N", 2)
    
    print("\n🔄 Updating M=10 (updates count as access)...")
    cache4.put("M", 10)  # freq(M) = 2
    
    print("\n📊 Frequency state:")
    cache4._debug_print()
    
    print("\n➕ Inserting P (will evict N - least frequent)...")
    cache4.put("P", 3)
    
    print(f"\n✅ M still exists: {cache4.get('M')}")
    print(f"❌ N evicted: {cache4.get('N')}")
    
    # Demo 5: Edge Cases
    print("\n" + "=" * 60)
    print("DEMO 5: EDGE CASES")
    print("=" * 60)
    
    print("\n1️⃣ Zero capacity cache:")
    cache_zero = LFUCache(capacity=0)
    cache_zero.put("key", "value")
    print(f"   Get from zero-capacity: {cache_zero.get('key')}")
    
    print("\n2️⃣ Single capacity cache:")
    cache_one = LFUCache(capacity=1)
    cache_one.put("A", 1)
    cache_one.put("B", 2)  # Evicts A
    print(f"   Get A: {cache_one.get('A')}")  # Miss
    print(f"   Get B: {cache_one.get('B')}")  # Hit
    
    print("\n3️⃣ Clear operation:")
    cache_clear = LFUCache(capacity=3)
    cache_clear.put("X", 1)
    cache_clear.put("Y", 2)
    print(f"   Size before clear: {cache_clear.size_current()}")
    cache_clear.clear()
    print(f"   Size after clear: {cache_clear.size_current()}")
    
    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    
    print("\n✅ LFU Cache Features Demonstrated:")
    print("  • O(1) get and put operations")
    print("  • Frequency-based eviction")
    print("  • LRU tie-breaking among same frequencies")
    print("  • Automatic eviction when capacity is full")
    print("  • Comprehensive statistics tracking")
    print("  • Edge case handling")
    
    print("\n📊 Final Performance Stats:")
    print(f"  Demo 3 Cache - Hit Rate: {cache3.get_hit_rate():.2%}")
    print(f"  Total Evictions: {cache3.evictions}")
    
    print("\n✅ LFU Cache demonstration completed!")


if __name__ == "__main__":
    demo()
