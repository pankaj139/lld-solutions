/**
 * Logger System - A flexible and efficient logging framework
 * 
 * This module implements a production-ready logging system with support for:
 * - Multiple log levels (DEBUG, INFO, WARN, ERROR, FATAL)
 * - Multiple output destinations (Console, File)
 * - Asynchronous logging for high performance
 * - Thread-safe operations
 * - Log rotation and formatting
 * - Extensible architecture using design patterns
 * 
 * Design Patterns Used:
 *     - Singleton: Logger instance
 *     - Strategy: LogFormatter implementations
 *     - Observer: Multiple appenders observing log events
 *     - Chain of Responsibility: LogFilter chain
 *     - Factory: AppenderFactory for creating appenders
 * 
 * Author: LLD Solutions
 * Date: 2025-01-04
 */

const fs = require('fs');
const path = require('path');

// ============================================================================
// ENUMERATIONS
// ============================================================================

/**
 * Enumeration for log severity levels.
 * Higher values indicate more severe logs.
 */
class LogLevel {
    static DEBUG = new LogLevel('DEBUG', 10);
    static INFO = new LogLevel('INFO', 20);
    static WARN = new LogLevel('WARN', 30);
    static ERROR = new LogLevel('ERROR', 40);
    static FATAL = new LogLevel('FATAL', 50);

    constructor(name, value) {
        this.name = name;
        this.value = value;
    }

    /**
     * Compare log levels for filtering
     * @param {LogLevel} other - Other log level to compare
     * @returns {boolean} True if this level is >= other level
     */
    isGreaterThanOrEqual(other) {
        return this.value >= other.value;
    }
}

// ============================================================================
// DATA CLASSES
// ============================================================================

/**
 * Immutable data class representing a single log entry.
 * 
 * Usage:
 *     const record = new LogRecord(LogLevel.INFO, "Application started");
 */
class LogRecord {
    /**
     * Create a log record.
     * @param {LogLevel} level - Severity level
     * @param {string} message - Log message
     * @param {string} source - Source location (default: "unknown")
     */
    constructor(level, message, source = 'unknown') {
        this.timestamp = new Date();
        this.level = level;
        this.message = message;
        this.threadId = process.pid; // Use process ID in Node.js
        this.source = source;
    }

    toString() {
        return `[${this.timestamp.toISOString()}] [${this.level.name}] ${this.message}`;
    }
}

// ============================================================================
// STRATEGY PATTERN: LOG FORMATTERS
// ============================================================================

/**
 * Abstract base class for log formatters (Strategy Pattern).
 * 
 * Subclasses implement different formatting strategies.
 */
class LogFormatter {
    /**
     * Format a log record into a string.
     * @param {LogRecord} record - LogRecord to format
     * @returns {string} Formatted string representation
     */
    format(record) {
        throw new Error('format() must be implemented by subclass');
    }
}

/**
 * Plain text formatter with customizable pattern.
 * 
 * Pattern placeholders:
 *     %timestamp% - Log timestamp
 *     %level% - Log level name
 *     %message% - Log message
 *     %thread% - Thread/Process ID
 *     %source% - Source location
 * 
 * Usage:
 *     const formatter = new PlainFormatter("[%timestamp%] [%level%] %message%");
 */
class PlainFormatter extends LogFormatter {
    /**
     * Create a plain text formatter.
     * @param {string} pattern - Format pattern
     */
    constructor(pattern = '[%timestamp%] [%level%] [Process-%thread%] %message%') {
        super();
        this.pattern = pattern;
    }

    format(record) {
        let result = this.pattern;
        const timestamp = record.timestamp.toISOString().replace('T', ' ').substring(0, 23);
        result = result.replace('%timestamp%', timestamp);
        result = result.replace('%level%', record.level.name);
        result = result.replace('%message%', record.message);
        result = result.replace('%thread%', record.threadId.toString());
        result = result.replace('%source%', record.source);
        return result;
    }
}

/**
 * JSON formatter for structured logging.
 * 
 * Usage:
 *     const formatter = new JSONFormatter();
 */
class JSONFormatter extends LogFormatter {
    format(record) {
        return JSON.stringify({
            timestamp: record.timestamp.toISOString(),
            level: record.level.name,
            message: record.message,
            thread_id: record.threadId,
            source: record.source
        });
    }
}

// ============================================================================
// CHAIN OF RESPONSIBILITY PATTERN: LOG FILTERS
// ============================================================================

/**
 * Abstract base class for log filters (Chain of Responsibility Pattern).
 * 
 * Filters can be chained together to create complex filtering logic.
 */
class LogFilter {
    constructor() {
        this._nextFilter = null;
    }

    /**
     * Set the next filter in the chain.
     * @param {LogFilter} logFilter - Next filter to chain
     * @returns {LogFilter} The next filter for method chaining
     */
    setNext(logFilter) {
        this._nextFilter = logFilter;
        return logFilter;
    }

    /**
     * Determine if log should be processed.
     * @param {LogRecord} record - LogRecord to evaluate
     * @returns {boolean} True if log should be processed
     */
    shouldLog(record) {
        throw new Error('shouldLog() must be implemented by subclass');
    }
}

/**
 * Filter logs based on minimum severity level.
 * 
 * Usage:
 *     const filter = new LevelFilter(LogLevel.WARN);  // Only WARN and above
 */
class LevelFilter extends LogFilter {
    /**
     * Create a level filter.
     * @param {LogLevel} minLevel - Minimum log level to accept
     */
    constructor(minLevel) {
        super();
        this.minLevel = minLevel;
    }

    shouldLog(record) {
        const result = record.level.isGreaterThanOrEqual(this.minLevel);
        if (result && this._nextFilter) {
            return this._nextFilter.shouldLog(record);
        }
        return result;
    }
}

// ============================================================================
// OBSERVER PATTERN: LOG APPENDERS
// ============================================================================

/**
 * Abstract base class for log appenders (Observer Pattern).
 * 
 * Appenders receive log events and output them to specific destinations.
 */
class LogAppender {
    constructor() {
        this.formatter = new PlainFormatter();
        this.filter = null;
    }

    /**
     * Set the formatter for this appender.
     * @param {LogFormatter} formatter - LogFormatter instance
     */
    setFormatter(formatter) {
        this.formatter = formatter;
    }

    /**
     * Set the filter for this appender.
     * @param {LogFilter} logFilter - LogFilter instance
     */
    setFilter(logFilter) {
        this.filter = logFilter;
    }

    /**
     * Process and output a log record.
     * @param {LogRecord} record - LogRecord to process
     */
    append(record) {
        throw new Error('append() must be implemented by subclass');
    }
}

/**
 * Appender that outputs logs to console (stdout/stderr).
 * 
 * Usage:
 *     const appender = new ConsoleAppender();
 *     appender.setFormatter(new PlainFormatter());
 */
class ConsoleAppender extends LogAppender {
    append(record) {
        if (this.filter && !this.filter.shouldLog(record)) {
            return;
        }

        const formattedMessage = this.formatter.format(record);

        // ERROR and FATAL go to stderr, others to stdout
        if (record.level === LogLevel.ERROR || record.level === LogLevel.FATAL) {
            console.error(formattedMessage);
        } else {
            console.log(formattedMessage);
        }
    }
}

/**
 * Appender that writes logs to a file with rotation support.
 * 
 * Features:
 *     - Size-based rotation
 *     - Automatic file creation
 *     - Synchronous writes (for simplicity)
 * 
 * Usage:
 *     const appender = new FileAppender("app.log", 10, 5);
 */
class FileAppender extends LogAppender {
    /**
     * Create a file appender.
     * @param {string} filename - Path to log file
     * @param {number} maxSizeMB - Maximum file size before rotation (default: 10MB)
     * @param {number} maxFiles - Maximum number of backup files (default: 5)
     */
    constructor(filename, maxSizeMB = 10, maxFiles = 5) {
        super();
        this.filename = filename;
        this.maxSizeBytes = maxSizeMB * 1024 * 1024;
        this.maxFiles = maxFiles;
        this._ensureFileExists();
    }

    _ensureFileExists() {
        try {
            if (!fs.existsSync(this.filename)) {
                fs.writeFileSync(this.filename, '', 'utf8');
            }
        } catch (error) {
            console.error(`Failed to create log file: ${error.message}`);
        }
    }

    _shouldRotate() {
        try {
            const stats = fs.statSync(this.filename);
            return stats.size >= this.maxSizeBytes;
        } catch {
            return false;
        }
    }

    _rotateFiles() {
        // Delete oldest file if max_files reached
        const oldestFile = `${this.filename}.${this.maxFiles}`;
        if (fs.existsSync(oldestFile)) {
            fs.unlinkSync(oldestFile);
        }

        // Rotate existing backup files
        for (let i = this.maxFiles - 1; i > 0; i--) {
            const oldFile = `${this.filename}.${i}`;
            const newFile = `${this.filename}.${i + 1}`;
            if (fs.existsSync(oldFile)) {
                fs.renameSync(oldFile, newFile);
            }
        }

        // Rotate current file
        if (fs.existsSync(this.filename)) {
            fs.renameSync(this.filename, `${this.filename}.1`);
        }
    }

    append(record) {
        if (this.filter && !this.filter.shouldLog(record)) {
            return;
        }

        // Check if rotation is needed
        if (this._shouldRotate()) {
            this._rotateFiles();
        }

        // Write log message
        const formattedMessage = this.formatter.format(record);
        try {
            fs.appendFileSync(this.filename, formattedMessage + '\n', 'utf8');
        } catch (error) {
            console.error(`Failed to write log: ${error.message}`);
        }
    }
}

// ============================================================================
// SINGLETON PATTERN: LOGGER
// ============================================================================

/**
 * Main logger class (Singleton Pattern).
 * 
 * Provides global logging functionality with support for:
 * - Multiple log levels
 * - Multiple appenders
 * - Asynchronous logging (via setImmediate)
 * - Thread-safe operations
 * 
 * Usage:
 *     const logger = Logger.getInstance();
 *     logger.setLevel(LogLevel.INFO);
 *     logger.addAppender(new ConsoleAppender());
 *     logger.info("Application started");
 */
class Logger {
    constructor() {
        if (Logger._instance) {
            throw new Error('Use Logger.getInstance() instead of new');
        }

        this.level = LogLevel.INFO;
        this.appenders = [];
        this.asyncQueue = [];
        this.asyncEnabled = true;
        this._processing = false;
    }

    /**
     * Get the singleton logger instance.
     * @returns {Logger} The singleton logger instance
     */
    static getInstance() {
        if (!Logger._instance) {
            Logger._instance = new Logger();
        }
        return Logger._instance;
    }

    /**
     * Set the minimum log level.
     * @param {LogLevel} level - Minimum LogLevel to process
     */
    setLevel(level) {
        this.level = level;
    }

    /**
     * Add an appender to receive log events.
     * @param {LogAppender} appender - LogAppender to add
     */
    addAppender(appender) {
        this.appenders.push(appender);
    }

    _processQueue() {
        if (this._processing || this.asyncQueue.length === 0) {
            return;
        }

        this._processing = true;
        setImmediate(() => {
            while (this.asyncQueue.length > 0) {
                const record = this.asyncQueue.shift();
                this._processLog(record);
            }
            this._processing = false;
        });
    }

    _processLog(record) {
        for (const appender of this.appenders) {
            try {
                appender.append(record);
            } catch (error) {
                console.error(`Appender failed: ${error.message}`);
            }
        }
    }

    _log(level, message) {
        // Filter by level
        if (!level.isGreaterThanOrEqual(this.level)) {
            return;
        }

        // Create log record
        const record = new LogRecord(level, message);

        if (this.asyncEnabled) {
            if (this.asyncQueue.length < 10000) {
                this.asyncQueue.push(record);
                this._processQueue();
            } else {
                console.error(`Log queue full, dropping message: ${message.substring(0, 50)}...`);
            }
        } else {
            this._processLog(record);
        }
    }

    /**
     * Log debug message.
     * @param {string} message - Debug message
     */
    debug(message) {
        this._log(LogLevel.DEBUG, message);
    }

    /**
     * Log informational message.
     * @param {string} message - Info message
     */
    info(message) {
        this._log(LogLevel.INFO, message);
    }

    /**
     * Log warning message.
     * @param {string} message - Warning message
     */
    warn(message) {
        this._log(LogLevel.WARN, message);
    }

    /**
     * Log error message.
     * @param {string} message - Error message
     */
    error(message) {
        this._log(LogLevel.ERROR, message);
    }

    /**
     * Log fatal message.
     * @param {string} message - Fatal message
     */
    fatal(message) {
        this._log(LogLevel.FATAL, message);
    }
}

// ============================================================================
// FACTORY PATTERN: APPENDER FACTORY
// ============================================================================

/**
 * Factory for creating different types of appenders.
 * 
 * Usage:
 *     const consoleAppender = AppenderFactory.createConsoleAppender();
 *     const fileAppender = AppenderFactory.createFileAppender("app.log");
 */
class AppenderFactory {
    /**
     * Create a console appender.
     * @returns {ConsoleAppender} ConsoleAppender instance
     */
    static createConsoleAppender() {
        return new ConsoleAppender();
    }

    /**
     * Create a file appender.
     * @param {string} filename - Path to log file
     * @param {number} maxSizeMB - Maximum file size before rotation
     * @param {number} maxFiles - Maximum number of backup files
     * @returns {FileAppender} FileAppender instance
     */
    static createFileAppender(filename, maxSizeMB = 10, maxFiles = 5) {
        return new FileAppender(filename, maxSizeMB, maxFiles);
    }
}

// ============================================================================
// DEMO: USAGE EXAMPLE
// ============================================================================

/**
 * Demonstration of the Logger System functionality.
 * 
 * Shows:
 *     - Logger configuration
 *     - Multiple appenders
 *     - Different formatters
 *     - Log level filtering
 *     - File rotation
 */
function demoLoggerSystem() {
    console.log('='.repeat(70));
    console.log('LOGGER SYSTEM DEMONSTRATION');
    console.log('='.repeat(70));
    console.log();

    // Get logger instance (Singleton)
    const logger = Logger.getInstance();
    logger.setLevel(LogLevel.DEBUG);

    // Create and configure console appender
    const consoleAppender = AppenderFactory.createConsoleAppender();
    consoleAppender.setFormatter(new PlainFormatter('[%timestamp%] [%level%] %message%'));
    logger.addAppender(consoleAppender);

    // Create and configure file appender with JSON format
    const fileAppender = AppenderFactory.createFileAppender(
        'application.log',
        1,
        3
    );
    fileAppender.setFormatter(new JSONFormatter());
    fileAppender.setFilter(new LevelFilter(LogLevel.INFO));  // Only INFO and above
    logger.addAppender(fileAppender);

    console.log('\n1. Testing All Log Levels:');
    console.log('-'.repeat(70));
    logger.debug('This is a DEBUG message - detailed diagnostic information');
    logger.info('This is an INFO message - general informational message');
    logger.warn('This is a WARN message - warning about potential issues');
    logger.error('This is an ERROR message - error that needs attention');
    logger.fatal('This is a FATAL message - critical system failure');

    console.log('\n2. Testing Log Level Filtering:');
    console.log('-'.repeat(70));
    console.log('Setting log level to WARN (DEBUG and INFO will be filtered)...');
    logger.setLevel(LogLevel.WARN);
    logger.debug("This DEBUG message won't appear");
    logger.info("This INFO message won't appear");
    logger.warn('This WARN message will appear');
    logger.error('This ERROR message will appear');

    console.log('\n3. Testing File Logging:');
    console.log('-'.repeat(70));
    console.log("Logs are being written to 'application.log' in JSON format");
    console.log('Only INFO and above are written to file (due to filter)');

    // Generate some logs for file rotation demo
    logger.setLevel(LogLevel.INFO);
    for (let i = 0; i < 5; i++) {
        logger.info(`Application event #${i + 1} - simulating normal operation`);
    }

    console.log('\n4. Logger Features Summary:');
    console.log('-'.repeat(70));
    console.log('✓ Singleton pattern ensures single logger instance');
    console.log('✓ Strategy pattern for different formatters (Plain, JSON)');
    console.log('✓ Observer pattern for multiple appenders (Console, File)');
    console.log('✓ Chain of Responsibility for filtering');
    console.log('✓ Factory pattern for creating appenders');
    console.log('✓ Asynchronous logging for high performance');
    console.log('✓ File rotation with configurable size and count');

    console.log('\n' + '='.repeat(70));
    console.log('DEMONSTRATION COMPLETE');
    console.log('='.repeat(70));
    console.log("\nCheck 'application.log' for JSON-formatted file logs");
    console.log('Logs have been displayed on console with timestamp formatting');
}

// Run demonstration
if (require.main === module) {
    demoLoggerSystem();
}

// Export for use as a module
module.exports = {
    LogLevel,
    LogRecord,
    LogFormatter,
    PlainFormatter,
    JSONFormatter,
    LogFilter,
    LevelFilter,
    LogAppender,
    ConsoleAppender,
    FileAppender,
    Logger,
    AppenderFactory
};

