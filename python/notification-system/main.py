"""NOTIFICATION SYSTEM - Patterns: Observer, Strategy, Factory, Template Method"""
from enum import Enum
from abc import ABC, abstractmethod
from typing import List, Dict

class NotificationChannel(Enum):
    EMAIL = "email"
    SMS = "sms"
    PUSH = "push"

class NotificationSender(ABC):
    @abstractmethod
    def send(self, recipient: str, message: str):
        pass

class EmailSender(NotificationSender):
    def send(self, recipient: str, message: str):
        print(f"📧 Email to {recipient}: {message}")

class SMSSender(NotificationSender):
    def send(self, recipient: str, message: str):
        print(f"📱 SMS to {recipient}: {message}")

class PushSender(NotificationSender):
    def send(self, recipient: str, message: str):
        print(f"🔔 Push to {recipient}: {message}")

class Notification:
    def __init__(self, recipient: str, message: str, channels: List[NotificationChannel]):
        self.recipient = recipient
        self.message = message
        self.channels = channels

class NotificationService:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        self.senders = {
            NotificationChannel.EMAIL: EmailSender(),
            NotificationChannel.SMS: SMSSender(),
            NotificationChannel.PUSH: PushSender()
        }
        self._initialized = True
    
    def send(self, notification: Notification):
        for channel in notification.channels:
            sender = self.senders[channel]
            sender.send(notification.recipient, notification.message)

def main():
    print("="*70)
    print("NOTIFICATION SYSTEM - Demo")
    print("="*70)
    service = NotificationService()
    notification = Notification("user@example.com", "Welcome!", [NotificationChannel.EMAIL, NotificationChannel.SMS])
    service.send(notification)
    print("\n" + "="*70)
    print("DEMO COMPLETE")
    print("="*70)

if __name__ == "__main__":
    main()
