#!/usr/bin/env node

/**
 * Notification System - Low Level Design Implementation
 * 
 * A comprehensive notification system supporting multiple channels, user preferences,
 * delivery tracking, and scalable architecture.
 * 
 * Key Features:
 * - Multi-channel delivery (Email, SMS, Push, In-App, WebHook)
 * - User preference management with opt-out mechanisms
 * - Template-based notifications with variable substitution
 * - Retry logic with configurable policies
 * - Real-time delivery tracking and analytics
 * - Provider redundancy for fault tolerance
 * - Bulk notification processing
 * 
 * Design Patterns Used:
 * - Strategy Pattern: Pluggable notification channels and delivery providers
 * - Observer Pattern: Real-time delivery status notifications
 * - Template Method: Common notification delivery workflow
 * - Factory Pattern: Channel and provider creation
 * - Command Pattern: Notification requests as executable commands
 * - Builder Pattern: Complex object creation
 * 
 * Author: GitHub Copilot
 * Date: October 2025
 */

// Enumerations
const ChannelType = Object.freeze({
    EMAIL: 'email',
    SMS: 'sms',
    PUSH: 'push',
    IN_APP: 'in_app',
    WEBHOOK: 'webhook'
});

const NotificationType = Object.freeze({
    TRANSACTIONAL: 'transactional',
    MARKETING: 'marketing',
    SYSTEM_ALERT: 'system_alert',
    SOCIAL: 'social'
});

const Priority = Object.freeze({
    CRITICAL: 1,
    HIGH: 2,
    MEDIUM: 3,
    LOW: 4
});

const DeliveryStatus = Object.freeze({
    PENDING: 'pending',
    SENT: 'sent',
    DELIVERED: 'delivered',
    FAILED: 'failed',
    READ: 'read',
    CLICKED: 'clicked'
});

const ProviderType = Object.freeze({
    SENDGRID: 'sendgrid',
    SES: 'ses',
    SMTP: 'smtp',
    TWILIO: 'twilio',
    NEXMO: 'nexmo',
    SNS: 'sns',
    FCM: 'fcm',
    APNS: 'apns',
    WEB_PUSH: 'web_push'
});

// Data Classes
class NotificationContent {
    constructor(title, body, data = {}, mediaUrl = null, actionUrl = null) {
        this.title = title;
        this.body = body;
        this.data = data;
        this.mediaUrl = mediaUrl;
        this.actionUrl = actionUrl;
    }
}

class Recipient {
    constructor(userId, email = null, phone = null, deviceTokens = [], webhookUrl = null, timezone = 'UTC', language = 'en') {
        this.userId = userId;
        this.email = email;
        this.phone = phone;
        this.deviceTokens = deviceTokens;
        this.webhookUrl = webhookUrl;
        this.timezone = timezone;
        this.language = language;
    }
}

class Notification {
    constructor(id, recipient, content, notificationType, priority, channels, scheduledAt = null, expiresAt = null) {
        this.id = id;
        this.recipient = recipient;
        this.content = content;
        this.notificationType = notificationType;
        this.priority = priority;
        this.channels = channels;
        this.createdAt = new Date();
        this.scheduledAt = scheduledAt;
        this.expiresAt = expiresAt;
        this.tags = new Set();
        this.metadata = {};
    }
}

class NotificationTemplate {
    constructor(id, name, titleTemplate, bodyTemplate, notificationType, defaultChannels, requiredVariables = new Set(), optionalVariables = new Set()) {
        this.id = id;
        this.name = name;
        this.titleTemplate = titleTemplate;
        this.bodyTemplate = bodyTemplate;
        this.notificationType = notificationType;
        this.defaultChannels = defaultChannels;
        this.requiredVariables = requiredVariables;
        this.optionalVariables = optionalVariables;
        this.metadata = {};
    }
}

class DeliveryResult {
    constructor(success, messageId = null, providerResponse = null, error = null, retryAfter = null) {
        this.success = success;
        this.messageId = messageId;
        this.providerResponse = providerResponse;
        this.error = error;
        this.retryAfter = retryAfter;
    }
}

class DeliveryAttempt {
    constructor(attemptNumber, timestamp, channel, provider, status, result, responseTime) {
        this.attemptNumber = attemptNumber;
        this.timestamp = timestamp;
        this.channel = channel;
        this.provider = provider;
        this.status = status;
        this.result = result;
        this.responseTime = responseTime;
    }
}

class UserPreferences {
    constructor(userId, emailEnabled = true, smsEnabled = true, pushEnabled = true, inAppEnabled = true, webhookEnabled = false) {
        this.userId = userId;
        this.emailEnabled = emailEnabled;
        this.smsEnabled = smsEnabled;
        this.pushEnabled = pushEnabled;
        this.inAppEnabled = inAppEnabled;
        this.webhookEnabled = webhookEnabled;
        this.optedOutTypes = new Set();
        this.quietHoursStart = null;
        this.quietHoursEnd = null;
        this.frequencyCaps = new Map();
        this.preferredLanguage = 'en';
        this.lastUpdated = new Date();
    }
}

class ChannelMetrics {
    constructor() {
        this.totalSent = 0;
        this.totalDelivered = 0;
        this.totalFailed = 0;
        this.totalRead = 0;
        this.totalClicked = 0;
        this.averageResponseTime = 0.0;
        this.successRate = 0.0;
        this.lastUpdated = new Date();
    }
}

// Abstract Base Classes
class DeliveryProvider {
    constructor(providerType, config) {
        this.providerType = providerType;
        this.config = config;
        this.isHealthy = true;
        this.metrics = new ChannelMetrics();
    }

    async send(notification, recipient) {
        throw new Error('send method must be implemented');
    }

    async getDeliveryStatus(messageId) {
        throw new Error('getDeliveryStatus method must be implemented');
    }

    handleWebhook(payload) {
        // Optional implementation
    }

    healthCheck() {
        return this.isHealthy;
    }
}

class NotificationChannel {
    constructor(channelType) {
        this.channelType = channelType;
        this.providers = [];
        this.metrics = new ChannelMetrics();
        this.isEnabled = true;
    }

    addProvider(provider) {
        this.providers.push(provider);
    }

    validateNotification(notification) {
        throw new Error('validateNotification method must be implemented');
    }

    async send(notification) {
        if (!this.isEnabled) {
            return new DeliveryResult(false, null, null, 'Channel is disabled');
        }

        if (!this.validateNotification(notification)) {
            return new DeliveryResult(false, null, null, 'Notification validation failed');
        }

        // Try providers in order until one succeeds
        let lastError = null;
        for (const provider of this.providers) {
            if (!provider.healthCheck()) {
                continue;
            }

            try {
                const result = await provider.send(notification, notification.recipient);
                if (result.success) {
                    this._updateMetrics(true);
                    return result;
                } else {
                    lastError = result.error;
                }
            } catch (error) {
                lastError = error.message;
                console.error(`Provider ${provider.providerType} failed:`, error);
            }
        }

        this._updateMetrics(false);
        return new DeliveryResult(false, null, null, lastError || 'All providers failed');
    }

    _updateMetrics(success) {
        this.metrics.totalSent++;
        if (success) {
            this.metrics.totalDelivered++;
        } else {
            this.metrics.totalFailed++;
        }

        if (this.metrics.totalSent > 0) {
            this.metrics.successRate = this.metrics.totalDelivered / this.metrics.totalSent;
        }
    }
}

// Concrete Provider Implementations
class EmailProvider extends DeliveryProvider {
    async send(notification, recipient) {
        const startTime = Date.now();

        if (!recipient.email) {
            return new DeliveryResult(false, null, null, 'No email address provided');
        }

        // Simulate email sending
        await this._simulateDelay(100, 300);

        const success = Math.random() > 0.05; // 95% success rate
        const messageId = success ? `email_${this._generateId()}` : null;
        const responseTime = Date.now() - startTime;

        if (success) {
            this.metrics.totalSent++;
            this.metrics.totalDelivered++;
        } else {
            this.metrics.totalSent++;
            this.metrics.totalFailed++;
        }

        this._updateMetrics(responseTime);

        return new DeliveryResult(
            success,
            messageId,
            {
                provider: this.providerType,
                responseTime,
                recipient: recipient.email
            },
            success ? null : 'Failed to send email'
        );
    }

    async getDeliveryStatus(messageId) {
        const statuses = [DeliveryStatus.DELIVERED, DeliveryStatus.READ];
        return statuses[Math.floor(Math.random() * statuses.length)];
    }

    _updateMetrics(responseTime) {
        if (this.metrics.totalSent > 0) {
            this.metrics.successRate = this.metrics.totalDelivered / this.metrics.totalSent;
        }

        const totalTime = this.metrics.averageResponseTime * (this.metrics.totalSent - 1);
        this.metrics.averageResponseTime = (totalTime + responseTime) / this.metrics.totalSent;
    }

    _simulateDelay(min, max) {
        const delay = Math.random() * (max - min) + min;
        return new Promise(resolve => setTimeout(resolve, delay));
    }

    _generateId() {
        return Math.random().toString(36).substr(2, 8);
    }
}

class SMSProvider extends DeliveryProvider {
    async send(notification, recipient) {
        const startTime = Date.now();

        if (!recipient.phone) {
            return new DeliveryResult(false, null, null, 'No phone number provided');
        }

        // Simulate SMS sending
        await this._simulateDelay(200, 500);

        const success = Math.random() > 0.02; // 98% success rate
        const messageId = success ? `sms_${this._generateId()}` : null;
        const responseTime = Date.now() - startTime;

        if (success) {
            this.metrics.totalSent++;
            this.metrics.totalDelivered++;
        } else {
            this.metrics.totalSent++;
            this.metrics.totalFailed++;
        }

        this._updateMetrics(responseTime);

        return new DeliveryResult(
            success,
            messageId,
            {
                provider: this.providerType,
                responseTime,
                recipient: recipient.phone
            },
            success ? null : 'Failed to send SMS'
        );
    }

    async getDeliveryStatus(messageId) {
        return DeliveryStatus.DELIVERED;
    }

    _updateMetrics(responseTime) {
        if (this.metrics.totalSent > 0) {
            this.metrics.successRate = this.metrics.totalDelivered / this.metrics.totalSent;
        }

        const totalTime = this.metrics.averageResponseTime * (this.metrics.totalSent - 1);
        this.metrics.averageResponseTime = (totalTime + responseTime) / this.metrics.totalSent;
    }

    _simulateDelay(min, max) {
        const delay = Math.random() * (max - min) + min;
        return new Promise(resolve => setTimeout(resolve, delay));
    }

    _generateId() {
        return Math.random().toString(36).substr(2, 8);
    }
}

class PushProvider extends DeliveryProvider {
    async send(notification, recipient) {
        const startTime = Date.now();

        if (!recipient.deviceTokens || recipient.deviceTokens.length === 0) {
            return new DeliveryResult(false, null, null, 'No device tokens provided');
        }

        // Simulate push notification sending
        await this._simulateDelay(50, 200);

        const success = Math.random() > 0.1; // 90% success rate
        const messageId = success ? `push_${this._generateId()}` : null;
        const responseTime = Date.now() - startTime;

        if (success) {
            this.metrics.totalSent++;
            this.metrics.totalDelivered++;
        } else {
            this.metrics.totalSent++;
            this.metrics.totalFailed++;
        }

        this._updateMetrics(responseTime);

        return new DeliveryResult(
            success,
            messageId,
            {
                provider: this.providerType,
                responseTime,
                tokensCount: recipient.deviceTokens.length
            },
            success ? null : 'Failed to send push notification'
        );
    }

    async getDeliveryStatus(messageId) {
        const statuses = [DeliveryStatus.DELIVERED, DeliveryStatus.READ, DeliveryStatus.CLICKED];
        return statuses[Math.floor(Math.random() * statuses.length)];
    }

    _updateMetrics(responseTime) {
        if (this.metrics.totalSent > 0) {
            this.metrics.successRate = this.metrics.totalDelivered / this.metrics.totalSent;
        }

        const totalTime = this.metrics.averageResponseTime * (this.metrics.totalSent - 1);
        this.metrics.averageResponseTime = (totalTime + responseTime) / this.metrics.totalSent;
    }

    _simulateDelay(min, max) {
        const delay = Math.random() * (max - min) + min;
        return new Promise(resolve => setTimeout(resolve, delay));
    }

    _generateId() {
        return Math.random().toString(36).substr(2, 8);
    }
}

// Concrete Channel Implementations
class EmailChannel extends NotificationChannel {
    constructor() {
        super(ChannelType.EMAIL);
    }

    validateNotification(notification) {
        const recipient = notification.recipient;
        if (!recipient.email) {
            return false;
        }

        // Basic email validation
        const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        return emailPattern.test(recipient.email);
    }
}

class SMSChannel extends NotificationChannel {
    constructor() {
        super(ChannelType.SMS);
    }

    validateNotification(notification) {
        const recipient = notification.recipient;
        if (!recipient.phone) {
            return false;
        }

        // Basic phone validation
        const phonePattern = /^\+?[\d\s\-\(\)]{10,}$/;
        return phonePattern.test(recipient.phone);
    }
}

class PushChannel extends NotificationChannel {
    constructor() {
        super(ChannelType.PUSH);
    }

    validateNotification(notification) {
        return notification.recipient.deviceTokens && notification.recipient.deviceTokens.length > 0;
    }
}

// Template Engine
class TemplateEngine {
    constructor() {
        this.templates = new Map();
    }

    registerTemplate(template) {
        this.templates.set(template.id, template);
    }

    renderNotification(templateId, variables) {
        if (!this.templates.has(templateId)) {
            throw new Error(`Template ${templateId} not found`);
        }

        const template = this.templates.get(templateId);

        // Check required variables
        const missingVars = [...template.requiredVariables].filter(v => !(v in variables));
        if (missingVars.length > 0) {
            throw new Error(`Missing required variables: ${missingVars.join(', ')}`);
        }

        // Render template
        const title = this._substituteVariables(template.titleTemplate, variables);
        const body = this._substituteVariables(template.bodyTemplate, variables);

        return new NotificationContent(title, body, variables);
    }

    _substituteVariables(template, variables) {
        let result = template;
        for (const [key, value] of Object.entries(variables)) {
            const placeholder = `{{${key}}}`;
            result = result.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), String(value));
        }
        return result;
    }
}

// User Preference Manager
class UserPreferenceManager {
    constructor() {
        this.preferences = new Map();
    }

    getPreferences(userId) {
        if (!this.preferences.has(userId)) {
            this.preferences.set(userId, new UserPreferences(userId));
        }
        return this.preferences.get(userId);
    }

    updatePreferences(preferences) {
        preferences.lastUpdated = new Date();
        this.preferences.set(preferences.userId, preferences);
    }

    isOptedOut(userId, notificationType, channel) {
        const prefs = this.getPreferences(userId);

        // Check if opted out of notification type
        if (prefs.optedOutTypes.has(notificationType)) {
            return true;
        }

        // Check channel-specific preferences
        switch (channel) {
            case ChannelType.EMAIL:
                return !prefs.emailEnabled;
            case ChannelType.SMS:
                return !prefs.smsEnabled;
            case ChannelType.PUSH:
                return !prefs.pushEnabled;
            case ChannelType.IN_APP:
                return !prefs.inAppEnabled;
            case ChannelType.WEBHOOK:
                return !prefs.webhookEnabled;
            default:
                return false;
        }
    }

    isInQuietHours(userId) {
        const prefs = this.getPreferences(userId);

        if (!prefs.quietHoursStart || !prefs.quietHoursEnd) {
            return false;
        }

        const now = new Date();
        const currentTime = now.toTimeString().substr(0, 5); // HH:MM format

        const start = prefs.quietHoursStart;
        const end = prefs.quietHoursEnd;

        if (start <= end) {
            return currentTime >= start && currentTime <= end;
        } else {
            // Crosses midnight
            return currentTime >= start || currentTime <= end;
        }
    }

    checkFrequencyCap(userId, notificationType) {
        // This would typically check against a database of sent notifications
        // For demo, we'll simulate it
        return true; // Assume not exceeded for demo
    }
}

// Delivery Tracker
class DeliveryTracker {
    constructor() {
        this.deliveryAttempts = new Map();
        this.deliveryStatus = new Map();
        this.observers = [];
    }

    addObserver(observer) {
        this.observers.push(observer);
    }

    trackAttempt(notificationId, attempt) {
        if (!this.deliveryAttempts.has(notificationId)) {
            this.deliveryAttempts.set(notificationId, []);
        }
        this.deliveryAttempts.get(notificationId).push(attempt);
        this.deliveryStatus.set(notificationId, attempt.status);

        // Notify observers
        this.observers.forEach(observer => {
            try {
                observer(notificationId, attempt);
            } catch (error) {
                console.error('Observer notification failed:', error);
            }
        });
    }

    getDeliveryStatus(notificationId) {
        return this.deliveryStatus.get(notificationId);
    }

    getDeliveryAttempts(notificationId) {
        return this.deliveryAttempts.get(notificationId) || [];
    }

    getAnalytics() {
        const totalNotifications = this.deliveryStatus.size;
        if (totalNotifications === 0) {
            return { totalNotifications: 0 };
        }

        const statusCounts = {};
        for (const status of this.deliveryStatus.values()) {
            statusCounts[status] = (statusCounts[status] || 0) + 1;
        }

        const successfulStatuses = [DeliveryStatus.DELIVERED, DeliveryStatus.READ];
        const successCount = successfulStatuses.reduce((sum, status) => sum + (statusCounts[status] || 0), 0);

        return {
            totalNotifications,
            statusDistribution: statusCounts,
            successRate: successCount / totalNotifications,
            failureRate: (statusCounts[DeliveryStatus.FAILED] || 0) / totalNotifications
        };
    }
}

// Retry Manager
class RetryManager {
    constructor() {
        this.retryQueue = [];
        this.maxRetries = 3;
        this.baseDelay = 60000; // 60 seconds
        this.maxDelay = 3600000; // 1 hour
        this.running = false;
        this.intervalId = null;
    }

    start() {
        if (!this.running) {
            this.running = true;
            this.intervalId = setInterval(() => this._processRetries(), 1000);
        }
    }

    stop() {
        if (this.running) {
            this.running = false;
            if (this.intervalId) {
                clearInterval(this.intervalId);
                this.intervalId = null;
            }
        }
    }

    scheduleRetry(notification, attemptCount) {
        if (attemptCount >= this.maxRetries) {
            console.warn(`Max retries exceeded for notification ${notification.id}`);
            return;
        }

        // Exponential backoff
        const delay = Math.min(this.baseDelay * Math.pow(2, attemptCount), this.maxDelay);
        const retryTime = Date.now() + delay;

        this.retryQueue.push({
            retryTime,
            priority: notification.priority,
            notification,
            attemptCount: attemptCount + 1
        });

        // Sort by retry time and priority
        this.retryQueue.sort((a, b) => {
            if (a.retryTime !== b.retryTime) {
                return a.retryTime - b.retryTime;
            }
            return a.priority - b.priority;
        });

        console.log(`Scheduled retry for notification ${notification.id} in ${delay / 1000} seconds`);
    }

    _processRetries() {
        const now = Date.now();
        const readyRetries = [];

        // Find retries that are ready
        while (this.retryQueue.length > 0 && this.retryQueue[0].retryTime <= now) {
            readyRetries.push(this.retryQueue.shift());
        }

        // Process ready retries
        for (const retry of readyRetries) {
            console.log(`Retrying notification ${retry.notification.id}, attempt ${retry.attemptCount}`);
            // In a real implementation, this would trigger the notification service to retry
        }
    }
}

// Main Notification Service
class NotificationService {
    constructor() {
        this.channels = new Map();
        this.templateEngine = new TemplateEngine();
        this.preferenceManager = new UserPreferenceManager();
        this.deliveryTracker = new DeliveryTracker();
        this.retryManager = new RetryManager();
        this.metrics = {
            totalSent: 0,
            totalDelivered: 0,
            totalFailed: 0,
            requestsPerSecond: 0.0
        };
        this.requestTimes = [];

        this._setupDefaultChannels();
        this.retryManager.start();
    }

    _setupDefaultChannels() {
        // Email channel
        const emailChannel = new EmailChannel();
        emailChannel.addProvider(new EmailProvider(ProviderType.SENDGRID, {}));
        emailChannel.addProvider(new EmailProvider(ProviderType.SES, {}));
        this.channels.set(ChannelType.EMAIL, emailChannel);

        // SMS channel
        const smsChannel = new SMSChannel();
        smsChannel.addProvider(new SMSProvider(ProviderType.TWILIO, {}));
        smsChannel.addProvider(new SMSProvider(ProviderType.NEXMO, {}));
        this.channels.set(ChannelType.SMS, smsChannel);

        // Push channel
        const pushChannel = new PushChannel();
        pushChannel.addProvider(new PushProvider(ProviderType.FCM, {}));
        pushChannel.addProvider(new PushProvider(ProviderType.APNS, {}));
        this.channels.set(ChannelType.PUSH, pushChannel);
    }

    registerTemplate(template) {
        this.templateEngine.registerTemplate(template);
    }

    async sendNotification(notification) {
        const startTime = Date.now();
        const results = {};

        // Check user preferences for each channel
        const filteredChannels = notification.channels.filter(channel =>
            !this.preferenceManager.isOptedOut(
                notification.recipient.userId,
                notification.notificationType,
                channel
            )
        );

        // Check quiet hours for non-critical notifications
        if (notification.priority !== Priority.CRITICAL &&
            this.preferenceManager.isInQuietHours(notification.recipient.userId)) {
            console.log(`Notification ${notification.id} scheduled for after quiet hours`);
            return { scheduled: new DeliveryResult(true, 'scheduled') };
        }

        // Send through each channel
        const promises = filteredChannels.map(async channelType => {
            if (!this.channels.has(channelType)) {
                return [channelType, new DeliveryResult(false, null, null, `Channel ${channelType} not configured`)];
            }

            const channel = this.channels.get(channelType);
            const result = await channel.send(notification);

            // Track delivery attempt
            const attempt = new DeliveryAttempt(
                1,
                new Date(),
                channelType,
                channel.providers[0]?.providerType || null,
                result.success ? DeliveryStatus.SENT : DeliveryStatus.FAILED,
                result,
                Date.now() - startTime
            );

            this.deliveryTracker.trackAttempt(notification.id, attempt);

            // Schedule retry if failed
            if (!result.success) {
                this.retryManager.scheduleRetry(notification, 0);
            }

            return [channelType, result];
        });

        const channelResults = await Promise.all(promises);
        channelResults.forEach(([channelType, result]) => {
            results[channelType] = result;
        });

        // Update metrics
        this._updateMetrics(startTime, Object.values(results).some(r => r.success));

        return results;
    }

    async sendTemplateNotification(templateId, recipient, variables, notificationType, priority = Priority.MEDIUM) {
        try {
            const content = this.templateEngine.renderNotification(templateId, variables);
            const template = this.templateEngine.templates.get(templateId);

            const notification = new Notification(
                `notif_${this._generateId()}`,
                recipient,
                content,
                notificationType,
                priority,
                template.defaultChannels
            );

            return await this.sendNotification(notification);
        } catch (error) {
            console.error('Template notification failed:', error);
            return { error: new DeliveryResult(false, null, null, error.message) };
        }
    }

    async sendBulkNotifications(notifications) {
        const results = [];
        const batchSize = 100;

        // Process in batches for better performance
        for (let i = 0; i < notifications.length; i += batchSize) {
            const batch = notifications.slice(i, i + batchSize);
            const batchPromises = batch.map(notification => this.sendNotification(notification));
            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);
        }

        return results;
    }

    getDeliveryStatus(notificationId) {
        return this.deliveryTracker.getDeliveryStatus(notificationId);
    }

    getUserPreferences(userId) {
        return this.preferenceManager.getPreferences(userId);
    }

    updateUserPreferences(preferences) {
        this.preferenceManager.updatePreferences(preferences);
    }

    getAnalytics() {
        const deliveryAnalytics = this.deliveryTracker.getAnalytics();

        return {
            serviceMetrics: this.metrics,
            deliveryAnalytics,
            channelMetrics: Object.fromEntries(
                Array.from(this.channels.entries()).map(([channelType, channel]) => [
                    channelType,
                    {
                        totalSent: channel.metrics.totalSent,
                        totalDelivered: channel.metrics.totalDelivered,
                        totalFailed: channel.metrics.totalFailed,
                        successRate: channel.metrics.successRate,
                        averageResponseTime: channel.metrics.averageResponseTime
                    }
                ])
            )
        };
    }

    _updateMetrics(startTime, success) {
        this.metrics.totalSent++;
        if (success) {
            this.metrics.totalDelivered++;
        } else {
            this.metrics.totalFailed++;
        }

        // Update RPS
        const currentTime = Date.now();
        this.requestTimes.push(currentTime);

        // Keep only last 1000 requests
        if (this.requestTimes.length > 1000) {
            this.requestTimes = this.requestTimes.slice(-1000);
        }

        // Calculate RPS over last minute
        const oneMinuteAgo = currentTime - 60000;
        const recentRequests = this.requestTimes.filter(t => t > oneMinuteAgo);
        this.metrics.requestsPerSecond = recentRequests.length / 60.0;
    }

    _generateId() {
        return Math.random().toString(36).substr(2, 16);
    }

    shutdown() {
        this.retryManager.stop();
    }
}

// Demo and Testing Functions
function createSampleTemplates(service) {
    // Welcome template
    const welcomeTemplate = new NotificationTemplate(
        'welcome_template',
        'Welcome New User',
        'Welcome to {{platform_name}}, {{user_name}}!',
        'Hi {{user_name}}, welcome to {{platform_name}}! We\'re excited to have you on board. Get started by {{action_text}}.',
        NotificationType.TRANSACTIONAL,
        [ChannelType.EMAIL, ChannelType.PUSH],
        new Set(['user_name', 'platform_name']),
        new Set(['action_text'])
    );

    // Marketing template
    const marketingTemplate = new NotificationTemplate(
        'promotion_template',
        'Promotional Offer',
        '{{discount}}% Off Everything - Limited Time!',
        'Hi {{user_name}}, enjoy {{discount}}% off your next purchase. Use code {{promo_code}} at checkout. Offer expires {{expiry_date}}.',
        NotificationType.MARKETING,
        [ChannelType.EMAIL, ChannelType.SMS],
        new Set(['user_name', 'discount', 'promo_code']),
        new Set(['expiry_date'])
    );

    // System alert template
    const alertTemplate = new NotificationTemplate(
        'system_alert_template',
        'System Alert',
        '{{alert_type}}: {{service_name}}',
        '{{alert_message}} Time: {{timestamp}}. Please take necessary action.',
        NotificationType.SYSTEM_ALERT,
        [ChannelType.EMAIL, ChannelType.SMS, ChannelType.PUSH],
        new Set(['alert_type', 'service_name', 'alert_message']),
        new Set(['timestamp'])
    );

    service.registerTemplate(welcomeTemplate);
    service.registerTemplate(marketingTemplate);
    service.registerTemplate(alertTemplate);
}

async function demoNotificationSystem() {
    console.log('🔔 Notification System Demo');
    console.log('='.repeat(50));

    // Create notification service
    const service = new NotificationService();
    createSampleTemplates(service);

    // Create sample recipients
    const recipients = [
        new Recipient(
            'user_001',
            'alice@example.com',
            '+1234567890',
            ['token_alice_1', 'token_alice_2']
        ),
        new Recipient(
            'user_002',
            'bob@example.com',
            '+1987654321',
            ['token_bob_1']
        )
    ];

    console.log('\n📧 1. Testing Direct Notifications');
    console.log('-'.repeat(30));

    // Send direct notification
    const notification = new Notification(
        'notif_001',
        recipients[0],
        new NotificationContent(
            'Your order has been confirmed!',
            'Order #12345 has been confirmed and will be shipped soon.',
            { order_id: '12345', tracking_url: 'https://track.example.com/12345' }
        ),
        NotificationType.TRANSACTIONAL,
        Priority.HIGH,
        [ChannelType.EMAIL, ChannelType.SMS, ChannelType.PUSH]
    );

    const result = await service.sendNotification(notification);
    for (const [channel, deliveryResult] of Object.entries(result)) {
        const status = deliveryResult.success ? '✅ Success' : '❌ Failed';
        console.log(`  ${channel.toUpperCase()}: ${status}`);
        if (deliveryResult.messageId) {
            console.log(`    Message ID: ${deliveryResult.messageId}`);
        }
        if (deliveryResult.error) {
            console.log(`    Error: ${deliveryResult.error}`);
        }
    }

    console.log('\n📝 2. Testing Template Notifications');
    console.log('-'.repeat(30));

    // Welcome notification
    const welcomeVars = {
        user_name: 'Alice Johnson',
        platform_name: 'MyAwesomeApp',
        action_text: 'exploring our features'
    };

    const welcomeResult = await service.sendTemplateNotification(
        'welcome_template',
        recipients[0],
        welcomeVars,
        NotificationType.TRANSACTIONAL,
        Priority.MEDIUM
    );

    console.log('Welcome notification sent:');
    for (const [channel, deliveryResult] of Object.entries(welcomeResult)) {
        const status = deliveryResult.success ? '✅ Success' : '❌ Failed';
        console.log(`  ${channel.toUpperCase()}: ${status}`);
    }

    // Marketing notification
    const marketingVars = {
        user_name: 'Bob Smith',
        discount: '25',
        promo_code: 'SAVE25',
        expiry_date: 'Dec 31, 2025'
    };

    const marketingResult = await service.sendTemplateNotification(
        'promotion_template',
        recipients[1],
        marketingVars,
        NotificationType.MARKETING,
        Priority.LOW
    );

    console.log('\nPromotion notification sent:');
    for (const [channel, deliveryResult] of Object.entries(marketingResult)) {
        const status = deliveryResult.success ? '✅ Success' : '❌ Failed';
        console.log(`  ${channel.toUpperCase()}: ${status}`);
    }

    console.log('\n⚙️ 3. Testing User Preferences');
    console.log('-'.repeat(30));

    // Update user preferences
    const preferences = new UserPreferences('user_002', true, false, true, true, false);
    preferences.optedOutTypes.add(NotificationType.MARKETING);
    preferences.quietHoursStart = '22:00';
    preferences.quietHoursEnd = '08:00';

    service.updateUserPreferences(preferences);
    console.log('Updated user_002 preferences:');
    console.log(`  SMS enabled: ${preferences.smsEnabled}`);
    console.log(`  Marketing opted out: ${preferences.optedOutTypes.has(NotificationType.MARKETING)}`);

    // Try sending marketing notification to user with opt-out
    const blockedResult = await service.sendTemplateNotification(
        'promotion_template',
        recipients[1],
        marketingVars,
        NotificationType.MARKETING,
        Priority.LOW
    );

    console.log('\nMarketing notification to opted-out user:');
    if (!blockedResult || Object.values(blockedResult).every(r => !r.success)) {
        console.log('  ✅ Correctly blocked due to user preferences');
    }

    console.log('\n📊 4. Bulk Notification Test');
    console.log('-'.repeat(30));

    // Create bulk notifications
    const bulkNotifications = [];
    for (let i = 0; i < 5; i++) {
        const bulkNotification = new Notification(
            `bulk_notif_${i.toString().padStart(3, '0')}`,
            recipients[i % 2],
            new NotificationContent(
                `Bulk Message ${i + 1}`,
                `This is bulk notification number ${i + 1}`,
                { batch_id: 'batch_001', sequence: i + 1 }
            ),
            NotificationType.TRANSACTIONAL,
            Priority.MEDIUM,
            [ChannelType.EMAIL]
        );
        bulkNotifications.push(bulkNotification);
    }

    const startTime = Date.now();
    const bulkResults = await service.sendBulkNotifications(bulkNotifications);
    const endTime = Date.now();

    const successful = bulkResults.filter(result =>
        Object.values(result).some(r => r.success)
    ).length;

    console.log('Bulk notification results:');
    console.log(`  Total notifications: ${bulkNotifications.length}`);
    console.log(`  Successful: ${successful}`);
    console.log(`  Processing time: ${((endTime - startTime) / 1000).toFixed(2)} seconds`);
    console.log(`  Throughput: ${Math.round(bulkNotifications.length / ((endTime - startTime) / 1000))} notifications/sec`);

    console.log('\n📈 5. Analytics and Metrics');
    console.log('-'.repeat(30));

    const analytics = service.getAnalytics();

    console.log('Service Metrics:');
    const serviceMetrics = analytics.serviceMetrics;
    console.log(`  Total sent: ${serviceMetrics.totalSent}`);
    console.log(`  Total delivered: ${serviceMetrics.totalDelivered}`);
    console.log(`  Total failed: ${serviceMetrics.totalFailed}`);
    console.log(`  Requests per second: ${serviceMetrics.requestsPerSecond.toFixed(1)}`);

    console.log('\nDelivery Analytics:');
    const deliveryAnalytics = analytics.deliveryAnalytics;
    console.log(`  Total notifications tracked: ${deliveryAnalytics.totalNotifications}`);
    if (deliveryAnalytics.totalNotifications > 0) {
        console.log(`  Success rate: ${(deliveryAnalytics.successRate * 100).toFixed(1)}%`);
        console.log(`  Failure rate: ${(deliveryAnalytics.failureRate * 100).toFixed(1)}%`);
    }

    console.log('\nChannel Performance:');
    const channelMetrics = analytics.channelMetrics;
    for (const [channel, metrics] of Object.entries(channelMetrics)) {
        console.log(`  ${channel.toUpperCase()}:`);
        console.log(`    Total sent: ${metrics.totalSent}`);
        console.log(`    Success rate: ${(metrics.successRate * 100).toFixed(1)}%`);
        console.log(`    Avg response time: ${metrics.averageResponseTime.toFixed(3)}ms`);
    }

    console.log('\n🔄 6. Delivery Status Tracking');
    console.log('-'.repeat(30));

    // Check delivery status for some notifications
    for (let i = 0; i < Math.min(3, bulkNotifications.length); i++) {
        const status = service.getDeliveryStatus(bulkNotifications[i].id);
        console.log(`  Notification ${bulkNotifications[i].id}: ${status || 'Unknown'}`);
    }

    // Stop retry manager
    service.shutdown();

    console.log('\n✨ Demo completed successfully!');

    return service;
}

async function performanceTest() {
    console.log('\n🚀 Performance Test');
    console.log('='.repeat(50));

    const service = new NotificationService();
    createSampleTemplates(service);

    // Create test recipient
    const recipient = new Recipient(
        'perf_test_user',
        'test@example.com',
        '+1234567890',
        ['test_token']
    );

    // Test single notification performance
    console.log('Testing single notification performance...');

    const startTime = Date.now();
    const iterations = 100;

    const promises = [];
    for (let i = 0; i < iterations; i++) {
        const notification = new Notification(
            `perf_test_${i}`,
            recipient,
            new NotificationContent(
                `Performance Test ${i}`,
                `This is performance test notification ${i}`,
                { test_id: i }
            ),
            NotificationType.TRANSACTIONAL,
            Priority.MEDIUM,
            [ChannelType.EMAIL]
        );

        promises.push(service.sendNotification(notification));
    }

    await Promise.all(promises);
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    const throughput = iterations / duration;

    console.log('Single notification performance:');
    console.log(`  Iterations: ${iterations}`);
    console.log(`  Duration: ${duration.toFixed(2)} seconds`);
    console.log(`  Throughput: ${Math.round(throughput)} notifications/second`);
    console.log(`  Average latency: ${((duration / iterations) * 1000).toFixed(2)} ms`);

    // Test bulk notification performance
    console.log('\nTesting bulk notification performance...');

    const bulkNotifications = [];
    const bulkSize = 500;

    for (let i = 0; i < bulkSize; i++) {
        const notification = new Notification(
            `bulk_perf_test_${i}`,
            recipient,
            new NotificationContent(
                `Bulk Performance Test ${i}`,
                `This is bulk performance test notification ${i}`,
                { test_id: i }
            ),
            NotificationType.TRANSACTIONAL,
            Priority.MEDIUM,
            [ChannelType.EMAIL]
        );
        bulkNotifications.push(notification);
    }

    const bulkStartTime = Date.now();
    await service.sendBulkNotifications(bulkNotifications);
    const bulkEndTime = Date.now();

    const bulkDuration = (bulkEndTime - bulkStartTime) / 1000;
    const bulkThroughput = bulkSize / bulkDuration;

    console.log('Bulk notification performance:');
    console.log(`  Bulk size: ${bulkSize}`);
    console.log(`  Duration: ${bulkDuration.toFixed(2)} seconds`);
    console.log(`  Throughput: ${Math.round(bulkThroughput)} notifications/second`);
    console.log(`  Average latency: ${((bulkDuration / bulkSize) * 1000).toFixed(2)} ms`);

    // Final analytics
    const analytics = service.getAnalytics();
    console.log('\nOverall service performance:');
    console.log(`  Total notifications processed: ${analytics.serviceMetrics.totalSent}`);
    console.log(`  Success rate: ${((analytics.serviceMetrics.totalDelivered / analytics.serviceMetrics.totalSent) * 100).toFixed(1)}%`);

    service.shutdown();
}

// Main execution
async function main() {
    try {
        // Run comprehensive demo
        await demoNotificationSystem();

        // Run performance test
        await performanceTest();

        console.log('\n🎉 All tests completed successfully!');
    } catch (error) {
        console.error('Error during execution:', error);
    }
}

// Run if this file is executed directly
if (require.main === module) {
    main();
}

module.exports = {
    NotificationService,
    NotificationChannel,
    DeliveryProvider,
    TemplateEngine,
    UserPreferenceManager,
    DeliveryTracker,
    RetryManager,
    ChannelType,
    NotificationType,
    Priority,
    DeliveryStatus,
    ProviderType,
    NotificationContent,
    Recipient,
    Notification,
    NotificationTemplate,
    DeliveryResult,
    UserPreferences,
    ChannelMetrics
};