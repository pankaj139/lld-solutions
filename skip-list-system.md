# Skip List - Low Level Design

## 1. Problem Statement

Design a Skip List data structure that provides O(log n) average-case time complexity for search, insert, and delete operations using a probabilistic approach with multi-level linked lists.

### Core Requirements

1. **Basic Operations**
   - Insert element
   - Search element
   - Delete element
   - Contains check
   - All operations in O(log n) average case

2. **Structure**
   - Multi-level linked lists (tower structure)
   - Bottom level contains all elements in sorted order
   - Higher levels act as "express lanes"
   - Probabilistic balancing (no rotations needed)

3. **Level Generation**
   - Random level assignment using coin flip
   - Maximum level cap (typically log n)
   - Probability parameter (usually 0.5)

4. **Traversal**
   - Forward iteration in sorted order
   - Range queries
   - Level-by-level descent during search

5. **Advanced Features**
   - Range search (find all elements in range)
   - Rank query (find kth smallest element)
   - Update operations
   - Bulk operations

### Non-Functional Requirements

1. **Performance**
   - O(log n) average search, insert, delete
   - O(n) space complexity
   - Better cache locality than BST

2. **Simplicity**
   - No complex balancing like AVL/Red-Black trees
   - Simple probabilistic approach
   - Easy to implement and understand

3. **Concurrency**
   - Lock-free implementations possible
   - Better than BSTs for concurrent access

## 2. Skip List Structure

### 2.1 Conceptual View

```text
Level 3:  HEAD --------------------------------> NIL
                |
Level 2:  HEAD --------> 6 -------------------> NIL
                |        |
Level 1:  HEAD -----> 3 -> 6 -----> 12 -------> NIL
                |     |    |        |
Level 0:  HEAD -> 1-> 3 -> 6 -> 9 -> 12 -> 17 -> NIL
```

### 2.2 Node Structure

```text
SkipNode
├── value: T
├── forward: Array[SkipNode]  // Forward pointers at each level
└── level: int                // Height of this node's tower
```

### 2.3 Tower Metaphor

Each node is like a building with different heights:

- All nodes have ground floor (level 0)
- Some nodes have additional floors (express lanes)
- Taller towers allow faster traversal
- Probabilistic heights maintain balance

## 3. Class Diagram

```text
┌────────────────────────────────────────────────┐
│                  SkipList<T>                    │
├────────────────────────────────────────────────┤
│ - head: SkipNode<T>                            │
│ - max_level: int                               │
│ - level: int  (current max level in use)      │
│ - size: int                                     │
│ - p: float  (promotion probability)            │
├────────────────────────────────────────────────┤
│ + insert(value: T): bool                       │
│ + search(value: T): bool                       │
│ + delete(value: T): bool                       │
│ + contains(value: T): bool                     │
│ + size(): int                                   │
│ + is_empty(): bool                             │
│ + clear(): void                                │
│ + get_range(start: T, end: T): List[T]        │
│ - random_level(): int                          │
└────────────────────────────────────────────────┘
                    │
                    │ contains
                    ▼
┌────────────────────────────────────────────────┐
│               SkipNode<T>                       │
├────────────────────────────────────────────────┤
│ - value: T                                      │
│ - forward: List[SkipNode<T>]                   │
│ - level: int                                    │
├────────────────────────────────────────────────┤
│ + __init__(value: T, level: int)              │
│ + get_value(): T                                │
│ + get_forward(level: int): SkipNode<T>        │
│ + set_forward(level: int, node: SkipNode<T>)  │
└────────────────────────────────────────────────┘

┌────────────────────────────────────────────────┐
│            SkipListIterator<T>                  │
├────────────────────────────────────────────────┤
│ - current: SkipNode<T>                         │
├────────────────────────────────────────────────┤
│ + has_next(): bool                             │
│ + next(): T                                     │
└────────────────────────────────────────────────┘
```

## 4. Design Patterns Used

### 4.1 Iterator Pattern

**Purpose:** Provide sequential access to elements in sorted order.

**Implementation:**

```python
class SkipListIterator:
    def __init__(self, head):
        self.current = head.forward[0]  # Start at first real node
    
    def has_next(self):
        return self.current is not None
    
    def next(self):
        value = self.current.value
        self.current = self.current.forward[0]
        return value
```

### 4.2 Strategy Pattern (Level Generation)

**Purpose:** Different strategies for generating random levels.

**Strategies:**

- **CoinFlipStrategy:** Traditional 50% probability
- **CustomProbabilityStrategy:** Configurable probability (e.g., 25%)
- **DeterministicStrategy:** For testing (predictable levels)

### 4.3 Template Method Pattern

**Purpose:** Define skeleton of search algorithm.

```python
class SkipList:
    def search_template(self, value):
        # Template method
        current = self._locate_predecessors(value)
        current = current.forward[0]
        return self._check_found(current, value)
```

### 4.4 Factory Pattern

**Purpose:** Create skip list with different configurations.

```python
class SkipListFactory:
    @staticmethod
    def create_default():
        return SkipList(max_level=16, p=0.5)
    
    @staticmethod
    def create_high_performance():
        return SkipList(max_level=32, p=0.25)
```

### 4.5 Singleton Pattern (for Random Generator)

**Purpose:** Single random number generator instance.

## 5. Key Algorithms

### 5.1 Random Level Generation

**Purpose:** Generate random level for new node using coin flip.

**Algorithm:**

```python
def random_level(self):
    """
    Generate random level using geometric distribution
    
    Expected level = 1 / (1 - p)
    For p = 0.5, expected level = 2
    """
    level = 1
    while random.random() < self.p and level < self.max_level:
        level += 1
    return level
```

**Time Complexity:** O(log n) expected
**Space Complexity:** O(1)

**Example:**

```text
Coin flips: H T T H T
Level: 1 → 2 → 2 → 3 → 3 (stop at first tails or max level)

Probability distribution:
Level 1: 50%
Level 2: 25%
Level 3: 12.5%
Level 4: 6.25%
...
```

### 5.2 Search Operation

**Purpose:** Find if element exists in skip list.

**Algorithm:**

```python
def search(self, value):
    """
    Search from top level, descend when can't go right
    
    Time: O(log n) expected
    Space: O(1)
    """
    current = self.head
    
    # Start from highest level
    for level in range(self.level, -1, -1):
        # Move right while next value < target
        while current.forward[level] and current.forward[level].value < value:
            current = current.forward[level]
    
    # Move to level 0
    current = current.forward[0]
    
    # Check if found
    return current and current.value == value
```

**Visualization:**

```text
Search for 12:

Level 2:  HEAD --------> 6 -------------------> NIL
          start         go right, can't proceed
                         ↓
Level 1:  HEAD -----> 3 -> 6 -----> 12 -------> NIL
                                    go right
                                     ↓
Level 0:  HEAD -> 1-> 3 -> 6 -> 9 -> 12 -> 17 -> NIL
                                     found!

Path: HEAD(L2) → 6(L2) → 6(L1) → 12(L1) → 12(L0)
```

**Time Complexity:** O(log n) expected
**Space Complexity:** O(1)

### 5.3 Insert Operation

**Purpose:** Insert new element maintaining skip list properties.

**Algorithm:**

```python
def insert(self, value):
    """
    1. Find insertion position (like search)
    2. Generate random level for new node
    3. Update forward pointers at all levels
    
    Time: O(log n) expected
    Space: O(log n) for update array
    """
    update = [None] * (self.max_level + 1)
    current = self.head
    
    # Find predecessors at each level
    for level in range(self.level, -1, -1):
        while current.forward[level] and current.forward[level].value < value:
            current = current.forward[level]
        update[level] = current
    
    # Check if already exists
    current = current.forward[0]
    if current and current.value == value:
        return False  # Duplicate
    
    # Generate random level
    new_level = self.random_level()
    
    # Update list level if necessary
    if new_level > self.level:
        for level in range(self.level + 1, new_level + 1):
            update[level] = self.head
        self.level = new_level
    
    # Create new node
    new_node = SkipNode(value, new_level)
    
    # Insert node by updating forward pointers
    for level in range(new_level + 1):
        new_node.forward[level] = update[level].forward[level]
        update[level].forward[level] = new_node
    
    self.size += 1
    return True
```

**Visualization:**

```text
Insert 7 with random level = 2:

Before:
Level 2:  HEAD --------> 6 -------------------> NIL
Level 1:  HEAD -----> 3 -> 6 -----> 12 -------> NIL
Level 0:  HEAD -> 1-> 3 -> 6 -> 9 -> 12 -> 17 -> NIL
                              ^
                          insert here

After:
Level 2:  HEAD --------> 6 -> 7 --------------> NIL
Level 1:  HEAD -----> 3 -> 6 -> 7 -> 12 -------> NIL
Level 0:  HEAD -> 1-> 3 -> 6 -> 7 -> 9 -> 12 -> 17 -> NIL
```

**Time Complexity:** O(log n) expected
**Space Complexity:** O(log n) for update array

### 5.4 Delete Operation

**Purpose:** Remove element from skip list.

**Algorithm:**

```python
def delete(self, value):
    """
    1. Find node to delete (like search)
    2. Update forward pointers to bypass node
    3. Decrease level if necessary
    
    Time: O(log n) expected
    Space: O(log n) for update array
    """
    update = [None] * (self.max_level + 1)
    current = self.head
    
    # Find predecessors at each level
    for level in range(self.level, -1, -1):
        while current.forward[level] and current.forward[level].value < value:
            current = current.forward[level]
        update[level] = current
    
    # Get node to delete
    current = current.forward[0]
    
    # Check if node exists
    if not current or current.value != value:
        return False
    
    # Update forward pointers to bypass deleted node
    for level in range(self.level + 1):
        if update[level].forward[level] != current:
            break
        update[level].forward[level] = current.forward[level]
    
    # Decrease level if necessary
    while self.level > 0 and self.head.forward[self.level] is None:
        self.level -= 1
    
    self.size -= 1
    return True
```

**Time Complexity:** O(log n) expected
**Space Complexity:** O(log n) for update array

### 5.5 Range Query

**Purpose:** Find all elements in a given range.

**Algorithm:**

```python
def get_range(self, start, end):
    """
    Find all elements in [start, end]
    
    Time: O(log n + k) where k = number of results
    Space: O(k)
    """
    result = []
    current = self.head
    
    # Search for start position
    for level in range(self.level, -1, -1):
        while current.forward[level] and current.forward[level].value < start:
            current = current.forward[level]
    
    # Move to first valid node
    current = current.forward[0]
    
    # Collect all nodes in range
    while current and current.value <= end:
        result.append(current.value)
        current = current.forward[0]
    
    return result
```

**Time Complexity:** O(log n + k) where k = result size
**Space Complexity:** O(k)

## 6. Complexity Analysis

### 6.1 Time Complexity

| Operation | Average Case | Worst Case |
|-----------|-------------|------------|
| Search | O(log n) | O(n) |
| Insert | O(log n) | O(n) |
| Delete | O(log n) | O(n) |
| Get Min | O(1) | O(1) |
| Get Max | O(log n) | O(n) |
| Range Query | O(log n + k) | O(n) |
| Iterate | O(n) | O(n) |

### 6.2 Space Complexity

**Total Space:** O(n)

**Expected space per node:**

```text
Expected level = 1 / (1 - p)
For p = 0.5: E[level] = 2

Total pointers = n * E[level] = 2n
Space = O(n)
```

### 6.3 Comparison with Other Data Structures

| Structure | Search | Insert | Delete | Space | Balancing |
|-----------|--------|--------|--------|-------|-----------|
| Skip List | O(log n) | O(log n) | O(log n) | O(n) | Probabilistic |
| BST | O(log n) | O(log n) | O(log n) | O(n) | Manual rotations |
| AVL Tree | O(log n) | O(log n) | O(log n) | O(n) | Strict rotations |
| Hash Table | O(1) | O(1) | O(1) | O(n) | N/A (no order) |

**Advantages of Skip List:**

- Simpler implementation than balanced BSTs
- No rotations needed
- Better cache locality
- Lock-free implementations easier
- Probabilistic guarantees

## 7. Implementation Examples

### 7.1 Basic Operations

```python
# Create skip list
skip_list = SkipList(max_level=16, p=0.5)

# Insert elements
skip_list.insert(3)
skip_list.insert(6)
skip_list.insert(7)
skip_list.insert(9)
skip_list.insert(12)
skip_list.insert(17)

# Search
found = skip_list.search(9)  # True
found = skip_list.search(10) # False

# Delete
skip_list.delete(9)

# Check size
size = skip_list.size()  # 5
```

### 7.2 Range Query

```python
# Get all elements between 5 and 12 (inclusive)
elements = skip_list.get_range(5, 12)
# Returns: [6, 7, 12]
```

### 7.3 Iteration

```python
# Iterate in sorted order
for value in skip_list:
    print(value)
# Output: 3 6 7 12 17
```

## 8. Edge Cases & Error Handling

### 8.1 Empty Skip List

```python
# Search in empty list
skip_list = SkipList()
result = skip_list.search(5)  # False
```

### 8.2 Duplicate Insertion

```python
# Insert same element twice
skip_list.insert(5)
skip_list.insert(5)  # Returns False (already exists)
```

### 8.3 Delete Non-existent Element

```python
# Delete element that doesn't exist
result = skip_list.delete(100)  # Returns False
```

### 8.4 Maximum Level Reached

```python
# When random level exceeds max_level
# Capped at max_level automatically
```

### 8.5 Single Element

```python
# List with one element
skip_list.insert(5)
skip_list.delete(5)
# List becomes empty correctly
```

## 9. Optimizations

### 9.1 Cache Optimization

**Problem:** Poor cache locality with random pointer jumps.

**Solution:** Use array-based implementation for better cache.

```python
# Instead of linked nodes, use arrays
class ArraySkipList:
    def __init__(self):
        self.values = []
        self.levels = []
        self.forward = []  # 2D array
```

### 9.2 Probabilistic Analysis

**Optimal probability p:**

Theoretical analysis shows p = 0.25 gives better constants:

```text
p = 0.5: Average comparisons = 2 * log n
p = 0.25: Average comparisons = 1.33 * log n (better!)
```

### 9.3 Lazy Deletion

**Problem:** Delete operation requires updating multiple levels.

**Solution:** Mark nodes as deleted without removing.

```python
class SkipNode:
    def __init__(self, value, level):
        self.value = value
        self.level = level
        self.forward = [None] * (level + 1)
        self.deleted = False  # Lazy deletion flag
```

### 9.4 Deterministic Skip Lists

**Problem:** Worst-case O(n) performance possible.

**Solution:** Use deterministic balancing (1-2 Skip Lists).

## 10. Advanced Features

### 10.1 Rank Query

**Find kth smallest element:**

```python
def find_kth(self, k):
    """
    Find kth smallest element (1-indexed)
    Requires maintaining subtree sizes
    """
    if k < 1 or k > self.size:
        return None
    
    current = self.head
    remaining = k
    
    for level in range(self.level, -1, -1):
        while current.forward[level]:
            span = current.span[level]  # Distance to next node
            if remaining > span:
                remaining -= span
                current = current.forward[level]
            else:
                break
    
    return current.forward[0].value if remaining == 1 else None
```

### 10.2 Concurrent Skip List

**Lock-free implementation:**

```python
from threading import Lock

class ConcurrentSkipList:
    def insert(self, value):
        with self.lock:
            # Use CAS (Compare-And-Swap) for lock-free
            return self._insert_internal(value)
```

### 10.3 Persistent Skip List

**Maintain version history:**

```python
class PersistentSkipList:
    def __init__(self):
        self.versions = []
    
    def insert(self, value):
        new_version = self._copy_and_insert(value)
        self.versions.append(new_version)
```

## 11. Testing Strategy

### 11.1 Unit Tests

```python
# Test basic operations
test_insert_single()
test_insert_multiple()
test_search_existing()
test_search_non_existing()
test_delete_existing()
test_delete_non_existing()

# Test edge cases
test_empty_list()
test_duplicate_insert()
test_delete_all()
test_large_dataset()

# Test ordering
test_sorted_iteration()
test_range_query()
```

### 11.2 Property-Based Tests

```python
# Invariants to check
def test_invariants(skip_list):
    # 1. Bottom level contains all elements
    # 2. Higher levels are subsets of lower levels
    # 3. All levels maintain sorted order
    # 4. No duplicate values
    assert check_sorted_order(skip_list)
    assert check_subset_property(skip_list)
```

### 11.3 Performance Tests

```python
# Benchmark against other structures
test_search_performance()
test_insert_performance()
test_delete_performance()
test_memory_usage()
```

## 12. Real-World Applications

### 12.1 Database Indexing

**Use Case:** In-memory database indexes (e.g., Redis)

```python
# Redis uses skip list for sorted sets
ZADD myset 1 "one"
ZADD myset 2 "two"
ZRANGE myset 0 -1  # Uses skip list internally
```

### 12.2 Priority Queues

**Use Case:** Concurrent priority queue

### 12.3 Range Queries

**Use Case:** Find all events in time range

### 12.4 Leaderboards

**Use Case:** Gaming leaderboards with rank queries

## 13. Summary

### Key Design Patterns (5)

1. **Iterator Pattern** - Sequential traversal
2. **Strategy Pattern** - Level generation strategies
3. **Template Method** - Search algorithm skeleton
4. **Factory Pattern** - Skip list creation
5. **Singleton Pattern** - Random generator

### Core Algorithms

1. **Random Level Generation** - O(log n) expected using coin flip
2. **Search** - O(log n) expected with level descent
3. **Insert** - O(log n) expected with pointer updates
4. **Delete** - O(log n) expected with pointer cleanup
5. **Range Query** - O(log n + k) for k results

### Complexity Analysis

**Time Complexity:**

- Search: O(log n) average, O(n) worst
- Insert: O(log n) average, O(n) worst
- Delete: O(log n) average, O(n) worst

**Space Complexity:** O(n) with expected 2n pointers

### Features Implemented

✅ O(log n) search, insert, delete  
✅ Probabilistic balancing (no rotations)  
✅ Multi-level linked list structure  
✅ Random level generation  
✅ Sorted iteration  
✅ Range queries  
✅ Duplicate handling  
✅ Edge case coverage  

### Real-World Applications

- **Redis** - Sorted sets implementation
- **LevelDB** - MemTable implementation
- **Apache Cassandra** - Memtable indexing
- **Concurrent Skip Lists** - Java ConcurrentSkipListMap

---

**Difficulty:** HARD (P3 - Medium Priority)  
**Category:** Data Structures  
**Estimated Implementation Time:** 4-6 hours  
**Lines of Code:** ~600-800 (with comprehensive features)
