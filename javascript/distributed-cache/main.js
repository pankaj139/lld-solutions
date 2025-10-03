#!/usr/bin/env node
/**
 * Distributed Cache System Implementation
 * 
 * A comprehensive distributed caching system supporting consistent hashing,
 * replication, multiple eviction policies, and fault tolerance.
 * 
 * Features:
 * - Consistent hashing for data distribution
 * - Multiple eviction policies (LRU, LFU, TTL, FIFO)
 * - Configurable replication with quorum support
 * - Strong and eventual consistency models
 * - Node health monitoring and automatic failover
 * - Comprehensive statistics and monitoring
 * - Thread-safe operations with async support
 * 
 * Author: LLD Solutions
 * Date: 2024
 */

const crypto = require('crypto');
const readline = require('readline');
const { performance } = require('perf_hooks');

// Enums
const ConsistencyLevel = {
    ONE: 'one',
    QUORUM: 'quorum',
    ALL: 'all',
    LOCAL_QUORUM: 'local_quorum'
};

const EvictionPolicyType = {
    LRU: 'lru',
    LFU: 'lfu',
    TTL: 'ttl',
    FIFO: 'fifo',
    RANDOM: 'random'
};

const NodeStatus = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    FAILED: 'failed',
    JOINING: 'joining',
    LEAVING: 'leaving'
};

const ReplicationStrategy = {
    SYNC: 'synchronous',
    ASYNC: 'asynchronous',
    HYBRID: 'hybrid'
};

// Data Classes
class CacheEntry {
    constructor(key, value, ttl = null) {
        this.key = key;
        this.value = value;
        this.createdTime = Date.now();
        this.lastAccessed = Date.now();
        this.accessCount = 1;
        this.ttl = ttl;
        this.version = 1;
        this.expiryTime = ttl ? this.createdTime + (ttl * 1000) : null;
    }

    isExpired() {
        return this.expiryTime && Date.now() > this.expiryTime;
    }

    touch(ttl = null) {
        this.lastAccessed = Date.now();
        this.accessCount++;
        if (ttl !== null) {
            this.ttl = ttl;
            this.expiryTime = ttl ? Date.now() + (ttl * 1000) : null;
        }
    }
}

class NodeInfo {
    constructor(nodeId, host, port, virtualNodes = 150) {
        this.nodeId = nodeId;
        this.host = host;
        this.port = port;
        this.status = NodeStatus.ACTIVE;
        this.virtualNodes = virtualNodes;
        this.lastHeartbeat = Date.now();
        this.memoryUsage = 0;
        this.requestCount = 0;
    }
}

class CacheConfig {
    constructor(options = {}) {
        this.maxMemory = options.maxMemory || 1024 * 1024 * 1024; // 1GB
        this.evictionPolicy = options.evictionPolicy || EvictionPolicyType.LRU;
        this.replicationFactor = options.replicationFactor || 3;
        this.consistencyLevel = options.consistencyLevel || ConsistencyLevel.QUORUM;
        this.virtualNodesPerNode = options.virtualNodesPerNode || 150;
        this.defaultTtl = options.defaultTtl || 3600; // 1 hour
        this.healthCheckInterval = options.healthCheckInterval || 30000; // 30 seconds
        this.replicationStrategy = options.replicationStrategy || ReplicationStrategy.SYNC;
        this.readTimeout = options.readTimeout || 1000;
        this.writeTimeout = options.writeTimeout || 2000;
    }
}

class CacheStatistics {
    constructor() {
        this.hitCount = 0;
        this.missCount = 0;
        this.putCount = 0;
        this.deleteCount = 0;
        this.evictionCount = 0;
        this.memoryUsage = 0;
        this.nodeCount = 0;
        this.replicationFailures = 0;
    }

    hitRatio() {
        const total = this.hitCount + this.missCount;
        return total > 0 ? this.hitCount / total : 0;
    }
}

// Custom Exceptions
class CacheException extends Error {
    constructor(message) {
        super(message);
        this.name = 'CacheException';
    }
}

class KeyNotFoundException extends CacheException {
    constructor(message) {
        super(message);
        this.name = 'KeyNotFoundException';
    }
}

class NodeUnavailableException extends CacheException {
    constructor(message) {
        super(message);
        this.name = 'NodeUnavailableException';
    }
}

class ReplicationException extends CacheException {
    constructor(message) {
        super(message);
        this.name = 'ReplicationException';
    }
}

class ConsistencyException extends CacheException {
    constructor(message) {
        super(message);
        this.name = 'ConsistencyException';
    }
}

// Eviction Policy Implementations
class EvictionPolicy {
    shouldEvict(currentMemory, maxMemory) {
        throw new Error('shouldEvict method must be implemented');
    }

    selectVictim(entries) {
        throw new Error('selectVictim method must be implemented');
    }

    onAccess(key, entry) {
        // Default implementation - do nothing
    }

    onPut(key, entry) {
        // Default implementation - do nothing
    }
}

class LRUEvictionPolicy extends EvictionPolicy {
    constructor() {
        super();
        this.accessOrder = new Map();
    }

    shouldEvict(currentMemory, maxMemory) {
        return currentMemory > maxMemory;
    }

    selectVictim(entries) {
        if (this.accessOrder.size === 0) {
            return null;
        }
        // Return least recently used key
        const [key] = this.accessOrder.entries().next().value;
        this.accessOrder.delete(key);
        return key;
    }

    onAccess(key, entry) {
        // Move to end (most recently used)
        this.accessOrder.delete(key);
        this.accessOrder.set(key, Date.now());
    }

    onPut(key, entry) {
        this.onAccess(key, entry);
    }
}

class LFUEvictionPolicy extends EvictionPolicy {
    constructor() {
        super();
        this.frequencies = new Map();
    }

    shouldEvict(currentMemory, maxMemory) {
        return currentMemory > maxMemory;
    }

    selectVictim(entries) {
        if (this.frequencies.size === 0) {
            return null;
        }
        // Find key with minimum frequency
        let minKey = null;
        let minFreq = Infinity;
        
        for (const [key, freq] of this.frequencies.entries()) {
            if (freq < minFreq) {
                minFreq = freq;
                minKey = key;
            }
        }
        
        if (minKey) {
            this.frequencies.delete(minKey);
        }
        return minKey;
    }

    onAccess(key, entry) {
        this.frequencies.set(key, (this.frequencies.get(key) || 0) + 1);
    }

    onPut(key, entry) {
        this.frequencies.set(key, 1);
    }
}

class TTLEvictionPolicy extends EvictionPolicy {
    constructor() {
        super();
        this.expiryQueue = []; // [expiry_time, key]
    }

    shouldEvict(currentMemory, maxMemory) {
        // Always try to evict expired items
        return true;
    }

    selectVictim(entries) {
        const currentTime = Date.now();
        
        // Clean up expired entries
        while (this.expiryQueue.length > 0) {
            const [expiryTime, key] = this.expiryQueue[0];
            if (expiryTime <= currentTime && entries.has(key)) {
                this.expiryQueue.shift();
                return key;
            } else if (expiryTime > currentTime) {
                break;
            } else {
                // Entry not in cache anymore, remove from queue
                this.expiryQueue.shift();
            }
        }
        
        return null;
    }

    onAccess(key, entry) {
        // TTL policy doesn't change on access
    }

    onPut(key, entry) {
        if (entry.expiryTime) {
            this.expiryQueue.push([entry.expiryTime, key]);
            this.expiryQueue.sort((a, b) => a[0] - b[0]);
        }
    }
}

class FIFOEvictionPolicy extends EvictionPolicy {
    constructor() {
        super();
        this.insertionOrder = new Map();
    }

    shouldEvict(currentMemory, maxMemory) {
        return currentMemory > maxMemory;
    }

    selectVictim(entries) {
        if (this.insertionOrder.size === 0) {
            return null;
        }
        // Return first inserted key
        const [key] = this.insertionOrder.entries().next().value;
        this.insertionOrder.delete(key);
        return key;
    }

    onAccess(key, entry) {
        // FIFO doesn't change order on access
    }

    onPut(key, entry) {
        if (!this.insertionOrder.has(key)) {
            this.insertionOrder.set(key, Date.now());
        }
    }
}

// Consistent Hashing Implementation
class ConsistentHashRing {
    constructor(virtualNodesPerNode = 150) {
        this.virtualNodesPerNode = virtualNodesPerNode;
        this.ring = new Map(); // hash -> nodeId
        this.nodes = new Map(); // nodeId -> NodeInfo
        this.sortedHashes = [];
    }

    _hash(key) {
        return parseInt(crypto.createHash('md5').update(key).digest('hex').substring(0, 8), 16);
    }

    addNode(node) {
        if (this.nodes.has(node.nodeId)) {
            return false;
        }

        this.nodes.set(node.nodeId, node);

        // Add virtual nodes to ring
        for (let i = 0; i < this.virtualNodesPerNode; i++) {
            const virtualKey = `${node.nodeId}:${i}`;
            const hashValue = this._hash(virtualKey);
            this.ring.set(hashValue, node.nodeId);
        }

        this.sortedHashes = Array.from(this.ring.keys()).sort((a, b) => a - b);
        return true;
    }

    removeNode(nodeId) {
        if (!this.nodes.has(nodeId)) {
            return false;
        }

        // Remove virtual nodes from ring
        for (let i = 0; i < this.virtualNodesPerNode; i++) {
            const virtualKey = `${nodeId}:${i}`;
            const hashValue = this._hash(virtualKey);
            this.ring.delete(hashValue);
        }

        this.nodes.delete(nodeId);
        this.sortedHashes = Array.from(this.ring.keys()).sort((a, b) => a - b);
        return true;
    }

    getNode(key) {
        if (this.sortedHashes.length === 0) {
            return null;
        }

        const hashValue = this._hash(key);

        // Find first node with hash >= key hash
        for (const ringHash of this.sortedHashes) {
            if (ringHash >= hashValue) {
                const nodeId = this.ring.get(ringHash);
                return this.nodes.get(nodeId);
            }
        }

        // Wrap around to first node
        const firstHash = this.sortedHashes[0];
        const nodeId = this.ring.get(firstHash);
        return this.nodes.get(nodeId);
    }

    getReplicaNodes(key, count) {
        if (this.sortedHashes.length === 0 || count <= 0) {
            return [];
        }

        const hashValue = this._hash(key);
        const replicaNodes = [];
        const seenNodes = new Set();

        // Find starting position
        let startIdx = 0;
        for (let i = 0; i < this.sortedHashes.length; i++) {
            if (this.sortedHashes[i] >= hashValue) {
                startIdx = i;
                break;
            }
        }

        // Collect unique nodes
        for (let i = 0; i < this.sortedHashes.length; i++) {
            const idx = (startIdx + i) % this.sortedHashes.length;
            const ringHash = this.sortedHashes[idx];
            const nodeId = this.ring.get(ringHash);

            if (!seenNodes.has(nodeId)) {
                seenNodes.add(nodeId);
                const node = this.nodes.get(nodeId);
                if (node && node.status === NodeStatus.ACTIVE) {
                    replicaNodes.push(node);
                    if (replicaNodes.length >= count) {
                        break;
                    }
                }
            }
        }

        return replicaNodes;
    }

    getNodes() {
        return Array.from(this.nodes.values());
    }
}

// Cache Node Implementation
class CacheNode {
    constructor(nodeInfo, config) {
        this.nodeInfo = nodeInfo;
        this.config = config;
        this.storage = new Map(); // key -> CacheEntry
        this.statistics = new CacheStatistics();
        
        // Initialize eviction policy
        this.evictionPolicy = this._createEvictionPolicy(config.evictionPolicy);
        
        // Start background cleanup
        this._startCleanupTimer();
    }

    _createEvictionPolicy(policyType) {
        switch (policyType) {
            case EvictionPolicyType.LRU:
                return new LRUEvictionPolicy();
            case EvictionPolicyType.LFU:
                return new LFUEvictionPolicy();
            case EvictionPolicyType.TTL:
                return new TTLEvictionPolicy();
            case EvictionPolicyType.FIFO:
                return new FIFOEvictionPolicy();
            default:
                return new LRUEvictionPolicy(); // Default
        }
    }

    put(key, value, ttl = null) {
        try {
            const currentTime = Date.now();
            
            // Create cache entry
            const entry = new CacheEntry(
                key,
                value,
                ttl || this.config.defaultTtl
            );

            // Check memory limits and evict if necessary
            this._ensureMemoryLimit();

            // Store entry
            this.storage.set(key, entry);
            this.evictionPolicy.onPut(key, entry);

            // Update statistics
            this.statistics.putCount++;
            this._updateMemoryUsage();

            return true;

        } catch (error) {
            throw new CacheException(`Failed to put key ${key}: ${error.message}`);
        }
    }

    get(key) {
        if (!this.storage.has(key)) {
            this.statistics.missCount++;
            return null;
        }

        const entry = this.storage.get(key);

        // Check if expired
        if (entry.isExpired()) {
            // Remove expired entry
            this.storage.delete(key);
            this._updateMemoryUsage();
            this.statistics.missCount++;
            return null;
        }

        // Update access information
        entry.touch();
        this.evictionPolicy.onAccess(key, entry);

        // Update statistics
        this.statistics.hitCount++;

        return entry.value;
    }

    delete(key) {
        if (this.storage.has(key)) {
            this.storage.delete(key);
            this.statistics.deleteCount++;
            this._updateMemoryUsage();
            return true;
        }
        return false;
    }

    exists(key) {
        if (!this.storage.has(key)) {
            return false;
        }

        const entry = this.storage.get(key);
        if (entry.isExpired()) {
            // Remove expired entry
            this.storage.delete(key);
            this._updateMemoryUsage();
            return false;
        }

        return true;
    }

    clear() {
        this.storage.clear();
        this._updateMemoryUsage();
        return true;
    }

    getKeys() {
        return new Set(this.storage.keys());
    }

    _ensureMemoryLimit() {
        let currentMemory = this._calculateMemoryUsage();

        while (this.evictionPolicy.shouldEvict(currentMemory, this.config.maxMemory)) {
            const victimKey = this.evictionPolicy.selectVictim(this.storage);
            if (victimKey && this.storage.has(victimKey)) {
                this.storage.delete(victimKey);
                this.statistics.evictionCount++;
                currentMemory = this._calculateMemoryUsage();
            } else {
                break;
            }
        }
    }

    _calculateMemoryUsage() {
        // Simplified memory calculation
        let totalSize = 0;
        for (const [key, entry] of this.storage) {
            totalSize += key.length + JSON.stringify(entry.value).length;
        }
        return totalSize;
    }

    _updateMemoryUsage() {
        this.statistics.memoryUsage = this._calculateMemoryUsage();
    }

    _startCleanupTimer() {
        setInterval(() => {
            this._cleanupExpired();
        }, 60000); // Clean up every minute
    }

    _cleanupExpired() {
        try {
            const currentTime = Date.now();
            const expiredKeys = [];

            for (const [key, entry] of this.storage) {
                if (entry.isExpired()) {
                    expiredKeys.push(key);
                }
            }

            for (const key of expiredKeys) {
                this.storage.delete(key);
            }

            if (expiredKeys.length > 0) {
                this._updateMemoryUsage();
            }

        } catch (error) {
            // Log error in production
        }
    }
}

// Distributed Cache Implementation
class DistributedCache {
    constructor(config) {
        this.config = config;
        this.hashRing = new ConsistentHashRing(config.virtualNodesPerNode);
        this.localNode = null;
        this.nodes = new Map(); // nodeId -> CacheNode
        this.statistics = new CacheStatistics();

        // Health monitoring
        this._startHealthMonitor();
    }

    addNode(host, port, nodeId = null) {
        if (!nodeId) {
            nodeId = `${host}:${port}:${Math.random().toString(36).substring(2, 10)}`;
        }

        const nodeInfo = new NodeInfo(
            nodeId,
            host,
            port,
            this.config.virtualNodesPerNode
        );

        // Create cache node
        const cacheNode = new CacheNode(nodeInfo, this.config);

        this.nodes.set(nodeId, cacheNode);
        this.hashRing.addNode(nodeInfo);

        if (this.localNode === null) {
            this.localNode = cacheNode;
        }

        return nodeId;
    }

    removeNode(nodeId) {
        if (!this.nodes.has(nodeId)) {
            return false;
        }

        // TODO: Migrate data to other nodes before removing
        this.nodes.delete(nodeId);
        this.hashRing.removeNode(nodeId);

        return true;
    }

    async put(key, value, ttl = null) {
        try {
            const replicaNodes = this.hashRing.getReplicaNodes(key, this.config.replicationFactor);

            if (replicaNodes.length === 0) {
                throw new NodeUnavailableException('No available nodes for replication');
            }

            // Determine required success count based on consistency level
            const requiredSuccess = this._getRequiredSuccessCount(
                replicaNodes.length, this.config.consistencyLevel, true
            );

            let successCount = 0;
            const errors = [];

            for (const nodeInfo of replicaNodes) {
                try {
                    if (this.nodes.has(nodeInfo.nodeId)) {
                        const cacheNode = this.nodes.get(nodeInfo.nodeId);
                        if (cacheNode.put(key, value, ttl)) {
                            successCount++;
                        }
                    } else {
                        // Handle remote node (simplified for demo)
                        successCount++; // Assume success for demo
                    }

                } catch (error) {
                    errors.push(error.message);
                }
            }

            if (successCount >= requiredSuccess) {
                this.statistics.putCount++;
                return true;
            } else {
                throw new ReplicationException(
                    `Failed to meet consistency requirements. ` +
                    `Required: ${requiredSuccess}, Achieved: ${successCount}`
                );
            }

        } catch (error) {
            throw new CacheException(`Failed to put key ${key}: ${error.message}`);
        }
    }

    async get(key) {
        try {
            const replicaNodes = this.hashRing.getReplicaNodes(key, this.config.replicationFactor);

            if (replicaNodes.length === 0) {
                throw new NodeUnavailableException('No available nodes for key');
            }

            // Determine required success count based on consistency level
            const requiredSuccess = this._getRequiredSuccessCount(
                replicaNodes.length, this.config.consistencyLevel, false
            );

            const values = [];
            let successCount = 0;

            for (const nodeInfo of replicaNodes) {
                try {
                    if (this.nodes.has(nodeInfo.nodeId)) {
                        const cacheNode = this.nodes.get(nodeInfo.nodeId);
                        const value = cacheNode.get(key);
                        if (value !== null) {
                            values.push(value);
                        }
                        successCount++;
                    } else {
                        // Handle remote node (simplified for demo)
                        successCount++; // Assume success for demo
                    }

                } catch (error) {
                    continue;
                }
            }

            if (successCount >= requiredSuccess) {
                if (values.length > 0) {
                    this.statistics.hitCount++;
                    // Return first non-null value (in production, handle conflicts)
                    return values[0];
                } else {
                    this.statistics.missCount++;
                    return null;
                }
            } else {
                throw new ConsistencyException(
                    'Failed to meet consistency requirements for read'
                );
            }

        } catch (error) {
            if (error instanceof ConsistencyException || error instanceof NodeUnavailableException) {
                throw error;
            }
            throw new CacheException(`Failed to get key ${key}: ${error.message}`);
        }
    }

    async delete(key) {
        try {
            const replicaNodes = this.hashRing.getReplicaNodes(key, this.config.replicationFactor);

            if (replicaNodes.length === 0) {
                return false;
            }

            const requiredSuccess = this._getRequiredSuccessCount(
                replicaNodes.length, this.config.consistencyLevel, true
            );

            let successCount = 0;

            for (const nodeInfo of replicaNodes) {
                try {
                    if (this.nodes.has(nodeInfo.nodeId)) {
                        const cacheNode = this.nodes.get(nodeInfo.nodeId);
                        if (cacheNode.delete(key)) {
                            successCount++;
                        }
                    } else {
                        // Handle remote node (simplified for demo)
                        successCount++; // Assume success for demo
                    }

                } catch (error) {
                    continue;
                }
            }

            if (successCount >= requiredSuccess) {
                this.statistics.deleteCount++;
                return true;
            } else {
                return false;
            }

        } catch (error) {
            return false;
        }
    }

    async exists(key) {
        try {
            const value = await this.get(key);
            return value !== null;
        } catch (error) {
            return false;
        }
    }

    clear() {
        let success = true;
        for (const cacheNode of this.nodes.values()) {
            try {
                cacheNode.clear();
            } catch (error) {
                success = false;
            }
        }
        return success;
    }

    async getMultiple(keys) {
        const result = {};
        for (const key of keys) {
            try {
                const value = await this.get(key);
                if (value !== null) {
                    result[key] = value;
                }
            } catch (error) {
                continue;
            }
        }
        return result;
    }

    async putMultiple(data, ttl = null) {
        let success = true;
        for (const [key, value] of Object.entries(data)) {
            try {
                if (!(await this.put(key, value, ttl))) {
                    success = false;
                }
            } catch (error) {
                success = false;
            }
        }
        return success;
    }

    async increment(key, delta = 1) {
        // Simplified implementation - in production, use atomic operations
        const currentValue = await this.get(key);
        let newValue;
        
        if (currentValue === null) {
            newValue = delta;
        } else {
            try {
                newValue = parseInt(currentValue) + delta;
                if (isNaN(newValue)) {
                    throw new CacheException(`Cannot increment non-numeric value for key ${key}`);
                }
            } catch (error) {
                throw new CacheException(`Cannot increment non-numeric value for key ${key}`);
            }
        }

        await this.put(key, newValue);
        return newValue;
    }

    async decrement(key, delta = 1) {
        return this.increment(key, -delta);
    }

    getClusterInfo() {
        const nodes = this.hashRing.getNodes();
        return {
            nodeCount: nodes.length,
            replicationFactor: this.config.replicationFactor,
            consistencyLevel: this.config.consistencyLevel,
            virtualNodesPerNode: this.config.virtualNodesPerNode,
            nodes: nodes.map(node => ({
                nodeId: node.nodeId,
                host: node.host,
                port: node.port,
                status: node.status,
                memoryUsage: node.memoryUsage
            }))
        };
    }

    getStatistics() {
        // Aggregate statistics from all nodes
        const totalStats = new CacheStatistics();

        for (const cacheNode of this.nodes.values()) {
            const nodeStats = cacheNode.statistics;
            totalStats.hitCount += nodeStats.hitCount;
            totalStats.missCount += nodeStats.missCount;
            totalStats.putCount += nodeStats.putCount;
            totalStats.deleteCount += nodeStats.deleteCount;
            totalStats.evictionCount += nodeStats.evictionCount;
            totalStats.memoryUsage += nodeStats.memoryUsage;
        }

        totalStats.nodeCount = this.nodes.size;

        return {
            hitCount: totalStats.hitCount,
            missCount: totalStats.missCount,
            hitRatio: totalStats.hitRatio(),
            putCount: totalStats.putCount,
            deleteCount: totalStats.deleteCount,
            evictionCount: totalStats.evictionCount,
            memoryUsage: totalStats.memoryUsage,
            nodeCount: totalStats.nodeCount,
            replicationFailures: totalStats.replicationFailures
        };
    }

    _getRequiredSuccessCount(replicaCount, consistencyLevel, isWrite) {
        switch (consistencyLevel) {
            case ConsistencyLevel.ONE:
                return 1;
            case ConsistencyLevel.ALL:
                return replicaCount;
            case ConsistencyLevel.QUORUM:
                return Math.floor(replicaCount / 2) + 1;
            case ConsistencyLevel.LOCAL_QUORUM:
                // Simplified - treat as regular quorum for demo
                return Math.floor(replicaCount / 2) + 1;
            default:
                return 1;
        }
    }

    _startHealthMonitor() {
        setInterval(() => {
            try {
                const currentTime = Date.now();
                const failedNodes = [];

                for (const nodeInfo of this.hashRing.getNodes()) {
                    // Simple health check - check last heartbeat
                    if ((currentTime - nodeInfo.lastHeartbeat) > (this.config.healthCheckInterval * 2)) {
                        if (nodeInfo.status === NodeStatus.ACTIVE) {
                            nodeInfo.status = NodeStatus.FAILED;
                            failedNodes.push(nodeInfo.nodeId);
                        }
                    }
                }

                // Handle failed nodes
                for (const nodeId of failedNodes) {
                    // In production, trigger data migration and alerts
                }

            } catch (error) {
                // Log error in production
            }
        }, this.config.healthCheckInterval);
    }
}

// Demo and Testing Functions
function createTestCache() {
    const config = new CacheConfig({
        maxMemory: 1024 * 1024, // 1MB for testing
        evictionPolicy: EvictionPolicyType.LRU,
        replicationFactor: 2,
        consistencyLevel: ConsistencyLevel.QUORUM,
        virtualNodesPerNode: 50, // Reduced for testing
        defaultTtl: 300 // 5 minutes
    });

    const cache = new DistributedCache(config);

    // Add nodes
    cache.addNode('localhost', 8001, 'node1');
    cache.addNode('localhost', 8002, 'node2');
    cache.addNode('localhost', 8003, 'node3');

    return cache;
}

async function demoBasicOperations() {
    console.log('🏗️  Distributed Cache - Basic Operations Demo');
    console.log('='.repeat(50));

    const cache = createTestCache();

    console.log('\n1. Cluster Information:');
    const clusterInfo = cache.getClusterInfo();
    console.log(`   Nodes: ${clusterInfo.nodeCount}`);
    console.log(`   Replication Factor: ${clusterInfo.replicationFactor}`);
    console.log(`   Consistency Level: ${clusterInfo.consistencyLevel}`);

    console.log('\n2. Basic Put/Get Operations:');
    // Store some data
    await cache.put('user:1001', { name: 'Alice', age: 30 });
    await cache.put('user:1002', { name: 'Bob', age: 25 });
    await cache.put('session:abc123', 'active', 60);

    // Retrieve data
    const user1 = await cache.get('user:1001');
    const user2 = await cache.get('user:1002');
    const session = await cache.get('session:abc123');

    console.log(`   user:1001 = ${JSON.stringify(user1)}`);
    console.log(`   user:1002 = ${JSON.stringify(user2)}`);
    console.log(`   session:abc123 = ${session}`);

    console.log('\n3. Batch Operations:');
    // Batch put
    const batchData = {
        'product:101': { name: 'Laptop', price: 999.99 },
        'product:102': { name: 'Mouse', price: 29.99 },
        'product:103': { name: 'Keyboard', price: 79.99 }
    };
    await cache.putMultiple(batchData);

    // Batch get
    const productKeys = ['product:101', 'product:102', 'product:103'];
    const products = await cache.getMultiple(productKeys);
    console.log(`   Products: ${JSON.stringify(products)}`);

    console.log('\n4. Atomic Operations:');
    // Counter operations
    await cache.put('counter', 0);
    await cache.increment('counter', 5);
    await cache.increment('counter', 3);
    let counterValue = await cache.get('counter');
    console.log(`   Counter value: ${counterValue}`);

    await cache.decrement('counter', 2);
    counterValue = await cache.get('counter');
    console.log(`   Counter after decrement: ${counterValue}`);

    console.log('\n5. Statistics:');
    const stats = cache.getStatistics();
    console.log(`   Hit Count: ${stats.hitCount}`);
    console.log(`   Miss Count: ${stats.missCount}`);
    console.log(`   Hit Ratio: ${(stats.hitRatio * 100).toFixed(2)}%`);
    console.log(`   Put Count: ${stats.putCount}`);
    console.log(`   Memory Usage: ${stats.memoryUsage} bytes`);

    console.log('\n✅ Basic operations demo completed!');
}

async function demoConsistencyModels() {
    console.log('\n🔄 Distributed Cache - Consistency Models Demo');
    console.log('='.repeat(50));

    // Test different consistency levels
    const consistencyLevels = [
        ConsistencyLevel.ONE,
        ConsistencyLevel.QUORUM,
        ConsistencyLevel.ALL
    ];

    for (const level of consistencyLevels) {
        console.log(`\n📊 Testing ${level.toUpperCase()} consistency:`);

        const config = new CacheConfig({
            consistencyLevel: level,
            replicationFactor: 3
        });

        const cache = new DistributedCache(config);

        // Add nodes
        cache.addNode('localhost', 9001, `node1_${level}`);
        cache.addNode('localhost', 9002, `node2_${level}`);
        cache.addNode('localhost', 9003, `node3_${level}`);

        // Test operations
        try {
            // Write operation
            const startTime = performance.now();
            await cache.put(`test_key_${level}`, `test_value_${level}`);
            const writeTime = performance.now() - startTime;

            // Read operation
            const readStartTime = performance.now();
            const value = await cache.get(`test_key_${level}`);
            const readTime = performance.now() - readStartTime;

            console.log(`   ✅ Write latency: ${writeTime.toFixed(2)}ms`);
            console.log(`   ✅ Read latency: ${readTime.toFixed(2)}ms`);
            console.log(`   ✅ Retrieved value: ${value}`);

        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
        }
    }

    console.log('\n✅ Consistency models demo completed!');
}

async function demoEvictionPolicies() {
    console.log('\n🗑️  Distributed Cache - Eviction Policies Demo');
    console.log('='.repeat(50));

    const policies = [
        EvictionPolicyType.LRU,
        EvictionPolicyType.LFU,
        EvictionPolicyType.TTL,
        EvictionPolicyType.FIFO
    ];

    for (const policy of policies) {
        console.log(`\n📋 Testing ${policy.toUpperCase()} eviction policy:`);

        const config = new CacheConfig({
            maxMemory: 1024, // Very small for testing eviction
            evictionPolicy: policy,
            defaultTtl: policy === EvictionPolicyType.TTL ? 2 : null
        });

        const cache = new DistributedCache(config);
        cache.addNode('localhost', 9001, `eviction_node_${policy}`);

        // Fill cache beyond capacity
        for (let i = 0; i < 10; i++) {
            await cache.put(`key_${i}`, `value_${i}`.repeat(100)); // Large values

            if (policy === EvictionPolicyType.LFU) {
                // Access some keys more frequently for LFU testing
                if (i % 2 === 0) {
                    await cache.get(`key_${i}`);
                    await cache.get(`key_${i}`);
                }
            }
        }

        // Check what remains in cache
        const remainingKeys = [];
        for (let i = 0; i < 10; i++) {
            if (await cache.exists(`key_${i}`)) {
                remainingKeys.push(`key_${i}`);
            }
        }

        console.log(`   Keys remaining after eviction: ${remainingKeys}`);

        if (policy === EvictionPolicyType.TTL) {
            console.log('   Waiting for TTL expiration...');
            await new Promise(resolve => setTimeout(resolve, 3000));
            const expiredCheck = [];
            for (let i = 0; i < 10; i++) {
                if (await cache.exists(`key_${i}`)) {
                    expiredCheck.push(`key_${i}`);
                }
            }
            console.log(`   Keys after TTL expiration: ${expiredCheck}`);
        }

        const stats = cache.getStatistics();
        console.log(`   Evictions performed: ${stats.evictionCount}`);
    }

    console.log('\n✅ Eviction policies demo completed!');
}

async function performanceTest() {
    console.log('\n⚡ Distributed Cache - Performance Test');
    console.log('='.repeat(50));

    const cache = createTestCache();

    // Write performance test
    const numOperations = 1000;
    console.log(`\n📝 Write Performance Test (${numOperations} operations):`);

    const startTime = performance.now();
    for (let i = 0; i < numOperations; i++) {
        await cache.put(`perf_key_${i}`, `performance_value_${i}`);
    }
    const writeDuration = performance.now() - startTime;

    const writeOpsPerSec = numOperations / (writeDuration / 1000);
    console.log(`   Write Operations/sec: ${writeOpsPerSec.toFixed(0)}`);
    console.log(`   Average Write Latency: ${(writeDuration / numOperations).toFixed(2)}ms`);

    // Read performance test
    console.log(`\n📖 Read Performance Test (${numOperations} operations):`);

    const readStartTime = performance.now();
    let hitCount = 0;
    for (let i = 0; i < numOperations; i++) {
        const value = await cache.get(`perf_key_${i}`);
        if (value) {
            hitCount++;
        }
    }
    const readDuration = performance.now() - readStartTime;

    const readOpsPerSec = numOperations / (readDuration / 1000);
    const hitRatio = hitCount / numOperations;

    console.log(`   Read Operations/sec: ${readOpsPerSec.toFixed(0)}`);
    console.log(`   Average Read Latency: ${(readDuration / numOperations).toFixed(2)}ms`);
    console.log(`   Hit Ratio: ${(hitRatio * 100).toFixed(2)}%`);

    // Mixed workload test
    console.log(`\n🔄 Mixed Workload Test (${numOperations} operations):`);

    const mixedStartTime = performance.now();
    for (let i = 0; i < numOperations; i++) {
        if (i % 3 === 0) {
            await cache.put(`mixed_key_${i}`, `mixed_value_${i}`);
        } else if (i % 3 === 1) {
            await cache.get(`mixed_key_${i - 1}`);
        } else {
            await cache.delete(`mixed_key_${i - 2}`);
        }
    }
    const mixedDuration = performance.now() - mixedStartTime;

    const mixedOpsPerSec = numOperations / (mixedDuration / 1000);
    console.log(`   Mixed Operations/sec: ${mixedOpsPerSec.toFixed(0)}`);

    // Final statistics
    const stats = cache.getStatistics();
    console.log(`\n📊 Final Statistics:`);
    console.log(`   Total Hits: ${stats.hitCount}`);
    console.log(`   Total Misses: ${stats.missCount}`);
    console.log(`   Overall Hit Ratio: ${(stats.hitRatio * 100).toFixed(2)}%`);
    console.log(`   Total Memory Usage: ${stats.memoryUsage} bytes`);

    console.log('\n✅ Performance test completed!');
}

async function interactiveDemo() {
    console.log('\n🎮 Interactive Distributed Cache Demo');
    console.log('='.repeat(50));
    console.log('Commands: put <key> <value>, get <key>, delete <key>, stats, cluster, quit');

    const cache = createTestCache();

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const askQuestion = (question) => {
        return new Promise(resolve => {
            rl.question(question, resolve);
        });
    };

    while (true) {
        try {
            const input = await askQuestion('\ncache> ');
            const command = input.trim().split(' ');

            if (command.length === 0 || command[0] === '') {
                continue;
            } else if (command[0] === 'quit') {
                break;
            } else if (command[0] === 'put' && command.length >= 3) {
                const key = command[1];
                const value = command.slice(2).join(' ');
                const success = await cache.put(key, value);
                console.log(`Put operation: ${success ? 'Success' : 'Failed'}`);
            } else if (command[0] === 'get' && command.length === 2) {
                const key = command[1];
                const value = await cache.get(key);
                console.log(`Value: ${value !== null ? value : 'Not found'}`);
            } else if (command[0] === 'delete' && command.length === 2) {
                const key = command[1];
                const success = await cache.delete(key);
                console.log(`Delete operation: ${success ? 'Success' : 'Failed'}`);
            } else if (command[0] === 'stats') {
                const stats = cache.getStatistics();
                console.log('Cache Statistics:');
                for (const [key, value] of Object.entries(stats)) {
                    console.log(`  ${key}: ${value}`);
                }
            } else if (command[0] === 'cluster') {
                const clusterInfo = cache.getClusterInfo();
                console.log('Cluster Information:');
                console.log(`  Nodes: ${clusterInfo.nodeCount}`);
                console.log(`  Replication Factor: ${clusterInfo.replicationFactor}`);
                console.log(`  Consistency Level: ${clusterInfo.consistencyLevel}`);
            } else {
                console.log('Invalid command. Available commands:');
                console.log('  put <key> <value> - Store key-value pair');
                console.log('  get <key> - Retrieve value');
                console.log('  delete <key> - Delete key');
                console.log('  stats - Show statistics');
                console.log('  cluster - Show cluster info');
                console.log('  quit - Exit');
            }

        } catch (error) {
            console.log(`Error: ${error.message}`);
        }
    }

    rl.close();
    console.log('\n👋 Goodbye!');
}

async function main() {
    console.log('Distributed Cache System Implementation');
    console.log('======================================');
    console.log('1. Basic Operations Demo');
    console.log('2. Consistency Models Demo');
    console.log('3. Eviction Policies Demo');
    console.log('4. Performance Test');
    console.log('5. Interactive Demo');

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const askQuestion = (question) => {
        return new Promise(resolve => {
            rl.question(question, resolve);
        });
    };

    try {
        const choice = await askQuestion('\nSelect demo (1-5): ');
        rl.close();

        if (choice === '1') {
            await demoBasicOperations();
        } else if (choice === '2') {
            await demoConsistencyModels();
        } else if (choice === '3') {
            await demoEvictionPolicies();
        } else if (choice === '4') {
            await performanceTest();
        } else if (choice === '5') {
            await interactiveDemo();
        } else {
            console.log('Running all demos...');
            await demoBasicOperations();
            await demoConsistencyModels();
            await demoEvictionPolicies();
            await performanceTest();
        }

    } catch (error) {
        rl.close();
        if (error.message !== 'Operation was cancelled') {
            console.log(`\nError running demo: ${error.message}`);
        }
    }
}

// Run if this file is executed directly
if (require.main === module) {
    main().catch(error => {
        if (error.message !== 'Operation was cancelled') {
            console.error('Unhandled error:', error);
        }
    });
}

module.exports = {
    DistributedCache,
    CacheNode,
    ConsistentHashRing,
    CacheConfig,
    CacheStatistics,
    NodeInfo,
    CacheEntry,
    ConsistencyLevel,
    EvictionPolicyType,
    NodeStatus,
    ReplicationStrategy
};