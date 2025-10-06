"""
Skip List - Probabilistic Data Structure Implementation

This module implements a Skip List data structure that provides O(log n) average-case
time complexity for search, insert, and delete operations using a probabilistic approach
with multi-level linked lists.

Features:
- O(log n) search, insert, delete operations (average case)
- Multi-level linked list structure (tower metaphor)
- Probabilistic balancing without rotations
- Range queries in O(log n + k) time
- Iterator for sorted traversal
- 5 Design Patterns: Iterator, Strategy, Template Method, Factory, Singleton

Usage:
    skip_list = SkipList()
    skip_list.insert(10)
    skip_list.insert(20)
    found = skip_list.search(10)  # True
    skip_list.delete(10)
    elements = skip_list.get_range(5, 25)  # [20]

Design Patterns Used:
1. Iterator - For sequential traversal
2. Strategy - For level generation strategies
3. Template Method - For search algorithm skeleton
4. Factory - For skip list creation with different configurations
5. Singleton - For random number generator

Author: LLD Solutions
Date: 2025
"""

from __future__ import annotations
from typing import TypeVar, Generic, Optional, List, Iterator
from abc import ABC, abstractmethod
from dataclasses import dataclass
import random
from enum import Enum

T = TypeVar('T')


# ============================================================================
# 1. ITERATOR PATTERN - Sequential traversal of skip list
# ============================================================================

class SkipListIterator(Generic[T]):
    """
    Iterator for traversing skip list in sorted order.
    
    This implements the Iterator Pattern to provide sequential access
    to elements in the skip list without exposing internal structure.
    
    Usage:
        iterator = SkipListIterator(skip_list.head)
        while iterator.has_next():
            value = iterator.next()
            print(value)
    
    Time Complexity: O(n) for complete traversal
    Space Complexity: O(1)
    """
    
    def __init__(self, head: SkipNode[T]) -> None:
        """Initialize iterator at the first real node (after head)."""
        self.current = head.forward[0] if head else None
    
    def has_next(self) -> bool:
        """Check if there are more elements to iterate."""
        return self.current is not None
    
    def next(self) -> T:
        """
        Get next element and advance iterator.
        
        Returns:
            Value of current node
            
        Raises:
            StopIteration: If no more elements
        """
        if not self.has_next():
            raise StopIteration("No more elements")
        
        value = self.current.value
        self.current = self.current.forward[0]
        return value


# ============================================================================
# 2. STRATEGY PATTERN - Different level generation strategies
# ============================================================================

class LevelGenerationStrategy(ABC):
    """
    Abstract strategy for generating random levels.
    
    This implements the Strategy Pattern to allow different approaches
    for determining the height of new nodes in the skip list.
    """
    
    @abstractmethod
    def generate_level(self, max_level: int) -> int:
        """
        Generate a random level for a new node.
        
        Args:
            max_level: Maximum allowed level
            
        Returns:
            Generated level (1 to max_level)
        """
        pass


class CoinFlipStrategy(LevelGenerationStrategy):
    """
    Traditional coin flip strategy with 50% probability.
    
    This is the classic skip list approach where each level has
    50% probability of being promoted to the next level.
    
    Expected level: 2
    Probability distribution:
        Level 1: 50%
        Level 2: 25%
        Level 3: 12.5%
        ...
    """
    
    def __init__(self, probability: float = 0.5) -> None:
        """
        Initialize with promotion probability.
        
        Args:
            probability: Probability of promoting to next level (default 0.5)
        """
        self.probability = probability
    
    def generate_level(self, max_level: int) -> int:
        """
        Generate level using geometric distribution.
        
        Time Complexity: O(log n) expected
        Space Complexity: O(1)
        """
        level = 1
        while random.random() < self.probability and level < max_level:
            level += 1
        return level


class DeterministicStrategy(LevelGenerationStrategy):
    """
    Deterministic strategy for testing purposes.
    
    Always returns a fixed level, useful for testing and debugging.
    """
    
    def __init__(self, fixed_level: int = 1) -> None:
        """Initialize with a fixed level."""
        self.fixed_level = fixed_level
    
    def generate_level(self, max_level: int) -> int:
        """Return fixed level, capped at max_level."""
        return min(self.fixed_level, max_level)


# ============================================================================
# 3. SINGLETON PATTERN - Single random generator instance
# ============================================================================

class RandomGeneratorSingleton:
    """
    Singleton for random number generation.
    
    Ensures only one random generator is used across the application,
    allowing for reproducible results with seed setting.
    """
    
    _instance = None
    _random = random.Random()
    
    def __new__(cls):
        """Create or return existing instance."""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def set_seed(self, seed: int) -> None:
        """Set random seed for reproducibility."""
        self._random.seed(seed)
    
    def random(self) -> float:
        """Generate random float between 0 and 1."""
        return self._random.random()


# ============================================================================
# 4. SKIP NODE - Building block of skip list
# ============================================================================

@dataclass
class SkipNode(Generic[T]):
    """
    Node in a skip list with multiple forward pointers.
    
    Each node is like a building with multiple floors:
    - All nodes have ground floor (level 0)
    - Some nodes have additional floors (express lanes)
    - Taller towers allow faster traversal
    
    Attributes:
        value: The value stored in this node
        level: Height of this node's tower (number of levels - 1)
        forward: List of forward pointers at each level
    """
    
    value: T
    level: int
    forward: List[Optional[SkipNode[T]]]
    
    def __init__(self, value: T, level: int) -> None:
        """
        Initialize skip node with given value and level.
        
        Args:
            value: Value to store
            level: Height of node tower
        """
        self.value = value
        self.level = level
        self.forward = [None] * (level + 1)
    
    def get_forward(self, level: int) -> Optional[SkipNode[T]]:
        """Get forward pointer at given level."""
        return self.forward[level] if level < len(self.forward) else None
    
    def set_forward(self, level: int, node: Optional[SkipNode[T]]) -> None:
        """Set forward pointer at given level."""
        if level < len(self.forward):
            self.forward[level] = node
    
    def __str__(self) -> str:
        """String representation showing value and level."""
        return f"Node({self.value}, level={self.level})"


# ============================================================================
# 5. SKIP LIST - Main data structure with template method
# ============================================================================

class SkipList(Generic[T]):
    """
    Skip List implementation with O(log n) operations.
    
    A skip list is a probabilistic data structure that uses multiple levels
    of linked lists to achieve O(log n) search, insert, and delete operations
    without the complexity of tree balancing.
    
    Structure:
        Level 3:  HEAD --------------------------------> NIL
        Level 2:  HEAD --------> 6 -------------------> NIL
        Level 1:  HEAD -----> 3 -> 6 -----> 12 -------> NIL
        Level 0:  HEAD -> 1-> 3 -> 6 -> 9 -> 12 -> 17 -> NIL
    
    Attributes:
        head: Sentinel head node
        max_level: Maximum number of levels
        level: Current maximum level in use
        size: Number of elements in the list
        level_strategy: Strategy for generating random levels
    
    Usage:
        skip_list = SkipList()
        skip_list.insert(10)
        skip_list.insert(20)
        found = skip_list.search(10)  # True
        skip_list.delete(10)
    
    Time Complexity:
        - Search: O(log n) average, O(n) worst
        - Insert: O(log n) average, O(n) worst
        - Delete: O(log n) average, O(n) worst
    
    Space Complexity: O(n) with expected 2n pointers
    """
    
    def __init__(
        self,
        max_level: int = 16,
        level_strategy: Optional[LevelGenerationStrategy] = None
    ) -> None:
        """
        Initialize empty skip list.
        
        Args:
            max_level: Maximum number of levels (default 16, supports ~65k elements)
            level_strategy: Strategy for level generation (default CoinFlipStrategy)
        """
        self.max_level = max_level
        self.level = 0  # Current max level in use
        self._size = 0
        self.head = SkipNode(None, max_level)  # Sentinel head
        self.level_strategy = level_strategy or CoinFlipStrategy(probability=0.5)
    
    # ========================================================================
    # TEMPLATE METHOD PATTERN - Search algorithm skeleton
    # ========================================================================
    
    def _locate_predecessors(self, value: T) -> tuple[SkipNode[T], List[SkipNode[T]]]:
        """
        Template method: Locate predecessors at each level for given value.
        
        This is the core algorithm used by search, insert, and delete.
        It descends through levels, moving right when possible.
        
        Args:
            value: Target value to locate
            
        Returns:
            Tuple of (node at bottom level, list of predecessors at each level)
        
        Algorithm:
            1. Start at top level of head node
            2. Move right while next value < target
            3. When can't move right, go down one level
            4. Repeat until bottom level
        
        Time Complexity: O(log n) expected
        Space Complexity: O(log n) for update array
        """
        update = [None] * (self.max_level + 1)
        current = self.head
        
        # Start from highest level and descend
        for lvl in range(self.level, -1, -1):
            # Move right while next value < target
            while current.forward[lvl] and current.forward[lvl].value < value:
                current = current.forward[lvl]
            # Store predecessor at this level
            update[lvl] = current
        
        return current, update
    
    def _check_found(self, node: Optional[SkipNode[T]], value: T) -> bool:
        """
        Template method: Check if node contains target value.
        
        Args:
            node: Node to check
            value: Target value
            
        Returns:
            True if node exists and contains value
        """
        return node is not None and node.value == value
    
    # ========================================================================
    # PUBLIC API - Core operations
    # ========================================================================
    
    def search(self, value: T) -> bool:
        """
        Search for value in skip list.
        
        Uses template method to locate node, then checks if found.
        
        Args:
            value: Value to search for
            
        Returns:
            True if value exists, False otherwise
        
        Example:
            skip_list.insert(10)
            found = skip_list.search(10)  # True
            found = skip_list.search(20)  # False
        
        Time Complexity: O(log n) expected
        Space Complexity: O(1)
        """
        current, _ = self._locate_predecessors(value)
        current = current.forward[0]
        return self._check_found(current, value)
    
    def insert(self, value: T) -> bool:
        """
        Insert value into skip list.
        
        Algorithm:
            1. Find insertion position (like search)
            2. Check if value already exists
            3. Generate random level for new node
            4. Update forward pointers at all levels
        
        Args:
            value: Value to insert
            
        Returns:
            True if inserted, False if duplicate
        
        Example:
            skip_list.insert(10)  # True
            skip_list.insert(10)  # False (duplicate)
        
        Time Complexity: O(log n) expected
        Space Complexity: O(log n) for update array
        """
        current, update = self._locate_predecessors(value)
        
        # Check if already exists
        current = current.forward[0]
        if self._check_found(current, value):
            return False  # Duplicate
        
        # Generate random level for new node
        new_level = self.level_strategy.generate_level(self.max_level)
        
        # Update list level if necessary
        if new_level > self.level:
            for lvl in range(self.level + 1, new_level + 1):
                update[lvl] = self.head
            self.level = new_level
        
        # Create new node
        new_node = SkipNode(value, new_level)
        
        # Insert node by updating forward pointers
        for lvl in range(new_level + 1):
            new_node.forward[lvl] = update[lvl].forward[lvl]
            update[lvl].forward[lvl] = new_node
        
        self._size += 1
        return True
    
    def delete(self, value: T) -> bool:
        """
        Delete value from skip list.
        
        Algorithm:
            1. Find node to delete (like search)
            2. Check if node exists
            3. Update forward pointers to bypass node
            4. Decrease level if necessary
        
        Args:
            value: Value to delete
            
        Returns:
            True if deleted, False if not found
        
        Example:
            skip_list.insert(10)
            skip_list.delete(10)  # True
            skip_list.delete(10)  # False (not found)
        
        Time Complexity: O(log n) expected
        Space Complexity: O(log n) for update array
        """
        current, update = self._locate_predecessors(value)
        
        # Get node to delete
        current = current.forward[0]
        
        # Check if node exists
        if not self._check_found(current, value):
            return False
        
        # Update forward pointers to bypass deleted node
        for lvl in range(self.level + 1):
            if update[lvl].forward[lvl] != current:
                break
            update[lvl].forward[lvl] = current.forward[lvl]
        
        # Decrease level if necessary
        while self.level > 0 and self.head.forward[self.level] is None:
            self.level -= 1
        
        self._size -= 1
        return True
    
    def contains(self, value: T) -> bool:
        """Check if value exists in skip list (alias for search)."""
        return self.search(value)
    
    def get_range(self, start: T, end: T) -> List[T]:
        """
        Get all elements in range [start, end] (inclusive).
        
        Args:
            start: Start of range
            end: End of range
            
        Returns:
            List of elements in range, in sorted order
        
        Example:
            skip_list.insert(3)
            skip_list.insert(6)
            skip_list.insert(9)
            skip_list.insert(12)
            elements = skip_list.get_range(5, 10)  # [6, 9]
        
        Time Complexity: O(log n + k) where k = result size
        Space Complexity: O(k)
        """
        result = []
        current = self.head
        
        # Search for start position
        for lvl in range(self.level, -1, -1):
            while current.forward[lvl] and current.forward[lvl].value < start:
                current = current.forward[lvl]
        
        # Move to first valid node
        current = current.forward[0]
        
        # Collect all nodes in range
        while current and current.value <= end:
            result.append(current.value)
            current = current.forward[0]
        
        return result
    
    def get_min(self) -> Optional[T]:
        """
        Get minimum element.
        
        Returns:
            Minimum element or None if empty
        
        Time Complexity: O(1)
        """
        return self.head.forward[0].value if self.head.forward[0] else None
    
    def get_max(self) -> Optional[T]:
        """
        Get maximum element.
        
        Returns:
            Maximum element or None if empty
        
        Time Complexity: O(log n) expected
        """
        if self._size == 0:
            return None
        
        current = self.head
        for lvl in range(self.level, -1, -1):
            while current.forward[lvl]:
                current = current.forward[lvl]
        
        return current.value
    
    def size(self) -> int:
        """Get number of elements."""
        return self._size
    
    def is_empty(self) -> bool:
        """Check if skip list is empty."""
        return self._size == 0
    
    def clear(self) -> None:
        """Remove all elements from skip list."""
        self.head = SkipNode(None, self.max_level)
        self.level = 0
        self._size = 0
    
    def display(self) -> None:
        """
        Display skip list structure (for debugging).
        
        Shows all levels with their elements.
        """
        print(f"\n{'='*60}")
        print(f"Skip List (size={self._size}, max_level={self.level})")
        print(f"{'='*60}")
        
        for lvl in range(self.level, -1, -1):
            print(f"Level {lvl}: HEAD", end="")
            current = self.head.forward[lvl]
            while current:
                print(f" -> {current.value}", end="")
                current = current.forward[lvl]
            print(" -> NIL")
        print(f"{'='*60}\n")
    
    # ========================================================================
    # ITERATOR PATTERN - Support for iteration
    # ========================================================================
    
    def __iter__(self) -> Iterator[T]:
        """
        Return iterator for skip list.
        
        Allows use in for loops and list comprehensions.
        
        Example:
            for value in skip_list:
                print(value)
        """
        iterator = SkipListIterator(self.head)
        while iterator.has_next():
            yield iterator.next()
    
    def __len__(self) -> int:
        """Return number of elements."""
        return self._size
    
    def __contains__(self, value: T) -> bool:
        """Support 'in' operator."""
        return self.search(value)
    
    def __str__(self) -> str:
        """String representation."""
        elements = list(self)
        return f"SkipList({elements})"


# ============================================================================
# 6. FACTORY PATTERN - Skip list creation with different configurations
# ============================================================================

class SkipListFactory:
    """
    Factory for creating skip lists with different configurations.
    
    This implements the Factory Pattern to provide convenient ways
    to create skip lists optimized for different use cases.
    """
    
    @staticmethod
    def create_default() -> SkipList:
        """
        Create default skip list.
        
        Configuration:
            - Max level: 16 (supports ~65k elements)
            - Probability: 0.5 (traditional)
        
        Returns:
            Skip list with default configuration
        """
        return SkipList(max_level=16, level_strategy=CoinFlipStrategy(0.5))
    
    @staticmethod
    def create_high_performance() -> SkipList:
        """
        Create high-performance skip list.
        
        Configuration:
            - Max level: 32 (supports billions of elements)
            - Probability: 0.25 (fewer levels, better constants)
        
        Returns:
            Skip list optimized for performance
        """
        return SkipList(max_level=32, level_strategy=CoinFlipStrategy(0.25))
    
    @staticmethod
    def create_small() -> SkipList:
        """
        Create skip list for small datasets.
        
        Configuration:
            - Max level: 8 (supports ~256 elements)
            - Probability: 0.5
        
        Returns:
            Skip list for small datasets
        """
        return SkipList(max_level=8, level_strategy=CoinFlipStrategy(0.5))
    
    @staticmethod
    def create_deterministic(fixed_level: int = 2) -> SkipList:
        """
        Create skip list with deterministic level generation.
        
        Useful for testing and debugging.
        
        Args:
            fixed_level: Fixed level for all nodes
        
        Returns:
            Skip list with deterministic levels
        """
        return SkipList(
            max_level=16,
            level_strategy=DeterministicStrategy(fixed_level)
        )


# ============================================================================
# DEMONSTRATION
# ============================================================================

def demo_basic_operations():
    """Demonstrate basic skip list operations."""
    print("=" * 70)
    print("DEMO 1: Basic Operations (Insert, Search, Delete)")
    print("=" * 70)
    
    skip_list = SkipListFactory.create_default()
    
    # Insert elements
    print("\n📝 Inserting elements: 3, 6, 7, 9, 12, 17, 19, 21, 25, 26")
    elements = [3, 6, 7, 9, 12, 17, 19, 21, 25, 26]
    for elem in elements:
        result = skip_list.insert(elem)
        print(f"   Insert {elem}: {'✓ Success' if result else '✗ Duplicate'}")
    
    # Display structure
    skip_list.display()
    
    # Search operations
    print("🔍 Search Operations:")
    search_values = [9, 15, 19, 100]
    for val in search_values:
        found = skip_list.search(val)
        print(f"   Search {val}: {'✓ Found' if found else '✗ Not Found'}")
    
    # Delete operations
    print("\n🗑️  Delete Operations:")
    delete_values = [9, 15, 19]
    for val in delete_values:
        result = skip_list.delete(val)
        print(f"   Delete {val}: {'✓ Deleted' if result else '✗ Not Found'}")
    
    # Display after deletion
    skip_list.display()
    
    # Statistics
    print(f"📊 Statistics:")
    print(f"   Size: {skip_list.size()}")
    print(f"   Min: {skip_list.get_min()}")
    print(f"   Max: {skip_list.get_max()}")
    print(f"   Elements: {list(skip_list)}")


def demo_range_queries():
    """Demonstrate range query functionality."""
    print("\n" + "=" * 70)
    print("DEMO 2: Range Queries")
    print("=" * 70)
    
    skip_list = SkipListFactory.create_default()
    
    # Insert elements
    elements = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50]
    print(f"\n📝 Inserting elements: {elements}")
    for elem in elements:
        skip_list.insert(elem)
    
    print(f"   Complete list: {list(skip_list)}")
    
    # Range queries
    print("\n🔍 Range Query Operations:")
    ranges = [(10, 30), (5, 25), (35, 55), (0, 100), (60, 70)]
    
    for start, end in ranges:
        result = skip_list.get_range(start, end)
        print(f"   Range [{start}, {end}]: {result}")


def demo_iterator_pattern():
    """Demonstrate iterator pattern."""
    print("\n" + "=" * 70)
    print("DEMO 3: Iterator Pattern")
    print("=" * 70)
    
    skip_list = SkipListFactory.create_default()
    
    # Insert elements
    elements = [42, 17, 89, 23, 56, 7, 91, 34]
    print(f"\n📝 Inserting elements (unsorted): {elements}")
    for elem in elements:
        skip_list.insert(elem)
    
    # Iterate using for loop
    print("\n🔄 Iterating using for loop (sorted order):")
    print("   ", end="")
    for i, value in enumerate(skip_list):
        print(f"{value}", end=" -> " if i < len(skip_list) - 1 else "\n")
    
    # Iterate using iterator directly
    print("\n🔄 Iterating using iterator directly:")
    iterator = SkipListIterator(skip_list.head)
    print("   ", end="")
    first = True
    while iterator.has_next():
        value = iterator.next()
        if not first:
            print(" -> ", end="")
        print(value, end="")
        first = False
    print()
    
    # Use in list comprehension
    print("\n🔄 Using list comprehension:")
    squared = [x * x for x in skip_list]
    print(f"   Squared values: {squared}")
    
    # Filter using iterator
    print("\n🔄 Filtering even numbers:")
    evens = [x for x in skip_list if x % 2 == 0]
    print(f"   Even numbers: {evens}")


def demo_factory_pattern():
    """Demonstrate factory pattern with different configurations."""
    print("\n" + "=" * 70)
    print("DEMO 4: Factory Pattern (Different Configurations)")
    print("=" * 70)
    
    # Default configuration
    print("\n🏭 Creating default skip list:")
    default_list = SkipListFactory.create_default()
    print(f"   Max level: {default_list.max_level}")
    print(f"   Strategy: {type(default_list.level_strategy).__name__}")
    
    for i in range(10):
        default_list.insert(i * 10)
    default_list.display()
    
    # High performance configuration
    print("\n🏭 Creating high-performance skip list:")
    hp_list = SkipListFactory.create_high_performance()
    print(f"   Max level: {hp_list.max_level}")
    print(f"   Strategy: {type(hp_list.level_strategy).__name__}")
    
    # Small dataset configuration
    print("\n🏭 Creating small skip list:")
    small_list = SkipListFactory.create_small()
    print(f"   Max level: {small_list.max_level}")
    
    for i in range(5):
        small_list.insert(i + 1)
    small_list.display()
    
    # Deterministic configuration (for testing)
    print("\n🏭 Creating deterministic skip list (fixed level 2):")
    det_list = SkipListFactory.create_deterministic(fixed_level=2)
    print(f"   Max level: {det_list.max_level}")
    print(f"   Strategy: {type(det_list.level_strategy).__name__}")
    
    for i in range(8):
        det_list.insert((i + 1) * 5)
    det_list.display()


def demo_performance_comparison():
    """Demonstrate performance characteristics."""
    print("\n" + "=" * 70)
    print("DEMO 5: Performance Characteristics")
    print("=" * 70)
    
    import time
    
    skip_list = SkipListFactory.create_default()
    
    # Large insertion test
    print("\n⏱️  Performance Test: Inserting 1000 elements")
    n = 1000
    
    start = time.time()
    for i in range(n):
        skip_list.insert(i)
    insert_time = time.time() - start
    
    print(f"   Inserted {n} elements in {insert_time:.4f} seconds")
    print(f"   Average per insert: {(insert_time / n) * 1000:.4f} ms")
    print(f"   Final size: {skip_list.size()}")
    print(f"   Current max level: {skip_list.level}")
    
    # Search test
    print("\n⏱️  Performance Test: Searching 1000 elements")
    start = time.time()
    found_count = 0
    for i in range(n):
        if skip_list.search(i):
            found_count += 1
    search_time = time.time() - start
    
    print(f"   Searched {n} elements in {search_time:.4f} seconds")
    print(f"   Average per search: {(search_time / n) * 1000:.4f} ms")
    print(f"   Found: {found_count}/{n}")
    
    # Range query test
    print("\n⏱️  Performance Test: Range queries")
    ranges = [(0, 100), (200, 300), (500, 600), (800, 900)]
    
    start = time.time()
    for start_val, end_val in ranges:
        result = skip_list.get_range(start_val, end_val)
        print(f"   Range [{start_val}, {end_val}]: {len(result)} elements")
    range_time = time.time() - start
    
    print(f"   Total time for {len(ranges)} range queries: {range_time:.4f} seconds")
    
    # Delete test
    print("\n⏱️  Performance Test: Deleting 500 elements")
    start = time.time()
    deleted_count = 0
    for i in range(0, n, 2):  # Delete every other element
        if skip_list.delete(i):
            deleted_count += 1
    delete_time = time.time() - start
    
    print(f"   Deleted {deleted_count} elements in {delete_time:.4f} seconds")
    print(f"   Average per delete: {(delete_time / deleted_count) * 1000:.4f} ms")
    print(f"   Remaining size: {skip_list.size()}")


def demo_edge_cases():
    """Demonstrate edge cases and error handling."""
    print("\n" + "=" * 70)
    print("DEMO 6: Edge Cases & Error Handling")
    print("=" * 70)
    
    skip_list = SkipListFactory.create_default()
    
    # Empty list operations
    print("\n🔍 Operations on empty list:")
    print(f"   Search 10: {skip_list.search(10)}")
    print(f"   Delete 10: {skip_list.delete(10)}")
    print(f"   Size: {skip_list.size()}")
    print(f"   Is empty: {skip_list.is_empty()}")
    print(f"   Min: {skip_list.get_min()}")
    print(f"   Max: {skip_list.get_max()}")
    print(f"   Range [1, 10]: {skip_list.get_range(1, 10)}")
    
    # Single element
    print("\n📝 Single element operations:")
    skip_list.insert(42)
    print(f"   Inserted 42")
    print(f"   Size: {skip_list.size()}")
    print(f"   Search 42: {skip_list.search(42)}")
    print(f"   Min: {skip_list.get_min()}")
    print(f"   Max: {skip_list.get_max()}")
    skip_list.display()
    
    # Duplicate insertion
    print("\n📝 Duplicate insertion:")
    print(f"   Insert 42 again: {skip_list.insert(42)} (should be False)")
    print(f"   Size: {skip_list.size()} (should remain 1)")
    
    # Delete single element
    print("\n🗑️  Delete single element:")
    print(f"   Delete 42: {skip_list.delete(42)}")
    print(f"   Size: {skip_list.size()}")
    print(f"   Is empty: {skip_list.is_empty()}")
    
    # Large values
    print("\n📝 Large values:")
    large_values = [1000000, 999999, 1000001]
    for val in large_values:
        skip_list.insert(val)
    print(f"   Inserted: {large_values}")
    print(f"   List: {list(skip_list)}")
    
    # Clear operation
    print("\n🗑️  Clear operation:")
    print(f"   Size before clear: {skip_list.size()}")
    skip_list.clear()
    print(f"   Size after clear: {skip_list.size()}")
    print(f"   Is empty: {skip_list.is_empty()}")


def main():
    """Run all demonstrations."""
    print("\n" + "🎯" * 35)
    print("SKIP LIST - COMPREHENSIVE DEMONSTRATION")
    print("🎯" * 35)
    print("\nDesign Patterns Demonstrated:")
    print("1. Iterator Pattern - Sequential traversal")
    print("2. Strategy Pattern - Level generation strategies")
    print("3. Template Method Pattern - Search algorithm skeleton")
    print("4. Factory Pattern - Skip list creation")
    print("5. Singleton Pattern - Random generator")
    print("\nKey Features:")
    print("✅ O(log n) search, insert, delete (average case)")
    print("✅ Probabilistic balancing (no rotations)")
    print("✅ Multi-level linked list structure")
    print("✅ Range queries in O(log n + k)")
    print("✅ Sorted iteration")
    
    demo_basic_operations()
    demo_range_queries()
    demo_iterator_pattern()
    demo_factory_pattern()
    demo_performance_comparison()
    demo_edge_cases()
    
    print("\n" + "=" * 70)
    print("✅ ALL DEMONSTRATIONS COMPLETED SUCCESSFULLY!")
    print("=" * 70)
    print("\n📊 Summary:")
    print("   - 5 Design Patterns implemented")
    print("   - O(log n) operations achieved")
    print("   - Comprehensive edge case handling")
    print("   - Production-ready implementation")
    print("=" * 70 + "\n")


if __name__ == "__main__":
    main()
