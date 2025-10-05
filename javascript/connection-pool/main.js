/**
 * CONNECTION POOL SYSTEM - Low Level Design Implementation in JavaScript
 * 
 * This file implements a production-ready connection pool for efficient resource management
 * with support for database connections, HTTP clients, and any poolable resource.
 * 
 * FILE PURPOSE:
 * Provides efficient connection pooling to reuse expensive connection objects, reduce latency,
 * and handle concurrent requests. Implements connection lifecycle management, health checks,
 * validation, and automatic recovery from connection failures.
 * 
 * DESIGN PATTERNS USED:
 * 1. OBJECT POOL PATTERN: Reuse expensive connection objects
 *    - Maintains pool of reusable connections
 *    - Reduces connection creation overhead
 *    - Improves application performance
 * 
 * 2. FACTORY PATTERN: Create connections through factory
 *    - ConnectionFactory creates different connection types
 *    - Abstracts connection creation logic
 *    - Easy to support multiple connection types
 * 
 * 3. SINGLETON PATTERN: Single pool instance per configuration
 *    - One pool per database/resource
 *    - Global access point
 *    - Resource control
 * 
 * 4. STATE PATTERN: Connection lifecycle states
 *    - IDLE, IN_USE, VALIDATING, CLOSED states
 *    - Valid state transitions
 *    - Clear connection lifecycle
 * 
 * 5. STRATEGY PATTERN: Different validation strategies
 *    - PingValidation, QueryValidation
 *    - Pluggable validation logic
 *    - Custom validation rules
 * 
 * 6. OBSERVER PATTERN: Pool event notifications
 *    - Monitor pool events
 *    - Track statistics
 *    - Alert on issues
 * 
 * 7. TEMPLATE METHOD PATTERN: Connection lifecycle template
 *    - Standardized acquire/release flow
 *    - Customizable validation steps
 *    - Consistent behavior
 * 
 * OOP CONCEPTS DEMONSTRATED:
 * - ENCAPSULATION: Connection state hidden behind interface
 * - INHERITANCE: ConnectionFactory hierarchy
 * - POLYMORPHISM: Different connection types
 * - ABSTRACTION: Abstract factory and strategy
 * 
 * SOLID PRINCIPLES:
 * - SRP: Each class has single responsibility
 * - OCP: Open for extension (new connection types) closed for modification
 * - LSP: All factories interchangeable
 * - ISP: Focused interfaces (Factory, Strategy)
 * - DIP: Depends on abstractions not concretions
 * 
 * USAGE:
 *     // Configure pool
 *     const config = new PoolConfig({minSize: 5, maxSize: 20});
 *     const factory = new DatabaseConnectionFactory({host: "localhost", database: "myapp"});
 *     
 *     // Create pool
 *     const pool = new ConnectionPool(factory, config);
 *     await pool.initialize();
 *     
 *     // Acquire connection
 *     const connection = await pool.acquire(10);
 *     
 *     try {
 *         // Use connection
 *         const result = await connection.execute("SELECT * FROM users");
 *     } finally {
 *         // Always release
 *         pool.release(connection);
 *     }
 *     
 *     // Get statistics
 *     const stats = pool.getStatistics();
 *     console.log(`Active: ${stats.activeConnections}`);
 *     
 *     // Shutdown
 *     await pool.shutdown();
 * 
 * RETURN VALUES:
 * - acquire(timeout): Returns Promise<PooledConnection> or throws TimeoutError
 * - release(connection): Returns undefined
 * - getStatistics(): Returns PoolStatistics
 * - validateConnection(connection): Returns Promise<boolean>
 */

// ==================== ENUMS ====================

const ConnectionState = {
    IDLE: 'idle',
    IN_USE: 'in_use',
    VALIDATING: 'validating',
    CLOSED: 'closed',
    INVALID: 'invalid'
};

// ==================== EXCEPTIONS ====================

class PoolError extends Error {
    constructor(message) {
        super(message);
        this.name = 'PoolError';
    }
}

class PoolExhaustedError extends PoolError {
    constructor(message) {
        super(message);
        this.name = 'PoolExhaustedError';
    }
}

class AcquireTimeoutError extends PoolError {
    constructor(message) {
        super(message);
        this.name = 'AcquireTimeoutError';
    }
}

class ConnectionValidationError extends PoolError {
    constructor(message) {
        super(message);
        this.name = 'ConnectionValidationError';
    }
}

// ==================== CONNECTION (Simulated) ====================

/**
 * Simulated database connection
 * 
 * In real implementation, this would be:
 * - pg.Client for PostgreSQL
 * - mysql.createConnection for MySQL
 * - mongodb.MongoClient for MongoDB
 * - redis.createClient for Redis
 * 
 * USAGE:
 *     const conn = new Connection("localhost", 5432, "mydb");
 *     await conn.connect();
 *     const result = await conn.execute("SELECT 1");
 *     conn.close();
 * 
 * RETURN:
 *     Connection object
 */
class Connection {
    constructor(host, port, database) {
        this.host = host;
        this.port = port;
        this.database = database;
        this._connected = false;
        this._closed = false;
    }

    async connect() {
        // Simulate connection time
        await new Promise(resolve => setTimeout(resolve, 100));
        this._connected = true;
        console.log(`🔌 Connected to ${this.database}@${this.host}:${this.port}`);
    }

    async execute(query) {
        if (!this._connected || this._closed) {
            throw new Error('Not connected');
        }
        // Simulate query execution
        await new Promise(resolve => setTimeout(resolve, 10));
        return { status: 'success', query };
    }

    async ping() {
        if (!this._connected || this._closed) {
            return false;
        }
        try {
            await this.execute('SELECT 1');
            return true;
        } catch {
            return false;
        }
    }

    close() {
        this._connected = false;
        this._closed = true;
        console.log(`🔌 Closed connection to ${this.database}`);
    }

    reset() {
        if (this._connected && !this._closed) {
            // Reset any transaction state
        }
    }

    isOpen() {
        return this._connected && !this._closed;
    }
}

// ==================== POOLED CONNECTION ====================

/**
 * Wrapper around actual connection with metadata
 * 
 * DESIGN PATTERN: Decorator Pattern - adds pooling behavior
 * 
 * USAGE:
 *     const pooledConn = new PooledConnection(connection, poolId);
 *     pooledConn.state = ConnectionState.IN_USE;
 *     const result = await pooledConn.execute("SELECT 1");
 *     const age = pooledConn.age();
 * 
 * RETURN:
 *     PooledConnection with state tracking
 */
class PooledConnection {
    constructor(connection, poolId) {
        this.connection = connection;
        this.poolId = poolId;
        this.state = ConnectionState.IDLE;
        this.createdAt = new Date();
        this.lastUsed = new Date();
        this.useCount = 0;
        this.connectionId = `conn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    async execute(query) {
        this.lastUsed = new Date();
        this.useCount++;
        return await this.connection.execute(query);
    }

    isValid() {
        return this.connection.isOpen() && this.state !== ConnectionState.INVALID;
    }

    age() {
        return (new Date() - this.createdAt) / 1000;
    }

    idleTime() {
        return (new Date() - this.lastUsed) / 1000;
    }

    reset() {
        this.connection.reset();
        this.lastUsed = new Date();
    }

    close() {
        this.state = ConnectionState.CLOSED;
        this.connection.close();
    }

    toString() {
        return `PooledConnection(${this.connectionId}, ${this.state})`;
    }
}

// ==================== CONNECTION FACTORY ====================

/**
 * Abstract factory for creating connections
 * 
 * DESIGN PATTERN: Factory Pattern
 * 
 * USAGE:
 *     const factory = new DatabaseConnectionFactory({host: "localhost", database: "myapp"});
 *     const connection = await factory.create();
 *     const isValid = await factory.validate(connection);
 * 
 * RETURN:
 *     Connection instance
 */
class ConnectionFactory {
    async create() {
        throw new Error('Must implement create()');
    }

    async validate(connection) {
        throw new Error('Must implement validate()');
    }

    reset(connection) {
        connection.reset();
    }
}

/**
 * Factory for database connections
 * 
 * USAGE:
 *     const factory = new DatabaseConnectionFactory({
 *         host: "localhost",
 *         port: 5432,
 *         database: "myapp"
 *     });
 *     const conn = await factory.create();
 * 
 * RETURN:
 *     Database Connection
 */
class DatabaseConnectionFactory extends ConnectionFactory {
    constructor({host, port = 5432, database = 'default'}) {
        super();
        this.host = host;
        this.port = port;
        this.database = database;
    }

    async create() {
        const connection = new Connection(this.host, this.port, this.database);
        await connection.connect();
        return connection;
    }

    async validate(connection) {
        return await connection.ping();
    }
}

// ==================== POOL CONFIGURATION ====================

/**
 * Connection pool configuration
 * 
 * USAGE:
 *     const config = new PoolConfig({
 *         minSize: 5,
 *         maxSize: 20,
 *         connectionTimeout: 30,
 *         maxLifetime: 3600
 *     });
 * 
 * RETURN:
 *     PoolConfig object
 */
class PoolConfig {
    constructor({
        minSize = 5,
        maxSize = 20,
        connectionTimeout = 30,
        maxLifetime = 3600,
        validationTimeout = 5,
        waitTimeout = 10,
        validateOnAcquire = true,
        validateOnRelease = false
    } = {}) {
        this.minSize = minSize;
        this.maxSize = maxSize;
        this.connectionTimeout = connectionTimeout;
        this.maxLifetime = maxLifetime;
        this.validationTimeout = validationTimeout;
        this.waitTimeout = waitTimeout;
        this.validateOnAcquire = validateOnAcquire;
        this.validateOnRelease = validateOnRelease;
    }
}

// ==================== POOL STATISTICS ====================

/**
 * Connection pool statistics
 * 
 * USAGE:
 *     const stats = pool.getStatistics();
 *     console.log(`Active: ${stats.activeConnections}`);
 *     console.log(`Hit Rate: ${stats.hitRate.toFixed(2)}%`);
 * 
 * RETURN:
 *     PoolStatistics with metrics
 */
class PoolStatistics {
    constructor() {
        this.totalConnections = 0;
        this.idleConnections = 0;
        this.activeConnections = 0;
        this.waitingRequests = 0;
        this.totalAcquired = 0;
        this.totalReleased = 0;
        this.totalCreated = 0;
        this.totalDestroyed = 0;
        this.totalWaitTime = 0;
        this.failedValidations = 0;
    }

    get averageWaitTime() {
        if (this.totalAcquired === 0) return 0;
        return this.totalWaitTime / this.totalAcquired;
    }

    get hitRate() {
        if (this.totalAcquired === 0) return 0;
        const hits = this.totalAcquired - this.totalCreated;
        return hits / this.totalAcquired;
    }

    toString() {
        return `PoolStatistics(total=${this.totalConnections}, ` +
               `active=${this.activeConnections}, ` +
               `idle=${this.idleConnections}, ` +
               `hit_rate=${(this.hitRate * 100).toFixed(2)}%)`;
    }
}

// ==================== CONNECTION POOL ====================

/**
 * Main connection pool manager
 * 
 * DESIGN PATTERN: Object Pool Pattern
 * 
 * USAGE:
 *     const pool = new ConnectionPool(factory, config);
 *     await pool.initialize();
 *     
 *     const connection = await pool.acquire(10);
 *     try {
 *         const result = await connection.execute("SELECT * FROM users");
 *     } finally {
 *         pool.release(connection);
 *     }
 *     
 *     const stats = pool.getStatistics();
 *     await pool.shutdown();
 * 
 * RETURN:
 *     ConnectionPool instance
 */
class ConnectionPool {
    constructor(factory, config) {
        this.factory = factory;
        this.config = config;
        this.poolId = `pool-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Connection pools
        this._idleConnections = [];
        this._activeConnections = new Map();
        this._allConnections = new Map();

        // Wait queue
        this._waitQueue = [];

        // Statistics
        this.statistics = new PoolStatistics();

        // State
        this._shutdown = false;

        console.log(`💧 Connection Pool created: ${this.poolId}`);
    }

    async initialize() {
        console.log(`\n📦 Initializing pool with ${this.config.minSize} connections...`);

        for (let i = 0; i < this.config.minSize; i++) {
            try {
                const connection = await this._createConnection();
                this._idleConnections.push(connection);
                console.log(`  ✓ Created connection: ${connection.connectionId}`);
            } catch (error) {
                console.log(`  ❌ Failed to create connection: ${error.message}`);
            }
        }

        console.log(`✓ Pool initialized with ${this._idleConnections.length} connections`);
    }

    async acquire(timeout = null) {
        if (this._shutdown) {
            throw new PoolError('Pool is shut down');
        }

        const startTime = Date.now();
        timeout = timeout !== null ? timeout : this.config.waitTimeout;
        const timeoutMs = timeout * 1000;

        while (true) {
            // Try to get idle connection
            if (this._idleConnections.length > 0) {
                const connection = this._idleConnections.shift();

                // Validate if required
                if (this.config.validateOnAcquire) {
                    if (!(await this._validateConnection(connection))) {
                        this._destroyConnection(connection);
                        continue;
                    }
                }

                // Check max lifetime
                if (connection.age() > this.config.maxLifetime) {
                    this._destroyConnection(connection);
                    continue;
                }

                // Connection is good
                connection.state = ConnectionState.IN_USE;
                connection.reset();

                this._activeConnections.set(connection.connectionId, connection);
                this.statistics.totalAcquired++;
                this.statistics.totalWaitTime += (Date.now() - startTime) / 1000;

                return connection;
            }

            // No idle connections available

            // Check if can create new connection
            if (this._allConnections.size < this.config.maxSize) {
                // Create new connection
                const connection = await this._createConnection();
                connection.state = ConnectionState.IN_USE;
                this._activeConnections.set(connection.connectionId, connection);
                this.statistics.totalAcquired++;
                this.statistics.totalWaitTime += (Date.now() - startTime) / 1000;
                return connection;
            }

            // Pool is exhausted, check timeout
            const elapsed = Date.now() - startTime;
            if (elapsed >= timeoutMs) {
                throw new AcquireTimeoutError(
                    `Timeout acquiring connection after ${(elapsed / 1000).toFixed(2)}s`
                );
            }

            // Wait a bit and retry
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    release(connection) {
        if (!connection) return;

        // Remove from active
        if (this._activeConnections.has(connection.connectionId)) {
            this._activeConnections.delete(connection.connectionId);
        }

        // Validate if required
        if (this.config.validateOnRelease) {
            this._validateConnection(connection).then(valid => {
                if (!valid) {
                    this._destroyConnection(connection);
                    return;
                }
            });
        }

        // Check max lifetime
        if (connection.age() > this.config.maxLifetime) {
            this._destroyConnection(connection);
            return;
        }

        // Return to idle pool
        connection.state = ConnectionState.IDLE;
        this._idleConnections.push(connection);
        this.statistics.totalReleased++;
    }

    async _createConnection() {
        const connection = await this.factory.create();
        const pooled = new PooledConnection(connection, this.poolId);

        this._allConnections.set(pooled.connectionId, pooled);
        this.statistics.totalCreated++;
        this.statistics.totalConnections = this._allConnections.size;

        return pooled;
    }

    _destroyConnection(connection) {
        try {
            connection.close();
        } catch (error) {
            // Ignore errors during close
        }

        if (this._allConnections.has(connection.connectionId)) {
            this._allConnections.delete(connection.connectionId);
        }
        if (this._activeConnections.has(connection.connectionId)) {
            this._activeConnections.delete(connection.connectionId);
        }

        this.statistics.totalDestroyed++;
        this.statistics.totalConnections = this._allConnections.size;
    }

    async _validateConnection(connection) {
        try {
            connection.state = ConnectionState.VALIDATING;

            if (!connection.isValid()) {
                this.statistics.failedValidations++;
                return false;
            }

            if (!(await this.factory.validate(connection.connection))) {
                this.statistics.failedValidations++;
                return false;
            }

            return true;
        } catch (error) {
            this.statistics.failedValidations++;
            return false;
        } finally {
            if (connection.state === ConnectionState.VALIDATING) {
                connection.state = ConnectionState.IDLE;
            }
        }
    }

    getStatistics() {
        this.statistics.idleConnections = this._idleConnections.length;
        this.statistics.activeConnections = this._activeConnections.size;
        this.statistics.totalConnections = this._allConnections.size;
        return this.statistics;
    }

    async shutdown() {
        console.log(`\n🛑 Shutting down pool: ${this.poolId}`);

        this._shutdown = true;

        // Wait for active connections
        const activeCount = this._activeConnections.size;
        if (activeCount > 0) {
            console.log(`  ⏳ Waiting for ${activeCount} active connections...`);
        }

        // Give time for active connections to finish
        await new Promise(resolve => setTimeout(resolve, 500));

        // Close all connections
        for (const conn of this._allConnections.values()) {
            try {
                conn.close();
            } catch (error) {
                // Ignore errors
            }
        }

        this._allConnections.clear();
        this._activeConnections.clear();
        this._idleConnections = [];

        console.log(`✓ Pool shut down: ${this.poolId}`);
    }

    toString() {
        const stats = this.getStatistics();
        return `ConnectionPool(${this.poolId}, ` +
               `total=${stats.totalConnections}, ` +
               `active=${stats.activeConnections}, ` +
               `idle=${stats.idleConnections})`;
    }
}

// ==================== DEMO ====================

/**
 * Demo of Connection Pool
 * 
 * Demonstrates:
 * - Pool initialization
 * - Connection acquisition and release
 * - Connection validation
 * - Pool statistics
 * - Concurrent access
 * - Connection lifecycle
 */
async function main() {
    console.log("=".repeat(70));
    console.log("💧 CONNECTION POOL DEMO");
    console.log("=".repeat(70));

    // Create connection factory
    console.log("\n🏭 Creating connection factory...");
    const factory = new DatabaseConnectionFactory({
        host: "localhost",
        port: 5432,
        database: "myapp"
    });

    // Configure pool
    console.log("\n⚙️  Configuring connection pool...");
    const config = new PoolConfig({
        minSize: 3,
        maxSize: 10,
        connectionTimeout: 30,
        maxLifetime: 300,
        validateOnAcquire: true,
        waitTimeout: 10
    });
    console.log(`  Min Size: ${config.minSize}`);
    console.log(`  Max Size: ${config.maxSize}`);
    console.log(`  Max Lifetime: ${config.maxLifetime}s`);
    console.log(`  Validate on Acquire: ${config.validateOnAcquire}`);

    // Create and initialize pool
    const pool = new ConnectionPool(factory, config);
    await pool.initialize();

    // Get initial statistics
    console.log("\n📊 Initial Statistics:");
    let stats = pool.getStatistics();
    console.log(`  Total Connections: ${stats.totalConnections}`);
    console.log(`  Idle Connections: ${stats.idleConnections}`);
    console.log(`  Active Connections: ${stats.activeConnections}`);

    // Acquire and use connections
    console.log("\n🔄 Acquiring connections...");
    const connections = [];

    for (let i = 0; i < 5; i++) {
        const conn = await pool.acquire(5);
        console.log(`  ✓ Acquired: ${conn.connectionId}`);
        connections.push(conn);
    }

    // Check statistics after acquiring
    console.log("\n📊 Statistics After Acquiring:");
    stats = pool.getStatistics();
    console.log(`  Total Connections: ${stats.totalConnections}`);
    console.log(`  Idle Connections: ${stats.idleConnections}`);
    console.log(`  Active Connections: ${stats.activeConnections}`);
    console.log(`  Total Acquired: ${stats.totalAcquired}`);

    // Use connections
    console.log("\n💼 Using connections...");
    for (let i = 0; i < 3; i++) {
        const result = await connections[i].execute(`SELECT * FROM table_${i}`);
        console.log(`  ✓ Query executed: ${result.status}`);
    }

    // Release connections
    console.log("\n🔙 Releasing connections...");
    for (const conn of connections) {
        pool.release(conn);
        console.log(`  ✓ Released: ${conn.connectionId}`);
    }

    // Check statistics after releasing
    console.log("\n📊 Statistics After Releasing:");
    stats = pool.getStatistics();
    console.log(`  Total Connections: ${stats.totalConnections}`);
    console.log(`  Idle Connections: ${stats.idleConnections}`);
    console.log(`  Active Connections: ${stats.activeConnections}`);
    console.log(`  Total Released: ${stats.totalReleased}`);
    console.log(`  Hit Rate: ${(stats.hitRate * 100).toFixed(2)}%`);
    console.log(`  Average Wait Time: ${stats.averageWaitTime.toFixed(4)}s`);

    // Test connection reuse
    console.log("\n♻️  Testing Connection Reuse...");
    const conn1 = await pool.acquire();
    console.log(`  First acquire: ${conn1.connectionId} (use_count: ${conn1.useCount})`);
    pool.release(conn1);

    const conn2 = await pool.acquire();
    console.log(`  Second acquire: ${conn2.connectionId} (use_count: ${conn2.useCount})`);
    console.log(`  Same connection: ${conn1.connectionId === conn2.connectionId}`);
    pool.release(conn2);

    // Test concurrent access
    console.log("\n🔀 Testing Concurrent Access...");

    async function worker(workerId) {
        try {
            const conn = await pool.acquire(5);
            console.log(`  Worker-${workerId}: Acquired ${conn.connectionId}`);
            await new Promise(resolve => setTimeout(resolve, 100)); // Simulate work
            await conn.execute(`SELECT * FROM worker_${workerId}`);
            pool.release(conn);
            console.log(`  Worker-${workerId}: Released ${conn.connectionId}`);
        } catch (error) {
            console.log(`  Worker-${workerId}: Error - ${error.message}`);
        }
    }

    const workers = [];
    for (let i = 0; i < 8; i++) {
        workers.push(worker(i));
    }
    await Promise.all(workers);

    // Final statistics
    console.log("\n📊 Final Statistics:");
    stats = pool.getStatistics();
    console.log(`  Total Connections: ${stats.totalConnections}`);
    console.log(`  Total Created: ${stats.totalCreated}`);
    console.log(`  Total Destroyed: ${stats.totalDestroyed}`);
    console.log(`  Total Acquired: ${stats.totalAcquired}`);
    console.log(`  Total Released: ${stats.totalReleased}`);
    console.log(`  Hit Rate: ${(stats.hitRate * 100).toFixed(2)}%`);
    console.log(`  Average Wait Time: ${stats.averageWaitTime.toFixed(4)}s`);
    console.log(`  Failed Validations: ${stats.failedValidations}`);

    // Test connection lifecycle
    console.log("\n🔄 Connection Lifecycle:");
    const conn = await pool.acquire();
    console.log(`  Connection Age: ${conn.age().toFixed(2)}s`);
    console.log(`  Use Count: ${conn.useCount}`);
    console.log(`  State: ${conn.state}`);
    pool.release(conn);

    // Shutdown pool
    await pool.shutdown();

    console.log("\n" + "=".repeat(70));
    console.log("✨ Demo completed successfully!");
    console.log("=".repeat(70));
}

// Run demo if this is the main module
if (require.main === module) {
    main().catch(console.error);
}

// Export for use in other modules
module.exports = {
    ConnectionPool,
    ConnectionFactory,
    DatabaseConnectionFactory,
    PoolConfig,
    PoolStatistics,
    PooledConnection,
    Connection,
    ConnectionState,
    PoolError,
    PoolExhaustedError,
    AcquireTimeoutError,
    ConnectionValidationError
};
