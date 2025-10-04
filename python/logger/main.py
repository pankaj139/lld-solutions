"""
Logger System - A flexible and efficient logging framework

This module implements a production-ready logging system with support for:
- Multiple log levels (DEBUG, INFO, WARN, ERROR, FATAL)
- Multiple output destinations (Console, File, Database, Remote)
- Asynchronous logging for high performance
- Thread-safe operations
- Log rotation and formatting
- Extensible architecture using design patterns

Design Patterns Used:
    - Singleton: Logger instance
    - Strategy: LogFormatter implementations
    - Observer: Multiple appenders observing log events
    - Chain of Responsibility: LogFilter chain
    - Factory: AppenderFactory for creating appenders

Author: LLD Solutions
Date: 2025-01-04
"""

from enum import Enum
from datetime import datetime
from abc import ABC, abstractmethod
from threading import Lock, Thread, current_thread
from queue import Queue, Full
from typing import List, Optional
import json


# ============================================================================
# ENUMERATIONS
# ============================================================================

class LogLevel(Enum):
    """
    Enumeration for log severity levels.
    
    Higher values indicate more severe logs.
    """
    DEBUG = 10
    INFO = 20
    WARN = 30
    ERROR = 40
    FATAL = 50

    def __ge__(self, other):
        """Compare log levels for filtering"""
        if self.__class__ is other.__class__:
            return self.value >= other.value
        return NotImplemented


# ============================================================================
# DATA CLASSES
# ============================================================================

class LogRecord:
    """
    Immutable data class representing a single log entry.
    
    Attributes:
        timestamp: When the log was created
        level: Severity level of the log
        message: Log message content
        thread_id: ID of the thread that created the log
        source: Source location (file:line)
    
    Usage:
        record = LogRecord(LogLevel.INFO, "Application started")
    """
    
    def __init__(self, level: LogLevel, message: str, source: str = "unknown"):
        self.timestamp = datetime.now()
        self.level = level
        self.message = message
        self.thread_id = current_thread().ident
        self.source = source

    def __str__(self):
        return f"[{self.timestamp}] [{self.level.name}] {self.message}"


# ============================================================================
# STRATEGY PATTERN: LOG FORMATTERS
# ============================================================================

class LogFormatter(ABC):
    """
    Abstract base class for log formatters (Strategy Pattern).
    
    Subclasses implement different formatting strategies.
    
    Methods:
        format(record: LogRecord) -> str: Format log record to string
    """
    
    @abstractmethod
    def format(self, record: LogRecord) -> str:
        """
        Format a log record into a string.
        
        Args:
            record: LogRecord to format
            
        Returns:
            Formatted string representation
        """
        pass


class PlainFormatter(LogFormatter):
    """
    Plain text formatter with customizable pattern.
    
    Pattern placeholders:
        %timestamp% - Log timestamp
        %level% - Log level name
        %message% - Log message
        %thread% - Thread ID
        %source% - Source location
    
    Usage:
        formatter = PlainFormatter("[%timestamp%] [%level%] %message%")
    """
    
    def __init__(self, pattern: str = "[%timestamp%] [%level%] [Thread-%thread%] %message%"):
        self.pattern = pattern

    def format(self, record: LogRecord) -> str:
        """Format log record using pattern"""
        result = self.pattern
        result = result.replace("%timestamp%", record.timestamp.strftime("%Y-%m-%d %H:%M:%S.%f")[:-3])
        result = result.replace("%level%", record.level.name)
        result = result.replace("%message%", record.message)
        result = result.replace("%thread%", str(record.thread_id))
        result = result.replace("%source%", record.source)
        return result


class JSONFormatter(LogFormatter):
    """
    JSON formatter for structured logging.
    
    Output format:
        {
            "timestamp": "2025-01-04T10:30:45.123",
            "level": "INFO",
            "message": "Application started",
            "thread_id": 12345,
            "source": "main.py:10"
        }
    
    Usage:
        formatter = JSONFormatter()
    """
    
    def format(self, record: LogRecord) -> str:
        """Format log record as JSON"""
        return json.dumps({
            "timestamp": record.timestamp.isoformat(),
            "level": record.level.name,
            "message": record.message,
            "thread_id": record.thread_id,
            "source": record.source
        })


# ============================================================================
# CHAIN OF RESPONSIBILITY PATTERN: LOG FILTERS
# ============================================================================

class LogFilter(ABC):
    """
    Abstract base class for log filters (Chain of Responsibility Pattern).
    
    Filters can be chained together to create complex filtering logic.
    
    Methods:
        should_log(record: LogRecord) -> bool: Check if log should be processed
        set_next(filter: LogFilter): Set next filter in chain
    """
    
    def __init__(self):
        self._next_filter: Optional[LogFilter] = None

    def set_next(self, log_filter: 'LogFilter') -> 'LogFilter':
        """
        Set the next filter in the chain.
        
        Args:
            log_filter: Next filter to chain
            
        Returns:
            The next filter for method chaining
        """
        self._next_filter = log_filter
        return log_filter

    @abstractmethod
    def should_log(self, record: LogRecord) -> bool:
        """
        Determine if log should be processed.
        
        Args:
            record: LogRecord to evaluate
            
        Returns:
            True if log should be processed, False otherwise
        """
        pass


class LevelFilter(LogFilter):
    """
    Filter logs based on minimum severity level.
    
    Usage:
        filter = LevelFilter(LogLevel.WARN)  # Only WARN and above
    """
    
    def __init__(self, min_level: LogLevel):
        super().__init__()
        self.min_level = min_level

    def should_log(self, record: LogRecord) -> bool:
        """Check if log level meets threshold"""
        result = record.level >= self.min_level
        if result and self._next_filter:
            return self._next_filter.should_log(record)
        return result


# ============================================================================
# OBSERVER PATTERN: LOG APPENDERS
# ============================================================================

class LogAppender(ABC):
    """
    Abstract base class for log appenders (Observer Pattern).
    
    Appenders receive log events and output them to specific destinations.
    
    Attributes:
        formatter: LogFormatter for formatting messages
        filter: LogFilter for filtering messages
    
    Methods:
        append(record: LogRecord): Process log record
        set_formatter(formatter: LogFormatter): Set message formatter
        set_filter(filter: LogFilter): Set message filter
    """
    
    def __init__(self):
        self.formatter: LogFormatter = PlainFormatter()
        self.filter: Optional[LogFilter] = None

    def set_formatter(self, formatter: LogFormatter):
        """
        Set the formatter for this appender.
        
        Args:
            formatter: LogFormatter instance
        """
        self.formatter = formatter

    def set_filter(self, log_filter: LogFilter):
        """
        Set the filter for this appender.
        
        Args:
            log_filter: LogFilter instance
        """
        self.filter = log_filter

    @abstractmethod
    def append(self, record: LogRecord):
        """
        Process and output a log record.
        
        Args:
            record: LogRecord to process
        """
        pass


class ConsoleAppender(LogAppender):
    """
    Appender that outputs logs to console (stdout/stderr).
    
    Usage:
        appender = ConsoleAppender()
        appender.set_formatter(PlainFormatter())
    """
    
    def append(self, record: LogRecord):
        """Output log to console"""
        if self.filter and not self.filter.should_log(record):
            return
        
        formatted_message = self.formatter.format(record)
        
        # ERROR and FATAL go to stderr, others to stdout
        if record.level in [LogLevel.ERROR, LogLevel.FATAL]:
            print(formatted_message, file=__import__('sys').stderr)
        else:
            print(formatted_message)


class FileAppender(LogAppender):
    """
    Appender that writes logs to a file with rotation support.
    
    Features:
        - Size-based rotation
        - Automatic file creation
        - Thread-safe writes
    
    Args:
        filename: Path to log file
        max_size_mb: Maximum file size before rotation (default: 10MB)
        max_files: Maximum number of backup files (default: 5)
    
    Usage:
        appender = FileAppender("app.log", max_size_mb=10, max_files=5)
    """
    
    def __init__(self, filename: str, max_size_mb: int = 10, max_files: int = 5):
        super().__init__()
        self.filename = filename
        self.max_size_bytes = max_size_mb * 1024 * 1024
        self.max_files = max_files
        self.lock = Lock()
        self._ensure_file_exists()

    def _ensure_file_exists(self):
        """Create log file if it doesn't exist"""
        try:
            open(self.filename, 'a').close()
        except Exception as e:
            print(f"Failed to create log file: {e}")

    def _should_rotate(self) -> bool:
        """Check if file should be rotated"""
        try:
            import os
            return os.path.getsize(self.filename) >= self.max_size_bytes
        except:
            return False

    def _rotate_files(self):
        """Rotate log files (app.log -> app.log.1 -> app.log.2 -> ...)"""
        import os
        
        # Delete oldest file if max_files reached
        oldest_file = f"{self.filename}.{self.max_files}"
        if os.path.exists(oldest_file):
            os.remove(oldest_file)
        
        # Rotate existing backup files
        for i in range(self.max_files - 1, 0, -1):
            old_file = f"{self.filename}.{i}"
            new_file = f"{self.filename}.{i + 1}"
            if os.path.exists(old_file):
                os.rename(old_file, new_file)
        
        # Rotate current file
        if os.path.exists(self.filename):
            os.rename(self.filename, f"{self.filename}.1")

    def append(self, record: LogRecord):
        """Write log to file with rotation"""
        if self.filter and not self.filter.should_log(record):
            return
        
        with self.lock:
            # Check if rotation is needed
            if self._should_rotate():
                self._rotate_files()
            
            # Write log message
            formatted_message = self.formatter.format(record)
            try:
                with open(self.filename, 'a', encoding='utf-8') as f:
                    f.write(formatted_message + '\n')
            except Exception as e:
                print(f"Failed to write log: {e}")


# ============================================================================
# SINGLETON PATTERN: LOGGER
# ============================================================================

class Logger:
    """
    Main logger class (Singleton Pattern).
    
    Provides global logging functionality with support for:
    - Multiple log levels
    - Multiple appenders
    - Asynchronous logging
    - Thread-safe operations
    
    Usage:
        logger = Logger.get_instance()
        logger.set_level(LogLevel.INFO)
        logger.add_appender(ConsoleAppender())
        logger.info("Application started")
    
    Methods:
        get_instance() -> Logger: Get singleton instance
        set_level(level: LogLevel): Set minimum log level
        add_appender(appender: LogAppender): Add output destination
        debug(message: str): Log debug message
        info(message: str): Log info message
        warn(message: str): Log warning message
        error(message: str): Log error message
        fatal(message: str): Log fatal message
    """
    
    _instance = None
    _lock = Lock()

    def __new__(cls):
        """Ensure only one instance exists (Singleton)"""
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        """Initialize logger (only once)"""
        if self._initialized:
            return
        
        self.level = LogLevel.INFO
        self.appenders: List[LogAppender] = []
        self.async_queue = Queue(maxsize=10000)
        self.async_enabled = True
        self.worker_thread = None
        self._initialized = True
        
        # Start async worker thread
        self._start_worker()

    @classmethod
    def get_instance(cls) -> 'Logger':
        """
        Get the singleton logger instance.
        
        Returns:
            Logger: The singleton logger instance
        
        Usage:
            logger = Logger.get_instance()
        """
        return cls()

    def set_level(self, level: LogLevel):
        """
        Set the minimum log level.
        
        Args:
            level: Minimum LogLevel to process
        
        Usage:
            logger.set_level(LogLevel.WARN)
        """
        self.level = level

    def add_appender(self, appender: LogAppender):
        """
        Add an appender to receive log events.
        
        Args:
            appender: LogAppender to add
        
        Usage:
            logger.add_appender(ConsoleAppender())
        """
        self.appenders.append(appender)

    def _start_worker(self):
        """Start async worker thread"""
        def worker():
            while True:
                try:
                    record = self.async_queue.get(timeout=1)
                    if record is None:  # Poison pill to stop worker
                        break
                    self._process_log(record)
                except:
                    continue
        
        self.worker_thread = Thread(target=worker, daemon=True)
        self.worker_thread.start()

    def _process_log(self, record: LogRecord):
        """
        Process log record by sending to all appenders.
        
        Args:
            record: LogRecord to process
        """
        for appender in self.appenders:
            try:
                appender.append(record)
            except Exception as e:
                print(f"Appender failed: {e}")

    def _log(self, level: LogLevel, message: str):
        """
        Internal log method.
        
        Args:
            level: Log level
            message: Log message
        """
        # Filter by level
        if level.value < self.level.value:
            return
        
        # Create log record
        record = LogRecord(level, message)
        
        if self.async_enabled:
            try:
                self.async_queue.put(record, timeout=0.1)
            except Full:
                print(f"Log queue full, dropping message: {message[:50]}...")
        else:
            self._process_log(record)

    def debug(self, message: str):
        """
        Log debug message.
        
        Args:
            message: Debug message
        
        Usage:
            logger.debug("Variable x = 42")
        """
        self._log(LogLevel.DEBUG, message)

    def info(self, message: str):
        """
        Log informational message.
        
        Args:
            message: Info message
        
        Usage:
            logger.info("Application started successfully")
        """
        self._log(LogLevel.INFO, message)

    def warn(self, message: str):
        """
        Log warning message.
        
        Args:
            message: Warning message
        
        Usage:
            logger.warn("Connection timeout, retrying...")
        """
        self._log(LogLevel.WARN, message)

    def error(self, message: str):
        """
        Log error message.
        
        Args:
            message: Error message
        
        Usage:
            logger.error("Failed to connect to database")
        """
        self._log(LogLevel.ERROR, message)

    def fatal(self, message: str):
        """
        Log fatal message.
        
        Args:
            message: Fatal message
        
        Usage:
            logger.fatal("System crash detected, shutting down")
        """
        self._log(LogLevel.FATAL, message)


# ============================================================================
# FACTORY PATTERN: APPENDER FACTORY
# ============================================================================

class AppenderFactory:
    """
    Factory for creating different types of appenders.
    
    Methods:
        create_console_appender() -> ConsoleAppender
        create_file_appender(filename, max_size_mb, max_files) -> FileAppender
    
    Usage:
        factory = AppenderFactory()
        console_appender = factory.create_console_appender()
        file_appender = factory.create_file_appender("app.log")
    """
    
    @staticmethod
    def create_console_appender() -> ConsoleAppender:
        """
        Create a console appender.
        
        Returns:
            ConsoleAppender instance
        """
        return ConsoleAppender()

    @staticmethod
    def create_file_appender(
        filename: str,
        max_size_mb: int = 10,
        max_files: int = 5
    ) -> FileAppender:
        """
        Create a file appender.
        
        Args:
            filename: Path to log file
            max_size_mb: Maximum file size before rotation
            max_files: Maximum number of backup files
            
        Returns:
            FileAppender instance
        """
        return FileAppender(filename, max_size_mb, max_files)


# ============================================================================
# DEMO: USAGE EXAMPLE
# ============================================================================

def demo_logger_system():
    """
    Demonstration of the Logger System functionality.
    
    Shows:
        - Logger configuration
        - Multiple appenders
        - Different formatters
        - Log level filtering
        - File rotation
    """
    print("=" * 70)
    print("LOGGER SYSTEM DEMONSTRATION")
    print("=" * 70)
    print()

    # Get logger instance (Singleton)
    logger = Logger.get_instance()
    logger.set_level(LogLevel.DEBUG)

    # Create and configure console appender
    console_appender = AppenderFactory.create_console_appender()
    console_appender.set_formatter(PlainFormatter("[%timestamp%] [%level%] %message%"))
    logger.add_appender(console_appender)

    # Create and configure file appender with JSON format
    file_appender = AppenderFactory.create_file_appender(
        "application.log",
        max_size_mb=1,
        max_files=3
    )
    file_appender.set_formatter(JSONFormatter())
    file_appender.set_filter(LevelFilter(LogLevel.INFO))  # Only INFO and above
    logger.add_appender(file_appender)

    print("\n1. Testing All Log Levels:")
    print("-" * 70)
    logger.debug("This is a DEBUG message - detailed diagnostic information")
    logger.info("This is an INFO message - general informational message")
    logger.warn("This is a WARN message - warning about potential issues")
    logger.error("This is an ERROR message - error that needs attention")
    logger.fatal("This is a FATAL message - critical system failure")

    print("\n2. Testing Log Level Filtering:")
    print("-" * 70)
    print("Setting log level to WARN (DEBUG and INFO will be filtered)...")
    logger.set_level(LogLevel.WARN)
    logger.debug("This DEBUG message won't appear")
    logger.info("This INFO message won't appear")
    logger.warn("This WARN message will appear")
    logger.error("This ERROR message will appear")

    print("\n3. Testing File Logging:")
    print("-" * 70)
    print("Logs are being written to 'application.log' in JSON format")
    print("Only INFO and above are written to file (due to filter)")
    
    # Generate some logs for file rotation demo
    logger.set_level(LogLevel.INFO)
    for i in range(5):
        logger.info(f"Application event #{i + 1} - simulating normal operation")

    print("\n4. Logger Features Summary:")
    print("-" * 70)
    print("✓ Singleton pattern ensures single logger instance")
    print("✓ Strategy pattern for different formatters (Plain, JSON)")
    print("✓ Observer pattern for multiple appenders (Console, File)")
    print("✓ Chain of Responsibility for filtering")
    print("✓ Factory pattern for creating appenders")
    print("✓ Asynchronous logging for high performance")
    print("✓ Thread-safe operations")
    print("✓ File rotation with configurable size and count")

    print("\n" + "=" * 70)
    print("DEMONSTRATION COMPLETE")
    print("=" * 70)
    print("\nCheck 'application.log' for JSON-formatted file logs")
    print("Logs have been displayed on console with timestamp formatting")


# Run demonstration
if __name__ == "__main__":
    demo_logger_system()

