# Notification System

## 🔗 Implementation Links

- **Python**: [python/notification-system/main.py](python/notification-system/main.py)
- **JavaScript**: [javascript/notification-system/main.js](javascript/notification-system/main.js)

## Problem Statement

Design notification system supporting multiple channels (Email, SMS, Push) with delivery tracking.

## Requirements

- Send notifications via multiple channels
- Template-based messages
- Delivery tracking
- Retry failed notifications
- Priority-based sending

## Design Patterns

Observer, Strategy, Factory, Template Method, Chain of Responsibility

## Time Complexity

- Send: O(c) where c is channels
- Track: O(1)

## Space Complexity

- O(n) for notifications
- O(t) for templates
