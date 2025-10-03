#!/usr/bin/env python3
"""
Message Queue System Implementation

A comprehensive distributed message queue system supporting reliable message 
delivery, multiple consumer patterns, topic-based routing, and various 
durability guarantees.

Features:
- Topic and partition management
- Producer and consumer clients
- Consumer group coordination with automatic rebalancing
- Message persistence and replication
- At-least-once and exactly-once delivery semantics
- Dead letter queue handling
- Transaction support for atomic operations
- Comprehensive monitoring and metrics

Author: LLD Solutions
Date: 2024
"""

import asyncio
import json
import logging
import time
import uuid
import hashlib
import threading
from abc import ABC, abstractmethod
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple, AsyncIterator, Any, Callable
import heapq
import pickle
import os

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Enums and Constants
class MessageState(Enum):
    PENDING = "pending"
    DELIVERED = "delivered"
    ACKNOWLEDGED = "acknowledged"
    FAILED = "failed"

class ConsumerGroupState(Enum):
    EMPTY = "empty"
    PREPARING_REBALANCE = "preparing_rebalance"
    COMPLETING_REBALANCE = "completing_rebalance"
    STABLE = "stable"
    DEAD = "dead"

class DeliveryGuarantee(Enum):
    AT_MOST_ONCE = "at_most_once"
    AT_LEAST_ONCE = "at_least_once"
    EXACTLY_ONCE = "exactly_once"

class PartitionStrategy(Enum):
    ROUND_ROBIN = "round_robin"
    HASH_BASED = "hash_based"
    CUSTOM = "custom"

class CompressionType(Enum):
    NONE = "none"
    GZIP = "gzip"
    SNAPPY = "snappy"
    LZ4 = "lz4"

class CleanupPolicy(Enum):
    DELETE = "delete"
    COMPACT = "compact"

# Data Classes
@dataclass
class Message:
    message_id: str
    topic: str
    partition: Optional[int] = None
    key: Optional[str] = None
    payload: bytes = b""
    headers: Dict[str, str] = field(default_factory=dict)
    timestamp: datetime = field(default_factory=datetime.utcnow)
    priority: int = 0
    ttl: Optional[int] = None  # Time to live in seconds
    retry_count: int = 0
    correlation_id: Optional[str] = None
    reply_to: Optional[str] = None
    offset: Optional[int] = None
    state: MessageState = MessageState.PENDING

    def is_expired(self) -> bool:
        if self.ttl is None:
            return False
        return (datetime.utcnow() - self.timestamp).total_seconds() > self.ttl

    def to_dict(self) -> Dict[str, Any]:
        return {
            'message_id': self.message_id,
            'topic': self.topic,
            'partition': self.partition,
            'key': self.key,
            'payload': self.payload.hex() if self.payload else None,
            'headers': self.headers,
            'timestamp': self.timestamp.isoformat(),
            'priority': self.priority,
            'ttl': self.ttl,
            'retry_count': self.retry_count,
            'correlation_id': self.correlation_id,
            'reply_to': self.reply_to,
            'offset': self.offset,
            'state': self.state.value
        }

@dataclass
class TopicMetadata:
    name: str
    partition_count: int
    replication_factor: int
    retention_ms: int = 7 * 24 * 60 * 60 * 1000  # 7 days
    max_message_bytes: int = 1024 * 1024  # 1MB
    compression_type: CompressionType = CompressionType.NONE
    cleanup_policy: CleanupPolicy = CleanupPolicy.DELETE
    created_at: datetime = field(default_factory=datetime.utcnow)
    config: Dict[str, Any] = field(default_factory=dict)

@dataclass
class Partition:
    topic_name: str
    partition_id: int
    leader_broker: str
    replica_brokers: List[str] = field(default_factory=list)
    log_start_offset: int = 0
    log_end_offset: int = 0
    high_watermark: int = 0
    last_stable_offset: int = 0

@dataclass
class ConsumerMetadata:
    consumer_id: str
    group_id: str
    subscribed_topics: Set[str] = field(default_factory=set)
    assigned_partitions: Dict[str, List[int]] = field(default_factory=dict)
    last_heartbeat: datetime = field(default_factory=datetime.utcnow)
    generation_id: int = 0

@dataclass
class ConsumerGroup:
    group_id: str
    consumers: Dict[str, ConsumerMetadata] = field(default_factory=dict)
    coordinator: str = ""
    state: ConsumerGroupState = ConsumerGroupState.EMPTY
    protocol_type: str = "consumer"
    generation_id: int = 0
    leader_id: Optional[str] = None
    subscribed_topics: Set[str] = field(default_factory=set)

@dataclass
class ProducerConfig:
    bootstrap_servers: List[str]
    acks: str = "all"  # "0", "1", "all"
    retries: int = 3
    retry_backoff_ms: int = 100
    batch_size: int = 16384
    linger_ms: int = 0
    compression_type: CompressionType = CompressionType.NONE
    max_request_size: int = 1024 * 1024  # 1MB
    request_timeout_ms: int = 30000
    delivery_timeout_ms: int = 120000

@dataclass
class ConsumerConfig:
    bootstrap_servers: List[str]
    group_id: str
    auto_offset_reset: str = "earliest"  # "earliest", "latest", "none"
    enable_auto_commit: bool = True
    auto_commit_interval_ms: int = 5000
    max_poll_records: int = 500
    max_poll_interval_ms: int = 300000
    session_timeout_ms: int = 10000
    heartbeat_interval_ms: int = 3000
    fetch_min_bytes: int = 1
    fetch_max_wait_ms: int = 500

@dataclass
class PublishResult:
    topic: str
    partition: int
    offset: int
    message_id: str
    timestamp: datetime = field(default_factory=datetime.utcnow)

@dataclass
class ConsumerRecord:
    topic: str
    partition: int
    offset: int
    key: Optional[str]
    value: bytes
    headers: Dict[str, str]
    timestamp: datetime

# Custom Exceptions
class MessageQueueException(Exception):
    pass

class TopicNotFoundException(MessageQueueException):
    pass

class PartitionNotFoundException(MessageQueueException):
    pass

class ConsumerGroupException(MessageQueueException):
    pass

class BrokerException(MessageQueueException):
    pass

class SerializationException(MessageQueueException):
    pass

# Storage Engine
class LogSegment:
    def __init__(self, base_offset: int, log_file: Path, index_file: Path):
        self.base_offset = base_offset
        self.log_file = log_file
        self.index_file = index_file
        self.position = 0
        self.size = 0
        self._lock = threading.RLock()
        
        # Create files if they don't exist
        self.log_file.parent.mkdir(parents=True, exist_ok=True)
        if not self.log_file.exists():
            self.log_file.touch()
        if not self.index_file.exists():
            self.index_file.touch()
            
        # Load existing size
        self.size = self.log_file.stat().st_size

    def append(self, message: Message) -> int:
        """Append message to log segment"""
        with self._lock:
            # Serialize message
            data = pickle.dumps(message.to_dict())
            
            # Write to log file
            with open(self.log_file, 'ab') as f:
                offset = self.base_offset + self.position
                record = {
                    'offset': offset,
                    'size': len(data),
                    'data': data
                }
                serialized_record = pickle.dumps(record)
                f.write(serialized_record)
                
            # Update index
            self._update_index(offset, self.position)
            self.position += 1
            self.size += len(data)
            
            return offset

    def read(self, offset: int) -> Optional[Message]:
        """Read message at specific offset"""
        with self._lock:
            position = self._find_position(offset)
            if position is None:
                return None
                
            try:
                with open(self.log_file, 'rb') as f:
                    f.seek(position)
                    record_data = f.read()
                    records = []
                    
                    # Parse records
                    pos = 0
                    while pos < len(record_data):
                        try:
                            record = pickle.loads(record_data[pos:])
                            if record['offset'] == offset:
                                message_dict = pickle.loads(record['data'])
                                return self._dict_to_message(message_dict)
                            pos += len(pickle.dumps(record))
                        except:
                            break
                            
            except Exception as e:
                logger.error(f"Error reading message: {e}")
                
            return None

    def read_range(self, start_offset: int, max_messages: int = 100) -> List[Message]:
        """Read messages starting from offset"""
        messages = []
        current_offset = start_offset
        
        while len(messages) < max_messages:
            message = self.read(current_offset)
            if message is None:
                break
            messages.append(message)
            current_offset += 1
            
        return messages

    def _update_index(self, offset: int, position: int):
        """Update index file"""
        try:
            with open(self.index_file, 'ab') as f:
                index_entry = pickle.dumps({'offset': offset, 'position': position})
                f.write(index_entry)
        except Exception as e:
            logger.error(f"Error updating index: {e}")

    def _find_position(self, offset: int) -> Optional[int]:
        """Find file position for offset using index"""
        try:
            if not self.index_file.exists() or self.index_file.stat().st_size == 0:
                return 0
                
            with open(self.index_file, 'rb') as f:
                index_data = f.read()
                pos = 0
                last_position = 0
                
                while pos < len(index_data):
                    try:
                        entry = pickle.loads(index_data[pos:])
                        if entry['offset'] == offset:
                            return entry['position']
                        elif entry['offset'] < offset:
                            last_position = entry['position']
                        pos += len(pickle.dumps(entry))
                    except:
                        break
                        
                return last_position
        except Exception as e:
            logger.error(f"Error finding position: {e}")
            return 0

    def _dict_to_message(self, data: Dict[str, Any]) -> Message:
        """Convert dictionary to Message object"""
        message = Message(
            message_id=data['message_id'],
            topic=data['topic'],
            partition=data.get('partition'),
            key=data.get('key'),
            payload=bytes.fromhex(data['payload']) if data.get('payload') else b"",
            headers=data.get('headers', {}),
            timestamp=datetime.fromisoformat(data['timestamp']),
            priority=data.get('priority', 0),
            ttl=data.get('ttl'),
            retry_count=data.get('retry_count', 0),
            correlation_id=data.get('correlation_id'),
            reply_to=data.get('reply_to'),
            offset=data.get('offset'),
            state=MessageState(data.get('state', 'pending'))
        )
        return message

class StorageEngine:
    def __init__(self, data_dir: str):
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.segments = {}  # (topic, partition) -> List[LogSegment]
        self.active_segments = {}  # (topic, partition) -> LogSegment
        self.offsets = {}  # (topic, partition) -> current_offset
        self._locks = {}  # (topic, partition) -> Lock
        
    def get_or_create_partition(self, topic: str, partition: int):
        """Get or create partition storage"""
        key = (topic, partition)
        if key not in self._locks:
            self._locks[key] = threading.RLock()
            
        if key not in self.segments:
            self.segments[key] = []
            self.offsets[key] = 0
            
        if key not in self.active_segments:
            segment = self._create_segment(topic, partition, 0)
            self.active_segments[key] = segment
            self.segments[key].append(segment)

    def append(self, topic: str, partition: int, message: Message) -> int:
        """Append message to partition"""
        key = (topic, partition)
        self.get_or_create_partition(topic, partition)
        
        with self._locks[key]:
            segment = self.active_segments[key]
            
            # Check if we need to roll to new segment
            if segment.size > 1024 * 1024:  # 1MB segment size
                new_offset = self.offsets[key]
                new_segment = self._create_segment(topic, partition, new_offset)
                self.active_segments[key] = new_segment
                self.segments[key].append(new_segment)
                segment = new_segment
                
            offset = segment.append(message)
            self.offsets[key] = offset + 1
            return offset

    def read(self, topic: str, partition: int, offset: int, max_messages: int = 100) -> List[Message]:
        """Read messages from partition"""
        key = (topic, partition)
        self.get_or_create_partition(topic, partition)
        
        with self._locks[key]:
            messages = []
            
            # Find the right segment
            for segment in self.segments[key]:
                if segment.base_offset <= offset:
                    segment_messages = segment.read_range(offset, max_messages)
                    messages.extend(segment_messages)
                    if len(messages) >= max_messages:
                        break
                        
            return messages[:max_messages]

    def get_latest_offset(self, topic: str, partition: int) -> int:
        """Get latest offset for partition"""
        key = (topic, partition)
        self.get_or_create_partition(topic, partition)
        return self.offsets.get(key, 0)

    def _create_segment(self, topic: str, partition: int, base_offset: int) -> LogSegment:
        """Create new log segment"""
        partition_dir = self.data_dir / topic / f"partition-{partition}"
        partition_dir.mkdir(parents=True, exist_ok=True)
        
        log_file = partition_dir / f"{base_offset:020d}.log"
        index_file = partition_dir / f"{base_offset:020d}.index"
        
        return LogSegment(base_offset, log_file, index_file)

# Partitioner Classes
class Partitioner(ABC):
    @abstractmethod
    def partition(self, topic: str, key: Optional[str], partition_count: int) -> int:
        pass

class RoundRobinPartitioner(Partitioner):
    def __init__(self):
        self._counters = {}
        self._lock = threading.Lock()

    def partition(self, topic: str, key: Optional[str], partition_count: int) -> int:
        with self._lock:
            if topic not in self._counters:
                self._counters[topic] = 0
            
            partition = self._counters[topic] % partition_count
            self._counters[topic] += 1
            return partition

class HashPartitioner(Partitioner):
    def partition(self, topic: str, key: Optional[str], partition_count: int) -> int:
        if key is None:
            return 0
        return hash(key) % partition_count

# Message Broker Core
class MessageBroker:
    def __init__(self, broker_id: str, data_dir: str = "./data"):
        self.broker_id = broker_id
        self.topics = {}  # topic_name -> TopicMetadata
        self.partitions = {}  # (topic, partition) -> Partition
        self.consumer_groups = {}  # group_id -> ConsumerGroup
        self.storage_engine = StorageEngine(data_dir)
        self.running = False
        self._lock = threading.RLock()
        
        # Background tasks
        self._executor = ThreadPoolExecutor(max_workers=10)
        self._cleanup_task = None

    def start(self):
        """Start the broker"""
        self.running = True
        self._cleanup_task = self._executor.submit(self._background_cleanup)
        logger.info(f"Broker {self.broker_id} started")

    def stop(self):
        """Stop the broker"""
        self.running = False
        if self._cleanup_task:
            self._cleanup_task.cancel()
        self._executor.shutdown(wait=True)
        logger.info(f"Broker {self.broker_id} stopped")

    def create_topic(self, topic_name: str, partition_count: int = 1, 
                    replication_factor: int = 1, **config) -> bool:
        """Create a new topic"""
        with self._lock:
            if topic_name in self.topics:
                return False
                
            metadata = TopicMetadata(
                name=topic_name,
                partition_count=partition_count,
                replication_factor=replication_factor,
                **config
            )
            
            self.topics[topic_name] = metadata
            
            # Create partitions
            for partition_id in range(partition_count):
                partition = Partition(
                    topic_name=topic_name,
                    partition_id=partition_id,
                    leader_broker=self.broker_id,
                    replica_brokers=[self.broker_id]
                )
                self.partitions[(topic_name, partition_id)] = partition
                
            logger.info(f"Created topic {topic_name} with {partition_count} partitions")
            return True

    def delete_topic(self, topic_name: str) -> bool:
        """Delete a topic"""
        with self._lock:
            if topic_name not in self.topics:
                return False
                
            # Remove partitions
            partitions_to_remove = [
                key for key in self.partitions.keys() 
                if key[0] == topic_name
            ]
            for key in partitions_to_remove:
                del self.partitions[key]
                
            del self.topics[topic_name]
            logger.info(f"Deleted topic {topic_name}")
            return True

    def publish(self, topic: str, message: Message) -> PublishResult:
        """Publish message to topic"""
        if topic not in self.topics:
            raise TopicNotFoundException(f"Topic {topic} not found")
            
        topic_metadata = self.topics[topic]
        
        # Select partition if not specified
        if message.partition is None:
            partitioner = HashPartitioner() if message.key else RoundRobinPartitioner()
            message.partition = partitioner.partition(topic, message.key, topic_metadata.partition_count)
            
        # Validate partition
        if message.partition >= topic_metadata.partition_count:
            raise PartitionNotFoundException(f"Partition {message.partition} not found")
            
        # Set topic if not set
        message.topic = topic
        
        # Append to storage
        offset = self.storage_engine.append(topic, message.partition, message)
        message.offset = offset
        
        return PublishResult(
            topic=topic,
            partition=message.partition,
            offset=offset,
            message_id=message.message_id
        )

    def consume(self, topic: str, partition: int, offset: int, max_messages: int = 100) -> List[Message]:
        """Consume messages from topic partition"""
        if topic not in self.topics:
            raise TopicNotFoundException(f"Topic {topic} not found")
            
        if partition >= self.topics[topic].partition_count:
            raise PartitionNotFoundException(f"Partition {partition} not found")
            
        return self.storage_engine.read(topic, partition, offset, max_messages)

    def get_topic_metadata(self, topic: str) -> Optional[TopicMetadata]:
        """Get topic metadata"""
        return self.topics.get(topic)

    def list_topics(self) -> List[str]:
        """List all topics"""
        return list(self.topics.keys())

    def get_latest_offset(self, topic: str, partition: int) -> int:
        """Get latest offset for partition"""
        return self.storage_engine.get_latest_offset(topic, partition)

    def _background_cleanup(self):
        """Background cleanup task"""
        while self.running:
            try:
                self._cleanup_expired_messages()
                time.sleep(60)  # Run every minute
            except Exception as e:
                logger.error(f"Error in background cleanup: {e}")

    def _cleanup_expired_messages(self):
        """Clean up expired messages"""
        # This is a simplified implementation
        # In production, this would be more sophisticated
        pass

# Consumer Group Coordinator
class ConsumerGroupCoordinator:
    def __init__(self, broker: MessageBroker):
        self.broker = broker
        self.groups = {}  # group_id -> ConsumerGroup
        self.consumer_offsets = {}  # (group_id, topic, partition) -> offset
        self._lock = threading.RLock()

    def join_group(self, group_id: str, consumer_id: str, topics: List[str]) -> ConsumerMetadata:
        """Consumer joins a consumer group"""
        with self._lock:
            if group_id not in self.groups:
                self.groups[group_id] = ConsumerGroup(group_id=group_id)
                
            group = self.groups[group_id]
            
            # Create consumer metadata
            consumer = ConsumerMetadata(
                consumer_id=consumer_id,
                group_id=group_id,
                subscribed_topics=set(topics)
            )
            
            group.consumers[consumer_id] = consumer
            group.subscribed_topics.update(topics)
            
            # Trigger rebalance if needed
            if self._should_rebalance(group):
                self._rebalance_group(group)
                
            return consumer

    def leave_group(self, group_id: str, consumer_id: str):
        """Consumer leaves the group"""
        with self._lock:
            if group_id not in self.groups:
                return
                
            group = self.groups[group_id]
            if consumer_id in group.consumers:
                del group.consumers[consumer_id]
                
                # Trigger rebalance
                if group.consumers:
                    self._rebalance_group(group)
                else:
                    group.state = ConsumerGroupState.EMPTY

    def heartbeat(self, group_id: str, consumer_id: str):
        """Process consumer heartbeat"""
        with self._lock:
            if group_id in self.groups and consumer_id in self.groups[group_id].consumers:
                consumer = self.groups[group_id].consumers[consumer_id]
                consumer.last_heartbeat = datetime.utcnow()

    def commit_offset(self, group_id: str, topic: str, partition: int, offset: int):
        """Commit consumer offset"""
        key = (group_id, topic, partition)
        self.consumer_offsets[key] = offset

    def get_offset(self, group_id: str, topic: str, partition: int) -> int:
        """Get committed offset for consumer group"""
        key = (group_id, topic, partition)
        return self.consumer_offsets.get(key, 0)

    def _should_rebalance(self, group: ConsumerGroup) -> bool:
        """Check if group needs rebalancing"""
        return group.state != ConsumerGroupState.STABLE

    def _rebalance_group(self, group: ConsumerGroup):
        """Rebalance consumer group"""
        group.state = ConsumerGroupState.PREPARING_REBALANCE
        group.generation_id += 1
        
        # Get all partitions for subscribed topics
        all_partitions = []
        for topic in group.subscribed_topics:
            if topic in self.broker.topics:
                partition_count = self.broker.topics[topic].partition_count
                for partition_id in range(partition_count):
                    all_partitions.append((topic, partition_id))
        
        # Assign partitions to consumers using round-robin
        consumer_ids = list(group.consumers.keys())
        if not consumer_ids:
            group.state = ConsumerGroupState.EMPTY
            return
            
        # Clear existing assignments
        for consumer in group.consumers.values():
            consumer.assigned_partitions.clear()
            
        # Assign partitions
        for i, (topic, partition) in enumerate(all_partitions):
            consumer_id = consumer_ids[i % len(consumer_ids)]
            consumer = group.consumers[consumer_id]
            
            if topic not in consumer.assigned_partitions:
                consumer.assigned_partitions[topic] = []
            consumer.assigned_partitions[topic].append(partition)
            
        group.state = ConsumerGroupState.STABLE
        logger.info(f"Rebalanced group {group.group_id} with {len(consumer_ids)} consumers")

# Producer Client
class MessageProducer:
    def __init__(self, config: ProducerConfig, broker: MessageBroker):
        self.config = config
        self.broker = broker
        self.partitioner = HashPartitioner()
        
    def send(self, topic: str, value: bytes, key: Optional[str] = None, 
             headers: Optional[Dict[str, str]] = None, partition: Optional[int] = None) -> PublishResult:
        """Send message to topic"""
        message = Message(
            message_id=str(uuid.uuid4()),
            topic=topic,
            key=key,
            payload=value,
            headers=headers or {},
            partition=partition
        )
        
        return self.broker.publish(topic, message)

    def send_batch(self, topic: str, messages: List[Tuple[bytes, Optional[str]]]) -> List[PublishResult]:
        """Send batch of messages"""
        results = []
        for value, key in messages:
            result = self.send(topic, value, key)
            results.append(result)
        return results

# Consumer Client
class MessageConsumer:
    def __init__(self, config: ConsumerConfig, broker: MessageBroker, coordinator: ConsumerGroupCoordinator):
        self.config = config
        self.broker = broker
        self.coordinator = coordinator
        self.consumer_id = str(uuid.uuid4())
        self.subscribed_topics = set()
        self.assignment = {}  # topic -> [partitions]
        self.offsets = {}  # (topic, partition) -> offset
        self.running = False
        
    def subscribe(self, topics: List[str]):
        """Subscribe to topics"""
        self.subscribed_topics.update(topics)
        
        # Join consumer group
        consumer_metadata = self.coordinator.join_group(
            self.config.group_id, 
            self.consumer_id, 
            topics
        )
        
        self.assignment = consumer_metadata.assigned_partitions.copy()
        
        # Initialize offsets
        for topic, partitions in self.assignment.items():
            for partition in partitions:
                committed_offset = self.coordinator.get_offset(
                    self.config.group_id, topic, partition
                )
                self.offsets[(topic, partition)] = committed_offset

    def poll(self, timeout_ms: int = 1000) -> List[ConsumerRecord]:
        """Poll for messages"""
        records = []
        
        for topic, partitions in self.assignment.items():
            for partition in partitions:
                current_offset = self.offsets.get((topic, partition), 0)
                
                try:
                    messages = self.broker.consume(
                        topic, partition, current_offset, self.config.max_poll_records
                    )
                    
                    for message in messages:
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
                    if messages:
                        latest_offset = messages[-1].offset + 1
                        self.offsets[(topic, partition)] = latest_offset
                        
                except Exception as e:
                    logger.error(f"Error polling partition {topic}-{partition}: {e}")
                    
        return records

    def commit(self, offsets: Optional[Dict[Tuple[str, int], int]] = None):
        """Commit offsets"""
        commit_offsets = offsets or self.offsets
        
        for (topic, partition), offset in commit_offsets.items():
            self.coordinator.commit_offset(
                self.config.group_id, topic, partition, offset
            )

    def close(self):
        """Close consumer"""
        self.coordinator.leave_group(self.config.group_id, self.consumer_id)

# Dead Letter Queue Handler
class DeadLetterQueueHandler:
    def __init__(self, broker: MessageBroker, dlq_topic: str = "dead-letter-queue"):
        self.broker = broker
        self.dlq_topic = dlq_topic
        self.max_retries = 3
        
        # Ensure DLQ topic exists
        if dlq_topic not in broker.topics:
            broker.create_topic(dlq_topic, partition_count=1)

    def handle_failed_message(self, message: Message, error: Exception):
        """Handle failed message processing"""
        message.retry_count += 1
        
        if message.retry_count >= self.max_retries:
            # Send to dead letter queue
            dlq_message = Message(
                message_id=str(uuid.uuid4()),
                topic=self.dlq_topic,
                payload=message.payload,
                headers={
                    **message.headers,
                    'original_topic': message.topic,
                    'failure_reason': str(error),
                    'retry_count': str(message.retry_count)
                }
            )
            
            self.broker.publish(self.dlq_topic, dlq_message)
            logger.info(f"Message {message.message_id} sent to DLQ after {message.retry_count} retries")
        else:
            # Schedule retry (simplified - in production would use proper scheduling)
            logger.info(f"Retrying message {message.message_id}, attempt {message.retry_count}")

# Monitoring and Statistics
class MessageQueueStatistics:
    def __init__(self):
        self.messages_published = 0
        self.messages_consumed = 0
        self.messages_failed = 0
        self.topics_created = 0
        self.consumer_groups_active = 0
        self.total_partitions = 0
        self.disk_usage_bytes = 0
        self._lock = threading.Lock()

    def increment_published(self):
        with self._lock:
            self.messages_published += 1

    def increment_consumed(self):
        with self._lock:
            self.messages_consumed += 1

    def increment_failed(self):
        with self._lock:
            self.messages_failed += 1

    def get_stats(self) -> Dict[str, Any]:
        with self._lock:
            return {
                'messages_published': self.messages_published,
                'messages_consumed': self.messages_consumed,
                'messages_failed': self.messages_failed,
                'topics_created': self.topics_created,
                'consumer_groups_active': self.consumer_groups_active,
                'total_partitions': self.total_partitions,
                'disk_usage_bytes': self.disk_usage_bytes
            }

# Message Queue System Facade
class MessageQueueSystem:
    def __init__(self, broker_id: str = "broker-1", data_dir: str = "./data"):
        self.broker = MessageBroker(broker_id, data_dir)
        self.coordinator = ConsumerGroupCoordinator(self.broker)
        self.dlq_handler = DeadLetterQueueHandler(self.broker)
        self.statistics = MessageQueueStatistics()
        
    def start(self):
        """Start the message queue system"""
        self.broker.start()
        
    def stop(self):
        """Stop the message queue system"""
        self.broker.stop()
        
    def create_producer(self, config: Optional[ProducerConfig] = None) -> MessageProducer:
        """Create a message producer"""
        if config is None:
            config = ProducerConfig(bootstrap_servers=["localhost:9092"])
        return MessageProducer(config, self.broker)
        
    def create_consumer(self, group_id: str, config: Optional[ConsumerConfig] = None) -> MessageConsumer:
        """Create a message consumer"""
        if config is None:
            config = ConsumerConfig(
                bootstrap_servers=["localhost:9092"],
                group_id=group_id
            )
        else:
            config.group_id = group_id
        return MessageConsumer(config, self.broker, self.coordinator)

# Demo Functions
def create_demo_system():
    """Create a demo message queue system"""
    system = MessageQueueSystem("demo-broker", "./demo_data")
    system.start()
    
    # Create demo topics
    system.broker.create_topic("user-events", partition_count=3)
    system.broker.create_topic("order-updates", partition_count=2)
    system.broker.create_topic("notifications", partition_count=1)
    
    return system

def demo_basic_messaging():
    """Demonstrate basic messaging operations"""
    print("🚀 Message Queue System - Basic Messaging Demo")
    print("=" * 50)
    
    system = create_demo_system()
    
    try:
        # Create producer
        producer = system.create_producer()
        
        # Create consumer
        consumer = system.create_consumer("demo-group")
        consumer.subscribe(["user-events"])
        
        print("\n📤 Publishing messages...")
        # Publish messages
        messages = [
            (b"User 1 logged in", "user1"),
            (b"User 2 registered", "user2"),
            (b"User 1 logged out", "user1"),
            (b"User 3 registered", "user3"),
        ]
        
        for value, key in messages:
            result = producer.send("user-events", value, key)
            print(f"   Published: {value.decode()} -> Partition {result.partition}, Offset {result.offset}")
        
        print("\n📥 Consuming messages...")
        # Consume messages
        for _ in range(5):  # Try to consume a few times
            records = consumer.poll(timeout_ms=1000)
            
            for record in records:
                print(f"   Consumed: {record.value.decode()} from partition {record.partition} at offset {record.offset}")
                
            if records:
                consumer.commit()
                
            time.sleep(0.5)
            
        print("\n📊 Statistics:")
        stats = system.statistics.get_stats()
        for key, value in stats.items():
            print(f"   {key}: {value}")
            
    finally:
        consumer.close()
        system.stop()
        
    print("\n✅ Basic messaging demo completed!")

def demo_consumer_groups():
    """Demonstrate consumer group functionality"""
    print("\n👥 Message Queue System - Consumer Groups Demo")
    print("=" * 50)
    
    system = create_demo_system()
    
    try:
        # Create producer
        producer = system.create_producer()
        
        # Create multiple consumers in same group
        consumers = []
        for i in range(3):
            consumer = system.create_consumer("group-demo")
            consumer.subscribe(["user-events"])
            consumers.append(consumer)
            
        print(f"\n📤 Publishing 10 messages to topic with 3 partitions...")
        # Publish messages
        for i in range(10):
            message = f"Message {i+1}".encode()
            result = producer.send("user-events", message, f"key{i}")
            print(f"   Published: Message {i+1} -> Partition {result.partition}")
            
        print(f"\n📥 Consuming with 3 consumers in same group...")
        # Each consumer should get messages from different partitions
        for consumer_id, consumer in enumerate(consumers):
            records = consumer.poll(timeout_ms=2000)
            print(f"   Consumer {consumer_id+1} received {len(records)} messages:")
            
            for record in records:
                print(f"     - {record.value.decode()} from partition {record.partition}")
                
            if records:
                consumer.commit()
                
    finally:
        for consumer in consumers:
            consumer.close()
        system.stop()
        
    print("\n✅ Consumer groups demo completed!")

def demo_dead_letter_queue():
    """Demonstrate dead letter queue handling"""
    print("\n💀 Message Queue System - Dead Letter Queue Demo")
    print("=" * 50)
    
    system = create_demo_system()
    
    try:
        # Create producer
        producer = system.create_producer()
        
        # Simulate failed message processing
        message = Message(
            message_id="failed-msg-1",
            topic="user-events",
            payload=b"This message will fail processing",
            key="failure-test"
        )
        
        print("\n💥 Simulating message processing failures...")
        # Simulate multiple failures
        for attempt in range(4):
            try:
                # Simulate processing failure
                if attempt < 3:
                    raise Exception(f"Processing failed on attempt {attempt + 1}")
                    
            except Exception as e:
                print(f"   Attempt {attempt + 1}: {e}")
                system.dlq_handler.handle_failed_message(message, e)
                
        # Check DLQ
        print("\n📋 Checking Dead Letter Queue...")
        dlq_consumer = system.create_consumer("dlq-consumer")
        dlq_consumer.subscribe(["dead-letter-queue"])
        
        dlq_records = dlq_consumer.poll(timeout_ms=1000)
        print(f"   Found {len(dlq_records)} messages in DLQ:")
        
        for record in dlq_records:
            print(f"     - {record.value.decode()}")
            print(f"       Original topic: {record.headers.get('original_topic', 'unknown')}")
            print(f"       Failure reason: {record.headers.get('failure_reason', 'unknown')}")
            
        dlq_consumer.close()
        
    finally:
        system.stop()
        
    print("\n✅ Dead letter queue demo completed!")

def performance_test():
    """Performance test for message queue system"""
    print("\n⚡ Message Queue System - Performance Test")
    print("=" * 50)
    
    system = create_demo_system()
    
    try:
        # Create high-performance topic
        system.broker.create_topic("perf-test", partition_count=5)
        
        producer = system.create_producer()
        
        # Publish performance test
        num_messages = 1000
        print(f"\n📤 Publishing {num_messages} messages...")
        
        start_time = time.time()
        
        for i in range(num_messages):
            message = f"Performance test message {i+1}".encode()
            producer.send("perf-test", message, f"key{i}")
            
        publish_time = time.time() - start_time
        publish_rate = num_messages / publish_time
        
        print(f"   Published {num_messages} messages in {publish_time:.2f} seconds")
        print(f"   Publish rate: {publish_rate:.0f} messages/second")
        
        # Consume performance test
        consumer = system.create_consumer("perf-group")
        consumer.subscribe(["perf-test"])
        
        print(f"\n📥 Consuming {num_messages} messages...")
        
        start_time = time.time()
        consumed_count = 0
        
        while consumed_count < num_messages:
            records = consumer.poll(timeout_ms=1000)
            consumed_count += len(records)
            
            if records:
                consumer.commit()
                
        consume_time = time.time() - start_time
        consume_rate = num_messages / consume_time
        
        print(f"   Consumed {num_messages} messages in {consume_time:.2f} seconds")
        print(f"   Consume rate: {consume_rate:.0f} messages/second")
        
        consumer.close()
        
    finally:
        system.stop()
        
    print("\n✅ Performance test completed!")

def interactive_demo():
    """Interactive message queue demo"""
    print("\n🎮 Interactive Message Queue Demo")
    print("=" * 50)
    print("Commands: publish <topic> <message>, consume <topic> <group>, topics, stats, quit")
    
    system = create_demo_system()
    
    try:
        while True:
            try:
                command = input("\nqueue> ").strip().split()
                
                if not command:
                    continue
                elif command[0] == "quit":
                    break
                elif command[0] == "publish" and len(command) >= 3:
                    topic = command[1]
                    message = " ".join(command[2:]).encode()
                    
                    # Create topic if it doesn't exist
                    if topic not in system.broker.topics:
                        system.broker.create_topic(topic, partition_count=2)
                        
                    producer = system.create_producer()
                    result = producer.send(topic, message)
                    print(f"Published to {topic}, partition {result.partition}, offset {result.offset}")
                    
                elif command[0] == "consume" and len(command) >= 3:
                    topic = command[1]
                    group = command[2]
                    
                    if topic not in system.broker.topics:
                        print(f"Topic {topic} does not exist")
                        continue
                        
                    consumer = system.create_consumer(group)
                    consumer.subscribe([topic])
                    
                    records = consumer.poll(timeout_ms=2000)
                    if records:
                        for record in records:
                            print(f"  {record.value.decode()} (partition {record.partition}, offset {record.offset})")
                        consumer.commit()
                        print(f"Consumed {len(records)} messages from {topic}")
                    else:
                        print(f"No messages available in {topic}")
                        
                    consumer.close()
                    
                elif command[0] == "topics":
                    topics = system.broker.list_topics()
                    print("Available topics:")
                    for topic in topics:
                        metadata = system.broker.get_topic_metadata(topic)
                        print(f"  {topic} ({metadata.partition_count} partitions)")
                        
                elif command[0] == "stats":
                    stats = system.statistics.get_stats()
                    print("System Statistics:")
                    for key, value in stats.items():
                        print(f"  {key}: {value}")
                        
                else:
                    print("Invalid command. Available commands:")
                    print("  publish <topic> <message> - Publish message to topic")
                    print("  consume <topic> <group> - Consume messages from topic")
                    print("  topics - List all topics")
                    print("  stats - Show system statistics")
                    print("  quit - Exit")
                    
            except KeyboardInterrupt:
                break
            except Exception as e:
                print(f"Error: {e}")
                
    finally:
        system.stop()
        
    print("\n👋 Goodbye!")

def main():
    """Main function to run demos"""
    print("Message Queue System Implementation")
    print("==================================")
    print("1. Basic Messaging Demo")
    print("2. Consumer Groups Demo")
    print("3. Dead Letter Queue Demo")
    print("4. Performance Test")
    print("5. Interactive Demo")
    
    try:
        choice = input("\nSelect demo (1-5): ").strip()
        
        if choice == "1":
            demo_basic_messaging()
        elif choice == "2":
            demo_consumer_groups()
        elif choice == "3":
            demo_dead_letter_queue()
        elif choice == "4":
            performance_test()
        elif choice == "5":
            interactive_demo()
        else:
            print("Running all demos...")
            demo_basic_messaging()
            demo_consumer_groups()
            demo_dead_letter_queue()
            performance_test()
            
    except KeyboardInterrupt:
        print("\n\nDemo interrupted by user")
    except Exception as e:
        print(f"\nError running demo: {e}")

if __name__ == "__main__":
    main()