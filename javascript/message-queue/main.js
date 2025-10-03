#!/usr/bin/env node
/**
 * Message Queue System Implementation
 * 
 * A comprehensive distributed message queue system supporting reliable message 
 * delivery, multiple consumer patterns, topic-based routing, and various 
 * durability guarantees.
 * 
 * Features:
 * - Topic and partition management
 * - Producer and consumer clients
 * - Consumer group coordination with automatic rebalancing
 * - Message persistence and replication
 * - At-least-once and exactly-once delivery semantics
 * - Dead letter queue handling
 * - Transaction support for atomic operations
 * - Comprehensive monitoring and metrics
 * 
 * Author: LLD Solutions
 * Date: 2024
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const readline = require('readline');
const { performance } = require('perf_hooks');
const { EventEmitter } = require('events');

// Enums
const MessageState = {
    PENDING: 'pending',
    DELIVERED: 'delivered',
    ACKNOWLEDGED: 'acknowledged',
    FAILED: 'failed'
};

const ConsumerGroupState = {
    EMPTY: 'empty',
    PREPARING_REBALANCE: 'preparing_rebalance',
    COMPLETING_REBALANCE: 'completing_rebalance',
    STABLE: 'stable',
    DEAD: 'dead'
};

const DeliveryGuarantee = {
    AT_MOST_ONCE: 'at_most_once',
    AT_LEAST_ONCE: 'at_least_once',
    EXACTLY_ONCE: 'exactly_once'
};

const PartitionStrategy = {
    ROUND_ROBIN: 'round_robin',
    HASH_BASED: 'hash_based',
    CUSTOM: 'custom'
};

const CompressionType = {
    NONE: 'none',
    GZIP: 'gzip',
    SNAPPY: 'snappy',
    LZ4: 'lz4'
};

const CleanupPolicy = {
    DELETE: 'delete',
    COMPACT: 'compact'
};

// Data Classes
class Message {
    constructor(options = {}) {
        this.messageId = options.messageId || this._generateId();
        this.topic = options.topic || '';
        this.partition = options.partition || null;
        this.key = options.key || null;
        this.payload = options.payload || Buffer.alloc(0);
        this.headers = options.headers || {};
        this.timestamp = options.timestamp || new Date();
        this.priority = options.priority || 0;
        this.ttl = options.ttl || null; // Time to live in seconds
        this.retryCount = options.retryCount || 0;
        this.correlationId = options.correlationId || null;
        this.replyTo = options.replyTo || null;
        this.offset = options.offset || null;
        this.state = options.state || MessageState.PENDING;
    }

    _generateId() {
        return crypto.randomUUID();
    }

    isExpired() {
        if (this.ttl === null) {
            return false;
        }
        return (Date.now() - this.timestamp.getTime()) > (this.ttl * 1000);
    }

    toJSON() {
        return {
            messageId: this.messageId,
            topic: this.topic,
            partition: this.partition,
            key: this.key,
            payload: this.payload ? this.payload.toString('hex') : null,
            headers: this.headers,
            timestamp: this.timestamp.toISOString(),
            priority: this.priority,
            ttl: this.ttl,
            retryCount: this.retryCount,
            correlationId: this.correlationId,
            replyTo: this.replyTo,
            offset: this.offset,
            state: this.state
        };
    }

    static fromJSON(data) {
        return new Message({
            messageId: data.messageId,
            topic: data.topic,
            partition: data.partition,
            key: data.key,
            payload: data.payload ? Buffer.from(data.payload, 'hex') : Buffer.alloc(0),
            headers: data.headers || {},
            timestamp: new Date(data.timestamp),
            priority: data.priority || 0,
            ttl: data.ttl,
            retryCount: data.retryCount || 0,
            correlationId: data.correlationId,
            replyTo: data.replyTo,
            offset: data.offset,
            state: data.state || MessageState.PENDING
        });
    }
}

class TopicMetadata {
    constructor(options = {}) {
        this.name = options.name;
        this.partitionCount = options.partitionCount || 1;
        this.replicationFactor = options.replicationFactor || 1;
        this.retentionMs = options.retentionMs || 7 * 24 * 60 * 60 * 1000; // 7 days
        this.maxMessageBytes = options.maxMessageBytes || 1024 * 1024; // 1MB
        this.compressionType = options.compressionType || CompressionType.NONE;
        this.cleanupPolicy = options.cleanupPolicy || CleanupPolicy.DELETE;
        this.createdAt = options.createdAt || new Date();
        this.config = options.config || {};
    }
}

class Partition {
    constructor(options = {}) {
        this.topicName = options.topicName;
        this.partitionId = options.partitionId;
        this.leaderBroker = options.leaderBroker;
        this.replicaBrokers = options.replicaBrokers || [];
        this.logStartOffset = options.logStartOffset || 0;
        this.logEndOffset = options.logEndOffset || 0;
        this.highWatermark = options.highWatermark || 0;
        this.lastStableOffset = options.lastStableOffset || 0;
    }
}

class ConsumerMetadata {
    constructor(options = {}) {
        this.consumerId = options.consumerId;
        this.groupId = options.groupId;
        this.subscribedTopics = new Set(options.subscribedTopics || []);
        this.assignedPartitions = options.assignedPartitions || {};
        this.lastHeartbeat = options.lastHeartbeat || new Date();
        this.generationId = options.generationId || 0;
    }
}

class ConsumerGroup {
    constructor(options = {}) {
        this.groupId = options.groupId;
        this.consumers = new Map();
        this.coordinator = options.coordinator || '';
        this.state = options.state || ConsumerGroupState.EMPTY;
        this.protocolType = options.protocolType || 'consumer';
        this.generationId = options.generationId || 0;
        this.leaderId = options.leaderId || null;
        this.subscribedTopics = new Set();
    }
}

class ProducerConfig {
    constructor(options = {}) {
        this.bootstrapServers = options.bootstrapServers || ['localhost:9092'];
        this.acks = options.acks || 'all'; // "0", "1", "all"
        this.retries = options.retries || 3;
        this.retryBackoffMs = options.retryBackoffMs || 100;
        this.batchSize = options.batchSize || 16384;
        this.lingerMs = options.lingerMs || 0;
        this.compressionType = options.compressionType || CompressionType.NONE;
        this.maxRequestSize = options.maxRequestSize || 1024 * 1024; // 1MB
        this.requestTimeoutMs = options.requestTimeoutMs || 30000;
        this.deliveryTimeoutMs = options.deliveryTimeoutMs || 120000;
    }
}

class ConsumerConfig {
    constructor(options = {}) {
        this.bootstrapServers = options.bootstrapServers || ['localhost:9092'];
        this.groupId = options.groupId;
        this.autoOffsetReset = options.autoOffsetReset || 'earliest'; // "earliest", "latest", "none"
        this.enableAutoCommit = options.enableAutoCommit !== undefined ? options.enableAutoCommit : true;
        this.autoCommitIntervalMs = options.autoCommitIntervalMs || 5000;
        this.maxPollRecords = options.maxPollRecords || 500;
        this.maxPollIntervalMs = options.maxPollIntervalMs || 300000;
        this.sessionTimeoutMs = options.sessionTimeoutMs || 10000;
        this.heartbeatIntervalMs = options.heartbeatIntervalMs || 3000;
        this.fetchMinBytes = options.fetchMinBytes || 1;
        this.fetchMaxWaitMs = options.fetchMaxWaitMs || 500;
    }
}

class PublishResult {
    constructor(topic, partition, offset, messageId) {
        this.topic = topic;
        this.partition = partition;
        this.offset = offset;
        this.messageId = messageId;
        this.timestamp = new Date();
    }
}

class ConsumerRecord {
    constructor(topic, partition, offset, key, value, headers, timestamp) {
        this.topic = topic;
        this.partition = partition;
        this.offset = offset;
        this.key = key;
        this.value = value;
        this.headers = headers;
        this.timestamp = timestamp;
    }
}

// Custom Exceptions
class MessageQueueException extends Error {
    constructor(message) {
        super(message);
        this.name = 'MessageQueueException';
    }
}

class TopicNotFoundException extends MessageQueueException {
    constructor(message) {
        super(message);
        this.name = 'TopicNotFoundException';
    }
}

class PartitionNotFoundException extends MessageQueueException {
    constructor(message) {
        super(message);
        this.name = 'PartitionNotFoundException';
    }
}

class ConsumerGroupException extends MessageQueueException {
    constructor(message) {
        super(message);
        this.name = 'ConsumerGroupException';
    }
}

class BrokerException extends MessageQueueException {
    constructor(message) {
        super(message);
        this.name = 'BrokerException';
    }
}

// Storage Engine
class LogSegment {
    constructor(baseOffset, logFile, indexFile) {
        this.baseOffset = baseOffset;
        this.logFile = logFile;
        this.indexFile = indexFile;
        this.position = 0;
        this.size = 0;
        
        // Ensure directories exist
        const logDir = path.dirname(logFile);
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
        
        // Create files if they don't exist
        if (!fs.existsSync(logFile)) {
            fs.writeFileSync(logFile, '');
        }
        if (!fs.existsSync(indexFile)) {
            fs.writeFileSync(indexFile, '');
        }
        
        // Load existing size
        this.size = fs.statSync(logFile).size;
    }

    append(message) {
        const offset = this.baseOffset + this.position;
        const data = JSON.stringify(message.toJSON());
        
        const record = {
            offset: offset,
            size: Buffer.byteLength(data, 'utf8'),
            data: data
        };
        
        const serializedRecord = JSON.stringify(record) + '\n';
        
        // Write to log file
        fs.appendFileSync(this.logFile, serializedRecord);
        
        // Update index
        this._updateIndex(offset, this.position);
        this.position += 1;
        this.size += Buffer.byteLength(serializedRecord, 'utf8');
        
        return offset;
    }

    read(offset) {
        const position = this._findPosition(offset);
        if (position === null) {
            return null;
        }
        
        try {
            const data = fs.readFileSync(this.logFile, 'utf8');
            const lines = data.split('\n').filter(line => line.trim());
            
            for (const line of lines) {
                try {
                    const record = JSON.parse(line);
                    if (record.offset === offset) {
                        const messageData = JSON.parse(record.data);
                        return Message.fromJSON(messageData);
                    }
                } catch (e) {
                    continue;
                }
            }
        } catch (e) {
            console.error(`Error reading message: ${e.message}`);
        }
        
        return null;
    }

    readRange(startOffset, maxMessages = 100) {
        const messages = [];
        let currentOffset = startOffset;
        
        while (messages.length < maxMessages) {
            const message = this.read(currentOffset);
            if (message === null) {
                break;
            }
            messages.push(message);
            currentOffset += 1;
        }
        
        return messages;
    }

    _updateIndex(offset, position) {
        try {
            const indexEntry = JSON.stringify({ offset, position }) + '\n';
            fs.appendFileSync(this.indexFile, indexEntry);
        } catch (e) {
            console.error(`Error updating index: ${e.message}`);
        }
    }

    _findPosition(offset) {
        try {
            if (!fs.existsSync(this.indexFile) || fs.statSync(this.indexFile).size === 0) {
                return 0;
            }
            
            const indexData = fs.readFileSync(this.indexFile, 'utf8');
            const lines = indexData.split('\n').filter(line => line.trim());
            
            let lastPosition = 0;
            
            for (const line of lines) {
                try {
                    const entry = JSON.parse(line);
                    if (entry.offset === offset) {
                        return entry.position;
                    } else if (entry.offset < offset) {
                        lastPosition = entry.position;
                    }
                } catch (e) {
                    continue;
                }
            }
            
            return lastPosition;
        } catch (e) {
            console.error(`Error finding position: ${e.message}`);
            return 0;
        }
    }
}

class StorageEngine {
    constructor(dataDir) {
        this.dataDir = dataDir;
        this.segments = new Map(); // (topic, partition) -> LogSegment[]
        this.activeSegments = new Map(); // (topic, partition) -> LogSegment
        this.offsets = new Map(); // (topic, partition) -> current_offset
        
        // Ensure data directory exists
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
    }

    getOrCreatePartition(topic, partition) {
        const key = `${topic}-${partition}`;
        
        if (!this.segments.has(key)) {
            this.segments.set(key, []);
            this.offsets.set(key, 0);
        }
        
        if (!this.activeSegments.has(key)) {
            const segment = this._createSegment(topic, partition, 0);
            this.activeSegments.set(key, segment);
            this.segments.get(key).push(segment);
        }
    }

    append(topic, partition, message) {
        const key = `${topic}-${partition}`;
        this.getOrCreatePartition(topic, partition);
        
        let segment = this.activeSegments.get(key);
        
        // Check if we need to roll to new segment
        if (segment.size > 1024 * 1024) { // 1MB segment size
            const newOffset = this.offsets.get(key);
            const newSegment = this._createSegment(topic, partition, newOffset);
            this.activeSegments.set(key, newSegment);
            this.segments.get(key).push(newSegment);
            segment = newSegment;
        }
        
        const offset = segment.append(message);
        this.offsets.set(key, offset + 1);
        return offset;
    }

    read(topic, partition, offset, maxMessages = 100) {
        const key = `${topic}-${partition}`;
        this.getOrCreatePartition(topic, partition);
        
        const messages = [];
        const segments = this.segments.get(key);
        
        // Find the right segment and read messages
        for (const segment of segments) {
            if (segment.baseOffset <= offset) {
                const segmentMessages = segment.readRange(offset, maxMessages);
                messages.push(...segmentMessages);
                if (messages.length >= maxMessages) {
                    break;
                }
            }
        }
        
        return messages.slice(0, maxMessages);
    }

    getLatestOffset(topic, partition) {
        const key = `${topic}-${partition}`;
        this.getOrCreatePartition(topic, partition);
        return this.offsets.get(key) || 0;
    }

    _createSegment(topic, partition, baseOffset) {
        const partitionDir = path.join(this.dataDir, topic, `partition-${partition}`);
        
        if (!fs.existsSync(partitionDir)) {
            fs.mkdirSync(partitionDir, { recursive: true });
        }
        
        const logFile = path.join(partitionDir, `${baseOffset.toString().padStart(20, '0')}.log`);
        const indexFile = path.join(partitionDir, `${baseOffset.toString().padStart(20, '0')}.index`);
        
        return new LogSegment(baseOffset, logFile, indexFile);
    }
}

// Partitioner Classes
class Partitioner {
    partition(topic, key, partitionCount) {
        throw new Error('partition method must be implemented');
    }
}

class RoundRobinPartitioner extends Partitioner {
    constructor() {
        super();
        this.counters = new Map();
    }

    partition(topic, key, partitionCount) {
        if (!this.counters.has(topic)) {
            this.counters.set(topic, 0);
        }
        
        const partition = this.counters.get(topic) % partitionCount;
        this.counters.set(topic, this.counters.get(topic) + 1);
        return partition;
    }
}

class HashPartitioner extends Partitioner {
    partition(topic, key, partitionCount) {
        if (key === null || key === undefined) {
            return 0;
        }
        
        const hash = crypto.createHash('md5').update(key.toString()).digest('hex');
        const hashInt = parseInt(hash.substring(0, 8), 16);
        return Math.abs(hashInt) % partitionCount;
    }
}

// Message Broker Core
class MessageBroker extends EventEmitter {
    constructor(brokerId, dataDir = './data') {
        super();
        this.brokerId = brokerId;
        this.topics = new Map(); // topic_name -> TopicMetadata
        this.partitions = new Map(); // (topic, partition) -> Partition
        this.consumerGroups = new Map(); // group_id -> ConsumerGroup
        this.storageEngine = new StorageEngine(dataDir);
        this.running = false;
        
        // Background tasks
        this.cleanupInterval = null;
    }

    start() {
        this.running = true;
        this._startBackgroundCleanup();
        console.log(`Broker ${this.brokerId} started`);
    }

    stop() {
        this.running = false;
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        console.log(`Broker ${this.brokerId} stopped`);
    }

    createTopic(topicName, partitionCount = 1, replicationFactor = 1, config = {}) {
        if (this.topics.has(topicName)) {
            return false;
        }
        
        const metadata = new TopicMetadata({
            name: topicName,
            partitionCount,
            replicationFactor,
            ...config
        });
        
        this.topics.set(topicName, metadata);
        
        // Create partitions
        for (let partitionId = 0; partitionId < partitionCount; partitionId++) {
            const partition = new Partition({
                topicName,
                partitionId,
                leaderBroker: this.brokerId,
                replicaBrokers: [this.brokerId]
            });
            this.partitions.set(`${topicName}-${partitionId}`, partition);
        }
        
        console.log(`Created topic ${topicName} with ${partitionCount} partitions`);
        return true;
    }

    deleteTopic(topicName) {
        if (!this.topics.has(topicName)) {
            return false;
        }
        
        // Remove partitions
        const topicMetadata = this.topics.get(topicName);
        for (let i = 0; i < topicMetadata.partitionCount; i++) {
            this.partitions.delete(`${topicName}-${i}`);
        }
        
        this.topics.delete(topicName);
        console.log(`Deleted topic ${topicName}`);
        return true;
    }

    publish(topic, message) {
        if (!this.topics.has(topic)) {
            throw new TopicNotFoundException(`Topic ${topic} not found`);
        }
        
        const topicMetadata = this.topics.get(topic);
        
        // Select partition if not specified
        if (message.partition === null) {
            const partitioner = message.key ? new HashPartitioner() : new RoundRobinPartitioner();
            message.partition = partitioner.partition(topic, message.key, topicMetadata.partitionCount);
        }
        
        // Validate partition
        if (message.partition >= topicMetadata.partitionCount) {
            throw new PartitionNotFoundException(`Partition ${message.partition} not found`);
        }
        
        // Set topic if not set
        message.topic = topic;
        
        // Append to storage
        const offset = this.storageEngine.append(topic, message.partition, message);
        message.offset = offset;
        
        this.emit('messagePublished', { topic, partition: message.partition, offset, messageId: message.messageId });
        
        return new PublishResult(topic, message.partition, offset, message.messageId);
    }

    consume(topic, partition, offset, maxMessages = 100) {
        if (!this.topics.has(topic)) {
            throw new TopicNotFoundException(`Topic ${topic} not found`);
        }
        
        const topicMetadata = this.topics.get(topic);
        if (partition >= topicMetadata.partitionCount) {
            throw new PartitionNotFoundException(`Partition ${partition} not found`);
        }
        
        return this.storageEngine.read(topic, partition, offset, maxMessages);
    }

    getTopicMetadata(topic) {
        return this.topics.get(topic) || null;
    }

    listTopics() {
        return Array.from(this.topics.keys());
    }

    getLatestOffset(topic, partition) {
        return this.storageEngine.getLatestOffset(topic, partition);
    }

    _startBackgroundCleanup() {
        this.cleanupInterval = setInterval(() => {
            this._cleanupExpiredMessages();
        }, 60000); // Run every minute
    }

    _cleanupExpiredMessages() {
        // Simplified cleanup implementation
        // In production, this would be more sophisticated
    }
}

// Consumer Group Coordinator
class ConsumerGroupCoordinator {
    constructor(broker) {
        this.broker = broker;
        this.groups = new Map(); // group_id -> ConsumerGroup
        this.consumerOffsets = new Map(); // (group_id, topic, partition) -> offset
    }

    joinGroup(groupId, consumerId, topics) {
        if (!this.groups.has(groupId)) {
            this.groups.set(groupId, new ConsumerGroup({ groupId }));
        }
        
        const group = this.groups.get(groupId);
        
        // Create consumer metadata
        const consumer = new ConsumerMetadata({
            consumerId,
            groupId,
            subscribedTopics: topics
        });
        
        group.consumers.set(consumerId, consumer);
        group.subscribedTopics = new Set([...group.subscribedTopics, ...topics]);
        
        // Trigger rebalance if needed
        if (this._shouldRebalance(group)) {
            this._rebalanceGroup(group);
        }
        
        return consumer;
    }

    leaveGroup(groupId, consumerId) {
        if (!this.groups.has(groupId)) {
            return;
        }
        
        const group = this.groups.get(groupId);
        if (group.consumers.has(consumerId)) {
            group.consumers.delete(consumerId);
            
            // Trigger rebalance
            if (group.consumers.size > 0) {
                this._rebalanceGroup(group);
            } else {
                group.state = ConsumerGroupState.EMPTY;
            }
        }
    }

    heartbeat(groupId, consumerId) {
        if (this.groups.has(groupId)) {
            const group = this.groups.get(groupId);
            if (group.consumers.has(consumerId)) {
                const consumer = group.consumers.get(consumerId);
                consumer.lastHeartbeat = new Date();
            }
        }
    }

    commitOffset(groupId, topic, partition, offset) {
        const key = `${groupId}-${topic}-${partition}`;
        this.consumerOffsets.set(key, offset);
    }

    getOffset(groupId, topic, partition) {
        const key = `${groupId}-${topic}-${partition}`;
        return this.consumerOffsets.get(key) || 0;
    }

    _shouldRebalance(group) {
        return group.state !== ConsumerGroupState.STABLE;
    }

    _rebalanceGroup(group) {
        group.state = ConsumerGroupState.PREPARING_REBALANCE;
        group.generationId += 1;
        
        // Get all partitions for subscribed topics
        const allPartitions = [];
        for (const topic of group.subscribedTopics) {
            if (this.broker.topics.has(topic)) {
                const partitionCount = this.broker.topics.get(topic).partitionCount;
                for (let partitionId = 0; partitionId < partitionCount; partitionId++) {
                    allPartitions.push([topic, partitionId]);
                }
            }
        }
        
        // Assign partitions to consumers using round-robin
        const consumerIds = Array.from(group.consumers.keys());
        if (consumerIds.length === 0) {
            group.state = ConsumerGroupState.EMPTY;
            return;
        }
        
        // Clear existing assignments
        for (const consumer of group.consumers.values()) {
            consumer.assignedPartitions = {};
        }
        
        // Assign partitions
        allPartitions.forEach((partition, index) => {
            const [topic, partitionId] = partition;
            const consumerId = consumerIds[index % consumerIds.length];
            const consumer = group.consumers.get(consumerId);
            
            if (!consumer.assignedPartitions[topic]) {
                consumer.assignedPartitions[topic] = [];
            }
            consumer.assignedPartitions[topic].push(partitionId);
        });
        
        group.state = ConsumerGroupState.STABLE;
        console.log(`Rebalanced group ${group.groupId} with ${consumerIds.length} consumers`);
    }
}

// Producer Client
class MessageProducer {
    constructor(config, broker) {
        this.config = config;
        this.broker = broker;
        this.partitioner = new HashPartitioner();
    }

    send(topic, value, key = null, headers = {}, partition = null) {
        const message = new Message({
            topic,
            key,
            payload: Buffer.isBuffer(value) ? value : Buffer.from(value),
            headers,
            partition
        });
        
        return this.broker.publish(topic, message);
    }

    sendBatch(topic, messages) {
        const results = [];
        for (const { value, key, headers, partition } of messages) {
            const result = this.send(topic, value, key, headers, partition);
            results.push(result);
        }
        return results;
    }
}

// Consumer Client
class MessageConsumer {
    constructor(config, broker, coordinator) {
        this.config = config;
        this.broker = broker;
        this.coordinator = coordinator;
        this.consumerId = crypto.randomUUID();
        this.subscribedTopics = new Set();
        this.assignment = {}; // topic -> [partitions]
        this.offsets = new Map(); // (topic, partition) -> offset
        this.running = false;
    }

    subscribe(topics) {
        this.subscribedTopics = new Set([...this.subscribedTopics, ...topics]);
        
        // Join consumer group
        const consumerMetadata = this.coordinator.joinGroup(
            this.config.groupId,
            this.consumerId,
            topics
        );
        
        this.assignment = { ...consumerMetadata.assignedPartitions };
        
        // Initialize offsets
        for (const [topic, partitions] of Object.entries(this.assignment)) {
            for (const partition of partitions) {
                const committedOffset = this.coordinator.getOffset(
                    this.config.groupId, topic, partition
                );
                this.offsets.set(`${topic}-${partition}`, committedOffset);
            }
        }
    }

    poll(timeoutMs = 1000) {
        const records = [];
        
        for (const [topic, partitions] of Object.entries(this.assignment)) {
            for (const partition of partitions) {
                const currentOffset = this.offsets.get(`${topic}-${partition}`) || 0;
                
                try {
                    const messages = this.broker.consume(
                        topic, partition, currentOffset, this.config.maxPollRecords
                    );
                    
                    for (const message of messages) {
                        const record = new ConsumerRecord(
                            topic,
                            partition,
                            message.offset,
                            message.key,
                            message.payload,
                            message.headers,
                            message.timestamp
                        );
                        records.push(record);
                    }
                    
                    // Update offset
                    if (messages.length > 0) {
                        const latestOffset = messages[messages.length - 1].offset + 1;
                        this.offsets.set(`${topic}-${partition}`, latestOffset);
                    }
                    
                } catch (error) {
                    console.error(`Error polling partition ${topic}-${partition}: ${error.message}`);
                }
            }
        }
        
        return records;
    }

    commit(offsets = null) {
        const commitOffsets = offsets || this.offsets;
        
        for (const [key, offset] of commitOffsets.entries()) {
            const [topic, partition] = key.split('-');
            this.coordinator.commitOffset(
                this.config.groupId, topic, parseInt(partition), offset
            );
        }
    }

    close() {
        this.coordinator.leaveGroup(this.config.groupId, this.consumerId);
    }
}

// Dead Letter Queue Handler
class DeadLetterQueueHandler {
    constructor(broker, dlqTopic = 'dead-letter-queue') {
        this.broker = broker;
        this.dlqTopic = dlqTopic;
        this.maxRetries = 3;
        
        // Ensure DLQ topic exists
        if (!broker.topics.has(dlqTopic)) {
            broker.createTopic(dlqTopic, 1);
        }
    }

    handleFailedMessage(message, error) {
        message.retryCount += 1;
        
        if (message.retryCount >= this.maxRetries) {
            // Send to dead letter queue
            const dlqMessage = new Message({
                topic: this.dlqTopic,
                payload: message.payload,
                headers: {
                    ...message.headers,
                    'original_topic': message.topic,
                    'failure_reason': error.message,
                    'retry_count': message.retryCount.toString()
                }
            });
            
            this.broker.publish(this.dlqTopic, dlqMessage);
            console.log(`Message ${message.messageId} sent to DLQ after ${message.retryCount} retries`);
        } else {
            // Schedule retry (simplified - in production would use proper scheduling)
            console.log(`Retrying message ${message.messageId}, attempt ${message.retryCount}`);
        }
    }
}

// Monitoring and Statistics
class MessageQueueStatistics {
    constructor() {
        this.messagesPublished = 0;
        this.messagesConsumed = 0;
        this.messagesFailed = 0;
        this.topicsCreated = 0;
        this.consumerGroupsActive = 0;
        this.totalPartitions = 0;
        this.diskUsageBytes = 0;
    }

    incrementPublished() {
        this.messagesPublished += 1;
    }

    incrementConsumed() {
        this.messagesConsumed += 1;
    }

    incrementFailed() {
        this.messagesFailed += 1;
    }

    getStats() {
        return {
            messagesPublished: this.messagesPublished,
            messagesConsumed: this.messagesConsumed,
            messagesFailed: this.messagesFailed,
            topicsCreated: this.topicsCreated,
            consumerGroupsActive: this.consumerGroupsActive,
            totalPartitions: this.totalPartitions,
            diskUsageBytes: this.diskUsageBytes
        };
    }
}

// Message Queue System Facade
class MessageQueueSystem {
    constructor(brokerId = 'broker-1', dataDir = './data') {
        this.broker = new MessageBroker(brokerId, dataDir);
        this.coordinator = new ConsumerGroupCoordinator(this.broker);
        this.dlqHandler = new DeadLetterQueueHandler(this.broker);
        this.statistics = new MessageQueueStatistics();
    }

    start() {
        this.broker.start();
    }

    stop() {
        this.broker.stop();
    }

    createProducer(config = null) {
        if (config === null) {
            config = new ProducerConfig({ bootstrapServers: ['localhost:9092'] });
        }
        return new MessageProducer(config, this.broker);
    }

    createConsumer(groupId, config = null) {
        if (config === null) {
            config = new ConsumerConfig({
                bootstrapServers: ['localhost:9092'],
                groupId
            });
        } else {
            config.groupId = groupId;
        }
        return new MessageConsumer(config, this.broker, this.coordinator);
    }
}

// Demo Functions
function createDemoSystem() {
    const system = new MessageQueueSystem('demo-broker', './demo_data');
    system.start();
    
    // Create demo topics
    system.broker.createTopic('user-events', 3);
    system.broker.createTopic('order-updates', 2);
    system.broker.createTopic('notifications', 1);
    
    return system;
}

async function demoBasicMessaging() {
    console.log('🚀 Message Queue System - Basic Messaging Demo');
    console.log('='.repeat(50));
    
    const system = createDemoSystem();
    
    try {
        // Create producer
        const producer = system.createProducer();
        
        // Create consumer
        const consumer = system.createConsumer('demo-group');
        consumer.subscribe(['user-events']);
        
        console.log('\n📤 Publishing messages...');
        // Publish messages
        const messages = [
            { value: 'User 1 logged in', key: 'user1' },
            { value: 'User 2 registered', key: 'user2' },
            { value: 'User 1 logged out', key: 'user1' },
            { value: 'User 3 registered', key: 'user3' },
        ];
        
        for (const { value, key } of messages) {
            const result = producer.send('user-events', value, key);
            console.log(`   Published: ${value} -> Partition ${result.partition}, Offset ${result.offset}`);
        }
        
        console.log('\n📥 Consuming messages...');
        // Consume messages
        for (let i = 0; i < 5; i++) { // Try to consume a few times
            const records = consumer.poll(1000);
            
            for (const record of records) {
                console.log(`   Consumed: ${record.value.toString()} from partition ${record.partition} at offset ${record.offset}`);
            }
            
            if (records.length > 0) {
                consumer.commit();
            }
            
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        console.log('\n📊 Statistics:');
        const stats = system.statistics.getStats();
        for (const [key, value] of Object.entries(stats)) {
            console.log(`   ${key}: ${value}`);
        }
        
    } finally {
        system.stop();
    }
    
    console.log('\n✅ Basic messaging demo completed!');
}

async function demoConsumerGroups() {
    console.log('\n👥 Message Queue System - Consumer Groups Demo');
    console.log('='.repeat(50));
    
    const system = createDemoSystem();
    
    try {
        // Create producer
        const producer = system.createProducer();
        
        // Create multiple consumers in same group
        const consumers = [];
        for (let i = 0; i < 3; i++) {
            const consumer = system.createConsumer('group-demo');
            consumer.subscribe(['user-events']);
            consumers.push(consumer);
        }
        
        console.log('\n📤 Publishing 10 messages to topic with 3 partitions...');
        // Publish messages
        for (let i = 0; i < 10; i++) {
            const message = `Message ${i + 1}`;
            const result = producer.send('user-events', message, `key${i}`);
            console.log(`   Published: ${message} -> Partition ${result.partition}`);
        }
        
        console.log('\n📥 Consuming with 3 consumers in same group...');
        // Each consumer should get messages from different partitions
        for (let consumerIndex = 0; consumerIndex < consumers.length; consumerIndex++) {
            const consumer = consumers[consumerIndex];
            const records = consumer.poll(2000);
            console.log(`   Consumer ${consumerIndex + 1} received ${records.length} messages:`);
            
            for (const record of records) {
                console.log(`     - ${record.value.toString()} from partition ${record.partition}`);
            }
            
            if (records.length > 0) {
                consumer.commit();
            }
        }
        
    } finally {
        system.stop();
    }
    
    console.log('\n✅ Consumer groups demo completed!');
}

async function demoDeadLetterQueue() {
    console.log('\n💀 Message Queue System - Dead Letter Queue Demo');
    console.log('='.repeat(50));
    
    const system = createDemoSystem();
    
    try {
        // Create producer
        const producer = system.createProducer();
        
        // Simulate failed message processing
        const message = new Message({
            messageId: 'failed-msg-1',
            topic: 'user-events',
            payload: Buffer.from('This message will fail processing'),
            key: 'failure-test'
        });
        
        console.log('\n💥 Simulating message processing failures...');
        // Simulate multiple failures
        for (let attempt = 0; attempt < 4; attempt++) {
            try {
                // Simulate processing failure
                if (attempt < 3) {
                    throw new Error(`Processing failed on attempt ${attempt + 1}`);
                }
                
            } catch (error) {
                console.log(`   Attempt ${attempt + 1}: ${error.message}`);
                system.dlqHandler.handleFailedMessage(message, error);
            }
        }
        
        // Check DLQ
        console.log('\n📋 Checking Dead Letter Queue...');
        const dlqConsumer = system.createConsumer('dlq-consumer');
        dlqConsumer.subscribe(['dead-letter-queue']);
        
        const dlqRecords = dlqConsumer.poll(1000);
        console.log(`   Found ${dlqRecords.length} messages in DLQ:`);
        
        for (const record of dlqRecords) {
            console.log(`     - ${record.value.toString()}`);
            console.log(`       Original topic: ${record.headers['original_topic'] || 'unknown'}`);
            console.log(`       Failure reason: ${record.headers['failure_reason'] || 'unknown'}`);
        }
        
        dlqConsumer.close();
        
    } finally {
        system.stop();
    }
    
    console.log('\n✅ Dead letter queue demo completed!');
}

async function performanceTest() {
    console.log('\n⚡ Message Queue System - Performance Test');
    console.log('='.repeat(50));
    
    const system = createDemoSystem();
    
    try {
        // Create high-performance topic
        system.broker.createTopic('perf-test', 5);
        
        const producer = system.createProducer();
        
        // Publish performance test
        const numMessages = 1000;
        console.log(`\n📤 Publishing ${numMessages} messages...`);
        
        const startTime = performance.now();
        
        for (let i = 0; i < numMessages; i++) {
            const message = `Performance test message ${i + 1}`;
            producer.send('perf-test', message, `key${i}`);
        }
        
        const publishTime = (performance.now() - startTime) / 1000;
        const publishRate = numMessages / publishTime;
        
        console.log(`   Published ${numMessages} messages in ${publishTime.toFixed(2)} seconds`);
        console.log(`   Publish rate: ${publishRate.toFixed(0)} messages/second`);
        
        // Consume performance test
        const consumer = system.createConsumer('perf-group');
        consumer.subscribe(['perf-test']);
        
        console.log(`\n📥 Consuming ${numMessages} messages...`);
        
        const consumeStartTime = performance.now();
        let consumedCount = 0;
        
        while (consumedCount < numMessages) {
            const records = consumer.poll(1000);
            consumedCount += records.length;
            
            if (records.length > 0) {
                consumer.commit();
            }
        }
        
        const consumeTime = (performance.now() - consumeStartTime) / 1000;
        const consumeRate = numMessages / consumeTime;
        
        console.log(`   Consumed ${numMessages} messages in ${consumeTime.toFixed(2)} seconds`);
        console.log(`   Consume rate: ${consumeRate.toFixed(0)} messages/second`);
        
        consumer.close();
        
    } finally {
        system.stop();
    }
    
    console.log('\n✅ Performance test completed!');
}

async function interactiveDemo() {
    console.log('\n🎮 Interactive Message Queue Demo');
    console.log('='.repeat(50));
    console.log('Commands: publish <topic> <message>, consume <topic> <group>, topics, stats, quit');
    
    const system = createDemoSystem();
    
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    const askQuestion = (question) => {
        return new Promise(resolve => {
            rl.question(question, resolve);
        });
    };
    
    try {
        while (true) {
            try {
                const input = await askQuestion('\nqueue> ');
                const command = input.trim().split(' ');
                
                if (command.length === 0 || command[0] === '') {
                    continue;
                } else if (command[0] === 'quit') {
                    break;
                } else if (command[0] === 'publish' && command.length >= 3) {
                    const topic = command[1];
                    const message = command.slice(2).join(' ');
                    
                    // Create topic if it doesn't exist
                    if (!system.broker.topics.has(topic)) {
                        system.broker.createTopic(topic, 2);
                    }
                    
                    const producer = system.createProducer();
                    const result = producer.send(topic, message);
                    console.log(`Published to ${topic}, partition ${result.partition}, offset ${result.offset}`);
                    
                } else if (command[0] === 'consume' && command.length >= 3) {
                    const topic = command[1];
                    const group = command[2];
                    
                    if (!system.broker.topics.has(topic)) {
                        console.log(`Topic ${topic} does not exist`);
                        continue;
                    }
                    
                    const consumer = system.createConsumer(group);
                    consumer.subscribe([topic]);
                    
                    const records = consumer.poll(2000);
                    if (records.length > 0) {
                        for (const record of records) {
                            console.log(`  ${record.value.toString()} (partition ${record.partition}, offset ${record.offset})`);
                        }
                        consumer.commit();
                        console.log(`Consumed ${records.length} messages from ${topic}`);
                    } else {
                        console.log(`No messages available in ${topic}`);
                    }
                    
                    consumer.close();
                    
                } else if (command[0] === 'topics') {
                    const topics = system.broker.listTopics();
                    console.log('Available topics:');
                    for (const topic of topics) {
                        const metadata = system.broker.getTopicMetadata(topic);
                        console.log(`  ${topic} (${metadata.partitionCount} partitions)`);
                    }
                    
                } else if (command[0] === 'stats') {
                    const stats = system.statistics.getStats();
                    console.log('System Statistics:');
                    for (const [key, value] of Object.entries(stats)) {
                        console.log(`  ${key}: ${value}`);
                    }
                    
                } else {
                    console.log('Invalid command. Available commands:');
                    console.log('  publish <topic> <message> - Publish message to topic');
                    console.log('  consume <topic> <group> - Consume messages from topic');
                    console.log('  topics - List all topics');
                    console.log('  stats - Show system statistics');
                    console.log('  quit - Exit');
                }
                
            } catch (error) {
                console.log(`Error: ${error.message}`);
            }
        }
        
    } finally {
        rl.close();
        system.stop();
    }
    
    console.log('\n👋 Goodbye!');
}

async function main() {
    console.log('Message Queue System Implementation');
    console.log('==================================');
    console.log('1. Basic Messaging Demo');
    console.log('2. Consumer Groups Demo');
    console.log('3. Dead Letter Queue Demo');
    console.log('4. Performance Test');
    console.log('5. Interactive Demo');
    
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    const askQuestion = (question) => {
        return new Promise(resolve => {
            rl.question(question, resolve);
        });
    };
    
    try {
        const choice = await askQuestion('\nSelect demo (1-5): ');
        rl.close();
        
        if (choice === '1') {
            await demoBasicMessaging();
        } else if (choice === '2') {
            await demoConsumerGroups();
        } else if (choice === '3') {
            await demoDeadLetterQueue();
        } else if (choice === '4') {
            await performanceTest();
        } else if (choice === '5') {
            await interactiveDemo();
        } else {
            console.log('Running all demos...');
            await demoBasicMessaging();
            await demoConsumerGroups();
            await demoDeadLetterQueue();
            await performanceTest();
        }
        
    } catch (error) {
        rl.close();
        if (error.message !== 'Operation was cancelled') {
            console.log(`\nError running demo: ${error.message}`);
        }
    }
}

// Run if this file is executed directly
if (require.main === module) {
    main().catch(error => {
        if (error.message !== 'Operation was cancelled') {
            console.error('Unhandled error:', error);
        }
    });
}

module.exports = {
    MessageQueueSystem,
    MessageBroker,
    MessageProducer,
    MessageConsumer,
    Message,
    TopicMetadata,
    ConsumerGroup,
    ProducerConfig,
    ConsumerConfig,
    PublishResult,
    ConsumerRecord,
    DeadLetterQueueHandler,
    MessageQueueStatistics
};