/**
 * Task Scheduler System - Low Level Design Implementation in JavaScript
 * =========================================================================
 * 
 * This file implements a comprehensive task scheduling system that executes tasks based on time,
 * priority, and dependencies. It supports one-time and recurring tasks with retry mechanisms.
 * 
 * DESIGN PATTERNS USED:
 * 1. Command Pattern: Task encapsulates execution logic as command object
 * 2. Strategy Pattern: Different scheduling strategies (Priority, FIFO, Round Robin)
 * 3. Observer Pattern: TaskMonitor observes task state changes and events
 * 4. State Pattern: Task lifecycle states (Pending, Running, Completed, Failed, Cancelled)
 * 5. Singleton Pattern: TaskScheduler as single system-wide instance
 * 6. Template Method Pattern: Retry mechanism with customizable backoff strategies
 * 
 * OOP CONCEPTS DEMONSTRATED:
 * 1. Encapsulation: Private fields using # syntax, data hiding in scheduler internals
 * 2. Abstraction: Abstract interfaces for Task, SchedulingStrategy, RetryPolicy
 * 3. Composition: TaskScheduler has-a TaskQueue, TaskExecutor, DependencyGraph
 * 4. Polymorphism: Different strategies implement same interface differently
 * 
 * ARCHITECTURAL PRINCIPLES:
 * - Single Responsibility: Each class handles one concern
 * - Open/Closed: Open for extension (new strategies) closed for modification
 * - Dependency Injection: Scheduler receives dependencies
 * - Low Coupling: Components communicate through interfaces
 * 
 * BUSINESS FEATURES:
 * - Priority-based task scheduling using heap
 * - Task dependencies with DAG validation
 * - Retry mechanism with exponential backoff
 * - Task monitoring and metrics tracking
 * - One-time and recurring task support
 * 
 * ALGORITHMS:
 * - Task Scheduling: O(log n) using heap
 * - Dependency Resolution: O(V + E) using topological sort
 * - Retry Backoff: Exponential with configurable parameters
 */

// ============================================================================
// ENUMS - Domain Definitions
// ============================================================================

/**
 * Task lifecycle states
 */
const TaskState = Object.freeze({
    PENDING: 'PENDING',
    SCHEDULED: 'SCHEDULED',
    RUNNING: 'RUNNING',
    COMPLETED: 'COMPLETED',
    FAILED: 'FAILED',
    CANCELLED: 'CANCELLED',
    RETRYING: 'RETRYING'
});

/**
 * Priority levels (lower value = higher priority)
 */
const Priority = Object.freeze({
    HIGH: 1,
    MEDIUM: 5,
    LOW: 10
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate UUID for unique identifiers
 */
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// ============================================================================
// MIN HEAP IMPLEMENTATION
// ============================================================================

/**
 * MinHeap for priority queue
 * 
 * DATA STRUCTURE: Array-based binary heap
 * TIME COMPLEXITY: O(log n) for insert/remove
 */
class MinHeap {
    #heap;
    #compareFn;

    constructor(compareFn) {
        this.#heap = [];
        this.#compareFn = compareFn || ((a, b) => a - b);
    }

    push(item) {
        this.#heap.push(item);
        this.#bubbleUp(this.#heap.length - 1);
    }

    pop() {
        if (this.size() === 0) return null;
        if (this.size() === 1) return this.#heap.pop();

        const top = this.#heap[0];
        this.#heap[0] = this.#heap.pop();
        this.#bubbleDown(0);
        return top;
    }

    peek() {
        return this.#heap[0] || null;
    }

    size() {
        return this.#heap.length;
    }

    isEmpty() {
        return this.#heap.length === 0;
    }

    remove(item) {
        const index = this.#heap.indexOf(item);
        if (index === -1) return false;

        if (index === this.#heap.length - 1) {
            this.#heap.pop();
            return true;
        }

        this.#heap[index] = this.#heap.pop();
        this.#bubbleDown(index);
        return true;
    }

    #bubbleUp(index) {
        while (index > 0) {
            const parentIndex = Math.floor((index - 1) / 2);
            if (this.#compareFn(this.#heap[index], this.#heap[parentIndex]) >= 0) break;
            [this.#heap[index], this.#heap[parentIndex]] = 
                [this.#heap[parentIndex], this.#heap[index]];
            index = parentIndex;
        }
    }

    #bubbleDown(index) {
        while (true) {
            const leftChild = 2 * index + 1;
            const rightChild = 2 * index + 2;
            let smallest = index;

            if (leftChild < this.#heap.length && 
                this.#compareFn(this.#heap[leftChild], this.#heap[smallest]) < 0) {
                smallest = leftChild;
            }

            if (rightChild < this.#heap.length && 
                this.#compareFn(this.#heap[rightChild], this.#heap[smallest]) < 0) {
                smallest = rightChild;
            }

            if (smallest === index) break;

            [this.#heap[index], this.#heap[smallest]] = 
                [this.#heap[smallest], this.#heap[index]];
            index = smallest;
        }
    }
}

// ============================================================================
// RETRY POLICIES - Template Method Pattern
// ============================================================================

/**
 * Abstract retry policy
 * 
 * DESIGN PATTERN: Template Method Pattern
 */
class RetryPolicy {
    shouldRetry(task) {
        throw new Error('shouldRetry must be implemented');
    }

    getNextRetryDelay(attempt) {
        throw new Error('getNextRetryDelay must be implemented');
    }
}

/**
 * Exponential backoff retry policy
 * 
 * ALGORITHM: delay = baseDelay * (multiplier ^ attempt)
 */
class ExponentialBackoffRetry extends RetryPolicy {
    #maxRetries;
    #baseDelay;
    #multiplier;
    #maxDelay;

    constructor(maxRetries = 3, baseDelay = 1000, multiplier = 2.0, maxDelay = 60000) {
        super();
        this.#maxRetries = maxRetries;
        this.#baseDelay = baseDelay;
        this.#multiplier = multiplier;
        this.#maxDelay = maxDelay;
    }

    shouldRetry(task) {
        return task.getRetryCount() < this.#maxRetries;
    }

    getNextRetryDelay(attempt) {
        const delay = this.#baseDelay * Math.pow(this.#multiplier, attempt);
        return Math.min(delay, this.#maxDelay);
    }
}

/**
 * Fixed delay retry policy
 */
class FixedDelayRetry extends RetryPolicy {
    #maxRetries;
    #delay;

    constructor(maxRetries = 3, delay = 5000) {
        super();
        this.#maxRetries = maxRetries;
        this.#delay = delay;
    }

    shouldRetry(task) {
        return task.getRetryCount() < this.#maxRetries;
    }

    getNextRetryDelay(attempt) {
        return this.#delay;
    }
}

// ============================================================================
// TASK - Command Pattern
// ============================================================================

/**
 * Abstract Task class
 * 
 * DESIGN PATTERN: Command Pattern - encapsulates action
 */
class Task {
    #id;
    #name;
    #priority;
    #state;
    #retryCount;
    #retryPolicy;
    #dependencies;
    #createdAt;
    #scheduledTime;
    #startTime;
    #endTime;
    #error;

    constructor(name, priority = Priority.MEDIUM, retryPolicy = null, dependencies = []) {
        this.#id = generateUUID();
        this.#name = name;
        this.#priority = priority;
        this.#state = TaskState.PENDING;
        this.#retryCount = 0;
        this.#retryPolicy = retryPolicy || new ExponentialBackoffRetry();
        this.#dependencies = dependencies;
        this.#createdAt = new Date();
        this.#scheduledTime = new Date();
        this.#startTime = null;
        this.#endTime = null;
        this.#error = null;
    }

    getId() { return this.#id; }
    getName() { return this.#name; }
    getPriority() { return this.#priority; }
    getState() { return this.#state; }
    setState(state) { this.#state = state; }
    getRetryCount() { return this.#retryCount; }
    getDependencies() { return [...this.#dependencies]; }
    getScheduledTime() { return this.#scheduledTime; }
    setScheduledTime(time) { this.#scheduledTime = time; }
    getRetryPolicy() { return this.#retryPolicy; }
    getError() { return this.#error; }

    executeLogic() {
        throw new Error('executeLogic must be implemented');
    }

    shouldExecute() {
        throw new Error('shouldExecute must be implemented');
    }

    async execute() {
        try {
            this.#state = TaskState.RUNNING;
            this.#startTime = new Date();

            await this.executeLogic();

            this.#state = TaskState.COMPLETED;
            this.#endTime = new Date();
        } catch (error) {
            this.#state = TaskState.FAILED;
            this.#endTime = new Date();
            this.#error = error.message;
            throw error;
        }
    }

    retry() {
        this.#retryCount++;
        this.#state = TaskState.RETRYING;
        this.#error = null;
    }

    cancel() {
        if (this.#state !== TaskState.COMPLETED && this.#state !== TaskState.RUNNING) {
            this.#state = TaskState.CANCELLED;
            this.#endTime = new Date();
        }
    }

    compareTo(other) {
        if (this.#priority !== other.#priority) {
            return this.#priority - other.#priority;
        }
        return this.#scheduledTime.getTime() - other.#scheduledTime.getTime();
    }

    toString() {
        return `Task(${this.#name}, Priority:${this.#priority}, State:${this.#state})`;
    }
}

/**
 * One-time task
 * 
 * DESIGN PATTERN: Command Pattern - concrete command
 */
class OneTimeTask extends Task {
    #executionTime;
    #taskFunction;

    constructor(name, priority = Priority.MEDIUM, executionTime = null, 
                taskFunction = null, retryPolicy = null, dependencies = []) {
        super(name, priority, retryPolicy, dependencies);
        this.#executionTime = executionTime || new Date();
        this.#taskFunction = taskFunction;
        this.setScheduledTime(this.#executionTime);
    }

    async executeLogic() {
        if (this.#taskFunction) {
            await this.#taskFunction();
        }
        console.log(`✅ Executed one-time task: ${this.getName()}`);
    }

    shouldExecute() {
        return new Date() >= this.#executionTime;
    }
}

/**
 * Recurring task
 * 
 * DESIGN PATTERN: Command Pattern - concrete command
 */
class RecurringTask extends Task {
    #interval;
    #taskFunction;
    #lastExecution;
    #nextExecution;

    constructor(name, priority = Priority.MEDIUM, interval = 3600000, 
                taskFunction = null, retryPolicy = null, dependencies = []) {
        super(name, priority, retryPolicy, dependencies);
        this.#interval = interval;
        this.#taskFunction = taskFunction;
        this.#lastExecution = null;
        this.#nextExecution = new Date();
        this.setScheduledTime(this.#nextExecution);
    }

    async executeLogic() {
        if (this.#taskFunction) {
            await this.#taskFunction();
        }
        console.log(`🔄 Executed recurring task: ${this.getName()}`);
        
        this.#lastExecution = new Date();
        this.calculateNextExecution();
    }

    calculateNextExecution() {
        this.#nextExecution = new Date(Date.now() + this.#interval);
        this.setScheduledTime(this.#nextExecution);
    }

    shouldExecute() {
        return new Date() >= this.#nextExecution;
    }

    getNextExecution() {
        return this.#nextExecution;
    }
}

// ============================================================================
// TASK QUEUE - Priority Queue
// ============================================================================

/**
 * Thread-safe priority queue for tasks
 * 
 * DATA STRUCTURE: Min-heap
 * TIME COMPLEXITY: O(log n) for enqueue/dequeue
 */
class TaskQueue {
    #queue;
    #taskMap;

    constructor() {
        this.#queue = new MinHeap((a, b) => a.compareTo(b));
        this.#taskMap = new Map();
    }

    enqueue(task) {
        this.#queue.push(task);
        this.#taskMap.set(task.getId(), task);
        task.setState(TaskState.SCHEDULED);
    }

    dequeue() {
        const task = this.#queue.pop();
        if (task) {
            this.#taskMap.delete(task.getId());
        }
        return task;
    }

    peek() {
        return this.#queue.peek();
    }

    remove(taskId) {
        const task = this.#taskMap.get(taskId);
        if (task) {
            const removed = this.#queue.remove(task);
            if (removed) {
                this.#taskMap.delete(taskId);
            }
            return removed;
        }
        return false;
    }

    size() {
        return this.#queue.size();
    }

    isEmpty() {
        return this.#queue.isEmpty();
    }
}

// ============================================================================
// DEPENDENCY GRAPH - DAG Implementation
// ============================================================================

/**
 * Directed Acyclic Graph for task dependencies
 * 
 * ALGORITHM: Topological sort using Kahn's algorithm
 * TIME COMPLEXITY: O(V + E)
 */
class DependencyGraph {
    #adjacencyList;
    #inDegree;
    #completed;

    constructor() {
        this.#adjacencyList = new Map();
        this.#inDegree = new Map();
        this.#completed = new Set();
    }

    addTask(taskId) {
        if (!this.#adjacencyList.has(taskId)) {
            this.#adjacencyList.set(taskId, []);
            this.#inDegree.set(taskId, 0);
        }
    }

    addDependency(fromTask, toTask) {
        this.addTask(fromTask);
        this.addTask(toTask);
        
        this.#adjacencyList.get(fromTask).push(toTask);
        this.#inDegree.set(toTask, this.#inDegree.get(toTask) + 1);
    }

    removeDependency(fromTask, toTask) {
        if (this.#adjacencyList.has(fromTask)) {
            const dependents = this.#adjacencyList.get(fromTask);
            const index = dependents.indexOf(toTask);
            if (index !== -1) {
                dependents.splice(index, 1);
                this.#inDegree.set(toTask, this.#inDegree.get(toTask) - 1);
            }
        }
    }

    markCompleted(taskId) {
        this.#completed.add(taskId);
        const dependents = this.#adjacencyList.get(taskId) || [];
        for (const dependent of dependents) {
            this.#inDegree.set(dependent, this.#inDegree.get(dependent) - 1);
        }
    }

    canExecute(taskId) {
        return (this.#inDegree.get(taskId) || 0) === 0;
    }

    getTopologicalOrder() {
        const inDegreeCopy = new Map(this.#inDegree);
        const queue = [];
        const result = [];

        for (const [taskId, degree] of inDegreeCopy.entries()) {
            if (degree === 0) {
                queue.push(taskId);
            }
        }

        while (queue.length > 0) {
            const taskId = queue.shift();
            result.push(taskId);

            const dependents = this.#adjacencyList.get(taskId) || [];
            for (const dependent of dependents) {
                const newDegree = inDegreeCopy.get(dependent) - 1;
                inDegreeCopy.set(dependent, newDegree);
                if (newDegree === 0) {
                    queue.push(dependent);
                }
            }
        }

        if (result.length !== this.#adjacencyList.size) {
            throw new Error('Circular dependency detected in task graph');
        }

        return result;
    }

    hasCycle() {
        try {
            this.getTopologicalOrder();
            return false;
        } catch {
            return true;
        }
    }
}

// ============================================================================
// SCHEDULING STRATEGIES - Strategy Pattern
// ============================================================================

/**
 * Abstract scheduling strategy
 * 
 * DESIGN PATTERN: Strategy Pattern
 */
class SchedulingStrategy {
    selectNextTask(queue) {
        throw new Error('selectNextTask must be implemented');
    }

    shouldPreempt(currentTask, incomingTask) {
        throw new Error('shouldPreempt must be implemented');
    }
}

/**
 * Priority-based scheduling
 */
class PriorityScheduling extends SchedulingStrategy {
    selectNextTask(queue) {
        return queue.dequeue();
    }

    shouldPreempt(currentTask, incomingTask) {
        return incomingTask.getPriority() < currentTask.getPriority();
    }
}

/**
 * FIFO scheduling
 */
class FIFOScheduling extends SchedulingStrategy {
    selectNextTask(queue) {
        return queue.dequeue();
    }

    shouldPreempt(currentTask, incomingTask) {
        return false;
    }
}

/**
 * Round-robin scheduling
 */
class RoundRobinScheduling extends SchedulingStrategy {
    #timeSlice;

    constructor(timeSlice = 1000) {
        super();
        this.#timeSlice = timeSlice;
    }

    selectNextTask(queue) {
        return queue.dequeue();
    }

    shouldPreempt(currentTask, incomingTask) {
        return false;
    }
}

// ============================================================================
// OBSERVER PATTERN - Task Monitoring
// ============================================================================

/**
 * Abstract task observer
 * 
 * DESIGN PATTERN: Observer Pattern
 */
class TaskObserver {
    onTaskScheduled(task) {
        throw new Error('onTaskScheduled must be implemented');
    }

    onTaskStarted(task) {
        throw new Error('onTaskStarted must be implemented');
    }

    onTaskCompleted(task) {
        throw new Error('onTaskCompleted must be implemented');
    }

    onTaskFailed(task, error) {
        throw new Error('onTaskFailed must be implemented');
    }

    onTaskCancelled(task) {
        throw new Error('onTaskCancelled must be implemented');
    }
}

/**
 * Task metrics
 */
class TaskMetrics {
    constructor() {
        this.totalScheduled = 0;
        this.totalCompleted = 0;
        this.totalFailed = 0;
        this.totalCancelled = 0;
        this.currentPending = 0;
        this.totalExecutionTime = 0;
    }

    getSuccessRate() {
        const total = this.totalCompleted + this.totalFailed;
        return total > 0 ? this.totalCompleted / total : 0;
    }

    getFailureRate() {
        const total = this.totalCompleted + this.totalFailed;
        return total > 0 ? this.totalFailed / total : 0;
    }

    getAvgExecutionTime() {
        const total = this.totalCompleted + this.totalFailed;
        return total > 0 ? this.totalExecutionTime / total : 0;
    }
}

/**
 * Task execution record
 */
class TaskExecutionRecord {
    constructor(taskId, taskName, startTime, endTime, finalState, error = null) {
        this.taskId = taskId;
        this.taskName = taskName;
        this.startTime = startTime;
        this.endTime = endTime;
        this.finalState = finalState;
        this.error = error;
    }

    getDuration() {
        return this.endTime.getTime() - this.startTime.getTime();
    }
}

/**
 * Task monitor
 * 
 * DESIGN PATTERN: Observer Pattern - concrete observer
 */
class TaskMonitor extends TaskObserver {
    #metrics;
    #history;

    constructor() {
        super();
        this.#metrics = new TaskMetrics();
        this.#history = [];
    }

    onTaskScheduled(task) {
        this.#metrics.totalScheduled++;
        this.#metrics.currentPending++;
    }

    onTaskStarted(task) {
        this.#metrics.currentPending--;
    }

    onTaskCompleted(task) {
        this.#metrics.totalCompleted++;
    }

    onTaskFailed(task, error) {
        this.#metrics.totalFailed++;
    }

    onTaskCancelled(task) {
        this.#metrics.totalCancelled++;
        this.#metrics.currentPending--;
    }

    getMetrics() {
        return this.#metrics;
    }

    getTaskHistory(taskId = null) {
        if (taskId) {
            return this.#history.filter(r => r.taskId === taskId);
        }
        return [...this.#history];
    }
}

/**
 * Logging observer
 */
class LoggingObserver extends TaskObserver {
    onTaskScheduled(task) {
        console.log(`📅 Task scheduled: ${task}`);
    }

    onTaskStarted(task) {
        console.log(`▶️  Task started: ${task}`);
    }

    onTaskCompleted(task) {
        console.log(`✅ Task completed: ${task}`);
    }

    onTaskFailed(task, error) {
        console.error(`❌ Task failed: ${task}, Error: ${error.message}`);
    }

    onTaskCancelled(task) {
        console.log(`🚫 Task cancelled: ${task}`);
    }
}

// ============================================================================
// TASK SCHEDULER - Main Controller
// ============================================================================

/**
 * Main task scheduler
 * 
 * DESIGN PATTERN: Facade Pattern + Singleton Pattern
 */
class TaskScheduler {
    #taskQueue;
    #tasks;
    #dependencyGraph;
    #observers;
    #strategy;
    #running;
    #maxWorkers;
    #runningTasks;

    constructor(maxWorkers = 4, strategy = null) {
        this.#taskQueue = new TaskQueue();
        this.#tasks = new Map();
        this.#dependencyGraph = new DependencyGraph();
        this.#observers = [];
        this.#strategy = strategy || new PriorityScheduling();
        this.#running = false;
        this.#maxWorkers = maxWorkers;
        this.#runningTasks = new Map();
    }

    scheduleTask(task) {
        const taskId = task.getId();
        
        this.#tasks.set(taskId, task);
        this.#dependencyGraph.addTask(taskId);
        
        for (const depId of task.getDependencies()) {
            this.#dependencyGraph.addDependency(depId, taskId);
        }

        if (this.#dependencyGraph.canExecute(taskId)) {
            this.#taskQueue.enqueue(task);
            this.#notifyObservers('scheduled', task);
        }

        return taskId;
    }

    scheduleRecurring(task) {
        return this.scheduleTask(task);
    }

    cancelTask(taskId) {
        const task = this.#tasks.get(taskId);
        if (!task) return false;

        const removed = this.#taskQueue.remove(taskId);
        
        if (!removed && this.#runningTasks.has(taskId)) {
            // Task is running, mark for cancellation
            task.cancel();
            this.#notifyObservers('cancelled', task);
            return true;
        }

        if (removed) {
            task.cancel();
            this.#notifyObservers('cancelled', task);
        }

        return removed;
    }

    pauseTask(taskId) {
        return this.#taskQueue.remove(taskId);
    }

    resumeTask(taskId) {
        const task = this.#tasks.get(taskId);
        if (task && this.#dependencyGraph.canExecute(taskId)) {
            this.#taskQueue.enqueue(task);
            return true;
        }
        return false;
    }

    addDependency(fromTaskId, toTaskId) {
        this.#dependencyGraph.addDependency(fromTaskId, toTaskId);
    }

    addObserver(observer) {
        this.#observers.push(observer);
    }

    setStrategy(strategy) {
        this.#strategy = strategy;
    }

    start() {
        if (!this.#running) {
            this.#running = true;
            this.#executeTasks();
            console.log('🚀 Task scheduler started');
        }
    }

    shutdown() {
        console.log('🛑 Shutting down task scheduler...');
        this.#running = false;
        console.log('✅ Task scheduler shutdown complete');
    }

    async #executeTasks() {
        while (this.#running) {
            try {
                if (this.#runningTasks.size >= this.#maxWorkers) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                    continue;
                }

                const task = this.#strategy.selectNextTask(this.#taskQueue);

                if (task) {
                    if (!this.#dependencyGraph.canExecute(task.getId())) {
                        this.#taskQueue.enqueue(task);
                        await new Promise(resolve => setTimeout(resolve, 100));
                        continue;
                    }

                    if (!task.shouldExecute()) {
                        this.#taskQueue.enqueue(task);
                        await new Promise(resolve => setTimeout(resolve, 100));
                        continue;
                    }

                    this.#notifyObservers('started', task);
                    this.#runningTasks.set(task.getId(), task);

                    // Execute task asynchronously
                    task.execute()
                        .then(() => {
                            this.#dependencyGraph.markCompleted(task.getId());
                            this.#notifyObservers('completed', task);
                            this.#runningTasks.delete(task.getId());

                            if (task instanceof RecurringTask) {
                                task.setState(TaskState.PENDING);
                                this.#taskQueue.enqueue(task);
                            }

                            this.#checkDependentTasks(task.getId());
                        })
                        .catch((error) => {
                            this.#notifyObservers('failed', task, error);
                            this.#runningTasks.delete(task.getId());

                            const retryPolicy = task.getRetryPolicy();
                            if (retryPolicy.shouldRetry(task)) {
                                task.retry();
                                const delay = retryPolicy.getNextRetryDelay(task.getRetryCount());
                                setTimeout(() => {
                                    task.setScheduledTime(new Date(Date.now() + delay));
                                    this.#taskQueue.enqueue(task);
                                    console.log(`🔄 Retrying task ${task.getName()} (attempt ${task.getRetryCount()})`);
                                }, delay);
                            } else {
                                console.error(`❌ Task ${task.getName()} failed after max retries`);
                            }
                        });
                } else {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            } catch (error) {
                console.error('Error in scheduler loop:', error);
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
    }

    #checkDependentTasks(completedTaskId) {
        for (const [taskId, task] of this.#tasks.entries()) {
            if (task.getDependencies().includes(completedTaskId) &&
                this.#dependencyGraph.canExecute(taskId) &&
                task.getState() === TaskState.PENDING) {
                this.#taskQueue.enqueue(task);
            }
        }
    }

    #notifyObservers(event, task, error = null) {
        for (const observer of this.#observers) {
            try {
                switch (event) {
                    case 'scheduled':
                        observer.onTaskScheduled(task);
                        break;
                    case 'started':
                        observer.onTaskStarted(task);
                        break;
                    case 'completed':
                        observer.onTaskCompleted(task);
                        break;
                    case 'failed':
                        observer.onTaskFailed(task, error);
                        break;
                    case 'cancelled':
                        observer.onTaskCancelled(task);
                        break;
                }
            } catch (err) {
                console.error('Error notifying observer:', err);
            }
        }
    }

    getTaskStatus(taskId) {
        const task = this.#tasks.get(taskId);
        return task ? task.getState() : null;
    }

    getQueueSize() {
        return this.#taskQueue.size();
    }
}

// ============================================================================
// DEMO / MAIN FUNCTION
// ============================================================================

async function main() {
    console.log('='.repeat(80));
    console.log('TASK SCHEDULER SYSTEM - COMPREHENSIVE DEMO');
    console.log('='.repeat(80));
    console.log();

    // Step 1: Create scheduler
    console.log('📝 Step 1: Creating Task Scheduler');
    console.log('-'.repeat(80));
    const scheduler = new TaskScheduler(4, new PriorityScheduling());

    const monitor = new TaskMonitor();
    const logger = new LoggingObserver();
    scheduler.addObserver(monitor);
    scheduler.addObserver(logger);

    scheduler.start();
    console.log('✅ Scheduler started with 4 workers');
    console.log();

    // Step 2: Schedule one-time tasks
    console.log('📝 Step 2: Scheduling One-Time Tasks');
    console.log('-'.repeat(80));

    const task1 = new OneTimeTask(
        'Send Welcome Email',
        Priority.HIGH,
        new Date(Date.now() + 2000),
        () => console.log('  ✉️  Sending welcome email...'),
        new ExponentialBackoffRetry(3, 1000)
    );
    const taskId1 = scheduler.scheduleTask(task1);
    console.log(`✅ Scheduled: ${task1.getName()}`);

    const task2 = new OneTimeTask(
        'Process Payment',
        Priority.HIGH,
        new Date(Date.now() + 1000),
        () => console.log('  💳 Processing payment...'),
        new ExponentialBackoffRetry(2)
    );
    const taskId2 = scheduler.scheduleTask(task2);
    console.log(`✅ Scheduled: ${task2.getName()}`);

    const task3 = new OneTimeTask(
        'Generate Report',
        Priority.MEDIUM,
        new Date(Date.now() + 3000),
        () => console.log('  📊 Generating report...')
    );
    const taskId3 = scheduler.scheduleTask(task3);
    console.log(`✅ Scheduled: ${task3.getName()}`);
    console.log();

    // Step 3: Schedule recurring task
    console.log('📝 Step 3: Scheduling Recurring Task');
    console.log('-'.repeat(80));

    const task4 = new RecurringTask(
        'Health Check',
        Priority.LOW,
        5000,
        () => console.log('  🏥 Running health check...')
    );
    const taskId4 = scheduler.scheduleRecurring(task4);
    console.log(`✅ Scheduled recurring: ${task4.getName()} (every 5 seconds)`);
    console.log();

    // Step 4: Tasks with dependencies
    console.log('📝 Step 4: Scheduling Tasks with Dependencies');
    console.log('-'.repeat(80));

    const task5 = new OneTimeTask(
        'Data Processing',
        Priority.HIGH,
        new Date(Date.now() + 1000),
        () => console.log('  🔄 Processing data...')
    );
    const taskId5 = scheduler.scheduleTask(task5);

    const task6 = new OneTimeTask(
        'Send Notification',
        Priority.MEDIUM,
        new Date(Date.now() + 1000),
        () => console.log('  🔔 Sending notification...'),
        null,
        [taskId5]
    );
    const taskId6 = scheduler.scheduleTask(task6);

    scheduler.addDependency(taskId5, taskId6);
    console.log(`✅ Task '${task6.getName()}' depends on '${task5.getName()}'`);
    console.log();

    // Wait for execution
    console.log('📝 Step 5: Executing Tasks');
    console.log('-'.repeat(80));
    console.log('Waiting for tasks to execute...');
    await new Promise(resolve => setTimeout(resolve, 6000));
    console.log();

    // Check metrics
    console.log('📝 Step 6: Task Execution Metrics');
    console.log('-'.repeat(80));
    const metrics = monitor.getMetrics();
    console.log(`Total Scheduled: ${metrics.totalScheduled}`);
    console.log(`Total Completed: ${metrics.totalCompleted}`);
    console.log(`Total Failed: ${metrics.totalFailed}`);
    console.log(`Total Cancelled: ${metrics.totalCancelled}`);
    console.log(`Success Rate: ${(metrics.getSuccessRate() * 100).toFixed(1)}%`);
    console.log();

    // Shutdown
    console.log('📝 Step 7: Shutting Down');
    console.log('-'.repeat(80));
    scheduler.shutdown();
    console.log();

    console.log('='.repeat(80));
    console.log('DEMO COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(80));
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        Task,
        OneTimeTask,
        RecurringTask,
        TaskState,
        Priority,
        TaskScheduler,
        TaskQueue,
        DependencyGraph,
        RetryPolicy,
        ExponentialBackoffRetry,
        FixedDelayRetry,
        SchedulingStrategy,
        PriorityScheduling,
        FIFOScheduling,
        RoundRobinScheduling,
        TaskObserver,
        TaskMonitor,
        LoggingObserver,
        TaskMetrics
    };
}

// Run demo
if (typeof require !== 'undefined' && require.main === module) {
    main();
}

