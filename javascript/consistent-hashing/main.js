/**
 * Consistent Hashing System Implementation
 * 
 * This module implements a distributed consistent hashing system with support for:
 * - Virtual nodes for uniform load distribution
 * - Weighted nodes for heterogeneous capacities
 * - Multiple hash functions (MD5, SHA-1)
 * - Key management and migration tracking
 * - Statistics and load balancing
 * 
 * Usage:
 *   const ring = new ConsistentHashRing(150);
 *   ring.addNode("server1");
 *   ring.addNode("server2", 2);
 *   
 *   const node = ring.getNode("my_key");
 *   const nodes = ring.getNodes("my_key", 3);  // For replication
 *   
 *   const stats = ring.getStatistics();
 * 
 * Design Patterns:
 *   - Strategy Pattern: Pluggable hash functions
 *   - Singleton Pattern: Single ring instance
 *   - Observer Pattern: Node change notifications
 *   - Template Method: Standardized node operations
 * 
 * Author: LLD Solutions
 * Date: 2025-10-05
 */

const crypto = require('crypto');

// ===================== Hash Functions (Strategy Pattern) =====================

/**
 * Abstract base class for hash functions.
 * 
 * Usage:
 *   const hashFn = new MD5HashFunction();
 *   const hashValue = hashFn.hash("my_key");
 * 
 * Returns:
 *   BigInt: Hash value as big integer
 */
class HashFunction {
    /**
     * Compute hash value for the given key.
     * 
     * @param {string} key - String to hash
     * @returns {BigInt} Hash value as big integer
     */
    hash(key) {
        throw new Error("Abstract method must be implemented");
    }
}

/**
 * MD5-based hash function.
 * Produces 128-bit hash, provides good distribution.
 * 
 * Usage:
 *   const hashFn = new MD5HashFunction();
 *   const value = hashFn.hash("server1#0");
 */
class MD5HashFunction extends HashFunction {
    /**
     * Compute MD5 hash and convert to big integer.
     * 
     * @param {string} key - String to hash
     * @returns {BigInt} 128-bit hash value as big integer
     */
    hash(key) {
        const hash = crypto.createHash('md5').update(key).digest('hex');
        return BigInt('0x' + hash);
    }
}

/**
 * SHA1-based hash function.
 * Produces 160-bit hash, better distribution than MD5.
 * 
 * Usage:
 *   const hashFn = new SHA1HashFunction();
 *   const value = hashFn.hash("server1#0");
 */
class SHA1HashFunction extends HashFunction {
    /**
     * Compute SHA1 hash and convert to big integer.
     * 
     * @param {string} key - String to hash
     * @returns {BigInt} 160-bit hash value as big integer
     */
    hash(key) {
        const hash = crypto.createHash('sha1').update(key).digest('hex');
        return BigInt('0x' + hash);
    }
}

// ===================== Node Classes =====================

/**
 * Represents a virtual replica of a physical node on the hash ring.
 * 
 * Usage:
 *   const vnode = new VirtualNode("server1", 0, hashFunction);
 *   const hashValue = vnode.hashValue;
 * 
 * Attributes:
 *   hashValue: Position on the hash ring
 *   physicalNode: ID of the physical server
 *   replicaIndex: Index of this virtual replica
 */
class VirtualNode {
    /**
     * Initialize a virtual node.
     * 
     * @param {string} physicalNode - ID of the physical server
     * @param {number} replicaIndex - Index of this replica (0 to N-1)
     * @param {HashFunction} hashFunction - Hash function to use
     */
    constructor(physicalNode, replicaIndex, hashFunction) {
        this.physicalNode = physicalNode;
        this.replicaIndex = replicaIndex;
        // Create unique identifier for this virtual node
        const virtualId = `${physicalNode}#${replicaIndex}`;
        this.hashValue = hashFunction.hash(virtualId);
    }

    toString() {
        return `VirtualNode(${this.physicalNode}#${this.replicaIndex} -> ${this.hashValue})`;
    }
}

/**
 * Represents an actual server/node in the distributed system.
 * 
 * Usage:
 *   const node = new PhysicalNode("server1", 2);
 *   node.addKey("user_123");
 *   const load = node.getLoad();
 * 
 * Attributes:
 *   nodeId: Unique identifier for the server
 *   weight: Capacity weight (affects virtual node count)
 *   keys: Set of keys assigned to this node
 *   virtualNodes: List of virtual node positions
 */
class PhysicalNode {
    /**
     * Initialize a physical node.
     * 
     * @param {string} nodeId - Unique server identifier
     * @param {number} weight - Capacity weight (default: 1)
     */
    constructor(nodeId, weight = 1) {
        this.nodeId = nodeId;
        this.weight = weight;
        this.keys = new Set();
        this.virtualNodes = [];
    }

    /**
     * Add a key to this node.
     * @param {string} key - Key to add
     */
    addKey(key) {
        this.keys.add(key);
    }

    /**
     * Remove a key from this node.
     * @param {string} key - Key to remove
     * @returns {boolean} True if key existed
     */
    removeKey(key) {
        return this.keys.delete(key);
    }

    /**
     * Get the number of keys assigned to this node.
     * @returns {number} Key count
     */
    getLoad() {
        return this.keys.size;
    }

    toString() {
        return `PhysicalNode(${this.nodeId}, weight=${this.weight}, load=${this.getLoad()})`;
    }
}

// ===================== Observer Interface =====================

/**
 * Observer interface for ring change notifications.
 * 
 * Usage:
 *   class MyObserver extends RingObserver {
 *       onNodeAdded(nodeId) {
 *           console.log(`Node ${nodeId} added`);
 *       }
 *       onNodeRemoved(nodeId) {
 *           console.log(`Node ${nodeId} removed`);
 *       }
 *   }
 */
class RingObserver {
    /**
     * Called when a node is added to the ring.
     * @param {string} nodeId - ID of the added node
     */
    onNodeAdded(nodeId) {
        throw new Error("Abstract method must be implemented");
    }

    /**
     * Called when a node is removed from the ring.
     * @param {string} nodeId - ID of the removed node
     */
    onNodeRemoved(nodeId) {
        throw new Error("Abstract method must be implemented");
    }
}

// ===================== Consistent Hash Ring =====================

/**
 * Main consistent hash ring implementation.
 * 
 * Usage:
 *   // Create ring
 *   const ring = new ConsistentHashRing(150);
 *   
 *   // Add nodes
 *   ring.addNode("server1");
 *   ring.addNode("server2", 2);
 *   
 *   // Add keys
 *   ring.addKey("user_123");
 *   ring.addKey("session_456");
 *   
 *   // Lookup
 *   const node = ring.getNode("user_123");
 *   
 *   // Replication
 *   const nodes = ring.getNodes("user_123", 3);
 *   
 *   // Statistics
 *   const stats = ring.getStatistics();
 */
class ConsistentHashRing {
    /**
     * Initialize the consistent hash ring.
     * 
     * @param {number} virtualNodeCount - Number of virtual nodes per physical node (default: 150)
     * @param {HashFunction} hashFunction - Hash function to use (default: MD5HashFunction)
     */
    constructor(virtualNodeCount = 150, hashFunction = null) {
        this.virtualNodeCount = virtualNodeCount;
        this.hashFunction = hashFunction || new MD5HashFunction();
        
        // Sorted array of hash values (ring positions)
        this.ring = [];
        
        // Map hash value to physical node ID
        this.hashToNode = new Map();
        
        // Map node ID to PhysicalNode object
        this.nodes = new Map();
        
        // Observers
        this.observers = [];
        
        // Total keys in the system
        this.totalKeys = 0;
    }

    /**
     * Add an observer to receive ring change notifications.
     * @param {RingObserver} observer - Observer instance
     */
    addObserver(observer) {
        this.observers.push(observer);
    }

    /**
     * Notify observers that a node was added.
     * @param {string} nodeId - ID of the added node
     */
    _notifyNodeAdded(nodeId) {
        for (const observer of this.observers) {
            observer.onNodeAdded(nodeId);
        }
    }

    /**
     * Notify observers that a node was removed.
     * @param {string} nodeId - ID of the removed node
     */
    _notifyNodeRemoved(nodeId) {
        for (const observer of this.observers) {
            observer.onNodeRemoved(nodeId);
        }
    }

    /**
     * Binary search to find insertion index for a value in sorted array.
     * @param {BigInt} value - Value to search for
     * @returns {number} Insertion index
     */
    _bisectRight(value) {
        let left = 0;
        let right = this.ring.length;
        
        while (left < right) {
            const mid = Math.floor((left + right) / 2);
            if (this.ring[mid] <= value) {
                left = mid + 1;
            } else {
                right = mid;
            }
        }
        
        return left;
    }

    /**
     * Insert a value into sorted ring maintaining order.
     * @param {BigInt} value - Value to insert
     */
    _insertSorted(value) {
        const idx = this._bisectRight(value);
        this.ring.splice(idx, 0, value);
    }

    /**
     * Add a physical node to the ring.
     * 
     * @param {string} nodeId - Unique identifier for the node
     * @param {number} weight - Node capacity weight (default: 1)
     *                         Higher weight = more virtual nodes = more keys
     * @returns {boolean} True if node was added, False if already exists
     * 
     * Complexity: O(V log N) where V = virtualNodeCount, N = total virtual nodes
     */
    addNode(nodeId, weight = 1) {
        if (this.nodes.has(nodeId)) {
            return false;
        }

        // Create physical node
        const physicalNode = new PhysicalNode(nodeId, weight);
        this.nodes.set(nodeId, physicalNode);

        // Create virtual nodes (weight affects count)
        const numVirtualNodes = this.virtualNodeCount * weight;
        for (let i = 0; i < numVirtualNodes; i++) {
            const vnode = new VirtualNode(nodeId, i, this.hashFunction);
            const hashValue = vnode.hashValue;

            // Add to ring
            this._insertSorted(hashValue);
            this.hashToNode.set(hashValue.toString(), nodeId);
            physicalNode.virtualNodes.push(hashValue);
        }

        // Notify observers
        this._notifyNodeAdded(nodeId);

        return true;
    }

    /**
     * Remove a physical node from the ring.
     * All keys assigned to this node will be redistributed.
     * 
     * @param {string} nodeId - ID of the node to remove
     * @returns {boolean} True if node was removed, False if not found
     * 
     * Complexity: O(V log N + K) where K = keys to redistribute
     */
    removeNode(nodeId) {
        if (!this.nodes.has(nodeId)) {
            return false;
        }

        const physicalNode = this.nodes.get(nodeId);

        // Remove all virtual nodes from ring
        for (const hashValue of physicalNode.virtualNodes) {
            const idx = this.ring.findIndex(v => v === hashValue);
            if (idx !== -1) {
                this.ring.splice(idx, 1);
            }
            this.hashToNode.delete(hashValue.toString());
        }

        // Redistribute keys to new nodes
        const keysToRedistribute = Array.from(physicalNode.keys);
        for (const key of keysToRedistribute) {
            const newNodeId = this.getNode(key);
            if (newNodeId && this.nodes.has(newNodeId)) {
                this.nodes.get(newNodeId).addKey(key);
            }
        }

        // Remove physical node
        this.nodes.delete(nodeId);

        // Notify observers
        this._notifyNodeRemoved(nodeId);

        return true;
    }

    /**
     * Get the node responsible for a given key.
     * 
     * @param {string} key - Key to lookup
     * @returns {string|null} Node ID or null if no nodes exist
     * 
     * Complexity: O(log N) - binary search in sorted ring
     */
    getNode(key) {
        if (this.ring.length === 0) {
            return null;
        }

        // Hash the key
        const keyHash = this.hashFunction.hash(key);

        // Find first node with hash >= keyHash (clockwise search)
        let idx = this._bisectRight(keyHash);

        // Wrap around if we're past the end
        if (idx === this.ring.length) {
            idx = 0;
        }

        const hashValue = this.ring[idx];
        return this.hashToNode.get(hashValue.toString());
    }

    /**
     * Get multiple nodes for replication (clockwise successor nodes).
     * 
     * @param {string} key - Key to lookup
     * @param {number} count - Number of distinct physical nodes to return
     * @returns {Array<string>} List of distinct node IDs
     * 
     * Complexity: O(log N + R × V) where R = replication factor
     */
    getNodes(key, count) {
        if (this.ring.length === 0 || count <= 0) {
            return [];
        }

        // Hash the key
        const keyHash = this.hashFunction.hash(key);

        // Find starting position
        let idx = this._bisectRight(keyHash);
        if (idx === this.ring.length) {
            idx = 0;
        }

        // Collect distinct physical nodes
        const result = [];
        const seen = new Set();

        for (let i = 0; i < this.ring.length; i++) {
            const currentIdx = (idx + i) % this.ring.length;
            const hashValue = this.ring[currentIdx];
            const nodeId = this.hashToNode.get(hashValue.toString());

            if (!seen.has(nodeId)) {
                result.push(nodeId);
                seen.add(nodeId);

                if (result.length === count) {
                    break;
                }
            }
        }

        return result;
    }

    /**
     * Add a key to the system.
     * 
     * @param {string} key - Key to add
     * @returns {string|null} Node ID where key was assigned, or null if no nodes
     * 
     * Complexity: O(log N)
     */
    addKey(key) {
        const nodeId = this.getNode(key);
        if (nodeId && this.nodes.has(nodeId)) {
            this.nodes.get(nodeId).addKey(key);
            this.totalKeys++;
            return nodeId;
        }
        return null;
    }

    /**
     * Remove a key from the system.
     * 
     * @param {string} key - Key to remove
     * @returns {boolean} True if key was removed, False if not found
     * 
     * Complexity: O(log N)
     */
    removeKey(key) {
        const nodeId = this.getNode(key);
        if (nodeId && this.nodes.has(nodeId)) {
            if (this.nodes.get(nodeId).removeKey(key)) {
                this.totalKeys--;
                return true;
            }
        }
        return false;
    }

    /**
     * Get the current node for a key.
     * 
     * @param {string} key - Key to lookup
     * @returns {string|null} Node ID or null
     */
    getKeyLocation(key) {
        return this.getNode(key);
    }

    /**
     * Get comprehensive ring statistics.
     * 
     * @returns {Object} Statistics object containing:
     *   - totalNodes: Number of physical nodes
     *   - virtualNodes: Total virtual nodes
     *   - totalKeys: Total keys in system
     *   - loadDistribution: Object mapping node_id -> key_count
     *   - loadPercentage: Object mapping node_id -> percentage
     *   - loadVariance: Standard deviation of load distribution
     *   - avgLoad: Average keys per node
     * 
     * Complexity: O(N)
     */
    getStatistics() {
        if (this.nodes.size === 0) {
            return {
                totalNodes: 0,
                virtualNodes: 0,
                totalKeys: 0,
                loadDistribution: {},
                loadPercentage: {},
                loadVariance: 0.0,
                avgLoad: 0.0
            };
        }

        const loadDist = {};
        const loads = [];
        
        for (const [nodeId, node] of this.nodes) {
            const load = node.getLoad();
            loadDist[nodeId] = load;
            loads.push(load);
        }

        const avgLoad = loads.reduce((a, b) => a + b, 0) / loads.length;

        // Calculate load percentages
        const loadPct = {};
        if (this.totalKeys > 0) {
            for (const [nodeId, load] of Object.entries(loadDist)) {
                loadPct[nodeId] = (load / this.totalKeys * 100);
            }
        }

        // Calculate standard deviation
        let variance = 0;
        if (loads.length > 1) {
            const squaredDiffs = loads.map(load => Math.pow(load - avgLoad, 2));
            variance = Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / (loads.length - 1));
        }

        return {
            totalNodes: this.nodes.size,
            virtualNodes: this.ring.length,
            totalKeys: this.totalKeys,
            loadDistribution: loadDist,
            loadPercentage: loadPct,
            loadVariance: variance,
            avgLoad: avgLoad
        };
    }

    /**
     * Get load percentage for each node.
     * 
     * @returns {Object} Load distribution as percentages
     */
    getLoadDistribution() {
        const stats = this.getStatistics();
        return stats.loadPercentage;
    }

    /**
     * Rebalance keys across all nodes.
     * Recalculates assignments for all keys.
     * 
     * @returns {number} Number of keys that were moved
     * 
     * Complexity: O(K log N) where K = total keys
     */
    rebalance() {
        // Collect all keys
        const allKeys = [];
        for (const node of this.nodes.values()) {
            allKeys.push(...Array.from(node.keys));
            node.keys.clear();
        }

        // Reassign all keys
        let moved = 0;
        for (const key of allKeys) {
            let oldNode = null;
            for (const node of this.nodes.values()) {
                if (node.keys.has(key)) {
                    oldNode = node.nodeId;
                    break;
                }
            }

            const newNode = this.addKey(key);
            if (newNode && newNode !== oldNode) {
                moved++;
            }
        }

        return moved;
    }
}

// ===================== Key Manager =====================

/**
 * Manages key placement and migration tracking.
 * 
 * Usage:
 *   const ring = new ConsistentHashRing();
 *   const manager = new KeyManager(ring);
 *   
 *   manager.addKey("user_123");
 *   const location = manager.getKeyLocation("user_123");
 *   
 *   const stats = manager.getMigrationStats();
 */
class KeyManager {
    /**
     * Initialize key manager.
     * 
     * @param {ConsistentHashRing} ring - ConsistentHashRing instance
     */
    constructor(ring) {
        this.ring = ring;
        this.keyMapping = new Map(); // key -> node_id
        this.migrationLog = [];
    }

    /**
     * Add a key and track its location.
     * 
     * @param {string} key - Key to add
     * @returns {string|null} Node ID where key was assigned
     */
    addKey(key) {
        const nodeId = this.ring.addKey(key);
        if (nodeId) {
            this.keyMapping.set(key, nodeId);
        }
        return nodeId;
    }

    /**
     * Remove a key from tracking.
     * @param {string} key - Key to remove
     * @returns {boolean} True if removed
     */
    removeKey(key) {
        if (this.ring.removeKey(key)) {
            this.keyMapping.delete(key);
            return true;
        }
        return false;
    }

    /**
     * Get the current node for a key.
     * @param {string} key - Key to lookup
     * @returns {string|null} Node ID or null
     */
    getKeyLocation(key) {
        return this.keyMapping.get(key) || null;
    }

    /**
     * Migrate keys from one node to another.
     * 
     * @param {string} fromNode - Source node ID
     * @param {string} toNode - Destination node ID
     * @returns {number} Number of keys migrated
     */
    migrateKeys(fromNode, toNode) {
        if (!this.ring.nodes.has(fromNode) || !this.ring.nodes.has(toNode)) {
            return 0;
        }

        const fromPhysical = this.ring.nodes.get(fromNode);
        const toPhysical = this.ring.nodes.get(toNode);

        const keysToMigrate = Array.from(fromPhysical.keys);
        let count = 0;

        for (const key of keysToMigrate) {
            fromPhysical.removeKey(key);
            toPhysical.addKey(key);
            this.keyMapping.set(key, toNode);

            this.migrationLog.push({
                key: key,
                from: fromNode,
                to: toNode
            });
            count++;
        }

        return count;
    }

    /**
     * Get statistics about key migrations.
     * 
     * @returns {Object} Migration statistics
     */
    getMigrationStats() {
        return {
            totalMigrations: this.migrationLog.length,
            recentMigrations: this.migrationLog.slice(-10)
        };
    }
}

// ===================== Demo Implementation =====================

/**
 * Print a formatted separator with optional title.
 * @param {string} title - Optional title to display
 */
function printSeparator(title = "") {
    if (title) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`  ${title}`);
        console.log('='.repeat(60));
    } else {
        console.log('-'.repeat(60));
    }
}

/**
 * Comprehensive demonstration of Consistent Hashing system.
 * 
 * Demonstrates:
 * 1. Ring initialization with virtual nodes
 * 2. Adding nodes with different weights
 * 3. Key distribution and lookup
 * 4. Node removal and key redistribution
 * 5. Replication for fault tolerance
 * 6. Load balancing statistics
 * 7. Hash function comparison
 */
function demoConsistentHashing() {
    printSeparator("CONSISTENT HASHING SYSTEM DEMO");

    // 1. Create ring with virtual nodes
    console.log("\n1. Creating Consistent Hash Ring");
    printSeparator();
    const ring = new ConsistentHashRing(150);
    console.log(`✓ Ring created with ${ring.virtualNodeCount} virtual nodes per physical node`);
    console.log(`✓ Using hash function: ${ring.hashFunction.constructor.name}`);

    // 2. Add nodes
    console.log("\n2. Adding Physical Nodes");
    printSeparator();
    const nodes = ["server1", "server2", "server3", "server4", "server5"];
    for (const node of nodes) {
        ring.addNode(node);
        console.log(`✓ Added ${node}`);
    }

    // Add a weighted node
    ring.addNode("server6", 2);
    console.log(`✓ Added server6 with weight=2 (gets 2x virtual nodes)`);

    let stats = ring.getStatistics();
    console.log(`\n📊 Ring Status:`);
    console.log(`   Physical Nodes: ${stats.totalNodes}`);
    console.log(`   Virtual Nodes: ${stats.virtualNodes}`);

    // 3. Add keys and distribute
    console.log("\n3. Adding Keys to System");
    printSeparator();
    const keys = [];
    for (let i = 1; i <= 100; i++) keys.push(`user_${i}`);
    for (let i = 1; i <= 100; i++) keys.push(`session_${i}`);
    for (let i = 1; i <= 100; i++) keys.push(`cache_${i}`);

    for (const key of keys) {
        ring.addKey(key);
    }

    console.log(`✓ Added ${keys.length} keys to the system`);

    // 4. Show load distribution
    console.log("\n4. Load Distribution Analysis");
    printSeparator();
    stats = ring.getStatistics();
    console.log(`Total Keys: ${stats.totalKeys}`);
    console.log(`Average Load: ${stats.avgLoad.toFixed(1)} keys/node`);
    console.log(`Load Std Dev: ${stats.loadVariance.toFixed(2)}`);
    console.log(`\nPer-Node Distribution:`);

    const sortedNodes = Object.keys(stats.loadDistribution).sort();
    for (const nodeId of sortedNodes) {
        const load = stats.loadDistribution[nodeId];
        const pct = stats.loadPercentage[nodeId];
        const bar = '█'.repeat(Math.floor(pct / 2));
        console.log(`  ${nodeId.padEnd(10)}: ${String(load).padStart(3)} keys (${pct.toFixed(1).padStart(5)}%) ${bar}`);
    }

    // 5. Lookup examples
    console.log("\n5. Key Lookup Examples");
    printSeparator();
    const sampleKeys = ["user_1", "session_50", "cache_99"];
    for (const key of sampleKeys) {
        const node = ring.getNode(key);
        console.log(`  Key '${key.padEnd(12)}' → ${node}`);
    }

    // 6. Replication for fault tolerance
    console.log("\n6. Replication (Get Multiple Nodes)");
    printSeparator();
    const key = "user_42";
    const replicas = ring.getNodes(key, 3);
    console.log(`Key '${key}' replicated across ${replicas.length} nodes:`);
    for (let i = 0; i < replicas.length; i++) {
        console.log(`  Replica ${i + 1}: ${replicas[i]}`);
    }

    // 7. Add new node and observe redistribution
    console.log("\n7. Adding New Node (Dynamic Scaling)");
    printSeparator();
    console.log("Before adding new node:");
    const oldStats = ring.getStatistics();
    const oldLoad = { ...oldStats.loadDistribution };

    ring.addNode("server7");
    console.log(`✓ Added server7`);

    // Rebalance to see the effect
    const moved = ring.rebalance();
    console.log(`✓ Rebalanced: ${moved} keys moved`);

    const newStats = ring.getStatistics();
    console.log(`\nLoad distribution after adding server7:`);
    const allNodes = Object.keys(newStats.loadDistribution).sort();
    for (const nodeId of allNodes) {
        const load = newStats.loadDistribution[nodeId];
        const pct = newStats.loadPercentage[nodeId];
        const old = oldLoad[nodeId] || 0;
        const change = load - old;
        const sign = change > 0 ? '+' : '';
        console.log(`  ${nodeId.padEnd(10)}: ${String(load).padStart(3)} keys (${pct.toFixed(1).padStart(5)}%) [${sign}${String(change).padStart(3)}]`);
    }

    console.log(`\n📊 Only ~${moved}/${stats.totalKeys} keys (${(moved/stats.totalKeys*100).toFixed(1)}%) moved!`);

    // 8. Remove node
    console.log("\n8. Removing Node (Handling Failures)");
    printSeparator();
    const nodeToRemove = "server3";
    console.log(`Removing ${nodeToRemove}...`);

    const beforeRemove = ring.nodes.get(nodeToRemove).getLoad();
    ring.removeNode(nodeToRemove);
    console.log(`✓ Removed ${nodeToRemove} (had ${beforeRemove} keys)`);

    const finalStats = ring.getStatistics();
    console.log(`\nFinal Statistics:`);
    console.log(`  Physical Nodes: ${finalStats.totalNodes}`);
    console.log(`  Virtual Nodes: ${finalStats.virtualNodes}`);
    console.log(`  Total Keys: ${finalStats.totalKeys}`);
    console.log(`  Avg Load: ${finalStats.avgLoad.toFixed(1)} keys/node`);
    console.log(`  Load Std Dev: ${finalStats.loadVariance.toFixed(2)}`);

    // 9. Hash function comparison
    console.log("\n9. Hash Function Comparison");
    printSeparator();

    const hashFunctions = {
        'MD5': new MD5HashFunction(),
        'SHA1': new SHA1HashFunction()
    };

    const testKey = "test_key_123";
    console.log(`Hashing '${testKey}' with different functions:`);
    for (const [name, hashFn] of Object.entries(hashFunctions)) {
        const hashValue = hashFn.hash(testKey);
        const hashStr = hashValue.toString();
        const truncated = hashStr.length > 43 
            ? hashStr.substring(0, 20) + "..." + hashStr.substring(hashStr.length - 20) 
            : hashStr;
        console.log(`  ${name.padEnd(6)}: ${truncated}`);
    }

    // 10. Weighted nodes demonstration
    console.log("\n10. Weighted Nodes Analysis");
    printSeparator();
    console.log("server6 has weight=2, so it gets 2x virtual nodes");
    const server6Vnodes = ring.nodes.has('server6') ? ring.nodes.get('server6').virtualNodes.length : 0;
    const server1Vnodes = ring.nodes.has('server1') ? ring.nodes.get('server1').virtualNodes.length : 0;
    console.log(`  server1 (weight=1): ${server1Vnodes} virtual nodes`);
    console.log(`  server6 (weight=2): ${server6Vnodes} virtual nodes`);
    console.log(`  Ratio: ${(server6Vnodes / server1Vnodes).toFixed(1)}x`);

    console.log("\n" + "=".repeat(60));
    console.log("  DEMO COMPLETE");
    console.log("=".repeat(60));
    console.log("\n✓ Consistent Hashing provides:");
    console.log("  • Minimal key redistribution on node changes");
    console.log("  • Uniform load distribution via virtual nodes");
    console.log("  • Fast O(log N) lookups");
    console.log("  • Natural replication support");
    console.log("  • Weighted nodes for heterogeneous capacities");
}

// Run the demo
if (require.main === module) {
    demoConsistentHashing();
}

// Exports for use as module
module.exports = {
    HashFunction,
    MD5HashFunction,
    SHA1HashFunction,
    VirtualNode,
    PhysicalNode,
    RingObserver,
    ConsistentHashRing,
    KeyManager
};
