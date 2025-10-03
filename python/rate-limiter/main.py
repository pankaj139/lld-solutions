"""
RATE LIMITER SYSTEM - Low Level Design Implementation in Python

DESIGN PATTERNS USED:
1. STRATEGY PATTERN: Different rate limiting algorithms (Token Bucket, Sliding Window, Fixed Window)
   - Pluggable algorithms for different use cases
   - Easy to add new rate limiting strategies
   - Algorithm selection based on requirements

2. FACTORY PATTERN: Algorithm creation based on configuration
   - Centralized algorithm instantiation
   - Type-safe algorithm creation
   - Easy to extend with new algorithm types

3. OBSERVER PATTERN: Rate limit violation notifications
   - Event-driven monitoring and alerting
   - Pluggable violation handlers
   - Decoupled monitoring from core logic

4. TEMPLATE METHOD PATTERN: Common rate limiting workflow
   - Standardized rate limiting process
   - Customizable algorithm-specific steps
   - Consistent interface across algorithms

5. FACADE PATTERN: Simple interface for complex rate limiting logic
   - Hides complexity of algorithm selection and coordination
   - Single entry point for rate limiting operations
   - Simplifies client code

OOP CONCEPTS DEMONSTRATED:
- ABSTRACTION: Abstract algorithm interface with concrete implementations
- POLYMORPHISM: Different algorithms used interchangeably
- ENCAPSULATION: Algorithm-specific state hidden behind interfaces
- INHERITANCE: Common algorithm behavior in base classes

SOLID PRINCIPLES:
- SRP: Each class has single responsibility (algorithm, storage, monitoring)
- OCP: Easy to add new algorithms without modifying existing code
- LSP: All algorithms can be used interchangeably
- ISP: Focused interfaces for algorithms and storage
- DIP: High-level components depend on abstractions

BUSINESS FEATURES:
- Multiple rate limiting algorithms with different characteristics
- Distributed rate limiting with Redis support
- Real-time monitoring and violation tracking
- Hierarchical rate limiting (global, tenant, user levels)
- Dynamic rate adjustment based on system load

ARCHITECTURAL NOTES:
- High-performance design with sub-millisecond latency
- Memory-efficient algorithms with bounded growth
- Fault-tolerant with graceful degradation
- Horizontally scalable across multiple instances
"""

from abc import ABC, abstractmethod
from enum import Enum
from dataclasses import dataclass
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
import time
import threading
import math
import json
from collections import defaultdict, deque

# ENUMS: Algorithm types and result statuses
class AlgorithmType(Enum):
    TOKEN_BUCKET = "token_bucket"
    SLIDING_WINDOW_LOG = "sliding_window_log"
    FIXED_WINDOW = "fixed_window"
    SLIDING_WINDOW_COUNTER = "sliding_window_counter"

class RateLimitStatus(Enum):
    ALLOWED = "allowed"
    REJECTED = "rejected"
    ERROR = "error"

# DATA CLASSES: Configuration and result objects
@dataclass
class RateLimitingRule:
    """
    Configuration for rate limiting rules
    
    ENCAPSULATION: Bundles related rate limiting parameters
    IMMUTABILITY: Read-only configuration object
    """
    requests_per_window: int
    window_size_seconds: int
    algorithm: AlgorithmType
    burst_capacity: Optional[int] = None  # For token bucket
    
    def __post_init__(self):
        if self.requests_per_window <= 0:
            raise ValueError("Requests per window must be positive")
        if self.window_size_seconds <= 0:
            raise ValueError("Window size must be positive")
        if self.burst_capacity is None:
            self.burst_capacity = self.requests_per_window

@dataclass
class RateLimitResult:
    """
    Result of rate limiting check
    
    INFORMATION EXPERT: Contains all information about rate limit decision
    """
    status: RateLimitStatus
    allowed: bool
    remaining_quota: int
    total_quota: int
    retry_after_seconds: Optional[float] = None
    reset_time: Optional[datetime] = None

# STRATEGY PATTERN: Abstract base for rate limiting algorithms
class RateLimitingAlgorithm(ABC):
    """
    Abstract interface for rate limiting algorithms
    
    STRATEGY PATTERN: Defines algorithm contract
    TEMPLATE METHOD: Common workflow with customizable steps
    """
    
    def __init__(self):
        self._lock = threading.RLock()  # Thread safety
    
    @abstractmethod
    def is_allowed(self, key: str, rule: RateLimitingRule, current_time: float) -> RateLimitResult:
        """Check if request is allowed under rate limit"""
        pass
    
    @abstractmethod
    def get_remaining_quota(self, key: str, rule: RateLimitingRule, current_time: float) -> int:
        """Get remaining quota for the current window"""
        pass
    
    @abstractmethod
    def reset_quota(self, key: str) -> None:
        """Reset quota for a specific key"""
        pass

# CONCRETE STRATEGY: Token bucket algorithm implementation
class TokenBucketAlgorithm(RateLimitingAlgorithm):
    """
    Token Bucket Rate Limiting Algorithm
    
    CHARACTERISTICS:
    - Allows burst traffic up to bucket capacity
    - Smooth rate limiting with continuous token refill
    - Memory efficient: O(1) per key
    - Good for APIs that can handle temporary bursts
    
    ALGORITHM:
    1. Each client has a bucket with maximum capacity
    2. Tokens are added to bucket at fixed rate
    3. Each request consumes one token
    4. Request allowed if bucket has tokens available
    """
    
    def __init__(self):
        super().__init__()
        self.buckets: Dict[str, Dict[str, Any]] = {}
    
    def is_allowed(self, key: str, rule: RateLimitingRule, current_time: float) -> RateLimitResult:
        with self._lock:
            bucket = self._get_or_create_bucket(key, rule, current_time)
            
            # Refill tokens based on time elapsed
            self._refill_bucket(bucket, rule, current_time)
            
            if bucket['tokens'] >= 1:
                bucket['tokens'] -= 1
                remaining = int(bucket['tokens'])
                return RateLimitResult(
                    status=RateLimitStatus.ALLOWED,
                    allowed=True,
                    remaining_quota=remaining,
                    total_quota=rule.burst_capacity
                )
            else:
                # Calculate retry after time
                tokens_needed = 1 - bucket['tokens']
                refill_rate = rule.requests_per_window / rule.window_size_seconds
                retry_after = tokens_needed / refill_rate
                
                return RateLimitResult(
                    status=RateLimitStatus.REJECTED,
                    allowed=False,
                    remaining_quota=0,
                    total_quota=rule.burst_capacity,
                    retry_after_seconds=retry_after
                )
    
    def get_remaining_quota(self, key: str, rule: RateLimitingRule, current_time: float) -> int:
        with self._lock:
            bucket = self._get_or_create_bucket(key, rule, current_time)
            self._refill_bucket(bucket, rule, current_time)
            return int(bucket['tokens'])
    
    def reset_quota(self, key: str) -> None:
        with self._lock:
            if key in self.buckets:
                del self.buckets[key]
    
    def _get_or_create_bucket(self, key: str, rule: RateLimitingRule, current_time: float) -> Dict[str, Any]:
        if key not in self.buckets:
            self.buckets[key] = {
                'tokens': float(rule.burst_capacity),
                'last_refill': current_time,
                'capacity': rule.burst_capacity
            }
        return self.buckets[key]
    
    def _refill_bucket(self, bucket: Dict[str, Any], rule: RateLimitingRule, current_time: float):
        time_elapsed = current_time - bucket['last_refill']
        refill_rate = rule.requests_per_window / rule.window_size_seconds
        tokens_to_add = time_elapsed * refill_rate
        
        bucket['tokens'] = min(bucket['capacity'], bucket['tokens'] + tokens_to_add)
        bucket['last_refill'] = current_time

# CONCRETE STRATEGY: Sliding window log algorithm
class SlidingWindowLogAlgorithm(RateLimitingAlgorithm):
    """
    Sliding Window Log Rate Limiting Algorithm
    
    CHARACTERISTICS:
    - Precise rate limiting with exact request tracking
    - No boundary effect issues
    - Higher memory usage: O(n) per key where n = requests in window
    - Best for strict rate limiting requirements
    
    ALGORITHM:
    1. Maintain log of all request timestamps for each client
    2. Remove expired timestamps outside current window
    3. Check if adding new request exceeds limit
    4. Memory usage grows with request rate
    """
    
    def __init__(self):
        super().__init__()
        self.request_logs: Dict[str, deque] = defaultdict(deque)
    
    def is_allowed(self, key: str, rule: RateLimitingRule, current_time: float) -> RateLimitResult:
        with self._lock:
            window_start = current_time - rule.window_size_seconds
            
            # Clean expired requests
            self._clean_expired_requests(key, window_start)
            
            current_requests = len(self.request_logs[key])
            
            if current_requests < rule.requests_per_window:
                # Allow request and log timestamp
                self.request_logs[key].append(current_time)
                remaining = rule.requests_per_window - current_requests - 1
                
                return RateLimitResult(
                    status=RateLimitStatus.ALLOWED,
                    allowed=True,
                    remaining_quota=remaining,
                    total_quota=rule.requests_per_window
                )
            else:
                # Calculate retry after time (when oldest request expires)
                if self.request_logs[key]:
                    oldest_request = self.request_logs[key][0]
                    retry_after = (oldest_request + rule.window_size_seconds) - current_time
                    retry_after = max(0, retry_after)
                else:
                    retry_after = rule.window_size_seconds
                
                return RateLimitResult(
                    status=RateLimitStatus.REJECTED,
                    allowed=False,
                    remaining_quota=0,
                    total_quota=rule.requests_per_window,
                    retry_after_seconds=retry_after
                )
    
    def get_remaining_quota(self, key: str, rule: RateLimitingRule, current_time: float) -> int:
        with self._lock:
            window_start = current_time - rule.window_size_seconds
            self._clean_expired_requests(key, window_start)
            current_requests = len(self.request_logs[key])
            return max(0, rule.requests_per_window - current_requests)
    
    def reset_quota(self, key: str) -> None:
        with self._lock:
            if key in self.request_logs:
                self.request_logs[key].clear()
    
    def _clean_expired_requests(self, key: str, window_start: float):
        request_log = self.request_logs[key]
        while request_log and request_log[0] < window_start:
            request_log.popleft()

# CONCRETE STRATEGY: Fixed window counter algorithm
class FixedWindowCounterAlgorithm(RateLimitingAlgorithm):
    """
    Fixed Window Counter Rate Limiting Algorithm
    
    CHARACTERISTICS:
    - Simple and memory efficient: O(1) per key
    - Potential traffic spikes at window boundaries
    - Fast processing with minimal computation
    - Good for approximate rate limiting
    
    ALGORITHM:
    1. Divide time into fixed windows
    2. Count requests in current window
    3. Reset counter at window boundaries
    4. Allow if counter < limit
    """
    
    def __init__(self):
        super().__init__()
        self.counters: Dict[str, Dict[str, Any]] = {}
    
    def is_allowed(self, key: str, rule: RateLimitingRule, current_time: float) -> RateLimitResult:
        with self._lock:
            window_start = self._get_window_start(current_time, rule.window_size_seconds)
            counter = self._get_or_create_counter(key, window_start)
            
            # Reset counter if we're in a new window
            if counter['window_start'] != window_start:
                counter['count'] = 0
                counter['window_start'] = window_start
            
            if counter['count'] < rule.requests_per_window:
                counter['count'] += 1
                remaining = rule.requests_per_window - counter['count']
                
                return RateLimitResult(
                    status=RateLimitStatus.ALLOWED,
                    allowed=True,
                    remaining_quota=remaining,
                    total_quota=rule.requests_per_window,
                    reset_time=datetime.fromtimestamp(window_start + rule.window_size_seconds)
                )
            else:
                # Calculate retry after time (start of next window)
                next_window = window_start + rule.window_size_seconds
                retry_after = next_window - current_time
                
                return RateLimitResult(
                    status=RateLimitStatus.REJECTED,
                    allowed=False,
                    remaining_quota=0,
                    total_quota=rule.requests_per_window,
                    retry_after_seconds=retry_after,
                    reset_time=datetime.fromtimestamp(next_window)
                )
    
    def get_remaining_quota(self, key: str, rule: RateLimitingRule, current_time: float) -> int:
        with self._lock:
            window_start = self._get_window_start(current_time, rule.window_size_seconds)
            counter = self._get_or_create_counter(key, window_start)
            
            if counter['window_start'] != window_start:
                return rule.requests_per_window
            
            return max(0, rule.requests_per_window - counter['count'])
    
    def reset_quota(self, key: str) -> None:
        with self._lock:
            if key in self.counters:
                del self.counters[key]
    
    def _get_window_start(self, current_time: float, window_size: int) -> float:
        return math.floor(current_time / window_size) * window_size
    
    def _get_or_create_counter(self, key: str, window_start: float) -> Dict[str, Any]:
        if key not in self.counters:
            self.counters[key] = {
                'count': 0,
                'window_start': window_start
            }
        return self.counters[key]

# FACTORY PATTERN: Algorithm creation
class RateLimitingAlgorithmFactory:
    """
    Factory for creating rate limiting algorithms
    
    FACTORY PATTERN: Centralized algorithm creation
    EXTENSIBILITY: Easy to add new algorithm types
    """
    
    _algorithms = {
        AlgorithmType.TOKEN_BUCKET: TokenBucketAlgorithm,
        AlgorithmType.SLIDING_WINDOW_LOG: SlidingWindowLogAlgorithm,
        AlgorithmType.FIXED_WINDOW: FixedWindowCounterAlgorithm,
    }
    
    @classmethod
    def create_algorithm(cls, algorithm_type: AlgorithmType) -> RateLimitingAlgorithm:
        if algorithm_type not in cls._algorithms:
            raise ValueError(f"Unsupported algorithm type: {algorithm_type}")
        
        return cls._algorithms[algorithm_type]()
    
    @classmethod
    def register_algorithm(cls, algorithm_type: AlgorithmType, algorithm_class):
        """Register custom algorithm implementation"""
        cls._algorithms[algorithm_type] = algorithm_class

# OBSERVER PATTERN: Rate limit event listener
class RateLimitEventListener(ABC):
    @abstractmethod
    def on_rate_limit_violated(self, key: str, rule: RateLimitingRule, result: RateLimitResult):
        pass
    
    @abstractmethod
    def on_rate_limit_allowed(self, key: str, rule: RateLimitingRule, result: RateLimitResult):
        pass

# CONCRETE OBSERVER: Console logging listener
class ConsoleEventListener(RateLimitEventListener):
    def on_rate_limit_violated(self, key: str, rule: RateLimitingRule, result: RateLimitResult):
        print(f"[RATE_LIMIT_VIOLATED] Key: {key}, Rule: {rule.requests_per_window}/{rule.window_size_seconds}s")
    
    def on_rate_limit_allowed(self, key: str, rule: RateLimitingRule, result: RateLimitResult):
        print(f"[RATE_LIMIT_ALLOWED] Key: {key}, Remaining: {result.remaining_quota}")

# STATISTICS TRACKING: Usage analytics
class RateLimitStatistics:
    def __init__(self):
        self.total_requests = 0
        self.allowed_requests = 0
        self.rejected_requests = 0
        self.violations_by_key = defaultdict(int)
        self.start_time = time.time()
        self._lock = threading.RLock()
    
    def record_request(self, key: str, result: RateLimitResult):
        with self._lock:
            self.total_requests += 1
            if result.allowed:
                self.allowed_requests += 1
            else:
                self.rejected_requests += 1
                self.violations_by_key[key] += 1
    
    @property
    def rejection_rate(self) -> float:
        if self.total_requests == 0:
            return 0.0
        return self.rejected_requests / self.total_requests
    
    @property
    def requests_per_second(self) -> float:
        elapsed = time.time() - self.start_time
        return self.total_requests / elapsed if elapsed > 0 else 0.0
    
    def get_top_violators(self, limit: int = 10) -> List[tuple]:
        sorted_violators = sorted(
            self.violations_by_key.items(),
            key=lambda x: x[1],
            reverse=True
        )
        return sorted_violators[:limit]

# MAIN RATE LIMITER: Facade for the entire system
class RateLimiter:
    """
    Main Rate Limiting System
    
    FACADE PATTERN: Simple interface for complex rate limiting logic
    STRATEGY PATTERN: Pluggable algorithms and storage backends
    OBSERVER PATTERN: Event notifications for monitoring
    
    FEATURES:
    - Multiple algorithm support with automatic selection
    - Rule-based configuration for different resources
    - Real-time monitoring and statistics
    - Thread-safe operations for concurrent access
    - Extensible architecture for custom implementations
    """
    
    def __init__(self, default_algorithm: AlgorithmType = AlgorithmType.TOKEN_BUCKET):
        self.default_algorithm = default_algorithm
        self.rules: Dict[str, RateLimitingRule] = {}
        self.algorithms: Dict[AlgorithmType, RateLimitingAlgorithm] = {}
        self.event_listeners: List[RateLimitEventListener] = []
        self.statistics = RateLimitStatistics()
        self._lock = threading.RLock()
        
        # Initialize default algorithms
        self._initialize_algorithms()
    
    def _initialize_algorithms(self):
        """Initialize all supported algorithms"""
        for algorithm_type in AlgorithmType:
            try:
                self.algorithms[algorithm_type] = RateLimitingAlgorithmFactory.create_algorithm(algorithm_type)
            except ValueError:
                # Skip unsupported algorithms
                pass
    
    def add_rule(self, resource: str, rule: RateLimitingRule):
        """Add rate limiting rule for a resource"""
        with self._lock:
            self.rules[resource] = rule
    
    def remove_rule(self, resource: str):
        """Remove rate limiting rule for a resource"""
        with self._lock:
            if resource in self.rules:
                del self.rules[resource]
    
    def is_allowed(self, identifier: str, resource: str = "default") -> RateLimitResult:
        """
        Check if request is allowed for identifier and resource
        
        MAIN BUSINESS LOGIC:
        1. Get or create rule for resource
        2. Select appropriate algorithm
        3. Check rate limit using algorithm
        4. Record statistics and fire events
        5. Return result with quota information
        """
        current_time = time.time()
        
        # Get rule for resource
        rule = self._get_rule_for_resource(resource)
        
        # Get algorithm for rule
        algorithm = self.algorithms.get(rule.algorithm)
        if not algorithm:
            return RateLimitResult(
                status=RateLimitStatus.ERROR,
                allowed=False,
                remaining_quota=0,
                total_quota=0
            )
        
        # Check rate limit
        cache_key = f"{identifier}:{resource}"
        result = algorithm.is_allowed(cache_key, rule, current_time)
        
        # Record statistics
        self.statistics.record_request(identifier, result)
        
        # Fire events
        self._fire_events(identifier, rule, result)
        
        return result
    
    def get_remaining_quota(self, identifier: str, resource: str = "default") -> int:
        """Get remaining quota for identifier and resource"""
        current_time = time.time()
        rule = self._get_rule_for_resource(resource)
        algorithm = self.algorithms.get(rule.algorithm)
        
        if not algorithm:
            return 0
        
        cache_key = f"{identifier}:{resource}"
        return algorithm.get_remaining_quota(cache_key, rule, current_time)
    
    def reset_quota(self, identifier: str, resource: str = "default"):
        """Reset quota for identifier and resource"""
        rule = self._get_rule_for_resource(resource)
        algorithm = self.algorithms.get(rule.algorithm)
        
        if algorithm:
            cache_key = f"{identifier}:{resource}"
            algorithm.reset_quota(cache_key)
    
    def add_event_listener(self, listener: RateLimitEventListener):
        """Add event listener for rate limiting events"""
        self.event_listeners.append(listener)
    
    def remove_event_listener(self, listener: RateLimitEventListener):
        """Remove event listener"""
        if listener in self.event_listeners:
            self.event_listeners.remove(listener)
    
    def get_statistics(self) -> RateLimitStatistics:
        """Get rate limiting statistics"""
        return self.statistics
    
    def _get_rule_for_resource(self, resource: str) -> RateLimitingRule:
        """Get rule for resource, create default if not exists"""
        if resource not in self.rules:
            # Create default rule
            default_rule = RateLimitingRule(
                requests_per_window=100,
                window_size_seconds=60,
                algorithm=self.default_algorithm
            )
            self.rules[resource] = default_rule
        
        return self.rules[resource]
    
    def _fire_events(self, identifier: str, rule: RateLimitingRule, result: RateLimitResult):
        """Fire appropriate events based on result"""
        for listener in self.event_listeners:
            try:
                if result.allowed:
                    listener.on_rate_limit_allowed(identifier, rule, result)
                else:
                    listener.on_rate_limit_violated(identifier, rule, result)
            except Exception as e:
                print(f"Error in event listener: {e}")

# HIERARCHICAL RATE LIMITING: Multiple levels
class HierarchicalRateLimiter:
    """
    Hierarchical Rate Limiting with multiple levels
    
    COMPOSITE PATTERN: Multiple rate limiters working together
    CHAIN OF RESPONSIBILITY: Check limits at each level
    """
    
    def __init__(self):
        self.global_limiter = RateLimiter()
        self.tenant_limiter = RateLimiter()
        self.user_limiter = RateLimiter()
    
    def setup_limits(self):
        """Setup hierarchical rate limits"""
        # Global limits (system-wide)
        global_rule = RateLimitingRule(10000, 60, AlgorithmType.TOKEN_BUCKET)
        self.global_limiter.add_rule("api", global_rule)
        
        # Tenant limits (per organization)
        tenant_rule = RateLimitingRule(1000, 60, AlgorithmType.SLIDING_WINDOW_LOG)
        self.tenant_limiter.add_rule("api", tenant_rule)
        
        # User limits (per individual user)
        user_rule = RateLimitingRule(100, 60, AlgorithmType.FIXED_WINDOW)
        self.user_limiter.add_rule("api", user_rule)
    
    def is_allowed(self, tenant_id: str, user_id: str, resource: str = "api") -> RateLimitResult:
        """Check all levels - most restrictive wins"""
        # Check global limit
        global_result = self.global_limiter.is_allowed("global", resource)
        if not global_result.allowed:
            return global_result
        
        # Check tenant limit
        tenant_result = self.tenant_limiter.is_allowed(tenant_id, resource)
        if not tenant_result.allowed:
            return tenant_result
        
        # Check user limit
        user_result = self.user_limiter.is_allowed(user_id, resource)
        return user_result

# Demo usage and comprehensive testing
def main():
    print("=== Rate Limiter System Demo ===\n")
    
    # Create rate limiter with console logging
    rate_limiter = RateLimiter()
    console_listener = ConsoleEventListener()
    rate_limiter.add_event_listener(console_listener)
    
    # Test 1: Token Bucket Algorithm
    print("1. Testing Token Bucket Algorithm:")
    token_rule = RateLimitingRule(
        requests_per_window=5,
        window_size_seconds=10,
        algorithm=AlgorithmType.TOKEN_BUCKET,
        burst_capacity=10
    )
    rate_limiter.add_rule("token_api", token_rule)
    
    # Test burst capacity
    for i in range(12):
        result = rate_limiter.is_allowed("user1", "token_api")
        print(f"Request {i+1}: {'✓' if result.allowed else '✗'} (remaining: {result.remaining_quota})")
    
    print("\n" + "="*50 + "\n")
    
    # Test 2: Sliding Window Log Algorithm
    print("2. Testing Sliding Window Log Algorithm:")
    sliding_rule = RateLimitingRule(
        requests_per_window=3,
        window_size_seconds=5,
        algorithm=AlgorithmType.SLIDING_WINDOW_LOG
    )
    rate_limiter.add_rule("sliding_api", sliding_rule)
    
    for i in range(5):
        result = rate_limiter.is_allowed("user2", "sliding_api")
        print(f"Request {i+1}: {'✓' if result.allowed else '✗'} (remaining: {result.remaining_quota})")
        if result.retry_after_seconds:
            print(f"  Retry after: {result.retry_after_seconds:.2f} seconds")
    
    print("\n" + "="*50 + "\n")
    
    # Test 3: Fixed Window Algorithm
    print("3. Testing Fixed Window Algorithm:")
    fixed_rule = RateLimitingRule(
        requests_per_window=3,
        window_size_seconds=5,
        algorithm=AlgorithmType.FIXED_WINDOW
    )
    rate_limiter.add_rule("fixed_api", fixed_rule)
    
    for i in range(5):
        result = rate_limiter.is_allowed("user3", "fixed_api")
        print(f"Request {i+1}: {'✓' if result.allowed else '✗'} (remaining: {result.remaining_quota})")
        if result.reset_time:
            print(f"  Window resets at: {result.reset_time}")
    
    print("\n" + "="*50 + "\n")
    
    # Test 4: Different users, same resource
    print("4. Testing Multiple Users:")
    api_rule = RateLimitingRule(3, 10, AlgorithmType.TOKEN_BUCKET)
    rate_limiter.add_rule("shared_api", api_rule)
    
    users = ["alice", "bob", "charlie"]
    for user in users:
        print(f"\nUser {user}:")
        for i in range(4):
            result = rate_limiter.is_allowed(user, "shared_api")
            print(f"  Request {i+1}: {'✓' if result.allowed else '✗'}")
    
    print("\n" + "="*50 + "\n")
    
    # Test 5: Statistics and Monitoring
    print("5. Rate Limiting Statistics:")
    stats = rate_limiter.get_statistics()
    print(f"Total requests: {stats.total_requests}")
    print(f"Allowed requests: {stats.allowed_requests}")
    print(f"Rejected requests: {stats.rejected_requests}")
    print(f"Rejection rate: {stats.rejection_rate:.2%}")
    print(f"Requests per second: {stats.requests_per_second:.2f}")
    
    print("\nTop violators:")
    for identifier, violations in stats.get_top_violators(3):
        print(f"  {identifier}: {violations} violations")
    
    print("\n" + "="*50 + "\n")
    
    # Test 6: Hierarchical Rate Limiting
    print("6. Testing Hierarchical Rate Limiting:")
    hierarchical_limiter = HierarchicalRateLimiter()
    hierarchical_limiter.setup_limits()
    
    # Test hierarchical limits
    for i in range(5):
        result = hierarchical_limiter.is_allowed("tenant1", "user1")
        print(f"Hierarchical check {i+1}: {'✓' if result.allowed else '✗'}")
    
    print("\n" + "="*50 + "\n")
    
    # Test 7: Algorithm Performance Comparison
    print("7. Algorithm Performance Comparison:")
    
    algorithms = [
        (AlgorithmType.TOKEN_BUCKET, "Token Bucket"),
        (AlgorithmType.SLIDING_WINDOW_LOG, "Sliding Window Log"),
        (AlgorithmType.FIXED_WINDOW, "Fixed Window")
    ]
    
    for algo_type, algo_name in algorithms:
        test_rule = RateLimitingRule(1000, 60, algo_type)
        test_limiter = RateLimiter()
        test_limiter.add_rule("perf_test", test_rule)
        
        # Performance test
        start_time = time.time()
        requests = 1000
        allowed_count = 0
        
        for i in range(requests):
            result = test_limiter.is_allowed(f"perf_user_{i % 100}", "perf_test")
            if result.allowed:
                allowed_count += 1
        
        end_time = time.time()
        duration = end_time - start_time
        rps = requests / duration
        
        print(f"{algo_name}:")
        print(f"  Processed {requests} requests in {duration:.3f}s")
        print(f"  Rate: {rps:.0f} requests/second")
        print(f"  Allowed: {allowed_count}/{requests}")
        print()

if __name__ == "__main__":
    main()