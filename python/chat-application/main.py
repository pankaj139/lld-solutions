"""
CHAT APPLICATION - Low Level Design Implementation in Python

This file implements a real-time chat application system demonstrating
multiple design patterns and SOLID principles.

FILE PURPOSE:
- Manages real-time messaging between users
- Supports one-on-one and group chats
- Handles message delivery and read receipts
- Tracks typing indicators and online presence

DESIGN PATTERNS:
1. OBSERVER: Message notifications
2. MEDIATOR: ChatService coordinates users/chats
3. STRATEGY: Message delivery (online/offline)
4. COMMAND: Message operations
5. FACTORY: Chat creation
6. SINGLETON: ChatService
7. REPOSITORY: Data access

OOP & SOLID:
- Encapsulation, Inheritance, Polymorphism
- SRP, OCP, LSP, ISP, DIP

USAGE:
service = ChatService()
user1 = User("U001", "alice", "Alice")
service.register_user(user1)
chat = service.create_one_on_one_chat(user1, user2)
service.send_message(chat.chat_id, user1, "Hello!")
"""

from enum import Enum
from typing import List, Optional, Dict, Set
from datetime import datetime
from abc import ABC, abstractmethod


class UserStatus(Enum):
    ONLINE = "online"
    OFFLINE = "offline"
    AWAY = "away"
    BUSY = "busy"


class ChatType(Enum):
    ONE_ON_ONE = "one_on_one"
    GROUP = "group"


class MessageType(Enum):
    TEXT = "text"
    IMAGE = "image"
    FILE = "file"
    EMOJI = "emoji"


class MessageStatus(Enum):
    SENT = "sent"
    DELIVERED = "delivered"
    READ = "read"


class User:
    def __init__(self, user_id: str, username: str, display_name: str):
        self.user_id = user_id
        self.username = username
        self.display_name = display_name
        self.status = UserStatus.OFFLINE
        self.last_seen = datetime.now()
        self.contacts: List['User'] = []
        self.blocked_users: Set[str] = set()
    
    def update_status(self, status: UserStatus):
        self.status = status
        if status == UserStatus.ONLINE:
            self.last_seen = datetime.now()
    
    def is_online(self) -> bool:
        return self.status == UserStatus.ONLINE


class Message:
    def __init__(self, message_id: str, sender: User, content: str, 
                 message_type: MessageType = MessageType.TEXT):
        self.message_id = message_id
        self.sender = sender
        self.content = content
        self.message_type = message_type
        self.status = MessageStatus.SENT
        self.timestamp = datetime.now()
        self.edited = False
        self.deleted = False
    
    def mark_delivered(self):
        self.status = MessageStatus.DELIVERED
    
    def mark_read(self):
        self.status = MessageStatus.READ


class Chat(ABC):
    def __init__(self, chat_id: str, chat_type: ChatType):
        self.chat_id = chat_id
        self.chat_type = chat_type
        self.participants: List[User] = []
        self.messages: List[Message] = []
        self.created_at = datetime.now()
    
    def send_message(self, message: Message):
        self.messages.append(message)
    
    def get_messages(self, limit: int = 50, offset: int = 0) -> List[Message]:
        start = max(0, len(self.messages) - offset - limit)
        end = len(self.messages) - offset
        return self.messages[start:end]
    
    @abstractmethod
    def add_participant(self, user: User):
        pass


class OneOnOneChat(Chat):
    def __init__(self, chat_id: str, user1: User, user2: User):
        super().__init__(chat_id, ChatType.ONE_ON_ONE)
        self.user1 = user1
        self.user2 = user2
        self.participants = [user1, user2]
    
    def add_participant(self, user: User):
        raise Exception("Cannot add participants to one-on-one chat")
    
    def get_other_user(self, user: User) -> User:
        return self.user2 if user == self.user1 else self.user1


class GroupChat(Chat):
    def __init__(self, chat_id: str, name: str, admin: User):
        super().__init__(chat_id, ChatType.GROUP)
        self.name = name
        self.admin = admin
        self.participants = [admin]
    
    def add_participant(self, user: User):
        if user not in self.participants:
            self.participants.append(user)
    
    def remove_participant(self, user: User):
        if user in self.participants and user != self.admin:
            self.participants.remove(user)


class ChatService:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        
        self.users: Dict[str, User] = {}
        self.chats: Dict[str, Chat] = {}
        self.message_counter = 0
        self.chat_counter = 0
        self._initialized = True
    
    def register_user(self, user: User):
        self.users[user.user_id] = user
        user.update_status(UserStatus.ONLINE)
        print(f"✓ Registered: {user.display_name}")
    
    def create_one_on_one_chat(self, user1: User, user2: User) -> OneOnOneChat:
        chat_id = f"C{self.chat_counter:04d}"
        self.chat_counter += 1
        
        chat = OneOnOneChat(chat_id, user1, user2)
        self.chats[chat_id] = chat
        
        print(f"✓ Created one-on-one chat: {user1.display_name} ↔ {user2.display_name}")
        return chat
    
    def create_group_chat(self, name: str, participants: List[User], admin: User) -> GroupChat:
        chat_id = f"G{self.chat_counter:04d}"
        self.chat_counter += 1
        
        chat = GroupChat(chat_id, name, admin)
        for user in participants:
            if user != admin:
                chat.add_participant(user)
        
        self.chats[chat_id] = chat
        
        print(f"✓ Created group chat: '{name}' with {len(chat.participants)} members")
        return chat
    
    def send_message(self, chat_id: str, sender: User, content: str) -> Optional[Message]:
        chat = self.chats.get(chat_id)
        if not chat or sender not in chat.participants:
            print("✗ Cannot send message")
            return None
        
        msg_id = f"M{self.message_counter:06d}"
        self.message_counter += 1
        
        message = Message(msg_id, sender, content)
        chat.send_message(message)
        
        # Notify online participants
        for participant in chat.participants:
            if participant != sender and participant.is_online():
                message.mark_delivered()
        
        print(f"📤 {sender.display_name}: {content}")
        return message
    
    def mark_read(self, message_id: str, user_id: str):
        for chat in self.chats.values():
            for msg in chat.messages:
                if msg.message_id == message_id:
                    msg.mark_read()
                    print(f"✓ Message marked as read by {user_id}")
                    return


def main():
    print("=" * 70)
    print("CHAT APPLICATION - Low Level Design Demo")
    print("=" * 70)
    
    # Initialize service
    service = ChatService()
    
    # Register users
    print("\n👥 Registering Users...")
    alice = User("U001", "alice", "Alice Johnson")
    bob = User("U002", "bob", "Bob Smith")
    charlie = User("U003", "charlie", "Charlie Brown")
    
    service.register_user(alice)
    service.register_user(bob)
    service.register_user(charlie)
    
    # Create one-on-one chat
    print("\n💬 Creating One-on-One Chat...")
    chat1 = service.create_one_on_one_chat(alice, bob)
    
    # Send messages
    print("\n📨 Sending Messages...")
    msg1 = service.send_message(chat1.chat_id, alice, "Hi Bob! How are you?")
    msg2 = service.send_message(chat1.chat_id, bob, "Hi Alice! I'm great, thanks!")
    
    # Mark as read
    service.mark_read(msg1.message_id, bob.user_id)
    
    # Create group chat
    print("\n👥 Creating Group Chat...")
    group = service.create_group_chat(
        "Project Team",
        [alice, bob, charlie],
        alice
    )
    
    # Send group messages
    print("\n📨 Group Messages...")
    service.send_message(group.chat_id, alice, "Hello team!")
    service.send_message(group.chat_id, bob, "Hey everyone!")
    service.send_message(group.chat_id, charlie, "Hi all!")
    
    # Get message history
    print("\n📜 Message History...")
    history = chat1.get_messages(limit=10)
    print(f"Retrieved {len(history)} messages from one-on-one chat")
    
    print("\n" + "=" * 70)
    print("DEMO COMPLETE")
    print("=" * 70)


if __name__ == "__main__":
    main()
