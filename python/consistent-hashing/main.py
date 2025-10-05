"""
Consistent Hashing System Implementation

This module implements a distributed consistent hashing system with support for:
- Virtual nodes for uniform load distribution
- Weighted nodes for heterogeneous capacities
- Multiple hash functions (MD5, SHA-1)
- Key management and migration tracking
- Statistics and load balancing

Usage:
    ring = ConsistentHashRing(virtual_node_count=150)
    ring.add_node("server1")
    ring.add_node("server2", weight=2)
    
    node = ring.get_node("my_key")
    nodes = ring.get_nodes("my_key", 3)  # For replication
    
    stats = ring.get_statistics()

Design Patterns:
    - Strategy Pattern: Pluggable hash functions
    - Singleton Pattern: Single ring instance
    - Observer Pattern: Node change notifications
    - Template Method: Standardized node operations

Author: LLD Solutions
Date: 2025-10-05
"""

import hashlib
import bisect
from typing import Dict, List, Set, Optional, Any
from abc import ABC, abstractmethod
from collections import defaultdict
import statistics


# ===================== Hash Functions (Strategy Pattern) =====================

class HashFunction(ABC):
    """
    Abstract base class for hash functions.
    
    Usage:
        hash_fn = MD5HashFunction()
        hash_value = hash_fn.hash("my_key")
    
    Returns:
        int: Hash value as integer
    """
    
    @abstractmethod
    def hash(self, key: str) -> int:
        """
        Compute hash value for the given key.
        
        Args:
            key: String to hash
            
        Returns:
            int: Hash value as integer
        """
        pass


class MD5HashFunction(HashFunction):
    """
    MD5-based hash function.
    Produces 128-bit hash, provides good distribution.
    
    Usage:
        hash_fn = MD5HashFunction()
        value = hash_fn.hash("server1#0")
    """
    
    def hash(self, key: str) -> int:
        """
        Compute MD5 hash and convert to integer.
        
        Args:
            key: String to hash
            
        Returns:
            int: 128-bit hash value as integer
        """
        return int(hashlib.md5(key.encode('utf-8')).hexdigest(), 16)


class SHA1HashFunction(HashFunction):
    """
    SHA1-based hash function.
    Produces 160-bit hash, better distribution than MD5.
    
    Usage:
        hash_fn = SHA1HashFunction()
        value = hash_fn.hash("server1#0")
    """
    
    def hash(self, key: str) -> int:
        """
        Compute SHA1 hash and convert to integer.
        
        Args:
            key: String to hash
            
        Returns:
            int: 160-bit hash value as integer
        """
        return int(hashlib.sha1(key.encode('utf-8')).hexdigest(), 16)


# ===================== Node Classes =====================

class VirtualNode:
    """
    Represents a virtual replica of a physical node on the hash ring.
    
    Usage:
        vnode = VirtualNode("server1", 0, hash_function)
        hash_value = vnode.hash_value
    
    Attributes:
        hash_value: Position on the hash ring
        physical_node: ID of the physical server
        replica_index: Index of this virtual replica
    """
    
    def __init__(self, physical_node: str, replica_index: int, hash_function: HashFunction):
        """
        Initialize a virtual node.
        
        Args:
            physical_node: ID of the physical server
            replica_index: Index of this replica (0 to N-1)
            hash_function: Hash function to use
        """
        self.physical_node = physical_node
        self.replica_index = replica_index
        # Create unique identifier for this virtual node
        virtual_id = f"{physical_node}#{replica_index}"
        self.hash_value = hash_function.hash(virtual_id)
    
    def __repr__(self):
        return f"VirtualNode({self.physical_node}#{self.replica_index} -> {self.hash_value})"


class PhysicalNode:
    """
    Represents an actual server/node in the distributed system.
    
    Usage:
        node = PhysicalNode("server1", weight=2)
        node.add_key("user_123")
        load = node.get_load()
    
    Attributes:
        node_id: Unique identifier for the server
        weight: Capacity weight (affects virtual node count)
        keys: Set of keys assigned to this node
        virtual_nodes: List of virtual node positions
    """
    
    def __init__(self, node_id: str, weight: int = 1):
        """
        Initialize a physical node.
        
        Args:
            node_id: Unique server identifier
            weight: Capacity weight (default: 1)
        """
        self.node_id = node_id
        self.weight = weight
        self.keys: Set[str] = set()
        self.virtual_nodes: List[int] = []
    
    def add_key(self, key: str) -> None:
        """Add a key to this node."""
        self.keys.add(key)
    
    def remove_key(self, key: str) -> bool:
        """Remove a key from this node. Returns True if key existed."""
        if key in self.keys:
            self.keys.remove(key)
            return True
        return False
    
    def get_load(self) -> int:
        """Get the number of keys assigned to this node."""
        return len(self.keys)
    
    def __repr__(self):
        return f"PhysicalNode({self.node_id}, weight={self.weight}, load={self.get_load()})"


# ===================== Observer Interface =====================

class RingObserver(ABC):
    """
    Observer interface for ring change notifications.
    
    Usage:
        class MyObserver(RingObserver):
            def on_node_added(self, node_id):
                print(f"Node {node_id} added")
            def on_node_removed(self, node_id):
                print(f"Node {node_id} removed")
    """
    
    @abstractmethod
    def on_node_added(self, node_id: str) -> None:
        """Called when a node is added to the ring."""
        pass
    
    @abstractmethod
    def on_node_removed(self, node_id: str) -> None:
        """Called when a node is removed from the ring."""
        pass


# ===================== Consistent Hash Ring =====================

class ConsistentHashRing:
    """
    Main consistent hash ring implementation.
    
    Usage:
        # Create ring
        ring = ConsistentHashRing(virtual_node_count=150)
        
        # Add nodes
        ring.add_node("server1")
        ring.add_node("server2", weight=2)
        
        # Add keys
        ring.add_key("user_123")
        ring.add_key("session_456")
        
        # Lookup
        node = ring.get_node("user_123")
        
        # Replication
        nodes = ring.get_nodes("user_123", 3)
        
        # Statistics
        stats = ring.get_statistics()
        
    Returns:
        ConsistentHashRing: Ring instance with configured parameters
    """
    
    def __init__(self, virtual_node_count: int = 150, hash_function: Optional[HashFunction] = None):
        """
        Initialize the consistent hash ring.
        
        Args:
            virtual_node_count: Number of virtual nodes per physical node (default: 150)
            hash_function: Hash function to use (default: MD5HashFunction)
        """
        self.virtual_node_count = virtual_node_count
        self.hash_function = hash_function or MD5HashFunction()
        
        # Sorted list of hash values (ring positions)
        self.ring: List[int] = []
        
        # Map hash value to physical node ID
        self.hash_to_node: Dict[int, str] = {}
        
        # Map node ID to PhysicalNode object
        self.nodes: Dict[str, PhysicalNode] = {}
        
        # Observers
        self.observers: List[RingObserver] = []
        
        # Total keys in the system
        self.total_keys = 0
    
    def add_observer(self, observer: RingObserver) -> None:
        """Add an observer to receive ring change notifications."""
        self.observers.append(observer)
    
    def _notify_node_added(self, node_id: str) -> None:
        """Notify observers that a node was added."""
        for observer in self.observers:
            observer.on_node_added(node_id)
    
    def _notify_node_removed(self, node_id: str) -> None:
        """Notify observers that a node was removed."""
        for observer in self.observers:
            observer.on_node_removed(node_id)
    
    def add_node(self, node_id: str, weight: int = 1) -> bool:
        """
        Add a physical node to the ring.
        
        Args:
            node_id: Unique identifier for the node
            weight: Node capacity weight (default: 1)
                   Higher weight = more virtual nodes = more keys
        
        Returns:
            bool: True if node was added, False if already exists
        
        Complexity: O(V log N) where V = virtual_node_count, N = total virtual nodes
        """
        if node_id in self.nodes:
            return False
        
        # Create physical node
        physical_node = PhysicalNode(node_id, weight)
        self.nodes[node_id] = physical_node
        
        # Create virtual nodes (weight affects count)
        num_virtual_nodes = self.virtual_node_count * weight
        for i in range(num_virtual_nodes):
            vnode = VirtualNode(node_id, i, self.hash_function)
            hash_value = vnode.hash_value
            
            # Add to ring
            bisect.insort(self.ring, hash_value)
            self.hash_to_node[hash_value] = node_id
            physical_node.virtual_nodes.append(hash_value)
        
        # Notify observers
        self._notify_node_added(node_id)
        
        return True
    
    def remove_node(self, node_id: str) -> bool:
        """
        Remove a physical node from the ring.
        All keys assigned to this node will be redistributed.
        
        Args:
            node_id: ID of the node to remove
        
        Returns:
            bool: True if node was removed, False if not found
        
        Complexity: O(V log N + K) where K = keys to redistribute
        """
        if node_id not in self.nodes:
            return False
        
        physical_node = self.nodes[node_id]
        
        # Remove all virtual nodes from ring
        for hash_value in physical_node.virtual_nodes:
            self.ring.remove(hash_value)
            del self.hash_to_node[hash_value]
        
        # Redistribute keys to new nodes
        keys_to_redistribute = list(physical_node.keys)
        for key in keys_to_redistribute:
            new_node_id = self.get_node(key)
            if new_node_id and new_node_id in self.nodes:
                self.nodes[new_node_id].add_key(key)
        
        # Remove physical node
        del self.nodes[node_id]
        
        # Notify observers
        self._notify_node_removed(node_id)
        
        return True
    
    def get_node(self, key: str) -> Optional[str]:
        """
        Get the node responsible for a given key.
        
        Args:
            key: Key to lookup
        
        Returns:
            str: Node ID or None if no nodes exist
        
        Complexity: O(log N) - binary search in sorted ring
        """
        if not self.ring:
            return None
        
        # Hash the key
        key_hash = self.hash_function.hash(key)
        
        # Find first node with hash >= key_hash (clockwise search)
        idx = bisect.bisect_right(self.ring, key_hash)
        
        # Wrap around if we're past the end
        if idx == len(self.ring):
            idx = 0
        
        hash_value = self.ring[idx]
        return self.hash_to_node[hash_value]
    
    def get_nodes(self, key: str, count: int) -> List[str]:
        """
        Get multiple nodes for replication (clockwise successor nodes).
        
        Args:
            key: Key to lookup
            count: Number of distinct physical nodes to return
        
        Returns:
            List[str]: List of distinct node IDs
        
        Complexity: O(log N + R × V) where R = replication factor
        """
        if not self.ring or count <= 0:
            return []
        
        # Hash the key
        key_hash = self.hash_function.hash(key)
        
        # Find starting position
        idx = bisect.bisect_right(self.ring, key_hash)
        if idx == len(self.ring):
            idx = 0
        
        # Collect distinct physical nodes
        result = []
        seen = set()
        
        for i in range(len(self.ring)):
            current_idx = (idx + i) % len(self.ring)
            hash_value = self.ring[current_idx]
            node_id = self.hash_to_node[hash_value]
            
            if node_id not in seen:
                result.append(node_id)
                seen.add(node_id)
                
                if len(result) == count:
                    break
        
        return result
    
    def add_key(self, key: str) -> Optional[str]:
        """
        Add a key to the system.
        
        Args:
            key: Key to add
        
        Returns:
            str: Node ID where key was assigned, or None if no nodes
        
        Complexity: O(log N)
        """
        node_id = self.get_node(key)
        if node_id and node_id in self.nodes:
            self.nodes[node_id].add_key(key)
            self.total_keys += 1
            return node_id
        return None
    
    def remove_key(self, key: str) -> bool:
        """
        Remove a key from the system.
        
        Args:
            key: Key to remove
        
        Returns:
            bool: True if key was removed, False if not found
        
        Complexity: O(log N)
        """
        node_id = self.get_node(key)
        if node_id and node_id in self.nodes:
            if self.nodes[node_id].remove_key(key):
                self.total_keys -= 1
                return True
        return False
    
    def get_key_location(self, key: str) -> Optional[str]:
        """
        Get the current node for a key.
        
        Args:
            key: Key to lookup
        
        Returns:
            str: Node ID or None
        """
        return self.get_node(key)
    
    def get_statistics(self) -> Dict[str, Any]:
        """
        Get comprehensive ring statistics.
        
        Returns:
            Dict containing:
            - total_nodes: Number of physical nodes
            - virtual_nodes: Total virtual nodes
            - total_keys: Total keys in system
            - load_distribution: Dict[node_id -> key_count]
            - load_percentage: Dict[node_id -> percentage]
            - load_variance: Standard deviation of load distribution
            - avg_load: Average keys per node
        
        Complexity: O(N)
        """
        if not self.nodes:
            return {
                'total_nodes': 0,
                'virtual_nodes': 0,
                'total_keys': 0,
                'load_distribution': {},
                'load_percentage': {},
                'load_variance': 0.0,
                'avg_load': 0.0
            }
        
        load_dist = {node_id: node.get_load() for node_id, node in self.nodes.items()}
        loads = list(load_dist.values())
        avg_load = sum(loads) / len(loads) if loads else 0
        
        # Calculate load percentages
        load_pct = {}
        if self.total_keys > 0:
            load_pct = {node_id: (load / self.total_keys * 100) for node_id, load in load_dist.items()}
        
        # Calculate variance
        variance = statistics.stdev(loads) if len(loads) > 1 else 0.0
        
        return {
            'total_nodes': len(self.nodes),
            'virtual_nodes': len(self.ring),
            'total_keys': self.total_keys,
            'load_distribution': load_dist,
            'load_percentage': load_pct,
            'load_variance': variance,
            'avg_load': avg_load
        }
    
    def get_load_distribution(self) -> Dict[str, float]:
        """
        Get load percentage for each node.
        
        Returns:
            Dict[node_id -> percentage]: Load distribution as percentages
        """
        stats = self.get_statistics()
        return stats['load_percentage']
    
    def rebalance(self) -> int:
        """
        Rebalance keys across all nodes.
        Recalculates assignments for all keys.
        
        Returns:
            int: Number of keys that were moved
        
        Complexity: O(K log N) where K = total keys
        """
        # Collect all keys
        all_keys = []
        for node in self.nodes.values():
            all_keys.extend(node.keys)
            node.keys.clear()
        
        # Reassign all keys
        moved = 0
        for key in all_keys:
            old_node = None
            for node in self.nodes.values():
                if key in node.keys:
                    old_node = node.node_id
                    break
            
            new_node = self.add_key(key)
            if new_node and new_node != old_node:
                moved += 1
        
        return moved


# ===================== Key Manager =====================

class KeyManager:
    """
    Manages key placement and migration tracking.
    
    Usage:
        ring = ConsistentHashRing()
        manager = KeyManager(ring)
        
        manager.add_key("user_123")
        location = manager.get_key_location("user_123")
        
        stats = manager.get_migration_stats()
    """
    
    def __init__(self, ring: ConsistentHashRing):
        """
        Initialize key manager.
        
        Args:
            ring: ConsistentHashRing instance
        """
        self.ring = ring
        self.key_mapping: Dict[str, str] = {}  # key -> node_id
        self.migration_log: List[Dict[str, str]] = []
    
    def add_key(self, key: str) -> Optional[str]:
        """
        Add a key and track its location.
        
        Args:
            key: Key to add
        
        Returns:
            str: Node ID where key was assigned
        """
        node_id = self.ring.add_key(key)
        if node_id:
            self.key_mapping[key] = node_id
        return node_id
    
    def remove_key(self, key: str) -> bool:
        """Remove a key from tracking."""
        if self.ring.remove_key(key):
            if key in self.key_mapping:
                del self.key_mapping[key]
            return True
        return False
    
    def get_key_location(self, key: str) -> Optional[str]:
        """Get the current node for a key."""
        return self.key_mapping.get(key)
    
    def migrate_keys(self, from_node: str, to_node: str) -> int:
        """
        Migrate keys from one node to another.
        
        Args:
            from_node: Source node ID
            to_node: Destination node ID
        
        Returns:
            int: Number of keys migrated
        """
        if from_node not in self.ring.nodes or to_node not in self.ring.nodes:
            return 0
        
        from_physical = self.ring.nodes[from_node]
        to_physical = self.ring.nodes[to_node]
        
        keys_to_migrate = list(from_physical.keys)
        count = 0
        
        for key in keys_to_migrate:
            from_physical.remove_key(key)
            to_physical.add_key(key)
            self.key_mapping[key] = to_node
            
            self.migration_log.append({
                'key': key,
                'from': from_node,
                'to': to_node
            })
            count += 1
        
        return count
    
    def get_migration_stats(self) -> Dict[str, Any]:
        """
        Get statistics about key migrations.
        
        Returns:
            Dict with migration statistics
        """
        return {
            'total_migrations': len(self.migration_log),
            'recent_migrations': self.migration_log[-10:] if self.migration_log else []
        }


# ===================== Demo Implementation =====================

def print_separator(title: str = ""):
    """Print a formatted separator with optional title."""
    if title:
        print(f"\n{'='*60}")
        print(f"  {title}")
        print('='*60)
    else:
        print('-' * 60)


def demo_consistent_hashing():
    """
    Comprehensive demonstration of Consistent Hashing system.
    
    Demonstrates:
    1. Ring initialization with virtual nodes
    2. Adding nodes with different weights
    3. Key distribution and lookup
    4. Node removal and key redistribution
    5. Replication for fault tolerance
    6. Load balancing statistics
    7. Hash function comparison
    """
    
    print_separator("CONSISTENT HASHING SYSTEM DEMO")
    
    # 1. Create ring with virtual nodes
    print("\n1. Creating Consistent Hash Ring")
    print_separator()
    ring = ConsistentHashRing(virtual_node_count=150)
    print(f"✓ Ring created with {ring.virtual_node_count} virtual nodes per physical node")
    print(f"✓ Using hash function: {ring.hash_function.__class__.__name__}")
    
    # 2. Add nodes
    print("\n2. Adding Physical Nodes")
    print_separator()
    nodes = ["server1", "server2", "server3", "server4", "server5"]
    for node in nodes:
        ring.add_node(node)
        print(f"✓ Added {node}")
    
    # Add a weighted node
    ring.add_node("server6", weight=2)
    print(f"✓ Added server6 with weight=2 (gets 2x virtual nodes)")
    
    stats = ring.get_statistics()
    print(f"\n📊 Ring Status:")
    print(f"   Physical Nodes: {stats['total_nodes']}")
    print(f"   Virtual Nodes: {stats['virtual_nodes']}")
    
    # 3. Add keys and distribute
    print("\n3. Adding Keys to System")
    print_separator()
    keys = [
        f"user_{i}" for i in range(1, 101)
    ] + [
        f"session_{i}" for i in range(1, 101)
    ] + [
        f"cache_{i}" for i in range(1, 101)
    ]
    
    for key in keys:
        ring.add_key(key)
    
    print(f"✓ Added {len(keys)} keys to the system")
    
    # 4. Show load distribution
    print("\n4. Load Distribution Analysis")
    print_separator()
    stats = ring.get_statistics()
    print(f"Total Keys: {stats['total_keys']}")
    print(f"Average Load: {stats['avg_load']:.1f} keys/node")
    print(f"Load Std Dev: {stats['load_variance']:.2f}")
    print(f"\nPer-Node Distribution:")
    
    for node_id in sorted(stats['load_distribution'].keys()):
        load = stats['load_distribution'][node_id]
        pct = stats['load_percentage'][node_id]
        bar = '█' * int(pct / 2)
        print(f"  {node_id:10s}: {load:3d} keys ({pct:5.1f}%) {bar}")
    
    # 5. Lookup examples
    print("\n5. Key Lookup Examples")
    print_separator()
    sample_keys = ["user_1", "session_50", "cache_99"]
    for key in sample_keys:
        node = ring.get_node(key)
        print(f"  Key '{key:12s}' → {node}")
    
    # 6. Replication for fault tolerance
    print("\n6. Replication (Get Multiple Nodes)")
    print_separator()
    key = "user_42"
    replicas = ring.get_nodes(key, 3)
    print(f"Key '{key}' replicated across {len(replicas)} nodes:")
    for i, node in enumerate(replicas, 1):
        print(f"  Replica {i}: {node}")
    
    # 7. Add new node and observe redistribution
    print("\n7. Adding New Node (Dynamic Scaling)")
    print_separator()
    print("Before adding new node:")
    old_stats = ring.get_statistics()
    old_load = old_stats['load_distribution'].copy()
    
    ring.add_node("server7")
    print(f"✓ Added server7")
    
    # Rebalance to see the effect
    moved = ring.rebalance()
    print(f"✓ Rebalanced: {moved} keys moved")
    
    new_stats = ring.get_statistics()
    print(f"\nLoad distribution after adding server7:")
    for node_id in sorted(new_stats['load_distribution'].keys()):
        load = new_stats['load_distribution'][node_id]
        pct = new_stats['load_percentage'][node_id]
        old = old_load.get(node_id, 0)
        change = load - old
        sign = '+' if change > 0 else ''
        print(f"  {node_id:10s}: {load:3d} keys ({pct:5.1f}%) [{sign}{change:3d}]")
    
    print(f"\n📊 Only ~{moved}/{stats['total_keys']} keys ({moved/stats['total_keys']*100:.1f}%) moved!")
    
    # 8. Remove node
    print("\n8. Removing Node (Handling Failures)")
    print_separator()
    node_to_remove = "server3"
    print(f"Removing {node_to_remove}...")
    
    before_remove = ring.nodes[node_to_remove].get_load()
    ring.remove_node(node_to_remove)
    print(f"✓ Removed {node_to_remove} (had {before_remove} keys)")
    
    final_stats = ring.get_statistics()
    print(f"\nFinal Statistics:")
    print(f"  Physical Nodes: {final_stats['total_nodes']}")
    print(f"  Virtual Nodes: {final_stats['virtual_nodes']}")
    print(f"  Total Keys: {final_stats['total_keys']}")
    print(f"  Avg Load: {final_stats['avg_load']:.1f} keys/node")
    print(f"  Load Std Dev: {final_stats['load_variance']:.2f}")
    
    # 9. Hash function comparison
    print("\n9. Hash Function Comparison")
    print_separator()
    
    hash_functions = {
        'MD5': MD5HashFunction(),
        'SHA1': SHA1HashFunction()
    }
    
    test_key = "test_key_123"
    print(f"Hashing '{test_key}' with different functions:")
    for name, hash_fn in hash_functions.items():
        hash_value = hash_fn.hash(test_key)
        # Show truncated hash for readability
        hash_str = str(hash_value)
        truncated = hash_str[:20] + "..." + hash_str[-20:] if len(hash_str) > 43 else hash_str
        print(f"  {name:6s}: {truncated}")
    
    # 10. Weighted nodes demonstration
    print("\n10. Weighted Nodes Analysis")
    print_separator()
    print("server6 has weight=2, so it gets 2x virtual nodes")
    server6_vnodes = len(ring.nodes['server6'].virtual_nodes) if 'server6' in ring.nodes else 0
    server1_vnodes = len(ring.nodes['server1'].virtual_nodes) if 'server1' in ring.nodes else 0
    print(f"  server1 (weight=1): {server1_vnodes} virtual nodes")
    print(f"  server6 (weight=2): {server6_vnodes} virtual nodes")
    print(f"  Ratio: {server6_vnodes / server1_vnodes:.1f}x")
    
    print("\n" + "="*60)
    print("  DEMO COMPLETE")
    print("="*60)
    print("\n✓ Consistent Hashing provides:")
    print("  • Minimal key redistribution on node changes")
    print("  • Uniform load distribution via virtual nodes")
    print("  • Fast O(log N) lookups")
    print("  • Natural replication support")
    print("  • Weighted nodes for heterogeneous capacities")


if __name__ == "__main__":
    demo_consistent_hashing()
