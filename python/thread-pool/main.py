"""
Thread Pool - Concurrent Task Execution System

This module implements a Thread Pool system that efficiently manages a pool of worker
threads to execute tasks concurrently, providing better performance than creating new
threads for each task.

Features:
- Fixed pool of reusable worker threads
- Thread-safe task queue with blocking operations
- Multiple rejection policies (Abort, Discard, CallerRuns, DiscardOldest)
- Graceful and immediate shutdown modes
- Comprehensive metrics and monitoring
- Exception handling and error recovery
- 6 Design Patterns: Object Pool, Command, Strategy, Observer, Factory, Singleton

Usage:
    pool = ThreadPool(pool_size=5)
    task = RunnableTask(lambda x: x * 2, 5)
    pool.submit(task)
    pool.shutdown()
    pool.await_termination(timeout=30)

Design Patterns Used:
1. Object Pool - Worker thread reuse
2. Command - Task encapsulation
3. Strategy - Rejection policies
4. Observer - Pool monitoring
5. Factory - Pool creation
6. Singleton - Global pool instance

Author: LLD Solutions
Date: 2025
"""

from __future__ import annotations
from typing import Any, Callable, List, Optional
from abc import ABC, abstractmethod
from enum import Enum
from dataclasses import dataclass
import threading
import queue
import time
import uuid


# ============================================================================
# 1. COMMAND PATTERN - Task Encapsulation
# ============================================================================

class Task(ABC):
    """
    Abstract base class for tasks that can be executed by the thread pool.
    
    This implements the Command Pattern to encapsulate work as objects.
    
    Usage:
        class MyTask(Task):
            def execute(self):
                return "result"
        
        pool.submit(MyTask())
    """
    
    @abstractmethod
    def execute(self) -> Any:
        """
        Execute the task.
        
        Returns:
            Any: Task result
            
        Raises:
            Any exception during execution
        """
        pass
    
    @abstractmethod
    def get_name(self) -> str:
        """Get task name for logging/monitoring."""
        pass


@dataclass
class RunnableTask(Task):
    """
    Concrete task that wraps a callable function.
    
    This is the most common task type, allowing any function to be executed
    in the thread pool.
    
    Attributes:
        func: Function to execute
        args: Positional arguments
        kwargs: Keyword arguments
        task_id: Unique task identifier
        callback: Optional callback on completion
    """
    
    func: Callable
    args: tuple = ()
    kwargs: dict = None
    task_id: str = None
    callback: Optional[Callable] = None
    
    def __post_init__(self):
        """Initialize task with unique ID."""
        if self.task_id is None:
            self.task_id = str(uuid.uuid4())[:8]
        if self.kwargs is None:
            self.kwargs = {}
    
    def execute(self) -> Any:
        """
        Execute the wrapped function.
        
        Returns:
            Function result
        """
        result = self.func(*self.args, **self.kwargs)
        if self.callback:
            self.callback(result)
        return result
    
    def get_name(self) -> str:
        """Get task name."""
        return f"{self.func.__name__}_{self.task_id}"
    
    def __str__(self) -> str:
        """String representation."""
        return f"RunnableTask({self.get_name()})"


# ============================================================================
# 2. EXCEPTION HANDLING
# ============================================================================

class RejectedExecutionError(Exception):
    """Exception raised when a task is rejected by the thread pool."""
    pass


# ============================================================================
# 3. STRATEGY PATTERN - Rejection Policies
# ============================================================================

class RejectionPolicy(ABC):
    """
    Abstract strategy for handling task rejection when queue is full.
    
    This implements the Strategy Pattern to allow different rejection
    handling behaviors.
    """
    
    @abstractmethod
    def handle_rejection(self, task: Task, pool: 'ThreadPool') -> None:
        """
        Handle rejected task.
        
        Args:
            task: Task that was rejected
            pool: Thread pool that rejected the task
            
        Raises:
            RejectedExecutionError: Depending on policy
        """
        pass
    
    @abstractmethod
    def get_name(self) -> str:
        """Get policy name."""
        pass


class AbortPolicy(RejectionPolicy):
    """
    Rejection policy that throws exception on rejection.
    
    This is the default policy - ensures tasks are never silently dropped.
    
    Use Case: Critical tasks that must not be lost
    """
    
    def handle_rejection(self, task: Task, pool: 'ThreadPool') -> None:
        """Throw exception when task is rejected."""
        raise RejectedExecutionError(
            f"Task {task.get_name()} rejected from {pool}. "
            f"Queue size: {pool.get_queue_size()}, Active: {pool.get_active_count()}"
        )
    
    def get_name(self) -> str:
        return "AbortPolicy"


class DiscardPolicy(RejectionPolicy):
    """
    Rejection policy that silently discards rejected tasks.
    
    Use Case: Non-critical tasks, best-effort execution
    """
    
    def handle_rejection(self, task: Task, pool: 'ThreadPool') -> None:
        """Silently discard the task."""
        pool.rejected_tasks += 1
    
    def get_name(self) -> str:
        return "DiscardPolicy"


class DiscardOldestPolicy(RejectionPolicy):
    """
    Rejection policy that discards oldest task and retries.
    
    Use Case: Prioritize recent tasks over old ones
    """
    
    def handle_rejection(self, task: Task, pool: 'ThreadPool') -> None:
        """Remove oldest task and submit new one."""
        try:
            # Remove oldest task
            old_task = pool.task_queue.get_nowait()
            pool.rejected_tasks += 1
            
            # Try to submit new task
            pool.task_queue.put_nowait(task)
        except (queue.Empty, queue.Full):
            # If failed, just discard
            pool.rejected_tasks += 1
    
    def get_name(self) -> str:
        return "DiscardOldestPolicy"


class CallerRunsPolicy(RejectionPolicy):
    """
    Rejection policy that runs task in caller's thread.
    
    This provides graceful degradation and throttles submission rate.
    
    Use Case: Provide backpressure while ensuring all tasks execute
    """
    
    def handle_rejection(self, task: Task, pool: 'ThreadPool') -> None:
        """Execute task in caller's thread if pool is running."""
        if pool.state == PoolState.RUNNING:
            try:
                result = task.execute()
                pool.notify_observers('task_completed', task, result)
            except Exception as e:
                pool.notify_observers('task_failed', task, e)
    
    def get_name(self) -> str:
        return "CallerRunsPolicy"


# ============================================================================
# 4. POOL STATE
# ============================================================================

class PoolState(Enum):
    """Thread pool lifecycle states."""
    RUNNING = "RUNNING"
    SHUTDOWN = "SHUTDOWN"  # No new tasks, complete existing
    TERMINATED = "TERMINATED"  # Stop immediately


# ============================================================================
# 5. OBSERVER PATTERN - Pool Monitoring
# ============================================================================

class ThreadPoolObserver(ABC):
    """
    Abstract observer for monitoring thread pool events.
    
    This implements the Observer Pattern to allow monitoring of pool
    activities without tight coupling.
    """
    
    @abstractmethod
    def on_task_submitted(self, task: Task) -> None:
        """Called when task is submitted."""
        pass
    
    @abstractmethod
    def on_task_started(self, task: Task, worker_id: int) -> None:
        """Called when task starts execution."""
        pass
    
    @abstractmethod
    def on_task_completed(self, task: Task, result: Any) -> None:
        """Called when task completes successfully."""
        pass
    
    @abstractmethod
    def on_task_failed(self, task: Task, error: Exception) -> None:
        """Called when task fails with exception."""
        pass


class LoggingObserver(ThreadPoolObserver):
    """
    Observer that logs pool events.
    
    Useful for debugging and monitoring in production.
    """
    
    def __init__(self, verbose: bool = False):
        """
        Initialize logging observer.
        
        Args:
            verbose: If True, log all events including start
        """
        self.verbose = verbose
    
    def on_task_submitted(self, task: Task) -> None:
        """Log task submission."""
        if self.verbose:
            print(f"📝 Task submitted: {task.get_name()}")
    
    def on_task_started(self, task: Task, worker_id: int) -> None:
        """Log task start."""
        if self.verbose:
            print(f"▶️  Task started: {task.get_name()} on worker {worker_id}")
    
    def on_task_completed(self, task: Task, result: Any) -> None:
        """Log task completion."""
        print(f"✅ Task completed: {task.get_name()}")
    
    def on_task_failed(self, task: Task, error: Exception) -> None:
        """Log task failure."""
        print(f"❌ Task failed: {task.get_name()} - {type(error).__name__}: {error}")


class MetricsObserver(ThreadPoolObserver):
    """
    Observer that collects metrics.
    
    Tracks task timing and success/failure rates.
    """
    
    def __init__(self):
        """Initialize metrics collector."""
        self.task_times = {}
        self.successful_tasks = 0
        self.failed_tasks = 0
    
    def on_task_submitted(self, task: Task) -> None:
        """Record submission time."""
        self.task_times[task.get_name()] = time.time()
    
    def on_task_started(self, task: Task, worker_id: int) -> None:
        """Record start time."""
        pass
    
    def on_task_completed(self, task: Task, result: Any) -> None:
        """Record completion."""
        self.successful_tasks += 1
    
    def on_task_failed(self, task: Task, error: Exception) -> None:
        """Record failure."""
        self.failed_tasks += 1
    
    def get_stats(self) -> dict:
        """Get collected statistics."""
        return {
            'successful': self.successful_tasks,
            'failed': self.failed_tasks,
            'total': self.successful_tasks + self.failed_tasks
        }


# ============================================================================
# 6. WORKER THREAD
# ============================================================================

class WorkerThread(threading.Thread):
    """
    Worker thread that continuously processes tasks from the queue.
    
    This is the core execution unit in the thread pool, implementing
    the worker lifecycle:
    1. Wait for task from queue
    2. Execute task
    3. Handle exceptions
    4. Repeat until shutdown
    
    Attributes:
        thread_id: Unique worker identifier
        pool: Parent thread pool
        running: Flag to control worker lifecycle
    """
    
    def __init__(self, thread_id: int, pool: 'ThreadPool'):
        """
        Initialize worker thread.
        
        Args:
            thread_id: Unique identifier for this worker
            pool: Parent thread pool
        """
        super().__init__(daemon=True, name=f"Worker-{thread_id}")
        self.thread_id = thread_id
        self.pool = pool
        self.running = True
    
    def run(self) -> None:
        """
        Main worker loop - continuously process tasks.
        
        This method runs in a separate thread and processes tasks until:
        1. Poison pill (None) is received
        2. Pool is terminated
        3. Worker is stopped
        
        Time Complexity: O(1) per task
        Space Complexity: O(1)
        """
        while self.running:
            try:
                # Wait for task with timeout
                task = self.pool.task_queue.get(timeout=1.0)
                
                # Poison pill check
                if task is None:
                    break
                
                # Execute task
                self._execute_task(task)
                
            except queue.Empty:
                # Timeout - check if should continue
                if not self.running or self.pool.state == PoolState.TERMINATED:
                    break
                continue
            except Exception as e:
                print(f"Worker {self.thread_id} error: {e}")
    
    def _execute_task(self, task: Task) -> None:
        """
        Execute a single task with exception handling.
        
        Args:
            task: Task to execute
        """
        try:
            # Notify start
            self.pool.notify_observers('task_started', task, self.thread_id)
            
            # Execute
            result = task.execute()
            
            # Notify success
            self.pool.notify_observers('task_completed', task, result)
            
        except Exception as e:
            # Notify failure
            self.pool.notify_observers('task_failed', task, e)
        
        finally:
            # Mark task as done
            self.pool.task_queue.task_done()
            
            # Update counter
            with self.pool.lock:
                self.pool.completed_tasks += 1
    
    def stop(self) -> None:
        """Signal worker to stop processing tasks."""
        self.running = False


# ============================================================================
# 7. OBJECT POOL PATTERN - Thread Pool Implementation
# ============================================================================

class ThreadPool:
    """
    Thread pool that manages a fixed pool of worker threads.
    
    This implements the Object Pool Pattern to reuse threads instead of
    creating new ones for each task. Provides:
    - Thread-safe task submission
    - Multiple rejection policies
    - Graceful/immediate shutdown
    - Comprehensive monitoring
    
    Attributes:
        pool_size: Number of worker threads
        max_queue_size: Maximum task queue size (0 = unlimited)
        workers: List of worker threads
        task_queue: Thread-safe task queue
        rejection_policy: Strategy for handling rejected tasks
        state: Current pool state
        observers: List of registered observers
    
    Usage:
        pool = ThreadPool(pool_size=5, max_queue_size=10)
        task = RunnableTask(lambda x: x * 2, 5)
        pool.submit(task)
        pool.shutdown()
    
    Time Complexity:
        - Submit: O(1)
        - Shutdown: O(n) where n = number of workers
    
    Space Complexity: O(n + m) where n = workers, m = queue size
    """
    
    def __init__(
        self,
        pool_size: int = 5,
        max_queue_size: int = 0,
        rejection_policy: Optional[RejectionPolicy] = None
    ):
        """
        Initialize thread pool.
        
        Args:
            pool_size: Number of worker threads
            max_queue_size: Maximum queue size (0 = unlimited)
            rejection_policy: Policy for rejected tasks (default: AbortPolicy)
        """
        if pool_size <= 0:
            raise ValueError("Pool size must be positive")
        
        self.pool_size = pool_size
        self.max_queue_size = max_queue_size
        self.workers: List[WorkerThread] = []
        self.task_queue = queue.Queue(maxsize=max_queue_size)
        self.rejection_policy = rejection_policy or AbortPolicy()
        self.state = PoolState.RUNNING
        self.lock = threading.Lock()
        
        # Metrics
        self.submitted_tasks = 0
        self.completed_tasks = 0
        self.rejected_tasks = 0
        
        # Observers
        self.observers: List[ThreadPoolObserver] = []
        
        # Start workers
        self._start_workers()
    
    def _start_workers(self) -> None:
        """Start all worker threads."""
        for i in range(self.pool_size):
            worker = WorkerThread(i, self)
            self.workers.append(worker)
            worker.start()
    
    def submit(self, task: Task) -> None:
        """
        Submit task for execution.
        
        Args:
            task: Task to execute
            
        Raises:
            RejectedExecutionError: If pool is shutdown or queue full (depending on policy)
        
        Time Complexity: O(1)
        Space Complexity: O(1)
        """
        with self.lock:
            # Check if pool is shutdown
            if self.state != PoolState.RUNNING:
                raise RejectedExecutionError(
                    f"Pool is {self.state.value}, cannot accept new tasks"
                )
            
            # Try to enqueue task
            try:
                self.task_queue.put(task, block=False)
                self.submitted_tasks += 1
                self.notify_observers('task_submitted', task)
                
            except queue.Full:
                # Queue is full - apply rejection policy
                self.rejection_policy.handle_rejection(task, self)
    
    def shutdown(self) -> None:
        """
        Graceful shutdown - complete pending tasks.
        
        Steps:
        1. Change state to SHUTDOWN (no new tasks)
        2. Wait for all queued tasks to complete
        3. Send poison pills to workers
        4. Wait for workers to terminate
        
        Time Complexity: O(n + m) where n = workers, m = pending tasks
        Space Complexity: O(1)
        """
        with self.lock:
            if self.state != PoolState.RUNNING:
                return
            self.state = PoolState.SHUTDOWN
        
        # Wait for all tasks to complete
        self.task_queue.join()
        
        # Send poison pills
        for _ in self.workers:
            self.task_queue.put(None)
        
        # Wait for workers
        for worker in self.workers:
            worker.join()
    
    def shutdown_now(self) -> List[Task]:
        """
        Immediate shutdown - stop workers and return pending tasks.
        
        Steps:
        1. Change state to TERMINATED
        2. Stop all workers immediately
        3. Drain queue and return pending tasks
        
        Returns:
            List of tasks that were not executed
        
        Time Complexity: O(n + m)
        Space Complexity: O(m)
        """
        with self.lock:
            self.state = PoolState.TERMINATED
            
            # Stop all workers
            for worker in self.workers:
                worker.stop()
            
            # Drain queue
            pending_tasks = []
            while not self.task_queue.empty():
                try:
                    task = self.task_queue.get_nowait()
                    if task is not None:
                        pending_tasks.append(task)
                except queue.Empty:
                    break
            
            return pending_tasks
    
    def await_termination(self, timeout: float) -> bool:
        """
        Wait for pool to terminate.
        
        Args:
            timeout: Maximum wait time in seconds
            
        Returns:
            True if pool terminated within timeout
        
        Time Complexity: O(n)
        """
        deadline = time.time() + timeout
        
        for worker in self.workers:
            remaining = deadline - time.time()
            if remaining <= 0:
                return False
            worker.join(timeout=remaining)
            if worker.is_alive():
                return False
        
        return True
    
    # ========================================================================
    # Monitoring & Metrics
    # ========================================================================
    
    def get_active_count(self) -> int:
        """Get number of active (alive) worker threads."""
        return sum(1 for w in self.workers if w.is_alive())
    
    def get_queue_size(self) -> int:
        """Get current queue size."""
        return self.task_queue.qsize()
    
    def get_completed_count(self) -> int:
        """Get number of completed tasks."""
        with self.lock:
            return self.completed_tasks
    
    def get_stats(self) -> dict:
        """Get comprehensive pool statistics."""
        return {
            'pool_size': self.pool_size,
            'active_threads': self.get_active_count(),
            'queue_size': self.get_queue_size(),
            'submitted_tasks': self.submitted_tasks,
            'completed_tasks': self.completed_tasks,
            'rejected_tasks': self.rejected_tasks,
            'state': self.state.value,
            'rejection_policy': self.rejection_policy.get_name()
        }
    
    # ========================================================================
    # Observer Pattern Implementation
    # ========================================================================
    
    def register_observer(self, observer: ThreadPoolObserver) -> None:
        """Register observer for pool events."""
        self.observers.append(observer)
    
    def remove_observer(self, observer: ThreadPoolObserver) -> None:
        """Remove observer."""
        self.observers.remove(observer)
    
    def notify_observers(self, event: str, *args) -> None:
        """Notify all observers of event."""
        for observer in self.observers:
            try:
                if event == 'task_submitted':
                    observer.on_task_submitted(*args)
                elif event == 'task_started':
                    observer.on_task_started(*args)
                elif event == 'task_completed':
                    observer.on_task_completed(*args)
                elif event == 'task_failed':
                    observer.on_task_failed(*args)
            except Exception as e:
                print(f"Observer error: {e}")
    
    def __str__(self) -> str:
        """String representation."""
        return f"ThreadPool(size={self.pool_size}, state={self.state.value})"


# ============================================================================
# 8. FACTORY PATTERN - Thread Pool Creation
# ============================================================================

class ThreadPoolFactory:
    """
    Factory for creating different types of thread pools.
    
    This implements the Factory Pattern to provide convenient ways to
    create thread pools optimized for different use cases.
    """
    
    @staticmethod
    def create_fixed_pool(pool_size: int, max_queue_size: int = 0) -> ThreadPool:
        """
        Create fixed-size thread pool.
        
        Args:
            pool_size: Number of worker threads
            max_queue_size: Maximum queue size (0 = unlimited)
        
        Returns:
            Thread pool with fixed number of workers
        
        Use Case: General purpose, bounded resource usage
        """
        return ThreadPool(pool_size=pool_size, max_queue_size=max_queue_size)
    
    @staticmethod
    def create_single_thread_executor() -> ThreadPool:
        """
        Create single-threaded executor.
        
        Returns:
            Thread pool with single worker
        
        Use Case: Sequential task execution, ordered processing
        """
        return ThreadPool(pool_size=1, max_queue_size=0)
    
    @staticmethod
    def create_bounded_pool(pool_size: int) -> ThreadPool:
        """
        Create pool with bounded queue (2x pool size).
        
        Args:
            pool_size: Number of workers
        
        Returns:
            Thread pool with bounded queue
        
        Use Case: Prevent memory issues from unbounded queue growth
        """
        return ThreadPool(
            pool_size=pool_size,
            max_queue_size=pool_size * 2,
            rejection_policy=AbortPolicy()
        )
    
    @staticmethod
    def create_best_effort_pool(pool_size: int) -> ThreadPool:
        """
        Create pool that discards tasks when full.
        
        Args:
            pool_size: Number of workers
        
        Returns:
            Thread pool with discard policy
        
        Use Case: Non-critical tasks, best-effort execution
        """
        return ThreadPool(
            pool_size=pool_size,
            max_queue_size=pool_size * 5,
            rejection_policy=DiscardPolicy()
        )


# ============================================================================
# 9. SINGLETON PATTERN - Global Thread Pool
# ============================================================================

class ThreadPoolSingleton:
    """
    Singleton thread pool for application-wide use.
    
    This implements the Singleton Pattern to provide a single global
    thread pool instance that can be accessed from anywhere in the application.
    
    Usage:
        pool = ThreadPoolSingleton()
        pool.submit(task)  # All code shares same pool
    """
    
    _instance: Optional[ThreadPool] = None
    _lock = threading.Lock()
    
    def __new__(cls):
        """Create or return existing singleton instance."""
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    import os
                    cpu_count = os.cpu_count() or 4
                    cls._instance = ThreadPool(pool_size=cpu_count * 2)
        return cls._instance
    
    @classmethod
    def get_instance(cls) -> ThreadPool:
        """Get singleton instance."""
        return cls()
    
    @classmethod
    def reset(cls) -> None:
        """Reset singleton (for testing)."""
        if cls._instance:
            cls._instance.shutdown()
        cls._instance = None


# ============================================================================
# DEMONSTRATION
# ============================================================================

def demo_basic_operations():
    """Demonstrate basic thread pool operations."""
    print("=" * 70)
    print("DEMO 1: Basic Operations")
    print("=" * 70)
    
    # Create pool
    pool = ThreadPool(pool_size=3, max_queue_size=20)
    pool.register_observer(LoggingObserver(verbose=False))
    
    # Submit tasks
    print("\n📝 Submitting tasks...")
    def compute(x):
        time.sleep(0.1)
        return x * x
    
    for i in range(10):
        task = RunnableTask(compute, args=(i,))
        pool.submit(task)
    
    print(f"\n📊 Stats: {pool.get_stats()}")
    
    # Shutdown
    print("\n🛑 Shutting down...")
    pool.shutdown()
    print("✅ Pool shutdown complete")


def demo_rejection_policies():
    """Demonstrate different rejection policies."""
    print("\n" + "=" * 70)
    print("DEMO 2: Rejection Policies")
    print("=" * 70)
    
    def slow_task(x):
        time.sleep(0.5)
        return x
    
    # Abort Policy (default)
    print("\n1️⃣  Abort Policy:")
    pool = ThreadPool(pool_size=1, max_queue_size=2, rejection_policy=AbortPolicy())
    
    try:
        for i in range(5):
            pool.submit(RunnableTask(slow_task, args=(i,)))
    except RejectedExecutionError as e:
        print(f"   ❌ Task rejected (expected): {e}")
    
    pool.shutdown_now()
    
    # Discard Policy
    print("\n2️⃣  Discard Policy:")
    pool = ThreadPool(pool_size=1, max_queue_size=2, rejection_policy=DiscardPolicy())
    
    for i in range(5):
        pool.submit(RunnableTask(slow_task, args=(i,)))
        print(f"   Submitted task {i}")
    
    print(f"   Rejected: {pool.rejected_tasks}")
    pool.shutdown_now()
    
    # Caller Runs Policy
    print("\n3️⃣  Caller Runs Policy:")
    pool = ThreadPool(pool_size=1, max_queue_size=1, rejection_policy=CallerRunsPolicy())
    pool.register_observer(LoggingObserver(verbose=False))
    
    for i in range(3):
        pool.submit(RunnableTask(lambda x: x * 2, args=(i,)))
    
    pool.shutdown_now()


def demo_observer_pattern():
    """Demonstrate observer pattern for monitoring."""
    print("\n" + "=" * 70)
    print("DEMO 3: Observer Pattern")
    print("=" * 70)
    
    pool = ThreadPool(pool_size=2)
    
    # Register observers
    logging_observer = LoggingObserver(verbose=True)
    metrics_observer = MetricsObserver()
    
    pool.register_observer(logging_observer)
    pool.register_observer(metrics_observer)
    
    print("\n📝 Submitting tasks with observers...")
    
    def task_success(x):
        time.sleep(0.05)
        return x * 2
    
    def task_failure(x):
        time.sleep(0.05)
        raise ValueError(f"Intentional error for {x}")
    
    # Mix of success and failure
    for i in range(3):
        pool.submit(RunnableTask(task_success, args=(i,)))
    
    for i in range(2):
        pool.submit(RunnableTask(task_failure, args=(i,)))
    
    pool.shutdown()
    
    print(f"\n📊 Metrics: {metrics_observer.get_stats()}")


def demo_factory_pattern():
    """Demonstrate factory pattern for pool creation."""
    print("\n" + "=" * 70)
    print("DEMO 4: Factory Pattern")
    print("=" * 70)
    
    # Fixed pool
    print("\n🏭 Fixed Pool:")
    fixed_pool = ThreadPoolFactory.create_fixed_pool(pool_size=5)
    print(f"   {fixed_pool}")
    print(f"   Active threads: {fixed_pool.get_active_count()}")
    fixed_pool.shutdown_now()
    
    # Single thread executor
    print("\n🏭 Single Thread Executor:")
    single = ThreadPoolFactory.create_single_thread_executor()
    print(f"   {single}")
    print(f"   Active threads: {single.get_active_count()}")
    single.shutdown_now()
    
    # Bounded pool
    print("\n🏭 Bounded Pool:")
    bounded = ThreadPoolFactory.create_bounded_pool(pool_size=3)
    print(f"   {bounded}")
    print(f"   Max queue size: {bounded.max_queue_size}")
    bounded.shutdown_now()
    
    # Best effort pool
    print("\n🏭 Best Effort Pool:")
    best_effort = ThreadPoolFactory.create_best_effort_pool(pool_size=2)
    print(f"   {best_effort}")
    print(f"   Rejection policy: {best_effort.rejection_policy.get_name()}")
    best_effort.shutdown_now()


def demo_singleton_pattern():
    """Demonstrate singleton pattern."""
    print("\n" + "=" * 70)
    print("DEMO 5: Singleton Pattern")
    print("=" * 70)
    
    # Get singleton instances
    pool1 = ThreadPoolSingleton.get_instance()
    pool2 = ThreadPoolSingleton.get_instance()
    
    print(f"\n🔒 Singleton instances:")
    print(f"   pool1 id: {id(pool1)}")
    print(f"   pool2 id: {id(pool2)}")
    print(f"   Same instance: {pool1 is pool2}")
    
    # Use singleton
    print("\n📝 Using singleton pool:")
    task = RunnableTask(lambda x: x * 2, 42)
    pool1.submit(task)
    print(f"   Submitted via pool1")
    print(f"   pool2 queue size: {pool2.get_queue_size()} (shares same queue)")
    
    # Cleanup
    ThreadPoolSingleton.reset()


def demo_graceful_shutdown():
    """Demonstrate graceful vs immediate shutdown."""
    print("\n" + "=" * 70)
    print("DEMO 6: Graceful vs Immediate Shutdown")
    print("=" * 70)
    
    # Graceful shutdown
    print("\n1️⃣  Graceful Shutdown (completes pending tasks):")
    pool = ThreadPool(pool_size=2)
    pool.register_observer(LoggingObserver(verbose=False))
    
    for i in range(5):
        pool.submit(RunnableTask(lambda x: time.sleep(0.1) or x, args=(i,)))
    
    print(f"   Submitted: 5 tasks")
    print(f"   Queue size: {pool.get_queue_size()}")
    pool.shutdown()
    print(f"   Completed: {pool.get_completed_count()}")
    
    # Immediate shutdown
    print("\n2️⃣  Immediate Shutdown (stops and returns pending):")
    pool = ThreadPool(pool_size=1)
    
    for i in range(10):
        pool.submit(RunnableTask(lambda x: time.sleep(0.5) or x, args=(i,)))
    
    time.sleep(0.1)  # Let one task start
    print(f"   Submitted: 10 tasks")
    print(f"   Queue size before: {pool.get_queue_size()}")
    
    pending = pool.shutdown_now()
    print(f"   Pending tasks returned: {len(pending)}")


def demo_performance():
    """Demonstrate performance with metrics."""
    print("\n" + "=" * 70)
    print("DEMO 7: Performance & Metrics")
    print("=" * 70)
    
    pool = ThreadPool(pool_size=10)
    metrics = MetricsObserver()
    pool.register_observer(metrics)
    
    print("\n⏱️  Submitting 100 tasks...")
    
    def cpu_task(x):
        # Simulate CPU work
        result = 0
        for i in range(10000):
            result += i * x
        return result
    
    start = time.time()
    
    for i in range(100):
        pool.submit(RunnableTask(cpu_task, args=(i,)))
    
    pool.shutdown()
    elapsed = time.time() - start
    
    print(f"\n📊 Results:")
    print(f"   Total time: {elapsed:.2f}s")
    print(f"   Tasks completed: {pool.get_completed_count()}")
    print(f"   Throughput: {pool.get_completed_count() / elapsed:.2f} tasks/sec")
    print(f"   Metrics: {metrics.get_stats()}")


def main():
    """Run all demonstrations."""
    print("\n" + "🎯" * 35)
    print("THREAD POOL - COMPREHENSIVE DEMONSTRATION")
    print("🎯" * 35)
    print("\nDesign Patterns Demonstrated:")
    print("1. Object Pool Pattern - Worker thread reuse")
    print("2. Command Pattern - Task encapsulation")
    print("3. Strategy Pattern - Rejection policies")
    print("4. Observer Pattern - Pool monitoring")
    print("5. Factory Pattern - Pool creation")
    print("6. Singleton Pattern - Global pool instance")
    print("\nKey Features:")
    print("✅ Fixed pool of reusable worker threads")
    print("✅ Thread-safe task queue with blocking operations")
    print("✅ Multiple rejection policies (Abort, Discard, CallerRuns)")
    print("✅ Graceful and immediate shutdown modes")
    print("✅ Comprehensive metrics and monitoring")
    
    demo_basic_operations()
    demo_rejection_policies()
    demo_observer_pattern()
    demo_factory_pattern()
    demo_singleton_pattern()
    demo_graceful_shutdown()
    demo_performance()
    
    print("\n" + "=" * 70)
    print("✅ ALL DEMONSTRATIONS COMPLETED SUCCESSFULLY!")
    print("=" * 70)
    print("\n📊 Summary:")
    print("   - 6 Design Patterns implemented")
    print("   - 4 Rejection policies (Abort, Discard, DiscardOldest, CallerRuns)")
    print("   - Thread-safe operations with locks and queues")
    print("   - Production-ready implementation")
    print("=" * 70 + "\n")


if __name__ == "__main__":
    main()
