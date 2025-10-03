# URL Shortener

## 🔗 Implementation Links

- **Python Implementation**: [python/url-shortener/main.py](python/url-shortener/main.py)
- **JavaScript Implementation**: [javascript/url-shortener/main.js](javascript/url-shortener/main.js)

## Problem Statement

Design a URL shortening service (like bit.ly, TinyURL) that converts long URLs into short, manageable links, tracks click analytics, supports custom aliases, and handles high traffic with low latency.

## Requirements

### Functional Requirements

- Generate short URL from long URL
- Redirect short URL to original long URL
- Support custom aliases for URLs
- Track click count and analytics
- Set expiration dates for URLs
- Prevent duplicate short codes
- Handle URL validation
- Support bulk URL shortening
- Provide QR code generation
- Allow URL editing (change destination)

### Non-Functional Requirements

- Generate short URL in < 100ms
- Redirect in < 50ms
- Support 1 billion+ URLs
- Handle 10,000 requests per second
- 99.99% availability
- Scalable horizontally
- Short URLs should be 6-8 characters
- Case-sensitive short codes

## Design Decisions

### Key Classes

1. **URL Management**
   - `URLMapping`: Maps short code to long URL
   - `URLMetadata`: Stores creation date, expiry, clicks
   - `ShortCode`: Unique identifier generation

2. **Code Generation**
   - `CodeGenerator`: Strategy for generating short codes
   - `Base62Encoder`: Alphanumeric encoding
   - `CustomAliasValidator`: Validates custom aliases

3. **Analytics**
   - `ClickTracker`: Records click events
   - `Analytics`: Aggregated statistics
   - `GeoLocation`: Track visitor location

4. **Service Layer**
   - `URLShortener`: Main service (Singleton)
   - `URLRepository`: Data access abstraction
   - `CacheManager`: In-memory cache

### Design Patterns Used

1. **Strategy Pattern**: URL encoding strategies
   - Base62 encoding
   - Base58 encoding
   - Custom hash-based encoding
   - Easy to add new strategies

2. **Repository Pattern**: Data access abstraction
   - In-memory storage
   - Database storage
   - Distributed cache
   - Clean separation of concerns

3. **Factory Pattern**: Short URL creation
   - Standardized URL generation
   - Different URL types
   - Configuration-based creation

4. **Singleton Pattern**: Service instance
   - Single shortener service
   - Global access point
   - Resource management

5. **Observer Pattern**: Analytics tracking
   - Notify on URL access
   - Real-time analytics
   - Event streaming

### Key Features

- **Collision Avoidance**: Unique short code generation
- **Custom Aliases**: User-friendly short URLs
- **Click Analytics**: Track usage statistics
- **Expiration**: Auto-delete old URLs
- **Rate Limiting**: Prevent abuse

## State Diagram

```text
URL LIFECYCLE:

CREATED
  ↓ (activate)
ACTIVE
  ├─→ (access) → [increment_clicks] → ACTIVE
  ├─→ (expire) → EXPIRED
  ├─→ (deactivate) → INACTIVE
  └─→ (delete) → DELETED

INACTIVE
  ↓ (reactivate)
ACTIVE

EXPIRED
  ↓ (renew)
ACTIVE
  ↓ (cleanup_job)
DELETED
```

## Class Diagram

```text
URLMapping
├── short_code: str
├── long_url: str
├── created_at: datetime
├── expires_at: Optional[datetime]
├── click_count: int
├── is_active: bool
├── creator_id: Optional[str]
├── increment_clicks() → None
└── is_expired() → bool

CodeGenerator (Strategy)
├── generate(length) → str
├── is_valid_custom_code(code) → bool
└── encode_id(id) → str

URLShortener (Singleton)
├── url_map: Dict[str, URLMapping]
├── reverse_map: Dict[str, str]
├── base_url: str
├── shorten(long_url, custom_alias) → str
├── expand(short_url) → Optional[str]
├── get_stats(short_url) → Dict
├── delete(short_url) → bool
└── update(short_url, new_long_url) → bool

Analytics
├── url_clicks: Dict[str, int]
├── geographic_data: Dict
├── referrer_data: Dict
├── record_click(short_url, metadata) → None
└── get_report(short_url) → Dict

CacheManager
├── cache: Dict
├── ttl: int
├── get(key) → Optional[Any]
├── set(key, value) → None
└── invalidate(key) → None
```

## Usage Example

```python
# Initialize service
shortener = URLShortener()

# Shorten URL
short = shortener.shorten("https://example.com/very/long/url")
# Returns: "https://short.ly/abc123"

# Custom alias
short = shortener.shorten(
    "https://example.com/product/123",
    custom_alias="myproduct"
)
# Returns: "https://short.ly/myproduct"

# Expand URL
original = shortener.expand("https://short.ly/abc123")
# Returns: "https://example.com/very/long/url"

# Get statistics
stats = shortener.get_stats("https://short.ly/abc123")
# Returns: {'clicks': 42, 'created_at': '...', 'long_url': '...'}

# Delete URL
shortener.delete("https://short.ly/abc123")
```

## Business Rules

1. **URL Creation Rules**
   - Long URL must be valid HTTP/HTTPS URL
   - Custom aliases must be 3-20 characters
   - Custom aliases only alphanumeric characters
   - Duplicate long URLs return existing short URL
   - Short codes are case-sensitive

2. **Custom Alias Rules**
   - First-come-first-served for aliases
   - Cannot override existing short codes
   - Reserved keywords not allowed
   - Profanity filter for custom aliases

3. **Expiration Rules**
   - Default no expiration
   - Max expiration: 10 years
   - Expired URLs show expiration message
   - Cleanup job runs daily for expired URLs

4. **Click Tracking Rules**
   - Every redirect increments counter
   - Track unique visitors separately
   - Bot traffic filtered from analytics
   - Privacy-compliant tracking

5. **Rate Limiting**
   - 100 shortenings per hour per IP
   - 1000 redirects per minute per URL
   - Premium users get higher limits

## Extension Points

1. **Advanced Analytics**: Geographic, device, browser tracking
2. **A/B Testing**: Multiple destinations with traffic split
3. **Link Preview**: Show preview before redirect
4. **Password Protection**: Secure URLs with passwords
5. **QR Codes**: Generate QR codes for URLs
6. **API Access**: RESTful API for developers
7. **Browser Extension**: Quick shortening from browser
8. **Link Bundles**: Group related URLs

## Security Considerations

- **Malicious URL Detection**: Scan for phishing/malware
- **Rate Limiting**: Prevent abuse and DDoS
- **CAPTCHA**: Human verification for suspicious activity
- **URL Validation**: Prevent open redirect vulnerabilities
- **Access Logs**: Audit trail for all operations
- **HTTPS Only**: Secure communication
- **Content Security**: Block inappropriate content

## Time Complexity

- **Shorten URL**: O(1) average, O(k) worst case where k is collision retries
- **Expand URL**: O(1) with hash map lookup
- **Check Duplicate**: O(1) with reverse map
- **Generate Code**: O(1) for random generation
- **Get Statistics**: O(1) for single URL lookup
- **Delete URL**: O(1) for removal

## Space Complexity

- O(n) for URL mappings where n is total URLs
- O(n) for reverse mappings
- O(n) for analytics data
- O(c) for cache where c is cached entries
- O(1) for code generation algorithm
