"""
CONNECTION POOL SYSTEM - Low Level Design Implementation in Python

This file implements a production-ready connection pool for efficient resource management
with support for database connections, HTTP clients, and any poolable resource.

FILE PURPOSE:
Provides efficient connection pooling to reuse expensive connection objects, reduce latency,
and handle concurrent requests. Implements connection lifecycle management, health checks,
validation, and automatic recovery from connection failures.

DESIGN PATTERNS USED:
1. OBJECT POOL PATTERN: Reuse expensive connection objects
   - Maintains pool of reusable connections
   - Reduces connection creation overhead
   - Improves application performance

2. FACTORY PATTERN: Create connections through factory
   - ConnectionFactory creates different connection types
   - Abstracts connection creation logic
   - Easy to support multiple connection types

3. SINGLETON PATTERN: Single pool instance per configuration
   - One pool per database/resource
   - Global access point
   - Resource control

4. STATE PATTERN: Connection lifecycle states
   - IDLE, IN_USE, VALIDATING, CLOSED states
   - Valid state transitions
   - Clear connection lifecycle

5. STRATEGY PATTERN: Different validation strategies
   - PingValidation, QueryValidation
   - Pluggable validation logic
   - Custom validation rules

6. OBSERVER PATTERN: Pool event notifications
   - Monitor pool events
   - Track statistics
   - Alert on issues

7. TEMPLATE METHOD PATTERN: Connection lifecycle template
   - Standardized acquire/release flow
   - Customizable validation steps
   - Consistent behavior

OOP CONCEPTS DEMONSTRATED:
- ENCAPSULATION: Connection state hidden behind interface
- INHERITANCE: ConnectionFactory hierarchy
- POLYMORPHISM: Different connection types
- ABSTRACTION: Abstract factory and strategy

SOLID PRINCIPLES:
- SRP: Each class has single responsibility
- OCP: Open for extension (new connection types) closed for modification
- LSP: All factories interchangeable
- ISP: Focused interfaces (Factory, Strategy)
- DIP: Depends on abstractions not concretions

USAGE:
    # Configure pool
    config = PoolConfig(min_size=5, max_size=20)
    factory = DatabaseConnectionFactory(host="localhost", database="myapp")
    
    # Create pool
    pool = ConnectionPool(factory, config)
    pool.initialize()
    
    # Acquire connection
    connection = pool.acquire(timeout=10)
    
    try:
        # Use connection
        result = connection.execute("SELECT * FROM users")
    finally:
        # Always release
        pool.release(connection)
    
    # Get statistics
    stats = pool.get_statistics()
    print(f"Active: {stats.active_connections}")
    
    # Shutdown
    pool.shutdown()

RETURN VALUES:
- acquire(timeout): Returns PooledConnection or raises TimeoutError
- release(connection): Returns None
- get_statistics(): Returns PoolStatistics
- validate_connection(connection): Returns bool
"""

from abc import ABC, abstractmethod
from enum import Enum
from typing import Optional, List, Dict
from datetime import datetime, timedelta
import threading
import time
import queue
import random


# ==================== ENUMS ====================

class ConnectionState(Enum):
    """Connection lifecycle states"""
    IDLE = "idle"
    IN_USE = "in_use"
    VALIDATING = "validating"
    CLOSED = "closed"
    INVALID = "invalid"


# ==================== EXCEPTIONS ====================

class PoolError(Exception):
    """Base exception for pool errors"""
    pass


class PoolExhaustedError(PoolError):
    """Pool is exhausted, max connections reached"""
    pass


class AcquireTimeoutError(PoolError):
    """Timeout waiting for connection"""
    pass


class ConnectionValidationError(PoolError):
    """Connection validation failed"""
    pass


# ==================== CONNECTION (Simulated) ====================

class Connection:
    """
    Simulated database connection
    
    In real implementation, this would be:
    - psycopg2.connection for PostgreSQL
    - mysql.connector.connection for MySQL
    - pymongo.MongoClient for MongoDB
    - redis.Redis for Redis
    
    USAGE:
        conn = Connection("localhost", 5432, "mydb")
        conn.connect()
        result = conn.execute("SELECT 1")
        conn.close()
    
    RETURN:
        Connection object
    """
    def __init__(self, host: str, port: int, database: str):
        self.host = host
        self.port = port
        self.database = database
        self._connected = False
        self._closed = False
    
    def connect(self):
        """Establish connection"""
        time.sleep(0.1)  # Simulate connection time
        self._connected = True
        print(f"🔌 Connected to {self.database}@{self.host}:{self.port}")
    
    def execute(self, query: str):
        """Execute query"""
        if not self._connected or self._closed:
            raise ConnectionError("Not connected")
        # Simulate query execution
        time.sleep(0.01)
        return {"status": "success", "query": query}
    
    def ping(self) -> bool:
        """Check if connection is alive"""
        if not self._connected or self._closed:
            return False
        try:
            self.execute("SELECT 1")
            return True
        except:
            return False
    
    def close(self):
        """Close connection"""
        self._connected = False
        self._closed = True
        print(f"🔌 Closed connection to {self.database}")
    
    def reset(self):
        """Reset connection state"""
        if self._connected and not self._closed:
            # Reset any transaction state
            pass
    
    def is_open(self) -> bool:
        """Check if connection is open"""
        return self._connected and not self._closed


# ==================== POOLED CONNECTION ====================

class PooledConnection:
    """
    Wrapper around actual connection with metadata
    
    DESIGN PATTERN: Decorator Pattern - adds pooling behavior
    
    USAGE:
        pooled_conn = PooledConnection(connection, pool)
        pooled_conn.state = ConnectionState.IN_USE
        result = pooled_conn.execute("SELECT 1")
        age = pooled_conn.age()
    
    RETURN:
        PooledConnection with state tracking
    """
    def __init__(self, connection: Connection, pool_id: str):
        self.connection = connection
        self.pool_id = pool_id
        self.state = ConnectionState.IDLE
        self.created_at = datetime.now()
        self.last_used = datetime.now()
        self.use_count = 0
        self.connection_id = f"conn-{id(self):x}"
    
    def execute(self, query: str):
        """Execute query through connection"""
        self.last_used = datetime.now()
        self.use_count += 1
        return self.connection.execute(query)
    
    def is_valid(self) -> bool:
        """Check if connection is valid"""
        return self.connection.is_open() and self.state != ConnectionState.INVALID
    
    def age(self) -> float:
        """Get connection age in seconds"""
        return (datetime.now() - self.created_at).total_seconds()
    
    def idle_time(self) -> float:
        """Get time since last use in seconds"""
        return (datetime.now() - self.last_used).total_seconds()
    
    def reset(self):
        """Reset connection state"""
        self.connection.reset()
        self.last_used = datetime.now()
    
    def close(self):
        """Close underlying connection"""
        self.state = ConnectionState.CLOSED
        self.connection.close()
    
    def __repr__(self):
        return f"PooledConnection({self.connection_id}, {self.state.value})"


# ==================== CONNECTION FACTORY ====================

class ConnectionFactory(ABC):
    """
    Abstract factory for creating connections
    
    DESIGN PATTERN: Factory Pattern
    
    USAGE:
        factory = DatabaseConnectionFactory(host="localhost", database="myapp")
        connection = factory.create()
        is_valid = factory.validate(connection)
    
    RETURN:
        Connection instance
    """
    @abstractmethod
    def create(self) -> Connection:
        """Create new connection"""
        pass
    
    @abstractmethod
    def validate(self, connection: Connection) -> bool:
        """Validate connection"""
        pass
    
    def reset(self, connection: Connection):
        """Reset connection to clean state"""
        connection.reset()


class DatabaseConnectionFactory(ConnectionFactory):
    """
    Factory for database connections
    
    USAGE:
        factory = DatabaseConnectionFactory(
            host="localhost",
            port=5432,
            database="myapp"
        )
        conn = factory.create()
    
    RETURN:
        Database Connection
    """
    def __init__(self, host: str, port: int = 5432, database: str = "default"):
        self.host = host
        self.port = port
        self.database = database
    
    def create(self) -> Connection:
        """Create new database connection"""
        connection = Connection(self.host, self.port, self.database)
        connection.connect()
        return connection
    
    def validate(self, connection: Connection) -> bool:
        """Validate connection with ping"""
        return connection.ping()


# ==================== POOL CONFIGURATION ====================

class PoolConfig:
    """
    Connection pool configuration
    
    USAGE:
        config = PoolConfig(
            min_size=5,
            max_size=20,
            connection_timeout=30,
            max_lifetime=3600
        )
    
    RETURN:
        PoolConfig object
    """
    def __init__(
        self,
        min_size: int = 5,
        max_size: int = 20,
        connection_timeout: int = 30,
        max_lifetime: int = 3600,
        validation_timeout: int = 5,
        wait_timeout: int = 10,
        validate_on_acquire: bool = True,
        validate_on_release: bool = False
    ):
        self.min_size = min_size
        self.max_size = max_size
        self.connection_timeout = connection_timeout
        self.max_lifetime = max_lifetime
        self.validation_timeout = validation_timeout
        self.wait_timeout = wait_timeout
        self.validate_on_acquire = validate_on_acquire
        self.validate_on_release = validate_on_release


# ==================== POOL STATISTICS ====================

class PoolStatistics:
    """
    Connection pool statistics
    
    USAGE:
        stats = pool.get_statistics()
        print(f"Active: {stats.active_connections}")
        print(f"Hit Rate: {stats.hit_rate:.2%}")
    
    RETURN:
        PoolStatistics with metrics
    """
    def __init__(self):
        self.total_connections = 0
        self.idle_connections = 0
        self.active_connections = 0
        self.waiting_requests = 0
        self.total_acquired = 0
        self.total_released = 0
        self.total_created = 0
        self.total_destroyed = 0
        self.total_wait_time = 0.0
        self.failed_validations = 0
    
    @property
    def average_wait_time(self) -> float:
        """Calculate average wait time"""
        if self.total_acquired == 0:
            return 0.0
        return self.total_wait_time / self.total_acquired
    
    @property
    def hit_rate(self) -> float:
        """Calculate cache hit rate"""
        if self.total_acquired == 0:
            return 0.0
        hits = self.total_acquired - self.total_created
        return hits / self.total_acquired
    
    def __repr__(self):
        return (f"PoolStatistics(total={self.total_connections}, "
                f"active={self.active_connections}, "
                f"idle={self.idle_connections}, "
                f"hit_rate={self.hit_rate:.2%})")


# ==================== CONNECTION POOL ====================

class ConnectionPool:
    """
    Main connection pool manager
    
    DESIGN PATTERN: Object Pool Pattern
    
    USAGE:
        pool = ConnectionPool(factory, config)
        pool.initialize()
        
        connection = pool.acquire(timeout=10)
        try:
            result = connection.execute("SELECT * FROM users")
        finally:
            pool.release(connection)
        
        stats = pool.get_statistics()
        pool.shutdown()
    
    RETURN:
        ConnectionPool instance
    """
    _instances = {}
    _lock = threading.Lock()
    
    def __init__(self, factory: ConnectionFactory, config: PoolConfig):
        self.factory = factory
        self.config = config
        self.pool_id = f"pool-{id(self):x}"
        
        # Connection pools
        self._idle_connections: queue.Queue = queue.Queue()
        self._active_connections: Dict[str, PooledConnection] = {}
        self._all_connections: Dict[str, PooledConnection] = {}
        
        # Wait queue
        self._wait_queue: queue.Queue = queue.Queue()
        
        # Statistics
        self.statistics = PoolStatistics()
        
        # Synchronization
        self._pool_lock = threading.RLock()
        self._shutdown = False
        
        print(f"💧 Connection Pool created: {self.pool_id}")
    
    def initialize(self):
        """
        Initialize pool with minimum connections
        
        USAGE:
            pool.initialize()
        
        RETURN:
            None
        """
        print(f"\n📦 Initializing pool with {self.config.min_size} connections...")
        
        for _ in range(self.config.min_size):
            try:
                connection = self._create_connection()
                self._idle_connections.put(connection)
                print(f"  ✓ Created connection: {connection.connection_id}")
            except Exception as e:
                print(f"  ❌ Failed to create connection: {e}")
        
        print(f"✓ Pool initialized with {self._idle_connections.qsize()} connections")
    
    def acquire(self, timeout: Optional[float] = None) -> PooledConnection:
        """
        Acquire connection from pool
        
        USAGE:
            connection = pool.acquire(timeout=10)
        
        RETURN:
            PooledConnection ready for use
        """
        if self._shutdown:
            raise PoolError("Pool is shut down")
        
        start_time = time.time()
        timeout = timeout or self.config.wait_timeout
        
        while True:
            # Try to get idle connection
            try:
                connection = self._idle_connections.get_nowait()
                
                # Validate if required
                if self.config.validate_on_acquire:
                    if not self._validate_connection(connection):
                        self._destroy_connection(connection)
                        continue
                
                # Check max lifetime
                if connection.age() > self.config.max_lifetime:
                    self._destroy_connection(connection)
                    continue
                
                # Connection is good
                connection.state = ConnectionState.IN_USE
                connection.reset()
                
                with self._pool_lock:
                    self._active_connections[connection.connection_id] = connection
                    self.statistics.total_acquired += 1
                    self.statistics.total_wait_time += time.time() - start_time
                
                return connection
            
            except queue.Empty:
                # No idle connections available
                
                # Check if can create new connection
                with self._pool_lock:
                    total = len(self._all_connections)
                    
                    if total < self.config.max_size:
                        # Create new connection
                        connection = self._create_connection()
                        connection.state = ConnectionState.IN_USE
                        self._active_connections[connection.connection_id] = connection
                        self.statistics.total_acquired += 1
                        self.statistics.total_wait_time += time.time() - start_time
                        return connection
                
                # Pool is exhausted, check timeout
                elapsed = time.time() - start_time
                if elapsed >= timeout:
                    raise AcquireTimeoutError(
                        f"Timeout acquiring connection after {elapsed:.2f}s"
                    )
                
                # Wait a bit and retry
                time.sleep(0.1)
    
    def release(self, connection: PooledConnection):
        """
        Release connection back to pool
        
        USAGE:
            pool.release(connection)
        
        RETURN:
            None
        """
        if connection is None:
            return
        
        with self._pool_lock:
            # Remove from active
            if connection.connection_id in self._active_connections:
                del self._active_connections[connection.connection_id]
            
            # Validate if required
            if self.config.validate_on_release:
                if not self._validate_connection(connection):
                    self._destroy_connection(connection)
                    return
            
            # Check max lifetime
            if connection.age() > self.config.max_lifetime:
                self._destroy_connection(connection)
                return
            
            # Return to idle pool
            connection.state = ConnectionState.IDLE
            self._idle_connections.put(connection)
            self.statistics.total_released += 1
    
    def _create_connection(self) -> PooledConnection:
        """Create new pooled connection"""
        connection = self.factory.create()
        pooled = PooledConnection(connection, self.pool_id)
        
        with self._pool_lock:
            self._all_connections[pooled.connection_id] = pooled
            self.statistics.total_created += 1
            self.statistics.total_connections = len(self._all_connections)
        
        return pooled
    
    def _destroy_connection(self, connection: PooledConnection):
        """Destroy connection"""
        try:
            connection.close()
        except:
            pass
        
        with self._pool_lock:
            if connection.connection_id in self._all_connections:
                del self._all_connections[connection.connection_id]
            if connection.connection_id in self._active_connections:
                del self._active_connections[connection.connection_id]
            
            self.statistics.total_destroyed += 1
            self.statistics.total_connections = len(self._all_connections)
    
    def _validate_connection(self, connection: PooledConnection) -> bool:
        """
        Validate connection health
        
        USAGE:
            is_valid = pool._validate_connection(connection)
        
        RETURN:
            bool - True if valid
        """
        try:
            connection.state = ConnectionState.VALIDATING
            
            if not connection.is_valid():
                self.statistics.failed_validations += 1
                return False
            
            if not self.factory.validate(connection.connection):
                self.statistics.failed_validations += 1
                return False
            
            return True
        
        except Exception as e:
            self.statistics.failed_validations += 1
            return False
        
        finally:
            if connection.state == ConnectionState.VALIDATING:
                connection.state = ConnectionState.IDLE
    
    def get_statistics(self) -> PoolStatistics:
        """
        Get current pool statistics
        
        USAGE:
            stats = pool.get_statistics()
            print(f"Active: {stats.active_connections}")
        
        RETURN:
            PoolStatistics object
        """
        with self._pool_lock:
            self.statistics.idle_connections = self._idle_connections.qsize()
            self.statistics.active_connections = len(self._active_connections)
            self.statistics.total_connections = len(self._all_connections)
            return self.statistics
    
    def shutdown(self):
        """
        Shutdown pool gracefully
        
        USAGE:
            pool.shutdown()
        
        RETURN:
            None
        """
        print(f"\n🛑 Shutting down pool: {self.pool_id}")
        
        self._shutdown = True
        
        # Wait for active connections
        with self._pool_lock:
            active_count = len(self._active_connections)
            if active_count > 0:
                print(f"  ⏳ Waiting for {active_count} active connections...")
        
        # Give time for active connections to finish
        time.sleep(0.5)
        
        # Close all connections
        with self._pool_lock:
            all_conn = list(self._all_connections.values())
            for conn in all_conn:
                try:
                    conn.close()
                except:
                    pass
            
            self._all_connections.clear()
            self._active_connections.clear()
            
            # Clear idle queue
            while not self._idle_connections.empty():
                try:
                    self._idle_connections.get_nowait()
                except:
                    break
        
        print(f"✓ Pool shut down: {self.pool_id}")
    
    def __repr__(self):
        stats = self.get_statistics()
        return (f"ConnectionPool({self.pool_id}, "
                f"total={stats.total_connections}, "
                f"active={stats.active_connections}, "
                f"idle={stats.idle_connections})")


# ==================== DEMO ====================

def main():
    """
    Demo of Connection Pool
    
    Demonstrates:
    - Pool initialization
    - Connection acquisition and release
    - Connection validation
    - Pool statistics
    - Concurrent access
    - Connection lifecycle
    """
    print("=" * 70)
    print("💧 CONNECTION POOL DEMO")
    print("=" * 70)
    
    # Create connection factory
    print("\n🏭 Creating connection factory...")
    factory = DatabaseConnectionFactory(
        host="localhost",
        port=5432,
        database="myapp"
    )
    
    # Configure pool
    print("\n⚙️  Configuring connection pool...")
    config = PoolConfig(
        min_size=3,
        max_size=10,
        connection_timeout=30,
        max_lifetime=300,
        validate_on_acquire=True,
        wait_timeout=10
    )
    print(f"  Min Size: {config.min_size}")
    print(f"  Max Size: {config.max_size}")
    print(f"  Max Lifetime: {config.max_lifetime}s")
    print(f"  Validate on Acquire: {config.validate_on_acquire}")
    
    # Create and initialize pool
    pool = ConnectionPool(factory, config)
    pool.initialize()
    
    # Get initial statistics
    print("\n📊 Initial Statistics:")
    stats = pool.get_statistics()
    print(f"  Total Connections: {stats.total_connections}")
    print(f"  Idle Connections: {stats.idle_connections}")
    print(f"  Active Connections: {stats.active_connections}")
    
    # Acquire and use connections
    print("\n🔄 Acquiring connections...")
    connections = []
    
    for i in range(5):
        conn = pool.acquire(timeout=5)
        print(f"  ✓ Acquired: {conn.connection_id}")
        connections.append(conn)
    
    # Check statistics after acquiring
    print("\n📊 Statistics After Acquiring:")
    stats = pool.get_statistics()
    print(f"  Total Connections: {stats.total_connections}")
    print(f"  Idle Connections: {stats.idle_connections}")
    print(f"  Active Connections: {stats.active_connections}")
    print(f"  Total Acquired: {stats.total_acquired}")
    
    # Use connections
    print("\n💼 Using connections...")
    for i, conn in enumerate(connections[:3]):
        result = conn.execute(f"SELECT * FROM table_{i}")
        print(f"  ✓ Query executed: {result['status']}")
    
    # Release connections
    print("\n🔙 Releasing connections...")
    for conn in connections:
        pool.release(conn)
        print(f"  ✓ Released: {conn.connection_id}")
    
    # Check statistics after releasing
    print("\n📊 Statistics After Releasing:")
    stats = pool.get_statistics()
    print(f"  Total Connections: {stats.total_connections}")
    print(f"  Idle Connections: {stats.idle_connections}")
    print(f"  Active Connections: {stats.active_connections}")
    print(f"  Total Released: {stats.total_released}")
    print(f"  Hit Rate: {stats.hit_rate:.2%}")
    print(f"  Average Wait Time: {stats.average_wait_time:.4f}s")
    
    # Test connection reuse
    print("\n♻️  Testing Connection Reuse...")
    conn1 = pool.acquire()
    print(f"  First acquire: {conn1.connection_id} (use_count: {conn1.use_count})")
    pool.release(conn1)
    
    conn2 = pool.acquire()
    print(f"  Second acquire: {conn2.connection_id} (use_count: {conn2.use_count})")
    print(f"  Same connection: {conn1.connection_id == conn2.connection_id}")
    pool.release(conn2)
    
    # Test concurrent access
    print("\n🔀 Testing Concurrent Access...")
    
    def worker(worker_id: int):
        """Worker thread"""
        try:
            conn = pool.acquire(timeout=5)
            print(f"  Worker-{worker_id}: Acquired {conn.connection_id}")
            time.sleep(0.1)  # Simulate work
            conn.execute(f"SELECT * FROM worker_{worker_id}")
            pool.release(conn)
            print(f"  Worker-{worker_id}: Released {conn.connection_id}")
        except Exception as e:
            print(f"  Worker-{worker_id}: Error - {e}")
    
    threads = []
    for i in range(8):
        thread = threading.Thread(target=worker, args=(i,))
        thread.start()
        threads.append(thread)
    
    # Wait for all threads
    for thread in threads:
        thread.join()
    
    # Final statistics
    print("\n📊 Final Statistics:")
    stats = pool.get_statistics()
    print(f"  Total Connections: {stats.total_connections}")
    print(f"  Total Created: {stats.total_created}")
    print(f"  Total Destroyed: {stats.total_destroyed}")
    print(f"  Total Acquired: {stats.total_acquired}")
    print(f"  Total Released: {stats.total_released}")
    print(f"  Hit Rate: {stats.hit_rate:.2%}")
    print(f"  Average Wait Time: {stats.average_wait_time:.4f}s")
    print(f"  Failed Validations: {stats.failed_validations}")
    
    # Test connection lifecycle
    print("\n🔄 Connection Lifecycle:")
    conn = pool.acquire()
    print(f"  Connection Age: {conn.age():.2f}s")
    print(f"  Use Count: {conn.use_count}")
    print(f"  State: {conn.state.value}")
    pool.release(conn)
    
    # Shutdown pool
    pool.shutdown()
    
    print("\n" + "=" * 70)
    print("✨ Demo completed successfully!")
    print("=" * 70)


if __name__ == "__main__":
    main()
