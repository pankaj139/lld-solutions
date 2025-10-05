# Connection Pool System

## 🔗 Implementation Links

- **Python Implementation**: [python/connection-pool/main.py](python/connection-pool/main.py)
- **JavaScript Implementation**: [javascript/connection-pool/main.js](javascript/connection-pool/main.js)

## Problem Statement

Design a Connection Pool system that can:

1. **Manage database connections efficiently** with reusable connection instances
2. **Handle concurrent requests** with thread-safe operations
3. **Implement connection lifecycle** (create, validate, recycle, destroy)
4. **Provide health checks** to detect and replace stale connections
5. **Support dynamic pool sizing** (min, max connections)
6. **Queue requests** when pool is exhausted
7. **Monitor pool statistics** (active, idle, wait time)
8. **Handle connection timeouts** and failures gracefully

## Requirements

### Functional Requirements

- Create connections lazily up to max pool size
- Maintain minimum number of idle connections
- Acquire and release connections from/to pool
- Validate connections before returning to client
- Detect and remove stale/broken connections
- Queue requests when pool is full
- Support connection timeout for acquire operations
- Implement connection max lifetime (age out old connections)
- Provide pool statistics and monitoring
- Support graceful shutdown with cleanup

### Non-Functional Requirements

- Thread-safe for concurrent access
- Fast acquisition: O(1) from idle pool
- Low latency: < 10ms for connection acquisition
- High throughput: Handle 1000+ requests/second
- Resource efficient: Reuse connections
- Configurable: Pool size, timeouts, validation
- Observable: Metrics and health checks
- Resilient: Handle connection failures gracefully

## Design Decisions

### Key Classes

1. **Connection Pool**
   - `ConnectionPool`: Main pool manager (Singleton)
   - Manages connection lifecycle
   - Handles acquire/release operations

2. **Connection Wrapper**
   - `PooledConnection`: Wraps actual connection
   - Tracks connection state and metadata
   - Implements health checks

3. **Connection Factory**
   - `ConnectionFactory`: Creates new connections
   - Abstract factory for different connection types
   - Database-specific implementations

4. **Connection States**
   - `ConnectionState`: IDLE, IN_USE, VALIDATING, CLOSED
   - State machine for connection lifecycle

5. **Pool Configuration**
   - `PoolConfig`: Configuration parameters
   - Min/max size, timeouts, validation settings

6. **Statistics**
   - `PoolStatistics`: Pool metrics
   - Active/idle counts, wait times, hit rates

### Design Patterns Used

1. **Object Pool Pattern**: Reuse expensive connection objects
2. **Factory Pattern**: Create connections through factory
3. **Singleton Pattern**: Single pool instance per database
4. **State Pattern**: Connection lifecycle states
5. **Strategy Pattern**: Different validation strategies
6. **Observer Pattern**: Pool event notifications
7. **Template Method Pattern**: Connection lifecycle template

### Key Features

- **Lazy Creation**: Create connections on-demand
- **Connection Validation**: Pre-use health checks
- **Connection Aging**: Max lifetime enforcement
- **Wait Queue**: FIFO queue for pending requests
- **Timeout Support**: Configurable acquire timeout
- **Statistics**: Real-time pool metrics
- **Thread Safety**: Lock-based synchronization

## Class Diagram

```text
ConnectionPool (Singleton)
├── idle_connections: Queue[PooledConnection]
├── active_connections: Set[PooledConnection]
├── wait_queue: Queue[Request]
├── factory: ConnectionFactory
├── config: PoolConfig
├── statistics: PoolStatistics
├── acquire(timeout) → PooledConnection
├── release(connection)
├── validate_connection(connection) → bool
├── create_connection() → PooledConnection
├── remove_connection(connection)
├── shutdown()
└── get_statistics() → PoolStatistics

PooledConnection
├── connection: Connection
├── state: ConnectionState
├── created_at: timestamp
├── last_used: timestamp
├── use_count: int
├── is_valid() → bool
├── reset()
├── close()
└── age() → float

ConnectionFactory (Abstract)
├── create() → Connection
├── validate(connection) → bool
├── reset(connection)
└── implementations:
    ├── DatabaseConnectionFactory
    ├── HttpConnectionFactory
    └── CustomConnectionFactory

ConnectionState (Enum)
├── IDLE
├── IN_USE
├── VALIDATING
├── CLOSED
└── INVALID

PoolConfig
├── min_size: int
├── max_size: int
├── connection_timeout: int
├── max_lifetime: int
├── validation_timeout: int
├── wait_timeout: int
└── validate_on_acquire: bool

PoolStatistics
├── total_connections: int
├── idle_connections: int
├── active_connections: int
├── waiting_requests: int
├── total_acquired: int
├── total_released: int
├── average_wait_time: float
└── cache_hit_rate: float
```

## Usage Example

```python
# Configure connection pool
config = PoolConfig(
    min_size=5,
    max_size=20,
    connection_timeout=30,
    max_lifetime=3600,
    validate_on_acquire=True
)

# Create connection factory
factory = DatabaseConnectionFactory(
    host="localhost",
    port=5432,
    database="myapp",
    user="admin",
    password="secret"
)

# Initialize connection pool
pool = ConnectionPool.get_instance(factory, config)

# Acquire connection
connection = pool.acquire(timeout=10)

try:
    # Use connection
    result = connection.execute("SELECT * FROM users")
    print(result)
finally:
    # Always release connection back to pool
    pool.release(connection)

# Get pool statistics
stats = pool.get_statistics()
print(f"Active: {stats.active_connections}")
print(f"Idle: {stats.idle_connections}")
print(f"Hit Rate: {stats.cache_hit_rate:.2%}")

# Shutdown pool gracefully
pool.shutdown()
```

## Connection Lifecycle

### 1. Connection Creation

```text
Client Request
    ↓
Check Idle Pool
    ↓
If available → Return connection
    ↓
If not available → Check pool size
    ↓
If < max_size → Create new connection
    ↓
If = max_size → Add to wait queue
    ↓
Wait for release or timeout
```

### 2. Connection States

```text
         create()
           ↓
        [IDLE] ←──── release()
           ↓           ↑
       acquire()       │
           ↓           │
      [IN_USE] ────────┘
           ↓
      validate()
           ↓
    [VALIDATING]
        ↓     ↓
    [IDLE] [INVALID]
              ↓
          [CLOSED]
```

### 3. Connection Validation

```python
def validate_connection(connection):
    """
    Validate connection health
    
    Checks:
    1. Connection is open
    2. No network errors
    3. Execute test query
    4. Check max lifetime
    5. Verify state
    """
    if not connection.is_open():
        return False
    
    if connection.age() > config.max_lifetime:
        return False
    
    try:
        # Execute test query
        connection.execute("SELECT 1")
        return True
    except Exception:
        return False
```

## Pool Sizing Strategy

### Minimum Pool Size

```text
min_size = concurrent_requests / 2

Example:
- Expected concurrent requests: 100
- min_size = 50 connections (warm pool)

Benefits:
- Reduces cold start latency
- Maintains hot connections
- Handles burst traffic
```

### Maximum Pool Size

```text
max_size = (max_concurrent_requests × 1.2)

Example:
- Peak concurrent requests: 200
- max_size = 240 connections (20% buffer)

Benefits:
- Handles peak load
- Prevents resource exhaustion
- Allows for spikes
```

### Optimal Configuration

```python
# Low traffic application
min_size=5, max_size=20

# Medium traffic application
min_size=10, max_size=50

# High traffic application
min_size=50, max_size=200

# Very high traffic
min_size=100, max_size=500
```

## Advanced Features

### 1. Connection Validation Strategies

```python
class ValidationStrategy(ABC):
    @abstractmethod
    def validate(self, connection) -> bool:
        pass

class PingValidation(ValidationStrategy):
    """Fast validation using ping"""
    def validate(self, connection):
        return connection.ping()

class QueryValidation(ValidationStrategy):
    """Thorough validation using test query"""
    def validate(self, connection):
        return connection.execute("SELECT 1") is not None

class CompositeValidation(ValidationStrategy):
    """Multiple validation checks"""
    def validate(self, connection):
        return (connection.is_open() and
                connection.ping() and
                connection.age() < max_lifetime)
```

### 2. Connection Recycling

```python
# Recycle connection after max uses
if connection.use_count > max_uses:
    pool.remove_connection(connection)
    pool.create_connection()

# Recycle connection after max lifetime
if connection.age() > max_lifetime:
    pool.remove_connection(connection)
    pool.create_connection()
```

### 3. Wait Queue Management

```python
class WaitQueue:
    """
    FIFO queue for pending connection requests
    """
    def __init__(self):
        self.queue = []
        self.condition = Condition()
    
    def add(self, request):
        with self.condition:
            self.queue.append(request)
            request.start_wait()
    
    def notify(self, connection):
        with self.condition:
            if self.queue:
                request = self.queue.pop(0)
                request.complete(connection)
                self.condition.notify()
```

### 4. Pool Monitoring

```python
class PoolMonitor:
    """Monitor pool health and performance"""
    
    def check_health(self, pool):
        stats = pool.get_statistics()
        
        # Check for connection exhaustion
        if stats.idle_connections == 0:
            alert("Pool exhausted")
        
        # Check for high wait times
        if stats.average_wait_time > threshold:
            alert("High wait time")
        
        # Check for low hit rate
        if stats.cache_hit_rate < 0.80:
            alert("Low cache hit rate")
```

## Real-World Use Cases

### 1. Database Connection Pool

```python
# PostgreSQL connection pool
db_pool = ConnectionPool(
    factory=PostgreSQLConnectionFactory(
        host="db.example.com",
        database="production",
        user="app_user"
    ),
    config=PoolConfig(
        min_size=10,
        max_size=50,
        connection_timeout=30,
        max_lifetime=3600
    )
)

# Execute query
with db_pool.acquire() as conn:
    result = conn.execute("SELECT * FROM orders WHERE status = ?", ["pending"])
```

### 2. HTTP Client Pool

```python
# HTTP connection pool for API calls
http_pool = ConnectionPool(
    factory=HTTPConnectionFactory(
        base_url="https://api.example.com",
        timeout=10
    ),
    config=PoolConfig(
        min_size=5,
        max_size=20,
        keep_alive=True
    )
)

# Make API request
with http_pool.acquire() as client:
    response = client.get("/users/123")
```

### 3. Thread Pool

```python
# Thread pool for background tasks
thread_pool = ConnectionPool(
    factory=ThreadConnectionFactory(
        worker_class=BackgroundWorker
    ),
    config=PoolConfig(
        min_size=4,
        max_size=16
    )
)

# Execute task
with thread_pool.acquire() as worker:
    worker.execute(task)
```

### 4. Redis Connection Pool

```python
# Redis connection pool
redis_pool = ConnectionPool(
    factory=RedisConnectionFactory(
        host="cache.example.com",
        port=6379
    ),
    config=PoolConfig(
        min_size=5,
        max_size=25,
        socket_keepalive=True
    )
)

# Cache operations
with redis_pool.acquire() as redis:
    redis.set("key", "value", ex=3600)
    value = redis.get("key")
```

## Performance Optimizations

### 1. Lock-Free Queue

```python
# Use lock-free queue for idle connections
from queue import Queue

class ConnectionPool:
    def __init__(self):
        self.idle_queue = Queue()  # Thread-safe queue
    
    def acquire(self):
        try:
            return self.idle_queue.get_nowait()
        except Empty:
            return self.create_connection()
    
    def release(self, connection):
        self.idle_queue.put(connection)
```

### 2. Connection Warming

```python
# Pre-create min_size connections at startup
def initialize_pool(self):
    for _ in range(self.config.min_size):
        connection = self.create_connection()
        self.idle_queue.put(connection)
```

### 3. Batch Validation

```python
# Validate multiple connections in parallel
def validate_idle_connections(self):
    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = []
        for conn in self.idle_connections:
            future = executor.submit(self.validate_connection, conn)
            futures.append((conn, future))
        
        for conn, future in futures:
            if not future.result():
                self.remove_connection(conn)
```

### 4. Adaptive Sizing

```python
# Dynamically adjust pool size based on load
def adjust_pool_size(self):
    stats = self.get_statistics()
    
    # Increase if high utilization
    if stats.idle_connections < 2:
        self.create_connection()
    
    # Decrease if low utilization
    if stats.idle_connections > stats.active_connections:
        self.remove_idle_connection()
```

## Configuration Best Practices

### 1. Connection Timeout

```python
# Set connection timeout based on query complexity
simple_queries: timeout=5s
complex_queries: timeout=30s
batch_operations: timeout=120s
```

### 2. Validation Settings

```python
# Validate on acquire for critical operations
validate_on_acquire=True   # For production
validate_on_acquire=False  # For high throughput

# Validation interval
validate_interval=300  # Every 5 minutes
```

### 3. Max Lifetime

```python
# Set max lifetime to prevent connection issues
max_lifetime=3600    # 1 hour (default)
max_lifetime=1800    # 30 minutes (aggressive)
max_lifetime=7200    # 2 hours (relaxed)
```

### 4. Wait Timeout

```python
# Set wait timeout to fail fast
wait_timeout=10      # 10 seconds (default)
wait_timeout=30      # 30 seconds (patient)
wait_timeout=5       # 5 seconds (aggressive)
```

## Error Handling

### 1. Connection Acquisition Errors

```python
try:
    connection = pool.acquire(timeout=10)
except PoolExhaustedError:
    # Pool is full, all connections in use
    log.error("Pool exhausted, consider increasing max_size")
    # Use fallback or retry logic

except AcquireTimeoutError:
    # Timeout waiting for connection
    log.error("Timeout acquiring connection")
    # Retry or fail request

except ConnectionError:
    # Failed to create new connection
    log.error("Database connection failed")
    # Alert ops team
```

### 2. Connection Validation Errors

```python
connection = pool.acquire()

if not pool.validate_connection(connection):
    # Connection is invalid
    pool.remove_connection(connection)
    connection = pool.acquire()  # Retry
```

### 3. Connection Release Errors

```python
try:
    # Use connection
    result = connection.execute(query)
finally:
    # Always release, even on error
    pool.release(connection)
```

## Monitoring and Metrics

### Key Metrics

```python
# Pool utilization
utilization = active_connections / max_size

# Connection wait time
average_wait_time = total_wait_time / total_requests

# Cache hit rate
hit_rate = idle_hits / total_requests

# Connection lifetime
average_lifetime = sum(connection.age()) / total_connections
```

### Health Checks

```python
def health_check():
    stats = pool.get_statistics()
    
    return {
        "healthy": stats.idle_connections > 0,
        "utilization": stats.active_connections / config.max_size,
        "wait_time": stats.average_wait_time,
        "hit_rate": stats.cache_hit_rate
    }
```

### Alerts

```text
Alert Conditions:
1. Utilization > 90% → Scale up
2. Wait time > 5s → Increase max_size
3. Hit rate < 80% → Increase min_size
4. Failed validations > 10% → Check database health
```

## Time Complexity

| Operation | Complexity | Notes |
|-----------|------------|-------|
| Acquire (hit) | O(1) | Pop from idle queue |
| Acquire (miss) | O(1) | Create new connection |
| Release | O(1) | Push to idle queue |
| Validate | O(1) | Single query check |
| Statistics | O(1) | Cached metrics |
| Shutdown | O(n) | Close all connections |

## Space Complexity

| Component | Space |
|-----------|-------|
| Idle Pool | O(min_size) |
| Active Pool | O(max_size) |
| Wait Queue | O(w) |
| Total | O(max_size + w) |

**Note:** w = waiting requests

## Interview Discussion Points

1. **How to handle connection failures?**
   - Validation before use
   - Automatic retry logic
   - Circuit breaker pattern
   - Fallback connections

2. **How to optimize pool size?**
   - Monitor utilization metrics
   - Adjust based on load patterns
   - Use adaptive sizing
   - Consider database limits

3. **How to ensure thread safety?**
   - Lock-based synchronization
   - Thread-safe queues
   - Atomic operations
   - Condition variables

4. **How to handle slow queries?**
   - Query timeout
   - Connection timeout
   - Separate pool for long queries
   - Query monitoring

5. **How to scale across multiple servers?**
   - Pool per server instance
   - Load balancing
   - Connection limit per database
   - Monitor aggregate connections

6. **How to test connection pool?**
   - Unit tests for lifecycle
   - Load tests for concurrency
   - Stress tests for limits
   - Chaos tests for failures

## Common Pitfalls

1. **Pool Too Small**
   - Symptoms: High wait times, timeouts
   - Solution: Increase max_size

2. **Pool Too Large**
   - Symptoms: Database connection limit exceeded
   - Solution: Reduce max_size

3. **No Validation**
   - Symptoms: Stale connection errors
   - Solution: Enable validate_on_acquire

4. **Connection Leaks**
   - Symptoms: Pool exhaustion over time
   - Solution: Always use try-finally for release

5. **No Timeout**
   - Symptoms: Requests hang indefinitely
   - Solution: Set acquire timeout

## Best Practices

1. **Always Release Connections**: Use try-finally or context managers
2. **Monitor Pool Health**: Track utilization and wait times
3. **Tune Pool Size**: Based on actual load patterns
4. **Enable Validation**: For production environments
5. **Set Timeouts**: Prevent infinite waits
6. **Handle Errors**: Graceful degradation on failures
7. **Test Under Load**: Verify pool behavior under stress
8. **Document Configuration**: Explain tuning decisions

## Summary

Connection Pool is essential for resource management:

- **Performance**: O(1) connection reuse
- **Efficiency**: Reduce connection overhead
- **Scalability**: Handle concurrent requests
- **Reliability**: Health checks and validation
- **Observable**: Rich metrics and monitoring
- **Configurable**: Flexible pool sizing

Perfect for:

- Database connection management
- HTTP client pooling
- Thread pool management
- Resource pooling (sockets, files)
- Microservices communication
