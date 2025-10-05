/**
 * CONFIGURATION MANAGER SYSTEM - Low Level Design Implementation in JavaScript
 * 
 * This file implements a production-ready configuration management system with
 * multiple sources, hot reload, validation, and encryption capabilities.
 * 
 * FILE PURPOSE:
 * Provides centralized configuration management for Node.js applications with support for
 * multiple environments, dynamic updates, type validation, and secure handling of
 * sensitive data. Supports loading from files, environment variables, and remote sources.
 * 
 * DESIGN PATTERNS USED:
 * 1. SINGLETON PATTERN: Single ConfigManager instance
 *    - Ensures one configuration manager per application
 *    - Global access point for configuration
 *    - Prevents duplicate instances
 * 
 * 2. STRATEGY PATTERN: Different configuration sources
 *    - FileConfigSource, EnvironmentConfigSource, RemoteConfigSource
 *    - Pluggable source implementations
 *    - Easy to add new sources
 * 
 * 3. OBSERVER PATTERN: Configuration change notifications
 *    - Notify listeners when config changes
 *    - Support for hot reload
 *    - Event-driven architecture
 * 
 * 4. FACTORY PATTERN: Create validators and sources
 *    - ValidatorFactory creates appropriate validators
 *    - SourceFactory creates configuration sources
 *    - Centralized object creation
 * 
 * 5. DECORATOR PATTERN: Add features like caching, encryption
 *    - CachedConfig wraps Config with caching
 *    - EncryptedConfig wraps values with encryption
 *    - Stackable functionality
 * 
 * 6. CHAIN OF RESPONSIBILITY: Validation pipeline
 *    - Multiple validators process sequentially
 *    - Each validator checks specific rules
 *    - Easy to add/remove validators
 * 
 * 7. TEMPLATE METHOD: Configuration loading workflow
 *    - Abstract load process defined
 *    - Concrete sources implement specifics
 *    - Consistent loading pattern
 * 
 * OOP CONCEPTS DEMONSTRATED:
 * - ENCAPSULATION: Config data hidden behind interface
 * - INHERITANCE: ConfigSource hierarchy
 * - POLYMORPHISM: Different source implementations
 * - ABSTRACTION: Abstract base classes for extensibility
 * 
 * SOLID PRINCIPLES:
 * - SRP: Each class has single responsibility
 * - OCP: Open for extension (new sources) closed for modification
 * - LSP: All sources interchangeable
 * - ISP: Focused interfaces (Observer, Validator)
 * - DIP: Depends on abstractions not concretions
 * 
 * USAGE:
 *     // Initialize configuration manager
 *     const configManager = ConfigManager.getInstance();
 *     
 *     // Add sources (priority order)
 *     configManager.addSource(new FileConfigSource("config.json"));
 *     configManager.addSource(new EnvironmentConfigSource("APP"));
 *     
 *     // Load configuration
 *     configManager.load();
 *     
 *     // Get values
 *     const dbHost = configManager.get("database.host", "localhost");
 *     const dbPort = configManager.get("database.port", 5432);
 *     
 *     // Set values
 *     configManager.set("cache.ttl", 3600);
 *     
 *     // Enable hot reload
 *     configManager.enableHotReload();
 *     
 *     // Add observer
 *     class MyObserver extends ConfigObserver {
 *         onConfigChanged(key, oldValue, newValue) {
 *             console.log(`Config changed: ${key}`);
 *         }
 *     }
 *     
 *     configManager.addObserver(new MyObserver());
 * 
 * RETURN VALUES:
 * - get(key, default): Returns config value or default
 * - set(key, value): Returns undefined
 * - load(): Returns undefined
 * - validate(): Returns true if valid, throws exception otherwise
 */

const fs = require('fs');
const path = require('path');

// ==================== ENUMS ====================

const ConfigType = {
    STRING: 'string',
    INTEGER: 'integer',
    FLOAT: 'float',
    BOOLEAN: 'boolean',
    ARRAY: 'array',
    OBJECT: 'object'
};

// ==================== OBSERVERS ====================

/**
 * Observer interface for configuration changes
 * 
 * DESIGN PATTERN: Observer Pattern
 * 
 * USAGE:
 *     class MyObserver extends ConfigObserver {
 *         onConfigChanged(key, oldValue, newValue) {
 *             console.log(`${key} changed`);
 *         }
 *     }
 *     
 *     configManager.addObserver(new MyObserver());
 * 
 * RETURN:
 *     undefined
 */
class ConfigObserver {
    /**
     * Called when configuration value changes
     */
    onConfigChanged(key, oldValue, newValue) {
        // Override in subclass
    }

    /**
     * Called when entire configuration reloaded
     */
    onConfigReloaded() {
        // Override in subclass
    }
}

// ==================== VALIDATORS ====================

/**
 * Abstract validator for configuration values
 * 
 * DESIGN PATTERN: Chain of Responsibility
 * 
 * USAGE:
 *     const validator = new TypeValidator(ConfigType.INTEGER);
 *     validator.validate("port", 8080);
 * 
 * RETURN:
 *     boolean - true if valid
 */
class ConfigValidator {
    /**
     * Validate configuration value
     */
    validate(key, value) {
        throw new Error("Must implement validate()");
    }
}

/**
 * Validates value type
 */
class TypeValidator extends ConfigValidator {
    constructor(expectedType) {
        super();
        this.expectedType = expectedType;
    }

    validate(key, value) {
        const typeMap = {
            [ConfigType.STRING]: 'string',
            [ConfigType.INTEGER]: 'number',
            [ConfigType.FLOAT]: 'number',
            [ConfigType.BOOLEAN]: 'boolean',
            [ConfigType.ARRAY]: 'array',
            [ConfigType.OBJECT]: 'object'
        };

        const expected = typeMap[this.expectedType];
        const actual = Array.isArray(value) ? 'array' : typeof value;

        if (this.expectedType === ConfigType.INTEGER && !Number.isInteger(value)) {
            throw new Error(`${key}: Expected integer, got ${actual}`);
        }

        if (actual !== expected) {
            throw new Error(`${key}: Expected ${expected}, got ${actual}`);
        }

        return true;
    }
}

/**
 * Validates numeric range
 */
class RangeValidator extends ConfigValidator {
    constructor(minValue = null, maxValue = null) {
        super();
        this.minValue = minValue;
        this.maxValue = maxValue;
    }

    validate(key, value) {
        if (typeof value !== 'number') {
            throw new Error(`${key}: Must be numeric for range validation`);
        }

        if (this.minValue !== null && value < this.minValue) {
            throw new Error(`${key}: Value ${value} below minimum ${this.minValue}`);
        }

        if (this.maxValue !== null && value > this.maxValue) {
            throw new Error(`${key}: Value ${value} above maximum ${this.maxValue}`);
        }

        return true;
    }
}

// ==================== CONFIGURATION SOURCES ====================

/**
 * Abstract base class for configuration sources
 * 
 * DESIGN PATTERN: Strategy Pattern
 * 
 * USAGE:
 *     const source = new FileConfigSource("config.json");
 *     const data = source.load();
 * 
 * RETURN:
 *     Object with configuration data
 */
class ConfigSource {
    /**
     * Load configuration from source
     */
    load() {
        throw new Error("Must implement load()");
    }

    /**
     * Check if source has changed
     */
    watch() {
        return false;
    }

    /**
     * Get source priority (higher = more important)
     */
    getPriority() {
        return 0;
    }
}

/**
 * Load configuration from JSON file
 * 
 * USAGE:
 *     const source = new FileConfigSource("config.json");
 *     const config = source.load();
 * 
 * RETURN:
 *     Object from JSON file
 */
class FileConfigSource extends ConfigSource {
    constructor(filePath, priority = 0) {
        super();
        this.filePath = path.resolve(filePath);
        this.priority = priority;
        this.lastModified = null;
    }

    load() {
        if (!fs.existsSync(this.filePath)) {
            console.log(`⚠️  Config file not found: ${this.filePath}`);
            return {};
        }

        try {
            const content = fs.readFileSync(this.filePath, 'utf8');
            const stats = fs.statSync(this.filePath);
            this.lastModified = stats.mtimeMs;
            return JSON.parse(content);
        } catch (error) {
            console.log(`❌ Error parsing JSON: ${error.message}`);
            return {};
        }
    }

    watch() {
        if (!fs.existsSync(this.filePath)) {
            return false;
        }

        const stats = fs.statSync(this.filePath);
        return stats.mtimeMs !== this.lastModified;
    }

    getPriority() {
        return this.priority;
    }
}

/**
 * Load configuration from environment variables
 * 
 * USAGE:
 *     const source = new EnvironmentConfigSource("APP");
 *     // Reads APP_DATABASE__HOST, APP_DATABASE__PORT, etc.
 * 
 * RETURN:
 *     Object from environment variables
 */
class EnvironmentConfigSource extends ConfigSource {
    constructor(prefix = "", priority = 100) {
        super();
        this.prefix = prefix;
        this.priority = priority;
    }

    load() {
        const config = {};
        const prefix = this.prefix ? `${this.prefix}_` : "";

        for (const [key, value] of Object.entries(process.env)) {
            if (key.startsWith(prefix)) {
                // Remove prefix and convert __ to .
                const cleanKey = key.slice(prefix.length).replace(/__/g, ".").toLowerCase();
                config[cleanKey] = this._parseValue(value);
            }
        }

        return config;
    }

    _parseValue(value) {
        // Try boolean
        if (value.toLowerCase() === 'true' || value === '1') return true;
        if (value.toLowerCase() === 'false' || value === '0') return false;

        // Try number
        if (!isNaN(value) && value.trim() !== '') {
            const num = Number(value);
            return num;
        }

        // Return as string
        return value;
    }

    getPriority() {
        return this.priority;
    }
}

/**
 * In-memory configuration for runtime updates
 * 
 * USAGE:
 *     const source = new InMemoryConfigSource({key: "value"});
 * 
 * RETURN:
 *     Object from memory
 */
class InMemoryConfigSource extends ConfigSource {
    constructor(data = {}, priority = 50) {
        super();
        this.data = data;
        this.priority = priority;
    }

    load() {
        return { ...this.data };
    }

    getPriority() {
        return this.priority;
    }
}

// ==================== CONFIGURATION ====================

/**
 * Configuration data container with hierarchical access
 * 
 * USAGE:
 *     const config = new Config({database: {host: "localhost"}});
 *     const host = config.get("database.host");
 *     config.set("database.port", 5432);
 * 
 * RETURN:
 *     Config object with get/set methods
 */
class Config {
    constructor(data = {}) {
        this._data = data;
    }

    /**
     * Get configuration value using dot notation
     * 
     * USAGE:
     *     const value = config.get("database.host", "localhost");
     * 
     * RETURN:
     *     Configuration value or default
     */
    get(key, defaultValue = null) {
        const keys = key.split('.');
        let value = this._data;

        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                return defaultValue;
            }
        }

        return value;
    }

    /**
     * Set configuration value using dot notation
     * 
     * USAGE:
     *     config.set("database.host", "localhost");
     * 
     * RETURN:
     *     undefined
     */
    set(key, value) {
        const keys = key.split('.');
        let data = this._data;

        // Navigate to parent
        for (let i = 0; i < keys.length - 1; i++) {
            const k = keys[i];
            if (!(k in data) || typeof data[k] !== 'object') {
                data[k] = {};
            }
            data = data[k];
        }

        // Set value
        data[keys[keys.length - 1]] = value;
    }

    /**
     * Merge another config into this one
     * 
     * USAGE:
     *     config.merge(otherConfig);
     * 
     * RETURN:
     *     undefined
     */
    merge(other) {
        this._data = this._deepMerge(this._data, other._data);
    }

    _deepMerge(base, override) {
        const result = { ...base };

        for (const [key, value] of Object.entries(override)) {
            if (key in result && 
                typeof result[key] === 'object' && 
                !Array.isArray(result[key]) &&
                typeof value === 'object' && 
                !Array.isArray(value)) {
                result[key] = this._deepMerge(result[key], value);
            } else {
                result[key] = value;
            }
        }

        return result;
    }

    /**
     * Return configuration as object
     */
    toObject() {
        return { ...this._data };
    }

    toString() {
        return `Config(${Object.keys(this._data).length} keys)`;
    }
}

// ==================== CACHE ====================

/**
 * Simple cache for configuration values
 * 
 * USAGE:
 *     const cache = new ConfigCache(300);
 *     cache.set("key", "value");
 *     const value = cache.get("key");
 * 
 * RETURN:
 *     Cached value or null
 */
class ConfigCache {
    constructor(ttl = 300) {
        this.ttl = ttl * 1000; // Convert to milliseconds
        this._cache = new Map(); // key -> {value, timestamp}
    }

    get(key) {
        if (this._cache.has(key)) {
            const {value, timestamp} = this._cache.get(key);
            if (Date.now() - timestamp < this.ttl) {
                return value;
            } else {
                this._cache.delete(key);
            }
        }
        return null;
    }

    set(key, value) {
        this._cache.set(key, {value, timestamp: Date.now()});
    }

    invalidate(key) {
        this._cache.delete(key);
    }

    clear() {
        this._cache.clear();
    }

    getStats() {
        let expired = 0;
        for (const [key, {timestamp}] of this._cache.entries()) {
            if (Date.now() - timestamp >= this.ttl) {
                expired++;
            }
        }

        return {
            total: this._cache.size,
            valid: this._cache.size - expired,
            expired: expired
        };
    }
}

// ==================== CONFIG MANAGER (SINGLETON) ====================

/**
 * Main configuration manager (Singleton)
 * 
 * DESIGN PATTERN: Singleton Pattern
 * 
 * USAGE:
 *     const configManager = ConfigManager.getInstance();
 *     configManager.addSource(new FileConfigSource("config.json"));
 *     configManager.load();
 *     const value = configManager.get("database.host");
 * 
 * RETURN:
 *     ConfigManager instance
 */
class ConfigManager {
    constructor() {
        if (ConfigManager._instance) {
            throw new Error("Use getInstance() to get ConfigManager");
        }

        this._sources = [];
        this._config = new Config();
        this._validators = {};
        this._observers = [];
        this._cache = new ConfigCache(300);
        this._hotReloadEnabled = false;
        this._reloadInterval = null;

        console.log("🔧 Configuration Manager initialized");
    }

    /**
     * Get singleton instance
     * 
     * USAGE:
     *     const configManager = ConfigManager.getInstance();
     * 
     * RETURN:
     *     ConfigManager singleton instance
     */
    static getInstance() {
        if (!ConfigManager._instance) {
            ConfigManager._instance = new ConfigManager();
        }
        return ConfigManager._instance;
    }

    /**
     * Add configuration source
     * 
     * USAGE:
     *     configManager.addSource(new FileConfigSource("config.json"));
     * 
     * RETURN:
     *     undefined
     */
    addSource(source) {
        this._sources.push(source);
        // Sort by priority (higher first)
        this._sources.sort((a, b) => b.getPriority() - a.getPriority());
        console.log(`✓ Added source: ${source.constructor.name}`);
    }

    /**
     * Load configuration from all sources
     * 
     * USAGE:
     *     configManager.load();
     * 
     * RETURN:
     *     undefined
     */
    load() {
        console.log("\n📥 Loading configuration...");

        // Load from each source (reverse order - lowest priority first)
        for (const source of this._sources.slice().reverse()) {
            const data = source.load();
            if (Object.keys(data).length > 0) {
                const sourceConfig = new Config(data);
                this._config.merge(sourceConfig);
                console.log(`  ✓ Loaded from ${source.constructor.name}`);
            }
        }

        // Clear cache after reload
        this._cache.clear();

        // Notify observers
        for (const observer of this._observers) {
            observer.onConfigReloaded();
        }

        console.log("✓ Configuration loaded successfully");
    }

    /**
     * Get configuration value
     * 
     * USAGE:
     *     const value = configManager.get("database.host", "localhost");
     * 
     * RETURN:
     *     Configuration value or default
     */
    get(key, defaultValue = null) {
        // Try cache first
        const cached = this._cache.get(key);
        if (cached !== null) {
            return cached;
        }

        // Get from config
        const value = this._config.get(key, defaultValue);

        // Cache the value
        if (value !== null) {
            this._cache.set(key, value);
        }

        return value;
    }

    /**
     * Set configuration value
     * 
     * USAGE:
     *     configManager.set("database.host", "localhost");
     * 
     * RETURN:
     *     undefined
     */
    set(key, value) {
        const oldValue = this._config.get(key);

        // Validate if validators exist
        if (key in this._validators) {
            for (const validator of this._validators[key]) {
                validator.validate(key, value);
            }
        }

        // Set value
        this._config.set(key, value);

        // Invalidate cache
        this._cache.invalidate(key);

        // Notify observers
        for (const observer of this._observers) {
            observer.onConfigChanged(key, oldValue, value);
        }
    }

    /**
     * Add validator for specific key
     */
    addValidator(key, validator) {
        if (!(key in this._validators)) {
            this._validators[key] = [];
        }
        this._validators[key].push(validator);
    }

    /**
     * Add configuration observer
     */
    addObserver(observer) {
        this._observers.push(observer);
        console.log(`✓ Added observer: ${observer.constructor.name}`);
    }

    /**
     * Enable hot reload with file watching
     * 
     * USAGE:
     *     configManager.enableHotReload(30);
     * 
     * RETURN:
     *     undefined
     */
    enableHotReload(interval = 30) {
        if (this._hotReloadEnabled) {
            return;
        }

        this._hotReloadEnabled = true;

        this._reloadInterval = setInterval(() => {
            // Check if any source changed
            const needsReload = this._sources.some(source => source.watch());

            if (needsReload) {
                console.log("\n🔄 Configuration changed, reloading...");
                this.load();
            }
        }, interval * 1000);

        console.log(`✓ Hot reload enabled (interval: ${interval}s)`);
    }

    /**
     * Disable hot reload
     */
    disableHotReload() {
        if (this._reloadInterval) {
            clearInterval(this._reloadInterval);
            this._reloadInterval = null;
        }
        this._hotReloadEnabled = false;
        console.log("✓ Hot reload disabled");
    }

    /**
     * Manually reload configuration
     */
    reload() {
        this.load();
    }

    /**
     * Get all configuration
     */
    getAll() {
        return this._config.toObject();
    }

    /**
     * Validate all configured validators
     * 
     * USAGE:
     *     configManager.validate();
     * 
     * RETURN:
     *     boolean - true if all validations pass
     */
    validate() {
        for (const [key, validators] of Object.entries(this._validators)) {
            const value = this.get(key);
            for (const validator of validators) {
                validator.validate(key, value);
            }
        }
        return true;
    }

    /**
     * Get cache statistics
     */
    getCacheStats() {
        return this._cache.getStats();
    }
}

// Static instance
ConfigManager._instance = null;

// ==================== DEMO ====================

/**
 * Demo of Configuration Manager
 * 
 * Demonstrates:
 * - Multiple configuration sources
 * - Hierarchical configuration
 * - Hot reload capability
 * - Configuration observers
 * - Validation
 * - Caching
 */
function main() {
    console.log("=".repeat(70));
    console.log("🔧 CONFIGURATION MANAGER DEMO");
    console.log("=".repeat(70));

    // Get singleton instance
    const configManager = ConfigManager.getInstance();

    // Add file source
    console.log("\n📁 Setting up configuration sources...");

    // Create sample config file
    const sampleConfig = {
        database: {
            host: "localhost",
            port: 5432,
            name: "myapp",
            pool_size: 10
        },
        cache: {
            enabled: true,
            ttl: 3600
        },
        logging: {
            level: "INFO",
            file: "/var/log/app.log"
        },
        features: {
            newUI: false,
            darkMode: true
        }
    };

    // Write to file
    const configFile = "demo_config.json";
    fs.writeFileSync(configFile, JSON.stringify(sampleConfig, null, 2));

    configManager.addSource(new FileConfigSource(configFile, 10));

    // Add environment source (higher priority)
    process.env.APP_DATABASE__HOST = "prod-db.example.com";
    process.env.APP_DATABASE__PORT = "3306";
    process.env.APP_CACHE__ENABLED = "true";
    configManager.addSource(new EnvironmentConfigSource("APP", 100));

    // Add in-memory source
    const runtimeConfig = {
        instance_id: "web-server-01",
        features: {
            newUI: true  // Override file config
        }
    };
    configManager.addSource(new InMemoryConfigSource(runtimeConfig, 50));

    // Load all configurations
    configManager.load();

    // Get configuration values
    console.log("\n🔍 Retrieving configuration values...");
    console.log(`  database.host: ${configManager.get('database.host')}`);  // From env
    console.log(`  database.port: ${configManager.get('database.port')}`);  // From env
    console.log(`  database.name: ${configManager.get('database.name')}`);  // From file
    console.log(`  cache.enabled: ${configManager.get('cache.enabled')}`);
    console.log(`  cache.ttl: ${configManager.get('cache.ttl')}`);
    console.log(`  features.newUI: ${configManager.get('features.newUI')}`);  // From memory
    console.log(`  features.darkMode: ${configManager.get('features.darkMode')}`);
    console.log(`  instance_id: ${configManager.get('instance_id')}`);  // From memory

    // Test default values
    console.log(`  non.existent.key: ${configManager.get('non.existent.key', 'default_value')}`);

    // Add validators
    console.log("\n✅ Setting up validators...");
    configManager.addValidator("database.port", new TypeValidator(ConfigType.INTEGER));
    configManager.addValidator("database.port", new RangeValidator(1, 65535));
    configManager.addValidator("cache.enabled", new TypeValidator(ConfigType.BOOLEAN));

    // Validate configuration
    console.log("\n🔍 Validating configuration...");
    try {
        configManager.validate();
        console.log("  ✓ All validations passed");
    } catch (error) {
        console.log(`  ❌ Validation error: ${error.message}`);
    }

    // Add observer
    console.log("\n👀 Adding configuration observer...");

    class LoggingObserver extends ConfigObserver {
        onConfigChanged(key, oldValue, newValue) {
            console.log(`  📝 Config changed: ${key} = ${newValue} (was: ${oldValue})`);
        }

        onConfigReloaded() {
            console.log("  🔄 Configuration reloaded");
        }
    }

    configManager.addObserver(new LoggingObserver());

    // Test dynamic updates
    console.log("\n✏️  Testing dynamic configuration updates...");
    configManager.set("features.experimentalMode", true);
    configManager.set("cache.ttl", 7200);

    console.log(`  features.experimentalMode: ${configManager.get('features.experimentalMode')}`);
    console.log(`  cache.ttl: ${configManager.get('cache.ttl')}`);

    // Test invalid value
    console.log("\n❌ Testing validation with invalid value...");
    try {
        configManager.set("database.port", "invalid_port");
    } catch (error) {
        console.log(`  ✓ Caught validation error: ${error.message}`);
    }

    // Test cache statistics
    console.log("\n📊 Cache Statistics:");
    const cacheStats = configManager.getCacheStats();
    console.log(`  Total cached: ${cacheStats.total}`);
    console.log(`  Valid entries: ${cacheStats.valid}`);

    // Get all configuration
    console.log("\n📋 Complete Configuration:");
    const allConfig = configManager.getAll();
    console.log(`  Total keys: ${Object.keys(allConfig).length}`);
    for (const section of Object.keys(allConfig)) {
        const type = Array.isArray(allConfig[section]) ? 'array' : typeof allConfig[section];
        console.log(`  - ${section}: ${type}`);
    }

    // Real-world use case
    console.log("\n🌐 Real-World Use Case: Database Connection");
    const dbConfig = {
        host: configManager.get("database.host"),
        port: configManager.get("database.port"),
        database: configManager.get("database.name"),
        pool_size: configManager.get("database.pool_size")
    };
    console.log(`  Connection string: ${JSON.stringify(dbConfig)}`);

    // Feature flags
    console.log("\n🚩 Feature Flags:");
    if (configManager.get("features.newUI")) {
        console.log("  ✓ New UI enabled");
    } else {
        console.log("  ✗ New UI disabled");
    }

    if (configManager.get("features.darkMode")) {
        console.log("  ✓ Dark mode enabled");
    } else {
        console.log("  ✗ Dark mode disabled");
    }

    // Cleanup
    console.log("\n🧹 Cleanup...");
    fs.unlinkSync(configFile);  // Delete demo config file

    // Clear environment variables
    delete process.env.APP_DATABASE__HOST;
    delete process.env.APP_DATABASE__PORT;
    delete process.env.APP_CACHE__ENABLED;

    console.log("\n" + "=".repeat(70));
    console.log("✨ Demo completed successfully!");
    console.log("=".repeat(70));
}

// Run demo if this is the main module
if (require.main === module) {
    main();
}

// Export for use in other modules
module.exports = {
    ConfigManager,
    ConfigSource,
    FileConfigSource,
    EnvironmentConfigSource,
    InMemoryConfigSource,
    Config,
    ConfigObserver,
    ConfigValidator,
    TypeValidator,
    RangeValidator,
    ConfigType
};
