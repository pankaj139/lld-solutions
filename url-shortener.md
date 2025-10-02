# URL Shortener

## 🔗 Implementation Links
- **Python Implementation**: [python/url-shortener/main.py](python/url-shortener/main.py)
- **JavaScript Implementation**: [javascript/url-shortener/main.js](javascript/url-shortener/main.js)

## Problem Statement

Design a URL shortening service like bit.ly or tinyurl that can:

1. **Shorten long URLs** into compact, shareable links
2. **Support custom aliases** for branded short URLs
3. **Track click analytics** with detailed metrics
4. **Handle URL expiration** and lifecycle management
5. **Provide user accounts** with URL management
6. **Scale to millions of URLs** with fast redirects
7. **Implement caching** for performance optimization

## Requirements

### Functional Requirements
- URL shortening with automatic code generation
- Custom alias support for branded URLs
- URL expansion and redirection
- Click tracking and analytics
- User registration and URL management
- URL expiration and deletion
- Analytics dashboard with metrics

### Non-Functional Requirements
- Handle millions of URLs and redirects
- Sub-100ms redirect response time
- High availability (99.9% uptime)
- Scalable storage and caching
- Global CDN distribution

## Design Patterns Used

1. **Strategy Pattern**: Different URL generation algorithms (Base62, MD5, etc.)
2. **Factory Pattern**: URL generator creation
3. **Observer Pattern**: Analytics tracking and notifications
4. **Cache Pattern**: LRU cache for frequently accessed URLs
5. **Template Method**: Common URL operations with specific implementations

## Key Features

- **Multiple Generation Strategies**: Base62 encoding, hash-based generation
- **Custom Aliases**: User-defined short codes for branding
- **Comprehensive Analytics**: Click tracking, geographical data, referrer stats
- **Expiration Management**: Time-based URL expiration
- **LRU Caching**: Fast access to popular URLs
- **User Management**: Account-based URL organization

## URL Generation Algorithms

### Base62 Encoding
- **Character Set**: a-z, A-Z, 0-9 (62 characters)
- **Length**: 6-8 characters
- **Collision**: Random generation with collision detection

### Hash-based Generation
- **Algorithm**: MD5 hash of original URL
- **Length**: First 8 characters of hash
- **Collision**: Deterministic but possible conflicts

## Analytics Features

- **Click Count**: Total and unique clicks
- **Geographic Data**: Country-wise click distribution
- **Referrer Tracking**: Source of traffic
- **Time-based Analytics**: Daily/weekly/monthly trends
- **User-Agent Analysis**: Browser and device statistics

## Time Complexity

- **URL Shortening**: O(1) average case
- **URL Expansion**: O(1) with caching
- **Analytics Query**: O(n) where n is click records
- **Cache Operations**: O(1) for LRU cache

## Space Complexity

- **URL Storage**: O(n) where n is total URLs
- **Cache Storage**: O(k) where k is cache size
- **Analytics Data**: O(m) where m is total clicks

## Extension Points

1. **QR Code Generation**: Visual representation of short URLs
2. **API Rate Limiting**: Prevent abuse and ensure fair usage
3. **Bulk Operations**: Batch URL shortening and management
4. **Advanced Analytics**: Heat maps, conversion tracking, A/B testing
5. **Enterprise Features**: Team collaboration, white-label solutions