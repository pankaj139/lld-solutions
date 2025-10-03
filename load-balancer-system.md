# Load Balancer System - Low Level Design

## 📋 Problem Statement

Design a comprehensive load balancer system that can efficiently distribute incoming traffic across multiple backend servers. The system should support various load balancing algorithms, health checking, auto-scaling, circuit breaker patterns, and provide high availability with fault tolerance.

## 🎯 Requirements

### Functional Requirements

1. **Load Balancing Algorithms**
   - Round Robin
   - Weighted Round Robin
   - Least Connections
   - Weighted Least Connections
   - IP Hash (Consistent Hashing)
   - Random
   - Resource-based (CPU, Memory)

2. **Server Management**
   - Dynamic server registration and deregistration
   - Server health monitoring and status tracking
   - Automatic failover and recovery
   - Server capacity and weight configuration

3. **Health Checking**
   - HTTP/HTTPS health checks
   - TCP port connectivity checks
   - Custom health check endpoints
   - Configurable check intervals and timeouts
   - Graceful degradation on health check failures

4. **Circuit Breaker Pattern**
   - Automatic circuit opening on failure threshold
   - Half-open state for recovery testing
   - Circuit closure on successful recovery
   - Configurable failure thresholds and timeouts

5. **Traffic Management**
   - Request routing based on URL patterns
   - Sticky sessions (session affinity)
   - Request throttling and rate limiting
   - Connection pooling and keep-alive

6. **SSL/TLS Termination**
   - HTTPS traffic handling
   - Certificate management
   - SSL offloading

### Non-Functional Requirements

1. **Performance**
   - Sub-millisecond routing latency
   - High throughput (100K+ requests per second)
   - Efficient connection handling
   - Minimal memory footprint

2. **Availability**
   - 99.99% uptime
   - No single point of failure
   - Graceful degradation under load
   - Automatic recovery mechanisms

3. **Scalability**
   - Horizontal scaling of load balancer instances
   - Support for thousands of backend servers
   - Dynamic scaling based on traffic patterns
   - Multi-region deployment support

4. **Monitoring**
   - Real-time traffic metrics
   - Server performance monitoring
   - Error rate tracking
   - Alert generation

## 🏗️ System Architecture

### High-Level Components

```
                    ┌─────────────────┐
                    │     Clients     │
                    │   (External)    │
                    └─────────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  Load Balancer  │
                    │    (Layer 7)    │
                    └─────────────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
    ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
    │   Server 1  │ │   Server 2  │ │   Server 3  │
    │  (Backend)  │ │  (Backend)  │ │  (Backend)  │
    └─────────────┘ └─────────────┘ └─────────────┘
              │              │              │
              └──────────────┼──────────────┘
                             ▼
                    ┌─────────────────┐
                    │  Health Monitor │
                    │   & Metrics     │
                    └─────────────────┘
```

### Core Components

1. **Load Balancer Engine**
   - Request processing and routing
   - Algorithm selection and execution
   - Connection management

2. **Server Pool Manager**
   - Backend server registration
   - Health status tracking
   - Weight and capacity management

3. **Health Monitor**
   - Periodic health checks
   - Failure detection and recovery
   - Status reporting

4. **Circuit Breaker**
   - Failure threshold monitoring
   - Circuit state management
   - Recovery testing

5. **Metrics & Analytics**
   - Performance monitoring
   - Traffic analysis
   - Alert management

## 🔧 Technical Design

### Load Balancing Algorithms

#### 1. Round Robin
```python
class RoundRobinBalancer:
    def __init__(self, servers):
        self.servers = servers
        self.current = 0
    
    def select_server(self):
        if not self.servers:
            return None
        
        server = self.servers[self.current]
        self.current = (self.current + 1) % len(self.servers)
        return server
```

#### 2. Weighted Round Robin
```python
class WeightedRoundRobinBalancer:
    def __init__(self, servers):
        self.weighted_servers = []
        for server in servers:
            for _ in range(server.weight):
                self.weighted_servers.append(server)
        self.current = 0
    
    def select_server(self):
        if not self.weighted_servers:
            return None
        
        server = self.weighted_servers[self.current]
        self.current = (self.current + 1) % len(self.weighted_servers)
        return server
```

#### 3. Least Connections
```python
class LeastConnectionsBalancer:
    def __init__(self, servers):
        self.servers = servers
    
    def select_server(self):
        if not self.servers:
            return None
        
        return min(self.servers, key=lambda s: s.active_connections)
```

#### 4. Consistent Hashing
```python
class ConsistentHashBalancer:
    def __init__(self, servers, replicas=150):
        self.replicas = replicas
        self.ring = {}
        self.sorted_keys = []
        
        for server in servers:
            self.add_server(server)
    
    def select_server(self, key):
        if not self.ring:
            return None
        
        hash_key = self._hash(key)
        idx = bisect_right(self.sorted_keys, hash_key)
        
        if idx == len(self.sorted_keys):
            idx = 0
        
        return self.ring[self.sorted_keys[idx]]
```

### Data Models

#### Server Configuration
```python
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
    
@dataclass
class ServerMetrics:
    server_id: str
    active_connections: int = 0
    total_requests: int = 0
    failed_requests: int = 0
    average_response_time: float = 0.0
    cpu_usage: float = 0.0
    memory_usage: float = 0.0
    last_health_check: datetime = None
    health_status: ServerStatus = ServerStatus.UNKNOWN
```

#### Load Balancer Configuration
```python
@dataclass
class LoadBalancerConfig:
    algorithm: LoadBalancingAlgorithm
    health_check_interval: int = 30  # seconds
    health_check_timeout: int = 5    # seconds
    max_retries: int = 3
    retry_backoff: int = 1           # seconds
    session_affinity: bool = False
    sticky_session_duration: int = 3600  # seconds
    circuit_breaker_enabled: bool = True
    circuit_breaker_threshold: int = 5
    circuit_breaker_timeout: int = 60
```

### Design Patterns Used

1. **Strategy Pattern**
   - Different load balancing algorithms
   - Pluggable algorithm implementations

2. **Observer Pattern**
   - Health monitoring notifications
   - Metrics collection and reporting

3. **Circuit Breaker Pattern**
   - Fault tolerance and resilience
   - Automatic failure handling

4. **Proxy Pattern**
   - Request forwarding and response handling
   - Protocol abstraction

5. **Factory Pattern**
   - Load balancer creation
   - Algorithm instantiation

6. **State Pattern**
   - Server status management
   - Circuit breaker states

## 💾 Database Design

### Load Balancer Storage Schema

#### Servers Table
```sql
CREATE TABLE servers (
    server_id VARCHAR(50) PRIMARY KEY,
    host VARCHAR(255) NOT NULL,
    port INT NOT NULL,
    weight INT DEFAULT 1,
    max_connections INT DEFAULT 1000,
    health_check_url VARCHAR(500) DEFAULT '/health',
    timeout_ms INT DEFAULT 5000,
    protocol ENUM('http', 'https', 'tcp') DEFAULT 'http',
    status ENUM('ACTIVE', 'INACTIVE', 'MAINTENANCE') DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### Server Metrics Table
```sql
CREATE TABLE server_metrics (
    metric_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    server_id VARCHAR(50),
    active_connections INT DEFAULT 0,
    total_requests BIGINT DEFAULT 0,
    failed_requests BIGINT DEFAULT 0,
    average_response_time DECIMAL(10,3) DEFAULT 0.000,
    cpu_usage DECIMAL(5,2) DEFAULT 0.00,
    memory_usage DECIMAL(5,2) DEFAULT 0.00,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (server_id) REFERENCES servers(server_id)
);
```

## 🚀 Implementation Approach

### 1. Load Balancer Core
```python
class LoadBalancer:
    def __init__(self, config: LoadBalancerConfig):
        self.config = config
        self.server_pool = ServerPool()
        self.algorithm = self._create_algorithm(config.algorithm)
        self.health_monitor = HealthMonitor(self.server_pool)
        self.circuit_breaker = CircuitBreaker(config)
        self.metrics = MetricsCollector()
        
    def handle_request(self, request: Request) -> Response:
        # 1. Select server using algorithm
        server = self.algorithm.select_server(request)
        
        if not server or not server.is_healthy():
            raise NoHealthyServerException()
            
        # 2. Check circuit breaker
        if not self.circuit_breaker.can_execute(server):
            raise CircuitBreakerOpenException()
            
        try:
            # 3. Forward request to server
            response = self._forward_request(server, request)
            
            # 4. Update metrics
            self.metrics.record_success(server, response)
            self.circuit_breaker.record_success(server)
            
            return response
            
        except Exception as e:
            # 5. Handle failure
            self.metrics.record_failure(server, e)
            self.circuit_breaker.record_failure(server)
            
            # 6. Retry with different server if configured
            if self.config.max_retries > 0:
                return self._retry_request(request, exclude_servers=[server])
                
            raise e
```

### 2. Server Pool Management
```python
class ServerPool:
    def __init__(self):
        self.servers = {}  # server_id -> Server
        self.healthy_servers = set()
        self.lock = threading.RWLock()
        
    def add_server(self, server: Server) -> bool:
        with self.lock.write():
            if server.server_id in self.servers:
                return False
                
            self.servers[server.server_id] = server
            if server.is_healthy():
                self.healthy_servers.add(server.server_id)
                
            return True
            
    def remove_server(self, server_id: str) -> bool:
        with self.lock.write():
            if server_id not in self.servers:
                return False
                
            del self.servers[server_id]
            self.healthy_servers.discard(server_id)
            return True
            
    def get_healthy_servers(self) -> List[Server]:
        with self.lock.read():
            return [
                self.servers[server_id] 
                for server_id in self.healthy_servers
            ]
            
    def update_server_health(self, server_id: str, is_healthy: bool):
        with self.lock.write():
            if is_healthy:
                self.healthy_servers.add(server_id)
            else:
                self.healthy_servers.discard(server_id)
```

### 3. Health Monitoring
```python
class HealthMonitor:
    def __init__(self, server_pool: ServerPool, check_interval: int = 30):
        self.server_pool = server_pool
        self.check_interval = check_interval
        self.running = False
        self.executor = ThreadPoolExecutor(max_workers=10)
        
    def start(self):
        self.running = True
        self._schedule_health_checks()
        
    def stop(self):
        self.running = False
        self.executor.shutdown(wait=True)
        
    def _schedule_health_checks(self):
        def run_health_checks():
            while self.running:
                servers = self.server_pool.get_all_servers()
                
                futures = []
                for server in servers:
                    future = self.executor.submit(self._check_server_health, server)
                    futures.append(future)
                    
                # Wait for all health checks to complete
                for future in futures:
                    future.result()
                    
                time.sleep(self.check_interval)
                
        threading.Thread(target=run_health_checks, daemon=True).start()
        
    def _check_server_health(self, server: Server) -> bool:
        try:
            # Perform HTTP health check
            response = requests.get(
                f"{server.protocol}://{server.host}:{server.port}{server.health_check_url}",
                timeout=server.timeout_ms / 1000
            )
            
            is_healthy = response.status_code == 200
            
            # Update server health status
            server.update_health_status(is_healthy)
            self.server_pool.update_server_health(server.server_id, is_healthy)
            
            return is_healthy
            
        except Exception as e:
            server.update_health_status(False)
            self.server_pool.update_server_health(server.server_id, False)
            return False
```

### 4. Circuit Breaker Implementation
```python
class CircuitBreaker:
    def __init__(self, config: LoadBalancerConfig):
        self.failure_threshold = config.circuit_breaker_threshold
        self.timeout = config.circuit_breaker_timeout
        self.server_states = {}  # server_id -> CircuitBreakerState
        
    def can_execute(self, server: Server) -> bool:
        state = self.server_states.get(server.server_id, CircuitBreakerState())
        
        if state.state == CircuitState.CLOSED:
            return True
        elif state.state == CircuitState.OPEN:
            if time.time() - state.last_failure_time > self.timeout:
                # Try half-open state
                state.state = CircuitState.HALF_OPEN
                return True
            return False
        elif state.state == CircuitState.HALF_OPEN:
            return True
            
        return False
        
    def record_success(self, server: Server):
        state = self.server_states.get(server.server_id, CircuitBreakerState())
        state.failure_count = 0
        state.state = CircuitState.CLOSED
        
    def record_failure(self, server: Server):
        state = self.server_states.get(server.server_id, CircuitBreakerState())
        state.failure_count += 1
        state.last_failure_time = time.time()
        
        if state.failure_count >= self.failure_threshold:
            state.state = CircuitState.OPEN
```

## 📊 Advanced Features

### 1. Session Affinity (Sticky Sessions)
```python
class StickySessionManager:
    def __init__(self, session_duration: int = 3600):
        self.session_duration = session_duration
        self.session_map = {}  # session_id -> server_id
        self.session_expiry = {}  # session_id -> expiry_time
        
    def get_server_for_session(self, session_id: str) -> Optional[str]:
        if session_id in self.session_map:
            if time.time() < self.session_expiry[session_id]:
                return self.session_map[session_id]
            else:
                # Session expired
                del self.session_map[session_id]
                del self.session_expiry[session_id]
        return None
        
    def bind_session_to_server(self, session_id: str, server_id: str):
        self.session_map[session_id] = server_id
        self.session_expiry[session_id] = time.time() + self.session_duration
```

### 2. Auto-Scaling Integration
```python
class AutoScaler:
    def __init__(self, load_balancer: LoadBalancer, config: AutoScalingConfig):
        self.load_balancer = load_balancer
        self.config = config
        self.metrics_window = deque(maxlen=config.metrics_window_size)
        
    def should_scale_up(self) -> bool:
        if len(self.metrics_window) < self.config.metrics_window_size:
            return False
            
        avg_cpu = sum(m.avg_cpu for m in self.metrics_window) / len(self.metrics_window)
        avg_connections = sum(m.avg_connections for m in self.metrics_window) / len(self.metrics_window)
        
        return (avg_cpu > self.config.scale_up_cpu_threshold or 
                avg_connections > self.config.scale_up_connections_threshold)
                
    def should_scale_down(self) -> bool:
        if len(self.metrics_window) < self.config.metrics_window_size:
            return False
            
        avg_cpu = sum(m.avg_cpu for m in self.metrics_window) / len(self.metrics_window)
        avg_connections = sum(m.avg_connections for m in self.metrics_window) / len(self.metrics_window)
        
        return (avg_cpu < self.config.scale_down_cpu_threshold and 
                avg_connections < self.config.scale_down_connections_threshold)
```

### 3. Geographic Load Balancing
```python
class GeographicLoadBalancer:
    def __init__(self):
        self.regional_balancers = {}  # region -> LoadBalancer
        self.geo_locator = GeoLocator()
        
    def select_balancer(self, client_ip: str) -> LoadBalancer:
        client_region = self.geo_locator.get_region(client_ip)
        
        # Prefer local region balancer
        if client_region in self.regional_balancers:
            balancer = self.regional_balancers[client_region]
            if balancer.has_healthy_servers():
                return balancer
                
        # Fallback to nearest region with healthy servers
        return self._find_nearest_healthy_balancer(client_region)
```

## 🔒 Security and SSL Termination

### SSL/TLS Handling
```python
class SSLTerminator:
    def __init__(self, cert_file: str, key_file: str):
        self.ssl_context = ssl.create_default_context(ssl.Purpose.CLIENT_AUTH)
        self.ssl_context.load_cert_chain(cert_file, key_file)
        
    def create_secure_server(self, host: str, port: int) -> socket.socket:
        server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        server_socket.bind((host, port))
        
        return self.ssl_context.wrap_socket(server_socket, server_side=True)
```

## 📊 Monitoring and Analytics

### Metrics Collection
```python
class MetricsCollector:
    def __init__(self):
        self.request_count = 0
        self.success_count = 0
        self.failure_count = 0
        self.total_response_time = 0.0
        self.server_metrics = {}  # server_id -> ServerMetrics
        
    def record_request(self, server: Server, response_time: float, success: bool):
        self.request_count += 1
        self.total_response_time += response_time
        
        if success:
            self.success_count += 1
        else:
            self.failure_count += 1
            
        # Update server-specific metrics
        if server.server_id not in self.server_metrics:
            self.server_metrics[server.server_id] = ServerMetrics(server.server_id)
            
        server_metric = self.server_metrics[server.server_id]
        server_metric.total_requests += 1
        
        if not success:
            server_metric.failed_requests += 1
            
    def get_global_metrics(self) -> Dict[str, Any]:
        return {
            'total_requests': self.request_count,
            'success_rate': self.success_count / max(self.request_count, 1),
            'average_response_time': self.total_response_time / max(self.request_count, 1),
            'requests_per_second': self._calculate_rps(),
            'active_servers': len([s for s in self.server_metrics.values() if s.health_status == ServerStatus.HEALTHY])
        }
```

## 🧪 Testing Strategy

### Load Testing
- Simulate high traffic scenarios
- Test algorithm performance under load
- Validate failover mechanisms
- Measure latency and throughput

### Chaos Testing
- Random server failures
- Network partition scenarios
- Circuit breaker testing
- Recovery time validation

## Implementation

### Python Implementation
- **File**: `python/load-balancer/main.py`
- **Features**: Complete load balancer with all algorithms, health checking, circuit breaker, SSL termination
- **Key Components**: Multiple balancing algorithms, health monitor, circuit breaker, metrics collection, auto-scaling

### JavaScript Implementation  
- **File**: `javascript/load-balancer/main.js`
- **Features**: Equivalent functionality with async/await patterns, Node.js HTTP proxy support
- **Key Components**: Event-driven architecture, stream handling, cluster support, performance monitoring

Both implementations provide:
- ✅ All major load balancing algorithms (Round Robin, Weighted, Least Connections, Consistent Hashing)
- ✅ Comprehensive health monitoring with automatic failover
- ✅ Circuit breaker pattern for fault tolerance
- ✅ Session affinity and sticky sessions
- ✅ SSL/TLS termination capabilities
- ✅ Real-time metrics and monitoring
- ✅ Auto-scaling integration hooks
- ✅ Geographic load balancing support
- ✅ Performance testing and benchmarking tools
- ✅ Interactive demonstration and configuration management

The implementations demonstrate enterprise-level load balancing capabilities essential for high-availability distributed systems and are commonly used in production environments at FAANG companies.