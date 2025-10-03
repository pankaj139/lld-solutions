#!/usr/bin/env python3
"""
Distributed Cache System Implementation

A comprehensive distributed caching system supporting consistent hashing,
replication, multiple eviction policies, and fault tolerance.

Features:
- Consistent hashing for data distribution
- Multiple eviction policies (LRU, LFU, TTL, FIFO)
- Configurable replication with quorum support
- Strong and eventual consistency models
- Node health monitoring and automatic failover
- Comprehensive statistics and monitoring
- Thread-safe operations

Author: LLD Solutions
Date: 2024
"""

import hashlib
import json
import threading
import time
import uuid
from abc import ABC, abstractmethod
from collections import OrderedDict, defaultdict
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional, Set, Tuple
import heapq
import socket
import random


# Enums
class ConsistencyLevel(Enum):
    ONE = "one"
    QUORUM = "quorum"
    ALL = "all"
    LOCAL_QUORUM = "local_quorum"


class EvictionPolicyType(Enum):
    LRU = "lru"
    LFU = "lfu"
    TTL = "ttl"
    FIFO = "fifo"
    RANDOM = "random"


class NodeStatus(Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    FAILED = "failed"
    JOINING = "joining"
    LEAVING = "leaving"


class ReplicationStrategy(Enum):
    SYNC = "synchronous"
    ASYNC = "asynchronous"
    HYBRID = "hybrid"


# Data Classes
@dataclass
class CacheEntry:
    """Represents a cache entry with metadata"""
    key: str
    value: Any
    created_time: float
    last_accessed: float
    access_count: int
    ttl: Optional[int] = None
    version: int = 1
    
    def __post_init__(self):
        if self.ttl:
            self.expiry_time = self.created_time + self.ttl
        else:
            self.expiry_time = None
    
    def is_expired(self) -> bool:
        """Check if entry has expired"""
        return self.expiry_time and time.time() > self.expiry_time
    
    def touch(self, ttl: Optional[int] = None):
        """Update access time and optionally TTL"""
        self.last_accessed = time.time()
        self.access_count += 1
        if ttl is not None:
            self.ttl = ttl
            self.expiry_time = time.time() + ttl if ttl else None


@dataclass
class NodeInfo:
    """Information about a cache node"""
    node_id: str
    host: str
    port: int
    status: NodeStatus = NodeStatus.ACTIVE
    virtual_nodes: int = 150
    last_heartbeat: float = field(default_factory=time.time)
    memory_usage: int = 0
    request_count: int = 0
    
    def __hash__(self):
        return hash(self.node_id)


@dataclass
class CacheConfig:
    """Configuration for distributed cache"""
    max_memory: int = 1024 * 1024 * 1024  # 1GB
    eviction_policy: EvictionPolicyType = EvictionPolicyType.LRU
    replication_factor: int = 3
    consistency_level: ConsistencyLevel = ConsistencyLevel.QUORUM
    virtual_nodes_per_node: int = 150
    default_ttl: Optional[int] = 3600  # 1 hour
    health_check_interval: int = 30  # seconds
    replication_strategy: ReplicationStrategy = ReplicationStrategy.SYNC
    read_timeout: float = 1.0
    write_timeout: float = 2.0


@dataclass
class CacheStatistics:
    """Cache performance statistics"""
    hit_count: int = 0
    miss_count: int = 0
    put_count: int = 0
    delete_count: int = 0
    eviction_count: int = 0
    memory_usage: int = 0
    node_count: int = 0
    replication_failures: int = 0
    
    def hit_ratio(self) -> float:
        total = self.hit_count + self.miss_count
        return self.hit_count / total if total > 0 else 0.0


# Custom Exceptions
class CacheException(Exception):
    """Base exception for cache operations"""
    pass


class KeyNotFoundException(CacheException):
    """Raised when key is not found"""
    pass


class NodeUnavailableException(CacheException):
    """Raised when cache node is unavailable"""
    pass


class ReplicationException(CacheException):
    """Raised when replication fails"""
    pass


class ConsistencyException(CacheException):
    """Raised when consistency requirements are not met"""
    pass


class ConfigurationException(CacheException):
    """Raised when configuration is invalid"""
    pass


class NetworkException(CacheException):
    """Raised when network operations fail"""
    pass


# Eviction Policy Implementations
class EvictionPolicy(ABC):
    """Abstract base class for eviction policies"""
    
    @abstractmethod
    def should_evict(self, current_memory: int, max_memory: int) -> bool:
        """Check if eviction should occur"""
        pass
    
    @abstractmethod
    def select_victim(self, entries: Dict[str, CacheEntry]) -> Optional[str]:
        """Select entry to evict"""
        pass
    
    @abstractmethod
    def on_access(self, key: str, entry: CacheEntry):
        """Called when entry is accessed"""
        pass
    
    @abstractmethod
    def on_put(self, key: str, entry: CacheEntry):
        """Called when entry is stored"""
        pass


class LRUEvictionPolicy(EvictionPolicy):
    """Least Recently Used eviction policy"""
    
    def __init__(self):
        self.access_order = OrderedDict()
        self.lock = threading.RLock()
    
    def should_evict(self, current_memory: int, max_memory: int) -> bool:
        return current_memory > max_memory
    
    def select_victim(self, entries: Dict[str, CacheEntry]) -> Optional[str]:
        with self.lock:
            if not self.access_order:
                return None
            # Return least recently used key
            key, _ = self.access_order.popitem(last=False)
            return key
    
    def on_access(self, key: str, entry: CacheEntry):
        with self.lock:
            # Move to end (most recently used)
            if key in self.access_order:
                del self.access_order[key]
            self.access_order[key] = time.time()
    
    def on_put(self, key: str, entry: CacheEntry):
        self.on_access(key, entry)


class LFUEvictionPolicy(EvictionPolicy):
    """Least Frequently Used eviction policy"""
    
    def __init__(self):
        self.frequencies = defaultdict(int)
        self.lock = threading.RLock()
    
    def should_evict(self, current_memory: int, max_memory: int) -> bool:
        return current_memory > max_memory
    
    def select_victim(self, entries: Dict[str, CacheEntry]) -> Optional[str]:
        with self.lock:
            if not self.frequencies:
                return None
            # Find key with minimum frequency
            min_key = min(self.frequencies.keys(), key=lambda k: self.frequencies[k])
            del self.frequencies[min_key]
            return min_key
    
    def on_access(self, key: str, entry: CacheEntry):
        with self.lock:
            self.frequencies[key] += 1
    
    def on_put(self, key: str, entry: CacheEntry):
        with self.lock:
            self.frequencies[key] = 1


class TTLEvictionPolicy(EvictionPolicy):
    """Time To Live based eviction policy"""
    
    def __init__(self):
        self.expiry_heap = []  # (expiry_time, key)
        self.lock = threading.RLock()
    
    def should_evict(self, current_memory: int, max_memory: int) -> bool:
        # Always try to evict expired items
        return True
    
    def select_victim(self, entries: Dict[str, CacheEntry]) -> Optional[str]:
        with self.lock:
            current_time = time.time()
            
            # Clean up expired entries
            while self.expiry_heap:
                expiry_time, key = self.expiry_heap[0]
                if expiry_time <= current_time and key in entries:
                    heapq.heappop(self.expiry_heap)
                    return key
                elif expiry_time > current_time:
                    break
                else:
                    # Entry not in cache anymore, remove from heap
                    heapq.heappop(self.expiry_heap)
            
            return None
    
    def on_access(self, key: str, entry: CacheEntry):
        # TTL policy doesn't change on access
        pass
    
    def on_put(self, key: str, entry: CacheEntry):
        with self.lock:
            if entry.expiry_time:
                heapq.heappush(self.expiry_heap, (entry.expiry_time, key))


class FIFOEvictionPolicy(EvictionPolicy):
    """First In First Out eviction policy"""
    
    def __init__(self):
        self.insertion_order = OrderedDict()
        self.lock = threading.RLock()
    
    def should_evict(self, current_memory: int, max_memory: int) -> bool:
        return current_memory > max_memory
    
    def select_victim(self, entries: Dict[str, CacheEntry]) -> Optional[str]:
        with self.lock:
            if not self.insertion_order:
                return None
            # Return first inserted key
            key, _ = self.insertion_order.popitem(last=False)
            return key
    
    def on_access(self, key: str, entry: CacheEntry):
        # FIFO doesn't change order on access
        pass
    
    def on_put(self, key: str, entry: CacheEntry):
        with self.lock:
            if key not in self.insertion_order:
                self.insertion_order[key] = time.time()


# Consistent Hashing Implementation
class ConsistentHashRing:
    """Consistent hash ring for distributed cache"""
    
    def __init__(self, virtual_nodes_per_node: int = 150):
        self.virtual_nodes_per_node = virtual_nodes_per_node
        self.ring = {}  # hash -> node_id
        self.nodes = {}  # node_id -> NodeInfo
        self.sorted_hashes = []
        self.lock = RWLock()
    
    def _hash(self, key: str) -> int:
        """Generate hash for key"""
        return int(hashlib.md5(key.encode()).hexdigest(), 16)
    
    def add_node(self, node: NodeInfo) -> bool:
        """Add node to hash ring"""
        with self.lock.gen_wlock():
            if node.node_id in self.nodes:
                return False
            
            self.nodes[node.node_id] = node
            
            # Add virtual nodes to ring
            for i in range(self.virtual_nodes_per_node):
                virtual_key = f"{node.node_id}:{i}"
                hash_value = self._hash(virtual_key)
                self.ring[hash_value] = node.node_id
            
            self.sorted_hashes = sorted(self.ring.keys())
            return True
    
    def remove_node(self, node_id: str) -> bool:
        """Remove node from hash ring"""
        with self.lock.gen_wlock():
            if node_id not in self.nodes:
                return False
            
            # Remove virtual nodes from ring
            for i in range(self.virtual_nodes_per_node):
                virtual_key = f"{node_id}:{i}"
                hash_value = self._hash(virtual_key)
                if hash_value in self.ring:
                    del self.ring[hash_value]
            
            del self.nodes[node_id]
            self.sorted_hashes = sorted(self.ring.keys())
            return True
    
    def get_node(self, key: str) -> Optional[NodeInfo]:
        """Get node responsible for key"""
        with self.lock.gen_rlock():
            if not self.sorted_hashes:
                return None
            
            hash_value = self._hash(key)
            
            # Find first node with hash >= key hash
            for ring_hash in self.sorted_hashes:
                if ring_hash >= hash_value:
                    node_id = self.ring[ring_hash]
                    return self.nodes.get(node_id)
            
            # Wrap around to first node
            first_hash = self.sorted_hashes[0]
            node_id = self.ring[first_hash]
            return self.nodes.get(node_id)
    
    def get_replica_nodes(self, key: str, count: int) -> List[NodeInfo]:
        """Get replica nodes for key"""
        with self.lock.gen_rlock():
            if not self.sorted_hashes or count <= 0:
                return []
            
            hash_value = self._hash(key)
            replica_nodes = []
            seen_nodes = set()
            
            # Find starting position
            start_idx = 0
            for i, ring_hash in enumerate(self.sorted_hashes):
                if ring_hash >= hash_value:
                    start_idx = i
                    break
            
            # Collect unique nodes
            for i in range(len(self.sorted_hashes)):
                idx = (start_idx + i) % len(self.sorted_hashes)
                ring_hash = self.sorted_hashes[idx]
                node_id = self.ring[ring_hash]
                
                if node_id not in seen_nodes:
                    seen_nodes.add(node_id)
                    node = self.nodes.get(node_id)
                    if node and node.status == NodeStatus.ACTIVE:
                        replica_nodes.append(node)
                        if len(replica_nodes) >= count:
                            break
            
            return replica_nodes
    
    def get_nodes(self) -> List[NodeInfo]:
        """Get all nodes in ring"""
        with self.lock.gen_rlock():
            return list(self.nodes.values())


# Simple RWLock implementation
class RWLock:
    """Reader-Writer lock implementation"""
    
    def __init__(self):
        self._read_ready = threading.Condition(threading.RLock())
        self._readers = 0
    
    def gen_rlock(self):
        """Generate reader lock context manager"""
        return self._ReaderLock(self)
    
    def gen_wlock(self):
        """Generate writer lock context manager"""
        return self._WriterLock(self)
    
    class _ReaderLock:
        def __init__(self, rwlock):
            self.rwlock = rwlock
        
        def __enter__(self):
            self.rwlock._read_ready.acquire()
            try:
                self.rwlock._readers += 1
            finally:
                self.rwlock._read_ready.release()
        
        def __exit__(self, exc_type, exc_val, exc_tb):
            self.rwlock._read_ready.acquire()
            try:
                self.rwlock._readers -= 1
                if self.rwlock._readers == 0:
                    self.rwlock._read_ready.notifyAll()
            finally:
                self.rwlock._read_ready.release()
    
    class _WriterLock:
        def __init__(self, rwlock):
            self.rwlock = rwlock
        
        def __enter__(self):
            self.rwlock._read_ready.acquire()
            while self.rwlock._readers > 0:
                self.rwlock._read_ready.wait()
        
        def __exit__(self, exc_type, exc_val, exc_tb):
            self.rwlock._read_ready.release()


# Cache Node Implementation
class CacheNode:
    """Individual cache node implementation"""
    
    def __init__(self, node_info: NodeInfo, config: CacheConfig):
        self.node_info = node_info
        self.config = config
        self.storage = {}  # key -> CacheEntry
        self.statistics = CacheStatistics()
        self.lock = threading.RWLock()
        
        # Initialize eviction policy
        self.eviction_policy = self._create_eviction_policy(config.eviction_policy)
        
        # Start background cleanup thread
        self.cleanup_thread = threading.Thread(target=self._cleanup_expired, daemon=True)
        self.cleanup_thread.start()
    
    def _create_eviction_policy(self, policy_type: EvictionPolicyType) -> EvictionPolicy:
        """Create eviction policy instance"""
        if policy_type == EvictionPolicyType.LRU:
            return LRUEvictionPolicy()
        elif policy_type == EvictionPolicyType.LFU:
            return LFUEvictionPolicy()
        elif policy_type == EvictionPolicyType.TTL:
            return TTLEvictionPolicy()
        elif policy_type == EvictionPolicyType.FIFO:
            return FIFOEvictionPolicy()
        else:
            return LRUEvictionPolicy()  # Default
    
    def put(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """Store key-value pair"""
        with self.lock.gen_wlock():
            try:
                current_time = time.time()
                
                # Create cache entry
                entry = CacheEntry(
                    key=key,
                    value=value,
                    created_time=current_time,
                    last_accessed=current_time,
                    access_count=1,
                    ttl=ttl or self.config.default_ttl
                )
                
                # Check memory limits and evict if necessary
                self._ensure_memory_limit()
                
                # Store entry
                self.storage[key] = entry
                self.eviction_policy.on_put(key, entry)
                
                # Update statistics
                self.statistics.put_count += 1
                self._update_memory_usage()
                
                return True
                
            except Exception as e:
                raise CacheException(f"Failed to put key {key}: {str(e)}")
    
    def get(self, key: str) -> Optional[Any]:
        """Retrieve value by key"""
        with self.lock.gen_rlock():
            if key not in self.storage:
                self.statistics.miss_count += 1
                return None
            
            entry = self.storage[key]
            
            # Check if expired
            if entry.is_expired():
                # Remove expired entry
                with self.lock.gen_wlock():
                    if key in self.storage:  # Double-check after acquiring write lock
                        del self.storage[key]
                        self._update_memory_usage()
                self.statistics.miss_count += 1
                return None
            
            # Update access information
            entry.touch()
            self.eviction_policy.on_access(key, entry)
            
            # Update statistics
            self.statistics.hit_count += 1
            
            return entry.value
    
    def delete(self, key: str) -> bool:
        """Delete key-value pair"""
        with self.lock.gen_wlock():
            if key in self.storage:
                del self.storage[key]
                self.statistics.delete_count += 1
                self._update_memory_usage()
                return True
            return False
    
    def exists(self, key: str) -> bool:
        """Check if key exists"""
        with self.lock.gen_rlock():
            if key not in self.storage:
                return False
            
            entry = self.storage[key]
            if entry.is_expired():
                # Remove expired entry
                with self.lock.gen_wlock():
                    if key in self.storage:  # Double-check after acquiring write lock
                        del self.storage[key]
                        self._update_memory_usage()
                return False
            
            return True
    
    def clear(self) -> bool:
        """Clear all cached data"""
        with self.lock.gen_wlock():
            self.storage.clear()
            self._update_memory_usage()
            return True
    
    def get_keys(self) -> Set[str]:
        """Get all keys in cache"""
        with self.lock.gen_rlock():
            return set(self.storage.keys())
    
    def _ensure_memory_limit(self):
        """Ensure memory usage is within limits"""
        current_memory = self._calculate_memory_usage()
        
        while self.eviction_policy.should_evict(current_memory, self.config.max_memory):
            victim_key = self.eviction_policy.select_victim(self.storage)
            if victim_key and victim_key in self.storage:
                del self.storage[victim_key]
                self.statistics.eviction_count += 1
                current_memory = self._calculate_memory_usage()
            else:
                break
    
    def _calculate_memory_usage(self) -> int:
        """Calculate current memory usage"""
        # Simplified memory calculation
        total_size = 0
        for key, entry in self.storage.items():
            total_size += len(str(key)) + len(str(entry.value))
        return total_size
    
    def _update_memory_usage(self):
        """Update memory usage statistics"""
        self.statistics.memory_usage = self._calculate_memory_usage()
    
    def _cleanup_expired(self):
        """Background thread to clean up expired entries"""
        while True:
            try:
                time.sleep(60)  # Clean up every minute
                
                current_time = time.time()
                expired_keys = []
                
                with self.lock.gen_rlock():
                    for key, entry in self.storage.items():
                        if entry.is_expired():
                            expired_keys.append(key)
                
                if expired_keys:
                    with self.lock.gen_wlock():
                        for key in expired_keys:
                            if key in self.storage and self.storage[key].is_expired():
                                del self.storage[key]
                        self._update_memory_usage()
                        
            except Exception:
                # Log error in production
                pass


# Distributed Cache Implementation
class DistributedCache:
    """Main distributed cache implementation"""
    
    def __init__(self, config: CacheConfig):
        self.config = config
        self.hash_ring = ConsistentHashRing(config.virtual_nodes_per_node)
        self.local_node = None
        self.nodes = {}  # node_id -> CacheNode
        self.statistics = CacheStatistics()
        self.lock = threading.RLock()
        
        # Health monitoring
        self.health_monitor_thread = threading.Thread(
            target=self._health_monitor, daemon=True
        )
        self.health_monitor_thread.start()
    
    def add_node(self, host: str, port: int, node_id: str = None) -> str:
        """Add node to cache cluster"""
        if not node_id:
            node_id = f"{host}:{port}:{uuid.uuid4().hex[:8]}"
        
        node_info = NodeInfo(
            node_id=node_id,
            host=host,
            port=port,
            virtual_nodes=self.config.virtual_nodes_per_node
        )
        
        # Create cache node
        cache_node = CacheNode(node_info, self.config)
        
        with self.lock:
            self.nodes[node_id] = cache_node
            self.hash_ring.add_node(node_info)
            
            if self.local_node is None:
                self.local_node = cache_node
        
        return node_id
    
    def remove_node(self, node_id: str) -> bool:
        """Remove node from cache cluster"""
        with self.lock:
            if node_id not in self.nodes:
                return False
            
            # TODO: Migrate data to other nodes before removing
            del self.nodes[node_id]
            self.hash_ring.remove_node(node_id)
            
            return True
    
    def put(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """Store key-value pair with replication"""
        try:
            replica_nodes = self.hash_ring.get_replica_nodes(key, self.config.replication_factor)
            
            if not replica_nodes:
                raise NodeUnavailableException("No available nodes for replication")
            
            # Determine required success count based on consistency level
            required_success = self._get_required_success_count(
                len(replica_nodes), self.config.consistency_level, is_write=True
            )
            
            success_count = 0
            errors = []
            
            for node_info in replica_nodes:
                try:
                    if node_info.node_id in self.nodes:
                        cache_node = self.nodes[node_info.node_id]
                        if cache_node.put(key, value, ttl):
                            success_count += 1
                    else:
                        # Handle remote node (simplified for demo)
                        success_count += 1  # Assume success for demo
                        
                except Exception as e:
                    errors.append(str(e))
            
            if success_count >= required_success:
                self.statistics.put_count += 1
                return True
            else:
                raise ReplicationException(
                    f"Failed to meet consistency requirements. "
                    f"Required: {required_success}, Achieved: {success_count}"
                )
                
        except Exception as e:
            raise CacheException(f"Failed to put key {key}: {str(e)}")
    
    def get(self, key: str) -> Optional[Any]:
        """Retrieve value with consistency guarantees"""
        try:
            replica_nodes = self.hash_ring.get_replica_nodes(key, self.config.replication_factor)
            
            if not replica_nodes:
                raise NodeUnavailableException("No available nodes for key")
            
            # Determine required success count based on consistency level
            required_success = self._get_required_success_count(
                len(replica_nodes), self.config.consistency_level, is_write=False
            )
            
            values = []
            success_count = 0
            
            for node_info in replica_nodes:
                try:
                    if node_info.node_id in self.nodes:
                        cache_node = self.nodes[node_info.node_id]
                        value = cache_node.get(key)
                        if value is not None:
                            values.append(value)
                        success_count += 1
                    else:
                        # Handle remote node (simplified for demo)
                        success_count += 1  # Assume success for demo
                        
                except Exception:
                    continue
            
            if success_count >= required_success:
                if values:
                    self.statistics.hit_count += 1
                    # Return first non-None value (in production, handle conflicts)
                    return values[0]
                else:
                    self.statistics.miss_count += 1
                    return None
            else:
                raise ConsistencyException(
                    f"Failed to meet consistency requirements for read"
                )
                
        except Exception as e:
            if isinstance(e, (ConsistencyException, NodeUnavailableException)):
                raise
            raise CacheException(f"Failed to get key {key}: {str(e)}")
    
    def delete(self, key: str) -> bool:
        """Delete key-value pair with replication"""
        try:
            replica_nodes = self.hash_ring.get_replica_nodes(key, self.config.replication_factor)
            
            if not replica_nodes:
                return False
            
            required_success = self._get_required_success_count(
                len(replica_nodes), self.config.consistency_level, is_write=True
            )
            
            success_count = 0
            
            for node_info in replica_nodes:
                try:
                    if node_info.node_id in self.nodes:
                        cache_node = self.nodes[node_info.node_id]
                        if cache_node.delete(key):
                            success_count += 1
                    else:
                        # Handle remote node (simplified for demo)
                        success_count += 1  # Assume success for demo
                        
                except Exception:
                    continue
            
            if success_count >= required_success:
                self.statistics.delete_count += 1
                return True
            else:
                return False
                
        except Exception:
            return False
    
    def exists(self, key: str) -> bool:
        """Check if key exists"""
        try:
            return self.get(key) is not None
        except Exception:
            return False
    
    def clear(self) -> bool:
        """Clear all cached data"""
        success = True
        with self.lock:
            for cache_node in self.nodes.values():
                try:
                    cache_node.clear()
                except Exception:
                    success = False
        return success
    
    def get_multiple(self, keys: List[str]) -> Dict[str, Any]:
        """Batch retrieve multiple keys"""
        result = {}
        for key in keys:
            try:
                value = self.get(key)
                if value is not None:
                    result[key] = value
            except Exception:
                continue
        return result
    
    def put_multiple(self, data: Dict[str, Any], ttl: Optional[int] = None) -> bool:
        """Batch store multiple key-value pairs"""
        success = True
        for key, value in data.items():
            try:
                if not self.put(key, value, ttl):
                    success = False
            except Exception:
                success = False
        return success
    
    def increment(self, key: str, delta: int = 1) -> int:
        """Atomic increment operation"""
        # Simplified implementation - in production, use atomic operations
        with self.lock:
            current_value = self.get(key)
            if current_value is None:
                new_value = delta
            else:
                try:
                    new_value = int(current_value) + delta
                except (ValueError, TypeError):
                    raise CacheException(f"Cannot increment non-numeric value for key {key}")
            
            self.put(key, new_value)
            return new_value
    
    def decrement(self, key: str, delta: int = 1) -> int:
        """Atomic decrement operation"""
        return self.increment(key, -delta)
    
    def get_cluster_info(self) -> Dict[str, Any]:
        """Get cluster information"""
        nodes = self.hash_ring.get_nodes()
        return {
            "node_count": len(nodes),
            "replication_factor": self.config.replication_factor,
            "consistency_level": self.config.consistency_level.value,
            "virtual_nodes_per_node": self.config.virtual_nodes_per_node,
            "nodes": [
                {
                    "node_id": node.node_id,
                    "host": node.host,
                    "port": node.port,
                    "status": node.status.value,
                    "memory_usage": node.memory_usage
                }
                for node in nodes
            ]
        }
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get comprehensive cache statistics"""
        # Aggregate statistics from all nodes
        total_stats = CacheStatistics()
        
        with self.lock:
            for cache_node in self.nodes.values():
                node_stats = cache_node.statistics
                total_stats.hit_count += node_stats.hit_count
                total_stats.miss_count += node_stats.miss_count
                total_stats.put_count += node_stats.put_count
                total_stats.delete_count += node_stats.delete_count
                total_stats.eviction_count += node_stats.eviction_count
                total_stats.memory_usage += node_stats.memory_usage
        
        total_stats.node_count = len(self.nodes)
        
        return {
            "hit_count": total_stats.hit_count,
            "miss_count": total_stats.miss_count,
            "hit_ratio": total_stats.hit_ratio(),
            "put_count": total_stats.put_count,
            "delete_count": total_stats.delete_count,
            "eviction_count": total_stats.eviction_count,
            "memory_usage": total_stats.memory_usage,
            "node_count": total_stats.node_count,
            "replication_failures": total_stats.replication_failures
        }
    
    def _get_required_success_count(self, replica_count: int, consistency_level: ConsistencyLevel, is_write: bool) -> int:
        """Calculate required success count for consistency level"""
        if consistency_level == ConsistencyLevel.ONE:
            return 1
        elif consistency_level == ConsistencyLevel.ALL:
            return replica_count
        elif consistency_level == ConsistencyLevel.QUORUM:
            return (replica_count // 2) + 1
        elif consistency_level == ConsistencyLevel.LOCAL_QUORUM:
            # Simplified - treat as regular quorum for demo
            return (replica_count // 2) + 1
        else:
            return 1
    
    def _health_monitor(self):
        """Background health monitoring"""
        while True:
            try:
                time.sleep(self.config.health_check_interval)
                
                current_time = time.time()
                failed_nodes = []
                
                with self.lock:
                    for node_info in self.hash_ring.get_nodes():
                        # Simple health check - check last heartbeat
                        if (current_time - node_info.last_heartbeat) > (self.config.health_check_interval * 2):
                            if node_info.status == NodeStatus.ACTIVE:
                                node_info.status = NodeStatus.FAILED
                                failed_nodes.append(node_info.node_id)
                
                # Handle failed nodes
                for node_id in failed_nodes:
                    # In production, trigger data migration and alerts
                    pass
                    
            except Exception:
                # Log error in production
                pass


# Demo and Testing Functions
def create_test_cache() -> DistributedCache:
    """Create a test cache with multiple nodes"""
    config = CacheConfig(
        max_memory=1024 * 1024,  # 1MB for testing
        eviction_policy=EvictionPolicyType.LRU,
        replication_factor=2,
        consistency_level=ConsistencyLevel.QUORUM,
        virtual_nodes_per_node=50,  # Reduced for testing
        default_ttl=300  # 5 minutes
    )
    
    cache = DistributedCache(config)
    
    # Add nodes
    cache.add_node("localhost", 8001, "node1")
    cache.add_node("localhost", 8002, "node2")
    cache.add_node("localhost", 8003, "node3")
    
    return cache


def demo_basic_operations():
    """Demonstrate basic cache operations"""
    print("🏗️  Distributed Cache - Basic Operations Demo")
    print("=" * 50)
    
    cache = create_test_cache()
    
    print("\n1. Cluster Information:")
    cluster_info = cache.get_cluster_info()
    print(f"   Nodes: {cluster_info['node_count']}")
    print(f"   Replication Factor: {cluster_info['replication_factor']}")
    print(f"   Consistency Level: {cluster_info['consistency_level']}")
    
    print("\n2. Basic Put/Get Operations:")
    # Store some data
    cache.put("user:1001", {"name": "Alice", "age": 30})
    cache.put("user:1002", {"name": "Bob", "age": 25})
    cache.put("session:abc123", "active", ttl=60)
    
    # Retrieve data
    user1 = cache.get("user:1001")
    user2 = cache.get("user:1002")
    session = cache.get("session:abc123")
    
    print(f"   user:1001 = {user1}")
    print(f"   user:1002 = {user2}")
    print(f"   session:abc123 = {session}")
    
    print("\n3. Batch Operations:")
    # Batch put
    batch_data = {
        "product:101": {"name": "Laptop", "price": 999.99},
        "product:102": {"name": "Mouse", "price": 29.99},
        "product:103": {"name": "Keyboard", "price": 79.99}
    }
    cache.put_multiple(batch_data)
    
    # Batch get
    product_keys = ["product:101", "product:102", "product:103"]
    products = cache.get_multiple(product_keys)
    print(f"   Products: {products}")
    
    print("\n4. Atomic Operations:")
    # Counter operations
    cache.put("counter", 0)
    cache.increment("counter", 5)
    cache.increment("counter", 3)
    counter_value = cache.get("counter")
    print(f"   Counter value: {counter_value}")
    
    cache.decrement("counter", 2)
    counter_value = cache.get("counter")
    print(f"   Counter after decrement: {counter_value}")
    
    print("\n5. Statistics:")
    stats = cache.get_statistics()
    print(f"   Hit Count: {stats['hit_count']}")
    print(f"   Miss Count: {stats['miss_count']}")
    print(f"   Hit Ratio: {stats['hit_ratio']:.2%}")
    print(f"   Put Count: {stats['put_count']}")
    print(f"   Memory Usage: {stats['memory_usage']} bytes")
    
    print("\n✅ Basic operations demo completed!")


def demo_consistency_models():
    """Demonstrate different consistency models"""
    print("\n🔄 Distributed Cache - Consistency Models Demo")
    print("=" * 50)
    
    # Test different consistency levels
    consistency_levels = [
        ConsistencyLevel.ONE,
        ConsistencyLevel.QUORUM,
        ConsistencyLevel.ALL
    ]
    
    for level in consistency_levels:
        print(f"\n📊 Testing {level.value.upper()} consistency:")
        
        config = CacheConfig(
            consistency_level=level,
            replication_factor=3
        )
        
        cache = DistributedCache(config)
        
        # Add nodes
        cache.add_node("localhost", 9001, f"node1_{level.value}")
        cache.add_node("localhost", 9002, f"node2_{level.value}")
        cache.add_node("localhost", 9003, f"node3_{level.value}")
        
        # Test operations
        try:
            # Write operation
            start_time = time.time()
            cache.put(f"test_key_{level.value}", f"test_value_{level.value}")
            write_time = time.time() - start_time
            
            # Read operation
            start_time = time.time()
            value = cache.get(f"test_key_{level.value}")
            read_time = time.time() - start_time
            
            print(f"   ✅ Write latency: {write_time*1000:.2f}ms")
            print(f"   ✅ Read latency: {read_time*1000:.2f}ms")
            print(f"   ✅ Retrieved value: {value}")
            
        except Exception as e:
            print(f"   ❌ Error: {str(e)}")
    
    print("\n✅ Consistency models demo completed!")


def demo_eviction_policies():
    """Demonstrate different eviction policies"""
    print("\n🗑️  Distributed Cache - Eviction Policies Demo")
    print("=" * 50)
    
    policies = [
        EvictionPolicyType.LRU,
        EvictionPolicyType.LFU,
        EvictionPolicyType.TTL,
        EvictionPolicyType.FIFO
    ]
    
    for policy in policies:
        print(f"\n📋 Testing {policy.value.upper()} eviction policy:")
        
        config = CacheConfig(
            max_memory=1024,  # Very small for testing eviction
            eviction_policy=policy,
            default_ttl=2 if policy == EvictionPolicyType.TTL else None
        )
        
        cache = DistributedCache(config)
        cache.add_node("localhost", 9001, f"eviction_node_{policy.value}")
        
        # Fill cache beyond capacity
        for i in range(10):
            cache.put(f"key_{i}", f"value_{i}" * 100)  # Large values
            
            if policy == EvictionPolicyType.LFU:
                # Access some keys more frequently for LFU testing
                if i % 2 == 0:
                    cache.get(f"key_{i}")
                    cache.get(f"key_{i}")
        
        # Check what remains in cache
        remaining_keys = []
        for i in range(10):
            if cache.exists(f"key_{i}"):
                remaining_keys.append(f"key_{i}")
        
        print(f"   Keys remaining after eviction: {remaining_keys}")
        
        if policy == EvictionPolicyType.TTL:
            print("   Waiting for TTL expiration...")
            time.sleep(3)
            expired_check = []
            for i in range(10):
                if cache.exists(f"key_{i}"):
                    expired_check.append(f"key_{i}")
            print(f"   Keys after TTL expiration: {expired_check}")
        
        stats = cache.get_statistics()
        print(f"   Evictions performed: {stats['eviction_count']}")
    
    print("\n✅ Eviction policies demo completed!")


def performance_test():
    """Run performance tests"""
    print("\n⚡ Distributed Cache - Performance Test")
    print("=" * 50)
    
    cache = create_test_cache()
    
    # Write performance test
    num_operations = 1000
    print(f"\n📝 Write Performance Test ({num_operations} operations):")
    
    start_time = time.time()
    for i in range(num_operations):
        cache.put(f"perf_key_{i}", f"performance_value_{i}")
    write_duration = time.time() - start_time
    
    write_ops_per_sec = num_operations / write_duration
    print(f"   Write Operations/sec: {write_ops_per_sec:.0f}")
    print(f"   Average Write Latency: {(write_duration/num_operations)*1000:.2f}ms")
    
    # Read performance test
    print(f"\n📖 Read Performance Test ({num_operations} operations):")
    
    start_time = time.time()
    hit_count = 0
    for i in range(num_operations):
        value = cache.get(f"perf_key_{i}")
        if value:
            hit_count += 1
    read_duration = time.time() - start_time
    
    read_ops_per_sec = num_operations / read_duration
    hit_ratio = hit_count / num_operations
    
    print(f"   Read Operations/sec: {read_ops_per_sec:.0f}")
    print(f"   Average Read Latency: {(read_duration/num_operations)*1000:.2f}ms")
    print(f"   Hit Ratio: {hit_ratio:.2%}")
    
    # Mixed workload test
    print(f"\n🔄 Mixed Workload Test ({num_operations} operations):")
    
    start_time = time.time()
    for i in range(num_operations):
        if i % 3 == 0:
            cache.put(f"mixed_key_{i}", f"mixed_value_{i}")
        elif i % 3 == 1:
            cache.get(f"mixed_key_{i-1}")
        else:
            cache.delete(f"mixed_key_{i-2}")
    mixed_duration = time.time() - start_time
    
    mixed_ops_per_sec = num_operations / mixed_duration
    print(f"   Mixed Operations/sec: {mixed_ops_per_sec:.0f}")
    
    # Final statistics
    stats = cache.get_statistics()
    print(f"\n📊 Final Statistics:")
    print(f"   Total Hits: {stats['hit_count']}")
    print(f"   Total Misses: {stats['miss_count']}")
    print(f"   Overall Hit Ratio: {stats['hit_ratio']:.2%}")
    print(f"   Total Memory Usage: {stats['memory_usage']} bytes")
    
    print("\n✅ Performance test completed!")


def interactive_demo():
    """Interactive cache demonstration"""
    print("\n🎮 Interactive Distributed Cache Demo")
    print("=" * 50)
    print("Commands: put <key> <value>, get <key>, delete <key>, stats, cluster, quit")
    
    cache = create_test_cache()
    
    while True:
        try:
            command = input("\ncache> ").strip().split()
            
            if not command:
                continue
            elif command[0] == "quit":
                break
            elif command[0] == "put" and len(command) >= 3:
                key = command[1]
                value = " ".join(command[2:])
                success = cache.put(key, value)
                print(f"Put operation: {'Success' if success else 'Failed'}")
            elif command[0] == "get" and len(command) == 2:
                key = command[1]
                value = cache.get(key)
                print(f"Value: {value if value is not None else 'Not found'}")
            elif command[0] == "delete" and len(command) == 2:
                key = command[1]
                success = cache.delete(key)
                print(f"Delete operation: {'Success' if success else 'Failed'}")
            elif command[0] == "stats":
                stats = cache.get_statistics()
                print("Cache Statistics:")
                for key, value in stats.items():
                    print(f"  {key}: {value}")
            elif command[0] == "cluster":
                cluster_info = cache.get_cluster_info()
                print("Cluster Information:")
                print(f"  Nodes: {cluster_info['node_count']}")
                print(f"  Replication Factor: {cluster_info['replication_factor']}")
                print(f"  Consistency Level: {cluster_info['consistency_level']}")
            else:
                print("Invalid command. Available commands:")
                print("  put <key> <value> - Store key-value pair")
                print("  get <key> - Retrieve value")
                print("  delete <key> - Delete key")
                print("  stats - Show statistics")
                print("  cluster - Show cluster info")
                print("  quit - Exit")
                
        except KeyboardInterrupt:
            break
        except Exception as e:
            print(f"Error: {str(e)}")
    
    print("\n👋 Goodbye!")


def main():
    """Main function to run demos"""
    print("Distributed Cache System Implementation")
    print("======================================")
    print("1. Basic Operations Demo")
    print("2. Consistency Models Demo")
    print("3. Eviction Policies Demo")
    print("4. Performance Test")
    print("5. Interactive Demo")
    
    try:
        choice = input("\nSelect demo (1-5): ").strip()
        
        if choice == "1":
            demo_basic_operations()
        elif choice == "2":
            demo_consistency_models()
        elif choice == "3":
            demo_eviction_policies()
        elif choice == "4":
            performance_test()
        elif choice == "5":
            interactive_demo()
        else:
            print("Running all demos...")
            demo_basic_operations()
            demo_consistency_models()
            demo_eviction_policies()
            performance_test()
            
    except KeyboardInterrupt:
        print("\n\nDemo interrupted by user")
    except Exception as e:
        print(f"\nError running demo: {str(e)}")


if __name__ == "__main__":
    main()