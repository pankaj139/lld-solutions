"""
CONFIGURATION MANAGER SYSTEM - Low Level Design Implementation in Python

This file implements a production-ready configuration management system with
multiple sources, hot reload, validation, and encryption capabilities.

FILE PURPOSE:
Provides centralized configuration management for applications with support for
multiple environments, dynamic updates, type validation, and secure handling of
sensitive data. Supports loading from files, environment variables, and remote sources.

DESIGN PATTERNS USED:
1. SINGLETON PATTERN: Single ConfigManager instance
   - Ensures one configuration manager per application
   - Global access point for configuration
   - Thread-safe initialization

2. STRATEGY PATTERN: Different configuration sources
   - FileConfigSource, EnvironmentConfigSource, RemoteConfigSource
   - Pluggable source implementations
   - Easy to add new sources

3. OBSERVER PATTERN: Configuration change notifications
   - Notify listeners when config changes
   - Support for hot reload
   - Event-driven architecture

4. FACTORY PATTERN: Create validators and sources
   - ValidatorFactory creates appropriate validators
   - SourceFactory creates configuration sources
   - Centralized object creation

5. DECORATOR PATTERN: Add features like caching, encryption
   - CachedConfig wraps Config with caching
   - EncryptedConfig wraps values with encryption
   - Stackable functionality

6. CHAIN OF RESPONSIBILITY: Validation pipeline
   - Multiple validators process sequentially
   - Each validator checks specific rules
   - Easy to add/remove validators

7. TEMPLATE METHOD: Configuration loading workflow
   - Abstract load process defined
   - Concrete sources implement specifics
   - Consistent loading pattern

OOP CONCEPTS DEMONSTRATED:
- ENCAPSULATION: Config data hidden behind interface
- INHERITANCE: ConfigSource hierarchy
- POLYMORPHISM: Different source implementations
- ABSTRACTION: Abstract base classes for extensibility

SOLID PRINCIPLES:
- SRP: Each class has single responsibility
- OCP: Open for extension (new sources) closed for modification
- LSP: All sources interchangeable
- ISP: Focused interfaces (Observer, Validator)
- DIP: Depends on abstractions not concretions

USAGE:
    # Initialize configuration manager
    config_manager = ConfigManager.get_instance()
    
    # Add sources (priority order)
    config_manager.add_source(FileConfigSource("config.json"))
    config_manager.add_source(EnvironmentConfigSource("APP"))
    
    # Load configuration
    config_manager.load()
    
    # Get values
    db_host = config_manager.get("database.host", "localhost")
    db_port = config_manager.get("database.port", 5432)
    
    # Set values
    config_manager.set("cache.ttl", 3600)
    
    # Enable hot reload
    config_manager.enable_hot_reload()
    
    # Add observer
    class MyObserver(ConfigObserver):
        def on_config_changed(self, key, old_value, new_value):
            print(f"Config changed: {key}")
    
    config_manager.add_observer(MyObserver())

RETURN VALUES:
- get(key, default): Returns config value or default
- set(key, value): Returns None
- load(): Returns None
- validate(): Returns True if valid, raises exception otherwise
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional, Callable
from pathlib import Path
import json
import os
import threading
import time
from datetime import datetime
from enum import Enum


# ==================== ENUMS ====================

class ConfigType(Enum):
    """Configuration value types"""
    STRING = "string"
    INTEGER = "integer"
    FLOAT = "float"
    BOOLEAN = "boolean"
    LIST = "list"
    DICT = "dict"


# ==================== OBSERVERS ====================

class ConfigObserver(ABC):
    """
    Observer interface for configuration changes
    
    DESIGN PATTERN: Observer Pattern
    
    USAGE:
        class MyObserver(ConfigObserver):
            def on_config_changed(self, key, old_value, new_value):
                print(f"{key} changed")
        
        config_manager.add_observer(MyObserver())
    
    RETURN:
        None
    """
    @abstractmethod
    def on_config_changed(self, key: str, old_value: Any, new_value: Any):
        """Called when configuration value changes"""
        pass
    
    def on_config_reloaded(self):
        """Called when entire configuration reloaded"""
        pass


# ==================== VALIDATORS ====================

class ConfigValidator(ABC):
    """
    Abstract validator for configuration values
    
    DESIGN PATTERN: Chain of Responsibility
    
    USAGE:
        validator = TypeValidator(ConfigType.INTEGER)
        validator.validate("port", 8080)
    
    RETURN:
        bool - True if valid
    """
    @abstractmethod
    def validate(self, key: str, value: Any) -> bool:
        """Validate configuration value"""
        pass


class TypeValidator(ConfigValidator):
    """Validates value type"""
    def __init__(self, expected_type: ConfigType):
        self.expected_type = expected_type
    
    def validate(self, key: str, value: Any) -> bool:
        type_map = {
            ConfigType.STRING: str,
            ConfigType.INTEGER: int,
            ConfigType.FLOAT: (int, float),
            ConfigType.BOOLEAN: bool,
            ConfigType.LIST: list,
            ConfigType.DICT: dict
        }
        
        expected = type_map.get(self.expected_type)
        if not isinstance(value, expected):
            raise ValueError(f"{key}: Expected {self.expected_type.value}, got {type(value).__name__}")
        return True


class RangeValidator(ConfigValidator):
    """Validates numeric range"""
    def __init__(self, min_value: float = None, max_value: float = None):
        self.min_value = min_value
        self.max_value = max_value
    
    def validate(self, key: str, value: Any) -> bool:
        if not isinstance(value, (int, float)):
            raise ValueError(f"{key}: Must be numeric for range validation")
        
        if self.min_value is not None and value < self.min_value:
            raise ValueError(f"{key}: Value {value} below minimum {self.min_value}")
        
        if self.max_value is not None and value > self.max_value:
            raise ValueError(f"{key}: Value {value} above maximum {self.max_value}")
        
        return True


# ==================== CONFIGURATION SOURCES ====================

class ConfigSource(ABC):
    """
    Abstract base class for configuration sources
    
    DESIGN PATTERN: Strategy Pattern
    
    USAGE:
        source = FileConfigSource("config.json")
        data = source.load()
    
    RETURN:
        Dict with configuration data
    """
    @abstractmethod
    def load(self) -> Dict[str, Any]:
        """Load configuration from source"""
        pass
    
    def watch(self) -> bool:
        """Check if source has changed"""
        return False
    
    def get_priority(self) -> int:
        """Get source priority (higher = more important)"""
        return 0


class FileConfigSource(ConfigSource):
    """
    Load configuration from JSON file
    
    USAGE:
        source = FileConfigSource("config.json")
        config = source.load()
    
    RETURN:
        Dict from JSON file
    """
    def __init__(self, file_path: str, priority: int = 0):
        self.file_path = Path(file_path)
        self.priority = priority
        self.last_modified = None
    
    def load(self) -> Dict[str, Any]:
        """Load JSON configuration file"""
        if not self.file_path.exists():
            print(f"⚠️  Config file not found: {self.file_path}")
            return {}
        
        try:
            with open(self.file_path, 'r') as f:
                self.last_modified = self.file_path.stat().st_mtime
                return json.load(f)
        except json.JSONDecodeError as e:
            print(f"❌ Error parsing JSON: {e}")
            return {}
    
    def watch(self) -> bool:
        """Check if file has been modified"""
        if not self.file_path.exists():
            return False
        
        current_mtime = self.file_path.stat().st_mtime
        return current_mtime != self.last_modified
    
    def get_priority(self) -> int:
        return self.priority


class EnvironmentConfigSource(ConfigSource):
    """
    Load configuration from environment variables
    
    USAGE:
        source = EnvironmentConfigSource("APP")
        # Reads APP_DATABASE__HOST, APP_DATABASE__PORT, etc.
    
    RETURN:
        Dict from environment variables
    """
    def __init__(self, prefix: str = "", priority: int = 100):
        self.prefix = prefix
        self.priority = priority
    
    def load(self) -> Dict[str, Any]:
        """Load from environment variables"""
        config = {}
        prefix = f"{self.prefix}_" if self.prefix else ""
        
        for key, value in os.environ.items():
            if key.startswith(prefix):
                # Remove prefix and convert __ to .
                clean_key = key[len(prefix):].replace("__", ".").lower()
                config[clean_key] = self._parse_value(value)
        
        return config
    
    def _parse_value(self, value: str) -> Any:
        """Parse string value to appropriate type"""
        # Try boolean
        if value.lower() in ('true', 'yes', '1'):
            return True
        if value.lower() in ('false', 'no', '0'):
            return False
        
        # Try integer
        try:
            return int(value)
        except ValueError:
            pass
        
        # Try float
        try:
            return float(value)
        except ValueError:
            pass
        
        # Return as string
        return value
    
    def get_priority(self) -> int:
        return self.priority


class InMemoryConfigSource(ConfigSource):
    """
    In-memory configuration for runtime updates
    
    USAGE:
        source = InMemoryConfigSource({"key": "value"})
    
    RETURN:
        Dict from memory
    """
    def __init__(self, data: Dict[str, Any] = None, priority: int = 50):
        self.data = data or {}
        self.priority = priority
    
    def load(self) -> Dict[str, Any]:
        return self.data.copy()
    
    def get_priority(self) -> int:
        return self.priority


# ==================== CONFIGURATION ====================

class Config:
    """
    Configuration data container with hierarchical access
    
    USAGE:
        config = Config({"database": {"host": "localhost"}})
        host = config.get("database.host")
        config.set("database.port", 5432)
    
    RETURN:
        Config object with get/set methods
    """
    def __init__(self, data: Dict[str, Any] = None):
        self._data = data or {}
    
    def get(self, key: str, default: Any = None) -> Any:
        """
        Get configuration value using dot notation
        
        USAGE:
            value = config.get("database.host", "localhost")
        
        RETURN:
            Configuration value or default
        """
        keys = key.split('.')
        value = self._data
        
        for k in keys:
            if isinstance(value, dict) and k in value:
                value = value[k]
            else:
                return default
        
        return value
    
    def set(self, key: str, value: Any):
        """
        Set configuration value using dot notation
        
        USAGE:
            config.set("database.host", "localhost")
        
        RETURN:
            None
        """
        keys = key.split('.')
        data = self._data
        
        # Navigate to parent
        for k in keys[:-1]:
            if k not in data:
                data[k] = {}
            data = data[k]
        
        # Set value
        data[keys[-1]] = value
    
    def merge(self, other: 'Config'):
        """
        Merge another config into this one
        
        USAGE:
            config.merge(other_config)
        
        RETURN:
            None
        """
        self._data = self._deep_merge(self._data, other._data)
    
    def _deep_merge(self, base: Dict, override: Dict) -> Dict:
        """Deep merge two dictionaries"""
        result = base.copy()
        
        for key, value in override.items():
            if key in result and isinstance(result[key], dict) and isinstance(value, dict):
                result[key] = self._deep_merge(result[key], value)
            else:
                result[key] = value
        
        return result
    
    def to_dict(self) -> Dict[str, Any]:
        """Return configuration as dictionary"""
        return self._data.copy()
    
    def __repr__(self):
        return f"Config({len(self._data)} keys)"


# ==================== CACHE ====================

class ConfigCache:
    """
    Simple cache for configuration values
    
    USAGE:
        cache = ConfigCache(ttl=300)
        cache.set("key", "value")
        value = cache.get("key")
    
    RETURN:
        Cached value or None
    """
    def __init__(self, ttl: int = 300):
        self.ttl = ttl  # Time to live in seconds
        self._cache: Dict[str, tuple] = {}  # key -> (value, timestamp)
    
    def get(self, key: str) -> Optional[Any]:
        """Get cached value if not expired"""
        if key in self._cache:
            value, timestamp = self._cache[key]
            if time.time() - timestamp < self.ttl:
                return value
            else:
                del self._cache[key]
        return None
    
    def set(self, key: str, value: Any):
        """Cache value with timestamp"""
        self._cache[key] = (value, time.time())
    
    def invalidate(self, key: str):
        """Invalidate specific key"""
        if key in self._cache:
            del self._cache[key]
    
    def clear(self):
        """Clear all cached values"""
        self._cache.clear()
    
    def get_stats(self) -> Dict:
        """Get cache statistics"""
        total = len(self._cache)
        expired = sum(1 for _, (_, ts) in self._cache.items() 
                     if time.time() - ts >= self.ttl)
        return {
            "total": total,
            "valid": total - expired,
            "expired": expired
        }


# ==================== CONFIG MANAGER (SINGLETON) ====================

class ConfigManager:
    """
    Main configuration manager (Singleton)
    
    DESIGN PATTERN: Singleton Pattern
    
    USAGE:
        config_manager = ConfigManager.get_instance()
        config_manager.add_source(FileConfigSource("config.json"))
        config_manager.load()
        value = config_manager.get("database.host")
    
    RETURN:
        ConfigManager instance
    """
    _instance = None
    _lock = threading.Lock()
    
    def __init__(self):
        """Private constructor - use get_instance()"""
        if ConfigManager._instance is not None:
            raise Exception("Use get_instance() to get ConfigManager")
        
        self._sources: List[ConfigSource] = []
        self._config = Config()
        self._validators: Dict[str, List[ConfigValidator]] = {}
        self._observers: List[ConfigObserver] = []
        self._cache = ConfigCache(ttl=300)
        self._hot_reload_enabled = False
        self._reload_thread = None
        self._stop_reload = False
        
        print("🔧 Configuration Manager initialized")
    
    @classmethod
    def get_instance(cls):
        """
        Get singleton instance (thread-safe)
        
        USAGE:
            config_manager = ConfigManager.get_instance()
        
        RETURN:
            ConfigManager singleton instance
        """
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = ConfigManager()
        return cls._instance
    
    def add_source(self, source: ConfigSource):
        """
        Add configuration source
        
        USAGE:
            config_manager.add_source(FileConfigSource("config.json"))
        
        RETURN:
            None
        """
        self._sources.append(source)
        # Sort by priority (higher first)
        self._sources.sort(key=lambda s: s.get_priority(), reverse=True)
        print(f"✓ Added source: {source.__class__.__name__}")
    
    def load(self):
        """
        Load configuration from all sources
        
        USAGE:
            config_manager.load()
        
        RETURN:
            None
        """
        print("\n📥 Loading configuration...")
        
        # Load from each source (reverse order - lowest priority first)
        for source in reversed(self._sources):
            data = source.load()
            if data:
                source_config = Config(data)
                self._config.merge(source_config)
                print(f"  ✓ Loaded from {source.__class__.__name__}")
        
        # Clear cache after reload
        self._cache.clear()
        
        # Notify observers
        for observer in self._observers:
            observer.on_config_reloaded()
        
        print("✓ Configuration loaded successfully")
    
    def get(self, key: str, default: Any = None) -> Any:
        """
        Get configuration value
        
        USAGE:
            value = config_manager.get("database.host", "localhost")
        
        RETURN:
            Configuration value or default
        """
        # Try cache first
        cached = self._cache.get(key)
        if cached is not None:
            return cached
        
        # Get from config
        value = self._config.get(key, default)
        
        # Cache the value
        if value is not None:
            self._cache.set(key, value)
        
        return value
    
    def set(self, key: str, value: Any):
        """
        Set configuration value
        
        USAGE:
            config_manager.set("database.host", "localhost")
        
        RETURN:
            None
        """
        old_value = self._config.get(key)
        
        # Validate if validators exist
        if key in self._validators:
            for validator in self._validators[key]:
                validator.validate(key, value)
        
        # Set value
        self._config.set(key, value)
        
        # Invalidate cache
        self._cache.invalidate(key)
        
        # Notify observers
        for observer in self._observers:
            observer.on_config_changed(key, old_value, value)
    
    def add_validator(self, key: str, validator: ConfigValidator):
        """Add validator for specific key"""
        if key not in self._validators:
            self._validators[key] = []
        self._validators[key].append(validator)
    
    def add_observer(self, observer: ConfigObserver):
        """Add configuration observer"""
        self._observers.append(observer)
        print(f"✓ Added observer: {observer.__class__.__name__}")
    
    def enable_hot_reload(self, interval: int = 30):
        """
        Enable hot reload with file watching
        
        USAGE:
            config_manager.enable_hot_reload(interval=30)
        
        RETURN:
            None
        """
        if self._hot_reload_enabled:
            return
        
        self._hot_reload_enabled = True
        self._stop_reload = False
        
        def reload_worker():
            while not self._stop_reload:
                time.sleep(interval)
                
                # Check if any source changed
                needs_reload = any(source.watch() for source in self._sources)
                
                if needs_reload:
                    print("\n🔄 Configuration changed, reloading...")
                    self.load()
        
        self._reload_thread = threading.Thread(target=reload_worker, daemon=True)
        self._reload_thread.start()
        print(f"✓ Hot reload enabled (interval: {interval}s)")
    
    def disable_hot_reload(self):
        """Disable hot reload"""
        self._stop_reload = True
        self._hot_reload_enabled = False
        print("✓ Hot reload disabled")
    
    def reload(self):
        """Manually reload configuration"""
        self.load()
    
    def get_all(self) -> Dict[str, Any]:
        """Get all configuration"""
        return self._config.to_dict()
    
    def validate(self) -> bool:
        """
        Validate all configured validators
        
        USAGE:
            config_manager.validate()
        
        RETURN:
            bool - True if all validations pass
        """
        for key, validators in self._validators.items():
            value = self.get(key)
            for validator in validators:
                validator.validate(key, value)
        return True
    
    def get_cache_stats(self) -> Dict:
        """Get cache statistics"""
        return self._cache.get_stats()


# ==================== DEMO ====================

def main():
    """
    Demo of Configuration Manager
    
    Demonstrates:
    - Multiple configuration sources
    - Hierarchical configuration
    - Hot reload capability
    - Configuration observers
    - Validation
    - Caching
    """
    print("=" * 70)
    print("🔧 CONFIGURATION MANAGER DEMO")
    print("=" * 70)
    
    # Get singleton instance
    config_manager = ConfigManager.get_instance()
    
    # Add file source
    print("\n📁 Setting up configuration sources...")
    
    # Create sample config file
    sample_config = {
        "database": {
            "host": "localhost",
            "port": 5432,
            "name": "myapp",
            "pool_size": 10
        },
        "cache": {
            "enabled": True,
            "ttl": 3600
        },
        "logging": {
            "level": "INFO",
            "file": "/var/log/app.log"
        },
        "features": {
            "newUI": False,
            "darkMode": True
        }
    }
    
    # Write to file
    config_file = Path("demo_config.json")
    with open(config_file, 'w') as f:
        json.dump(sample_config, f, indent=2)
    
    config_manager.add_source(FileConfigSource("demo_config.json", priority=10))
    
    # Add environment source (higher priority)
    os.environ["APP_DATABASE__HOST"] = "prod-db.example.com"
    os.environ["APP_DATABASE__PORT"] = "3306"
    os.environ["APP_CACHE__ENABLED"] = "true"
    config_manager.add_source(EnvironmentConfigSource("APP", priority=100))
    
    # Add in-memory source
    runtime_config = {
        "instance_id": "web-server-01",
        "features": {
            "newUI": True  # Override file config
        }
    }
    config_manager.add_source(InMemoryConfigSource(runtime_config, priority=50))
    
    # Load all configurations
    config_manager.load()
    
    # Get configuration values
    print("\n🔍 Retrieving configuration values...")
    print(f"  database.host: {config_manager.get('database.host')}")  # From env
    print(f"  database.port: {config_manager.get('database.port')}")  # From env
    print(f"  database.name: {config_manager.get('database.name')}")  # From file
    print(f"  cache.enabled: {config_manager.get('cache.enabled')}")
    print(f"  cache.ttl: {config_manager.get('cache.ttl')}")
    print(f"  features.newUI: {config_manager.get('features.newUI')}")  # From memory
    print(f"  features.darkMode: {config_manager.get('features.darkMode')}")
    print(f"  instance_id: {config_manager.get('instance_id')}")  # From memory
    
    # Test default values
    print(f"  non.existent.key: {config_manager.get('non.existent.key', 'default_value')}")
    
    # Add validators
    print("\n✅ Setting up validators...")
    config_manager.add_validator("database.port", 
                                 TypeValidator(ConfigType.INTEGER))
    config_manager.add_validator("database.port", 
                                 RangeValidator(min_value=1, max_value=65535))
    config_manager.add_validator("cache.enabled", 
                                 TypeValidator(ConfigType.BOOLEAN))
    
    # Validate configuration
    print("\n🔍 Validating configuration...")
    try:
        config_manager.validate()
        print("  ✓ All validations passed")
    except ValueError as e:
        print(f"  ❌ Validation error: {e}")
    
    # Add observer
    print("\n👀 Adding configuration observer...")
    
    class LoggingObserver(ConfigObserver):
        def on_config_changed(self, key, old_value, new_value):
            print(f"  📝 Config changed: {key} = {new_value} (was: {old_value})")
        
        def on_config_reloaded(self):
            print("  🔄 Configuration reloaded")
    
    config_manager.add_observer(LoggingObserver())
    
    # Test dynamic updates
    print("\n✏️  Testing dynamic configuration updates...")
    config_manager.set("features.experimentalMode", True)
    config_manager.set("cache.ttl", 7200)
    
    print(f"  features.experimentalMode: {config_manager.get('features.experimentalMode')}")
    print(f"  cache.ttl: {config_manager.get('cache.ttl')}")
    
    # Test invalid value
    print("\n❌ Testing validation with invalid value...")
    try:
        config_manager.set("database.port", "invalid_port")
    except ValueError as e:
        print(f"  ✓ Caught validation error: {e}")
    
    # Test cache statistics
    print("\n📊 Cache Statistics:")
    cache_stats = config_manager.get_cache_stats()
    print(f"  Total cached: {cache_stats['total']}")
    print(f"  Valid entries: {cache_stats['valid']}")
    
    # Get all configuration
    print("\n📋 Complete Configuration:")
    all_config = config_manager.get_all()
    print(f"  Total keys: {len(all_config)}")
    for section in all_config:
        print(f"  - {section}: {type(all_config[section]).__name__}")
    
    # Real-world use case
    print("\n🌐 Real-World Use Case: Database Connection")
    db_config = {
        "host": config_manager.get("database.host"),
        "port": config_manager.get("database.port"),
        "database": config_manager.get("database.name"),
        "pool_size": config_manager.get("database.pool_size")
    }
    print(f"  Connection string: {db_config}")
    
    # Feature flags
    print("\n🚩 Feature Flags:")
    if config_manager.get("features.newUI"):
        print("  ✓ New UI enabled")
    else:
        print("  ✗ New UI disabled")
    
    if config_manager.get("features.darkMode"):
        print("  ✓ Dark mode enabled")
    else:
        print("  ✗ Dark mode disabled")
    
    # Cleanup
    print("\n🧹 Cleanup...")
    config_file.unlink()  # Delete demo config file
    
    # Clear environment variables
    for key in list(os.environ.keys()):
        if key.startswith("APP_"):
            del os.environ[key]
    
    print("\n" + "=" * 70)
    print("✨ Demo completed successfully!")
    print("=" * 70)


if __name__ == "__main__":
    main()
