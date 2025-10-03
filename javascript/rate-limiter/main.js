/**
 * Rate Limiter System Implementation in JavaScript
 * ================================================
 * 
 * This implementation demonstrates several key Design Patterns and OOP Concepts:
 * 
 * DESIGN PATTERNS USED:
 * 1. Strategy Pattern: Different rate limiting algorithms (Token Bucket, Sliding Window, Fixed Window)
 * 2. Factory Pattern: Algorithm creation based on configuration
 * 3. Observer Pattern: Rate limit violation notifications and monitoring
 * 4. Template Method Pattern: Common rate limiting workflow with customizable steps
 * 5. Facade Pattern: Simple interface hiding complex rate limiting logic
 * 6. Builder Pattern: Fluent configuration of rate limiting rules
 * 
 * OOP CONCEPTS DEMONSTRATED:
 * 1. Abstraction: Abstract algorithm interface with concrete implementations
 * 2. Polymorphism: Different algorithms used interchangeably
 * 3. Encapsulation: Algorithm-specific state hidden behind clean interfaces
 * 4. Inheritance: Common algorithm behavior in base classes
 * 5. Composition: Rate limiter composed of multiple algorithms and components
 * 
 * ARCHITECTURAL PRINCIPLES:
 * - Single Responsibility: Each class handles one specific concern
 * - Open/Closed: Easy to add new algorithms without modifying existing code
 * - Liskov Substitution: All algorithms can be used interchangeably
 * - Interface Segregation: Focused, minimal interfaces for different concerns
 * - Dependency Inversion: High-level components depend on abstractions
 * 
 * BUSINESS FEATURES:
 * - Multiple rate limiting algorithms with different characteristics
 * - Real-time monitoring and violation tracking
 * - Hierarchical rate limiting (global, tenant, user levels)
 * - Dynamic rate adjustment and burst handling
 * - Comprehensive statistics and analytics
 */

// Enums for algorithm types and status
const AlgorithmType = {
    TOKEN_BUCKET: 'token_bucket',
    SLIDING_WINDOW_LOG: 'sliding_window_log',
    FIXED_WINDOW: 'fixed_window',
    SLIDING_WINDOW_COUNTER: 'sliding_window_counter'
};

const RateLimitStatus = {
    ALLOWED: 'allowed',
    REJECTED: 'rejected',
    ERROR: 'error'
};

/**
 * Rate Limiting Rule Configuration
 * 
 * ENCAPSULATION: Bundles related rate limiting parameters
 * IMMUTABILITY: Read-only configuration object
 */
class RateLimitingRule {
    constructor(requestsPerWindow, windowSizeSeconds, algorithm, burstCapacity = null) {
        if (requestsPerWindow <= 0) {
            throw new Error("Requests per window must be positive");
        }
        if (windowSizeSeconds <= 0) {
            throw new Error("Window size must be positive");
        }

        this.requestsPerWindow = requestsPerWindow;
        this.windowSizeSeconds = windowSizeSeconds;
        this.algorithm = algorithm;
        this.burstCapacity = burstCapacity || requestsPerWindow;
    }
}

/**
 * Rate Limit Check Result
 * 
 * INFORMATION EXPERT: Contains all information about rate limit decision
 */
class RateLimitResult {
    constructor(status, allowed, remainingQuota, totalQuota, retryAfterSeconds = null, resetTime = null) {
        this.status = status;
        this.allowed = allowed;
        this.remainingQuota = remainingQuota;
        this.totalQuota = totalQuota;
        this.retryAfterSeconds = retryAfterSeconds;
        this.resetTime = resetTime;
    }
}

/**
 * Abstract Rate Limiting Algorithm - Strategy Pattern
 * 
 * Base class for different rate limiting strategies
 */
class RateLimitingAlgorithm {
    constructor() {
        // Simulated thread safety with locks (single-threaded JS doesn't need real locks)
        this._processingKeys = new Set();
    }

    /**
     * Check if request is allowed under rate limit
     * @param {string} key - Unique identifier for rate limiting
     * @param {RateLimitingRule} rule - Rate limiting configuration
     * @param {number} currentTime - Current timestamp in seconds
     * @returns {RateLimitResult} - Rate limiting decision
     */
    isAllowed(key, rule, currentTime) {
        throw new Error("isAllowed must be implemented by subclass");
    }

    /**
     * Get remaining quota for the current window
     * @param {string} key - Unique identifier
     * @param {RateLimitingRule} rule - Rate limiting configuration
     * @param {number} currentTime - Current timestamp in seconds
     * @returns {number} - Remaining quota
     */
    getRemainingQuota(key, rule, currentTime) {
        throw new Error("getRemainingQuota must be implemented by subclass");
    }

    /**
     * Reset quota for a specific key
     * @param {string} key - Unique identifier to reset
     */
    resetQuota(key) {
        throw new Error("resetQuota must be implemented by subclass");
    }
}

/**
 * Token Bucket Rate Limiting Algorithm
 * 
 * CHARACTERISTICS:
 * - Allows burst traffic up to bucket capacity
 * - Smooth rate limiting with continuous token refill
 * - Memory efficient: O(1) per key
 * - Good for APIs that can handle temporary bursts
 * 
 * ALGORITHM:
 * 1. Each client has a bucket with maximum capacity
 * 2. Tokens are added to bucket at fixed rate
 * 3. Each request consumes one token
 * 4. Request allowed if bucket has tokens available
 */
class TokenBucketAlgorithm extends RateLimitingAlgorithm {
    constructor() {
        super();
        this.buckets = new Map();
    }

    isAllowed(key, rule, currentTime) {
        const bucket = this._getOrCreateBucket(key, rule, currentTime);
        
        // Refill tokens based on time elapsed
        this._refillBucket(bucket, rule, currentTime);

        if (bucket.tokens >= 1) {
            bucket.tokens -= 1;
            const remaining = Math.floor(bucket.tokens);
            
            return new RateLimitResult(
                RateLimitStatus.ALLOWED,
                true,
                remaining,
                rule.burstCapacity
            );
        } else {
            // Calculate retry after time
            const tokensNeeded = 1 - bucket.tokens;
            const refillRate = rule.requestsPerWindow / rule.windowSizeSeconds;
            const retryAfter = tokensNeeded / refillRate;
            
            return new RateLimitResult(
                RateLimitStatus.REJECTED,
                false,
                0,
                rule.burstCapacity,
                retryAfter
            );
        }
    }

    getRemainingQuota(key, rule, currentTime) {
        const bucket = this._getOrCreateBucket(key, rule, currentTime);
        this._refillBucket(bucket, rule, currentTime);
        return Math.floor(bucket.tokens);
    }

    resetQuota(key) {
        this.buckets.delete(key);
    }

    _getOrCreateBucket(key, rule, currentTime) {
        if (!this.buckets.has(key)) {
            this.buckets.set(key, {
                tokens: rule.burstCapacity,
                lastRefill: currentTime,
                capacity: rule.burstCapacity
            });
        }
        return this.buckets.get(key);
    }

    _refillBucket(bucket, rule, currentTime) {
        const timeElapsed = currentTime - bucket.lastRefill;
        const refillRate = rule.requestsPerWindow / rule.windowSizeSeconds;
        const tokensToAdd = timeElapsed * refillRate;
        
        bucket.tokens = Math.min(bucket.capacity, bucket.tokens + tokensToAdd);
        bucket.lastRefill = currentTime;
    }
}

/**
 * Sliding Window Log Rate Limiting Algorithm
 * 
 * CHARACTERISTICS:
 * - Precise rate limiting with exact request tracking
 * - No boundary effect issues
 * - Higher memory usage: O(n) per key where n = requests in window
 * - Best for strict rate limiting requirements
 * 
 * ALGORITHM:
 * 1. Maintain log of all request timestamps for each client
 * 2. Remove expired timestamps outside current window
 * 3. Check if adding new request exceeds limit
 * 4. Memory usage grows with request rate
 */
class SlidingWindowLogAlgorithm extends RateLimitingAlgorithm {
    constructor() {
        super();
        this.requestLogs = new Map();
    }

    isAllowed(key, rule, currentTime) {
        const windowStart = currentTime - rule.windowSizeSeconds;
        
        // Clean expired requests
        this._cleanExpiredRequests(key, windowStart);
        
        const currentRequests = this._getRequestCount(key);
        
        if (currentRequests < rule.requestsPerWindow) {
            // Allow request and log timestamp
            if (!this.requestLogs.has(key)) {
                this.requestLogs.set(key, []);
            }
            this.requestLogs.get(key).push(currentTime);
            
            const remaining = rule.requestsPerWindow - currentRequests - 1;
            
            return new RateLimitResult(
                RateLimitStatus.ALLOWED,
                true,
                remaining,
                rule.requestsPerWindow
            );
        } else {
            // Calculate retry after time (when oldest request expires)
            let retryAfter = rule.windowSizeSeconds;
            const requestLog = this.requestLogs.get(key);
            
            if (requestLog && requestLog.length > 0) {
                const oldestRequest = requestLog[0];
                retryAfter = Math.max(0, (oldestRequest + rule.windowSizeSeconds) - currentTime);
            }
            
            return new RateLimitResult(
                RateLimitStatus.REJECTED,
                false,
                0,
                rule.requestsPerWindow,
                retryAfter
            );
        }
    }

    getRemainingQuota(key, rule, currentTime) {
        const windowStart = currentTime - rule.windowSizeSeconds;
        this._cleanExpiredRequests(key, windowStart);
        const currentRequests = this._getRequestCount(key);
        return Math.max(0, rule.requestsPerWindow - currentRequests);
    }

    resetQuota(key) {
        this.requestLogs.delete(key);
    }

    _getRequestCount(key) {
        return this.requestLogs.has(key) ? this.requestLogs.get(key).length : 0;
    }

    _cleanExpiredRequests(key, windowStart) {
        if (!this.requestLogs.has(key)) return;
        
        const requestLog = this.requestLogs.get(key);
        while (requestLog.length > 0 && requestLog[0] < windowStart) {
            requestLog.shift();
        }
    }
}

/**
 * Fixed Window Counter Rate Limiting Algorithm
 * 
 * CHARACTERISTICS:
 * - Simple and memory efficient: O(1) per key
 * - Potential traffic spikes at window boundaries
 * - Fast processing with minimal computation
 * - Good for approximate rate limiting
 * 
 * ALGORITHM:
 * 1. Divide time into fixed windows
 * 2. Count requests in current window
 * 3. Reset counter at window boundaries
 * 4. Allow if counter < limit
 */
class FixedWindowCounterAlgorithm extends RateLimitingAlgorithm {
    constructor() {
        super();
        this.counters = new Map();
    }

    isAllowed(key, rule, currentTime) {
        const windowStart = this._getWindowStart(currentTime, rule.windowSizeSeconds);
        const counter = this._getOrCreateCounter(key, windowStart);
        
        // Reset counter if we're in a new window
        if (counter.windowStart !== windowStart) {
            counter.count = 0;
            counter.windowStart = windowStart;
        }
        
        if (counter.count < rule.requestsPerWindow) {
            counter.count += 1;
            const remaining = rule.requestsPerWindow - counter.count;
            const resetTime = new Date((windowStart + rule.windowSizeSeconds) * 1000);
            
            return new RateLimitResult(
                RateLimitStatus.ALLOWED,
                true,
                remaining,
                rule.requestsPerWindow,
                null,
                resetTime
            );
        } else {
            // Calculate retry after time (start of next window)
            const nextWindow = windowStart + rule.windowSizeSeconds;
            const retryAfter = nextWindow - currentTime;
            const resetTime = new Date(nextWindow * 1000);
            
            return new RateLimitResult(
                RateLimitStatus.REJECTED,
                false,
                0,
                rule.requestsPerWindow,
                retryAfter,
                resetTime
            );
        }
    }

    getRemainingQuota(key, rule, currentTime) {
        const windowStart = this._getWindowStart(currentTime, rule.windowSizeSeconds);
        const counter = this._getOrCreateCounter(key, windowStart);
        
        if (counter.windowStart !== windowStart) {
            return rule.requestsPerWindow;
        }
        
        return Math.max(0, rule.requestsPerWindow - counter.count);
    }

    resetQuota(key) {
        this.counters.delete(key);
    }

    _getWindowStart(currentTime, windowSize) {
        return Math.floor(currentTime / windowSize) * windowSize;
    }

    _getOrCreateCounter(key, windowStart) {
        if (!this.counters.has(key)) {
            this.counters.set(key, {
                count: 0,
                windowStart: windowStart
            });
        }
        return this.counters.get(key);
    }
}

/**
 * Factory for creating rate limiting algorithms - Factory Pattern
 */
class RateLimitingAlgorithmFactory {
    static algorithms = {
        [AlgorithmType.TOKEN_BUCKET]: TokenBucketAlgorithm,
        [AlgorithmType.SLIDING_WINDOW_LOG]: SlidingWindowLogAlgorithm,
        [AlgorithmType.FIXED_WINDOW]: FixedWindowCounterAlgorithm
    };

    static createAlgorithm(algorithmType) {
        const AlgorithmClass = this.algorithms[algorithmType];
        if (!AlgorithmClass) {
            throw new Error(`Unsupported algorithm type: ${algorithmType}`);
        }
        return new AlgorithmClass();
    }

    static registerAlgorithm(algorithmType, algorithmClass) {
        this.algorithms[algorithmType] = algorithmClass;
    }
}

/**
 * Abstract Event Listener - Observer Pattern
 */
class RateLimitEventListener {
    onRateLimitViolated(key, rule, result) {
        throw new Error("onRateLimitViolated must be implemented by subclass");
    }

    onRateLimitAllowed(key, rule, result) {
        throw new Error("onRateLimitAllowed must be implemented by subclass");
    }
}

/**
 * Console Event Listener - Concrete Observer
 */
class ConsoleEventListener extends RateLimitEventListener {
    onRateLimitViolated(key, rule, result) {
        console.log(`[RATE_LIMIT_VIOLATED] Key: ${key}, Rule: ${rule.requestsPerWindow}/${rule.windowSizeSeconds}s`);
    }

    onRateLimitAllowed(key, rule, result) {
        console.log(`[RATE_LIMIT_ALLOWED] Key: ${key}, Remaining: ${result.remainingQuota}`);
    }
}

/**
 * Rate Limit Statistics - Analytics and Monitoring
 */
class RateLimitStatistics {
    constructor() {
        this.totalRequests = 0;
        this.allowedRequests = 0;
        this.rejectedRequests = 0;
        this.violationsByKey = new Map();
        this.startTime = Date.now() / 1000;
    }

    recordRequest(key, result) {
        this.totalRequests++;
        if (result.allowed) {
            this.allowedRequests++;
        } else {
            this.rejectedRequests++;
            const violations = this.violationsByKey.get(key) || 0;
            this.violationsByKey.set(key, violations + 1);
        }
    }

    get rejectionRate() {
        return this.totalRequests === 0 ? 0 : this.rejectedRequests / this.totalRequests;
    }

    get requestsPerSecond() {
        const elapsed = (Date.now() / 1000) - this.startTime;
        return elapsed > 0 ? this.totalRequests / elapsed : 0;
    }

    getTopViolators(limit = 10) {
        return Array.from(this.violationsByKey.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit);
    }

    toString() {
        return `RateLimitStats(total=${this.totalRequests}, allowed=${this.allowedRequests}, rejected=${this.rejectedRequests}, rejection_rate=${(this.rejectionRate * 100).toFixed(1)}%)`;
    }
}

/**
 * Main Rate Limiter System - Facade Pattern
 * 
 * FACADE PATTERN: Simple interface for complex rate limiting logic
 * STRATEGY PATTERN: Pluggable algorithms and storage backends
 * OBSERVER PATTERN: Event notifications for monitoring
 * 
 * FEATURES:
 * - Multiple algorithm support with automatic selection
 * - Rule-based configuration for different resources
 * - Real-time monitoring and statistics
 * - Extensible architecture for custom implementations
 */
class RateLimiter {
    constructor(defaultAlgorithm = AlgorithmType.TOKEN_BUCKET) {
        this.defaultAlgorithm = defaultAlgorithm;
        this.rules = new Map();
        this.algorithms = new Map();
        this.eventListeners = [];
        this.statistics = new RateLimitStatistics();
        
        // Initialize default algorithms
        this._initializeAlgorithms();
    }

    _initializeAlgorithms() {
        for (const algorithmType of Object.values(AlgorithmType)) {
            try {
                this.algorithms.set(
                    algorithmType,
                    RateLimitingAlgorithmFactory.createAlgorithm(algorithmType)
                );
            } catch (error) {
                // Skip unsupported algorithms
            }
        }
    }

    /**
     * Add rate limiting rule for a resource
     */
    addRule(resource, rule) {
        this.rules.set(resource, rule);
    }

    /**
     * Remove rate limiting rule for a resource
     */
    removeRule(resource) {
        this.rules.delete(resource);
    }

    /**
     * Check if request is allowed for identifier and resource
     * 
     * MAIN BUSINESS LOGIC:
     * 1. Get or create rule for resource
     * 2. Select appropriate algorithm
     * 3. Check rate limit using algorithm
     * 4. Record statistics and fire events
     * 5. Return result with quota information
     */
    isAllowed(identifier, resource = 'default') {
        const currentTime = Date.now() / 1000;
        
        // Get rule for resource
        const rule = this._getRuleForResource(resource);
        
        // Get algorithm for rule
        const algorithm = this.algorithms.get(rule.algorithm);
        if (!algorithm) {
            return new RateLimitResult(
                RateLimitStatus.ERROR,
                false,
                0,
                0
            );
        }
        
        // Check rate limit
        const cacheKey = `${identifier}:${resource}`;
        const result = algorithm.isAllowed(cacheKey, rule, currentTime);
        
        // Record statistics
        this.statistics.recordRequest(identifier, result);
        
        // Fire events
        this._fireEvents(identifier, rule, result);
        
        return result;
    }

    /**
     * Get remaining quota for identifier and resource
     */
    getRemainingQuota(identifier, resource = 'default') {
        const currentTime = Date.now() / 1000;
        const rule = this._getRuleForResource(resource);
        const algorithm = this.algorithms.get(rule.algorithm);
        
        if (!algorithm) {
            return 0;
        }
        
        const cacheKey = `${identifier}:${resource}`;
        return algorithm.getRemainingQuota(cacheKey, rule, currentTime);
    }

    /**
     * Reset quota for identifier and resource
     */
    resetQuota(identifier, resource = 'default') {
        const rule = this._getRuleForResource(resource);
        const algorithm = this.algorithms.get(rule.algorithm);
        
        if (algorithm) {
            const cacheKey = `${identifier}:${resource}`;
            algorithm.resetQuota(cacheKey);
        }
    }

    /**
     * Add event listener for rate limiting events
     */
    addEventListener(listener) {
        this.eventListeners.push(listener);
    }

    /**
     * Remove event listener
     */
    removeEventListener(listener) {
        const index = this.eventListeners.indexOf(listener);
        if (index !== -1) {
            this.eventListeners.splice(index, 1);
        }
    }

    /**
     * Get rate limiting statistics
     */
    getStatistics() {
        return this.statistics;
    }

    _getRuleForResource(resource) {
        if (!this.rules.has(resource)) {
            // Create default rule
            const defaultRule = new RateLimitingRule(
                100,  // requests per window
                60,   // window size in seconds
                this.defaultAlgorithm
            );
            this.rules.set(resource, defaultRule);
        }
        
        return this.rules.get(resource);
    }

    _fireEvents(identifier, rule, result) {
        for (const listener of this.eventListeners) {
            try {
                if (result.allowed) {
                    listener.onRateLimitAllowed(identifier, rule, result);
                } else {
                    listener.onRateLimitViolated(identifier, rule, result);
                }
            } catch (error) {
                console.error(`Error in event listener: ${error.message}`);
            }
        }
    }

    toString() {
        return `RateLimiter(rules=${this.rules.size}, algorithms=${this.algorithms.size}, ${this.statistics})`;
    }
}

/**
 * Hierarchical Rate Limiter - Composite Pattern
 */
class HierarchicalRateLimiter {
    constructor() {
        this.globalLimiter = new RateLimiter();
        this.tenantLimiter = new RateLimiter();
        this.userLimiter = new RateLimiter();
    }

    setupLimits() {
        // Global limits (system-wide)
        const globalRule = new RateLimitingRule(10000, 60, AlgorithmType.TOKEN_BUCKET);
        this.globalLimiter.addRule('api', globalRule);
        
        // Tenant limits (per organization)
        const tenantRule = new RateLimitingRule(1000, 60, AlgorithmType.SLIDING_WINDOW_LOG);
        this.tenantLimiter.addRule('api', tenantRule);
        
        // User limits (per individual user)
        const userRule = new RateLimitingRule(100, 60, AlgorithmType.FIXED_WINDOW);
        this.userLimiter.addRule('api', userRule);
    }

    isAllowed(tenantId, userId, resource = 'api') {
        // Check global limit
        const globalResult = this.globalLimiter.isAllowed('global', resource);
        if (!globalResult.allowed) {
            return globalResult;
        }
        
        // Check tenant limit
        const tenantResult = this.tenantLimiter.isAllowed(tenantId, resource);
        if (!tenantResult.allowed) {
            return tenantResult;
        }
        
        // Check user limit
        const userResult = this.userLimiter.isAllowed(userId, resource);
        return userResult;
    }
}

/**
 * Rate Limiter Builder - Builder Pattern
 */
class RateLimiterBuilder {
    constructor() {
        this.defaultAlgorithm = AlgorithmType.TOKEN_BUCKET;
        this.listeners = [];
        this.rules = [];
    }

    withDefaultAlgorithm(algorithm) {
        this.defaultAlgorithm = algorithm;
        return this;
    }

    withConsoleLogging() {
        this.listeners.push(new ConsoleEventListener());
        return this;
    }

    withRule(resource, requestsPerWindow, windowSizeSeconds, algorithm) {
        this.rules.push({
            resource,
            rule: new RateLimitingRule(requestsPerWindow, windowSizeSeconds, algorithm)
        });
        return this;
    }

    build() {
        const rateLimiter = new RateLimiter(this.defaultAlgorithm);
        
        // Add listeners
        for (const listener of this.listeners) {
            rateLimiter.addEventListener(listener);
        }
        
        // Add rules
        for (const {resource, rule} of this.rules) {
            rateLimiter.addRule(resource, rule);
        }
        
        return rateLimiter;
    }
}

// Demo usage and comprehensive testing
function main() {
    console.log("=== Rate Limiter System Demo ===\n");
    
    // Test 1: Token Bucket Algorithm
    console.log("1. Testing Token Bucket Algorithm:");
    const rateLimiter = new RateLimiterBuilder()
        .withDefaultAlgorithm(AlgorithmType.TOKEN_BUCKET)
        .withConsoleLogging()
        .withRule('token_api', 5, 10, AlgorithmType.TOKEN_BUCKET)
        .build();
    
    // Test burst capacity
    for (let i = 0; i < 12; i++) {
        const result = rateLimiter.isAllowed('user1', 'token_api');
        console.log(`Request ${i+1}: ${result.allowed ? '✓' : '✗'} (remaining: ${result.remainingQuota})`);
    }
    
    console.log("\n" + "=".repeat(50) + "\n");
    
    // Test 2: Sliding Window Log Algorithm
    console.log("2. Testing Sliding Window Log Algorithm:");
    const slidingRule = new RateLimitingRule(3, 5, AlgorithmType.SLIDING_WINDOW_LOG);
    rateLimiter.addRule('sliding_api', slidingRule);
    
    for (let i = 0; i < 5; i++) {
        const result = rateLimiter.isAllowed('user2', 'sliding_api');
        console.log(`Request ${i+1}: ${result.allowed ? '✓' : '✗'} (remaining: ${result.remainingQuota})`);
        if (result.retryAfterSeconds) {
            console.log(`  Retry after: ${result.retryAfterSeconds.toFixed(2)} seconds`);
        }
    }
    
    console.log("\n" + "=".repeat(50) + "\n");
    
    // Test 3: Fixed Window Algorithm
    console.log("3. Testing Fixed Window Algorithm:");
    const fixedRule = new RateLimitingRule(3, 5, AlgorithmType.FIXED_WINDOW);
    rateLimiter.addRule('fixed_api', fixedRule);
    
    for (let i = 0; i < 5; i++) {
        const result = rateLimiter.isAllowed('user3', 'fixed_api');
        console.log(`Request ${i+1}: ${result.allowed ? '✓' : '✗'} (remaining: ${result.remainingQuota})`);
        if (result.resetTime) {
            console.log(`  Window resets at: ${result.resetTime.toISOString()}`);
        }
    }
    
    console.log("\n" + "=".repeat(50) + "\n");
    
    // Test 4: Different users, same resource
    console.log("4. Testing Multiple Users:");
    const apiRule = new RateLimitingRule(3, 10, AlgorithmType.TOKEN_BUCKET);
    rateLimiter.addRule('shared_api', apiRule);
    
    const users = ['alice', 'bob', 'charlie'];
    for (const user of users) {
        console.log(`\nUser ${user}:`);
        for (let i = 0; i < 4; i++) {
            const result = rateLimiter.isAllowed(user, 'shared_api');
            console.log(`  Request ${i+1}: ${result.allowed ? '✓' : '✗'}`);
        }
    }
    
    console.log("\n" + "=".repeat(50) + "\n");
    
    // Test 5: Statistics and Monitoring
    console.log("5. Rate Limiting Statistics:");
    const stats = rateLimiter.getStatistics();
    console.log(`Total requests: ${stats.totalRequests}`);
    console.log(`Allowed requests: ${stats.allowedRequests}`);
    console.log(`Rejected requests: ${stats.rejectedRequests}`);
    console.log(`Rejection rate: ${(stats.rejectionRate * 100).toFixed(2)}%`);
    console.log(`Requests per second: ${stats.requestsPerSecond.toFixed(2)}`);
    
    console.log("\nTop violators:");
    const topViolators = stats.getTopViolators(3);
    for (const [identifier, violations] of topViolators) {
        console.log(`  ${identifier}: ${violations} violations`);
    }
    
    console.log("\n" + "=".repeat(50) + "\n");
    
    // Test 6: Hierarchical Rate Limiting
    console.log("6. Testing Hierarchical Rate Limiting:");
    const hierarchicalLimiter = new HierarchicalRateLimiter();
    hierarchicalLimiter.setupLimits();
    
    // Test hierarchical limits
    for (let i = 0; i < 5; i++) {
        const result = hierarchicalLimiter.isAllowed('tenant1', 'user1');
        console.log(`Hierarchical check ${i+1}: ${result.allowed ? '✓' : '✗'}`);
    }
    
    console.log("\n" + "=".repeat(50) + "\n");
    
    // Test 7: Algorithm Performance Comparison
    console.log("7. Algorithm Performance Comparison:");
    
    const algorithms = [
        [AlgorithmType.TOKEN_BUCKET, "Token Bucket"],
        [AlgorithmType.SLIDING_WINDOW_LOG, "Sliding Window Log"],
        [AlgorithmType.FIXED_WINDOW, "Fixed Window"]
    ];
    
    for (const [algoType, algoName] of algorithms) {
        const testRule = new RateLimitingRule(1000, 60, algoType);
        const testLimiter = new RateLimiter();
        testLimiter.addRule('perf_test', testRule);
        
        // Performance test
        const startTime = Date.now();
        const requests = 1000;
        let allowedCount = 0;
        
        for (let i = 0; i < requests; i++) {
            const result = testLimiter.isAllowed(`perf_user_${i % 100}`, 'perf_test');
            if (result.allowed) {
                allowedCount++;
            }
        }
        
        const endTime = Date.now();
        const duration = (endTime - startTime) / 1000;
        const rps = requests / duration;
        
        console.log(`${algoName}:`);
        console.log(`  Processed ${requests} requests in ${duration.toFixed(3)}s`);
        console.log(`  Rate: ${rps.toFixed(0)} requests/second`);
        console.log(`  Allowed: ${allowedCount}/${requests}`);
        console.log();
    }
    
    // Test 8: Error Handling
    console.log("8. Testing Error Handling:");
    try {
        new RateLimitingRule(0, 60, AlgorithmType.TOKEN_BUCKET);
    } catch (error) {
        console.log(`Expected error for zero requests: ${error.message}`);
    }
    
    try {
        new RateLimitingRule(100, -5, AlgorithmType.TOKEN_BUCKET);
    } catch (error) {
        console.log(`Expected error for negative window: ${error.message}`);
    }
    
    console.log("\n=== Demo completed successfully ===");
}

// Export classes for use in other modules (Node.js)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        AlgorithmType,
        RateLimitStatus,
        RateLimitingRule,
        RateLimitResult,
        RateLimitingAlgorithm,
        TokenBucketAlgorithm,
        SlidingWindowLogAlgorithm,
        FixedWindowCounterAlgorithm,
        RateLimitingAlgorithmFactory,
        RateLimitEventListener,
        ConsoleEventListener,
        RateLimitStatistics,
        RateLimiter,
        HierarchicalRateLimiter,
        RateLimiterBuilder
    };
}

// Run demo if this file is executed directly
if (typeof require !== 'undefined' && require.main === module) {
    main();
}