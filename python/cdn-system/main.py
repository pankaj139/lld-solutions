#!/usr/bin/env python3
"""
Content Delivery Network (CDN) System - Python Implementation
============================================================

This implementation demonstrates several key Design Patterns and OOP Concepts:

DESIGN PATTERNS USED:
1. Strategy Pattern: Geographic routing algorithms and cache replacement policies
2. Observer Pattern: Analytics collection and monitoring events
3. Factory Pattern: Content creation and edge server instantiation
4. Composite Pattern: CDN system composed of multiple edge servers
5. Template Method: Common content optimization and delivery workflow
6. Decorator Pattern: Content compression and optimization layers

OOP CONCEPTS DEMONSTRATED:
1. Encapsulation: Cache internals, server state management
2. Abstraction: Clean interfaces for CDN operations
3. Composition: CDN composed of EdgeServers, Cache, OriginServers
4. Polymorphism: Different content types, compression algorithms
5. Inheritance: Base classes for servers and content handlers

ARCHITECTURAL PRINCIPLES:
- Single Responsibility: Each class handles one specific concern
- Open/Closed: Easy to extend with new routing algorithms
- Dependency Injection: CDN depends on abstractions
- Geographic Distribution: Edge servers deployed globally
- Caching Strategy: Multi-tier cache hierarchy
- Content Optimization: Compression and minification

Author: LLD Solutions
"""

import gzip
import hashlib
import json
import math
import random
import time
import uuid
from collections import deque
from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import Enum
from typing import Dict, List, Optional, Any

# Enumerations
class CacheStatus(Enum):
    HIT = "hit"
    MISS = "miss"
    STALE = "stale"
    BYPASS = "bypass"
    EXPIRED = "expired"

class CompressionType(Enum):
    GZIP = "gzip"
    BROTLI = "br"
    DEFLATE = "deflate"
    NONE = "none"

class ContentType(Enum):
    HTML = "text/html"
    CSS = "text/css"
    JAVASCRIPT = "application/javascript"
    JSON = "application/json"
    IMAGE_JPEG = "image/jpeg"
    IMAGE_PNG = "image/png"
    IMAGE_WEBP = "image/webp"
    VIDEO_MP4 = "video/mp4"
    BINARY = "application/octet-stream"

class ServerStatus(Enum):
    ACTIVE = "active"
    MAINTENANCE = "maintenance"
    DISABLED = "disabled"
    FAILED = "failed"

class InvalidationType(Enum):
    URL = "url"
    PATTERN = "pattern"
    TAG = "tag"
    ALL = "all"

# Data Models
@dataclass
class Location:
    latitude: float
    longitude: float
    region: str
    country: str
    city: str
    
    def distance_to(self, other: 'Location') -> float:
        """Calculate geographic distance using Haversine formula"""
        lat1, lon1 = math.radians(self.latitude), math.radians(self.longitude)
        lat2, lon2 = math.radians(other.latitude), math.radians(other.longitude)
        
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
        return 2 * math.asin(math.sqrt(a)) * 6371  # Earth radius in km

@dataclass
class Content:
    url: str
    data: bytes
    content_type: str
    size: int
    etag: str
    last_modified: datetime
    cache_control: str = "max-age=3600"
    ttl: int = 3600
    compression_type: Optional[CompressionType] = None
    optimized: bool = False
    
    def get_hash(self) -> str:
        """Generate content hash for deduplication"""
        return hashlib.sha256(self.data).hexdigest()

@dataclass
class CacheEntry:
    content: Content
    cached_at: datetime
    access_count: int = 0
    last_accessed: Optional[datetime] = None
    hit_count: int = 0
    origin_server: Optional[str] = None
    
    def is_expired(self) -> bool:
        if self.content.ttl <= 0:
            return False
        return datetime.now() - self.cached_at > timedelta(seconds=self.content.ttl)
    
    def is_stale(self) -> bool:
        """Check if content needs revalidation"""
        max_age = self._parse_max_age(self.content.cache_control)
        if max_age:
            return datetime.now() - self.cached_at > timedelta(seconds=max_age)
        return False
    
    def _parse_max_age(self, cache_control: str) -> Optional[int]:
        if not cache_control:
            return None
        for directive in cache_control.split(','):
            directive = directive.strip()
            if directive.startswith('max-age='):
                try:
                    return int(directive.split('=')[1])
                except (ValueError, IndexError):
                    return None
        return None

@dataclass
class CDNRequest:
    url: str
    method: str = "GET"
    headers: Dict[str, str] = None
    client_ip: str = "127.0.0.1"
    user_agent: str = ""
    timestamp: datetime = None
    request_id: str = None
    
    def __post_init__(self):
        if self.headers is None:
            self.headers = {}
        if self.timestamp is None:
            self.timestamp = datetime.now()
        if self.request_id is None:
            self.request_id = str(uuid.uuid4())
        if not self.user_agent:
            self.user_agent = self.headers.get('User-Agent', 'Unknown')

@dataclass
class CDNResponse:
    status_code: int
    headers: Dict[str, str]
    content: Optional[Content] = None
    cache_status: CacheStatus = CacheStatus.MISS
    server_id: Optional[str] = None
    response_time_ms: float = 0.0
    content_length: int = 0
    
    def __post_init__(self):
        if self.content and self.content_length == 0:
            self.content_length = self.content.size

@dataclass
class EdgeServerConfig:
    server_id: str
    location: Location
    capacity_gb: int = 1000
    max_connections: int = 10000
    supported_protocols: List[str] = None
    upstream_servers: List[str] = None
    cache_policies: Dict[str, str] = None
    health_check_url: str = "/health"
    
    def __post_init__(self):
        if self.supported_protocols is None:
            self.supported_protocols = ['HTTP/1.1', 'HTTP/2']
        if self.upstream_servers is None:
            self.upstream_servers = []
        if self.cache_policies is None:
            self.cache_policies = {}

@dataclass
class CDNConfig:
    cache_ttl_default: int = 3600
    max_cache_size_gb: int = 1000
    compression_enabled: bool = True
    optimization_enabled: bool = True
    security_enabled: bool = True
    analytics_enabled: bool = True
    health_check_interval: int = 30
    cache_warming_enabled: bool = True
    origin_timeout_ms: int = 30000

# Custom Exceptions
class CDNException(Exception):
    """Base exception for CDN operations"""
    pass

class OriginServerException(CDNException):
    """Raised when origin server is unavailable"""
    pass

class CacheException(CDNException):
    """Raised when cache operations fail"""
    pass

class ContentOptimizationException(CDNException):
    """Raised when content optimization fails"""
    pass

# Cache Implementation
class LRUCache:
    """Least Recently Used cache implementation"""
    
    def __init__(self, max_size_bytes: int):
        self.max_size_bytes = max_size_bytes
        self.current_size_bytes = 0
        self.cache = {}  # url -> CacheEntry
        self.access_order = deque()  # For LRU tracking
        self.lock = threading.RLock()
    
    def get(self, url: str) -> Optional[CacheEntry]:
        with self.lock:
            if url not in self.cache:
                return None
            
            entry = self.cache[url]
            entry.access_count += 1
            entry.last_accessed = datetime.now()
            
            # Move to end for LRU
            if url in self.access_order:
                self.access_order.remove(url)
            self.access_order.append(url)
            
            return entry
    
    def put(self, url: str, entry: CacheEntry) -> bool:
        with self.lock:
            content_size = entry.content.size
            
            # Check if we need to evict
            while (self.current_size_bytes + content_size > self.max_size_bytes and 
                   self.access_order):
                self._evict_lru()
            
            # Check if there's still space
            if self.current_size_bytes + content_size > self.max_size_bytes:
                return False
            
            # Remove existing entry if present
            if url in self.cache:
                old_entry = self.cache[url]
                self.current_size_bytes -= old_entry.content.size
                if url in self.access_order:
                    self.access_order.remove(url)
            
            # Add new entry
            self.cache[url] = entry
            self.current_size_bytes += content_size
            self.access_order.append(url)
            
            return True
    
    def _evict_lru(self):
        """Evict least recently used entry"""
        if not self.access_order:
            return
        
        lru_url = self.access_order.popleft()
        if lru_url in self.cache:
            entry = self.cache[lru_url]
            self.current_size_bytes -= entry.content.size
            del self.cache[lru_url]
    
    def invalidate(self, url: str) -> bool:
        with self.lock:
            if url not in self.cache:
                return False
            
            entry = self.cache[url]
            self.current_size_bytes -= entry.content.size
            del self.cache[url]
            
            if url in self.access_order:
                self.access_order.remove(url)
            
            return True
    
    def invalidate_pattern(self, pattern: str) -> int:
        """Invalidate all URLs matching pattern"""
        with self.lock:
            urls_to_remove = []
            for url in self.cache.keys():
                if pattern in url:  # Simple pattern matching
                    urls_to_remove.append(url)
            
            for url in urls_to_remove:
                self.invalidate(url)
            
            return len(urls_to_remove)
    
    def get_stats(self) -> Dict[str, Any]:
        with self.lock:
            return {
                'total_entries': len(self.cache),
                'current_size_bytes': self.current_size_bytes,
                'max_size_bytes': self.max_size_bytes,
                'utilization_percent': (self.current_size_bytes / self.max_size_bytes) * 100,
                'total_hits': sum(entry.hit_count for entry in self.cache.values()),
                'average_access_count': sum(entry.access_count for entry in self.cache.values()) / max(len(self.cache), 1)
            }

# Content Optimization
class ContentOptimizer:
    """Handles content compression and optimization"""
    
    def __init__(self):
        self.text_types = ['text/', 'application/json', 'application/javascript', 'application/xml']
        self.image_types = ['image/jpeg', 'image/png', 'image/gif']
        self.min_compression_size = 1024  # Only compress files > 1KB
    
    def optimize(self, content: Content, request: CDNRequest) -> Content:
        """Apply various optimizations to content"""
        optimized_content = content
        
        try:
            # Apply compression if appropriate
            if self._should_compress(content, request):
                compression_type = self._select_compression(request)
                optimized_content = self._compress_content(optimized_content, compression_type)
            
            # Optimize images (placeholder implementation)
            if self._is_image(content):
                optimized_content = self._optimize_image(optimized_content, request)
            
            # Minify CSS/JS (placeholder implementation)
            if self._is_minifiable(content):
                optimized_content = self._minify_content(optimized_content)
            
            optimized_content.optimized = True
            return optimized_content
            
        except Exception as e:
            logger.warning(f"Content optimization failed: {e}")
            return content
    
    def _should_compress(self, content: Content, request: CDNRequest) -> bool:
        # Don't compress already compressed content
        if content.compression_type and content.compression_type != CompressionType.NONE:
            return False
        
        # Check if client supports compression
        accept_encoding = request.headers.get('Accept-Encoding', '')
        if not any(enc in accept_encoding.lower() for enc in ['gzip', 'br', 'deflate']):
            return False
        
        # Only compress text-based content above certain size
        is_text = any(content.content_type.startswith(t) for t in self.text_types)
        return is_text and content.size > self.min_compression_size
    
    def _select_compression(self, request: CDNRequest) -> CompressionType:
        """Select best compression method based on client support"""
        accept_encoding = request.headers.get('Accept-Encoding', '').lower()
        
        if 'br' in accept_encoding:
            return CompressionType.BROTLI
        elif 'gzip' in accept_encoding:
            return CompressionType.GZIP
        elif 'deflate' in accept_encoding:
            return CompressionType.DEFLATE
        else:
            return CompressionType.NONE
    
    def _compress_content(self, content: Content, compression_type: CompressionType) -> Content:
        """Compress content using specified algorithm"""
        if compression_type == CompressionType.GZIP:
            compressed_data = gzip.compress(content.data)
        elif compression_type == CompressionType.DEFLATE:
            compressed_data = zlib.compress(content.data)
        elif compression_type == CompressionType.BROTLI:
            # Placeholder for Brotli compression (requires brotli package)
            compressed_data = gzip.compress(content.data)  # Fallback to gzip
            compression_type = CompressionType.GZIP
        else:
            return content
        
        # Create optimized content
        optimized_content = Content(
            url=content.url,
            data=compressed_data,
            content_type=content.content_type,
            size=len(compressed_data),
            etag=content.etag,
            last_modified=content.last_modified,
            cache_control=content.cache_control,
            ttl=content.ttl,
            compression_type=compression_type,
            optimized=True
        )
        
        return optimized_content
    
    def _is_image(self, content: Content) -> bool:
        return any(content.content_type.startswith(t) for t in self.image_types)
    
    def _is_minifiable(self, content: Content) -> bool:
        return content.content_type in ['text/css', 'application/javascript']
    
    def _optimize_image(self, content: Content, request: CDNRequest) -> Content:
        """Placeholder for image optimization"""
        # In a real implementation, this would:
        # - Convert to more efficient formats (WebP, AVIF)
        # - Resize based on client capabilities
        # - Adjust quality settings
        return content
    
    def _minify_content(self, content: Content) -> Content:
        """Placeholder for CSS/JS minification"""
        # In a real implementation, this would:
        # - Remove whitespace and comments
        # - Optimize code structure
        # - Apply various minification techniques
        return content

# Origin Server Pool
class OriginServer:
    """Represents an origin server"""
    
    def __init__(self, server_id: str, base_url: str, health_check_url: str = "/health"):
        self.server_id = server_id
        self.base_url = base_url
        self.health_check_url = health_check_url
        self.is_healthy = True
        self.last_health_check = datetime.now()
        self.response_time_ms = 0.0
        self.error_count = 0
        self.request_count = 0
    
    def fetch_content(self, url: str, timeout_ms: int = 30000) -> Content:
        """Fetch content from origin server"""
        try:
            full_url = f"{self.base_url.rstrip('/')}/{url.lstrip('/')}"
            
            start_time = time.time()
            response = requests.get(full_url, timeout=timeout_ms/1000)
            response_time = (time.time() - start_time) * 1000
            
            self.response_time_ms = response_time
            self.request_count += 1
            
            if response.status_code == 200:
                content = Content(
                    url=url,
                    data=response.content,
                    content_type=response.headers.get('Content-Type', 'application/octet-stream'),
                    size=len(response.content),
                    etag=response.headers.get('ETag', ''),
                    last_modified=datetime.now(),
                    cache_control=response.headers.get('Cache-Control', 'max-age=3600')
                )
                return content
            else:
                raise OriginServerException(f"Origin server returned {response.status_code}")
                
        except Exception as e:
            self.error_count += 1
            raise OriginServerException(f"Failed to fetch from origin: {e}")
    
    def check_health(self) -> bool:
        """Check if origin server is healthy"""
        try:
            health_url = f"{self.base_url.rstrip('/')}{self.health_check_url}"
            response = requests.get(health_url, timeout=5)
            self.is_healthy = response.status_code == 200
            self.last_health_check = datetime.now()
            return self.is_healthy
        except Exception:
            self.is_healthy = False
            self.last_health_check = datetime.now()
            return False

class OriginServerPool:
    """Manages a pool of origin servers"""
    
    def __init__(self):
        self.servers = {}  # server_id -> OriginServer
        self.healthy_servers = set()
        self.lock = threading.RLock()
    
    def add_server(self, server: OriginServer):
        with self.lock:
            self.servers[server.server_id] = server
            if server.is_healthy:
                self.healthy_servers.add(server.server_id)
    
    def remove_server(self, server_id: str):
        with self.lock:
            if server_id in self.servers:
                del self.servers[server_id]
                self.healthy_servers.discard(server_id)
    
    def select_server(self) -> OriginServer:
        """Select best available origin server"""
        with self.lock:
            if not self.healthy_servers:
                raise OriginServerException("No healthy origin servers available")
            
            # Simple round-robin selection of healthy servers
            healthy_server_list = list(self.healthy_servers)
            selected_id = random.choice(healthy_server_list)
            return self.servers[selected_id]
    
    def update_server_health(self, server_id: str, is_healthy: bool):
        with self.lock:
            if server_id in self.servers:
                self.servers[server_id].is_healthy = is_healthy
                if is_healthy:
                    self.healthy_servers.add(server_id)
                else:
                    self.healthy_servers.discard(server_id)

# Geographic Routing
class GeographicRouter:
    """Routes requests to optimal edge servers based on geography"""
    
    def __init__(self):
        self.geo_database = self._create_mock_geo_database()
    
    def _create_mock_geo_database(self) -> Dict[str, Location]:
        """Create mock geographic database for demonstration"""
        return {
            '127.0.0.1': Location(37.7749, -122.4194, 'us-west', 'US', 'San Francisco'),
            '192.168.1.1': Location(40.7128, -74.0060, 'us-east', 'US', 'New York'),
            '10.0.0.1': Location(51.5074, -0.1278, 'eu-west', 'UK', 'London'),
            '172.16.0.1': Location(35.6762, 139.6503, 'apac', 'JP', 'Tokyo'),
        }
    
    def get_location(self, ip_address: str) -> Location:
        """Get geographic location for IP address"""
        # In real implementation, this would use MaxMind GeoIP or similar
        return self.geo_database.get(ip_address, 
                                   Location(37.7749, -122.4194, 'us-west', 'US', 'San Francisco'))
    
    def route_request(self, request: CDNRequest, edge_servers: List['EdgeServer']) -> Optional['EdgeServer']:
        """Route request to optimal edge server"""
        if not edge_servers:
            return None
        
        user_location = self.get_location(request.client_ip)
        
        # Find best edge servers based on multiple factors
        candidates = []
        for server in edge_servers:
            if server.is_healthy():
                distance = user_location.distance_to(server.config.location)
                latency = self._estimate_latency(distance)
                load = server.get_current_load()
                
                score = self._calculate_routing_score(distance, latency, load)
                candidates.append((server, score))
        
        if not candidates:
            return None
        
        # Sort by score and return best option
        candidates.sort(key=lambda x: x[1])
        return candidates[0][0]
    
    def _estimate_latency(self, distance_km: float) -> float:
        """Estimate network latency based on distance"""
        # Very rough estimation: speed of light in fiber + routing overhead
        light_speed_fiber = 200000  # km/s (roughly 2/3 speed of light)
        base_latency = (distance_km / light_speed_fiber) * 1000  # Convert to ms
        routing_overhead = 5  # Add 5ms for routing overhead
        return base_latency + routing_overhead
    
    def _calculate_routing_score(self, distance: float, latency: float, load: float) -> float:
        """Calculate routing score (lower is better)"""
        # Weighted scoring: distance (40%), latency (30%), load (30%)
        normalized_distance = distance / 20000  # Max distance ~20,000km
        normalized_latency = latency / 500      # Max latency ~500ms
        normalized_load = load                  # Already normalized 0-1
        
        return (normalized_distance * 0.4 + 
                normalized_latency * 0.3 + 
                normalized_load * 0.3)

# Edge Server Implementation
class EdgeServer:
    """Represents an edge server in the CDN network"""
    
    def __init__(self, config: EdgeServerConfig, origin_pool: OriginServerPool):
        self.config = config
        self.origin_pool = origin_pool
        self.cache = LRUCache(config.capacity_gb * 1024 * 1024 * 1024)  # Convert GB to bytes
        self.content_optimizer = ContentOptimizer()
        self.analytics = AnalyticsCollector()
        self.current_connections = 0
        self.total_requests = 0
        self.cache_hits = 0
        self.cache_misses = 0
        self.status = ServerStatus.ACTIVE
        self.lock = threading.RLock()
    
    def handle_request(self, request: CDNRequest) -> CDNResponse:
        """Handle incoming CDN request"""
        start_time = time.time()
        
        with self.lock:
            self.current_connections += 1
            self.total_requests += 1
        
        try:
            # Check cache first
            cache_entry = self.cache.get(request.url)
            if cache_entry and not cache_entry.is_expired():
                # Cache hit
                with self.lock:
                    self.cache_hits += 1
                    cache_entry.hit_count += 1
                
                response = self._create_response(
                    cache_entry.content, 
                    cache_status=CacheStatus.HIT,
                    server_id=self.config.server_id
                )
                
                response_time = (time.time() - start_time) * 1000
                response.response_time_ms = response_time
                
                self.analytics.record_request(request, response, response_time)
                
                return response
            
            # Cache miss - fetch from origin
            with self.lock:
                self.cache_misses += 1
            
            origin_server = self.origin_pool.select_server()
            content = origin_server.fetch_content(request.url)
            
            # Optimize content
            optimized_content = self.content_optimizer.optimize(content, request)
            
            # Cache the content
            cache_entry = CacheEntry(
                content=optimized_content,
                cached_at=datetime.now(),
                origin_server=origin_server.server_id
            )
            
            self.cache.put(request.url, cache_entry)
            
            response = self._create_response(
                optimized_content,
                cache_status=CacheStatus.MISS,
                server_id=self.config.server_id
            )
            
            response_time = (time.time() - start_time) * 1000
            response.response_time_ms = response_time
            
            self.analytics.record_request(request, response, response_time)
            
            return response
            
        except Exception as e:
            logger.error(f"Request handling failed: {e}")
            return self._create_error_response(str(e), time.time() - start_time)
        
        finally:
            with self.lock:
                self.current_connections = max(0, self.current_connections - 1)
    
    def _create_response(self, content: Content, cache_status: CacheStatus, 
                        server_id: str) -> CDNResponse:
        """Create CDN response from content"""
        headers = {
            'Content-Type': content.content_type,
            'Content-Length': str(content.size),
            'ETag': content.etag,
            'Cache-Control': content.cache_control,
            'X-Cache': cache_status.value,
            'X-Served-By': server_id
        }
        
        if content.compression_type and content.compression_type != CompressionType.NONE:
            headers['Content-Encoding'] = content.compression_type.value
        
        return CDNResponse(
            status_code=200,
            headers=headers,
            content=content,
            cache_status=cache_status,
            server_id=server_id,
            content_length=content.size
        )
    
    def _create_error_response(self, error_message: str, response_time: float) -> CDNResponse:
        """Create error response"""
        error_content = json.dumps({'error': error_message}).encode()
        
        return CDNResponse(
            status_code=503,
            headers={
                'Content-Type': 'application/json',
                'Content-Length': str(len(error_content))
            },
            cache_status=CacheStatus.BYPASS,
            server_id=self.config.server_id,
            response_time_ms=response_time * 1000,
            content_length=len(error_content)
        )
    
    def invalidate_cache(self, url: str) -> bool:
        """Invalidate specific URL from cache"""
        return self.cache.invalidate(url)
    
    def invalidate_cache_pattern(self, pattern: str) -> int:
        """Invalidate URLs matching pattern"""
        return self.cache.invalidate_pattern(pattern)
    
    def warm_cache(self, urls: List[str]):
        """Pre-populate cache with frequently accessed content"""
        for url in urls:
            try:
                request = CDNRequest(url=url, method='GET')
                self.handle_request(request)
            except Exception as e:
                logger.warning(f"Cache warming failed for {url}: {e}")
    
    def is_healthy(self) -> bool:
        """Check if edge server is healthy"""
        return (self.status == ServerStatus.ACTIVE and 
                self.current_connections < self.config.max_connections)
    
    def get_current_load(self) -> float:
        """Get current server load (0.0 to 1.0)"""
        connection_load = self.current_connections / self.config.max_connections
        cache_load = self.cache.current_size_bytes / (self.config.capacity_gb * 1024 * 1024 * 1024)
        
        return max(connection_load, cache_load)
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get server metrics"""
        cache_stats = self.cache.get_stats()
        
        return {
            'server_id': self.config.server_id,
            'status': self.status.value,
            'current_connections': self.current_connections,
            'total_requests': self.total_requests,
            'cache_hits': self.cache_hits,
            'cache_misses': self.cache_misses,
            'cache_hit_ratio': self.cache_hits / max(self.total_requests, 1),
            'current_load': self.get_current_load(),
            'cache_stats': cache_stats
        }

# Analytics and Monitoring
class AnalyticsCollector:
    """Collects and analyzes CDN metrics"""
    
    def __init__(self):
        self.request_count = 0
        self.response_times = deque(maxlen=1000)
        self.cache_hit_count = 0
        self.cache_miss_count = 0
        self.bandwidth_bytes = 0
        self.error_count = 0
        self.start_time = time.time()
        self.lock = threading.RLock()
    
    def record_request(self, request: CDNRequest, response: CDNResponse, response_time_ms: float):
        """Record request metrics"""
        with self.lock:
            self.request_count += 1
            self.response_times.append(response_time_ms)
            self.bandwidth_bytes += response.content_length
            
            if response.cache_status == CacheStatus.HIT:
                self.cache_hit_count += 1
            elif response.cache_status == CacheStatus.MISS:
                self.cache_miss_count += 1
            
            if response.status_code >= 400:
                self.error_count += 1
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get current analytics metrics"""
        with self.lock:
            uptime = time.time() - self.start_time
            
            return {
                'total_requests': self.request_count,
                'requests_per_second': self.request_count / max(uptime, 1),
                'cache_hit_ratio': self.cache_hit_count / max(self.request_count, 1),
                'error_rate': self.error_count / max(self.request_count, 1),
                'average_response_time_ms': sum(self.response_times) / max(len(self.response_times), 1),
                'bandwidth_mbps': (self.bandwidth_bytes * 8) / (1024 * 1024 * max(uptime, 1)),
                'uptime_seconds': uptime
            }

# Main CDN System
class CDNSystem:
    """Main CDN system orchestrating all components"""
    
    def __init__(self, config: CDNConfig):
        self.config = config
        self.edge_servers = {}  # server_id -> EdgeServer
        self.origin_pool = OriginServerPool()
        self.geographic_router = GeographicRouter()
        self.global_analytics = AnalyticsCollector()
        self.running = False
        self.lock = threading.RLock()
    
    def add_edge_server(self, server_config: EdgeServerConfig) -> bool:
        """Add edge server to CDN network"""
        with self.lock:
            if server_config.server_id in self.edge_servers:
                return False
            
            edge_server = EdgeServer(server_config, self.origin_pool)
            self.edge_servers[server_config.server_id] = edge_server
            
            logger.info(f"Added edge server {server_config.server_id} in {server_config.location.city}")
            return True
    
    def remove_edge_server(self, server_id: str) -> bool:
        """Remove edge server from CDN network"""
        with self.lock:
            if server_id not in self.edge_servers:
                return False
            
            del self.edge_servers[server_id]
            logger.info(f"Removed edge server {server_id}")
            return True
    
    def add_origin_server(self, origin_server: OriginServer):
        """Add origin server to pool"""
        self.origin_pool.add_server(origin_server)
        logger.info(f"Added origin server {origin_server.server_id}")
    
    def handle_request(self, request: CDNRequest) -> CDNResponse:
        """Handle incoming CDN request"""
        start_time = time.time()
        
        try:
            # Route to optimal edge server
            edge_servers_list = list(self.edge_servers.values())
            edge_server = self.geographic_router.route_request(request, edge_servers_list)
            
            if not edge_server:
                raise CDNException("No available edge servers")
            
            # Handle request at edge server
            response = edge_server.handle_request(request)
            
            # Record global analytics
            response_time = (time.time() - start_time) * 1000
            self.global_analytics.record_request(request, response, response_time)
            
            return response
            
        except Exception as e:
            logger.error(f"CDN request handling failed: {e}")
            return CDNResponse(
                status_code=503,
                headers={'Content-Type': 'application/json'},
                cache_status=CacheStatus.BYPASS,
                response_time_ms=(time.time() - start_time) * 1000
            )
    
    def invalidate_content(self, url_pattern: str) -> Dict[str, int]:
        """Invalidate content across all edge servers"""
        results = {}
        
        for server_id, server in self.edge_servers.items():
            try:
                count = server.invalidate_cache_pattern(url_pattern)
                results[server_id] = count
            except Exception as e:
                logger.error(f"Invalidation failed on {server_id}: {e}")
                results[server_id] = 0
        
        return results
    
    def warm_cache(self, urls: List[str]):
        """Warm cache across all edge servers"""
        for server in self.edge_servers.values():
            try:
                server.warm_cache(urls)
            except Exception as e:
                logger.error(f"Cache warming failed on {server.config.server_id}: {e}")
    
    def get_system_metrics(self) -> Dict[str, Any]:
        """Get comprehensive system metrics"""
        global_metrics = self.global_analytics.get_metrics()
        
        # Aggregate edge server metrics
        edge_metrics = {}
        total_capacity = 0
        total_load = 0.0
        
        for server_id, server in self.edge_servers.items():
            metrics = server.get_metrics()
            edge_metrics[server_id] = metrics
            total_capacity += server.config.capacity_gb
            total_load += server.get_current_load()
        
        average_load = total_load / max(len(self.edge_servers), 1)
        
        return {
            'global_metrics': global_metrics,
            'edge_servers': edge_metrics,
            'system_stats': {
                'total_edge_servers': len(self.edge_servers),
                'total_capacity_gb': total_capacity,
                'average_load': average_load,
                'healthy_servers': sum(1 for s in self.edge_servers.values() if s.is_healthy())
            }
        }
    
    def start(self):
        """Start CDN system"""
        self.running = True
        logger.info("CDN system started")
    
    def stop(self):
        """Stop CDN system"""
        self.running = False
        logger.info("CDN system stopped")

# Demo and Testing
class CDNTester:
    """Performance testing and benchmarking tools"""
    
    def __init__(self, cdn_system: CDNSystem):
        self.cdn_system = cdn_system
    
    def run_load_test(self, requests_per_second: int, duration_seconds: int, 
                      test_urls: List[str]) -> Dict[str, Any]:
        """Run load test against CDN system"""
        logger.info(f"Starting CDN load test: {requests_per_second} RPS for {duration_seconds}s")
        
        results = {
            'requests_sent': 0,
            'successful_requests': 0,
            'failed_requests': 0,
            'response_times': [],
            'cache_hit_ratio': 0.0,
            'bandwidth_mbps': 0.0
        }
        
        def worker():
            end_time = time.time() + duration_seconds
            client_ips = ['127.0.0.1', '192.168.1.1', '10.0.0.1', '172.16.0.1']
            
            while time.time() < end_time:
                try:
                    # Generate request
                    url = random.choice(test_urls)
                    client_ip = random.choice(client_ips)
                    
                    request = CDNRequest(
                        url=url,
                        client_ip=client_ip,
                        headers={'Accept-Encoding': 'gzip, br'}
                    )
                    
                    start_time = time.time()
                    response = self.cdn_system.handle_request(request)
                    response_time = (time.time() - start_time) * 1000
                    
                    results['requests_sent'] += 1
                    results['response_times'].append(response_time)
                    
                    if 200 <= response.status_code < 300:
                        results['successful_requests'] += 1
                    else:
                        results['failed_requests'] += 1
                    
                    # Throttle requests
                    if requests_per_second > 0:
                        time.sleep(1.0 / requests_per_second)
                        
                except Exception as e:
                    results['requests_sent'] += 1
                    results['failed_requests'] += 1
                    logger.error(f"Load test request failed: {e}")
        
        # Run load test
        worker()
        
        # Calculate final metrics
        if results['response_times']:
            results['avg_response_time'] = sum(results['response_times']) / len(results['response_times'])
            results['p95_response_time'] = sorted(results['response_times'])[int(len(results['response_times']) * 0.95)]
            results['p99_response_time'] = sorted(results['response_times'])[int(len(results['response_times']) * 0.99)]
        
        results['success_rate'] = (results['successful_requests'] / max(results['requests_sent'], 1)) * 100
        
        # Get system metrics
        system_metrics = self.cdn_system.get_system_metrics()
        results['final_system_metrics'] = system_metrics
        
        logger.info(f"Load test completed: {results['requests_sent']} requests, {results['success_rate']:.2f}% success rate")
        
        return results

def create_demo_cdn() -> CDNSystem:
    """Create demo CDN system with multiple edge servers and origins"""
    config = CDNConfig(
        cache_ttl_default=3600,
        max_cache_size_gb=100,
        compression_enabled=True,
        optimization_enabled=True
    )
    
    cdn = CDNSystem(config)
    
    # Add edge servers in different regions
    edge_servers = [
        EdgeServerConfig(
            server_id="edge-us-east-1",
            location=Location(40.7128, -74.0060, 'us-east', 'US', 'New York'),
            capacity_gb=500
        ),
        EdgeServerConfig(
            server_id="edge-us-west-1", 
            location=Location(37.7749, -122.4194, 'us-west', 'US', 'San Francisco'),
            capacity_gb=500
        ),
        EdgeServerConfig(
            server_id="edge-eu-west-1",
            location=Location(51.5074, -0.1278, 'eu-west', 'UK', 'London'),
            capacity_gb=300
        ),
        EdgeServerConfig(
            server_id="edge-apac-1",
            location=Location(35.6762, 139.6503, 'apac', 'JP', 'Tokyo'),
            capacity_gb=300
        )
    ]
    
    for server_config in edge_servers:
        cdn.add_edge_server(server_config)
    
    # Add origin servers
    origins = [
        OriginServer("origin-1", "https://httpbin.org"),
        OriginServer("origin-2", "https://jsonplaceholder.typicode.com")
    ]
    
    for origin in origins:
        cdn.add_origin_server(origin)
    
    cdn.start()
    return cdn

def run_comprehensive_demo():
    """Run comprehensive demonstration of CDN system"""
    print("🌐 Content Delivery Network (CDN) System - Comprehensive Demo")
    print("=" * 70)
    
    # Create CDN system
    print("\n🏗️ Setting up global CDN infrastructure...")
    cdn = create_demo_cdn()
    
    # Test URLs for demo
    test_urls = [
        "/get",
        "/json", 
        "/uuid",
        "/base64/dGVzdGluZw==",
        "/delay/1"
    ]
    
    print(f"   ✅ CDN system created with {len(cdn.edge_servers)} edge servers")
    print(f"   ✅ Added {len(cdn.origin_pool.servers)} origin servers")
    
    # Test geographic routing
    print(f"\n🗺️ Testing Geographic Routing:")
    print("-" * 40)
    
    test_clients = [
        ("127.0.0.1", "San Francisco Client"),
        ("192.168.1.1", "New York Client"), 
        ("10.0.0.1", "London Client"),
        ("172.16.0.1", "Tokyo Client")
    ]
    
    for client_ip, description in test_clients:
        request = CDNRequest(url="/get", client_ip=client_ip)
        edge_servers_list = list(cdn.edge_servers.values())
        selected_server = cdn.geographic_router.route_request(request, edge_servers_list)
        
        if selected_server:
            location = selected_server.config.location
            print(f"   {description:20} → {selected_server.config.server_id} ({location.city})")
    
    # Test content delivery and caching
    print(f"\n📦 Testing Content Delivery and Caching:")
    print("-" * 45)
    
    for i, url in enumerate(test_urls[:3], 1):
        print(f"\n   Request {i}: {url}")
        
        # First request (cache miss)
        request = CDNRequest(url=url, client_ip="127.0.0.1")
        start_time = time.time()
        response = cdn.handle_request(request)
        first_response_time = (time.time() - start_time) * 1000
        
        print(f"      First request:  {response.status_code} | {response.cache_status.value:4} | {first_response_time:.1f}ms")
        
        # Second request (cache hit)
        start_time = time.time()
        response = cdn.handle_request(request)
        second_response_time = (time.time() - start_time) * 1000
        
        print(f"      Second request: {response.status_code} | {response.cache_status.value:4} | {second_response_time:.1f}ms")
        print(f"      Speedup: {first_response_time/second_response_time:.1f}x faster")
    
    # Test cache invalidation
    print(f"\n🗑️ Testing Cache Invalidation:")
    print("-" * 35)
    
    invalidation_results = cdn.invalidate_content("/get")
    total_invalidated = sum(invalidation_results.values())
    print(f"   Invalidated {total_invalidated} cache entries across all edge servers")
    
    for server_id, count in invalidation_results.items():
        print(f"      {server_id}: {count} entries")
    
    # Test cache warming
    print(f"\n🔥 Testing Cache Warming:")
    print("-" * 30)
    
    warm_urls = ["/json", "/uuid"]
    cdn.warm_cache(warm_urls)
    print(f"   Warmed cache with {len(warm_urls)} URLs across all edge servers")
    
    # Performance test
    print(f"\n⚡ Performance Testing:")
    print("-" * 25)
    
    tester = CDNTester(cdn)
    results = tester.run_load_test(
        requests_per_second=20,
        duration_seconds=5,
        test_urls=test_urls
    )
    
    print(f"   Total Requests: {results['requests_sent']}")
    print(f"   Success Rate: {results['success_rate']:.1f}%")
    print(f"   Avg Response Time: {results.get('avg_response_time', 0):.1f}ms")
    
    if 'p95_response_time' in results:
        print(f"   P95 Response Time: {results['p95_response_time']:.1f}ms")
    
    # System metrics
    print(f"\n📊 System Metrics:")
    print("-" * 20)
    
    metrics = cdn.get_system_metrics()
    global_metrics = metrics['global_metrics']
    system_stats = metrics['system_stats']
    
    print(f"   Total Requests: {global_metrics['total_requests']}")
    print(f"   Cache Hit Ratio: {global_metrics['cache_hit_ratio']:.1%}")
    print(f"   Average Response Time: {global_metrics['average_response_time_ms']:.1f}ms")
    print(f"   Bandwidth: {global_metrics['bandwidth_mbps']:.2f} Mbps")
    print(f"   Healthy Edge Servers: {system_stats['healthy_servers']}/{system_stats['total_edge_servers']}")
    print(f"   Average Load: {system_stats['average_load']:.1%}")
    
    # Edge server breakdown
    print(f"\n🖥️ Edge Server Performance:")
    print("-" * 30)
    
    for server_id, server_metrics in metrics['edge_servers'].items():
        location = cdn.edge_servers[server_id].config.location
        print(f"   {server_id} ({location.city}):")
        print(f"      Requests: {server_metrics['total_requests']}")
        print(f"      Cache Hit Ratio: {server_metrics['cache_hit_ratio']:.1%}")
        print(f"      Current Load: {server_metrics['current_load']:.1%}")
    
    cdn.stop()
    
    print(f"\n✅ Demo completed successfully!")
    print(f"🎯 CDN System demonstrates enterprise-level capabilities:")
    print(f"   • Global edge server network with geographic routing")
    print(f"   • Multi-tier caching with intelligent policies")
    print(f"   • Content optimization and compression")
    print(f"   • Real-time cache invalidation and warming")
    print(f"   • Comprehensive analytics and monitoring")
    print(f"   • High-performance content delivery")

if __name__ == "__main__":
    run_comprehensive_demo()