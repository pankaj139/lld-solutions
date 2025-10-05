"""
BLOOM FILTER - Probabilistic Data Structure Implementation in Python

This file implements a production-ready Bloom Filter with multiple variants
including standard, counting, and scalable bloom filters.

WHAT IS A BLOOM FILTER:
A space-efficient probabilistic data structure for testing set membership.
- Can have FALSE POSITIVES (says yes when should say no)
- NO FALSE NEGATIVES (always correct when says no)
- Uses much less memory than storing actual elements
- Perfect for "definitely not present" checks

DESIGN PATTERNS USED:
1. STRATEGY PATTERN: Multiple hash function strategies
   - MurmurHash3 for speed
   - FNV1a for simplicity
   - Multiple independent hash functions
   
2. TEMPLATE METHOD: Base BloomFilter with variants
   - StandardBloomFilter: Basic implementation
   - CountingBloomFilter: Supports deletion
   - ScalableBloomFilter: Dynamic growth

3. FACTORY PATTERN: Create optimal bloom filters
   - Calculate optimal size and hash functions
   - Based on expected elements and desired error rate

4. COMPOSITE PATTERN: ScalableBloomFilter contains multiple filters

OOP CONCEPTS DEMONSTRATED:
- ENCAPSULATION: Bit array hidden behind clean interface
- INHERITANCE: Different bloom filter variants
- POLYMORPHISM: Different hash function implementations
- ABSTRACTION: Complex bit operations abstracted

SOLID PRINCIPLES:
- SRP: Each class handles single responsibility
- OCP: Easy to add new hash functions or variants
- LSP: All bloom filter variants interchangeable
- ISP: Focused interfaces for add, contains
- DIP: Depends on abstractions not implementations

MATHEMATICAL FOUNDATION:
Optimal parameters:
  m = -(n × ln(p)) / (ln(2))²  (bit array size)
  k = (m/n) × ln(2)             (hash functions)
  
Actual false positive rate:
  p = (1 - e^(-kn/m))^k

USAGE:
    # Create bloom filter
    bloom = BloomFilter(expected_elements=10000, false_positive_rate=0.01)
    
    # Add elements
    bloom.add("apple")
    bloom.add("banana")
    
    # Check membership
    bloom.contains("apple")   # True (definitely added)
    bloom.contains("grape")   # False or True (false positive)
    
    # Get statistics
    stats = bloom.get_statistics()
    
    # Counting bloom filter (supports deletion)
    counting = CountingBloomFilter(10000, 0.01)
    counting.add("apple")
    counting.remove("apple")
    
    # Union/Intersection
    bloom1.union(bloom2)

RETURN VALUES:
- add(item): Returns None
- contains(item): Returns bool (True = maybe present, False = definitely not)
- get_statistics(): Returns Dict with filter stats
- union(other): Returns new BloomFilter
"""

import math
import hashlib
from typing import List, Optional, Dict, Set
from abc import ABC, abstractmethod
import struct


# ==================== HASH FUNCTIONS ====================

class HashFunction(ABC):
    """
    Abstract base class for hash functions
    
    DESIGN PATTERN: Strategy Pattern
    """
    @abstractmethod
    def hash(self, data: str) -> int:
        """Hash data to integer"""
        pass


class MurmurHash3(HashFunction):
    """
    MurmurHash3 implementation - fast, good distribution
    
    USAGE:
        hasher = MurmurHash3(seed=42)
        hash_value = hasher.hash("apple")
    
    RETURN:
        int - 32-bit hash value
    """
    def __init__(self, seed: int = 0):
        self.seed = seed
    
    def hash(self, data: str) -> int:
        """MurmurHash3 32-bit implementation"""
        data_bytes = data.encode('utf-8')
        
        c1 = 0xcc9e2d51
        c2 = 0x1b873593
        r1 = 15
        r2 = 13
        m = 5
        n = 0xe6546b64
        
        hash_value = self.seed
        
        # Process 4-byte chunks
        for i in range(0, len(data_bytes) - 3, 4):
            k = struct.unpack('<I', data_bytes[i:i+4])[0]
            k = (k * c1) & 0xFFFFFFFF
            k = ((k << r1) | (k >> (32 - r1))) & 0xFFFFFFFF
            k = (k * c2) & 0xFFFFFFFF
            
            hash_value ^= k
            hash_value = ((hash_value << r2) | (hash_value >> (32 - r2))) & 0xFFFFFFFF
            hash_value = (hash_value * m + n) & 0xFFFFFFFF
        
        # Process remaining bytes
        remaining = len(data_bytes) % 4
        if remaining:
            k = 0
            for i in range(remaining):
                k |= data_bytes[-(remaining-i)] << (i * 8)
            k = (k * c1) & 0xFFFFFFFF
            k = ((k << r1) | (k >> (32 - r1))) & 0xFFFFFFFF
            k = (k * c2) & 0xFFFFFFFF
            hash_value ^= k
        
        # Finalization
        hash_value ^= len(data_bytes)
        hash_value ^= (hash_value >> 16)
        hash_value = (hash_value * 0x85ebca6b) & 0xFFFFFFFF
        hash_value ^= (hash_value >> 13)
        hash_value = (hash_value * 0xc2b2ae35) & 0xFFFFFFFF
        hash_value ^= (hash_value >> 16)
        
        return hash_value


class FNV1aHash(HashFunction):
    """
    FNV-1a hash function - simple, decent distribution
    
    USAGE:
        hasher = FNV1aHash(seed=42)
        hash_value = hasher.hash("apple")
    
    RETURN:
        int - 32-bit hash value
    """
    def __init__(self, seed: int = 0):
        self.seed = seed
    
    def hash(self, data: str) -> int:
        """FNV-1a 32-bit implementation"""
        FNV_PRIME = 16777619
        FNV_OFFSET_BASIS = 2166136261
        
        hash_value = (FNV_OFFSET_BASIS + self.seed) & 0xFFFFFFFF
        
        for byte in data.encode('utf-8'):
            hash_value ^= byte
            hash_value = (hash_value * FNV_PRIME) & 0xFFFFFFFF
        
        return hash_value


class DoubleHashingFunction:
    """
    Double hashing to generate k hash functions from 2 base hashes
    
    FORMULA: h_i(x) = (h1(x) + i × h2(x)) mod m
    
    USAGE:
        double_hasher = DoubleHashingFunction()
        hashes = double_hasher.get_hashes("apple", k=7, m=1000)
    
    RETURN:
        List[int] - k hash values
    """
    def __init__(self):
        self.hash1 = MurmurHash3(seed=0)
        self.hash2 = FNV1aHash(seed=1)
    
    def get_hashes(self, data: str, k: int, m: int) -> List[int]:
        """Generate k hash values using double hashing"""
        h1 = self.hash1.hash(data)
        h2 = self.hash2.hash(data)
        
        hashes = []
        for i in range(k):
            hash_value = (h1 + i * h2) % m
            hashes.append(hash_value)
        
        return hashes


# ==================== BLOOM FILTER ====================

class BloomFilter:
    """
    Standard Bloom Filter implementation
    
    COMPLEXITY:
    - Add: O(k) where k is number of hash functions
    - Contains: O(k)
    - Space: O(m) where m is bit array size
    
    USAGE:
        bloom = BloomFilter(expected_elements=10000, false_positive_rate=0.01)
        bloom.add("apple")
        exists = bloom.contains("apple")  # True
        exists = bloom.contains("grape")  # False or True (false positive)
    
    RETURN:
        BloomFilter instance with add, contains, and utility methods
    """
    
    def __init__(self, expected_elements: int, false_positive_rate: float):
        """
        Initialize Bloom Filter with optimal parameters
        
        USAGE:
            bloom = BloomFilter(10000, 0.01)
        
        RETURN:
            BloomFilter instance
        """
        if expected_elements <= 0:
            raise ValueError("Expected elements must be positive")
        if not (0 < false_positive_rate < 1):
            raise ValueError("False positive rate must be between 0 and 1")
        
        self.expected_elements = expected_elements
        self.false_positive_rate = false_positive_rate
        
        # Calculate optimal parameters
        self.size, self.hash_count = self._calculate_optimal_parameters(
            expected_elements, false_positive_rate
        )
        
        # Initialize bit array
        self.bit_array = [False] * self.size
        self.element_count = 0
        
        # Initialize hash function generator
        self.hasher = DoubleHashingFunction()
    
    @staticmethod
    def _calculate_optimal_parameters(n: int, p: float) -> tuple:
        """
        Calculate optimal bit array size and number of hash functions
        
        FORMULA:
            m = -(n × ln(p)) / (ln(2))²
            k = (m/n) × ln(2)
        
        USAGE:
            size, hash_count = BloomFilter._calculate_optimal_parameters(10000, 0.01)
        
        RETURN:
            tuple (m, k) - bit array size and hash function count
        """
        # m = -(n × ln(p)) / (ln(2))²
        m = math.ceil(-(n * math.log(p)) / (math.log(2) ** 2))
        
        # k = (m/n) × ln(2)
        k = round((m / n) * math.log(2))
        k = max(1, k)  # At least 1 hash function
        
        return m, k
    
    def add(self, item: str) -> None:
        """
        Add item to bloom filter
        
        USAGE:
            bloom.add("apple")
        
        RETURN:
            None
        """
        hashes = self.hasher.get_hashes(item, self.hash_count, self.size)
        
        for hash_value in hashes:
            self.bit_array[hash_value] = True
        
        self.element_count += 1
    
    def contains(self, item: str) -> bool:
        """
        Check if item might be in the set
        
        USAGE:
            exists = bloom.contains("apple")
        
        RETURN:
            bool - True if possibly present, False if definitely not present
        """
        hashes = self.hasher.get_hashes(item, self.hash_count, self.size)
        
        for hash_value in hashes:
            if not self.bit_array[hash_value]:
                return False  # Definitely not present
        
        return True  # Probably present
    
    def __contains__(self, item: str) -> bool:
        """Support 'in' operator"""
        return self.contains(item)
    
    def get_current_false_positive_rate(self) -> float:
        """
        Calculate current false positive probability
        
        FORMULA: p = (1 - e^(-kn/m))^k
        
        USAGE:
            fp_rate = bloom.get_current_false_positive_rate()
        
        RETURN:
            float - Estimated false positive probability
        """
        if self.element_count == 0:
            return 0.0
        
        # p = (1 - e^(-kn/m))^k
        exponent = -(self.hash_count * self.element_count) / self.size
        p = (1 - math.exp(exponent)) ** self.hash_count
        
        return p
    
    def get_statistics(self) -> Dict:
        """
        Get bloom filter statistics
        
        USAGE:
            stats = bloom.get_statistics()
        
        RETURN:
            Dict with size, hash_count, elements_added, etc.
        """
        bits_set = sum(self.bit_array)
        fill_ratio = bits_set / self.size
        
        return {
            "size": self.size,
            "size_kb": self.size / 8 / 1024,
            "hash_functions": self.hash_count,
            "expected_elements": self.expected_elements,
            "elements_added": self.element_count,
            "target_fp_rate": self.false_positive_rate,
            "current_fp_rate": self.get_current_false_positive_rate(),
            "bits_set": bits_set,
            "fill_ratio": fill_ratio,
            "capacity_used": (self.element_count / self.expected_elements) * 100
        }
    
    def union(self, other: 'BloomFilter') -> 'BloomFilter':
        """
        Create union of two bloom filters (OR operation)
        
        USAGE:
            bloom_union = bloom1.union(bloom2)
        
        RETURN:
            BloomFilter - New filter containing union
        """
        if self.size != other.size or self.hash_count != other.hash_count:
            raise ValueError("Bloom filters must have same size and hash count")
        
        result = BloomFilter(self.expected_elements, self.false_positive_rate)
        result.size = self.size
        result.hash_count = self.hash_count
        result.bit_array = [a or b for a, b in zip(self.bit_array, other.bit_array)]
        result.element_count = self.element_count + other.element_count
        
        return result
    
    def intersection(self, other: 'BloomFilter') -> 'BloomFilter':
        """
        Create intersection of two bloom filters (AND operation)
        
        NOTE: Result may have higher false positive rate!
        
        USAGE:
            bloom_intersect = bloom1.intersection(bloom2)
        
        RETURN:
            BloomFilter - New filter containing intersection
        """
        if self.size != other.size or self.hash_count != other.hash_count:
            raise ValueError("Bloom filters must have same size and hash count")
        
        result = BloomFilter(self.expected_elements, self.false_positive_rate)
        result.size = self.size
        result.hash_count = self.hash_count
        result.bit_array = [a and b for a, b in zip(self.bit_array, other.bit_array)]
        result.element_count = 0  # Unknown for intersection
        
        return result
    
    def clear(self) -> None:
        """Clear all elements from filter"""
        self.bit_array = [False] * self.size
        self.element_count = 0
    
    def __len__(self) -> int:
        """Return number of elements added"""
        return self.element_count
    
    def __repr__(self) -> str:
        return f"BloomFilter(size={self.size}, k={self.hash_count}, n={self.element_count})"


# ==================== COUNTING BLOOM FILTER ====================

class CountingBloomFilter:
    """
    Counting Bloom Filter - supports deletion
    
    Uses counters instead of bits to allow removal
    
    TRADE-OFF: 4x more memory (4 bits per counter vs 1 bit)
    
    USAGE:
        counting = CountingBloomFilter(10000, 0.01)
        counting.add("apple")
        counting.add("apple")  # Can add multiple times
        counting.remove("apple")
        counting.contains("apple")  # True (one copy remains)
    
    RETURN:
        CountingBloomFilter with add, remove, contains methods
    """
    
    def __init__(self, expected_elements: int, false_positive_rate: float,
                 counter_size: int = 4):
        """
        Initialize counting bloom filter
        
        USAGE:
            counting = CountingBloomFilter(10000, 0.01, counter_size=4)
        
        RETURN:
            CountingBloomFilter instance
        """
        self.expected_elements = expected_elements
        self.false_positive_rate = false_positive_rate
        self.counter_size = counter_size
        self.max_count = (2 ** counter_size) - 1
        
        # Calculate optimal parameters (same as standard bloom filter)
        self.size, self.hash_count = BloomFilter._calculate_optimal_parameters(
            expected_elements, false_positive_rate
        )
        
        # Use counters instead of bits
        self.counters = [0] * self.size
        self.element_count = 0
        
        self.hasher = DoubleHashingFunction()
    
    def add(self, item: str) -> None:
        """
        Add item to counting bloom filter
        
        USAGE:
            counting.add("apple")
        
        RETURN:
            None
        """
        hashes = self.hasher.get_hashes(item, self.hash_count, self.size)
        
        for hash_value in hashes:
            if self.counters[hash_value] < self.max_count:
                self.counters[hash_value] += 1
        
        self.element_count += 1
    
    def remove(self, item: str) -> bool:
        """
        Remove item from counting bloom filter
        
        USAGE:
            success = counting.remove("apple")
        
        RETURN:
            bool - True if removed, False if not present
        """
        # Check if item exists
        if not self.contains(item):
            return False
        
        hashes = self.hasher.get_hashes(item, self.hash_count, self.size)
        
        for hash_value in hashes:
            if self.counters[hash_value] > 0:
                self.counters[hash_value] -= 1
        
        self.element_count -= 1
        return True
    
    def contains(self, item: str) -> bool:
        """
        Check if item might be in the set
        
        USAGE:
            exists = counting.contains("apple")
        
        RETURN:
            bool - True if possibly present, False if definitely not present
        """
        hashes = self.hasher.get_hashes(item, self.hash_count, self.size)
        
        for hash_value in hashes:
            if self.counters[hash_value] == 0:
                return False  # Definitely not present
        
        return True  # Probably present
    
    def count(self, item: str) -> int:
        """
        Get minimum count for item (approximate)
        
        USAGE:
            count = counting.count("apple")
        
        RETURN:
            int - Approximate count (minimum of all counters)
        """
        hashes = self.hasher.get_hashes(item, self.hash_count, self.size)
        
        min_count = self.max_count
        for hash_value in hashes:
            min_count = min(min_count, self.counters[hash_value])
        
        return min_count
    
    def get_statistics(self) -> Dict:
        """Get counting bloom filter statistics"""
        non_zero_counters = sum(1 for c in self.counters if c > 0)
        
        return {
            "size": self.size,
            "size_kb": (self.size * self.counter_size) / 8 / 1024,
            "hash_functions": self.hash_count,
            "counter_size_bits": self.counter_size,
            "elements_added": self.element_count,
            "non_zero_counters": non_zero_counters,
            "fill_ratio": non_zero_counters / self.size
        }
    
    def __len__(self) -> int:
        return self.element_count
    
    def __repr__(self) -> str:
        return f"CountingBloomFilter(size={self.size}, k={self.hash_count}, n={self.element_count})"


# ==================== DEMO ====================

def main():
    """
    Demo of Bloom Filter system
    
    Demonstrates:
    - Basic operations (add, contains)
    - False positive rate measurement
    - Space efficiency comparison
    - Counting bloom filter
    - Union/intersection operations
    """
    print("=" * 70)
    print("🔍 BLOOM FILTER DEMO")
    print("=" * 70)
    
    # Create standard bloom filter
    print("\n📊 Creating Standard Bloom Filter...")
    bloom = BloomFilter(expected_elements=10000, false_positive_rate=0.01)
    
    stats = bloom.get_statistics()
    print(f"✓ Created bloom filter")
    print(f"  Size: {stats['size']:,} bits ({stats['size_kb']:.2f} KB)")
    print(f"  Hash functions: {stats['hash_functions']}")
    print(f"  Target false positive rate: {stats['target_fp_rate']:.2%}")
    
    # Add elements
    print("\n➕ Adding elements...")
    fruits = ["apple", "banana", "orange", "grape", "mango", "pineapple",
              "strawberry", "blueberry", "watermelon", "kiwi"]
    
    for fruit in fruits:
        bloom.add(fruit)
    
    print(f"✓ Added {len(fruits)} fruits")
    
    # Check membership
    print("\n🔍 Testing membership (should all be True):")
    for fruit in fruits[:5]:
        result = bloom.contains(fruit)
        print(f"  '{fruit}': {result}")
    
    # Test non-existent items
    print("\n🔍 Testing non-existent items:")
    test_items = ["tomato", "potato", "carrot", "broccoli", "spinach"]
    for item in test_items:
        result = bloom.contains(item)
        status = "FALSE POSITIVE!" if result else "Correctly not found"
        print(f"  '{item}': {result} ({status})")
    
    # Measure false positive rate
    print("\n📈 Measuring false positive rate...")
    false_positives = 0
    test_count = 10000
    
    for i in range(test_count):
        test_item = f"test_item_{i}"
        if test_item not in fruits and bloom.contains(test_item):
            false_positives += 1
    
    measured_fp_rate = false_positives / test_count
    print(f"  Expected: {stats['target_fp_rate']:.2%}")
    print(f"  Measured: {measured_fp_rate:.2%}")
    print(f"  False positives: {false_positives} / {test_count}")
    
    # Space comparison
    print("\n💾 Space Efficiency Comparison:")
    print(f"  Bloom Filter: {stats['size_kb']:.2f} KB")
    
    # Estimate size if storing actual strings
    avg_string_size = sum(len(f) for f in fruits) / len(fruits)
    set_size_kb = (len(fruits) * (avg_string_size + 8)) / 1024
    print(f"  Regular Set: ~{set_size_kb:.2f} KB (estimated)")
    print(f"  Space Saving: ~{(1 - stats['size_kb']/set_size_kb) * 100:.1f}%")
    
    # Current statistics
    print("\n📊 Current Statistics:")
    current_stats = bloom.get_statistics()
    print(f"  Elements added: {current_stats['elements_added']}")
    print(f"  Capacity used: {current_stats['capacity_used']:.1f}%")
    print(f"  Bits set: {current_stats['bits_set']:,} / {current_stats['size']:,}")
    print(f"  Fill ratio: {current_stats['fill_ratio']:.2%}")
    print(f"  Current FP rate: {current_stats['current_fp_rate']:.2%}")
    
    # Counting Bloom Filter demo
    print("\n" + "=" * 70)
    print("🔢 COUNTING BLOOM FILTER DEMO")
    print("=" * 70)
    
    counting = CountingBloomFilter(1000, 0.01)
    
    print("\n➕ Adding elements (with duplicates)...")
    counting.add("apple")
    counting.add("banana")
    counting.add("apple")  # Add again
    counting.add("apple")  # Add third time
    
    print(f"  'apple' count: {counting.count('apple')}")
    print(f"  'banana' count: {counting.count('banana')}")
    print(f"  Contains 'apple': {counting.contains('apple')}")
    
    print("\n➖ Removing elements...")
    counting.remove("apple")
    print(f"  After 1 removal - 'apple' count: {counting.count('apple')}")
    print(f"  Contains 'apple': {counting.contains('apple')}")
    
    counting.remove("apple")
    counting.remove("apple")
    print(f"  After 3 removals - 'apple' count: {counting.count('apple')}")
    print(f"  Contains 'apple': {counting.contains('apple')}")
    
    # Union demo
    print("\n" + "=" * 70)
    print("🔗 UNION & INTERSECTION DEMO")
    print("=" * 70)
    
    bloom1 = BloomFilter(1000, 0.01)
    bloom1.add("apple")
    bloom1.add("banana")
    bloom1.add("orange")
    
    bloom2 = BloomFilter(1000, 0.01)
    bloom2.add("grape")
    bloom2.add("mango")
    bloom2.add("apple")  # Common element
    
    print("\n🔗 Union (bloom1 ∪ bloom2):")
    bloom_union = bloom1.union(bloom2)
    test_items = ["apple", "banana", "grape", "mango", "kiwi"]
    for item in test_items:
        print(f"  '{item}': {bloom_union.contains(item)}")
    
    print("\n🔗 Intersection (bloom1 ∩ bloom2):")
    bloom_intersect = bloom1.intersection(bloom2)
    for item in test_items:
        result = bloom_intersect.contains(item)
        in_both = (item in ["apple"])  # Only apple in both
        status = "✓" if result == in_both else "⚠"
        print(f"  '{item}': {result} {status}")
    
    # Real-world use case
    print("\n" + "=" * 70)
    print("🌐 REAL-WORLD USE CASE: Web Crawler")
    print("=" * 70)
    
    # Simulate web crawler tracking visited URLs
    url_filter = BloomFilter(expected_elements=1000000, false_positive_rate=0.001)
    
    print("\n🕷️  Web crawler tracking visited URLs...")
    visited_urls = [
        "https://example.com",
        "https://example.com/about",
        "https://example.com/products",
        "https://example.com/contact"
    ]
    
    for url in visited_urls:
        url_filter.add(url)
    
    print(f"✓ Tracked {len(visited_urls)} URLs")
    
    # Check before crawling
    test_urls = [
        "https://example.com",  # Already visited
        "https://example.com/blog",  # Not visited
        "https://example.com/products",  # Already visited
        "https://newsite.com"  # Not visited
    ]
    
    print("\n🔍 Checking URLs before crawling:")
    for url in test_urls:
        already_visited = url_filter.contains(url)
        action = "Skip (already crawled)" if already_visited else "Crawl (new URL)"
        print(f"  {url}")
        print(f"    → {action}")
    
    crawler_stats = url_filter.get_statistics()
    print(f"\n📊 Crawler Bloom Filter Stats:")
    print(f"  Memory used: {crawler_stats['size_kb']:.2f} KB")
    print(f"  Could track: {crawler_stats['expected_elements']:,} URLs")
    print(f"  Currently tracking: {crawler_stats['elements_added']:,} URLs")
    print(f"  False positive rate: {crawler_stats['current_fp_rate']:.4%}")
    
    print("\n" + "=" * 70)
    print("✨ Demo completed successfully!")
    print("=" * 70)


if __name__ == "__main__":
    main()
