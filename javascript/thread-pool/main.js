/**
 * Thread Pool - Concurrent Task Execution System (Simplified for JavaScript)
 * 
 * This implements a Thread Pool using setTimeout to simulate concurrent execution.
 * Demonstrates all 6 design patterns with a working event loop based implementation.
 * 
 * Note: JavaScript is single-threaded, so this simulates concurrency using the event loop.
 * The Python version uses actual OS threads for true parallelism.
 * 
 * Design Patterns:
 * 1. Object Pool - Worker reuse
 * 2. Command - Task encapsulation
 * 3. Strategy - Rejection policies
 * 4. Observer - Pool monitoring
 * 5. Factory - Pool creation
 * 6. Singleton - Global pool instance
 * 
 * Author: LLD Solutions
 * Date: 2025
 */

// ============================================================================
// 1. COMMAND PATTERN
// ============================================================================

class Task {
    execute() { throw new Error('Must implement'); }
    getName() { throw new Error('Must implement'); }
}

class RunnableTask extends Task {
    constructor(func, ...args) {
        super();
        this.func = func;
        this.args = args;
        this.taskId = Math.random().toString(36).substr(2, 6);
    }

    execute() {
        return this.func(...this.args);
    }

    getName() {
        return `${this.func.name || 'task'}_${this.taskId}`;
    }
}

// ============================================================================
// 2. EXCEPTIONS
// ============================================================================

class RejectedExecutionError extends Error {
    constructor(message) {
        super(message);
        this.name = 'RejectedExecutionError';
    }
}

// ============================================================================
// 3. STRATEGY PATTERN - Rejection Policies
// ============================================================================

class RejectionPolicy {
    handleRejection(task, pool) { throw new Error('Must implement'); }
    getName() { throw new Error('Must implement'); }
}

class AbortPolicy extends RejectionPolicy {
    handleRejection(task, pool) {
        throw new RejectedExecutionError(
            `Task ${task.getName()} rejected. Queue: ${pool.getQueueSize()}`
        );
    }
    getName() { return 'AbortPolicy'; }
}

class DiscardPolicy extends RejectionPolicy {
    handleRejection(task, pool) {
        pool.rejectedTasks++;
    }
    getName() { return 'DiscardPolicy'; }
}

class DiscardOldestPolicy extends RejectionPolicy {
    handleRejection(task, pool) {
        if (pool.taskQueue.length > 0) {
            pool.taskQueue.shift();
            pool.rejectedTasks++;
            pool.taskQueue.push(task);
        }
    }
    getName() { return 'DiscardOldestPolicy'; }
}

class CallerRunsPolicy extends RejectionPolicy {
    handleRejection(task, pool) {
        try {
            const result = task.execute();
            pool.notifyObservers('task_completed', task, result);
        } catch (error) {
            pool.notifyObservers('task_failed', task, error);
        }
    }
    getName() { return 'CallerRunsPolicy'; }
}

// ============================================================================
// 4. OBSERVER PATTERN
// ============================================================================

class ThreadPoolObserver {
    onTaskSubmitted(task) {}
    onTaskStarted(task, workerId) {}
    onTaskCompleted(task, result) {}
    onTaskFailed(task, error) {}
}

class LoggingObserver extends ThreadPoolObserver {
    constructor(verbose = false) {
        super();
        this.verbose = verbose;
    }

    onTaskSubmitted(task) {
        if (this.verbose) console.log(`📝 Task submitted: ${task.getName()}`);
    }

    onTaskStarted(task, workerId) {
        if (this.verbose) console.log(`▶️  Task started: ${task.getName()} on worker ${workerId}`);
    }

    onTaskCompleted(task, result) {
        console.log(`✅ Task completed: ${task.getName()}`);
    }

    onTaskFailed(task, error) {
        console.log(`❌ Task failed: ${task.getName()} - ${error.name}: ${error.message}`);
    }
}

class MetricsObserver extends ThreadPoolObserver {
    constructor() {
        super();
        this.successfulTasks = 0;
        this.failedTasks = 0;
    }

    onTaskCompleted(task, result) {
        this.successfulTasks++;
    }

    onTaskFailed(task, error) {
        this.failedTasks++;
    }

    getStats() {
        return {
            successful: this.successfulTasks,
            failed: this.failedTasks,
            total: this.successfulTasks + this.failedTasks
        };
    }
}

// ============================================================================
// 5. OBJECT POOL PATTERN - Thread Pool
// ============================================================================

const PoolState = {
    RUNNING: 'RUNNING',
    SHUTDOWN: 'SHUTDOWN',
    TERMINATED: 'TERMINATED'
};

class ThreadPool {
    constructor(poolSize = 5, maxQueueSize = 0, rejectionPolicy = null) {
        this.poolSize = poolSize;
        this.maxQueueSize = maxQueueSize;
        this.taskQueue = [];
        this.rejectionPolicy = rejectionPolicy || new AbortPolicy();
        this.state = PoolState.RUNNING;
        
        this.submittedTasks = 0;
        this.completedTasks = 0;
        this.rejectedTasks = 0;
        this.activeWorkers = 0;
        
        this.observers = [];
    }

    submit(task) {
        if (this.state !== PoolState.RUNNING) {
            throw new RejectedExecutionError(`Pool is ${this.state}`);
        }

        if (this.maxQueueSize > 0 && this.taskQueue.length >= this.maxQueueSize) {
            this.rejectionPolicy.handleRejection(task, this);
            return;
        }

        this.taskQueue.push(task);
        this.submittedTasks++;
        this.notifyObservers('task_submitted', task);
        
        // Process immediately if workers available
        this._processNext();
    }

    _processNext() {
        if (this.activeWorkers >= this.poolSize || this.taskQueue.length === 0) {
            return;
        }

        const task = this.taskQueue.shift();
        const workerId = this.activeWorkers++;

        this.notifyObservers('task_started', task, workerId);

        // Simulate async execution
        setImmediate(() => {
            try {
                const result = task.execute();
                this.notifyObservers('task_completed', task, result);
                this.completedTasks++;
            } catch (error) {
                this.notifyObservers('task_failed', task, error);
            } finally {
                this.activeWorkers--;
                // Process next task (even during shutdown to drain queue)
                if (this.taskQueue.length > 0) {
                    this._processNext();
                }
            }
        });
    }

    async shutdown() {
        this.state = PoolState.SHUTDOWN;
        
        // Wait for all tasks to complete
        while (this.taskQueue.length > 0 || this.activeWorkers > 0) {
            await new Promise(resolve => setTimeout(resolve, 10));
        }
    }

    shutdownNow() {
        this.state = PoolState.TERMINATED;
        const pending = [...this.taskQueue];
        this.taskQueue = [];
        return pending;
    }

    getActiveCount() { return this.activeWorkers; }
    getQueueSize() { return this.taskQueue.length; }
    getCompletedCount() { return this.completedTasks; }

    getStats() {
        return {
            poolSize: this.poolSize,
            activeThreads: this.activeWorkers,
            queueSize: this.taskQueue.length,
            submittedTasks: this.submittedTasks,
            completedTasks: this.completedTasks,
            rejectedTasks: this.rejectedTasks,
            state: this.state,
            rejectionPolicy: this.rejectionPolicy.getName()
        };
    }

    registerObserver(observer) { this.observers.push(observer); }
    removeObserver(observer) { 
        const idx = this.observers.indexOf(observer);
        if (idx > -1) this.observers.splice(idx, 1);
    }

    notifyObservers(event, ...args) {
        for (const observer of this.observers) {
            try {
                if (event === 'task_submitted') observer.onTaskSubmitted(...args);
                else if (event === 'task_started') observer.onTaskStarted(...args);
                else if (event === 'task_completed') observer.onTaskCompleted(...args);
                else if (event === 'task_failed') observer.onTaskFailed(...args);
            } catch (e) {}
        }
    }

    toString() { return `ThreadPool(size=${this.poolSize}, state=${this.state})`; }
}

// ============================================================================
// 6. FACTORY PATTERN
// ============================================================================

class ThreadPoolFactory {
    static createFixedPool(poolSize, maxQueueSize = 0) {
        return new ThreadPool(poolSize, maxQueueSize);
    }

    static createSingleThreadExecutor() {
        return new ThreadPool(1, 0);
    }

    static createBoundedPool(poolSize) {
        return new ThreadPool(poolSize, poolSize * 2, new AbortPolicy());
    }

    static createBestEffortPool(poolSize) {
        return new ThreadPool(poolSize, poolSize * 5, new DiscardPolicy());
    }
}

// ============================================================================
// 7. SINGLETON PATTERN
// ============================================================================

class ThreadPoolSingleton {
    static _instance = null;

    static getInstance() {
        if (!ThreadPoolSingleton._instance) {
            const os = require('os');
            ThreadPoolSingleton._instance = new ThreadPool(os.cpus().length * 2);
        }
        return ThreadPoolSingleton._instance;
    }

    static reset() {
        if (ThreadPoolSingleton._instance) {
            ThreadPoolSingleton._instance.shutdownNow();
        }
        ThreadPoolSingleton._instance = null;
    }
}

// ============================================================================
// DEMONSTRATIONS
// ============================================================================

async function demoBasicOperations() {
    console.log('='.repeat(70));
    console.log('DEMO 1: Basic Operations');
    console.log('='.repeat(70));

    const pool = new ThreadPool(3, 20);
    pool.registerObserver(new LoggingObserver(false));

    console.log('\n📝 Submitting 10 tasks...');
    
    for (let i = 0; i < 10; i++) {
        pool.submit(new RunnableTask((x) => x * x, i));
    }

    console.log(`\n📊 Stats: ${JSON.stringify(pool.getStats())}`);
    
    await pool.shutdown();
    console.log('\n✅ Pool shutdown complete\n');
}

async function demoRejectionPolicies() {
    console.log('='.repeat(70));
    console.log('DEMO 2: Rejection Policies');
    console.log('='.repeat(70));

    // Abort Policy
    console.log('\n1️⃣  Abort Policy:');
    let pool = new ThreadPool(1, 2, new AbortPolicy());
    
    try {
        for (let i = 0; i < 5; i++) {
            pool.submit(new RunnableTask((x) => x, i));
        }
    } catch (error) {
        console.log(`   ❌ Task rejected (expected): ${error.message}`);
    }
    pool.shutdownNow();

    // Discard Policy
    console.log('\n2️⃣  Discard Policy:');
    pool = new ThreadPool(1, 2, new DiscardPolicy());
    for (let i = 0; i < 5; i++) {
        pool.submit(new RunnableTask((x) => x, i));
        console.log(`   Submitted task ${i}`);
    }
    console.log(`   Rejected: ${pool.rejectedTasks}`);
    await pool.shutdown();

    // Caller Runs Policy
    console.log('\n3️⃣  Caller Runs Policy:');
    pool = new ThreadPool(1, 1, new CallerRunsPolicy());
    pool.registerObserver(new LoggingObserver(false));
    for (let i = 0; i < 3; i++) {
        pool.submit(new RunnableTask((x) => x * 2, i));
    }
    await pool.shutdown();
    console.log();
}

async function demoObserverPattern() {
    console.log('='.repeat(70));
    console.log('DEMO 3: Observer Pattern');
    console.log('='.repeat(70));

    const pool = new ThreadPool(2);
    const logging = new LoggingObserver(true);
    const metrics = new MetricsObserver();
    
    pool.registerObserver(logging);
    pool.registerObserver(metrics);

    console.log('\n📝 Submitting tasks...');

    for (let i = 0; i < 3; i++) {
        pool.submit(new RunnableTask((x) => x * 2, i));
    }

    for (let i = 0; i < 2; i++) {
        pool.submit(new RunnableTask((x) => { throw new Error(`Error ${x}`); }, i));
    }

    await pool.shutdown();
    console.log(`\n📊 Metrics: ${JSON.stringify(metrics.getStats())}\n`);
}

async function demoFactoryPattern() {
    console.log('='.repeat(70));
    console.log('DEMO 4: Factory Pattern');
    console.log('='.repeat(70));

    console.log('\n🏭 Fixed Pool:');
    const fixed = ThreadPoolFactory.createFixedPool(5);
    console.log(`   ${fixed}`);
    fixed.shutdownNow();

    console.log('\n🏭 Single Thread Executor:');
    const single = ThreadPoolFactory.createSingleThreadExecutor();
    console.log(`   ${single}`);
    single.shutdownNow();

    console.log('\n🏭 Bounded Pool:');
    const bounded = ThreadPoolFactory.createBoundedPool(3);
    console.log(`   ${bounded}, Max queue: ${bounded.maxQueueSize}`);
    bounded.shutdownNow();

    console.log('\n🏭 Best Effort Pool:');
    const best = ThreadPoolFactory.createBestEffortPool(2);
    console.log(`   ${best}, Policy: ${best.rejectionPolicy.getName()}\n`);
    best.shutdownNow();
}

async function demoSingletonPattern() {
    console.log('='.repeat(70));
    console.log('DEMO 5: Singleton Pattern');
    console.log('='.repeat(70));

    const pool1 = ThreadPoolSingleton.getInstance();
    const pool2 = ThreadPoolSingleton.getInstance();

    console.log('\n🔒 Singleton instances:');
    console.log(`   Same instance: ${pool1 === pool2}`);
    
    pool1.submit(new RunnableTask((x) => x * 2, 42));
    console.log(`   Submitted via pool1, pool2 queue: ${pool2.getQueueSize()}`);
    
    ThreadPoolSingleton.reset();
    console.log();
}

async function demoPerformance() {
    console.log('='.repeat(70));
    console.log('DEMO 6: Performance');
    console.log('='.repeat(70));

    const pool = new ThreadPool(10);
    const metrics = new MetricsObserver();
    pool.registerObserver(metrics);

    console.log('\n⏱️  Submitting 100 tasks...');

    const start = Date.now();
    
    for (let i = 0; i < 100; i++) {
        pool.submit(new RunnableTask((x) => {
            let sum = 0;
            for (let j = 0; j < 1000; j++) sum += j * x;
            return sum;
        }, i));
    }

    await pool.shutdown();
    const elapsed = (Date.now() - start) / 1000;

    console.log(`\n📊 Results:`);
    console.log(`   Total time: ${elapsed.toFixed(2)}s`);
    console.log(`   Completed: ${pool.getCompletedCount()}`);
    console.log(`   Throughput: ${(pool.getCompletedCount() / elapsed).toFixed(2)} tasks/sec`);
    console.log(`   Metrics: ${JSON.stringify(metrics.getStats())}\n`);
}

async function main() {
    console.log('\n' + '🎯'.repeat(35));
    console.log('THREAD POOL - COMPREHENSIVE DEMONSTRATION');
    console.log('🎯'.repeat(35));
    console.log('\nDesign Patterns:');
    console.log('1. Object Pool - Worker reuse');
    console.log('2. Command - Task encapsulation');
    console.log('3. Strategy - Rejection policies');
    console.log('4. Observer - Monitoring');
    console.log('5. Factory - Pool creation');
    console.log('6. Singleton - Global instance\n');

    await demoBasicOperations();
    await demoRejectionPolicies();
    await demoObserverPattern();
    await demoFactoryPattern();
    await demoSingletonPattern();
    await demoPerformance();

    console.log('='.repeat(70));
    console.log('✅ ALL DEMONSTRATIONS COMPLETED!');
    console.log('='.repeat(70));
    console.log('\n📊 Summary:');
    console.log('   - 6 Design Patterns implemented');
    console.log('   - 4 Rejection policies');
    console.log('   - Production-ready implementation');
    console.log('='.repeat(70) + '\n');
}

main().catch(console.error);
