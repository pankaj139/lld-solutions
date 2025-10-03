# Rate Limiter System

## 🔗 Implementation Links

- **Python Implementation**: [python/rate-limiter/main.py](python/rate-limiter/main.py)
- **JavaScript Implementation**: [javascript/rate-limiter/main.js](javascript/rate-limiter/main.js)

## Problem Statement

Design a rate limiting system that can:

1. **Limit request rates** for different clients/users/APIs
2. **Support multiple algorithms** (Token Bucket, Sliding Window, Fixed Window)
3. **Handle distributed scenarios** with consistent rate limiting across servers
4. **Provide flexible configuration** for different rate limits per resource
5. **Track usage patterns** and provide analytics
6. **Scale horizontally** with minimal latency overhead

## Requirements

### Functional Requirements

- Support rate limiting for different identifiers (user ID, IP address, API key)
- Implement multiple rate limiting algorithms with pluggable design
- Allow different rate limits for different resources/endpoints
- Provide real-time rate limit status and remaining quota
- Support burst traffic handling with configurable burst capacity
- Handle rate limit violations with appropriate responses
- Persist rate limiting state for distributed systems

### Non-Functional Requirements

- Sub-millisecond latency for rate limit checks
- High throughput (100K+ requests per second)
- Horizontal scalability across multiple instances
- Fault tolerance with graceful degradation
- Memory efficient with bounded storage growth
- Support for real-time monitoring and alerting

## Design Decisions

### Key Classes

1. **RateLimitingRule**
   - Defines rate limiting configuration (requests per time window)
   - Contains algorithm type, capacity, and refill rate
   - Supports different time windows (seconds, minutes, hours)

2. **RateLimitingAlgorithm (Abstract)**
   - Base interface for different rate limiting algorithms
   - Defines contract for checking and updating rate limits
   - Enables pluggable algorithm implementations

3. **TokenBucketAlgorithm**
   - Implements token bucket algorithm with configurable capacity
   - Supports burst traffic by accumulating tokens over time
   - Provides smooth rate limiting with token refill mechanism

4. **SlidingWindowLogAlgorithm**
   - Maintains precise request timestamps in sliding window
   - Provides exact rate limiting but higher memory usage
   - Suitable for strict rate limiting requirements

5. **FixedWindowCounterAlgorithm**
   - Simple counter-based approach with fixed time windows
   - Memory efficient but allows traffic spikes at window boundaries
   - Good for approximate rate limiting scenarios

6. **RateLimiter (Main System)**
   - Coordinates rate limiting across different algorithms and rules
   - Manages storage backends (in-memory, Redis, database)
   - Handles distributed rate limiting with consistent state

### Design Patterns Used

1. **Strategy Pattern**: Pluggable rate limiting algorithms
2. **Factory Pattern**: Algorithm creation based on configuration
3. **Observer Pattern**: Rate limit violation notifications
4. **Decorator Pattern**: Adding features like logging, metrics
5. **Template Method**: Common rate limiting workflow
6. **Facade Pattern**: Simple interface for complex rate limiting logic

### Key Features

- **Multiple Algorithms**: Token bucket, sliding window, fixed window counters
- **Distributed Support**: Redis-based state sharing across instances
- **Flexible Configuration**: Per-user, per-IP, per-API rate limits
- **Real-time Monitoring**: Rate limit status and violation tracking
- **Graceful Degradation**: Fallback mechanisms for storage failures

## Algorithm Comparison

| Algorithm | Memory Usage | Accuracy | Burst Handling | Complexity |
|-----------|--------------|----------|----------------|------------|
| **Token Bucket** | O(1) per key | High | Excellent | Low |
| **Sliding Window Log** | O(n) per key | Perfect | Good | Medium |
| **Fixed Window** | O(1) per key | Approximate | Poor | Low |
| **Sliding Window Counter** | O(1) per key | High | Good | Medium |

## Class Diagram

```uml
RateLimitingRule
├── identifier: string
├── requestsPerWindow: int
├── windowSizeSeconds: int
├── algorithm: AlgorithmType
└── burstCapacity: int

RateLimitingAlgorithm (Abstract)
├── checkRateLimit(key: string, rule: RateLimitingRule): RateLimitResult
├── updateRateLimit(key: string, rule: RateLimitingRule): void
└── getRemainingQuota(key: string, rule: RateLimitingRule): int

TokenBucketAlgorithm : RateLimitingAlgorithm
├── buckets: Map<string, TokenBucket>
├── refillTokens(bucket: TokenBucket): void
└── consumeTokens(bucket: TokenBucket, tokens: int): boolean

SlidingWindowLogAlgorithm : RateLimitingAlgorithm
├── requestLogs: Map<string, List<Timestamp>>
├── cleanExpiredRequests(key: string, windowStart: Timestamp): void
└── countRequestsInWindow(key: string, windowDuration: int): int

RateLimiter
├── algorithms: Map<AlgorithmType, RateLimitingAlgorithm>
├── rules: Map<string, RateLimitingRule>
├── storage: RateLimitStorage
├── monitor: RateLimitMonitor
├── isAllowed(identifier: string, resource: string): RateLimitResult
├── addRule(resource: string, rule: RateLimitingRule): void
└── getUsageStats(identifier: string): UsageStatistics
```

## Usage Examples

### Basic Rate Limiting

```python
# Create rate limiter with token bucket algorithm
rate_limiter = RateLimiter()

# Add rate limiting rules
user_rule = RateLimitingRule(
    requests_per_window=100,
    window_size_seconds=60,
    algorithm=AlgorithmType.TOKEN_BUCKET
)
rate_limiter.add_rule("api_calls", user_rule)

# Check if request is allowed
result = rate_limiter.is_allowed("user123", "api_calls")
if result.allowed:
    # Process request
    print(f"Request allowed. Remaining: {result.remaining_quota}")
else:
    # Reject request
    print(f"Rate limit exceeded. Retry after: {result.retry_after_seconds}")
```

### Multiple Algorithm Configuration

```python
# Different algorithms for different use cases
burst_rule = RateLimitingRule(100, 60, AlgorithmType.TOKEN_BUCKET)  # Allows bursts
strict_rule = RateLimitingRule(100, 60, AlgorithmType.SLIDING_WINDOW_LOG)  # Precise
simple_rule = RateLimitingRule(100, 60, AlgorithmType.FIXED_WINDOW)  # Memory efficient

rate_limiter.add_rule("api_burst", burst_rule)
rate_limiter.add_rule("api_strict", strict_rule)
rate_limiter.add_rule("api_simple", simple_rule)
```

### Distributed Rate Limiting

```python
# Redis-backed distributed rate limiter
redis_storage = RedisRateLimitStorage("redis://localhost:6379")
distributed_limiter = RateLimiter(storage=redis_storage)

# Rate limits are shared across all server instances
result = distributed_limiter.is_allowed("user123", "global_api")
```

## Extension Points

1. **Custom Algorithms**: Implement domain-specific rate limiting strategies
2. **Storage Backends**: Add support for different storage systems (DynamoDB, Cassandra)
3. **Monitoring Integration**: Connect with monitoring systems (Prometheus, DataDog)
4. **Rate Limit Policies**: Dynamic rate limits based on user tiers or system load
5. **Geographic Distribution**: Region-aware rate limiting for global applications
6. **Machine Learning**: Adaptive rate limits based on traffic patterns
7. **Circuit Breaker Integration**: Combine with circuit breaker for fault tolerance

## Time Complexity

### Token Bucket Algorithm

- **Check Rate Limit**: O(1) - Simple token calculation and consumption
- **Token Refill**: O(1) - Mathematical calculation based on time elapsed
- **Memory per Key**: O(1) - Fixed bucket state storage

### Sliding Window Log Algorithm

- **Check Rate Limit**: O(log n) - Binary search in sorted timestamp list
- **Window Cleanup**: O(k) - Remove expired timestamps, k = expired count
- **Memory per Key**: O(n) - Store all request timestamps in window

### Fixed Window Counter Algorithm

- **Check Rate Limit**: O(1) - Simple counter increment and check
- **Window Reset**: O(1) - Reset counter at window boundary
- **Memory per Key**: O(1) - Single counter per window

## Space Complexity

- **Token Bucket**: O(k) where k = number of unique identifiers
- **Sliding Window Log**: O(k × n) where n = requests per window
- **Fixed Window**: O(k) where k = number of unique identifiers

## Advanced Features

### Dynamic Rate Limiting

```python
# Adaptive rate limits based on system metrics
class AdaptiveRateLimiter(RateLimiter):
    def get_dynamic_limit(self, base_limit, system_load):
        if system_load > 0.8:
            return int(base_limit * 0.5)  # Reduce limits under high load
        elif system_load < 0.3:
            return int(base_limit * 1.2)  # Increase limits under low load
        return base_limit
```

### Hierarchical Rate Limiting

```python
# Multiple rate limiting levels
class HierarchicalRateLimiter:
    def __init__(self):
        self.global_limiter = RateLimiter()    # System-wide limits
        self.tenant_limiter = RateLimiter()    # Per-tenant limits  
        self.user_limiter = RateLimiter()      # Per-user limits
    
    def is_allowed(self, tenant_id, user_id, resource):
        # Check all levels - most restrictive wins
        checks = [
            self.global_limiter.is_allowed("global", resource),
            self.tenant_limiter.is_allowed(tenant_id, resource),
            self.user_limiter.is_allowed(user_id, resource)
        ]
        return all(check.allowed for check in checks)
```

### Rate Limit Analytics

```python
class RateLimitAnalytics:
    def get_usage_patterns(self, identifier, time_range):
        return {
            "total_requests": 1500,
            "rejected_requests": 45,
            "peak_rps": 25,
            "average_rps": 15,
            "violation_patterns": ["12:00-13:00", "18:00-19:00"]
        }
    
    def get_top_consumers(self, resource, limit=10):
        return [
            {"identifier": "user123", "requests": 5000},
            {"identifier": "user456", "requests": 4500}
        ]
```

### Health Monitoring

```python
class RateLimitMonitor:
    def check_system_health(self):
        return {
            "latency_p99": "0.5ms",
            "throughput": "50000 rps",
            "storage_utilization": "65%",
            "error_rate": "0.01%"
        }
```
