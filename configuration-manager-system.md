# Configuration Manager System

## 🔗 Implementation Links

- **Python Implementation**: [python/configuration-manager/main.py](python/configuration-manager/main.py)
- **JavaScript Implementation**: [javascript/configuration-manager/main.js](javascript/configuration-manager/main.js)

## Problem Statement

Design a Configuration Manager system that can:

1. **Load configuration from multiple sources** (files, environment variables, databases, remote services)
2. **Support hot reload** for configuration changes without restart
3. **Validate configuration values** with type checking and constraints
4. **Handle environment-specific configs** (development, staging, production)
5. **Provide hierarchical configuration** with inheritance and overrides
6. **Cache configuration** for performance
7. **Secure sensitive data** with encryption
8. **Support dynamic updates** with change notifications

## Requirements

### Functional Requirements

- Load configuration from multiple sources (JSON, YAML, ENV, remote)
- Merge configurations with priority/precedence rules
- Get/set configuration values with dot notation (e.g., `database.host`)
- Support default values and fallbacks
- Validate configuration schema
- Reload configuration dynamically (hot reload)
- Support environment-specific configurations
- Encrypt/decrypt sensitive values
- Provide change notifications (Observer pattern)
- Export/import configuration
- Support configuration templates

### Non-Functional Requirements

- Fast access: O(1) lookup with caching
- Thread-safe for concurrent access
- Low memory footprint
- Support lazy loading
- Handle configuration errors gracefully
- Audit trail for configuration changes
- Backward compatibility during updates

## Design Decisions

### Key Classes

1. **Configuration Manager**
   - `ConfigManager`: Singleton managing all configurations
   - Central access point for all config operations

2. **Configuration Sources**
   - `ConfigSource`: Abstract base for different sources
   - `FileConfigSource`: JSON/YAML file loader
   - `EnvironmentConfigSource`: Environment variables
   - `RemoteConfigSource`: Load from remote API/database
   - `InMemoryConfigSource`: Runtime configuration

3. **Configuration**
   - `Config`: Holds configuration key-value pairs
   - Supports hierarchical access with dot notation
   - Validates types and constraints

4. **Validators**
   - `ConfigValidator`: Validates configuration values
   - `TypeValidator`: Type checking
   - `RangeValidator`: Numeric range validation
   - `RegexValidator`: Pattern matching

5. **Change Management**
   - `ConfigObserver`: Notified on config changes
   - `ConfigWatcher`: Monitors files for changes
   - Hot reload capability

### Design Patterns Used

1. **Singleton Pattern**: Single ConfigManager instance
2. **Strategy Pattern**: Different configuration sources
3. **Observer Pattern**: Change notifications
4. **Factory Pattern**: Create validators and sources
5. **Decorator Pattern**: Add features like encryption, caching
6. **Chain of Responsibility**: Validate through multiple validators
7. **Template Method**: Configuration loading workflow

### Key Features

- **Multi-Source Loading**: Combine configs from multiple sources
- **Priority System**: Source precedence (env > file > default)
- **Hot Reload**: Watch files and reload on change
- **Type Safety**: Validate types and constraints
- **Encryption**: Secure sensitive values
- **Caching**: Fast access with invalidation
- **Hierarchical**: Nested configuration with inheritance

## Class Diagram

```text
ConfigManager (Singleton)
├── sources: List[ConfigSource]
├── config: Config
├── validators: List[ConfigValidator]
├── observers: List[ConfigObserver]
├── cache: ConfigCache
├── get(key: str, default: Any)
├── set(key: str, value: Any)
├── reload()
├── validate()
└── add_observer(observer)

ConfigSource (Abstract)
├── load() → Dict
├── save(config: Dict)
├── watch() → bool
└── implementations:
    ├── FileConfigSource
    ├── EnvironmentConfigSource
    ├── RemoteConfigSource
    └── InMemoryConfigSource

Config
├── data: Dict
├── schema: ConfigSchema
├── get(key: str, default: Any)
├── set(key: str, value: Any)
├── merge(other: Config)
├── validate()
└── to_dict()

ConfigValidator (Abstract)
├── validate(key: str, value: Any) → bool
└── implementations:
    ├── TypeValidator
    ├── RangeValidator
    ├── RegexValidator
    └── CustomValidator

ConfigObserver (Interface)
├── on_config_changed(key: str, old_value, new_value)
└── on_config_reloaded()

ConfigCache
├── cache: Dict
├── ttl: int
├── get(key: str)
├── set(key: str, value: Any)
├── invalidate(key: str)
└── clear()

ConfigSchema
├── properties: Dict[str, Property]
├── validate(config: Dict)
└── generate_default()
```

## Usage Example

```python
# Initialize configuration manager
config_manager = ConfigManager()

# Add configuration sources (priority order)
config_manager.add_source(FileConfigSource("config.json"))
config_manager.add_source(EnvironmentConfigSource())
config_manager.add_source(RemoteConfigSource("https://config-api.com"))

# Load configuration
config_manager.load()

# Get configuration values
db_host = config_manager.get("database.host", "localhost")
db_port = config_manager.get("database.port", 5432)
api_key = config_manager.get("api.key")  # Encrypted value

# Set configuration values
config_manager.set("cache.ttl", 3600)
config_manager.set("feature.newUI", True)

# Register observer for changes
class AppConfigObserver(ConfigObserver):
    def on_config_changed(self, key, old_value, new_value):
        print(f"Config changed: {key} = {new_value}")

config_manager.add_observer(AppConfigObserver())

# Enable hot reload
config_manager.enable_hot_reload(interval=30)  # Check every 30 seconds

# Validate configuration
config_manager.validate()

# Get all configuration
all_config = config_manager.get_all()
```

## Configuration Sources

### 1. File-Based Configuration

```json
{
  "database": {
    "host": "localhost",
    "port": 5432,
    "name": "myapp"
  },
  "cache": {
    "enabled": true,
    "ttl": 3600
  },
  "logging": {
    "level": "INFO",
    "file": "/var/log/app.log"
  }
}
```

### 2. Environment Variables

```bash
APP_DATABASE__HOST=prod-db.example.com
APP_DATABASE__PORT=5432
APP_CACHE__ENABLED=true
APP_API__KEY=secret_key_123
```

### 3. Remote Configuration

```python
remote_source = RemoteConfigSource(
    url="https://config-service.com/api/config",
    headers={"Authorization": "Bearer token"}
)
```

### 4. Multi-Environment Support

```python
config_manager.load_environment("production")
# Loads: config.json + config.production.json + env vars
```

## Configuration Hierarchy

```text
Priority (high to low):
1. Environment Variables
2. Command-line Arguments
3. Remote Configuration
4. Environment-Specific Files (config.production.json)
5. Base Configuration File (config.json)
6. Default Values

Example:
- config.json: {"database": {"host": "localhost", "port": 5432}}
- config.production.json: {"database": {"host": "prod-db.com"}}
- ENV: APP_DATABASE__PORT=3306

Result: {"database": {"host": "prod-db.com", "port": 3306}}
```

## Validation

### Type Validation

```python
schema = {
    "database.host": {
        "type": "string",
        "required": True
    },
    "database.port": {
        "type": "integer",
        "min": 1,
        "max": 65535
    },
    "cache.enabled": {
        "type": "boolean",
        "default": True
    }
}

config_manager.set_schema(schema)
config_manager.validate()  # Raises error if invalid
```

### Custom Validators

```python
class URLValidator(ConfigValidator):
    def validate(self, key, value):
        if not value.startswith(('http://', 'https://')):
            raise ValidationError(f"{key} must be valid URL")

config_manager.add_validator("api.endpoint", URLValidator())
```

## Hot Reload

### File Watching

```python
# Auto-reload when config file changes
config_manager.enable_hot_reload()

# Manual reload
config_manager.reload()
```

### Change Notification

```python
class DatabaseConfigObserver(ConfigObserver):
    def on_config_changed(self, key, old_value, new_value):
        if key.startswith("database."):
            print("Database config changed, reconnecting...")
            db_connection.reconnect()

config_manager.add_observer(DatabaseConfigObserver())
```

## Encryption for Sensitive Data

### Encrypting Values

```python
# Store encrypted
config_manager.set_encrypted("api.secret_key", "my_secret_123")

# Retrieve decrypted
secret = config_manager.get("api.secret_key")
```

### Configuration File with Encrypted Values

```json
{
  "api": {
    "key": "ENC(AES:base64_encrypted_value)",
    "secret": "ENC(AES:another_encrypted_value)"
  }
}
```

## Advanced Features

### 1. Configuration Profiles

```python
# Development profile
config_manager.load_profile("development")

# Production profile
config_manager.load_profile("production")

# Custom profile
config_manager.load_profile("testing")
```

### 2. Configuration Inheritance

```yaml
# base.yaml
database:
  host: localhost
  port: 5432

# production.yaml (inherits from base)
_inherit: base.yaml
database:
  host: prod-db.example.com
```

### 3. Dynamic Configuration

```python
# Update configuration at runtime
config_manager.set("feature.flags.newUI", True)

# Get with type hint
enabled: bool = config_manager.get_bool("feature.flags.newUI")
```

### 4. Configuration Templates

```yaml
# template.yaml
database:
  url: "postgresql://{{DB_USER}}:{{DB_PASS}}@{{DB_HOST}}:{{DB_PORT}}/{{DB_NAME}}"

# Resolved:
database:
  url: "postgresql://admin:secret@localhost:5432/mydb"
```

## Real-World Use Cases

### 1. Microservices Configuration

```python
# Service A
service_a_config = ConfigManager.get_instance()
service_a_config.add_source(RemoteConfigSource("config-server:8888"))
service_a_config.load()

# Dynamic feature flags
if service_a_config.get("features.newAPI"):
    use_new_api()
```

### 2. Multi-Tenant Application

```python
# Tenant-specific configuration
tenant_id = request.headers.get("X-Tenant-ID")
config = config_manager.get_tenant_config(tenant_id)

db_host = config.get("database.host")
```

### 3. A/B Testing Configuration

```python
# Feature flags for A/B testing
if config_manager.get("experiments.checkout_v2.enabled"):
    if user_id % 2 == 0:
        show_checkout_v2()
    else:
        show_checkout_v1()
```

### 4. CI/CD Pipeline

```python
# Different configs for different stages
if os.environ.get("CI_ENVIRONMENT") == "staging":
    config_manager.load_profile("staging")
elif os.environ.get("CI_ENVIRONMENT") == "production":
    config_manager.load_profile("production")
```

## Performance Optimizations

### 1. Caching

```python
# Cache frequently accessed values
config_manager.enable_cache(ttl=300)  # 5 minutes

# Cache hit rate
stats = config_manager.get_cache_stats()
print(f"Hit rate: {stats['hit_rate']:.2%}")
```

### 2. Lazy Loading

```python
# Load config only when accessed
config_manager.enable_lazy_loading()

# First access triggers load
value = config_manager.get("database.host")
```

### 3. Batch Operations

```python
# Get multiple values at once
values = config_manager.get_many([
    "database.host",
    "database.port",
    "cache.ttl"
])
```

## Security Considerations

1. **Encryption**: Encrypt sensitive configuration values
2. **Access Control**: Restrict who can modify configuration
3. **Audit Trail**: Log all configuration changes
4. **Secrets Management**: Integrate with vault systems
5. **Validation**: Prevent injection attacks through validation

## Testing Strategies

### Unit Tests

```python
def test_config_loading():
    config = ConfigManager()
    config.add_source(InMemoryConfigSource({
        "database.host": "localhost"
    }))
    config.load()
    
    assert config.get("database.host") == "localhost"

def test_config_validation():
    config = ConfigManager()
    schema = {"port": {"type": "integer", "min": 1, "max": 65535}}
    config.set_schema(schema)
    
    with pytest.raises(ValidationError):
        config.set("port", 99999)

def test_config_merge():
    base = Config({"a": 1, "b": 2})
    override = Config({"b": 3, "c": 4})
    
    base.merge(override)
    
    assert base.get("a") == 1
    assert base.get("b") == 3
    assert base.get("c") == 4
```

### Integration Tests

```python
def test_file_reload():
    config = ConfigManager()
    config.add_source(FileConfigSource("test_config.json"))
    config.load()
    
    # Modify file
    update_config_file("test_config.json", {"key": "new_value"})
    
    # Reload
    config.reload()
    
    assert config.get("key") == "new_value"
```

## Best Practices

1. **Use Environment Variables for Secrets**: Never commit secrets to version control
2. **Validate Early**: Validate configuration at startup
3. **Provide Defaults**: Always have sensible defaults
4. **Document Configuration**: Maintain schema documentation
5. **Version Configuration**: Track configuration changes
6. **Separate by Environment**: Different configs for dev/staging/prod
7. **Monitor Changes**: Alert on configuration changes
8. **Test Configuration**: Include config validation in CI/CD

## Common Patterns

### 1. Twelve-Factor App

```text
Store config in environment:
✅ Environment variables for config
✅ One codebase, multiple deploys
✅ Config separate from code
```

### 2. Configuration as Code

```python
# config.py (checked into git)
DEFAULT_CONFIG = {
    "database": {
        "pool_size": 10,
        "timeout": 30
    }
}

# secrets.env (not in git, injected at runtime)
DATABASE_PASSWORD=secret123
API_KEY=key456
```

### 3. Feature Flags

```python
class FeatureFlags:
    def __init__(self, config_manager):
        self.config = config_manager
    
    def is_enabled(self, feature_name):
        return self.config.get(f"features.{feature_name}", False)

flags = FeatureFlags(config_manager)
if flags.is_enabled("new_checkout"):
    # Use new checkout flow
```

## Integration Examples

### Spring Boot Style

```python
@Configuration
class DatabaseConfig:
    def __init__(self, config_manager):
        self.host = config_manager.get("database.host")
        self.port = config_manager.get("database.port")
        self.name = config_manager.get("database.name")
```

### Django Style

```python
# settings.py
config_manager = ConfigManager.get_instance()
config_manager.load_environment(os.environ.get("DJANGO_ENV", "development"))

DATABASES = {
    'default': {
        'ENGINE': config_manager.get("database.engine"),
        'NAME': config_manager.get("database.name"),
        'HOST': config_manager.get("database.host"),
    }
}
```

### Express.js Style

```javascript
const configManager = ConfigManager.getInstance();
configManager.addSource(new FileConfigSource('config.json'));
configManager.load();

const app = express();
const port = configManager.get('server.port', 3000);

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
```

## Time Complexity

| Operation | Complexity | Notes |
|-----------|------------|-------|
| Get | O(1) | With caching |
| Set | O(1) | Direct map access |
| Load | O(n) | n = config entries |
| Validate | O(n × v) | n entries, v validators |
| Merge | O(n) | Deep merge |
| Reload | O(n) | Full reload |

## Space Complexity

| Component | Space |
|-----------|-------|
| Configuration | O(n) |
| Cache | O(c) |
| Observers | O(o) |
| Validators | O(v) |

**Note:** n = config entries, c = cached entries, o = observers, v = validators

## Interview Discussion Points

1. **How to handle configuration conflicts?**
   - Priority system with clear precedence
   - Validation before applying
   - Merge strategies (deep vs shallow)

2. **How to ensure thread safety?**
   - Lock on read/write operations
   - Immutable configuration objects
   - Copy-on-write pattern

3. **How to scale to thousands of microservices?**
   - Centralized configuration server
   - Caching at each service
   - Event-driven updates

4. **How to handle configuration errors?**
   - Fail fast at startup
   - Validation before deployment
   - Fallback to last known good config

5. **How to debug configuration issues?**
   - Audit trail of changes
   - Current effective configuration API
   - Configuration source tracking

## Summary

Configuration Manager is essential for modern applications:

- **Flexible**: Multiple sources with priority
- **Dynamic**: Hot reload without restart
- **Secure**: Encryption for sensitive data
- **Observable**: Change notifications
- **Validated**: Type and constraint checking
- **Scalable**: Distributed configuration support

Perfect for:

- Microservices architectures
- Multi-environment deployments
- Feature flag systems
- A/B testing platforms
- Dynamic application configuration
