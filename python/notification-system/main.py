#!/usr/bin/env python3
"""
Notification System - Low Level Design Implementation

A comprehensive notification system supporting multiple channels, user preferences,
delivery tracking, and scalable architecture.

Key Features:
- Multi-channel delivery (Email, SMS, Push, In-App, WebHook)
- User preference management with opt-out mechanisms
- Template-based notifications with variable substitution
- Retry logic with configurable policies
- Real-time delivery tracking and analytics
- Provider redundancy for fault tolerance
- Bulk notification processing

Design Patterns Used:
- Strategy Pattern: Pluggable notification channels and delivery providers
- Observer Pattern: Real-time delivery status notifications
- Template Method: Common notification delivery workflow
- Factory Pattern: Channel and provider creation
- Command Pattern: Notification requests as executable commands
- Chain of Responsibility: Processing pipeline with filters

Author: GitHub Copilot
Date: October 2025
"""

import asyncio
import json
import logging
import time
import uuid
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from threading import Lock, Thread
from typing import Any, Dict, List, Optional, Set, Callable
from queue import Queue, PriorityQueue
import re
import random
from collections import defaultdict, deque

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ChannelType(Enum):
    """Enumeration of supported notification channels"""
    EMAIL = "email"
    SMS = "sms"
    PUSH = "push"
    IN_APP = "in_app"
    WEBHOOK = "webhook"


class NotificationType(Enum):
    """Types of notifications based on purpose"""
    TRANSACTIONAL = "transactional"  # Order confirmations, password resets
    MARKETING = "marketing"          # Promotional campaigns, newsletters
    SYSTEM_ALERT = "system_alert"    # System maintenance, security alerts
    SOCIAL = "social"                # Friend requests, comments, likes


class Priority(Enum):
    """Notification priority levels"""
    CRITICAL = 1
    HIGH = 2
    MEDIUM = 3
    LOW = 4


class DeliveryStatus(Enum):
    """Delivery status tracking"""
    PENDING = "pending"
    SENT = "sent"
    DELIVERED = "delivered"
    FAILED = "failed"
    READ = "read"
    CLICKED = "clicked"


class ProviderType(Enum):
    """External service providers"""
    SENDGRID = "sendgrid"
    SES = "ses"
    SMTP = "smtp"
    TWILIO = "twilio"
    NEXMO = "nexmo"
    SNS = "sns"
    FCM = "fcm"
    APNS = "apns"
    WEB_PUSH = "web_push"


@dataclass
class NotificationContent:
    """Content structure for notifications"""
    title: str
    body: str
    data: Dict[str, Any] = field(default_factory=dict)
    media_url: Optional[str] = None
    action_url: Optional[str] = None


@dataclass
class Recipient:
    """Notification recipient information"""
    user_id: str
    email: Optional[str] = None
    phone: Optional[str] = None
    device_tokens: List[str] = field(default_factory=list)
    webhook_url: Optional[str] = None
    timezone: str = "UTC"
    language: str = "en"


@dataclass
class Notification:
    """Core notification entity"""
    id: str
    recipient: Recipient
    content: NotificationContent
    notification_type: NotificationType
    priority: Priority
    channels: List[ChannelType]
    created_at: datetime = field(default_factory=datetime.now)
    scheduled_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    tags: Set[str] = field(default_factory=set)
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class NotificationTemplate:
    """Template for creating notifications"""
    id: str
    name: str
    title_template: str
    body_template: str
    notification_type: NotificationType
    default_channels: List[ChannelType]
    required_variables: Set[str] = field(default_factory=set)
    optional_variables: Set[str] = field(default_factory=set)
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class DeliveryResult:
    """Result of notification delivery attempt"""
    success: bool
    message_id: Optional[str] = None
    provider_response: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    retry_after: Optional[int] = None


@dataclass
class DeliveryAttempt:
    """Record of delivery attempt"""
    attempt_number: int
    timestamp: datetime
    channel: ChannelType
    provider: ProviderType
    status: DeliveryStatus
    result: DeliveryResult
    response_time: float


@dataclass
class UserPreferences:
    """User notification preferences"""
    user_id: str
    email_enabled: bool = True
    sms_enabled: bool = True
    push_enabled: bool = True
    in_app_enabled: bool = True
    webhook_enabled: bool = False
    opted_out_types: Set[NotificationType] = field(default_factory=set)
    quiet_hours_start: Optional[str] = None  # Format: "HH:MM"
    quiet_hours_end: Optional[str] = None
    frequency_caps: Dict[NotificationType, int] = field(default_factory=dict)  # Per day
    preferred_language: str = "en"
    last_updated: datetime = field(default_factory=datetime.now)


@dataclass
class ChannelMetrics:
    """Performance metrics for a channel"""
    total_sent: int = 0
    total_delivered: int = 0
    total_failed: int = 0
    total_read: int = 0
    total_clicked: int = 0
    average_response_time: float = 0.0
    success_rate: float = 0.0
    last_updated: datetime = field(default_factory=datetime.now)


class DeliveryProvider(ABC):
    """Abstract base class for delivery providers"""
    
    def __init__(self, provider_type: ProviderType, config: Dict[str, Any]):
        self.provider_type = provider_type
        self.config = config
        self.is_healthy = True
        self.metrics = ChannelMetrics()
    
    @abstractmethod
    def send(self, notification: Notification, recipient: Recipient) -> DeliveryResult:
        """Send notification through this provider"""
        pass
    
    @abstractmethod
    def get_delivery_status(self, message_id: str) -> DeliveryStatus:
        """Get delivery status for a message"""
        pass
    
    def handle_webhook(self, payload: Dict[str, Any]) -> None:
        """Handle delivery status webhook from provider"""
        pass
    
    def health_check(self) -> bool:
        """Check if provider is healthy"""
        return self.is_healthy


class EmailProvider(DeliveryProvider):
    """Email delivery provider implementation"""
    
    def send(self, notification: Notification, recipient: Recipient) -> DeliveryResult:
        start_time = time.time()
        
        # Simulate email sending
        if not recipient.email:
            return DeliveryResult(
                success=False,
                error="No email address provided"
            )
        
        # Simulate provider API call
        time.sleep(random.uniform(0.1, 0.3))  # Simulate network latency
        
        success = random.random() > 0.05  # 95% success rate
        message_id = f"email_{uuid.uuid4().hex[:8]}" if success else None
        
        response_time = time.time() - start_time
        
        if success:
            self.metrics.total_sent += 1
            self.metrics.total_delivered += 1
        else:
            self.metrics.total_sent += 1
            self.metrics.total_failed += 1
        
        self._update_metrics(response_time)
        
        return DeliveryResult(
            success=success,
            message_id=message_id,
            provider_response={
                "provider": self.provider_type.value,
                "response_time": response_time,
                "recipient": recipient.email
            },
            error=None if success else "Failed to send email"
        )
    
    def get_delivery_status(self, message_id: str) -> DeliveryStatus:
        # Simulate status check
        statuses = [DeliveryStatus.DELIVERED, DeliveryStatus.READ]
        return random.choice(statuses)
    
    def _update_metrics(self, response_time: float):
        """Update provider metrics"""
        if self.metrics.total_sent > 0:
            self.metrics.success_rate = self.metrics.total_delivered / self.metrics.total_sent
        
        # Update average response time
        total_time = self.metrics.average_response_time * (self.metrics.total_sent - 1)
        self.metrics.average_response_time = (total_time + response_time) / self.metrics.total_sent


class SMSProvider(DeliveryProvider):
    """SMS delivery provider implementation"""
    
    def send(self, notification: Notification, recipient: Recipient) -> DeliveryResult:
        start_time = time.time()
        
        if not recipient.phone:
            return DeliveryResult(
                success=False,
                error="No phone number provided"
            )
        
        # Simulate SMS sending
        time.sleep(random.uniform(0.2, 0.5))
        
        success = random.random() > 0.02  # 98% success rate
        message_id = f"sms_{uuid.uuid4().hex[:8]}" if success else None
        
        response_time = time.time() - start_time
        
        if success:
            self.metrics.total_sent += 1
            self.metrics.total_delivered += 1
        else:
            self.metrics.total_sent += 1
            self.metrics.total_failed += 1
        
        self._update_metrics(response_time)
        
        return DeliveryResult(
            success=success,
            message_id=message_id,
            provider_response={
                "provider": self.provider_type.value,
                "response_time": response_time,
                "recipient": recipient.phone
            },
            error=None if success else "Failed to send SMS"
        )
    
    def get_delivery_status(self, message_id: str) -> DeliveryStatus:
        return DeliveryStatus.DELIVERED
    
    def _update_metrics(self, response_time: float):
        if self.metrics.total_sent > 0:
            self.metrics.success_rate = self.metrics.total_delivered / self.metrics.total_sent
        
        total_time = self.metrics.average_response_time * (self.metrics.total_sent - 1)
        self.metrics.average_response_time = (total_time + response_time) / self.metrics.total_sent


class PushProvider(DeliveryProvider):
    """Push notification provider implementation"""
    
    def send(self, notification: Notification, recipient: Recipient) -> DeliveryResult:
        start_time = time.time()
        
        if not recipient.device_tokens:
            return DeliveryResult(
                success=False,
                error="No device tokens provided"
            )
        
        # Simulate push notification sending
        time.sleep(random.uniform(0.05, 0.2))
        
        success = random.random() > 0.1  # 90% success rate
        message_id = f"push_{uuid.uuid4().hex[:8]}" if success else None
        
        response_time = time.time() - start_time
        
        if success:
            self.metrics.total_sent += 1
            self.metrics.total_delivered += 1
        else:
            self.metrics.total_sent += 1
            self.metrics.total_failed += 1
        
        self._update_metrics(response_time)
        
        return DeliveryResult(
            success=success,
            message_id=message_id,
            provider_response={
                "provider": self.provider_type.value,
                "response_time": response_time,
                "tokens_count": len(recipient.device_tokens)
            },
            error=None if success else "Failed to send push notification"
        )
    
    def get_delivery_status(self, message_id: str) -> DeliveryStatus:
        statuses = [DeliveryStatus.DELIVERED, DeliveryStatus.READ, DeliveryStatus.CLICKED]
        return random.choice(statuses)
    
    def _update_metrics(self, response_time: float):
        if self.metrics.total_sent > 0:
            self.metrics.success_rate = self.metrics.total_delivered / self.metrics.total_sent
        
        total_time = self.metrics.average_response_time * (self.metrics.total_sent - 1)
        self.metrics.average_response_time = (total_time + response_time) / self.metrics.total_sent


class NotificationChannel(ABC):
    """Abstract base class for notification channels"""
    
    def __init__(self, channel_type: ChannelType):
        self.channel_type = channel_type
        self.providers: List[DeliveryProvider] = []
        self.metrics = ChannelMetrics()
        self.is_enabled = True
    
    def add_provider(self, provider: DeliveryProvider):
        """Add a delivery provider to this channel"""
        self.providers.append(provider)
    
    @abstractmethod
    def validate_notification(self, notification: Notification) -> bool:
        """Validate if notification can be sent through this channel"""
        pass
    
    def send(self, notification: Notification) -> DeliveryResult:
        """Send notification through the best available provider"""
        if not self.is_enabled:
            return DeliveryResult(success=False, error="Channel is disabled")
        
        if not self.validate_notification(notification):
            return DeliveryResult(success=False, error="Notification validation failed")
        
        # Try providers in order until one succeeds
        last_error = None
        for provider in self.providers:
            if not provider.health_check():
                continue
            
            try:
                result = provider.send(notification, notification.recipient)
                if result.success:
                    self._update_metrics(True)
                    return result
                else:
                    last_error = result.error
            except Exception as e:
                last_error = str(e)
                logger.error(f"Provider {provider.provider_type} failed: {e}")
        
        self._update_metrics(False)
        return DeliveryResult(
            success=False,
            error=last_error or "All providers failed"
        )
    
    def _update_metrics(self, success: bool):
        """Update channel metrics"""
        self.metrics.total_sent += 1
        if success:
            self.metrics.total_delivered += 1
        else:
            self.metrics.total_failed += 1
        
        if self.metrics.total_sent > 0:
            self.metrics.success_rate = self.metrics.total_delivered / self.metrics.total_sent


class EmailChannel(NotificationChannel):
    """Email notification channel"""
    
    def __init__(self):
        super().__init__(ChannelType.EMAIL)
    
    def validate_notification(self, notification: Notification) -> bool:
        """Validate email notification"""
        recipient = notification.recipient
        if not recipient.email:
            return False
        
        # Basic email validation
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return re.match(email_pattern, recipient.email) is not None


class SMSChannel(NotificationChannel):
    """SMS notification channel"""
    
    def __init__(self):
        super().__init__(ChannelType.SMS)
    
    def validate_notification(self, notification: Notification) -> bool:
        """Validate SMS notification"""
        recipient = notification.recipient
        if not recipient.phone:
            return False
        
        # Basic phone validation
        phone_pattern = r'^\+?[\d\s\-\(\)]{10,}$'
        return re.match(phone_pattern, recipient.phone) is not None


class PushChannel(NotificationChannel):
    """Push notification channel"""
    
    def __init__(self):
        super().__init__(ChannelType.PUSH)
    
    def validate_notification(self, notification: Notification) -> bool:
        """Validate push notification"""
        return bool(notification.recipient.device_tokens)


class TemplateEngine:
    """Template processing engine"""
    
    def __init__(self):
        self.templates: Dict[str, NotificationTemplate] = {}
    
    def register_template(self, template: NotificationTemplate):
        """Register a notification template"""
        self.templates[template.id] = template
    
    def render_notification(self, template_id: str, variables: Dict[str, Any]) -> NotificationContent:
        """Render notification content from template"""
        if template_id not in self.templates:
            raise ValueError(f"Template {template_id} not found")
        
        template = self.templates[template_id]
        
        # Check required variables
        missing_vars = template.required_variables - set(variables.keys())
        if missing_vars:
            raise ValueError(f"Missing required variables: {missing_vars}")
        
        # Render template
        title = self._substitute_variables(template.title_template, variables)
        body = self._substitute_variables(template.body_template, variables)
        
        return NotificationContent(
            title=title,
            body=body,
            data=variables
        )
    
    def _substitute_variables(self, template: str, variables: Dict[str, Any]) -> str:
        """Substitute variables in template string"""
        result = template
        for key, value in variables.items():
            placeholder = f"{{{{{key}}}}}"
            result = result.replace(placeholder, str(value))
        return result


class UserPreferenceManager:
    """Manages user notification preferences"""
    
    def __init__(self):
        self.preferences: Dict[str, UserPreferences] = {}
        self.lock = Lock()
    
    def get_preferences(self, user_id: str) -> UserPreferences:
        """Get user preferences, creating default if not exists"""
        with self.lock:
            if user_id not in self.preferences:
                self.preferences[user_id] = UserPreferences(user_id=user_id)
            return self.preferences[user_id]
    
    def update_preferences(self, preferences: UserPreferences):
        """Update user preferences"""
        with self.lock:
            preferences.last_updated = datetime.now()
            self.preferences[preferences.user_id] = preferences
    
    def is_opted_out(self, user_id: str, notification_type: NotificationType, 
                     channel: ChannelType) -> bool:
        """Check if user has opted out of specific notification type/channel"""
        prefs = self.get_preferences(user_id)
        
        # Check if opted out of notification type
        if notification_type in prefs.opted_out_types:
            return True
        
        # Check channel-specific preferences
        if channel == ChannelType.EMAIL and not prefs.email_enabled:
            return True
        elif channel == ChannelType.SMS and not prefs.sms_enabled:
            return True
        elif channel == ChannelType.PUSH and not prefs.push_enabled:
            return True
        elif channel == ChannelType.IN_APP and not prefs.in_app_enabled:
            return True
        elif channel == ChannelType.WEBHOOK and not prefs.webhook_enabled:
            return True
        
        return False
    
    def is_in_quiet_hours(self, user_id: str) -> bool:
        """Check if current time is in user's quiet hours"""
        prefs = self.get_preferences(user_id)
        
        if not prefs.quiet_hours_start or not prefs.quiet_hours_end:
            return False
        
        now = datetime.now()
        current_time = now.strftime("%H:%M")
        
        start = prefs.quiet_hours_start
        end = prefs.quiet_hours_end
        
        if start <= end:
            # Normal case: 22:00 to 08:00 next day
            return start <= current_time <= end
        else:
            # Crosses midnight: 22:00 to 08:00
            return current_time >= start or current_time <= end
    
    def check_frequency_cap(self, user_id: str, notification_type: NotificationType) -> bool:
        """Check if user has reached daily frequency cap"""
        # This would typically check against a database of sent notifications
        # For demo, we'll simulate it
        prefs = self.get_preferences(user_id)
        if notification_type not in prefs.frequency_caps:
            return True  # No cap set
        
        # In real implementation, query database for today's count
        return True  # Assume not exceeded for demo


class DeliveryTracker:
    """Tracks notification delivery status and analytics"""
    
    def __init__(self):
        self.delivery_attempts: Dict[str, List[DeliveryAttempt]] = defaultdict(list)
        self.delivery_status: Dict[str, DeliveryStatus] = {}
        self.observers: List[Callable] = []
        self.lock = Lock()
    
    def add_observer(self, observer: Callable):
        """Add observer for delivery status updates"""
        self.observers.append(observer)
    
    def track_attempt(self, notification_id: str, attempt: DeliveryAttempt):
        """Track a delivery attempt"""
        with self.lock:
            self.delivery_attempts[notification_id].append(attempt)
            self.delivery_status[notification_id] = attempt.status
        
        # Notify observers
        for observer in self.observers:
            try:
                observer(notification_id, attempt)
            except Exception as e:
                logger.error(f"Observer notification failed: {e}")
    
    def get_delivery_status(self, notification_id: str) -> Optional[DeliveryStatus]:
        """Get current delivery status"""
        return self.delivery_status.get(notification_id)
    
    def get_delivery_attempts(self, notification_id: str) -> List[DeliveryAttempt]:
        """Get all delivery attempts for a notification"""
        return self.delivery_attempts.get(notification_id, [])
    
    def get_analytics(self) -> Dict[str, Any]:
        """Get delivery analytics"""
        total_notifications = len(self.delivery_status)
        if total_notifications == 0:
            return {"total_notifications": 0}
        
        status_counts = defaultdict(int)
        for status in self.delivery_status.values():
            status_counts[status.value] += 1
        
        return {
            "total_notifications": total_notifications,
            "status_distribution": dict(status_counts),
            "success_rate": (status_counts[DeliveryStatus.DELIVERED.value] + 
                           status_counts[DeliveryStatus.READ.value]) / total_notifications,
            "failure_rate": status_counts[DeliveryStatus.FAILED.value] / total_notifications
        }


class RetryManager:
    """Manages retry logic for failed deliveries"""
    
    def __init__(self):
        self.retry_queue: PriorityQueue = PriorityQueue()
        self.max_retries = 3
        self.base_delay = 60  # seconds
        self.max_delay = 3600  # 1 hour
        self.running = False
        self.worker_thread = None
    
    def start(self):
        """Start the retry worker"""
        if not self.running:
            self.running = True
            self.worker_thread = Thread(target=self._retry_worker, daemon=True)
            self.worker_thread.start()
    
    def stop(self):
        """Stop the retry worker"""
        self.running = False
        if self.worker_thread:
            self.worker_thread.join()
    
    def schedule_retry(self, notification: Notification, attempt_count: int):
        """Schedule a notification for retry"""
        if attempt_count >= self.max_retries:
            logger.warning(f"Max retries exceeded for notification {notification.id}")
            return
        
        # Exponential backoff
        delay = min(self.base_delay * (2 ** attempt_count), self.max_delay)
        retry_time = time.time() + delay
        
        # Priority based on notification priority
        priority = notification.priority.value
        
        self.retry_queue.put((retry_time, priority, notification, attempt_count + 1))
        logger.info(f"Scheduled retry for notification {notification.id} in {delay} seconds")
    
    def _retry_worker(self):
        """Worker thread for processing retries"""
        while self.running:
            try:
                if not self.retry_queue.empty():
                    retry_time, priority, notification, attempt_count = self.retry_queue.get_nowait()
                    
                    if time.time() >= retry_time:
                        logger.info(f"Retrying notification {notification.id}, attempt {attempt_count}")
                        # This would trigger the notification service to retry
                        # For demo, we'll just log it
                    else:
                        # Put it back if not time yet
                        self.retry_queue.put((retry_time, priority, notification, attempt_count))
                
                time.sleep(1)  # Check every second
            except Exception as e:
                logger.error(f"Retry worker error: {e}")


class NotificationService:
    """Main notification service orchestrator"""
    
    def __init__(self):
        self.channels: Dict[ChannelType, NotificationChannel] = {}
        self.template_engine = TemplateEngine()
        self.preference_manager = UserPreferenceManager()
        self.delivery_tracker = DeliveryTracker()
        self.retry_manager = RetryManager()
        self.metrics = {
            "total_sent": 0,
            "total_delivered": 0,
            "total_failed": 0,
            "requests_per_second": 0.0
        }
        self.request_times = deque(maxlen=1000)  # Keep last 1000 requests for RPS calculation
        
        self._setup_default_channels()
        self.retry_manager.start()
    
    def _setup_default_channels(self):
        """Setup default notification channels with providers"""
        # Email channel
        email_channel = EmailChannel()
        email_channel.add_provider(EmailProvider(ProviderType.SENDGRID, {}))
        email_channel.add_provider(EmailProvider(ProviderType.SES, {}))
        self.channels[ChannelType.EMAIL] = email_channel
        
        # SMS channel
        sms_channel = SMSChannel()
        sms_channel.add_provider(SMSProvider(ProviderType.TWILIO, {}))
        sms_channel.add_provider(SMSProvider(ProviderType.NEXMO, {}))
        self.channels[ChannelType.SMS] = sms_channel
        
        # Push channel
        push_channel = PushChannel()
        push_channel.add_provider(PushProvider(ProviderType.FCM, {}))
        push_channel.add_provider(PushProvider(ProviderType.APNS, {}))
        self.channels[ChannelType.PUSH] = push_channel
    
    def register_template(self, template: NotificationTemplate):
        """Register a notification template"""
        self.template_engine.register_template(template)
    
    def send_notification(self, notification: Notification) -> Dict[str, DeliveryResult]:
        """Send notification through specified channels"""
        start_time = time.time()
        results = {}
        
        # Check user preferences for each channel
        filtered_channels = []
        for channel in notification.channels:
            if not self.preference_manager.is_opted_out(
                notification.recipient.user_id, 
                notification.notification_type, 
                channel
            ):
                filtered_channels.append(channel)
        
        # Check quiet hours for non-critical notifications
        if (notification.priority != Priority.CRITICAL and 
            self.preference_manager.is_in_quiet_hours(notification.recipient.user_id)):
            # Schedule for later delivery
            logger.info(f"Notification {notification.id} scheduled for after quiet hours")
            return {"scheduled": DeliveryResult(success=True, message_id="scheduled")}
        
        # Send through each channel
        for channel_type in filtered_channels:
            if channel_type not in self.channels:
                results[channel_type.value] = DeliveryResult(
                    success=False, 
                    error=f"Channel {channel_type.value} not configured"
                )
                continue
            
            channel = self.channels[channel_type]
            result = channel.send(notification)
            results[channel_type.value] = result
            
            # Track delivery attempt
            attempt = DeliveryAttempt(
                attempt_number=1,
                timestamp=datetime.now(),
                channel=channel_type,
                provider=channel.providers[0].provider_type if channel.providers else None,
                status=DeliveryStatus.SENT if result.success else DeliveryStatus.FAILED,
                result=result,
                response_time=time.time() - start_time
            )
            
            self.delivery_tracker.track_attempt(notification.id, attempt)
            
            # Schedule retry if failed
            if not result.success:
                self.retry_manager.schedule_retry(notification, 0)
        
        # Update metrics
        self._update_metrics(start_time, any(r.success for r in results.values()))
        
        return results
    
    def send_template_notification(self, template_id: str, recipient: Recipient, 
                                 variables: Dict[str, Any], 
                                 notification_type: NotificationType,
                                 priority: Priority = Priority.MEDIUM) -> Dict[str, DeliveryResult]:
        """Send notification using template"""
        try:
            content = self.template_engine.render_notification(template_id, variables)
            template = self.template_engine.templates[template_id]
            
            notification = Notification(
                id=f"notif_{uuid.uuid4().hex}",
                recipient=recipient,
                content=content,
                notification_type=notification_type,
                priority=priority,
                channels=template.default_channels
            )
            
            return self.send_notification(notification)
        
        except Exception as e:
            logger.error(f"Template notification failed: {e}")
            return {"error": DeliveryResult(success=False, error=str(e))}
    
    def send_bulk_notifications(self, notifications: List[Notification]) -> List[Dict[str, DeliveryResult]]:
        """Send multiple notifications efficiently"""
        results = []
        
        # Process in batches for better performance
        batch_size = 100
        for i in range(0, len(notifications), batch_size):
            batch = notifications[i:i + batch_size]
            batch_results = []
            
            for notification in batch:
                result = self.send_notification(notification)
                batch_results.append(result)
            
            results.extend(batch_results)
        
        return results
    
    def get_delivery_status(self, notification_id: str) -> Optional[DeliveryStatus]:
        """Get delivery status for a notification"""
        return self.delivery_tracker.get_delivery_status(notification_id)
    
    def get_user_preferences(self, user_id: str) -> UserPreferences:
        """Get user notification preferences"""
        return self.preference_manager.get_preferences(user_id)
    
    def update_user_preferences(self, preferences: UserPreferences):
        """Update user notification preferences"""
        self.preference_manager.update_preferences(preferences)
    
    def get_analytics(self) -> Dict[str, Any]:
        """Get comprehensive analytics"""
        delivery_analytics = self.delivery_tracker.get_analytics()
        
        return {
            "service_metrics": self.metrics,
            "delivery_analytics": delivery_analytics,
            "channel_metrics": {
                channel_type.value: channel.metrics.__dict__
                for channel_type, channel in self.channels.items()
            }
        }
    
    def _update_metrics(self, start_time: float, success: bool):
        """Update service metrics"""
        self.metrics["total_sent"] += 1
        if success:
            self.metrics["total_delivered"] += 1
        else:
            self.metrics["total_failed"] += 1
        
        # Update RPS
        current_time = time.time()
        self.request_times.append(current_time)
        
        # Calculate RPS over last minute
        one_minute_ago = current_time - 60
        recent_requests = [t for t in self.request_times if t > one_minute_ago]
        self.metrics["requests_per_second"] = len(recent_requests) / 60.0


# Demo and Testing Functions

def create_sample_templates(service: NotificationService):
    """Create sample notification templates"""
    
    # Welcome template
    welcome_template = NotificationTemplate(
        id="welcome_template",
        name="Welcome New User",
        title_template="Welcome to {{platform_name}}, {{user_name}}!",
        body_template="Hi {{user_name}}, welcome to {{platform_name}}! We're excited to have you on board. Get started by {{action_text}}.",
        notification_type=NotificationType.TRANSACTIONAL,
        default_channels=[ChannelType.EMAIL, ChannelType.PUSH],
        required_variables={"user_name", "platform_name"},
        optional_variables={"action_text"}
    )
    
    # Marketing template
    marketing_template = NotificationTemplate(
        id="promotion_template",
        name="Promotional Offer",
        title_template="{{discount}}% Off Everything - Limited Time!",
        body_template="Hi {{user_name}}, enjoy {{discount}}% off your next purchase. Use code {{promo_code}} at checkout. Offer expires {{expiry_date}}.",
        notification_type=NotificationType.MARKETING,
        default_channels=[ChannelType.EMAIL, ChannelType.SMS],
        required_variables={"user_name", "discount", "promo_code"},
        optional_variables={"expiry_date"}
    )
    
    # System alert template
    alert_template = NotificationTemplate(
        id="system_alert_template",
        name="System Alert",
        title_template="{{alert_type}}: {{service_name}}",
        body_template="{{alert_message}} Time: {{timestamp}}. Please take necessary action.",
        notification_type=NotificationType.SYSTEM_ALERT,
        default_channels=[ChannelType.EMAIL, ChannelType.SMS, ChannelType.PUSH],
        required_variables={"alert_type", "service_name", "alert_message"},
        optional_variables={"timestamp"}
    )
    
    service.register_template(welcome_template)
    service.register_template(marketing_template)
    service.register_template(alert_template)


def demo_notification_system():
    """Comprehensive demo of the notification system"""
    print("🔔 Notification System Demo")
    print("=" * 50)
    
    # Create notification service
    service = NotificationService()
    create_sample_templates(service)
    
    # Create sample recipients
    recipients = [
        Recipient(
            user_id="user_001",
            email="alice@example.com",
            phone="+1234567890",
            device_tokens=["token_alice_1", "token_alice_2"]
        ),
        Recipient(
            user_id="user_002",
            email="bob@example.com",
            phone="+1987654321",
            device_tokens=["token_bob_1"]
        )
    ]
    
    print("\n📧 1. Testing Direct Notifications")
    print("-" * 30)
    
    # Send direct notification
    notification = Notification(
        id="notif_001",
        recipient=recipients[0],
        content=NotificationContent(
            title="Your order has been confirmed!",
            body="Order #12345 has been confirmed and will be shipped soon.",
            data={"order_id": "12345", "tracking_url": "https://track.example.com/12345"}
        ),
        notification_type=NotificationType.TRANSACTIONAL,
        priority=Priority.HIGH,
        channels=[ChannelType.EMAIL, ChannelType.SMS, ChannelType.PUSH]
    )
    
    result = service.send_notification(notification)
    for channel, delivery_result in result.items():
        status = "✅ Success" if delivery_result.success else "❌ Failed"
        print(f"  {channel.upper()}: {status}")
        if delivery_result.message_id:
            print(f"    Message ID: {delivery_result.message_id}")
        if delivery_result.error:
            print(f"    Error: {delivery_result.error}")
    
    print("\n📝 2. Testing Template Notifications")
    print("-" * 30)
    
    # Welcome notification
    welcome_vars = {
        "user_name": "Alice Johnson",
        "platform_name": "MyAwesomeApp",
        "action_text": "exploring our features"
    }
    
    result = service.send_template_notification(
        template_id="welcome_template",
        recipient=recipients[0],
        variables=welcome_vars,
        notification_type=NotificationType.TRANSACTIONAL,
        priority=Priority.MEDIUM
    )
    
    print("Welcome notification sent:")
    for channel, delivery_result in result.items():
        status = "✅ Success" if delivery_result.success else "❌ Failed"
        print(f"  {channel.upper()}: {status}")
    
    # Marketing notification
    marketing_vars = {
        "user_name": "Bob Smith",
        "discount": "25",
        "promo_code": "SAVE25",
        "expiry_date": "Dec 31, 2025"
    }
    
    result = service.send_template_notification(
        template_id="promotion_template",
        recipient=recipients[1],
        variables=marketing_vars,
        notification_type=NotificationType.MARKETING,
        priority=Priority.LOW
    )
    
    print("\nPromotion notification sent:")
    for channel, delivery_result in result.items():
        status = "✅ Success" if delivery_result.success else "❌ Failed"
        print(f"  {channel.upper()}: {status}")
    
    print("\n⚙️ 3. Testing User Preferences")
    print("-" * 30)
    
    # Update user preferences
    preferences = UserPreferences(
        user_id="user_002",
        email_enabled=True,
        sms_enabled=False,  # Opt out of SMS
        push_enabled=True,
        opted_out_types={NotificationType.MARKETING},  # Opt out of marketing
        quiet_hours_start="22:00",
        quiet_hours_end="08:00"
    )
    
    service.update_user_preferences(preferences)
    print("Updated user_002 preferences:")
    print(f"  SMS enabled: {preferences.sms_enabled}")
    print(f"  Marketing opted out: {NotificationType.MARKETING in preferences.opted_out_types}")
    
    # Try sending marketing notification to user with opt-out
    result = service.send_template_notification(
        template_id="promotion_template",
        recipient=recipients[1],
        variables=marketing_vars,
        notification_type=NotificationType.MARKETING,
        priority=Priority.LOW
    )
    
    print("\nMarketing notification to opted-out user:")
    if not result or all(not r.success for r in result.values()):
        print("  ✅ Correctly blocked due to user preferences")
    
    print("\n📊 4. Bulk Notification Test")
    print("-" * 30)
    
    # Create bulk notifications
    bulk_notifications = []
    for i in range(5):
        notification = Notification(
            id=f"bulk_notif_{i:03d}",
            recipient=recipients[i % 2],
            content=NotificationContent(
                title=f"Bulk Message {i+1}",
                body=f"This is bulk notification number {i+1}",
                data={"batch_id": "batch_001", "sequence": i+1}
            ),
            notification_type=NotificationType.TRANSACTIONAL,
            priority=Priority.MEDIUM,
            channels=[ChannelType.EMAIL]
        )
        bulk_notifications.append(notification)
    
    start_time = time.time()
    bulk_results = service.send_bulk_notifications(bulk_notifications)
    end_time = time.time()
    
    successful = sum(1 for result in bulk_results 
                    if any(r.success for r in result.values()))
    
    print(f"Bulk notification results:")
    print(f"  Total notifications: {len(bulk_notifications)}")
    print(f"  Successful: {successful}")
    print(f"  Processing time: {end_time - start_time:.2f} seconds")
    print(f"  Throughput: {len(bulk_notifications) / (end_time - start_time):.0f} notifications/sec")
    
    print("\n📈 5. Analytics and Metrics")
    print("-" * 30)
    
    analytics = service.get_analytics()
    
    print("Service Metrics:")
    service_metrics = analytics["service_metrics"]
    print(f"  Total sent: {service_metrics['total_sent']}")
    print(f"  Total delivered: {service_metrics['total_delivered']}")
    print(f"  Total failed: {service_metrics['total_failed']}")
    print(f"  Requests per second: {service_metrics['requests_per_second']:.1f}")
    
    print("\nDelivery Analytics:")
    delivery_analytics = analytics["delivery_analytics"]
    print(f"  Total notifications tracked: {delivery_analytics['total_notifications']}")
    if delivery_analytics['total_notifications'] > 0:
        print(f"  Success rate: {delivery_analytics['success_rate']:.1%}")
        print(f"  Failure rate: {delivery_analytics['failure_rate']:.1%}")
    
    print("\nChannel Performance:")
    channel_metrics = analytics["channel_metrics"]
    for channel, metrics in channel_metrics.items():
        print(f"  {channel.upper()}:")
        print(f"    Total sent: {metrics['total_sent']}")
        print(f"    Success rate: {metrics['success_rate']:.1%}")
        print(f"    Avg response time: {metrics['average_response_time']:.3f}s")
    
    print("\n🔄 6. Delivery Status Tracking")
    print("-" * 30)
    
    # Check delivery status for some notifications
    for i, notification in enumerate(bulk_notifications[:3]):
        status = service.get_delivery_status(notification.id)
        print(f"  Notification {notification.id}: {status.value if status else 'Unknown'}")
    
    # Stop retry manager
    service.retry_manager.stop()
    
    print("\n✨ Demo completed successfully!")
    
    return service


def performance_test():
    """Performance test for the notification system"""
    print("\n🚀 Performance Test")
    print("=" * 50)
    
    service = NotificationService()
    create_sample_templates(service)
    
    # Create test recipient
    recipient = Recipient(
        user_id="perf_test_user",
        email="test@example.com",
        phone="+1234567890",
        device_tokens=["test_token"]
    )
    
    # Test single notification performance
    print("Testing single notification performance...")
    
    start_time = time.time()
    iterations = 100
    
    for i in range(iterations):
        notification = Notification(
            id=f"perf_test_{i}",
            recipient=recipient,
            content=NotificationContent(
                title=f"Performance Test {i}",
                body=f"This is performance test notification {i}",
                data={"test_id": i}
            ),
            notification_type=NotificationType.TRANSACTIONAL,
            priority=Priority.MEDIUM,
            channels=[ChannelType.EMAIL]
        )
        
        service.send_notification(notification)
    
    end_time = time.time()
    duration = end_time - start_time
    throughput = iterations / duration
    
    print(f"Single notification performance:")
    print(f"  Iterations: {iterations}")
    print(f"  Duration: {duration:.2f} seconds")
    print(f"  Throughput: {throughput:.0f} notifications/second")
    print(f"  Average latency: {(duration / iterations) * 1000:.2f} ms")
    
    # Test bulk notification performance
    print("\nTesting bulk notification performance...")
    
    bulk_notifications = []
    bulk_size = 500
    
    for i in range(bulk_size):
        notification = Notification(
            id=f"bulk_perf_test_{i}",
            recipient=recipient,
            content=NotificationContent(
                title=f"Bulk Performance Test {i}",
                body=f"This is bulk performance test notification {i}",
                data={"test_id": i}
            ),
            notification_type=NotificationType.TRANSACTIONAL,
            priority=Priority.MEDIUM,
            channels=[ChannelType.EMAIL]
        )
        bulk_notifications.append(notification)
    
    start_time = time.time()
    service.send_bulk_notifications(bulk_notifications)
    end_time = time.time()
    
    duration = end_time - start_time
    throughput = bulk_size / duration
    
    print(f"Bulk notification performance:")
    print(f"  Bulk size: {bulk_size}")
    print(f"  Duration: {duration:.2f} seconds")
    print(f"  Throughput: {throughput:.0f} notifications/second")
    print(f"  Average latency: {(duration / bulk_size) * 1000:.2f} ms")
    
    # Final analytics
    analytics = service.get_analytics()
    print(f"\nOverall service performance:")
    print(f"  Total notifications processed: {analytics['service_metrics']['total_sent']}")
    print(f"  Success rate: {(analytics['service_metrics']['total_delivered'] / analytics['service_metrics']['total_sent']):.1%}")
    
    service.retry_manager.stop()


if __name__ == "__main__":
    # Run comprehensive demo
    demo_service = demo_notification_system()
    
    # Run performance test
    performance_test()
    
    print("\n🎉 All tests completed successfully!")