# Bloom Filter

## 🔗 Implementation Links

- **Python Implementation**: [python/bloom-filter/main.py](python/bloom-filter/main.py)
- **JavaScript Implementation**: [javascript/bloom-filter/main.js](javascript/bloom-filter/main.js)

## Problem Statement

Design a Bloom Filter data structure that can:

1. **Test membership efficiently** with minimal memory
2. **Handle false positives** but guarantee no false negatives
3. **Support millions of elements** with configurable error rate
4. **Provide fast O(k) lookup** where k is number of hash functions
5. **Be space-efficient** compared to traditional sets
6. **Support counting and deletion** (Counting Bloom Filter variant)
7. **Scale to distributed systems** (Distributed Bloom Filter)

## Requirements

### Functional Requirements

- Add elements to the filter
- Check if element might be in the set (probabilistic)
- Calculate optimal parameters (size, hash functions) for desired false positive rate
- Support union and intersection operations
- Implement counting variant for deletion support
- Provide statistics (capacity, elements added, estimated false positive rate)
- Serialize and deserialize filter state

### Non-Functional Requirements

- Insertion: O(k) where k is number of hash functions
- Lookup: O(k) constant time operations
- Space: O(m) where m is bit array size
- False positive rate configurable (typically 0.01 to 0.001)
- Thread-safe for concurrent operations
- Memory-efficient for large datasets

## What is a Bloom Filter?

A **Bloom Filter** is a space-efficient probabilistic data structure used to test whether an element is a member of a set.

### Key Characteristics

- **No False Negatives**: If it says element is NOT present, it's definitely not present
- **Possible False Positives**: If it says element IS present, it might be present (with probability p)
- **Cannot Delete**: Standard Bloom Filter doesn't support deletion
- **Space Efficient**: Uses much less memory than storing actual elements

### How It Works

```text
1. Initialize bit array of size m to all zeros
2. Use k independent hash functions
3. To INSERT element:
   - Hash element with each hash function
   - Set corresponding bits to 1
4. To CHECK element:
   - Hash element with each hash function
   - If ALL bits are 1 → "Probably present"
   - If ANY bit is 0 → "Definitely not present"
```

### Visual Example

```text
Bit Array (size=10): [0,0,0,0,0,0,0,0,0,0]

Add "apple":
- hash1("apple") = 2 → set bit[2] = 1
- hash2("apple") = 5 → set bit[5] = 1
- hash3("apple") = 7 → set bit[7] = 1

Result: [0,0,1,0,0,1,0,1,0,0]

Check "apple":
- hash1("apple") = 2 → bit[2] = 1 ✓
- hash2("apple") = 5 → bit[5] = 1 ✓
- hash3("apple") = 7 → bit[7] = 1 ✓
→ "Probably present" (TRUE)

Check "banana":
- hash1("banana") = 3 → bit[3] = 0 ✗
→ "Definitely not present" (FALSE)

Add "orange":
- hash1("orange") = 2 → bit[2] = 1 (already set)
- hash2("orange") = 5 → bit[5] = 1 (already set)
- hash3("orange") = 8 → bit[8] = 1

Result: [0,0,1,0,0,1,0,1,1,0]

False Positive Example:
Check "grape":
- hash1("grape") = 2 → bit[2] = 1 ✓
- hash2("grape") = 5 → bit[5] = 1 ✓
- hash3("grape") = 8 → bit[8] = 1 ✓
→ "Probably present" (FALSE POSITIVE!)
```

## Mathematical Foundation

### Optimal Parameters

Given:
- `n` = expected number of elements
- `p` = desired false positive probability

Calculate:
- `m` = optimal bit array size
- `k` = optimal number of hash functions

**Formulas:**

```text
m = -(n × ln(p)) / (ln(2))²
m ≈ -1.44 × n × log₂(p)

k = (m/n) × ln(2)
k ≈ 0.693 × (m/n)

Actual false positive rate:
p = (1 - e^(-kn/m))^k
```

### Example Calculations

```text
For n=10,000 elements and p=0.01 (1% false positive):

m = -(10000 × ln(0.01)) / (ln(2))²
m ≈ 95,851 bits ≈ 12 KB

k = (95851/10000) × ln(2)
k ≈ 7 hash functions

Actual p ≈ 0.0099 (0.99%)
```

### Space Comparison

```text
Traditional HashSet storing strings (avg 10 chars):
- Each string: 10 bytes + 8 bytes pointer = 18 bytes
- 10,000 elements = 180 KB

Bloom Filter (p=0.01):
- Bit array: 12 KB
- Space saving: 93%!
```

## Class Diagram

```text
BloomFilter
├── bit_array: BitArray
├── size: int (m)
├── hash_count: int (k)
├── element_count: int (n)
├── hash_functions: List[HashFunction]
├── add(item: str)
├── contains(item: str) → bool
├── false_positive_probability() → float
├── union(other: BloomFilter) → BloomFilter
├── intersection(other: BloomFilter) → BloomFilter
└── to_bytes() → bytes

CountingBloomFilter (extends BloomFilter)
├── counter_array: List[int]
├── add(item: str)
├── remove(item: str) → bool
├── contains(item: str) → bool
└── count(item: str) → int

ScalableBloomFilter
├── filters: List[BloomFilter]
├── growth_factor: float
├── add(item: str)
├── contains(item: str) → bool
└── _add_filter()

HashFunction
├── seed: int
├── hash(data: str) → int
└── implementations:
    ├── MurmurHash3
    ├── FNV1a
    └── CityHash
```

## Usage Example

```python
# Basic Bloom Filter
bloom = BloomFilter(expected_elements=10000, false_positive_rate=0.01)

# Add elements
bloom.add("apple")
bloom.add("banana")
bloom.add("orange")

# Check membership
bloom.contains("apple")    # True (definitely added)
bloom.contains("grape")    # False or True (false positive)
bloom.contains("mango")    # False (definitely not added)

# Get statistics
stats = bloom.get_statistics()
# {
#   "size": 95851,
#   "hash_functions": 7,
#   "elements_added": 3,
#   "estimated_fp_rate": 0.0001
# }

# Counting Bloom Filter (supports deletion)
counting_bloom = CountingBloomFilter(10000, 0.01)
counting_bloom.add("apple")
counting_bloom.add("apple")  # Can add multiple times
counting_bloom.remove("apple")
counting_bloom.contains("apple")  # True (one copy remains)
counting_bloom.remove("apple")
counting_bloom.contains("apple")  # False

# Union of two Bloom Filters
bloom1 = BloomFilter(10000, 0.01)
bloom1.add("apple")
bloom1.add("banana")

bloom2 = BloomFilter(10000, 0.01)
bloom2.add("orange")
bloom2.add("grape")

bloom_union = bloom1.union(bloom2)
bloom_union.contains("apple")   # True
bloom_union.contains("orange")  # True
```

## Algorithms

### Add Element

```text
Algorithm: ADD(element)
Input: element - item to add
Output: None

1. For i from 0 to k-1:
     hash_value = hash_function[i](element)
     index = hash_value mod m
     bit_array[index] = 1

2. Increment element_count

Time Complexity: O(k)
Space Complexity: O(1)
```

### Check Contains

```text
Algorithm: CONTAINS(element)
Input: element - item to check
Output: boolean (true if possibly present, false if definitely not)

1. For i from 0 to k-1:
     hash_value = hash_function[i](element)
     index = hash_value mod m
     
     If bit_array[index] == 0:
       Return FALSE  # Definitely not present
     
2. Return TRUE  # Probably present

Time Complexity: O(k)
Space Complexity: O(1)
```

### Calculate Optimal Size

```text
Algorithm: CALCULATE_OPTIMAL_SIZE(n, p)
Input: n - expected elements, p - false positive rate
Output: (m, k) - bit array size and hash count

1. m = ceil(-(n × ln(p)) / (ln(2))²)
2. k = round((m/n) × ln(2))
3. k = max(1, k)  # At least 1 hash function
4. Return (m, k)

Example: n=1000, p=0.01
m = 9586 bits ≈ 1.2 KB
k = 7 hash functions
```

## Variants

### 1. Counting Bloom Filter

Replaces bits with counters to support deletion.

```text
Instead of: bit_array[i] = {0, 1}
Use: counter_array[i] = {0, 1, 2, 3, ...}

Add: Increment all k counters
Remove: Decrement all k counters
Contains: Check if all k counters > 0
```

**Trade-off**: 4x more memory (4 bits per counter vs 1 bit)

### 2. Scalable Bloom Filter

Dynamically grows as more elements added.

```text
Structure: List of Bloom Filters
- Filter 1: size s, error rate p
- Filter 2: size s×r, error rate p×r²
- Filter 3: size s×r², error rate p×r⁴
(r = growth factor, typically 2)

Add: 
  If current filter full, create new larger filter
  Add to latest filter

Contains:
  Check all filters (OR operation)
```

### 3. Partitioned Bloom Filter

Divides bit array into k partitions for better cache locality.

```text
Traditional: k hash functions → k random positions
Partitioned: k hash functions → k positions in k partitions

Benefits:
- Better CPU cache performance
- Reduced memory access patterns
```

### 4. Compressed Bloom Filter

Compresses bit array for transmission/storage.

```text
Run-Length Encoding:
  [0,0,0,1,1,0,0,0,0] → (3,0)(2,1)(4,0)
  
Golomb Coding:
  Efficient compression for sparse bit arrays
```

## Real-World Applications

### 1. Web Browsers (Cache Check)

```python
# Chrome/Firefox use Bloom Filters
url_filter = BloomFilter(1_000_000, 0.01)

# Check if URL in cache before network request
if url_filter.contains(url):
    # Might be in cache, check disk
    cached_response = disk_cache.get(url)
else:
    # Definitely not in cache, fetch from network
    response = fetch_from_network(url)
```

**Benefit**: Avoid expensive disk I/O for cache misses

### 2. Databases (Existence Check)

```python
# Cassandra, HBase, PostgreSQL use Bloom Filters
# Check if SSTable contains key before disk read

sstable_filter = BloomFilter(10_000_000, 0.001)

if sstable_filter.contains(key):
    # Might be in this SSTable, read from disk
    value = sstable.get(key)
else:
    # Definitely not in this SSTable, skip
    continue_to_next_sstable()
```

**Benefit**: Reduce disk I/O by 99%+ for non-existent keys

### 3. Spam Detection

```python
# Check if email sender in spam list
spam_filter = BloomFilter(10_000_000, 0.001)

# Load known spam email addresses
for spam_email in known_spam_database:
    spam_filter.add(spam_email)

# Check incoming email
if spam_filter.contains(sender_email):
    # Might be spam, do thorough check
    detailed_spam_check(email)
else:
    # Definitely not in spam list, allow
    deliver_email(email)
```

### 4. Cryptocurrency (Bitcoin)

```python
# Bitcoin uses Bloom Filters for SPV (Simplified Payment Verification)
transaction_filter = BloomFilter(100_000, 0.0001)

# Lite clients request relevant transactions
for address in my_addresses:
    transaction_filter.add(address)

# Send filter to full node
node.request_filtered_blocks(transaction_filter)
```

### 5. Network Routers (Duplicate Detection)

```python
# Detect duplicate packets
packet_filter = BloomFilter(1_000_000, 0.01)

def process_packet(packet):
    packet_id = packet.get_id()
    
    if packet_filter.contains(packet_id):
        # Probably duplicate, drop
        return
    
    packet_filter.add(packet_id)
    forward_packet(packet)
```

### 6. Content Delivery Networks (CDN)

```python
# Akamai, Cloudflare use Bloom Filters
edge_cache_filter = BloomFilter(10_000_000, 0.001)

if edge_cache_filter.contains(content_url):
    # Might be in edge cache
    serve_from_edge()
else:
    # Not in edge cache, fetch from origin
    fetch_from_origin()
```

## Performance Characteristics

### Time Complexity

| Operation | Complexity | Notes |
|-----------|------------|-------|
| Add | O(k) | k hash functions |
| Contains | O(k) | k hash functions |
| Union | O(m) | Bit-wise OR of arrays |
| Intersection | O(m) | Bit-wise AND of arrays |
| Size Calculation | O(1) | Simple formula |

### Space Complexity

| Data Structure | Space per Element | Example (1M elements, p=0.01) |
|----------------|-------------------|-------------------------------|
| HashSet<String> | 18-50 bytes | 18-50 MB |
| Bloom Filter | 1.2 bytes | 1.2 MB |
| Counting Bloom | 4.8 bytes | 4.8 MB |
| Space Saving | 93-97% | 15-40x smaller |

### False Positive Rate Analysis

```text
p = (1 - e^(-kn/m))^k

For n=10,000, m=95,851, k=7:
p ≈ 0.0099 (0.99%)

Trade-offs:
- Lower p → More memory (larger m)
- More hash functions (larger k) → Slower but more accurate
- Fewer elements (smaller n) → Lower p
```

## Advanced Optimizations

### 1. Bit-Sliced Bloom Filter

```text
Traditional: Hash → Index → Set bit
Bit-Sliced: Organize bits for SIMD operations

Benefits:
- 4-8x faster using SSE/AVX instructions
- Better cache utilization
```

### 2. Blocked Bloom Filter

```text
Divide into cache-line-sized blocks

Add: Hash to single block, set k bits within block
Contains: Hash to single block, check k bits

Benefits:
- All bits in same cache line
- 2-3x faster than traditional
```

### 3. Cuckoo Filter

Alternative with deletion support and better performance.

```text
Advantages over Bloom Filter:
- Supports deletion (like counting, but more efficient)
- Better lookup performance
- Simpler to implement

Disadvantages:
- Slightly higher false positive rate
- More complex insertion logic
```

## Distributed Bloom Filters

### Sharded Approach

```text
Partition data across multiple servers:

Server 1: Handles items hash(item) mod 3 == 0
Server 2: Handles items hash(item) mod 3 == 1
Server 3: Handles items hash(item) mod 3 == 2

Add(item):
  server_id = hash(item) mod num_servers
  servers[server_id].bloom.add(item)

Contains(item):
  server_id = hash(item) mod num_servers
  return servers[server_id].bloom.contains(item)
```

### Replicated Approach

```text
Replicate same Bloom Filter across all servers:

Add(item):
  Broadcast to all servers
  Each server adds to local filter

Contains(item):
  Query any single server
  
Benefits:
- High availability
- Fast reads (no network hop)
Drawbacks:
- Slower writes
- Memory overhead
```

## Security Considerations

### Collision Attacks

```text
Problem: Attacker finds items causing many false positives

Attack: Generate items that hash to occupied bits
Result: Increase false positive rate

Defense:
- Use cryptographic hash functions
- Rate limiting
- Multiple independent Bloom Filters
```

### Privacy Leakage

```text
Problem: Bloom Filter reveals partial membership information

Example: Bitcoin SPV leaks which addresses you own

Solution:
- Add dummy elements
- Use encrypted Bloom Filters
- Adjust false positive rate for privacy
```

## Testing Strategies

### Unit Tests

```python
def test_basic_operations():
    bloom = BloomFilter(1000, 0.01)
    
    # Test no false negatives
    bloom.add("apple")
    assert bloom.contains("apple") == True
    
    # Test definitely not present
    assert bloom.contains("definitely_not_added") in [True, False]
    # (can't assert False due to false positives)

def test_false_positive_rate():
    bloom = BloomFilter(1000, 0.01)
    
    # Add 1000 elements
    for i in range(1000):
        bloom.add(f"element_{i}")
    
    # Test 10000 non-existent elements
    false_positives = 0
    for i in range(1000, 11000):
        if bloom.contains(f"element_{i}"):
            false_positives += 1
    
    measured_rate = false_positives / 10000
    assert measured_rate < 0.02  # Within 2x of expected

def test_union():
    bloom1 = BloomFilter(1000, 0.01)
    bloom1.add("apple")
    
    bloom2 = BloomFilter(1000, 0.01)
    bloom2.add("banana")
    
    bloom_union = bloom1.union(bloom2)
    assert bloom_union.contains("apple")
    assert bloom_union.contains("banana")
```

### Load Tests

```python
def test_performance():
    bloom = BloomFilter(1_000_000, 0.001)
    
    # Measure insertion time
    start = time.time()
    for i in range(1_000_000):
        bloom.add(f"item_{i}")
    insert_time = time.time() - start
    
    # Measure lookup time
    start = time.time()
    for i in range(1_000_000):
        bloom.contains(f"item_{i}")
    lookup_time = time.time() - start
    
    print(f"Insert: {insert_time:.2f}s ({1_000_000/insert_time:.0f} ops/s)")
    print(f"Lookup: {lookup_time:.2f}s ({1_000_000/lookup_time:.0f} ops/s)")
```

## Interview Discussion Points

1. **Why use Bloom Filter instead of HashMap?**
   - Space efficiency: 10-50x smaller
   - Use when false positives acceptable
   - Cannot retrieve original elements

2. **How to choose false positive rate?**
   - Balance accuracy vs space
   - Consider cost of false positive
   - Typical: 0.1% to 1%

3. **Can you delete from Bloom Filter?**
   - Standard: No (ambiguity problem)
   - Counting Bloom: Yes (trade 4x space)
   - Cuckoo Filter: Yes (better alternative)

4. **How to handle more elements than expected?**
   - Scalable Bloom Filter
   - Create new larger filter
   - Rebuild with correct parameters

5. **What hash functions to use?**
   - MurmurHash3 (fast, good distribution)
   - FNV-1a (simple, decent)
   - CityHash (very fast)
   - Avoid: MD5, SHA (too slow)

6. **How does Bitcoin use Bloom Filters?**
   - SPV clients filter transactions
   - Privacy-preserving (with false positives)
   - Reduce bandwidth requirements

## Trade-offs

| Aspect | Standard Bloom | Counting Bloom | Cuckoo Filter |
|--------|----------------|----------------|---------------|
| Space | Excellent | Good (4x) | Good (1.5x) |
| Deletion | No | Yes | Yes |
| Lookup Speed | Fast | Fast | Faster |
| False Positive | p | p | 1.5p |
| Implementation | Simple | Simple | Complex |

## Extensions

1. **Bloom Filter with Expiration** (Time-decaying)
2. **Dynamic Bloom Filter** (Adjusts parameters online)
3. **Spectral Bloom Filter** (Track frequency)
4. **Stable Bloom Filter** (Evicts old entries)
5. **Quotient Filter** (Compact, cache-friendly alternative)

## Summary

Bloom Filters are elegant probabilistic data structures offering:
- **95%+ space savings** over traditional sets
- **O(k) constant-time** operations
- **Configurable accuracy** vs space trade-off
- **Wide adoption** in industry (browsers, databases, networks)

Perfect when:
- Memory is limited
- False positives are acceptable
- Negative queries are common
- Approximate answers suffice
