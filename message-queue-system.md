# Message Queue System - Low Level Design

## 📋 Problem Statement

Design a comprehensive message queue system similar to Apache Kafka, RabbitMQ, or AWS SQS that can handle high-throughput message passing between distributed applications. The system should support reliable message delivery, multiple consumer patterns, topic-based routing, and various message durability guarantees.

## 🎯 Requirements

### Functional Requirements

1. **Message Operations**
   - Publish messages to queues/topics
   - Subscribe to queues/topics for message consumption
   - Support for message acknowledgment and negative acknowledgment
   - Dead letter queue for failed message processing
   - Message filtering and routing capabilities

2. **Queue Management**
   - Create and delete queues dynamically
   - Topic-based message routing (pub-sub pattern)
   - Queue metadata management (size, consumer count, etc.)
   - Queue policies and configuration

3. **Consumer Patterns**
   - Point-to-Point messaging (single consumer)
   - Publish-Subscribe pattern (multiple consumers)
   - Consumer groups with load balancing
   - Message ordering guarantees within partitions

4. **Message Properties**
   - Message headers and metadata
   - Message priority levels
   - Time-to-live (TTL) for messages
   - Message deduplication
   - Delayed message delivery

5. **Reliability Features**
   - At-least-once delivery guarantee
   - Exactly-once delivery (idempotency)
   - Message persistence and durability
   - Replication across multiple brokers
   - Transaction support for atomic operations

### Non-Functional Requirements

1. **Performance**
   - High throughput (100K+ messages per second)
   - Low latency (< 5ms for message delivery)
   - Horizontal scalability
   - Memory and disk efficiency

2. **Reliability**
   - 99.99% availability
   - Data durability with configurable replication
   - Fault tolerance and automatic recovery
   - Zero message loss guarantee

3. **Scalability**
   - Support for millions of queues
   - Elastic scaling based on load
   - Multi-tenant architecture
   - Cross-datacenter replication

## 🏗️ System Architecture

### High-Level Components

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Producers     │───▶│  Message Queue  │───▶│   Consumers     │
│   (Publishers)  │    │     Brokers     │    │  (Subscribers)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              │
                    ┌─────────────────┐
                    │   Coordination  │
                    │    Service      │
                    │  (ZooKeeper)    │
                    └─────────────────┘
                              │
                    ┌─────────────────┐
                    │   Persistent    │
                    │    Storage      │
                    │   (Database)    │
                    └─────────────────┘
```

### Core Components

1. **Message Broker**
   - Message routing and delivery
   - Queue and topic management
   - Consumer group coordination

2. **Storage Engine**
   - Message persistence
   - Index management
   - Compaction and cleanup

3. **Coordination Service**
   - Cluster membership
   - Leader election
   - Configuration management

4. **Producer/Consumer Clients**
   - Message publishing
   - Message consumption
   - Connection management

## 🔧 Technical Design

### Message Structure

```python
@dataclass
class Message:
    message_id: str
    topic: str
    partition: Optional[int]
    key: Optional[str]
    payload: bytes
    headers: Dict[str, str]
    timestamp: datetime
    priority: int
    ttl: Optional[int]
    retry_count: int
    correlation_id: Optional[str]
    reply_to: Optional[str]
```

### Queue/Topic Model

```python
@dataclass
class Topic:
    name: str
    partitions: List[Partition]
    replication_factor: int
    retention_policy: RetentionPolicy
    cleanup_policy: CleanupPolicy
    compression_type: CompressionType
    max_message_size: int
    created_at: datetime
    config: Dict[str, Any]

@dataclass
class Partition:
    topic_name: str
    partition_id: int
    leader_broker: str
    replica_brokers: List[str]
    log_start_offset: int
    log_end_offset: int
    high_watermark: int
    last_stable_offset: int
```

### Consumer Group Model

```python
@dataclass
class ConsumerGroup:
    group_id: str
    consumers: Dict[str, Consumer]
    topic_partitions: Dict[str, List[int]]
    coordinator: str
    state: ConsumerGroupState
    protocol_type: str
    generation_id: int
    leader_id: Optional[str]
```

## 💾 Storage Design

### Message Log Structure

```
Topic: user-events
├── Partition 0
│   ├── 00000000000000000000.log  # Message log file
│   ├── 00000000000000000000.index # Offset index
│   └── 00000000000000000000.timeindex # Time index
├── Partition 1
│   ├── 00000000000000000000.log
│   ├── 00000000000000000000.index
│   └── 00000000000000000000.timeindex
└── Partition 2
    ├── 00000000000000000000.log
    ├── 00000000000000000000.index
    └── 00000000000000000000.timeindex
```

### Database Schema

#### Topics Table
```sql
CREATE TABLE topics (
    topic_name VARCHAR(255) PRIMARY KEY,
    partition_count INT NOT NULL,
    replication_factor INT NOT NULL,
    retention_ms BIGINT,
    max_message_bytes INT,
    compression_type ENUM('none', 'gzip', 'snappy', 'lz4'),
    cleanup_policy ENUM('delete', 'compact'),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    config JSON
);
```

#### Consumer Groups Table
```sql
CREATE TABLE consumer_groups (
    group_id VARCHAR(255) PRIMARY KEY,
    coordinator_id VARCHAR(255),
    state ENUM('Empty', 'PreparingRebalance', 'CompletingRebalance', 'Stable', 'Dead'),
    protocol_type VARCHAR(50),
    generation_id INT,
    leader_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_heartbeat TIMESTAMP
);
```

## 🚀 Implementation Approach

### 1. Message Broker Core

```python
class MessageBroker:
    def __init__(self, broker_id: str, config: BrokerConfig):
        self.broker_id = broker_id
        self.config = config
        self.topics = {}
        self.consumer_groups = {}
        self.storage_engine = StorageEngine(config.data_dir)
        self.coordinator = CoordinatorService()
        
    async def publish(self, topic: str, message: Message) -> PublishResult:
        """Publish message to topic"""
        # 1. Validate topic exists
        if topic not in self.topics:
            raise TopicNotFoundException(f"Topic {topic} not found")
            
        # 2. Select partition
        partition = self._select_partition(topic, message.key)
        
        # 3. Append to log
        offset = await self.storage_engine.append(topic, partition, message)
        
        # 4. Replicate to followers
        await self._replicate_message(topic, partition, message, offset)
        
        return PublishResult(topic, partition, offset, message.message_id)
        
    async def consume(self, group_id: str, topics: List[str]) -> AsyncIterator[Message]:
        """Consume messages from topics"""
        consumer_group = self._get_or_create_consumer_group(group_id)
        
        # Assign partitions to consumer
        assigned_partitions = await self._assign_partitions(consumer_group, topics)
        
        for topic, partitions in assigned_partitions.items():
            for partition in partitions:
                async for message in self._consume_partition(topic, partition):
                    yield message
```

### 2. Storage Engine

```python
class StorageEngine:
    def __init__(self, data_dir: str):
        self.data_dir = data_dir
        self.segments = {}  # (topic, partition) -> List[Segment]
        self.indexes = {}   # (topic, partition) -> Index
        
    async def append(self, topic: str, partition: int, message: Message) -> int:
        """Append message to partition log"""
        segment = self._get_active_segment(topic, partition)
        
        # Serialize message
        serialized = self._serialize_message(message)
        
        # Write to log
        offset = await segment.append(serialized)
        
        # Update index
        index = self.indexes[(topic, partition)]
        await index.add_entry(offset, segment.position)
        
        return offset
        
    async def read(self, topic: str, partition: int, offset: int, max_messages: int = 100) -> List[Message]:
        """Read messages from partition starting at offset"""
        segment = self._find_segment_for_offset(topic, partition, offset)
        
        if not segment:
            return []
            
        # Find position in segment using index
        index = self.indexes[(topic, partition)]
        position = await index.lookup(offset)
        
        # Read messages
        messages = []
        current_offset = offset
        
        while len(messages) < max_messages:
            message_data = await segment.read(position)
            if not message_data:
                break
                
            message = self._deserialize_message(message_data)
            messages.append(message)
            
            current_offset += 1
            position += len(message_data)
            
        return messages
```

### 3. Consumer Group Management

```python
class ConsumerGroupCoordinator:
    def __init__(self, broker: MessageBroker):
        self.broker = broker
        self.groups = {}
        self.assignments = {}
        
    async def join_group(self, group_id: str, consumer_id: str, topics: List[str]) -> JoinResponse:
        """Consumer joins a consumer group"""
        group = self._get_or_create_group(group_id)
        
        # Add consumer to group
        consumer = Consumer(consumer_id, topics)
        group.consumers[consumer_id] = consumer
        
        # Trigger rebalance if needed
        if self._should_rebalance(group):
            await self._trigger_rebalance(group)
            
        return JoinResponse(group.generation_id, consumer_id, group.leader_id)
        
    async def sync_group(self, group_id: str, consumer_id: str, assignment: Dict[str, List[int]]) -> SyncResponse:
        """Synchronize group assignment"""
        group = self.groups[group_id]
        
        # Store assignment
        self.assignments[(group_id, consumer_id)] = assignment
        
        # Wait for all consumers to sync
        if self._all_consumers_synced(group):
            group.state = ConsumerGroupState.STABLE
            
        return SyncResponse(assignment)
        
    def _assign_partitions(self, group: ConsumerGroup) -> Dict[str, Dict[str, List[int]]]:
        """Assign partitions to consumers using round-robin strategy"""
        all_partitions = []
        
        # Collect all partitions for subscribed topics
        for topic in self._get_subscribed_topics(group):
            topic_metadata = self.broker.topics[topic]
            for partition_id in range(len(topic_metadata.partitions)):
                all_partitions.append((topic, partition_id))
                
        # Round-robin assignment
        assignments = {consumer_id: {} for consumer_id in group.consumers.keys()}
        consumer_ids = list(group.consumers.keys())
        
        for i, (topic, partition) in enumerate(all_partitions):
            consumer_id = consumer_ids[i % len(consumer_ids)]
            if topic not in assignments[consumer_id]:
                assignments[consumer_id][topic] = []
            assignments[consumer_id][topic].append(partition)
            
        return assignments
```

### 4. Producer Client

```python
class MessageProducer:
    def __init__(self, bootstrap_servers: List[str], config: ProducerConfig):
        self.bootstrap_servers = bootstrap_servers
        self.config = config
        self.connections = {}
        self.metadata_cache = {}
        
    async def send(self, topic: str, value: bytes, key: Optional[str] = None, headers: Optional[Dict[str, str]] = None) -> Future[RecordMetadata]:
        """Send message to topic"""
        # Create message
        message = Message(
            message_id=self._generate_message_id(),
            topic=topic,
            key=key,
            payload=value,
            headers=headers or {},
            timestamp=datetime.utcnow(),
            priority=self.config.default_priority,
            ttl=self.config.default_ttl
        )
        
        # Get topic metadata
        metadata = await self._get_topic_metadata(topic)
        
        # Select partition
        partition = self._select_partition(metadata, key)
        
        # Send to broker
        broker = self._get_partition_leader(topic, partition)
        result = await self._send_to_broker(broker, message)
        
        return RecordMetadata(topic, partition, result.offset, result.timestamp)
        
    def _select_partition(self, metadata: TopicMetadata, key: Optional[str]) -> int:
        """Select partition for message"""
        if key is not None:
            # Hash-based partitioning
            return hash(key) % len(metadata.partitions)
        else:
            # Round-robin partitioning
            return self._next_partition(metadata.topic_name)
```

### 5. Consumer Client

```python
class MessageConsumer:
    def __init__(self, group_id: str, bootstrap_servers: List[str], config: ConsumerConfig):
        self.group_id = group_id
        self.bootstrap_servers = bootstrap_servers
        self.config = config
        self.subscribed_topics = set()
        self.assignment = {}
        self.offsets = {}
        
    async def subscribe(self, topics: List[str]):
        """Subscribe to topics"""
        self.subscribed_topics.update(topics)
        
        # Join consumer group
        coordinator = await self._find_coordinator()
        await coordinator.join_group(self.group_id, self.consumer_id, topics)
        
    async def poll(self, timeout_ms: int = 1000) -> List[ConsumerRecord]:
        """Poll for messages"""
        records = []
        
        for topic, partitions in self.assignment.items():
            for partition in partitions:
                # Fetch messages from partition
                fetch_result = await self._fetch_from_partition(topic, partition, timeout_ms)
                
                for message in fetch_result.messages:
                    record = ConsumerRecord(
                        topic=topic,
                        partition=partition,
                        offset=message.offset,
                        key=message.key,
                        value=message.payload,
                        headers=message.headers,
                        timestamp=message.timestamp
                    )
                    records.append(record)
                    
                # Update offset
                if fetch_result.messages:
                    last_message = fetch_result.messages[-1]
                    self.offsets[(topic, partition)] = last_message.offset + 1
                    
        return records
        
    async def commit(self, offsets: Optional[Dict[Tuple[str, int], int]] = None):
        """Commit consumer offsets"""
        commit_offsets = offsets or self.offsets
        
        coordinator = await self._find_coordinator()
        await coordinator.commit_offsets(self.group_id, commit_offsets)
```

## 📊 Advanced Features

### 1. Message Ordering

```python
class PartitionedProducer:
    def __init__(self, partitioner: Partitioner):
        self.partitioner = partitioner
        
    async def send_ordered(self, topic: str, key: str, messages: List[Message]):
        """Send messages in order using same partition"""
        partition = self.partitioner.partition(topic, key)
        
        for message in messages:
            message.partition = partition
            await self._send_to_partition(topic, partition, message)
```

### 2. Exactly-Once Semantics

```python
class TransactionalProducer:
    def __init__(self, transaction_id: str):
        self.transaction_id = transaction_id
        self.transaction_state = TransactionState.NOT_STARTED
        
    async def begin_transaction(self):
        """Begin a new transaction"""
        self.transaction_state = TransactionState.IN_PROGRESS
        await self._init_transaction()
        
    async def commit_transaction(self):
        """Commit current transaction"""
        await self._commit_transaction()
        self.transaction_state = TransactionState.COMMITTED
        
    async def abort_transaction(self):
        """Abort current transaction"""
        await self._abort_transaction()
        self.transaction_state = TransactionState.ABORTED
```

### 3. Dead Letter Queue

```python
class DeadLetterQueueHandler:
    def __init__(self, dlq_topic: str, max_retries: int):
        self.dlq_topic = dlq_topic
        self.max_retries = max_retries
        
    async def handle_failed_message(self, message: Message, error: Exception):
        """Handle message processing failure"""
        message.retry_count += 1
        
        if message.retry_count >= self.max_retries:
            # Send to dead letter queue
            dlq_message = self._create_dlq_message(message, error)
            await self._send_to_dlq(dlq_message)
        else:
            # Retry after delay
            await self._schedule_retry(message)
```

## 🔒 Security and Monitoring

### Security Features
- SSL/TLS encryption for data in transit
- SASL authentication (PLAIN, SCRAM, GSSAPI)
- ACL-based authorization
- Message encryption at rest

### Monitoring Metrics
- Throughput (messages/second)
- Latency (producer/consumer)
- Consumer lag
- Disk utilization
- Network I/O

## Implementation

### Python Implementation
- **File**: `python/message-queue/main.py`
- **Features**: Complete message queue system with brokers, producers, consumers, persistence
- **Key Components**: Message broker, storage engine, consumer groups, replication, transactions

### JavaScript Implementation  
- **File**: `javascript/message-queue/main.js`
- **Features**: Equivalent functionality with async/await patterns, Node.js compatibility
- **Key Components**: Event-driven architecture, stream processing, cluster coordination

Both implementations provide:
- ✅ Complete message queue system with topics and partitions
- ✅ Producer and consumer client libraries
- ✅ Consumer group management with rebalancing
- ✅ Message persistence and replication
- ✅ At-least-once and exactly-once delivery guarantees
- ✅ Dead letter queue handling
- ✅ Transaction support
- ✅ Performance monitoring and metrics
- ✅ Interactive demonstration and testing tools

The implementations demonstrate enterprise-level message queue capabilities essential for high-scale distributed systems and microservices architectures commonly used in FAANG companies.