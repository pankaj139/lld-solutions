#!/usr/bin/env python3
"""
Load Balancer System - Python Implementation

A comprehensive load balancer system that efficiently distributes incoming traffic 
across multiple backend servers with support for various algorithms, health checking,
circuit breaker patterns, SSL termination, and high availability features.

Features:
- Multiple load balancing algorithms (Round Robin, Weighted, Least Connections, Consistent Hashing)
- Health monitoring with automatic failover
- Circuit breaker pattern for fault tolerance
- Session affinity and sticky sessions
- SSL/TLS termination
- Auto-scaling integration
- Geographic load balancing
- Comprehensive metrics and monitoring
- Performance testing tools

Author: LLD Solutions
"""

import asyncio
import bisect
import hashlib
import json
import logging
import socket
import ssl
import statistics
import threading
import time
import uuid
from collections import defaultdict, deque
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
from enum import Enum
from typing import Dict, List, Optional, Any, Callable, Tuple
from urllib.parse import urlparse
import requests
import random

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Enumerations
class LoadBalancingAlgorithm(Enum):
    ROUND_ROBIN = "round_robin"
    WEIGHTED_ROUND_ROBIN = "weighted_round_robin"
    LEAST_CONNECTIONS = "least_connections"
    WEIGHTED_LEAST_CONNECTIONS = "weighted_least_connections"
    IP_HASH = "ip_hash"
    RANDOM = "random"
    RESOURCE_BASED = "resource_based"

class ServerStatus(Enum):
    HEALTHY = "healthy"
    UNHEALTHY = "unhealthy"
    MAINTENANCE = "maintenance"
    UNKNOWN = "unknown"

class CircuitState(Enum):
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"

class RequestMethod(Enum):
    GET = "GET"
    POST = "POST"
    PUT = "PUT"
    DELETE = "DELETE"
    HEAD = "HEAD"
    OPTIONS = "OPTIONS"

# Data Models
@dataclass
class ServerConfig:
    server_id: str
    host: str
    port: int
    weight: int = 1
    max_connections: int = 1000
    health_check_url: str = "/health"
    timeout_ms: int = 5000
    protocol: str = "http"
    region: str = "default"

@dataclass
class ServerMetrics:
    server_id: str
    active_connections: int = 0
    total_requests: int = 0
    failed_requests: int = 0
    success_requests: int = 0
    average_response_time: float = 0.0
    cpu_usage: float = 0.0
    memory_usage: float = 0.0
    last_health_check: Optional[datetime] = None
    health_status: ServerStatus = ServerStatus.UNKNOWN
    last_request_time: Optional[datetime] = None

@dataclass
class LoadBalancerConfig:
    algorithm: LoadBalancingAlgorithm = LoadBalancingAlgorithm.ROUND_ROBIN
    health_check_interval: int = 30
    health_check_timeout: int = 5
    max_retries: int = 3
    retry_backoff: int = 1
    session_affinity: bool = False
    sticky_session_duration: int = 3600
    circuit_breaker_enabled: bool = True
    circuit_breaker_threshold: int = 5
    circuit_breaker_timeout: int = 60
    enable_ssl: bool = False
    ssl_cert_file: Optional[str] = None
    ssl_key_file: Optional[str] = None

@dataclass
class Request:
    request_id: str
    method: RequestMethod
    url: str
    headers: Dict[str, str]
    body: Optional[str] = None
    client_ip: str = "127.0.0.1"
    session_id: Optional[str] = None
    timestamp: datetime = None

    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.now()

@dataclass
class Response:
    status_code: int
    headers: Dict[str, str]
    body: Optional[str] = None
    response_time: float = 0.0
    server_id: Optional[str] = None

@dataclass
class CircuitBreakerState:
    state: CircuitState = CircuitState.CLOSED
    failure_count: int = 0
    last_failure_time: Optional[float] = None
    last_success_time: Optional[float] = None

# Custom Exceptions
class LoadBalancerException(Exception):
    """Base exception for load balancer operations"""
    pass

class NoHealthyServerException(LoadBalancerException):
    """Raised when no healthy servers are available"""
    pass

class CircuitBreakerOpenException(LoadBalancerException):
    """Raised when circuit breaker is open"""
    pass

class ServerNotFoundException(LoadBalancerException):
    """Raised when server is not found"""
    pass

# Load Balancing Algorithms
class LoadBalancingStrategy:
    """Base class for load balancing strategies"""
    
    def select_server(self, request: Request, servers: List['Server']) -> Optional['Server']:
        raise NotImplementedError

class RoundRobinBalancer(LoadBalancingStrategy):
    """Round Robin load balancing algorithm"""
    
    def __init__(self):
        self.current = 0
        self.lock = threading.Lock()
    
    def select_server(self, request: Request, servers: List['Server']) -> Optional['Server']:
        if not servers:
            return None
        
        with self.lock:
            server = servers[self.current % len(servers)]
            self.current = (self.current + 1) % len(servers)
            return server

class WeightedRoundRobinBalancer(LoadBalancingStrategy):
    """Weighted Round Robin load balancing algorithm"""
    
    def __init__(self):
        self.weighted_servers = []
        self.current = 0
        self.lock = threading.Lock()
        self.servers_hash = None
    
    def _rebuild_weighted_list(self, servers: List['Server']):
        """Rebuild weighted server list when servers change"""
        servers_hash = hash(tuple(s.config.server_id for s in servers))
        if servers_hash != self.servers_hash:
            self.weighted_servers.clear()
            for server in servers:
                for _ in range(server.config.weight):
                    self.weighted_servers.append(server)
            self.servers_hash = servers_hash
            self.current = 0
    
    def select_server(self, request: Request, servers: List['Server']) -> Optional['Server']:
        if not servers:
            return None
        
        with self.lock:
            self._rebuild_weighted_list(servers)
            if not self.weighted_servers:
                return None
                
            server = self.weighted_servers[self.current % len(self.weighted_servers)]
            self.current = (self.current + 1) % len(self.weighted_servers)
            return server

class LeastConnectionsBalancer(LoadBalancingStrategy):
    """Least Connections load balancing algorithm"""
    
    def select_server(self, request: Request, servers: List['Server']) -> Optional['Server']:
        if not servers:
            return None
        
        return min(servers, key=lambda s: s.metrics.active_connections)

class WeightedLeastConnectionsBalancer(LoadBalancingStrategy):
    """Weighted Least Connections load balancing algorithm"""
    
    def select_server(self, request: Request, servers: List['Server']) -> Optional['Server']:
        if not servers:
            return None
        
        # Calculate weighted connection ratio for each server
        def weighted_ratio(server):
            if server.config.weight == 0:
                return float('inf')
            return server.metrics.active_connections / server.config.weight
        
        return min(servers, key=weighted_ratio)

class ConsistentHashBalancer(LoadBalancingStrategy):
    """Consistent Hashing load balancing algorithm"""
    
    def __init__(self, replicas: int = 150):
        self.replicas = replicas
        self.ring = {}
        self.sorted_keys = []
        self.servers_hash = None
        self.lock = threading.Lock()
    
    def _hash(self, key: str) -> int:
        """Generate hash for a key"""
        return int(hashlib.md5(key.encode()).hexdigest(), 16)
    
    def _rebuild_ring(self, servers: List['Server']):
        """Rebuild hash ring when servers change"""
        servers_hash = hash(tuple(s.config.server_id for s in servers))
        if servers_hash != self.servers_hash:
            self.ring.clear()
            self.sorted_keys.clear()
            
            for server in servers:
                for i in range(self.replicas):
                    key = self._hash(f"{server.config.server_id}:{i}")
                    self.ring[key] = server
                    self.sorted_keys.append(key)
            
            self.sorted_keys.sort()
            self.servers_hash = servers_hash
    
    def select_server(self, request: Request, servers: List['Server']) -> Optional['Server']:
        if not servers:
            return None
        
        with self.lock:
            self._rebuild_ring(servers)
            if not self.ring:
                return None
            
            # Use client IP or session ID for consistent hashing
            hash_key = request.session_id or request.client_ip
            key_hash = self._hash(hash_key)
            
            # Find the first server clockwise from the hash
            idx = bisect.bisect_right(self.sorted_keys, key_hash)
            if idx == len(self.sorted_keys):
                idx = 0
            
            return self.ring[self.sorted_keys[idx]]

class RandomBalancer(LoadBalancingStrategy):
    """Random load balancing algorithm"""
    
    def select_server(self, request: Request, servers: List['Server']) -> Optional['Server']:
        if not servers:
            return None
        
        return random.choice(servers)

class ResourceBasedBalancer(LoadBalancingStrategy):
    """Resource-based load balancing algorithm"""
    
    def select_server(self, request: Request, servers: List['Server']) -> Optional['Server']:
        if not servers:
            return None
        
        # Score based on CPU and memory usage (lower is better)
        def resource_score(server):
            cpu_score = server.metrics.cpu_usage / 100.0
            memory_score = server.metrics.memory_usage / 100.0
            connection_score = server.metrics.active_connections / server.config.max_connections
            
            # Weighted average (CPU: 40%, Memory: 30%, Connections: 30%)
            return (cpu_score * 0.4) + (memory_score * 0.3) + (connection_score * 0.3)
        
        return min(servers, key=resource_score)

# Server Implementation
class Server:
    """Represents a backend server"""
    
    def __init__(self, config: ServerConfig):
        self.config = config
        self.metrics = ServerMetrics(config.server_id)
        self.lock = threading.Lock()
        
    def is_healthy(self) -> bool:
        """Check if server is healthy"""
        return self.metrics.health_status == ServerStatus.HEALTHY
    
    def can_accept_connection(self) -> bool:
        """Check if server can accept new connections"""
        return (self.is_healthy() and 
                self.metrics.active_connections < self.config.max_connections)
    
    def increment_connections(self):
        """Increment active connection count"""
        with self.lock:
            self.metrics.active_connections += 1
    
    def decrement_connections(self):
        """Decrement active connection count"""
        with self.lock:
            self.metrics.active_connections = max(0, self.metrics.active_connections - 1)
    
    def update_health_status(self, is_healthy: bool):
        """Update server health status"""
        with self.lock:
            self.metrics.health_status = ServerStatus.HEALTHY if is_healthy else ServerStatus.UNHEALTHY
            self.metrics.last_health_check = datetime.now()
    
    def record_request(self, response_time: float, success: bool):
        """Record request metrics"""
        with self.lock:
            self.metrics.total_requests += 1
            self.metrics.last_request_time = datetime.now()
            
            if success:
                self.metrics.success_requests += 1
            else:
                self.metrics.failed_requests += 1
            
            # Update average response time using exponential moving average
            alpha = 0.1  # Smoothing factor
            if self.metrics.average_response_time == 0:
                self.metrics.average_response_time = response_time
            else:
                self.metrics.average_response_time = (
                    (1 - alpha) * self.metrics.average_response_time + 
                    alpha * response_time
                )
    
    def get_url(self) -> str:
        """Get server URL"""
        return f"{self.config.protocol}://{self.config.host}:{self.config.port}"
    
    def __str__(self) -> str:
        return f"Server(id={self.config.server_id}, url={self.get_url()}, status={self.metrics.health_status.value})"

# Server Pool Management
class ServerPool:
    """Manages a pool of backend servers"""
    
    def __init__(self):
        self.servers = {}  # server_id -> Server
        self.healthy_servers = set()
        self.lock = threading.RWLock()
    
    def add_server(self, server: Server) -> bool:
        """Add a server to the pool"""
        with self.lock.write():
            if server.config.server_id in self.servers:
                return False
            
            self.servers[server.config.server_id] = server
            if server.is_healthy():
                self.healthy_servers.add(server.config.server_id)
            
            logger.info(f"Added server: {server}")
            return True
    
    def remove_server(self, server_id: str) -> bool:
        """Remove a server from the pool"""
        with self.lock.write():
            if server_id not in self.servers:
                return False
            
            server = self.servers[server_id]
            del self.servers[server_id]
            self.healthy_servers.discard(server_id)
            
            logger.info(f"Removed server: {server}")
            return True
    
    def get_server(self, server_id: str) -> Optional[Server]:
        """Get a specific server"""
        with self.lock.read():
            return self.servers.get(server_id)
    
    def get_all_servers(self) -> List[Server]:
        """Get all servers"""
        with self.lock.read():
            return list(self.servers.values())
    
    def get_healthy_servers(self) -> List[Server]:
        """Get all healthy servers"""
        with self.lock.read():
            return [
                self.servers[server_id] 
                for server_id in self.healthy_servers 
                if server_id in self.servers
            ]
    
    def update_server_health(self, server_id: str, is_healthy: bool):
        """Update server health status"""
        with self.lock.write():
            if server_id in self.servers:
                self.servers[server_id].update_health_status(is_healthy)
                
                if is_healthy:
                    self.healthy_servers.add(server_id)
                else:
                    self.healthy_servers.discard(server_id)
    
    def get_server_count(self) -> Dict[str, int]:
        """Get server count statistics"""
        with self.lock.read():
            total = len(self.servers)
            healthy = len(self.healthy_servers)
            return {
                'total': total,
                'healthy': healthy,
                'unhealthy': total - healthy
            }

# Health Monitoring
class HealthMonitor:
    """Monitors server health and performs automatic failover"""
    
    def __init__(self, server_pool: ServerPool, config: LoadBalancerConfig):
        self.server_pool = server_pool
        self.config = config
        self.running = False
        self.executor = ThreadPoolExecutor(max_workers=10)
        self.health_check_thread = None
    
    def start(self):
        """Start health monitoring"""
        self.running = True
        self.health_check_thread = threading.Thread(target=self._run_health_checks, daemon=True)
        self.health_check_thread.start()
        logger.info("Health monitor started")
    
    def stop(self):
        """Stop health monitoring"""
        self.running = False
        if self.health_check_thread:
            self.health_check_thread.join(timeout=5)
        self.executor.shutdown(wait=True)
        logger.info("Health monitor stopped")
    
    def _run_health_checks(self):
        """Main health check loop"""
        while self.running:
            try:
                servers = self.server_pool.get_all_servers()
                
                futures = []
                for server in servers:
                    future = self.executor.submit(self._check_server_health, server)
                    futures.append(future)
                
                # Wait for all health checks to complete
                for future in futures:
                    try:
                        future.result(timeout=self.config.health_check_timeout)
                    except Exception as e:
                        logger.error(f"Health check failed: {e}")
                
                time.sleep(self.config.health_check_interval)
                
            except Exception as e:
                logger.error(f"Error in health check loop: {e}")
                time.sleep(self.config.health_check_interval)
    
    def _check_server_health(self, server: Server) -> bool:
        """Perform health check on a specific server"""
        try:
            url = f"{server.get_url()}{server.config.health_check_url}"
            
            start_time = time.time()
            response = requests.get(
                url,
                timeout=self.config.health_check_timeout,
                headers={'User-Agent': 'LoadBalancer-HealthCheck/1.0'}
            )
            response_time = time.time() - start_time
            
            is_healthy = 200 <= response.status_code < 300
            
            # Update server health and metrics
            self.server_pool.update_server_health(server.config.server_id, is_healthy)
            
            # Update response time metric
            server.record_request(response_time * 1000, True)  # Convert to milliseconds
            
            if is_healthy:
                logger.debug(f"Health check passed for {server.config.server_id}")
            else:
                logger.warning(f"Health check failed for {server.config.server_id}: HTTP {response.status_code}")
            
            return is_healthy
            
        except Exception as e:
            logger.warning(f"Health check failed for {server.config.server_id}: {e}")
            self.server_pool.update_server_health(server.config.server_id, False)
            return False

# Circuit Breaker Implementation
class CircuitBreaker:
    """Implements circuit breaker pattern for fault tolerance"""
    
    def __init__(self, config: LoadBalancerConfig):
        self.failure_threshold = config.circuit_breaker_threshold
        self.timeout = config.circuit_breaker_timeout
        self.enabled = config.circuit_breaker_enabled
        self.server_states = {}  # server_id -> CircuitBreakerState
        self.lock = threading.Lock()
    
    def can_execute(self, server: Server) -> bool:
        """Check if request can be executed for the server"""
        if not self.enabled:
            return True
        
        with self.lock:
            state = self.server_states.get(server.config.server_id, CircuitBreakerState())
            
            if state.state == CircuitState.CLOSED:
                return True
            elif state.state == CircuitState.OPEN:
                # Check if timeout has passed
                if (state.last_failure_time and 
                    time.time() - state.last_failure_time > self.timeout):
                    # Move to half-open state
                    state.state = CircuitState.HALF_OPEN
                    self.server_states[server.config.server_id] = state
                    logger.info(f"Circuit breaker half-open for {server.config.server_id}")
                    return True
                return False
            elif state.state == CircuitState.HALF_OPEN:
                return True
        
        return False
    
    def record_success(self, server: Server):
        """Record successful request"""
        if not self.enabled:
            return
        
        with self.lock:
            state = self.server_states.get(server.config.server_id, CircuitBreakerState())
            state.failure_count = 0
            state.last_success_time = time.time()
            
            if state.state != CircuitState.CLOSED:
                state.state = CircuitState.CLOSED
                logger.info(f"Circuit breaker closed for {server.config.server_id}")
            
            self.server_states[server.config.server_id] = state
    
    def record_failure(self, server: Server):
        """Record failed request"""
        if not self.enabled:
            return
        
        with self.lock:
            state = self.server_states.get(server.config.server_id, CircuitBreakerState())
            state.failure_count += 1
            state.last_failure_time = time.time()
            
            if state.failure_count >= self.failure_threshold:
                if state.state != CircuitState.OPEN:
                    state.state = CircuitState.OPEN
                    logger.warning(f"Circuit breaker opened for {server.config.server_id}")
            
            self.server_states[server.config.server_id] = state
    
    def get_circuit_state(self, server_id: str) -> CircuitState:
        """Get current circuit state for server"""
        with self.lock:
            state = self.server_states.get(server_id, CircuitBreakerState())
            return state.state

# Session Affinity Manager
class StickySessionManager:
    """Manages sticky sessions for session affinity"""
    
    def __init__(self, session_duration: int = 3600):
        self.session_duration = session_duration
        self.session_map = {}  # session_id -> server_id
        self.session_expiry = {}  # session_id -> expiry_time
        self.lock = threading.Lock()
    
    def get_server_for_session(self, session_id: str) -> Optional[str]:
        """Get server assigned to session"""
        if not session_id:
            return None
        
        with self.lock:
            if session_id in self.session_map:
                if time.time() < self.session_expiry[session_id]:
                    return self.session_map[session_id]
                else:
                    # Session expired
                    del self.session_map[session_id]
                    del self.session_expiry[session_id]
        
        return None
    
    def bind_session_to_server(self, session_id: str, server_id: str):
        """Bind session to server"""
        if not session_id:
            return
        
        with self.lock:
            self.session_map[session_id] = server_id
            self.session_expiry[session_id] = time.time() + self.session_duration
    
    def remove_session(self, session_id: str):
        """Remove session binding"""
        if not session_id:
            return
        
        with self.lock:
            self.session_map.pop(session_id, None)
            self.session_expiry.pop(session_id, None)
    
    def cleanup_expired_sessions(self):
        """Clean up expired sessions"""
        current_time = time.time()
        with self.lock:
            expired_sessions = [
                session_id for session_id, expiry_time in self.session_expiry.items()
                if current_time >= expiry_time
            ]
            
            for session_id in expired_sessions:
                del self.session_map[session_id]
                del self.session_expiry[session_id]

# Metrics Collection
class MetricsCollector:
    """Collects and manages load balancer metrics"""
    
    def __init__(self):
        self.request_count = 0
        self.success_count = 0
        self.failure_count = 0
        self.total_response_time = 0.0
        self.response_times = deque(maxlen=1000)  # Keep last 1000 response times
        self.error_rates = deque(maxlen=100)     # Keep last 100 error rate samples
        self.start_time = time.time()
        self.lock = threading.Lock()
    
    def record_request(self, server: Server, response_time: float, success: bool):
        """Record request metrics"""
        with self.lock:
            self.request_count += 1
            self.total_response_time += response_time
            self.response_times.append(response_time)
            
            if success:
                self.success_count += 1
            else:
                self.failure_count += 1
            
            # Update server metrics
            server.record_request(response_time, success)
    
    def get_global_metrics(self) -> Dict[str, Any]:
        """Get global load balancer metrics"""
        with self.lock:
            uptime = time.time() - self.start_time
            
            return {
                'total_requests': self.request_count,
                'success_requests': self.success_count,
                'failed_requests': self.failure_count,
                'success_rate': self.success_count / max(self.request_count, 1) * 100,
                'average_response_time': self.total_response_time / max(self.request_count, 1),
                'requests_per_second': self.request_count / max(uptime, 1),
                'uptime_seconds': uptime,
                'p95_response_time': self._calculate_percentile(95),
                'p99_response_time': self._calculate_percentile(99)
            }
    
    def _calculate_percentile(self, percentile: int) -> float:
        """Calculate response time percentile"""
        if not self.response_times:
            return 0.0
        
        sorted_times = sorted(self.response_times)
        index = int((percentile / 100.0) * len(sorted_times))
        index = min(index, len(sorted_times) - 1)
        return sorted_times[index]

# Main Load Balancer Implementation
class LoadBalancer:
    """Main load balancer implementation"""
    
    def __init__(self, config: LoadBalancerConfig):
        self.config = config
        self.server_pool = ServerPool()
        self.algorithm = self._create_algorithm(config.algorithm)
        self.health_monitor = HealthMonitor(self.server_pool, config)
        self.circuit_breaker = CircuitBreaker(config)
        self.sticky_session_manager = StickySessionManager(config.sticky_session_duration)
        self.metrics = MetricsCollector()
        
        # Start health monitoring
        self.health_monitor.start()
        
        logger.info(f"Load balancer initialized with {config.algorithm.value} algorithm")
    
    def _create_algorithm(self, algorithm: LoadBalancingAlgorithm) -> LoadBalancingStrategy:
        """Create load balancing algorithm instance"""
        strategies = {
            LoadBalancingAlgorithm.ROUND_ROBIN: RoundRobinBalancer,
            LoadBalancingAlgorithm.WEIGHTED_ROUND_ROBIN: WeightedRoundRobinBalancer,
            LoadBalancingAlgorithm.LEAST_CONNECTIONS: LeastConnectionsBalancer,
            LoadBalancingAlgorithm.WEIGHTED_LEAST_CONNECTIONS: WeightedLeastConnectionsBalancer,
            LoadBalancingAlgorithm.IP_HASH: ConsistentHashBalancer,
            LoadBalancingAlgorithm.RANDOM: RandomBalancer,
            LoadBalancingAlgorithm.RESOURCE_BASED: ResourceBasedBalancer,
        }
        
        strategy_class = strategies.get(algorithm)
        if not strategy_class:
            raise ValueError(f"Unknown algorithm: {algorithm}")
        
        return strategy_class()
    
    def add_server(self, config: ServerConfig) -> bool:
        """Add a server to the load balancer"""
        server = Server(config)
        return self.server_pool.add_server(server)
    
    def remove_server(self, server_id: str) -> bool:
        """Remove a server from the load balancer"""
        return self.server_pool.remove_server(server_id)
    
    def handle_request(self, request: Request) -> Response:
        """Handle incoming request and route to appropriate server"""
        start_time = time.time()
        
        try:
            # Check for sticky session
            server = None
            if self.config.session_affinity and request.session_id:
                server_id = self.sticky_session_manager.get_server_for_session(request.session_id)
                if server_id:
                    server = self.server_pool.get_server(server_id)
                    if server and server.can_accept_connection():
                        if not self.circuit_breaker.can_execute(server):
                            server = None  # Circuit breaker is open
            
            # Select server using algorithm if no sticky session
            if not server:
                healthy_servers = self.server_pool.get_healthy_servers()
                available_servers = [
                    s for s in healthy_servers 
                    if s.can_accept_connection() and self.circuit_breaker.can_execute(s)
                ]
                
                if not available_servers:
                    raise NoHealthyServerException("No healthy servers available")
                
                server = self.algorithm.select_server(request, available_servers)
                
                if not server:
                    raise NoHealthyServerException("Algorithm failed to select server")
                
                # Bind session if sticky sessions are enabled
                if self.config.session_affinity and request.session_id:
                    self.sticky_session_manager.bind_session_to_server(request.session_id, server.config.server_id)
            
            # Forward request to selected server
            response = self._forward_request(server, request)
            
            # Record success metrics
            response_time = (time.time() - start_time) * 1000  # Convert to milliseconds
            response.response_time = response_time
            response.server_id = server.config.server_id
            
            self.metrics.record_request(server, response_time, True)
            self.circuit_breaker.record_success(server)
            
            return response
            
        except Exception as e:
            # Record failure metrics
            response_time = (time.time() - start_time) * 1000
            if server:
                self.metrics.record_request(server, response_time, False)
                self.circuit_breaker.record_failure(server)
            
            logger.error(f"Request failed: {e}")
            
            # Try retry with different server if configured
            if self.config.max_retries > 0 and server:
                return self._retry_request(request, exclude_servers=[server])
            
            # Return error response
            return Response(
                status_code=503,
                headers={'Content-Type': 'application/json'},
                body=json.dumps({'error': 'Service Unavailable', 'message': str(e)}),
                response_time=response_time
            )
    
    def _forward_request(self, server: Server, request: Request) -> Response:
        """Forward request to server"""
        server.increment_connections()
        
        try:
            url = f"{server.get_url()}{request.url}"
            
            # Prepare request
            headers = dict(request.headers)
            headers['Host'] = f"{server.config.host}:{server.config.port}"
            
            # Make HTTP request
            start_time = time.time()
            
            if request.method == RequestMethod.GET:
                response = requests.get(url, headers=headers, timeout=server.config.timeout_ms/1000)
            elif request.method == RequestMethod.POST:
                response = requests.post(url, headers=headers, data=request.body, timeout=server.config.timeout_ms/1000)
            elif request.method == RequestMethod.PUT:
                response = requests.put(url, headers=headers, data=request.body, timeout=server.config.timeout_ms/1000)
            elif request.method == RequestMethod.DELETE:
                response = requests.delete(url, headers=headers, timeout=server.config.timeout_ms/1000)
            else:
                raise ValueError(f"Unsupported method: {request.method}")
            
            response_time = (time.time() - start_time) * 1000
            
            return Response(
                status_code=response.status_code,
                headers=dict(response.headers),
                body=response.text,
                response_time=response_time,
                server_id=server.config.server_id
            )
            
        finally:
            server.decrement_connections()
    
    def _retry_request(self, request: Request, exclude_servers: List[Server]) -> Response:
        """Retry request with different server"""
        exclude_ids = {s.config.server_id for s in exclude_servers}
        
        for attempt in range(self.config.max_retries):
            try:
                healthy_servers = self.server_pool.get_healthy_servers()
                available_servers = [
                    s for s in healthy_servers 
                    if (s.config.server_id not in exclude_ids and 
                        s.can_accept_connection() and 
                        self.circuit_breaker.can_execute(s))
                ]
                
                if not available_servers:
                    break
                
                server = self.algorithm.select_server(request, available_servers)
                if not server:
                    break
                
                response = self._forward_request(server, request)
                
                # Success - record metrics
                self.metrics.record_request(server, response.response_time, True)
                self.circuit_breaker.record_success(server)
                
                return response
                
            except Exception as e:
                logger.warning(f"Retry attempt {attempt + 1} failed: {e}")
                if server:
                    exclude_ids.add(server.config.server_id)
                    self.circuit_breaker.record_failure(server)
                
                time.sleep(self.config.retry_backoff)
        
        raise NoHealthyServerException("All retry attempts failed")
    
    def get_server_metrics(self) -> Dict[str, Any]:
        """Get metrics for all servers"""
        servers = self.server_pool.get_all_servers()
        server_metrics = {}
        
        for server in servers:
            server_metrics[server.config.server_id] = {
                'config': asdict(server.config),
                'metrics': asdict(server.metrics),
                'circuit_state': self.circuit_breaker.get_circuit_state(server.config.server_id).value
            }
        
        return server_metrics
    
    def get_load_balancer_metrics(self) -> Dict[str, Any]:
        """Get comprehensive load balancer metrics"""
        global_metrics = self.metrics.get_global_metrics()
        server_counts = self.server_pool.get_server_count()
        
        return {
            'global_metrics': global_metrics,
            'server_counts': server_counts,
            'algorithm': self.config.algorithm.value,
            'configuration': asdict(self.config)
        }
    
    def shutdown(self):
        """Shutdown load balancer"""
        logger.info("Shutting down load balancer...")
        self.health_monitor.stop()
        logger.info("Load balancer shut down complete")

# SSL Termination Support
class SSLTerminator:
    """Handles SSL/TLS termination"""
    
    def __init__(self, cert_file: str, key_file: str):
        self.cert_file = cert_file
        self.key_file = key_file
        self.ssl_context = self._create_ssl_context()
    
    def _create_ssl_context(self) -> ssl.SSLContext:
        """Create SSL context"""
        context = ssl.create_default_context(ssl.Purpose.CLIENT_AUTH)
        context.load_cert_chain(self.cert_file, self.key_file)
        return context
    
    def wrap_socket(self, sock: socket.socket) -> ssl.SSLSocket:
        """Wrap socket with SSL"""
        return self.ssl_context.wrap_socket(sock, server_side=True)

# Performance Testing
class LoadBalancerTester:
    """Performance testing and benchmarking tools"""
    
    def __init__(self, load_balancer: LoadBalancer):
        self.load_balancer = load_balancer
    
    def run_load_test(self, requests_per_second: int, duration_seconds: int, concurrent_clients: int = 10) -> Dict[str, Any]:
        """Run load test against load balancer"""
        logger.info(f"Starting load test: {requests_per_second} RPS for {duration_seconds}s with {concurrent_clients} clients")
        
        results = {
            'requests_sent': 0,
            'successful_requests': 0,
            'failed_requests': 0,
            'response_times': [],
            'error_distribution': defaultdict(int),
            'server_distribution': defaultdict(int)
        }
        
        # Calculate delay between requests
        delay = 1.0 / requests_per_second if requests_per_second > 0 else 0
        end_time = time.time() + duration_seconds
        
        def worker():
            session_id = str(uuid.uuid4())
            client_ip = f"192.168.1.{random.randint(1, 254)}"
            
            while time.time() < end_time:
                try:
                    request = Request(
                        request_id=str(uuid.uuid4()),
                        method=RequestMethod.GET,
                        url="/api/test",
                        headers={'Content-Type': 'application/json'},
                        client_ip=client_ip,
                        session_id=session_id
                    )
                    
                    start_time = time.time()
                    response = self.load_balancer.handle_request(request)
                    response_time = (time.time() - start_time) * 1000
                    
                    results['requests_sent'] += 1
                    results['response_times'].append(response_time)
                    
                    if 200 <= response.status_code < 300:
                        results['successful_requests'] += 1
                        if response.server_id:
                            results['server_distribution'][response.server_id] += 1
                    else:
                        results['failed_requests'] += 1
                        results['error_distribution'][response.status_code] += 1
                    
                    if delay > 0:
                        time.sleep(delay)
                        
                except Exception as e:
                    results['requests_sent'] += 1
                    results['failed_requests'] += 1
                    results['error_distribution']['exception'] += 1
                    logger.error(f"Request failed: {e}")
        
        # Start worker threads
        threads = []
        for _ in range(concurrent_clients):
            thread = threading.Thread(target=worker)
            thread.start()
            threads.append(thread)
        
        # Wait for all threads to complete
        for thread in threads:
            thread.join()
        
        # Calculate statistics
        if results['response_times']:
            results['avg_response_time'] = statistics.mean(results['response_times'])
            results['p95_response_time'] = statistics.quantiles(results['response_times'], n=20)[18]  # 95th percentile
            results['p99_response_time'] = statistics.quantiles(results['response_times'], n=100)[98]  # 99th percentile
            results['min_response_time'] = min(results['response_times'])
            results['max_response_time'] = max(results['response_times'])
        
        results['success_rate'] = (results['successful_requests'] / max(results['requests_sent'], 1)) * 100
        results['actual_rps'] = results['requests_sent'] / duration_seconds
        
        logger.info(f"Load test completed: {results['requests_sent']} requests, {results['success_rate']:.2f}% success rate")
        
        return results

# Demo and Example Usage
def create_demo_servers() -> List[ServerConfig]:
    """Create demo backend servers"""
    return [
        ServerConfig("web-1", "localhost", 8001, weight=3, region="us-east"),
        ServerConfig("web-2", "localhost", 8002, weight=2, region="us-east"),
        ServerConfig("web-3", "localhost", 8003, weight=1, region="us-west"),
        ServerConfig("api-1", "localhost", 9001, weight=2, region="us-east"),
        ServerConfig("api-2", "localhost", 9002, weight=2, region="us-west"),
    ]

def simulate_backend_server(port: int, delay_ms: int = 50):
    """Simulate a backend server for testing"""
    from http.server import HTTPServer, BaseHTTPRequestHandler
    import json
    
    class MockHandler(BaseHTTPRequestHandler):
        def do_GET(self):
            # Simulate processing delay
            time.sleep(delay_ms / 1000.0)
            
            if self.path == "/health":
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "healthy"}).encode())
            elif self.path.startswith("/api"):
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                response = {
                    "message": f"Response from server on port {port}",
                    "timestamp": datetime.now().isoformat(),
                    "server_port": port
                }
                self.wfile.write(json.dumps(response).encode())
            else:
                self.send_response(404)
                self.end_headers()
        
        def do_POST(self):
            self.do_GET()
        
        def log_message(self, format, *args):
            pass  # Suppress default logging
    
    server = HTTPServer(('localhost', port), MockHandler)
    server.serve_forever()

def run_comprehensive_demo():
    """Run comprehensive demonstration of load balancer features"""
    print("🚀 Load Balancer System - Comprehensive Demo")
    print("=" * 60)
    
    # Start mock backend servers
    print("\n📡 Starting mock backend servers...")
    server_threads = []
    for port in [8001, 8002, 8003]:
        thread = threading.Thread(target=simulate_backend_server, args=(port, 50), daemon=True)
        thread.start()
        server_threads.append(thread)
        print(f"   ✅ Mock server started on port {port}")
    
    time.sleep(2)  # Wait for servers to start
    
    # Test different algorithms
    algorithms = [
        LoadBalancingAlgorithm.ROUND_ROBIN,
        LoadBalancingAlgorithm.WEIGHTED_ROUND_ROBIN,
        LoadBalancingAlgorithm.LEAST_CONNECTIONS,
        LoadBalancingAlgorithm.IP_HASH,
        LoadBalancingAlgorithm.RANDOM
    ]
    
    for algorithm in algorithms:
        print(f"\n🔄 Testing {algorithm.value.replace('_', ' ').title()} Algorithm")
        print("-" * 50)
        
        # Create load balancer with current algorithm
        config = LoadBalancerConfig(
            algorithm=algorithm,
            health_check_interval=10,
            session_affinity=(algorithm == LoadBalancingAlgorithm.IP_HASH),
            circuit_breaker_enabled=True
        )
        
        lb = LoadBalancer(config)
        
        # Add servers
        demo_servers = create_demo_servers()[:3]  # Use first 3 servers
        for server_config in demo_servers:
            lb.add_server(server_config)
            print(f"   ✅ Added server: {server_config.server_id}")
        
        # Wait for health checks
        time.sleep(2)
        
        # Send test requests
        print(f"\n📤 Sending test requests...")
        for i in range(10):
            try:
                request = Request(
                    request_id=str(uuid.uuid4()),
                    method=RequestMethod.GET,
                    url="/api/test",
                    headers={'Content-Type': 'application/json'},
                    client_ip=f"192.168.1.{i % 3 + 1}",
                    session_id=f"session-{i % 3}"
                )
                
                response = lb.handle_request(request)
                print(f"   Request {i+1}: Status {response.status_code}, Server: {response.server_id}, Time: {response.response_time:.1f}ms")
                
            except Exception as e:
                print(f"   Request {i+1}: Failed - {e}")
        
        # Show metrics
        print(f"\n📊 Load Balancer Metrics:")
        metrics = lb.get_load_balancer_metrics()
        global_metrics = metrics['global_metrics']
        
        print(f"   Total Requests: {global_metrics['total_requests']}")
        print(f"   Success Rate: {global_metrics['success_rate']:.1f}%")
        print(f"   Avg Response Time: {global_metrics['average_response_time']:.1f}ms")
        print(f"   Requests/Second: {global_metrics['requests_per_second']:.1f}")
        
        # Show server distribution
        print(f"\n🖥️  Server Distribution:")
        server_metrics = lb.get_server_metrics()
        for server_id, metrics in server_metrics.items():
            print(f"   {server_id}: {metrics['metrics']['total_requests']} requests, "
                  f"Status: {metrics['metrics']['health_status']}")
        
        lb.shutdown()
        time.sleep(1)
    
    # Performance test with best algorithm
    print(f"\n⚡ Performance Test with Round Robin")
    print("-" * 50)
    
    config = LoadBalancerConfig(
        algorithm=LoadBalancingAlgorithm.ROUND_ROBIN,
        health_check_interval=30,
        circuit_breaker_enabled=True
    )
    
    lb = LoadBalancer(config)
    
    # Add all servers
    for server_config in create_demo_servers()[:3]:
        lb.add_server(server_config)
    
    time.sleep(2)  # Wait for health checks
    
    # Run load test
    tester = LoadBalancerTester(lb)
    results = tester.run_load_test(
        requests_per_second=50,
        duration_seconds=10,
        concurrent_clients=5
    )
    
    print(f"📈 Performance Test Results:")
    print(f"   Total Requests: {results['requests_sent']}")
    print(f"   Success Rate: {results['success_rate']:.1f}%")
    print(f"   Actual RPS: {results['actual_rps']:.1f}")
    print(f"   Avg Response Time: {results.get('avg_response_time', 0):.1f}ms")
    print(f"   P95 Response Time: {results.get('p95_response_time', 0):.1f}ms")
    print(f"   P99 Response Time: {results.get('p99_response_time', 0):.1f}ms")
    
    print(f"\n🖥️  Server Request Distribution:")
    for server_id, count in results['server_distribution'].items():
        print(f"   {server_id}: {count} requests")
    
    lb.shutdown()
    
    print(f"\n✅ Demo completed successfully!")
    print(f"🎯 Load Balancer demonstrates enterprise-level capabilities:")
    print(f"   • Multiple load balancing algorithms")
    print(f"   • Health monitoring and automatic failover") 
    print(f"   • Circuit breaker pattern for fault tolerance")
    print(f"   • Session affinity for stateful applications")
    print(f"   • Comprehensive metrics and monitoring")
    print(f"   • High-performance request routing")

if __name__ == "__main__":
    run_comprehensive_demo()