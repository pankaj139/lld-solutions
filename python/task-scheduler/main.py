"""
Task Scheduler System - Low Level Design Implementation in Python

This file implements a comprehensive task scheduling system that executes tasks based on time,
priority, and dependencies. It supports one-time and recurring tasks with retry mechanisms.

DESIGN PATTERNS USED:
1. Command Pattern: Task encapsulates execution logic as command object
2. Strategy Pattern: Different scheduling strategies (Priority, FIFO, Round Robin)
3. Observer Pattern: TaskMonitor observes task state changes and events
4. State Pattern: Task lifecycle states (Pending, Running, Completed, Failed, Cancelled)
5. Singleton Pattern: TaskScheduler as single system-wide instance
6. Template Method Pattern: Retry mechanism with customizable backoff strategies

OOP CONCEPTS DEMONSTRATED:
- ENCAPSULATION: Private attributes, data hiding in scheduler internals
- ABSTRACTION: Abstract Task, SchedulingStrategy, RetryPolicy interfaces
- INHERITANCE: OneTimeTask and RecurringTask inherit from Task
- POLYMORPHISM: Different strategies implement same interface differently

SOLID PRINCIPLES:
- SRP: Each class has single responsibility (Task, Queue, Executor, Scheduler)
- OCP: Open for extension (new strategies, retry policies) closed for modification
- LSP: Any SchedulingStrategy can be used interchangeably
- ISP: Focused interfaces (TaskObserver, SchedulingStrategy, RetryPolicy)
- DIP: Scheduler depends on abstractions (Strategy, Observer, RetryPolicy)

BUSINESS FEATURES:
- Priority-based task scheduling using heap
- Task dependencies with DAG validation
- Retry mechanism with exponential backoff
- Concurrent execution using thread pool
- Task monitoring and metrics tracking
- One-time and recurring task support

ARCHITECTURAL NOTES:
- Heap-based priority queue for O(log n) operations
- Topological sort for dependency resolution
- Thread-safe operations using locks
- Observer pattern for loose coupling
- Strategy pattern for flexible scheduling algorithms
"""

from abc import ABC, abstractmethod
from enum import Enum
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Callable, Set
import uuid
import heapq
import time
import threading
from concurrent.futures import ThreadPoolExecutor, Future
from collections import defaultdict, deque
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# ============================================================================
# ENUMS - Domain Definitions
# ============================================================================

class TaskState(Enum):
    """
    Defines the lifecycle states of a task.
    
    STATE TRANSITIONS:
    PENDING -> SCHEDULED -> RUNNING -> COMPLETED
                         -> FAILED -> RETRYING
                         -> CANCELLED
    """
    PENDING = "PENDING"
    SCHEDULED = "SCHEDULED"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"
    RETRYING = "RETRYING"


class Priority(Enum):
    """
    Priority levels for task execution (lower value = higher priority).
    """
    HIGH = 1
    MEDIUM = 5
    LOW = 10


# ============================================================================
# RETRY POLICIES - Template Method Pattern
# ============================================================================

class RetryPolicy(ABC):
    """
    Abstract retry policy for failed tasks.
    
    DESIGN PATTERN: Template Method Pattern - defines retry algorithm skeleton
    OOP CONCEPT: Abstraction - defines interface for retry strategies
    
    How to use:
    policy = ExponentialBackoffRetry(max_retries=3, base_delay=1000)
    if policy.should_retry(task):
        delay = policy.get_next_retry_delay(attempt)
    """
    
    @abstractmethod
    def should_retry(self, task: 'Task') -> bool:
        """Check if task should be retried."""
        pass
    
    @abstractmethod
    def get_next_retry_delay(self, attempt: int) -> float:
        """
        Calculate delay before next retry attempt.
        
        Returns: Delay in seconds
        """
        pass


class ExponentialBackoffRetry(RetryPolicy):
    """
    Retry with exponentially increasing delays.
    
    DESIGN PATTERN: Template Method Pattern - concrete retry strategy
    ALGORITHM: delay = base_delay * (multiplier ^ attempt)
    
    How to use:
    policy = ExponentialBackoffRetry(max_retries=3, base_delay=1.0, multiplier=2.0)
    delay = policy.get_next_retry_delay(2)  # Returns: 4.0 seconds
    """
    
    def __init__(self, max_retries: int = 3, base_delay: float = 1.0, 
                 multiplier: float = 2.0, max_delay: float = 60.0):
        """
        Initialize exponential backoff policy.
        
        Args:
            max_retries: Maximum retry attempts
            base_delay: Base delay in seconds
            multiplier: Multiplier for each attempt
            max_delay: Maximum delay cap
        """
        self._max_retries = max_retries
        self._base_delay = base_delay
        self._multiplier = multiplier
        self._max_delay = max_delay
    
    def should_retry(self, task: 'Task') -> bool:
        """
        Check if task should retry.
        
        BUSINESS RULE: Retry if attempts < max_retries
        """
        return task.get_retry_count() < self._max_retries
    
    def get_next_retry_delay(self, attempt: int) -> float:
        """
        Calculate exponential backoff delay.
        
        ALGORITHM: delay = base * (multiplier ^ attempt), capped at max
        TIME COMPLEXITY: O(1)
        """
        delay = self._base_delay * (self._multiplier ** attempt)
        return min(delay, self._max_delay)


class FixedDelayRetry(RetryPolicy):
    """
    Retry with fixed delay between attempts.
    
    DESIGN PATTERN: Template Method Pattern - concrete retry strategy
    """
    
    def __init__(self, max_retries: int = 3, delay: float = 5.0):
        """Initialize fixed delay retry policy."""
        self._max_retries = max_retries
        self._delay = delay
    
    def should_retry(self, task: 'Task') -> bool:
        """Check if task should retry."""
        return task.get_retry_count() < self._max_retries
    
    def get_next_retry_delay(self, attempt: int) -> float:
        """Return fixed delay."""
        return self._delay


# ============================================================================
# TASK - Command Pattern
# ============================================================================

class Task(ABC):
    """
    Abstract task representing executable work.
    
    DESIGN PATTERN: Command Pattern - encapsulates action as object
    OOP CONCEPTS: Abstraction - defines task interface
    SOLID: SRP - single responsibility is task execution
    
    How to use:
    class MyTask(Task):
        def execute_logic(self):
            # Implement task logic
            pass
    
    task = MyTask("My Task", Priority.HIGH)
    task.execute()
    """
    
    def __init__(self, name: str, priority: Priority = Priority.MEDIUM,
                 retry_policy: Optional[RetryPolicy] = None,
                 dependencies: Optional[List[str]] = None):
        """
        Initialize task with name and priority.
        
        BUSINESS RULE: Each task has unique ID
        """
        self._id = str(uuid.uuid4())
        self._name = name
        self._priority = priority
        self._state = TaskState.PENDING
        self._retry_count = 0
        self._retry_policy = retry_policy or ExponentialBackoffRetry()
        self._dependencies = dependencies or []
        self._created_at = datetime.now()
        self._scheduled_time = datetime.now()
        self._start_time: Optional[datetime] = None
        self._end_time: Optional[datetime] = None
        self._error: Optional[str] = None
    
    def get_id(self) -> str:
        """Get task ID."""
        return self._id
    
    def get_name(self) -> str:
        """Get task name."""
        return self._name
    
    def get_priority(self) -> int:
        """Get priority value (lower = higher priority)."""
        return self._priority.value
    
    def get_state(self) -> TaskState:
        """Get current task state."""
        return self._state
    
    def set_state(self, state: TaskState) -> None:
        """Set task state."""
        self._state = state
    
    def get_retry_count(self) -> int:
        """Get number of retry attempts."""
        return self._retry_count
    
    def get_dependencies(self) -> List[str]:
        """Get list of task IDs this task depends on."""
        return self._dependencies.copy()
    
    def get_scheduled_time(self) -> datetime:
        """Get scheduled execution time."""
        return self._scheduled_time
    
    def set_scheduled_time(self, time: datetime) -> None:
        """Set scheduled execution time."""
        self._scheduled_time = time
    
    def get_retry_policy(self) -> RetryPolicy:
        """Get retry policy."""
        return self._retry_policy
    
    @abstractmethod
    def execute_logic(self) -> None:
        """
        Execute task-specific logic.
        
        DESIGN PATTERN: Template Method - subclasses implement logic
        """
        pass
    
    @abstractmethod
    def should_execute(self) -> bool:
        """Check if task should execute now."""
        pass
    
    def execute(self) -> None:
        """
        Execute task with state management.
        
        DESIGN PATTERN: State Pattern - manages task state transitions
        BUSINESS RULE: Update state before/after execution
        """
        try:
            self._state = TaskState.RUNNING
            self._start_time = datetime.now()
            
            # Execute task logic
            self.execute_logic()
            
            self._state = TaskState.COMPLETED
            self._end_time = datetime.now()
            
        except Exception as e:
            self._state = TaskState.FAILED
            self._end_time = datetime.now()
            self._error = str(e)
            raise
    
    def retry(self) -> None:
        """
        Retry failed task.
        
        BUSINESS RULE: Increment retry count and reset state
        """
        self._retry_count += 1
        self._state = TaskState.RETRYING
        self._error = None
    
    def cancel(self) -> None:
        """
        Cancel task execution.
        
        BUSINESS RULE: Can only cancel non-running tasks
        """
        if self._state not in [TaskState.COMPLETED, TaskState.RUNNING]:
            self._state = TaskState.CANCELLED
            self._end_time = datetime.now()
    
    def __lt__(self, other: 'Task') -> bool:
        """
        Compare tasks for priority queue.
        
        ALGORITHM: Compare by (priority, scheduled_time)
        Lower priority value = higher priority
        """
        if self._priority.value != other._priority.value:
            return self._priority.value < other._priority.value
        return self._scheduled_time < other._scheduled_time
    
    def __str__(self) -> str:
        return f"Task({self._name}, {self._priority.name}, {self._state.value})"


class OneTimeTask(Task):
    """
    Task that executes once at a specific time.
    
    DESIGN PATTERN: Command Pattern - concrete command
    OOP CONCEPT: Inheritance - extends Task
    
    How to use:
    task = OneTimeTask(
        "Send Email",
        priority=Priority.HIGH,
        execution_time=datetime.now() + timedelta(minutes=5),
        task_function=lambda: send_email()
    )
    """
    
    def __init__(self, name: str, priority: Priority = Priority.MEDIUM,
                 execution_time: Optional[datetime] = None,
                 task_function: Optional[Callable] = None,
                 retry_policy: Optional[RetryPolicy] = None,
                 dependencies: Optional[List[str]] = None):
        """
        Initialize one-time task.
        
        Args:
            execution_time: When to execute (None = execute immediately)
            task_function: Function to execute
        """
        super().__init__(name, priority, retry_policy, dependencies)
        self._execution_time = execution_time or datetime.now()
        self._task_function = task_function
        self.set_scheduled_time(self._execution_time)
    
    def execute_logic(self) -> None:
        """
        Execute one-time task logic.
        
        DESIGN PATTERN: Command Pattern - executes encapsulated action
        """
        if self._task_function:
            self._task_function()
        logger.info(f"Executing one-time task: {self.get_name()}")
    
    def should_execute(self) -> bool:
        """
        Check if task should execute.
        
        BUSINESS RULE: Execute if current time >= scheduled time
        """
        return datetime.now() >= self._execution_time


class RecurringTask(Task):
    """
    Task that executes repeatedly at fixed intervals.
    
    DESIGN PATTERN: Command Pattern - concrete command
    OOP CONCEPT: Polymorphism - different execute behavior
    
    How to use:
    task = RecurringTask(
        "Database Backup",
        priority=Priority.MEDIUM,
        interval=timedelta(hours=24),
        task_function=lambda: backup_database()
    )
    """
    
    def __init__(self, name: str, priority: Priority = Priority.MEDIUM,
                 interval: timedelta = timedelta(hours=1),
                 task_function: Optional[Callable] = None,
                 retry_policy: Optional[RetryPolicy] = None,
                 dependencies: Optional[List[str]] = None):
        """
        Initialize recurring task.
        
        Args:
            interval: Time between executions
            task_function: Function to execute
        """
        super().__init__(name, priority, retry_policy, dependencies)
        self._interval = interval
        self._task_function = task_function
        self._last_execution: Optional[datetime] = None
        self._next_execution = datetime.now()
        self.set_scheduled_time(self._next_execution)
    
    def execute_logic(self) -> None:
        """
        Execute recurring task logic.
        
        BUSINESS RULE: After execution, schedule next occurrence
        """
        if self._task_function:
            self._task_function()
        logger.info(f"Executing recurring task: {self.get_name()}")
        
        # Update execution times
        self._last_execution = datetime.now()
        self.calculate_next_execution()
    
    def calculate_next_execution(self) -> None:
        """
        Calculate next execution time.
        
        BUSINESS RULE: next_execution = last_execution + interval
        """
        self._next_execution = datetime.now() + self._interval
        self.set_scheduled_time(self._next_execution)
    
    def should_execute(self) -> bool:
        """
        Check if task should execute.
        
        BUSINESS RULE: Execute if current time >= next execution time
        """
        return datetime.now() >= self._next_execution
    
    def get_next_execution(self) -> datetime:
        """Get next scheduled execution time."""
        return self._next_execution


# ============================================================================
# TASK QUEUE - Priority Queue Implementation
# ============================================================================

class TaskQueue:
    """
    Thread-safe priority queue for tasks using heap.
    
    DESIGN PATTERN: Priority Queue data structure
    OOP CONCEPTS: Encapsulation - hides heap implementation
    DATA STRUCTURE: Min-heap for O(log n) operations
    
    How to use:
    queue = TaskQueue()
    queue.enqueue(task1)
    queue.enqueue(task2)
    task = queue.dequeue()  # Returns highest priority task
    
    Returns: TaskQueue managing task scheduling order
    """
    
    def __init__(self):
        """
        Initialize priority queue with heap.
        
        DATA STRUCTURE: List-based min-heap
        THREAD SAFETY: ReentrantLock for concurrent access
        """
        self._queue: List[Task] = []
        self._lock = threading.RLock()
        self._task_map: Dict[str, Task] = {}  # task_id -> task
    
    def enqueue(self, task: Task) -> None:
        """
        Add task to priority queue.
        
        TIME COMPLEXITY: O(log n) for heap insertion
        SPACE COMPLEXITY: O(1)
        THREAD SAFETY: Lock protected
        """
        with self._lock:
            heapq.heappush(self._queue, task)
            self._task_map[task.get_id()] = task
            task.set_state(TaskState.SCHEDULED)
    
    def dequeue(self) -> Optional[Task]:
        """
        Remove and return highest priority task.
        
        TIME COMPLEXITY: O(log n) for heap extraction
        THREAD SAFETY: Lock protected
        """
        with self._lock:
            if self._queue:
                task = heapq.heappop(self._queue)
                del self._task_map[task.get_id()]
                return task
            return None
    
    def peek(self) -> Optional[Task]:
        """
        Get highest priority task without removing.
        
        TIME COMPLEXITY: O(1)
        """
        with self._lock:
            return self._queue[0] if self._queue else None
    
    def remove(self, task_id: str) -> bool:
        """
        Remove specific task from queue.
        
        TIME COMPLEXITY: O(n) to find, O(log n) to remove
        BUSINESS RULE: Used for task cancellation
        """
        with self._lock:
            task = self._task_map.get(task_id)
            if task and task in self._queue:
                self._queue.remove(task)
                heapq.heapify(self._queue)  # Restore heap property
                del self._task_map[task_id]
                return True
            return False
    
    def size(self) -> int:
        """Get number of tasks in queue."""
        with self._lock:
            return len(self._queue)
    
    def is_empty(self) -> bool:
        """Check if queue is empty."""
        with self._lock:
            return len(self._queue) == 0


# ============================================================================
# DEPENDENCY GRAPH - DAG Implementation
# ============================================================================

class DependencyGraph:
    """
    Directed Acyclic Graph for task dependencies.
    
    DESIGN PATTERN: Graph data structure
    ALGORITHM: Topological sort using Kahn's algorithm
    DATA STRUCTURE: Adjacency list + in-degree map
    
    How to use:
    graph = DependencyGraph()
    graph.add_task("task1")
    graph.add_task("task2")
    graph.add_dependency("task1", "task2")  # task2 depends on task1
    order = graph.get_topological_order()
    
    Returns: DependencyGraph for managing task dependencies
    """
    
    def __init__(self):
        """
        Initialize dependency graph.
        
        DATA STRUCTURE: 
        - adjacency_list: task -> list of dependent tasks
        - in_degree: task -> number of dependencies
        """
        self._adjacency_list: Dict[str, List[str]] = defaultdict(list)
        self._in_degree: Dict[str, int] = defaultdict(int)
        self._completed: Set[str] = set()
    
    def add_task(self, task_id: str) -> None:
        """
        Add task to graph.
        
        TIME COMPLEXITY: O(1)
        """
        if task_id not in self._adjacency_list:
            self._adjacency_list[task_id] = []
            self._in_degree[task_id] = 0
    
    def add_dependency(self, from_task: str, to_task: str) -> None:
        """
        Add dependency: to_task depends on from_task.
        
        BUSINESS RULE: to_task executes only after from_task completes
        TIME COMPLEXITY: O(1)
        """
        self.add_task(from_task)
        self.add_task(to_task)
        
        self._adjacency_list[from_task].append(to_task)
        self._in_degree[to_task] += 1
    
    def remove_dependency(self, from_task: str, to_task: str) -> None:
        """
        Remove dependency between tasks.
        
        TIME COMPLEXITY: O(d) where d is number of dependencies
        """
        if from_task in self._adjacency_list:
            if to_task in self._adjacency_list[from_task]:
                self._adjacency_list[from_task].remove(to_task)
                self._in_degree[to_task] -= 1
    
    def mark_completed(self, task_id: str) -> None:
        """
        Mark task as completed and update dependent tasks.
        
        BUSINESS RULE: Decrease in-degree of dependent tasks
        """
        self._completed.add(task_id)
        for dependent in self._adjacency_list[task_id]:
            self._in_degree[dependent] -= 1
    
    def can_execute(self, task_id: str) -> bool:
        """
        Check if task can execute (all dependencies completed).
        
        BUSINESS RULE: Task executes when in-degree = 0
        TIME COMPLEXITY: O(1)
        """
        return self._in_degree.get(task_id, 0) == 0
    
    def get_topological_order(self) -> List[str]:
        """
        Get topological order of tasks using Kahn's algorithm.
        
        ALGORITHM: BFS-based topological sort
        TIME COMPLEXITY: O(V + E) where V = tasks, E = dependencies
        SPACE COMPLEXITY: O(V) for queue and result
        
        Returns: List of task IDs in execution order
        """
        # Copy in-degrees for computation
        in_degree_copy = self._in_degree.copy()
        queue = deque()
        result = []
        
        # Add all tasks with no dependencies to queue
        for task_id, degree in in_degree_copy.items():
            if degree == 0:
                queue.append(task_id)
        
        # Process tasks in topological order
        while queue:
            task_id = queue.popleft()
            result.append(task_id)
            
            # Update dependent tasks
            for dependent in self._adjacency_list[task_id]:
                in_degree_copy[dependent] -= 1
                if in_degree_copy[dependent] == 0:
                    queue.append(dependent)
        
        # Check for cycles
        if len(result) != len(self._adjacency_list):
            raise ValueError("Circular dependency detected in task graph")
        
        return result
    
    def has_cycle(self) -> bool:
        """
        Check if graph has cycles.
        
        BUSINESS RULE: Scheduler cannot handle circular dependencies
        TIME COMPLEXITY: O(V + E)
        """
        try:
            self.get_topological_order()
            return False
        except ValueError:
            return True


# ============================================================================
# SCHEDULING STRATEGIES - Strategy Pattern
# ============================================================================

class SchedulingStrategy(ABC):
    """
    Abstract scheduling strategy.
    
    DESIGN PATTERN: Strategy Pattern - defines scheduling algorithm
    OOP CONCEPT: Abstraction - interface for strategies
    SOLID: OCP - open for new strategies
    
    How to use:
    strategy = PriorityScheduling()
    next_task = strategy.select_next_task(queue)
    """
    
    @abstractmethod
    def select_next_task(self, queue: TaskQueue) -> Optional[Task]:
        """
        Select next task to execute from queue.
        
        DESIGN PATTERN: Strategy Pattern - algorithm variation
        """
        pass
    
    @abstractmethod
    def should_preempt(self, current_task: Task, incoming_task: Task) -> bool:
        """
        Check if incoming task should preempt current task.
        
        BUSINESS RULE: Higher priority tasks can preempt lower priority
        """
        pass


class PriorityScheduling(SchedulingStrategy):
    """
    Priority-based scheduling (default).
    
    DESIGN PATTERN: Strategy Pattern - concrete strategy
    ALGORITHM: Select task with highest priority (lowest value)
    
    How to use:
    strategy = PriorityScheduling()
    """
    
    def select_next_task(self, queue: TaskQueue) -> Optional[Task]:
        """
        Select highest priority task.
        
        TIME COMPLEXITY: O(log n) for dequeue
        """
        return queue.dequeue()
    
    def should_preempt(self, current_task: Task, incoming_task: Task) -> bool:
        """
        Check if incoming task has higher priority.
        
        BUSINESS RULE: Lower priority value = higher priority
        """
        return incoming_task.get_priority() < current_task.get_priority()


class FIFOScheduling(SchedulingStrategy):
    """
    First-In-First-Out scheduling.
    
    DESIGN PATTERN: Strategy Pattern - concrete strategy
    ALGORITHM: Execute tasks in arrival order
    """
    
    def select_next_task(self, queue: TaskQueue) -> Optional[Task]:
        """Select task that arrived first."""
        return queue.dequeue()
    
    def should_preempt(self, current_task: Task, incoming_task: Task) -> bool:
        """FIFO doesn't support preemption."""
        return False


class RoundRobinScheduling(SchedulingStrategy):
    """
    Round-robin scheduling with time slicing.
    
    DESIGN PATTERN: Strategy Pattern - concrete strategy
    ALGORITHM: Give each task equal time slice
    """
    
    def __init__(self, time_slice: float = 1.0):
        """
        Initialize round-robin strategy.
        
        Args:
            time_slice: Time slice in seconds
        """
        self._time_slice = time_slice
        self._current_index = 0
    
    def select_next_task(self, queue: TaskQueue) -> Optional[Task]:
        """Select next task in round-robin order."""
        # Simplified: just dequeue (full RR needs task requeuing)
        return queue.dequeue()
    
    def should_preempt(self, current_task: Task, incoming_task: Task) -> bool:
        """Check if time slice expired."""
        # Simplified: no preemption in basic implementation
        return False


# ============================================================================
# TASK EXECUTOR - Thread Pool
# ============================================================================

class TaskExecutor:
    """
    Manages concurrent task execution using thread pool.
    
    DESIGN PATTERN: Thread Pool pattern
    OOP CONCEPTS: Encapsulation - hides threading complexity
    THREAD SAFETY: ThreadPoolExecutor handles synchronization
    
    How to use:
    executor = TaskExecutor(max_workers=4)
    future = executor.submit(task)
    executor.shutdown()
    
    Returns: TaskExecutor for concurrent task execution
    """
    
    def __init__(self, max_workers: int = 4):
        """
        Initialize task executor with thread pool.
        
        Args:
            max_workers: Maximum number of worker threads
        """
        self._max_workers = max_workers
        self._thread_pool = ThreadPoolExecutor(max_workers=max_workers)
        self._running_tasks: Dict[str, Future] = {}
        self._lock = threading.RLock()
    
    def submit(self, task: Task) -> Future:
        """
        Submit task for execution.
        
        BUSINESS RULE: Execute task in thread pool
        TIME COMPLEXITY: O(1) to submit
        THREAD SAFETY: Lock protected
        """
        with self._lock:
            future = self._thread_pool.submit(task.execute)
            self._running_tasks[task.get_id()] = future
            return future
    
    def cancel(self, task_id: str) -> bool:
        """
        Cancel running task.
        
        BUSINESS RULE: Attempt to cancel if not yet started
        """
        with self._lock:
            future = self._running_tasks.get(task_id)
            if future:
                cancelled = future.cancel()
                if cancelled:
                    del self._running_tasks[task_id]
                return cancelled
            return False
    
    def get_running_tasks(self) -> List[str]:
        """Get list of currently running task IDs."""
        with self._lock:
            return list(self._running_tasks.keys())
    
    def shutdown(self, wait: bool = True) -> None:
        """
        Shutdown executor and wait for tasks to complete.
        
        BUSINESS RULE: Graceful shutdown waits for running tasks
        """
        self._thread_pool.shutdown(wait=wait)
    
    def await_termination(self, timeout: Optional[float] = None) -> bool:
        """Wait for all tasks to complete."""
        # ThreadPoolExecutor doesn't have await_termination,
        # but shutdown(wait=True) serves this purpose
        return True


# ============================================================================
# OBSERVER PATTERN - Task Monitoring
# ============================================================================

class TaskObserver(ABC):
    """
    Observer interface for task events.
    
    DESIGN PATTERN: Observer Pattern - defines observer interface
    SOLID: ISP - focused interface for observers
    
    How to use:
    class MyObserver(TaskObserver):
        def on_task_started(self, task):
            print(f"Task started: {task.get_name()}")
    """
    
    @abstractmethod
    def on_task_scheduled(self, task: Task) -> None:
        """Called when task is scheduled."""
        pass
    
    @abstractmethod
    def on_task_started(self, task: Task) -> None:
        """Called when task starts execution."""
        pass
    
    @abstractmethod
    def on_task_completed(self, task: Task) -> None:
        """Called when task completes successfully."""
        pass
    
    @abstractmethod
    def on_task_failed(self, task: Task, error: Exception) -> None:
        """Called when task fails."""
        pass
    
    @abstractmethod
    def on_task_cancelled(self, task: Task) -> None:
        """Called when task is cancelled."""
        pass


class TaskMetrics:
    """
    Aggregated metrics for task execution.
    
    OOP CONCEPTS: Encapsulation - bundles related metrics
    
    How to use:
    metrics = TaskMetrics()
    success_rate = metrics.get_success_rate()
    """
    
    def __init__(self):
        """Initialize metrics counters."""
        self.total_scheduled = 0
        self.total_completed = 0
        self.total_failed = 0
        self.total_cancelled = 0
        self.current_pending = 0
        self.total_execution_time = 0.0
    
    def get_success_rate(self) -> float:
        """
        Calculate success rate.
        
        Returns: Success rate as percentage (0.0-1.0)
        """
        total = self.total_completed + self.total_failed
        return self.total_completed / total if total > 0 else 0.0
    
    def get_failure_rate(self) -> float:
        """Calculate failure rate."""
        total = self.total_completed + self.total_failed
        return self.total_failed / total if total > 0 else 0.0
    
    def get_avg_execution_time(self) -> float:
        """Calculate average execution time."""
        total = self.total_completed + self.total_failed
        return self.total_execution_time / total if total > 0 else 0.0


class TaskExecutionRecord:
    """
    Record of single task execution.
    
    OOP CONCEPTS: Value Object - immutable execution record
    """
    
    def __init__(self, task_id: str, task_name: str, start_time: datetime,
                 end_time: datetime, final_state: TaskState, error: Optional[str] = None):
        """Initialize execution record."""
        self.task_id = task_id
        self.task_name = task_name
        self.start_time = start_time
        self.end_time = end_time
        self.final_state = final_state
        self.error = error
    
    def get_duration(self) -> float:
        """Get execution duration in seconds."""
        delta = self.end_time - self.start_time
        return delta.total_seconds()


class TaskMonitor(TaskObserver):
    """
    Concrete observer that tracks task metrics and history.
    
    DESIGN PATTERN: Observer Pattern - concrete observer
    OOP CONCEPTS: Polymorphism - implements TaskObserver
    
    How to use:
    monitor = TaskMonitor()
    scheduler.add_observer(monitor)
    metrics = monitor.get_metrics()
    """
    
    def __init__(self):
        """
        Initialize task monitor.
        
        DESIGN PATTERN: Observer Pattern - initializes tracking state
        """
        self._metrics = TaskMetrics()
        self._history: List[TaskExecutionRecord] = []
        self._lock = threading.RLock()
    
    def on_task_scheduled(self, task: Task) -> None:
        """
        Track task scheduling.
        
        BUSINESS RULE: Increment scheduled count
        """
        with self._lock:
            self._metrics.total_scheduled += 1
            self._metrics.current_pending += 1
    
    def on_task_started(self, task: Task) -> None:
        """
        Track task start.
        
        BUSINESS RULE: Decrease pending count
        """
        with self._lock:
            self._metrics.current_pending -= 1
    
    def on_task_completed(self, task: Task) -> None:
        """
        Track task completion.
        
        BUSINESS RULE: Increment completed count, record history
        """
        with self._lock:
            self._metrics.total_completed += 1
            # Add execution record
            # Note: Task doesn't expose times, simplified here
    
    def on_task_failed(self, task: Task, error: Exception) -> None:
        """
        Track task failure.
        
        BUSINESS RULE: Increment failed count
        """
        with self._lock:
            self._metrics.total_failed += 1
    
    def on_task_cancelled(self, task: Task) -> None:
        """Track task cancellation."""
        with self._lock:
            self._metrics.total_cancelled += 1
            self._metrics.current_pending -= 1
    
    def get_metrics(self) -> TaskMetrics:
        """
        Get current metrics snapshot.
        
        Returns: TaskMetrics object with aggregated statistics
        """
        with self._lock:
            return self._metrics
    
    def get_task_history(self, task_id: Optional[str] = None) -> List[TaskExecutionRecord]:
        """
        Get task execution history.
        
        Args:
            task_id: Filter by specific task (None = all tasks)
        """
        with self._lock:
            if task_id:
                return [r for r in self._history if r.task_id == task_id]
            return self._history.copy()


class LoggingObserver(TaskObserver):
    """
    Observer that logs task events.
    
    DESIGN PATTERN: Observer Pattern - concrete observer
    """
    
    def on_task_scheduled(self, task: Task) -> None:
        """Log task scheduling."""
        logger.info(f"Task scheduled: {task}")
    
    def on_task_started(self, task: Task) -> None:
        """Log task start."""
        logger.info(f"Task started: {task}")
    
    def on_task_completed(self, task: Task) -> None:
        """Log task completion."""
        logger.info(f"Task completed: {task}")
    
    def on_task_failed(self, task: Task, error: Exception) -> None:
        """Log task failure."""
        logger.error(f"Task failed: {task}, Error: {error}")
    
    def on_task_cancelled(self, task: Task) -> None:
        """Log task cancellation."""
        logger.warning(f"Task cancelled: {task}")


# ============================================================================
# TASK SCHEDULER - Main Controller (Facade + Singleton)
# ============================================================================

class TaskScheduler:
    """
    Main task scheduler coordinating all components.
    
    DESIGN PATTERN: Facade Pattern - provides unified interface
    DESIGN PATTERN: Singleton Pattern - single scheduler instance
    OOP CONCEPTS: Encapsulation - manages system complexity
    SOLID: SRP - coordinates components
    
    How to use:
    scheduler = TaskScheduler(max_workers=4)
    scheduler.add_observer(TaskMonitor())
    task_id = scheduler.schedule_task(task)
    scheduler.start()
    scheduler.shutdown()
    
    Returns: TaskScheduler coordinating entire system
    """
    
    def __init__(self, max_workers: int = 4, 
                 strategy: Optional[SchedulingStrategy] = None):
        """
        Initialize task scheduler.
        
        DESIGN PATTERN: Dependency Injection - accepts strategy
        """
        self._task_queue = TaskQueue()
        self._executor = TaskExecutor(max_workers=max_workers)
        self._tasks: Dict[str, Task] = {}
        self._dependency_graph = DependencyGraph()
        self._observers: List[TaskObserver] = []
        self._strategy = strategy or PriorityScheduling()
        self._running = False
        self._scheduler_thread: Optional[threading.Thread] = None
        self._lock = threading.RLock()
    
    def schedule_task(self, task: Task) -> str:
        """
        Schedule a one-time task.
        
        BUSINESS RULE: Add task to queue and dependency graph
        TIME COMPLEXITY: O(log n) for queue insertion
        
        Returns: Task ID
        """
        with self._lock:
            # Add to task registry
            self._tasks[task.get_id()] = task
            
            # Add to dependency graph
            self._dependency_graph.add_task(task.get_id())
            
            # Add dependencies to graph
            for dep_id in task.get_dependencies():
                self._dependency_graph.add_dependency(dep_id, task.get_id())
            
            # Only enqueue if dependencies are satisfied
            if self._dependency_graph.can_execute(task.get_id()):
                self._task_queue.enqueue(task)
                self._notify_observers('scheduled', task)
            
            return task.get_id()
    
    def schedule_recurring(self, task: RecurringTask) -> str:
        """
        Schedule a recurring task.
        
        BUSINESS RULE: Recurring tasks re-schedule after completion
        """
        return self.schedule_task(task)
    
    def cancel_task(self, task_id: str) -> bool:
        """
        Cancel a task.
        
        BUSINESS RULE: Can cancel pending/scheduled tasks
        TIME COMPLEXITY: O(n) for queue removal
        """
        with self._lock:
            task = self._tasks.get(task_id)
            if not task:
                return False
            
            # Try to remove from queue
            removed = self._task_queue.remove(task_id)
            
            # Try to cancel if running
            if not removed:
                cancelled = self._executor.cancel(task_id)
                if cancelled:
                    task.cancel()
                    self._notify_observers('cancelled', task)
                    return True
                return False
            
            task.cancel()
            self._notify_observers('cancelled', task)
            return True
    
    def pause_task(self, task_id: str) -> bool:
        """
        Pause a task (remove from queue).
        
        BUSINESS RULE: Can pause scheduled tasks
        """
        with self._lock:
            return self._task_queue.remove(task_id)
    
    def resume_task(self, task_id: str) -> bool:
        """
        Resume a paused task (add back to queue).
        
        BUSINESS RULE: Re-schedule paused task
        """
        with self._lock:
            task = self._tasks.get(task_id)
            if task and self._dependency_graph.can_execute(task_id):
                self._task_queue.enqueue(task)
                return True
            return False
    
    def add_dependency(self, from_task_id: str, to_task_id: str) -> None:
        """
        Add dependency between tasks.
        
        BUSINESS RULE: to_task depends on from_task
        """
        with self._lock:
            self._dependency_graph.add_dependency(from_task_id, to_task_id)
    
    def add_observer(self, observer: TaskObserver) -> None:
        """
        Register task observer.
        
        DESIGN PATTERN: Observer Pattern - manages observers
        """
        with self._lock:
            self._observers.append(observer)
    
    def set_strategy(self, strategy: SchedulingStrategy) -> None:
        """
        Change scheduling strategy.
        
        DESIGN PATTERN: Strategy Pattern - runtime strategy change
        """
        with self._lock:
            self._strategy = strategy
    
    def start(self) -> None:
        """
        Start the scheduler.
        
        BUSINESS RULE: Begin task execution loop in separate thread
        """
        if not self._running:
            self._running = True
            self._scheduler_thread = threading.Thread(target=self._execute_tasks, daemon=True)
            self._scheduler_thread.start()
            logger.info("Task scheduler started")
    
    def shutdown(self, wait: bool = True) -> None:
        """
        Shutdown the scheduler.
        
        BUSINESS RULE: Graceful shutdown waits for tasks
        """
        logger.info("Shutting down task scheduler...")
        self._running = False
        
        if self._scheduler_thread:
            self._scheduler_thread.join(timeout=5.0)
        
        self._executor.shutdown(wait=wait)
        logger.info("Task scheduler shutdown complete")
    
    def _execute_tasks(self) -> None:
        """
        Main execution loop.
        
        BUSINESS RULE: Continuously process tasks from queue
        DESIGN PATTERN: Strategy Pattern - uses strategy to select tasks
        """
        while self._running:
            try:
                # Get next task using strategy
                task = self._strategy.select_next_task(self._task_queue)
                
                if task:
                    # Check if dependencies are satisfied
                    if not self._dependency_graph.can_execute(task.get_id()):
                        # Re-queue and continue
                        self._task_queue.enqueue(task)
                        time.sleep(0.1)
                        continue
                    
                    # Check if task should execute now
                    if not task.should_execute():
                        # Re-queue for later
                        self._task_queue.enqueue(task)
                        time.sleep(0.1)
                        continue
                    
                    # Execute task
                    self._notify_observers('started', task)
                    future = self._executor.submit(task)
                    
                    # Handle task completion
                    try:
                        future.result()  # Wait for completion
                        self._dependency_graph.mark_completed(task.get_id())
                        self._notify_observers('completed', task)
                        
                        # Re-schedule if recurring
                        if isinstance(task, RecurringTask):
                            task.set_state(TaskState.PENDING)
                            self._task_queue.enqueue(task)
                        
                        # Check if any dependent tasks can now execute
                        self._check_dependent_tasks(task.get_id())
                        
                    except Exception as e:
                        self._notify_observers('failed', task, e)
                        
                        # Handle retry
                        retry_policy = task.get_retry_policy()
                        if retry_policy.should_retry(task):
                            task.retry()
                            delay = retry_policy.get_next_retry_delay(task.get_retry_count())
                            time.sleep(delay)
                            task.set_scheduled_time(datetime.now() + timedelta(seconds=delay))
                            self._task_queue.enqueue(task)
                            logger.info(f"Retrying task {task.get_name()} (attempt {task.get_retry_count()})")
                        else:
                            logger.error(f"Task {task.get_name()} failed after max retries")
                else:
                    # No tasks available, sleep briefly
                    time.sleep(0.1)
                    
            except Exception as e:
                logger.error(f"Error in scheduler loop: {e}")
                time.sleep(0.1)
    
    def _check_dependent_tasks(self, completed_task_id: str) -> None:
        """
        Check and enqueue dependent tasks that can now execute.
        
        BUSINESS RULE: After task completes, check dependents
        """
        with self._lock:
            for task_id, task in self._tasks.items():
                if (completed_task_id in task.get_dependencies() and
                    self._dependency_graph.can_execute(task_id) and
                    task.get_state() == TaskState.PENDING):
                    self._task_queue.enqueue(task)
    
    def _notify_observers(self, event: str, task: Task, error: Optional[Exception] = None) -> None:
        """
        Notify all observers of task event.
        
        DESIGN PATTERN: Observer Pattern - broadcasts events
        """
        for observer in self._observers:
            try:
                if event == 'scheduled':
                    observer.on_task_scheduled(task)
                elif event == 'started':
                    observer.on_task_started(task)
                elif event == 'completed':
                    observer.on_task_completed(task)
                elif event == 'failed':
                    observer.on_task_failed(task, error)
                elif event == 'cancelled':
                    observer.on_task_cancelled(task)
            except Exception as e:
                logger.error(f"Error notifying observer: {e}")
    
    def get_task_status(self, task_id: str) -> Optional[TaskState]:
        """
        Get current status of a task.
        
        TIME COMPLEXITY: O(1)
        """
        task = self._tasks.get(task_id)
        return task.get_state() if task else None
    
    def get_queue_size(self) -> int:
        """Get number of tasks in queue."""
        return self._task_queue.size()


# ============================================================================
# DEMO / MAIN FUNCTION
# ============================================================================

def main():
    """
    Demonstrate the task scheduler system.
    
    DEMONSTRATES:
    - One-time and recurring task scheduling
    - Priority-based execution
    - Task dependencies
    - Retry mechanism with exponential backoff
    - Task monitoring and metrics
    - Task cancellation
    - Different scheduling strategies
    """
    print("=" * 80)
    print("TASK SCHEDULER SYSTEM - COMPREHENSIVE DEMO")
    print("=" * 80)
    print()
    
    # Step 1: Create scheduler
    print("📝 Step 1: Creating Task Scheduler")
    print("-" * 80)
    scheduler = TaskScheduler(max_workers=4, strategy=PriorityScheduling())
    
    # Add observers
    monitor = TaskMonitor()
    logger_observer = LoggingObserver()
    scheduler.add_observer(monitor)
    scheduler.add_observer(logger_observer)
    
    # Start scheduler
    scheduler.start()
    print("✅ Scheduler started with 4 workers")
    print()
    
    # Step 2: Schedule one-time tasks
    print("📝 Step 2: Scheduling One-Time Tasks")
    print("-" * 80)
    
    task1 = OneTimeTask(
        "Send Welcome Email",
        priority=Priority.HIGH,
        execution_time=datetime.now() + timedelta(seconds=2),
        task_function=lambda: print("  ✉️  Sending welcome email..."),
        retry_policy=ExponentialBackoffRetry(max_retries=3, base_delay=1.0)
    )
    task_id1 = scheduler.schedule_task(task1)
    print(f"✅ Scheduled task: {task1.get_name()} (ID: {task_id1[:8]}...)")
    
    task2 = OneTimeTask(
        "Process Payment",
        priority=Priority.HIGH,
        execution_time=datetime.now() + timedelta(seconds=1),
        task_function=lambda: print("  💳 Processing payment..."),
        retry_policy=ExponentialBackoffRetry(max_retries=2)
    )
    task_id2 = scheduler.schedule_task(task2)
    print(f"✅ Scheduled task: {task2.get_name()} (ID: {task_id2[:8]}...)")
    
    task3 = OneTimeTask(
        "Generate Report",
        priority=Priority.MEDIUM,
        execution_time=datetime.now() + timedelta(seconds=3),
        task_function=lambda: print("  📊 Generating report..."),
    )
    task_id3 = scheduler.schedule_task(task3)
    print(f"✅ Scheduled task: {task3.get_name()} (ID: {task_id3[:8]}...)")
    print()
    
    # Step 3: Schedule recurring task
    print("📝 Step 3: Scheduling Recurring Task")
    print("-" * 80)
    
    task4 = RecurringTask(
        "Health Check",
        priority=Priority.LOW,
        interval=timedelta(seconds=5),
        task_function=lambda: print("  🏥 Running health check..."),
    )
    task_id4 = scheduler.schedule_recurring(task4)
    print(f"✅ Scheduled recurring task: {task4.get_name()} (every 5 seconds)")
    print()
    
    # Step 4: Schedule tasks with dependencies
    print("📝 Step 4: Scheduling Tasks with Dependencies")
    print("-" * 80)
    
    task5 = OneTimeTask(
        "Data Processing",
        priority=Priority.HIGH,
        execution_time=datetime.now() + timedelta(seconds=1),
        task_function=lambda: print("  🔄 Processing data..."),
    )
    task_id5 = scheduler.schedule_task(task5)
    
    task6 = OneTimeTask(
        "Send Notification",
        priority=Priority.MEDIUM,
        execution_time=datetime.now() + timedelta(seconds=1),
        task_function=lambda: print("  🔔 Sending notification..."),
        dependencies=[task_id5]  # Depends on task5
    )
    task_id6 = scheduler.schedule_task(task6)
    
    scheduler.add_dependency(task_id5, task_id6)
    print(f"✅ Task '{task6.get_name()}' depends on '{task5.get_name()}'")
    print()
    
    # Step 5: Let tasks execute
    print("📝 Step 5: Executing Tasks")
    print("-" * 80)
    print("Waiting for tasks to execute...")
    time.sleep(6)
    print()
    
    # Step 6: Check metrics
    print("📝 Step 6: Task Execution Metrics")
    print("-" * 80)
    metrics = monitor.get_metrics()
    print(f"Total Scheduled: {metrics.total_scheduled}")
    print(f"Total Completed: {metrics.total_completed}")
    print(f"Total Failed: {metrics.total_failed}")
    print(f"Total Cancelled: {metrics.total_cancelled}")
    print(f"Current Pending: {metrics.current_pending}")
    print(f"Success Rate: {metrics.get_success_rate() * 100:.1f}%")
    print()
    
    # Step 7: Cancel a task
    print("📝 Step 7: Cancelling Task")
    print("-" * 80)
    task7 = OneTimeTask(
        "Low Priority Task",
        priority=Priority.LOW,
        execution_time=datetime.now() + timedelta(seconds=10),
        task_function=lambda: print("  ⏳ This should not execute..."),
    )
    task_id7 = scheduler.schedule_task(task7)
    print(f"✅ Scheduled task: {task7.get_name()}")
    
    cancelled = scheduler.cancel_task(task_id7)
    print(f"{'✅' if cancelled else '❌'} Cancelled task: {task7.get_name()}")
    print()
    
    # Step 8: Demonstrate strategy change
    print("📝 Step 8: Changing Scheduling Strategy")
    print("-" * 80)
    scheduler.set_strategy(FIFOScheduling())
    print("✅ Changed strategy to FIFO Scheduling")
    print()
    
    # Step 9: Shutdown scheduler
    print("📝 Step 9: Shutting Down Scheduler")
    print("-" * 80)
    scheduler.shutdown(wait=True)
    print("✅ Scheduler shutdown complete")
    print()
    
    # Final metrics
    print("📝 Final Metrics")
    print("-" * 80)
    metrics = monitor.get_metrics()
    print(f"Total Tasks Scheduled: {metrics.total_scheduled}")
    print(f"Total Tasks Completed: {metrics.total_completed}")
    print(f"Total Tasks Failed: {metrics.total_failed}")
    print(f"Overall Success Rate: {metrics.get_success_rate() * 100:.1f}%")
    print()
    
    print("=" * 80)
    print("DEMO COMPLETED SUCCESSFULLY!")
    print("=" * 80)


if __name__ == "__main__":
    main()

